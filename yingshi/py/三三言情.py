# -*- coding: utf-8 -*-
import sys
import json
import requests
from lxml import etree

# ================= 基类导入 =================
sys.path.append('..')
try:
    from base.spider import Spider as BaseSpider
except:
    class BaseSpider:
        pass


# ================= Spider 入口 =================
class Spider(BaseSpider):

    def getName(self):
        return "三三网页小说"

    def init(self, extend=""):
        self.vod = Vod()

    def homeContent(self, filter):
        return {
            'class': [
                {'type_id': '1', 'type_name': '玄幻小说'},
                {'type_id': '2', 'type_name': '奇幻小说'},
                {'type_id': '3', 'type_name': '武侠小说'},
                {'type_id': '4', 'type_name': '都市小说'},
                {'type_id': '5', 'type_name': '历史小说'},
                {'type_id': '6', 'type_name': '军事小说'},
                {'type_id': '7', 'type_name': '悬疑小说'},
                {'type_id': '8', 'type_name': '游戏小说'},
                {'type_id': '9', 'type_name': '科幻小说'},
                {'type_id': '10', 'type_name': '体育小说'},
                {'type_id': '11', 'type_name': '古言小说'},
                {'type_id': '12', 'type_name': '现言小说'},
                {'type_id': '13', 'type_name': '幻言小说'},
                {'type_id': '14', 'type_name': '仙侠小说'},
                {'type_id': '15', 'type_name': '青春小说'},
                {'type_id': '16', 'type_name': '穿越小说'},
                {'type_id': '17', 'type_name': '女生小说'},
                {'type_id': '18', 'type_name': '其他小说'}
            ]
        }

    def homeVideoContent(self):
        return self.categoryContent('4', '1', None, {})

    def categoryContent(self, cid, page, filter, ext):
        return self.vod.categoryContent(cid, page)

    def detailContent(self, did):
        return self.vod.detailContent(did)

    def searchContent(self, key, quick, page='1'):
        return self.vod.searchContent(key)

    def playerContent(self, flag, pid, vipFlags=None):
        return self.vod.playerContent(flag, pid)


# ================= 业务实现 =================
class Vod:

    def __init__(self):
        self.home_url = 'https://m.x33yq.org'
        self.session = requests.Session()
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/114.0.0.0 Mobile Safari/537.36",
            "Referer": self.home_url,
            "Origin": self.home_url,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }

    # ============== 列表解析 ==============
    def parse_list(self, html):
        root = etree.HTML(html)
        items = root.xpath('//ul[@class="list"]/li')
        vods = []
        for i in items:
            try:
                name = i.xpath('.//p[@class="bookname"]/a/text()')[0].strip()
                vid = i.xpath('./a/@href')[0]
                pic = i.xpath('./a/img/@src')[0]
                rem = "".join(i.xpath('.//p[@class="data"]//text()')).strip()
                vods.append({
                    "vod_id": vid,
                    "vod_name": name,
                    "vod_pic": pic if pic.startswith('http') else self.home_url + pic,
                    "vod_remarks": rem
                })
            except:
                continue
        return vods

    # ============== 分类 ==============
    def categoryContent(self, cid, page):
        url = f'{self.home_url}/sort/{cid}/' if page == '1' else f'{self.home_url}/sort/{cid}/{page}'
        try:
            r = self.session.get(url, headers=self.headers, timeout=10)
            r.encoding = 'utf-8'
            return {'list': self.parse_list(r.text)}
        except:
            return {'list': []}

    # ============== 详情 + 目录（修正找回第一章） ==============
    def detailContent(self, did):
        url = did[0] if isinstance(did, list) else did
        if not url.startswith('http'):
            url = self.home_url + url
        try:
            # 1. 首先请求“简介页”（获取书名、封面、简介）
            r = self.session.get(url, headers=self.headers, timeout=10)
            r.encoding = 'utf-8'
            root_info = etree.HTML(r.text)

            name = "".join(root_info.xpath('//p[@class="name"]/strong/text()')).strip()
            pic = "".join(root_info.xpath('//div[@class="detail"]/img/@src')).strip()
            intro = "".join(root_info.xpath('//div[@class="intro"]//text()')).strip()

            # 2. 构造“全目录页” URL (xiaoshuo_377808.html -> /read/377808/)
            catalog_url = url
            if 'xiaoshuo_' in url:
                book_id = url.split('xiaoshuo_')[-1].replace('.html', '').split('/')[0]
                catalog_url = f"{self.home_url}/read/{book_id}/"

            # 3. 请求“全目录页”抓取章节
            r_cat = self.session.get(catalog_url, headers=self.headers, timeout=10)
            r_cat.encoding = 'utf-8'
            root_cat = etree.HTML(r_cat.text)
            
            # 同时兼容 read (目录页) 和 vlist (简介页) 标签类名
            chapters = root_cat.xpath('//ul[@class="read"]/li/a | //ul[@class="vlist"]/li/a')
            
            play_urls = []
            for c in chapters:
                cname = "".join(c.xpath('.//text()')).strip()
                # 过滤掉非章节链接
                if not cname or any(x in cname for x in ['展开', '全部', '查看', '下一页', '尾页', '返回']):
                    continue
                
                curl = c.xpath('./@href')[0]
                if not curl.startswith('http'):
                    curl = self.home_url + curl
                play_urls.append(f"{cname}${curl}")

            # 4. 排序修正：找回第一章的关键
            # 只要发现列表最后一条是“第1章”，说明是倒序，必须翻转
            if play_urls:
                last_title = play_urls[-1].split('$')[0]
                if "第1章" in last_title or "第01章" in last_title:
                    play_urls.reverse()

            return {
                "list": [{
                    "vod_id": url,
                    "vod_name": name,
                    "vod_pic": pic if pic.startswith('http') else self.home_url + pic,
                    "vod_content": intro,
                    "vod_play_from": "三三网页小说",
                    "vod_play_url": "#".join(play_urls)
                }]
            }
        except:
            return {'list': []}

    # ============== 搜索 ==============
    def searchContent(self, key):
        try:
            self.session.get(self.home_url, headers=self.headers, timeout=5)
            r = self.session.post(
                self.home_url + '/search.html',
                data={'searchkey': key},
                headers=self.headers,
                timeout=10
            )
            r.encoding = 'utf-8'
            return {'list': self.parse_list(r.text)}
        except:
            return {'list': []}

    # ============== 阅读器核心（已精准适配） ==============
    def playerContent(self, flag, pid):
        try:
            url = pid if pid.startswith('http') else self.home_url + pid
            r = self.session.get(url, headers=self.headers, timeout=10)
            r.encoding = 'utf-8'
            root = etree.HTML(r.text)

            # 章节标题
            title = "".join(
                root.xpath('//h1[@class="headline"]/text()')
            ).strip() or "章节正文"

            # 正文提取
            texts = root.xpath('//div[@class="content"]/p//text()')
            content = "\n".join(
                t.replace('\xa0', '').strip()
                for t in texts
                if t.replace('\xa0', '').strip()
            )

            if not content:
                content = "正文抓取失败"

            # 清洗版权尾缀
            content = content.split('《凡人修仙：修仙葫芦》')[0].strip()

            data = {"title": title, "content": content}

            return {
                "parse": 0,
                "playUrl": "",
                "url": "novel://" + json.dumps(data, ensure_ascii=False),
                "header": ""
            }

        except Exception as e:
            return {
                "parse": 0,
                "playUrl": "",
                "url": "novel://" + json.dumps({
                    "title": "错误",
                    "content": str(e)
                }, ensure_ascii=False),
                "header": ""
            }
