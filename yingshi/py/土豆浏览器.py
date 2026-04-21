# -*- coding: utf-8 -*-
# 本资源来源于互联网公开渠道，仅可用于个人学习爬虫技术。
# 严禁将其用于任何商业用途，下载后请于 24 小时内删除，搜索结果均来自源站，本人不承担任何责任。

import sys,json,urllib3
from base.spider import Spider
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
sys.path.append('..')

class Spider(Spider):
    host = 'https://tdxl1.tudd4.com'
    pic_host = 'https://hdjsfm8q.tudou8.xyz/'
    headers = {
        'User-Agent': "Mozilla/5.0 (Linux; Android 12; SM-S9080 Build/V417IR; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/101.0.4951.61 Safari/537.36 uni-app Html5Plus/1.0 (Immersed/0.6666667)",
        'Connection': "Keep-Alive",
        'Accept-Encoding': "gzip",
        'Content-Type': "application/json",
        'token': "4DF7F118BAE48C3CB44C640D2C51E905640D2C51E905"
    }

    def init(self, extend=''):
        response = self.post(f'{self.host}/apicms.php/video/appxianlu', data=json.dumps({}),headers=self.headers,verify=False).json()
        data = response['data']
        for i in data:
            try:
                response = self.post(f'{i["payurl"]}/index.php/index/ceshu', headers=self.headers,verify=False).text
                if response == 'ok':
                    self.host = i['payurl']
                    break
            except Exception:
                continue

    def homeContent(self, filter):
        payload = {
            "is_index_shouye": 1
        }
        response = self.post(f'{self.host}/apicms.php/video/gettypelists', data=json.dumps(payload), headers=self.headers,verify=False).json()
        data = response['data']
        classes = []
        for i in data:
            if i['type_id'] != -1:
                classes.append({'type_id':i['type_id'],'type_name':i['type_name']})
        return {'class': classes}

    def homeVideoContent(self):
        payload = {
            "type_id": -1,
            "current_index": 0
        }

        response = self.post(f'{self.host}/apicms.php/video/getindexvideofenleixs', data=json.dumps(payload), headers=self.headers,verify=False).json()
        video = []
        video.extend(response.get('vodhenghots', []))
        for i in response.get('vodlists', []):
            video.extend(i.get('list',[]))
        videos = []
        for i in video:
            vod_pic = i.get('vod_pic','')
            if not vod_pic.startswith('http') and vod_pic:
                vod_pic = self.pic_host + vod_pic
            videos.append({
                    'vod_id': i.get('vod_id'),
                    'vod_name': i.get('vod_name'),
                    'vod_class': i.get('vod_class'),
                    'vod_pic': vod_pic,
                    'vod_remarks': i.get('vod_remarks'),
                    'vod_score': i.get('vod_score')
                    })
        gglunbolists = response.get('gglunbolists', [])
        for i in gglunbolists:
            vod_class = i.get('vod_class')
            vod_class2 = ''
            if isinstance(vod_class, list):
                for j in vod_class:
                    vod_class2 += j.get('bq_class', '')
            videos.insert(0,{
                'vod_id': i.get('vod_id'),
                'vod_name': i.get('vod_name'),
                'vod_class': vod_class2,
                'vod_pic': i.get('vod_pic_slide', i.get('vod_pic'))
            })
        return {'list': videos}

    def categoryContent(self, tid, pg, filter, extend):
        payload = {
            "page": pg,
            "type_id": tid,
            "area_name": extend.get('area','全部地区'),
            "year_name": extend.get('year','全部年份'),
            "leixin_name": extend.get('class','全部类型'),
            "sort_id": extend.get('sort',2)
        }
        response = self.post(f'{self.host}/apicms.php/video/getsaixuanvideos', data=json.dumps(payload), headers=self.headers,verify=False).json()
        return {'list': response['data'], 'page': pg}

    def searchContent(self, key, quick, pg="1"):
        payload = {
            "page": pg,
            "video_name": key
        }
        response = self.post(f'{self.host}/apicms.php/video/getsousuovideojieguo', data=json.dumps(payload), headers=self.headers,verify=False).json()
        data = response['data']
        videos = []
        for i in data:
            vod_pic = i.get('vod_pic', '')
            if not vod_pic.startswith('http'):
                vod_pic = self.pic_host + vod_pic
            vod_class = i.get('vod_class')
            vod_class2 = ''
            if isinstance(vod_class, list):
                for j in vod_class:
                    vod_class2 += j.get('bq_class', '')
            videos.append({
                "vod_id": i['vod_id'],
                "vod_name": i['vod_name'],
                "vod_class": vod_class2,
                "vod_score": i.get('vod_score'),
                "vod_pic": vod_pic,
                'vod_year': i.get('vod_year'),
                "vod_remarks": i['vod_remarks']
            })
        return {'list': videos, 'page': pg}

    def detailContent(self, ids):
        payload = {
            "vod_id": ids[0]
        }
        response = self.post(f'{self.host}/apicms.php/video/getplayxiangqingdata', data=json.dumps(payload), headers=self.headers,verify=False).json()
        data = response['data']
        videos = []
        vod_actor = ''
        actor = data.get('vod_actor',[])
        for i in actor:
            bq_actor = i.get('bq_actor')
            if bq_actor:
                vod_actor += bq_actor + ', '
        vod_director = ''
        director = data.get('vod_director', [])
        for i in director:
            bq_actor = i.get('bq_actor')
            if bq_actor:
                vod_director += bq_actor + ', '

        vod_play_url = ''
        show = ''
        for i in data['vod_play_list']:
            show += i['xl_name'] + '$$$'
            urls = ''
            for j in i['urlsaz']:
                if j['ishdjx'] == 1:
                    urls += f"{j.get('index',j.get('title',''))}${j['vid']}@{j['from']}@{data.get('play_index',0)}@{j['url']}#"
                else:
                    urls += f"{j.get('index',j.get('title',''))}${j.get('url','')}#"
            urls = urls.rstrip('#')
            vod_play_url += urls + '$$$'
        show = show.rstrip('$$$')
        vod_play_url = vod_play_url.rstrip('$$$')

        videos.append({
            'vod_id': data.get('vod_id'),
            'vod_name': data.get('vod_name'),
            'vod_content': data.get('vod_content'),
            'vod_blurb': data.get('vod_blurb'),
            'vod_remarks': data.get('vod_remarks'),
            "vod_director": vod_director.rstrip(', '),
            "vod_actor": vod_actor.rstrip(', '),
            'vod_year': data.get('vod_year'),
            'vod_area': data.get('vod_area'),
            'vod_play_from': show,
            'vod_play_url': vod_play_url
        })

        return {'list': videos}

    def playerContent(self, flag, id, vipflags):
        jx, ua = 0, 'io.dcloud.application.DCloudApplication/1.0.0.19 (Linux;Android 12) ExoPlayerLib/2.15.1'
        ua2 = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
        if '@' in id:
            vod_id, playfrom, play_index, vodhhplayurl = id.split('@')
            try:
                if vod_id and playfrom and vodhhplayurl:
                    payload = {
                        "vod_id": vod_id,
                        "from": playfrom,
                        "play_index": play_index,
                        "vodhhplayurl": vodhhplayurl,
                        "play_xuanlu": 0
                    }
                    response = self.post(f'{self.host}/apicms.php/video/gethuohuaurljiexi', data=json.dumps(payload), headers=self.headers,verify=False).json()
                    url =  response['data']
                    if not url.startswith('http'):
                        url, jx, ua = vodhhplayurl, 1, ua2
            except Exception:
                url, jx, ua = vodhhplayurl, 1 ,ua2
        else:
            url = id
        return {'jx': jx, 'parse': 0, 'url': url,'header': {'User-Agent': ua}}

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
