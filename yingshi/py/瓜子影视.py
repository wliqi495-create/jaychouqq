# coding=utf-8
import re
import json
import requests
from urllib.parse import quote, urljoin

from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry
requests.packages.urllib3.disable_warnings()

from base.spider import Spider


class Spider(Spider):
    def getName(self):
        return "瓜子影视"

    def init(self, extend=""):
        super().init(extend)
        self.site_url = "https://www.tvguazi.com"
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
            "Referer": self.site_url + "/",
            "Accept-Language": "zh-CN,zh;q=0.9",
        }
        self.page_size = 20
        self.total = 9999

        self.sess = requests.Session()
        retry = Retry(total=3, backoff_factor=0.8, status_forcelist=[500, 502, 503, 504])
        self.sess.mount("https://", HTTPAdapter(max_retries=retry))
        self.sess.mount("http://", HTTPAdapter(max_retries=retry))

    def fetch(self, url, timeout=12):
        try:
            res = self.sess.get(url, headers=self.headers, timeout=timeout, verify=False)
            res.encoding = res.apparent_encoding or "utf-8"
            return res
        except Exception:
            return None

    def _full_url(self, u):
        if not u:
            return ""
        if u.startswith("//"):
            return "https:" + u
        if u.startswith("http://") or u.startswith("https://"):
            return u
        return urljoin(self.site_url, u)

    def _clean(self, s):
        if not s:
            return ""
        s = re.sub(r"<[^>]+>", "", s)
        return re.sub(r"\s+", " ", s).strip()

    def homeContent(self, filter):
        cate_list = [
            {"type_name": "电影", "type_id": "229"},
            {"type_name": "电视剧", "type_id": "230"},
            {"type_name": "综艺", "type_id": "231"},
            {"type_name": "动漫", "type_id": "232"},
        ]
        return {"class": cate_list}

    def _parse_vod_list(self, html):
        video_list = []
        seen = set()

        # 先抓详情链接（主键）
        for m in re.finditer(r'href=["\']([^"\']*/vod/detail\.html\?[^"\']*id=\d+[^"\']*)["\']', html, re.I):
            href = self._full_url(m.group(1))
            if href in seen:
                continue
            seen.add(href)

            # 截取附近HTML块，提取标题/图片/备注
            st = max(0, m.start() - 500)
            ed = min(len(html), m.end() + 1200)
            block = html[st:ed]

            # 标题：优先title，其次alt，其次锚文本
            title = ""
            t1 = re.search(r'title=["\']([^"\']+)["\']', block, re.I)
            if t1:
                title = self._clean(t1.group(1))
            if not title:
                t2 = re.search(r'alt=["\']([^"\']+)["\']', block, re.I)
                if t2:
                    title = self._clean(t2.group(1))
            if not title:
                t3 = re.search(r'>([^<>]{1,80})</a>', block, re.I)
                if t3:
                    title = self._clean(t3.group(1))

            # 图片：data-src / data-original / src
            pic = ""
            p = re.search(r'(?:data-src|data-original|src)=["\']([^"\']+)["\']', block, re.I)
            if p:
                pic = self._full_url(p.group(1))

            # 备注：分数/更新/年份等
            remarks = ""
            r1 = re.search(r'(\d\.\d)\s*分', block)
            if r1:
                remarks = r1.group(1) + "分"
            else:
                r2 = re.search(r'更新至[^<\s]{1,20}', block)
                if r2:
                    remarks = self._clean(r2.group(0))

            if title:
                video_list.append({
                    "vod_id": href,
                    "vod_name": title,
                    "vod_pic": pic,
                    "vod_remarks": remarks,
                    "style": {"type": "rect", "ratio": 1.33}
                })

        return video_list

    def categoryContent(self, tid, pg, filter, extend):
        pg = int(pg) if str(pg).isdigit() else 1

        # 支持扩展子分类 cate_id
        cate_id = ""
        if isinstance(extend, dict):
            cate_id = str(extend.get("cate_id", "")).strip()

        if cate_id and cate_id.isdigit():
            list_url = f"{self.site_url}/vod/index.html?cate_id={cate_id}&type_id={tid}&page={pg}"
        else:
            list_url = f"{self.site_url}/vod/index.html?type_id={tid}&page={pg}"

        res = self.fetch(list_url)
        video_list = []
        if res and res.ok:
            video_list = self._parse_vod_list(res.text)

        pagecount = pg + 1 if len(video_list) else pg
        return {
            "list": video_list,
            "page": pg,
            "pagecount": pagecount,
            "limit": self.page_size,
            "total": self.total
        }

    def detailContent(self, ids):
        vod_id = ids[0] if ids else ""
        if not vod_id:
            return {"list": [{"vod_name": "视频ID为空"}]}

        res = self.fetch(vod_id)
        if not (res and res.ok):
            return {"list": [{"vod_id": vod_id, "vod_name": "视频详情解析失败"}]}

        html = res.text

        vod_name = ""
        for p in [
            r'<h1[^>]*>(.*?)</h1>',
            r'<meta\s+property=["\']og:title["\']\s+content=["\']([^"\']+)["\']',
            r'<title>([^<]+)</title>'
        ]:
            m = re.search(p, html, re.I | re.S)
            if m:
                vod_name = self._clean(m.group(1)).replace("瓜子影视-", "").strip()
                if vod_name:
                    break
        if not vod_name:
            vod_name = "未知名称"

        vod_pic = ""
        for p in [
            r'<meta\s+property=["\']og:image["\']\s+content=["\']([^"\']+)["\']',
            r'<img[^>]+(?:data-src|data-original|src)=["\']([^"\']+)["\'][^>]*>'
        ]:
            m = re.search(p, html, re.I | re.S)
            if m:
                vod_pic = self._full_url(m.group(1))
                if vod_pic:
                    break

        vod_content = ""
        m_desc = re.search(r'简介[：:]\s*(.*?)</', html, re.I | re.S)
        if m_desc:
            vod_content = self._clean(m_desc.group(1))
        if not vod_content:
            m_desc2 = re.search(r'<meta\s+name=["\']description["\']\s+content=["\']([^"\']+)["\']', html, re.I)
            if m_desc2:
                vod_content = self._clean(m_desc2.group(1))

        # 提取播放链接：优先带 line_id 的 player.html
        play_urls = []
        for m in re.finditer(r'href=["\']([^"\']*/vod/player\.html\?[^"\']*)["\'][^>]*>(.*?)</a>', html, re.I | re.S):
            u = self._full_url(m.group(1))
            name = self._clean(m.group(2))
            if not name:
                name = "播放"
            if u and u not in [x[1] for x in play_urls]:
                play_urls.append((name, u))

        # 兜底：详情页里有时只给“立即播放”
        if not play_urls:
            for m in re.finditer(r'href=["\']([^"\']*/vod/player\.html\?[^"\']*)["\']', html, re.I):
                u = self._full_url(m.group(1))
                if u and u not in [x[1] for x in play_urls]:
                    play_urls.append(("播放", u))

        vod_play_url = "#".join([f"{n}${u}" for n, u in play_urls]) if play_urls else ""

        detail_info = {
            "vod_id": vod_id,
            "vod_name": vod_name,
            "vod_pic": vod_pic,
            "type_name": "",
            "vod_remarks": "",
            "vod_content": vod_content,
            "vod_play_from": "瓜子线路",
            "vod_play_url": vod_play_url
        }
        return {"list": [detail_info]}

    def searchContent(self, key, quick, pg=1):
        pg = int(pg) if str(pg).isdigit() else 1
        wd = quote(key)
        # 站点搜索入口：/search/index.html?keyword=xxx
        search_url = f"{self.site_url}/search/index.html?keyword={wd}&page={pg}"

        res = self.fetch(search_url)
        video_list = []
        if res and res.ok:
            video_list = self._parse_vod_list(res.text)

        pagecount = pg + 1 if len(video_list) else pg
        return {
            "list": video_list,
            "page": pg,
            "pagecount": pagecount,
            "limit": self.page_size,
            "total": self.total if len(video_list) else 0
        }

    def playerContent(self, flag, id, vipFlags):
        # id 可能是 “节点$URL” 或直接URL
        play_page = id.split("$", 1)[1] if "$" in id else id
        play_page = self._full_url(play_page)

        if not play_page:
            return {"parse": 0, "url": "", "header": self.headers}

        # 若已是直链
        if re.search(r'\.(m3u8|mp4|flv)(\?|$)', play_page, re.I):
            return {"parse": 0, "url": play_page, "header": self.headers}

        res = self.fetch(play_page)
        if not (res and res.ok):
            return {"parse": 1, "url": play_page, "header": self.headers}

        html = res.text
        final_url = ""

        # 常见直链提取
        patterns = [
            r'["\'](https?://[^"\']+\.m3u8[^"\']*)["\']',
            r'["\'](https?://[^"\']+\.mp4[^"\']*)["\']',
            r'"url"\s*:\s*"([^"]+)"',
            r"var\s+url\s*=\s*'([^']+)'",
            r'var\s+url\s*=\s*"([^"]+)"',
            r'<source[^>]+src=["\']([^"\']+)["\']'
        ]
        for p in patterns:
            m = re.search(p, html, re.I | re.S)
            if m:
                u = m.group(1).replace("\\/", "/")
                final_url = self._full_url(u)
                if final_url:
                    break

        # 解析 MacCMS 风格 player_xxx JSON
        if not final_url:
            j = re.search(r'var\s+player_[a-zA-Z0-9_]+\s*=\s*(\{.*?\});', html, re.S)
            if j:
                try:
                    obj = json.loads(j.group(1))
                    u = obj.get("url", "")
                    if u:
                        final_url = self._full_url(u.replace("\\/", "/"))
                except Exception:
                    pass

        # 拿到直链则 parse=0；否则交给外部解析
        if final_url and re.search(r'^(https?:)?//', final_url):
            if final_url.startswith("//"):
                final_url = "https:" + final_url
            return {"parse": 0, "url": final_url, "header": self.headers}

        return {"parse": 1, "url": play_page, "header": self.headers}