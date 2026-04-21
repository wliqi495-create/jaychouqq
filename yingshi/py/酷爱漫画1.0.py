# -*- coding: utf-8 -*-
import json
import sys
import re
import requests
from bs4 import BeautifulSoup

sys.path.append('..')
from base.spider import Spider

class Spider(Spider):
    
    def getName(self):
        return "酷爱漫画"

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
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.203 Safari/537.36",
            "Referer": "https://www.kuimh.com/"
        }

    def homeContent(self, filter):
        classes = [
            {"type_name": "国产", "type_id": "1"},
            {"type_name": "日本", "type_id": "2"},
            {"type_name": "韩国", "type_id": "3"},
            {"type_name": "欧美", "type_id": "5"},
            {"type_name": "其他", "type_id": "7"},
            {"type_name": "日韩", "type_id": "8"}
        ]
        
        tags = ["全部", "恋爱", "古风", "校园", "奇幻", "大女主", "治愈", "穿越", "励志", "爆笑", "萌系", "玄幻", "日常", "都市", "彩虹", "灵异", "悬疑", "少年"]
        filter_config = {
            "key": "tag",
            "name": "题材",
            "value": [{"n": t, "v": t} for t in tags]
        }
        
        status_config = {
             "key": "end",
             "name": "状态",
             "value": [{"n": "全部", "v": "-1"}, {"n": "连载", "v": "0"}, {"n": "完结", "v": "1"}]
        }
        
        filters = {}
        for c in classes:
            filters[c['type_id']] = [filter_config, status_config]

        return {"class": classes, "filters": filters}

    def homeVideoContent(self):
        return self.categoryContent("1", "1", None, {})

    def categoryContent(self, tid, pg, filter, extend):
        tag = extend.get('tag', '全部')
        end = extend.get('end', '-1')
        url = f"https://www.kuimh.com/booklist?tag={tag}&area={tid}&end={end}&page={pg}"
        
        try:
            r = requests.get(url, headers=self.getHeader())
            soup = BeautifulSoup(r.text, 'html.parser')
            items = soup.select('.mh-item')
            
            videos = []
            for item in items:
                link_tag = item.select_one('a')
                vid = link_tag['href'] if link_tag else ""
                
                pic_tag = item.select_one('p')
                cover = ""
                if pic_tag and pic_tag.has_attr('style'):
                    match = re.search(r'url\((.*?)\)', pic_tag['style'])
                    if match:
                        cover = match.group(1)

                a_tags = item.select('a')
                if len(a_tags) > 1:
                    name = a_tags[1].text.strip()
                else:
                    name = item.text.strip()

                videos.append({
                    "vod_id": vid,
                    "vod_name": name,
                    "vod_pic": cover,
                    "vod_remarks": ""
                })
            
            return {
                "list": videos,
                "page": pg,
                "pagecount": 9999,
                "limit": 30,
                "total": 999999
            }
        except Exception as e:
            return {"list": []}

    def detailContent(self, ids):
        vid = ids[0]
        url = f"https://www.kuimh.com{vid}" if not vid.startswith('http') else vid
        
        try:
            r = requests.get(url, headers=self.getHeader())
            soup = BeautifulSoup(r.text, 'html.parser')
            
            name = soup.select_one('.info h1').text.strip() if soup.select_one('.info h1') else "未知"
            
            cover_tag = soup.select_one('.cover img')
            cover = cover_tag['src'] if cover_tag else ""
            
            desc_tag = soup.select_one('.content p')
            desc = desc_tag.text.strip() if desc_tag else ""
            
            chapter_list = soup.select('.mCustomScrollBox li a')
            if not chapter_list:
                chapter_list = soup.select('#detail-list-select li a')

            vod_play_url_list = []
            for chapter in chapter_list:
                chapter_name = chapter.text.strip()
                chapter_href = chapter['href']
                vod_play_url_list.append(f"{chapter_name}${chapter_href}")
            
            play_url_str = "#".join(vod_play_url_list)
            
            # 双线路配置：分别对应 Mange 协议和 Pics 协议
            return {
                "list": [{
                    "vod_id": vid,
                    "vod_name": name,
                    "vod_pic": cover,
                    "type_name": "漫画",
                    "vod_year": "",
                    "vod_area": "",
                    "vod_remarks": "",
                    "vod_actor": "",
                    "vod_director": "",
                    "vod_content": desc,
                    "vod_play_from": "阅读(Mange)$$$阅读(Pics)", 
                    "vod_play_url": f"{play_url_str}$$${play_url_str}"
                }]
            }
        except Exception as e:
            return {"list": []}

    def searchContent(self, key, quick, pg="1"):
        url = f"https://www.kuimh.com/search?keyword={key}&page={pg}"
        
        try:
            r = requests.get(url, headers=self.getHeader())
            soup = BeautifulSoup(r.text, 'html.parser')
            items = soup.select('.mh-item')
            
            videos = []
            for item in items:
                link_tag = item.select_one('a')
                vid = link_tag['href'] if link_tag else ""
                
                pic_tag = item.select_one('p')
                cover = ""
                if pic_tag and pic_tag.has_attr('style'):
                    match = re.search(r'url\((.*?)\)', pic_tag['style'])
                    if match:
                        cover = match.group(1)

                a_tags = item.select('a')
                if len(a_tags) > 1:
                    name = a_tags[1].text.strip()
                else:
                    name = item.text.strip()

                videos.append({
                    "vod_id": vid,
                    "vod_name": name,
                    "vod_pic": cover,
                    "vod_remarks": ""
                })
            return {'list': videos}
        except:
            return {'list': []}

    def playerContent(self, flag, id, vipFlags):
        # 补全 URL
        url = f"https://www.kuimh.com{id}" if not id.startswith('http') else id
        
        headers = self.getHeader()
        headers['Referer'] = url 
        
        try:
            r = requests.get(url, headers=headers, timeout=10)
            html = r.text
            soup = BeautifulSoup(html, 'html.parser')
            
            image_list = []
            
            # 1. 尝试 DOM 解析 (.comicpage 或 .comiclist)
            container = soup.select_one('.comicpage')
            if not container:
                container = soup.select_one('.comiclist')
            
            if container:
                imgs = container.select('img')
                for img in imgs:
                    src = img.get('data-echo') or img.get('data-src') or img.get('data-original')
                    if not src:
                        src = img.get('src')
                    if src:
                        image_list.append(src)
            
            # 2. 如果上面没找到，尝试查找所有带 data-echo 的图片
            if not image_list:
                all_lazy_imgs = soup.select('img[data-echo]')
                for img in all_lazy_imgs:
                    src = img.get('data-echo')
                    if src and src not in image_list:
                        image_list.append(src)

            # 3. 兜底方案：正则提取所有图片链接
            if not image_list:
                pattern = r'(https?://[^"\'\\]+\.(?:jpg|png|jpeg|webp))'
                matches = re.findall(pattern, html)
                for m in matches:
                    image_list.append(m)

            # 4. 过滤与去重
            unique_images = []
            for i in image_list:
                # 去重
                if i in unique_images:
                    continue
                
                # 过滤垃圾图片
                if "grey.gif" in i: continue
                if "logo" in i: continue
                if "icon" in i: continue
                
                # 过滤特定广告域名
                if "tu.petatt.cn" in i: continue 
                
                unique_images.append(i)

            novel_data = "&&".join(unique_images)
            
            # 根据 flag 切换协议头
            protocol = "pics" if "Pics" in flag else "mange"

            return {
                "parse": 0,
                "playUrl": "",
                "url": f'{protocol}://{novel_data}',
                "header": ""
            }
        except Exception as e:
            return {
                "parse": 0,
                "playUrl": "",
                "url": "",
                "header": ""
            }

    def localProxy(self, param):
        pass
