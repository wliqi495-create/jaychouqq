# -*- coding: utf-8 -*-
# 大哥视频 https://dage.one
# 列表: GET /api/lists/{cid}/{page}/{size}.json
# 详情: GET /api/play/{id}.json
# data 字段: reverse + base64；\x7f 需替换为 t
# 播放字段: player[0].play → m3u8（常为 mplay.8dy.one/url-https://...）
# Cookie: x-index-auth=authed
import re, json, sys, base64
from urllib.parse import quote
sys.path.append('..')
try:
    from base.spider import Spider as BaseSpider
except ImportError:
    class BaseSpider(object):
        def init(self, extend=""): pass
try:
    import requests
except ImportError:
    requests = None

class Spider(BaseSpider):
    def __init__(self):
        self.host = 'https://dage.one'
        self.ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
        self.channels = {
            '56': '亚洲有码', '57': '亚洲无码', '58': '亚洲主播', '59': '韩国高清',
            '60': '大陆高清', '61': '欧美高清', '62': 'H动漫', '63': '三级伦理',
            '101': '日韩无码', '102': '中文字幕', '103': '国产自制', '104': '约炮偷拍',
            '105': '传媒剧情', '106': '强制乱伦', '107': 'SM调教', '108': '剧情动漫',
            '83': '国产制片', '84': '日本无码', '86': 'AV剧情', '87': '长腿丝袜',
            '88': '邻家人妻', '89': '网红主播', '90': '国模私拍', '92': '抖阴视频',
            '93': '网红头条', '94': 'AV解说', '95': '制服诱惑', '96': '明星换脸',
        }

    def getName(self):
        return '大哥视频'

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
            'Accept': accept or 'application/json, text/html, */*',
            'Accept-Language': 'zh-CN,zh;q=0.9',
            'Referer': referer or (self.host + '/'),
            'Cookie': 'x-index-auth=authed',
        }

    def _get(self, url, referer=None, accept=None):
        try:
            headers = self._headers(referer, accept)
            if requests is None:
                import urllib.request
                req = urllib.request.Request(url, headers=headers)
                with urllib.request.urlopen(req, timeout=18) as resp:
                    return resp.read().decode('utf-8', 'ignore')
            r = requests.get(url, headers=headers, timeout=18, verify=False)
            r.encoding = 'utf-8'
            return r.text if r.status_code == 200 else ''
        except Exception as e:
            print('GET error', url, e)
            return ''

    def _raw_decode(self, data):
        """reverse + base64 → bytes，\x7f→t"""
        if not isinstance(data, str) or not data:
            return b''
        s = data[::-1]
        pad = '=' * ((4 - len(s) % 4) % 4)
        try:
            raw = base64.b64decode(s + pad)
            return raw.replace(b'\x7f', b't')
        except Exception:
            return b''

    def _decode_data(self, data):
        if data is None:
            return None
        if isinstance(data, (dict, list)):
            return data
        raw = self._raw_decode(data)
        if not raw:
            return None
        text = raw.decode('utf-8', 'replace')
        # 宽松修 unicode escape
        def fix_esc(t):
            out, i = [], 0
            while i < len(t):
                if t[i] == '\\' and i + 1 < len(t) and t[i+1] == 'u':
                    hx = t[i+2:i+6]
                    if len(hx) == 4 and all(c in '0123456789abcdefABCDEF' for c in hx):
                        out.append(t[i:i+6]); i += 6; continue
                    out.append('\\\\u'); i += 2; continue
                out.append(t[i]); i += 1
            return ''.join(out)
        for candidate in (text, fix_esc(text)):
            try:
                return json.loads(candidate)
            except Exception:
                continue
        return {'_raw': text}

    def _extract_play_urls(self, data_obj, raw_bytes=None):
        """从解码对象或原始 bytes 抽 m3u8"""
        urls, seen = [], set()
        def add(u):
            if not u:
                return
            u = u.replace('\\/', '/').replace('\\u0026', '&').strip()
            u = re.sub(r'[\x00-\x1f\x7f]', '', u)
            # 损坏修复 index.o?u8 → index.m3u8
            # 站点混淆：? 实为 4
            u = u.replace('?', '4')
            u = re.sub(r'index\.o.u8', 'index.m3u8', u, flags=re.I)
            u = re.sub(r'index\.omu8', 'index.m3u8', u, flags=re.I)
            u = re.sub(r'index\.osu8', 'index.m3u8', u, flags=re.I)
            u = re.sub(r'\.o.u8', '.m3u8', u, flags=re.I)
            u = re.sub(r'[^\x20-\x7e]', '', u)
            if not u.startswith('http') or u in seen:
                return
            if not re.search(r'\.m3u8|\.mp4|mplay\.|/hls/', u, re.I):
                return
            seen.add(u)
            urls.append(u)

        if isinstance(data_obj, dict):
            # player[0].play
            player = data_obj.get('player') or []
            if isinstance(player, list):
                for p in player:
                    if isinstance(p, dict):
                        add(p.get('play') or p.get('url') or '')
            add(data_obj.get('vod_play_url') or '')
            add(data_obj.get('play_url') or '')
            add(data_obj.get('url') or '')

        # 正则兜底（原始 bytes）
        blob = ''
        if raw_bytes:
            blob = raw_bytes.decode('latin-1', 'replace')
        elif isinstance(data_obj, dict) and data_obj.get('_raw'):
            blob = data_obj['_raw']
        if blob:
            blob2 = blob.replace('\\/', '/')
            for m in re.finditer(r'https://mplay\.[a-z0-9.]+/url-https://[^\s"\'<>\\]+', blob2):
                add(m.group(0))
            for m in re.finditer(r'https://[^\s"\'<>\\]+\.m3u8[^\s"\'<>\\]*', blob2):
                add(m.group(0))
            # "play":"..."
            for m in re.finditer(r'"play"\s*:\s*"([^"]+)"', blob2):
                add(m.group(1))
        return urls

    def _parse_items(self, items):
        videos = []
        if not isinstance(items, list):
            return videos
        for it in items:
            if not isinstance(it, dict):
                continue
            vid = it.get('vod_id') or it.get('id') or it.get('vodId') or ''
            name = it.get('vod_name') or it.get('title') or it.get('name') or str(vid)
            pic = it.get('vod_pic') or it.get('pic') or it.get('cover') or it.get('img') or ''
            tips = it.get('vod_remarks') or it.get('duration') or it.get('time') or ''
            if not vid:
                continue
            # 清理损坏字符
            name = re.sub(r'[\x00-\x1f\x7f]', '', str(name))
            videos.append({
                'vod_id': '%s/play/%s.html' % (self.host, vid),
                'vod_name': name[:120],
                'vod_pic': str(pic),
                'vod_remarks': str(tips),
            })
        return videos

    def _fetch_list_api(self, list_id, page=1, size=24):
        url = '%s/api/lists/%s/%s/%s.json' % (self.host, list_id, page, size)
        text = self._get(url, accept='application/json')
        if not text:
            return []
        try:
            obj = json.loads(text)
        except Exception:
            return []
        raw = self._raw_decode(obj.get('data') or '')
        data = self._decode_data(obj.get('data'))
        items = []
        if isinstance(data, dict):
            items = data.get('items') or data.get('list') or data.get('vod') or []
        # 正则兜底（解码 JSON 常因坏字节失败）
        if not items and raw:
            blob = raw.decode('latin-1', 'replace')
            for m in re.finditer(
                r'"vod_id"\s*:\s*(\d+)\s*,\s*"cid"\s*:\s*\d+\s*,\s*"title"\s*:\s*"((?:[^"\\]|\\.)*)"\s*,\s*"img"\s*:\s*"((?:[^"\\]|\\.)*)"',
                blob,
            ):
                title = m.group(2)
                try:
                    title = title.encode('latin-1', 'replace').decode('unicode_escape', 'replace')
                except Exception:
                    title = re.sub(r'\\u([0-9a-fA-F]{4})', lambda x: chr(int(x.group(1), 16)), title)
                title = re.sub(r'[\x00-\x1f\x7f]', '', title)
                img = m.group(3).replace('\\/', '/')
                img = re.sub(r'[\x00-\x1f\x7f]', '', img)
                items.append({'vod_id': m.group(1), 'title': title, 'img': img if img.startswith('http') else ''})
            if not items:
                for m in re.finditer(r'"vod_id"\s*:\s*(\d+)', blob):
                    items.append({'vod_id': m.group(1), 'title': '视频' + m.group(1)})
        return self._parse_items(items)

    def homeContent(self, filter):
        return {'class': [{'type_id': k, 'type_name': v} for k, v in self.channels.items()], 'list': []}

    def homeVideoContent(self):
        return {'list': self._fetch_list_api('56', 1)[:24]}

    def categoryContent(self, tid, pg, filter, extend):
        pg = int(pg or 1)
        videos = self._fetch_list_api(str(tid or '56'), pg)
        return {
            'list': videos, 'page': pg,
            'pagecount': pg + 1 if len(videos) >= 12 else pg,
            'limit': 24, 'total': 9999,
        }

    def detailContent(self, ids):
        result = {'list': []}
        if not ids:
            return result
        page_url = str(ids[0])
        if not page_url.startswith('http'):
            page_url = self.host + (page_url if page_url.startswith('/') else '/play/%s.html' % page_url)
        vid = ''
        m = re.search(r'/play/(\d+)', page_url)
        if m:
            vid = m.group(1)
        name, pic, plays = '大哥视频', '', []
        if vid:
            text = self._get('%s/api/play/%s.json' % (self.host, vid),
                             referer=page_url, accept='application/json')
            if text and text.strip().startswith('{'):
                try:
                    obj = json.loads(text)
                except Exception:
                    obj = {}
                raw = self._raw_decode(obj.get('data') or '')
                data = self._decode_data(obj.get('data'))
                if isinstance(data, dict):
                    name = data.get('title') or data.get('vod_name') or data.get('s_title') or name
                    name = re.sub(r'^正在播放[:：]?', '', str(name)).strip()
                    pic = data.get('img') or data.get('vod_pic') or data.get('pic') or ''
                    # 封面有时是相对
                    if pic and not str(pic).startswith('http'):
                        pic = ''
                for u in self._extract_play_urls(data if isinstance(data, dict) else {}, raw):
                    plays.append(('线路%d' % (len(plays)+1), u))
                    # 同时给出去壳直链
                    if 'mplay.' in u and 'url-http' in u:
                        inner = re.sub(r'^https?://mplay\.[^/]+/url-', '', u)
                        if inner.startswith('http') and inner not in [x[1] for x in plays]:
                            plays.append(('直链%d' % (len(plays)+1), inner))
        if not plays:
            html = self._get(page_url)
            m = re.search(r'<title>([^<]+)</title>', html or '', re.I)
            if m:
                name = re.sub(r'\s*[-|—].*$', '', m.group(1)).strip()
            for u in re.findall(r'https?://[^\s"\'<>]+\.(?:m3u8|mp4)[^\s"\'<>]*', html or ''):
                if 'preview' not in u.lower():
                    plays.append(('直链', u.replace('&amp;', '&')))
        if not plays:
            plays = [('正片', page_url)]
        play_url = '#'.join(['%s$%s' % (n, u) for n, u in plays])
        name = re.sub(r'[\x00-\x1f\x7f]', '', str(name))
        result['list'] = [{
            'vod_id': page_url, 'vod_name': name or '大哥视频', 'vod_pic': pic,
            'vod_remarks': '', 'vod_actor': '', 'vod_director': '', 'vod_content': '',
            'vod_play_from': '大哥视频', 'vod_play_url': play_url,
        }]
        return result

    def searchContent(self, key, quick, pg=1):
        return self.searchContentPage(key, quick, pg)

    def searchContentPage(self, key, quick, pg=1):
        pg = int(pg or 1)
        key = (key or '').strip()
        if not key:
            return {'list': [], 'page': 1, 'pagecount': 1, 'limit': 24, 'total': 0}
        for path in (
            '/api/search/%s/%d/24.json' % (quote(key), pg),
            '/api/vodsearch/%s/%d/24.json' % (quote(key), pg),
        ):
            text = self._get(self.host + path, accept='application/json')
            if not text:
                continue
            try:
                obj = json.loads(text)
            except Exception:
                continue
            data = self._decode_data(obj.get('data'))
            if not isinstance(data, dict):
                continue
            items = data.get('items') or data.get('list') or data.get('vod') or []
            videos = self._parse_items(items)
            if videos:
                return {
                    'list': videos, 'page': pg,
                    'pagecount': pg + 1 if len(videos) >= 12 else pg,
                    'limit': 24, 'total': len(videos),
                }
        return {'list': [], 'page': pg, 'pagecount': 1, 'limit': 24, 'total': 0}

    def playerContent(self, flag, id, vipFlags):
        header = {
            'User-Agent': self.ua,
            'Referer': self.host + '/',
            'Origin': self.host,
            'Cookie': 'x-index-auth=authed',
        }
        play = str(id or '').strip()
        if play.startswith('http') and re.search(r'\.(m3u8|mp4)(\?|$)|mplay\.', play, re.I):
            return {'parse': 0, 'url': play, 'header': header}
        # 详情页 /play/id → 再解一次
        m = re.search(r'/play/(\d+)', play)
        if m:
            detail = self.detailContent([play])
            try:
                purl = detail['list'][0]['vod_play_url']
                first = purl.split('#')[0]
                if '$' in first:
                    u = first.split('$', 1)[1]
                    if u.startswith('http'):
                        return {'parse': 0, 'url': u, 'header': header}
            except Exception:
                pass
        return {'parse': 1, 'jx': '1', 'url': play, 'header': header}

    def isVideoFormat(self, url):
        return bool(url and re.search(r'\.(m3u8|mp4|ts)(\?|$)|mplay\.', url, re.I))
    def manualVideoCheck(self): return False
    def localProxy(self, param): return None
