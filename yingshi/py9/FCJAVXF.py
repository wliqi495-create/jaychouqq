# coding: utf-8
# ============================================================
# FCJAV 生产级最终完美版 (TVBox / FongMi)
# 站点: https://fcjav.com
# 修复: 业余与减薄马赛克分类路由及多维筛选路径
# 最后验证: 2026-09-12
# ============================================================
import json
import base64
import re
from urllib.parse import quote, urljoin, unquote, urlparse, parse_qs

from base.spider import Spider as BaseSpider


class Spider(BaseSpider):
    def __init__(self):
        super(Spider, self).__init__()
        self.extend = ""
        self.host = "https://fcjav.com"
        self.tgGroup = "https://t.me/tvshare23"
        self.vod_actor = "🦋 TG群: @tvshare23"
        self.vod_director = "🦋 蝴蝶影视"
        
        # 修正分类 type_id 路径，确保与站方真实伪静态/参数路由严格一致
        self.classes = [
            {"type_id": "movies?genre=censored", "type_name": "有码 (Censored)"},
            {"type_id": "movies?genre=uncensored", "type_name": "无码 (Uncensored)"},
            {"type_id": "movies", "type_name": "最新/全部"},
            {"type_id": "movies?genre=amateur", "type_name": "业余"},
            {"type_id": "movies?genre=reducing-mosaic", "type_name": "减薄马赛克"},
            {"type_id": "genre/uncensored-leaked", "type_name": "无码流出"},
            {"type_id": "label/s1-no-1-style", "type_name": "S1 NO.1"},
            {"type_id": "label/madonna", "type_name": "Madonna"},
            {"type_id": "label/moodyz-diva", "type_name": "MOODYZ"},
            {"type_id": "label/sod-star", "type_name": "SOD star"},
            {"type_id": "label/hhh-group", "type_name": "HHH Group"},
            {"type_id": "label/oppai", "type_name": "OPPAI"},
            {"type_id": "label/glory-quest", "type_name": "GLORY QUEST"},
            {"type_id": "label/tissue", "type_name": "Tissue"},
            {"type_id": "label/honnaka", "type_name": "Honnaka"},
            {"type_id": "label/fitch", "type_name": "Fitch"},
            {"type_id": "label/das", "type_name": "Das"},
            {"type_id": "genre/amateur", "type_name": "素人"},
            {"type_id": "genre/anal", "type_name": "肛交"},
            {"type_id": "genre/av-idol", "type_name": "AV女优"},
            {"type_id": "genre/beautiful-girl", "type_name": "美少女"},
            {"type_id": "genre/big-tits", "type_name": "巨乳"},
            {"type_id": "genre/blowjob", "type_name": "口交"},
            {"type_id": "genre/cosplay", "type_name": "Cosplay"},
            {"type_id": "genre/creampie", "type_name": "中出"},
            {"type_id": "genre/cumshot", "type_name": "颜射"},
            {"type_id": "genre/bondage", "type_name": "束缚"}
        ]
        
        self.filters = {}
        filter_config = [
            {
                "key": "sort",
                "name": "排序",
                "init": "desc",
                "value": [
                    {"n": "最新更新", "v": "desc"},
                    {"n": "发布日期", "v": "release"},
                    {"n": "最多观看", "v": "viewed"},
                    {"n": "最受喜欢", "v": "liked"},
                    {"n": "最多收藏", "v": "favorite"},
                    {"n": "最早更新", "v": "asc"}
                ]
            },
            {
                "key": "quality",
                "name": "清晰度",
                "init": "all",
                "value": [
                    {"n": "全部", "v": "all"},
                    {"n": "高清(HD)", "v": "hd"},
                    {"n": "普清(SD)", "v": "sd"}
                ]
            },
            {
                "key": "year",
                "name": "年份",
                "init": "all",
                "value": [
                    {"n": "全部", "v": "all"},
                    {"n": "2026", "v": "2026"},
                    {"n": "2025", "v": "2025"},
                    {"n": "2024", "v": "2024"},
                    {"n": "2023", "v": "2023"},
                    {"n": "2022", "v": "2022"}
                ]
            }
        ]
        for c in self.classes:
            if c["type_id"].startswith("movies"):
                self.filters[c["type_id"]] = filter_config

        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Referer": self.host + "/",
        }

    def getName(self):
        return "FCJAV"

    def getDependence(self):
        return []

    def init(self, extend=""):
        self.extend = extend or ""

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
        try:
            r = self.fetch(url, headers=h, timeout=timeout)
            if r and getattr(r, "status_code", 0) == 200:
                txt = getattr(r, "text", "") or ""
                if txt:
                    return txt
        except Exception:
            pass
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
            pass
        try:
            import urllib.request
            if isinstance(data, str):
                data = data.encode("utf-8")
            req = urllib.request.Request(url, data=data, headers=h)
            return urllib.request.urlopen(req, timeout=timeout).read().decode("utf-8", "ignore")
        except Exception:
            return ""

    def _parse_list(self, html):
        items = []
        if not html:
            return items
        blocks = html.split('class="ml-item"')
        for b in blocks[1:]:
            scope = b[:1500]
            m_link = re.search(r'href=["\'](https?://[^"\']*/v/[^"\']+)["\']', scope)
            if not m_link:
                m_link = re.search(r'href=["\'](/v/[^"\']+)["\']', scope)
            if not m_link:
                continue
            link = m_link.group(1)
            vid = link.rstrip("/").split("/v/")[-1]

            m_title = re.search(r'data-title=["\']([^"\']+)["\']', scope) or re.search(r'title=["\']([^"\']+)["\']', scope)
            name = m_title.group(1).strip() if m_title else vid.upper()

            m_pic = re.search(r'data-original=["\']([^"\']+)["\']', scope) or re.search(r'<img[^>]+src=["\']([^"\']+)["\']', scope)
            pic = m_pic.group(1) if m_pic else ""
            if pic and pic.startswith("//"):
                pic = "https:" + pic
            elif pic and not pic.startswith("http"):
                pic = self.host + ("" if pic.startswith("/") else "/") + pic

            m_rem = re.search(r'class=["\'][^"\']*mli-runtimes[^"\']*["\'][^>]*>([^<]+)<', scope) or re.search(r'class=["\'][^"\']*mli-quality[^"\']*["\'][^>]*>([^<]+)<', scope)
            remark = m_rem.group(1).strip() if m_rem else ""

            items.append({
                "vod_id": vid,
                "vod_name": name,
                "vod_pic": pic,
                "vod_remarks": remark,
                "style": {"type": "rect", "ratio": 0.75}
            })
        return items

    def homeContent(self, filter):
        return {"class": self.classes, "filters": self.filters if filter else {}}

    def getHomeContent(self, filter):
        return self.homeContent(filter)

    def homeVideoContent(self):
        html = self._fetch(self.host + "/movies")
        return {"list": self._parse_list(html)}

    def _build_cat_url(self, tid, page, extend):
        p = int(page or 1)
        clean_tid = str(tid or "movies").strip("/")
        extend = extend if isinstance(extend, dict) else {}

        if clean_tid.startswith("movies"):
            if "?" in clean_tid:
                base_path, old_query = clean_tid.split("?", 1)
                query_dict = parse_qs(old_query)
            else:
                base_path = clean_tid
                query_dict = {}

            query_dict["page"] = [str(p)]
            
            sort_val = extend.get("sort")
            if sort_val:
                query_dict["sort"] = [str(sort_val)]
            else:
                query_dict.pop("sort", None)

            quality_val = extend.get("quality")
            if quality_val and quality_val != "all":
                query_dict["quality"] = [str(quality_val)]
            else:
                query_dict.pop("quality", None)

            year_val = extend.get("year")
            if year_val and year_val != "all":
                query_dict["year"] = [str(year_val)]
            else:
                query_dict.pop("year", None)

            query_parts = []
            for k, vals in query_dict.items():
                for v in vals:
                    query_parts.append("%s=%s" % (k, quote(str(v))))

            return "%s/%s?%s" % (self.host, base_path.lstrip("/"), "&".join(query_parts))

        base = "%s/%s" % (self.host, clean_tid)
        if p > 1:
            return base + "/page/%d" % p
        return base

    def categoryContent(self, tid, pg, filter, extend):
        page = int(pg or 1)
        url = self._build_cat_url(tid, page, extend)
        html = self._fetch(url)

        if not html and not str(tid).startswith("movies") and page > 1:
            url_fallback = "%s/%s/pg-%d" % (self.host, str(tid).strip("/"), page)
            html = self._fetch(url_fallback)

        lst = self._parse_list(html)

        pagecount = 1
        page_nums = re.findall(r"pg[-=](\d+)", html) + re.findall(r"page/(\d+)", html) + re.findall(r"[?&]page=(\d+)", html)
        if page_nums:
            try:
                pagecount = max(int(x) for x in page_nums if x.isdigit())
            except Exception:
                pagecount = max(1, page)

        if len(lst) > 0 and pagecount < page:
            pagecount = page + 1

        return {
            "list": lst,
            "page": page,
            "pagecount": pagecount,
            "limit": len(lst) if lst else 24,
            "total": pagecount * (len(lst) if lst else 24),
        }

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

            pic = ""
            for pat in [r'og:image"\s+content="([^"]+)"', r'data-poster="([^"]+)"',
                        r'<img[^>]+class="cover"[^>]+src="([^"]+)"']:
                m = re.search(pat, html)
                if m:
                    pic = m.group(1)
                    break

            content = ""
            m = re.search(r'name="description"\s+content="([^"]*)"', html)
            if m:
                content = m.group(1)
            if not content:
                m = re.search(r'property="og:description"\s+content="([^"]*)"', html)
                if m:
                    content = m.group(1)

            remark = ""
            m = re.search(r'class="mli-runtimes"[^>]*>([^<]+)<', html)
            if m:
                remark = m.group(1).strip()

            eps = re.findall(r'class="switch-source[^"]*"\s+data-source="(\d+)"\s+data-id="(\d+)"[^>]*>[\s\S]*?</button>', html)
            if not eps:
                eps = re.findall(r'data-source="(\d+)"\s+data-id="(\d+)"', html)
            names = re.findall(r'class="switch-source[^"]*"[^>]*>[\s\S]*?</i>\s*([A-Za-z0-9]+)\s*</button>', html)

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
                    froms.append("FCJAV极速专线")
                    urls.append("#".join(ep_list))

            if not froms:
                return self._skeleton(raw, name, pic, remark or "解析中")

            full_desc = (
                "【🔥 官方交流群: %s】\n"
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                "番号: %s\n"
                "片名: %s\n"
                "剧情介绍: %s\n"
                "声明: 资源来源于网络，仅供交流学习。"
            ) % (self.tgGroup, vid.upper(), name, content if content else "暂无简介")

            vod = {
                "vod_id": raw,
                "vod_name": name,
                "vod_pic": pic,
                "vod_remarks": remark or "超清正片",
                "vod_content": full_desc.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"),
                "vod_actor": self.vod_actor,
                "vod_director": self.vod_director,
                "vod_play_from": "$$$".join(froms),
                "vod_play_url": "$$$".join(urls),
            }
            return {"list": [vod]}
        except Exception as e:
            return self._skeleton(raw)

    def _skeleton(self, vid, title="", pic="", remarks="解析中"):
        pid = str(vid).split("|$|")[0].replace("$", "|")
        return {"list": [{
            "vod_id": vid, "vod_name": title or "未知标题", "vod_pic": pic or "",
            "vod_remarks": remarks, "vod_content": "",
            "vod_actor": self.vod_actor, "vod_director": self.vod_director,
            "vod_play_from": "播放", "vod_play_url": "播放$" + pid,
        }]}

    def _clean_tail(self, text):
        return re.sub(r'\s+', ' ', text or '').strip()

    def searchContent(self, key, quick, pg="1"):
        page = int(pg or 1)
        kw = quote(str(key or "").strip())
        if page > 1:
            url = "%s/search/%s/page/%d" % (self.host, kw, page)
        else:
            url = "%s/search/%s" % (self.host, kw)
        html = self._fetch(url)
        lst = self._parse_list(html)
        return {"list": lst, "page": page, "pagecount": 10}

    def _decode_player_enc(self, enc, pk):
        try:
            raw = base64.b64decode(enc)
            key = pk.encode("utf-8")
            out = bytes([raw[i] ^ key[i % len(key)] for i in range(len(raw))])
            return out.decode("utf-8", errors="ignore")
        except Exception:
            return ""

    def _extract_play_url(self, iframe_html):
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
                return {"parse": 0, "url": raw, "header": {"User-Agent": self.headers["User-Agent"]}}
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
            return {"parse": 1, "url": ("%s/v/%s" % (self.host, slug)) if slug else (self.host + "/movies"), "header": self.headers}

        ajax_headers = {
            "User-Agent": self.headers["User-Agent"],
            "Referer": ("%s/v/%s" % (self.host, slug)) if slug else (self.host + "/"),
            "X-Requested-With": "XMLHttpRequest",
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        }
        body = {"episode": eid, "filmId": film_id, "pt": pt}
        resp = self._post(self.host + "/ajax/player", data=body, headers=ajax_headers)
        if not resp:
            return {"parse": 1, "url": ("%s/v/%s" % (self.host, slug)) if slug else (self.host + "/movies"), "header": self.headers}
        try:
            j = json.loads(resp)
        except Exception:
            return {"parse": 1, "url": ("%s/v/%s" % (self.host, slug)) if slug else (self.host + "/movies"), "header": self.headers}
        if j.get("error"):
            return {"parse": 1, "url": ("%s/v/%s" % (self.host, slug)) if slug else (self.host + "/movies"), "header": self.headers}

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
            return {"parse": 0, "url": play_url, "header": {"User-Agent": self.headers["User-Agent"], "Referer": self.host + "/"}}
        if iframe_url:
            return {"parse": 1, "url": iframe_url, "header": self.headers}
        return {"parse": 1, "url": ("%s/v/%s" % (self.host, slug)) if slug else (self.host + "/movies"), "header": self.headers}

    def recommendContent(self, ids, pg):
        return {"list": []}

    def liveContent(self, url):
        return []

    def destroy(self):
        pass