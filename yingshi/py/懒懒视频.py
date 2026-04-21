# -*- coding: utf-8 -*-
# 本资源来源于互联网公开渠道，仅可用于个人学习爬虫技术。
# 严禁将其用于任何商业用途，下载后请于 24 小时内删除，搜索结果均来自源站，本人不承担任何责任。

from base.spider import Spider
import sys,time,uuid,json,urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
sys.path.append('..')

class Spider(Spider):
    device_id,cms_host,parses = '','',{}
    headers = {
        'User-Agent': "okhttp/4.9.0",
        'Connection': "Keep-Alive",
        'Accept-Encoding': "gzip",
        'appId': "522",
        'requestId': '',
        'timestamp': '',
        'version': "2.4.18",
        'package': "com.lanlanys.app",
        'deviceId': '',
        'AppKey': 'dec99f2e3071ece8c7aa5b2fd5800a6f',
        'AppSecret': 'd686e49b39c996326bfe7b5f28846bb8',
        'oaid': "",
        'imei': "",
        'network': "yd",
        'appName': "lanlan",
        'apiVersion': "w2yj3m9b",
    }
    headers2 = {
        'User-Agent': "okhttp/4.9.0",
        'Connection': "Keep-Alive",
        'Accept-Encoding': "gzip"
    }

    def init(self, extend=''):
        try:
            config = json.loads(extend)
        except (json.JSONDecodeError, TypeError):
            config = {}
        host = config.get('host', 'http://llsp2.洛阳it商城.com').rstrip('/')
        self.headers['deviceId'] = config.get('deviceId', 'e718f6482ea3d4ef')
        self.cms_host = host

    def homeContent(self, filter):
        self.headers['requestId'] = str(uuid.uuid4())
        self.headers['timestamp'] = self.timestamp()
        response = self.fetch(f"{self.cms_host}/api.php/provide/index?tid=0", headers=self.headers, verify=False).json()
        data = response['data']
        classes = []
        videos = data.get('tj',[])
        for j in data.get('sub_data',[]):
            if 'data' in j:
                videos.extend(j['data'])
            classes.append({'type_id': j['type_id'], 'type_name': j['type_name']})
        return {'class': classes, 'list': videos}

    def categoryContent(self, tid, pg, filter, extend):
        self.headers['requestId'] = str(uuid.uuid4())
        self.headers['timestamp'] = self.timestamp()
        response = self.fetch(f"{self.cms_host}/api.php/provide/nav?tid={tid}&type=全部&area=全部&year=全部&orderBy=vod_time&pg={pg}", headers=self.headers, verify=False).json()

        return {'list': response['data']['data'], 'page': pg}

    def searchContent(self, key, quick, pg='1'):
        self.headers['requestId'] = str(uuid.uuid4())
        self.headers['timestamp'] = self.timestamp()
        response = self.fetch(f"{self.cms_host}/api.php/provide/search?wd={key}&tid=0&pg={pg}", headers=self.headers, verify=False).json()
        data = response['data']
        for i in data:
            if 'vod_play_from' in i:
                i.pop('vod_play_from')
        return {'list': data, 'page': pg}

    def detailContent(self, ids):
        self.headers['requestId'] = str(uuid.uuid4())
        self.headers['timestamp'] = self.timestamp()
        response = self.fetch(f"{self.cms_host}/api.php/provide/vod?ids={ids[0]}&device_id={self.device_id}", headers=self.headers, verify=False).json()
        data = response['data']
        vod_show = []
        vod_urls = []
        for i in data['vod_play_url']:
            vod_from = i['id']
            show = i['name']
            if show != vod_from:
                show += f" ({vod_from})"
            vod_show.append(show)
            self.parses[vod_from] = i.get('parse',[])
            vod_url = []
            for j in i['data']:
                vod_url.append(f"{j['name']}${vod_from}@{j['url']}")
            vod_urls.append('#'.join(vod_url))
        data['vod_play_from'] = '$$$'.join(vod_show)
        data['vod_play_url'] = '$$$'.join(vod_urls)
        return {'list': [data]}

    def playerContent(self, flag, id, vipflags):
        header = {
            'User-Agent': ' Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/929.36 (KHTML, like Gecko) Chrome/86.0.3347.284 Safari/709.36'}
        jx, url = 0, ''
        play_from, raw_url = id.split('@')
        parses = self.parses.get(play_from, [])
        for i in parses:
            try:
                data = self.fetch(f'{i}{raw_url}', headers=self.headers2, verify=False).json()
                data = data['data']
                play_url = data['url']
                if play_url.startswith('http'):
                    url = play_url
                    header = data.get('header', header)
                    break
            except Exception:
                continue
        return {'jx': jx, 'parse': '0', 'url': url, 'header': header}

    def timestamp(self):
        return str(int(time.time() * 1000))

    def homeVideoContent(self):
        pass

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