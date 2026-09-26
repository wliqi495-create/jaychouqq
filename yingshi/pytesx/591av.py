# -*- coding: utf-8 -*-
# 591AV https://591av.sbs/pp1/
import re, json, sys
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
        self.host = 'https://591av.sbs'
        self.ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
        self.channels = {
            'pp1': {'name': '最新', 'path': '/pp1/'},
            'hot': {'name': '热门', 'path': '/pp1/hot/'},
            'new': {'name': '新作', 'path': '/new/'},
            'taiwan': {'name': '台湾', 'path': '/categories/taiwan/'},
            'korea': {'name': '韩国', 'path': '/categories/korea/'},
            'hongkong': {'name': '香港', 'path': '/categories/hongkong/'},
            'china_av': {'name': '中国AV', 'path': '/categories/china-av/'},
            'japan_producer': {'name': '日本片商', 'path': '/categories/japan-producer/'},
            'uncensored': {'name': '无码', 'path': '/categories/uncensored/'},
            'amateur': {'name': '素人', 'path': '/categories/amateur/'},
            'pov': {'name': '第一人称', 'path': '/categories/first-person-pov/'},
            'lesbian': {'name': '女同', 'path': '/categories/lesbian/'},
            'tanhua': {'name': '91探花', 'path': '/categories/91-tanhua/'},
            'yoga': {'name': '瑜伽裤', 'path': '/categories/yoga-pants/'},
            'released': {'name': '流出', 'path': '/categories/released/'},
        }

    def getName(self):
        return '591AV'

    def init(self, extend=""):
        if extend:
            try:
                conf = json.loads(extend) if isinstance(extend, str) and extend.strip().startswith('{') else {}
                if conf.get('host'):
                    self.host = conf['host'].rstrip('/')
            except Exception:
                pass

    def _headers(self, referer=None):
        return {
            'User-Agent': self.ua,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9',
            'Referer': referer or (self.host + '/pp1/'),
        }

    def _get(self, url, referer=None):
        try:
            if requests is None:
                import urllib.request
                req = urllib.request.Request(url, headers=self._headers(referer))
                with urllib.request.urlopen(req, timeout=18) as resp:
                    return resp.read().decode('utf-8', 'ignore')
            r = requests.get(url, headers=self._headers(referer), timeout=18, verify=False)
            r.encoding = 'utf-8'
            return r.text if r.status_code == 200 else ''
        except Exception as e:
            print('GET error', url, e)
            return ''

    def _abs(self, u):
        if not u: return ''
        u = u.strip().replace('\\/', '/')
        if u.startswith('//'): return 'https:' + u
        if u.startswith('/'): return self.host + u
        if not u.startswith('http'): return self.host + '/' + u
        return u

    def _parse_list(self, html):
        videos, seen = [], set()
        if not html: return videos
        for m in re.finditer(r'href="((?:https?://(?:www\.)?591av\.sbs)?/v/([a-zA-Z0-9._-]+)/?)"', html, re.I):
            href, vid = m.group(1), m.group(2)
            full = self._abs(href if href.endswith('/') else href + '/')
            if full in seen: continue
            seen.add(full)
            block = html[max(0, m.start()-300):m.end()+600]
            title = ''
            tm = re.search(r'alt=["\']([^"\']{2,200})["\']', block)
            if tm: title = tm.group(1).strip()
            if not title:
                tm = re.search(r'card-video__title[^>]*>[\s\S]*?<a[^>]*>([^<]+)', block)
                if tm: title = tm.group(1).strip()
            if not title: title = vid
            pic = ''
            pm = re.search(r'data-src=["\']([^"\']+)["\']', block)
            if not pm: pm = re.search(r'src=["\'](https?://[^"\']+\.(?:jpg|jpeg|png|webp)[^"\']*)["\']', block, re.I)
            if pm and 'placeholder' not in pm.group(1):
                pic = self._abs(pm.group(1))
            tips = ''
            dm = re.search(r'card-video__duration[^>]*>([^<]+)', block)
            if dm: tips = dm.group(1).strip()
            videos.append({'vod_id': full, 'vod_name': title[:120], 'vod_pic': pic, 'vod_remarks': tips})
        return videos

    def homeContent(self, filter):
        return {'class': [{'type_id': k, 'type_name': v['name']} for k, v in self.channels.items()], 'list': []}

    def homeVideoContent(self):
        return {'list': self._parse_list(self._get(self.host + '/pp1/'))[:24]}

    def categoryContent(self, tid, pg, filter, extend):
        pg = int(pg or 1)
        info = self.channels.get(str(tid or 'pp1')) or self.channels['pp1']
        path = info['path']
        url = self.host + path + ('&' if '?' in path else '?') + 'from=%d' % pg if pg > 1 else self.host + path
        if pg > 1 and not path.endswith('/'):
            url = self.host + path + '/?from=%d' % pg
        elif pg > 1:
            url = self.host + path + '?from=%d' % pg
        html = self._get(url)
        videos = self._parse_list(html)
        return {'list': videos, 'page': pg, 'pagecount': pg + 1 if len(videos) >= 12 else pg, 'limit': 24, 'total': 9999}

    def detailContent(self, ids):
        result = {'list': []}
        if not ids: return result
        page_url = str(ids[0])
        if not page_url.startswith('http'):
            page_url = self.host + (page_url if page_url.startswith('/') else '/v/' + page_url + '/')
        html = self._get(page_url)
        if not html: return result
        name = ''
        m = re.search(r'<title>([^<]+)</title>', html, re.I)
        if m:
            name = re.sub(r'\s*[-|—].*$', '', m.group(1)).strip()
            name = re.sub(r'\s*PPP\.Porn.*$', '', name).strip()
        pic = ''
        m = re.search(r'property=["\']og:image["\'][^>]*content=["\']([^"\']+)["\']', html, re.I)
        if m: pic = self._abs(m.group(1))
        # m3u8 带时间戳，detail 不固化，播放时现解
        plays = [('正片', page_url)]
        play_url = '#'.join(['%s$%s' % (n, u) for n, u in plays])
        result['list'] = [{
            'vod_id': page_url, 'vod_name': name or '591AV', 'vod_pic': pic,
            'vod_remarks': '', 'vod_actor': '', 'vod_director': '', 'vod_content': '',
            'vod_play_from': '591AV', 'vod_play_url': play_url,
        }]
        return result

    def searchContent(self, key, quick, pg=1):
        return self.searchContentPage(key, quick, pg)

    def searchContentPage(self, key, quick, pg=1):
        key = (key or '').strip()
        if not key: return {'list': [], 'page': 1, 'pagecount': 1, 'limit': 24, 'total': 0}
        url = self.host + '/search/?q=' + quote(key)
        videos = self._parse_list(self._get(url))
        return {'list': videos, 'page': int(pg or 1), 'pagecount': 1, 'limit': 24, 'total': len(videos)}

    def playerContent(self, flag, id, vipFlags):
        play = str(id or '').strip()
        if not play.startswith('http'):
            play = self._abs(play)
        if play.startswith('http') and re.search(r'\.(m3u8|mp4)(\?|$)', play, re.I):
            header = {'User-Agent': self.ua, 'Referer': self.host + '/', 'Origin': self.host, 'Accept': '*/*', 'Accept-Language': 'en-US,en;q=0.9', 'Connection': 'keep-alive'}
            return {'parse': 0, 'url': play, 'header': header}
        # 页面地址 → 现解 stream（避免时间戳过期）
        if not play.endswith('/') and '/v/' in play:
            play = play + '/'
        html = self._get(play, referer=self.host + '/pp1/')
        header = {'User-Agent': self.ua, 'Referer': play, 'Origin': self.host, 'Accept': '*/*', 'Accept-Language': 'en-US,en;q=0.9', 'Connection': 'keep-alive'}
        m = re.search(r"var\s+stream\s*=\s*['\"]([^'\"]+)['\"]", html or '')
        if m:
            return {'parse': 0, 'url': m.group(1).replace('&amp;', '&'), 'header': header}
        m = re.search(r'(https?://[^\s"\'<>]+\.m3u8[^\s"\'<>]*)', html or '')
        if m and 'preview' not in m.group(1).lower():
            return {'parse': 0, 'url': m.group(1).replace('&amp;', '&'), 'header': header}
        return {'parse': 1, 'jx': '1', 'url': play, 'header': header}

    def isVideoFormat(self, url):
        return bool(url and re.search(r'\.(m3u8|mp4|ts)(\?|$)', url, re.I))
    def manualVideoCheck(self): return False
    def localProxy(self, param): return None
