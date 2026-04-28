#!/usr/bin/python
# -*- coding: utf-8 -*-
from base.spider import Spider
import requests, re, json

class Spider(Spider):
    def getName(self):
        return "JableTV"

    def init(self, extend=""):
        self.name = "JableTV"
        self.host = "https://jable.tv"
        self.header = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

    def destroy(self):
        pass

    def localProxy(self, param):
        return [False, ""]

    def fix_url(self, url):
        if not url: return ""
        if url.startswith("//"): return "https:" + url
        if url.startswith("/"): return self.host + url
        return url

    def clean_text(self, text):
        return re.sub(r'\s+', ' ', text).strip() if text else ""

    def _fetch(self, url, method="GET", data=None):
        try:
            if method == "POST":
                resp = requests.post(url, data=data, headers=self.header, timeout=15)
            else:
                resp = requests.get(url, headers=self.header, timeout=15)
            resp.encoding = 'utf-8'
            return resp.text
        except Exception as e:
            print(f"[{self.name}] request fail: {url} - {e}")
            return ""

    def _extract_video_list(self, html):
        items = []
        seen_ids = set()
        img_urls = re.findall(r'data-src="(https://[^"]*assets-cdn\.jable\.tv[^"]*preview\.jpg[^"]*)"', html)
        if not img_urls:
            img_urls = re.findall(r'data-src="(https://[^"]*assets-cdn\.jable\.tv[^"]*320x180[^"]*)"', html)
        if not img_urls:
            img_urls = re.findall(r'data-src="(https://[^"]*assets-cdn\.jable\.tv[^"]*)"', html)

        video_data = []
        h6_matches = re.findall(r'<h6[^>]*class="[^"]*title[^"]*"[^>]*>(.*?)</h6>', html, re.DOTALL)
        for h6c in h6_matches:
            if '/videos/' not in h6c:
                continue
            m = re.search(r'href="(https?://[^"]*videos/[^"]+)"', h6c)
            if not m:
                m = re.search(r'href="(/videos/[^"]+)"', h6c)
            if m:
                link = m.group(1)
                if link.startswith('/'):
                    link = self.host + link
                title = re.sub(r'<[^>]+>', '', h6c).strip()
                vid = re.search(r'/videos/([^/]+)', link)
                vod_id = vid.group(1) if vid else ""
                if vod_id and vod_id not in seen_ids:
                    seen_ids.add(vod_id)
                    video_data.append((vod_id, title, link))

        if not video_data:
            all_links = re.findall(r'<a[^>]*href="([^"]*videos/[^"]+)"[^>]*>(.*?)</a>', html, re.DOTALL)
            for href, content in all_links:
                title = re.sub(r'<[^>]+>', '', content).strip()
                if not title:
                    continue
                link = href if href.startswith('http') else self.host + href
                vid = re.search(r'/videos/([^/]+)', link)
                vod_id = vid.group(1) if vid else ""
                if vod_id and vod_id not in seen_ids:
                    seen_ids.add(vod_id)
                    video_data.append((vod_id, title, link))

        if not video_data:
            hrefs = re.findall(r'href="(https?://[^"]*videos/[^"]+)"', html)
            for href in hrefs:
                vid = re.search(r'/videos/([^/]+)', href)
                vod_id = vid.group(1) if vid else ""
                if vod_id and vod_id not in seen_ids:
                    seen_ids.add(vod_id)
                    video_data.append((vod_id, vod_id.upper(), href))

        for i, (vid, title, link) in enumerate(video_data):
            pic = img_urls[i] if i < len(img_urls) else ""
            items.append({"vod_name": self.clean_text(title), "vod_id": vid, "vod_pic": pic})
        return items

    def homeContent(self, filter):
        print(f"[{self.name}] homeContent")
        try:
            html = self._fetch(self.host)
            items = self._extract_video_list(html)
            class_list = [
                {"type_name": "最新更新", "type_id": "latest-updates"},
                {"type_name": "所有热门", "type_id": "hot"},
                {"type_name": "本月热门", "type_id": "hot-monthly"},
                {"type_name": "本周热门", "type_id": "hot-weekly"},
                {"type_name": "今日热门", "type_id": "hot-daily"},
                {"type_name": "新片速递", "type_id": "new-release"},
                {"type_name": "蓝光无码", "type_id": "uncensored"},
            ]
            return {"class": class_list, "filters": {}, "list": items, "page": 1, "pagecount": 1, "limit": len(items), "total": len(items)}
        except Exception as e:
            print(f"[{self.name}] homeContent error: {e}")
            return {"class": [], "filters": {}, "list": [], "page": 1, "pagecount": 1, "limit": 0, "total": 0}

    def categoryContent(self, tid, pg, filter, extend):
        print(f"[{self.name}] category: {tid} page {pg}")
        try:
            pg = int(pg) if pg else 1
            tmap = {"hot-monthly":"hot","hot-weekly":"hot","hot-daily":"hot"}
            sort_map = {"hot":"video_viewed","hot-monthly":"video_viewed_month","hot-weekly":"video_viewed_week","hot-daily":"video_viewed_today"}
            rpath = tmap.get(tid, tid)
            params = f"?sort_by={sort_map[tid]}" if tid in sort_map else ""
            url = f"{self.host}/{rpath}/{params}" if pg == 1 else f"{self.host}/{rpath}/{pg}/{params}"
            html = self._fetch(url)
            items = self._extract_video_list(html)
            pagecount = 99
            nums = re.findall(r'/(\d+)/"', html)
            if nums:
                ints = [int(x) for x in nums if x.isdigit() and 1 <= int(x) <= 200]
                if ints:
                    pagecount = max(ints)
            total = len(items) * pagecount
            return {"list": items, "page": pg, "pagecount": pagecount, "limit": len(items), "total": total}
        except Exception as e:
            print(f"[{self.name}] category error: {e}")
            return {"list": [], "page": pg, "pagecount": 1, "limit": 0, "total": 0}

    def detailContent(self, ids):
        vid = ids[0] if isinstance(ids, list) else ids
        print(f"[{self.name}] detail: {vid}")
        try:
            html = self._fetch(f"{self.host}/videos/{vid}/")
            title = ""
            m = re.search(r'<h1[^>]*>(.*?)</h1>', html)
            if m: title = re.sub(r'<[^>]+>', '', m.group(1)).strip()
            if not title:
                m = re.search(r'<title>(.*?)</title>', html)
                if m:
                    title = re.sub(r'\s*-\s*Jable\.TV.*', '', m.group(1), flags=re.IGNORECASE).strip()
            if not title:
                m = re.search(r'<h6[^>]*class="[^"]*title[^"]*"[^>]*>(.*?)</h6>', html, re.DOTALL)
                if m: title = re.sub(r'<[^>]+>', '', m.group(1)).strip()

            pic = ""
            m = re.search(r'poster="([^"]+)"', html)
            if m: pic = self.fix_url(m.group(1))
            if not pic:
                m = re.search(r'<meta[^>]*property="og:image"[^>]*content="([^"]+)"', html)
                if m: pic = m.group(1)
            if not pic:
                m = re.search(r'data-src="([^"]*preview\.jpg[^"]*)"', html)
                if m: pic = m.group(1)

            hls_url = ""
            m = re.search(r"var\s+hlsUrl\s*=\s*'([^']+)'", html)
            if m: hls_url = m.group(1)
            if not hls_url:
                m = re.search(r'var\s+hlsUrl\s*=\s*"([^"]+)"', html)
                if m: hls_url = m.group(1)

            vod_play_url = f"默认线路${hls_url}" if hls_url else ""
            vod_play_from = "默认线路" if hls_url else ""
            print(f"[{self.name}] detail ok: {title[:30] if title else 'N/A'}, has_play={bool(hls_url)}")
            return {"list": [{"vod_id": vid, "vod_name": self.clean_text(title), "vod_pic": pic, "vod_play_from": vod_play_from, "vod_play_url": vod_play_url}]}
        except Exception as e:
            print(f"[{self.name}] detail error: {e}")
            return {"list": []}

    def searchContent(self, key, quick, pg):
        pg = int(pg) if pg else 1
        print(f"[{self.name}] search: {key}")
        try:
            html = self._fetch(f"{self.host}/search/", method="POST", data={"searchword": key})
            items = self._extract_video_list(html)
            if not items:
                html = self._fetch(f"{self.host}/search/{key}/")
                items = self._extract_video_list(html)
            print(f"[{self.name}] search results: {len(items)}")
            return {"list": items, "page": pg, "pagecount": 1, "limit": len(items), "total": len(items)}
        except Exception as e:
            print(f"[{self.name}] search error: {e}")
            return {"list": [], "page": pg, "pagecount": 1, "limit": 0, "total": 0}

    def playerContent(self, flag, id, vip_flag):
        print(f"[{self.name}] player: {flag}")
        try:
            if ".m3u8" in (id or "") or ".mp4" in (id or ""):
                print(f"[{self.name}] direct: {id[:50] if id else 'N/A'}...")
                return {"parse": 0, "url": id, "header": json.dumps(self.header)}
            html = self._fetch(f"{self.host}/videos/{id}/")
            hls_url = ""
            m = re.search(r"var\s+hlsUrl\s*=\s*'([^']+)'", html)
            if m: hls_url = m.group(1)
            if not hls_url:
                m = re.search(r'var\s+hlsUrl\s*=\s*"([^"]+)"', html)
                if m: hls_url = m.group(1)
            if hls_url:
                print(f"[{self.name}] play: {hls_url[:50]}...")
                return {"parse": 0, "url": hls_url, "header": json.dumps(self.header)}
            print(f"[{self.name}] play url not found")
            return {"parse": 0, "url": "", "header": ""}
        except Exception as e:
            print(f"[{self.name}] player error: {e}")
            return {"parse": 0, "url": "", "header": ""}
