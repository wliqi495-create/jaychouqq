# -*- coding: utf-8 -*-
import re
import json
import urllib.parse
import sys

sys.path.append('..')
from base.spider import Spider


class Spider(Spider):
    def getName(self):
        return "华视影院"

    def init(self, extend=""):
        self.site_url = "https://huavod.com"
        self.player_url = "https://newplayer.huavod.com"
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": self.site_url + "/"
        }
        self.categories = [
            {"type_id": "1", "type_name": "电影"},
            {"type_id": "2", "type_name": "电视剧"},
            {"type_id": "3", "type_name": "综艺"},
            {"type_id": "4", "type_name": "动漫"},
            {"type_id": "5", "type_name": "短剧"},
            {"type_id": "42", "type_name": "纪录片"},
            {"type_id": "6", "type_name": "奇幻科幻"},
            {"type_id": "10", "type_name": "战争犯罪"},
            {"type_id": "8", "type_name": "悬疑恐怖惊悚"},
            {"type_id": "9", "type_name": "爱情喜剧剧情"},
            {"type_id": "7", "type_name": "动作冒险灾难"},
            {"type_id": "11", "type_name": "动画电影"},
            {"type_id": "12", "type_name": "网络电影"},
            {"type_id": "13", "type_name": "其他"},
            {"type_id": "53", "type_name": "4K影库"}
        ]
        self.filters = {
            "1": [
                {"key": "area", "name": "地区", "value": [
                    {"n": "全部", "v": ""}, {"n": "大陆", "v": "/area/大陆"},
                    {"n": "香港", "v": "/area/香港"}, {"n": "台湾", "v": "/area/台湾"},
                    {"n": "美国", "v": "/area/美国"}, {"n": "韩国", "v": "/area/韩国"},
                    {"n": "日本", "v": "/area/日本"}, {"n": "法国", "v": "/area/法国"},
                    {"n": "英国", "v": "/area/英国"}, {"n": "德国", "v": "/area/德国"},
                    {"n": "泰国", "v": "/area/泰国"}, {"n": "印度", "v": "/area/印度"},
                    {"n": "其他", "v": "/area/其他"}
                ]},
                {"key": "year", "name": "年份", "value": [
                    {"n": "全部", "v": ""}, {"n": "2026", "v": "/year/2026"},
                    {"n": "2025", "v": "/year/2025"}, {"n": "2024", "v": "/year/2024"},
                    {"n": "2023", "v": "/year/2023"}, {"n": "2022", "v": "/year/2022"},
                    {"n": "2021", "v": "/year/2021"}, {"n": "2020", "v": "/year/2020"},
                    {"n": "2019", "v": "/year/2019"}, {"n": "2018", "v": "/year/2018"},
                    {"n": "2010年代", "v": "/year/2010"}
                ]},
                {"key": "lang", "name": "语言", "value": [
                    {"n": "全部", "v": ""}, {"n": "国语", "v": "/lang/国语"},
                    {"n": "英语", "v": "/lang/英语"}, {"n": "粤语", "v": "/lang/粤语"},
                    {"n": "韩语", "v": "/lang/韩语"}, {"n": "日语", "v": "/lang/日语"},
                    {"n": "其他", "v": "/lang/其他"}
                ]},
                {"key": "by", "name": "排序", "value": [
                    {"n": "时间", "v": "/by/time"}, {"n": "评分", "v": "/by/score"},
                    {"n": "人气", "v": "/by/hits"}
                ]}
            ]
        }

    def _get(self, url):
        try:
            import requests
            resp = requests.get(url, headers=self.headers, timeout=15)
            resp.encoding = resp.apparent_encoding or "utf-8"
            return resp.text
        except:
            return ""

    def _post(self, url, data, headers=None):
        try:
            import requests
            h = {**self.headers, **(headers or {}), "Content-Type": "application/x-www-form-urlencoded"}
            resp = requests.post(url, data=data, headers=h, timeout=15)
            return resp.json()
        except:
            return {}

    def _parse_list(self, html):
        if not html:
            return []
        results, seen = [], set()
        matches = re.findall(r'<a[^>]*href="(/voddetail/(\d+)\.html)"[^>]*title="([^"]+)"', html)
        if not matches:
            matches = re.findall(r'href="(/voddetail/(\d+)\.html)"[^>]*>[^<]*<img[^>]*title="([^"]+)"', html)
        for m in matches:
            vid = m[1]
            if vid in seen:
                continue
            seen.add(vid)
            pic = ""
            pic_m = re.search(r'href="/voddetail/%s\.html"[^>]*>.*?(?:data-src|src)="([^"]*(?:jpg|png|jpeg|webp)[^"]*)"' % vid, html, re.S)
            if pic_m:
                pic = pic_m.group(1)
            remark = ""
            block = re.search(r'<div[^>]*class="public-list-box[^>]*>.*?href="/voddetail/%s\.html.*?</div>\s*</div>\s*</div>' % vid, html, re.S)
            if block:
                rm = re.search(r'class="public-list-prb[^>]*>.*?<i[^>]*>([^<]+)</i>', block.group(0), re.S)
                if not rm:
                    rm = re.search(r'class="public-list-prb[^>]*>([^<]+)<', block.group(0))
                if rm:
                    remark = rm.group(1).strip()
            results.append({"vod_id": vid, "vod_name": m[2].strip(), "vod_pic": pic, "vod_remarks": remark})
        return results

    def homeContent(self, filter=True):
        result = {"class": self.categories, "list": [], "filters": self.filters}
        html = self._get(self.site_url)
        if html:
            result["list"] = self._parse_list(html)[:30]
        return result

    def homeVideoContent(self):
        html = self._get(self.site_url)
        return {"list": self._parse_list(html)[:30] if html else []}

    def categoryContent(self, tid, pg=1, filter=True, extend=None):
        page = int(pg) if str(pg).isdigit() else 1
        extra = ""
        if isinstance(extend, dict):
            for k in ["area", "year", "lang", "by"]:
                v = extend.get(k, "")
                if v and v.startswith("/"):
                    extra += v
        elif isinstance(extend, str) and extend:
            extra = extend
        url = f"{self.site_url}/vodshow/{tid}{extra}"
        if page > 1:
            url += f"/page/{page}"
        url += ".html"
        html = self._get(url)
        return {"page": page, "pagecount": 999, "limit": 30, "total": 999, "list": self._parse_list(html)}

    def detailContent(self, ids):
        result = {"list": []}
        for raw_id in ids:
            vod_id = str(raw_id).split("_")[0]
            url = f"{self.site_url}/voddetail/{vod_id}.html"
            html = self._get(url)
            if not html:
                continue

            ld_match = re.search(r'<script type="application/ld\+json">(.*?)</script>', html, re.DOTALL)
            name = pic = desc = genre = year = director = actor = ""
            if ld_match:
                try:
                    ld = json.loads(ld_match.group(1))
                    name = ld.get("name", "")
                    pic = ld.get("image", "")
                    desc = (ld.get("description", "") or "")[:200]
                    genre = ld.get("genre", [])
                    if isinstance(genre, list):
                        genre = ",".join(genre[:3])
                    year = (ld.get("datePublished", "") or "")[:4]
                    d = ld.get("director", {})
                    if isinstance(d, dict):
                        director = d.get("name", "")
                    elif isinstance(d, list):
                        director = "|".join([x.get("name", "") for x in d[:3]])
                    ac = ld.get("actor", [])
                    if isinstance(ac, list):
                        actor = "|".join([x.get("name", "") for x in ac[:8]])
                except:
                    pass
            if not name:
                m = re.search(r'<h1[^>]*>([^<]+)</h1>', html)
                if m:
                    name = re.sub(r'\s*[-–].*$', '', m.group(1)).strip()
            if not pic:
                m = re.search(r'(?:data-src|src)="(https?://[^"]+(?:jpg|png|jpeg|webp)[^"]*)"', html)
                if m:
                    pic = m.group(1)

            route_names = re.findall(r'class="swiper-slide"[^>]*>\s*<i[^>]*></i>\s*&nbsp;([^<]+)</a>', html)
            if not route_names:
                route_names = re.findall(r'class="swiper-slide[^>]*>([^<]+)</a>', html)
                route_names = [n.strip().replace('\xa0', '') for n in route_names if n.strip()]

            idx = html.find('anthology-list')
            play_routes = {}
            if idx >= 0:
                segment = html[idx:]
                for tag in ['class="ads', '<footer', 'class="footer']:
                    end_idx = segment.find(tag)
                    if end_idx > 0:
                        segment = segment[:end_idx]
                        break
                parts = segment.split('anthology-list-box')
                for i, part in enumerate(parts[1:], 1):
                    rname = route_names[i - 1] if i - 1 < len(route_names) else f"线路{i}"
                    eps = re.findall(r'/vodplay/(\d+)-(\d+)-(\d+)\.html"[^>]*>([^<]+)<', part)
                    if eps:
                        play_routes[rname] = "#".join([f"{ep[3].strip()}${ep[0]}-{ep[1]}-{ep[2]}" for ep in eps])

            if not play_routes:
                eps = re.findall(r'/vodplay/(\d+)-(\d+)-(\d+)\.html"[^>]*>([^<]+)<', html)
                if eps:
                    play_routes["默认"] = "#".join([f"{ep[3].strip()}${ep[0]}-{ep[1]}-{ep[2]}" for ep in eps])

            vod = {
                "vod_id": vod_id, "vod_name": name, "vod_pic": pic, "vod_remarks": "",
                "vod_year": year, "vod_area": "", "vod_actor": actor, "vod_director": director,
                "vod_content": desc, "vod_play_from": "$$$".join(play_routes.keys()),
                "vod_play_url": "$$$".join(play_routes.values())
            }
            result["list"].append(vod)
        return result

    def searchContent(self, key, quick=False, pg="1"):
        page = int(pg) if str(pg).isdigit() else 1
        word = urllib.parse.quote(key)
        url = f"{self.site_url}/vodsearch.html?wd={word}&page={page}"
        html = self._get(url)
        return {"list": self._parse_list(html), "page": page}

    def playerContent(self, flag, id, vipFlags):
        import time
        parts = id.split("-")
        if len(parts) >= 3:
            vod_id, route, ep = parts[0], parts[1], parts[2]
        else:
            return {"parse": 0, "url": ""}
        play_url = f"{self.site_url}/vodplay/{vod_id}-{route}-{ep}.html"
        html = self._get(play_url)
        if not html:
            return {"parse": 0, "url": ""}

        m = re.search(r'var\s+mac_player_info\s*=\s*', html)
        if not m:
            return {"parse": 1, "url": play_url, "header": json.dumps(self.headers)}
        try:
            decoder = json.JSONDecoder()
            info, _ = decoder.raw_decode(html, m.end())
        except:
            return {"parse": 1, "url": play_url, "header": json.dumps(self.headers)}

        enc_url = urllib.parse.quote(info.get("url", ""), safe="")
        from_name = info.get("from", "")
        ec_url = f"{self.player_url}/player/ec.php?code=ok&url={enc_url}&main_domain={urllib.parse.quote(play_url)}"
        ec_html = self._get(ec_url)
        if not ec_html:
            return {"parse": 1, "url": play_url, "header": json.dumps(self.headers)}

        token = ""
        tm = re.search(r'"token"\s*:\s*"([^"]+)"', ec_html)
        if tm:
            token = tm.group(1)
        if not token:
            return {"parse": 1, "url": play_url, "header": json.dumps(self.headers)}

        ad_duration_ms = 0
        am = re.search(r'"ad_duration_ms"\s*:\s*(\d+)', ec_html)
        if am:
            ad_duration_ms = int(am.group(1))

        initial_delay_ms = max(0, ad_duration_ms - 2000) if ad_duration_ms > 0 else 0
        if initial_delay_ms > 0:
            print(f"[华视影院] 等待广告 {initial_delay_ms}ms (ad_duration={ad_duration_ms}ms)")
            time.sleep(initial_delay_ms / 1000.0)

        api_url = f"{self.player_url}/index.php/api/resolve/url"
        api_headers = {"Origin": self.player_url, "Referer": f"{self.player_url}/player/ec.php"}

        max_retries = 5
        for attempt in range(max_retries):
            result = self._post(api_url, f"token={token}", api_headers)
            if result and result.get("code") == 1 and result.get("data", {}).get("url"):
                resolved_url = result["data"]["url"]
                print(f"[华视影院] 播放解析成功: {resolved_url[:60]}...")
                return {"parse": 0, "url": resolved_url, "header": json.dumps(self.headers)}
            if result and result.get("code") == 0 and result.get("data", {}).get("retry_after_ms"):
                retry_ms = min(result["data"]["retry_after_ms"], 35000)
                print(f"[华视影院] too early, 等待 {retry_ms}ms 后重试 ({attempt+1}/{max_retries})")
                time.sleep(retry_ms / 1000.0)
                continue
            if result and result.get("msg"):
                print(f"[华视影院] resolve失败: {result.get('msg')} ({attempt+1}/{max_retries})")
            else:
                print(f"[华视影院] resolve返回异常 ({attempt+1}/{max_retries})")
            if attempt < max_retries - 1:
                time.sleep(3)

        return {"parse": 1, "url": play_url, "header": json.dumps(self.headers)}