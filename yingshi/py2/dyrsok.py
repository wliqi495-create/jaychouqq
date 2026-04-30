# -*- coding: utf-8 -*-
"""
电影人生 (dyrsok.com) 爬虫源 - 最终修复版
- 多线路完整提取
- 智能播放地址处理 (直链/API路径区分)
- 超级线路/王者TV蓝光: 使用固定 cookie 请求下游 API
"""
import re, json, sys, requests
from urllib.parse import urljoin, quote
from bs4 import BeautifulSoup
sys.path.append('..')
from base.spider import Spider

class Spider(Spider):
    host = "https://www.dyrsok.com"
    img_origin = "https://pic2.tupian.click"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36',
        'Referer': host + '/',
        'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9'
    }

    def getName(self): return "电影人生"

    def init(self, extend=""):
        super().init(extend)
        self.session = requests.Session()
        self.session.headers.update(self.headers)
        # 设置固定 cookie，让超级线路等 API 认证通过
        self.session.cookies.set('ip_id', '69f2142514dcfe4bbe65fc6494043702', domain='.dyrsok.com')
        self.session.cookies.set('ip_id_ok', '1777472549', domain='.dyrsok.com')
        self.session.cookies.set('notice_closed', 'true', domain='.dyrsok.com')

    # ===== 首页 =====
    def homeContent(self, filter):
        classes = [
            {"type_id": "dianying", "type_name": "电影"},
            {"type_id": "dianshiju", "type_name": "电视剧"},
            {"type_id": "zongyi", "type_name": "综艺"},
            {"type_id": "dongman", "type_name": "动漫"},
            {"type_id": "duanju", "type_name": "短剧"}
        ]
        return {"class": classes, "list": self._get_home_videos()}

    def homeVideoContent(self):
        return {"list": self._get_home_videos()}

    def _get_home_videos(self):
        videos = []
        try:
            r = self.session.get(self.host, timeout=15)
            r.encoding = 'utf-8'
            soup = BeautifulSoup(r.text, 'html.parser')
            cards = soup.select('div.relative.group a[href*="/dyrscom-"]')
            seen = set()
            for a in cards[:24]:
                href = a.get('href', '')
                if href in seen: continue
                seen.add(href)
                if not href.startswith('http'): href = urljoin(self.host, href)
                parent = a.find_parent('div', class_='relative')
                title = img_src = remark = ''
                if parent:
                    h3 = parent.select_one('h3')
                    if h3: title = h3.get_text(strip=True)
                    img = parent.select_one('img[data-src]')
                    if img:
                        img_src = img.get('data-src', '')
                        if img_src.startswith('/') and not img_src.startswith('//'):
                            img_src = self.img_origin + img_src
                    badge = parent.select_one('div.text-\\[10px\\].font-bold.absolute')
                    if badge: remark = badge.get_text(strip=True)
                if title and href:
                    videos.append({"vod_id": href, "vod_name": title, "vod_pic": img_src, "vod_remarks": remark})
        except Exception as e: print(f"首页抓取失败: {e}")
        return videos

    # ===== 分类列表 =====
    def categoryContent(self, tid, pg, filter, extend):
        pg = int(pg) if pg and str(pg).isdigit() else 1
        class_param = extend.get('class', '') if extend else ''
        url = f"{self.host}/{tid}.html"
        if class_param: url += f"?class={quote(class_param)}"
        return self._parse_list(url, pg)

    def _parse_list(self, url, pg):
        videos = []
        try:
            r = self.session.get(url, timeout=15)
            r.encoding = 'utf-8'
            soup = BeautifulSoup(r.text, 'html.parser')
            cards = soup.select('div.relative.group a[href*="/dyrscom-"]')
            for a in cards:
                href = a.get('href', '')
                if not href.startswith('http'): href = urljoin(self.host, href)
                parent = a.find_parent('div', class_='relative')
                title = img_src = remark = ''
                if parent:
                    h3 = parent.select_one('h3')
                    if h3: title = h3.get_text(strip=True)
                    img = parent.select_one('img[data-src]')
                    if img:
                        img_src = img.get('data-src', '')
                        if img_src.startswith('/') and not img_src.startswith('//'):
                            img_src = self.img_origin + img_src
                    badge = parent.select_one('div.text-\\[10px\\].font-bold.absolute')
                    if badge: remark = badge.get_text(strip=True)
                if title and href:
                    videos.append({"vod_id": href, "vod_name": title, "vod_pic": img_src, "vod_remarks": remark})
        except Exception as e: print(f"列表抓取失败: {e}")
        return {"list": videos, "page": pg, "pagecount": pg+1 if len(videos)>=12 else pg, "limit": 24, "total": 9999}

    # ===== 详情页 (核心修复) =====
    def detailContent(self, ids):
        vid = ids[0] if isinstance(ids, list) else ids
        if not vid.startswith('http'): vid = urljoin(self.host, vid)
        vod = {"vod_id": vid, "vod_name": "", "vod_pic": "", "vod_content": "",
               "vod_play_from": "电影人生", "vod_play_url": ""}
        try:
            r = self.session.get(vid, timeout=15)
            r.encoding = 'utf-8'
            html = r.text
            soup = BeautifulSoup(html, 'html.parser')

            # 标题/封面/简介
            m = re.search(r'<meta property="og:title" content="([^"]+)"', html)
            if m: vod["vod_name"] = m.group(1).strip()
            m = re.search(r'<meta property="og:image" content="([^"]+)"', html)
            if m: vod["vod_pic"] = m.group(1).strip()
            m = re.search(r'<meta property="og:description" content="([^"]+)"', html)
            if m: vod["vod_content"] = m.group(1).strip()

            # === 提取所有线路 ===
            play_froms = []
            all_line_urls = []

            # 从 originTabs 提取所有线路按钮
            for a in soup.select('div[id*="originTabs"] a, div[id="originTabs"] a'):
                btn = a.select_one('button')
                if not btn: continue
                origin = btn.get('data-origin', '')
                if not origin or origin in play_froms: continue
                play_froms.append(origin)

                # 获取该线路的播放列表页
                line_url = urljoin(self.host, a.get('href', ''))
                line_html = self._fetch(line_url)
                if not line_html:
                    all_line_urls.append(f"加载失败${origin}?play_url=")
                    continue

                # 从 dyrs_vod_list 提取该线路的集数
                vod_match = re.search(r"var\s+dyrs_vod_list\s*=\s*JSON\.parse\('([^']+)'\)", line_html)
                if vod_match:
                    try:
                        raw = vod_match.group(1).replace('\\u0022','"').replace('\\/','/')
                        eps = json.loads(raw)
                        urls = []
                        for ep in eps:
                            title = ep.get('title','')
                            ep_url = ep.get('url','')
                            urls.append(f"{title}${origin}?play_url={ep_url}")
                        all_line_urls.append("#".join(urls))
                    except:
                        all_line_urls.append("")
                else:
                    all_line_urls.append(f"暂无数据${origin}?play_url=")

            # fallback: 直接用当前页的 dyrs_vod_list
            if not play_froms:
                vod_match = re.search(r"var\s+dyrs_vod_list\s*=\s*JSON\.parse\('([^']+)'\)", html)
                if vod_match:
                    try:
                        raw = vod_match.group(1).replace('\\u0022','"').replace('\\/','/')
                        eps = json.loads(raw)
                        urls = []
                        for ep in eps:
                            origin = ep.get('origin','默认线路')
                            ep_url = ep.get('url','')
                            title = ep.get('title','')
                            if origin not in play_froms:
                                play_froms.append(origin)
                            urls.append(f"{title}${origin}?play_url={ep_url}")
                        all_line_urls.append("#".join(urls))
                    except: pass

            vod["vod_play_from"] = "$$$".join(play_froms) if play_froms else "电影人生"
            vod["vod_play_url"] = "$$$".join(all_line_urls) if all_line_urls else f"在线播放$默认线路?play_url="

        except Exception as e: print(f"详情解析失败: {e}")
        return {"list": [vod]}

    def _fetch(self, url):
        try:
            r = self.session.get(url, timeout=10)
            r.encoding = 'utf-8'
            return r.text
        except: return ""

    # ===== 搜索 =====
    def searchContent(self, key, quick, pg="1"):
        pg = int(pg) if pg and str(pg).isdigit() else 1
        return self._parse_list(f"{self.host}/s.html?name={quote(key)}", pg)

    # ===== 播放器（超级线路/王者TV蓝光 修复版）=====
    def playerContent(self, flag, id, vipFlags):
        play_id = id.split("$",1)[1] if "$" in id else id
        if not play_id:
            return {"parse":0, "url":"", "header":{}}
    
        if 'play_url=' in play_id:
            raw_url = play_id.split('play_url=',1)[1]
            # 提取 url= 后面的真实ID
            import re
            id_match = re.search(r'url=([a-f0-9]+)', raw_url)
            vid = id_match.group(1) if id_match else ''
    
            # 线路判断
            if '超级线路' in id:
                final = f"https://box.dyrs.com.de/api/super?id={vid}"
            elif '王者TV蓝光' in id:
                final = f"https://box.dyrs.com.de/api/m3u8?id={vid}"
            else:
                # 普通线路原样返回
                final = raw_url if raw_url.startswith('http') else f"{self.host}{raw_url}"
    
            return {
                "parse": 0,
                "url": final,
                "header": {
                    "User-Agent": self.headers['User-Agent'],
                    "Referer": self.host + "/"
                }
            }
    
        # 兜底
        return {"parse":0, "url": play_id, "header":{}}

    def isVideoFormat(self, url):
        return bool(url) and re.search(r'\.(m3u8|mp4)(\?|$)', url, re.I)

    def manualVideoCheck(self): return False
    def destroy(self):
        if hasattr(self, 'session'): self.session.close()
