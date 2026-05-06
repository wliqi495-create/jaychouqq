# -*- coding: utf-8 -*-
import json
import sys
import re
from pyquery import PyQuery as pq
import requests
import concurrent.futures
from urllib.parse import urljoin, urlparse

sys.path.append('..')
from base.spider import Spider

class Spider(Spider):
    def getName(self):
        return "韩国BJ"

    def init(self, extend=""):
        print("============Korean BJ Spider============")
        pass

    def homeContent(self, filter):
        result = {}
        cateManual = {
            "最新视频": "latest"
        }
        classes = []
        for k in cateManual:
            classes.append({
                'type_name': k,
                'type_id': cateManual[k]
            })

        result['class'] = classes
        return result

    def homeVideoContent(self):
        result = self.videosContent(self.home + "/")
        return result

    def categoryContent(self, tid, pg, filter, extend):
        result = {}
        if tid == "latest":
            url = self.home + "/" if pg == 1 else self.home + "/?page={0}".format(pg)
            result = self.videosContent(url)
        elif tid == "tags":
            url = self.home + "/"
            rsp = self._fetch(url)
            root = pq(rsp.text)
            videos = []
            tag_elems = root('a[href*="/tags/"]')
            for tag in tag_elems.items():
                href = tag.attr('href')
                if href and href.startswith('/tags/'):
                    tag_name = tag.text().strip()
                    if tag_name:
                        video = {
                            "vod_id": href.split('/')[-1],
                            "vod_name": tag_name,
                            "vod_pic": "",
                            "vod_remarks": ""
                        }
                        videos.append(video)
            result['list'] = videos[:90]
            result['page'] = pg
            result['pagecount'] = 1
            result['limit'] = len(videos)
            result['total'] = len(videos)
        return result

    def detailContent(self, array):
        tid = array[0]
        url = self.home + "/posts/" + tid
        rsp = self._fetch(url)
        root = pq(rsp.text)
        
        vod = {
            "vod_id": tid,
            "vod_name": "",
            "vod_pic": "",
            "type_name": "",
            "vod_year": "",
            "vod_area": "",
            "vod_remarks": "",
            "vod_actor": "",
            "vod_director": "",
            "vod_content": ""
        }
        
        title_elem = root('h1')
        if title_elem:
            vod['vod_name'] = title_elem.text().strip()
        else:
            title_elem = root('h1.font-bold')
            if title_elem:
                vod['vod_name'] = title_elem.text().strip()
        
        img_elem = root('meta[property="og:image"]')
        if img_elem:
            vod['vod_pic'] = img_elem.attr('content')
        else:
            img_elem = root('script[type="application/ld+json"]')
            if img_elem:
                try:
                    json_data = json.loads(img_elem.text())
                    if 'thumbnailUrl' in json_data:
                        vod['vod_pic'] = json_data['thumbnailUrl']
                except:
                    pass
        
        date_elem = root('time')
        if date_elem:
            vod['vod_remarks'] = date_elem.attr('datetime')
        
        play_url = ""
        
        json_ld_elem = root('script[type="application/ld+json"]')
        if json_ld_elem:
            try:
                json_data = json.loads(json_ld_elem.text())
                if 'embedUrl' in json_data:
                    play_url = json_data['embedUrl']
            except:
                pass
        
        if not play_url:
            iframe_elem = root('#players iframe')
            if iframe_elem:
                play_url = iframe_elem.attr('src')
        
        if not play_url:
            script_content = rsp.text
            filemoon_match = re.search(r'filemoon\.to/e/([a-zA-Z0-9]+)', script_content)
            if filemoon_match:
                play_url = f"https://filemoon.to/e/{filemoon_match.group(1)}"
        
        tags = []
        tag_elems = root('a[href*="/tags/"]')
        for tag in tag_elems.items():
            if tag.attr('href').startswith('/tags/'):
                tags.append(tag.text().strip())
        
        if tags:
            vod['vod_actor'] = ','.join(tags)
        
        if play_url:
            vod['vod_play_from'] = 'KBJ视频'
            vod['vod_play_url'] = f"第1集${play_url}"
        
        return {'list': [vod]}

    def searchContent(self, key, quick, pg=1):
        result = {}
        url = self.home + f"/?kw={key}" if pg == 1 else self.home + f"/?kw={key}&page={pg}"
        result = self.videosContent(url)
        result['page'] = pg
        return result

    def playerContent(self, flag, id, vipFlags):
        result = {}
        
        # 优先直接播放（parse=1），快速
        if id.startswith('https://filemoon.to/e/'):
            result["parse"] = 1
            result["playUrl"] = ""
            result["url"] = id
            result["header"] = {
                "User-Agent": self.UA,
                "Referer": "https://filemoon.to/"
            }
            return result
        
        # 若需嗅探m3u8，启用自定义快速提取（parse=1，但加速）
        result["parse"] = 1  # 启用嗅探，但结合自定义逻辑
        result["playUrl"] = ""
        result["url"] = id
        
        # 自定义异步提取m3u8（优化速度）
        m3u8_urls = self._fast_sniff_m3u8(id)
        if m3u8_urls:
            result["playUrl"] = '$'.join(m3u8_urls)  # 多源分隔
            result["header"] = {
                "User-Agent": self.UA,
                "Referer": id
            }
        
        return result

    # ===================== 优化部分：Filemoon API 直接取 m3u8 =====================
    def _filemoon_api(self, filemoon_url: str) -> list:
        '''
        Filemoon 官方 API：/api/source/{file_id}，直接获取 m3u8 源
        '''
        file_id = filemoon_url.rstrip('/').split('/')[-1]
        api = f'https://filemoon.to/api/source/{file_id}'
        try:
            j = requests.post(api,
                              timeout=5,
                              headers={
                                  'User-Agent': self.UA,
                                  'Referer': filemoon_url,
                                  'X-Requested-With': 'XMLHttpRequest'
                              }).json()
            return [x['file'] for x in j.get('data', []) if x['file'].endswith('.m3u8')]
        except Exception as e:
            print('filemoon api err:', e)
            return []

    # ===================== 优化部分：递归解析 iframe 嵌套 =====================
    def _resolve_playurl(self, page_url: str) -> list:
        '''
        1. 解析页面，找 Filemoon 直链或 iframe
        2. 若 iframe，递归解析 src
        3. 最终用 API 取 m3u8
        '''
        seen = set()
        q = [page_url]
        m3u8 = []
        while q and not m3u8:
            url = q.pop()
            if url in seen:
                continue
            seen.add(url)
            try:
                html = requests.get(url, headers={'User-Agent': self.UA}, timeout=5, verify=False).text
            except:
                continue
            # a) 直接找 filemoon 地址
            fm = re.search(r'https?://filemoon\.to/(?:e|embed)/[a-zA-Z0-9]+', html)
            if fm:
                m3u8 = self._filemoon_api(fm.group())
                break
            # b) 找 iframe src 并递归
            for src in re.findall(r'<iframe[^>]+src=["\']([^"\']+)["\']', html):
                full = urljoin(url, src)
                if urlparse(full).netloc:
                    q.append(full)
        return m3u8

    # ===================== 优化部分：更新 playerContent 以优先直链 =====================
    # 注意：原 playerContent 保留，但新增优先 API 逻辑；若原逻辑失败，再走新方法
    def playerContent_optimized(self, flag: str, play_page: str, vipFlags: dict):
        '''
        优先 API + iframe 解析；5s 内搞定直链，否则 fallback 到原嗅探
        '''
        out = {'parse': 1, 'playUrl': '', 'url': play_page}
        if play_page.startswith('https://filemoon.to/e/'):
            # 已知 filemoon/e/* ：直接 API
            m3u8 = self._filemoon_api(play_page)
        else:
            # 未知：递归解析
            m3u8 = self._resolve_playurl(play_page)

        if m3u8:  # 成功取到 m3u8
            out['parse'] = 0  # 直链模式，不再嗅探
            out['playUrl'] = m3u8[0]  # 取最高清，或用 '$'.join(m3u8) 多源
            out['header'] = {'User-Agent': self.UA, 'Referer': play_page}
        else:
            # Fallback 到原逻辑
            m3u8_urls = self._fast_sniff_m3u8(play_page)
            if m3u8_urls:
                out['playUrl'] = '$'.join(m3u8_urls)
                out['header'] = {'User-Agent': self.UA, 'Referer': play_page}
        
        return out

    def _fast_sniff_m3u8(self, url):
        """异步快速提取m3u8链接，超时5s，多线程"""
        m3u8_set = set()  # 去重
        
        def fetch_and_extract(target_url):
            try:
                resp = requests.get(target_url, timeout=5, verify=False)
                content = resp.text
                # 正则匹配m3u8或hls
                matches = re.findall(r'(https?://[^\s\'\"<>]+?\.m3u8(?:\?[^\'\"<>]*)?)', content)
                for match in matches:
                    m3u8_set.add(match)
            except:
                pass
        
        # 并行请求：主URL + 常见重定向
        urls_to_check = [url]
        if '/e/' in url:
            # filemoon特定：添加embed和api端点
            urls_to_check.append(url.replace('/e/', '/embed/'))
            urls_to_check.append(urljoin(url, 'api/sources'))
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
            futures = [executor.submit(fetch_and_extract, u) for u in urls_to_check]
            concurrent.futures.wait(futures, timeout=5)  # 总超时5s
        
        return list(m3u8_set) if m3u8_set else []

    def isVideoFormat(self, url):
        pass

    def manualVideoCheck(self):
        pass

    def localProxy(self, param):
        action = {}
        return action

    def videosContent(self, url):
        rsp = self._fetch(url)
        root = pq(rsp.text)
        d = pq(rsp.text)
        videos = []
        
        video_items = d('div.grid > div')
        
        for item in video_items.items():
            video = {
                "vod_id": "",
                "vod_name": "",
                "vod_pic": "",
                "vod_remarks": ""
            }
            
            link_elem = item('a[href*="/posts/"]').eq(0)
            if link_elem:
                href = link_elem.attr('href')
                if href and '/posts/' in href:
                    video['vod_id'] = href.split('/')[-1]
            
            title_elem = item('h2.font-semibold')
            if title_elem:
                video['vod_name'] = title_elem.text().strip()
            
            img_elem = item('img')
            if img_elem:
                video['vod_pic'] = img_elem.attr('src')
            
            date_elem = item('time')
            if date_elem:
                video['vod_remarks'] = date_elem.attr('datetime')
            
            if video['vod_id'] and video['vod_name']:
                videos.append(video)
        
        pagecount = 1
        current_page = 1
        
        pagination = d('nav[aria-label="Pagination Navigation"]')
        if pagination:
            page_links = pagination('a[href*="?page="]')
            if page_links:
                pages = []
                for link in page_links.items():
                    try:
                        page_num = int(link.text().strip())
                        pages.append(page_num)
                    except:
                        pass
                if pages:
                    pagecount = max(pages)
            
            current_page_elem = pagination('span[aria-current="page"]')
            if current_page_elem:
                try:
                    current_page = int(current_page_elem.text().strip())
                except:
                    pass
        
        result = {
            'list': videos,
            'page': current_page,
            'pagecount': pagecount,
            'limit': len(videos),
            'total': len(videos) * pagecount
        }
        
        return result

    @property
    def home(self):
        return "https://kbj.im"

    def _fetch(self, url, **kwargs):
        try:
            response = requests.get(url, timeout=10, verify=False, **kwargs)
            response.raise_for_status()
            return response
        except Exception as e:
            print(f"Fetch error for {url}: {e}")
            return self.fetch(url, **kwargs)

    # UA 常量，供优化方法使用
    UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0 Safari/537.36"
