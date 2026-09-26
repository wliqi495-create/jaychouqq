# -*- coding: utf-8 -*-
# Shlvugs https://www.shlvugs.cn/ → zh.xnxx.place (XNXX 镜像) 修复版
# 列表: thumb-block + /video-{id}/  播放: setVideoHLS/High/Low → m3u8/mp4
import re
import json
import sys
from urllib.parse import quote, unquote

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


class Spider(BaseSpider):
    def __init__(self):
        self.host = 'https://zh.xnxx.place'
        self.ua = (
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
            'AppleWebKit/537.36 (KHTML, like Gecko) '
            'Chrome/131.0.0.0 Safari/537.36'
        )
        self.channels = {
            'today': {'name': '今日精选', 'path': '/todays-selection', 'pageType': 'none'},
            'best': {'name': '最佳', 'path': '/best', 'pageType': 'best'},
            'hits': {'name': '热门', 'path': '/hits', 'pageType': 'num'},
            'hits_week': {'name': '本周热门', 'path': '/hits/week', 'pageType': 'none'},
            'hits_month': {'name': '本月热门', 'path': '/hits/month', 'pageType': 'none'},
            'japanese': {'name': '日本无码', 'path': '/search/jav+uncensored', 'pageType': 'search'},
            'milf': {'name': '辣妈', 'path': '/search/milf', 'pageType': 'search'},
            'hardcore': {'name': 'Hardcore', 'path': '/search/hardcore', 'pageType': 'search'},
            'creampie': {'name': '中出', 'path': '/search/creampie', 'pageType': 'search'},
            'asian': {'name': '亚洲', 'path': '/search/asian', 'pageType': 'search'},
            'amateur': {'name': '业余', 'path': '/search/amateur', 'pageType': 'search'},
            'lesbian': {'name': '女同', 'path': '/search/lesbian', 'pageType': 'search'},
            'anal': {'name': '肛交', 'path': '/search/anal', 'pageType': 'search'},
            'ai': {'name': 'AI', 'path': '/search/ai', 'pageType': 'search'},
            'teen': {'name': '18+', 'path': '/search/teen', 'pageType': 'search'},
        }

    def getName(self):
        return 'Shlvugs'

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
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Referer': referer or (self.host + '/'),
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
            r = requests.get(url, headers=headers, timeout=20, verify=False, allow_redirects=True)
            r.encoding = 'utf-8'
            return r.text if r.status_code == 200 else ''
        except Exception as e:
            print('GET error', url, e)
            return ''

    def _abs(self, u):
        if not u:
            return ''
        u = u.strip().replace('\\/', '/').replace('&amp;', '&')
        u = u.replace('THUMBNUM', '0')
        if u.startswith('//'):
            return 'https:' + u
        if u.startswith('/'):
            return self.host + u
        if not u.startswith('http'):
            return self.host + '/' + u
        return u

    def _decode_html(self, s):
        if not s:
            return ''
        s = s.replace('&#039;', "'").replace('&quot;', '"').replace('&amp;', '&')
        s = s.replace('&lt;', '<').replace('&gt;', '>')
        s = re.sub(r'&#(\d+);', lambda m: chr(int(m.group(1))), s)
        return s.strip()

    def _parse_list(self, html):
        videos, seen = [], set()
        if not html:
            return videos
        for m in re.finditer(r'href="(/video-[a-zA-Z0-9]+(?:/\d+)?/[^"]+)"', html, re.I):
            href = self._abs(m.group(1))
            key_m = re.search(r'(/video-[a-zA-Z0-9]+(?:/\d+)?)', href)
            key = key_m.group(1) if key_m else href
            if key in seen:
                continue
            block = html[max(0, m.start() - 50):min(len(html), m.end() + 800)]
            block2 = html[max(0, m.start() - 1500):m.end() + 200]
            title = ''
            tm = re.search(r'title="([^"]{3,200})"', block)
            if tm:
                title = self._decode_html(tm.group(1))
            if not title:
                tm = re.search(r'>([^<]{5,150})</a>', block)
                if tm and 'http' not in tm.group(1):
                    title = self._decode_html(tm.group(1))
            if not title or len(title) < 3:
                continue
            seen.add(key)
            pic = ''
            pm = re.search(r'data-src="(https?://[^"]+)"', block2, re.I)
            if pm:
                pic = self._abs(pm.group(1).replace('THUMBNUM', '1'))
            if not pic:
                pm = re.search(r'src="(https?://[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"', block2, re.I)
                if pm and not re.search(r'blank|logo|loading', pm.group(1), re.I):
                    pic = self._abs(pm.group(1))
            tips = ''
            dm = re.search(r'(\d+\s*min)', block2, re.I)
            if dm:
                tips = dm.group(1).strip()
            hd = re.search(r'(1080p|720p|480p)', block2, re.I)
            if hd:
                tips = ((tips + ' ') if tips else '') + hd.group(1)
            videos.append({
                'vod_id': href,
                'vod_name': title[:120],
                'vod_pic': pic,
                'vod_remarks': tips,
            })
        return videos

    def _extract_plays(self, html):
        plays, seen = [], set()
        if not html:
            return plays

        def add(label, u):
            if not u:
                return
            u = u.replace('&amp;', '&').replace('\\/', '/').strip()
            if not u or u in seen or 'preview' in u.lower():
                return
            seen.add(u)
            plays.append((label, u))

        for fn, label in (
            ('setVideoHLS', 'HLS'),
            ('setVideoUrlHigh', '高清'),
            ('setVideoUrlLow', '标清'),
        ):
            m = re.search(re.escape(fn) + r"\(['\"]([^'\"]+)", html)
            if m:
                add(label, m.group(1))
        for u in re.findall(r'https?://[^"\'\\\s<>]+?\.(?:m3u8|mp4)[^"\'\\\s<>]*', html, re.I):
            if not re.search(r'preview|thumb|blank', u, re.I):
                add('直链', u)
        return plays

    def _build_cat_url(self, info, pg):
        pg = int(pg or 1)
        path = info['path']
        if pg <= 1:
            return self.host + path
        pt = info.get('pageType') or 'none'
        if pt == 'search':
            return self.host + path + '/%d' % (pg - 1)
        if pt == 'num':
            return self.host + path + '/%d' % (pg - 1)
        return self.host + path

    def homeContent(self, filter):
        classes = [{'type_id': k, 'type_name': v['name']} for k, v in self.channels.items()]
        return {'class': classes, 'list': []}

    def homeVideoContent(self):
        html = self._get(self.host + '/todays-selection')
        return {'list': self._parse_list(html)[:24]}

    def categoryContent(self, tid, pg, filter, extend):
        pg = int(pg or 1)
        tid = str(tid or 'today')
        info = self.channels.get(tid) or self.channels['today']
        url = self._build_cat_url(info, pg)
        html = self._get(url)
        videos = self._parse_list(html)
        pagecount = pg + 1 if len(videos) >= 20 and info.get('pageType') != 'none' else pg
        return {'list': videos, 'page': pg, 'pagecount': pagecount, 'limit': 48, 'total': 9999}

    def detailContent(self, ids):
        result = {'list': []}
        if not ids:
            return result
        page_url = str(ids[0])
        if not page_url.startswith('http'):
            page_url = self._abs(page_url)
        page_url = page_url.replace('THUMBNUM', '0')
        html = self._get(page_url)
        if not html:
            return result
        name = ''
        m = re.search(r'<title>([^<]+)</title>', html, re.I)
        if m:
            name = re.sub(r'\s*[-|—].*$', '', m.group(1))
            name = re.sub(r'\s*XNXX.*$', '', name, flags=re.I).strip()
        if not name:
            m = re.search(r'property=["\']og:title["\'][^>]*content=["\']([^"\']+)["\']', html, re.I)
            if m:
                name = self._decode_html(m.group(1))
        pic = ''
        m = re.search(r'property=["\']og:image["\'][^>]*content=["\']([^"\']+)["\']', html, re.I)
        if m:
            pic = self._abs(m.group(1))
        desc = ''
        m = re.search(r'property=["\']og:description["\'][^>]*content=["\']([^"\']+)["\']', html, re.I)
        if m:
            desc = self._decode_html(m.group(1))[:500]
        plays = self._extract_plays(html)
        if not plays:
            plays = [('正片', page_url)]
        play_url = '#'.join(['%s$%s' % (n, u) for n, u in plays])
        result['list'] = [{
            'vod_id': page_url,
            'vod_name': name or 'Shlvugs',
            'vod_pic': pic,
            'vod_remarks': '',
            'vod_actor': '',
            'vod_director': '',
            'vod_content': desc,
            'vod_play_from': 'Shlvugs',
            'vod_play_url': play_url,
        }]
        return result

    def searchContent(self, key, quick, pg=1):
        return self.searchContentPage(key, quick, pg)

    def searchContentPage(self, key, quick, pg=1):
        pg = int(pg or 1)
        key = (key or '').strip()
        if not key:
            return {'list': [], 'page': 1, 'pagecount': 1, 'limit': 48, 'total': 0}
        url = self.host + '/search/' + quote(key)
        if pg > 1:
            url += '/%d' % (pg - 1)
        html = self._get(url)
        videos = self._parse_list(html)
        return {
            'list': videos,
            'page': pg,
            'pagecount': pg + 1 if len(videos) >= 20 else pg,
            'limit': 48,
            'total': len(videos),
        }

    def playerContent(self, flag, id, vipFlags):
        header = {
            'User-Agent': self.ua,
            'Referer': self.host + '/',
            'Origin': self.host,
            'Accept': '*/*',
        }
        play = str(id or '').strip()
        if play.startswith('http') and re.search(r'\.(m3u8|mp4)(\?|$)', play, re.I):
            return {'parse': 0, 'url': play, 'header': header}
        if not play.startswith('http'):
            play = self._abs(play)
        play = play.replace('THUMBNUM', '0')
        html = self._get(play, referer=self.host + '/')
        plays = self._extract_plays(html or '')
        if plays:
            return {'parse': 0, 'url': plays[0][1], 'header': header}
        return {'parse': 1, 'jx': '1', 'url': play, 'header': header}

    def isVideoFormat(self, url):
        return bool(url and re.search(r'\.(m3u8|mp4|ts)(\?|$)', url, re.I))

    def manualVideoCheck(self):
        return False

    def localProxy(self, param):
        return None
