import sys
import re
import requests
from base.spider import Spider
from urllib3 import disable_warnings
disable_warnings()

class Spider(Spider):
    host = "https://www.baoshi3.cc"

    def getName(self):
        return "宝石电影"

    def init(self, extend=""):
        pass

    def homeContent(self, filter):
        classes = [
            {"type_id": "1", "type_name": "电影"},
            {"type_id": "2", "type_name": "连续剧"},
            {"type_id": "4", "type_name": "动漫"}
        ]
        return {"class": classes}

    def categoryContent(self, tid, pg, filter, extend):
        url = f"{self.host}/type/{tid}-{pg}.html"
        res = self.fetch(url)
        html = res.text
        
        # 1. 动态获取总页数 (从分页链接中提取最大的页码)
        pg_matches = re.findall(r'/type/{}-(\d+)\.html'.format(tid), html)
        page_count = max([int(x) for x in pg_matches]) if pg_matches else int(pg)
        
        # 2. 提取视频列表 (确保 data-original 被正确提取)
        vod_list = []
        matches = re.findall(r'class="team-con"\s+href="/detail/(\d+)\.html"\s+title="([^"]+)".*?data-original="([^"]+)"', html, re.S)
        
        for mid, name, pic in matches:
            if pic.startswith('//'):
                pic = "https:" + pic
            elif pic.startswith('/') and not pic.startswith('//'):
                pic = self.host + pic
                
            vod_list.append({
                "vod_id": mid,
                "vod_name": name,
                "vod_pic": pic,
                "vod_remarks": "" 
            })
        
        return {
            "page": int(pg),
            "pagecount": page_count,
            "limit": len(vod_list),
            "total": page_count * 20,
            "list": vod_list
        }

    def detailContent(self, ids):
        mid = ids[0]
        url = f"{self.host}/detail/{mid}.html"
        res = requests.get(url, verify=False, timeout=10, headers={"User-Agent": "Mozilla/5.0"})
        html = res.text
        
        name_match = re.search(r'<h1[^>]*>([^<]+)</h1>', html)
        if not name_match:
            name_match = re.search(r'class="title2">([^<]+)</h2>', html)
            
        pic_match = re.search(r'class="detail-img"[^>]+(?:src|data-original)="([^"]+)"', html)
        content_match = re.search(r'class="detail-sketch"[^>]*>(.*?)</div>', html, re.S)
        
        play_list_matches = re.findall(r'href="(/play/\d+-\d+-\d+.html)">([^<]+)</a>', html)
        play_urls = [f"{p_name}${p_url}" for p_url, p_name in play_list_matches]
            
        vod = {
            "vod_id": mid,
            "vod_name": name_match.group(1).strip() if name_match else "未知影片",
            "vod_pic": pic_match.group(1) if pic_match else "",
            "vod_play_from": "宝石云播",
            "vod_play_url": "#".join(play_urls),
            "vod_content": re.sub(r'<[^>]+>', '', content_match.group(1)).strip() if content_match else "暂无简介"
        }
        return {"list": [vod]}

    def searchContent(self, key, quick, pg="1"):
        url = f"{self.host}/search/-------------.html?wd={key}"
        try:
            res = requests.get(url, verify=False, timeout=10, headers={"User-Agent": "Mozilla/5.0"})
            html = res.text
        except:
            return {"list": []}
        matches = re.findall(r'class="team-con"\s+href="/detail/(\d+)\.html"\s+title="([^"]+)".*?data-original="([^"]+)"', html, re.S)
        vod_list = []
        for mid, name, pic in matches:
            if pic.startswith('//'): pic = "https:" + pic
            elif pic.startswith('/') and not pic.startswith('//'): pic = self.host + pic
            vod_list.append({
                "vod_id": mid, "vod_name": name,
                "vod_pic": pic, "vod_remarks": ""
            })
        return {"list": vod_list}

    def playerContent(self, flag, id, vipFlags):
        return {"parse": 1, "url": self.host + id, "header": {"User-Agent": "Mozilla/5.0"}}

    def playerContent(self, flag, id, vipFlags):
        return {"parse": 1, "url": self.host + id, "header": {"User-Agent": "Mozilla/5.0"}}
