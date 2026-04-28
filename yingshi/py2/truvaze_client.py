#!/usr/bin/python
# -*- coding: utf-8 -*-
import json
from urllib.parse import quote

try:
    import requests
except:
    pass

BASE = "https://truvaze.com"
API = BASE + "/api/media"
UA = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.7444.235 Safari/537.36",
    "Referer": BASE + "/",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.8,zh-TW;q=0.7,zh-HK;q=0.5,en-US;q=0.3,en;q=0.2",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1"
}

def _get_api(params):
    try:
        max_retries = 3
        for retry in range(max_retries):
            try:
                r = requests.get(API, params=params, headers=UA, timeout=30, verify=False)
                return r.json()
            except requests.exceptions.RequestException:
                if retry == max_retries - 1:
                    return {"items": [], "currentPage": 1, "lastPage": 1, "total": 0, "perPage": 50}
                continue
    except:
        return {"items": [], "currentPage": 1, "lastPage": 1, "total": 0, "perPage": 50}

def _format_time(seconds):
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    seconds = seconds % 60
    if hours > 0:
        return f"{hours}:{minutes:02d}:{seconds:02d}"
    else:
        return f"{minutes}:{seconds:02d}"

class Spider:
    def init(self, extend=""):
        self.site_url = BASE
    def homeContent(self, filter):
        categories = [
            {"type_id": "daily", "type_name": "每日"},
            {"type_id": "weekly", "type_name": "每周"},
            {"type_id": "monthly", "type_name": "每月"},
            {"type_id": "all", "type_name": "所有时间"}
        ]
        params = {"range": "", "page": 1, "per_page": 50, "category": "", "ids": "", "isAnimeOnly": 0, "sort": "favorite"}
        data = _get_api(params)
        items = []
        for item in data.get("items", []):
            account = item.get('tweet_account')
            account = account if account else "未知用户"
            thumbnail = item.get("thumbnail", "")
            # 确保thumbnail是字符串且不为None
            thumbnail = str(thumbnail) if thumbnail else ""
            items.append({
                "vod_id": str(item.get("id")),
                "vod_name": f"{account} - {_format_time(item.get('time', 0))}",
                "vod_pic": thumbnail
            })
        return {"class": categories, "list": items, "filters": {}}
    def categoryContent(self, tid, pg, filter, extend):
        range_map = {
            "daily": "daily",
            "weekly": "weekly",
            "monthly": "monthly",
            "all": "all"
        }
        params = {
            "range": range_map.get(tid, ""),
            "page": pg,
            "per_page": 50,
            "category": "",
            "ids": "",
            "isAnimeOnly": 0,
            "sort": "favorite"
        }
        data = _get_api(params)
        items = []
        for item in data.get("items", []):
            account = item.get('tweet_account')
            account = account if account else "未知用户"
            thumbnail = item.get("thumbnail", "")
            # 确保thumbnail是字符串且不为None
            thumbnail = str(thumbnail) if thumbnail else ""
            items.append({
                "vod_id": str(item.get("id")),
                "vod_name": f"{account} - {_format_time(item.get('time', 0))}",
                "vod_pic": thumbnail
            })
        return {
            "page": int(pg),
            "pagecount": data.get("lastPage", 1),
            "limit": data.get("perPage", 50),
            "count": len(items),
            "list": items
        }
    def detailContent(self, ids):
        result = {"list": []}
        for vid in ids:
            try:
                params = {"ids": vid}
                data = _get_api(params)
                if not data.get("items"):
                    continue
                item = data.get("items")[0]
                account = item.get('tweet_account')
                account = account if account else "未知用户"
                name = f"{account} - {_format_time(item.get('time', 0))}"
                pic = item.get("thumbnail", "")
                # 确保pic是字符串且不为None
                pic = str(pic) if pic else ""
                video_url = item.get("url", "")
                sources = ["默认"]
                episodes = [f"播放${video_url}"]
                result["list"].append({
                    "vod_id": vid,
                    "vod_name": name,
                    "vod_pic": pic,
                    "vod_play_from": "$$$".join(sources),
                    "vod_play_url": "$$$".join(episodes)
                })
            except:
                continue
        return result
    def searchContent(self, key, quick, pg="1"):
        return {"list": [], "page": int(pg)}
    def playerContent(self, flag, id, vipFlags):
        # 确保id是字符串且不为None
        id = str(id) if id else ""
        return {"parse": 0, "url": id}
