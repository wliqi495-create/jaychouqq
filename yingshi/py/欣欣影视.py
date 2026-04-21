# -*- coding: utf-8 -*-
# 本资源来源于互联网公开渠道，仅可用于个人学习及爬虫技术交流。
# 严禁将其用于任何商业用途，下载后请于 24 小时内删除，搜索结果均来自源站，本人不承担任何责任。

from Crypto.Cipher import AES
from base.spider import Spider
from urllib.parse import quote
import re,sys,json,base64,urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
sys.path.append('..')

class Spider(Spider):
    host, jiexi, headers = {
        'User-Agent': 'XinJieApp/1.0',
        'Accept-Encoding': 'gzip',
        'cache-control': 'no-cache'
    }, '', ''

    def init(self, extend=''):
        ext = extend.strip()
        host = 'https://tvfun.centos.chat/app.json'
        self.key = '505cab36b1111416'
        self.iv = '0e832063ac451b27'
        if ext.startswith('http'):
            host = ext
        if not re.match(r'^https?://[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*(:\d+)?/?$', host):
            host = self.fetch(host,headers=self.headers,verify=False).json()['server']['url']
        self.host = host.rstrip('/')
        return None

    def homeContent(self, filter):
        if not self.host: return None
        response = self.fetch(f'{self.host}/admin/duanjuc.php?page=1&limit=30', headers=self.headers, verify=False).json()
        data = response['data']
        if response.get('encrypted') == 1:
            data_ = self.decrypt(response['data'])
            data = json.loads(data_)['data']
        classes, videos = [], []
        for i in data:
            if i['type_id'] != 0:
                classes.append({'type_id': i['type_id'], 'type_name': i['type_name']})
            for j in i['videos']:
                videos.append({
                'vod_id': j['vod_id'],
                'vod_name': j['vod_name'],
                'vod_pic': j['vod_pic'],
                'vod_remarks': j['vod_remarks'],
                'vod_year': j['vod_year']
            })
        return {'class': classes, 'list': videos}

    def categoryContent(self, tid, pg, filter, extend):
        if not self.host: return None
        response = self.fetch(f'{self.host}/admin/duanjusy.php?limit=20&page={pg}&type_id={tid}', headers=self.headers, verify=False).json()
        data = response['data']
        if response.get('encrypted') == 1:
            data_ = self.decrypt(response['data'])
            data1 = json.loads(data_)
            data = data1['data']
        videos = []
        for i in data:
            videos.append({
                'vod_id': i['vod_id'],
                'vod_name': i['vod_name'],
                'vod_pic': i['vod_pic'],
                'vod_remarks': i['vod_remarks'],
                'vod_year': i['vod_year']
            })
        return {'list': videos, 'pagecount': data1['pagination']['total_pages']}

    def searchContent(self, key, quick, pg='1'):
        if not self.host: return None
        response = self.fetch(f'{self.host}/admin/duanjusy.php?suggest={key}&limit=20&page={pg}', headers=self.headers, verify=False).json()
        data = response['data']
        if response.get('encrypted') == 1:
            data_ = self.decrypt(response['data'])
            data1 = json.loads(data_)
            data = data1['data']
        videos = []
        for i in data:
            videos.append({
                'vod_id': i['vod_id'],
                'vod_name': i['vod_name'],
                'vod_pic': i['vod_pic'],
                'vod_remarks': i['vod_remarks'],
                'vod_year': i['vod_year'],
                'vod_content': i['vod_blurb']
            })
        return {'list': videos, 'pagecount': data1['pagination']['total_pages']}

    def detailContent(self, ids):
        response = self.fetch(f'{self.host}/admin/duanju.php?vod_id={ids[0]}', headers=self.headers, verify=False).json()
        data = response['data']
        if response.get('encrypted') == 1:
            data_ = self.decrypt(response['data'])
            data = json.loads(data_)['data']
        jiexi = data.get('jiexi','')
        if jiexi.startswith('http'):
            self.jiexi = jiexi
        play_from, play_urls = [], []
        for source in data['play_sources']:
            play_from.append(f"{source['name']}\u2005({source['source_key']})")
            urls = source['url'].split('#')
            urls2 = [ '$'.join([parts[0], f"{source['source_key']}@{parts[1]}"]) for parts in [url.split('$') for url in urls] ]
            play_urls.append('#'.join(urls2))
        video = {
                'vod_id': data['vod_id'],
                'vod_name': data['vod_name'],
                'vod_pic': data['vod_pic'],
                'vod_remarks': data['vod_remarks'],
                'vod_year': data['vod_year'],
                'vod_area': data['vod_area'],
                'vod_actor': data['vod_actor'],
                'vod_director': data['vod_director'],
                'vod_content': data['vod_content'],
                'type_name': data['vod_class'],
                'vod_play_from': '$$$'.join(play_from),
                'vod_play_url': '$$$'.join(play_urls)
            }
        return {'list': [video]}

    def playerContent(self, flag, id, vipflags):
        play_from, raw_url = id.split('@', 1)
        default_ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1'
        if self.jiexi:
            try:
                response = self.fetch(f"{self.host}/admin/jiexi.php?url={quote(raw_url, safe='')}&source={play_from}", headers=self.headers, verify=False).json()
                if response.get('encrypted') == 1:
                    data_ = self.decrypt(response['data'])
                    data = json.loads(data_)
                play_url = data['url']
                url = play_url if play_url.startswith('http') else id
                ua = response.get('UA', default_ua)
            except Exception:
                url, ua = raw_url, default_ua
        else:
            url,ua = raw_url,default_ua
        return {'jx': '0','parse': '0','url': url,'header': {'User-Agent': ua}}

    def decrypt(self, str):
        key = self.key.ljust(32, '0')
        key_bytes = key.encode('utf-8')
        iv_bytes = self.iv.encode('utf-8')
        ciphertext = base64.b64decode(str)
        cipher = AES.new(key_bytes, AES.MODE_CBC, iv_bytes)
        plaintext = cipher.decrypt(ciphertext)
        padding_length = plaintext[-1]
        plaintext = plaintext[:-padding_length]
        return plaintext.decode('utf-8')

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