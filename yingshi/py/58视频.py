# -*- coding: utf-8 -*-
# 本资源来源于互联网公开渠道，仅可用于个人学习爬虫技术。
# 严禁将其用于任何商业用途，下载后请于 24 小时内删除，搜索结果均来自源站，本人不承担任何责任。

from Crypto.Cipher import AES
from base.spider import Spider
import re,sys,json,base64,requests
from Crypto.Util.Padding import unpad
from urllib.parse import quote, unquote, urljoin
sys.path.append('..')

class Spider(Spider):
    headers = {
        'User-Agent': "Mozilla/5.0 (Linux; Android 12; SM-S9080 Build/V417IR; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/101.0.4951.61 Safari/537.36 uni-app Html5Plus/1.0 (Immersed/0.6666667)",
        'Connection': "Keep-Alive",
        'Accept-Encoding': "gzip",
        'Version': "1.3.26",
        'Token': ""
    }
    play_headers = {'User-Agent': 'io.dcloud.application.DCloudApplication/1.3.26 (Linux;Android 12)'}
    host, datakey, dataiv, deviceid, home_class, block_id,bn = '', '', '', '', '',[],b'\xe6\x83\x85\xe8\x89\xb2'

    def init(self, extend=""):
        try:
            config = json.loads(extend)
        except (json.JSONDecodeError, TypeError):
            config = {}
        self.host = config.get("host", "https://58api.zggggs.com")
        self.datakey = config.get("datakey", "58928cae68092afc")
        self.dataiv = config.get("dataiv", "e9d732a1edcdcc0a")
        self.deviceid = config.get("deviceid", "d60ddbcd469741f68e2755dca38f5171")
        payload = {
            'UserId': "0",
            'device_id': self.host
        }
        response = self.post(f'{self.host}/addons/appto/app.php/tindex/home_config2', data=payload, headers=self.headers).json()
        data = self.decrypt(response['data'])
        data2 = json.loads(data)
        block_id = []
        for i in data2['viphome']:
            block_id.append(i['id'])
        self.block_id = block_id
        self.home_class = data2['home']

    def homeContent(self, filter):
        home_class = self.home_class
        classes = []
        for i in home_class:
            if i['id'] == 0:
                continue
            classes.append({'type_id':i['id'],'type_name':i['title']})
        return {'class': classes}

    def homeVideoContent(self):
        payload = {
            'UserId': "0",
            'device_id': self.deviceid,
            'Id': "0",
            'Type': "1",
            'Page': "1",
            'Limit': "10"
        }
        response = self.post(f'{self.host}/addons/appto/app.php/tindex/home_vod_list2', data=payload, headers=self.headers).json()
        data = self.decrypt(response['data'])
        data2 = json.loads(data)
        vods = []
        for i in data2['sections']:
            vods.extend(i['vods'])
        vods.extend(data2['vods'])
        videos = []
        for i in vods:
            if i['type_id'] in self.block_id or i['group_id'] != 0 or self.bn.decode('utf-8') in i['vod_class']:
                continue
            vod_pic = i.get('vod_pic')
            if vod_pic.startswith('mac://'):
                vod_pic = vod_pic.replace('mac://', 'https://', 1)
            videos.append({
                    'vod_id': i.get('vod_id'),
                    'vod_name': i.get('vod_name'),
                    'vod_class': i.get('vod_class'),
                    'vod_pic': vod_pic,
                    'vod_remarks': i.get('vod_remarks'),
                    'vod_score': i.get('vod_score')
                })
        return {'list': videos}

    def detailContent(self, ids):
        payload = {
            'UserId': "0",
            'device_id': self.deviceid,
            'id': ids
        }
        data = self.post(f"{self.host}/addons/appto/app.php/tindex/page_player", data=payload, headers=self.headers).json()
        data2 = self.decrypt(data['data'])
        data3 = json.loads(data2)
        if data3['type_id'] in self.block_id:
            return {'list': []}
        if not data3['group_id'] == 0:
            return {'list': []}
        videos = [{
            'vod_id': data3.get('vod_id'),
            'vod_name': data3.get('vod_name'),
            'vod_content': data3.get('vod_blurb'),
            'vod_remarks': data3.get('vod_serial'),
            'vod_year': data3.get('vod_year'),
            'vod_area': data3.get('vod_area'),
            'vod_play_from': '58视频',
            'vod_play_url': data3['vod_play_url']
        }]
        return {'list': videos}

    def searchContent(self, key, quick, pg="1"):
        url = f"{self.host}/addons/appto/app.php/tindex/search_film"
        videos = []
        type_list = {'film','short'}
        for search_type in type_list:
            payload = {
                'UserId': "0",
                'device_id': self.deviceid,
                'Search': key,
                'type': search_type,
                'Page': pg,
                'Limit': "10"
            }
            response = self.post(url, data=payload, headers=self.headers).json()
            data = self.decrypt(response['data'])
            vods =json.loads(data)['vods']
            for i in vods['list']:
                if i['type_id'] in self.block_id or self.bn.decode('utf-8') in i['vod_class'] or b'\xe4\xbc\x9a\xe5\x91\x98'.decode('utf-8') in i['vod_type_name']:
                    continue
                vod_pic = i['vod_pic']
                if vod_pic.startswith('mac://'):
                    vod_pic = vod_pic.replace('mac://', 'https://', 1)
                video = {
                    "vod_id": i['vod_id'],
                    "vod_name": i['vod_name'],
                    "vod_class": i['vod_class'],
                    "vod_pic": vod_pic,
                    "vod_remarks": i['vod_remarks']
                }
                videos.append(video)

        return {'list': videos, 'page': pg, 'limit': vods['limit'], 'total': vods['total']}

    def categoryContent(self, tid, pg, filter, extend):
        payload = {
            'UserId': "0",
            'device_id': self.host,
            'Id': tid,
            'Type': "1",
            'Page': pg,
            'Limit': "10"
        }
        response = self.post(f'{self.host}/addons/appto/app.php/tindex/home_vod_list2', data=payload,headers=self.headers).json()
        data = self.decrypt(response['data'])
        data2 = json.loads(data)
        videos = []
        for i in data2['vods']:
            if 'payload' in i or 'banner' in i['vod_class']:
                continue
            vod_pic = i.get('vod_pic')
            if vod_pic.startswith('mac://'):
                vod_pic = vod_pic.replace('mac://', 'https://', 1)
            videos.append({
                'vod_id': i.get('vod_id'),
                'vod_name': i.get('vod_name'),
                'vod_class': i.get('vod_class'),
                'vod_pic': vod_pic,
                'vod_score':i.get('vod_score'),
                'vod_remarks': i.get('vod_remarks')
                })
        return {'list': videos}

    def playerContent(self, flag, id, vipFlags):
        if '.m3u8' in id:
            url = f'http://127.0.0.1:9978/proxy?do=py&type=58sp&url={quote(id)}'
        return {'jx': 0, 'playUrl': '', 'parse': 0, 'url': url,'header': self.play_headers}

    def proxy58sp(self, params):
        url = unquote(params['url'])
        data = self.modify_m3u8(url)
        return [200, "application/vnd.apple.mpegurl", data]

    def decrypt(self,ciphertext):
        try:
            ciphertext = base64.b64decode(ciphertext)
            key_bytes = self.datakey.encode('utf-8')
            iv_bytes = self.dataiv.encode('utf-8')
            cipher = AES.new(key_bytes, AES.MODE_CBC, iv_bytes)
            decrypted_data = unpad(cipher.decrypt(ciphertext), AES.block_size)
            return decrypted_data.decode('utf-8')
        except Exception as e:
            return None

    def modify_m3u8(self, url, retries=3, timeout=10):
        current_url = url
        while True:
            try:
                for attempt in range(retries):
                    try:
                        response = requests.get(current_url, timeout=timeout,headers=self.play_headers)
                        response.raise_for_status()
                        content = response.text
                        break
                    except (requests.RequestException, ValueError) as e:
                        if attempt == retries - 1:
                            raise Exception(f"请求失败: {str(e)}")
                base_url = current_url.rsplit('/', 1)[0] + '/'
                lines = content.strip().split('\n')
                is_master_playlist = any(line.startswith('#EXT-X-STREAM-INF:') for line in lines)
                if is_master_playlist:
                    highest_bandwidth = 0
                    best_playlist_url = None
                    bandwidth_regex = re.compile(r'BANDWIDTH=(\d+)')
                    for i, line in enumerate(lines):
                        if line.startswith('#EXT-X-STREAM-INF:'):
                            match = bandwidth_regex.search(line)
                            if match:
                                bandwidth = int(match.group(1))
                                if i + 1 < len(lines) and not lines[i + 1].startswith('#'):
                                    playlist_url = lines[i + 1].strip()
                                    if not playlist_url.startswith(('http:', 'https:')):
                                        playlist_url = urljoin(base_url, playlist_url)
                                    if bandwidth > highest_bandwidth:
                                        highest_bandwidth = bandwidth
                                        best_playlist_url = playlist_url
                    if best_playlist_url:
                        current_url = best_playlist_url
                        continue
                    else:
                        raise Exception("未找到有效的子播放列表")
                key_regex = re.compile(r'#EXT-X-KEY:(.*)URI="([^"]+)"(.*)')
                segment_regex = re.compile(r'#EXTINF:([\d.]+),')
                m3u8_output = []
                first_segment_index = -1
                segment_durations = []
                segment_indices = []
                for i, line in enumerate(lines):
                    if line.startswith('#EXTINF:'):
                        match = segment_regex.search(line)
                        if match:
                            duration = float(match.group(1))
                            segment_durations.append(duration)
                            segment_indices.append(i)
                modified_remove_start_indices = []
                if len(segment_durations) >= 2:
                    second_duration_str = "{0:.3f}".format(segment_durations[1])
                    if second_duration_str.endswith('67'):
                        modified_remove_start_indices = segment_indices[:2]
                    elif len(segment_durations) >= 3:
                        third_duration_str = "{0:.3f}".format(segment_durations[2])
                        if third_duration_str.endswith('67'):
                            modified_remove_start_indices = segment_indices[:3]
                lines_to_remove = set()
                for seg_idx in modified_remove_start_indices:
                    lines_to_remove.add(seg_idx)
                    if seg_idx + 1 < len(lines):
                        lines_to_remove.add(seg_idx + 1)
                for i, line in enumerate(lines):
                    line = line.strip()
                    if not line:
                        continue
                    if line.startswith('#EXT-X-KEY:'):
                        match = key_regex.search(line)
                        if match:
                            prefix = match.group(1)
                            key_url = match.group(2)
                            suffix = match.group(3)
                            if not key_url.startswith(('http:', 'https:')):
                                key_url = urljoin(base_url, key_url)
                            updated_key_line = f'#EXT-X-KEY:{prefix}URI="{key_url}"{suffix}'
                            m3u8_output.append(updated_key_line)
                            continue
                    if i in lines_to_remove:
                        continue
                    if not line.startswith('#') and i > first_segment_index:
                        segment_url = line
                        if not segment_url.startswith(('http:', 'https:')):
                            segment_url = urljoin(base_url, segment_url)
                        m3u8_output.append(segment_url)
                    else:
                        m3u8_output.append(line)
                    if first_segment_index == -1 and line.startswith('#EXTINF:'):
                        first_segment_index = i
                if not any(not line.startswith('#') for line in m3u8_output):
                    raise Exception("未找到TS片段")
                if not m3u8_output or not m3u8_output[0].startswith('#EXTM3U'):
                    m3u8_output.insert(0, '#EXTM3U')
                return '\n'.join(m3u8_output)
            except Exception as e:
                return f"#EXTM3U\n#EXT-X-ERROR:{str(e)}"

    def localProxy(self, params):
        if params['type'] == "58sp":
            return self.proxy58sp(params)
        return None

    def getName(self):
        pass

    def isVideoFormat(self, url):
        pass

    def manualVideoCheck(self):
        pass

    def destroy(self):
        pass
