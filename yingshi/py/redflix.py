# -*- coding: utf-8 -*-
# 🍑
import json
import re
import sys
import os
from pyquery import PyQuery as pq
from base.spider import Spider

class Spider(Spider):

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
        'sec-ch-ua-platform': '"Windows"',
        'sec-ch-ua': '"Not/A)Brand";v="8", "Chromium";v="136", "Google Chrome";v="136"',
        'origin': 'https://redflix.co',
        'referer': 'https://redflix.co/',
    }

    def init(self, extend=""):
        self.site = 'https://redflix.co'
        self.chost, self.token = self.gettoken()
        self.phost = 'https://image.tmdb.org/t/p/w500'

        self.servers = {
            'vidfast': 'https://vidfast.pro',
            'vidrock': 'https://vidrock.net',
            'vidlink': 'https://vidlink.pro',
            'videasy': 'https://player.videasy.net',
        }
        self.server_order = ['vidfast', 'vidrock', 'vidlink', 'videasy']

        self.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
            'sec-ch-ua-platform': '"Windows"',
            'sec-ch-ua': '"Not/A)Brand";v="8", "Chromium";v="136", "Google Chrome";v="136"',
            'origin': self.site,
            'referer': f'{self.site}/',
            'accept': 'application/json'
        })
        pass

    def getName(self):
        return "Redflix"

    def isVideoFormat(self, url):
        return '.m3u8' in url or '.mp4' in url

    def manualVideoCheck(self):
        return True

    def destroy(self):
        pass

    def homeContent(self, filter):
        result = {}
        cate = {
            "电影": "movie",
            "剧集": "tv"
        }
        classes = []
        filters = {}
        for k, j in cate.items():
            classes.append({'type_name': k, 'type_id': j})
        result['class'] = classes
        result['filters'] = filters
        return result

    def homeVideoContent(self):
        data = self.fetch(
            f"{self.chost}/trending/all/day",
            params={'api_key': self.token, 'language': 'en-US', 'page': 1},
            headers=self.headers
        ).json()
        return {'list': self.getlist(data.get('results', []))}

    def categoryContent(self, tid, pg, filter, extend):
        params = {'page': pg, 'api_key': self.token, 'language': 'en-US'}
        data = self.fetch(f'{self.chost}/discover/{tid}', params=params, headers=self.headers).json()
        result = {
            'list': self.getlist(data.get('results', []), tid),
            'page': pg,
            'pagecount': 9999,
            'limit': 90,
            'total': 999999
        }
        return result

    def detailContent(self, ids):
        path = ids[0]
        v = self.fetch(
            f'{self.chost}{path}',
            params={'api_key': self.token, 'language': 'en-US', 'append_to_response': 'videos'},
            headers=self.headers
        ).json()
        is_movie = '/movie/' in path
        if is_movie:
            play_str = f"{v.get('title') or v.get('name')}${path}"
        else:
            seasons = v.get('seasons') or []
            play_items = [
                f"{i.get('name')}${path}/{i.get('season_number')}/1" for i in seasons if i.get('season_number')
            ]
            play_str = '#'.join(play_items) if play_items else f"{v.get('name')}${path}/1/1"
        vod = {
            'vod_name': v.get('title') or v.get('name'),
            'vod_year': (v.get('release_date') or v.get('last_air_date') or '')[:4],
            'vod_area': v.get('original_language') or '',
            'vod_remarks': v.get('tagline') or '',
            'vod_content': v.get('overview') or '',
            'vod_play_from': 'Redflix',
            'vod_play_url': play_str
        }
        return {'list': [vod]}

    def searchContent(self, key, quick, pg="1"):
        data = self.fetch(
            f'{self.chost}/search/multi',
            params={'query': key, 'page': pg, 'api_key': self.token, 'language': 'en-US', 'include_adult': 'false'},
            headers=self.headers
        ).json()
        return {'list': self.getlist(data.get('results', [])), 'page': pg}

    def playerContent(self, flag, id, vipFlags):
        try:
            media_type, tmdb_id, season, episode = self._parse_play_id(id)

            s = season or '1'
            e = episode or '1'

            subs = []

            def _map_lang(label: str) -> str:
                name = (label or '').lower()
                table = {
                    'english': 'en', 'arabic': 'ar', 'chinese': 'zh', 'zh': 'zh', '简体': 'zh-CN', '繁體': 'zh-TW',
                    'croatian': 'hr', 'czech': 'cs', 'danish': 'da', 'dutch': 'nl', 'finnish': 'fi', 'french': 'fr',
                    'german': 'de', 'greek': 'el', 'hungarian': 'hu', 'indonesian': 'id', 'italian': 'it',
                    'japanese': 'ja', 'korean': 'ko', 'norwegian': 'no', 'persian': 'fa', 'polish': 'pl',
                    'portuguese (br)': 'pt-BR', 'portuguese': 'pt', 'romanian': 'ro', 'russian': 'ru',
                    'serbian': 'sr', 'spanish': 'es', 'swedish': 'sv', 'turkish': 'tr', 'thai': 'th', 'vietnamese': 'vi'
                }
                if name in table:
                    return table[name]
                for k, v in table.items():
                    if name.startswith(k) or k in name:
                        return v
                return ''

            try:
                if media_type == 'tv':
                    sub_api = f"https://s.vdrk.site/subfetch.php?id={tmdb_id}&s={s}&e={e}"
                else:
                    sub_api = f"https://s.vdrk.site/subfetch.php?id={tmdb_id}"
                hdr = self.jxh().copy()
                hdr.update({'referer': 'https://vidrock.net/'})
                resp = self.fetch(sub_api, headers=hdr, timeout=10)
                if resp is not None and resp.status_code == 200:
                    try:
                        items = resp.json()
                    except Exception:
                        items = json.loads(resp.text or '[]')
                    if (not items) and media_type == 'tv':
                        try:
                            resp2 = self.fetch(f"https://s.vdrk.site/subfetch.php?id={tmdb_id}", headers=hdr, timeout=10)
                            if resp2 is not None and resp2.status_code == 200:
                                try:
                                    items = resp2.json()
                                except Exception:
                                    items = json.loads(resp2.text or '[]')
                        except Exception:
                            pass
                    for it in items or []:
                        u = it.get('file') or it.get('url') or it.get('src')
                        name = it.get('label') or it.get('name') or 'Subtitle'
                        if not u:
                            continue
                        low = u.lower()
                        fmt = 'application/x-subrip' if ('srt' in low) else 'text/vtt'
                        subs.append({'url': u, 'name': name, 'lang': _map_lang(name), 'format': fmt})
            except Exception as _:
                pass

            for sid in self.server_order:
                domain = self.servers.get(sid)
                if not domain:
                    continue
                if media_type == 'movie':
                    embed = f"{domain}/movie/{tmdb_id}"
                else:
                    if sid == 'vidfast':
                        embed = f"{domain}/tv/{tmdb_id}/{s}/{e}?autoNext=true&nextButton=false&title=true&poster=true&autoPlay=true"
                    elif sid == 'vidrock':
                        embed = f"{domain}/tv/{tmdb_id}/{s}/{e}?autoplay=true&autonext=true"
                    elif sid == 'vidlink':
                        params = "primaryColor=63b8bc&secondaryColor=a2a2a2&iconColor=eefdec&icons=default&player=default&title=true&poster=true&autoplay=true&nextbutton=true"
                        embed = f"{domain}/tv/{tmdb_id}/{s}/{e}?{params}"
                    elif sid == 'videasy':
                        embed = f"{domain}/tv/{tmdb_id}/{s}/{e}?nextEpisode=true&autoplayNextEpisode=true&episodeSelector=true&color=8B5CF6"
                    else:
                        embed = f"{domain}/embed/{'movie' if media_type=='movie' else 'tv'}/{tmdb_id}{'' if media_type=='movie' else f'/{s}/{e}'}"
                return {'parse': 1, 'url': embed, 'header': self.jxh(), 'subs': subs}
            fallback = f"{self.site}/{media_type}/{tmdb_id}/watch"
            return {'parse': 1, 'url': fallback, 'header': self.jxh(), 'subs': subs}
        except Exception as e:
            self.log(f'Redflix playerContent error: {e}')
            return {'parse': 1, 'url': f"{self.site}{id if id.startswith('/') else '/' + id}", 'header': self.jxh()}

    def getlist(self, data, tid=''):
        videos = []
        for i in data or []:
            media_type = tid or i.get('media_type')
            if media_type not in ('movie', 'tv'):
                continue
            vid = i.get('id')
            if not vid:
                continue
            name = i.get('title') or i.get('name') or ''
            poster = i.get('backdrop_path') or i.get('poster_path') or ''
            videos.append({
                'vod_id': f"/{media_type}/{vid}",
                'vod_name': name,
                'vod_pic': f"{self.phost}{poster}",
                'vod_remarks': ''
            })
        return videos

    def jxh(self):
        header = self.headers.copy()
        header.update({'referer': f'{self.site}/', 'origin': self.site})
        header.pop('authorization', None)
        return header

    def _parse_play_id(self, id_str):
        m = re.match(r'^/(movie|tv)/(\d+)(?:/(\d+)/(\d+))?$', id_str or '')
        if not m:
            if '/movie/' in id_str:
                return 'movie', re.findall(r'/movie/(\d+)', id_str)[0], None, None
            elif '/tv/' in id_str:
                parts = re.findall(r'/tv/(\d+)(?:/(\d+)/(\d+))?', id_str)[0]
                return 'tv', parts[0], (parts[1] or '1') if len(parts) > 1 else '1', (parts[2] or '1') if len(parts) > 2 else '1'
            else:
                raise ValueError('Unrecognized play id')
        media_type, tmdb_id, season, episode = m.groups()
        return media_type, tmdb_id, season, episode

    def gettoken(self):
        hosts = [self.site]
        paths = ['/', '/movies', '/tv-shows']
        key_pattern = re.compile(r'TMDB_API_KEY\s*[:=]\s*[\"\']([A-Za-z0-9]+)[\"\']')
        for host in hosts:
            for path in paths:
                try:
                    hdr = self.headers.copy()
                    hdr.update({'origin': host, 'referer': f'{host}/'})
                    html = self.fetch(f'{host}{path}', headers=hdr, timeout=10).text
                    mod = pq(html)('script[type="module"]').attr('src') or ''
                    if not mod:
                        continue
                    murl = mod if mod.startswith('http') else f'{host}{mod}'
                    mjs = self.fetch(murl, headers=hdr, timeout=10).text
                    m = key_pattern.search(mjs)
                    if m:
                        return 'https://api.themoviedb.org/3', m.group(1)
                    mw = re.search(r'player-watch-([\w-]+)\.js', mjs)
                    if mw:
                        pw = f"{host}/assets/player-watch-{mw.group(1)}.js"
                        pjs = self.fetch(pw, headers=hdr, timeout=10).text
                        m2 = key_pattern.search(pjs)
                        if m2:
                            return 'https://api.themoviedb.org/3', m2.group(1)
                except Exception as e:
                    self.log(f'gettoken error: {e}')
                    continue
        return 'https://api.themoviedb.org/3', '524c16f6e2a0a13c49ff7b99d27b5efb'