# -*- coding: utf-8 -*-
import json
import sys
import re
import requests
from bs4 import BeautifulSoup

sys.path.append('..')
from base.spider import Spider

class Spider(Spider):
    
    def getName(self):
        return "绅士漫画"

    def init(self, extend=""):
        pass

    def isVideoFormat(self, url):
        return False

    def manualVideoCheck(self):
        return False

    def destroy(self):
        pass

    def getHeader(self):
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": "https://www.wn06.ru/",
            "Accept-Language": "zh-CN,zh;q=0.9"
        }

    def homeContent(self, filter):
        classes = [
            {"type_name": "月榜", "type_id": "rank_month"},
            {"type_name": "周榜", "type_id": "rank_week"},
            {"type_name": "日榜", "type_id": "rank_day"},
            {"type_name": "同人志", "type_id": "1"},
            {"type_name": "韩漫", "type_id": "20"},
            {"type_name": "单行本", "type_id": "9"},
            {"type_name": "杂志&短篇", "type_id": "10"}
        ]
        
        sort_values = [
            {"n": "创建时间", "v": "1"}, 
            {"n": "默认", "v": ""} 
        ]
        
        filter_config = {
            "key": "sort",
            "name": "排序",
            "value": sort_values
        }
        
        filters = {}
        for c in classes:
            if "rank" not in c['type_id']:
                filters[c['type_id']] = [filter_config]

        return {"class": classes, "filters": filters}

    def homeVideoContent(self):
        return self.categoryContent("rank_month", "1", None, {})

    def categoryContent(self, tid, pg, filter, extend):
        if tid == "rank_month":
            url = f"https://www.wn06.ru/albums-favorite_ranking-page-{pg}-type-month.html"
        elif tid == "rank_week":
            url = f"https://www.wn06.ru/albums-favorite_ranking-page-{pg}-type-week.html"
        elif tid == "rank_day":
            url = f"https://www.wn06.ru/albums-favorite_ranking-page-{pg}-type-day.html"
        else:
            url = f"https://www.wn06.ru/albums-index-page-{pg}-cate-{tid}.html"
        
        try:
            r = requests.get(url, headers=self.getHeader())
            soup = BeautifulSoup(r.text, 'html.parser')
            items = soup.select('.gallary_wrap ul li')
            
            videos = []
            for item in items:
                link_tag = item.select_one('.info .title a')
                vid = link_tag['href'] if link_tag else ""
                name = link_tag.text.strip() if link_tag else ""
                
                img_tag = item.select_one('div:nth-of-type(1) a img')
                cover = img_tag['src'] if img_tag else ""
                if cover.startswith("//"):
                    cover = "https:" + cover
                
                info_col = item.select_one('.info .info_col')
                remark = ""
                if info_col:
                    text = info_col.text
                    match = re.search(r'(\d+)張圖片', text)
                    if match:
                        remark = f"{match.group(1)}页"

                videos.append({
                    "vod_id": vid,
                    "vod_name": name,
                    "vod_pic": cover,
                    "vod_remarks": remark
                })
            
            return {
                "list": videos,
                "page": pg,
                "pagecount": 9999,
                "limit": 20,
                "total": 999999
            }
        except Exception as e:
            return {"list": []}

    def detailContent(self, ids):
        vid = ids[0]
        url = f"https://www.wn06.ru{vid}" if not vid.startswith('http') else vid
        
        try:
            r = requests.get(url, headers=self.getHeader())
            r.encoding = 'utf-8'
            soup = BeautifulSoup(r.text, 'html.parser')
            
            # --- 修复标题获取逻辑 ---
            name = "未知"
            # 策略1: 常见的 h1 或 h2
            h_tag = soup.select_one('h2') or soup.select_one('h1')
            if h_tag:
                name = h_tag.text.strip()
            # 策略2: 如果 h 标签没找到，尝试 .title 类
            if name == "未知":
                title_div = soup.select_one('.title')
                if title_div: name = title_div.text.strip()
            # 策略3: 尝试 meta title
            if name == "未知":
                meta_title = soup.select_one('meta[property="og:title"]')
                if meta_title: name = meta_title['content']
            
            # 封面
            cover = ""
            # 尝试多种封面选择器
            cover_img = soup.select_one('.uwthumb img') or soup.select_one('.cover img')
            if cover_img:
                cover = cover_img['src']
                if cover.startswith("//"): cover = "https:" + cover
            
            # 简介
            desc = ""
            desc_p = soup.select_one('.uwconn p') or soup.select_one('.info p')
            if desc_p: desc = desc_p.text.strip()

            # --- 分页转章节逻辑 ---
            # 1. 寻找最大页数
            paginator = soup.select('.paginator a')
            max_page = 1
            aid = ""
            
            # 提取 AID (相册ID)
            # URL 格式通常为: /photos-index-aid-12345.html
            aid_match = re.search(r'aid-(\d+)', url)
            if aid_match:
                aid = aid_match.group(1)
            
            # 遍历分页条找最大页码
            for a in paginator:
                href = a.get('href', '')
                # 尝试从链接提取 aid (作为备选)
                if not aid:
                    aid_m = re.search(r'aid-(\d+)', href)
                    if aid_m: aid = aid_m.group(1)
                
                # 提取页码
                page_m = re.search(r'page-(\d+)', href)
                if page_m:
                    p = int(page_m.group(1))
                    if p > max_page:
                        max_page = p
            
            # 2. 生成章节列表
            vod_play_url_list = []
            
            # 如果没有分页条，说明只有一页
            if max_page == 1:
                vod_play_url_list.append(f"第1页${url}")
            else:
                # 循环生成每一页的链接
                for i in range(1, max_page + 1):
                    # 构造分页 URL: https://www.wn06.ru/photos-index-page-{i}-aid-{aid}.html
                    # 必须确保 aid 存在，否则只能回退到 single page
                    if aid:
                        page_url = f"https://www.wn06.ru/photos-index-page-{i}-aid-{aid}.html"
                        vod_play_url_list.append(f"第{i}页${page_url}")
                    else:
                        # 极端情况：没找到 AID，只能添加第一页
                        if i == 1: vod_play_url_list.append(f"第1页${url}")

            play_url_str = "#".join(vod_play_url_list)

            return {
                "list": [{
                    "vod_id": vid,
                    "vod_name": name,
                    "vod_pic": cover,
                    "type_name": "漫画",
                    "vod_year": "",
                    "vod_area": "",
                    "vod_remarks": f"共{max_page}页",
                    "vod_actor": "",
                    "vod_director": "",
                    "vod_content": desc,
                    "vod_play_from": "阅读(Mange)$$$阅读(Pics)", 
                    "vod_play_url": f"{play_url_str}$$${play_url_str}"
                }]
            }
        except Exception as e:
            return {"list": []}

    def searchContent(self, key, quick, pg="1"):
        url = f"https://www.wn06.ru/search/?q={key}&f=_all&s=create_time_DESC&syn=yes&page={pg}"
        try:
            r = requests.get(url, headers=self.getHeader())
            soup = BeautifulSoup(r.text, 'html.parser')
            items = soup.select('.gallary_wrap ul li')
            
            videos = []
            for item in items:
                link_tag = item.select_one('.info .title a')
                vid = link_tag['href'] if link_tag else ""
                name = link_tag.text.strip() if link_tag else ""
                
                img_tag = item.select_one('div:nth-of-type(1) a img')
                cover = img_tag['src'] if img_tag else ""
                if cover.startswith("//"):
                    cover = "https:" + cover
                
                info_col = item.select_one('.info .info_col')
                remark = ""
                if info_col:
                    text = info_col.text
                    match = re.search(r'(\d+)張圖片', text)
                    if match:
                        remark = f"{match.group(1)}页"

                videos.append({
                    "vod_id": vid,
                    "vod_name": name,
                    "vod_pic": cover,
                    "vod_remarks": remark
                })
            return {'list': videos}
        except:
            return {'list': []}

    def playerContent(self, flag, id, vipFlags):
        # id 现在是某一页的具体 URL (例如 ...page-2-aid-xyz.html)
        url = id
        headers = self.getHeader()
        headers['Referer'] = url # 重要：Referer设为当前页
        
        try:
            # 只请求这一页
            r = requests.get(url, headers=headers, timeout=10)
            html = r.text
            soup = BeautifulSoup(html, 'html.parser')
            
            img_info_list = []
            prefix_url = ""

            # 解析当前页的图片
            lis = soup.select('.gallary_wrap.tb ul li')
            for li in lis:
                name_span = li.select_one('span.name.tb')
                img_tag = li.select_one('img')
                
                if name_span and img_tag:
                    seq = name_span.text.strip()
                    src = img_tag.get('src', '')
                    
                    if not src: continue

                    # 获取扩展名
                    ext = "jpg"
                    if "." in src:
                        ext = src.split('.')[-1].split('?')[0]
                    
                    # 动态提取前缀 (wnimg1)
                    if not prefix_url and "wnimg1" in src:
                        last_slash = src.rfind('/')
                        if last_slash != -1:
                            prefix_url = src[:last_slash+1]
                    
                    img_info_list.append({
                        "name": seq,
                        "ext": ext,
                        "raw_src": src
                    })

            # 排序
            try:
                img_info_list.sort(key=lambda x: int(x['name']) if x['name'].isdigit() else 0)
            except:
                pass

            # 拼接
            final_images = []
            for item in img_info_list:
                if prefix_url:
                    full_url = f"{prefix_url}{item['name']}.{item['ext']}"
                else:
                    full_url = item['raw_src']
                    if full_url.startswith("//"):
                        full_url = "https:" + full_url
                
                # 过滤
                if "tu.petatt.cn" in full_url: continue
                
                final_images.append(full_url)
            
            novel_data = "&&".join(final_images)
            
            protocol = "pics" if "Pics" in flag else "mange"

            return {
                "parse": 0,
                "playUrl": "",
                "url": f'{protocol}://{novel_data}',
                "header": ""
            }
        except Exception as e:
            return {
                "parse": 0,
                "playUrl": "",
                "url": "",
                "header": ""
            }

    def localProxy(self, param):
        pass
