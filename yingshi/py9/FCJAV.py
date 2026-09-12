# coding: utf-8
# ============================================================
# FCJAV 爬虫源 (TVBox / FongMi)
# 站点: https://fcjav.com
# 类型: HTML 影视站（成人 JAV）
# 播放: /ajax/player 返回 player_enc (base64) XOR(pk) -> iframe -> urlPlay mp4 直链
# 最后验证: 2026-09-12
# 来源: 自研逆向
# ============================================================
import json
import base64
import re
from urllib.parse import quote, urljoin, unquote, urlparse

from base.spider import Spider as BaseSpider


class Spider(BaseSpider):
    def __init__(self):
        # 零网络：只做本地初始化
        self.extend = ""
        self.host = "https://fcjav.com"
        self.classes = [
            {"type_id": "movies", "type_name": "最新"},
            {"type_id": "amateur", "type_name": "业余"},
            {"type_id": "censored", "type_name": "有码"},
            {"type_id": "uncensored", "type_name": "无码"},
            {"type_id": "reducing-mosaic", "type_name": "减薄马赛克"},
            {"type_id": "uncensored-leaked", "type_name": "无码流出"},
            {"type_id": "genre/amateur", "type_name": "素人"},
            {"type_id": "genre/anal", "type_name": "肛交"},
            {"type_id": "genre/av-idol", "type_name": "AV女优"},
            {"type_id": "genre/beautiful-girl", "type_name": "美少女"},
            {"type_id": "genre/big-tits", "type_name": "巨乳"},
            {"type_id": "genre/blowjob", "type_name": "口交"},
            {"type_id": "genre/cosplay", "type_name": "Cosplay"},
            {"type_id": "genre/creampie", "type_name": "中出"},
            {"type_id": "genre/cumshot", "type_name": "颜射"},
            {"type_id": "genre/bondage", "type_name": "束缚"},
        ]
        self.filters = {}
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Linux; Android 14; 22127RK46C) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
            "Referer": self.host + "/",
        }

    def getName(self):
        return "FCJAV"

    def getDependence(self):
        return []

    def init(self, extend=""):
        # 零网络
        self.extend = extend or ""

    # ---------------- 基础工具 ----------------
    @staticmethod
    def _norm_ids(ids):
        if ids is None:
            return ""
        if isinstance(ids, (list, tuple)):
            if not ids:
                return ""
            ids = ids[0]
        if isinstance(ids, bytes):
            ids = ids.decode("utf-8", errors="ignore")
        return str(ids).strip()

    def _fetch(self, url, headers=None, timeout=15):
        h = dict(self.headers)
        h.update(headers or {})
        # 优先走壳子原生 fetch（真实 TVBox 环境）
        try:
            r = self.fetch(url, headers=h, timeout=timeout)
            if r and getattr(r, "status_code", 0) == 200:
                txt = getattr(r, "text", "") or ""
                if txt:
                    return txt
        except Exception:
            pass
        # 兜底：urllib（测试沙盒无 requests 时使用）
        try:
            import urllib.request
            req = urllib.request.Request(url, headers=h)
            return urllib.request.urlopen(req, timeout=timeout).read().decode("utf-8", "ignore")
        except Exception:
            return ""

    def _post(self, url, data, headers=None, timeout=15):
        h = dict(self.headers)
        h.update(headers or {})
        try:
            r = self.post(url, data=data, headers=h, timeout=timeout)
            if r and getattr(r, "status_code", 0) == 200:
                return getattr(r, "text", "") or ""
        except Exception as e:
            self.log({"post": "native_fail", "u": url, "err": str(e)[:120]})
        try:
            import urllib.request
            if isinstance(data, str):
                data = data.encode("utf-8")
            req = urllib.request.Request(url, data=data, headers=h)
            return urllib.request.urlopen(req, timeout=timeout).read().decode("utf-8", "ignore")
        except Exception as e:
            self.log({"post": "urllib_fail", "u": url, "err": str(e)[:120]})
            return ""

    # ---------------- 列表解析 ----------------
    def _parse_list(self, html):
        items = []
        if not html:
            return items
        # 卡片容器 .ml-item
        blocks = re.split(r'<div class="ml-item">', html)[1:]
        for b in blocks:
            m_link = re.search(r'href="(https?://[^"]*/v/[^"]+)"', b)
            if not m_link:
                continue
            link = m_link.group(1)
            vid = link.rstrip("/").split("/v/")[-1]
            m_title = re.search(r'<a[^>]+class="ml-mask[^"]*"[^>]*title="([^"]*)"', b)
            if not m_title:
                m_title = re.search(r'title="([^"]*)"', b)
            name = m_title.group(1).strip() if m_title else vid
            # 封面：优先 data-original
            m_pic = re.search(r'data-original="([^"]+)"', b)
            if not m_pic:
                m_pic = re.search(r'<img[^>]+src="([^"]+)"', b)
            pic = m_pic.group(1) if m_pic else ""
            # 角标：片长
            m_rem = re.search(r'class="mli-runtimes"[^>]*>([^<]+)<', b)
            if not m_rem:
                m_rem = re.search(r'class="mli-code"[^>]*>([^<]+)<', b)
            remark = m_rem.group(1).strip() if m_rem else ""
            items.append({
                "vod_id": vid,
                "vod_name": name,
                "vod_pic": pic,
                "vod_remarks": remark,
            })
        return items

    # ---------------- 首页 ----------------
    def homeContent(self, filter):
        return {"class": self.classes, "filters": self.filters if filter else {}}

    def getHomeContent(self, filter):
        return self.homeContent(filter)

    def homeVideoContent(self):
        html = self._fetch(self.host + "/movies")
        return {"list": self._parse_list(html)}

    # ---------------- 分类 ----------------
    def _build_cat_url(self, tid, page):
        p = int(page or 1)
        tid = str(tid or "movies")
        # genre/xxx 形式：/genre/xxx[/pg-N]
        if tid.startswith("genre/"):
            base = "%s/%s" % (self.host, tid)
            return base + ("/pg-%d" % p if p > 1 else "")
        # 最新：/movies[/pg-N]
        if tid == "movies":
            base = self.host + "/movies"
            return base + ("/pg-%d" % p if p > 1 else "")
        # 这两个筛选在 /movies?genre= 会触发站点 SQL 报错，改走 /genre/{slug}
        if tid in ("uncensored-leaked", "reducing-mosaic"):
            base = "%s/genre/%s" % (self.host, tid)
            return base + ("/pg-%d" % p if p > 1 else "")
        # 其余筛选类（amateur/censored/uncensored 等）：/movies?genre=xxx[&pg=N]
        base = "%s/movies?genre=%s" % (self.host, tid)
        return base + ("&pg=%d" % p if p > 1 else "")
    def categoryContent(self, tid, pg, filter, extend):
        page = int(pg or 1)
        url = self._build_cat_url(tid, page)
        html = self._fetch(url)
        lst = self._parse_list(html)

        # 总页数：定位分页容器 <ul class='pagination'>，取其中最大的 pg-N / pg=N 页码
        pagecount = 1
        pages = []
        m = re.search(r"<ul[^>]*class=['\"]pagination['\"][^>]*>[\s\S]*?</ul>", html or "")
        seg = m.group(0) if m else (html or "")
        # 兼容单引号/双引号属性写法，且同时匹配 pg-N 与 pg=N
        for mm in re.finditer(r"pg[-=](\d+)", seg):
            try:
                pages.append(int(mm.group(1)))
            except Exception:
                pass
        if pages:
            pagecount = max(pages)
            if pagecount < page:
                pagecount = page
        else:
            # 兜底：从 "1 of N" / "N / M" 文字型分页提取
            m2 = re.search(r"of\s+(\d+)", seg)
            if m2:
                try:
                    pagecount = max(int(m2.group(1)), page)
                except Exception:
                    pagecount = page

        return {
            "list": lst,
            "page": page,
            "pagecount": pagecount,
            "limit": 24,
            "total": pagecount * 24,
        }
    def _skeleton(self, vid, title="", pic="", remarks="解析中"):
        pid = str(vid).split("|$|")[0].replace("$", "|")
        return {"list": [{
            "vod_id": vid, "vod_name": title or "未知标题", "vod_pic": pic or "",
            "vod_remarks": remarks, "vod_content": "",
            "vod_play_from": "播放", "vod_play_url": "播放$" + pid,
        }]}

    def _clean_tail(self, text):
        return re.sub(r'\s+', ' ', text or '').strip()

    def detailContent(self, ids):
        raw = self._norm_ids(ids)
        if not raw:
            return {"list": []}
        vid = raw.split("|$|")[0]
        try:
            durl = vid if vid.startswith("http") else "%s/v/%s" % (self.host, vid)
            html = self._fetch(durl)
            if not html or len(html) < 500:
                return self._skeleton(raw, vid, "", "解析中")

            # 标题
            name = ""
            m = re.search(r'<h1[^>]*>(.*?)</h1>', html, re.S)
            if m:
                name = self._clean_tail(re.sub(r'<[^>]+>', '', m.group(1)))
            if not name:
                m = re.search(r'<title>(.*?)</title>', html, re.S)
                if m:
                    name = self._clean_tail(m.group(1))
                    name = re.sub(r'\s*[-|]\s*FCJAV.*$', '', name, flags=re.I)
            if not name:
                name = vid

            # 封面
            pic = ""
            for pat in [r'og:image"\s+content="([^"]+)"', r'data-poster="([^"]+)"',
                        r'<img[^>]+class="cover"[^>]+src="([^"]+)"']:
                m = re.search(pat, html)
                if m:
                    pic = m.group(1)
                    break

            # 简介（描述）
            content = ""
            m = re.search(r'name="description"\s+content="([^"]*)"', html)
            if m:
                content = m.group(1)
            if not content:
                m = re.search(r'property="og:description"\s+content="([^"]*)"', html)
                if m:
                    content = m.group(1)

            # 片长
            remark = ""
            m = re.search(r'class="mli-runtimes"[^>]*>([^<]+)<', html)
            if m:
                remark = m.group(1).strip()

            # 线路/剧集：switch-source 按钮，data-id 为剧集ID
            eps = re.findall(r'class="switch-source[^"]*"\s+data-source="(\d+)"\s+data-id="(\d+)"[^>]*>[\s\S]*?</button>', html)
            # 兼容缺 i 标签的写法
            if not eps:
                eps = re.findall(r'data-source="(\d+)"\s+data-id="(\d+)"', html)
            # 线路名（按钮文本，作为剧集名）
            names = re.findall(r'class="switch-source[^"]*"[^>]*>[\s\S]*?</i>\s*([A-Za-z0-9]+)\s*</button>', html)

            film_id = ""
            m = re.search(r'filmId\s*=\s*(\d+)', html)
            if m:
                film_id = m.group(1)

            froms = []
            urls = []
            if eps:
                ep_list = []
                seen = set()
                for idx, (src, eid) in enumerate(eps):
                    if eid in seen:
                        continue
                    seen.add(eid)
                    ep_name = names[idx] if idx < len(names) else ("线路%d" % (idx + 1))
                    pid = "%s|%s|%s" % (src, eid, vid)
                    ep_list.append("%s$%s" % (ep_name, pid))
                if ep_list:
                    froms.append("播放")
                    urls.append("#".join(ep_list))

            if not froms:
                return self._skeleton(raw, name, pic, remark or "解析中")

            vod = {
                "vod_id": raw,
                "vod_name": name,
                "vod_pic": pic,
                "vod_remarks": remark,
                "vod_content": content,
                "vod_play_from": "$$$".join(froms),
                "vod_play_url": "$$$".join(urls),
            }
            # 自检对齐
            if len(vod["vod_play_from"].split("$$$")) != len(vod["vod_play_url"].split("$$$")):
                return self._skeleton(raw, name, pic, remark or "解析中")
            return {"list": [vod]}
        except Exception as e:
            self.log({"detail": "exception", "ids": raw, "error": str(e)})
            return self._skeleton(raw)

    # ---------------- 搜索 ----------------
    def searchContent(self, key, quick, pg="1"):
        page = int(pg or 1)
        kw = quote(str(key or "").strip())
        if page > 1:
            url = "%s/search/%s/pg-%d" % (self.host, kw, page)
        else:
            url = "%s/search/%s" % (self.host, kw)
        html = self._fetch(url)
        lst = self._parse_list(html)
        return {"list": lst, "page": page}

    # ---------------- 播放 ----------------
    def _decode_player_enc(self, enc, pk):
        """player_enc base64 -> XOR(pk ASCII) -> 明文 HTML"""
        try:
            raw = base64.b64decode(enc)
            key = pk.encode("utf-8")
            out = bytes([raw[i] ^ key[i % len(key)] for i in range(len(raw))])
            return out.decode("utf-8", errors="ignore")
        except Exception as e:
            self.log({"decode_player_enc": "fail", "error": str(e)})
            return ""

    def _extract_play_url(self, iframe_html):
        """从 iframe(jwplayer) 页面提取 urlPlay mp4/m3u8 直链"""
        if not iframe_html:
            return ""
        for pat in [r"var\s+urlPlay\s*=\s*'([^']+)'", r'var\s+urlPlay\s*=\s*"([^"]+)"',
                    r'"file"\s*:\s*"([^"]+)"', r"'file'\s*:\s*'([^']+)'"]:
            m = re.search(pat, iframe_html)
            if m and m.group(1):
                return m.group(1).strip()
        return ""

    def playerContent(self, flag, id, vipFlags):
        raw = str(id or "")
        if "$" in raw:
            raw = raw.split("$", 1)[1]

        film_id, eid, slug = "", "", ""
        if "|" in raw and not raw.startswith("http"):
            parts = raw.split("|")
            film_id = parts[0]
            eid = parts[1] if len(parts) > 1 else ""
            slug = parts[2] if len(parts) > 2 else ""
        elif raw.startswith("http"):
            if raw.endswith((".mp4", ".m3u8")):
                return {"parse": 0, "url": raw,
                        "header": {"User-Agent": self.headers["User-Agent"]}}
            slug = raw.rstrip("/").split("/v/")[-1]
        else:
            slug = raw

        pt, pk = "", ""
        det = ""
        if slug:
            det = self._fetch("%s/v/%s" % (self.host, slug))
        if det:
            if not film_id:
                m = re.search(r'filmId\s*=\s*(\d+)', det)
                if m:
                    film_id = m.group(1)
                m = re.search(r'data-source="(\d+)"\s+data-id="(\d+)"', det)
                if m:
                    film_id = m.group(1)
                    if not eid:
                        eid = m.group(2)
            pt_m = re.search(r'__pt\s*=\s*"([^"]+)"', det)
            pk_m = re.search(r'__pk\s*=\s*"([^"]+)"', det)
            pt = pt_m.group(1) if pt_m else ""
            pk = pk_m.group(1) if pk_m else ""

        if not film_id or not pt or not pk:
            return {"parse": 1, "url": ("%s/v/%s" % (self.host, slug)) if slug else (self.host + "/movies"),
                    "header": self.headers}

        ajax_headers = {
            "User-Agent": self.headers["User-Agent"],
            "Referer": ("%s/v/%s" % (self.host, slug)) if slug else (self.host + "/"),
            "X-Requested-With": "XMLHttpRequest",
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        }
        body = "episode=%s&filmId=%s&pt=%s" % (eid, film_id, pt)
        resp = self._post(self.host + "/ajax/player", data=body, headers=ajax_headers)
        if not resp:
            return {"parse": 1, "url": ("%s/v/%s" % (self.host, slug)) if slug else (self.host + "/movies"),
                    "header": self.headers}
        try:
            j = json.loads(resp)
        except Exception:
            return {"parse": 1, "url": ("%s/v/%s" % (self.host, slug)) if slug else (self.host + "/movies"),
                    "header": self.headers}
        if j.get("error"):
            return {"parse": 1, "url": ("%s/v/%s" % (self.host, slug)) if slug else (self.host + "/movies"),
                    "header": self.headers}

        iframe_html = ""
        if j.get("player_enc"):
            iframe_html = self._decode_player_enc(j.get("player_enc", ""), pk)
        elif j.get("player"):
            iframe_html = j.get("player", "")

        iframe_url = ""
        m = re.search(r'src="([^"]+)"', iframe_html or "")
        if m:
            iframe_url = m.group(1)

        play_url = ""
        if iframe_url:
            ih = self._fetch(iframe_url, headers={
                "User-Agent": self.headers["User-Agent"],
                "Referer": self.host + "/",
            })
            play_url = self._extract_play_url(ih)

        if play_url:
            return {"parse": 0, "url": play_url,
                    "header": {"User-Agent": self.headers["User-Agent"], "Referer": self.host + "/"}}
        if iframe_url:
            return {"parse": 1, "url": iframe_url, "header": self.headers}
        return {"parse": 1, "url": ("%s/v/%s" % (self.host, slug)) if slug else (self.host + "/movies"),
                "header": self.headers}

    # ---------------- 推荐 ----------------
    def recommendContent(self, ids, pg):
        raw = self._norm_ids(ids)
        if not raw:
            return {"list": []}
        html = self._fetch(self.host + "/movies")
        lst = self._parse_list(html)
        # 去掉自身
        vid = raw.split("|$|")[0].split("/v/")[-1]
        out = [x for x in lst if x.get("vod_id") != vid][:12]
        return {"list": out}

    # ---------------- 其它 ----------------
    def liveContent(self, url):
        return []

    def destroy(self):
        pass
