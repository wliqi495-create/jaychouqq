# -*- coding: utf-8 -*-
# 18AV https://18av01.cc/zh/
# 播放: mvarr 编码 id → decrypto(radix+xor) + AES-CBC → play.php → m3u8 直出
import re
import json
import sys
import base64
from urllib.parse import quote

sys.path.append('..')
try:
    from base.spider import Spider as BaseSpider
except ImportError:
    class BaseSpider(object):
        def init(self, extend=""):
            pass

try:
    import requests
except ImportError:
    requests = None

try:
    from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
    HAS_CRYPTO = True
except ImportError:
    HAS_CRYPTO = False


class Spider(BaseSpider):
    def __init__(self):
        self.host = 'https://18av01.cc'
        self.base = '/zh'
        self.ua = (
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
            'AppleWebKit/537.36 (KHTML, like Gecko) '
            'Chrome/131.0.0.0 Safari/537.36'
        )
        # 默认 AES（页面会覆盖）
        self.aes_key = b'f2de1cc5a09e548a'
        self.aes_iv = b'14799105d5ff0474'
        self.hcdeed = 21   # 分割符 radix → sep=chr(radix+97)='v'
        self.hadeed = 26   # xor
        self.channels = {
            'chinese': {'name': '中文字幕', 'path': '/zh/chinese_random/all/index.html'},
            'censored': {'name': '有码AV', 'path': '/zh/censored_random/all/index.html'},
            'uncensored': {'name': '无码AV', 'path': '/zh/uncensored_random/all/index.html'},
            'amateur': {'name': '素人AV', 'path': '/zh/amateurjav_random/all/index.html'},
            'mosaic': {'name': '无码破解', 'path': '/zh/reducing-mosaic_random/all/index.html'},
            'animation': {'name': 'H动画', 'path': '/zh/animation_random/all/index.html'},
            'c_anim': {'name': 'H有码动画', 'path': '/zh/CensoredAnimation_random/all/index.html'},
            'u_anim': {'name': 'H无码动画', 'path': '/zh/UncensoredAnimation_random/all/index.html'},
            'td_anim': {'name': 'H_3D动画', 'path': '/zh/tdAnimation_random/all/index.html'},
            'dt': {'name': '国产自拍', 'path': '/zh/dt_random/all/index.html'},
            'news': {'name': '每日更新', 'path': '/zh/content_news/all/index.html'},
        }
        self.name_to_id = {}
        for _k, _v in self.channels.items():
            self.name_to_id[_k] = _k
            self.name_to_id[_v['name']] = _k


    def getName(self):
        return '18AV'

    def init(self, extend=""):
        if extend:
            try:
                conf = json.loads(extend) if isinstance(extend, str) and extend.strip().startswith('{') else {}
                if conf.get('host'):
                    self.host = conf['host'].rstrip('/')
            except Exception:
                pass

    def _headers(self, referer=None, accept=None):
        return {
            'User-Agent': self.ua,
            'Accept': accept or 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9',
            'Referer': referer or (self.host + self.base + '/'),
        }

    def _get(self, url, referer=None, accept=None):
        try:
            headers = self._headers(referer, accept)
            if requests is None:
                import urllib.request
                import ssl
                ctx = ssl.create_default_context()
                ctx.check_hostname = False
                ctx.verify_mode = ssl.CERT_NONE
                req = urllib.request.Request(url, headers=headers)
                with urllib.request.urlopen(req, timeout=20, context=ctx) as resp:
                    return resp.read().decode('utf-8', 'ignore')
            r = requests.get(url, headers=headers, timeout=20, verify=False)
            r.encoding = 'utf-8'
            return r.text if r.status_code == 200 else ''
        except Exception as e:
            print('GET error', url, e)
            return ''

    def _abs(self, u):
        if not u:
            return ''
        u = u.strip().replace('\\/', '/').replace('&amp;', '&')
        if u.startswith('//'):
            return 'https:' + u
        if u.startswith('/'):
            return self.host + u
        if not u.startswith('http'):
            return self.host + '/' + u
        return u

    def _refresh_crypto(self, html):
        """从页面刷新 AES key/iv 和 radix/xor"""
        m = re.search(r"argdeqweqweqwe\s*=\s*'([0-9a-fA-F]{16})'", html)
        if m:
            self.aes_key = m.group(1).encode('utf-8')
        m = re.search(r"hdddedg252\s*=\s*'([0-9a-fA-F]{16})'", html)
        if m:
            self.aes_iv = m.group(1).encode('utf-8')
        # 有时 key/iv 变量名对调
        m = re.search(r"var\s+hdddedd252\s*=\s*'([0-9a-fA-F]{16})'", html)
        if m and not re.search(r"argdeqweqweqwe\s*=\s*'([0-9a-fA-F]{16})'", html):
            self.aes_key = m.group(1).encode('utf-8')
        m = re.search(r'hadeedg252\s*=\s*(\d+)', html)
        if m:
            self.hadeed = int(m.group(1))
        m = re.search(r'hcdeedg252\s*=\s*(\d+)', html)
        if m:
            self.hcdeed = int(m.group(1))

    def _decrypto(self, g):
        """radix 分割 + xor → 明文(base64)"""
        if not g:
            return ''
        radix = self.hcdeed
        if radix < 2:
            radix = 21
        # sep = chr(radix + 97)，radix=21 → 'v'
        if radix <= 25:
            sep = chr(radix + 97)
        else:
            sep = chr((radix % 25) + 97)
        parts = g.split(sep)
        out = []
        for p in parts:
            if not p:
                continue
            try:
                k = int(p, radix) ^ self.hadeed
                if 0 <= k <= 0x10FFFF:
                    out.append(chr(k))
            except Exception:
                continue
        return ''.join(out)

    def _aes_decrypt(self, b64text):
        if not HAS_CRYPTO or not b64text:
            return ''
        try:
            pad_len = (-len(b64text)) % 4
            raw = base64.b64decode(b64text + ('=' * pad_len))
            cipher = Cipher(algorithms.AES(self.aes_key), modes.CBC(self.aes_iv))
            dec = cipher.decryptor()
            pt = dec.update(raw) + dec.finalize()
            pad = pt[-1]
            if isinstance(pad, str):
                pad = ord(pad)
            if 1 <= pad <= 16:
                pt = pt[:-pad]
            return pt.decode('utf-8', 'ignore')
        except Exception as e:
            print('AES error', e)
            return ''

    def _decode_play_id(self, enc):
        step1 = self._decrypto(enc)
        if not step1:
            return ''
        return self._aes_decrypt(step1)

    def _parse_list(self, html):
        videos, seen = [], set()
        if not html:
            return videos
        for m in re.finditer(
            r'href="((?:https?://(?:www\.)?18av01\.cc)?(/zh/[\w-]+_content/\d+/[^"]+\.html))"',
            html, re.I
        ):
            full = self._abs(m.group(1) if m.group(1).startswith('http') else m.group(2))
            if full in seen:
                continue
            seen.add(full)
            block = html[max(0, m.start() - 300):m.end() + 500]
            title = ''
            tm = re.search(r'(?:title|alt)=["\']([^"\']{2,200})["\']', block)
            if tm:
                title = tm.group(1).strip()
            if not title:
                cm = re.search(r'/([^/]+)\.html', full)
                title = cm.group(1) if cm else '18AV'
            pic = ''
            for pat in (
                r'data-src=["\']([^"\']+)["\']',
                r'src=["\'](https?://[^"\']+\.(?:jpg|jpeg|png|webp)[^"\']*)["\']',
            ):
                pm = re.search(pat, block, re.I)
                if pm and not re.search(r'logo|loading|icon', pm.group(1), re.I):
                    pic = self._abs(pm.group(1))
                    break
            tips = ''
            dm = re.search(r'(\d+\s*分)', block)
            if dm:
                tips = dm.group(1)
            videos.append({
                'vod_id': full,
                'vod_name': title[:120],
                'vod_pic': pic,
                'vod_remarks': tips,
            })
        return videos

    def _m3u8_from_play_page(self, play_url, referer=''):
        """拉取 play.php，提取 videoSources 里的 m3u8"""
        html = self._get(play_url, referer=referer or (self.host + self.base + '/'))
        if not html:
            return []
        urls = []
        seen = set()
        # videoSources: {src: '//....m3u8', type:..., size: 720}
        for m in re.finditer(
            r"\{src:\s*['\"]([^'\"]+\.m3u8[^'\"]*)['\"][^}]*size:\s*(\d+)",
            html, re.I
        ):
            u = self._abs(m.group(1))
            if u not in seen:
                seen.add(u)
                urls.append((m.group(2) + 'p', u))
        if not urls:
            for m in re.finditer(r"src:\s*['\"]([^'\"]+\.m3u8[^'\"]*)['\"]", html, re.I):
                u = self._abs(m.group(1))
                if u not in seen:
                    seen.add(u)
                    urls.append(('HLS', u))
        if not urls:
            for u in re.findall(r'https?://[^\s"\'<>]+\.m3u8[^\s"\'<>]*', html):
                u = self._abs(u)
                if u not in seen:
                    seen.add(u)
                    urls.append(('HLS', u))
            for u in re.findall(r'//[^\s"\'<>]+\.m3u8[^\s"\'<>]*', html):
                u = self._abs(u)
                if u not in seen:
                    seen.add(u)
                    urls.append(('HLS', u))
        return urls

    def _extract_plays(self, html, page_url=''):
        plays, seen = [], set()
        if not html:
            return plays

        def add(label, u):
            if not u or u in seen or 'preview' in u.lower():
                return
            seen.add(u)
            plays.append((label, u))

        self._refresh_crypto(html)

        # mvarr['10_1']=[['iframeId','encId','...','//host/js/player/play.php?numresolution=1080&id=','', '...'],]
        for m in re.finditer(
            r"mvarr\['(\d+_\d+)'\]\s*=\s*\[\['([^']+)'\s*,\s*'([0-9a-z]+)'\s*,\s*'[^']*'\s*,\s*'([^']*play\.php\?numresolution=\d+&id=)'",
            html, re.I
        ):
            label_key, enc_id, play_base = m.group(1), m.group(3), m.group(4)
            decoded = self._decode_play_id(enc_id)
            if not decoded:
                print('decode fail', enc_id[:40])
                continue
            play_page = self._abs(play_base + decoded)
            m3u8s = self._m3u8_from_play_page(play_page, page_url)
            if m3u8s:
                for lab, u in m3u8s:
                    add('%s-%s' % (label_key.split('_')[0], lab), u)
            else:
                # 仍返回 play.php，playerContent 再抽
                add('线路%s' % label_key.split('_')[0], play_page)

        # 兜底直链
        for u in re.findall(r'(?:https?:)?//[^\s"\'<>]+\.(?:m3u8|mp4)[^\s"\'<>]*', html):
            if 'preview' not in u.lower() and 'gifb' not in u:
                add('直链', self._abs(u))
        return plays

    def _resolve_tid(self, tid):
        s = str(tid or 'chinese').strip()
        if s in self.channels:
            return s
        if getattr(self, 'name_to_id', None) and s in self.name_to_id:
            return self.name_to_id[s]
        return 'chinese'

    def homeContent(self, filter):
        classes = [{'type_id': k, 'type_name': v['name']} for k, v in self.channels.items()]
        return {'class': classes, 'list': []}

    def homeVideoContent(self):
        html = self._get(self.host + '/zh/chinese_random/all/index.html')
        return {'list': self._parse_list(html)[:24]}

    def categoryContent(self, tid, pg, filter, extend):
        pg = int(pg or 1)
        tid = self._resolve_tid(tid)
        info = self.channels.get(tid) or self.channels['chinese']
        path = info['path']
        if pg <= 1:
            url = self.host + path
        else:
            url = self.host + path.replace('index.html', 'index_%d.html' % pg)
        html = self._get(url)
        videos = self._parse_list(html)
        pagecount = pg + 1 if len(videos) >= 12 else pg
        return {'list': videos, 'page': pg, 'pagecount': pagecount, 'limit': 24, 'total': 9999}

    def detailContent(self, ids):
        result = {'list': []}
        if not ids:
            return result
        page_url = str(ids[0])
        if not page_url.startswith('http'):
            page_url = self.host + (page_url if page_url.startswith('/') else self.base + '/' + page_url)
        html = self._get(page_url)
        if not html:
            return result
        name = ''
        m = re.search(r'<h1[^>]*>\s*<b>([^<]+)</b>', html, re.I)
        if m:
            name = m.group(1).strip()
        if not name:
            m = re.search(r'<title>([^<]+)</title>', html, re.I)
            if m:
                name = re.sub(r'\s*18AV.*$', '', m.group(1), flags=re.I).strip()
        pic = ''
        m = re.search(r'property=["\']og:image["\'][^>]*content=["\']([^"\']+)', html, re.I)
        if m:
            pic = self._abs(m.group(1))
        plays = self._extract_plays(html, page_url)
        # 线路1：详情页（播放时重新解码，最新地址）
        # 线路2+：已解析的 m3u8（可直连）
        lines = [('正片', page_url)]
        for n, u in plays:
            if u and u != page_url:
                lines.append((n, u))
        if len(lines) == 1 and not plays:
            pass  # only page
        play_url = '#'.join(['%s$%s' % (n, u) for n, u in lines])
        result['list'] = [{
            'vod_id': page_url,
            'vod_name': name or '18AV',
            'vod_pic': pic,
            'vod_remarks': '',
            'vod_actor': '',
            'vod_director': '',
            'vod_content': '',
            'vod_play_from': '18AV',
            'vod_play_url': play_url,
        }]
        return result

    def searchContent(self, key, quick, pg=1):
        return self.searchContentPage(key, quick, pg)

    def searchContentPage(self, key, quick, pg=1):
        pg = int(pg or 1)
        key = (key or '').strip()
        if not key:
            return {'list': [], 'page': 1, 'pagecount': 1, 'limit': 24, 'total': 0}
        url = self.host + '/zh/search/?kw=' + quote(key)
        if pg > 1:
            url += '&page=%d' % pg
        html = self._get(url)
        videos = self._parse_list(html)
        return {
            'list': videos,
            'page': pg,
            'pagecount': pg + 1 if len(videos) >= 12 else pg,
            'limit': 24,
            'total': len(videos),
        }

    def playerContent(self, flag, id, vipFlags):
        play = str(id or '').strip()
        header = {
            'User-Agent': self.ua,
            'Referer': self.host + '/js/player/play.php',
            'Origin': self.host,
            'Accept': '*/*',
            'Accept-Language': 'zh-CN,zh;q=0.9',
        }
        if play.startswith('//'):
            play = 'https:' + play
        if play.startswith('http') and re.search(r'\.(m3u8|mp4)(\?|$)', play, re.I):
            return {'parse': 0, 'url': play, 'header': header}
        if 'play.php' in play:
            m3u8s = self._m3u8_from_play_page(play, self.host + self.base + '/')
            if m3u8s:
                return {'parse': 0, 'url': m3u8s[0][1], 'header': header}
        if not play.startswith('http'):
            play = self._abs(play)
        # 详情页重新解码，拿最新 m3u8
        if '_content/' in play or play.endswith('.html'):
            html = self._get(play, referer=self.host + self.base + '/')
            plays = self._extract_plays(html or '', play)
            if plays:
                u = plays[0][1]
                if u.startswith('//'):
                    u = 'https:' + u
                if re.search(r'\.(m3u8|mp4)(\?|$)', u, re.I):
                    return {'parse': 0, 'url': u, 'header': header}
                if 'play.php' in u:
                    return self.playerContent(flag, u, vipFlags)
        html = self._get(play, referer=self.host + self.base + '/')
        plays = self._extract_plays(html or '', play)
        if plays:
            u = plays[0][1]
            if u.startswith('//'):
                u = 'https:' + u
            if re.search(r'\.(m3u8|mp4)(\?|$)', u, re.I):
                return {'parse': 0, 'url': u, 'header': header}
            if 'play.php' in u:
                return self.playerContent(flag, u, vipFlags)
        return {'parse': 0, 'url': '', 'header': header}

    def isVideoFormat(self, url):
        return bool(url and re.search(r'\.(m3u8|mp4|ts)(\?|$)', url, re.I))

    def manualVideoCheck(self):
        return False

    def localProxy(self, param):
        return None
