# -*- coding: utf-8 -*-
import sys
import re
import requests
import urllib3
from concurrent.futures import ThreadPoolExecutor, as_completed

sys.path.append('..')
from base.spider import Spider

# 禁用 SSL 警告
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

class Spider(Spider):
    
    # 预编译正则，提升循环中的匹配效率
    RE_NAV_LINKS = re.compile(r'<a[^>]+href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', re.S)
    RE_LIST_CONTAINER = re.compile(r'(?:class=["\']cy_list_mh["\']|id=["\']contaner["\'])[^>]*>(.*?)<div class="cy_page', re.S)
    RE_LIST_ITEMS = re.compile(r'<li[^>]*>(.*?)</li>', re.S)
    RE_HREF = re.compile(r'href=["\']([^"\']+)["\']')
    RE_TITLE_B = re.compile(r'<b>(.*?)</b>', re.S)
    RE_TITLE_PIC = re.compile(r'class=["\']pic["\'][^>]*title=["\']([^"\']+)["\']')
    RE_TITLE_ALT = re.compile(r'alt=["\']([^"\']+)["\']')
    RE_IMG_SRC = re.compile(r'(?:data-src|src)=["\']([^"\']+)["\']')
    RE_DESC_P = re.compile(r'<p[^>]*>(.*?)</p>', re.S)
    RE_REMARK_TT = re.compile(r'class=["\']tt["\'][^>]*>(.*?)</span>')
    RE_DETAIL_H1 = re.compile(r'<h1[^>]*>(.*?)</h1>', re.S)
    RE_DETAIL_COVER = re.compile(r'class="detail-info-cover"[^>]+src=["\']([^"\']+)["\']')
    RE_DETAIL_DESC = re.compile(r'id="comic-description"[^>]*>(.*?)</div>', re.S)
    RE_CHAPTER_LIST = re.compile(r'<(?:ul|ol)[^>]*class=["\'].*?list.*?["\'][^>]*>(.*?)</(?:ul|ol)>', re.S)
    # 播放页图片提取正则
    RE_PLAY_IMGS = re.compile(r'(?:data-original|data-src|src)=["\']([^"\']+\.(?:jpg|png|jpeg|webp))[^"\']*["\']', re.I)

    def getName(self):
        return "动漫啦"

    def init(self, extend=""):
        pass

    def isVideoFormat(self, url):
        return False

    def manualVideoCheck(self):
        return False

    def destroy(self):
        pass

    def getHeader(self):
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": "https://www.dongman.la/",
            "Connection": "keep-alive"
        }

    def fetch(self, url):
        try:
            return requests.get(url, headers=self.getHeader(), timeout=5, verify=False)
        except:
            return None

    def homeContent(self, filter):
        cats = []
        try:
            r = self.fetch("https://www.dongman.la/")
            if r and r.status_code == 200:
                r.encoding = 'utf-8'
                nav_match = re.search(r'<div class="cy_subnav">(.*?)</div>', r.text, re.S)
                if nav_match:
                    links = self.RE_NAV_LINKS.findall(nav_match.group(1))
                    for href, title in links:
                        if "首页" in title: continue
                        type_id = href.replace("https://www.dongman.la", "").strip("/")
                        cats.append({"type_name": title, "type_id": type_id})
        except:
            pass

        if not cats:
            cats = [
                {"type_name": "连载中", "type_id": "manhua/list/lianzai"},
                {"type_name": "已完结", "type_id": "manhua/list/wanjie"},
                {"type_name": "热血", "type_id": "manhua/list/rexue"},
                {"type_name": "恋爱", "type_id": "manhua/list/lianai"},
                {"type_name": "冒险", "type_id": "manhua/list/maoxian"},
                {"type_name": "搞笑", "type_id": "manhua/list/gaoxiao"}
            ]
        
        return {"class": cats, "filters": {}}

    def homeVideoContent(self):
        return self.categoryContent("manhua/list/lianzai", "1", None, {})

    def categoryContent(self, tid, pg, filter, extend):
        url = f"https://www.dongman.la/{tid.strip('/')}/{pg}.html"
        return self._get_post_list_by_regex(url, pg)

    def searchContent(self, key, quick, pg="1"):
        url = f"https://www.dongman.la/manhua/so/{key}/{pg}.html"
        return self._get_post_list_by_regex(url, pg)

    def _get_post_list_by_regex(self, url, pg):
        try:
            r = self.fetch(url)
            if not r: return {"list": []}
            r.encoding = 'utf-8'
            html = r.text
            vlist = []
            
            list_html = ""
            container_match = self.RE_LIST_CONTAINER.search(html)
            if container_match:
                list_html = container_match.group(1)
            
            items = self.RE_LIST_ITEMS.findall(list_html if list_html else html)

            for item in items:
                if 'class="title"' not in item and 'class="pic"' not in item: continue
                
                href_match = self.RE_HREF.search(item)
                if not href_match: continue
                href = href_match.group(1)
                
                if "javascript" in href or href in ["/", "#"]: continue
                
                # 提取名称
                name = ""
                b_match = self.RE_TITLE_B.search(item)
                if b_match: 
                    name = b_match.group(1).strip()
                elif (t_match := self.RE_TITLE_PIC.search(item)): 
                    name = t_match.group(1)
                elif (alt_match := self.RE_TITLE_ALT.search(item)): 
                    name = alt_match.group(1).strip()

                name = re.sub(r'<[^>]+>', '', name).replace("漫画", "").replace("在线观看", "").strip()
                if not name: continue

                # 提取图片
                pic = ""
                img_match = self.RE_IMG_SRC.search(item)
                if img_match:
                    pic = img_match.group(1)
                    if pic.startswith("//"): pic = "https:" + pic
                
                # 提取备注
                remark = ""
                p_tag = self.RE_DESC_P.search(item)
                if p_tag and "title" not in item.split(p_tag.group(0))[0]: 
                     remark = re.sub(r'<[^>]+>', '', p_tag.group(1)).strip()
                
                if not remark:
                    tt_match = self.RE_REMARK_TT.search(item)
                    if tt_match: remark = tt_match.group(1).strip()

                vlist.append({
                    'vod_id': href, 
                    'vod_name': name,
                    'vod_pic': pic,
                    'vod_remarks': remark
                })
            
            return {"list": vlist, "page": pg, "pagecount": 9999, "limit": 30, "total": 999999}
        except:
            return {"list": []}

    def detailContent(self, ids):
        vid = ids[0]
        url = f"https://www.dongman.la{vid}" if not vid.startswith('http') else vid
        
        try:
            r = self.fetch(url)
            r.encoding = 'utf-8'
            html = r.text
            
            name = ""
            h1_match = self.RE_DETAIL_H1.search(html)
            if h1_match:
                name = re.sub(r'<[^>]+>', '', h1_match.group(1)).strip()
            
            if not name:
                title_match = re.search(r'<title>(.*?)</title>', html, re.S)
                if title_match:
                    name = title_match.group(1).split('-')[0].split('_')[0].strip()
            
            name = name.replace("漫画", "").replace("在线观看", "").replace("免费阅读", "").strip() or "未知漫画"

            cover = ""
            cover_match = self.RE_DETAIL_COVER.search(html)
            if cover_match:
                cover = cover_match.group(1)
                if cover.startswith("//"): cover = "https:" + cover
            
            desc = ""
            desc_match = self.RE_DETAIL_DESC.search(html)
            if desc_match:
                desc = re.sub(r'<[^>]+>', '', desc_match.group(1)).strip()
                desc = desc.replace("&nbsp;", " ").replace("详细简介↓", "").replace("收起↑", "")
                desc = re.sub(r'\s+', ' ', desc).strip()
            
            # 提取章节
            list_containers = self.RE_CHAPTER_LIST.findall(html)
            links_source = "".join(list_containers) if list_containers else html
            
            # 匹配所有链接
            raw_links = self.RE_NAV_LINKS.findall(links_source)
            
            chapter_list = []
            unique_chapters = set() 
            
            for href, text in raw_links:
                if "/chapter/" not in href and not re.search(r'\d+\.html', href): continue
                if "detail" in href: continue
                
                title = re.sub(r'<[^>]+>', '', text).strip()
                if not title or "在线阅读" in title or "开始阅读" in title: continue
                
                if href not in unique_chapters:
                    unique_chapters.add(href)
                    chapter_list.append(f"{title}${href}")
            
            chapter_list.reverse()
            play_url = "#".join(chapter_list)

            return {
                "list": [{
                    "vod_id": vid,
                    "vod_name": name,
                    "vod_pic": cover,
                    "type_name": "漫画",
                    "vod_content": desc,
                    "vod_play_from": "动漫啦$$$动漫啦(Pics)", 
                    "vod_play_url": f"{play_url}$$${play_url}"
                }]
            }
        except:
            return {"list": []}

    def _extract_imgs(self, html_text):
        """辅助方法：提取HTML中的内容图片"""
        found = []
        matches = self.RE_PLAY_IMGS.findall(html_text)
        
        for src in matches:
            if any(x in src for x in ["logo", "icon", "cover", "banner", ".gif", "loading"]): continue
            
            if src.startswith("//"): 
                src = "https:" + src
            elif src.startswith("/"): 
                src = "https://www.dongman.la" + src
            elif not src.startswith("http"): 
                continue 
            
            if src not in found:
                found.append(src)
        return found

    def playerContent(self, flag, id, vipFlags):
        url = f"https://www.dongman.la{id}" if not id.startswith('http') else id
        
        # 处理URL，构建 all.html
        clean_url = url.replace('.html', '').rstrip('/')
        all_url = f"{clean_url}/all.html"
        
        headers = self.getHeader()
        headers['Referer'] = url 
        
        img_list = []

        # 1. 优先尝试 all.html (全页模式)
        try:
            r = requests.get(all_url, headers=headers, timeout=10, verify=False)
            if r.status_code == 200:
                img_list = self._extract_imgs(r.text)
        except:
            pass
            
        # 2. 失败则并发单页抓取 (兜底策略，限制前40页)
        if not img_list:
            image_map = {}
            
            def fetch_page_image(page_index):
                target_url = url if page_index == 1 else f"{clean_url}/{page_index}.html"
                try:
                    res = requests.get(target_url, headers=self.getHeader(), timeout=3, verify=False)
                    if res.status_code == 200:
                        imgs = self._extract_imgs(res.text)
                        if imgs: image_map[page_index] = imgs[0]
                except:
                    pass

            with ThreadPoolExecutor(max_workers=10) as executor:
                # 提交任务
                futures = [executor.submit(fetch_page_image, i) for i in range(1, 40)]
                # 等待所有任务完成
                for future in as_completed(futures): pass
                
            # 按页码顺序组装
            for i in range(1, 40):
                if i in image_map: img_list.append(image_map[i])

        if not img_list:
             return {'parse': 1, 'url': url, 'header': self.getHeader()}

        novel_data = "&&".join(img_list)
        protocol = "pics" if "Pics" in flag else "mange"
        
        return {
            "parse": 0,
            "playUrl": "",
            "url": f'{protocol}://{novel_data}',
            "header": ""
        }

    def localProxy(self, param):
        pass
