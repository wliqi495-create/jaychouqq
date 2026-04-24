import sys
import re
import json
import requests
from urllib.parse import unquote, urljoin, quote
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from base.spider import Spider

requests.packages.urllib3.disable_warnings()

class Spider(Spider):
    def getName(self):
        return "PPNIX影视"

    def init(self, extend=""):
        super().init(extend)
        self.site_url = "https://www.ppnix.com"
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            "Referer": self.site_url
        }
        self.sess = requests.Session()
        self.sess.verify = False

    def fetch(self, url, headers=None):
        try:
            h = headers or self.headers
            resp = self.sess.get(url, headers=h, timeout=15)
            resp.encoding = 'utf-8'
            return resp.text if resp.status_code == 200 else ""
        except Exception as e:
            return ""

    def homeContent(self, filter):
        return {"class": [
            {"type_name": "电影", "type_id": "cn/movie"},
            {"type_name": "电视剧", "type_id": "cn/tv"}
        ]}

    def homeVideoContent(self):
        html = self.fetch(self.site_url + "/cn/")
        return {"list": self.parse_list(html)}

    def categoryContent(self, tid, pg, filter, extend):
        if int(pg) <= 1:
            url = f"{self.site_url}/{tid}/"
        else:
            url = f"{self.site_url}/{tid}/page/{pg}.html"
        html = self.fetch(url)
        return {
            "list": self.parse_list(html),
            "page": pg,
            "pagecount": 100,
            "limit": 20
        }

    def detailContent(self, ids):
        vod_id = ids[0]
        html = self.fetch(self.site_url + vod_id)
        if not html:
            return {"list": []}
        
        # 1. 提取标题
        title_match = re.search(r'<h1[^>]*>([^<]+)', html)
        title = title_match.group(1).strip() if title_match else "未知"
        title = re.sub(r'\s*\(?\d{4}\)?.*', '', title).strip()
        
        # 2. 提取图片
        pic_match = re.search(r'<header[^>]*>.*?<img[^>]+src=["\']([^"\']+)["\']', html, re.S)
        pic = pic_match.group(1) if pic_match else ""
        if pic.startswith('//'): pic = 'https:' + pic
        
        # 3. 提取简介
        desc_match = re.search(r'简介：\s*<span>(.*?)</span>', html, re.S)
        desc = desc_match.group(1).strip() if desc_match else ""
        
        # 4. 提取 classid 和 infoid
        classid_match = re.search(r'classid\s*=\s*(\d+)', html)
        infoid_match = re.search(r'infoid\s*=\s*(\d+)', html)
        
        classid = classid_match.group(1) if classid_match else "1"
        infoid = infoid_match.group(1) if infoid_match else ""
        
        if not infoid:
            id_nums = re.findall(r'\d+', vod_id)
            infoid = id_nums[-1] if id_nums else ""
        
        # 5. 判断类型并生成播放链接
        is_movie = '/movie/' in vod_id
        lang_path = "/cn" if "/cn/" in vod_id else ""
        
        # 提取 m3u8 数组（画质选项）
        m3u8_match = re.search(r'm3u8\s*=\s*(\[[^\]]+\])', html)
        play_list = []
        
        if m3u8_match:
            try:
                m3u8_data = eval(m3u8_match.group(1))
                if isinstance(m3u8_data, list):
                    if len(m3u8_data) > 1 or not is_movie:
                        # 多集电视剧
                        for i, quality in enumerate(m3u8_data, 1):
                            ep_name = f"第{i}集" if not is_movie else f"{quality}版"
                            play_list.append(f"{ep_name}${lang_path}/play/{infoid}-{classid}-{i}.html")
                    else:
                        # 单集电影
                        play_list.append(f"正片${lang_path}/play/{infoid}-{classid}-1.html")
            except:
                play_list.append(f"正片${lang_path}/play/{infoid}-{classid}-1.html")
        else:
            play_list.append(f"正片${lang_path}/play/{infoid}-{classid}-1.html")
        
        play_url = "#".join(play_list) if play_list else ""
        
        return {"list": [{
            "vod_id": vod_id,
            "vod_name": title,
            "vod_pic": pic,
            "vod_content": desc,
            "vod_play_from": "PPNIX",
            "vod_play_url": play_url
        }]}

    def playerContent(self, flag, id, vipFlags):
        """
        获取播放地址
        id格式: /cn/play/6276-1-1.html
        其中: infoid=6276, classid=1, episode=1
        """
        # 1. 解析参数
        match = re.search(r'/(\d+)-(\d+)-(\d+)', id)
        if not match:
            return {"parse": 1, "url": self.site_url + id if id.startswith('/') else id}

        infoid = match.group(1)
        classid = match.group(2)
        episode = match.group(3)
        
        # 2. 构造请求头
        player_headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            "Referer": self.site_url + id,
            "Origin": self.site_url,
            "X-Requested-With": "XMLHttpRequest",
            "Connection": "keep-alive"
        }
        
        # 3. 尝试API接口获取真实播放地址
        api_url = f"https://www.ppnix.com/index.php/api/player?type={classid}&id={infoid}&ep={episode}"
        
        try:
            print(f"🎬 请求API: {api_url}")
            resp = self.sess.get(api_url, headers=player_headers, timeout=10)
            
            if resp.status_code == 200:
                content = resp.text.strip()
                print(f"📦 API返回: {content[:200] if content else '空'}")
                
                # 检查是否是m3u8内容
                if content and '#EXTM3U' in content:
                    print(f"✅ 直接获取到m3u8: {api_url}")
                    return {"parse": 0, "url": api_url, "header": player_headers}
                
                # 检查是否是JSON
                if content.startswith('{') or content.startswith('['):
                    try:
                        data = json.loads(content)
                        # 提取视频URL
                        video_url = None
                        if isinstance(data, dict):
                            if 'url' in data and data['url']:
                                video_url = data['url']
                            elif 'data' in data and isinstance(data['data'], dict) and 'url' in data['data']:
                                video_url = data['data']['url']
                            elif 'video' in data and data['video']:
                                video_url = data['video']
                        
                        if video_url:
                            print(f"✅ 从JSON提取到视频地址: {video_url}")
                            return {"parse": 0, "url": video_url, "header": player_headers}
                    except json.JSONDecodeError:
                        pass
        except Exception as e:
            print(f"⚠️ API请求异常: {e}")
        
        # 4. 尝试备用API（info/m3u8接口）
        backup_apis = [
            f"https://www.ppnix.com/info/m3u8/{infoid}/{episode}.m3u8",
            f"https://www.ppnix.com/info/m3u8/{infoid}/1080P.m3u8",
            f"https://www.ppnix.com/m3u8/{infoid}/{episode}.m3u8",
        ]
        
        for api in backup_apis:
            try:
                resp = self.sess.get(api, headers=player_headers, timeout=8)
                if resp.status_code == 200 and resp.text and '#EXTM3U' in resp.text:
                    print(f"✅ 从备用API获取到m3u8: {api}")
                    return {"parse": 0, "url": api, "header": player_headers}
            except:
                continue
        
        # 5. 尝试从播放页源码提取
        play_page_url = self.site_url + id
        print(f"🔄 尝试从播放页提取: {play_page_url}")
        play_html = self.fetch(play_page_url, headers=self.headers)
        
        if play_html:
            # 查找video标签或配置中的url
            patterns = [
                r'<video[^>]+src=["\']([^"\']+\.m3u8[^"\']*)["\']',
                r'source\s+src=["\']([^"\']+\.m3u8[^"\']*)["\']',
                r'file:\s*["\']([^"\']+\.m3u8[^"\']*)["\']',
                r'url:\s*["\']([^"\']+\.m3u8[^"\']*)["\']',
                r'data-video-url=["\']([^"\']+\.m3u8[^"\']*)["\']',
                r'(https?://[^\s\'"<>]+\.m3u8[^\s\'"<>]*)',
            ]
            
            for pattern in patterns:
                matches = re.findall(pattern, play_html, re.I)
                for match_url in matches:
                    if match_url and (match_url.endswith('.m3u8') or '.m3u8?' in match_url):
                        if match_url.startswith('//'):
                            match_url = 'https:' + match_url
                        elif match_url.startswith('/'):
                            match_url = self.site_url + match_url
                        print(f"✅ 从HTML提取到m3u8: {match_url}")
                        return {"parse": 0, "url": match_url, "header": player_headers}
        
        # 6. 最后的fallback - 返回播放页让外部解析器处理
        print(f"❌ 所有方法失败，返回播放页: {play_page_url}")
        return {"parse": 1, "url": play_page_url}

    def parse_list(self, html):
        video_list = []
        if not html: 
            return video_list
        
        # 兼容多种列表布局
        patterns = [
            r'<li><a href="([^"]+)" class="thumbnail".*?><img.*?src="([^"]+)".*?alt="([^"]+)"',
            r'<li>.*?<a href="([^"]+)".*?<img[^>]+src="([^"]+)".*?alt="([^"]+)"',
        ]
        
        for pattern in patterns:
            matches = re.finditer(pattern, html, re.S)
            for m in matches:
                vod_id = m.group(1)
                pic = m.group(2)
                name = m.group(3).strip()
                
                if not vod_id or not name:
                    continue
                
                if pic.startswith('//'): 
                    pic = 'https:' + pic
                elif pic.startswith('/'): 
                    pic = self.site_url + pic
                
                video_list.append({
                    "vod_id": vod_id,
                    "vod_name": name,
                    "vod_pic": pic,
                    "vod_remarks": ""
                })
            
            if video_list:
                break
        
        return video_list

    def searchContent(self, key, quick, pg=1):
        url = f"{self.site_url}/cn/index.php/vodsearch/wd/{quote(key)}.html"
        if int(pg) > 1:
            url = f"{self.site_url}/cn/index.php/vodsearch/wd/{quote(key)}/page/{pg}.html"
        html = self.fetch(url)
        return {"list": self.parse_list(html)}