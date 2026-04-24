# coding=utf-8
"""
人人视频爬虫 - 基于已逆向的解密/签名体系
"""
import sys
import json
import time
import base64
import hashlib
import hmac
import requests
from bs4 import BeautifulSoup
from Crypto.Cipher import AES

sys.path.append('..')
from base.spider import Spider


class Spider(Spider):
    host = "https://m.yichengwlkj.com"
    api_host = "https://api.rrmj.plus"
    decrypt_key = "3b744389882a4067"
    sign_key = "ES513W0B1CsdUrR13Qk5EgDAKPeeKZY"

    categories_map = {
        "movie": {"type_name": "电影", "dramaType": "MOVIE"},
        "us":    {"type_name": "美剧", "dramaType": "TV", "area": "美国"},
        "kr":    {"type_name": "韩剧", "dramaType": "TV", "area": "韩国"},
        "th":    {"type_name": "泰剧", "dramaType": "TV", "area": "泰国"},
        "jp":    {"type_name": "日剧", "dramaType": "TV", "area": "日本"},
        "uk":    {"type_name": "英剧", "dramaType": "TV", "area": "英国"},
    }

    filters_schema = [
        {"key": "plotType", "name": "类型", "value": [
            {"n": "全部", "v": ""}, {"n": "剧情", "v": "剧情"}, {"n": "喜剧", "v": "喜剧"},
            {"n": "动作", "v": "动作"}, {"n": "爱情", "v": "爱情"}, {"n": "悬疑", "v": "悬疑"},
            {"n": "恐怖", "v": "恐怖"}, {"n": "科幻", "v": "科幻"}, {"n": "犯罪", "v": "犯罪"},
            {"n": "冒险", "v": "冒险"}, {"n": "动画", "v": "动画"}, {"n": "奇幻", "v": "奇幻"},
            {"n": "惊悚", "v": "惊悚"}, {"n": "战争", "v": "战争"}, {"n": "纪录片", "v": "纪录片"},
            {"n": "音乐", "v": "音乐"}, {"n": "家庭", "v": "家庭"}
        ]},
        {"key": "area", "name": "地区", "value": [
            {"n": "全部", "v": ""}, {"n": "美国", "v": "美国"}, {"n": "英国", "v": "英国"},
            {"n": "韩国", "v": "韩国"}, {"n": "泰国", "v": "泰国"}, {"n": "中国", "v": "中国"},
            {"n": "中国香港", "v": "中国香港"}, {"n": "中国台湾", "v": "中国台湾"}
        ]},
        {"key": "year", "name": "年份", "value": [
            {"n": "全部", "v": ""}, {"n": "2026", "v": "2026"}, {"n": "2025", "v": "2025"},
            {"n": "2024", "v": "2024"}, {"n": "2023", "v": "2023"}, {"n": "2022", "v": "2022"},
            {"n": "2021", "v": "2021"}, {"n": "2020", "v": "2020"}, {"n": "更早", "v": "2018"}
        ]},
        {"key": "sort", "name": "排序", "value": [
            {"n": "最热", "v": "hot"}, {"n": "最新", "v": "new"}, {"n": "评分", "v": "score"}
        ]},
    ]

    def init(self, extend=""):
        pass

    def _make_sign(self, method, url_path, params_dict, timestamp):
        """生成x-ca-sign签名头"""
        if params_dict:
            sorted_keys = sorted(params_dict.keys())
            param_str = "&".join(f"{k}={params_dict[k]}" for k in sorted_keys)
            full_url = f"{url_path}?{param_str}"
        else:
            full_url = url_path
        sign_str = f"{method.upper()}\naliId:\nct:web_applet\ncv:1.0.0\nt:{timestamp}\n{full_url}"
        signature = hmac.new(self.sign_key.encode(), sign_str.encode(), hashlib.sha256).digest()
        return base64.b64encode(signature).decode()

    def _decrypt(self, data_b64):
        """AES-ECB/PKCS7解密"""
        raw = base64.b64decode(data_b64)
        standard = base64.b64encode(raw).decode()
        cipher = AES.new(self.decrypt_key.encode(), AES.MODE_ECB)
        decrypted = cipher.decrypt(base64.b64decode(standard))
        pad_len = decrypted[-1]
        return json.loads(decrypted[:-pad_len].decode())

    def _get_headers(self, timestamp, sign):
        return {
            "Accept": "application/json, text/plain, */*",
            "Content-Type": "application/json",
            "clientVersion": "1.0.0",
            "clientType": "web_applet",
            "cv": "1.0.0",
            "ct": "web_applet",
            "deviceId": "8735A3FA-66F5-432F-B4F4-A6FF727AD573",
            "umid": "8735A3FA-66F5-432F-B4F4-A6FF727AD573",
            "token": "",
            "t": str(timestamp),
            "x-ca-sign": sign,
        }

    def _api_call(self, method, path, params=None, data=None):
        """
        完整的API调用：签名+请求+解密
        method: "GET" 或 "POST"
        path: 如 "/m-station/drama/recommend"
        params: GET参数字典 (用于签名和请求)
        data: POST请求体 (仅用于POST, JSON字符串)
        """
        ts = int(time.time() * 1000)
        sign = self._make_sign(method, path, params, ts)
        headers = self._get_headers(ts, sign)
        url = f"{self.api_host}{path}"

        if method == "GET":
            resp = requests.get(url, headers=headers, params=params, timeout=30)
        else:
            resp = requests.post(url, headers=headers, data=data, timeout=30)

        return self._decrypt(resp.text)

    def homeContent(self, filter):
        classes = [{"type_id": tid, "type_name": info["type_name"]}
                   for tid, info in self.categories_map.items()]
        filters = {tid: self.filters_schema for tid in self.categories_map}
        return {"class": classes, "filters": filters}

    def homeVideoContent(self):
        """
        首页推荐内容 - 通过 GET /m-station/drama/recommend 获取
        """
        try:
            result = self._api_call("GET", "/m-station/drama/recommend")
            items = result.get("data", {}).get("content", [])
            vod_list = []
            for item in items:
                drama_id = str(item.get("dramaId", ""))
                if not drama_id:
                    continue
                vod_list.append({
                    "vod_id": drama_id,
                    "vod_name": item.get("title", ""),
                    "vod_pic": item.get("coverUrl", ""),
                    "vod_remarks": item.get("subTitle", ""),
                })
            return {"list": vod_list}
        except Exception as e:
            return {"list": []}

    def categoryContent(self, tid, pg, filter, extend):
        cat = self.categories_map.get(tid)
        if not cat:
            return {"list": [], "page": 1, "pagecount": 1, "limit": 30, "total": 0}

        params = {
            "page": int(pg) if pg else 1,
            "rows": 30,
            "dramaType": cat.get("dramaType", ""),
            "area": "",
            "year": "",
            "plotType": "",
            "sort": "hot",
        }
        # 合并筛选参数
        if extend:
            for k in ["area", "year", "plotType", "sort"]:
                v = extend.get(k, "")
                if v:
                    params[k] = v
        # 如果分类指定了area且筛选没覆盖，使用分类默认area
        if not params.get("area") and cat.get("area"):
            params["area"] = cat["area"]

        try:
            result = self._api_call("POST", "/m-station/drama/drama_filter_search",
                                    data=json.dumps(params, ensure_ascii=False))
            items = result.get("data", [])
            total = result.get("recordsTotal", len(items))
            pagecount = max(1, (total + 29) // 30) if total else 1

            vod_list = []
            for item in items:
                vod_list.append({
                    "vod_id": str(item.get("dramaId", "")),
                    "vod_name": item.get("title", ""),
                    "vod_pic": item.get("coverUrl", ""),
                    "vod_remarks": item.get("subTitle", ""),
                })
            return {"list": vod_list, "page": params["page"],
                    "pagecount": pagecount, "limit": 30, "total": total}
        except Exception as e:
            return {"list": [], "page": 1, "pagecount": 1, "limit": 30, "total": 0}

    def detailContent(self, ids):
        vod_id = ids[0]
        url = f"{self.host}/drama/{vod_id}"

        try:
            # 从详情页HTML提取信息
            resp = self.fetch(url)
            soup = BeautifulSoup(resp.text, 'html.parser')

            # 从<title>标签提取标题: "黑上加黑 第四季-人人视频"
            title_text = ""
            title_tag = soup.find('title')
            if title_tag:
                raw = title_tag.get_text(strip=True)
                # 去除"-人人视频"后缀
                for suffix in ["-人人视频", " - 人人视频", "_人人视频"]:
                    if suffix in raw:
                        raw = raw.replace(suffix, "").strip()
                title_text = raw

            # 从API获取详细信息
            vod_name = title_text
            vod_pic = ""
            vod_content = ""
            episode_count = 0

            try:
                intro_result = self._api_call("GET", "/m-station/drama/intro",
                                              params={"dramaId": vod_id})
                intro_data = intro_result.get("data", {})
                if intro_data:
                    vod_content = intro_data.get("intro", "")
                    vod_pic = intro_data.get("coverUrl", intro_data.get("cover", ""))
                    if not vod_name:
                        vod_name = intro_data.get("title", intro_data.get("dramaName", ""))
                    episode_count = intro_data.get("episodeCount", intro_data.get("totalEpisode", 0))
            except:
                pass

            # 尝试从HTML提取封面图
            if not vod_pic:
                meta_img = soup.find('meta', property='og:image')
                if meta_img:
                    vod_pic = meta_img.get('content', '')

            # 构建剧集列表 - 默认优先级：intro接口返回的集数 > 页面元素 > 默认10集
            ep_list = []
            if episode_count > 0:
                ep_list = [str(i) for i in range(1, episode_count + 1)]
            else:
                # 尝试从页面提取选集按钮
                ep_btns = soup.select('button')
                for btn in ep_btns:
                    text = btn.get_text(strip=True)
                    if text.isdigit():
                        ep_list.append(text)
                if not ep_list:
                    ep_list = [str(i) for i in range(1, 11)]

            play_url = "#".join(f"第{ep}集{vod_id}_{ep}" for ep in ep_list)

            vod = {
                "vod_id": vod_id,
                "vod_name": vod_name,
                "vod_pic": vod_pic,
                "vod_content": vod_content,
                "vod_play_from": "线路1",
                "vod_play_url": play_url,
            }
            return {"list": [vod]}

        except Exception as e:
            vod = {
                "vod_id": vod_id,
                "vod_name": "",
                "vod_pic": "",
                "vod_content": "",
                "vod_play_from": "线路1",
                "vod_play_url": "第1集" + vod_id + "_1",
            }
            return {"list": [vod]}

    def searchContent(self, key, quick, pg="1"):
        params = {
            "page": int(pg) if pg else 1,
            "rows": 30,
            "dramaType": "",
            "area": "",
            "year": "",
            "plotType": "",
            "sort": "",
            "keyword": key,
        }
        try:
            result = self._api_call("POST", "/m-station/drama/drama_filter_search",
                                    data=json.dumps(params, ensure_ascii=False))
            items = result.get("data", [])
            total = result.get("recordsTotal", len(items))
            pagecount = max(1, (total + 29) // 30) if total else 1

            vod_list = []
            for item in items:
                vod_list.append({
                    "vod_id": str(item.get("dramaId", "")),
                    "vod_name": item.get("title", ""),
                    "vod_pic": item.get("coverUrl", ""),
                    "vod_remarks": item.get("subTitle", ""),
                })
            return {"list": vod_list, "page": int(pg), "pagecount": pagecount}
        except Exception:
            return {"list": [], "page": 1, "pagecount": 1}

    def playerContent(self, flag, id, vipFlags):
        """
        播放地址解析
        注意：播放页 /play/{vod_id}/{ep} 返回404，播放器完全客户端渲染。
        此处返回空URL，需要在后续逆向播放API后补全。
        备选方案：通过 /m-station/drama/play 接口（需要进一步逆向参数格式）。
        """
        parts = id.rsplit('_', 1)
        vod_id = parts[0]
        ep_num = parts[1] if len(parts) > 1 else "1"
        play_url = f"{self.host}/play/{vod_id}/{ep_num}"
        try:
            resp = self.fetch(play_url)
            soup = BeautifulSoup(resp.text, 'html.parser')
            video_tag = soup.select_one('video source')
            if video_tag and video_tag.get('src'):
                return {"parse": 0, "url": video_tag['src'],
                        "header": {"User-Agent": "Mozilla/5.0", "Referer": self.host + "/"}}
            iframe = soup.select_one('iframe')
            if iframe and iframe.get('src'):
                src = iframe['src']
                if src.startswith('//'):
                    src = 'https:' + src
                elif src.startswith('/'):
                    src = self.host + src
                return {"parse": 1, "url": src,
                        "header": {"User-Agent": "Mozilla/5.0", "Referer": self.host + "/"}}
        except:
            pass
        return {"parse": 0, "url": "",
                "header": {"User-Agent": "Mozilla/5.0", "Referer": self.host + "/"}}