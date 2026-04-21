"""
@header({
  searchable: 1,
  filterable: 1,
  quickSearch: 1,
  title: 'xHamster',
  lang: 'hipy',
})
"""

# -*- coding: utf-8 -*-
# by @嗷呜 & Gemini
"""
@header({
  searchable: 1,
  filterable: 1,
  quickSearch: 1,
  title: 'xHamster',
  lang: 'hipy',
})
"""

import json
import sys
import requests
import re
from pyquery import PyQuery as pq
from requests import Session
sys.path.append('..')
from base.spider import Spider

# 忽略 HTTPS 警告
requests.packages.urllib3.disable_warnings()

class Spider(Spider):
    # 显式定义 headers，解决之前日志中的 AttributeError
    headers = {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
    }

    def init(self, extend=""):
        self.host = self.gethost()
        self.headers.update({'referer': f'{self.host}/'})
        self.session = Session()
        self.session.headers.update(self.headers)
        self.session.verify = False

    def getName(self):
        return "xHamster"

    def isVideoFormat(self, url):
        return False

    def manualVideoCheck(self):
        return False

    def localProxy(self, param):
        return [200, "video/MP2T", b""]

    def destroy(self):
        pass

    def homeContent(self, filter):
        result = {}
        # 优化分类 ID
        cateManual = {
            "4K": "/4k",
            "国产": "two_click_/categories/chinese",
            "最新": "/newest",
            "最佳": "/best",
            "频道": "/channels",
            "类别": "/categories",
            "明星": "/pornstars"
        }
        classes = []
        for k in cateManual:
            classes.append({'type_name': k, 'type_id': cateManual[k]})
        result['class'] = classes
        return result

    def homeVideoContent(self):
        data = self.getpq("/")
        if data:
            jsdata = self.getjsdata(data)
            if jsdata:
                return {'list': self.getlist_from_json(jsdata)}
        return {'list': []}

    def categoryContent(self, tid, pg, filter, extend):
        vdata = []
        result = {'page': int(pg), 'pagecount': 999, 'limit': 40, 'total': 9999}
        
        path = tid
        if 'two_click_' in tid:
            path = tid.split('click_')[-1]
        
        # 修复翻页 URL 逻辑
        url_path = f'{path}/{pg}' if pg != "1" else path
        if '?' in path:
            url_path = f'{path}&page={pg}' if pg != "1" else path
            
        data = self.getpq(url_path)
        if not data: return result

        jsdata = self.getjsdata(data)
        if not jsdata:
            return result

        # 1. 频道页解析
        if tid == '/channels':
            items = self.search_dict(jsdata, 'channels') or []
            for i in items:
                vdata.append({
                    'vod_id': "two_click_" + i.get('channelURL', ''),
                    'vod_name': i.get('channelName'),
                    'vod_pic': i.get('siteLogoURL'),
                    'vod_year': f"Videos: {i.get('videoCount', 0)}",
                    'vod_tag': 'folder',
                    'vod_remarks': f"Subs: {i.get('subscriptionModel', {}).get('subscribers', 0)}",
                    'style': {'ratio': 1.33, 'type': 'rect'}
                })

        # 2. 类别页解析
        elif tid == '/categories':
            items = self.search_dict(jsdata, 'assignable') or []
            for i in items:
                vdata.append({
                    'vod_id': "two_click_/categories/" + (i.get('id') or i.get('slug', '')),
                    'vod_name': i.get('name'),
                    'vod_pic': '',
                    'vod_tag': 'folder',
                    'vod_remarks': '分类',
                    'style': {'ratio': 1.33, 'type': 'rect'}
                })

        # 3. 明星页解析
        elif tid == '/pornstars':
            items = self.search_dict(jsdata, 'pornstars') or []
            for i in items:
                vdata.append({
                    'vod_id': "two_click_" + i.get('pageURL', ''),
                    'vod_name': i.get('name'),
                    'vod_pic': i.get('thumbURL'),
                    'vod_tag': 'folder',
                    'vod_remarks': f"Videos: {i.get('videosCount', 0)}",
                    'style': {'ratio': 1.0, 'type': 'rect'}
                })

        # 4. 普通视频列表 (4K, 国产, 个人页等)
        else:
            vdata = self.getlist_from_json(jsdata)

        result['list'] = vdata
        return result

    def detailContent(self, ids):
        data = self.getpq(ids[0])
        if not data: return {'list': []}
        
        link = data('link[rel="preload"][as="fetch"][crossorigin="true"]').attr('href')
        play_url = f"播放源$666_{link}" if link else f"嗅探${ids[0]}"
        
        vod = {
            'vod_name': data('meta[property="og:title"]').attr('content') or "Video",
            'vod_remarks': data('.rb-new__info').text() or "xHamster",
            'vod_play_from': 'xHamster',
            'vod_play_url': play_url
        }
        return {'list': [vod]}

    def searchContent(self, key, quick, pg="1"):
        data = self.getpq(f'/search/{key}?page={pg}')
        if data:
            jsdata = self.getjsdata(data)
            if jsdata:
                return {'list': self.getlist_from_json(jsdata), 'page': pg}
        return {'list': [], 'page': pg}

    def playerContent(self, flag, id, vipFlags):
        p, url = 1, id
        headers = {'User-Agent': self.headers['User-Agent'], 'origin': self.host, 'referer': f'{self.host}/'}
        if id.startswith("666_"):
            p, url = 0, id[4:]
        return {'parse': p, 'url': url, 'header': headers}

    def gethost(self):
        # 优先选择日本节点域名
        fallback = "https://jp.xhamster.com"
        try:
            r = requests.get('https://xhamster.com', headers={'User-Agent': 'Mozilla/5.0'}, allow_redirects=False, timeout=5)
            loc = r.headers.get('Location') or r.headers.get('location')
            return loc.rstrip('/') if loc else fallback
        except:
            return fallback

    def getlist_from_json(self, jsdata):
        vlist = []
        # 使用搜索函数查找视频列表键
        videos = self.search_dict(jsdata, 'videoThumbProps') or []
        for i in videos:
            if not i.get('pageURL'): continue
            vlist.append({
                'vod_id': i.get('pageURL'),
                'vod_name': i.get('title'),
                'vod_pic': i.get('imageURL') or i.get('thumbURL'),
                'vod_year': f"{i.get('views', 0)} views",
                'vod_remarks': self.second_to_time(i.get('duration', 0)),
                'style': {'ratio': 1.33, 'type': 'rect'}
            })
        return vlist

    def second_to_time(self, sec):
        try:
            sec = int(sec)
            m, s = divmod(sec, 60)
            h, m = divmod(m, 60)
            return "%d:%02d:%02d" % (h, m, s) if h > 0 else "%02d:%02d" % (m, s)
        except: return ""

    # --- 核心修复：更鲁棒的 JSON 提取器 ---
    def getjsdata(self, data):
        try:
            # 获取所有 script 标签内容
            for script in data("script").items():
                vhtml = script.text()
                if 'initials=' in vhtml:
                    # 使用正则精准匹配 initials 赋值的 JSON 部分
                    match = re.search(r'initials\s*=\s*(\{.*?\});', vhtml, re.DOTALL)
                    if not match:
                        match = re.search(r'initials\s*=\s*(\{.*\})', vhtml, re.DOTALL)
                    if match:
                        return json.loads(match.group(1))
        except: pass
        return {}

    # --- 核心修复：递归搜索字典中的 Key ---
    def search_dict(self, data, key):
        if isinstance(data, dict):
            if key in data: return data[key]
            for v in data.values():
                res = self.search_dict(v, key)
                if res: return res
        elif isinstance(data, list):
            for i in data:
                res = self.search_dict(i, key)
                if res: return res
        return None

    def getpq(self, path=''):
        try:
            h = '' if path.startswith('http') else self.host
            url = f'{h}{path}'
            # 针对 NAS 网络环境优化
            response = self.session.get(url, timeout=15)
            return pq(response.content)
        except: return None
