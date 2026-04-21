# coding=utf-8
# @name 瓜子APP
# @description 瓜子APP FongMi TVBox Python源 (修正容错增强版)
import json
import time
import base64
import hashlib
import requests
from urllib.parse import urlencode

# Fongmi 运行环境默认支持 pycryptodome 库
from Crypto.Cipher import AES
from Crypto.PublicKey import RSA

from base.spider import Spider

class Spider(Spider):
    def getName(self):
        return "瓜子APP"

    def init(self, extend=""):
        self.host = 'https://api.w32z7vtd.com'
        self.headers = {
            'Cache-Control': 'no-cache',
            'Version': '2406025',
            'PackageName': 'com.uf076bf0c246.qe439f0d5e.m8aaf56b725a.ifeb647346f',
            'Ver': '1.9.2',
            'Referer': 'https://api.w32z7vtd.com',
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'okhttp/3.12.0'
        }
        
        self.private_key_pem = """-----BEGIN PRIVATE KEY-----
MIICdgIBADANBgkqhkiG9w0BAQEFAASCAmAwggJcAgEAAoGAe6hKrWLi1zQmjTT1
ozbE4QdFeJGNxubxld6GrFGximxfMsMB6BpJhpcTouAqywAFppiKetUBBbXwYsYU
1wNr648XVmPmCMCy4rY8vdliFnbMUj086DU6Z+/oXBdWU3/b1G0DN3E9wULRSwcK
ZT3wj/cCI1vsCm3gj2R5SqkA9Y0CAwEAAQKBgAJH+4CxV0/zBVcLiBCHvSANm0l7
HetybTh/j2p0Y1sTXro4ALwAaCTUeqdBjWiLSo9lNwDHFyq8zX90+gNxa7c5EqcW
V9FmlVXr8VhfBzcZo1nXeNdXFT7tQ2yah/odtdcx+vRMSGJd1t/5k5bDd9wAvYdI
DblMAg+wiKKZ5KcdAkEA1cCakEN4NexkF5tHPRrR6XOY/XHfkqXxEhMqmNbB9U34
saTJnLWIHC8IXys6Qmzz30TtzCjuOqKRRy+FMM4TdwJBAJQZFPjsGC+RqcG5UvVM
iMPhnwe/bXEehShK86yJK/g/UiKrO87h3aEu5gcJqBygTq3BBBoH2md3pr/W+hUM
WBsCQQChfhTIrdDinKi6lRxrdBnn0Ohjg2cwuqK5zzU9p/N+S9x7Ck8wUI53DKm8
jUJE8WAG7WLj/oCOWEh+ic6NIwTdAkEAj0X8nhx6AXsgCYRql1klbqtVmL8+95KZ
K7PnLWG/IfjQUy3pPGoSaZ7fdquG8bq8oyf5+dzjE/oTXcByS+6XRQJAP/5ciy1b
L3NhUhsaOVy55MHXnPjdcTX0FaLi+ybXZIfIQ2P4rb19mVq1feMbCXhz+L1rG8oa
t5lYKfpe8k83ZA==
-----END PRIVATE KEY-----"""

        self.static_keys = "Qmxi5ciWXbQzkr7o+SUNiUuQxQEf8/AVyUWY4T/BGhcXBIUz4nOyHBGf9A4KbM0iKF3yp9M7WAY0rrs5PzdTAOB45plcS2zZ0wUibcXuGJ29VVGRWKGwE9zu2vLwhfgjTaaDpXo4rby+7GxXTktzJmxvneOUdYeHi+PZsThlvPI="
        self.token = '1be86e8e18a9fa18b2b8d5432699dad0.ac008ed650fd087bfbecf2fda9d82e9835253ef24843e6b18fcd128b10763497bcf9d53e959f5377cde038c20ccf9d17f604c9b8bb6e61041def86729b2fc7408bd241e23c213ac57f0226ee656e2bb0a583ae0e4f3bf6c6ab6c490c9a6f0d8cdfd366aacf5d83193671a8f77cd1af1ff2e9145de92ec43ec87cf4bdc563f6e919fe32861b0e93b118ec37d8035fbb3c.59dd05c5d9a8ae726528783128218f15fe6f2c0c8145eddab112b374fcfe3d79'

        self.classes = [
            {"type_id": "1", "type_name": "电影"},
            {"type_id": "2", "type_name": "电视剧"},
            {"type_id": "4", "type_name": "动漫"},
            {"type_id": "3", "type_name": "综艺"},
            {"type_id": "64", "type_name": "短剧"}
        ]

        # 增加 init 初始值声明，确保壳子正确绑定默认参数
        years = [{"n": "全部", "v": "0"}] + [{"n": str(y), "v": str(y)} for y in range(2026, 2004, -1)] + [{"n": "更早", "v": "2004"}]
        areas_common = [{"n": n, "v": v} for n, v in zip(["全部", "大陆", "香港", "台湾", "美国", "韩国", "日本", "英国", "法国", "泰国", "印度", "其他"], ["0", "大陆", "香港", "台湾", "美国", "韩国", "日本", "英国", "法国", "泰国", "印度", "其他"])]
        sorts = [{"n": "最新", "v": "d_id"}, {"n": "最热", "v": "d_hits"}, {"n": "推荐", "v": "d_score"}]

        self.filters = {
            "1": [{"key": "year", "name": "年份", "init": "0", "value": years}, {"key": "area", "name": "地区", "init": "0", "value": areas_common}, {"key": "sort", "name": "排序", "init": "d_id", "value": sorts}],
            "2": [{"key": "year", "name": "年份", "init": "0", "value": years}, {"key": "area", "name": "地区", "init": "0", "value": areas_common}, {"key": "sort", "name": "排序", "init": "d_id", "value": sorts}],
            "4": [{"key": "year", "name": "年份", "init": "0", "value": years[:13]}, {"key": "area", "name": "地区", "init": "0", "value": [{"n": n, "v": v} for n, v in zip(["全部", "大陆", "日本", "美国", "其他"], ["0", "大陆", "日本", "美国", "其他"])]}, {"key": "sort", "name": "排序", "init": "d_id", "value": sorts}],
            "3": [{"key": "year", "name": "年份", "init": "0", "value": years[:6]}, {"key": "area", "name": "地区", "init": "0", "value": [{"n": n, "v": v} for n, v in zip(["全部", "大陆", "台湾", "韩国"], ["0", "大陆", "台湾", "韩国"])]}, {"key": "sort", "name": "排序", "init": "d_id", "value": sorts}],
            "64": [{"key": "year", "name": "年份", "init": "0", "value": years[:5]}, {"key": "sort", "name": "排序", "init": "d_id", "value": sorts}]
        }

    # ========================== 加密与解密工具 ==========================

    def pkcs7_pad(self, text):
        block_size = 16
        text_bytes = text.encode('utf-8')
        pad_len = block_size - (len(text_bytes) % block_size)
        return text_bytes + bytes([pad_len]) * pad_len

    def aes_encrypt(self, text):
        key = b'mvXBSW7ekreItNsT'
        iv = b'2U3IrJL8szAKp0Fj'
        cipher = AES.new(key, AES.MODE_CBC, iv)
        padded_text = self.pkcs7_pad(text)
        return cipher.encrypt(padded_text).hex().upper()

    def aes_decrypt(self, hex_text, key_str, iv_str):
        key = key_str.encode('utf-8')
        iv = iv_str.encode('utf-8')
        cipher = AES.new(key, AES.MODE_CBC, iv)
        decrypted = cipher.decrypt(bytes.fromhex(hex_text))
        pad_len = decrypted[-1]
        return decrypted[:-pad_len].decode('utf-8', errors='ignore')

    def generate_signature(self, request_key, timestamp):
        sign_str = f"token_id=,token={self.token},phone_type=1,request_key={request_key},app_id=1,time={timestamp},keys={self.static_keys}*&zvdvdvddbfikkkumtmdwqppp?|4Y!s!2br"
        return hashlib.md5(sign_str.encode('utf-8')).hexdigest()

    def rsa_decrypt_no_padding(self, data_b64):
        rsa_key = RSA.import_key(self.private_key_pem)
        buffer = base64.b64decode(data_b64)
        block_size = 256
        decrypted_parts = []

        for i in range(0, len(buffer), block_size):
            chunk = buffer[i:i + block_size]
            chunk_int = int.from_bytes(chunk, 'big')
            dec_int = pow(chunk_int, rsa_key.d, rsa_key.n)
            dec_bytes = dec_int.to_bytes(block_size, 'big')
            
            start = 0
            while start < len(dec_bytes) and dec_bytes[start] == 0:
                start += 1
            
            try:
                real_start = dec_bytes.index(0, 2)
                decrypted_parts.append(dec_bytes[real_start + 1:])
            except ValueError:
                decrypted_parts.append(dec_bytes[start:])

        return b''.join(decrypted_parts).decode('utf-8').strip()

    def api_request(self, data_dict, path):
        try:
            timestamp = str(int(time.time()))
            json_str = json.dumps(data_dict, separators=(',', ':'), ensure_ascii=False)
            request_key = self.aes_encrypt(json_str)
            signature = self.generate_signature(request_key, timestamp)

            payload = {
                'token': self.token,
                'token_id': '',
                'phone_type': '1',
                'time': timestamp,
                'phone_model': 'xiaomi-22021211rc',
                'keys': self.static_keys,
                'request_key': request_key,
                'signature': signature,
                'app_id': '1',
                'ad_version': '1'
            }

            url = f"{self.host}{path}"
            res = requests.post(url, data=payload, headers=self.headers, verify=False, timeout=10)

            if res.status_code != 200:
                return {"_error": f"网络异常: HTTP {res.status_code}"}
                
            res_json = res.json()
            if not res_json or 'data' not in res_json:
                return {"_error": f"API拦截: {res.text[:30]}"}

            keys_data_str = self.rsa_decrypt_no_padding(res_json['data']['keys'])
            keys_obj = json.loads(keys_data_str)

            decrypted_data = self.aes_decrypt(res_json['data']['response_key'], keys_obj['key'], keys_obj['iv'])
            return json.loads(decrypted_data)
            
        except Exception as e:
            err_msg = str(e)
            if "index" in err_msg or "decode" in err_msg:
                err_msg = "RSA/AES解密算法异常: " + err_msg
            return {"_error": err_msg}

    def get_resolution_score(self, res):
        r = res.lower().replace('p', '')
        scores = {'8k': 100, '4k': 90, '2160': 90, '1440': 80, '1080': 70, '720': 60, '超清': 50, '高清': 40, '标清': 30}
        return scores.get(r, 10)

    # ========================== 核心业务接口 ==========================

    def homeContent(self, filter):
        result = {}
        result['class'] = self.classes
        result['filters'] = self.filters

        data = self.api_request({
            "area": "0",
            "year": "0",
            "pageSize": "100",
            "sort": "d_id",
            "page": "1"
        }, "/App/IndexList/indexList")

        list_data = []
        if isinstance(data, dict) and 'list' in data:
            for item in data.get('list', []):
                continu = item.get('vod_continu', 0)
                list_data.append({
                    "vod_id": f"{item.get('vod_id')}/{continu}",
                    "vod_name": item.get('vod_name', ''),
                    "vod_pic": item.get('vod_pic', ''),
                    "vod_remarks": "电影" if continu == 0 else f"更新至{continu}集"
                })
        
        result['list'] = list_data
        return result

    def categoryContent(self, tid, pg, filter, extend):
        if extend is None or not isinstance(extend, dict):
            extend = {}

        area = extend.get("area", "0")
        year = extend.get("year", "0")
        sort = extend.get("sort", "d_id")

        data = self.api_request({
            "area": area,
            "year": year,
            "pageSize": "20",
            "sort": sort,
            "page": str(pg),
            "tid": str(tid)
        }, "/App/IndexList/indexList")

        # 核心跟踪调试：一旦接口失败或解析崩溃，呈现具体错误信息
        if isinstance(data, dict) and "_error" in data:
            return {
                "list": [{"vod_id": "error", "vod_name": data["_error"], "vod_pic": "", "vod_remarks": "请截图错误"}],
                "page": int(pg),
                "pagecount": 1
            }

        list_data = []
        for item in data.get('list', []):
            continu = item.get('vod_continu', 0)
            list_data.append({
                "vod_id": f"{item.get('vod_id')}/{continu}",
                "vod_name": item.get('vod_name', ''),
                "vod_pic": item.get('vod_pic', ''),
                "vod_remarks": "电影" if continu == 0 else f"更新至{continu}集"
            })

        total_page = int(data.get('totalPage', 0))
        return {
            "list": list_data,
            "page": int(pg),
            "pagecount": 999 if total_page == 0 else total_page
        }

    def detailContent(self, array):
        vod_id = array[0].split("/")[0] if "/" in array[0] else array[0]

        detail_data = self.api_request({
            "token_id": "1649412",
            "vod_id": vod_id,
            "mobile_time": str(int(time.time())),
            "tokename": self.token
        }, "/App/IndexPlay/playInfo")

        play_data = self.api_request({
            "vurl_cloud_id": "2",
            "vod_d_id": vod_id
        }, "/App/Resource/Vurl/show")

        vod_info = detail_data.get('vodInfo', {}) if isinstance(detail_data, dict) else {}

        play_list = []
        if isinstance(play_data, dict) and 'list' in play_data:
            episodes = []
            for index, item in enumerate(play_data['list']):
                if 'play' not in item:
                    continue
                
                resolutions = []
                params = []
                for k, v in item['play'].items():
                    if isinstance(v, dict) and 'param' in v:
                        resolutions.append(k)
                        params.append(v['param'])
                
                if params:
                    resolutions.sort(key=self.get_resolution_score, reverse=True)
                    play_name = vod_info.get('vod_name', '正片') if len(play_data['list']) == 1 else item.get('name', str(index + 1))
                    play_url = f"{params[0]}||{'@'.join(resolutions)}"
                    episodes.append(f"{play_name}${play_url}")
            
            if episodes:
                play_list.append("#".join(episodes))

        video = {
            "vod_id": array[0],
            "vod_name": vod_info.get("vod_name", ""),
            "vod_pic": vod_info.get("vod_pic", ""),
            "vod_year": vod_info.get("vod_year", ""),
            "vod_area": vod_info.get("vod_area", ""),
            "vod_actor": vod_info.get("vod_actor", ""),
            "vod_content": str(vod_info.get("vod_use_content", "")).strip(),
            "vod_play_from": "瓜子专线" if play_list else "",
            "vod_play_url": "$$$".join(play_list) if play_list else ""
        }

        return {"list": [video]}

    def searchContent(self, key, quick, pg="1"):
        data = self.api_request({
            "keywords": key,
            "order_val": "1",
            "page": str(pg)
        }, "/App/Index/findMoreVod")

        if isinstance(data, dict) and "_error" in data:
             return {"list": [], "page": int(pg), "pagecount": 0}

        list_data = []
        for item in data.get('list', []):
            name = item.get('vod_name', '')
            if key.lower() in name.lower():
                continu = item.get('vod_continu', 0)
                list_data.append({
                    "vod_id": f"{item.get('vod_id')}/{continu}",
                    "vod_name": name,
                    "vod_pic": item.get('vod_pic', ''),
                    "vod_remarks": "电影" if continu == 0 else f"更新至{continu}集"
                })

        total_page = int(data.get('totalPage', 0))
        return {
            "list": list_data,
            "page": int(pg),
            "pagecount": 1 if total_page == 0 else total_page
        }

    def playerContent(self, flag, id, vipFlags):
        parts = id.split('||')
        if len(parts) < 2:
            return {"parse": 0, "url": id, "header": {"User-Agent": "okhttp/3.12.0"}}

        param_str = parts[0]
        resolutions = parts[1].split('@')

        request_params = {}
        for pair in param_str.split('&'):
            if '=' in pair:
                k, v = pair.split('=', 1)
                if k:
                    request_params[k] = v

        if resolutions:
            resolutions.sort(key=self.get_resolution_score, reverse=True)
            request_params['resolution'] = resolutions[0]

        data = self.api_request(request_params, "/App/Resource/VurlDetail/showOne")
        
        play_url = data.get('url', '') if isinstance(data, dict) else ''

        return {
            "parse": 0,
            "url": play_url,
            "header": {"User-Agent": "okhttp/3.12.0"}
        }
