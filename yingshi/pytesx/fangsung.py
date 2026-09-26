#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Fangsung TVBox 爬虫 (type=3 Python spider)
================================================================
数据源: https://www.fangsung.com (主题 themes/fangsung, Cloudflare 保护)
过盾:   页面走 1314 /fs (clearance) + /page (Playwright 兜底)
播放:   详情页提取 m3u8 / mp4 / iframe 直链；必要时走 /stream 代理
分类:   /a片 /三级a片 /无码 /adult-pictures /a片部落 + 搜索标签
分页:   ?page=N
搜索:   /a片?search=关键词
详情:   /{数字ID}
风格对齐 supjav.py
"""
import re
import time
import urllib.parse

try:
    from base.spider import Spider as BaseSpider
except Exception:
    BaseSpider = object

try:
    import requests
except Exception:
    requests = None

import urllib.request
import ssl

UA = (
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
    '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
)

HOST = 'https://www.fangsung.com'
PROXY_BASE = 'https://py.fzcrym.link:1314'
PAGE_API = PROXY_BASE + '/page?u='
FS_PAGE_API = PROXY_BASE + '/fs?u='
STREAM_API = PROXY_BASE + '/stream?u='
IMG_API = PROXY_BASE + '/sj_img?u='

# 分类对齐站点导航 (归档实测)
CATS = [
    ('__home', '首页'),
    ('a片', 'A片'),
    ('三级a片', '三级A片'),
    ('无码', '无码'),
    ('adult-pictures', '成人图片'),
    ('a片部落', 'A片部落'),
    ('a片/7', '分类7'),
    ('a片/5', '分类5'),
    ('a片/6', '分类6'),
    ('a片/3', '分类3'),
]

# 热门搜索标签（站点首页提供）
TAG_SEARCHES = [
    ('日本', '日本'),
    ('台湾', '台湾'),
    ('中国AV', '中国AV'),
    ('中文', '中文'),
    ('无码', '无码搜'),
    ('国产', '国产'),
    ('动漫', '动漫'),
    ('巨乳', '巨乳'),
    ('人妻', '人妻'),
    ('欧美', '欧美'),
]


class Spider(BaseSpider):

    def __init__(self):
        if hasattr(BaseSpider, '__init__'):
            try:
                super().__init__()
            except Exception:
                pass
        self.name = 'Fangsung'
        self._sess = None
        if requests is not None:
            try:
                self._sess = requests.Session()
                self._sess.headers.update({'User-Agent': UA})
            except Exception:
                self._sess = None

    def getName(self):
        return self.name

    def init(self, extend=''):
        global HOST, PROXY_BASE, PAGE_API, FS_PAGE_API, STREAM_API, IMG_API
        try:
            ext = extend or ''
            if isinstance(ext, str) and ext.strip().startswith('{'):
                import json
                try:
                    ext = json.loads(ext)
                except Exception:
                    pass
            if isinstance(ext, dict):
                if ext.get('proxy'):
                    PROXY_BASE = str(ext['proxy']).rstrip('/')
                if ext.get('host') or ext.get('url'):
                    HOST = str(ext.get('host') or ext.get('url')).rstrip('/')
            elif isinstance(ext, str) and re.match(r'^https?://', ext):
                if re.search(r':\d{2,5}|1314|proxy|fs\?', ext):
                    PROXY_BASE = ext.rstrip('/')
                else:
                    HOST = ext.rstrip('/')
            PAGE_API = PROXY_BASE + '/page?u='
            FS_PAGE_API = PROXY_BASE + '/fs?u='
            STREAM_API = PROXY_BASE + '/stream?u='
            IMG_API = PROXY_BASE + '/sj_img?u='
        except Exception:
            pass

    def destroy(self):
        pass

    def localProxy(self, param):
        return [404, 'text/plain', '']

    def isVideoFormat(self, url):
        return bool(url and re.search(r'\.(m3u8|mp4|ts)(\?|$)', url, re.I))

    # ---------------- 网络层 ----------------
    def _get(self, url, timeout=60):
        if self._sess is not None:
            try:
                r = self._sess.get(url, timeout=timeout, verify=False)
                if r.status_code == 200:
                    return r.text
            except Exception:
                pass
        try:
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            return urllib.request.urlopen(req, timeout=timeout, context=ctx).read().decode(
                'utf-8', 'replace'
            )
        except Exception:
            return ''

    def _page(self, url, retries=2):
        api = FS_PAGE_API + urllib.parse.quote(url, safe='')
        for _ in range(max(1, retries)):
            html = self._get(api, timeout=220)
            if html and 'Just a moment' not in html and len(html) > 3000:
                return html
        api2 = PAGE_API + urllib.parse.quote(url, safe='')
        html = self._get(api2, timeout=90)
        if html and 'Just a moment' not in html and len(html) > 3000:
            return html
        return ''

    def _stream(self, url, referer='', timeout=90):
        api = STREAM_API + urllib.parse.quote(url, safe='')
        if referer:
            api += '&r=' + urllib.parse.quote(referer, safe='')
        return self._get(api, timeout=timeout)

    def _img(self, pic):
        if not pic:
            return ''
        if pic.startswith('//'):
            pic = 'https:' + pic
        if pic.startswith('/'):
            pic = HOST + pic
        if pic.startswith('http'):
            return IMG_API + urllib.parse.quote(pic, safe='')
        return pic

    # ---------------- 解析层 ----------------
    @staticmethod
    def _cards(html):
        """列表卡片：数字 ID 详情链 + 标题/封面"""
        out, seen = [], set()
        if not html:
            return out

        # 模式1: <a href="/12345">...<img ... alt/title>
        for m in re.finditer(
            r'<a[^>]+href="(?:https?://(?:www\.)?fangsung\.com)?/(\d{3,})"[^>]*>([\s\S]{0,800}?)</a>',
            html,
            re.I,
        ):
            vid = m.group(1)
            if vid in seen:
                continue
            block = m.group(2)
            title = ''
            tm = re.search(r'(?:title|alt)="([^"]{2,120})"', block)
            if tm:
                title = tm.group(1).strip()
            if not title:
                tm = re.search(r'>([^<]{2,80})<', block)
                if tm:
                    title = tm.group(1).strip()
            if not title or len(title) < 2:
                continue
            seen.add(vid)
            pic = ''
            for pat in (
                r'data-original="([^"]+)"',
                r'data-src="([^"]+)"',
                r'src="(https?://[^"]+)"',
                r'src="(/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"',
            ):
                pm = re.search(pat, block, re.I)
                if pm:
                    pic = pm.group(1)
                    break
            out.append(
                {
                    'vod_id': vid,
                    'vod_name': title[:90],
                    'vod_pic': pic,
                    'vod_remarks': '',
                }
            )

        # 模式2: href="/数字" 与邻近 img 分离
        if not out:
            for m in re.finditer(
                r'href="(?:https?://(?:www\.)?fangsung\.com)?/(\d{3,})"[^>]*(?:title="([^"]*)")?',
                html,
                re.I,
            ):
                vid = m.group(1)
                if vid in seen:
                    continue
                title = (m.group(2) or '').strip() or ('视频 ' + vid)
                seen.add(vid)
                out.append(
                    {
                        'vod_id': vid,
                        'vod_name': title[:90],
                        'vod_pic': '',
                        'vod_remarks': '',
                    }
                )

        # 补全图片代理在调用侧做
        return out

    def _cards_proxy(self, html):
        items = self._cards(html)
        for it in items:
            it['vod_pic'] = self._img(it.get('vod_pic') or '')
        return items

    @staticmethod
    def _pagecount(html, cur):
        nums = [int(x) for x in re.findall(r'[?&]page=(\d+)', html or '')]
        if not nums:
            return cur
        mx = max(nums)
        return mx if 0 < mx <= 5000 else cur

    def _list_url(self, tid, page):
        page = max(1, int(page or 1))
        tid = str(tid or '').strip()
        if tid == '__home' or not tid:
            base = HOST + '/'
        elif tid.startswith('search:'):
            kw = urllib.parse.quote(tid[7:])
            base = HOST + '/' + urllib.parse.quote('a片') + '?search=' + kw
        else:
            parts = [urllib.parse.quote(p) for p in tid.lstrip('/').split('/') if p]
            base = HOST + '/' + '/'.join(parts)
        if page <= 1:
            return base
        sep = '&' if '?' in base else '?'
        return base + sep + 'page=%d' % page

    # ---------------- TVBox 接口 ----------------
    def homeContent(self, filter):
        classes = [{'type_id': cid, 'type_name': cname} for cid, cname in CATS]
        for key, name in TAG_SEARCHES:
            classes.append({'type_id': 'search:' + key, 'type_name': name})
        return {'class': classes, 'filters': {}}

    def homeVideoContent(self):
        html = self._page(HOST + '/')
        return {'list': self._cards_proxy(html)}

    def categoryContent(self, tid, pg, filter, extend):
        page = max(1, int(pg or 1))
        url = self._list_url(tid, page)
        html = self._page(url)
        items = self._cards_proxy(html)
        if not items:
            for _ in range(2):
                html = self._page(url, retries=2)
                items = self._cards_proxy(html)
                if items:
                    break
        return {
            'page': page,
            'pagecount': self._pagecount(html, page),
            'limit': len(items) or 24,
            'total': len(items),
            'list': items,
        }

    def searchContent(self, key, quick, pg='1'):
        page = max(1, int(pg or 1))
        return self.categoryContent('search:' + str(key), page, False, {})

    def detailContent(self, ids):
        vid = str(ids[0] if isinstance(ids, list) else ids)
        vid = re.sub(r'\D', '', vid.split('/')[-1]) or vid
        durl = HOST + '/' + vid
        html = self._page(durl)

        title = ''
        tm = re.search(r'<h1[^>]*>(.*?)</h1>', html or '', re.S)
        if tm:
            title = re.sub(r'<[^>]+>', '', tm.group(1)).strip()
        if not title:
            tm = re.search(r'<title>([^<]+)', html or '')
            if tm:
                title = tm.group(1).split('-')[0].split('|')[0].strip()

        pic = ''
        for pat in (
            r'og:image["\']\s+content=["\']([^"\']+)',
            r'<img[^>]+(?:data-src|src)="(https?://[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"',
        ):
            pm = re.search(pat, html or '', re.I)
            if pm:
                pic = pm.group(1)
                break
        pic = self._img(pic)

        # 播放源：详情页直链 / iframe / 二次页
        play_items = []
        seen = set()

        def add(name, url):
            url = (url or '').strip()
            if not url or url in seen:
                return
            if url.startswith('//'):
                url = 'https:' + url
            if url.startswith('/'):
                url = HOST + url
            seen.add(url)
            play_items.append((name, url))

        for u in re.findall(
            r'https?://[^\s"\'<>\\]+\.(?:m3u8|mp4)[^\s"\'<>\\]*', html or '', re.I
        ):
            add('直链', u.replace('\\/', '/').replace('&amp;', '&'))

        for src in re.findall(r'<iframe[^>]+src=["\']([^"\']+)["\']', html or '', re.I):
            add('iframe', src)

        for src in re.findall(
            r'<source[^>]+src=["\']([^"\']+)["\']', html or '', re.I
        ):
            add('source', src)

        for src in re.findall(
            r'(?:file|url|src)\s*[:=]\s*["\']([^"\']+\.(?:m3u8|mp4)[^"\']*)["\']',
            html or '',
            re.I,
        ):
            add('播放', src)

        if not play_items:
            play_items.append(('正片', durl))

        froms = [p[0] for p in play_items]
        urls = ['正片$%s|%s' % (vid, p[1]) for p in play_items]

        vod = {
            'vod_id': vid,
            'vod_name': title or ('Fangsung ' + vid),
            'vod_pic': pic,
            'vod_year': '',
            'vod_remarks': '',
            'vod_content': title,
            'vod_play_from': '$$$'.join(froms),
            'vod_play_url': '$$$'.join(urls),
        }
        return {'list': [vod]}

    def playerContent(self, flag, id, vipFlags):
        raw = str(id)
        vid, _, link = raw.partition('|')
        fail = {'parse': 0, 'playUrl': '', 'url': '', 'jx': 0}
        if not link:
            return fail

        # 已是媒体直链
        if re.search(r'\.(m3u8|mp4)(\?|$)', link, re.I):
            play = link
            low = link.lower()
            if 'http' in low and not low.startswith(PROXY_BASE):
                # 部分 CDN 需代理
                if any(k in low for k in ('turboviplay', 'turbosplayer')):
                    play = PROXY_BASE + '/sj_hls?u=' + urllib.parse.quote(link, safe='')
            return {
                'parse': 0,
                'playUrl': '',
                'url': play,
                'jx': 0,
                'header': {'User-Agent': UA, 'Referer': HOST + '/'},
            }

        # iframe / 中间页：再抓一层
        detail = HOST + '/' + re.sub(r'\D', '', vid)
        html = self._stream(link, referer=detail) or self._page(link)
        hits = re.findall(
            r'https?://[^\s"\'<>\\]+\.(?:m3u8|mp4)[^\s"\'<>\\]*', html or '', re.I
        )
        if hits:
            u = hits[0].replace('\\/', '/').replace('&amp;', '&')
            return {
                'parse': 0,
                'playUrl': '',
                'url': u,
                'jx': 0,
                'header': {'User-Agent': UA, 'Referer': HOST + '/'},
            }

        # 兜底：让播放器解析原链
        return {
            'parse': 1,
            'playUrl': '',
            'url': link,
            'jx': 0,
            'header': {'User-Agent': UA, 'Referer': HOST + '/'},
        }
