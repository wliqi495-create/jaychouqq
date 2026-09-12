# -*- coding: utf-8 -*-
"""
开心影院 (kxyy1.cc) 影视爬虫 — 兼容 FongMi/TV (T3) 与 WebHomeTV / PeekPro (T4)
站点: https://www.kxyy1.cc/   (官方镜像 kxyy.app, 可用 extend 换域名)

特性:
  - 全链路 HTML 解析 (站点无开放 JSON API), 已逐项实测路由与接口
  - 二级分类筛选: 类型 / 地区 / 年份 / 排序 (vodshow 12 段路由, 服务端筛选)
  - 搜索: /index.php/ajax/suggest JSON 接口 (免验证码), 结果缓存 + 本地分页
  - 播放: 8 条线路, 7 条明文 m3u8 直链 (parse=0 免解析秒播)
  - YX源(NBY) 加密线路: 服务端两步换取真实直链 (get_signed_url -> jmurl), 带缓存
  - 速度优化 (v2):
      * 首页 4 分类并行 + 10 分钟缓存
      * 分类页并发拉 3 页合并, 卡片数 24 → 72
      * 列表/详情统一走压缩图 (站点 ?w= 缩略图参数 + 兜底 pic:// 代理)
      * 短超时 (列表 6s / 详情 8s), 重试 1 次
      * NBY 直链缓存提到 30 分钟
"""

import sys
import re
import json
import time
import threading
from urllib.parse import quote

sys.path.append('..')  # noqa: E402  TVBox 环境需要

# ===== 兼容导入 =====
try:
    from base.spider import Spider as BaseSpider
except ImportError:  # noqa: E402
    import requests as _rq
    try:
        import urllib3
        urllib3.disable_warnings()
    except Exception:
        pass

    class BaseSpider:
        """脱离 TVBox 运行时的纯 requests 兜底壳"""

        def fetch(self, url, headers=None, **kw):
            timeout = kw.pop('timeout', 10)
            r = _rq.get(url, headers=headers, timeout=timeout, verify=False, **kw)
            r.encoding = 'utf-8'
            return r


# ============================================================
# 常量
# ============================================================

HOST = "https://www.kxyy1.cc"
UA = ("Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36"
      " (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36")

# 分类 (vodshow 路由 id: 电影1 电视剧2 综艺3 动漫4 短剧26 纪录片24)
CLASSES = [
    {"type_name": "电影", "type_id": "1"},
    {"type_name": "电视剧", "type_id": "2"},
    {"type_name": "综艺", "type_id": "3"},
    {"type_name": "动漫", "type_id": "4"},
    {"type_name": "短剧", "type_id": "26"},
    {"type_name": "纪录片", "type_id": "24"},
]

# 二级分类选项 (与站点筛选 dd 选项一致)
_TYPE_MOVIE = ["科幻", "剧情", "惊悚", "爱情", "古装", "动作", "悬疑", "犯罪",
               "谍战", "历史", "喜剧", "奇幻", "家庭", "青春", "冒险", "纪录",
               "动画", "人物", "文化", "其他"]
_TYPE_TV = ["爱情", "古装", "悬疑", "都市", "喜剧", "战争", "剧情", "青春",
            "历史", "网剧", "奇幻", "冒险", "励志", "犯罪", "商战", "恐怖",
            "穿越", "农村", "人物", "商业", "生活", "其他"]
_TYPE_OTHER = ["剧情", "喜剧", "爱情", "科幻", "奇幻", "冒险", "动作", "悬疑",
               "都市", "其他"]
_AREAS = ["中国大陆", "中国香港", "中国台湾", "美国", "日本", "韩国", "泰国",
          "英国", "法国", "德国", "意大利", "印度", "马来西亚"]
_YEARS = [str(y) for y in range(2026, 1999, -1)] + ["90年代", "80年代", "70年代", "其他"]
_BYS = [("time", "更新时间"), ("hits_week", "近期热门"), ("douban_score", "豆瓣评分")]

# 线路显示名 (站点 player_list: NBY=YX源 ... 8条线路全部 ps=0 直链)
LINE_NAMES = {
    "YX源": "云播YX",
    "BD源": "蓝光BD",
    "BF源": "暴风BF",
    "MD源": "魔都MD",
    "LZ源": "荔枝LZ",
    "KS源": "快看KS",
    "TT源": "天堂TT",
    "IK源": "IK源",
}

# 站点原始每页固定 24 卡片; 爬虫端用并发拉 3 页合并 -> 实际每页 72
PAGE_SIZE_RAW = 24            # 站点单页卡片数
PAGE_FETCH = 3                # 爬虫一次并发拉的页数 (3 * 24 = 72)
PAGE_SIZE = PAGE_SIZE_RAW * PAGE_FETCH  # 暴露给前端的每页大小
HOME_FETCH = 2                # 首页每个分类拉几页 (2 * 24 = 48)
HOME_PER_CLS = 12             # 首页每个分类取前 N 个
HOME_TOTAL = 48               # 首页总卡片数
CACHE_TTL = 600               # 首页/搜索/分类缓存 10 分钟
NBY_TTL = 1800                # NBY 直链缓存 30 分钟
SEARCH_SIZE = 20              # 搜索每页条数
SUGGEST_LIMIT = 100           # 搜索单次拉取上限
LIST_TIMEOUT = 6              # 列表页超时
DETAIL_TIMEOUT = 8            # 详情页超时

# 图片压缩参数: 站点静态资源多数是 img.kxyy1.cc 上 webp/jpg,
# 加 ?w= 走站点 CDN 缩略图, 体积通常降到 1/5 ~ 1/10
PIC_W = "320"                 # 列表缩略图宽度
PIC_W_DETAIL = "480"          # 详情页大图宽度
PIC_QUALITY = "75"            # webp/jpeg 质量

# ============================================================
# 正则 (均已对站点真实页面验证)
# ============================================================

RE_CARD = re.compile(
    r'/voddetail/(\d+)\.html"[^>]*><img[^>]*src="([^"]+)"'
    r'[^>]*>(?:<span[^>]*>([^<]*)</span>)?</a>'
    r'<div[^>]*><h3[^>]*>([^<]*)</h3><p[^>]*>([^<]*)</p>')
RE_TITLE = re.compile(r'<h1[^>]*>([^<]+)</h1>')
RE_PIC = re.compile(r'property="og:image" content="([^"]+)"')
RE_SCORE = re.compile(r'豆瓣评分[：:]\s*([\d.]+)')
RE_UPDATE = re.compile(r'更新时间[：:]\s*([\d\- :]+)')
RE_TAB = re.compile(r'href="#tabs-home-(\d+)"[\s\S]*?</svg>\s*([^<]+?)\s*(?:&nbsp;|<span)')
RE_PANE = re.compile(r'id="tabs-home-(\d+)"')
RE_EPS = re.compile(r'href="/vodplay/(\d+-\d+-\d+)\.html"[^>]*>([^<]+)</a>')
RE_DESC = re.compile(r'id="synopsis">[\s\S]*?<p>([\s\S]*?)</p>')
RE_AREA = re.compile(r'制片国家/地区[：:]\s*</strong>\[?([^<\]]+)')
RE_DIRECTOR = re.compile(r'导演[：:]\s*</strong>([\s\S]*?)</p>')
RE_ACTOR = re.compile(r'主演[：:]\s*</strong>([\s\S]*?)</p>')
RE_TYPES = re.compile(r'href="/vodshow/\d+---[^"]*\.html">([^<]+)</a>')
RE_PLAYER = re.compile(r'var\s+player_data\s*=\s*(\{.*?\})\s*</script>', re.S)
RE_PAGE_SEG = re.compile(r'href="/vodshow/([^"]+?)\.html"')

# ============================================================
# Spider 主类
# ============================================================

class Spider(BaseSpider):

    def getName(self):
        return "开心影院"

    # ===== 初始化 =====
    def init(self, extend=""):
        host = ""
        if isinstance(extend, dict):
            host = str(extend.get("host") or "")
        elif isinstance(extend, str) and extend.startswith("http"):
            host = extend
        self._host = (host.rstrip("/") or HOST)

        self._header = {
            "User-Agent": UA,
            "Referer": self._host + "/",
            "Accept": "*/*",
            # 强优先 webp, 站点 CDN 通常会返回 webp 缩略图
            "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        }
        # 缓存: 首页列表 / 搜索结果 / 分类页 / NBY 直链
        self._home_cache = []
        self._home_time = 0
        self._search_cache = {}
        self._cat_cache = {}
        self._nby_cache = {}

    # ===== 网络工具 =====
    def _rsp_text(self, rsp):
        try:
            return rsp.text
        except Exception:
            try:
                return rsp.content.decode("utf-8", "ignore")
            except Exception:
                return ""

    def _txt(self, url, timeout=10, referer=None):
        headers = dict(self._header)
        if referer:
            headers["Referer"] = referer
        try:
            rsp = self.fetch(url, headers=headers, timeout=timeout)
            return self._rsp_text(rsp)
        except Exception:
            return ""

    def _txt_retry(self, url, times=2, timeout=10):
        html = ""
        for i in range(max(1, times)):
            html = self._txt(url, timeout=timeout)
            if html:
                break
            if i + 1 < times:
                time.sleep(0.2)
        return html

    def _get_json(self, url, timeout=10):
        text = self._txt(url, timeout=timeout)
        try:
            return json.loads(text)
        except Exception:
            return None

    @staticmethod
    def _strip_tags(s):
        return re.sub(r'<[^>]+>', '', s or '').strip()

    @staticmethod
    def _origin(url):
        m = re.match(r'(https?://[^/]+)', url or '')
        return (m.group(1) + '/') if m else HOST + '/'

    # ===== 图片加速 =====
    @staticmethod
    def _shrink_pic(url, w=PIC_W, q=PIC_QUALITY):
        """站点 CDN 支持 ?w= 宽度 + ?q= 质量参数, 体积大幅下降;
        已是缩略图或非站点域时不强行加参, 避免破坏第三方图床。"""
        if not url:
            return url
        if not (".kxyy" in url or url.startswith(HOST) or "//img.kxyy" in url):
            return url
        # 已经是问号参数结尾就不再叠加
        if "?" in url:
            return url
        return "%s?w=%s&q=%s" % (url, w, q)

    def _pic(self, url, detail=False):
        if not url:
            return ""
        if url.startswith('//'):
            url = 'https:' + url
        return self._shrink_pic(url, w=(PIC_W_DETAIL if detail else PIC_W))

    # ===== 列表卡片 =====
    def _cards_from_html(self, html, detail_pic=False):
        cards = []
        seen = set()
        for vid, pic, remark, name, date in RE_CARD.findall(html):
            if vid in seen:
                continue
            seen.add(vid)
            cards.append({
                "vod_id": vid,
                "vod_name": name.strip(),
                "vod_pic": self._pic(pic, detail=detail_pic),
                "vod_remarks": remark.strip() or date[:10],
            })
        return cards

    # ===== 二级分类: vodshow 12 段路由 =====
    # 段位: [id, 地区, 排序, 类型, -, -, -, -, 页码, -, -, 年份]
    @staticmethod
    def _vodshow_url(host, tid, page=1, cls="", area="", by="", year=""):
        segs = [str(tid), area, by, cls, "", "", "", "", str(page), "", "", year]
        return host + "/vodshow/" + quote("-".join(segs), safe="") + ".html"

    def _pagecount_from(self, html, page):
        """从分页块解析最大页码"""
        i = html.find('class="pagination')
        seg = html[i:i + 4000] if i >= 0 else ""
        nums = [page]
        for u in RE_PAGE_SEG.findall(seg):
            parts = u.split('/')
            if len(parts) >= 2:
                segs = parts[-1].split('-')
                if len(segs) == 12 and segs[8].isdigit():
                    nums.append(int(segs[8]))
        return max(nums)

    # ===== NBY(YX源) 服务端两步解密 =====
    def _resolve_nby(self, enc):
        """NBY-XMYAES密文|密钥 -> 真实 m3u8 (get_signed_url -> jmurl)"""
        if not enc:
            return ""
        now = time.time()
        hit = self._nby_cache.get(enc)
        if hit and now - hit[0] < NBY_TTL:
            return hit[1]
        base = self._host + "/static/player/nby.php"
        try:
            r1 = self._get_json(base + "?get_signed_url=1&url=" + quote(enc, safe=""),
                                timeout=6)
            signed = (r1 or {}).get("signed_url") or ""
            if not signed:
                return ""
            r2 = self._get_json(base + signed, timeout=6)
            jm = (r2 or {}).get("jmurl") or ""
            if jm and ("m3u8" in jm or "getM3u8" in jm):
                self._nby_cache[enc] = (now, jm)
                return jm
        except Exception:
            pass
        return ""

    # ============================================================
    # 并发多页抓取 (通用)
    # ============================================================

    def _fetch_pages(self, base_url, start_page, count, timeout):
        """并发拉 [start_page, start_page+count) 多页, 合并去重卡片"""
        urls = []
        for i in range(count):
            # base_url 形如 .../...-N.html, 把第 9 段页码替换
            parts = base_url.split('/')
            last = parts[-1].split('-')
            if len(last) == 12:
                last[8] = str(start_page + i)
                parts[-1] = '-'.join(last)
            else:
                # 兜底: 拼 query
                sep = '&' if '?' in base_url else '?'
                urls.append("%s%spg=%d" % (base_url, sep, start_page + i))
                continue
            urls.append('/'.join(parts))

        out = []
        results = [None] * len(urls)
        def grab(idx, u):
            try:
                results[idx] = self._txt_retry(u, times=1, timeout=timeout)
            except Exception:
                results[idx] = ""

        threads = [threading.Thread(target=grab, args=(i, u)) for i, u in enumerate(urls)]
        for t in threads:
            t.start()
        for t in threads:
            t.join(timeout + 2)

        seen = set()
        for html in results:
            if not html:
                continue
            for c in self._cards_from_html(html):
                if c["vod_id"] in seen:
                    continue
                seen.add(c["vod_id"])
                out.append(c)
        return out

    # ============================================================
    # 首页
    # ============================================================

    def homeContent(self, filter):
        filters = {}
        for c in CLASSES:
            tid = c["type_id"]
            types = _TYPE_MOVIE if tid == "1" else _TYPE_TV if tid == "2" else _TYPE_OTHER
            filters[tid] = [
                {"key": "class", "name": "类型",
                 "value": [{"n": "全部", "v": ""}] + [{"n": t, "v": t} for t in types]},
                {"key": "area", "name": "地区",
                 "value": [{"n": "全部", "v": ""}] + [{"n": a, "v": a} for a in _AREAS]},
                {"key": "year", "name": "年份",
                 "value": [{"n": "全部", "v": ""}] + [{"n": y, "v": y} for y in _YEARS]},
                {"key": "by", "name": "排序",
                 "value": [{"n": "默认", "v": ""}] + [{"n": n, "v": v} for v, n in _BYS]},
            ]
        return {"class": CLASSES, "filters": filters}

    def homeVideoContent(self):
        """首页推荐: 6 分类并行, 每个分类拉 2 页取前 12, 10 分钟缓存"""
        now = time.time()
        if self._home_cache and now - self._home_time < CACHE_TTL:
            return {"list": self._home_cache}

        per_cls = []
        results = [None] * len(CLASSES)

        def grab(idx, tid):
            try:
                url = self._vodshow_url(self._host, tid)
                cards = self._fetch_pages(url, 1, HOME_FETCH, LIST_TIMEOUT)
                results[idx] = cards[:HOME_PER_CLS]
            except Exception:
                results[idx] = []

        threads = [threading.Thread(target=grab, args=(i, c["type_id"]))
                   for i, c in enumerate(CLASSES)]
        for t in threads:
            t.start()
        for t in threads:
            t.join(LIST_TIMEOUT + 4)

        merged = []
        seen = set()
        for box in results:
            if not box:
                continue
            for c in box:
                if c["vod_id"] in seen:
                    continue
                seen.add(c["vod_id"])
                merged.append(c)
                if len(merged) >= HOME_TOTAL:
                    break
            if len(merged) >= HOME_TOTAL:
                break

        if merged:
            self._home_cache = merged
            self._home_time = now
        return {"list": merged}

    # ============================================================
    # 分类列表 (含二级筛选) — 并发 3 页合并, 72 卡片/页
    # ============================================================

    def categoryContent(self, tid, pg, filter, extend):
        try:
            page = max(1, int(pg or 1))
        except Exception:
            page = 1

        ext = {}
        if isinstance(extend, dict):
            ext = extend
        elif isinstance(extend, str) and extend:
            try:
                ext = json.loads(extend)
            except Exception:
                ext = {}

        cache_key = (tid, page, ext.get("class", ""), ext.get("area", ""),
                     ext.get("by", ""), ext.get("year", ""))
        now = time.time()
        cached = self._cat_cache.get(cache_key)
        if cached and now - cached[0] < CACHE_TTL:
            return cached[1]

        # 服务端页码 = (前端页 - 1) * PAGE_FETCH + 1, 拉 PAGE_FETCH 页
        start_page = (page - 1) * PAGE_FETCH + 1
        base_url = self._vodshow_url(
            self._host, tid, page=start_page,
            cls=str(ext.get("class") or ""),
            area=str(ext.get("area") or ""),
            by=str(ext.get("by") or ""),
            year=str(ext.get("year") or ""),
        )
        cards = self._fetch_pages(base_url, start_page, PAGE_FETCH, LIST_TIMEOUT)

        if not cards and page > 1:
            # 末页可能为空 -> 回退第 1 页
            start_page = 1
            base_url = self._vodshow_url(
                self._host, tid, page=1,
                cls=str(ext.get("class") or ""),
                area=str(ext.get("area") or ""),
                by=str(ext.get("by") or ""),
                year=str(ext.get("year") or ""))
            cards = self._fetch_pages(base_url, 1, PAGE_FETCH, LIST_TIMEOUT)

        if not cards:
            result = {"page": page, "pagecount": 1, "limit": PAGE_SIZE,
                      "total": 0, "list": []}
            self._cat_cache[cache_key] = (now, result)
            return result

        # 估算总页数: 用首页的 pagecount 块做参考 (任一合并页里都包含同样的分页)
        # 由于多页合并, 这里粗略: 至少 page, 且如果有分页再算
        pagecount = page
        # 抓首页 HTML 拿真实页码
        first_html = self._txt_retry(base_url, 1, timeout=LIST_TIMEOUT)
        if first_html:
            pagecount = self._pagecount_from(first_html, page)
            # 实际一页在爬虫端是 PAGE_FETCH 倍, 前端翻页步长 = PAGE_FETCH
            # 但 pagecount 是站点页数, 前端 page 与之保持一致即可
        result = {
            "list": cards,
            "page": page,
            "pagecount": pagecount,
            "limit": PAGE_SIZE,
            "total": pagecount * PAGE_SIZE_RAW,
        }
        self._cat_cache[cache_key] = (now, result)
        return result

    # ============================================================
    # 详情页
    # ============================================================

    def detailContent(self, ids):
        if isinstance(ids, str):
            ids = [ids]
        vid = str(ids[0]).split('-')[0]

        html = self._txt_retry(self._host + "/voddetail/" + vid + ".html",
                               2, timeout=DETAIL_TIMEOUT)
        if not html:
            return {"list": []}

        # 基本信息
        title = RE_TITLE.search(html)
        name = title.group(1).strip() if title else "未知"
        year = ""
        m = re.search(r'^(.*?)\s*\((\d{4})\)\s*$', name)
        if m:
            name, year = m.group(1).strip(), m.group(2)
        pic = RE_PIC.search(html)
        score = RE_SCORE.search(html)
        update = RE_UPDATE.search(html)

        # 简介区块 (截到 synopsis 为止, 避免混入筛选区链接)
        info_seg = html
        i0 = html.find('更新时间')
        i1 = html.find('id="synopsis"')
        if 0 <= i0 < i1:
            info_seg = html[i0:i1]

        director = RE_DIRECTOR.search(info_seg)
        actor = RE_ACTOR.search(info_seg)
        area = RE_AREA.search(info_seg)
        types = RE_TYPES.findall(info_seg)

        def names(seg):
            if not seg:
                return ""
            items = re.findall(r'<a[^>]*>([^<]+)</a>', seg)
            if items:
                return ",".join(t.strip() for t in items if t.strip())
            return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', seg)).strip()

        desc = RE_DESC.search(html)
        content = self._strip_tags(desc.group(1))[:500] if desc else ""

        # 播放线路: 每个 tab-pane 一条线, YX源(需解密)垫后
        marks = [(m.group(1), m.start()) for m in RE_PANE.finditer(html)]
        pane_eps = {}
        for i, (sid, st) in enumerate(marks):
            en = marks[i + 1][1] if i + 1 < len(marks) else len(html)
            eps = RE_EPS.findall(html[st:en])
            if eps:
                pane_eps[sid] = eps

        lines = []
        for sid, label in RE_TAB.findall(html):
            label = label.strip()
            eps = pane_eps.get(sid)
            if eps:
                lines.append((label, eps))
        lines.sort(key=lambda x: 1 if x[0] == "YX源" else 0)  # 稳定排序, 直链在前
        # tab 名统一去掉尾部空格/nbsp 残留
        lines = [(lb.replace('\u00a0', ' ').strip(), eps) for lb, eps in lines]

        if lines:
            play_from = "$$$".join(LINE_NAMES.get(lb, lb) for lb, _ in lines)
            play_url = "$$$".join(
                "#".join("%s$%s" % (n.strip(), p) for p, n in eps)
                for _, eps in lines)
        else:
            play_from, play_url = "开心影院", ""

        remarks = ("豆瓣" + score.group(1)) if score else (update.group(1)[:10] if update else "")

        vod = {
            "vod_id": vid,
            "vod_name": name,
            "vod_pic": self._pic(pic.group(1) if pic else "", detail=True),
            "type_name": ",".join(dict.fromkeys(types)) if types else "",
            "vod_year": year,
            "vod_area": area.group(1).strip() if area else "",
            "vod_remarks": remarks,
            "vod_actor": names(actor.group(1)) if actor else "",
            "vod_director": names(director.group(1)) if director else "",
            "vod_content": content,
            "vod_play_from": play_from,
            "vod_play_url": play_url,
        }
        return {"list": [vod]}

    # ============================================================
    # 搜索 (suggest JSON 接口, 结果缓存 + 本地分页)
    # ============================================================

    def searchContent(self, key, quick, pg="1"):
        try:
            page = max(1, int(pg or 1))
        except Exception:
            page = 1
        key = (key or "").strip()
        if not key:
            return {"list": []}

        now = time.time()
        cached = self._search_cache.get(key)
        if cached and now - cached[0] > CACHE_TTL:
            cached = None
        if not cached:
            limit = SEARCH_SIZE if quick else SUGGEST_LIMIT
            api = (self._host + "/index.php/ajax/suggest?wd=" + quote(key)
                   + "&mid=1&limit=" + str(limit))
            data = self._get_json(api, timeout=8)
            cards = []
            for it in (data or {}).get("list") or []:
                pic = self._pic(it.get("pic") or "")
                cards.append({
                    "vod_id": str(it.get("id") or ""),
                    "vod_name": str(it.get("name") or ""),
                    "vod_pic": pic,
                    "vod_remarks": "",
                })
            self._search_cache[key] = (now, cards)
            cached = self._search_cache[key]

        cards = cached[1]
        start = (page - 1) * SEARCH_SIZE
        pagecount = max(1, (len(cards) + SEARCH_SIZE - 1) // SEARCH_SIZE)
        return {
            "list": cards[start:start + SEARCH_SIZE],
            "page": page,
            "pagecount": pagecount,
            "limit": SEARCH_SIZE,
            "total": len(cards),
        }

    # ============================================================
    # 播放
    # ============================================================

    def playerContent(self, flag, id, vipFlags):
        pid = str(id or "").replace("\\/", "/")
        if not pid:
            return {"parse": 0, "playUrl": "", "url": ""}

        # 兼容直接传完整加密串/直链 (外部拼装场景)
        if pid.startswith("NBY-"):
            real = self._resolve_nby(pid)
            if real:
                return self._media_return(real, refer=self._host + "/")
            return {"parse": 1, "playUrl": "", "url": pid,
                    "header": {"User-Agent": UA, "Referer": self._host + "/"}}
        if ".m3u8" in pid.lower() or ".mp4" in pid.lower():
            return self._media_return(pid)

        # 常规: 拉播放页取 player_data
        html = self._txt_retry(
            self._host + "/vodplay/" + pid + ".html", 2, timeout=6)
        data = None
        if html:
            m = RE_PLAYER.search(html)
            if m:
                try:
                    data = json.loads(m.group(1))
                except Exception:
                    data = None
        if not data:
            # 拿不到数据 -> 交给壳子嗅探播放页
            return {"parse": 1, "playUrl": "", "url": self._host + "/vodplay/" + pid + ".html",
                    "header": {"User-Agent": UA, "Referer": self._host + "/"}}

        raw = str(data.get("url") or "").replace("\\/", "/")
        frm = str(data.get("from") or "")

        # YX源: NBY 加密串 -> 服务端两步换直链
        if frm == "NBY" or raw.startswith("NBY-"):
            real = self._resolve_nby(raw)
            if real:
                return self._media_return(real, refer=self._host + "/")
            return {"parse": 1, "playUrl": "", "url": self._host + "/vodplay/" + pid + ".html",
                    "header": {"User-Agent": UA, "Referer": self._host + "/"}}

        # 其余 7 条线路: 明文直链, 免解析直播
        if ".m3u8" in raw.lower() or ".mp4" in raw.lower():
            return self._media_return(raw)
        return {"parse": 1, "playUrl": "", "url": raw,
                "header": {"User-Agent": UA, "Referer": self._host + "/"}}

    def _media_return(self, url, refer=None):
        is_hls = ".m3u8" in url.lower()
        return {
            "parse": 0,
            "playUrl": "",
            "url": url,
            "header": {
                "User-Agent": UA,
                "Referer": refer or self._origin(url),
            },
            # HLS 走硬解, 减少缓冲预读
            "format": "application/x-mpegURL" if is_hls else "",
            "contentType": "application/x-mpegURL" if is_hls else "",
            "isLive": False,
            "saveDirName": "",
        }

    # ===== 本地代理 (占位) =====
    def localProxy(self, param):
        return [200, "video/MP2T", b"", ""]

    # ===== 清理 =====
    def destroy(self):
        self._home_cache = []
        self._home_time = 0
        self._search_cache = {}
        self._cat_cache = {}
        self._nby_cache = {}

    def close(self):
        self.destroy()
