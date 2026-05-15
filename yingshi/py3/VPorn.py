"""
@header({
  searchable: 1,
  filterable: 1,
  quickSearch: 1,
  title: '复古片',
  lang: 'hipy'
})
"""

# coding=utf-8
import re
import json
import random
import string
import requests
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup
from base.spider import Spider

class Spider(Spider):
    R_IFRAME = re.compile(r'src=["\'](https?://(?:piq\.re|d000d\.com|doood\.com|myvidplay\.com|dood\.la|dood\.ws|dood\.sh|dood\.pm|dood\.to|dood\.so|dood\.cx|ds2play\.com|voe\.sx|streamtape\.com|filemoon\.sx)/e/[a-zA-Z0-9]+)', re.I)
    R_MD5 = re.compile(r"/pass_md5/[^'\"]+")
    R_EXT = re.compile(r"\.(mp4|flv|m3u8)(\?|$)", re.I)

    def init(self, extend=""):
        self.host = 'https://vintagepornfun.com'
        self.session = requests.Session()
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': self.host, 'Origin': self.host, 'Connection': 'keep-alive'
        }
        self.session.headers.update(self.headers)
        
        self.sort_conf = {"key": "order", "name": "排序", "value": [
            {"n": "默认", "v": ""},
            {"n": "最新", "v": "date"},
            {"n": "随机", "v": "rand"},
            {"n": "标题", "v": "title"},
            {"n": "热度", "v": "comment_count"}
        ]}

        self.tag_conf = {"key": "tag", "name": "标签", "value": [
            {"n": "全部", "v": ""},
            {"n": "70年代", "v": "70s-porn"},
            {"n": "80年代", "v": "80s-porn"},
            {"n": "90年代", "v": "90s-porn"},
            {"n": "肛交", "v": "anal-sex"},
            {"n": "亚洲", "v": "asian"},
            {"n": "大胸", "v": "big-boobs"},
            {"n": "金发", "v": "blonde"},
            {"n": "经典", "v": "classic"},
            {"n": "喜剧", "v": "comedy"},
            {"n": "绿帽", "v": "cuckold"},
            {"n": "黑人", "v": "ebony"},
            {"n": "欧洲", "v": "european"},
            {"n": "法国", "v": "french"},
            {"n": "德国", "v": "german"},
            {"n": "群交", "v": "group-sex"},
            {"n": "多毛", "v": "hairy-porn"},
            {"n": "跨种族", "v": "interracial"},
            {"n": "意大利", "v": "italian"},
            {"n": "女同", "v": "lesbian"},
            {"n": "熟女", "v": "milf"},
            {"n": "乱交", "v": "orgy"},
            {"n": "户外", "v": "public-sex"},
            {"n": "复古", "v": "retro"},
            {"n": "少女", "v": "teen-sex"},
            {"n": "3P", "v": "threesome"},
            {"n": "老片", "v": "vintage-porn"},
            {"n": "偷窥", "v": "voyeur"}
        ]}

    def getName(self): return "复古片"
    def isVideoFormat(self, url): return bool(url) and ('.m3u8' in url or self.R_EXT.search(url))

    def _fetch(self, url, headers=None):
        try:
            r = self.session.get(url, headers=headers or self.headers, timeout=15)
            r.raise_for_status()
            return BeautifulSoup(r.text, "html.parser")
        except: return None

    def _resolve_myvidplay(self, url):
        try:
            # 处理 piq.re 域名
            if 'piq.re' in url:
                embed = url
                host = f"{urlparse(embed).scheme}://{urlparse(embed).netloc}"
                # 使用正确的 Referer 获取完整页面内容
                h_req = {
                    "User-Agent": self.headers['User-Agent'],
                    "Referer": f"{self.host}/",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.5",
                    "Connection": "keep-alive"
                }
                
                # 使用 requests.get 而不是 session.get，避免 headers 冲突
                r = requests.get(embed, headers=h_req, timeout=15)
                if not r or r.status_code != 200:
                    return {'parse': 1, 'url': url, 'header': h_req}
                
                # 尝试从 piq.re 页面提取 m3u8 播放链接
                # 方法1: 查找 script 标签中的 m3u8 链接
                m3u8_links = re.findall(r'https?://[^"\'\s]+\.m3u8[^"\'\s]*', r.text)
                if m3u8_links:
                    return {
                        'parse': 0, 'url': m3u8_links[0],
                        'header': {'User-Agent': self.headers['User-Agent'], 'Referer': embed, 'Connection': 'keep-alive'}
                    }
                
                # 方法2: 查找 cfglobalcdn 链接
                cfg_links = re.findall(r'https?://[^"\'\s]*cfglobalcdn[^"\'\s]*', r.text)
                if cfg_links:
                    return {
                        'parse': 0, 'url': cfg_links[0],
                        'header': {'User-Agent': self.headers['User-Agent'], 'Referer': embed, 'Connection': 'keep-alive'}
                    }
                
                # 方法3: 查找 olplayer.src 配置中的链接
                scripts = re.findall(r'<script[^>]*>([\s\S]*?)</script>', r.text)
                for script in scripts:
                    if 'olplayer' in script or 'videojs' in script:
                        # 查找 m3u8 或 mp4 链接
                        links = re.findall(r'https?://[^"\'\s]+\.(?:m3u8|mp4)[^"\'\s]*', script)
                        if links:
                            return {
                                'parse': 0, 'url': links[0],
                                'header': {'User-Agent': self.headers['User-Agent'], 'Referer': embed, 'Connection': 'keep-alive'}
                            }
                
                # 如果没有找到，返回原始链接让播放器自行处理
                return {'parse': 1, 'url': url, 'header': h_req}
            
            # 处理其他域名
            embed = url.replace("/d/", "/e/")
            # 支持更多 dood 域名变体
            dood_domains = ['d000d.com', 'doood.com', 'dood.la', 'dood.ws', 'dood.sh', 'dood.pm', 'dood.to', 'dood.so', 'dood.cx']
            for d in dood_domains:
                if d in embed:
                    embed = embed.replace(d, 'myvidplay.com')
                    break

            host = f"{urlparse(embed).scheme}://{urlparse(embed).netloc}"
            h_req = {"User-Agent": self.headers['User-Agent'], "Referer": self.host}

            r = self.session.get(embed, headers=h_req, timeout=15)
            if not r or r.status_code != 200:
                return {'parse': 1, 'url': url, 'header': h_req}

            # 尝试多种方式获取 MD5 路径
            m = self.R_MD5.search(r.text)
            if not m:
                # 尝试其他可能的模式
                alt_md5 = re.search(r'pass_md5/[^"\']+', r.text)
                if alt_md5:
                    m = alt_md5

            if not m:
                # 尝试直接从 script 标签提取播放链接
                scripts = re.findall(r'<script[^>]*>([\s\S]*?)</script>', r.text)
                for script in scripts:
                    if 'source' in script and 'file' in script:
                        links = re.findall(r'file\s*:\s*["\']([^"\']+)["\']', script)
                        if links:
                            return {
                                'parse': 0, 'url': links[0],
                                'header': {'User-Agent': self.headers['User-Agent'], 'Referer': embed, 'Connection': 'keep-alive'}
                            }
                return {'parse': 1, 'url': url, 'header': h_req}

            h_req["Referer"] = embed
            md5_url = host + m.group(0) if not m.group(0).startswith('http') else m.group(0)
            prefix_resp = self.session.get(md5_url, headers=h_req, timeout=15)
            prefix = prefix_resp.text.strip() if prefix_resp else ""

            if not prefix.startswith("http"):
                return {'parse': 1, 'url': url, 'header': h_req}

            token = m.group(0).split("/")[-1]
            rnd = ''.join(random.choices(string.ascii_letters + string.digits, k=10))
            return {
                'parse': 0, 'url': f"{prefix}{rnd}?token={token}",
                'header': {'User-Agent': self.headers['User-Agent'], 'Referer': f"{host}/", 'Connection': 'keep-alive'}
            }
        except Exception as e:
            return {'parse': 1, 'url': url, 'header': self.headers}

    def homeContent(self, filter):
        classes = [
            {"type_name": "最新更新", "type_id": "latest"},
            {"type_name": "70年代", "type_id": "70s-porn"},
            {"type_name": "80年代", "type_id": "80s-porn"},
            {"type_name": "亚洲经典", "type_id": "asian-vintage-porn"},
            {"type_name": "欧洲经典", "type_id": "euro-porn-movies"},
            {"type_name": "日本经典", "type_id": "japanese-vintage-porn"},
            {"type_name": "法国经典", "type_id": "french-vintage-porn"},
            {"type_name": "德国经典", "type_id": "german-vintage-porn"},
            {"type_name": "意大利经典", "type_id": "italian-vintage-porn"},
            {"type_name": "经典影片", "type_id": "classic-porn-movies"}
        ]
        
        filters = {item['type_id']: [self.sort_conf, self.tag_conf] for item in classes}
        return {"class": classes, "filters": filters}

    def homeVideoContent(self): 
        return {'list': []}

    def categoryContent(self, tid, pg, filter, extend):
        if tid == "latest":
            url = self.host if pg == "1" else f"{self.host}/page/{pg}/"
        else:
            base = f"{self.host}/category/{tid}"
            url = f"{base}/" if pg == "1" else f"{base}/page/{pg}/"
        
        query_parts = []
        if 'order' in extend and extend['order']:
            query_parts.append(f"orderby={extend['order']}")
        if 'tag' in extend and extend['tag']:
            query_parts.append(f"tag={extend['tag']}")
            
        if query_parts:
            sep = '&' if '?' in url else '?'
            url += sep + '&'.join(query_parts)

        return self._get_list(url, int(pg))

    def _get_list(self, url, page=1):
        videos = []
        if soup := self._fetch(url):
            for item in soup.select('article'):
                if not (a := item.select_one('a[href]')): continue
                
                img = item.select_one('img')
                pic = img.get('data-src') or img.get('src') or ""
                if pic and not pic.startswith('http'): pic = urljoin(self.host, pic)
                
                head = item.select_one('.entry-header')
                rem = item.select_one('.rating-bar')
                
                videos.append({
                    "vod_id": a['href'],
                    "vod_name": head.get_text(strip=True) if head else a.get('title', ''),
                    "vod_pic": pic,
                    "vod_remarks": rem.get_text(strip=True) if rem else ""
                })
        
        return {
            "list": videos, 
            "page": page, 
            "pagecount": page + 1 if videos else page, 
            "limit": 20, 
            "total": 999
        }

    def detailContent(self, ids):
        if not (soup := self._fetch(ids[0])): return {'list': []}

        meta_img = soup.find('meta', property='og:image')
        meta_desc = soup.find('meta', property='og:description')

        # 提取所有匹配的 iframe src（双源）
        piq_url = ""
        dood_url = ""
        iframes = re.findall(r'src=["\'](https?://[^"\']+?/e/[a-zA-Z0-9]+)["\']', str(soup))
        for src in iframes:
            if 'piq.re' in src and not piq_url:
                piq_url = src
            elif any(x in src for x in ['d000d.com', 'doood.com', 'dood', 'myvidplay.com']) and not dood_url:
                dood_url = src

        # 备用：如果正则没找到，从iframe标签取
        if not piq_url and not dood_url:
            for iframe in soup.select('iframe'):
                src = iframe.get('src', '')
                if not src: continue
                if 'piq.re' in src and not piq_url:
                    piq_url = src
                elif any(x in src for x in ['dood', 'myvidplay']) and not dood_url:
                    dood_url = src

        vod_name = soup.select_one('h1').get_text(strip=True) if soup.select_one('h1') else ""
        vod_pic = meta_img['content'] if meta_img else ""
        vod_content = meta_desc['content'] if meta_desc else ""

        if piq_url and dood_url:
            vod_play_from = "文艺复兴$d000d"
            vod_play_url = f"piq.re${piq_url}#d000d.com${dood_url}"
        elif piq_url:
            vod_play_from = "文艺复兴"
            vod_play_url = f"HD${piq_url}"
        elif dood_url:
            vod_play_from = "d000d"
            vod_play_url = f"HD${dood_url}"
        else:
            vod_play_from = "文艺复兴"
            vod_play_url = "无资源$#"

        return {"list": [{
            "vod_id": ids[0],
            "vod_name": vod_name,
            "vod_pic": vod_pic,
            "type_name": "复古片",
            "vod_year": "",
            "vod_area": "",
            "vod_remarks": "",
            "vod_actor": "",
            "vod_director": "",
            "vod_content": vod_content,
            "vod_play_from": vod_play_from,
            "vod_play_url": vod_play_url
        }]}

    def searchContent(self, key, quick, pg="1"):
        return self._get_list(f"{self.host}/page/{pg}/?s={requests.utils.quote(key)}", int(pg))

    def playerContent(self, flag, id, vipFlags):
        # 托管站（piq.re/d000d.com）全部被Cloudflare保护，Python无法绕过
        # 直接返回 parse=1 让app的WebView嗅探，用完整浏览器header尝试过CF
        return {'parse': 1, 'url': id, 'header': {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': self.host + '/',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5'
        }}

    def localProxy(self, params): pass