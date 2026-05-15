# -*- coding: utf-8 -*-
# @name AAZ音乐网
# @author 梦
# @description 音乐站：https://www.aaz.cx/ ，支持榜单首页、搜索、歌曲详情与在线试听
# @version 1.0.6
# @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/音乐/AAZ音乐网.py
# @dependencies requests,lxml

import json
import os
import re
from urllib.parse import quote

from spider_runner import OmniBox, run

# ==================== 配置区域开始 ====================
HOST = str(os.environ.get("AAZ_HOST") or "https://www.aaz.cx").rstrip("/")
UA = str(os.environ.get("AAZ_UA") or "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0")
SEARCH_REFERER = f"{HOST}/search"
DOWNLOAD_API = str(os.environ.get("AAZ_DOWNLOAD_API") or "https://api.5bb3.com/api.php")
DEFAULT_LIMIT = max(1, int(os.environ.get("AAZ_DEFAULT_LIMIT", "20") or 20))
# ==================== 配置区域结束 ====================

CLASS_LIST = [
    {"type_id": "new", "type_name": "新歌榜"},
    {"type_id": "top", "type_name": "TOP榜单"},
    {"type_id": "singer", "type_name": "歌手"},
    {"type_id": "playtype", "type_name": "歌单"},
    {"type_id": "album", "type_name": "专辑"},
    {"type_id": "mv", "type_name": "高清MV"},
]

SITE_HEADERS = {
    "User-Agent": UA,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Cache-Control": "max-age=0",
    "DNT": "1",
    "Upgrade-Insecure-Requests": "1",
    "sec-ch-ua": '"Microsoft Edge";v="147", "Not.A/Brand";v="8", "Chromium";v="147"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "Referer": f"{HOST}/",
}


def safe_text(value):
    return str(value or "").strip()


async def log(level: str, message: str):
    try:
        await OmniBox.log(level, message)
    except Exception:
        pass


def abs_url(url: str) -> str:
    raw = safe_text(url)
    if not raw:
        return ""
    if raw.startswith("http://") or raw.startswith("https://"):
        return raw
    if raw.startswith("//"):
        return f"https:{raw}"
    if raw.startswith("/"):
        return f"{HOST}{raw}"
    return f"{HOST}/{raw.lstrip('./')}"


async def request_text(url: str, method: str = "GET", data=None, headers_override=None) -> str:
    headers = dict(SITE_HEADERS)
    if headers_override:
        headers.update(headers_override)
    res = await OmniBox.request(
        url,
        {
            "method": method,
            "headers": headers,
            "body": data,
            "timeout": 20000,
        },
    )
    status = int(res.get("statusCode") or 0)
    body = res.get("body", "")
    text = body.decode("utf-8", "ignore") if isinstance(body, (bytes, bytearray)) else str(body or "")
    if status != 200:
        raise RuntimeError(f"HTTP {status} @ {url}")
    return text


async def request_json(url: str, headers_override=None):
    text = await request_text(url, headers_override=headers_override)
    return json.loads(text or "{}")


def extract_song_id_from_href(href: str) -> str:
    raw = safe_text(href)
    m = re.search(r"/m/([^.]+)\.html", raw)
    return m.group(1) if m else ""


def parse_song_list(html_text: str):
    blocks = re.findall(r'<li>\s*(.*?)</li>', html_text, re.S | re.I)
    songs = []
    seen = set()
    for block in blocks:
        href_m = re.search(r'<div class="name">\s*<a href="([^"]+)"[^>]*title="([^"]+)"', block, re.I | re.S)
        if not href_m:
            continue
        href = href_m.group(1)
        full_title = safe_text(href_m.group(2))
        song_id = extract_song_id_from_href(href)
        if not song_id or song_id in seen:
            continue
        seen.add(song_id)

        mv_m = re.search(r'<div class="mv">\s*<a href="([^"]+)"', block, re.I | re.S)
        remarks = "高清MV" if mv_m else ""

        songs.append(
            {
                "vod_id": song_id,
                "vod_name": full_title,
                "vod_pic": "",
                "vod_remarks": remarks,
            }
        )
    return songs


def parse_folder_list(html_text: str, href_prefix: str, remark: str):
    blocks = re.findall(r'<li>\s*<div class="pic">(.*?)</li>', html_text, re.S | re.I)
    items = []
    seen = set()
    for block in blocks:
        href_m = re.search(r'<div class="name">\s*<a href="([^"]+)"[^>]*title="([^"]+)"', block, re.I | re.S)
        if not href_m:
            continue
        href = href_m.group(1)
        title = safe_text(href_m.group(2))
        if not href or not title or not href.startswith(href_prefix) or href in seen:
            continue
        seen.add(href)
        img_m = re.search(r'<img src="([^"]+)"', block, re.I)
        items.append({
            "vod_id": abs_url(href),
            "vod_name": title,
            "vod_pic": abs_url(img_m.group(1)) if img_m else "",
            "vod_remarks": remark,
            "type_name": remark,
        })
    return items


def parse_folder_detail_song_list(html_text: str):
    blocks = re.findall(r'<li>\s*(.*?)</li>', html_text, re.S | re.I)
    episodes = []
    seen = set()
    for block in blocks:
        href_m = re.search(r'<div class="name">\s*<a href="([^"]+)"[^>]*title="([^"]+)"', block, re.I | re.S)
        if not href_m:
            continue
        href = href_m.group(1)
        title = safe_text(href_m.group(2))
        song_id = extract_song_id_from_href(href)
        if not song_id or song_id in seen:
            continue
        seen.add(song_id)
        episodes.append({"name": title or song_id, "playId": song_id})
    return episodes


def parse_song_detail(html_text: str, song_id: str):
    title_m = re.search(r'<div class="djname"><h1>(.*?)<a href="javascript:location\.reload\(\)"', html_text, re.S | re.I)
    song_name = safe_text(re.sub(r'<[^>]+>', ' ', title_m.group(1))) if title_m else song_id
    singer_m = re.search(r'<div class="name"><a href="/s/[^"]+"[^>]*>([^<]+)</a></div>', html_text, re.I)
    album_m = re.search(r'所属专辑：<a href="/a/[^"]+"[^>]*>([^<]+)</a>', html_text, re.I)
    cover_m = re.search(r'<img class="rotate" id="mcover" src="([^"]+)"', html_text, re.I)
    duration_m = re.search(r'歌曲时长：([^<]+)</div>', html_text, re.I)
    desc_m = re.search(r'<meta name="description" content="([^"]+)"', html_text, re.I)

    # 试听地址：通常在内联脚本里
    play_urls = []
    for pat in [
        r'mp3\s*:\s*["\']([^"\']+)["\']',
        r'm4a\s*:\s*["\']([^"\']+)["\']',
        r'oga\s*:\s*["\']([^"\']+)["\']',
        r'setMedia\s*\(\s*\{([^}]+)\}\s*\)',
    ]:
        for match in re.findall(pat, html_text, re.I | re.S):
            if isinstance(match, str) and match.startswith("http"):
                if match not in play_urls:
                    play_urls.append(match)
            elif isinstance(match, str):
                for sub in re.findall(r'["\'](https?://[^"\']+)["\']', match, re.I):
                    if sub not in play_urls:
                        play_urls.append(sub)

    # 下载接口参数
    download_id_m = re.search(r"downloads\('([^']+)'\)", html_text, re.I)
    slow_id_m = re.search(r"lkdown\('([^']+)'\)", html_text, re.I)
    lyric_m = re.search(r'href="(/plug/down\.php\?ac=music&lk=lrc&id=[^"]+)"', html_text, re.I)

    return {
        "song_name": song_name,
        "singer": safe_text(singer_m.group(1)) if singer_m else "",
        "album": safe_text(album_m.group(1)) if album_m else "",
        "cover": abs_url(cover_m.group(1)) if cover_m else "",
        "duration": safe_text(duration_m.group(1)) if duration_m else "",
        "content": safe_text(desc_m.group(1)) if desc_m else "",
        "play_urls": play_urls,
        "download_id": safe_text(download_id_m.group(1)) if download_id_m else "",
        "slow_id": safe_text(slow_id_m.group(1)) if slow_id_m else "",
        "lyric_url": abs_url(lyric_m.group(1)) if lyric_m else "",
    }


async def fetch_download_list(download_id: str):
    if not download_id:
        return []
    url = f"{DOWNLOAD_API}?kid={quote(download_id)}"
    await log("info", f"[AAZ][download-api] {url}")
    data = await request_json(url, headers_override={"Accept": "application/json, text/plain, */*", "Referer": f"{HOST}/"})
    if int(data.get("code") or 0) != 200:
        return []
    items = data.get("list") if isinstance(data.get("list"), list) else []
    links = []
    for idx, item in enumerate(items, start=1):
        link = safe_text(item.get("url"))
        if not link:
            continue
        name = safe_text(item.get("name")) or f"下载资源{idx}"
        pwd = safe_text(item.get("pwd"))
        if pwd:
            name = f"{name} 提取码:{pwd}"
        links.append({"name": name, "url": link})
    return links


async def fetch_song_play_info(song_id: str):
    if not song_id:
        return {}
    body = f"id={quote(song_id)}&type=music"
    text = await request_text(
        f"{HOST}/js/play.php",
        method="POST",
        data=body,
        headers_override={
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "X-Requested-With": "XMLHttpRequest",
            "Referer": f"{HOST}/m/{song_id}.html",
        },
    )
    try:
        return json.loads(text or "{}")
    except Exception:
        return {}


async def home(params=None, context=None):
    try:
        text = await request_text(f"{HOST}/list/new.html")
        songs = parse_song_list(text)[:24]
        await log("info", f"[AAZ][home] count={len(songs)}")
        return {"class": CLASS_LIST, "filters": {}, "list": songs}
    except Exception as e:
        await log("error", f"[AAZ][home] {e}")
        return {"class": CLASS_LIST, "filters": {}, "list": []}


async def category(params, context):
    try:
        tid = safe_text(params.get("categoryId") or params.get("type_id") or "new")
        page = max(1, int(params.get("page") or 1))
        path_map = {
            "new": "/list/new.html",
            "top": "/list/top.html",
            "singer": "/singerlist/index/index/index/index.html",
            "playtype": "/playtype/index.html",
            "album": "/albumlist/index.html",
            "mv": "/mvlist/index.html",
        }
        path = path_map.get(tid, "/list/new.html")
        text = await request_text(f"{HOST}{path}")

        if tid in ("new", "top"):
            items = parse_song_list(text)
        elif tid == "singer":
            items = parse_folder_list(text, "/s/", "歌手")
        elif tid == "playtype":
            items = parse_folder_list(text, "/p/", "歌单")
        elif tid == "album":
            items = parse_folder_list(text, "/a/", "专辑")
        elif tid == "mv":
            items = parse_folder_list(text, "/v/", "MV")
        else:
            items = parse_song_list(text)

        return {"page": page, "pagecount": 1, "limit": DEFAULT_LIMIT, "total": len(items), "list": items}
    except Exception as e:
        await log("error", f"[AAZ][category] {e}")
        return {"page": 1, "pagecount": 1, "limit": DEFAULT_LIMIT, "total": 0, "list": []}


async def search(params, context):
    try:
        keyword = safe_text(params.get("wd") or params.get("keyword"))
        page = max(1, int(params.get("page") or 1))
        if not keyword:
            return {"page": 1, "pagecount": 1, "limit": DEFAULT_LIMIT, "total": 0, "list": []}
        text = await request_text(f"{HOST}/so/{quote(keyword)}.html")
        songs = parse_song_list(text)
        return {"page": page, "pagecount": 1, "limit": DEFAULT_LIMIT, "total": len(songs), "list": songs}
    except Exception as e:
        await log("error", f"[AAZ][search] {e}")
        return {"page": 1, "pagecount": 1, "limit": DEFAULT_LIMIT, "total": 0, "list": []}


async def detail(params, context):
    try:
        raw_id = safe_text(params.get("videoId") or params.get("vod_id") or params.get("id"))
        if not raw_id:
            return {"list": []}

        # 单曲详情页
        if not raw_id.startswith("http"):
            text = await request_text(f"{HOST}/m/{raw_id}.html")
            detail_info = parse_song_detail(text, raw_id)
            play_info = await fetch_song_play_info(raw_id)

            play_sources = []
            play_url = safe_text(play_info.get("url"))
            if play_url:
                play_sources.append({
                    "name": "在线试听",
                    "episodes": [{"name": "播放", "playId": play_url}],
                })

            item = {
                "vod_id": raw_id,
                "vod_name": detail_info["song_name"],
                "vod_pic": safe_text(play_info.get("pic")) or detail_info["cover"],
                "vod_remarks": " | ".join([x for x in [detail_info["singer"], detail_info["album"], detail_info["duration"]] if x]),
                "vod_content": detail_info["content"],
                "vod_play_sources": play_sources,
            }
            return {"list": [item]}

        # 二级文件夹详情：歌手 / 歌单 / 专辑 / MV
        text = await request_text(raw_id)
        title_m = re.search(r'<div class="title">\s*<h1>(.*?)</h1>', text, re.I | re.S)
        page_title = safe_text(re.sub(r'<[^>]+>', ' ', title_m.group(1))) if title_m else raw_id
        pic_m = re.search(r'<div class="pic">\s*<img src="([^"]+)"', text, re.I | re.S)
        page_pic = abs_url(pic_m.group(1)) if pic_m else ""
        content = safe_text(re.sub(r'<[^>]+>', ' ', re.search(r'<div class="info">(.*?)</div>', text, re.I | re.S).group(1))) if re.search(r'<div class="info">(.*?)</div>', text, re.I | re.S) else ""

        episodes = parse_folder_detail_song_list(text)
        play_sources = []
        if episodes:
            play_sources.append({"name": "歌曲列表", "episodes": episodes})

        item = {
            "vod_id": raw_id,
            "vod_name": page_title,
            "vod_pic": page_pic,
            "vod_remarks": "二级文件夹",
            "vod_content": content,
            "vod_play_sources": play_sources,
        }
        return {"list": [item]}
    except Exception as e:
        await log("error", f"[AAZ][detail] {e}")
        return {"list": []}


async def play(params, context):
    try:
        play_id = safe_text(params.get("playId") or params.get("id"))
        await log("info", f"[AAZ][play] {play_id}")

        final_url = play_id
        # 二级文件夹里的 episode 传的是 song_id，这里补一次真实试听地址解析
        if play_id and not play_id.startswith("http"):
            play_info = await fetch_song_play_info(play_id)
            final_url = safe_text(play_info.get("url"))
            await log("info", f"[AAZ][play] resolved song_id={play_id} -> {final_url}")

        return {
            "parse": 0,
            "url": final_url,
            "urls": [{"name": "播放", "url": final_url}] if final_url else [],
            "header": {"User-Agent": UA, "Referer": f"{HOST}/"},
        }
    except Exception as e:
        await log("error", f"[AAZ][play] {e}")
        return {"parse": 0, "url": "", "urls": [], "header": {}}


run(
    {
        "home": home,
        "category": category,
        "search": search,
        "detail": detail,
        "play": play,
    }
)
