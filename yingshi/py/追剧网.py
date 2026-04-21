#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
OK影视手机版爬虫插件 - 追剧网(luwozhuji.com)
适配: QPython / Pydroid 3 / Termux
"""

import re
import sys
import json
import os

# 尝试导入requests
try:
    import requests
    from requests.adapters import HTTPAdapter
    from requests.packages.urllib3.util.retry import Retry
    requests.packages.urllib3.disable_warnings()
except ImportError:
    print("请先安装requests: pip install requests")
    sys.exit(1)

# 添加base路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from base.spider import Spider
except ImportError:
    # 备用base类定义
    class Spider:
        def init(self, extend=""):
            pass

        def homeContent(self, filter):
            pass

        def homeVideoContent(self):
            pass

        def categoryContent(self, tid, pg, filter, extend):
            pass

        def detailContent(self, ids):
            pass

        def searchContent(self, key, quick, pg="1"):
            pass

        def playerContent(self, flag, id, vipFlags):
            pass

        def localProxy(self, param):
            pass


class Spider(Spider):
    """追剧网爬虫 - OK影视专用"""

    def __init__(self):
        super().__init__()
        self.name = "追剧网"
        self.site_url = "https://www.luwozhuji.com"
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
            "Referer": self.site_url + "/",
            "Accept-Language": "zh-CN,zh;q=0.9"
        }

    def init(self, extend=""):
        """初始化"""
        super().init(extend)
        self.sess = requests.Session()
        retry = Retry(total=3, backoff_factor=1, status_forcelist=[500, 502, 503, 504])
        adapter = HTTPAdapter(max_retries=retry)
        self.sess.mount("http://", adapter)
        self.sess.mount("https://", adapter)
        return self

    def getName(self):
        return self.name

    def fetch(self, url, timeout=15):
        """请求网页"""
        try:
            res = self.sess.get(url, headers=self.headers, timeout=timeout, verify=False)
            return res
        except Exception as e:
            print(f"[追剧网]请求失败: {url}, 错误: {e}")
            return None

    def get_full_url(self, url):
        """补全URL"""
        if not url:
            return ""
        if url.startswith("http"):
            return url
        if url.startswith("//"):
            return "https:" + url
        if url.startswith("/"):
            return self.site_url + url
        return url

    def homeContent(self, filter):
        """首页分类"""
        cate_list = [
            {"type_name": "电影", "type_id": "dianying"},
            {"type_name": "电视剧", "type_id": "dianshiju"},
            {"type_name": "综艺", "type_id": "zongyi"},
            {"type_name": "动漫", "type_id": "donghuapian"},
            {"type_name": "国产动漫", "type_id": "dongman"},
            {"type_name": "短剧", "type_id": "duanju"},
        ]
        return {"class": cate_list}

    def homeVideoContent(self):
        """首页推荐"""
        result = {"list": []}
        try:
            # 获取电影分类第一页作为推荐
            url = f"{self.site_url}/vodshow/dianying--hits---------1---.html"
            res = self.fetch(url)
            if not res:
                return result

            html = res.text
            videos = []

            # 匹配视频列表
            pattern = r'<a[^>]+href="(/voddetail/[^"]+)"[^>]+title="([^"]+)"[^>]*>.*?<img[^>]+src="([^"]+)"'
            for match in re.finditer(pattern, html, re.S | re.I):
                try:
                    href, name, pic = match.groups()
                    href = self.get_full_url(href)
                    pic = self.get_full_url(pic)

                    # 提取备注
                    remarks = ""
                    remarks_match = re.search(r'<div class="module-item-text">(.*?)</div>', match.group(0), re.S)
                    if remarks_match:
                        remarks = re.sub(r'<[^>]+>', '', remarks_match.group(1)).strip()

                    videos.append({
                        "vod_id": href,
                        "vod_name": name.strip(),
                        "vod_pic": pic,
                        "vod_remarks": remarks,
                        "style": {"type": "rect", "ratio": 1.33}
                    })
                except:
                    continue

                if len(videos) >= 12:
                    break

            result["list"] = videos
        except Exception as e:
            print(f"[追剧网]首页推荐失败: {e}")

        return result

    def categoryContent(self, tid, pg, filter, extend):
        """分类内容"""
        pg = int(pg) if str(pg).isdigit() else 1

        list_url = f"{self.site_url}/vodshow/{tid}--hits---------{pg}---.html"
        res = self.fetch(list_url)

        video_list = []

        if res and res.ok:
            html = res.text

            # 匹配视频列表
            pattern = r'<a[^>]+href="(/voddetail/[^"]+)"[^>]+title="([^"]+)"[^>]*>.*?<img[^>]+src="([^"]+)"'
            for match in re.finditer(pattern, html, re.S | re.I):
                try:
                    href, name, pic = match.groups()
                    href = self.get_full_url(href)
                    pic = self.get_full_url(pic)

                    # 提取备注
                    remarks = ""
                    remarks_match = re.search(r'<div class="module-item-text">(.*?)</div>', match.group(0), re.S)
                    if remarks_match:
                        remarks = re.sub(r'<[^>]+>', '', remarks_match.group(1)).strip()

                    video_list.append({
                        "vod_id": href,
                        "vod_name": name.strip(),
                        "vod_pic": pic,
                        "vod_remarks": remarks,
                        "style": {"type": "rect", "ratio": 1.33}
                    })
                except:
                    continue

        # 估算总页数
        pagecount = pg + 1 if len(video_list) >= 10 else pg

        return {
            "list": video_list,
            "page": pg,
            "pagecount": pagecount,
            "limit": 12,
            "total": 9999
        }

    def detailContent(self, ids):
        """详情页"""
        if not ids:
            return {"list": [{"vod_name": "ID为空"}]}

        vod_id = ids[0]
        res = self.fetch(vod_id)

        if not res or not res.ok:
            return {"list": [{"vod_id": vod_id, "vod_name": "详情页请求失败"}]}

        html = res.text

        # 提取标题
        name_match = re.search(r'<h1[^>]*>(.*?)</h1>', html, re.S) or \
                     re.search(r'<div class="page-title">.*?>(.*?)</', html, re.S)
        vod_name = name_match.group(1).strip() if name_match else "未知名称"

        # 清理HTML标签
        vod_name = re.sub(r'<[^>]+>', '', vod_name)

        # 提取封面
        pic_match = re.search(r'<img[^>]+class="[^"]*lazy[^"]*"[^>]+data-src="([^"]+)"', html, re.S) or \
                    re.search(r'<img[^>]+class="[^"]*lazy[^"]*"[^>]+src="([^"]+)"', html, re.S) or \
                    re.search(r'<img[^>]+src="([^"]+)"[^>]+alt="[^"]*封面"', html, re.S)
        vod_pic = pic_match.group(1) if pic_match else ""
        vod_pic = self.get_full_url(vod_pic)

        # 提取简介
        content_match = re.search(r'<div class="detail-content"[^>]*>(.*?)</div>', html, re.S) or \
                        re.search(r'(?:剧情介绍|简介|详情|介绍)[:：]?\s*(.*?)(?=<div|<p|<h|</div>|\Z)', html, re.S | re.I)
        vod_content = content_match.group(1).strip() if content_match else ""
        vod_content = re.sub(r'<[^>]+>', '', vod_content)[:300]

        # 提取选集
        play_from = "追剧网"
        play_url_parts = []

        # 匹配选集链接
        pattern = r'<a[^>]+href="(/vodplay/[^"]+)"[^>]*>(第\d+集|[^<]+)</a>'
        for m in re.finditer(pattern, html, re.S | re.I):
            try:
                url_part, ep_name = m.groups()
                full_url = self.get_full_url(url_part)
                play_url_parts.append(f"{ep_name.strip()}${full_url}")
            except:
                continue

        # 如果没匹配到，尝试更宽松的模式
        if not play_url_parts:
            pattern2 = r'href="(/vodplay/[^"]+)"[^>]*>(第[\d零一二三四五六七八九十百]+集?|[^\s<]+)</'
            for m in re.finditer(pattern2, html, re.S):
                try:
                    url_part, ep_name = m.groups()
                    full_url = self.get_full_url(url_part)
                    play_url_parts.append(f"{ep_name.strip()}${full_url}")
                except:
                    continue

        vod_play_url = "#".join(play_url_parts) if play_url_parts else ""

        detail = {
            "vod_id": vod_id,
            "vod_name": vod_name,
            "vod_pic": vod_pic,
            "vod_remarks": "",
            "vod_content": vod_content,
            "vod_play_from": play_from,
            "vod_play_url": vod_play_url
        }

        return {"list": [detail]}

    def extract_real_video(self, play_url):
        """从播放页提取真实视频链接"""
        try:
            res = self.fetch(play_url)
            if not res:
                return None

            html = res.text

            # 方法1: 查找m3u8
            m3u8_match = re.search(r'(https?://[^\s"\'<>]+\.m3u8[^\s"\'<>]*)', html, re.I)
            if m3u8_match:
                url = m3u8_match.group(1)
                if url.startswith('//'):
                    url = 'https:' + url
                return url

            # 方法2: 查找player配置
            player_match = re.search(r'var\s+player_[a-z]+\s*=\s*({.*?});', html, re.S)
            if player_match:
                try:
                    player_json = player_match.group(1).replace('\/', '/')
                    player_data = json.loads(player_json)
                    url = player_data.get('url', '')
                    if url and '.m3u8' in url:
                        if url.startswith('//'):
                            url = 'https:' + url
                        return url
                except:
                    pass

            # 方法3: 查找iframe
            iframe_match = re.search(r'<iframe[^>]+src="([^"]+)"', html, re.I)
            if iframe_match:
                iframe_url = iframe_match.group(1)
                if iframe_url.startswith('/'):
                    iframe_url = self.site_url + iframe_url
                return iframe_url

            # 方法4: 查找mp4
            mp4_match = re.search(r'(https?://[^\s"\'<>]+\.mp4[^\s"\'<>]*)', html, re.I)
            if mp4_match:
                return mp4_match.group(1)

            return None

        except Exception as e:
            print(f"[追剧网]提取视频失败: {e}")
            return None

    def playerContent(self, flag, id, vipFlags):
        """播放解析"""
        # id是播放页URL
        play_url = id

        # 尝试提取真实视频链接
        real_url = self.extract_real_video(play_url)

        if real_url:
            # 提取成功，直接播放
            return {
                "parse": 0,
                "url": real_url,
                "header": self.headers
            }
        else:
            # 提取失败，返回原URL让OK影视尝试解析
            return {
                "parse": 1,  # 需要OK影视内置解析
                "url": play_url,
                "header": self.headers
            }

    def searchContent(self, key, quick, pg="1"):
        """搜索"""
        pg = int(pg) if str(pg).isdigit() else 1

        # 构建搜索URL
        search_url = f"{self.site_url}/vodsearch/-------------.html?wd={requests.utils.quote(key)}&page={pg}"
        res = self.fetch(search_url)

        video_list = []

        if res and res.ok:
            html = res.text

            # 匹配搜索结果
            pattern = r'<a[^>]+href="(/voddetail/[^"]+)"[^>]+title="([^"]+)"[^>]*>.*?<img[^>]+src="([^"]+)"'
            for match in re.finditer(pattern, html, re.S | re.I):
                try:
                    href, name, pic = match.groups()
                    href = self.get_full_url(href)
                    pic = self.get_full_url(pic)

                    video_list.append({
                        "vod_id": href,
                        "vod_name": name.strip(),
                        "vod_pic": pic,
                        "vod_remarks": "搜索结果",
                        "style": {"type": "rect", "ratio": 1.33}
                    })
                except:
                    continue

        return {
            "list": video_list,
            "page": pg,
            "pagecount": pg + 1 if len(video_list) >= 10 else pg,
            "limit": 12,
            "total": 9999
        }

    def localProxy(self, param):
        """本地代理"""
        return {"url": "", "header": ""}


# 测试代码
if __name__ == "__main__":
    print("="*50)
    print("追剧网爬虫 - OK影视手机版")
    print("="*50)
    print("此文件为OK影视Python插件")
    print("请放置在OK影视的py插件目录中使用")
    print("="*50)

    # 简单测试
    spider = Spider()
    spider.init()

    print("\n[测试] 获取首页分类...")
    home = spider.homeContent(True)
    print(f"分类数量: {len(home.get('class', []))}")
    for c in home.get('class', []):
        print(f"  - {c['type_name']}: {c['type_id']}")

    print("\n[测试] 获取首页推荐...")
    recommend = spider.homeVideoContent()
    print(f"推荐视频: {len(recommend.get('list', []))}个")

    print("\n[测试] 获取电影分类...")
    cate = spider.categoryContent("dianying", 1, False, {})
    print(f"视频数量: {len(cate.get('list', []))}个")
    if cate.get('list'):
        first = cate['list'][0]
        print(f"第一个: {first.get('vod_name', 'N/A')}")

        print("\n[测试] 获取详情页...")
        detail = spider.detailContent([first['vod_id']])
        if detail.get('list'):
            vod = detail['list'][0]
            print(f"标题: {vod.get('vod_name', 'N/A')}")
            print(f"剧集数: {len(vod.get('vod_play_url', '').split('#'))}")

    print("\n" + "="*50)
    print("测试完成！")
    print("="*50)
