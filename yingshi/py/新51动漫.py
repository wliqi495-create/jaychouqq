# coding=utf-8
import json
import base64
import re
import time
import requests
from requests import Session
from Crypto.Cipher import AES
from Crypto.Hash import MD5
from Crypto.Util.Padding import unpad
from urllib.parse import quote, unquote
import urllib3
import sys

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
sys.path.append('..')
from base.spider import Spider

class Spider(Spider):
    def getName(self):
        return self.APP_NAME

    # =========================================================================
    # ⚙️ 万 能 模 板 配 置 区
    # =========================================================================
    def init_config(self):
        self.APP_NAME = "换皮万能模板-t4站" 
        self.MAIN_DOMAIN = "https://copbmjf.xpawro4.work/" 
        self.AES_KEY = b"JhbGciOiJIUzI1Ni"
        self.AES_IV  = b"JhbGciOiJIUzI1Ni"
        self.XOR_KEY = b"2020-zq3-888" 
        self.CH_CODE = "dafe13"
    # =========================================================================

    def md5(self, text):
        return MD5.new(text.encode('utf-8')).hexdigest()

    def get_did(self):
        did = self.getCache('did')
        if not did:
            did = self.md5(str(int(time.time())))
            self.setCache('did', did)
        return did

    def get_img_url(self, img_path, d_domain):
        if not img_path: return ""
        img_path = img_path[0] if isinstance(img_path, list) else img_path
        if not img_path.startswith("http"):
            img_path = d_domain.rstrip('/') + '/' + img_path.lstrip('/')
        return self.getProxyUrl() + f"&action=img&imgu={quote(img_path)}&ext=.jpg"

    def init(self, extend=""):
        self.init_config()
        self.session = Session()
        self.key, self.iv = self.AES_KEY, self.AES_IV
        self.domain = self.MAIN_DOMAIN
        self.img_domain = self.MAIN_DOMAIN
        
        self.m3u8_key_pat = re.compile(r'URI="[^"]+"')
        self.ts_pat = re.compile(r'^([^#\s]+)', re.MULTILINE) 
        self.xor_mask = (self.XOR_KEY * 10)[:100] 

        did = self.get_did()
        t = str(int(time.time() * 1000))
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/146.0 Mobile Safari/537.36",
            "content-type": "application/json", "accept": "application/json",
            "deviceid": did, "t": t, "s": self.md5(t[3:8])
        })

        for _ in range(2):
            try:
                res = self.session.post(f'{self.domain}api/user/traveler', json={'deviceId': did, 'tt': 'U', 'code': '', 'chCode': self.CH_CODE}, verify=False, timeout=5)
                data = res.json().get('data', {})
                if data.get('token'): 
                    self.session.headers.update({'aut': data['token']})
                    if data.get('imgDomain'): self.img_domain = data['imgDomain']
                    break
            except:
                time.sleep(0.5)

    def req(self, path, method='get', payload=None, retry=2):
        url = f"{self.domain}{path.lstrip('/')}"
        for i in range(retry):
            try:
                res = self.session.post(url, json=payload, verify=False, timeout=8) if method == 'post' else self.session.get(url, verify=False, timeout=8)
                d = res.json()
                enc = d.get("encData")
                if not enc: return None, d.get("domain", self.img_domain)
                
                decrypted = unpad(AES.new(self.key, AES.MODE_CBC, self.iv).decrypt(base64.b64decode(enc)), AES.block_size)
                return json.loads(decrypted.decode('utf-8')), d.get("domain", self.img_domain)
            except Exception:
                if i == retry - 1: return None, self.img_domain
                time.sleep(0.5)

    def _format_list(self, data_list, d_domain, id_prefix, id_key, title_key, remark_fmt):
        return [{'vod_id': f"{id_prefix}{item.get(id_key, '')}", 
                 'vod_name': item.get(title_key, '未知'), 
                 'vod_pic': self.get_img_url(item.get("coverImg"), d_domain), 
                 'vod_remarks': remark_fmt(item)} for item in data_list]

    # ================= 首页分类配置 =================
    def homeContent(self, filter):
        return {
            'class': [{'type_name': n, 'type_id': i} for n, i in [('精选', '4'), ('动漫', '2'), ('长视频', '23'), ('短视频', 'short'), ('漫画', '5'), ('文字小说', 'novel'), ('有声电台', 'audio'), ('里番', '24')]],
            'filters': {
                "4": [{"key": "station", "name": "频道", "value": [{"n":"默认","v":""},{"n":"必看动漫","v":"1"},{"n":"2026新番","v":"90"},{"n":"同人次元","v":"7"},{"n":"乱伦","v":"65"},{"n":"ASMR","v":"86"},{"n":"3D","v":"3"},{"n":"抖阴","v":"28"}]}],
                "24": [{"key": "station", "name": "年份", "value": [{"n":"全部","v":""},{"n":"2026","v":"90"},{"n":"2025","v":"63"},{"n":"2024","v":"70"},{"n":"2023","v":"71"}]}],
                "5": [{"key": "class", "name": "分类", "value": [{"n":"全部","v":""},{"n":"最新","v":"1"},{"n":"韩漫","v":"2"},{"n":"同人","v":"6"},{"n":"本子","v":"7"},{"n":"国漫","v":"11"},{"n":"3D","v":"3"}]}],
                "2": [{"key": "class", "name": "分类", "value": [{"n":"全部同人","v":"47"},{"n":"国漫","v":"50"},{"n":"3D","v":"49"},{"n":"原神","v":"55"},{"n":"番剧","v":"51"}]}],
                "23": [{"key": "class", "name": "分类", "value": [{"n":"热播","v":"53"},{"n":"乱伦","v":"27"},{"n":"国产","v":"28"},{"n":"萝莉","v":"52"},{"n":"AV","v":"57"},{"n":"传媒","v":"58"},{"n":"重口","v":"59"}]}],
                "short": [{"key": "class", "name": "分类", "value": [{"n":"推荐","v":""},{"n":"伦理","v":"42"},{"n":"泄露","v":"44"},{"n":"窥视","v":"46"},{"n":"抖音风","v":"54"}]}],
                "novel": [{"key": "class", "name": "分类", "value": [{"n":"全部","v":""},{"n":"学生妹","v":"1"},{"n":"处女","v":"2"},{"n":"偷情","v":"3"},{"n":"人妻","v":"7"},{"n":"多P","v":"8"},{"n":"乱伦","v":"11"},{"n":"强暴","v":"12"},{"n":"办公室","v":"16"}]}]
            }
        }

    # ================= 列表获取 =================
    def categoryContent(self, tid, pg, filter, extend):
        res = {'list': [], 'page': int(pg), 'pagecount': 999} 
        ext_cls = extend.get('class')
        
        if tid in ['novel', 'audio']:
            d, dom = self.req("api/fiction/base/findList", 'post', {"page": int(pg), "pageSize": 20, "tagId": int(ext_cls) if ext_cls else (29 if tid == 'audio' else None)})
            if d and "data" in d: res['list'] = self._format_list(d["data"], dom, 'audio_' if tid == 'audio' else 'novel_', 'fictionId', 'fictionTitle', lambda x: f"共 {x.get('chapterNewNum', 1)} 章")
                
        elif tid == '5':
            d, dom = self.req("api/comics/base/findList", 'post', {"page": int(pg), "pageSize": 20, "classId": int(ext_cls) if ext_cls else None})
            if d and "data" in d: res['list'] = self._format_list(d["data"], dom, 'comic_', 'comicsId', 'comicsTitle', lambda x: f"共 {x.get('chapterNewNum', 1)} 话")

        elif tid in ['2', '23', 'short']:
            path = f"api/video/list?page={pg}&pageSize=20&loadType=2" if tid == 'short' and not ext_cls else f"api/video/getByClassify?pageSize=20&page={pg}&sortType=1&classifyId={ext_cls or ('47' if tid == '2' else '53')}"
            d, dom = self.req(path)
            if d and "data" in d: res['list'] = self._format_list(d["data"], dom, 'video_', 'videoId', 'title', lambda x: f"时长: {x.get('playTime', 0)}秒")

        else:
            sid = extend.get('station', '')
            d, dom = self.req(f"api/station/getStationMore?pageSize=20&page={pg}&stationId={sid}" if sid else f"api/station/stations?pageSize=20&classifyId={tid}&page={pg}")
            if d and "data" in d:
                for item in d["data"]:
                    vlist, r_fmt = ([item], lambda x: f"时长: {x.get('playTime', 0)}秒") if sid else (item.get("videoList", []), lambda x: f"合集: {item.get('stationName', '')}")
                    res['list'].extend(self._format_list(vlist, dom, 'video_', 'videoId', 'title', r_fmt))
        return res

    # ================= 详情获取 =================
    def detailContent(self, ids):
        rid = ids[0]
        if rid.startswith(('novel_', 'audio_')):
            pfx = 'audio_' if rid.startswith('audio_') else 'novel_'
            d, dom = self.req(f"api/fiction/base/info?fictionId={rid.replace(pfx, '')}")
            if not d: return {}
            
            # 🚀 丢弃冗余的 info 传值，回归极简
            urls = [f"{ch.get('chapterTitle', '正文')}${pfx}{rid.replace(pfx, '')}_{ch.get('chapterId')}_{quote(ch.get('chapterTitle', ''))}" for ch in d.get("chapters", [])]
            return {'list': [{'vod_id': rid, 'vod_name': d.get('fictionTitle', '未知'), 'vod_pic': self.get_img_url(d.get("coverImg"), dom), 'type_name': "有声书" if pfx == 'audio_' else "小说", 'vod_content': d.get('info') or '暂无简介...', 'vod_remarks': " ".join([t.get("title", "") for t in d.get("tagList", [])]), 'vod_play_from': '全本阅读' if pfx == 'novel_' else '收听频道', 'vod_play_url': "#".join(urls)}]}

        elif rid.startswith('comic_'):
            d, dom = self.req(f"api/comics/base/info?comicsId={rid.replace('comic_', '')}")
            if not d: return {}
            urls = [f"{ch.get('chapterTitle', '正文')}$comic_{ch.get('chapterId')}" for ch in sorted(d.get("chapterList", []), key=lambda x: x.get("chapterNum", 0))]
            return {'list': [{'vod_id': rid, 'vod_name': d.get('comicsTitle', '未知'), 'vod_pic': self.get_img_url(d.get("coverImg"), dom), 'type_name': " ".join([c.get("title", "") for c in d.get("classList", [])]), 'vod_content': d.get('info') or '暂无简介...', 'vod_remarks': " ".join([t.get("title", "") for t in d.get("tagList", [])]), 'vod_play_from': '全彩漫画', 'vod_play_url': "#".join(urls)}]}
            
        else:
            d, dom = self.req(f"api/video/getVideoById?videoId={rid.replace('video_', '')}")
            if not d: return {}
            return {'list': [{'vod_id': rid, 'vod_name': d.get('title', '视频'), 'vod_pic': self.get_img_url(d.get("coverImg"), dom), 'type_name': "视频", 'vod_remarks': " ".join(d.get("tagTitles", [])), 'vod_play_from': '解密播放', 'vod_play_url': f"点击播放${rid}"}]}

    # ================= 全能搜索 =================
    def searchContent(self, key, quick, pg='1'):
        res_list = []
        for stype in [1, 2, 4]:
            d, dom = self.req(f"api/search/keyWord?pageSize=20&page={pg}&searchWord={quote(key)}&searchType={stype}", method='get')
            if not d: continue
            
            if d.get("videoList"): res_list.extend(self._format_list(d["videoList"], dom, 'video_', 'videoId', 'title', lambda x: f"时长: {x.get('playTime', 0)}秒"))
            if d.get("comicsList"): res_list.extend(self._format_list(d["comicsList"], dom, 'comic_', 'comicsId', 'comicsTitle', lambda x: "全彩漫画"))
            if d.get("fictionList"): res_list.extend(self._format_list(d["fictionList"], dom, 'novel_', 'fictionId', 'fictionTitle', lambda x: "小说/有声"))
        return {'list': res_list, 'page': int(pg)}

    # ================= 播放分发 =================
    def playerContent(self, flag, id, vipFlags):
        if id.startswith(('novel_', 'audio_')):
            p = id.split('_')
            d, _ = self.req(f"api/fiction/base/chapterInfo?fictionId={p[1]}&chapterId={p[2]}")
            if not d: return {}
            
            path = d.get("playPath", "")
            if path and any(ext in path.lower() for ext in [".mp3", ".m4a", ".m3u8"]):
                return {'parse': 0, 'url': self.getProxyUrl() + f"&action=m3u8&hd={base64.b64encode(json.dumps(dict(self.session.headers)).encode()).decode()}&url={base64.b64encode(path.encode()).decode()}", 'header': dict(self.session.headers)}
            
            txt = ""
            if path and ".txt" in path.lower():
                try:
                    raw_bytes = bytearray(requests.get(path, verify=False, timeout=8).content)
                    # 🚀 融入你的终极奥义：对前100字节进行无脑 0x61 异或解密
                    mlen = min(100, len(raw_bytes))
                    raw_bytes[:mlen] = bytes(b ^ 0x61 for b in raw_bytes[:mlen])
                    txt = raw_bytes.decode('utf-8', 'ignore').strip()
                except Exception as e: 
                    txt = f"正文下载或解密异常：{e}"
            
            # 直接返回原汁原味的正文，不需要补全拼接了！
            return {'parse': 0, 'url': f"novel://{json.dumps({'title': unquote(p[3]) if len(p) > 3 else '正文', 'content': txt or '内容为空。'}, ensure_ascii=False)}", 'header': ''}

        elif id.startswith('comic_'):
            d, dom = self.req(f"api/comics/base/chapterInfo?chapterId={id.replace('comic_', '')}")
            if not d: return {}
            return {'parse': 0, 'url': "pics://" + "&&".join([self.get_img_url(img, dom) for img in d.get("imgList", [])]), 'header': {}}
            
        else:
            d, _ = self.req(f"api/video/getVideoById?videoId={id.replace('video_', '')}")
            path = d.get("playPath", "") if d else ""
            if not path: return {}
            return {'parse': 0, 'url': self.getProxyUrl() + f"&action=m3u8&hd={base64.b64encode(json.dumps(dict(self.session.headers)).encode()).decode()}&url={base64.b64encode(path.encode()).decode()}", 'header': dict(self.session.headers)}

    # ================= 全文级正则代理 =================
    def localProxy(self, param):
        act = param.get('action')
        if act == 'm3u8':
            try:
                hd = json.loads(base64.b64decode(param['hd']).decode())
                txt = requests.get(base64.b64decode(param['url']).decode(), headers=hd, verify=False, timeout=8).text
                base = base64.b64decode(param['url']).decode().rsplit('/', 1)[0] + '/'
                
                txt = self.m3u8_key_pat.sub(f'URI="{self.getProxyUrl()}&action=key"', txt)
                txt = self.ts_pat.sub(lambda m: self.getProxyUrl() + f"&action=ts&hd={param['hd']}&url=" + base64.b64encode((base + m.group(1) if not m.group(1).startswith('http') else m.group(1)).encode()).decode(), txt)
                return [200, "application/vnd.apple.mpegurl", txt.encode('utf-8')]
            except: return [500, "text/plain", b"M3U8 Proxy Error"]

        elif act == 'ts':
            try: return [200, "video/mp2t", requests.get(base64.b64decode(param['url']).decode(), headers=json.loads(base64.b64decode(param['hd']).decode()), verify=False, timeout=12).content]
            except: return [404, "text/plain", b"TS Error"]

        elif act == 'key':
            return [200, "application/octet-stream", bytes.fromhex("c7719993cb5b81ceb148f4a205d48f05")]

        elif act == 'img':
            try:
                url = unquote(param.get('imgu', ''))
                if not url: return [404, "image/jpeg", b""]
                res = requests.get(url, headers={'User-Agent': 'Mozilla/5.0', 'Referer': self.domain}, verify=False, timeout=8)
                if res.status_code != 200 or 'text' in res.headers.get('Content-Type', ''): return [404, "image/jpeg", b""]
                
                data = bytearray(res.content)
                if not data.startswith((b'\xff\xd8', b'\x89PNG', b'GIF', b'ftyp')):
                    mlen = min(100, len(data))
                    data[:mlen] = bytes(a ^ b for a, b in zip(data[:mlen], self.xor_mask[:mlen]))
                return [200, "image/jpeg", bytes(data)]
            except: return [404, "image/jpeg", b""]
            
        return [404, "text/plain", b"Not Found"]
