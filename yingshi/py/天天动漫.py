# coding=utf-8
import re
import json
import time
import traceback
from urllib.parse import quote, urljoin, urlparse, parse_qs, urlencode, unquote
import sys
from bs4 import BeautifulSoup, Tag

sys.path.append("..")
from base.spider import Spider


class Spider(Spider):
    def __init__(self):
        self.name = "天天动漫"
        self.host = "https://www.ttdm4.me"
        self.homeUrl = self.host
        self.userAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1"
        self.headers = {
            'User-Agent': self.userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Referer': self.host,
            'Origin': self.host,
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'same-origin',
            'Sec-Fetch-User': '?1',
        }
        self.cookies = {}
        self.VIDEO_FORMATS = ['.m3u8', '.mp4', '.flv', '.mkv', '.mov', '.avi']
        self.session = None
        self.type_map = {
            "guoman": "中国动漫",
            "riman": "日本动漫",
            "oumei": "欧美动漫",
            "lifan": "里番动漫",
            "qita": "其他动漫",
            "diany": "动画电影"
        }
        self.log(f"{self.name} 初始化完成")

    def getName(self):
        return self.name

    def init(self, extend=""):
        self.log(f"{self.name} 加载成功")

    def log(self, msg, level="INFO"):
        print(f"[{level}] [{self.name}] {time.strftime('%Y-%m-%d %H:%M:%S')} - {msg}")

    def homeContent(self, filter):
        result = {}
        result['class'] = [{"type_name": name, "type_id": tid} for tid, name in self.type_map.items()]
        result['filters'] = {}
        return result

    def _extract_video_info(self, item):
        """Helper method to extract video info from a BS4 Tag."""
        if not isinstance(item, Tag):
            return None
            
        link_tag = item
        if item.name != 'a':
            link_tag = item.find_parent('a') or (item.find_parent('div') and item.find_parent('div').find_parent('a'))
        
        if not link_tag or not isinstance(link_tag, Tag):
            return None
            
        href = link_tag.get('href', '')
        title = link_tag.get('title') or link_tag.get('data-title', '')
        
        img = link_tag.find('img')
        pic = ''
        if img:
            pic = img.get('data-original') or img.get('src', '')
            if pic:
                pic = urljoin(self.host, pic)
        
        note_tag = link_tag.find('div', class_=re.compile(r'note|status'))
        note = note_tag.get_text(strip=True) if note_tag else ''
        
        match = re.search(r'/vod/(\d+)/', href)
        if not match:
            return None
            
        vod_id = match.group(1)
        
        if not title:
            title_tag = link_tag.find(['div', 'span'], class_=re.compile(r'title|name'))
            title = title_tag.get_text(strip=True) if title_tag else f"未知标题-{vod_id}"
        
        return {
            "vod_id": vod_id,
            "vod_name": title,
            "vod_pic": pic,
            "vod_remarks": note
        }

    def homeVideoContent(self):
        try:
            url = self.host
            r = self.fetch(url, headers=self.headers, cookies=self.cookies)
            if r.status_code != 200:
                self.log(f"首页请求失败: {r.status_code}", "ERROR")
                return {'list': []}

            html = r.content.decode('utf-8', errors='ignore')
            soup = BeautifulSoup(html, 'html.parser')

            video_list = []
            items = soup.find_all('a', class_=re.compile(r'module-poster-item|poster-link'))
            if not items:
                items = soup.select('a[href*="/vod/"] img[class*="lazy"], a[href*="/vod/"] img[src]')

            for item in items:
                video_info = self._extract_video_info(item)
                if video_info:
                    video_list.append(video_info)

            self.log(f"首页获取 {len(video_list)} 个推荐视频")
            return {'list': video_list}
        except Exception as e:
            self.log(f"homeVideoContent 异常: {str(e)}", "ERROR")
            return {'list': []}

    def categoryContent(self, tid, pg, filter, extend):
        result = {'list': [], 'page': int(pg or 1), 'pagecount': 10, 'limit': 40, 'total': 0}
        try:
            pg = max(int(pg or 1), 1)
            type_key = tid if tid in self.type_map else "guoman"
            url = f"{self.host}/vod-show/{type_key}--------{pg}---/"
            self.log(f"请求分类URL: {url}")

            r = self.fetch(url, headers=self.headers, cookies=self.cookies)
            if r.status_code != 200:
                self.log(f"分类请求失败: {r.status_code}, URL={url}", "ERROR")
                return result

            soup = BeautifulSoup(r.content, 'html.parser')
            items = soup.find_all('a', class_=re.compile(r'module-poster-item'))

            for item in items:
                try:
                    video_info = self._extract_video_info(item)
                    if video_info:
                        result['list'].append(video_info)
                except Exception as e:
                    continue

            pager = soup.find('ul', class_='module-page')
            if pager:
                pages = [a.get_text() for a in pager.find_all('a') if a.get_text().isdigit()]
                if pages:
                    result['pagecount'] = max(1, int(pages[-1]))

            self.log(f"分类 {tid} 第 {pg} 页获取 {len(result['list'])} 个视频, 总页数: {result['pagecount']}")
            return result
        except Exception as e:
            self.log(f"categoryContent 异常: {str(e)}", "ERROR")
            return result

    def detailContent(self, ids):
        result = {"list": []}
        if not ids:
            return result

        vod_id = ids[0]
        try:
            url = f"{self.host}/vod/{vod_id}/"
            r = self.fetch(url, headers=self.headers, cookies=self.cookies)
            if r.status_code != 200:
                self.log(f"详情页请求失败: {r.status_code}", "ERROR")
                return result

            html = r.content.decode('utf-8', errors='ignore')
            soup = BeautifulSoup(html, 'html.parser')

            title_tag = soup.find('h1') or soup.find('title')
            title = (title_tag.text.strip().replace('详情', '').strip() if title_tag else "").split('-')[0].strip()

            img = soup.find('img', class_='lazy')
            pic = urljoin(self.host, img['data-original']) if img and 'data-original' in img.attrs else ""

            desc_tag = soup.find('div', class_='module-info-introduction-content')
            desc = desc_tag.get_text(strip=True) if desc_tag else "暂无简介"

            play_from = []
            play_url = []

            tabs = soup.find_all('div', class_='module-tab-item')
            for tab in tabs:
                name = tab.get_text(strip=True)
                if name:
                    play_from.append(name)

            lists = soup.find_all('div', class_='module-play-list-content')
            for lst in lists:
                episodes = []
                for a in lst.find_all('a'):
                    ep_name = a.text.strip()
                    ep_url = a.get('href', '')
                    if not ep_url.startswith('http'):
                        ep_url = urljoin(self.host, ep_url)
                    parsed = urlparse(ep_url)
                    query = parse_qs(parsed.query)
                    query['iframe'] = ['1']
                    new_query = urlencode(query, doseq=True)
                    final_url = f"{parsed.scheme}://{parsed.netloc}{parsed.path}?{new_query}"
                    episodes.append(f"{ep_name}${final_url}")
                if episodes:
                    play_url.append("#".join(episodes))

            if not play_from:
                play_from = ["在线播放"]
            if not play_url:
                play_url = [""]

            vod = {
                "vod_id": vod_id,
                "vod_name": title,
                "vod_pic": pic,
                "vod_content": desc,
                "vod_play_from": "$$$".join(play_from),
                "vod_play_url": "$$$".join(play_url)
            }

            result["list"].append(vod)
            self.log(f"详情页解析成功: {title}")
            return result
        except Exception as e:
            self.log(f"detailContent 异常: {str(e)}", "ERROR")
            return result

    def playerContent(self, flag, id, vipFlags):
        try:
            headers = self.headers.copy()
            headers.update({
                'Referer': id,
                'Origin': self.host,
                'X-Requested-With': 'XMLHttpRequest'
            })

            self.log(f"进入播放器页面: {id}")
            response = self.fetch(id, headers=headers, cookies=self.cookies)
            if response.status_code != 200:
                return {"parse": 0, "playUrl": "", "url": "", "header": {}}

            html = response.content.decode('utf-8', errors='ignore')

            player_data_match = re.search(r'var\s+player_data\s*=\s*({.*?});', html, re.DOTALL)
            if player_data_match:
                try:
                    data_str = player_data_match.group(1)
                    player_data = json.loads(data_str)
                    encoded_url = player_data.get("url", "")
                    if not encoded_url:
                        self.log("player_data 中无 url 字段", "WARNING")
                        return self.fallbackPlayerContent(html, id, headers)

                    real_url = encoded_url
                    while True:
                        decoded = unquote(real_url)
                        if decoded == real_url:
                            break
                        real_url = decoded

                    if real_url.startswith("//"):
                        real_url = "https:" + real_url
                    elif not real_url.startswith("http"):
                        real_url = urljoin(self.host, real_url)

                    self.log(f"✅ 成功解析真实播放地址: {real_url}")
                    return {
                        "parse": 0,
                        "playUrl": "",
                        "url": real_url,
                        "header": {
                            "User-Agent": headers['User-Agent'],
                            "Referer": id,
                            "Origin": self.host
                        }
                    }
                except Exception as e:
                    self.log(f"解析 player_data 失败: {e}", "ERROR")

            return self.fallbackPlayerContent(html, id, headers)

        except Exception as e:
            self.log(f"playerContent 异常: {str(e)}", "ERROR")
            return {"parse": 0, "playUrl": "", "url": "", "header": {}}

    def fallbackPlayerContent(self, html, id, headers):
        """Fallback method for extracting playback URL."""
        self.log("启用备用播放解析")

        def safe_unquote(s):
            prev = None
            while prev != s:
                prev = s
                try:
                    s = unquote(s)
                except:
                    break
            return s.strip()

        iframe_src_match = re.search(r'<iframe[^>]+src=[\'"](.*?)[\'"]', html, re.I)
        if iframe_src_match:
            src = iframe_src_match.group(1)
            abs_src = urljoin(self.host, src)

            q = parse_qs(urlparse(abs_src).query)
            if 'url' in q:
                encoded = q['url'][0]
                real = safe_unquote(encoded)
                if real.startswith('//'):
                    real = 'https:' + real
                elif not real.startswith('http'):
                    real = urljoin(self.host, real)
                self.log(f"✅ 从 iframe url 参数提取: {real}")
                return {
                    "parse": 0,
                    "playUrl": "",
                    "url": real,
                    "header": {"Referer": id, "User-Agent": headers['User-Agent']}
                }

        media_match = re.search(
            r'https?://[^\s"<>$$\{\}]+?\.(m3u8|mp4|flv|mkv|avi|mov)(\?[^"\'>]*)?',
            html.replace('\\/', '/'), re.IGNORECASE
        )
        if media_match:
            raw = media_match.group(0)
            real = safe_unquote(raw).replace('\\', '')
            if real.startswith('//'):
                real = 'https:' + real
            elif not real.startswith('http'):
                real = urljoin(self.host, real)
            self.log(f"✅ 正则匹配到视频流: {real}")
            return {
                "parse": 0,
                "playUrl": "",
                "url": real,
                "header": {"Referer": id, "User-Agent": headers['User-Agent']}
            }

        self.log("⚠️ 所有方法均未提取到播放地址", "WARNING")
        return {"parse": 0, "playUrl": "", "url": "", "header": {}}

    def searchContent(self, key, quick=False):
        result = {"list": []}
        try:
            url = f"{self.host}/vod-search/-------------/?wd={quote(key)}"
            r = self.fetch(url, headers=self.headers, cookies=self.cookies)
            if r.status_code != 200:
                self.log(f"搜索失败: {r.status_code}", "ERROR")
                return result

            html = r.content.decode('utf-8', errors='ignore')
            soup = BeautifulSoup(html, 'html.parser')
            
            # 保存HTML用于调试
            with open("search_debug.html", "w", encoding="utf-8") as f:
                f.write(html)
            
            # 查找搜索结果项 - 修正选择器
            items = soup.find_all('div', class_='module-card-item')
            self.log(f"找到 {len(items)} 个搜索结果项")
            
            for item in items:
                try:
                    # 提取链接和ID
                    a_tag = item.find('a', class_='module-card-item-poster')
                    if not a_tag or not a_tag.get('href'):
                        continue
                        
                    href = a_tag['href']
                    match = re.search(r'/vod/(\d+)/', href)
                    if not match:
                        continue
                        
                    vod_id = match.group(1)
                    
                    # 提取标题
                    title_div = item.find('div', class_='module-card-item-title')
                    title = ""
                    if title_div:
                        strong_tag = title_div.find('strong')
                        title = strong_tag.get_text(strip=True) if strong_tag else title_div.get_text(strip=True)
                    
                    # 提取图片
                    img = a_tag.find('img')
                    pic = ''
                    if img:
                        pic = img.get('data-original') or img.get('src', '')
                        if pic and not pic.startswith('http'):
                            pic = urljoin(self.host, pic)
                    
                    # 提取备注/更新状态
                    note_div = a_tag.find('div', class_='module-item-note')
                    note = note_div.get_text(strip=True) if note_div else ''
                    
                    # 构建结果
                    video_info = {
                        "vod_id": vod_id,
                        "vod_name": title,
                        "vod_pic": pic,
                        "vod_remarks": note
                    }
                    
                    result["list"].append(video_info)
                    self.log(f"成功提取: {title} (ID: {vod_id})")
                    
                except Exception as e:
                    self.log(f"解析搜索项时出错: {str(e)}", "ERROR")
                    continue

            self.log(f"搜索关键词 '{key}' 获取 {len(result['list'])} 个结果")
            return result
            
        except Exception as e:
            self.log(f"搜索异常: {traceback.format_exc()}", "ERROR")
            return result

    def isVideoFormat(self, url):
        return any(url.lower().endswith(fmt) for fmt in self.VIDEO_FORMATS)

    def manualVideoCheck(self):
        return False

    def localProxy(self, param):
        return []
