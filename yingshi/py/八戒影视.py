# -*- coding: utf-8 -*-
# 本资源来源于互联网公开渠道，仅可用于个人学习爬虫技术。
# 严禁将其用于任何商业用途，下载后请于 24 小时内删除，搜索结果均来自源站，本人不承担任何责任。

import sys,json,urllib3
import concurrent.futures
from urllib.parse import quote
from base.spider import Spider
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
sys.path.append('..')

class Spider(Spider):
    host, userid, episode_list = '', '', []
    headers = {
        'User-Agent': "okhttp/4.12.0",
        'Connection': "Keep-Alive",
        'Accept-Encoding': "gzip",
        'Content-Type': "application/json;charset=UTF-8",
        'Cache-Control': "no-cache",
        'token': "",
        'deviceId': "",
        'client': "app",
        'deviceType': "Android"
    }

    def init(self, extend=''):
        self.headers['deviceId'] = '2d590b9842d064a1'
        response = self.fetch('http://osstexll.oss-rg-china-mainland.aliyuncs.com/domainPath.json', headers={'User-Agent': "okhttp/4.12.0",'Connection': "Keep-Alive",'Accept-Encoding': "gzip"}).json()
        self.host = response['url'][0]
        response = self.fetch(f'{self.host}/api/v1/app/user/visitorInfo', headers=self.headers).json()
        self.userid = response['data']['id']
        token = response['data']['token']
        self.headers['token'] = token

    def homeContent(self, filter):
        response = self.post(f'{self.host}/api/v1/app/screen/screenType', headers=self.headers).json()
        data = response['data']
        classes = []
        for i in data:
            classes.append({'type_id': i['id'],'type_name': i['name']})
        return {'class': classes}

    def homeVideoContent(self):
        response = self.post(f'{self.host}/api/v1/app/recommend/recommendList', headers=self.headers).json()
        data = response['data']
        videos = []
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future_to_id = {
                executor.submit(
                    self.post,
                    f'{self.host}/api/v1/app/recommend/recommendSubList',
                    data=json.dumps({
                        "condition": item['id'],
                        "pageNum": 1,
                        "pageSize": 6
                    }),
                    headers=self.headers
                ): item['id'] for item in data
            }
            for future in concurrent.futures.as_completed(future_to_id):
                try:
                    response = future.result().json()
                    for video in response['data']['records']:
                        videos.append({
                            "vod_id": video['id'],
                            "vod_name": video['name'],
                            "vod_pic": video['cover']
                        })
                except Exception as e:
                    print(f"Request failed for item {future_to_id[future]}: {str(e)}")
        return {'list': videos}

    def categoryContent(self, tid, pg, filter, extend):
        payload = {
            "condition": {
                "classify": "",
                "region": "",
                "sreecnTypeEnum": "NEWEST",
                "typeId": tid,
                "year": ""
            },
            "pageNum": pg,
            "pageSize": 40
        }
        response = self.post(f'{self.host}/api/v1/app/screen/screenMovie', data=json.dumps(payload), headers=self.headers).json()
        videos = []
        for i in response['data']['records']:
            videos.append({
                "vod_id": i['id'],
                "vod_name": i['name'],
                "vod_pic": i['cover'],
                "vod_remarks": i['area'],
                "vod_year": i['year']
            })
        return {'list': videos, 'page': pg}

    def searchContent(self, key, quick, pg='1'):
        payload = {
            "condition": {
                "value": key
            },
            "pageNum": pg,
            "pageSize": 40
        }
        response = self.post(f'{self.host}/api/v1/app/search/searchMovie', data=json.dumps(payload), headers=self.headers).json()
        videos = []
        for i in response['data']['records']:
            videos.append({
                'vod_id': i['id'],
                'vod_name': i['name'],
                'vod_pic': i['cover'],
                'vod_remarks': i['area'],
                'vod_year': i['year'],
                'vod_area': i['area'],
                'vod_content': i['desc']
            })
        return {'list': videos, 'page': pg}

    def detailContent(self, ids):
        payload = {
            "id": ids[0],
            "source": 0,
            "typeId": "M17",
            "userId": self.userid
        }
        response = self.post(f'{self.host}/api/v1/app/play/movieDetails', data=json.dumps(payload), headers=self.headers).json()
        data = response['data']
        currentplayerid = data['playerId']
        play_urls = []
        play_url = []
        show = []
        for i in data['episodeList']:
            play_url.append(f"{i['episode']}${ids[0]}@{currentplayerid}@{i['id']}@episode")
        play_urls.append('#'.join(play_url))
        moviePlayerList = data['moviePlayerList']
        for i2 in moviePlayerList:
            if i2['id'] == currentplayerid:
                show.append(i2['moviePlayerName'])
        for j in moviePlayerList:
            playerid = j['id']
            episodeTotal = j.get('episodeTotal')
            if playerid == currentplayerid or episodeTotal == None:
                continue
            play_url = []
            for k in range(1,episodeTotal + 1):
                play_url.append(f"第{k}集${k}@{playerid}@{ids[0]}@virtual")
            play_urls.append('#'.join(play_url))
            if j['moviePlayerName'] not in show:
                show.append(j['moviePlayerName'])
        payload = {
            "id": ids[0],
            "typeId": "M17"
        }
        response = self.post(f'{self.host}/api/v1/app/play/movieDesc', data=json.dumps(payload), headers=self.headers).json()
        data2 = response['data']
        video = {}
        video.update({
            'vod_id': data2['id'],
            'vod_name': data2['name'],
            'vod_pic': data2['cover'],
            'vod_content': data2['introduce'],
            'vod_year': data2['year'],
            'vod_area': data2['area'],
            'vod_remarks': '',
            'vod_score': data2['score'],
            'type_name': data2['classify'],
            'vod_director': data2['director'],
            'vod_play_from': '$$$'.join(show),
            'vod_play_url': '$$$'.join(play_urls)
        })
        return {'list': [video]}

    def playerContent(self, flag, id, vipflags):
        param, playerid, param2, param3 = id.split('@')
        if param3 == 'virtual':
            payload = {
                "episodeIndex": str(int(param)-1),
                "id": int(param2),
                "playerId": playerid,
                "source": 0,
                "typeId": "M16",
                "userId": self.userid
            }
            response = self.post(f'{self.host}/api/v1/app/play/movieDetails', data=json.dumps(payload), headers=self.headers).json()
            data = response['data']
            parse_url = data['url']
            playerid = data['playerId']
        else:
            payload = {
                "episodeId": param2,
                "id": param,
                "playerId": playerid,
                "source": 0,
                "typeId": "M16",
                "userId": self.userid
            }
            response = self.post(f'{self.host}/api/v1/app/play/movieDetails', data=json.dumps(payload), headers=self.headers).json()
            data = response['data']
            parse_url = data['url']
            playerid = data['playerId']
        response = self.fetch(f"{self.host}/api/v1/app/play/analysisMovieUrl?playerUrl={quote(parse_url,safe='')}&playerId={playerid}", headers=self.headers).json()
        url = response['data']

        return { 'jx': '0', 'parse': '0', 'url': url, 'header': {'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1'}}


    def getName(self):
        pass

    def isVideoFormat(self, url):
        pass

    def manualVideoCheck(self):
        pass

    def destroy(self):
        pass

    def localProxy(self, param):
        pass
