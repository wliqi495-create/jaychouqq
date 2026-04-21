"""
@header({
  searchable: 1,
  filterable: 1,
  quickSearch: 1,
  title: '麻雀视频',
  lang: 'hipy'
})
"""

# -*- coding: utf-8 -*-
# 本资源来源于互联网公开渠道，仅可用于个人学习爬虫技术。
# 严禁将其用于任何商业用途，下载后请于 24 小时内删除，搜索结果均来自源站，本人不承担任何责任。

from Crypto.Cipher import AES
from base.spider import Spider
from urllib.parse import quote_plus
from Crypto.Util.Padding import unpad
import re,sys,json,base64,urllib3,hashlib
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
sys.path.append('..')

class Spider(Spider):
    main_headers,key,host = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
        'accept-language': 'zh-CN,zh;q=0.9',
        'sec-ch-ua': '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
        'cache-control': 'no-cache',
        'pragma': 'no-cache',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-site': 'same-origin'
    },'Mcxos@mucho!nmme','https://www.mqtv.cc'

    def homeContent(self, filter):
        if not self.host: return None
        return {'class': [{'type_id': '/type/movie', 'type_name': '电影'},{'type_id': '/type/tv', 'type_name': '电视剧'},{'type_id': '/type/va', 'type_name': '综艺'},{'type_id': '/type/ct', 'type_name': '动漫'}]}

    def homeVideoContent(self):
        response = self.fetch(f"{self.host}/libs/VodList.api.php?home=index&token={self.token('/')}", headers=self.headers2('/'), verify=False).json()
        videos = []
        for i in response['data']['movie']:
            videos.extend(self.arr2vods(i.get('show',[])))
        return {'list': videos}

    def categoryContent(self, tid, pg, filter, extend):
        url = f"{self.host}/libs/VodList.api.php?type={tid.split('/',2)[2]}&rank=rankhot&cat=&year=&area=&page={pg}&token={self.token(tid,'/')}"
        response = self.fetch(url, headers=self.headers2(tid), verify=False).json()
        videos = self.arr2vods(response['data'])
        return {'list': videos, 'page': pg}

    def searchContent(self, key, quick, pg='1'):
        path = f'/search/{quote_plus(key)}'
        url = f"{self.host}/libs/VodList.api.php?search={key}&token={self.token(path, '/')}"
        response = self.fetch(url, headers=self.headers2(path), verify=False).json()
        data = self.decode(response['data'])
        videos = []
        for i in data['vod_all']:
            if isinstance(i,dict):
                videos.extend(self.arr2vods(i.get('show',[])))
        return {'list': videos, 'page': pg}

    def detailContent(self, ids):
        url = f"{self.host}/libs/VodInfo.api.php?type=ct&id={ids[0].split('/',3)[3]}&token={self.token(ids[0], '/')}"
        response = self.fetch(url, headers=self.headers2(ids[0]), verify=False).json()
        data = response['data']
        parses_arr = []
        for i in data.get('playapi',[]):
            if isinstance(i, dict) and i.get('url') and isinstance(i['url'], str):
                if i['url'].startswith('//'):
                    parses_arr.append(f"https:{i['url']}")
                else:
                    parses_arr.append(i['url'])
        parses = ','.join(parses_arr)
        shows, play_urls = [], []
        for j in data['playinfo']:
            urls = []
            for k in j['player']:
                urls.append(f"{k['no']}${k['url']}@{parses}")
            if urls:
                play_urls.append('#'.join(urls))
                shows.append(j['cnsite'])
        video = {
            'vod_id': ids[0],
            'vod_name': data['title'],
            'vod_pic': data['img'],
            'vod_remarks': data['remark'],
            'vod_year': data['year'],
            'vod_area': data['area'],
            'vod_actor': data['actor'],
            'vod_director': data['director'],
            'vod_content': None,
            'vod_play_from': '$$$'.join(shows),
            'vod_play_url': '$$$'.join(play_urls),
            'type_name': None
        }
        return {'list': [video]}

    def playerContent(self, flag, vid, vip_flags):
        raw_url, parses_str = vid.split('@',1)
        jx,sniff,url = 0,0,''
        parses = parses_str.split(',')
        for i in parses:
            try:
                response = self.fetch(f'{i}{raw_url}', headers=self.main_headers, verify=False, timeout=10).text
                charset_meta_id = re.search(r'<(?:\s+)?meta(?:\s+)?charset="UTF-8"(?:\s+)?id(?:\s+)?=(?:\s+)?"now_(.*?)"(?:\s+)?>', response, re.I).groups()[0]
                viewport_meta_id = re.search(r'<(?:\s+)?meta(?:\s+)?name(?:\s+)?=(?:\s+)?"viewport".*?id(?:\s+)?=(?:\s+)?"now_(.*?)">', response, re.I).groups()[0]
                jm_url = re.search(r'"url"(?:\s+)?:\s+?"(.*?)",', response, re.I).groups()[0]
                play_url = self.decrypt(jm_url,viewport_meta_id,charset_meta_id)
                if play_url.startswith('http'): url = play_url
            except Exception:
                continue
        if not url:
            if raw_url.startswith('http') and re.search(r'(?:www\.iqiyi|v\.qq|v\.youku|www\.mgtv|www\.bilibili)\.com', raw_url):
                url,jx = raw_url,1
            else:
                for j in parses:
                    if j.startswith('http'):
                        url,sniff = f'{j}{raw_url}',1
                        break
        return { 'jx': jx, 'parse': sniff, 'url': url, 'header': {'User-Agent': self.main_headers['User-Agent']}}

    def arr2vods(self, arr):
        videos = []
        for i in arr:
            videos.append({
                'vod_id': i['url'],
                'vod_name': i['title'],
                'vod_pic': i['img'],
                'vod_remarks': i['remark'],
                'vod_year': None
            })
        return videos

    def token(self,path,ref_path=''):
        headers = {
            **self.main_headers,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'priority': 'u=0, i',
            'sec-fetch-dest': 'document',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-user': '?1',
            'upgrade-insecure-requests': '1'
        }
        if ref_path: headers['referer']= f'{self.host}{ref_path}'
        response = self.fetch(f'{self.host}{path}', headers=headers, verify=False).text
        page_id = m.group(1) if (m := re.search(r'window\.pageid\s?=\s?\'(.*?)\';', response, re.I)) else None
        return self.encode(page_id)

    def headers2(self,ref_path=''):
        headers = {
            **self.main_headers,
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'priority': 'u=1, i',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'x-requested-with': 'XMLHttpRequest'
        }
        if ref_path: headers['referer']= f'{self.host}{ref_path}'
        return headers

    def encode(self,data):
        key = self.key
        key_len = len(key)
        json_str = json.dumps(data, ensure_ascii=False)
        b64_1 = base64.b64encode(json_str.encode('utf-8')).decode('utf-8')
        xor_result = []
        for i, char in enumerate(b64_1):
            key_idx = i % key_len
            xor_code = ord(char) ^ ord(key[key_idx])
            xor_result.append(chr(xor_code))
        xor_str = ''.join(xor_result)
        return quote_plus(base64.b64encode(xor_str.encode('utf-8')).decode('utf-8'))

    def decode(self,encoded_str):
        key = self.key
        key_length = len(key)
        try:
            decoded_step1 = base64.b64decode(encoded_str + '=' * (4 - len(encoded_str) % 4), altchars=None)
            decoded_step1_str = decoded_step1.decode('utf-8')
        except Exception:
            raise ValueError()
        xor_result = []
        for i, char in enumerate(decoded_step1_str):
            key_index = i % key_length
            char_code = ord(char) ^ ord(key[key_index])
            xor_result.append(chr(char_code))
        xor_str = ''.join(xor_result)
        try:
            decoded_step2 = base64.b64decode(xor_str + '=' * (4 - len(xor_str) % 4), altchars=None)
            decoded_step2_str = decoded_step2.decode('utf-8')
        except Exception:
            raise ValueError()
        try:
            result = json.loads(decoded_step2_str)
        except json.JSONDecodeError:
            raise ValueError()
        return result

    def decrypt(self, encrypted_str, viewport_meta_id, charset_meta_id):
        id_text_list = []
        for idx in range(len(charset_meta_id)):
            id_char = charset_meta_id[idx]
            text_char = viewport_meta_id[idx] if idx < len(viewport_meta_id) else ''
            id_text_list.append({'id':id_char, 'text':text_char})
        id_text_list_sorted = sorted(id_text_list, key=lambda x: int(x['id']))
        seed = ''.join([item['text'] for item in id_text_list_sorted])
        md5_result = hashlib.md5(f'{seed}lemon'.encode('utf-8')).hexdigest()
        cipher_data = base64.b64decode(encrypted_str)
        cipher = AES.new(md5_result[16:].encode('utf-8'),AES.MODE_CBC,md5_result[:16].encode('utf-8'))
        decrypted_data = cipher.decrypt(cipher_data)
        plain_data = unpad(decrypted_data, AES.block_size, style='pkcs7')
        return plain_data.decode('utf-8')

    def init(self, extend=''):
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