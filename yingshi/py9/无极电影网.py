# -*- coding: utf-8 -*-
# ============ 71us 模板 v7.5 | yahanof.com (无极电影网) ============
# 架构: MacCMS v10 (okpc模板) 自定义伪静态 + Cloudflare
# CF: WAF按小写路径(vodshow/vodtype/vodsearch)挑战拦截, 源站PHP路由大小写不敏感 -> 混合大小写 vOdShOw/vOdSeArCh/vOdDeTaIl/vOdPlAy 直通
# 路由: 分类 /vodshow/{tid}--------{pg}---.html | 详情 /voddetail/{id}.html | 播放 /vodplay/{id}-{sid}-{nid}.html | 搜索 /vodsearch/{wd}----------{pg}---.html
# 播放: var player_aaaa {"encrypt":0,"url":"m3u8"} 直出
import sys, re, json, time, base64, hashlib, threading, http.server, socket, struct
from urllib.parse import urljoin, quote, unquote
from concurrent.futures import ThreadPoolExecutor
import requests

sys.path.append('..')
try:
    from base.spider import Spider
except ImportError:
    class Spider:
        def fetch(self, url, headers=None, **kw):
            kw.pop('timeout', None)
            r = requests.get(url, headers=headers, timeout=15, **kw)
            r.encoding = 'utf-8'
            return r

# ============ ★ CONFIG ============
HOSTS = ['https://www.yahanof.com']
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
CATEGORIES = {
    '1': '电影', '2': '电视剧', '3': '综艺', '4': '动漫', '35': '动画片', '36': '短剧',
    '6': '动作片', '7': '喜剧片', '8': '爱情片', '9': '科幻片', '10': '恐怖片', '11': '剧情片', '12': '战争片', '24': '纪录片', '44': '香港电影', '45': '动漫电影',
    '13': '国产剧', '14': '港剧', '15': '台剧', '16': '日剧', '20': '泰剧', '21': '韩剧', '22': '美剧', '23': '海外剧',
    '25': '大陆综艺', '26': '港台综艺', '27': '日韩综艺', '28': '欧美综艺',
    '29': '国产动漫', '30': '日韩动漫', '31': '港台动漫', '32': '欧美动漫', '33': '有声动漫', '34': '海外动漫',
    '37': '女频恋爱', '38': '反转爽剧', '39': '年代穿越', '40': '脑洞悬疑', '41': '现代都市', '42': '古装仙侠', '43': '热血剧情',
}
PK = ''
REFERER = 'https://www.yahanof.com/'
PIC_REFERER = ''
FD_ZONE = 0
PROBE = 0
SITE_KEY = 'yahanof'
VIDEO_EXTS = 'm3u8|mp4|flv|mkv|avi|ts'

# ============ AES 纯Python引擎(Crypto不可用时降级) ============
SBOX = [99, 124, 119, 123, 242, 107, 111, 197, 48, 1, 103, 43, 254, 215, 171, 118, 202, 130, 201, 125, 250, 89, 71, 240, 173, 212, 162, 175, 156, 164, 114, 192, 183, 253, 147, 38, 54, 63, 247, 204, 52, 165, 229, 241, 113, 216, 49, 21, 4, 199, 35, 195, 24, 150, 5, 154, 7, 18, 128, 226, 235, 39, 178, 117, 9, 131, 44, 26, 27, 110, 90, 160, 82, 59, 214, 179, 41, 227, 47, 132, 83, 209, 0, 237, 32, 252, 177, 91, 106, 203, 190, 57, 74, 76, 88, 207, 208, 239, 170, 251, 67, 77, 51, 133, 69, 249, 2, 127, 80, 60, 159, 168, 81, 163, 64, 143, 146, 157, 56, 245, 188, 182, 218, 33, 16, 255, 243, 210, 205, 12, 19, 236, 95, 151, 68, 23, 196, 167, 126, 61, 100, 93, 25, 115, 96, 129, 79, 220, 34, 42, 144, 136, 70, 238, 184, 20, 222, 94, 11, 219, 224, 50, 58, 10, 73, 6, 36, 92, 194, 211, 172, 98, 145, 149, 228, 121, 231, 200, 55, 109, 141, 213, 78, 169, 108, 86, 244, 234, 101, 122, 174, 8, 186, 120, 37, 46, 28, 166, 180, 198, 232, 221, 116, 31, 75, 189, 139, 138, 112, 62, 181, 102, 72, 3, 246, 14, 97, 53, 87, 185, 134, 193, 29, 158, 225, 248, 152, 17, 105, 217, 142, 148, 155, 30, 135, 233, 206, 85, 40, 223, 140, 161, 137, 13, 191, 230, 66, 104, 65, 153, 45, 15, 176, 84, 187, 22]
IS = [0] * 256
for _i, _v in enumerate(SBOX):
    IS[_v] = _i
RCON = [1, 2, 4, 8, 16, 32, 64, 128, 27, 54, 108, 216, 171, 77]
G2 = [0] * 256
G3 = [0] * 256
for _i in range(256):
    _t = _i << 1
    if _i & 128:
        _t ^= 0x11b
    G2[_i] = _t
    G3[_i] = G2[_i] ^ _i


def _ke(k):
    nk = len(k) // 4
    nr = nk + 6
    w = [list(k[4 * i:4 * i + 4]) for i in range(nk)]
    for i in range(nk, 4 * (nr + 1)):
        t = w[i - 1][:]
        if i % nk == 0:
            t = t[1:] + t[:1]
            t = [SBOX[b] for b in t]
            t[0] ^= RCON[i // nk - 1]
        elif nk > 6 and i % nk == 4:
            t = [SBOX[b] for b in t]
        w.append([w[i - nk][j] ^ t[j] for j in range(4)])
    return w


def _enc(b, w):
    s = [[b[r + 4 * c] for c in range(4)] for r in range(4)]
    def add(r):
        for i in range(4):
            for j in range(4):
                s[i][j] ^= w[r * 4 + j][i]
    def sub():
        for i in range(4):
            for j in range(4):
                s[i][j] = SBOX[s[i][j]]
    def sh():
        for r in range(1, 4):
            s[r] = s[r][r:] + s[r][:r]
    def mx():
        for c in range(4):
            a = [s[r][c] for r in range(4)]
            s[0][c] = G2[a[0]] ^ G3[a[1]] ^ a[2] ^ a[3]
            s[1][c] = a[0] ^ G2[a[1]] ^ G3[a[2]] ^ a[3]
            s[2][c] = a[0] ^ a[1] ^ G2[a[2]] ^ G3[a[3]]
            s[3][c] = G3[a[0]] ^ a[1] ^ a[2] ^ G2[a[3]]
    add(0)
    nr = len(w) // 4 - 1
    for rnd in range(1, nr):
        sub()
        sh()
        mx()
        add(rnd)
    sub()
    sh()
    add(nr)
    return bytes(s[r][c] for c in range(4) for r in range(4))


def _gm(a, b):
    p = 0
    for _ in range(8):
        if b & 1:
            p ^= a
        a = (a << 1) ^ 0x11b if a & 0x80 else a << 1
        b >>= 1
    return p & 0xff


def _dec(b, w):
    s = [[b[r + 4 * c] for c in range(4)] for r in range(4)]
    def add(r):
        for i in range(4):
            for j in range(4):
                s[i][j] ^= w[r * 4 + j][i]
    def isub():
        for i in range(4):
            for j in range(4):
                s[i][j] = IS[s[i][j]]
    def ish():
        for r in range(1, 4):
            s[r] = s[r][-r:] + s[r][:-r]
    def imx():
        for c in range(4):
            a = [s[r][c] for r in range(4)]
            s[0][c] = _gm(a[0], 14) ^ _gm(a[1], 11) ^ _gm(a[2], 13) ^ _gm(a[3], 9)
            s[1][c] = _gm(a[0], 9) ^ _gm(a[1], 14) ^ _gm(a[2], 11) ^ _gm(a[3], 13)
            s[2][c] = _gm(a[0], 13) ^ _gm(a[1], 9) ^ _gm(a[2], 14) ^ _gm(a[3], 11)
            s[3][c] = _gm(a[0], 11) ^ _gm(a[1], 13) ^ _gm(a[2], 9) ^ _gm(a[3], 14)
    nr = len(w) // 4 - 1
    add(nr)
    for rnd in range(nr - 1, 0, -1):
        ish()
        isub()
        add(rnd)
        imx()
    ish()
    isub()
    add(0)
    return bytes(s[r][c] for c in range(4) for r in range(4))


def aes_ecb(data, key, mode=1):
    w = _ke(key)
    out = b''
    if mode:
        pad = 16 - len(data) % 16
        data += bytes([pad]) * pad
        for i in range(0, len(data), 16):
            out += _enc(data[i:i + 16], w)
    else:
        for i in range(0, len(data), 16):
            out += _dec(data[i:i + 16], w)
        if out and 0 < out[-1] <= 16:
            out = out[:-out[-1]]
    return out


def aes_cbc(data, key, iv, enc=1):
    w = _ke(key)
    out = b''
    prev = iv
    if enc:
        pad = 16 - len(data) % 16
        data += bytes([pad]) * pad
        for i in range(0, len(data), 16):
            blk = bytes(data[i + j] ^ prev[j] for j in range(16))
            ct = _enc(blk, w)
            out += ct
            prev = ct
    else:
        for i in range(0, len(data), 16):
            blk = _dec(data[i:i + 16], w)
            out += bytes(blk[j] ^ prev[j] for j in range(16))
            prev = data[i:i + 16]
        if out and 0 < out[-1] <= 16:
            out = out[:-out[-1]]
    return out


class Spider(Spider):
    def init(self, extend=''):
        self.base = HOSTS[0].rstrip('/')
        self.ua = UA
        self.pk = PK
        self.ref = REFERER or self.base
        self.types = dict(CATEGORIES)
        self.filters = {}
        self._pc = {}
        self._srv = None
        try:
            r = self.fetch(self.base, headers={'User-Agent': self.ua}, timeout=10000)
            if hasattr(r, 'url') and r.url and r.url != self.base:
                self.base = r.url.rstrip('/')
        except:
            pass

    def _mix(self, u, m=1):
        pairs = (('vodshow', 'vOdShOw'), ('vodtype', 'vOdTyPe'), ('vodsearch', 'vOdSeArCh'), ('voddetail', 'vOdDeTaIl'), ('vodplay', 'vOdPlAy'))
        if m == 2:
            pairs = tuple((a, b.upper()) for a, b in pairs)
        for a, b in pairs:
            u = u.replace('/' + a + '/', '/' + b + '/')
        return u

    def _cfpage(self, t):
        t2 = t[:3000]
        return ('Just a moment' in t2) or ('安全驗證' in t2) or ('cf-mitigated' in t2) or ('Web Server Is Down' in t2) or ('cf-error-details' in t2) or ('Connection timed out' in t2) or ('Bad gateway' in t2) or ('A timeout occurred' in t2)

    def _get(self, url, headers=None, timeout=15000):
        hd = headers or {'User-Agent': self.ua, 'Referer': self.ref, 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', 'Accept-Language': 'zh-CN,zh;q=0.9'}
        last = ''
        for w in range(3):
            for m in (1, 2):
                u = self._mix(url, m)
                try:
                    r = self.fetch(u, headers=hd, timeout=timeout)
                except TypeError:
                    try:
                        r = self.fetch(u, headers=hd)
                    except Exception:
                        continue
                except Exception:
                    continue
                try:
                    t = r.text if hasattr(r, 'text') else str(r)
                except Exception:
                    t = ''
                if t and not self._cfpage(t):
                    return t
                if t and not last:
                    last = t
            if w < 2:
                time.sleep(0.7)
        return last

    def _pic(self, u):
        if not u:
            return ''
        if u.startswith('//'):
            u = 'https:' + u
        return u

    def _pagecount(self, h, cur=1):
        mx = cur
        for m in re.finditer(r'<a[^>]*href="([^"]+)"[^>]*>\s*尾页\s*</a>', h):
            mm = re.search(r'-+(\d+)-+\.html', m.group(1))
            if mm:
                try:
                    n = int(mm.group(1))
                    if n > mx:
                        mx = n
                except:
                    pass
        for m in re.finditer(r'num">\d+/(\d+)<', h):
            try:
                n = int(m.group(1))
                if n > mx:
                    mx = n
            except:
                pass
        if mx <= cur and re.search(r'下一页', h):
            mx = cur + 1
        return min(max(mx, 1), 9999)

    def homeContent(self, filter=False):
        r = {'class': [{'type_id': k, 'type_name': v} for k, v in self.types.items()]}
        if filter and self.filters:
            r['filters'] = self.filters
        r['list'] = self.homeVideoContent().get('list', [])
        return r

    def homeVideoContent(self):
        h = self._get(self.base)
        return {'list': self._items(h) if h else []}

    def categoryContent(self, tid, pg=1, filter=False, extend=''):
        try:
            pn = max(int(str(pg)), 1)
        except:
            pn = 1
        t, cls, ex2 = str(tid), '', ''
        if '|' in t:
            p = t.split('|')
            t, cls = p[0], p[1] if len(p) > 1 else ''
            ex2 = p[2] if len(p) > 2 else ''
        ex = {}
        if extend:
            try:
                ex = json.loads(extend) if isinstance(extend, str) else dict(extend)
            except:
                ex = {}
        h = self._get(self._cat_url(t, pn, cls, ex2, ex))
        if not h:
            return {'page': pn, 'pagecount': 1, 'limit': 42, 'total': 0, 'list': []}
        items = self._items(h)
        return {'page': pn, 'pagecount': self._pagecount(h, pn), 'limit': 42, 'total': len(items), 'list': items}

    def _cat_url(self, t, pn, cls='', ex2='', ex=None):
        return '%s/vodshow/%s--------%s---.html' % (self.base, t, pn)

    def detailContent(self, ids, quick='1'):
        vid = str(ids[0] if isinstance(ids, list) else ids or '')
        m = re.search(r'(\d+)', vid)
        vid = m.group(1) if m else ''
        if not vid:
            return {'list': []}
        h = self._get('%s/voddetail/%s.html' % (self.base, vid))
        if not h:
            return {'list': []}
        d = {'vod_id': vid, 'vod_name': '', 'vod_pic': '', 'vod_year': '', 'vod_area': '',
             'vod_class': '', 'vod_director': '', 'vod_actor': '', 'vod_content': '',
             'vod_remarks': '', 'vod_play_from': '', 'vod_play_url': ''}
        nm = re.search(r'<h1[^>]*class="title"[^>]*>([\s\S]*?)</h1>', h)
        if nm:
            t = re.sub(r'<span class="score[^"]*">[\s\S]*?</span>', '', nm.group(1))
            d['vod_name'] = re.sub(r'<[^>]+>', '', t).strip()
        if not d['vod_name']:
            tm = re.search(r'《([^》]+)》', h[:3000])
            if tm:
                d['vod_name'] = tm.group(1).strip()
        p = re.search(r'<a[^>]*class="stui-vodlist__thumb picture[^"]*"[^>]*>[\s\S]{0,500}?data-original="([^"]+)"', h)
        if not p:
            p = re.search(r'data-original="(https?://[^"]+\.(?:jpg|jpeg|png|webp))"', h)
        if p:
            d['vod_pic'] = self._pic(p.group(1))
        ym = re.search(r'年份[：:]\s*</span>\s*<a[^>]*>([^<]+)</a>', h)
        if ym:
            d['vod_year'] = ym.group(1).strip()
        am = re.search(r'地区[：:]\s*</span>\s*<a[^>]*>([^<]+)</a>', h)
        if am:
            d['vod_area'] = am.group(1).strip()
        cm = re.search(r'类型[：:]\s*</span>\s*<a[^>]*>([^<]+)</a>', h)
        if cm:
            d['vod_class'] = cm.group(1).strip()
        ac = re.search(r'主演[：:]\s*</span>([\s\S]*?)</p>', h)
        if ac:
            d['vod_actor'] = re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', ac.group(1))).replace('&nbsp;', ' ').strip()[:200]
        dr = re.search(r'导演[：:]\s*</span>([\s\S]*?)</p>', h)
        if dr:
            d['vod_director'] = re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', dr.group(1))).replace('&nbsp;', ' ').strip()[:200]
        dm = re.search(r'class="desc[^"]*"[^>]*>([\s\S]*?)</p>', h)
        if dm:
            t = re.sub(r'<a[^>]*>[\s\S]*?</a>', ' ', dm.group(1))
            t = re.sub(r'<[^>]+>', ' ', t).replace('简介：', ' ').replace('&nbsp;', ' ')
            d['vod_content'] = re.sub(r'\s+', ' ', t).strip()[:600]
        rm = re.search(r'<span class="pic-text[^"]*">([^<]*)<', h)
        if rm:
            d['vod_remarks'] = rm.group(1).strip()
        pf, pu = self._play_sources(h)
        if pf:
            d['vod_play_from'] = '$$$'.join(pf)
            d['vod_play_url'] = '$$$'.join(pu)
        return {'list': [d]}

    def _play_sources(self, h):
        pf, pu = [], []
        for m in re.finditer(r'<ul class="stui-content__playlist[^"]*"[^>]*>([\s\S]*?)</ul>', h):
            links = re.findall(r'href="(/vodplay/\d+-\d+-\d+\.html)"[^>]*>([^<]+)</a>', m.group(1))
            if not links:
                continue
            heads = re.findall(r'<h3 class="title">([\s\S]*?)</h3>', h[:m.start()])
            name = ''
            if heads:
                name = re.sub(r'<[^>]+>', '', heads[-1]).strip()
            eps = []
            for href, ep in links:
                ep2 = ep.strip().replace('#', ' - ').replace('$', '|')
                if not ep2:
                    ep2 = '正片'
                eps.append('%s$%s' % (ep2, urljoin(self.base, href)))
            pf.append(name or ('线路%d' % (len(pf) + 1)))
            pu.append('#'.join(eps))
        return pf, pu

    def _sort_lines(self, froms, urls):
        key = hashlib.md5('|'.join(froms).encode()).hexdigest()
        c = self._pc.get(key)
        if c and time.time() - c[0] < 300:
            return c[1], c[2]
        def probe(i):
            u = urls[i].split('#')[0].rsplit('$', 1)[-1]
            try:
                r = requests.head(urljoin(self.base, u), headers={'User-Agent': self.ua}, timeout=5)
                return 0 if r.status_code < 400 else 1
            except:
                return 1
        with ThreadPoolExecutor(max_workers=min(len(froms), 8)) as ex:
            res = list(ex.map(probe, range(len(froms))))
        pairs = sorted(zip(froms, urls, res), key=lambda x: x[2])
        out = ([p[0] for p in pairs], [p[1] for p in pairs])
        self._pc[key] = [time.time()] + list(out)
        return out

    def searchContent(self, key, quick=False, pg='1'):
        try:
            pn = max(int(str(pg)), 1)
        except:
            pn = 1
        h = self._get('%s/vodsearch/%s----------%s---.html' % (self.base, quote(key), pn))
        return {'list': self._items(h) if h else [], 'page': pn, 'pagecount': self._pagecount(h, pn) if h else 1}

    def playerContent(self, flag, id, vipFlags=None):
        url = str(id) if id else str(flag)
        if '$' in url:
            url = url.split('$', 1)[1]
        hdd = {'Referer': self.ref, 'User-Agent': self.ua}
        if '://' in url and re.search(r'\.(m3u8|mp4|flv|mp3)(\?|$)', url, re.I):
            return {'parse': 0, 'url': url, 'header': hdd, 'headers': hdd}
        full = url if url.startswith('http') else urljoin(self.base, url)
        h = self._get(full)
        if not h:
            return {'parse': 0, 'url': ''}
        u = self._parse_play(h, full)
        if not u:
            u = self._vip_try(full, h, vipFlags)
        return {'parse': 0, 'url': u or '', 'header': hdd, 'headers': hdd}

    def _parse_play(self, h, page_url):
        idx = h.find('player_aaaa')
        if idx >= 0:
            st = h.find('{', idx)
            j = None
            if st >= 0:
                try:
                    j, _x = json.JSONDecoder().raw_decode(h[st:])
                except:
                    j = None
            if j:
                u = j.get('url') or ''
                if u:
                    if str(j.get('encrypt', 0)) == '0':
                        return u
                    u2 = self._dec(u, page_url)
                    if u2:
                        return u2
                    if u.startswith('http'):
                        return u
            mm = re.search(r'"url"\s*:\s*"([^"]+)"', h[idx:idx + 3000])
            if mm:
                u = mm.group(1).replace('\\/', '/')
                if u.startswith('http'):
                    return u
        m = re.search(r'var\s+now\s*=\s*["\']([^"\']+)["\']', h)
        if m:
            u2 = self._dec(m.group(1), page_url)
            if u2:
                return u2
        for m in re.finditer(r'(https?://[^\s"\'<>\\]+\.m3u8[^\s"\'<>\\]*)', h):
            return m.group(1)
        iframe = re.search(r'<iframe[^>]+src="([^"]+)"', h, re.I)
        if iframe:
            u = iframe.group(1)
            if u.startswith('http'):
                h2 = self._get(u)
                if h2:
                    return self._parse_play(h2, u)
        return ''

    def _dec(self, u, page_url):
        u = u.strip()
        if re.search(r'\.(m3u8|mp4|flv)(\?|$)', u, re.I):
            return u
        try:
            s = u.encode()
            s2 = base64.b64decode(s + b'=' * (-len(s) % 4)).decode('utf-8', 'ignore')
            if re.search(r'\.(m3u8|mp4|flv)(\?|$)', s2, re.I):
                return s2
        except:
            pass
        return u if u.startswith('http') else ''

    def _vip_try(self, page_url, h, vipFlags):
        return ''

    def isVideoFormat(self, url):
        if not url:
            return False
        if '.m3u8' in url:
            return True
        return bool(re.search(r'\.(?:%s)(?:\?|$)' % (VIDEO_EXTS or 'm3u8|mp4|flv'), url, re.I))

    def manualVideoCheck(self):
        return False

    def getDependence(self):
        return ''

    def destroy(self):
        try:
            self._pc.clear()
            self._srv = None
        except Exception:
            pass

    def progressVideo(self, speed, time, end):
        return False

    def setVideoFlags(self, siteKey, flags):
        try:
            self._siteKey = siteKey or SITE_KEY
            self._vflags = flags or {}
        except Exception:
            pass

    def localProxy(self, param):
        p = param.split('url=', 1)[-1] if 'url=' in param else param
        p = unquote(p) if '%' in p else p
        if re.search(r'\.(jpe?g|png|webp|gif)(\?|$)', p, re.I):
            return self._img(p)
        if '.m3u8' in p:
            return self._rewrite_m3u8(p)
        try:
            r = self.fetch(p, headers={'User-Agent': self.ua, 'Referer': self.ref}, timeout=20000)
            if hasattr(r, 'status_code') and r.status_code != 200:
                return {'code': r.status_code, 'content': b'', 'headers': {}}
            return {'code': 200, 'content': r.content, 'headers': {'Content-Type': r.headers.get('Content-Type', 'application/octet-stream')}}
        except:
            return {'code': 404, 'content': b'', 'headers': {}}

    def _rewrite_m3u8(self, url):
        try:
            r = self.fetch(url, headers={'User-Agent': self.ua, 'Referer': self.ref}, timeout=20000)
            if hasattr(r, 'status_code') and r.status_code != 200:
                return {'code': r.status_code, 'content': b'', 'headers': {}}
            body = r.text if hasattr(r, 'text') else str(r)
        except:
            return {'code': 404, 'content': b'', 'headers': {}}
        base = url.rsplit('/', 1)[0] + '/'
        origin = re.match(r'https?://[^/]+', url)
        origin = origin.group(0) if origin else ''
        out = []
        for ln in body.splitlines():
            if ln.startswith('#EXT-X-KEY'):
                m = re.search(r'URI="([^"]+)"', ln)
                if m:
                    ku = m.group(1)
                    if ku.startswith('/'):
                        ku = origin + ku
                    elif not ku.startswith('http'):
                        ku = base + ku
                    ln = ln.replace('URI="%s"' % m.group(1), 'URI="%s"' % ('proxy?url=' + quote(ku, safe='')))
            elif ln.startswith('http'):
                ln = 'proxy?url=' + quote(ln, safe='')
            elif ln.startswith('/') and not ln.startswith('//'):
                ln = 'proxy?url=' + quote(origin + ln, safe='')
            out.append(ln)
        return {'code': 200, 'content': '\n'.join(out), 'headers': {'Content-Type': 'application/vnd.apple.mpegurl'}}

    def _img(self, u):
        try:
            r = requests.get(u, headers={'User-Agent': self.ua, 'Referer': PIC_REFERER or self.ref}, timeout=15)
            data, ct = r.content, r.headers.get('Content-Type', 'image/jpeg')
            if data[:4] == b'RIFF' or 'webp' in ct:
                try:
                    from PIL import Image
                    import io
                    buf = io.BytesIO()
                    Image.open(io.BytesIO(data)).convert('RGB').save(buf, 'JPEG', quality=85)
                    data, ct = buf.getvalue(), 'image/jpeg'
                except:
                    ct = 'image/webp'
            return {'code': 200, 'content': data, 'headers': {'Content-Type': ct}}
        except:
            return {'code': 404, 'content': b'', 'headers': {}}

    def _items(self, h):
        items = {}
        blocks = []
        for m in re.finditer(r'<ul class="stui-vodlist__media[^"]*">([\s\S]*?)</ul>', h):
            for x in re.finditer(r'<a\b[^>]*?href="[^"]*?/voddetail/\d+\.html"[^>]*?>[\s\S]{0,800}?</a>', m.group(1)):
                blocks.append(x.group(0))
        if not blocks:
            blocks = re.findall(r'<li class="col-md-6 col-sm-4 col-xs-3">([\s\S]*?)</li>', h)
        if not blocks:
            blocks = [x.group(0) for x in re.finditer(r'<a\b[^>]*?href="[^"]*?/voddetail/\d+\.html"[^>]*?>[\s\S]{0,1600}?</a>', h)]
        for tag in blocks:
            v = re.search(r'/voddetail/(\d+)\.html', tag)
            if not v:
                continue
            vid = v.group(1)
            t = re.search(r'title="([^"]*)"', tag)
            p = re.search(r'data-original="([^"]+)"', tag) or re.search(r'src="(https?://[^"]+\.(?:jpg|jpeg|png|webp))"', tag) or re.search(r'url\(([^)]+\.(?:jpg|jpeg|png|webp))\)', tag)
            rm = re.search(r'class="pic-text[^"]*">([^<]*)<', tag)
            name = t.group(1).strip() if t else ''
            pic = p.group(1).strip() if p else ''
            rmk = rm.group(1).strip() if rm else ''
            if rmk and rmk == name:
                rmk = ''
            if vid in items:
                it = items[vid]
                if not it['vod_pic'] and pic:
                    it['vod_pic'] = self._pic(pic)
                if not it['vod_name'] and name:
                    it['vod_name'] = name[:100]
                if not it['vod_remarks'] and rmk:
                    it['vod_remarks'] = rmk
            else:
                items[vid] = {'vod_id': vid, 'vod_name': name[:100], 'vod_pic': self._pic(pic), 'vod_remarks': rmk}
        return list(items.values())