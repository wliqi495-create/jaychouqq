# coding=utf-8
import json
import base64
from requests import Session
from Crypto.Cipher import AES
from Crypto.Util.Padding import unpad
import sys
from urllib.parse import urlparse, parse_qs

sys.path.append('..')
from base.spider import Spider

class Spider(Spider):
    def getName(self):
        return "小精灵3"

    def init(self, extend=""):
        self.session = Session()
        self.base_url = "http://randomapi06.sexladyya.top//xiaojingling/sort/xjl1.php"
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'http://randomapi06.sexladyya.top/'
        }

    def fetch_data(self, url):
        try:
            res = self.session.get(url, headers=self.headers, timeout=10, verify=False)
            res.encoding = 'utf-8'
            return res.json()
        except: return {}

    def homeContent(self, filter):
        result = {'class': [], 'filters': {}}
        data = self.fetch_data(f"{self.base_url}?getsort")
        if not data or data.get('code') != 'ok': return result
        
        for cate in data.get('categories', []):
            result['class'].append({
                'type_name': cate['title'],
                'type_id': cate['id']
            })
        return result

    def categoryContent(self, tid, pg, filter, extend):
        result = {'list': []}
        url = f"{self.base_url}?sort={tid}&page={pg}"
        data = self.fetch_data(url)
        
        items = data.get('videos', [])
        if not items and isinstance(data, list): items = data

        for item in items:
            name = item.get('title', '精彩视频')
            raw_pic = item.get('image', '').strip()
            
            # 统统交给本地代理处理（解密+翻墙）
            if raw_pic:
                proxy_pic = self.getProxyUrl() + "&url=" + base64.b64encode(raw_pic.encode('utf-8')).decode('utf-8')
            else:
                proxy_pic = "https://img.icons8.com/clouds/200/video.png"

            # 【核心修复】：视频地址 Base64 解码
            play_url = item.get('id', '') or item.get('vid', '')
            if play_url and not play_url.startswith('http'):
                try:
                    # 尝试将加密的串解开
                    decoded_url = base64.b64decode(play_url).decode('utf-8')
                    if decoded_url.startswith('http'):
                        play_url = decoded_url
                except:
                    pass
            
            result['list'].append({
                'vod_id': f"{play_url}$$${name}",
                'vod_name': name,
                'vod_pic': proxy_pic,
                'vod_remarks': item.get('duration', '')
            })
        return result

    def detailContent(self, ids):
        parts = ids[0].split('$$$')
        play_url = parts[0].strip()
        vname = parts[1].strip() if len(parts) > 1 else "视频播放"
        
        # 兼容处理多线路和死链域名
        if play_url:
            play_url = play_url.replace('120play.', 'long.')
            
        vod = {
            'vod_id': play_url,
            'vod_name': vname,
            'vod_play_from': '精灵云播',
            'vod_play_url': f"点击播放${play_url}" if play_url else "提示$解析失败#isVideo=false#"
        }
        return {'list': [vod]}

    def playerContent(self, flag, id, vipFlags):
        return {
            'parse': 0, 
            'url': id,
            'header': {
                'User-Agent': self.headers['User-Agent']
            }
        }

    # 图片 AES 解密算法
    def decrypt_image(self, content):
        try:
            key, iv = b"f5d965df75336270", b"97b60394abc2fbe1"
            cipher = AES.new(key, AES.MODE_CBC, iv)
            return unpad(cipher.decrypt(content), AES.block_size)
        except:
            return content

    def localProxy(self, param):
        encoded_url = param.get('url', '')
        if not encoded_url: return [404, "text/plain", b""]
        try:
            target_url = base64.b64decode(encoded_url).decode('utf-8')
            headers = {
                'User-Agent': self.headers['User-Agent'],
                'Referer': self.headers['Referer']
            }
            
            # 第一层：请求官方给的链接，然后强制 AES 解密
            res = self.session.get(target_url, headers=headers, timeout=8, verify=False)
            content = self.decrypt_image(res.content)
            
            if len(content) > 1000:
                return [200, "image/jpeg", content]
                
            # 第二层：如果官方链接是一层代理并失效了，提取直链重试
            if "url=" in target_url:
                query = parse_qs(urlparse(target_url).query)
                direct_url = query.get('url', [''])[0]
                if direct_url:
                    res = self.session.get(direct_url, headers=headers, timeout=5, verify=False)
                    content = self.decrypt_image(res.content)
                    if len(content) > 1000:
                        return [200, "image/jpeg", content]

            return [404, "text/plain", b""]
        except:
            return [500, "text/plain", b""]

    def searchContent(self, key, quick, pg="1"): return {'list': []}
    def isVideoFormat(self, url): pass
    def manualVideoCheck(self): pass
    def destroy(self): pass
