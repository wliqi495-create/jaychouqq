# -*- coding: utf-8 -*-
import sys, json, time, uuid, hashlib, urllib3, re
from base.spider import Spider

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
sys.path.append('..')

class Spider(Spider):
    def __init__(self):
        super().__init__()
        self.host = ''
        self.appid = ''
        self.appkey = ''
        self.udid = ''
        self.bundlerId = ''
        self.source = ''
        self.version = ''
        self.versionCode = ''
        self.nextVal = {'search': {'key': '', 'value': ''}, 'category': {}}
        self.headers = {
            'User-Agent': "Dart/3.1 (dart:io)",
            'Accept-Encoding': "gzip",
            'content-type': "application/json; charset=utf-8"
        }

    def getName(self): return "AppYqk"

    def init(self, extend=""):
        try:
            ext = json.loads(extend.strip()) if isinstance(extend, str) else extend
            self.appid = ext.get('appId', '')
            self.appkey = ext.get('appkey', '')
            self.udid = ext.get('udid', '')
            self.bundlerId = ext.get('bundlerId', '')
            self.source = ext.get('source', '')
            self.version = ext.get('version', '')
            self.versionCode = ext.get('versionCode', '')
            
            hosts = ext.get('host', '')
            hosts_list = hosts.split(',')
            for i in hosts_list:
                if re.match(r'^https?://[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*(:\d+)?/?$', i):
                    self.host = i
                    break
                else:
                    try:
                        res = self.fetch(i, headers=self.headers, verify=False).json()
                        for j in res:
                            if isinstance(j, str) and j.startswith('http'):
                                self.host = j
                                break
                        if self.host: break
                    except: continue
        except Exception: pass
        return self.homeContent(False)

    def isVideoFormat(self, url): return False
    def manualVideoCheck(self): return False
    def destroy(self): pass

    def _build_payload(self, data=None):
        p = {
            "appId": self.appid,
            "bundlerId": self.bundlerId,
            "cus1tom": "cus3tom",
            "deviceInfo": "xiaomi",
            "osInfo": "15",
            "otherParam": "1",
            "patchNumber": 0,
            "requestId": str(uuid.uuid4()),
            "source": self.source,
            "udid": self.udid,
            "version": self.version,
            "versionCode": self.versionCode
        }
        if data: p.update(data)
        # 签名逻辑
        param_str = '&'.join(f"{k}={p[k]}" for k in sorted(p.keys()) if p[k] != "")
        full_str = f"{param_str}&appKey={self.appkey}"
        p["sign"] = hashlib.md5(full_str.encode('utf-8')).hexdigest()
        return json.dumps(p)

    def _post_api(self, path: str, payload_dict: dict):
        if not self.host: return None
        url = self.host.rstrip('/') + path
        try:
            body = self._build_payload(payload_dict)
            rsp = self.post(url, data=body, headers=self.headers, verify=False, timeout=15)
            if rsp.status_code != 200: return None
            obj = rsp.json()
            if isinstance(obj, dict) and obj.get('code') in [0, 200, "0"]: # 兼容不同code定义
                return obj.get('data')
            # AppYqk 结构通常直接在 data 下
            return obj.get('data') if 'data' in obj else obj
        except Exception: return None

    def homeContent(self, filter):
        data = self._post_api('/v2/api/home/header', {})
        classes = []
        if isinstance(data, dict):
            for i in data.get('channeList', []):
                classes.append({'type_id': str(i['channelId']), 'type_name': i['channelName']})
        return {'class': classes}

    def homeVideoContent(self):
        data = self._post_api('/v2/api/home/body', {})
        videos = []
        if isinstance(data, dict):
            for topic in data.get('vodTopicList', []):
                for v in topic.get('vodList', []):
                    videos.append({
                        'vod_id': str(v['vodId']),
                        'vod_name': v['vodName'],
                        'vod_pic': v['coverImg'],
                        'vod_remarks': v.get('remark') or f"评分：{v.get('score')}"
                    })
        return {'list': videos}

    def categoryContent(self, tid, pg, filter, extend):
        page = int(pg)
        if str(tid).startswith('actor@'):
            worker_id = tid.split('actor@', 1)[1]
            data = self._post_api('/v1/api/vodWorker/detail', {'vodWorkerId': worker_id})
            path_key = 'vodList'
        else:
            cache_val = self.nextVal['category'].get(str(tid), '')
            if page != 1 and not cache_val: return {'list': [], 'page': page}
            data = self._post_api('/v1/api/search/queryNow', {
                'nextCount': 18,
                'nextVal': cache_val if page > 1 else '',
                'queryValueJson': '[{"filerName":"channelId","filerValue":' + str(tid) + '}]',
                'sortType': ''
            })
            path_key = 'items'

        videos = []
        if isinstance(data, dict):
            # 更新翻页标记
            self.nextVal['category'][str(tid)] = data.get('nextVal', '') if data.get('hasNext') == 1 else ''
            
            for i in data.get(path_key, data.get('vodList', [])):
                videos.append({
                    'vod_id': str(i['vodId']),
                    'vod_name': i['vodName'],
                    'vod_pic': i['coverImg'],
                    'vod_remarks': i.get('remark') or f"评分：{i.get('score')}"
                })
        return {'list': videos, 'page': page}

    def detailContent(self, ids):
        vid = ids[0]
        data = self._post_api('/v2/api/vodInfo/index', {'vodId': vid})
        if not data: return {'list': []}
        
        play_from, play_urls = [], []
        for p in data.get('playerList', []):
            play_from.append(p['playerName'])
            urls = [f"{ep['epName']}${ep['epId']}" for ep in p.get('epList', [])]
            play_urls.append('#'.join(urls))
            
        vod = {
            'vod_id': str(data['vodId']),
            'vod_name': data['vodName'],
            'vod_pic': data['coverImg'],
            'vod_year': data.get('year'),
            'vod_area': data.get('areaName'),
            'vod_actor': self._format_actor(data.get('actorList', [])),
            'vod_director': self._format_actor(data.get('directorList', [])),
            'vod_content': data.get('intro'),
            'vod_play_from': '$$$'.join(play_from),
            'vod_play_url': '$$$'.join(play_urls)
        }
        return {'list': [vod]}

    def searchContent(self, key, quick, pg="1"):
        if int(pg) != 1: return {'list': []}
        data = self._post_api('/v1/api/search/search', {"keyword": key, "nextVal": ""})
        videos = []
        if isinstance(data, dict):
            for i in data.get('items', []):
                videos.append({
                    'vod_id': str(i['vodId']),
                    'vod_name': i['vodName'],
                    'vod_pic': i['coverImg'],
                    'vod_remarks': i.get('remark')
                })
        return {'list': videos}

    def playerContent(self, flag, id, vipFlags):
        # 获取剧集详情
        ep_data = self._post_api('/v2/api/vodInfo/epDetail', {'vodEpId': id})
        urls = []
        if isinstance(ep_data, list):
            for res in ep_data:
                name = res.get('showName')
                val = res.get('vodResolution')
                if name and val:
                    p_data = self._post_api('/v2/api/vodInfo/playUrl', {'epId': id, 'vodResolution': val})
                    p_url = p_data.get('playUrl') if isinstance(p_data, dict) else None
                    if p_url and str(p_url).startswith('http'):
                        urls.extend([name, p_url])
        
        return {'parse': 0, 'url': urls, 'header': {'User-Agent': 'ExoPlayer'}}

    def _format_actor(self, data):
        out = []
        for i in data:
            if isinstance(i, dict) and i.get('vodWorkerName'):
                name = i['vodWorkerName']
                if i.get('vodWorkerId'):
                    out.append(f'[a=cr:{{"id":"actor@{i["vodWorkerId"]}","name":"{name}"}}/]{name}[/a]')
                else:
                    out.append(name)
        return ', '.join(out)

    def localProxy(self, param): return None
