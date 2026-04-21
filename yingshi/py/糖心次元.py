# -*- coding: utf-8 -*-
# @Author  : Grok-4 Adapted & Optimized
# @Time    : 2025/10/22
# @Note    : 糖心次元极简爬虫（已修复转义 \/ 问题 & 韩国AV标题前缀）

import sys, urllib.parse, re, json
from lxml import etree
sys.path.append('..')
from base.spider import Spider

class Spider(Spider):
    def getName(self):
        return "糖心次元"

    def init(self, extend):
        pass

    def homeContent(self, filter):
        cate = {"传媒系列":"1","AV系列":"2","麻豆传媒":"5","糖心传媒":"6","精东影业":"7","蜜桃传媒":"8","果冻传媒":"9","星空无限":"10","天美传媒":"11","抠抠传媒":"12","星杏吧传媒":"13","性视界传媒":"14","SA国际传媒":"15","其他传媒":"16","国产-自拍-偷拍":"17","探花-主播-网红":"18","日本-中文字幕":"19","日本-无码流出":"20","日本-高清有码":"21","日本-东京热":"22","动漫-番中字":"23","变态-暗网-同恋":"24","欧美高清无码":"25","韩国av":"27"}
        return {'class': [{'type_name': k, 'type_id': v} for k, v in cate.items()]}

    def homeVideoContent(self):
        return {}

    # --------------- 通用解析 --------------- #
    def _parse(self, rsp):
        root = etree.HTML(rsp)
        videos = root.xpath('//li[contains(@class,"mb15") and .//a[contains(@href,"/vod/play/")]]')
        lst = []
        for v in videos:
            name = (v.xpath('.//h2/a/@title|.//h3/a/@title|.//p[contains(@class,"txt-ov")]/text()') or [''])[0].strip()
            # >>> 去韩国AV前缀：kbj-23010421标题 -> 标题
            name = re.sub(r'^[a-zA-Z]{2,}\-\d+\s*', '', name).strip()
            img = (v.xpath('.//img/@src') or [''])[0]
            if img and not img.startswith('http'):
                img = ('https:' + img) if img.startswith('//') else 'https://img1.souavzy.org' + img
            link = (v.xpath('.//a[contains(@href,"/vod/play/")]/@href') or [''])[0]
            if link and not link.startswith('http'):
                link = 'https://www.txsp.my' + link
            lst.append({'vod_name': name or '未知标题', 'vod_pic': img, 'vod_remarks': (v.xpath('.//span[contains(@class,"ico-left")]/text()') or [''])[0].strip(), 'vod_id': link})
        return lst

    def categoryContent(self, tid, pg, filter, extend):
        url = f'https://www.txsp.my/index.php/vod/type/id/{tid}.html' if pg == '1' else f'https://www.txsp.my/index.php/vod/type/id/{tid}/page/{pg}.html'
        try:
            rsp = self.fetch(url).text
            lst = self._parse(rsp)
            pages = max([int(n) for n in re.findall(r'/page/(\d+)', rsp)] or [1])
            return {'list': lst, 'page': int(pg), 'pagecount': pages, 'limit': len(lst), 'total': 999999}
        except Exception as e:
            return {'list': [], 'page': int(pg), 'pagecount': 1, 'limit': 0, 'total': 0}

    def detailContent(self, array):
        tid = array[0]
        url = tid if tid.startswith('http') else 'https://www.txsp.my' + tid
        try:
            rsp = self.fetch(url).text
            root = etree.HTML(rsp)
            title = (root.xpath('//h1/text()') or ['未知标题'])[0].strip()
            pic = (root.xpath('//meta[@property="og:image"]/@content|//img[contains(@src,"upload/vod")]/@src') or [''])[0]
            if pic and not pic.startswith('http'):
                pic = ('https:' + pic) if pic.startswith('//') else 'https://img1.souavzy.org' + pic
            play_url = self._extract(rsp)
            return {'list': [{'vod_id': tid, 'vod_name': title, 'vod_pic': pic, 'vod_content': title, 'vod_play_from': '糖心次元', 'vod_play_url': '播放$' + play_url if play_url else '播放$暂无播放地址'}]}
        except Exception as e:
            return {'list': []}

    def _extract(self, html):
        html = html.replace(r'\/', '/')          # 关键修复
        for pat in [r'var player_aaaa\s*=\s*({[^}]+})', r'player_aaaa\s*=\s*({[^}]+})', r'var player_data\s*=\s*({[^}]+})']:
            m = re.search(pat, html)
            if m:
                try:
                    url = json.loads(m.group(1))['url']
                    if url: return url
                except:
                    continue
        src = re.search(r'<iframe[^>]+src="([^"]+souavzy[^"]+)"', html, re.I)
        if src:
            m3 = re.search(r'url=([^&]+)', src.group(1))
            if m3: return urllib.parse.unquote(m3.group(1))
        for url in re.findall(r'"(https?://[^"]+\.m3u8[^"]*)"', html):
            if 'souavzy' in url or 'qrtuv' in url: return url
        return ''

    def searchContent(self, key, quick, pg="1"):
        url = f'https://www.txsp.my/index.php/vod/search/page/{pg}/wd/{urllib.parse.quote(key)}.html'
        try:
            return {'list': self._parse(self.fetch(url).text), 'page': int(pg), 'pagecount': 999, 'limit': 999, 'total': 999999}
        except:
            return {'list': [], 'page': int(pg), 'pagecount': 1, 'limit': 0, 'total': 0}

    def playerContent(self, flag, id, vipFlags):
        if flag != "糖心次元":
            return {}
        if id.startswith('http') and ('.m3u8' in id or 'souavzy' in id):
            return {"parse": 0, "playUrl": '', "url": id, "header": {"User-Agent": "Mozilla/5.0", "Referer": "https://www.txsp.my/", "Origin": "https://www.txsp.my"}}
        try:
            url = id if id.startswith('http') else 'https://www.txsp.my' + id
            play_url = self._extract(self.fetch(url).text)
            if play_url:
                return {"parse": 0, "playUrl": '', "url": play_url, "header": {"User-Agent": "Mozilla/5.0", "Referer": "https://www.txsp.my/", "Origin": "https://www.txsp.my"}}
        except:
            pass
        return {"parse": 1, "playUrl": '', "url": id, "header": {"User-Agent": "Mozilla/5.0", "Referer": "https://www.txsp.my/", "Origin": "https://www.txsp.my"}}

    def isVideoFormat(self, url):
        pass

    def manualVideoCheck(self):
        pass

    def localProxy(self, param):
        pass
