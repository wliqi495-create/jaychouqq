# -*- coding: utf-8 -*-
import requests
from base.spider import Spider
import sys
import json

sys.path.append('..')

xurl = "https://www.wasu.cn"
SITE_ID = "1000101"

base_headers = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 14; M2102J2SC Build/UKQ1.240624.001) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36',
    'siteid': SITE_ID,
    'origin': 'https://www.wasu.cn',
    'referer': 'https://www.wasu.cn/',
    'accept': 'application/json, text/plain, */*',
    'accept-language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
    'sec-ch-ua': '"Chromium";v="130", "Android WebView";v="130", "Not?A_Brand";v="99"',
    'sec-ch-ua-mobile': '?1',
    'sec-ch-ua-platform': '"Android"',
    'x-requested-with': 'mark.via',
}

TYPE_ID_MAP = {
    "1036": "961",
    "1034": "962",
    "1037": "963",
    "1035": "965",
}

class Spider(Spider):
    global xurl
    global base_headers

    def getName(self):
        return "首页"

    def init(self, extend):
        pass

    def isVideoFormat(self, url):
        pass

    def manualVideoCheck(self):
        pass

    def extract_middle_text(self, text, start_str, end_str, pl, start_index1: str = '', end_index2: str = ''):
        pass

    def homeContent(self, filter):
        return {
            "class": [
                {"type_id": "1036", "type_name": "电影"},
                {"type_id": "1034", "type_name": "电视剧"},
                {"type_id": "1037", "type_name": "少儿"},
                {"type_id": "1035", "type_name": "新闻"},
            ]
        }

    def homeVideoContent(self):
        videos = []
        url = 'https://mcspapp.5g.wasu.tv/bvradio_app/hzhs/recommendServlet?functionName=getRecommond&modeId=1033&page=1&pageSize=10&siteId=1000101'
        try:
            r = requests.get(url, headers=base_headers, timeout=10)
            r.encoding = 'utf-8'
            js = r.json()
            def extract_videos(data):
                items = []
                if isinstance(data, dict):
                    if 'manualList' in data and isinstance(data['manualList'], list):
                        for i in data['manualList']:
                            if i.get('pPic'):
                                items.append(i)
                    for v in data.values():
                        if isinstance(v, (dict, list)):
                            items.extend(extract_videos(v))
                elif isinstance(data, list):
                    for item in data:
                        items.extend(extract_videos(item))
                return items
            all_items = extract_videos(js)
            for i in all_items:
                videos.append({
                    "vod_id": i.get('id', ''),
                    "vod_name": i.get('title', ''),
                    "vod_pic": i.get('pPic', ''),
                    "vod_remarks": i.get('episodeDesc', '')
                })
        except Exception as e:
            print(f"[homeVideoContent] 异常: {e}")
        return {'list': videos}

    def categoryContent(self, cid, pg, filter, ext):
        videos = []
        inner_cid = TYPE_ID_MAP.get(cid, cid)
        url = f'https://ups.5g.wasu.tv/rmp-user-suggest/1000101/hzhs/searchServlet?functionName=getNewsSearchedByCondition&nodeId={inner_cid}&nodeTag=%E5%85%A8%E9%83%A8&yearTag=%E5%85%A8%E9%83%A8&countryTag=%E5%85%A8%E9%83%A8&orderType=0&pageSize=40&page={pg}&keyword=&siteId=1000101'
        print(f"[categoryContent] 请求URL: {url}")
        try:
            r = requests.get(url, headers=base_headers, timeout=10)
            print(f"[categoryContent] 状态码: {r.status_code}")
            print(f"[categoryContent] 响应预览: {r.text[:300]}")
            r.encoding = 'utf-8'
            js = r.json()
            data_list = js.get('data', [])
            print(f"[categoryContent] data 长度: {len(data_list)}")
            for i in data_list:
                if i.get('pPic'):
                    vid = inner_cid + ',' + str(i.get('newsId', ''))
                    videos.append({
                        "vod_id": vid,
                        "vod_name": i.get('title', ''),
                        "vod_pic": i.get('pPic', ''),
                        "vod_remarks": i.get('episodeDesc', '')
                    })
        except Exception as e:
            print(f"[categoryContent] 异常: {e}")

        result = {
            'list': videos,
            'page': pg,
            'pagecount': 9999,
            'limit': 90,
            'total': 999999
        }
        print(f"[categoryContent] 最终返回 {len(videos)} 个视频")
        return result

    def detailContent(self, ids):
        did = ids[0]
        parts = did.split(',')
        if len(parts) == 2:
            inner_cid, vid = parts
        else:
            inner_cid = ''
            vid = did
        url = f'https://mcspapp.5g.wasu.tv/bvradio_app/hzhs/newsServlet?siteId=1000101&functionName=getCurrentNews&nodeId={inner_cid}&newsId={vid}&platform=web'
        try:
            r = requests.get(url, headers=base_headers, timeout=10)
            r.encoding = 'utf-8'
            js = r.json()
            data = js.get('data', {})
            play_url = ''
            for vod in data.get('vodList', []):
                name = vod.get('title', '')
                vod_id = vod.get('vodId', '')
                play_url += f"{name}$https://www.wasu.cn/teleplay-detail/{inner_cid}/{vid}/{vod_id}#"
            play_url = play_url.rstrip('#')
            videos = [{
                "vod_id": did,
                "vod_actor": data.get('actor', ''),
                "vod_director": data.get('director', ''),
                "vod_content": data.get('newsAbstract', ''),
                "vod_remarks": f"更新时间{data.get('pubTime','')} {data.get('episodeDesc','')}",
                "vod_area": data.get('countryTag', ''),
                "vod_play_from": '华数TV',
                "vod_play_url": play_url
            }]
        except Exception as e:
            print(f"[detailContent] 异常: {e}")
            videos = []
        return {'list': videos}

    def playerContent(self, flag, id, vipFlags):
        return {'jx': 1, 'parse': 1, 'url': id, 'header': base_headers}

    def searchContentPage(self, key, quick, page='1'):
        videos = []
        url = f'https://ups.5g.wasu.tv/rmp-user-suggest/1000101/hzhs/searchServlet?functionName=getServiceAndNewsSearch&keyword={key}&pageSize=10&page={page}&siteId=1000101'
        try:
            r = requests.get(url, headers=base_headers, timeout=10)
            r.encoding = 'utf-8'
            js = r.json()
            for i in js.get('data', {}).get('videoDataList', []):
                if i.get('pPic'):
                    vid = str(i.get('nodeId', '')) + ',' + str(i.get('newsId', ''))
                    videos.append({
                        "vod_id": vid,
                        "vod_name": i.get('title', ''),
                        "vod_pic": i.get('pPic', ''),
                        "vod_remarks": i.get('episodeDesc', '')
                    })
        except Exception as e:
            print(f"[searchContentPage] 异常: {e}")
        return {
            'list': videos,
            'page': page,
            'pagecount': 9999,
            'limit': 90,
            'total': 999999
        }

    def searchContent(self, key, quick, pg="1"):
        return self.searchContentPage(key, quick, pg)

    def localProxy(self, params):
        return None