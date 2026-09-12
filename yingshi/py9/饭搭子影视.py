# -*- coding: utf-8 -*-
# ============ 饭搭子影视 源 (fdzys.com / 发布页 fdzys666.xyz) ============
# 类型: 苹果CMS(myui模板) 电影/剧集/动漫/综艺/短剧/体育
# 接口: homeContent/homeVideoContent/categoryContent/detailContent/searchContent/playerContent/isVideoFormat
# 播放链: 详情页 player_aaaa.url(share) → share页 const url → m3u8直链(带Referer)
# 兼容: Python ≤3.8 (TVBox内置), 无3.9+ API
import sys, re, json
from urllib.parse import quote

sys.path.append('..')
try:
    from base.spider import Spider
except ImportError:
    class Spider:
        def fetch(self, url, headers=None, **kw):
            import requests as rq
            kw.pop('timeout', None)
            r = rq.get(url, headers=headers, timeout=15, **kw)
            r.encoding = 'utf-8'
            return r

# ============ ★ CONFIG ============
HOST = 'https://fdzys.com'   # ★ 主域(发布页 fdzys666.xyz 可获取备用线路 fdzys.net/fdzys.com)
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
VIDEO_EXTS = 'm3u8|mp4|flv|mkv|avi|ts'

# 一级分类 (type_id = 站内路径)
CATEGORIES = [
    {'type_id': 'movie', 'type_name': '电影'},
    {'type_id': 'tv', 'type_name': '电视剧'},
    {'type_id': 'dongman', 'type_name': '动漫'},
    {'type_id': 'zongyi', 'type_name': '综艺'},
    {'type_id': 'duanju', 'type_name': '短剧'},
    {'type_id': 'tiyu', 'type_name': '体育'},
]

# 二级分类展平 (type_id = 一级/二级)
SUB_CATS = {
    'movie': [('dongzuo', '动作'), ('xiju', '喜剧'), ('aiqing', '爱情'), ('kehuan', '科幻'), ('kongbupian', '恐怖')],
    'tv': [('guochan', '国产剧'), ('oumei', '欧美剧'), ('riben', '日本剧'), ('hanguo', '韩国剧')],
    'zongyi': [('dalu', '大陆'), ('goutong', '港台'), ('rihan', '日韩'), ('oumei', '欧美')],
    'dongman': [('guochan', '国漫'), ('haiwai', '海外')],
    'tiyu': [('zuqiu', '足球'), ('lanqiu', '篮球'), ('wangqiu', '网球'), ('taiqiu', '斯诺克'), ('all', '全部')],
    'duanju': [],
}

# 地区/年份筛选 (对影视大类生效, URL后缀 -code)
AREA_FILTER = [('dalu', '大陆'), ('xianggang', '香港'), ('taiwan', '台湾'), ('meiguo', '美国'),
               ('riben', '日本'), ('hanguo', '韩国'), ('yingguo', '英国'), ('faguo', '法国')]
YEAR_FILTER = [(str(y), str(y)) for y in range(2026, 2017, -1)]
FILTER_TYPES = ('movie', 'tv', 'dongman', 'zongyi')  # 挂筛选的大类


def _build_class():
    cls = []
    for c in CATEGORIES:
        cls.append(dict(c))
        for sub, sn in SUB_CATS.get(c['type_id'], []):
            cls.append({'type_id': c['type_id'] + '/' + sub, 'type_name': sn})
    return cls


def _build_filters():
    fs = {}
    for c in CATEGORIES:
        if c['type_id'] not in FILTER_TYPES:
            continue
        fs[c['type_id']] = [
            {'key': 'area', 'name': '地区', 'value': [{'n': n, 'v': v} for v, n in AREA_FILTER]},
            {'key': 'year', 'name': '年份', 'value': [{'n': y, 'v': y} for y, _ in YEAR_FILTER]},
        ]
        for sub, sn in SUB_CATS.get(c['type_id'], []):
            tid = c['type_id'] + '/' + sub
            fs[tid] = fs[c['type_id']]
    return fs


class Spider(Spider):
    def init(self, extend=''):
        self.base = HOST.rstrip('/')
        self.ua = UA
        self.types = {c['type_id']: c['type_name'] for c in _build_class()}
        self.filters = _build_filters()
        self._hd = {'User-Agent': self.ua, 'Referer': self.base + '/',
                    'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
                    'Accept-Language': 'zh-CN,zh;q=0.9'}

    # ========== 请求 ==========
    def _get(self, url):
        try:
            r = self.fetch(url, headers=self._hd, timeout=12000)
            return r.text if hasattr(r, 'text') else str(r)
        except Exception:
            return ''

    def _abs(self, u):
        if not u:
            return ''
        if u.startswith('http'):
            return u
        if u.startswith('//'):
            return 'https:' + u
        return self.base + (u if u.startswith('/') else '/' + u)

    # ========== 列表卡片解析 ==========
    def _items(self, h):
        items, seen = [], set()
        for chunk in h.split('<div class="myui-vodbox-content">')[1:]:
            chunk = chunk.split('</a>')[0]
            a = re.search(r'href="([^"]+)"', chunk)
            if not a:
                continue
            url = a.group(1)
            if not re.search(r'/(?:movie|tv|dongman|zongyi|tiyu|duanju)/', url):
                continue
            vid = url
            if not vid.startswith('http'):
                vid = self._abs(url)
            m = re.search(r'data-src="([^"]+)"', chunk)
            pic = self._abs(m.group(1)) if m else ''
            m = re.search(r'alt="([^"]*)"', chunk)
            name = m.group(1).strip() if m else ''
            if not name:
                m = re.search(r'<div class="title">([^<]+)</div>', chunk)
                name = m.group(1).strip() if m else ''
            if not name or name in seen:
                continue
            seen.add(name)
            m = re.search(r'class="tag[^"]*"[^>]*>([^<]+)<', chunk)
            remark = m.group(1).strip() if m else ''
            items.append({'vod_id': vid, 'vod_name': name[:60],
                          'vod_pic': pic, 'vod_remarks': remark[:30]})
        return items

    def _pagecount(self, h, cur):
        mx = cur
        for m in re.finditer(r'[?&]page=(\d+)', h):
            try:
                mx = max(mx, int(m.group(1)))
            except Exception:
                pass
        if mx == cur and re.search(r'class="listitem|myui-vodbox-content', h):
            mx = cur + 1
        return mx

    # ========== 首页 ==========
    def homeContent(self, filter=False):
        r = {'class': [{'type_id': k, 'type_name': v} for k, v in self.types.items()]}
        if filter:
            r['filters'] = self.filters
        r['list'] = self.homeVideoContent().get('list', [])
        return r

    def homeVideoContent(self):
        h = self._get(self.base)
        return {'list': self._items(h) if h else []}

    # ========== 分类 ==========
    def categoryContent(self, tid, pg=1, filter=False, extend=''):
        try:
            pn = max(int(str(pg)), 1)
        except Exception:
            pn = 1
        ex = {}
        if extend:
            try:
                ex = json.loads(extend) if isinstance(extend, str) else dict(extend)
            except Exception:
                ex = {}
        path = str(tid).strip('/')
        if ex.get('area'):
            path += '-' + str(ex['area'])
        if ex.get('year'):
            path += '-' + str(ex['year'])
        url = self.base + '/' + path
        if pn > 1:
            url += '?page=%d' % pn
        h = self._get(url)
        if not h:
            return {'page': pn, 'pagecount': pn, 'limit': 24, 'total': 0, 'list': []}
        items = self._items(h)
        return {'page': pn, 'pagecount': self._pagecount(h, pn), 'limit': 24,
                'total': len(items), 'list': items}

    # ========== 详情(多线路) ==========
    def detailContent(self, ids, quick='1'):
        vid = str(ids[0] if isinstance(ids, list) else ids or '')
        h = self._get(self._abs(vid))
        if not h:
            return {'list': []}
        d = {'vod_id': vid, 'vod_name': '', 'vod_pic': '', 'vod_year': '', 'vod_area': '',
             'vod_class': '', 'vod_director': '', 'vod_actor': '', 'vod_content': '',
             'vod_remarks': '', 'vod_play_from': '', 'vod_play_url': ''}
        m = re.search(r'<h1[^>]*>([\s\S]*?)</h1>', h)
        if m:
            d['vod_name'] = re.sub(r'<[^>]+>', '', m.group(1)).strip()
        for pat in (r'<meta[^>]+property="og:image"[^>]+content="([^"]+)"',
                    r'data-cover="([^"]+)"',
                    r'poster-cover-img[^>]*data-src="([^"]+)"'):
            m = re.search(pat, h, re.I)
            if m:
                d['vod_pic'] = self._abs(m.group(1).strip())
                break
        m = re.search(r'<meta[^>]+name="description"[^>]+content="([^"]*)"', h)
        if m:
            d['vod_content'] = m.group(1).strip()[:300]
        else:
            m = re.search(r'detail-intro[^>]*>([\s\S]*?)</(?:p|div)>', h)
            if m:
                d['vod_content'] = re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', m.group(1))).strip()[:300]
        # 线路: sid -> (显示名, from) (兼容 电影页span包装 / 剧集页直接文本 两种结构)
        routes = {}
        for sid, seg in re.findall(
                r'<li class="swiper-slide[^"]*" data-sid="(\d+)">([\s\S]*?)</li>', h):
            if 'mzady-route__ping' not in seg:
                continue
            m = re.search(r'class="mzady-route__ping"[^>]*data-from="([^"]+)"', seg)
            frm = m.group(1) if m else ''
            seg2 = re.sub(r'<style[\s\S]*?</style>', '', seg)
            pre = seg2.split('class="mzady-route__ping"')[0]
            name = re.sub(r'\s+', ' ', re.sub(r'<[^>]*>?', '', pre)).strip()
            routes[sid] = (name or frm, frm)
        # 选集: 按 tab-pane(data-sid) 分组 (页面PC/移动渲染两套, 按sid去重只留第一套)
        body = h.split('class="tab-content"', 1)[-1]
        blocks = re.split(r'<div id="playlist\d+" class="tab-pane[^"]*" data-sid="(\d+)">', body)
        groups = []
        seen_sid = set()
        for i in range(1, len(blocks), 2):
            sid = blocks[i]
            if sid in seen_sid:
                continue
            seen_sid.add(sid)
            seg = blocks[i + 1].split('<div id="playlist')[0]
            eps = re.findall(r'<a href="([^"]+)"[^>]*>([^<]+)</a>', seg)
            if eps:
                groups.append((sid, eps))
        if groups:
            froms, urls = [], []
            for sid, eps in groups:
                name = routes.get(sid, ('线路' + sid, ''))[0]
                froms.append(name)
                urls.append('#'.join(
                    '%s$%s' % (ep.strip().replace('#', '-').replace('$', '|'), self._abs(u))
                    for u, ep in eps))
            d['vod_play_from'] = '$$$'.join(froms)
            d['vod_play_url'] = '$$$'.join(urls)
        return {'list': [d]}

    # ========== 搜索 ==========
    def searchContent(self, key, quick=False, pg='1'):
        h = self._get('%s/yu-%s-xianguan-de-yingpian-shippin-zhibo' % (self.base, quote(str(key))))
        return {'list': self._items(h) if h else []}

    # ========== 播放: 详情页 → share → m3u8 ==========
    def playerContent(self, flag, id, vipFlags=None):
        url = str(id)
        if not url.startswith('http'):
            url = self._abs(url)
        if re.search(r'\.(?:%s)(?:\?|$)' % VIDEO_EXTS, url, re.I):
            return {'parse': 0, 'url': url, 'header': json.dumps(self._hd)}
        h = self._get(url)
        if not h:
            return {'parse': 0, 'url': ''}
        m = re.search(r'var player_aaaa=(\{.*?\})</script>', h)
        if not m:
            return {'parse': 0, 'url': ''}
        try:
            j = json.loads(m.group(1))
        except Exception:
            return {'parse': 0, 'url': ''}
        share = (j.get('url') or '').strip()
        if not share:
            return {'parse': 0, 'url': ''}
        if re.search(r'\.(?:%s)(?:\?|$)' % VIDEO_EXTS, share, re.I):
            return {'parse': 0, 'url': share, 'header': json.dumps(self._hd)}
        if not share.startswith('http'):
            return {'parse': 1, 'url': share}
        # share 页: const url = "/20260909/xxx/index.m3u8?sign=..."
        h2 = self._get(share)
        m2 = re.search(r'const url\s*=\s*"([^"]+)"', h2 or '')
        if not m2:
            return {'parse': 0, 'url': share}
        path = m2.group(1)
        if path.startswith('http'):
            final = path
        elif path.startswith('/'):
            origin = re.match(r'https?://[^/]+', share)
            final = (origin.group(0) if origin else self.base) + path
        else:
            final = share.rsplit('/', 1)[0] + '/' + path
        return {'parse': 0, 'url': final, 'header': json.dumps(self._hd)}

    # ========== 四壳钩子 ==========
    def isVideoFormat(self, url):
        if not url:
            return False
        if '.m3u8' in url:
            return True
        return bool(re.search(r'\.(?:%s)(?:\?|$)' % VIDEO_EXTS, url, re.I))

    def manualVideoCheck(self):
        return False

    def getDependence(self):
        return ''

    def destroy(self):
        try:
            self._sess = None
        except Exception:
            pass

    def progressVideo(self, speed, time, end):
        return False

    def setVideoFlags(self, siteKey, flags):
        try:
            self._siteKey = siteKey
            self._vflags = flags or {}
        except Exception:
            pass
