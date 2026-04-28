import sys
import re
import requests
from bs4 import BeautifulSoup
from base.spider import Spider
from urllib.parse import urljoin
from urllib3 import disable_warnings

disable_warnings()

class Spider(Spider):
    host = "https://www.coolinet.net"

    def getName(self):
        return "酷爱网"

    def init(self, extend=""):
        # 初始化 Session 以保持 Referer 等 Header 属性
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
            'Referer': self.host
        })

    def homeContent(self, filter):
        # 对应原脚本的 self.categories
        classes = [
            {"type_id": "chinese-subtitle", "type_name": "中文字幕"},
            {"type_id": "asia-video", "type_name": "亚洲视频"},
            {"type_id": "eu-us-movie", "type_name": "欧美电影"},
            {"type_id": "%e4%ba%9e%e6%b4%b2%e8%87%aa%e6%8b%8d%e5%81%b7%e6%8b%8d", "type_name": "亚洲自拍"},
            {"type_id": "eu-us-self", "type_name": "欧美自拍"}
        ]
        return {"class": classes}

    def categoryContent(self, tid, pg, filter, extend):
        curr_pg = int(pg)
        if curr_pg == 1:
            url = f"{self.host}/category/{tid}/"
        else:
            url = f"{self.host}/category/{tid}/page/{curr_pg}/"

        res = self.session.get(url, timeout=15)
        res.encoding = 'utf-8'
        html = res.text
        soup = BeautifulSoup(html, 'html.parser')
        
        items = soup.select('.videoPost')
        vod_list = []
        for node in items:
            a = node.select_one('a.videoLink')
            if not a: continue
            img = node.select_one('img')
            views = node.select_one('.thumbViews')
            
            vod_list.append({
                "vod_id": a.get('href'),
                "vod_name": a.get('title', '').strip(),
                "vod_pic": img.get('src') if img else "",
                "vod_remarks": views.text.strip() if views else ""
            })

        # 诱导翻页：如果当前页有数据且看起来没到末尾（通常 20 条以上），则允许加载下一页
        last_page = curr_pg + 1 if len(vod_list) >= 12 else curr_pg
        
        return {
            "page": curr_pg,
            "pagecount": last_page,
            "limit": len(vod_list),
            "total": 999,
            "list": vod_list
        }

    def detailContent(self, ids):
        detail_url = ids[0]
        if not detail_url.startswith('http'):
            detail_url = urljoin(self.host, detail_url)

        res = self.session.get(detail_url, timeout=15)
        res.encoding = 'utf-8'
        html = res.text
        soup = BeautifulSoup(html, 'html.parser')

        # 1. 提取基本信息
        name = soup.select_one('h1').get_text(strip=True) if soup.select_one('h1') else "未知"
        pic = soup.select_one('.video-poster img').get('src') if soup.select_one('.video-poster img') else ""

        # 2. 定位 iframe 播放器
        # 对应你提供的: <iframe id="allmyplayer" src="//player.yocoolnet.in/...">
        iframe = soup.select_one('iframe#allmyplayer') or soup.select_one('iframe[src*="yocoolnet"]')
        
        play_urls = []
        
        if iframe:
            iframe_src = iframe.get('src')
            if iframe_src.startswith('//'):
                iframe_src = 'https:' + iframe_src
            
            # 关键：带上 Referer 请求 iframe 页面内容
            try:
                # 模拟浏览器访问播放器接口
                if_headers = {
                    'Referer': detail_url,
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36'
                }
                if_res = self.session.get(iframe_src, headers=if_headers, timeout=10)
                if_html = if_res.text
                
                # 在 iframe 源码中通过正则提取 m3u8/mp4
                # 优先匹配 script 中的地址
                video_links = re.findall(r'(https?://[^\s"\'<>\]]+\.(?:m3u8|mp4)[^\s"\'<>\]]*)', if_html)
                
                if video_links:
                    # 过滤并去重
                    for link in video_links:
                        clean_link = re.sub(r'["\'\s\\,;].*$', '', link)
                        play_urls.append(f"内置播放器${clean_link}")
                else:
                    # 如果代码层面解析不到直链，则把 iframe 传给壳子开启嗅探
                    play_urls.append(f"外部嗅探${iframe_src}")
                    
            except Exception as e:
                # 异常处理： fallback 到嗅探模式
                play_urls.append(f"解析出错嗅探${iframe_src}")

        # 3. 兜底逻辑：如果 iframe 没找到，尝试在全页搜一遍链接
        if not play_urls:
            raw_links = self._extract_links(soup, detail_url)
            play_urls = [f"备用线路${l}" for l in raw_links]

        vod = {
            "vod_id": detail_url,
            "vod_name": name,
            "vod_pic": pic,
            "vod_play_from": "酷爱专线",
            "vod_play_url": "#".join(play_urls),
            "vod_content": "该资源需通过 iframe 协议解析。"
        }
        return {"list": [vod]}

    def _extract_links(self, soup, referer_url):
        """内部辅助：从 HTML 中通过正则和标签提取视频地址"""
        links = set()
        # 标签提取
        for tag in soup.select('video source[src], video[src], source[type*="mpegurl"], source[type*="mp4"]'):
            src = tag.get('src')
            if src: links.add(urljoin(referer_url, src))
            
        # JS 与文本正则提取
        raw_text = str(soup)
        regex_list = [
            r'(https?://[^\s"\'<>\]]+\.(?:m3u8|mp4)[^\s"\'<>\]]*)',
            r'(https?://[^\s"\'<>\]]*yocoolnet\.in[^\s"\'<>\]]*\.(?:m3u8|mp4)[^\s"\'<>\]]*)'
        ]
        for reg in regex_list:
            found = re.findall(reg, raw_text)
            for u in found:
                u = re.sub(r'["\'\s\\,;].*$', '', u)
                if u.startswith('http'):
                    links.add(u)
        return links

    def playerContent(self, flag, id, vipFlags):
        # 如果 id 是直链，parse 设为 0；如果是需要进一步解析的页面，设为 1
        is_direct = '.m3u8' in id or '.mp4' in id
        return {
            "parse": 0 if is_direct else 1,
            "url": id,
            "header": {
                "User-Agent": "Mozilla/5.0",
                "Referer": self.host
            }
        }
