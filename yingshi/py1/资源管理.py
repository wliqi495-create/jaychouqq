# 资源测试.py - 智能多策略封面提取版（含在线直播、在线电台、短视频、画廊功能）
# 说明：MP3/FLAC/M4A/AAC/OGG/WAV 多策略提取内置封面，优先使用本地同名图片

import sys
import re
import json
import os
import base64
import hashlib
import time
import urllib.parse
import sqlite3
import glob
import zlib
import xml.etree.ElementTree as ET
import random
import struct
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from base.spider import Spider
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# ==================== 电视直播封面图片 ====================
TV_COVER = "https://p2.ssl.qhimgs1.com/bdr/460__/t045d2cbb68401612b2.png"

# ==================== 在线直播配置 ====================
ONLINE_LIVE_SOURCES = [
    {
        "id": "migu_live",
        "name": "📺 咪咕直播",
        "url": "https://gh-proxy.org/https://raw.githubusercontent.com/develop202/migu_video/refs/heads/main/interface.txt",
        "cover": TV_COVER,
        "remarks": "央视/卫视直播",
        "type": "m3u",
        "playerType": 2,
        "ua": "com.android.chrome/3.7.0 (Linux;Android 15)",
        "referer": "https://www.miguvideo.com/"
    },
    {
        "id": "gongdian_live",
        "name": "🏛️ 宫殿直播",
        "url": "https://gongdian.top/tv/iptv",
        "cover": TV_COVER,
        "remarks": "宫殿直播源",
        "type": "m3u",
        "playerType": 2,
        "ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "referer": "https://gongdian.top/"
    },
    {
        "id": "simple_live",
        "name": "✨ 简单直播",
        "url": "http://gh-proxy.org/raw.githubusercontent.com/Supprise0901/TVBox_live/main/live.txt",
        "cover": TV_COVER,
        "remarks": "简单直播源",
        "type": "txt",
        "ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    },
    {
        "id": "kulao_tv",
        "name": "👖 裤佬TV直播",
        "url": "https://gh-proxy.org/https://raw.githubusercontent.com/Jsnzkpg/Jsnzkpg/Jsnzkpg/Jsnzkpg1.m3u",
        "cover": TV_COVER,
        "remarks": "裤佬TV直播源",
        "type": "m3u",
        "playerType": 2,
        "ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
]

LIVE_CATEGORY_ID = "online_live"
LIVE_CATEGORY_NAME = "📺 电视直播"
LIVE_CACHE_DURATION = 600

# ==================== 全局请求头自动适配配置 ====================
COMMON_HEADERS_LIST = [
    {
        "name": "Chrome浏览器",
        "headers": {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "*/*",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            "Connection": "keep-alive"
        }
    },
    {
        "name": "Firefox浏览器",
        "headers": {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0",
            "Accept": "*/*",
            "Accept-Language": "zh-CN,zh;q=0.8,en-US;q=0.5,en;q=0.3",
            "Connection": "keep-alive"
        }
    },
    {
        "name": "okhttp/3",
        "headers": {
            "User-Agent": "okhttp/3.12.11",
            "Accept": "*/*",
            "Connection": "Keep-Alive"
        }
    },
    {
        "name": "手机浏览器",
        "headers": {
            "User-Agent": "Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
            "Accept": "*/*",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            "Connection": "keep-alive"
        }
    },
    {
        "name": "Edge浏览器",
        "headers": {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
            "Accept": "*/*",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            "Connection": "keep-alive"
        }
    },
    {
        "name": "Safari浏览器",
        "headers": {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
            "Accept": "*/*",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            "Connection": "keep-alive"
        }
    },
    {
        "name": "Android Chrome",
        "headers": {
            "User-Agent": "Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
            "Accept": "*/*",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            "Connection": "keep-alive"
        }
    }
]

DOMAIN_SPECIFIC_HEADERS = {
    "miguvideo.com": [
        {
            "name": "咪咕专用-Android Chrome",
            "headers": {
                "User-Agent": "com.android.chrome/3.7.0 (Linux;Android 15)",
                "Accept": "*/*",
                "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
                "Connection": "keep-alive",
                "Referer": "https://www.miguvideo.com/"
            }
        },
        {
            "name": "咪咕专用-okhttp",
            "headers": {
                "User-Agent": "okhttp/3.12.11",
                "Accept": "*/*",
                "Connection": "Keep-Alive",
                "Referer": "https://www.miguvideo.com/"
            }
        }
    ],
    "gongdian.top": [
        {
            "name": "宫殿直播专用",
            "headers": {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Accept": "*/*",
                "Referer": "https://gongdian.top/",
                "Connection": "keep-alive"
            }
        }
    ],
    "t.061899.xyz": [
        {
            "name": "t源专用",
            "headers": {
                "User-Agent": "okhttp/3.12.11",
                "Referer": "http://t.061899.xyz/",
                "Accept": "*/*"
            }
        }
    ],
    "rihou.cc": [
        {
            "name": "日后源专用-Chrome",
            "headers": {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Referer": "https://rihou.cc:555/",
                "Accept": "*/*",
                "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
                "Connection": "keep-alive"
            }
        },
        {
            "name": "日后源专用-okhttp",
            "headers": {
                "User-Agent": "okhttp/3.12.11",
                "Referer": "http://rihou.cc:555/",
                "Accept": "*/*",
                "Connection": "Keep-Alive"
            }
        }
    ]
}

# ==================== 路径配置 ====================
ROOT_PATHS = [
    '/storage/emulated/0/',
    '/storage/emulated/0/Movies/',
    '/storage/emulated/0/Music/',
    '/storage/emulated/0/Download/KuwoMusic/music/',
    '/storage/emulated/0/Download/',
    '/storage/emulated/0/DCIM/Camera/',
    '/storage/emulated/0/Pictures/',
    '/storage/emulated/0/Books/',
    '/storage/emulated/0/VodPlus/wwwroot/lz/'
]

PATH_TO_CHINESE = {
    '/storage/emulated/0/': '根目录',
    '/storage/emulated/0/Movies/': '电影',
    '/storage/emulated/0/Music/': '音乐',
    '/storage/emulated/0/Download/KuwoMusic/music/': '酷我音乐',
    '/storage/emulated/0/Download/': '下载',
    '/storage/emulated/0/DCIM/Camera/': '相机',
    '/storage/emulated/0/Pictures/': '图片',
    '/storage/emulated/0/Books/': '小说',
    '/storage/emulated/0/VodPlus/wwwroot/lz/': '老张'
}

# ==================== 缓存路径配置 ====================
COVER_CACHE_DIR = '/storage/emulated/0/tmp/covers/'
LYRICS_CACHE_DIR = '/storage/emulated/0/tmp/lyrics/'
RADIO_COVER_CACHE_DIR = '/storage/emulated/0/tmp/radio_covers/'
RADIO_SCAN_RECORD_FILE = '/storage/emulated/0/tmp/radio_scan_record.json'
COVER_SCAN_RECORD_FILE = '/storage/emulated/0/tmp/cover_scan_record.json'

# 实时节目缓存时长（5分钟）
LIVE_PROGRAM_CACHE_DURATION = 300

# ==================== 数据库兼容配置 ====================
DB_COMPAT_MODE = True
MAX_DB_RESULTS = 50000

print("ℹ️ 本地资源管理加载成功 - 智能多策略封面提取版（含在线直播、在线电台、短视频、画廊功能）")


# ==================== 实时电台节目信息获取器 ====================
class RadioProgramFetcher:
    """实时电台节目信息获取器 - 每次打开详情时获取最新节目"""
    
    # 全局缓存
    _cache = {}
    _cache_time = {}
    
    @classmethod
    def get_current_program(cls, radio_id):
        """获取电台当前正在播放的节目信息（带5分钟缓存）"""
        cache_key = f"program_{radio_id}"
        current_time = time.time()
        
        if cache_key in cls._cache and current_time - cls._cache_time.get(cache_key, 0) < LIVE_PROGRAM_CACHE_DURATION:
            return cls._cache[cache_key]
        
        try:
            url = f"http://www.qingting.fm/radios/{radio_id}"
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Referer": "http://www.qingting.fm/",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
            }
            
            response = requests.get(url, headers=headers, timeout=10)
            response.encoding = 'utf-8'
            html = response.text
            
            program_info = cls._parse_current_program(html, radio_id)
            
            if program_info:
                cls._cache[cache_key] = program_info
                cls._cache_time[cache_key] = current_time
                return program_info
            
            return None
        except Exception as e:
            print(f"获取电台节目信息失败 {radio_id}: {e}")
            return None
    
    @classmethod
    def _parse_current_program(cls, html, radio_id):
        """解析当前播放的节目"""
        program = {
            'current': '正在播出',
            'next': '即将播出',
            'current_time': '',
            'next_time': ''
        }
        
        try:
            current_patterns = [
                r'正在播放[：:]\s*<[^>]*>([^<]+)</',
                r'current-program[^>]*>.*?<span[^>]*>([^<]+)</span>',
                r'节目[：:]\s*([^<>\n]+)',
                r'"programName"\s*:\s*"([^"]+)"',
                r'<div class="program-name"[^>]*>([^<]+)</div>',
                r'<div class="current"[^>]*>.*?<a[^>]*>([^<]+)</a>',
                r'<span class="program-title">([^<]+)</span>',
                r'<div class="radio-info">.*?<strong>([^<]+)</strong>',
            ]
            
            for pattern in current_patterns:
                match = re.search(pattern, html, re.IGNORECASE | re.DOTALL)
                if match:
                    program['current'] = match.group(1).strip()
                    break
            
            time_patterns = [
                r'(\d{1,2}:\d{2})\s*[-~]\s*(\d{1,2}:\d{2})',
                r'(\d{1,2}:\d{2})\s*至\s*(\d{1,2}:\d{2})',
                r'(\d{1,2}:\d{2})-(\d{1,2}:\d{2})',
            ]
            for pattern in time_patterns:
                match = re.search(pattern, html)
                if match:
                    program['current_time'] = f"{match.group(1)}-{match.group(2)}"
                    break
            
            next_patterns = [
                r'即将播放[：:]\s*<[^>]*>([^<]+)</',
                r'next-program[^>]*>.*?<span[^>]*>([^<]+)</span>',
                r'下一节目[：:]\s*([^<>\n]+)',
                r'<div class="next-program">.*?<span>([^<]+)</span>',
            ]
            for pattern in next_patterns:
                match = re.search(pattern, html, re.IGNORECASE | re.DOTALL)
                if match:
                    program['next'] = match.group(1).strip()
                    break
            
            for key in ['current', 'next']:
                program[key] = re.sub(r'<[^>]+>', '', program[key])
                program[key] = re.sub(r'\s+', ' ', program[key]).strip()
                if len(program[key]) > 50:
                    program[key] = program[key][:47] + '...'
            
            if program['current'] == '正在播出' or len(program['current']) < 2:
                program['current'] = cls._get_time_based_program(radio_id)
            
            return program
        except Exception as e:
            print(f"解析节目信息失败: {e}")
            return None
    
    @classmethod
    def _get_time_based_program(cls, radio_id):
        """根据时间段返回默认节目名称"""
        hour = time.localtime().tm_hour
        if 6 <= hour < 9:
            return "早安时段"
        elif 9 <= hour < 12:
            return "上午时段"
        elif 12 <= hour < 14:
            return "午间时段"
        elif 14 <= hour < 18:
            return "下午时段"
        elif 18 <= hour < 20:
            return "晚间时段"
        elif 20 <= hour < 23:
            return "黄金时段"
        else:
            return "深夜时段"


# ==================== 数据库读取器 ====================
class DatabaseReader:
    """数据库读取器"""
    
    def __init__(self):
        self.cache = {}
        self.cache_time = {}
        self.cache_duration = 600
    
    def read_sqlite(self, db_path, limit=50000):
        cache_key = f"{db_path}_{os.path.getmtime(db_path)}_{limit}"
        current_time = time.time()
        
        if cache_key in self.cache and current_time - self.cache_time.get(cache_key, 0) < self.cache_duration:
            print(f"📊 使用缓存数据: {os.path.basename(db_path)}, {len(self.cache[cache_key])} 条记录")
            return self.cache[cache_key]
        
        if not os.path.exists(db_path) or not os.access(db_path, os.R_OK):
            return []
        
        out = []
        try:
            conn = sqlite3.connect(db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            cursor.execute("PRAGMA cache_size = 10000")
            cursor.execute("PRAGMA page_size = 4096")
            cursor.execute("PRAGMA mmap_size = 30000000000")
            
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'android_%'")
            tables = cursor.fetchall()
            
            skip_tables = ['android_metadata', 'db_config', 'meta', 'crawl_state', 'sqlite_sequence']
            
            for table in tables:
                table_name = table[0]
                if table_name in skip_tables:
                    continue
                items = self.parse_table(cursor, conn, table_name, limit)
                if items:
                    out.extend(items)
                if len(out) >= limit:
                    out = out[:limit]
                    break
            
            conn.close()
        except Exception as e:
            print(f"数据库读取错误: {e}")
            return []
        
        self.cache[cache_key] = out
        self.cache_time[cache_key] = current_time
        return out
    
    def parse_table(self, cursor, conn, table, limit):
        res = []
        try:
            cursor.execute(f"PRAGMA table_info(`{table}`)")
            cols = cursor.fetchall()
            col_names = [col[1] for col in cols]
            
            title_field = self.find_best_match(col_names, ['vod_name', 'name', 'title'])
            url_field = self.find_best_match(col_names, ['play_url', 'vod_play_url', 'vod_url', 'url'])
            pic_field = self.find_best_match(col_names, ['image', 'vod_pic', 'pic'])
            remarks_field = self.find_best_match(col_names, ['vod_remarks', 'remarks'])
            
            if not title_field or not url_field:
                return []
            
            cursor.execute(f"SELECT * FROM `{table}` WHERE `{url_field}` IS NOT NULL AND `{url_field}` != '' LIMIT {limit}")
            rows = cursor.fetchall()
            
            for row in rows:
                row_dict = dict(row)
                play_url_raw = str(row_dict.get(url_field, '')).strip()
                if not play_url_raw:
                    continue
                
                title = str(row_dict.get(title_field, '未命名')).strip()
                
                is_multi = '$$$' in play_url_raw or '#' in play_url_raw
                
                item = {
                    'name': title,
                    'url': '' if is_multi else play_url_raw,
                    'play_url': play_url_raw if is_multi else '',
                    'pic': row_dict.get(pic_field, '') if pic_field else '',
                    'remarks': row_dict.get(remarks_field, '') if remarks_field else '',
                }
                res.append(item)
        except Exception as e:
            print(f"解析表 {table} 错误: {e}")
        return res
    
    def find_best_match(self, column_names, candidates):
        for cand in candidates:
            for col in column_names:
                if col.lower() == cand.lower():
                    return col
        for cand in candidates:
            for col in column_names:
                if cand.lower() in col.lower():
                    return col
        return None


# ==================== 小说解析器 ====================
class NovelParser:
    """小说文件解析器"""
    
    @staticmethod
    def parse_txt_novel(file_path):
        """解析TXT小说文件"""
        chapters = []
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            patterns = [
                r'第[一二三四五六七八九十百千万0-9]+章\s*[^\n]{0,50}',
                r'第[一二三四五六七八九十百千万0-9]+节\s*[^\n]{0,50}',
                r'序章\s*[^\n]{0,50}|楔子\s*[^\n]{0,50}|尾声\s*[^\n]{0,50}',
                r'正文\s+第[一二三四五六七八九十百千万0-9]+章',
                r'Chapter\s+[0-9]+[.:]?\s*[^\n]{0,50}'
            ]
            
            matches = []
            for p in patterns:
                for m in re.finditer(p, content, re.MULTILINE):
                    title = m.group().strip()
                    if title and len(title) > 2 and not title.strip().isdigit():
                        matches.append((m.start(), title))
            
            matches = list(set(matches))
            matches.sort(key=lambda x: x[0])
            
            if matches:
                for i, (pos, title) in enumerate(matches):
                    start = pos
                    end = matches[i + 1][0] if i + 1 < len(matches) else len(content)
                    chap_content = content[start:end].strip()
                    chapters.append({
                        'title': title,
                        'content': chap_content,
                        'index': i
                    })
            else:
                chapters.append({
                    'title': os.path.splitext(os.path.basename(file_path))[0],
                    'content': content,
                    'index': 0
                })
        except Exception as e:
            print(f"解析小说失败: {e}")
        return chapters


# ==================== 封面扫描记录管理器 ====================
class CoverScanRecord:
    """记录哪些歌曲已经缓存过封面，避免重复扫描"""
    
    @staticmethod
    def load_record():
        try:
            if os.path.exists(COVER_SCAN_RECORD_FILE):
                with open(COVER_SCAN_RECORD_FILE, 'r', encoding='utf-8') as f:
                    return json.load(f)
            return {}
        except:
            return {}
    
    @staticmethod
    def save_record(record):
        try:
            os.makedirs(os.path.dirname(COVER_SCAN_RECORD_FILE), exist_ok=True)
            with open(COVER_SCAN_RECORD_FILE, 'w', encoding='utf-8') as f:
                json.dump(record, f, ensure_ascii=False, indent=2)
        except:
            pass
    
    @staticmethod
    def is_cover_cached(audio_path):
        record = CoverScanRecord.load_record()
        file_hash = hashlib.md5(audio_path.encode()).hexdigest()
        return file_hash in record
    
    @staticmethod
    def mark_cover_cached(audio_path):
        record = CoverScanRecord.load_record()
        file_hash = hashlib.md5(audio_path.encode()).hexdigest()
        record[file_hash] = {
            'path': audio_path,
            'time': time.time(),
            'mtime': os.path.getmtime(audio_path) if os.path.exists(audio_path) else 0
        }
        CoverScanRecord.save_record(record)
    
    @staticmethod
    def clear_record():
        try:
            if os.path.exists(COVER_SCAN_RECORD_FILE):
                os.remove(COVER_SCAN_RECORD_FILE)
            return True
        except:
            return False


# ==================== 电台封面扫描记录管理器 ====================
class RadioCoverRecord:
    """记录哪些电台已经缓存过封面，避免重复下载"""
    
    @staticmethod
    def load_record():
        try:
            if os.path.exists(RADIO_SCAN_RECORD_FILE):
                with open(RADIO_SCAN_RECORD_FILE, 'r', encoding='utf-8') as f:
                    return json.load(f)
            return {}
        except:
            return {}
    
    @staticmethod
    def save_record(record):
        try:
            os.makedirs(os.path.dirname(RADIO_SCAN_RECORD_FILE), exist_ok=True)
            with open(RADIO_SCAN_RECORD_FILE, 'w', encoding='utf-8') as f:
                json.dump(record, f, ensure_ascii=False, indent=2)
        except:
            pass
    
    @staticmethod
    def is_cached(radio_id):
        record = RadioCoverRecord.load_record()
        return str(radio_id) in record
    
    @staticmethod
    def mark_cached(radio_id):
        record = RadioCoverRecord.load_record()
        record[str(radio_id)] = {
            'id': radio_id,
            'time': time.time()
        }
        RadioCoverRecord.save_record(record)
    
    @staticmethod
    def clear_record():
        try:
            if os.path.exists(RADIO_SCAN_RECORD_FILE):
                os.remove(RADIO_SCAN_RECORD_FILE)
            return True
        except:
            return False


# ==================== 歌词缓存管理器 ====================
class LyricsCacheManager:
    """歌词缓存管理器 - 仅缓存网络下载的歌词"""
    
    @staticmethod
    def get_cache_dir():
        try:
            os.makedirs(LYRICS_CACHE_DIR, exist_ok=True)
            print(f"📁 歌词缓存目录: {LYRICS_CACHE_DIR}")
            return LYRICS_CACHE_DIR
        except Exception as e:
            print(f"创建歌词缓存目录失败: {e}")
            alt_dir = "/storage/emulated/0/tmp/lyrics_backup/"
            os.makedirs(alt_dir, exist_ok=True)
            return alt_dir
    
    @staticmethod
    def get_safe_filename(song_name, artist_name=""):
        if artist_name and artist_name not in song_name:
            base_name = f"{song_name}_{artist_name}"
        else:
            base_name = song_name
        
        illegal_chars = r'[<>:"/\\|?*]'
        safe_name = re.sub(illegal_chars, '_', base_name)
        if len(safe_name) > 100:
            safe_name = safe_name[:100]
        return f"{safe_name}.lrc"
    
    @staticmethod
    def is_lyrics_cached(song_name, artist_name=""):
        cache_dir = LyricsCacheManager.get_cache_dir()
        filename = LyricsCacheManager.get_safe_filename(song_name, artist_name)
        filepath = os.path.join(cache_dir, filename)
        return os.path.exists(filepath)
    
    @staticmethod
    def save_lyrics(song_name, artist_name, lyrics_content):
        if not lyrics_content or len(lyrics_content) < 50:
            return False
        
        try:
            cache_dir = LyricsCacheManager.get_cache_dir()
            filename = LyricsCacheManager.get_safe_filename(song_name, artist_name)
            filepath = os.path.join(cache_dir, filename)
            
            header = f"# 歌曲: {song_name}\n# 歌手: {artist_name}\n# 缓存时间: {time.strftime('%Y-%m-%d %H:%M:%S')}\n# ====================================\n\n"
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(header + lyrics_content)
            
            print(f"📝 网络歌词已缓存: {filepath}")
            return True
        except Exception as e:
            print(f"保存歌词缓存失败: {e}")
            return False
    
    @staticmethod
    def load_lyrics(song_name, artist_name=""):
        try:
            cache_dir = LyricsCacheManager.get_cache_dir()
            filename = LyricsCacheManager.get_safe_filename(song_name, artist_name)
            filepath = os.path.join(cache_dir, filename)
            
            if os.path.exists(filepath):
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                lines = content.split('\n')
                lyrics_lines = []
                skip_meta = False
                for line in lines:
                    if line.startswith('# ===================================='):
                        skip_meta = True
                        continue
                    if skip_meta:
                        lyrics_lines.append(line)
                result = '\n'.join(lyrics_lines)
                if result and len(result) > 50:
                    print(f"📝 从缓存加载歌词: {filename}")
                    return result
            return None
        except Exception as e:
            print(f"加载歌词缓存失败: {e}")
            return None
    
    @staticmethod
    def delete_lyrics_cache(song_name=None, artist_name=""):
        cache_dir = LyricsCacheManager.get_cache_dir()
        deleted_count = 0
        deleted_size = 0
        
        try:
            if song_name:
                filename = LyricsCacheManager.get_safe_filename(song_name, artist_name)
                filepath = os.path.join(cache_dir, filename)
                if os.path.exists(filepath):
                    file_size = os.path.getsize(filepath)
                    os.remove(filepath)
                    deleted_count = 1
                    deleted_size = file_size
                    print(f"🗑️ 删除歌词缓存: {filename}")
            else:
                if os.path.exists(cache_dir):
                    for filename in os.listdir(cache_dir):
                        if filename.endswith('.lrc'):
                            filepath = os.path.join(cache_dir, filename)
                            file_size = os.path.getsize(filepath)
                            os.remove(filepath)
                            deleted_count += 1
                            deleted_size += file_size
                    print(f"🗑️ 已清空歌词缓存目录: {cache_dir}")
        except Exception as e:
            print(f"删除歌词缓存失败: {e}")
        
        return deleted_count, deleted_size


# ==================== 智能多策略封面提取器 ====================

class UltraFastCoverExtractor:
    """智能封面提取器 - 多策略保证最高成功率"""
    
    @staticmethod
    def _compress_image(image_data, max_size=(300, 300), quality=65):
        try:
            from PIL import Image
            import io
            img = Image.open(io.BytesIO(image_data))
            if img.mode in ('RGBA', 'LA', 'P'):
                img = img.convert('RGB')
            img.thumbnail(max_size, Image.Resampling.LANCZOS)
            buffer = io.BytesIO()
            img.save(buffer, format='JPEG', quality=quality, optimize=True)
            return buffer.getvalue()
        except:
            return image_data
    
    @staticmethod
    def _search_raw_image(file_path, max_size=5*1024*1024):
        try:
            file_size = os.path.getsize(file_path)
            
            search_size = min(file_size, 10 * 1024 * 1024)
            with open(file_path, 'rb') as f:
                data = f.read(search_size)
                
                jpeg_pos = data.find(b'\xff\xd8')
                if jpeg_pos != -1:
                    end_pos = data.find(b'\xff\xd9', jpeg_pos + 2)
                    if end_pos != -1 and end_pos > jpeg_pos:
                        image_data = data[jpeg_pos:end_pos+2]
                        if 500 < len(image_data) < max_size:
                            if len(image_data) > 1024 * 1024:
                                image_data = UltraFastCoverExtractor._compress_image(image_data)
                            return f"data:image/jpeg;base64,{base64.b64encode(image_data).decode()}"
                
                png_pos = data.find(b'\x89PNG\r\n\x1a\n')
                if png_pos != -1:
                    end_pos = data.find(b'IEND', png_pos)
                    if end_pos != -1:
                        image_data = data[png_pos:end_pos+8]
                        if 100 < len(image_data) < max_size:
                            return f"data:image/png;base64,{base64.b64encode(image_data).decode()}"
            
            if file_size > 5 * 1024 * 1024:
                with open(file_path, 'rb') as f:
                    f.seek(-2 * 1024 * 1024, 2)
                    tail_data = f.read(2 * 1024 * 1024)
                    
                    jpeg_pos = tail_data.find(b'\xff\xd8')
                    if jpeg_pos != -1:
                        end_pos = tail_data.find(b'\xff\xd9', jpeg_pos + 2)
                        if end_pos != -1 and end_pos > jpeg_pos:
                            image_data = tail_data[jpeg_pos:end_pos+2]
                            if 500 < len(image_data) < max_size:
                                if len(image_data) > 1024 * 1024:
                                    image_data = UltraFastCoverExtractor._compress_image(image_data)
                                return f"data:image/jpeg;base64,{base64.b64encode(image_data).decode()}"
            
            return None
        except Exception as e:
            return None
    
    @staticmethod
    def extract_mp3_cover(file_path):
        try:
            file_size = os.path.getsize(file_path)
            
            with open(file_path, 'rb') as f:
                header = f.read(10)
                if header.startswith(b'ID3'):
                    tag_size = ((header[6] & 0x7F) << 21) | ((header[7] & 0x7F) << 14) | \
                               ((header[8] & 0x7F) << 7) | (header[9] & 0x7F)
                    
                    read_size = min(tag_size + 10, 5 * 1024 * 1024)
                    f.seek(10)
                    tag_data = f.read(read_size)
                    
                    cover = UltraFastCoverExtractor._find_apic_in_id3(tag_data)
                    if cover:
                        return cover
            
            return UltraFastCoverExtractor._search_raw_image(file_path)
            
        except Exception as e:
            return None
    
    @staticmethod
    def _find_apic_in_id3(data):
        pos = 0
        data_len = len(data)
        
        while pos + 10 <= data_len:
            frame_id = data[pos:pos+4]
            
            if frame_id == b'APIC':
                frame_size = struct.unpack('>I', data[pos+4:pos+8])[0]
                
                if frame_size > 5 * 1024 * 1024:
                    pos += 10 + frame_size
                    continue
                
                frame_data_pos = pos + 10
                if frame_data_pos + frame_size > data_len:
                    break
                
                apic_data = data[frame_data_pos:frame_data_pos+frame_size]
                
                idx = 1
                
                mime_end = apic_data.find(b'\x00', idx)
                if mime_end == -1:
                    mime_end = len(apic_data)
                idx = mime_end + 1
                idx += 1
                
                desc_end = apic_data.find(b'\x00', idx)
                if desc_end == -1:
                    desc_end = len(apic_data)
                idx = desc_end + 1
                
                image_data = apic_data[idx:]
                
                if image_data and len(image_data) > 100:
                    if image_data[0] == 0xFF and image_data[1] == 0xD8:
                        mime = 'image/jpeg'
                    elif image_data[0:8] == b'\x89PNG\r\n\x1a\n':
                        mime = 'image/png'
                    else:
                        mime = 'image/jpeg'
                    
                    if len(image_data) > 1024 * 1024:
                        image_data = UltraFastCoverExtractor._compress_image(image_data)
                        mime = 'image/jpeg'
                    
                    return f"data:{mime};base64,{base64.b64encode(image_data).decode()}"
            
            frame_size = struct.unpack('>I', data[pos+4:pos+8])[0]
            pos += 10 + frame_size
        
        return None
    
    @staticmethod
    def extract_flac_cover(file_path):
        try:
            file_size = os.path.getsize(file_path)
            
            with open(file_path, 'rb') as f:
                header = f.read(4)
                if header != b'fLaC':
                    return None
                
                read_size = min(file_size - 4, 5 * 1024 * 1024)
                f.seek(4)
                data = f.read(read_size)
            
            pos = 0
            data_len = len(data)
            last_block = False
            
            while not last_block and pos + 4 <= data_len:
                header_byte = data[pos]
                last_block = (header_byte & 0x80) != 0
                block_type = header_byte & 0x7F
                block_size = (data[pos+1] << 16) | (data[pos+2] << 8) | data[pos+3]
                
                pos += 4
                
                if block_type == 6:
                    if pos + block_size > data_len:
                        with open(file_path, 'rb') as f:
                            f.seek(pos)
                            picture_data = f.read(block_size)
                    else:
                        picture_data = data[pos:pos+block_size]
                    
                    if len(picture_data) < 20:
                        pos += block_size
                        continue
                    
                    pic_idx = 4
                    
                    if pic_idx + 4 > len(picture_data):
                        pos += block_size
                        continue
                    
                    mime_len = struct.unpack('>I', picture_data[pic_idx:pic_idx+4])[0]
                    pic_idx += 4
                    
                    if mime_len > 100:
                        pos += block_size
                        continue
                    
                    pic_idx += mime_len
                    
                    if pic_idx + 4 > len(picture_data):
                        pos += block_size
                        continue
                    
                    desc_len = struct.unpack('>I', picture_data[pic_idx:pic_idx+4])[0]
                    pic_idx += 4
                    
                    pic_idx += desc_len
                    pic_idx += 16
                    
                    if pic_idx + 4 > len(picture_data):
                        pos += block_size
                        continue
                    
                    img_len = struct.unpack('>I', picture_data[pic_idx:pic_idx+4])[0]
                    pic_idx += 4
                    
                    if img_len > 5 * 1024 * 1024:
                        pos += block_size
                        continue
                    
                    if pic_idx + img_len <= len(picture_data):
                        image_data = picture_data[pic_idx:pic_idx+img_len]
                    else:
                        with open(file_path, 'rb') as f:
                            f.seek(pos + pic_idx)
                            image_data = f.read(img_len)
                    
                    if image_data and len(image_data) > 100:
                        if image_data[0] == 0xFF and image_data[1] == 0xD8:
                            mime = 'image/jpeg'
                        elif image_data[0:8] == b'\x89PNG\r\n\x1a\n':
                            mime = 'image/png'
                        else:
                            mime = 'image/jpeg'
                        
                        if len(image_data) > 1024 * 1024:
                            image_data = UltraFastCoverExtractor._compress_image(image_data)
                            mime = 'image/jpeg'
                        
                        return f"data:{mime};base64,{base64.b64encode(image_data).decode()}"
                
                pos += block_size
            
            return UltraFastCoverExtractor._search_raw_image(file_path)
            
        except Exception as e:
            return None
    
    @staticmethod
    def extract_m4a_cover(file_path):
        try:
            with open(file_path, 'rb') as f:
                data = f.read(5 * 1024 * 1024)
            
            jpeg_pos = data.find(b'\xff\xd8')
            if jpeg_pos != -1:
                end_pos = data.find(b'\xff\xd9', jpeg_pos + 2)
                if end_pos != -1 and end_pos > jpeg_pos:
                    image_data = data[jpeg_pos:end_pos+2]
                    if 1000 < len(image_data) < 5 * 1024 * 1024:
                        if len(image_data) > 1024 * 1024:
                            image_data = UltraFastCoverExtractor._compress_image(image_data)
                        return f"data:image/jpeg;base64,{base64.b64encode(image_data).decode()}"
            
            png_pos = data.find(b'\x89PNG\r\n\x1a\n')
            if png_pos != -1:
                end_pos = data.find(b'IEND', png_pos)
                if end_pos != -1:
                    image_data = data[png_pos:end_pos+8]
                    if 100 < len(image_data) < 5 * 1024 * 1024:
                        return f"data:image/png;base64,{base64.b64encode(image_data).decode()}"
            
            pos = 0
            data_len = len(data)
            
            while pos + 8 <= data_len:
                atom_size = struct.unpack('>I', data[pos:pos+4])[0]
                if atom_size == 0 or atom_size > data_len - pos:
                    break
                
                atom_type = data[pos+4:pos+8]
                
                if atom_type == b'meta':
                    cover = UltraFastCoverExtractor._parse_meta_atom(data, pos, atom_size)
                    if cover:
                        return cover
                
                pos += atom_size
            
            return UltraFastCoverExtractor._search_raw_image(file_path)
            
        except Exception as e:
            return None
    
    @staticmethod
    def _parse_meta_atom(data, start, atom_size):
        try:
            meta_pos = start + 8
            meta_end = min(start + atom_size, len(data))
            
            while meta_pos + 8 <= meta_end:
                child_size = struct.unpack('>I', data[meta_pos:meta_pos+4])[0]
                child_type = data[meta_pos+4:meta_pos+8]
                
                if child_type == b'ilst':
                    ilst_pos = meta_pos + 8
                    ilst_end = min(meta_pos + child_size, meta_end)
                    
                    while ilst_pos + 8 <= ilst_end:
                        item_size = struct.unpack('>I', data[ilst_pos:ilst_pos+4])[0]
                        item_type = data[ilst_pos+4:ilst_pos+8]
                        
                        if item_type == b'covr':
                            covr_pos = ilst_pos + 8
                            if covr_pos + 8 <= ilst_end:
                                data_size = struct.unpack('>I', data[covr_pos:covr_pos+4])[0]
                                data_type = data[covr_pos+4:covr_pos+8]
                                if data_type == b'data':
                                    img_start = covr_pos + 16
                                    img_len = data_size - 16
                                    if img_start + img_len <= len(data):
                                        image_data = data[img_start:img_start+img_len]
                                        if image_data and len(image_data) > 100:
                                            mime = 'image/jpeg' if image_data[0:2] == b'\xff\xd8' else 'image/png'
                                            if len(image_data) > 1024 * 1024:
                                                image_data = UltraFastCoverExtractor._compress_image(image_data)
                                                mime = 'image/jpeg'
                                            return f"data:{mime};base64,{base64.b64encode(image_data).decode()}"
                        
                        ilst_pos += item_size
                
                meta_pos += child_size
            return None
        except:
            return None


# ==================== 字母/数字筛选辅助方法 ====================

def _get_chinese_pinyin_initial(chinese_char):
    """获取汉字拼音首字母"""
    pinyin_map = {
        '阿': 'A', '啊': 'A', '爱': 'A', '安': 'A', '按': 'A', '暗': 'A', '奥': 'A',
        '八': 'B', '巴': 'B', '把': 'B', '白': 'B', '百': 'B', '班': 'B', '般': 'B', 
        '版': 'B', '办': 'B', '半': 'B', '帮': 'B', '包': 'B', '宝': 'B', '保': 'B',
        '报': 'B', '北': 'B', '被': 'B', '本': 'B', '比': 'B', '必': 'B', '边': 'B',
        '变': 'B', '便': 'B', '别': 'B', '冰': 'B', '并': 'B', '波': 'B', '伯': 'B',
        '博': 'B', '不': 'B', '部': 'B', '吧': 'B', '拜': 'B', '班': 'B', '颁': 'B',
        '才': 'C', '财': 'C', '采': 'C', '彩': 'C', '参': 'C', '残': 'C', '草': 'C',
        '策': 'C', '层': 'C', '曾': 'C', '查': 'C', '产': 'C', '长': 'C', '常': 'C',
        '场': 'C', '唱': 'C', '超': 'C', '朝': 'C', '车': 'C', '陈': 'C', '成': 'C',
        '城': 'C', '程': 'C', '吃': 'C', '持': 'C', '充': 'C', '出': 'C', '初': 'C',
        '除': 'C', '处': 'C', '川': 'C', '传': 'C', '船': 'C', '窗': 'C', '床': 'C',
        '创': 'C', '春': 'C', '此': 'C', '从': 'C', '村': 'C', '存': 'C', '错': 'C',
        '打': 'D', '大': 'D', '代': 'D', '带': 'D', '但': 'D', '当': 'D', '党': 'D',
        '到': 'D', '道': 'D', '得': 'D', '的': 'D', '等': 'D', '邓': 'D', '低': 'D',
        '底': 'D', '地': 'D', '第': 'D', '点': 'D', '电': 'D', '店': 'D', '定': 'D',
        '东': 'D', '冬': 'D', '懂': 'D', '动': 'D', '都': 'D', '读': 'D', '度': 'D',
        '段': 'D', '断': 'D', '队': 'D', '对': 'D', '多': 'D', '董': 'D', '杜': 'D',
        '儿': 'E', '而': 'E', '耳': 'E', '二': 'E', '额': 'E', '俄': 'E', '恩': 'E',
        '发': 'F', '法': 'F', '反': 'F', '方': 'F', '房': 'F', '放': 'F', '非': 'F',
        '飞': 'F', '费': 'F', '分': 'F', '芬': 'F', '丰': 'F', '风': 'F', '冯': 'F',
        '佛': 'F', '夫': 'F', '服': 'F', '福': 'F', '父': 'F', '付': 'F', '负': 'F',
        '富': 'F', '范': 'F', '傅': 'F',
        '改': 'G', '盖': 'G', '干': 'G', '高': 'G', '搞': 'G', '哥': 'G', '歌': 'G',
        '格': 'G', '个': 'G', '给': 'G', '跟': 'G', '更': 'G', '工': 'G', '公': 'G',
        '功': 'G', '共': 'G', '够': 'G', '故': 'G', '顾': 'G', '关': 'G', '观': 'G',
        '管': 'G', '光': 'G', '广': 'G', '归': 'G', '规': 'G', '国': 'G', '果': 'G',
        '过': 'G', '郭': 'G', '龚': 'G',
        '还': 'H', '海': 'H', '含': 'H', '汉': 'H', '好': 'H', '号': 'H', '喝': 'H',
        '和': 'H', '河': 'H', '何': 'H', '合': 'H', '很': 'H', '红': 'H', '后': 'H',
        '胡': 'H', '花': 'H', '话': 'H', '黄': 'H', '回': 'H', '会': 'H', '活': 'H',
        '火': 'H', '或': 'H', '韩': 'H', '郝': 'H',
        '机': 'J', '鸡': 'J', '基': 'J', '及': 'J', '级': 'J', '即': 'J', '己': 'J',
        '几': 'J', '家': 'J', '加': 'J', '佳': 'J', '假': 'J', '间': 'J', '见': 'J',
        '建': 'J', '将': 'J', '江': 'J', '蒋': 'J', '交': 'J', '教': 'J', '叫': 'J',
        '接': 'J', '街': 'J', '节': 'J', '结': 'J', '姐': 'J', '解': 'J', '界': 'J',
        '今': 'J', '金': 'J', '尽': 'J', '进': 'J', '经': 'J', '精': 'J', '景': 'J',
        '净': 'J', '九': 'J', '久': 'J', '就': 'J', '旧': 'J', '局': 'J', '举': 'J',
        '句': 'J', '具': 'J', '俱': 'J', '决': 'J', '觉': 'J', '军': 'J', '开': 'J',
        '看': 'K', '康': 'K', '考': 'K', '科': 'K', '可': 'K', '克': 'K', '刻': 'K',
        '客': 'K', '空': 'K', '孔': 'K', '口': 'K', '哭': 'K', '苦': 'K', '快': 'K',
        '块': 'K', '款': 'K', '狂': 'K', '况': 'K', '困': 'K', '扩': 'K', '柯': 'K',
        '拉': 'L', '来': 'L', '蓝': 'L', '老': 'L', '乐': 'L', '雷': 'L', '类': 'L',
        '冷': 'L', '离': 'L', '李': 'L', '里': 'L', '理': 'L', '力': 'L', '立': 'L',
        '丽': 'L', '利': 'L', '连': 'L', '联': 'L', '脸': 'L', '两': 'L', '亮': 'L',
        '林': 'L', '刘': 'L', '流': 'L', '六': 'L', '龙': 'L', '路': 'L', '旅': 'L',
        '绿': 'L', '乱': 'L', '论': 'L', '罗': 'L', '梁': 'L',
        '妈': 'M', '马': 'M', '吗': 'M', '买': 'M', '满': 'M', '毛': 'M', '么': 'M',
        '没': 'M', '美': 'M', '妹': 'M', '门': 'M', '们': 'M', '梦': 'M', '孟': 'M',
        '迷': 'M', '米': 'M', '面': 'M', '民': 'M', '名': 'M', '明': 'M', '命': 'M',
        '模': 'M', '么': 'M', '没': 'M', '莫': 'M', '木': 'M', '目': 'M', '母': 'M',
        '那': 'N', '男': 'N', '南': 'N', '难': 'N', '脑': 'N', '内': 'N', '能': 'N',
        '你': 'N', '年': 'N', '念': 'N', '娘': 'N', '鸟': 'N', '您': 'N', '牛': 'N',
        '农': 'N', '女': 'N', '暖': 'N', '倪': 'N', '聂': 'N',
        '欧': 'O', '偶': 'O',
        '怕': 'P', '拍': 'P', '排': 'P', '派': 'P', '潘': 'P', '盘': 'P', '旁': 'P',
        '胖': 'P', '跑': 'P', '朋': 'P', '彭': 'P', '朋': 'P', '碰': 'P', '批': 'P',
        '皮': 'P', '片': 'P', '票': 'P', '品': 'P', '平': 'P', '评': 'P', '凭': 'P',
        '苹': 'P', '破': 'P', '普': 'P', '庞': 'P', '裴': 'P',
        '七': 'Q', '期': 'Q', '其': 'Q', '奇': 'Q', '起': 'Q', '气': 'Q', '千': 'Q',
        '前': 'Q', '钱': 'Q', '强': 'Q', '亲': 'Q', '青': 'Q', '清': 'Q', '情': 'Q',
        '请': 'Q', '秋': 'Q', '求': 'Q', '球': 'Q', '区': 'Q', '取': 'Q', '去': 'Q',
        '全': 'Q', '权': 'Q', '却': 'Q', '确': 'Q', '秦': 'Q', '邱': 'Q', '齐': 'Q',
        '然': 'R', '让': 'R', '人': 'R', '日': 'R', '容': 'R', '容': 'R', '如': 'R',
        '入': 'R', '软': 'R', '任': 'R', '阮': 'R', '荣': 'R', '茹': 'R',
        '三': 'S', '散': 'S', '色': 'S', '山': 'S', '上': 'S', '少': 'S', '社': 'S',
        '身': 'S', '深': 'S', '神': 'S', '生': 'S', '声': 'S', '师': 'S', '十': 'S',
        '时': 'S', '实': 'S', '食': 'S', '史': 'S', '使': 'S', '始': 'S', '式': 'S',
        '是': 'S', '事': 'S', '势': 'S', '视': 'S', '试': 'S', '室': 'S', '是': 'S',
        '收': 'S', '手': 'S', '首': 'S', '受': 'S', '书': 'S', '术': 'S', '数': 'S',
        '树': 'S', '双': 'S', '水': 'S', '说': 'S', '司': 'S', '思': 'S', '斯': 'S',
        '四': 'S', '送': 'S', '苏': 'S', '诉': 'S', '速': 'S', '算': 'S', '虽': 'S',
        '随': 'S', '岁': 'S', '孙': 'S', '他': 'S', '它': 'S', '她': 'S', '沈': 'S', '宋': 'S',
        '她': 'T', '他': 'T', '它': 'T', '太': 'T', '谈': 'T', '唐': 'T', '套': 'T',
        '特': 'T', '提': 'T', '题': 'T', '体': 'T', '天': 'T', '田': 'T', '条': 'T',
        '铁': 'T', '听': 'T', '厅': 'T', '通': 'T', '同': 'T', '头': 'T', '投': 'T',
        '透': 'T', '突': 'T', '图': 'T', '土': 'T', '团': 'T', '推': 'T', '退': 'T',
        '脱': 'T', '陶': 'T', '谭': 'T',
        '外': 'W', '完': 'W', '玩': 'W', '晚': 'W', '万': 'W', '王': 'W', '往': 'W',
        '为': 'W', '文': 'W', '问': 'W', '我': 'W', '无': 'W', '五': 'W', '午': 'W',
        '武': 'W', '物': 'W', '务': 'W', '汪': 'W', '魏': 'W', '卫': 'W',
        '西': 'X', '希': 'X', '习': 'X', '系': 'X', '下': 'X', '先': 'X', '现': 'X',
        '相': 'X', '想': 'X', '向': 'X', '像': 'X', '小': 'X', '校': 'X', '笑': 'X',
        '些': 'X', '心': 'X', '新': 'X', '信': 'X', '兴': 'X', '星': 'X', '行': 'X',
        '形': 'X', '幸': 'X', '性': 'X', '休': 'X', '秀': 'X', '须': 'X', '需': 'X',
        '许': 'X', '学': 'X', '雪': 'X', '血': 'X', '寻': 'X', '询': 'X', '徐': 'X', '谢': 'X', '萧': 'X',
        '呀': 'Y', '言': 'Y', '颜': 'Y', '眼': 'Y', '演': 'Y', '验': 'Y', '阳': 'Y',
        '杨': 'Y', '样': 'Y', '要': 'Y', '业': 'Y', '叶': 'Y', '页': 'Y', '夜': 'Y',
        '一': 'Y', '医': 'Y', '依': 'Y', '已': 'Y', '以': 'Y', '意': 'Y', '因': 'Y',
        '阴': 'Y', '音': 'Y', '银': 'Y', '引': 'Y', '印': 'Y', '应': 'Y', '英': 'Y',
        '影': 'Y', '映': 'Y', '永': 'Y', '用': 'Y', '由': 'Y', '有': 'Y', '又': 'Y',
        '于': 'Y', '余': 'Y', '鱼': 'Y', '语': 'Y', '玉': 'Y', '遇': 'Y', '元': 'Y',
        '原': 'Y', '远': 'Y', '院': 'Y', '愿': 'Y', '约': 'Y', '月': 'Y', '乐': 'Y',
        '云': 'Y', '运': 'Y', '袁': 'Y',
        '再': 'Z', '在': 'Z', '咱': 'Z', '早': 'Z', '怎': 'Z', '增': 'Z', '扎': 'Z',
        '摘': 'Z', '张': 'Z', '长': 'Z', '赵': 'Z', '这': 'Z', '真': 'Z', '正': 'Z',
        '之': 'Z', '知': 'Z', '直': 'Z', '只': 'Z', '指': 'Z', '至': 'Z', '志': 'Z',
        '治': 'Z', '中': 'Z', '终': 'Z', '钟': 'Z', '种': 'Z', '周': 'Z', '洲': 'Z',
        '州': 'Z', '朱': 'Z', '诸': 'Z', '主': 'Z', '住': 'Z', '抓': 'Z', '转': 'Z',
        '装': 'Z', '准': 'Z', '子': 'Z', '自': 'Z', '总': 'Z', '走': 'Z', '族': 'Z',
        '组': 'Z', '祖': 'Z', '最': 'Z', '昨': 'Z', '左': 'Z', '作': 'Z', '坐': 'Z',
        '做': 'Z', '郑': 'Z'
    }
    
    if chinese_char in pinyin_map:
        return pinyin_map[chinese_char]
    
    if '\u4e00' <= chinese_char <= '\u9fff':
        return 'Z'
    
    return chinese_char.upper() if chinese_char.isalpha() else '#'


# ==================== 主爬虫类 ====================
class Spider(Spider):
    def getName(self):
        return "本地资源管理"
    
    def init(self, extend=""):
        super().init(extend)
        
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1"
        }
        
        self.root_paths = ROOT_PATHS
        self.path_to_chinese = PATH_TO_CHINESE
        
        self.online_live_sources = ONLINE_LIVE_SOURCES
        self.live_category_id = LIVE_CATEGORY_ID
        self.live_category_name = LIVE_CATEGORY_NAME
        self.live_cache = {}
        self.live_cache_time = {}
        self.live_cache_duration = LIVE_CACHE_DURATION
        
        self.radio_cache = {}
        self.radio_cache_time = {}
        
        self.common_headers_list = COMMON_HEADERS_LIST
        self.domain_specific_headers = DOMAIN_SPECIFIC_HEADERS
        self.successful_headers_cache = {}
        
        self.default_colors = [
            "#FF6B6B", "#4ECDC4", "#FFD93D", "#6BCB77", "#9D65C9", 
            "#FF8C42", "#A2D729", "#FF6B8B", "#45B7D1", "#96CEB4"
        ]
        
        self.media_exts = ['mp4', 'mkv', 'avi', 'rmvb', 'mov', 'wmv', 'flv', 'm4v', 'ts', 'm3u8']
        self.audio_exts = ['mp3', 'm4a', 'aac', 'flac', 'wav', 'ogg', 'wma', 'ape', 'm4b', 'm4p', 'opus']
        self.image_exts = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'ico', 'svg', 'heic', 'heif']
        self.list_exts = ['m3u', 'txt', 'json', 'm3u8']
        self.lrc_exts = ['lrc', 'krc', 'qrc', 'yrc', 'trc']
        self.db_exts = ['db', 'sqlite', 'sqlite3', 'db3']
        self.code_exts = ['php', 'py', 'js', 'css', 'html', 'htm', 'xml', 'sh', 'bash']
        self.archive_exts = ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz']
        
        self.common_cover_names = [
            'cover', 'folder', 'album', 'front', 'back', 'disc', 'cd',
            '封面', '专辑', '文件夹'
        ]
        
        self.max_audio_per_scan = 5000
        self.audio_scan_timeout = 10
        self.enable_online_lyrics = True
        self.enable_online_poster = True
        self.audio_cache_duration = 3600
        
        self.QQ_OFFICIAL_SEARCH = "https://c.y.qq.com/splcloud/fcgi-bin/smartbox_new.fcg"
        self.QQ_OFFICIAL_LYRIC = "https://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg"
        
        self.audio_list_cache = {}
        self.audio_list_cache_time = {}
        self.network_lyrics_cache = {}
        self.network_cover_cache = {}
        self.song_info_cache = {}
        
        self.audio_cover_cache = {}
        self.cover_loading = {}
        
        self.video_cache = {}
        self.video_cache_time = {}
        
        self.dir_cache = {}
        self.dir_cache_time = {}
        
        self.debug_mode = False
        
        self.priority_audio_dirs = [
            '/storage/emulated/0/Music/',
            '/storage/emulated/0/Download/KuwoMusic/music/',
            '/storage/emulated/0/netease/cloudmusic/Music/',
            '/storage/emulated/0/qqmusic/song/',
            '/storage/emulated/0/MIUI/music/',
            '/storage/emulated/0/Download/',
        ]
        
        self.live_keywords = ['cctv', '卫视', '频道', '直播', '电视台', 'iptv', 'm3u8', 'live', '咪咕', '央卫', '香港', '台湾', '澳门', '体育', '新闻', '音乐', '综合', '抖音', 'douyin', 'video']
        self.novel_keywords = ['第', '章', '节', '卷', '部', '篇', '集', '小说', '故事', '作者']
        
        self.DEFAULT_AUDIO_ICON = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI5NiIgaGVpZ2h0PSI5NiIgdmlld0JveD0iMCAwIDk2IDk2Ij48cmVjdCB3aWR0aD0iOTYiIGhlaWdodD0iOTYiIGZpbGw9IiM1NTU1NTUiLz48dGV4dCB4PSI0OCIgeT0iNjAiIGZvbnQtc2l6ZT0iNDAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IndoaXRlIiBmb250LWZhbWlseT0iQXJpYWwiPsKbPC90ZXh0Pjwvc3ZnPg=="
        
        self.file_icons = {
            'folder': 'https://img.icons8.com/color/96/000000/folder-invoices.png',
            'video': 'https://img.icons8.com/color/96/000000/video.png',
            'video_playlist': 'https://img.icons8.com/color/96/000000/playlist.png',
            'audio': self.DEFAULT_AUDIO_ICON,
            'audio_playlist': self.DEFAULT_AUDIO_ICON,
            'image': 'https://img.icons8.com/color/96/000000/image.png',
            'image_playlist': 'https://img.icons8.com/color/96/000000/image-gallery.png',
            'list': 'https://img.icons8.com/color/96/000000/list.png',
            'lrc': 'https://img.icons8.com/color/96/000000/audio-file.png',
            'database': 'https://img.icons8.com/color/96/000000/database.png',
            'novel': 'https://img.icons8.com/color/96/000000/book.png',
            'text': 'https://img.icons8.com/color/96/000000/document.png',
            'file': 'https://img.icons8.com/color/96/000000/file.png',
            'json': 'https://img.icons8.com/color/96/000000/json.png',
            'music_note': self.DEFAULT_AUDIO_ICON,
            'lyrics': 'https://img.icons8.com/color/96/000000/audio-file.png',
            'cd': 'https://img.icons8.com/color/96/compact-disc.png',
            'song': 'https://img.icons8.com/color/96/song.png',
            'php': 'https://img.icons8.com/color/96/php.png',
            'python': 'https://img.icons8.com/color/96/python.png',
            'zip': 'https://img.icons8.com/color/96/zip.png',
            'archive': 'https://img.icons8.com/color/96/archive.png',
            'rar': 'https://img.icons8.com/color/96/rar.png',
        }
        
        self.TRANSPARENT_GIF = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
        
        self.V_DIR_PREFIX = 'vdir://'
        self.V_ITEM_PREFIX = 'vitem://'
        self.URL_B64U_PREFIX = 'b64u://'
        self.V_ALL_PREFIX = 'vall://'
        self.A_ALL_PREFIX = 'aall://'
        self.FOLDER_PREFIX = 'folder://'
        self.LIST_PREFIX = 'list://'
        self.PICS_PREFIX = 'pics://'
        self.MP3_PREFIX = 'mp3://'
        self.CAMERA_ALL_PREFIX = 'camall://'
        self.LIVE_PREFIX = 'live://'
        self.NOVEL_PREFIX = 'novel://'
        self.TEXT_PREFIX = 'text://'

        self.lrc_cache = {}
        self.m3u8_cache = {}
        self.db_reader = DatabaseReader()
        self.poster_cache = {}
        self.word_lyrics_cache = {}
        self.novel_path_cache = {}
        self.novel_chapters_cache = {}
        self.current_novel = {'encoded_path': None, 'file_path': None, 'chapters': []}
        
        self.preload_executor = ThreadPoolExecutor(max_workers=5, thread_name_prefix="CoverPreload")
        
        self.session = requests.Session()
        retries = Retry(total=2, backoff_factor=0.5)
        adapter = HTTPAdapter(max_retries=retries)
        self.session.mount('http://', adapter)
        self.session.mount('https://', adapter)
        
        self._init_cache_dirs()
        
        # 短视频接口列表
        self.short_video_apis = [
            {"name": "🎬 极客小姐姐", "url": "http://api.yujn.cn/api/zzxjj.php"},
            {"name": "🎬 高质量小姐姐", "url": "http://api.tinise.cn/api/xjjsp"},
            {"name": "🎬 抖音小姐姐", "url": "http://api.qemao.com/api/douyin/"},
            {"name": "🎬 完美身材", "url": "http://api.yujn.cn/api/wmsc.php?type=video"},
            {"name": "🎬 快手变装", "url": "http://api.yujn.cn/api/ksbianzhuang.php?type=video"},
            {"name": "🎬 抖音变装", "url": "http://api.yujn.cn/api/bianzhuang.php?"},
            {"name": "🤍 白丝视频", "url": "http://api.yujn.cn/api/baisis.php?type=video"},
            {"name": "👗 美女穿搭", "url": "http://api.yujn.cn/api/chuanda.php?type=video"},
            {"name": "🎲 随机小姐姐", "url": "http://api.yujn.cn/api/xjj.php?type=video"},
            {"name": "🖤 黑丝视频", "url": "http://api.yujn.cn/api/heisis.php?type=video"},
            {"name": "🎓 女大学生", "url": "https://api.yujn.cn/api/nvda.php?type=video"},
            {"name": "👁️ 抖音瞳瞳", "url": "https://api.yujn.cn/api/tongtong.php?type=video"},
            {"name": "💃 丝滑舞蹈", "url": "http://api.yujn.cn/api/shwd.php?type=video"},
            {"name": "🏮 古风类", "url": "http://api.yujn.cn/api/hanfu.php?type=video"},
            {"name": "🎧 慢摇系列", "url": "http://api.yujn.cn/api/manyao.php?type=video"},
            {"name": "👙 吊带系列", "url": "http://api.yujn.cn/api/diaodai.php?type=video"},
            {"name": "🌸 清纯系列", "url": "http://api.yujn.cn/api/qingchun.php?type=video"},
            {"name": "🎮 COS系列", "url": "http://api.yujn.cn/api/COS.php?type=video"},
            {"name": "🎀 萝莉系列", "url": "http://api.yujn.cn/api/luoli.php?type=video"},
            {"name": "🍬 甜妹系列", "url": "http://api.yujn.cn/api/tianmei.php?type=video"},
        ]
        
        # 短视频封面图库API
        self.video_cover_apis = [
            "https://api.uumnet.com/api/mn1.php",
            "https://api.uumnet.com/api/mn2.php",
            "https://api.6045833.xyz/wsmeinv",
            "https://api.eyabc.cn/api/picture/beauty",
            "http://api.lbbb.cc/api/baisi",
            "http://api.lbbb.cc/api/heisi",
        ]
        
        self.cached_radio_ids = set()
        self._load_cached_radio_ids()
        
        # 画廊接口列表
        self.gallery_apis = [
            {"name": "🎨 图源A", "url": "https://api.uumnet.com/api/mn1.php", "type": "random"},
            {"name": "🎨 图源B", "url": "https://api.uumnet.com/api/mn2.php", "type": "random"},
            {"name": "🎨 图源C", "url": "https://api.uumnet.com/api/mn3.php", "type": "random"},
            {"name": "🎨 图源D", "url": "https://api.uumnet.com/api/mn4.php", "type": "random"},
            {"name": "🎨 图源E", "url": "https://api.uumnet.com/api/mn5.php", "type": "random"},
            {"name": "🎨 图源F", "url": "https://api.uumnet.com/api/mn6.php", "type": "random"},
            {"name": "🎨 图源G", "url": "https://api.uumnet.com/api/mn7.php", "type": "random"},
            {"name": "🎨 图源H", "url": "https://api.uumnet.com/api/mn8.php", "type": "random"},
            {"name": "🎨 图源I", "url": "https://api.uumnet.com/api/mn9.php", "type": "random"},
            {"name": "🎨 图源J", "url": "https://api.uumnet.com/api/mn10.php", "type": "random"},
            {"name": "👗 丝袜美女", "url": "https://api.6045833.xyz/wsmeinv", "type": "random"},
            {"name": "🎀美女图片", "url": "http://ryapi.sbs/API/beauty.php", "type": "random"},
            {"name": "🌸 唯美图片", "url": "https://api-v2.cenguigui.cn/api/meizi/", "type": "random"},
            {"name": "🖼️ 漫画图库", "url": "https://pic.ltywl.top/mn/pe.php", "type": "random"},
            {"name": "🤍 白丝系列", "url": "http://api.lbbb.cc/api/baisi", "type": "random"},
            {"name": "🖤 黑丝系列", "url": "http://api.lbbb.cc/api/heisi", "type": "random"},
            {"name": "🎇桌面壁纸", "url": "https://api.xunjinlu.fun/api/img/index.php", "type": "random"},
            {"name": "🎊二次元", "url": "https://api.suyanw.cn/api/comic3.php", "type": "random"},
            {"name": "🌁简单壁纸", "url": "https://apis.uctb.cn/api/Moments", "type": "random"},
            {"name": "🌅必应每日一图", "url": "https://api.xunjinlu.fun/api/bing/m302.php", "type": "random"},
        ]

    def _load_cached_radio_ids(self):
        try:
            if os.path.exists(RADIO_COVER_CACHE_DIR):
                for filename in os.listdir(RADIO_COVER_CACHE_DIR):
                    if filename.endswith('.jpg'):
                        radio_id = filename[:-4]
                        self.cached_radio_ids.add(radio_id)
            print(f"📻 已加载 {len(self.cached_radio_ids)} 个缓存电台封面到内存")
        except Exception as e:
            print(f"加载缓存电台列表失败: {e}")
    
    def _refresh_cached_radio_ids(self):
        self.cached_radio_ids.clear()
        self._load_cached_radio_ids()

    def _init_cache_dirs(self):
        try:
            tmp_dir = '/storage/emulated/0/tmp/'
            os.makedirs(tmp_dir, exist_ok=True)
            os.makedirs(COVER_CACHE_DIR, exist_ok=True)
            os.makedirs(LYRICS_CACHE_DIR, exist_ok=True)
            os.makedirs(RADIO_COVER_CACHE_DIR, exist_ok=True)
            
            print(f"📁 封面缓存目录: {COVER_CACHE_DIR}")
            print(f"📁 歌词缓存目录: {LYRICS_CACHE_DIR}")
            print(f"📁 电台封面缓存目录: {RADIO_COVER_CACHE_DIR}")
        except Exception as e:
            print(f"创建缓存目录失败: {e}")

    def log(self, msg):
        if self.debug_mode:
            print(f"🔍 [DEBUG] {msg}")

    # ==================== 工具函数 ====================
    
    def b64u_encode(self, data):
        if isinstance(data, str):
            data = data.encode('utf-8')
        encoded = base64.b64encode(data).decode('ascii')
        return encoded.replace('+', '-').replace('/', '_').rstrip('=')
    
    def b64u_decode(self, data):
        data = data.replace('-', '+').replace('_', '/')
        pad = len(data) % 4
        if pad:
            data += '=' * (4 - pad)
        try:
            return base64.b64decode(data).decode('utf-8')
        except:
            return ''
    
    def e64(self, text):
        return base64.b64encode(text.encode("utf-8")).decode("utf-8")
    
    def d64(self, text):
        return base64.b64decode(text.encode("utf-8")).decode("utf-8")
    
    def get_file_ext(self, filename):
        idx = filename.rfind('.')
        if idx == -1:
            return ''
        return filename[idx + 1:].lower()
    
    def is_media_file(self, ext):
        return ext in self.media_exts
    
    def is_audio_file(self, ext):
        return ext in self.audio_exts
    
    def is_image_file(self, ext):
        return ext in self.image_exts
    
    def is_list_file(self, ext):
        return ext in self.list_exts
    
    def is_lrc_file(self, ext):
        return ext in self.lrc_exts
    
    def is_db_file(self, ext):
        return ext in self.db_exts
    
    def is_code_file(self, ext):
        return ext in self.code_exts
    
    def is_archive_file(self, ext):
        return ext in self.archive_exts
    
    def _should_hide_file(self, filename, dir_path=None, audio_names=None):
        name_lower = filename.lower()
        name_without_ext = os.path.splitext(filename)[0]
        
        is_image = any(name_lower.endswith(ext) for ext in ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'])
        is_lyric = any(name_lower.endswith(ext) for ext in ['.lrc', '.krc', '.qrc', '.yrc', '.trc'])
        
        if not is_image and not is_lyric:
            return False
        
        if audio_names is not None:
            for audio_name in audio_names:
                if audio_name.lower() == name_without_ext.lower():
                    return True
        
        if name_without_ext.lower() in self.common_cover_names:
            return True
        
        return False
    
    # ==================== 封面缓存目录 ====================
    
    def _get_cover_cache_dir(self):
        return COVER_CACHE_DIR
    
    def _get_cached_cover_path(self, audio_path):
        file_hash = hashlib.md5(audio_path.encode()).hexdigest()
        cache_file = f"{COVER_CACHE_DIR}{file_hash}.jpg"
        if os.path.exists(cache_file):
            return cache_file
        return None
    
    def _clear_cover_cache_content(self):
        deleted_count = 0
        deleted_size = 0
        
        if os.path.exists(COVER_CACHE_DIR) and os.path.isdir(COVER_CACHE_DIR):
            try:
                for filename in os.listdir(COVER_CACHE_DIR):
                    file_path = os.path.join(COVER_CACHE_DIR, filename)
                    if os.path.isfile(file_path):
                        file_size = os.path.getsize(file_path)
                        os.remove(file_path)
                        deleted_count += 1
                        deleted_size += file_size
                print(f"🗑️ 已清空封面缓存目录: {COVER_CACHE_DIR}")
            except Exception as e:
                print(f"清除封面缓存失败: {e}")
        
        CoverScanRecord.clear_record()
        self.audio_cover_cache.clear()
        self.cover_loading.clear()
        self.dir_cache.clear()
        self.dir_cache_time.clear()
        self.audio_list_cache.clear()
        self.audio_list_cache_time.clear()
        
        if deleted_size > 1024 * 1024:
            size_str = f"{deleted_size / (1024 * 1024):.2f} MB"
        elif deleted_size > 1024:
            size_str = f"{deleted_size / 1024:.2f} KB"
        else:
            size_str = f"{deleted_size} B"
        
        result_msg = f"✅ 已清除 {deleted_count} 个封面缓存文件\n释放空间: {size_str}\n扫描记录已重置\n\n请重新进入音乐目录刷新封面"
        
        return {
            'list': [{
                'vod_id': 'clear_result',
                'vod_name': result_msg,
                'vod_pic': self._generate_colored_icon("#4CAF50", "✓"),
                'vod_remarks': '清除完成',
                'style': {'type': 'list'},
                'vod_player': '书'
            }],
            'page': 1,
            'pagecount': 1,
            'limit': 1,
            'total': 1
        }
    
    def _clear_lyrics_cache_content(self):
        deleted_count, deleted_size = LyricsCacheManager.delete_lyrics_cache()
        
        self.network_lyrics_cache.clear()
        self.lrc_cache.clear()
        
        if deleted_size > 1024 * 1024:
            size_str = f"{deleted_size / (1024 * 1024):.2f} MB"
        elif deleted_size > 1024:
            size_str = f"{deleted_size / 1024:.2f} KB"
        else:
            size_str = f"{deleted_size} B"
        
        result_msg = f"✅ 已清除 {deleted_count} 个歌词缓存文件\n释放空间: {size_str}\n\n下次播放歌曲时会重新下载歌词"
        
        return {
            'list': [{
                'vod_id': 'clear_lyrics_result',
                'vod_name': result_msg,
                'vod_pic': self._generate_colored_icon("#2196F3", "🎵"),
                'vod_remarks': '清除完成',
                'style': {'type': 'list'},
                'vod_player': '书'
            }],
            'page': 1,
            'pagecount': 1,
            'limit': 1,
            'total': 1
        }
    
    # ==================== 电台封面缓存方法 ====================
    
    def _get_radio_cached_cover_path(self, radio_id):
        cache_file = f"{RADIO_COVER_CACHE_DIR}{radio_id}.jpg"
        if os.path.exists(cache_file):
            return cache_file
        return None
    
    def _cache_radio_cover(self, radio_id, image_url):
        if not image_url:
            return None
        
        try:
            cache_file = f"{RADIO_COVER_CACHE_DIR}{radio_id}.jpg"
            
            if os.path.exists(cache_file):
                self.cached_radio_ids.add(str(radio_id))
                return cache_file
            
            print(f"📻 正在下载电台封面: {radio_id}")
            
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Referer": "http://www.qingting.fm/"
            }
            response = self.session.get(image_url, headers=headers, timeout=15)
            
            if response.status_code == 200:
                img_data = response.content
                
                if len(img_data) > 500 * 1024:
                    img_data = UltraFastCoverExtractor._compress_image(img_data, max_size=(300, 300), quality=65)
                
                with open(cache_file, 'wb') as f:
                    f.write(img_data)
                
                self.cached_radio_ids.add(str(radio_id))
                RadioCoverRecord.mark_cached(radio_id)
                
                print(f"📻 电台封面已缓存: {cache_file}")
                return cache_file
            
            print(f"📻 下载电台封面失败: {radio_id}, 状态码: {response.status_code}")
            return None
        except Exception as e:
            print(f"缓存电台封面失败 {radio_id}: {e}")
            return None
    
    def _clear_radio_cover_cache_content(self):
        deleted_count = 0
        deleted_size = 0
        
        if os.path.exists(RADIO_COVER_CACHE_DIR) and os.path.isdir(RADIO_COVER_CACHE_DIR):
            try:
                for filename in os.listdir(RADIO_COVER_CACHE_DIR):
                    file_path = os.path.join(RADIO_COVER_CACHE_DIR, filename)
                    if os.path.isfile(file_path):
                        file_size = os.path.getsize(file_path)
                        os.remove(file_path)
                        deleted_count += 1
                        deleted_size += file_size
                print(f"🗑️ 已清空电台封面缓存目录: {RADIO_COVER_CACHE_DIR}")
            except Exception as e:
                print(f"清除电台封面缓存失败: {e}")
        
        all_category_ids = ['217', '99', '3', '5', '7', '83', '19', '31', '44', '59', '69', '85', '111', '129', '139', '151', '169', '187', '202', '239', '254', '257', '259', '281', '291', '316', '327', '351', '357', '308', '342', '433', '442', '429', '439', '432', '441', '430', '431', '440', '438', '435', '436', '434']
        for category_id in all_category_ids:
            file_cache_path = f"/storage/emulated/0/tmp/radio_list_{category_id}.json"
            if os.path.exists(file_cache_path):
                try:
                    os.remove(file_cache_path)
                    print(f"🗑️ 已删除电台列表缓存: {category_id}")
                except:
                    pass
        
        RadioCoverRecord.clear_record()
        self._refresh_cached_radio_ids()
        self.radio_cache.clear()
        self.radio_cache_time.clear()
        
        if deleted_size > 1024 * 1024:
            size_str = f"{deleted_size / (1024 * 1024):.2f} MB"
        elif deleted_size > 1024:
            size_str = f"{deleted_size / 1024:.2f} KB"
        else:
            size_str = f"{deleted_size} B"
        
        result_msg = f"✅ 已清除 {deleted_count} 个电台封面缓存文件\n释放空间: {size_str}\n电台列表缓存已清除\n\n请重新进入电台刷新"
        
        return {
            'list': [{
                'vod_id': 'clear_radio_result',
                'vod_name': result_msg,
                'vod_pic': self._generate_colored_icon("#4CAF50", "✓"),
                'vod_remarks': '清除完成',
                'style': {'type': 'list'},
                'vod_player': '书'
            }],
            'page': 1,
            'pagecount': 1,
            'limit': 1,
            'total': 1
        }
    
    # ==================== 查找本地封面图片并缓存 ====================
    
    def find_local_cover_image(self, audio_path):
        """查找本地封面图片 - 只识别同名图片，不使用通用封面"""
        audio_dir = os.path.dirname(audio_path)
        audio_name = os.path.splitext(os.path.basename(audio_path))[0]
        
        # 只精确匹配同名图片
        exact_names = [
            f"{audio_name}.jpg", f"{audio_name}.jpeg", f"{audio_name}.png",
            f"{audio_name}.webp", f"{audio_name}.gif",
            f"{audio_name}.JPG", f"{audio_name}.JPEG", f"{audio_name}.PNG"
        ]
        for cover_name in exact_names:
            cover_path = os.path.join(audio_dir, cover_name)
            if os.path.exists(cover_path) and os.path.isfile(cover_path):
                print(f"📁 精确匹配到同名封面: {cover_path}")
                return cover_path
        
        return None
    
    def cache_cover_image(self, audio_path, source_path):
        try:
            file_hash = hashlib.md5(audio_path.encode()).hexdigest()
            cache_file = f"{COVER_CACHE_DIR}{file_hash}.jpg"
            
            if os.path.exists(cache_file):
                return cache_file
            
            with open(source_path, 'rb') as f:
                img_data = f.read()
            
            if len(img_data) > 500 * 1024:
                img_data = UltraFastCoverExtractor._compress_image(img_data, max_size=(300, 300), quality=65)
            
            with open(cache_file, 'wb') as f:
                f.write(img_data)
            
            print(f"📁 封面已缓存: {cache_file}")
            return cache_file
        except Exception as e:
            print(f"缓存封面失败: {e}")
            return None
    
    # ==================== 极速封面获取接口 ====================
    
    def get_audio_cover_ultra_fast(self, file_path):
        ext = self.get_file_ext(file_path)
        
        cached_path = self._get_cached_cover_path(file_path)
        if cached_path:
            return f"file://{cached_path}"
        
        if CoverScanRecord.is_cover_cached(file_path):
            return self.DEFAULT_AUDIO_ICON
        
        cover_path = self.find_local_cover_image(file_path)
        if cover_path:
            cached = self.cache_cover_image(file_path, cover_path)
            if cached:
                CoverScanRecord.mark_cover_cached(file_path)
                return f"file://{cached}"
            else:
                CoverScanRecord.mark_cover_cached(file_path)
                return f"file://{cover_path}"
        
        try:
            if ext == 'mp3':
                cover_url = UltraFastCoverExtractor.extract_mp3_cover(file_path)
            elif ext == 'flac':
                cover_url = UltraFastCoverExtractor.extract_flac_cover(file_path)
            elif ext in ['m4a', 'mp4', 'm4b', 'm4p', 'aac']:
                cover_url = UltraFastCoverExtractor.extract_m4a_cover(file_path)
            else:
                cover_url = None
            
            if cover_url and cover_url.startswith('data:image'):
                import re
                match = re.match(r'data:image/(\w+);base64,(.+)', cover_url)
                if match:
                    img_base64 = match.group(2)
                    img_data = base64.b64decode(img_base64)
                    if len(img_data) > 500 * 1024:
                        img_data = UltraFastCoverExtractor._compress_image(img_data, max_size=(300, 300), quality=65)
                    
                    file_hash = hashlib.md5(file_path.encode()).hexdigest()
                    cache_file = f"{COVER_CACHE_DIR}{file_hash}.jpg"
                    with open(cache_file, 'wb') as f:
                        f.write(img_data)
                    cover_url = f"file://{cache_file}"
                    CoverScanRecord.mark_cover_cached(file_path)
                    print(f"🎵 内置封面已缓存: {os.path.basename(file_path)}")
                    return cover_url
            
            if cover_url:
                print(f"🎵 获取内置封面成功: {os.path.basename(file_path)}")
                CoverScanRecord.mark_cover_cached(file_path)
            else:
                print(f"🎵 无封面: {os.path.basename(file_path)}")
                CoverScanRecord.mark_cover_cached(file_path)
                
        except Exception as e:
            if self.debug_mode:
                self.log(f"[极速封面] 异常 {ext}: {e}")
            CoverScanRecord.mark_cover_cached(file_path)
        
        return cover_url or self.DEFAULT_AUDIO_ICON
    
    def preload_covers_batch(self, file_paths, max_count=500):
        if not file_paths:
            return
        
        uncached_paths = []
        for file_path in file_paths:
            if not CoverScanRecord.is_cover_cached(file_path):
                uncached_paths.append(file_path)
        
        if not uncached_paths:
            return
        
        uncached_paths = uncached_paths[:max_count]
        
        def load_single(file_path):
            self.get_audio_cover_ultra_fast(file_path)
        
        for path in uncached_paths:
            self.preload_executor.submit(load_single, path)
    
    # ==================== 优化的音频收集方法 ====================
    
    def collect_audios_in_dir(self, dir_path):
        try:
            if not os.path.exists(dir_path) or not os.path.isdir(dir_path):
                return []
            
            current_time = time.time()
            if dir_path in self.audio_list_cache:
                cache_time = self.audio_list_cache_time.get(dir_path, 0)
                if current_time - cache_time < self.audio_cache_duration:
                    return self.audio_list_cache[dir_path]
            
            audios = []
            start_time = current_time
            
            try:
                for name in os.listdir(dir_path):
                    if time.time() - start_time > self.audio_scan_timeout:
                        break
                    
                    if name.startswith('.'):
                        continue
                    
                    full_path = os.path.join(dir_path, name)
                    
                    if os.path.isdir(full_path):
                        continue
                    
                    ext = self.get_file_ext(name)
                    if ext in self.audio_exts:
                        try:
                            if os.access(full_path, os.R_OK):
                                audios.append({
                                    'name': name,
                                    'path': full_path,
                                    'ext': ext,
                                    'mtime': os.path.getmtime(full_path)
                                })
                        except:
                            pass
                        
                        if len(audios) >= self.max_audio_per_scan:
                            break
            except Exception as e:
                self.log(f"扫描异常: {e}")
            
            audios.sort(key=lambda x: x['name'])
            
            self.audio_list_cache[dir_path] = audios
            self.audio_list_cache_time[dir_path] = current_time
            
            return audios
        except Exception as e:
            self.log(f"collect_audios_in_dir错误: {e}")
            return []
    
    # ==================== 歌曲信息提取 ====================
    
    def extract_song_info(self, filename):
        name = os.path.splitext(filename)[0]
        
        name = re.sub(r'^\d+\.\s*', '', name)
        
        patterns_to_remove = [
            r'【.*?】', r'\[.*?\]', r'\{.*?\}', r'（.*?）',
            r'-\s*(?:320k|128k|192k|HQ|SQ|无损|高品质|高音质)',
            r'-\s*(?:Live|现场版|演唱会|歌词版|伴奏版)',
            r'\s*\(feat\..*?\)', r'\s*\(Feat\..*?\)',
            r'\s*ft\..*$', r'\s*Ft\..*$',
            r'-\d{8,}-\d+$',
            r'-\d+$',
        ]
        for pattern in patterns_to_remove:
            name = re.sub(pattern, '', name, flags=re.IGNORECASE)
        
        name = re.sub(r'\s+', ' ', name).strip()
        
        artist = ""
        song = name
        
        for sep in [' - ', '-', '–', '—', '：', ':']:
            if sep in name:
                parts = name.split(sep, 1)
                left = parts[0].strip()
                right = parts[1].strip()
                if len(left) < 30 and len(right) > 2:
                    artist, song = left, right
                    break
                elif len(right) < 30 and len(left) > 2:
                    artist, song = right, left
                    break
        
        if not artist and ' - ' in name:
            parts = name.split(' - ', 1)
            song, artist = parts[0].strip(), parts[1].strip()
        
        if not artist:
            feat_match = re.search(r'(.+?)\s*\(feat\.\s*(.+?)\)', name, re.IGNORECASE)
            if feat_match:
                song = feat_match.group(1).strip()
                artist = feat_match.group(2).strip()
        
        song = re.sub(r'[《》〈〉『』〔〕]', '', song).strip()
        artist = re.sub(r'热门歌曲.*$', '', artist).strip()
        artist = re.sub(r'：.*$', '', artist).strip()
        
        song = re.sub(r'-\d{8,}-\d+$', '', song)
        song = re.sub(r'-\d+$', '', song)
        
        if len(artist) > 30 and len(song) < 20:
            common_artists = [
                'G.E.M.', '邓紫棋', '周杰伦', '林俊杰', '陈奕迅', '蔡依林', '张惠妹',
                '王菲', '那英', '孙燕姿', '梁静茹', '洋澜一', '海来阿木', '程响'
            ]
            for ca in common_artists:
                if ca in artist:
                    song = artist.replace(ca, '').strip()
                    artist = ca
                    break
        
        return artist, song
    
    # ==================== 腾讯API网络获取（歌词） ====================
    
    def search_qq_song(self, song_name, artist_name=""):
        song_name = re.sub(r'-\d{8,}-\d+$', '', song_name)
        song_name = re.sub(r'-\d+$', '', song_name)
        song_name = song_name.strip()
        
        cache_key = f"qq_search_{song_name}_{artist_name}"
        if cache_key in self.song_info_cache:
            cache_time = self.song_info_cache.get(cache_key + "_time", 0)
            if time.time() - cache_time < 3600:
                return self.song_info_cache[cache_key]
        
        try:
            if artist_name and artist_name not in song_name:
                keyword = f"{song_name} {artist_name}"
            else:
                keyword = song_name
            
            keyword = keyword.strip()
            url = f"{self.QQ_OFFICIAL_SEARCH}?is_xml=0&format=json&key={urllib.parse.quote(keyword)}"
            
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Referer": "https://y.qq.com/",
                "Accept": "application/json"
            }
            
            resp = self.session.get(url, headers=headers, timeout=10)
            
            if resp.status_code == 200:
                data = resp.json()
                songs = data.get('data', {}).get('song', {}).get('itemlist', [])
                
                if songs:
                    best_match = None
                    for song in songs:
                        song_artist = song.get('singer', '')
                        song_name_api = song.get('name', '')
                        if artist_name and artist_name in song_artist:
                            best_match = song
                            break
                        if song_name.lower() in song_name_api.lower():
                            if not best_match:
                                best_match = song
                    
                    if not best_match:
                        best_match = songs[0]
                    
                    song_info = {
                        'name': best_match.get('name', ''),
                        'singer': best_match.get('singer', ''),
                        'mid': best_match.get('mid', ''),
                        'album': best_match.get('album', {}).get('name', '') if isinstance(best_match.get('album'), dict) else best_match.get('album', ''),
                        'interval': best_match.get('interval', 0)
                    }
                    
                    if song_info['mid']:
                        self.song_info_cache[cache_key] = song_info
                        self.song_info_cache[cache_key + "_time"] = time.time()
                        return song_info
        except Exception as e:
            self.log(f"[搜索] 异常: {e}")
        
        return None
    
    def get_qq_song_lyrics(self, song_mid):
        cache_key = f"qq_lyrics_{song_mid}"
        if cache_key in self.network_lyrics_cache:
            cache_time = self.network_lyrics_cache.get(cache_key + "_time", 0)
            if time.time() - cache_time < 86400:
                return self.network_lyrics_cache[cache_key]
        
        try:
            url = f"{self.QQ_OFFICIAL_LYRIC}?format=json&nobase64=0&songmid={song_mid}"
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Referer": "https://y.qq.com/",
                "Origin": "https://y.qq.com"
            }
            resp = self.session.get(url, headers=headers, timeout=10)
            
            if resp.status_code == 200:
                data = resp.json()
                if data.get('retcode') == 0:
                    lyrics = data.get('lyric', '')
                    if lyrics:
                        lyrics = base64.b64decode(lyrics).decode('utf-8')
                        if lyrics and len(lyrics) > 50:
                            self.network_lyrics_cache[cache_key] = lyrics
                            self.network_lyrics_cache[cache_key + "_time"] = time.time()
                            return lyrics
        except Exception as e:
            self.log(f"[歌词] 异常: {e}")
        
        return None
    
    # ==================== 本地歌词 ====================
    
    def _get_local_lyrics(self, file_path):
        audio_dir = os.path.dirname(file_path)
        audio_name = os.path.splitext(os.path.basename(file_path))[0]
        artist, song = self.extract_song_info(audio_name)
        
        cached_lyrics = LyricsCacheManager.load_lyrics(song, artist)
        if cached_lyrics:
            print(f"📝 使用缓存歌词: {song}")
            return cached_lyrics
        
        for lrc_ext in self.lrc_exts:
            test_path = os.path.join(audio_dir, f"{audio_name}.{lrc_ext}")
            if os.path.exists(test_path):
                try:
                    with open(test_path, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                        if content and len(content) > 20:
                            return content
                except:
                    pass
            test_path = os.path.join(audio_dir, f"{audio_name}.{lrc_ext.upper()}")
            if os.path.exists(test_path):
                try:
                    with open(test_path, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                        if content and len(content) > 20:
                            return content
                except:
                    pass
        
        for subdir in ['Lyrics', 'lyrics', '歌词', 'LRC', 'lrc']:
            lyrics_dir = os.path.join(audio_dir, subdir)
            if os.path.exists(lyrics_dir) and os.path.isdir(lyrics_dir):
                for name in os.listdir(lyrics_dir):
                    if name.startswith('.'):
                        continue
                    ext = self.get_file_ext(name)
                    if ext in self.lrc_exts:
                        lrc_name = os.path.splitext(name)[0]
                        if lrc_name == audio_name or lrc_name.lower() == audio_name.lower():
                            full_path = os.path.join(lyrics_dir, name)
                            try:
                                with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                                    content = f.read()
                                    if content and len(content) > 20:
                                        return content
                            except:
                                pass
        
        return None
    
    # ==================== 音频信息添加 ====================
    
    def _add_audio_info_fast(self, result, file_path):
        filename = os.path.basename(file_path)
        artist, song = self.extract_song_info(filename)
        
        result["title"] = song or filename
        result["artist"] = artist or ""
        
        cover_url = self.get_audio_cover_ultra_fast(file_path)
        if cover_url and cover_url != self.DEFAULT_AUDIO_ICON:
            result["vod_pic"] = cover_url
            print(f"🎵 设置封面URL: {cover_url[:80]}...")
        
        lyrics = self._get_local_lyrics(file_path)
        if lyrics:
            result["lrc"] = lyrics
            print(f"📝 获取歌词成功: {song or filename}")
        else:
            if song and self.enable_online_lyrics:
                try:
                    if LyricsCacheManager.is_lyrics_cached(song, artist):
                        cached_lyrics = LyricsCacheManager.load_lyrics(song, artist)
                        if cached_lyrics:
                            result["lrc"] = cached_lyrics
                            print(f"📝 从缓存加载歌词: {song}")
                    else:
                        song_info = self.search_qq_song(song, artist)
                        if song_info and song_info.get('mid'):
                            qq_lyrics = self.get_qq_song_lyrics(song_info['mid'])
                            if qq_lyrics:
                                result["lrc"] = qq_lyrics
                                LyricsCacheManager.save_lyrics(song, artist, qq_lyrics)
                                print(f"📝 下载并缓存歌词: {song}")
                except Exception as e:
                    self.log(f"获取网络歌词失败: {e}")
    
    # ==================== 扫描目录 ====================
    
    def scan_directory(self, dir_path):
        try:
            if not os.path.exists(dir_path) or not os.path.isdir(dir_path):
                return []
            
            audio_names = []
            all_items = []
            
            for name in os.listdir(dir_path):
                if name.startswith('.') or name in ['.', '..']:
                    continue
                
                full_path = os.path.join(dir_path, name)
                is_dir = os.path.isdir(full_path)
                ext = self.get_file_ext(name)
                
                all_items.append({
                    'name': name,
                    'path': full_path,
                    'is_dir': is_dir,
                    'ext': ext,
                    'mtime': os.path.getmtime(full_path) if not is_dir else 0,
                })
                
                if not is_dir and ext in self.audio_exts:
                    audio_names.append(os.path.splitext(name)[0])
            
            files = []
            for item in all_items:
                name = item['name']
                is_dir = item['is_dir']
                
                if is_dir:
                    files.append(item)
                    continue
                
                if self._should_hide_file(name, dir_path, audio_names):
                    continue
                
                files.append(item)
            
            files.sort(key=lambda x: (not x['is_dir'], x['name'].lower()))
            return files
        except Exception as e:
            self.log(f"扫描目录异常: {e}")
            return []
    
    def collect_videos_in_dir(self, dir_path):
        files = self.scan_directory(dir_path)
        return [f for f in files if not f['is_dir'] and f['ext'] in self.media_exts]
    
    def collect_images_in_dir(self, dir_path):
        files = self.scan_directory(dir_path)
        return [f for f in files if not f['is_dir'] and f['ext'] in self.image_exts]
    
    def get_file_icon(self, ext, is_dir=False):
        if is_dir:
            return '📁'
        if ext in self.media_exts:
            return '🎬'
        if ext in self.audio_exts:
            return '🎵'
        if ext in self.image_exts:
            return '🖼'
        if ext in self.list_exts:
            return '📋'
        if ext in self.lrc_exts:
            return '📝'
        if ext in self.db_exts:
            return '🗄️'
        if ext == 'php':
            return '🐘'
        if ext == 'py':
            return '🐍'
        if ext in self.archive_exts:
            return '🗜️'
        return '📄'
    
    def is_playable_url(self, url):
        u = str(url).lower().strip()
        if not u:
            return False
        
        protocols = [
            'http://', 'https://', 'rtmp://', 'rtsp://', 'udp://', 'rtp://', 
            'file://', 'pics://', 'mp3://', 'ftp://',
            'vod://', 'bilibili://', 'youtube://', 'rtmps://', 'rtmpt://', 'hls://',
            'http-live://', 'https-live://', 'tvbus://', 'tvbox://', 'live://', 'novel://', 'text://'
        ]
        if any(u.startswith(p) for p in protocols):
            return True
        
        exts = [
            '.mp4', '.mkv', '.avi', '.rmvb', '.mov', '.wmv', '.flv', 
            '.m3u8', '.ts', '.mp3', '.m4a', '.aac', '.flac', '.wav', 
            '.webm', '.ogg', '.m4v', '.f4v', '.3gp', '.mpg', '.mpeg',
            '.m3u', '.pls', '.asf', '.asx', '.wmx'
        ]
        if any(ext in u for ext in exts):
            return True
        
        patterns = [
            'youtu.be/', 'youtube.com/', 'bilibili.com/', 'iqiyi.com/', 
            'v.qq.com/', 'youku.com/', 'tudou.com/', 'mgtv.com/',
            'sohu.com/', 'acfun.cn/', 'douyin.com/', 'kuaishou.com/',
            'huya.com/', 'douyu.com/', 'twitch.tv/', 'live.'
        ]
        return any(p in u for p in patterns)
    
    # ==================== 彩色图标生成 ====================
    
    def _generate_colored_icon(self, color, text):
        svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
            <rect width="200" height="200" rx="40" ry="40" fill="{color}"/>
            <circle cx="100" cy="100" r="70" fill="white" opacity="0.3"/>
            <text x="100" y="140" font-size="100" text-anchor="middle" fill="white" font-family="Arial" font-weight="bold">{text}</text>
        </svg>'''
        return f"data:image/svg+xml;base64,{base64.b64encode(svg.encode()).decode()}"
    
    # ==================== JSON文件解析 ====================
    
    def parse_json_file(self, file_path):
        items = []
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read(150 * 1024 * 1024)
            
            if content.startswith('\ufeff'):
                content = content[1:]
            
            data = json.loads(content)
            
            if isinstance(data, list):
                item_list = data
            elif isinstance(data, dict):
                if 'vod_play_url' in data:
                    return self._handle_vod_format(data, file_path)
                if 'vod_play_from' in data and 'vod_play_url' in data:
                    return self._handle_multi_line_vod(data, file_path)
                
                possible_keys = ['list', 'data', 'items', 'videos', 'vod', 'results', 'rows']
                item_list = None
                for key in possible_keys:
                    if key in data and isinstance(data[key], list):
                        item_list = data[key]
                        break
                
                if item_list is None and all(isinstance(v, dict) for v in data.values()):
                    item_list = list(data.values())
                if item_list is None:
                    item_list = [data]
            else:
                return items
            
            for idx, item in enumerate(item_list):
                if not isinstance(item, dict):
                    if isinstance(item, str) and self.is_playable_url(item):
                        items.append({
                            'name': f'链接{idx+1}',
                            'url': item,
                            'pic': '',
                            'remarks': ''
                        })
                    continue
                
                name = self._extract_json_field(item, ['name', 'title', 'vod_name', 'video_name', 'show_name'])
                if not name:
                    name = f"项目{idx+1}"
                
                url = self._extract_json_field(item, ['url', 'link', 'play_url', 'video_url', 'vod_url', 'vod_play_url'])
                
                if not url:
                    play_url_raw = self._extract_json_field(item, ['vod_play_url', 'play_url'])
                    if play_url_raw and ('$' in play_url_raw or '#' in play_url_raw):
                        episodes = self._parse_multi_episodes(play_url_raw, name)
                        for ep in episodes:
                            ep_item = {
                                'name': ep['name'],
                                'url': ep['url'],
                                'pic': self._extract_json_field(item, ['pic', 'cover', 'image', 'vod_pic'], True),
                                'remarks': self._extract_json_field(item, ['remarks', 'vod_remarks', 'note'])
                            }
                            items.append(ep_item)
                        continue
                    elif play_url_raw:
                        url = play_url_raw
                
                if not url or not self.is_playable_url(url):
                    continue
                
                pic = self._extract_json_field(item, ['pic', 'cover', 'image', 'vod_pic'], True)
                remarks = self._extract_json_field(item, ['remarks', 'vod_remarks', 'note'])
                
                items.append({
                    'name': name,
                    'url': url,
                    'pic': pic,
                    'remarks': remarks
                })
        except Exception as e:
            self.log(f"JSON解析异常: {e}")
        
        return items
    
    def _handle_vod_format(self, data, file_path):
        items = []
        name = data.get('vod_name') or data.get('name') or os.path.splitext(os.path.basename(file_path))[0]
        play_url = data.get('vod_play_url', '')
        pic = data.get('vod_pic') or data.get('pic') or ''
        remarks = data.get('vod_remarks', '')
        
        if play_url and ('$' in play_url or '#' in play_url):
            episodes = self._parse_multi_episodes(play_url, name)
            for ep in episodes:
                items.append({
                    'name': ep['name'],
                    'url': ep['url'],
                    'pic': pic,
                    'remarks': remarks
                })
        else:
            items.append({
                'name': name,
                'url': play_url,
                'pic': pic,
                'remarks': remarks
            })
        return items
    
    def _handle_multi_line_vod(self, data, file_path):
        items = []
        vod_name = data.get('vod_name') or data.get('name') or os.path.splitext(os.path.basename(file_path))[0]
        vod_pic = data.get('vod_pic') or data.get('pic') or ''
        
        play_from = data.get('vod_play_from', '')
        play_url = data.get('vod_play_url', '')
        
        from_list = play_from.split('$$$') if play_from else ['默认线路']
        url_list = play_url.split('$$$') if play_url else ['']
        
        for from_name, url_group in zip(from_list, url_list):
            if url_group and ('$' in url_group or '#' in url_group):
                episodes = self._parse_multi_episodes(url_group, f"{vod_name}[{from_name}]")
                for ep in episodes:
                    items.append({
                        'name': ep['name'],
                        'url': ep['url'],
                        'pic': vod_pic,
                        'remarks': f'线路:{from_name}'
                    })
        
        return items
    
    def _parse_multi_episodes(self, play_url_raw, base_name):
        episodes = []
        groups = play_url_raw.split('$$$')
        for group in groups:
            if not group:
                continue
            parts = group.split('#')
            for part in parts:
                if not part:
                    continue
                if '$' in part:
                    ep_name, ep_url = part.split('$', 1)
                    episodes.append({
                        'name': ep_name.strip(),
                        'url': ep_url.strip()
                    })
                else:
                    episodes.append({
                        'name': f"{base_name} - 节目{len(episodes)+1}",
                        'url': part.strip()
                    })
        return episodes
    
    def _extract_json_field(self, item, field_names, is_image=False):
        for field in field_names:
            if field in item and item[field]:
                value = item[field]
                if isinstance(value, dict):
                    for url_field in ['url', 'src', 'path', 'file']:
                        if url_field in value and value[url_field]:
                            return str(value[url_field])
                    if is_image:
                        for img_field in ['large', 'medium', 'small', 'thumb']:
                            if img_field in value and value[img_field]:
                                return str(value[img_field])
                    return str(value)
                elif isinstance(value, list) and value:
                    if is_image:
                        first = value[0]
                        if isinstance(first, dict):
                            for url_field in ['url', 'src', 'path']:
                                if url_field in first and first[url_field]:
                                    return str(first[url_field])
                            return str(first)
                        else:
                            return str(first)
                    else:
                        for v in value:
                            if v and isinstance(v, str):
                                return v
                        return str(value[0]) if value else ''
                else:
                    return str(value).strip()
        return ''
    
    # ==================== 数据库文件解析 ====================
    
    def parse_db_file(self, file_path):
        return self.db_reader.read_sqlite(file_path, MAX_DB_RESULTS)
    
    # ==================== 在线直播 ====================
    
    def _get_domain_from_url(self, url):
        try:
            from urllib.parse import urlparse
            domain = urlparse(url).netloc
            return domain.split(':')[0] if ':' in domain else domain
        except:
            return ""
    
    def _fetch_with_auto_headers(self, url, source=None):
        """使用自动适配的请求头获取内容"""
        domain = self._get_domain_from_url(url)
        
        # 首先尝试域名专用请求头
        if domain in self.domain_specific_headers:
            for headers_info in self.domain_specific_headers[domain]:
                try:
                    print(f"📺 尝试 {headers_info['name']} 请求头...")
                    resp = self.session.get(url, headers=headers_info['headers'], timeout=15)
                    if resp.status_code == 200:
                        print(f"📺 请求成功")
                        return resp.text
                    else:
                        print(f"📺 状态码: {resp.status_code}")
                except Exception as e:
                    print(f"📺 请求失败: {e}")
                    continue
        
        # 如果有源配置的专用UA
        if source:
            custom_headers = {}
            if source.get('ua'):
                custom_headers['User-Agent'] = source['ua']
            if source.get('referer'):
                custom_headers['Referer'] = source['referer']
            if custom_headers:
                custom_headers['Accept'] = '*/*'
                custom_headers['Connection'] = 'keep-alive'
                try:
                    print(f"📺 尝试源专用请求头...")
                    resp = self.session.get(url, headers=custom_headers, timeout=15)
                    if resp.status_code == 200:
                        print(f"📺 源专用请求头成功")
                        return resp.text
                except Exception as e:
                    print(f"📺 源专用请求头失败: {e}")
        
        # 尝试通用请求头列表
        for headers_info in self.common_headers_list:
            try:
                print(f"📺 尝试 {headers_info['name']} 请求头...")
                resp = self.session.get(url, headers=headers_info['headers'], timeout=10)
                if resp.status_code == 200:
                    print(f"📺 请求成功")
                    return resp.text
                else:
                    print(f"📺 状态码: {resp.status_code}")
            except Exception as e:
                print(f"📺 请求失败: {e}")
                continue
        
        # 最后尝试默认请求头
        try:
            print(f"📺 尝试默认请求头...")
            resp = self.session.get(url, headers=self.headers, timeout=15)
            if resp.status_code == 200:
                print(f"📺 默认请求头成功")
                return resp.text
        except Exception as e:
            print(f"📺 默认请求头失败: {e}")
        
        return None
    
    def _get_live_programs(self, source):
        source_id = source['id']
        current_time = time.time()
        
        if source_id in self.live_cache and current_time - self.live_cache_time.get(source_id, 0) < self.live_cache_duration:
            print(f"📺 使用缓存: {source['name']}, {len(self.live_cache[source_id])} 个频道")
            return self.live_cache[source_id]
        
        print(f"📺 开始获取直播源: {source['name']}")
        content = self._fetch_with_auto_headers(source['url'], source)
        if not content:
            print(f"📺 获取失败: {source['name']}")
            return []
        
        programs = self._parse_live_content(content, source)
        if programs:
            self.live_cache[source_id] = programs
            self.live_cache_time[source_id] = current_time
            print(f"📺 解析成功: {source['name']}, {len(programs)} 个频道")
        else:
            print(f"📺 解析失败: {source['name']}")
        return programs
    
    def _parse_live_content(self, content, source):
        if source.get('type') == 'txt' or ',#genre#' in content:
            return self._parse_txt_live(content)
        elif content.strip().startswith(('{', '[')):
            return self._parse_json_live(content)
        else:
            return self._parse_m3u_live(content)
    
    def _parse_m3u_live(self, content):
        programs = []
        lines = content.split('\n')
        current_name = None
        for line in lines:
            line = line.strip()
            if not line:
                continue
            if line.startswith('#EXTINF:'):
                name_match = re.search(r',(.+)$', line) or re.search(r'tvg-name="([^"]+)"', line)
                current_name = name_match.group(1).strip() if name_match else None
            elif line and not line.startswith('#') and current_name:
                if self.is_playable_url(line):
                    programs.append({'name': current_name, 'url': line})
                current_name = None
        return programs
    
    def _parse_txt_live(self, content):
        programs = []
        lines = content.split('\n')
        current_cat = None
        for line in lines:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            if ',#genre#' in line:
                current_cat = line.split(',')[0].strip()
                continue
            if ',' in line:
                parts = line.split(',', 1)
                name = parts[0].strip()
                url = parts[1].strip()
                if self.is_playable_url(url):
                    display_name = f"[{current_cat}] {name}" if current_cat else name
                    programs.append({'name': display_name, 'url': url})
        return programs
    
    def _parse_json_live(self, content):
        programs = []
        try:
            data = json.loads(content)
            items = []
            if isinstance(data, dict):
                for key in ['list', 'data', 'items', 'videos']:
                    if key in data and isinstance(data[key], list):
                        items = data[key]
                        break
                if not items:
                    items = [data]
            else:
                items = data
            for item in items:
                if isinstance(item, dict):
                    name = item.get('name') or item.get('title')
                    url = item.get('url') or item.get('play_url')
                    if name and url and self.is_playable_url(url):
                        programs.append({'name': name, 'url': url})
        except:
            pass
        return programs
    
    # ==================== TXT文件解析（增强版 - 支持抖音换行分割URL） ====================
    
    def _is_txt_live_source(self, content, file_path=None):
        if ',#genre#' in content.lower():
            return True
        
        if file_path:
            file_name_lower = os.path.basename(file_path).lower()
            if any(kw in file_name_lower for kw in ['直播', 'live', '抖音', 'douyin', '视频', 'video']):
                url_count = 0
                lines = content.split('\n')[:50]
                for line in lines:
                    if 'http://' in line or 'https://' in line:
                        url_count += 1
                        if url_count >= 2:
                            return True
        
        url_count = 0
        lines = content.split('\n')[:50]
        for line in lines:
            if 'http://' in line or 'https://' in line:
                url_count += 1
                if url_count >= 3:
                    return True
        
        return False
    
    def _is_txt_novel(self, content, file_path=None):
        chapter_patterns = [
            r'第[一二三四五六七八九十百千万0-9]+章',
            r'第[一二三四五六七八九十百千万0-9]+节',
            r'序章|楔子|尾声',
            r'Chapter\s+\d+'
        ]
        
        preview = content[:5000]
        chapter_count = 0
        for pattern in chapter_patterns:
            matches = re.findall(pattern, preview)
            chapter_count += len(matches)
            if chapter_count >= 3:
                return True
        
        if file_path:
            file_name_lower = os.path.basename(file_path).lower()
            if any(kw in file_name_lower for kw in ['小说', 'novel', 'book', 'txt']):
                url_count = len(re.findall(r'https?://', preview))
                if url_count < 5 and len(preview) > 2000:
                    return True
        
        return False
    
    def _merge_split_urls(self, content):
        lines = [line.rstrip('\r\n') for line in content.split('\n') if line.strip()]
        
        merged_lines = []
        current_url = ""
        i = 0
        
        while i < len(lines):
            line = lines[i].strip()
            
            if re.match(r'^\d+\s*$', line):
                merged_lines.append(line)
                i += 1
                continue
            
            if line.startswith(('http://', 'https://')):
                current_url = line
                i += 1
                while i < len(lines):
                    next_line = lines[i].strip()
                    if re.match(r'^\d+\s*$', next_line) or next_line.startswith(('http://', 'https://')):
                        break
                    current_url += next_line
                    i += 1
                merged_lines.append(current_url)
                current_url = ""
            elif re.match(r'^\d+\s*[, ]', line):
                merged_lines.append(line)
                i += 1
            else:
                merged_lines.append(line)
                i += 1
        
        result_lines = []
        for line in merged_lines:
            if 'http://' in line or 'https://' in line:
                line = re.sub(r'(https?://[^\s]*?)\s+([^\s]+)', r'\1\2', line)
                line = line.replace(' ', '').replace('\t', '').replace('\r', '').replace('\n', '')
            result_lines.append(line)
        
        return '\n'.join(result_lines)
    
    def _parse_txt_file(self, file_path):
        items = []
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            content = self._merge_split_urls(content)
            is_live = self._is_txt_live_source(content, file_path)
            
            if not is_live and self._is_txt_novel(content, file_path):
                return []
            
            lines = []
            for line in content.split('\n'):
                line = line.strip()
                if not line:
                    continue
                lines.append(line)
            
            current_cat = None
            for line in lines:
                if ',#genre#' in line:
                    current_cat = line.split(',')[0].strip()
                    continue
                
                if line.startswith(('http://', 'https://')):
                    if self.is_playable_url(line):
                        name = current_cat if current_cat else f"视频{len(items)+1}"
                        items.append({'name': name, 'url': line})
                    continue
                
                if re.match(r'^\d+\s*[, ]', line):
                    url_match = re.search(r'[, ](https?://.+)', line)
                    if url_match:
                        url = url_match.group(1).strip()
                        url = re.sub(r'\s+', '', url)
                        name_match = re.match(r'^(\d+)\s*[, ]', line)
                        name = f"视频{name_match.group(1)}" if name_match else "视频"
                        if self.is_playable_url(url):
                            display_name = f"[{current_cat}] {name}" if current_cat else name
                            items.append({'name': display_name, 'url': url})
                    continue
                
                if ',' in line:
                    parts = line.split(',', 1)
                    name = parts[0].strip()
                    url = parts[1].strip()
                    url = re.sub(r'\s+', '', url)
                    if self.is_playable_url(url):
                        display_name = f"[{current_cat}] {name}" if current_cat else name
                        items.append({'name': display_name, 'url': url})
            
            seen = set()
            unique_items = []
            for item in items:
                key = f"{item['name']}|{item['url']}"
                if key not in seen:
                    seen.add(key)
                    unique_items.append(item)
            
            return unique_items
            
        except Exception as e:
            self.log(f"解析TXT文件失败: {e}")
            return []
    
    # ==================== 首页和分类 ====================
    
    def homeContent(self, filter):
        classes = []
        for i, path in enumerate(self.root_paths):
            if os.path.exists(path):
                name = self.path_to_chinese.get(path, os.path.basename(path.rstrip('/')) or f'目录{i}')
                classes.append({"type_id": f"root_{i}", "type_name": name})
        classes.append({"type_id": "recent", "type_name": "最近添加"})
        classes.append({"type_id": self.live_category_id, "type_name": self.live_category_name})
        classes.append({"type_id": "online_radio", "type_name": "📻 网络电台"})
        classes.append({"type_id": "short_video", "type_name": "📱 短视频"})
        classes.append({"type_id": "gallery", "type_name": "🎨 画廊"})
        
        # 字母分成4行显示
        alphabet_row1 = ['全部', 'A', 'B', 'C', 'D', 'E', 'F']
        alphabet_row2 = ['G', 'H', 'I', 'J', 'K', 'L', 'M']
        alphabet_row3 = ['N', 'O', 'P', 'Q', 'R', 'S', 'T']
        alphabet_row4 = ['U', 'V', 'W', 'X', 'Y', 'Z']
        
        # 数字分成2行显示
        digit_row1 = [
            {"n": "🔢 全部数字", "v": "all_digits"},
            {"n": "0️⃣ 0", "v": "0"},
            {"n": "1️⃣ 1", "v": "1"},
            {"n": "2️⃣ 2", "v": "2"},
            {"n": "3️⃣ 3", "v": "3"},
            {"n": "4️⃣ 4", "v": "4"}
        ]
        digit_row2 = [
            {"n": "5️⃣ 5", "v": "5"},
            {"n": "6️⃣ 6", "v": "6"},
            {"n": "7️⃣ 7", "v": "7"},
            {"n": "8️⃣ 8", "v": "8"},
            {"n": "9️⃣ 9", "v": "9"}
        ]
        
        filters = {
            "online_radio": [
                {
                    "key": "category",
                    "name": "📻 电台分类",
                    "value": [
                        {"n": "🎵 音乐电台", "v": "442"},
                        {"n": "🚗 交通电台", "v": "429"},
                        {"n": "📻 江苏电台", "v": "85"},
                        {"n": "📻 广东电台", "v": "217"},
                        {"n": "📻 浙江电台", "v": "99"},
                        {"n": "📻 北京电台", "v": "3"},
                        {"n": "📻 天津电台", "v": "5"},
                        {"n": "📻 河北电台", "v": "7"},
                        {"n": "📻 上海电台", "v": "83"},
                        {"n": "📻 山西电台", "v": "19"},
                        {"n": "📻 内蒙古电台", "v": "31"},
                        {"n": "📻 辽宁电台", "v": "44"},
                        {"n": "📻 吉林电台", "v": "59"},
                        {"n": "📻 黑龙江电台", "v": "69"},
                        {"n": "📻 安徽电台", "v": "111"},
                        {"n": "📻 福建电台", "v": "129"},
                        {"n": "📻 江西电台", "v": "139"},
                        {"n": "📻 山东电台", "v": "151"},
                        {"n": "📻 河南电台", "v": "169"},
                        {"n": "📻 湖北电台", "v": "187"},
                        {"n": "📻 湖南电台", "v": "202"},
                        {"n": "📻 广西电台", "v": "239"},
                        {"n": "📻 海南电台", "v": "254"},
                        {"n": "📻 重庆电台", "v": "257"},
                        {"n": "📻 四川电台", "v": "259"},
                        {"n": "📻 贵州电台", "v": "281"},
                        {"n": "📻 云南电台", "v": "291"},
                        {"n": "📻 陕西电台", "v": "316"},
                        {"n": "📻 甘肃电台", "v": "327"},
                        {"n": "📻 宁夏电台", "v": "351"},
                        {"n": "📻 新疆电台", "v": "357"},
                        {"n": "📻 西藏电台", "v": "308"},
                        {"n": "📻 青海电台", "v": "342"},
                        {"n": "🎤 资讯电台", "v": "433"},
                        {"n": "💰 经济电台", "v": "439"},
                        {"n": "🎭 文艺电台", "v": "432"},
                        {"n": "🏙️ 都市电台", "v": "441"},
                        {"n": "⚽ 体育电台", "v": "430"},
                        {"n": "🌐 双语电台", "v": "431"},
                        {"n": "📰 综合电台", "v": "440"},
                        {"n": "🏠 生活电台", "v": "438"},
                        {"n": "✈️ 旅游电台", "v": "435"},
                        {"n": "🎪 曲艺电台", "v": "436"},
                        {"n": "🗣️ 方言电台", "v": "434"}
                    ]
                }
            ]
        }
        
        # 为每个根目录添加筛选器（4行字母 + 2行数字 + 缓存管理）
        for i in range(len(self.root_paths)):
            root_key = f"root_{i}"
            filters[root_key] = [
                {
                    "key": "letter_row1",
                    "name": "🔤 字母筛选 A-G",
                    "value": [{"n": l, "v": l} for l in alphabet_row1]
                },
                {
                    "key": "letter_row2",
                    "name": "🔤 字母筛选 F-N",
                    "value": [{"n": l, "v": l} for l in alphabet_row2]
                },
                {
                    "key": "letter_row3",
                    "name": "🔤 字母筛选 U-T",
                    "value": [{"n": l, "v": l} for l in alphabet_row3]
                },
                {
                    "key": "letter_row4",
                    "name": "🔤 字母筛选 U-Z",
                    "value": [{"n": l, "v": l} for l in alphabet_row4]
                },
                {
                    "key": "digit_row1",
                    "name": "🔢 数字筛选 0-3",
                    "value": digit_row1
                },
                {
                    "key": "digit_row2",
                    "name": "🔢 数字筛选 4-9",
                    "value": digit_row2
                },
                {
                    "key": "action",
                    "name": "🗑️ 缓存管理",
                    "value": [
                        {"n": "🗑️ 清除封面缓存", "v": "clear_cover_cache"},
                        {"n": "📝 清除歌词缓存", "v": "clear_lyrics_cache"},
                        {"n": "📻 清除电台封面缓存", "v": "clear_radio_cover_cache"}
                    ]
                }
            ]
        
        return {'class': classes, 'filters': filters}
    
    # ==================== 在线电台（优化版） ====================
    
    def _online_radio_content(self, category_id, pg):
        pg = int(pg) if pg else 1
        
        radios = self._get_radios_by_category(category_id)
        
        if not radios:
            return {'list': [], 'page': pg, 'pagecount': 1}
        
        vlist = []
        for radio in radios:
            radio_id = str(radio['id'])
            radio_name = radio['name']
            
            if radio_id in self.cached_radio_ids:
                pic = f"file://{RADIO_COVER_CACHE_DIR}{radio_id}.jpg"
            else:
                pic = radio.get('pic', '')
                if pic and not RadioCoverRecord.is_cached(radio_id):
                    self.preload_executor.submit(self._cache_radio_cover, radio_id, pic)
            
            remarks = radio.get('desc', '蜻蜓FM')
            
            vlist.append({
                'vod_id': radio_id,
                'vod_name': radio_name,
                'vod_pic': pic,
                'vod_remarks': remarks,
                'style': {'type': 'grid', 'ratio': 0.75},
                'vod_player': '听'
            })
        
        per_page = 30
        total = len(vlist)
        start = (pg - 1) * per_page
        end = min(start + per_page, total)
        pagecount = (total + per_page - 1) // per_page if total > 0 else 1
        
        return {
            'list': vlist[start:end],
            'page': pg,
            'pagecount': pagecount,
            'limit': per_page,
            'total': total
        }
    
    def _get_radios_by_category(self, category_id):
        cache_key = f"radio_category_{category_id}"
        current_time = time.time()
        
        if cache_key in self.radio_cache and current_time - self.radio_cache_time.get(cache_key, 0) < 1800:
            print(f"📻 使用内存缓存: {len(self.radio_cache[cache_key])} 个电台")
            return self.radio_cache[cache_key]
        
        file_cache_path = f"/storage/emulated/0/tmp/radio_list_{category_id}.json"
        if os.path.exists(file_cache_path):
            try:
                mtime = os.path.getmtime(file_cache_path)
                if current_time - mtime < 86400:
                    with open(file_cache_path, 'r', encoding='utf-8') as f:
                        all_radios = json.load(f)
                    print(f"📻 使用文件缓存: {len(all_radios)} 个电台")
                    self.radio_cache[cache_key] = all_radios
                    self.radio_cache_time[cache_key] = current_time
                    return all_radios
            except:
                pass
        
        print(f"📻 开始获取电台列表...")
        all_radios = []
        page = 1
        
        while True:
            url = f"http://www.qingting.fm/radiopage/{category_id}/{page}"
            
            try:
                print(f"📻 请求电台URL: {url}")
                
                headers = {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                    "Referer": "http://www.qingting.fm/",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
                }
                
                response = self.session.get(url, headers=headers, timeout=15)
                response.encoding = 'utf-8'
                html = response.text
                
                if '<div class="radio' not in html and 'class="radio-item"' not in html:
                    print(f"📻 第{page}页无内容，停止翻页")
                    break
                
                radios = self._parse_radio_page(html)
                
                if not radios:
                    print(f"📻 第{page}页解析到0个电台，停止翻页")
                    break
                
                print(f"📻 第{page}页解析到 {len(radios)} 个电台")
                
                existing_ids = {r['id'] for r in all_radios}
                new_count = 0
                for radio in radios:
                    if radio['id'] not in existing_ids:
                        all_radios.append(radio)
                        existing_ids.add(radio['id'])
                        new_count += 1
                
                print(f"📻 第{page}页新增 {new_count} 个电台")
                
                if len(radios) < 12:
                    print(f"📻 第{page}页少于12个电台，已到最后一页")
                    break
                
                page += 1
                time.sleep(0.3)
                
            except Exception as e:
                print(f"📻 获取第{page}页失败: {e}")
                break
        
        print(f"📻 总共解析到 {len(all_radios)} 个电台")
        
        try:
            with open(file_cache_path, 'w', encoding='utf-8') as f:
                json.dump(all_radios, f, ensure_ascii=False, indent=2)
            print(f"📻 已保存电台列表到文件缓存")
        except:
            pass
        
        self.radio_cache[cache_key] = all_radios
        self.radio_cache_time[cache_key] = current_time
        
        return all_radios
    
    def _parse_radio_page(self, html):
        radios = []
        
        try:
            from pyquery import PyQuery as pq
            doc = pq(html)
            
            items = doc(".contentSec .radio, .radio-list .radio-item")
            
            for li in items.items():
                a = li("a").eq(0)
                href = a.attr("href") or ""
                
                radio_id_match = re.search(r'/radios/(\d+)', href)
                if not radio_id_match:
                    continue
                radio_id = radio_id_match.group(1)
                
                name = li("span").text() or a.attr("title") or a.text() or li(".name").text()
                if not name:
                    continue
                name = name.strip()
                
                pic = li("img").attr("src") or ""
                if pic:
                    if pic.startswith('//'):
                        pic = 'http:' + pic
                    elif not pic.startswith('http'):
                        pic = 'http://www.qingting.fm' + pic
                    pic = pic.replace('/160/', '/300/').replace('/120/', '/300/')
                    pic = pic.replace('//', '/').replace('http:/', 'http://')
                
                desc = li(".descRadio, .desc, .radio-desc").text() or "直播中"
                desc = desc.strip()
                
                radios.append({
                    'id': radio_id,
                    'name': name,
                    'pic': pic,
                    'desc': desc
                })
                
        except ImportError:
            pattern = r'<a[^>]*href="/radios/(\d+)"[^>]*>.*?<img[^>]*src="([^"]+)"[^>]*>.*?<span[^>]*>([^<]+)</span>'
            matches = re.findall(pattern, html, re.DOTALL)
            
            for radio_id, pic, name in matches:
                name = name.strip()
                if name and len(name) > 1:
                    if pic:
                        if pic.startswith('//'):
                            pic = 'http:' + pic
                        elif not pic.startswith('http'):
                            pic = 'http://www.qingting.fm' + pic
                        pic = pic.replace('/160/', '/300/').replace('/120/', '/300/')
                    radios.append({
                        'id': radio_id,
                        'name': name,
                        'pic': pic,
                        'desc': "蜻蜓FM"
                    })
        
        return radios
    
    def _radio_detail_content(self, radio_id):
        radio_id = str(radio_id)
        
        if radio_id in self.cached_radio_ids:
            radio_pic_url = f"file://{RADIO_COVER_CACHE_DIR}{radio_id}.jpg"
        else:
            cached_cover = self._get_radio_cached_cover_path(radio_id)
            if cached_cover:
                self.cached_radio_ids.add(radio_id)
                radio_pic_url = f"file://{cached_cover}"
            else:
                radio_pic_url = ""
        
        radio_name = f"电台_{radio_id}"
        for cache_key in self.radio_cache:
            for radio in self.radio_cache[cache_key]:
                if str(radio['id']) == radio_id:
                    radio_name = radio['name']
                    break
            if radio_name != f"电台_{radio_id}":
                break
        
        program_info = RadioProgramFetcher.get_current_program(radio_id)
        
        play_url = f"http://lhttp.qingting.fm/live/{radio_id}/64k.mp3"
        encoded_play_url = self.e64(f"0@@@@{play_url}")
        
        program_text = ""
        if program_info:
            program_text = f"🎙️ 正在播放: {program_info.get('current', '加载中')}"
            if program_info.get('current_time'):
                program_text += f" ({program_info['current_time']})"
            if program_info.get('next') and program_info['next'] != '即将播出':
                program_text += f"\n⏩ 下一节目: {program_info['next']}"
        else:
            program_text = "🎙️ 正在播出"
        
        vod = {
            "vod_id": radio_id,
            "vod_name": radio_name,
            "vod_pic": radio_pic_url,
            "vod_actor": "蜻蜓FM",
            "vod_remarks": program_text,
            "vod_content": program_text,
            "vod_play_from": "蜻蜓FM",
            "vod_play_url": f"播放${encoded_play_url}",
            "style": {"type": "list"},
            "vod_player": "听"
        }
        
        return {"list": [vod]}
    
    # ==================== 本地代理 ====================
    
    def localProxy(self, param):
        url = param.get("url", "")
        if not url:
            return None
        
        url = urllib.parse.unquote(url)
        
        if url.startswith('file://'):
            file_path = url[7:]
            if os.path.exists(file_path) and os.path.isfile(file_path):
                try:
                    with open(file_path, 'rb') as f:
                        content = f.read()
                    content_type = 'application/octet-stream'
                    if file_path.endswith('.jpg') or file_path.endswith('.jpeg'):
                        content_type = 'image/jpeg'
                    elif file_path.endswith('.png'):
                        content_type = 'image/png'
                    elif file_path.endswith('.gif'):
                        content_type = 'image/gif'
                    elif file_path.endswith('.webp'):
                        content_type = 'image/webp'
                    return [200, content_type, content, {}]
                except Exception as e:
                    print(f"读取本地文件失败 {file_path}: {e}")
                    return [404, "text/plain", b"File not found", {}]
            return [404, "text/plain", b"File not found", {}]
        
        if param.get("type") == "img":
            try:
                response = self.session.get(url, headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                    "Referer": "http://www.qingting.fm/"
                }, timeout=10)
                if response.status_code == 200:
                    content_type = response.headers.get('Content-Type', 'image/jpeg')
                    return [200, content_type, response.content, {}]
            except Exception as e:
                print(f"代理下载图片失败: {e}")
            return [404, "text/plain", b"Error", {}]
        
        # 短视频代理请求
        if url.startswith('http'):
            try:
                headers = {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                    "Referer": "https://www.douyin.com/",
                    "Accept": "video/mp4,video/*;q=0.9,*/*;q=0.8"
                }
                response = self.session.get(url, headers=headers, timeout=15)
                if response.status_code == 200:
                    content_type = response.headers.get('Content-Type', 'video/mp4')
                    return [200, content_type, response.content, {}]
            except:
                pass
        
        return None
    
    # ==================== 短视频（从磁力.py完整移植） ====================
    
    def _get_video_cover(self, api_name):
        """为短视频生成封面（使用图库的随机图）"""
        cover_apis = self.video_cover_apis
        idx = hash(api_name) % len(cover_apis)
        cover_api = cover_apis[idx]
        return self._make_random_url(cover_api)
    
    def _make_random_url(self, api_url):
        """生成带随机参数的URL"""
        if '?' in api_url:
            return f"{api_url}&_r={random.randint(1, 999999)}&_t={int(time.time())}"
        else:
            return f"{api_url}?_r={random.randint(1, 999999)}&_t={int(time.time())}"
    
    def _get_real_video_url(self, api_url):
        """获取真实的视频URL（带完整请求头）"""
        cache_key = f"real_url_{api_url}"
        if cache_key in self.video_cache:
            cache_time = self.video_cache_time.get(cache_key, 0)
            if time.time() - cache_time < 300:
                return self.video_cache[cache_key]
        
        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
                "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
                "Accept-Encoding": "gzip, deflate",
                "Connection": "keep-alive",
                "Upgrade-Insecure-Requests": "1",
                "Referer": "https://www.douyin.com/"
            }
            
            resp = self.session.get(api_url, headers=headers, timeout=15, allow_redirects=True)
            
            # 检查最终URL是否是视频
            final_url = resp.url
            if any(ext in final_url.lower() for ext in ['.mp4', '.m3u8', '.flv', '.mov']):
                self.video_cache[cache_key] = final_url
                self.video_cache_time[cache_key] = time.time()
                return final_url
            
            # 检查Content-Type
            content_type = resp.headers.get('Content-Type', '')
            if 'video' in content_type:
                self.video_cache[cache_key] = api_url
                self.video_cache_time[cache_key] = time.time()
                return api_url
            
            # 尝试从响应中提取视频URL
            if resp.text:
                patterns = [
                    r'(https?://[^\s"\']+\.mp4[^\s"\']*)',
                    r'(https?://[^\s"\']+\.m3u8[^\s"\']*)',
                    r'(https?://[^\s"\']+\.flv[^\s"\']*)',
                    r'"url"\s*:\s*"([^"]+)"',
                    r'"video_url"\s*:\s*"([^"]+)"',
                    r'"play_url"\s*:\s*"([^"]+)"',
                ]
                for pattern in patterns:
                    match = re.search(pattern, resp.text, re.IGNORECASE)
                    if match:
                        video_url = match.group(1).replace('\\/', '/')
                        self.video_cache[cache_key] = video_url
                        self.video_cache_time[cache_key] = time.time()
                        return video_url
            
            # 如果都没找到，返回原URL
            self.video_cache[cache_key] = api_url
            self.video_cache_time[cache_key] = time.time()
            return api_url
            
        except Exception as e:
            print(f"获取视频URL失败: {e}")
            return api_url
    
    def _get_video_list(self, api_url, count=30):
        """生成视频列表"""
        videos = []
        for i in range(count):
            videos.append(self._make_random_url(api_url))
        return videos
    
    def _short_video_category_content(self, pg):
        """短视频分类列表"""
        vlist = []
        
        for idx, api in enumerate(self.short_video_apis):
            encoded_url = self.b64u_encode(api['url'])
            cover_url = self._get_video_cover(api['name'])
            
            vlist.append({
                'vod_id': f"short_video_{encoded_url}",
                'vod_name': api['name'],
                'vod_pic': cover_url,
                'vod_remarks': '点击播放短视频',
                'style': {'type': 'grid', 'ratio': 0.75},
            })
        
        return {'list': vlist, 'page': 1, 'pagecount': 1, 'limit': len(vlist), 'total': len(vlist)}
    
    def _short_video_detail(self, encoded_url):
        """短视频详情"""
        try:
            api_url = self.b64u_decode(encoded_url)
        except:
            return {'list': []}
        
        api_name = "短视频源"
        for api in self.short_video_apis:
            if api['url'] == api_url:
                api_name = api['name']
                break
        
        cover_url = self._get_video_cover(api_name)
        video_urls = self._get_video_list(api_url, 30)
        
        play_urls = []
        for i, url in enumerate(video_urls):
            play_urls.append(f"视频{i+1}${url}")
        
        vod = {
            'vod_id': f"short_video_detail_{encoded_url}",
            'vod_name': f"{api_name} (30个视频)",
            'vod_pic': cover_url,
            'vod_play_from': '短视频播放',
            'vod_play_url': '#'.join(play_urls),
            'vod_remarks': f'共30个随机短视频',
            'style': {'type': 'list'},
            'vod_player': '短'
        }
        return {'list': [vod]}
    
    def _handle_short_video_play(self, video_url):
        """处理短视频播放"""
        real_url = self._get_real_video_url(video_url)
        return {
            "parse": 0,
            "playUrl": "",
            "url": real_url,
            "header": {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Referer": "https://www.douyin.com/",
                "Accept": "video/mp4,video/*;q=0.9,*/*;q=0.8"
            },
            "vod_player": "短"
        }
    
    # ==================== 在线直播分类 ====================
    
    def _live_category_content(self, pg):
        """在线直播分类列表 - 使用统一封面图"""
        vlist = []
        for idx, source in enumerate(self.online_live_sources):
            encoded_id = self.b64u_encode(source['id'])
            cover = source.get('cover', TV_COVER)
            remarks = source.get('remarks', '直播源')
            vlist.append({
                'vod_id': self.LIVE_PREFIX + encoded_id,
                'vod_name': source['name'],
                'vod_pic': cover,
                'vod_remarks': remarks,
                'vod_tag': 'live_source',
                'style': {'type': 'grid', 'ratio': 0.75},
                'type': 'live'
            })
        return {'list': vlist, 'page': pg, 'pagecount': 1, 'limit': len(vlist), 'total': len(vlist)}
    
    def _live_source_detail(self, source_id):
        """在线直播详情"""
        source = next((s for s in self.online_live_sources if s['id'] == source_id), None)
        if not source:
            return {'list': []}
        
        cover = source.get('cover', TV_COVER)
        programs = self._get_live_programs(source)
        
        if not programs:
            return {'list': [{
                'vod_id': self.LIVE_PREFIX + self.b64u_encode(source_id),
                'vod_name': source['name'],
                'vod_pic': cover,
                'vod_play_from': '直播源',
                'vod_play_url': '提示$无法获取直播源，请稍后重试',
                'vod_content': f"直播源: {source['url']}\n状态: 获取失败",
                'style': {'type': 'list'},
                'type': 'live',
                'playerType': source.get('playerType', 2)
            }]}
        
        # 按频道名称分组去重
        channels = {}
        for p in programs:
            name = p['name']
            clean_name = re.sub(r'^\[[^\]]+\]\s*', '', name)
            clean_name = re.sub(r'\s*[\[\(（]\s*\d+\s*[\]\)）]\s*$', '', clean_name)
            if clean_name not in channels:
                channels[clean_name] = []
            channels[clean_name].append(p['url'])
        
        max_lines = max(len(urls) for urls in channels.values())
        original_max_lines = max_lines
        if max_lines > 1:
            max_lines = 1
        
        from_list = []
        url_list = []
        for line_idx in range(max_lines):
            line_name = f"线路{line_idx + 1}"
            channel_urls = []
            for channel_name, urls in channels.items():
                if line_idx < len(urls):
                    channel_urls.append(f"{channel_name}${urls[line_idx]}")
            if channel_urls:
                from_list.append(line_name)
                url_list.append('#'.join(channel_urls))
        
        if not from_list:
            return {'list': [{
                'vod_id': self.LIVE_PREFIX + self.b64u_encode(source_id),
                'vod_name': source['name'],
                'vod_pic': cover,
                'vod_play_from': '直播源',
                'vod_play_url': '提示$没有可用的线路',
                'vod_content': f"直播源: {source['url']}\n状态: 没有可用的线路",
                'style': {'type': 'list'},
                'type': 'live',
                'playerType': source.get('playerType', 2)
            }]}
        
        current_date = time.strftime('%Y.%m.%d', time.localtime())
        total_channels = len(channels)
        total_programs = sum(len(urls) for urls in channels.values())
        remarks = f'更新时间{current_date}'
        if original_max_lines > 1:
            remarks += f' (仅显示第1条线路)'
        
        return {'list': [{
            'vod_id': self.LIVE_PREFIX + self.b64u_encode(source_id),
            'vod_name': source['name'],
            'vod_pic': cover,
            'vod_play_from': '$$$'.join(from_list),
            'vod_play_url': '$$$'.join(url_list),
            'vod_remarks': remarks,
            'vod_content': f"共 {total_channels} 个频道，{total_programs} 条节目线路",
            'vod_style': {'type': 'live'},
            'vod_type': 4,
            'vod_class': 'live',
            'type': 'live',
            'playerType': source.get('playerType', 2)
        }]}
    
    # ==================== 最近添加 ====================
    
    def _recent_content(self, pg):
        all_files = []
        for path in self.root_paths:
            if os.path.exists(path):
                self._scan_recent_files(path, all_files)
        all_files.sort(key=lambda x: x['mtime'], reverse=True)
        all_files = all_files[:200]
        per_page = 50
        start = (pg - 1) * per_page
        end = min(start + per_page, len(all_files))
        vlist = []
        for f in all_files[start:end]:
            item = self._create_recent_item(f)
            if item:
                vlist.append(item)
        return {'list': vlist, 'page': pg, 'pagecount': (len(all_files) + per_page - 1) // per_page, 'limit': per_page, 'total': len(all_files)}
    
    def _scan_recent_files(self, path, file_list, depth=0, max_depth=2):
        if depth > max_depth:
            return
        try:
            audio_names = []
            try:
                for name in os.listdir(path):
                    if name.startswith('.'):
                        continue
                    full_path = os.path.join(path, name)
                    if not os.path.isdir(full_path):
                        ext = self.get_file_ext(name)
                        if ext in self.audio_exts:
                            audio_names.append(os.path.splitext(name)[0])
            except:
                pass
            
            for name in os.listdir(path):
                if name.startswith('.'):
                    continue
                full_path = os.path.join(path, name)
                if os.path.isdir(full_path):
                    self._scan_recent_files(full_path, file_list, depth + 1, max_depth)
                else:
                    ext = self.get_file_ext(name)
                    if self._should_hide_file(name, path, audio_names):
                        continue
                    if (self.is_media_file(ext) or self.is_audio_file(ext) or 
                        self.is_image_file(ext) or self.is_list_file(ext) or
                        self.is_db_file(ext) or
                        self.is_code_file(ext) or self.is_archive_file(ext) or ext == 'txt'):
                        mtime = os.path.getmtime(full_path)
                        if time.time() - mtime < 7 * 24 * 3600:
                            file_list.append({'name': name, 'path': full_path, 'ext': ext, 'mtime': mtime})
        except:
            pass
    
    def _create_recent_item(self, f):
        if self.is_image_file(f['ext']) or f['ext'].lower() in ['heic', 'heif']:
            return {
                'vod_id': self.URL_B64U_PREFIX + self.b64u_encode(self.PICS_PREFIX + "file://" + f['path']),
                'vod_name': f"🖼 {f['name']}",
                'vod_pic': f"file://{f['path']}",
                'vod_play_url': f"查看${self.PICS_PREFIX}file://{f['path']}",
                'vod_remarks': self._format_time(f['mtime']),
                'style': {'type': 'grid', 'ratio': 1},
                'vod_player': '画'
            }
        
        if self.is_audio_file(f['ext']):
            cover_url = self.get_audio_cover_ultra_fast(f['path'])
            
            if cover_url and cover_url != self.DEFAULT_AUDIO_ICON and len(cover_url) > 50:
                display_pic = cover_url
            else:
                color = self.default_colors[hash(f['name']) % len(self.default_colors)]
                first_char = f['name'][0] if f['name'] else "🎵"
                display_pic = self._generate_colored_icon(color, first_char)
            
            has_lyrics = False
            audio_dir = os.path.dirname(f['path'])
            audio_name = os.path.splitext(f['name'])[0]
            for lrc_ext in self.lrc_exts:
                if os.path.exists(os.path.join(audio_dir, f"{audio_name}.{lrc_ext}")):
                    has_lyrics = True
                    break
            remarks = self._format_time(f['mtime'])
            if has_lyrics:
                remarks += ' 📝'
            return {
                'vod_id': self.URL_B64U_PREFIX + self.b64u_encode(self.MP3_PREFIX + f['path']),
                'vod_name': f"{f['name']}",
                'vod_pic': display_pic,
                'vod_play_url': f"播放${self.MP3_PREFIX + f['path']}",
                'vod_remarks': remarks,
                'style': {'type': 'grid', 'ratio': 1},
                'vod_player': '听'
            }
        
        if self.is_media_file(f['ext']):
            return {
                'vod_id': f['path'],
                'vod_name': f"🎬 {f['name']}",
                'vod_pic': self.file_icons['video'],
                'vod_remarks': self._format_time(f['mtime']),
                'style': {'type': 'grid', 'ratio': 1}
            }
        
        if self.is_lrc_file(f['ext']):
            return {
                'vod_id': f['path'],
                'vod_name': f"📝 {f['name']}",
                'vod_pic': self.file_icons['lyrics'],
                'vod_remarks': self._format_time(f['mtime']),
                'style': {'type': 'grid', 'ratio': 1}
            }
        
        if f['ext'] == 'json':
            return {
                'vod_id': self.LIST_PREFIX + self.b64u_encode(f['path']),
                'vod_name': f"📋 {f['name']}",
                'vod_pic': self.file_icons['json'],
                'vod_remarks': self._format_time(f['mtime']),
                'style': {'type': 'grid', 'ratio': 1}
            }
        
        if f['ext'] == 'php':
            return {
                'vod_id': self.TEXT_PREFIX + self.b64u_encode(f['path']),
                'vod_name': f"🐘 {f['name']}",
                'vod_pic': self.file_icons['php'],
                'vod_remarks': self._format_time(f['mtime']),
                'style': {'type': 'grid', 'ratio': 1}
            }
        
        if f['ext'] == 'py':
            return {
                'vod_id': self.TEXT_PREFIX + self.b64u_encode(f['path']),
                'vod_name': f"🐍 {f['name']}",
                'vod_pic': self.file_icons['python'],
                'vod_remarks': self._format_time(f['mtime']),
                'style': {'type': 'grid', 'ratio': 1}
            }
        
        if f['ext'] == 'zip':
            return {
                'vod_id': f['path'],
                'vod_name': f"🗜️ {f['name']}",
                'vod_pic': self.file_icons['zip'],
                'vod_remarks': self._format_time(f['mtime']),
                'style': {'type': 'grid', 'ratio': 1}
            }
        
        if f['ext'] in ['rar', '7z', 'tar', 'gz', 'bz2', 'xz']:
            icon_key = 'rar' if f['ext'] == 'rar' else 'archive'
            return {
                'vod_id': f['path'],
                'vod_name': f"🗜️ {f['name']}",
                'vod_pic': self.file_icons[icon_key],
                'vod_remarks': self._format_time(f['mtime']),
                'style': {'type': 'grid', 'ratio': 1}
            }
        
        if f['ext'] in ['m3u', 'm3u8']:
            colors = ["#FF6B6B", "#4ECDC4", "#FFD93D", "#6BCB77", "#9D65C9", "#FF8C42", "#A2D729", "#FF6B8B", "#45B7D1", "#96CEB4"]
            color = colors[hash(f['name']) % len(colors)]
            first_char = f['name'][0].upper() if f['name'] else "M"
            icon_svg = self._generate_colored_icon(color, first_char)
            return {
                'vod_id': self.LIST_PREFIX + self.b64u_encode(f['path']),
                'vod_name': f['name'],
                'vod_pic': icon_svg,
                'vod_remarks': self._format_time(f['mtime']),
                'style': {'type': 'grid', 'ratio': 1}
            }
        
        if self.is_db_file(f['ext']):
            return {
                'vod_id': self.LIST_PREFIX + self.b64u_encode(f['path']),
                'vod_name': f"🗄️ {f['name']}",
                'vod_pic': self.file_icons['database'],
                'vod_remarks': self._format_time(f['mtime']),
                'style': {'type': 'grid', 'ratio': 1}
            }
        
        if f['ext'] == 'txt':
            is_live = False
            is_novel = False
            url_count = 0
            try:
                with open(f['path'], 'r', encoding='utf-8', errors='ignore') as ff:
                    preview = ff.read(4096)
                is_live = self._is_txt_live_source(preview, f['path'])
                if not is_live:
                    is_novel = self._is_txt_novel(preview, f['path'])
                url_matches = re.findall(r'https?://[^\s\'"<>]+', preview)
                url_count = len(url_matches)
            except:
                pass
            
            if is_live or url_count >= 2:
                colors = ["#FF6B6B", "#4ECDC4", "#FFD93D", "#6BCB77", "#9D65C9", "#FF8C42", "#A2D729", "#FF6B8B", "#45B7D1", "#96CEB4"]
                color = colors[hash(f['name']) % len(colors)]
                first_char = f['name'][0].upper() if f['name'] else "T"
                icon_svg = self._generate_colored_icon(color, first_char)
                return {
                    'vod_id': self.LIST_PREFIX + self.b64u_encode(f['path']),
                    'vod_name': f['name'],
                    'vod_pic': icon_svg,
                    'vod_remarks': self._format_time(f['mtime']),
                    'style': {'type': 'grid', 'ratio': 1}
                }
            elif is_novel:
                encoded = self.b64u_encode(f['path'])
                novel_url = f"{self.NOVEL_PREFIX}{encoded}"
                return {
                    'vod_id': novel_url,
                    'vod_name': f"📖 {f['name']}",
                    'vod_pic': self.file_icons['novel'],
                    'vod_remarks': self._format_time(f['mtime']),
                    'style': {'type': 'grid', 'ratio': 1},
                    'vod_player': '书'
                }
            else:
                return {
                    'vod_id': self.TEXT_PREFIX + self.b64u_encode(f['path']),
                    'vod_name': f"📄 {f['name']}",
                    'vod_pic': self.file_icons['text'],
                    'vod_remarks': self._format_time(f['mtime']),
                    'style': {'type': 'grid', 'ratio': 1}
                }
        
        if f['ext'] in ['xml', 'html', 'htm', 'css', 'js', 'sh', 'bash']:
            return {
                'vod_id': self.TEXT_PREFIX + self.b64u_encode(f['path']),
                'vod_name': f"📄 {f['name']}",
                'vod_pic': self.file_icons['text'],
                'vod_remarks': self._format_time(f['mtime']),
                'style': {'type': 'grid', 'ratio': 1}
            }
        
        return {
            'vod_id': f['path'],
            'vod_name': f"📁 {f['name']}",
            'vod_pic': self.file_icons['file'],
            'vod_remarks': self._format_time(f['mtime']),
            'style': {'type': 'grid', 'ratio': 1}
        }
    
    def _format_time(self, timestamp):
        diff = time.time() - timestamp
        if diff < 3600:
            return f"{int(diff/60)}分钟前"
        elif diff < 86400:
            return f"{int(diff/3600)}小时前"
        else:
            return time.strftime('%m-%d %H:%M', time.localtime(timestamp))
    
    # ==================== 画廊功能 ====================
    
    def _gallery_category_content(self, pg):
        """画廊分类列表"""
        vlist = []
        
        colors = ["#FF6B6B", "#4ECDC4", "#FFD93D", "#6BCB77", "#9D65C9", 
                  "#FF8C42", "#A2D729", "#FF6B8B", "#45B7D1", "#96CEB4",
                  "#E91E63", "#9C27B0", "#00BCD4", "#FF9800", "#795548"]
        
        for idx, api in enumerate(self.gallery_apis):
            encoded_url = self.b64u_encode(api['url'])
            
            # 生成随机预览图URL
            if '?' in api['url']:
                preview_url = f"{api['url']}&_r={random.randint(1, 999999)}&_t={int(time.time())}"
            else:
                preview_url = f"{api['url']}?_r={random.randint(1, 999999)}&_t={int(time.time())}"
            
            vlist.append({
                'vod_id': f"gallery_{api['type']}_{encoded_url}",
                'vod_name': api['name'],
                'vod_pic': preview_url,
                'vod_remarks': '点击查看50张',
                'style': {'type': 'grid', 'ratio': 0.75},
                'vod_player': '画'
            })
        
        return {'list': vlist, 'page': 1, 'pagecount': 1, 'limit': len(vlist), 'total': len(vlist)}
    
    def _gallery_detail(self, api_type, encoded_url):
        """画廊详情 - 获取图片列表"""
        try:
            api_url = self.b64u_decode(encoded_url)
        except:
            return {'list': []}
        
        api_name = "图库"
        for api in self.gallery_apis:
            if api['url'] == api_url:
                api_name = api['name']
                break
        
        # 生成50张随机图片URL
        images = []
        for i in range(50):
            if '?' in api_url:
                rand_url = f"{api_url}&_r={random.randint(1, 999999)}&_t={int(time.time())}"
            else:
                rand_url = f"{api_url}?_r={random.randint(1, 999999)}&_t={int(time.time())}"
            images.append(rand_url)
        
        pics_protocol = self.PICS_PREFIX + '&&'.join(images)
        
        vod = {
            'vod_id': f"gallery_{api_type}_{encoded_url}",
            'vod_name': f"{api_name} (50张)",
            'vod_pic': images[0],
            'vod_play_from': '图片浏览',
            'vod_play_url': f"播放${pics_protocol}",
            'vod_remarks': '共50张图片',
            'style': {'type': 'list'},
            'vod_player': '画'
        }
        return {'list': [vod]}
    
    # ==================== 详情页 ====================
    
    def detailContent(self, ids):
        id_val = ids[0]
        
        # 短视频详情处理
        if id_val.startswith("short_video_"):
            encoded_url = id_val[len("short_video_"):]
            return self._short_video_detail(encoded_url)
        
        try:
            radio_id = int(id_val)
            if radio_id > 100:
                return self._radio_detail_content(str(radio_id))
        except (ValueError, TypeError):
            pass
        
        if id_val.startswith("radio_play_"):
            radio_id = id_val[len("radio_play_"):]
            return self._radio_detail_content(radio_id)
        
        # 画廊详情处理
        if id_val.startswith("gallery_"):
            parts = id_val.split('_', 2)
            if len(parts) >= 3:
                return self._gallery_detail(parts[1], parts[2])
        
        if id_val == 'add_custom_api':
            return self._handle_add_custom_api()
        
        if id_val.startswith(self.LIVE_PREFIX):
            source_id = self.b64u_decode(id_val[len(self.LIVE_PREFIX):])
            return self._live_source_detail(source_id)
        
        if id_val.startswith(self.NOVEL_PREFIX):
            encoded = id_val[len(self.NOVEL_PREFIX):]
            file_path = self.b64u_decode(encoded)
            self.novel_path_cache[encoded] = file_path
            vod_data = self._handle_novel_detail(file_path, id_val, encoded)
            if vod_data and "list" in vod_data and len(vod_data["list"]) > 0:
                vod_data["list"][0]["vod_player"] = "书"
            return vod_data
        
        if id_val.startswith(self.TEXT_PREFIX):
            encoded = id_val[len(self.TEXT_PREFIX):]
            file_path = self.b64u_decode(encoded)
            vod_data = self._handle_text_detail(file_path, id_val)
            if vod_data and "list" in vod_data and len(vod_data["list"]) > 0:
                vod_data["list"][0]["vod_player"] = "书"
            return vod_data
        
        if id_val.startswith(self.FOLDER_PREFIX):
            folder_path = self.b64u_decode(id_val[len(self.FOLDER_PREFIX):])
            if os.path.exists(folder_path) and os.path.isdir(folder_path):
                return self.categoryContent(folder_path, 1, None, None)
            return {'list': []}
        
        if id_val.startswith(self.PICS_PREFIX + 'slideshow/'):
            dir_path = self.b64u_decode(id_val[len(self.PICS_PREFIX + 'slideshow/'):])
            images = self.collect_images_in_dir(dir_path)
            if not images:
                return {'list': []}
            pic_urls = [f"file://{img['path']}" for img in images]
            vod = {
                'vod_id': id_val,
                'vod_name': f"🖼 图片连播 - {os.path.basename(dir_path)} ({len(images)}张)",
                'vod_pic': self.file_icons['image_playlist'],
                'vod_play_from': '图片浏览',
                'vod_play_url': f"浏览${self.PICS_PREFIX + '&&'.join(pic_urls)}",
                'style': {'type': 'list'},
                'vod_player': '画'
            }
            return {'list': [vod]}
        
        if id_val.startswith(self.URL_B64U_PREFIX):
            decoded = self.b64u_decode(id_val[len(self.URL_B64U_PREFIX):])
            if decoded and decoded.startswith(self.PICS_PREFIX):
                return self._handle_pics_detail(decoded, id_val)
        
        if id_val.startswith(self.CAMERA_ALL_PREFIX):
            dir_path = self.b64u_decode(id_val[len(self.CAMERA_ALL_PREFIX):])
            images = self.collect_images_in_dir(dir_path)
            if not images:
                return {'list': []}
            pic_urls = [f"file://{img['path']}" for img in images]
            vod = {
                'vod_id': id_val,
                'vod_name': f"🖼 相机照片 ({len(images)}张)",
                'vod_pic': self.file_icons['image_playlist'],
                'vod_play_from': '照片查看',
                'vod_play_url': f"浏览${self.PICS_PREFIX + '&&'.join(pic_urls)}",
                'style': {'type': 'list'},
                'vod_player': '画'
            }
            return {'list': [vod]}
        
        if id_val.startswith(self.LIST_PREFIX):
            file_path = self.b64u_decode(id_val[len(self.LIST_PREFIX):])
            return self._handle_list_detail(file_path, id_val)
        
        if id_val.startswith(self.A_ALL_PREFIX):
            dir_path = self.b64u_decode(id_val[len(self.A_ALL_PREFIX):])
            return self._handle_audio_all_detail(dir_path, id_val)
        
        if id_val.startswith(self.V_ALL_PREFIX):
            dir_path = self.b64u_decode(id_val[len(self.V_ALL_PREFIX):])
            return self._handle_video_all_detail(dir_path, id_val)
        
        if not os.path.exists(id_val):
            return {'list': []}
        
        if os.path.isdir(id_val):
            return self.categoryContent(id_val, 1, None, None)
        
        return self._handle_file_detail(id_val)
    
    # ==================== 辅助方法 ====================
    
    def _handle_pics_detail(self, decoded, id_val):
        pics_data = decoded[len(self.PICS_PREFIX):]
        if '&&' in pics_data:
            pic_urls = pics_data.split('&&')
            return {'list': [{
                'vod_id': id_val,
                'vod_name': f'图片相册 ({len(pic_urls)}张)',
                'vod_pic': pic_urls[0],
                'vod_play_from': '图片查看',
                'vod_play_url': f"浏览${self.PICS_PREFIX + '&&'.join(pic_urls)}",
                'style': {'type': 'list'},
                'vod_player': '画'
            }]}
        else:
            file_name = os.path.basename(pics_data.split('?')[0])
            if pics_data.startswith('file://'):
                file_name = os.path.basename(pics_data[7:])
            return {'list': [{
                'vod_id': id_val,
                'vod_name': file_name,
                'vod_pic': pics_data,
                'vod_play_from': '图片查看',
                'vod_play_url': f"查看${self.PICS_PREFIX + pics_data}",
                'style': {'type': 'list'},
                'vod_player': '画'
            }]}
    
    def _handle_add_custom_api(self):
        return {'list': [{
            'vod_id': 'add_custom_api_result',
            'vod_name': '📝 添加自定义API说明',
            'vod_pic': self.file_icons['text'],
            'vod_content': '请在 /storage/emulated/0/custom_video_apis.json 文件中添加自定义API\n\n格式示例：\n[\n  {"name": "我的API", "url": "https://example.com/api"}\n]\n\n添加后重启即可生效。',
            'vod_remarks': '配置文件路径: /storage/emulated/0/custom_video_apis.json',
            'style': {'type': 'list'}
        }]}
    
    def _handle_list_detail(self, file_path, vod_id):
        if not os.path.exists(file_path) or not os.path.isfile(file_path):
            return {'list': []}
        ext = self.get_file_ext(file_path)
        items = []
        if ext == 'json':
            items = self.parse_json_file(file_path)
        elif self.is_db_file(ext):
            items = self.parse_db_file(file_path)
        elif ext in ['m3u', 'm3u8']:
            items = self._parse_m3u_file(file_path)
            if len(items) > 5:
                return self._format_live_source(items, file_path, vod_id, ext)
        elif ext == 'txt':
            items = self._parse_txt_file(file_path)
            if not items:
                return []
            if len(items) > 5:
                return self._format_live_source(items, file_path, vod_id, ext)
        
        if not items:
            name = os.path.splitext(os.path.basename(file_path))[0]
            return {'list': [self._create_fallback_vod(file_path, 'list', vod_id, name)]}
        
        play_urls = self._build_play_urls(items)
        if not play_urls:
            return {'list': [self._create_fallback_vod(file_path, 'list', vod_id, os.path.splitext(os.path.basename(file_path))[0])]}
        
        pic = items[0].get('pic', '') if items else ''
        if not pic:
            pic = self.file_icons['list']
        return {'list': [{
            'vod_id': vod_id,
            'vod_name': os.path.basename(file_path),
            'vod_pic': pic,
            'vod_play_from': '播放列表',
            'vod_play_url': '#'.join(play_urls),
            'vod_remarks': f'共{len(items)}条',
            'style': {'type': 'list'}
        }]}
    
    def _format_live_source(self, items, file_path, vod_id, ext):
        channels = {}
        for item in items:
            name = item.get('name', '').strip()
            url = item.get('url', '')
            if not name or not url:
                continue
            clean_name = re.sub(r'^\[[^\]]+\]\s*', '', name)
            clean_name = re.sub(r'\s*[\[\(（]\s*\d+\s*[\]\)）]\s*$', '', clean_name)
            clean_name = re.sub(r'\s*[线|L|l]ine?\s*\d+$', '', clean_name, flags=re.I)
            clean_name = clean_name.strip()
            if clean_name not in channels:
                channels[clean_name] = []
            channels[clean_name].append(url)
        if not channels:
            play_urls = self._build_play_urls(items)
            pic = items[0].get('pic', '') if items else self.file_icons['list']
            return {'list': [{
                'vod_id': vod_id,
                'vod_name': os.path.basename(file_path),
                'vod_pic': pic,
                'vod_play_from': '播放列表',
                'vod_play_url': '#'.join(play_urls),
                'vod_remarks': f'共{len(items)}条',
                'style': {'type': 'list'}
            }]}
        max_lines = max(len(urls) for urls in channels.values())
        original_max_lines = max_lines
        if max_lines > 1:
            max_lines = 1
        from_list = []
        url_list = []
        for line_idx in range(max_lines):
            line_name = f"线路{line_idx + 1}"
            channel_urls = []
            for channel_name, urls in channels.items():
                if line_idx < len(urls):
                    channel_urls.append(f"{channel_name}${urls[line_idx]}")
            if channel_urls:
                from_list.append(line_name)
                url_list.append('#'.join(channel_urls))
        if not from_list:
            play_urls = self._build_play_urls(items)
            pic = items[0].get('pic', '') if items else self.file_icons['list']
            return {'list': [{
                'vod_id': vod_id,
                'vod_name': os.path.basename(file_path),
                'vod_pic': pic,
                'vod_play_from': '播放列表',
                'vod_play_url': '#'.join(play_urls),
                'vod_remarks': f'共{len(items)}条',
                'style': {'type': 'list'}
            }]}
        colors = ["#FF6B6B", "#4ECDC4", "#FFD93D", "#6BCB77", "#9D65C9", "#FF8C42", "#A2D729", "#FF6B8B", "#45B7D1", "#96CEB4"]
        color = colors[hash(os.path.basename(file_path)) % len(colors)]
        first_char = os.path.basename(file_path)[0].upper() if os.path.basename(file_path) else "L"
        icon_svg = self._generate_colored_icon(color, first_char)
        current_date = time.strftime('%Y.%m.%d', time.localtime())
        total_channels = len(channels)
        total_programs = sum(len(urls) for urls in channels.values())
        remarks = f'更新时间{current_date}'
        if original_max_lines > 1:
            remarks += f' (仅显示第1条线路)'
        return {'list': [{
            'vod_id': vod_id,
            'vod_name': os.path.basename(file_path),
            'vod_pic': icon_svg,
            'vod_play_from': '$$$'.join(from_list),
            'vod_play_url': '$$$'.join(url_list),
            'vod_remarks': remarks,
            'vod_content': f'共 {total_channels} 个频道，{total_programs} 条节目线路',
            'style': {'type': 'list'},
            'type': 'live',
            'vod_type': 4,
            'vod_class': 'live',
            'vod_style': {'type': 'live'},
            'playerType': 2
        }]}
    
    def _parse_m3u_file(self, file_path):
        items = []
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                lines = f.readlines()
            current_name = None
            for line in lines[:10000]:
                line = line.strip()
                if line.startswith('#EXTINF:'):
                    name_match = re.search(r',(.+)$', line) or re.search(r'tvg-name="([^"]+)"', line)
                    current_name = name_match.group(1).strip() if name_match else None
                elif line and not line.startswith('#'):
                    if self.is_playable_url(line):
                        items.append({'name': current_name or f"线路{len(items)+1}", 'url': line})
                    current_name = None
        except:
            pass
        return items
    
    def _handle_novel_detail(self, file_path, vod_id, encoded):
        if not os.path.isfile(file_path):
            return {'list': []}
        cache_key = f"chapters_{encoded}"
        if cache_key in self.novel_chapters_cache:
            chapters = self.novel_chapters_cache[cache_key]
        else:
            chapters = NovelParser.parse_txt_novel(file_path)
            self.novel_chapters_cache[cache_key] = chapters
        self.current_novel = {'encoded_path': encoded, 'file_path': file_path, 'chapters': chapters}
        urls = []
        for i, c in enumerate(chapters):
            title = c['title']
            if title and len(title) > 2 and not title.strip().isdigit():
                urls.append(f"{title}$chapter{i}")
        return {'list': [{
            'vod_id': vod_id,
            'vod_name': os.path.basename(file_path),
            'vod_pic': self.file_icons['novel'],
            'vod_play_from': '小说章节',
            'vod_play_url': '#'.join(urls),
            'vod_remarks': f'共{len(chapters)}章',
            'style': {'type': 'list'}
        }]}
    
    def _handle_text_detail(self, file_path, vod_id):
        if not os.path.isfile(file_path):
            return {'list': []}
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            return {'list': [{
                'vod_id': vod_id,
                'vod_name': os.path.basename(file_path),
                'vod_pic': self.file_icons['text'],
                'vod_play_from': '文本阅读',
                'vod_play_url': f"阅读${vod_id}",
                'vod_content': content[:5000],
                'vod_remarks': f'共{len(content)}字',
                'style': {'type': 'list'}
            }]}
        except Exception as e:
            self.log(f"读取文本失败: {e}")
            return {'list': []}
    
    def _create_fallback_vod(self, file_path, file_type, vod_id, name=None):
        return {
            'vod_id': vod_id,
            'vod_name': os.path.basename(file_path),
            'vod_pic': self.file_icons[file_type],
            'vod_play_from': file_type,
            'vod_play_url': f"{name or os.path.splitext(os.path.basename(file_path))[0]}$file://{file_path}",
            'style': {'type': 'list'}
        }
    
    def _build_play_urls(self, items):
        play_urls = []
        for item in items:
            url = item.get('url') or item.get('play_url', '')
            if url:
                name = item.get('name', '').strip()
                if not name:
                    name = f"节目{len(play_urls)+1}"
                name = re.sub(r'[#$]', '', name)
                if '$$$' in url:
                    first_url = url.split('$$$')[0]
                    if '$' in first_url:
                        url_parts = first_url.split('$', 1)
                        if len(url_parts) == 2:
                            play_urls.append(f"{name}${url_parts[1]}")
                        else:
                            play_urls.append(f"{name}${first_url}")
                    else:
                        play_urls.append(f"{name}${first_url}")
                else:
                    play_urls.append(f"{name}${url}")
        return play_urls
    
    def _handle_audio_all_detail(self, dir_path, vod_id):
        audios = self.collect_audios_in_dir(dir_path)
        if not audios:
            return {'list': []}
        audios.sort(key=lambda x: x['name'])
        play_urls = []
        for audio in audios:
            name = os.path.splitext(audio['name'])[0]
            if len(name) > 50:
                name = name[:47] + '...'
            play_urls.append(f"{name}${self.MP3_PREFIX + audio['path']}")
        return {'list': [{
            'vod_id': vod_id,
            'vod_name': f"🎵 {os.path.basename(dir_path)} ({len(audios)}首)",
            'vod_pic': self.DEFAULT_AUDIO_ICON,
            'vod_play_from': '本地音乐',
            'vod_play_url': '#'.join(play_urls),
            'vod_remarks': f'共{len(audios)}首',
            'style': {'type': 'list'},
            'vod_player': '听'
        }]}
    
    def _handle_video_all_detail(self, dir_path, vod_id):
        videos = self.collect_videos_in_dir(dir_path)
        if not videos:
            return {'list': []}
        play_urls = [f"{os.path.splitext(v['name'])[0]}$file://{v['path']}" for v in videos]
        return {'list': [{
            'vod_id': vod_id,
            'vod_name': f"🎬 视频播放列表 - {os.path.basename(dir_path)} ({len(videos)}集)",
            'vod_pic': self.file_icons['video_playlist'],
            'vod_play_from': '本地视频',
            'vod_play_url': '#'.join(play_urls),
            'vod_remarks': f'共{len(videos)}集',
            'style': {'type': 'list'}
        }]}
    
    def _handle_file_detail(self, file_path):
        name = os.path.basename(file_path)
        ext = self.get_file_ext(name)
        vod = {'vod_id': file_path, 'vod_name': name, 'vod_play_from': '本地播放', 'vod_play_url': '', 'style': {'type': 'list'}}
        
        if self.is_audio_file(ext):
            return self._handle_audio_file_detail(file_path, name, vod)
        
        if self.is_image_file(ext) or ext.lower() in ['heic', 'heif']:
            dir_path = os.path.dirname(file_path)
            all_images = self.collect_images_in_dir(dir_path)
            if len(all_images) > 1:
                clicked_index = -1
                for i, img in enumerate(all_images):
                    if img['path'] == file_path:
                        clicked_index = i
                        break
                reordered_images = []
                if clicked_index >= 0:
                    for i in range(clicked_index, len(all_images)):
                        reordered_images.append(all_images[i])
                    for i in range(0, clicked_index):
                        reordered_images.append(all_images[i])
                else:
                    reordered_images = all_images
                pic_urls = [f"file://{img['path']}" for img in reordered_images]
                vod.update({
                    'vod_play_url': f"浏览${self.PICS_PREFIX + '&&'.join(pic_urls)}",
                    'vod_name': f"🖼 {name} (当前目录 {len(all_images)}张)",
                    'vod_pic': f"file://{file_path}",
                    'vod_play_from': '图片浏览',
                    'vod_remarks': f'共{len(all_images)}张照片，循环播放',
                    'vod_player': '画'
                })
            else:
                vod.update({
                    'vod_play_url': f"查看${self.PICS_PREFIX}file://{file_path}",
                    'vod_pic': f"file://{file_path}",
                    'vod_name': f"🖼️ {name}",
                    'vod_player': '画'
                })
        elif self.is_media_file(ext):
            dir_path = os.path.dirname(file_path)
            all_videos = self.collect_videos_in_dir(dir_path)
            if len(all_videos) > 1:
                clicked_index = -1
                for i, video in enumerate(all_videos):
                    if video['path'] == file_path:
                        clicked_index = i
                        break
                reordered_videos = []
                if clicked_index >= 0:
                    for i in range(clicked_index, len(all_videos)):
                        reordered_videos.append(all_videos[i])
                    for i in range(0, clicked_index):
                        reordered_videos.append(all_videos[i])
                else:
                    reordered_videos = all_videos
                play_urls = [f"{os.path.splitext(v['name'])[0]}$file://{v['path']}" for v in reordered_videos]
                vod.update({
                    'vod_play_url': '#'.join(play_urls),
                    'vod_name': f"🎬 {name} (当前目录 {len(all_videos)}集)",
                    'vod_pic': self.file_icons['video_playlist'],
                    'vod_play_from': '本地视频',
                    'vod_remarks': f'共{len(all_videos)}集，循环播放'
                })
            else:
                vod.update({
                    'vod_play_url': f"{os.path.splitext(name)[0]}$file://{file_path}",
                    'vod_name': f"🎬 {name}",
                    'vod_pic': self.file_icons['video']
                })
        elif self.is_list_file(ext) or self.is_db_file(ext):
            return self.detailContent([self.LIST_PREFIX + self.b64u_encode(file_path)])
        elif ext == 'php' or ext == 'py':
            return self.detailContent([self.TEXT_PREFIX + self.b64u_encode(file_path)])
        elif ext == 'zip' or ext in ['rar', '7z', 'tar', 'gz', 'bz2', 'xz']:
            vod.update({
                'vod_play_url': f"{os.path.splitext(name)[0]}$file://{file_path}",
                'vod_name': f"🗜️ {name}",
                'vod_pic': self.file_icons['zip'] if ext == 'zip' else self.file_icons['archive'],
                'vod_remarks': f'{ext.upper()}压缩包'
            })
        elif ext == 'txt':
            preview = ''
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    preview = f.read(4096)
            except:
                pass
            
            is_live = self._is_txt_live_source(preview, file_path)
            is_novel = self._is_txt_novel(preview, file_path) if not is_live else False
            
            if is_live:
                return self.detailContent([self.LIST_PREFIX + self.b64u_encode(file_path)])
            elif is_novel:
                return self.detailContent([self.NOVEL_PREFIX + self.b64u_encode(file_path)])
            else:
                return self.detailContent([self.TEXT_PREFIX + self.b64u_encode(file_path)])
        return {'list': [vod]}
    
    def _handle_audio_file_detail(self, file_path, name, vod):
        dir_path = os.path.dirname(file_path)
        all_audios = self.collect_audios_in_dir(dir_path)
        
        cover_url = self.get_audio_cover_ultra_fast(file_path)
        
        if cover_url and cover_url != self.DEFAULT_AUDIO_ICON and len(cover_url) > 50:
            display_pic = cover_url
        else:
            color = self.default_colors[hash(name) % len(self.default_colors)]
            first_char = name[0] if name else "🎵"
            display_pic = self._generate_colored_icon(color, first_char)
        
        if len(all_audios) > 1:
            clicked_index = -1
            for i, audio in enumerate(all_audios):
                if audio['path'] == file_path:
                    clicked_index = i
                    break
            reordered_audios = []
            if clicked_index >= 0:
                reordered_audios.extend(all_audios[clicked_index:])
                reordered_audios.extend(all_audios[:clicked_index])
            else:
                reordered_audios = all_audios
            if len(reordered_audios) > 500:
                reordered_audios = reordered_audios[:500]
            play_urls = []
            for audio in reordered_audios:
                audio_name = os.path.splitext(audio['name'])[0]
                if len(audio_name) > 50:
                    audio_name = audio_name[:47] + '...'
                play_urls.append(f"{audio_name}${self.MP3_PREFIX + audio['path']}")
            
            vod.update({
                'vod_play_url': '#'.join(play_urls),
                'vod_name': f"🎵 {name} (共{len(all_audios)}首)",
                'vod_pic': display_pic,
                'vod_play_from': '本地音乐',
                'vod_remarks': f'共{len(all_audios)}首',
                'vod_player': '听'
            })
        else:
            vod.update({
                'vod_play_url': f"{os.path.splitext(name)[0]}${self.MP3_PREFIX + file_path}",
                'vod_name': f"🎵 {name}",
                'vod_pic': display_pic,
                'vod_player': '听'
            })
        return {'list': [vod]}
    
    # ==================== 播放页 ====================

    def playerContent(self, flag, id, vipFlags):
        if flag == '蜻蜓FM':
            try:
                raw = self.d64(id).split("@@@@")[-1]
                url = raw.split("|||")[0] if "|||" in raw else raw
                url = url.replace(r"\/", "/")
                
                return {
                    "parse": 0,
                    "playUrl": "",
                    "url": url,
                    "header": {
                        "User-Agent": self.headers["User-Agent"],
                        "Referer": "http://www.qingting.fm/",
                        "Accept": "*/*"
                    },
                    "vod_player": "听"
                }
            except Exception as e:
                print(f"📻 播放失败: {e}")
                return {"parse": 0, "playUrl": "", "url": "", "header": self.headers}
        
        if flag == '短视频播放':
            return self._handle_short_video_play(id)
        
        if id.startswith(self.PICS_PREFIX):
            return {"parse": 0, "playUrl": "", "url": id, "header": {}, "vod_player": "画"}
        
        if id.startswith(self.TEXT_PREFIX):
            encoded = id[len(self.TEXT_PREFIX):]
            file_path = self.b64u_decode(encoded)
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                data = {"title": os.path.basename(file_path), "content": content}
                return {
                    "parse": 0,
                    "playUrl": "",
                    "url": self.TEXT_PREFIX + json.dumps(data, ensure_ascii=False),
                    "header": "",
                    "content": content,
                    "vod_player": "书"
                }
            except:
                return {"parse": 0, "playUrl": "", "url": "", "header": ""}
        
        if id.startswith(self.MP3_PREFIX):
            return self._handle_mp3_play(id)
        
        if id.startswith(self.NOVEL_PREFIX):
            full_id = id[len(self.NOVEL_PREFIX):]
            chapter_index = 0
            encoded_path = full_id
            if '#chapter' in full_id:
                parts = full_id.split('#chapter', 1)
                encoded_path = parts[0]
                try:
                    chapter_index = int(parts[1])
                except:
                    chapter_index = 0
            if encoded_path in self.novel_path_cache:
                file_path = self.novel_path_cache[encoded_path]
            else:
                file_path = self.b64u_decode(encoded_path)
                self.novel_path_cache[encoded_path] = file_path
            try:
                cache_key = f"chapters_{encoded_path}"
                if cache_key in self.novel_chapters_cache:
                    chapters = self.novel_chapters_cache[cache_key]
                else:
                    chapters = NovelParser.parse_txt_novel(file_path)
                    self.novel_chapters_cache[cache_key] = chapters
                if chapters and 0 <= chapter_index < len(chapters):
                    title = chapters[chapter_index]['title']
                    content = chapters[chapter_index]['content']
                else:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                    title = os.path.basename(file_path)
                data = {"title": title, "content": content}
                return {
                    "parse": 0,
                    "playUrl": "",
                    "url": "novel://" + json.dumps(data, ensure_ascii=False),
                    "header": "",
                    "content": content,
                    "vod_player": "书"
                }
            except:
                return {"parse": 0, "playUrl": "", "url": "", "header": ""}
        
        if id.startswith('chapter') and flag == '小说章节' and self.current_novel['chapters']:
            try:
                idx = int(id.replace('chapter', ''))
                if 0 <= idx < len(self.current_novel['chapters']):
                    c = self.current_novel['chapters'][idx]
                    data = {"title": c['title'], "content": c['content']}
                    return {
                        "parse": 0,
                        "playUrl": "",
                        "url": "novel://" + json.dumps(data, ensure_ascii=False),
                        "header": "",
                        "vod_player": "书"
                    }
            except:
                pass
        
        url = id
        if '$' in url:
            parts = url.split('$', 1)
            if len(parts) == 2:
                url = parts[1]
        
        if url.startswith(('http://', 'https://', 'file://')):
            pass
        else:
            try:
                decoded = base64.b64decode(url).decode('utf-8')
                if decoded.startswith(('http://', 'https://', 'file://')):
                    url = decoded
            except:
                pass
        
        if 'dytt-' in url and '/share/' in url and not url.endswith('.m3u8'):
            real_url = self._extract_real_m3u8_url(url)
            if real_url:
                url = real_url
        
        headers = self._build_headers(flag, url)
        result = {"parse": 0, "playUrl": "", "url": url, "header": headers}
        
        if url.startswith('file://'):
            file_path = url[7:]
            if os.path.exists(file_path) and self.is_audio_file(self.get_file_ext(file_path)):
                self._add_audio_info_fast(result, file_path)
        
        if url.startswith('file://'):
            ext = self.get_file_ext(url[7:])
            if self.is_image_file(ext) or ext.lower() in ['heic', 'heif']:
                result["vod_player"] = "画"
        
        return result

    def _handle_mp3_play(self, id):
        file_path = id.replace(self.MP3_PREFIX, '')
        if not os.path.exists(file_path):
            test_paths = [file_path, '/storage/emulated/0/' + file_path.lstrip('/'), file_path.replace('//', '/')]
            for test_path in test_paths:
                if os.path.exists(test_path):
                    file_path = test_path
                    break
            else:
                return {"parse": 0, "playUrl": "", "url": "", "header": {}, "error": "文件不存在"}
        
        if not os.access(file_path, os.R_OK):
            return {"parse": 0, "playUrl": "", "url": "", "header": {}, "error": "文件无法读取"}
        
        play_url = f"http://127.0.0.1:9978/file{file_path}"
        result = {"parse": 0, "playUrl": "", "url": play_url, "header": {}, "vod_player": "听"}
        
        if self.is_audio_file(self.get_file_ext(file_path)):
            self._add_audio_info_fast(result, file_path)
        
        return result

    def _extract_real_m3u8_url(self, page_url):
        if page_url in self.m3u8_cache:
            return self.m3u8_cache[page_url]
        try:
            from urllib.parse import urlparse
            parsed = urlparse(page_url)
            base_url = f"{parsed.scheme}://{parsed.netloc}"
            headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", "Referer": base_url + "/"}
            response = self.session.get(page_url, headers=headers, timeout=10)
            if response.status_code != 200:
                return None
            html = response.text
            patterns = [
                r'(https?://[^\s"\']+\.m3u8[^\s"\']*)',
                r'(//[^\s"\']+\.m3u8[^\s"\']*)',
                r'url["\']?\s*[:=]\s*["\']([^"\']+\.m3u8[^"\']*)["\']',
            ]
            for pattern in patterns:
                matches = re.findall(pattern, html, re.IGNORECASE)
                if matches:
                    url = matches[0]
                    if url.startswith('//'):
                        url = 'https:' + url
                    elif url.startswith('/'):
                        url = base_url + url
                    self.m3u8_cache[page_url] = url
                    return url
            return None
        except:
            return None

    def _build_headers(self, flag, url):
        from urllib.parse import urlparse
        domain = urlparse(url).netloc
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", "Accept": "*/*"}
        if flag == 'migu_live':
            headers.update({"User-Agent": "com.android.chrome/3.7.0 (Linux;Android 15)", "Referer": "https://www.miguvideo.com/"})
        elif flag == 'gongdian_live':
            headers.update({"Referer": "https://gongdian.top/"})
        if 't.061899.xyz' in domain:
            headers.update({"User-Agent": "okhttp/3.12.11", "Referer": "http://t.061899.xyz/"})
        elif 'rihou.cc' in domain:
            headers.update({"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", "Referer": "https://rihou.cc:555/"})
        elif 'miguvideo.com' in domain:
            headers.update({"User-Agent": "com.android.chrome/3.7.0 (Linux;Android 15)", "Referer": "https://www.miguvideo.com/"})
        elif 'gongdian.top' in domain:
            headers.update({"Referer": "https://gongdian.top/"})
        elif domain:
            headers["Referer"] = f"https://{domain}/"
        return headers
    
    def searchContent(self, key, quick, pg="1"):
        pg = int(pg)
        results = []
        clean_key = re.sub(r'^[📁📂🎬🎵🖼📋📝🗄️🧲📄🖼️🎞️⬅️\s]+', '', key.lower())
        for path in self.root_paths:
            if not os.path.exists(path):
                continue
            all_files = []
            self._scan_for_search(path, all_files)
            for f in all_files:
                if clean_key in f['name'].lower():
                    item = self._create_search_item(f)
                    if item:
                        results.append(item)
        results.sort(key=lambda x: (clean_key not in x['vod_name'].lower(), x['vod_name']))
        per_page = 50
        start = (pg - 1) * per_page
        end = min(start + per_page, len(results))
        return {'list': results[start:end], 'page': pg, 'pagecount': (len(results) + per_page - 1) // per_page, 'limit': per_page, 'total': len(results)}
    
    def _scan_for_search(self, path, file_list, depth=0, max_depth=3):
        if depth > max_depth:
            return
        try:
            audio_names = []
            try:
                for name in os.listdir(path):
                    if name.startswith('.'):
                        continue
                    full_path = os.path.join(path, name)
                    if not os.path.isdir(full_path):
                        ext = self.get_file_ext(name)
                        if ext in self.audio_exts:
                            audio_names.append(os.path.splitext(name)[0])
            except:
                pass
            for name in os.listdir(path):
                if name.startswith('.'):
                    continue
                full_path = os.path.join(path, name)
                if os.path.isdir(full_path):
                    self._scan_for_search(full_path, file_list, depth + 1, max_depth)
                else:
                    if self._should_hide_file(name, path, audio_names):
                        continue
                    file_list.append({'name': name, 'path': full_path, 'ext': self.get_file_ext(name)})
        except:
            pass
    
    def _create_search_item(self, f):
        if self.is_image_file(f['ext']) or f['ext'].lower() in ['heic', 'heif']:
            return {
                'vod_id': self.URL_B64U_PREFIX + self.b64u_encode(self.PICS_PREFIX + "file://" + f['path']),
                'vod_name': f"🖼 {f['name']}",
                'vod_pic': f"file://{f['path']}",
                'vod_play_url': f"查看${self.PICS_PREFIX}file://{f['path']}",
                'vod_remarks': '',
                'style': {'type': 'grid', 'ratio': 1},
                'vod_player': '画'
            }
        if self.is_audio_file(f['ext']):
            cover_url = self.get_audio_cover_ultra_fast(f['path'])
            if cover_url and cover_url != self.DEFAULT_AUDIO_ICON and len(cover_url) > 50:
                display_pic = cover_url
            else:
                color = self.default_colors[hash(f['name']) % len(self.default_colors)]
                first_char = f['name'][0] if f['name'] else "🎵"
                display_pic = self._generate_colored_icon(color, first_char)
            return {
                'vod_id': self.URL_B64U_PREFIX + self.b64u_encode(self.MP3_PREFIX + f['path']),
                'vod_name': f"{f['name']}",
                'vod_pic': display_pic,
                'vod_play_url': f"播放${self.MP3_PREFIX + f['path']}",
                'vod_remarks': '',
                'style': {'type': 'list'},
                'vod_player': '听'
            }
        if self.is_media_file(f['ext']):
            return {'vod_id': f['path'], 'vod_name': f"🎬 {f['name']}", 'vod_pic': self.file_icons['video'], 'vod_remarks': '', 'style': {'type': 'list'}}
        if self.is_lrc_file(f['ext']):
            return {'vod_id': f['path'], 'vod_name': f"📝 {f['name']}", 'vod_pic': self.file_icons['lyrics'], 'vod_remarks': '', 'style': {'type': 'list'}}
        if f['ext'] == 'json':
            return {'vod_id': self.LIST_PREFIX + self.b64u_encode(f['path']), 'vod_name': f"📋 {f['name']}", 'vod_pic': self.file_icons['json'], 'vod_remarks': '', 'style': {'type': 'list'}}
        if f['ext'] == 'php':
            return {'vod_id': self.TEXT_PREFIX + self.b64u_encode(f['path']), 'vod_name': f"🐘 {f['name']}", 'vod_pic': self.file_icons['php'], 'vod_remarks': '', 'style': {'type': 'list'}}
        if f['ext'] == 'py':
            return {'vod_id': self.TEXT_PREFIX + self.b64u_encode(f['path']), 'vod_name': f"🐍 {f['name']}", 'vod_pic': self.file_icons['python'], 'vod_remarks': '', 'style': {'type': 'list'}}
        if f['ext'] == 'zip':
            return {'vod_id': f['path'], 'vod_name': f"🗜️ {f['name']}", 'vod_pic': self.file_icons['zip'], 'vod_remarks': '', 'style': {'type': 'list'}}
        if f['ext'] in ['rar', '7z', 'tar', 'gz', 'bz2', 'xz']:
            icon_key = 'rar' if f['ext'] == 'rar' else 'archive'
            return {'vod_id': f['path'], 'vod_name': f"🗜️ {f['name']}", 'vod_pic': self.file_icons[icon_key], 'vod_remarks': '', 'style': {'type': 'list'}}
        if f['ext'] in ['m3u', 'm3u8']:
            colors = ["#FF6B6B", "#4ECDC4", "#FFD93D", "#6BCB77", "#9D65C9", "#FF8C42", "#A2D729", "#FF6B8B", "#45B7D1", "#96CEB4"]
            color = colors[hash(f['name']) % len(colors)]
            first_char = f['name'][0].upper() if f['name'] else "M"
            icon_svg = self._generate_colored_icon(color, first_char)
            return {'vod_id': self.LIST_PREFIX + self.b64u_encode(f['path']), 'vod_name': f['name'], 'vod_pic': icon_svg, 'vod_remarks': '', 'style': {'type': 'list'}}
        if self.is_db_file(f['ext']):
            return {'vod_id': self.LIST_PREFIX + self.b64u_encode(f['path']), 'vod_name': f"🗄️ {f['name']}", 'vod_pic': self.file_icons['database'], 'vod_remarks': '', 'style': {'type': 'list'}}
        if f['ext'] == 'txt':
            is_live = any(kw in f['name'].lower() for kw in self.live_keywords)
            if is_live:
                colors = ["#FF6B6B", "#4ECDC4", "#FFD93D", "#6BCB77", "#9D65C9", "#FF8C42", "#A2D729", "#FF6B8B", "#45B7D1", "#96CEB4"]
                color = colors[hash(f['name']) % len(colors)]
                first_char = f['name'][0].upper() if f['name'] else "T"
                icon_svg = self._generate_colored_icon(color, first_char)
                return {'vod_id': self.LIST_PREFIX + self.b64u_encode(f['path']), 'vod_name': f['name'], 'vod_pic': icon_svg, 'vod_remarks': '', 'style': {'type': 'list'}}
            else:
                encoded = self.b64u_encode(f['path'])
                return {'vod_id': f"{self.NOVEL_PREFIX}{encoded}", 'vod_name': f"📖 {f['name']}", 'vod_pic': self.file_icons['novel'], 'vod_remarks': '', 'style': {'type': 'list'}, 'vod_player': '书'}
        if f['ext'] in ['xml', 'html', 'htm', 'css', 'js', 'sh', 'bash']:
            return {'vod_id': self.TEXT_PREFIX + self.b64u_encode(f['path']), 'vod_name': f"📄 {f['name']}", 'vod_pic': self.file_icons['text'], 'vod_remarks': '', 'style': {'type': 'list'}}
        return {'vod_id': f['path'], 'vod_name': f"📁 {f['name']}", 'vod_pic': self.file_icons['file'], 'vod_remarks': '', 'style': {'type': 'list'}}
    
    def clear_audio_cache(self):
        self.audio_list_cache.clear()
        self.audio_list_cache_time.clear()
        self.audio_cover_cache.clear()
        keys_to_delete = [k for k in self.lrc_cache if k.startswith('fast_lrc_')]
        for key in keys_to_delete:
            del self.lrc_cache[key]
        self.log(f"音频缓存已清理，清理了 {len(keys_to_delete)} 个歌词缓存")
    
    def clear_network_cache(self):
        self.network_lyrics_cache.clear()
        self.network_cover_cache.clear()
        self.song_info_cache.clear()
        self.log("网络缓存已清理")
    
    def shutdown(self):
        self.preload_executor.shutdown(wait=False)

    # ==================== 分类内容 ====================

    def categoryContent(self, tid, pg, filter, extend):
        pg = int(pg)
        
        # 处理根目录二级菜单的清除缓存操作
        if tid.startswith("root_") and extend and isinstance(extend, dict):
            action = extend.get("action", "")
            if action == "clear_cover_cache":
                return self._clear_cover_cache_content()
            elif action == "clear_lyrics_cache":
                return self._clear_lyrics_cache_content()
            elif action == "clear_radio_cover_cache":
                return self._clear_radio_cover_cache_content()
        
        # 检查筛选参数（支持4行字母筛选和2行数字筛选）
        filter_value = None
        
        if extend and isinstance(extend, dict):
            # 检查4行字母筛选
            if 'letter_row1' in extend and extend['letter_row1'] != '全部':
                filter_value = extend['letter_row1']
                print(f"📁 字母筛选: {filter_value}")
            elif 'letter_row2' in extend and extend['letter_row2'] != '全部':
                filter_value = extend['letter_row2']
                print(f"📁 字母筛选: {filter_value}")
            elif 'letter_row3' in extend and extend['letter_row3'] != '全部':
                filter_value = extend['letter_row3']
                print(f"📁 字母筛选: {filter_value}")
            elif 'letter_row4' in extend and extend['letter_row4'] != '全部':
                filter_value = extend['letter_row4']
                print(f"📁 字母筛选: {filter_value}")
            # 检查2行数字筛选
            elif 'digit_row1' in extend:
                filter_value = extend['digit_row1']
                print(f"🔢 数字筛选: {filter_value}")
            elif 'digit_row2' in extend:
                filter_value = extend['digit_row2']
                print(f"🔢 数字筛选: {filter_value}")
        
        # 在线电台处理
        if tid == "online_radio":
            if extend and isinstance(extend, dict):
                category_id = extend.get("category", "442")
            else:
                category_id = "442"
            return self._online_radio_content(category_id, pg)
        
        # 短视频处理
        if tid == "short_video":
            return self._short_video_category_content(pg)
        
        # 画廊处理
        if tid == "gallery":
            return self._gallery_category_content(pg)
        
        # 短视频详情处理
        if tid.startswith("short_video_"):
            encoded_url = tid[len("short_video_"):]
            return self._short_video_detail(encoded_url)
        
        if tid == self.live_category_id:
            return self._live_category_content(pg)
        
        if tid == 'recent':
            return self._recent_content(pg)
        
        # ========== 获取当前目录路径 ==========
        path = self._resolve_path(tid)
        if not path or not os.path.exists(path) or not os.path.isdir(path):
            return {'list': [], 'page': pg, 'pagecount': 1}
        
        # 获取当前目录的文件列表（使用缓存）
        cache_key = f"dir_{path}"
        if cache_key in self.dir_cache and time.time() - self.dir_cache_time.get(cache_key, 0) < 60:
            files = self.dir_cache[cache_key]
        else:
            files = self.scan_directory(path)
            self.dir_cache[cache_key] = files
            self.dir_cache_time[cache_key] = time.time()
        
        # ========== 应用筛选 ==========
        if filter_value and filter_value != '全部':
            # 计算每个文件的匹配分数
            for f in files:
                name = f['name']
                f['match_score'] = 0
                if not name:
                    continue
                first_char = name[0]
                
                if filter_value == 'all_digits':
                    # 全部数字
                    if first_char.isdigit():
                        f['match_score'] = 1
                elif filter_value.isdigit():
                    # 特定数字
                    if first_char.isdigit() and first_char == filter_value:
                        f['match_score'] = 1
                else:
                    # 字母筛选
                    if first_char.upper() == filter_value.upper():
                        f['match_score'] = 1
                    elif '\u4e00' <= first_char <= '\u9fff':
                        pinyin_initial = _get_chinese_pinyin_initial(name[0])
                        if pinyin_initial == filter_value.upper():
                            f['match_score'] = 1
            
            # 按匹配分数排序（匹配的在前，不匹配的在后）
            files.sort(key=lambda x: (-x['match_score'], not x['is_dir'], x['name'].lower()))
            
            matched_count = sum(1 for f in files if f['match_score'] == 1)
            print(f"📁 筛选: {filter_value} | 匹配 {matched_count} 个，共 {len(files)} 个文件")
        else:
            # 无筛选时正常排序
            files.sort(key=lambda x: (not x['is_dir'], x['name'].lower()))
        
        # ========== 分页 ==========
        total = len(files)
        per_page = 500
        start = (pg - 1) * per_page
        end = min(start + per_page, total)
        page_files = files[start:end]
        
        # ========== 构建列表 ==========
        vlist = []
        parent_item = self._create_parent_item(path)
        if parent_item:
            vlist.append(parent_item)
        
        # 预加载音频封面
        audio_paths = []
        for f in page_files:
            if not f['is_dir'] and self.is_audio_file(f['ext']):
                audio_paths.append(f['path'])
        
        if audio_paths:
            self.preload_covers_batch(audio_paths, max_count=500)
        
        for f in page_files:
            item = self._create_file_item_with_flags(f)
            if item:
                vlist.append(item)
        
        # 添加筛选统计信息
        if filter_value and filter_value != '全部':
            if filter_value == 'all_digits':
                filter_name = '全部数字'
                icon_emoji = "❄️"
                icon_color = "#FF9800"
            elif filter_value.isdigit():
                filter_name = f'数字 {filter_value}'
                icon_emoji = "❄️"
                icon_color = "#FF9800"
            else:
                filter_name = filter_value.upper()
                icon_emoji = "☀️"
                icon_color = "#4CAF50"
            
            matched_count = sum(1 for f in files if f.get('match_score', 0) == 1)
            
            info_item = {
                'vod_id': 'filter_info',
                'vod_name': f'{icon_emoji} 筛选: {filter_name}  |  匹配 {matched_count} / 共 {total} 个文件',
                'vod_pic': self._generate_colored_icon(icon_color, "🔍"),
                'vod_remarks': f'📌 匹配的排在前面',
                'style': {'type': 'list'},
                'vod_player': '书'
            }
            vlist.insert(0, info_item)
        
        return {
            'list': vlist,
            'page': pg,
            'pagecount': (total + per_page - 1) // per_page if total > 0 else 1,
            'limit': per_page,
            'total': total
        }
    
    def _resolve_path(self, tid):
        if tid.startswith('root_'):
            try:
                idx = int(tid[5:])
                return self.root_paths[idx] if idx < len(self.root_paths) else None
            except:
                return None
        elif tid.startswith(self.FOLDER_PREFIX):
            return self.b64u_decode(tid[len(self.FOLDER_PREFIX):])
        return tid if os.path.exists(tid) else None
    
    def _create_parent_item(self, current_path):
        parent = os.path.dirname(current_path)
        for root in self.root_paths:
            if os.path.normpath(current_path) == os.path.normpath(root.rstrip('/')):
                return None
        if not parent or parent == current_path:
            return None
        for i, root in enumerate(self.root_paths):
            if os.path.normpath(parent) == os.path.normpath(root.rstrip('/')):
                parent_id = f"root_{i}"
                parent_name = self.path_to_chinese.get(root, os.path.basename(parent))
                break
        else:
            parent_id = self.FOLDER_PREFIX + self.b64u_encode(parent)
            parent_name = os.path.basename(parent)
        return {
            'vod_id': parent_id,
            'vod_name': f'⬅️ 返回 {parent_name}',
            'vod_pic': self.file_icons['folder'],
            'vod_remarks': '',
            'vod_tag': 'folder',
            'style': {'type': 'list'}
        }
    
    def _create_file_item_with_flags(self, f):
        """创建文件项（带本地歌词和本地封面标志）"""
        icon = self.get_file_icon(f['ext'], f['is_dir'])
        
        if f['is_dir']:
            return {
                'vod_id': self.FOLDER_PREFIX + self.b64u_encode(f['path']),
                'vod_name': f"{icon} {f['name']}",
                'vod_pic': self.file_icons['folder'],
                'vod_remarks': '文件夹',
                'vod_tag': 'folder',
                'style': {'type': 'list'}
            }
        
        # 检查本地歌词和本地封面标志
        has_local_lyrics = False
        has_local_cover = False
        
        if self.is_audio_file(f['ext']):
            audio_dir = os.path.dirname(f['path'])
            audio_name = os.path.splitext(f['name'])[0]
            
            # 检查本地歌词
            for lrc_ext in self.lrc_exts:
                if os.path.exists(os.path.join(audio_dir, f"{audio_name}.{lrc_ext}")):
                    has_local_lyrics = True
                    break
                if os.path.exists(os.path.join(audio_dir, f"{audio_name}.{lrc_ext.upper()}")):
                    has_local_lyrics = True
                    break
            
            # 检查本地封面（只检查同名图片）
            exact_names = [
                f"{audio_name}.jpg", f"{audio_name}.jpeg", f"{audio_name}.png",
                f"{audio_name}.webp", f"{audio_name}.gif",
                f"{audio_name}.JPG", f"{audio_name}.JPEG", f"{audio_name}.PNG"
            ]
            for cover_name in exact_names:
                cover_path = os.path.join(audio_dir, cover_name)
                if os.path.exists(cover_path) and os.path.isfile(cover_path):
                    has_local_cover = True
                    break
        
        if self.is_image_file(f['ext']) or f['ext'].lower() in ['heic', 'heif']:
            return {
                'vod_id': f['path'],
                'vod_name': f"🖼 {f['name']}",
                'vod_pic': f"file://{f['path']}",
                'vod_play_url': f"查看${self.PICS_PREFIX}file://{f['path']}",
                'vod_remarks': '照片',
                'vod_tag': 'image',
                'style': {'type': 'grid', 'ratio': 1},
                'vod_player': '画'
            }
        
        if self.is_audio_file(f['ext']):
            cover_url = self.get_audio_cover_ultra_fast(f['path'])
            
            if cover_url and cover_url != self.DEFAULT_AUDIO_ICON and len(cover_url) > 50:
                display_pic = cover_url
            else:
                color = self.default_colors[hash(f['name']) % len(self.default_colors)]
                first_char = f['name'][0] if f['name'] else "🎵"
                display_pic = self._generate_colored_icon(color, first_char)
            
            # 构建备注信息（显示标志）
            remarks = '音频'
            if has_local_lyrics:
                remarks += ' 📝'
            if has_local_cover:
                remarks += ' 🖼'
            
            return {
                'vod_id': f['path'],
                'vod_name': f"{f['name']}",
                'vod_pic': display_pic,
                'vod_play_url': f"播放${self.MP3_PREFIX + f['path']}",
                'vod_remarks': remarks,
                'vod_tag': 'audio',
                'style': {'type': 'list'},
                'vod_player': '听'
            }
        
        if self.is_media_file(f['ext']):
            return {
                'vod_id': f['path'],
                'vod_name': f"🎬 {f['name']}",
                'vod_pic': self.file_icons['video'],
                'vod_remarks': '视频',
                'vod_tag': 'video',
                'style': {'type': 'list'}
            }
        
        if self.is_lrc_file(f['ext']):
            return {
                'vod_id': f['path'],
                'vod_name': f"📝 {f['name']}",
                'vod_pic': self.file_icons['lyrics'],
                'vod_remarks': '歌词',
                'vod_tag': 'lrc',
                'style': {'type': 'list'}
            }
        
        if f['ext'] == 'json':
            return {
                'vod_id': self.LIST_PREFIX + self.b64u_encode(f['path']),
                'vod_name': f"📋 {f['name']}",
                'vod_pic': self.file_icons['json'],
                'vod_play_url': f"查看${self.LIST_PREFIX + self.b64u_encode(f['path'])}",
                'vod_remarks': 'JSON数据',
                'vod_tag': 'json',
                'style': {'type': 'list'}
            }
        
        if f['ext'] == 'php':
            return {
                'vod_id': self.TEXT_PREFIX + self.b64u_encode(f['path']),
                'vod_name': f"🐘 {f['name']}",
                'vod_pic': self.file_icons['php'],
                'vod_remarks': 'PHP文件',
                'vod_tag': 'php',
                'style': {'type': 'list'}
            }
        
        if f['ext'] == 'py':
            return {
                'vod_id': self.TEXT_PREFIX + self.b64u_encode(f['path']),
                'vod_name': f"🐍 {f['name']}",
                'vod_pic': self.file_icons['python'],
                'vod_remarks': 'Python文件',
                'vod_tag': 'python',
                'style': {'type': 'list'}
            }
        
        if f['ext'] == 'zip':
            return {
                'vod_id': f['path'],
                'vod_name': f"🗜️ {f['name']}",
                'vod_pic': self.file_icons['zip'],
                'vod_remarks': 'ZIP压缩包',
                'vod_tag': 'zip',
                'style': {'type': 'list'}
            }
        
        if f['ext'] in ['rar', '7z', 'tar', 'gz', 'bz2', 'xz']:
            icon_key = 'rar' if f['ext'] == 'rar' else 'archive'
            return {
                'vod_id': f['path'],
                'vod_name': f"🗜️ {f['name']}",
                'vod_pic': self.file_icons[icon_key],
                'vod_remarks': f'{f["ext"].upper()}压缩包',
                'vod_tag': 'archive',
                'style': {'type': 'list'}
            }
        
        if f['ext'] in ['m3u', 'm3u8']:
            colors = ["#FF6B6B", "#4ECDC4", "#FFD93D", "#6BCB77", "#9D65C9", "#FF8C42", "#A2D729", "#FF6B8B", "#45B7D1", "#96CEB4"]
            color = colors[hash(f['name']) % len(colors)]
            first_char = f['name'][0].upper() if f['name'] else "M"
            icon_svg = self._generate_colored_icon(color, first_char)
            return {
                'vod_id': self.LIST_PREFIX + self.b64u_encode(f['path']),
                'vod_name': f['name'],
                'vod_pic': icon_svg,
                'vod_play_url': f"播放${self.LIST_PREFIX + self.b64u_encode(f['path'])}",
                'vod_remarks': '直播源',
                'vod_tag': 'live_m3u',
                'style': {'type': 'list'}
            }
        
        if self.is_db_file(f['ext']):
            return {
                'vod_id': self.LIST_PREFIX + self.b64u_encode(f['path']),
                'vod_name': f"🗄️ {f['name']}",
                'vod_pic': self.file_icons['database'],
                'vod_remarks': '数据库',
                'vod_tag': 'database',
                'style': {'type': 'list'}
            }
        
        if f['ext'] == 'txt':
            is_live_source = False
            is_novel = False
            url_count = 0
            content_preview = ""
            try:
                with open(f['path'], 'r', encoding='utf-8', errors='ignore') as ff:
                    content_preview = ff.read(4096)
                
                is_live_source = self._is_txt_live_source(content_preview, f['path'])
                
                if not is_live_source:
                    is_novel = self._is_txt_novel(content_preview, f['path'])
                
                url_matches = re.findall(r'https?://[^\s\'"<>]+', content_preview)
                url_count = len(url_matches)
                
            except Exception as e:
                self.log(f"读取txt预览失败: {e}")
            
            if is_live_source or url_count >= 2:
                colors = ["#FF6B6B", "#4ECDC4", "#FFD93D", "#6BCB77", "#9D65C9", "#FF8C42", "#A2D729", "#FF6B8B", "#45B7D1", "#96CEB4"]
                color = colors[hash(f['name']) % len(colors)]
                first_char = f['name'][0].upper() if f['name'] else "T"
                icon_svg = self._generate_colored_icon(color, first_char)
                return {
                    'vod_id': self.LIST_PREFIX + self.b64u_encode(f['path']),
                    'vod_name': f['name'],
                    'vod_pic': icon_svg,
                    'vod_play_url': f"播放${self.LIST_PREFIX + self.b64u_encode(f['path'])}",
                    'vod_remarks': f'直播源 ({url_count}个链接)',
                    'vod_tag': 'live_txt',
                    'style': {'type': 'list'}
                }
            elif is_novel:
                encoded = self.b64u_encode(f['path'])
                novel_url = f"{self.NOVEL_PREFIX}{encoded}"
                return {
                    'vod_id': novel_url,
                    'vod_name': f"📖 {f['name']}",
                    'vod_pic': self.file_icons['novel'],
                    'vod_play_url': f"阅读${novel_url}",
                    'vod_remarks': '小说',
                    'vod_tag': 'novel',
                    'style': {'type': 'list'},
                    'vod_player': '书'
                }
            else:
                encoded = self.b64u_encode(f['path'])
                return {
                    'vod_id': self.TEXT_PREFIX + encoded,
                    'vod_name': f"📄 {f['name']}",
                    'vod_pic': self.file_icons['text'],
                    'vod_remarks': '文本文件',
                    'vod_tag': 'text',
                    'style': {'type': 'list'}
                }
        
        if f['ext'] in ['xml', 'html', 'htm', 'css', 'js', 'sh', 'bash']:
            return {
                'vod_id': self.TEXT_PREFIX + self.b64u_encode(f['path']),
                'vod_name': f"📄 {f['name']}",
                'vod_pic': self.file_icons['text'],
                'vod_remarks': '代码文件',
                'vod_tag': 'code',
                'style': {'type': 'list'}
            }
        
        if f['ext']:
            return {
                'vod_id': f['path'],
                'vod_name': f"📁 {f['name']}",
                'vod_pic': self.file_icons['file'],
                'vod_remarks': f'{f["ext"].upper()}文件',
                'vod_tag': 'unknown',
                'style': {'type': 'list'}
            }
        else:
            return {
                'vod_id': f['path'],
                'vod_name': f"📁 {f['name']}",
                'vod_pic': self.file_icons['file'],
                'vod_remarks': '无扩展名',
                'vod_tag': 'unknown',
                'style': {'type': 'list'}
            }