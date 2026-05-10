import sys
import json
import re
import os
import time
import base64
from urllib.parse import quote, urlencode
from requests import Session, adapters
from urllib3.util.retry import Retry

sys.path.append('..')
from base.spider import Spider

# ==================== 配置 ====================
CACHE_DIR = "/storage/emulated/0/Download/tgmusic/music"
CACHE_ENABLED = True
QUALITY_PRIORITY = ["lossless", "jymaster", "hires", "exhigh", "standard", "jyeffect", "sky"]
COVER_MAX_SIZE_KB = 500

LOCAL_FILE_PREFIX = "http://127.0.0.1:9978/file/"

LOCAL_MUSIC_FOLDERS = [
    "/storage/emulated/0/Download/tgmusic/music"
]

AUDIO_EXTENSIONS = [".mp3", ".flac", ".m4a", ".wav", ".ape", ".ogg"]
TRASH_DIR = '/storage/emulated/0/Download/tgmusic/music/tmp/trash/'
EMPTY_TRASH_PIC_URL = "https://ss0.baidu.com/94o3dSag_xI4khGko9WTAnF6hhy/zhidao/pic/item/b3b7d0a20cf431ad837e5f974a36acaf2fdd98eb.jpg"

class Spider(Spider):
    def init(self, extend=""):
        self.host = "https://music.163.com"
        self.api_base = "https://www.cunyuapi.top/163music_play"
        
        self.play_apis = [
            {"url": "https://www.cunyuapi.top/163music_play", "type": "custom_main"},
            {"url": "https://api.cenguigui.cn/api/netease/music_v1.php", "type": "cenguigui"},
            {"url": "https://api.66mz8.com/api/163.php", "type": "66mz8"},
            {"url": "https://api.uomg.com/api/163music", "type": "uomg"},
        ]
        
        self.cache_enabled = CACHE_ENABLED
        self.cache_dir = CACHE_DIR
        self._init_cache_dir()
        os.makedirs(TRASH_DIR, exist_ok=True)
        self.cover_max_size_kb = COVER_MAX_SIZE_KB
        
        # ==================== 完整音质配置 ====================
        self.quality_map = {
            "standard": {"name": "标准", "code": "standard", "br": 128000, "ext": "mp3"},
            "exhigh": {"name": "极高", "code": "exhigh", "br": 320000, "ext": "mp3"},
            "lossless": {"name": "无损", "code": "lossless", "br": 999000, "ext": "flac"},
            "hires": {"name": "Hi-Res", "code": "hires", "br": 921600, "ext": "flac"},
            "jyeffect": {"name": "高清环绕声", "code": "jyeffect", "br": 999000, "ext": "flac"},
            "sky": {"name": "沉浸环绕声", "code": "sky", "br": 999000, "ext": "flac"},
            "jymaster": {"name": "超清母带", "code": "jymaster", "br": 999000, "ext": "flac"}
        }
        
        self.quality_priority = []
        for q in QUALITY_PRIORITY:
            if q in self.quality_map:
                self.quality_priority.append(self.quality_map[q])
        
        self.session = Session()
        adapter = adapters.HTTPAdapter(max_retries=Retry(total=3, backoff_factor=0.5))
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)
        
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Referer": "https://music.163.com/",
        }
        self.session.headers.update(self.headers)
        
        self.cache_metadata = self._load_cache_metadata()
        self.download_mode = False
        self.current_quality = "standard"
        
        self._local_songs_cache = None
        self._last_scan_time = 0
        self._trash_cache = None
        self._trash_cache_time = 0
        self.click_count = {}
        self.click_timer = {}
        
        print("网易云音乐插件初始化完成")

    def getName(self):
        return "网易云音乐"
    
    def isVideoFormat(self, url):
        return bool(re.search(r'\.(m3u8|mp4|mp3|m4a|flv)(\?|$)', url or "", re.I))
    
    def manualVideoCheck(self):
        return False
    
    def destroy(self):
        try:
            self.session.close()
        except:
            pass

    def _init_cache_dir(self):
        if not self.cache_enabled:
            return
        if not os.path.exists(self.cache_dir):
            try:
                os.makedirs(self.cache_dir)
            except:
                self.cache_enabled = False
    
    def _get_safe_filename(self, name):
        """将名称转换为安全的文件名"""
        if not name:
            return None
        if name.startswith("song_") or str(name).isdigit():
            return None
        illegal_chars = r'[<>:"/\\|?*]'
        name = re.sub(illegal_chars, '', name)
        name = name.strip('. ')
        if len(name) > 200:
            name = name[:200]
        if not name:
            return None
        return name
    
    def _get_real_song_name(self, song_id):
        """通过API获取真实的歌曲名（歌名 - 歌手）"""
        try:
            api_url = f"{self.api_base}?id={song_id}"
            data = self._fetch_json(api_url)
            if data and data.get("status") == 200:
                name = data.get("name", "")
                ar_name = data.get("ar_name", "")
                if name:
                    if ar_name:
                        ar_name = ar_name.replace("/", "、")
                        return f"{name} - {ar_name}"
                    return name
        except Exception as e:
            print(f"获取歌曲名失败: {e}")
        
        try:
            data = self._fetch_json(f"{self.host}/api/song/detail?ids=[{song_id}]")
            if data and "songs" in data and data["songs"]:
                s = data["songs"][0]
                name = s.get("name", "")
                artists = s.get("ar", [])
                if artists:
                    artist_list = [a.get('name', '') for a in artists]
                    artist_name = '/'.join(artist_list).replace("/", "、")
                    return f"{name} - {artist_name}"
                return name
        except Exception as e:
            print(f"备用API获取歌曲名失败: {e}")
        
        return None
    
    def _get_cache_paths(self, name, song_id, ext="mp3"):
        """获取缓存文件路径 - 优先使用中文名"""
        safe_name = None
        
        if name and not name.startswith("song_") and not str(name).isdigit():
            safe_name = self._get_safe_filename(name)
        
        if not safe_name:
            real_name = self._get_real_song_name(song_id)
            if real_name:
                safe_name = self._get_safe_filename(real_name)
        
        if not safe_name:
            safe_name = f"song_{song_id}"
        
        return {
            "audio_mp3": os.path.join(self.cache_dir, f"{safe_name}.mp3"),
            "audio_flac": os.path.join(self.cache_dir, f"{safe_name}.flac"),
            "cover": os.path.join(self.cache_dir, f"{safe_name}.jpg"),
            "lrc": os.path.join(self.cache_dir, f"{safe_name}.lrc")
        }
    
    def _load_cache_metadata(self):
        f = os.path.join(self.cache_dir, "缓存索引.json")
        if os.path.exists(f):
            try:
                with open(f, 'r', encoding='utf-8') as fp:
                    return json.load(fp)
            except:
                pass
        return {}
    
    def _save_cache_metadata(self):
        if not self.cache_enabled:
            return
        f = os.path.join(self.cache_dir, "缓存索引.json")
        try:
            with open(f, 'w', encoding='utf-8') as fp:
                json.dump(self.cache_metadata, fp, ensure_ascii=False, indent=2)
        except:
            pass

    def _format_count(self, count):
        try:
            count = int(count)
            if count > 100000000:
                return f"{round(count / 100000000, 1)}亿"
            elif count > 10000:
                return f"{round(count / 10000, 1)}万"
            return str(count)
        except:
            return str(count)

    def _fetch(self, url, method="GET", data=None, headers=None, timeout=10):
        try:
            h = self.headers.copy()
            if headers:
                h.update(headers)
            if method == "POST":
                r = self.session.post(url, data=data, headers=h, timeout=timeout)
            else:
                r = self.session.get(url, headers=h, timeout=timeout)
            r.encoding = "utf-8"
            return r.text
        except Exception as e:
            print(f"请求失败: {e}")
            return "{}"

    def _fetch_json(self, url, timeout=10):
        try:
            text = self._fetch(url, timeout=timeout)
            if text:
                return json.loads(text)
        except:
            pass
        return None

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

    def _result_message(self, success, msg, refresh_target=None):
        if success:
            svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
                <rect width="200" height="200" rx="40" ry="40" fill="#4CAF50"/>
                <circle cx="100" cy="100" r="70" fill="white" opacity="0.3"/>
                <text x="100" y="140" font-size="100" text-anchor="middle" fill="white" font-family="Arial" font-weight="bold">✓</text>
            </svg>'''
        else:
            svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
                <rect width="200" height="200" rx="40" ry="40" fill="#F44336"/>
                <circle cx="100" cy="100" r="70" fill="white" opacity="0.3"/>
                <text x="100" y="140" font-size="100" text-anchor="middle" fill="white" font-family="Arial" font-weight="bold">✗</text>
            </svg>'''
        pic = f"data:image/svg+xml;base64,{base64.b64encode(svg.encode()).decode()}"
        
        if refresh_target:
            return {"parse": 1, "url": refresh_target, "header": "", "pic": pic, "lrc": "", "msg": f"{'✅' if success else '❌'} {msg}"}
        return {"parse": 0, "url": "", "header": "", "pic": pic, "lrc": "", "msg": f"{'✅' if success else '❌'} {msg}"}

    # ==================== 回收站相关方法 ====================
    
    def _scan_trash_files(self):
        current_time = time.time()
        if self._trash_cache is not None and (current_time - self._trash_cache_time) < 10:
            return self._trash_cache
        
        files = []
        if os.path.exists(TRASH_DIR):
            grouped = {}
            for filename in os.listdir(TRASH_DIR):
                file_path = os.path.join(TRASH_DIR, filename)
                if not os.path.isfile(file_path) or filename.endswith('.meta'):
                    continue
                
                ext = os.path.splitext(filename)[1].lower()
                
                original_name = filename
                timestamp_prefix = ""
                if '_' in filename:
                    parts = filename.split('_', 1)
                    if len(parts) == 2 and parts[0].isdigit():
                        timestamp_prefix = parts[0]
                        original_name = parts[1]
                
                base_name = os.path.splitext(original_name)[0]
                
                if base_name not in grouped:
                    grouped[base_name] = {
                        'audio': None,
                        'cover': None,
                        'lrc': None,
                        'size': 0,
                        'mtime': 0,
                        'timestamp': timestamp_prefix
                    }
                
                if ext in AUDIO_EXTENSIONS:
                    grouped[base_name]['audio'] = {
                        'name': filename,
                        'path': file_path,
                        'size': os.path.getsize(file_path),
                        'mtime': os.path.getmtime(file_path),
                        'original_name': original_name
                    }
                    grouped[base_name]['size'] += os.path.getsize(file_path)
                    grouped[base_name]['mtime'] = max(grouped[base_name]['mtime'], os.path.getmtime(file_path))
                elif ext in ['.jpg', '.jpeg', '.png', '.webp', '.gif']:
                    grouped[base_name]['cover'] = {'name': filename, 'path': file_path}
                    grouped[base_name]['size'] += os.path.getsize(file_path)
                elif ext in ['.lrc', '.txt']:
                    grouped[base_name]['lrc'] = {'name': filename, 'path': file_path}
                    grouped[base_name]['size'] += os.path.getsize(file_path)
            
            for base_name, data in grouped.items():
                if data['audio']:
                    audio = data['audio']
                    cover_url = ""
                    if data['cover']:
                        rel_path = data['cover']['path'].replace("/storage/emulated/0/", "")
                        cover_url = f"{LOCAL_FILE_PREFIX}{rel_path}"
                    
                    files.append({
                        "name": audio['name'],
                        "original_name": audio['original_name'],
                        "path": audio['path'],
                        "size": data['size'],
                        "mtime": data['mtime'],
                        "is_audio": True,
                        "cover_url": cover_url,
                        "has_cover": data['cover'] is not None,
                        "has_lrc": data['lrc'] is not None,
                    })
            
            files.sort(key=lambda x: x.get("mtime", 0), reverse=True)
        
        self._trash_cache = files
        self._trash_cache_time = current_time
        return files
    
    def _restore_from_trash(self, file_name):
        try:
            trash_path = os.path.join(TRASH_DIR, file_name)
            if not os.path.exists(trash_path):
                return False, "文件不存在"
            
            original_name = file_name
            timestamp_prefix = ""
            if '_' in file_name:
                parts = file_name.split('_', 1)
                if len(parts) == 2 and parts[0].isdigit():
                    timestamp_prefix = parts[0]
                    original_name = parts[1]
            
            original_path = None
            for folder in LOCAL_MUSIC_FOLDERS:
                test_path = os.path.join(folder, original_name)
                if not os.path.exists(test_path):
                    original_path = test_path
                    break
            
            if not original_path:
                original_path = os.path.join(LOCAL_MUSIC_FOLDERS[0], original_name)
            
            os.makedirs(os.path.dirname(original_path), exist_ok=True)
            os.rename(trash_path, original_path)
            
            base_name = os.path.splitext(original_name)[0]
            restored_files = [original_name]
            
            for trash_file in os.listdir(TRASH_DIR):
                if trash_file.startswith(timestamp_prefix + '_') and trash_file != file_name:
                    trash_parts = trash_file.split('_', 1)
                    if len(trash_parts) == 2:
                        trash_original = trash_parts[1]
                        trash_base = os.path.splitext(trash_original)[0]
                        if trash_base == base_name:
                            trash_file_path = os.path.join(TRASH_DIR, trash_file)
                            target_path = os.path.join(os.path.dirname(original_path), trash_original)
                            if os.path.isfile(trash_file_path):
                                os.rename(trash_file_path, target_path)
                                restored_files.append(trash_original)
            
            self._trash_cache = None
            self._local_songs_cache = None
            return True, f"已恢复: {', '.join(restored_files)}"
        except Exception as e:
            return False, f"恢复失败: {e}"
    
    def _empty_trash(self):
        deleted_count = 0
        deleted_size = 0
        if os.path.exists(TRASH_DIR):
            for filename in os.listdir(TRASH_DIR):
                file_path = os.path.join(TRASH_DIR, filename)
                if os.path.isfile(file_path):
                    try:
                        deleted_size += os.path.getsize(file_path)
                        os.remove(file_path)
                        deleted_count += 1
                    except:
                        pass
        self._trash_cache = None
        self._local_songs_cache = None
        if deleted_size > 1024 * 1024:
            size_str = f"{deleted_size / (1024 * 1024):.2f} MB"
        elif deleted_size > 1024:
            size_str = f"{deleted_size / 1024:.2f} KB"
        else:
            size_str = f"{deleted_size} B"
        return deleted_count, size_str
    
    def _delete_to_trash(self, file_path):
        try:
            if not os.path.exists(file_path):
                return False, "文件不存在"
            
            file_name = os.path.basename(file_path)
            timestamp = int(time.time())
            unique_name = f"{timestamp}_{file_name}"
            trash_path = os.path.join(TRASH_DIR, unique_name)
            
            os.rename(file_path, trash_path)
            
            audio_dir = os.path.dirname(file_path)
            audio_name = os.path.splitext(file_name)[0]
            moved_files = [file_name]
            
            for cover_ext in ['jpg', 'jpeg', 'png', 'webp', 'gif']:
                cover_path = os.path.join(audio_dir, f"{audio_name}.{cover_ext}")
                if os.path.exists(cover_path):
                    cover_trash_name = f"{timestamp}_{audio_name}.{cover_ext}"
                    cover_trash_path = os.path.join(TRASH_DIR, cover_trash_name)
                    os.rename(cover_path, cover_trash_path)
                    moved_files.append(f"{audio_name}.{cover_ext}")
            
            for lrc_ext in ['lrc', 'txt']:
                lrc_path = os.path.join(audio_dir, f"{audio_name}.{lrc_ext}")
                if os.path.exists(lrc_path):
                    lrc_trash_name = f"{timestamp}_{audio_name}.{lrc_ext}"
                    lrc_trash_path = os.path.join(TRASH_DIR, lrc_trash_name)
                    os.rename(lrc_path, lrc_trash_path)
                    moved_files.append(f"{audio_name}.{lrc_ext}")
            
            self._local_songs_cache = None
            self._trash_cache = None
            return True, f"已删除: {', '.join(moved_files)}"
        except Exception as e:
            return False, f"删除失败: {e}"
    
    def _delete_cached_song(self, song_id):
        cache_info = self.cache_metadata.get(str(song_id), {})
        audio_path = cache_info.get("audio_path")
        if audio_path and os.path.exists(audio_path):
            success, msg = self._delete_to_trash(audio_path)
            if success:
                if str(song_id) in self.cache_metadata:
                    del self.cache_metadata[str(song_id)]
                    self._save_cache_metadata()
                return True, msg
        return False, "文件不存在"

    # ==================== 本地音乐相关方法 ====================
    def _format_file_size(self, size):
        if size < 1024:
            return f"{size}B"
        elif size < 1024 * 1024:
            return f"{size / 1024:.1f}KB"
        elif size < 1024 * 1024 * 1024:
            return f"{size / (1024 * 1024):.1f}MB"
        else:
            return f"{size / (1024 * 1024 * 1024):.2f}GB"
    
    def _is_pure_number(self, name):
        name = os.path.splitext(name)[0] if '.' in name else name
        return bool(re.match(r'^\d+$', name))
    
    def _scan_local_songs(self):
        current_time = time.time()
        if self._local_songs_cache is not None and (current_time - self._last_scan_time) < 30:
            return self._local_songs_cache
        
        songs = []
        for folder in LOCAL_MUSIC_FOLDERS:
            if not os.path.exists(folder):
                continue
            try:
                for filename in os.listdir(folder):
                    file_path = os.path.join(folder, filename)
                    if not os.path.isfile(file_path):
                        continue
                    ext = os.path.splitext(filename)[1].lower()
                    if ext not in AUDIO_EXTENSIONS:
                        continue
                    
                    name_without_ext = os.path.splitext(filename)[0]
                    if self._is_pure_number(name_without_ext):
                        continue
                    
                    song_name = name_without_ext
                    artist = ""
                    if "-" in name_without_ext:
                        parts = name_without_ext.rsplit("-", 1)
                        if len(parts) == 2:
                            song_name = parts[0].strip()
                            artist = parts[1].strip()
                    
                    relative_path = file_path.replace("/storage/emulated/0/", "")
                    play_url = f"{LOCAL_FILE_PREFIX}{relative_path}"
                    
                    cover_url = ""
                    for cover_ext in ['.jpg', '.jpeg', '.png']:
                        cover_path = os.path.join(folder, f"{name_without_ext}{cover_ext}")
                        if os.path.exists(cover_path):
                            rel_cover = cover_path.replace("/storage/emulated/0/", "")
                            cover_url = f"{LOCAL_FILE_PREFIX}{rel_cover}"
                            break
                    
                    display_name = f"{song_name} - {artist}" if artist else song_name
                    songs.append({
                        "display": display_name,
                        "play_url": play_url,
                        "cover_url": cover_url,
                        "size": os.path.getsize(file_path),
                        "ext": ext,
                        "modified": os.path.getmtime(file_path)
                    })
            except Exception as e:
                print(f"扫描失败 {folder}: {e}")
        
        songs.sort(key=lambda x: x.get("modified", 0), reverse=True)
        self._local_songs_cache = songs
        self._last_scan_time = current_time
        return songs

    def _get_local_lyrics_for_file(self, file_path):
        try:
            if file_path.startswith("http://127.0.0.1:9978/file/"):
                file_path = file_path.replace("http://127.0.0.1:9978/file/", "")
                file_path = "/storage/emulated/0/" + file_path
            audio_dir = os.path.dirname(file_path)
            audio_name = os.path.splitext(os.path.basename(file_path))[0]
            lrc_path = os.path.join(audio_dir, f"{audio_name}.lrc")
            if os.path.exists(lrc_path):
                with open(lrc_path, 'r', encoding='utf-8', errors='ignore') as f:
                    return f.read()
        except:
            pass
        return ""

    def _get_cache_audio_url(self, song_id, song_name):
        cache_info = self.cache_metadata.get(str(song_id))
        if cache_info and cache_info.get("audio_path") and os.path.exists(cache_info["audio_path"]):
            audio_path = cache_info["audio_path"]
            relative_path = audio_path.replace("/storage/emulated/0/", "")
            return f"{LOCAL_FILE_PREFIX}{relative_path}", audio_path
        return None, None

    def _get_cache_cover_url(self, song_id):
        cache_info = self.cache_metadata.get(str(song_id), {})
        cover_path = cache_info.get("cover_path")
        if cover_path and os.path.exists(cover_path):
            relative_path = cover_path.replace("/storage/emulated/0/", "")
            return f"{LOCAL_FILE_PREFIX}{relative_path}"
        return None

    # ==================== 歌词获取 ====================
    def _get_lyrics_by_song_id(self, song_id):
        if not song_id or not str(song_id).isdigit():
            return ""
        
        local_lrc = self._get_cache_lrc_content(song_id)
        if local_lrc:
            return local_lrc
        
        try:
            data = self._fetch_json(f"{self.api_base}?id={song_id}")
            if data and data.get("status") == 200:
                lyric = data.get("lyric", "")
                if lyric and len(lyric) > 20:
                    print(f"[歌词] 从主API获取成功，长度: {len(lyric)}")
                    return lyric
        except Exception as e:
            print(f"[歌词] 主API获取失败: {e}")
        
        try:
            url = f"https://music.163.com/api/song/lyric?id={song_id}&lv=1&kv=1&tv=-1"
            data = self._fetch_json(url)
            lrc = data.get("lrc", {}).get("lyric", "") if data else ""
            if lrc and len(lrc) > 20:
                print(f"[歌词] 从官方API获取成功，长度: {len(lrc)}")
                return lrc
        except Exception as e:
            print(f"[歌词] 官方API获取失败: {e}")
        
        return ""
    
    def _get_cache_lrc_content(self, song_id):
        cache_info = self.cache_metadata.get(str(song_id), {})
        lrc_path = cache_info.get("lrc_path")
        if lrc_path and os.path.exists(lrc_path):
            try:
                with open(lrc_path, 'r', encoding='utf-8') as f:
                    return f.read()
            except:
                pass
        return None

    # ==================== 核心方法：获取歌曲信息 ====================
    def _get_song_info_and_url(self, song_id, quality_code):
        quality = self.quality_map.get(quality_code, self.quality_map["standard"])
        
        try:
            api_url = f"{self.api_base}?id={song_id}&quality={quality_code}"
            print(f"[API] 请求: {api_url}")
            data = self._fetch_json(api_url)
            print(f"[API] 返回: {data}")
            
            if data and data.get("status") == 200:
                play_url = data.get("song_file_url")
                name = data.get("name", "")
                ar_name = data.get("ar_name", "")
                img = data.get("img", "")
                lyric = data.get("lyric", "")
                
                if img and img.startswith("//"):
                    img = "https:" + img
                
                if ar_name:
                    ar_name = ar_name.replace("/", "、")
                song_display = f"{name} - {ar_name}" if ar_name else name
                ext = 'flac' if play_url and '.flac' in play_url.lower() else 'mp3'
                
                print(f"[API] 歌曲: {song_display}")
                print(f"[API] 封面: {img}")
                print(f"[API] 歌词长度: {len(lyric) if lyric else 0}")
                
                return {
                    'play_url': play_url,
                    'song_display': song_display,
                    'pic': img,
                    'lyric': lyric,
                    'ext': ext
                }
        except Exception as e:
            print(f"[API] 请求失败: {e}")
        
        return None

    def _get_song_info_only(self, song_id):
        try:
            api_url = f"{self.api_base}?id={song_id}"
            data = self._fetch_json(api_url)
            if data and data.get("status") == 200:
                name = data.get("name", "")
                ar_name = data.get("ar_name", "")
                img = data.get("img", "")
                if img and img.startswith("//"):
                    img = "https:" + img
                if ar_name:
                    ar_name = ar_name.replace("/", "、")
                song_display = f"{name} - {ar_name}" if ar_name else name
                return {
                    'song_display': song_display,
                    'pic': img
                }
        except Exception as e:
            print(f"获取歌曲信息失败: {e}")
        return None

    def _download_cover(self, cover_url, save_path):
        if not cover_url:
            return False
        try:
            print(f"[封面] 下载: {cover_url}")
            r = self.session.get(cover_url, timeout=15, headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Referer": "https://music.163.com/",
            })
            if r.status_code == 200 and len(r.content) > 500:
                with open(save_path, 'wb') as f:
                    f.write(r.content)
                print(f"[封面] 保存成功: {save_path} ({len(r.content)} bytes)")
                return True
            else:
                print(f"[封面] 下载失败: HTTP {r.status_code}")
                return False
        except Exception as e:
            print(f"[封面] 下载异常: {e}")
            return False

    # ==================== 首页 ====================
    def homeContent(self, filter):
        playlist_categories = [
            {"n": "全部", "v": "全部"}, {"n": "华语", "v": "华语"}, {"n": "欧美", "v": "欧美"},
            {"n": "日语", "v": "日语"}, {"n": "韩语", "v": "韩语"}, {"n": "流行", "v": "流行"},
            {"n": "摇滚", "v": "摇滚"}, {"n": "民谣", "v": "民谣"}, {"n": "电子", "v": "电子"},
            {"n": "说唱", "v": "说唱"}, {"n": "古风", "v": "古风"}, {"n": "ACG", "v": "ACG"}
        ]
        
        classes = [
            {"type_name": "📁 本地音乐", "type_id": "local_music"},
            {"type_name": "歌单分类", "type_id": "hot_playlist"},
            {"type_name": "排行榜", "type_id": "toplist"},
            {"type_name": "歌手分类", "type_id": "artist_cat"},
            {"type_name": "🗑️ 回收站", "type_id": "trash_can"},
        ]
        
        filters = {
            "artist_cat": [
                {"key": "area", "name": "地区", "value": [{"n": n, "v": v} for n,v in [
                    ("全部", "-1"), ("华语", "7"), ("欧美", "96"), ("韩国", "16"), ("日本", "8")
                ]]},
                {"key": "genre", "name": "性别", "value": [{"n": n, "v": v} for n,v in [
                    ("全部", "-1"), ("男歌手", "1"), ("女歌手", "2"), ("组合", "3")
                ]]},
                {"key": "letter", "name": "字母", "value": [{"n": "全部", "v": "-1"}] + 
                    [{"n": chr(i), "v": chr(i).upper()} for i in range(65, 91)] + [{"n": "#", "v": "0"}]}
            ],
            "hot_playlist": [
                {"key": "cat", "name": "类型", "value": playlist_categories},
                {"key": "order", "name": "排序", "value": [{"n": "最热", "v": "hot"}, {"n": "最新", "v": "new"}]}
            ],
            "toplist": []
        }
        
        videos = []
        local_songs = self._scan_local_songs()
        total_size = sum(s.get("size", 0) for s in local_songs)
        videos.append({
            "vod_id": "local_all",
            "vod_name": "📁 本地音乐",
            "vod_pic": "",
            "vod_remarks": f"{len(local_songs)}首 · {self._format_file_size(total_size)}"
        })
        
        trash_files = self._scan_trash_files()
        trash_size = sum(f.get("size", 0) for f in trash_files)
        videos.append({
            "vod_id": "trash_can",
            "vod_name": "🗑️ 回收站",
            "vod_pic": "",
            "vod_remarks": f"{len(trash_files)}个文件 · {self._format_file_size(trash_size)}"
        })
        
        try:
            data = self._fetch_json(f"{self.host}/api/toplist")
            if data and "list" in data:
                for it in data["list"][:6]:
                    videos.append({
                        "vod_id": f"toplist_{it['id']}",
                        "vod_name": it.get("name", ""),
                        "vod_pic": (it.get("coverImgUrl", "") or "") + "?param=300y300",
                        "vod_remarks": it.get("updateFrequency", "排行榜")
                    })
        except:
            pass
        
        return {"class": classes, "filters": filters, "list": videos}
    
    def homeVideoContent(self):
        return {"list": []}

    # ==================== 分类 ====================
    def categoryContent(self, tid, pg, filter, extend):
        pg = int(pg or 1)
        limit = 30
        videos = []
        
        if tid == "trash_can":
            files = self._scan_trash_files()
            total = len(files)
            start = (pg - 1) * limit
            page_files = files[start:start+limit]
            
            if pg == 1 and total > 0:
                videos.append({
                    "vod_id": "trash_empty_all",
                    "vod_name": "🗑️ 一键清空回收站",
                    "vod_pic": EMPTY_TRASH_PIC_URL,
                    "vod_remarks": f"永久删除全部 {total} 个文件"
                })
            
            for f in page_files:
                icon = "🎵"
                size_str = self._format_file_size(f['size'])
                time_str = time.strftime('%m-%d %H:%M', time.localtime(f['mtime']))
                pic = f.get('cover_url', '')
                
                badges = []
                if f.get('has_cover'):
                    badges.append("🖼️")
                if f.get('has_lrc'):
                    badges.append("📝")
                badge_str = " ".join(badges) if badges else ""
                remark = f"{size_str} · {time_str}"
                if badge_str:
                    remark = f"{badge_str} {remark}"
                
                videos.append({
                    "vod_id": f"trash_file_{f['name']}",
                    "vod_name": f"{icon} {f['original_name']}",
                    "vod_pic": pic,
                    "vod_remarks": remark
                })
            
            pagecount = (total + limit - 1) // limit if total > 0 else 1
            return {"list": videos, "page": pg, "pagecount": pagecount, "limit": limit, "total": total}
        
        if tid == "local_music" or tid == "local_all":
            songs = self._scan_local_songs()
            total = len(songs)
            start = (pg - 1) * limit
            page_songs = songs[start:start+limit]
            
            for song in page_songs:
                videos.append({
                    "vod_id": f"local_{song['display']}",
                    "vod_name": song['display'],
                    "vod_pic": song['cover_url'],
                    "vod_remarks": f"{song['ext'].upper()} · {self._format_file_size(song['size'])}"
                })
            pagecount = (total + limit - 1) // limit if total > 0 else 1
            return {"list": videos, "page": pg, "pagecount": pagecount, "limit": limit, "total": total}
        
        try:
            if tid == "toplist":
                data = self._fetch_json(f"{self.host}/api/toplist")
                if data and "list" in data:
                    for it in data["list"]:
                        videos.append({
                            "vod_id": f"toplist_{it['id']}",
                            "vod_name": it.get("name", ""),
                            "vod_pic": (it.get("coverImgUrl", "") or "") + "?param=300y300",
                            "vod_remarks": it.get("updateFrequency", "")
                        })
            elif tid == "hot_playlist":
                cat = "全部"
                order = "hot"
                if extend:
                    if isinstance(extend, dict):
                        cat = extend.get("cat", "全部")
                        order = extend.get("order", "hot")
                    elif isinstance(extend, str):
                        try:
                            extend_dict = json.loads(extend)
                            cat = extend_dict.get("cat", "全部")
                            order = extend_dict.get("order", "hot")
                        except:
                            pass
                offset = (pg - 1) * limit
                if cat == "全部" or not cat:
                    url = f"{self.host}/api/playlist/list?order={order}&limit={limit}&offset={offset}"
                else:
                    url = f"{self.host}/api/playlist/list?cat={quote(str(cat))}&order={order}&limit={limit}&offset={offset}"
                data = self._fetch_json(url)
                if data and "playlists" in data:
                    for it in data["playlists"]:
                        videos.append({
                            "vod_id": f"playlist_{it['id']}",
                            "vod_name": it.get("name", ""),
                            "vod_pic": (it.get("coverImgUrl", "") or "") + "?param=300y300",
                            "vod_remarks": f"播放: {self._format_count(it.get('playCount', 0))}"
                        })
            elif tid == "artist_cat":
                offset = (pg - 1) * limit
                
                area = "-1"
                genre = "-1"
                letter = "-1"
                
                if extend:
                    if isinstance(extend, dict):
                        area = extend.get("area", "-1")
                        genre = extend.get("genre", "-1")
                        letter = extend.get("letter", "-1")
                    elif isinstance(extend, str):
                        try:
                            extend_dict = json.loads(extend)
                            area = extend_dict.get("area", "-1")
                            genre = extend_dict.get("genre", "-1")
                            letter = extend_dict.get("letter", "-1")
                        except:
                            pass
                
                url = f"{self.host}/api/artist/list?type={genre}&area={area}&limit={limit}&offset={offset}"
                if letter != "-1" and letter != "0" and letter != "":
                    url += f"&initial={letter.upper()}"
                
                print(f"[歌手] 筛选参数: area={area}, genre={genre}, letter={letter}")
                print(f"[歌手] 请求URL: {url}")
                
                data = self._fetch_json(url)
                
                if data and "artists" in data:
                    for artist in data["artists"]:
                        img_url = artist.get("picUrl", "") or artist.get("img1v1Url", "")
                        if img_url and not img_url.startswith("http"):
                            img_url = "https:" + img_url
                        videos.append({
                            "vod_id": f"artist_{artist['id']}",
                            "vod_name": artist.get("name", ""),
                            "vod_pic": f"{img_url}?param=300y300" if img_url else "",
                            "vod_remarks": f"歌曲:{artist.get('musicSize', 0)}"
                        })
        except Exception as e:
            print(f"categoryContent错误 [{tid}]: {e}")
            import traceback
            traceback.print_exc()
        
        pagecount = 9999 if len(videos) >= limit else (len(videos) + limit - 1) // limit if videos else 0
        return {"list": videos, "page": pg, "pagecount": pagecount, "limit": limit, "total": len(videos)}

    # ==================== 详情 ====================
    def detailContent(self, ids):
        did = ids[0] if isinstance(ids, list) else ids
        
        if did.startswith("trash_file_"):
            file_name = did.replace("trash_file_", "")
            files = self._scan_trash_files()
            for f in files:
                if f['name'] == file_name:
                    encoded_name = self.b64u_encode(file_name)
                    
                    content_lines = [
                        f"📄 文件: {f['original_name']}",
                        f"💾 大小: {self._format_file_size(f['size'])}",
                        f"⏰ 删除时间: {time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(f['mtime']))}",
                        "",
                        "📦 包含内容:"
                    ]
                    
                    if f.get('has_cover'):
                        content_lines.append("  🖼️ 封面图片")
                    if f.get('has_lrc'):
                        content_lines.append("  📝 歌词文件")
                    
                    content_lines.extend(["", "💡 点击「恢复」可将文件还原到原位置"])
                    vod_content = "\n".join(content_lines)
                    vod_pic = f.get('cover_url', '')
                    
                    return {
                        "list": [{
                            "vod_id": did,
                            "vod_name": f"📄 {f['original_name']}",
                            "vod_pic": vod_pic,
                            "vod_content": vod_content,
                            "vod_play_from": "恢复",
                            "vod_play_url": f"restore_trash_action://{encoded_name}"
                        }]
                    }
            return {"list": []}
        
        if did == "trash_empty_all":
            count, size_str = self._empty_trash()
            return self._result_message(True, f"已删除 {count} 个文件，释放 {size_str}", "trash_can")
        
        # ---------- 新增：处理“全部本地音乐” ----------
        if did == "local_all":
            songs = self._scan_local_songs()
            if not songs:
                return {"list": []}

            # 生成完整的播放列表，格式和单曲一样：名称$URL，用 # 拼接
            play_items = [f"{s['display']}${s['play_url']}" for s in songs]
            play_url = "#".join(play_items)

            total_size = sum(s.get("size", 0) for s in songs)
            return {
                "list": [{
                    "vod_id": "local_all",
                    "vod_name": "📁 本地音乐（全部）",
                    "vod_pic": songs[0].get("cover_url", ""),
                    "vod_content": f"共 {len(songs)} 首，总大小 {self._format_file_size(total_size)}",
                    "vod_play_from": "🎵 播放全部",
                    "vod_play_url": play_url
                }]
            }
        # ---------- 结束新增 ----------
        
        # ==================== 本地音乐详情 - 修复播放问题 ====================
        if did.startswith("local_"):
            song_name = did.replace("local_", "")
            songs = self._scan_local_songs()
            matched_song = None
            matched_index = -1
            for i, song in enumerate(songs):
                if song['display'] == song_name:
                    matched_song = song
                    matched_index = i
                    break
            
            if matched_song:
                playlist_songs = []
                for i in range(matched_index, len(songs)):
                    playlist_songs.append(songs[i])
                for i in range(0, matched_index):
                    playlist_songs.append(songs[i])
                # 直接使用 play_url 作为播放地址，不需要再拼接 ID
                play_items = [f"{s['display']}${s['play_url']}" for s in playlist_songs]
                play_url = "#".join(play_items)
                return {
                    "list": [{
                        "vod_id": did,
                        "vod_name": matched_song['display'],
                        "vod_pic": matched_song['cover_url'],
                        "vod_content": f"📁 本地音乐列表\n📋 共 {len(songs)} 首歌曲\n\n🎵 点击「播放全部」从当前歌曲开始循环播放\n\n💡 提示：在播放界面连续点击同一首歌3次可删除",
                        "vod_play_from": "🎵 播放全部",
                        "vod_play_url": play_url
                    }]
                }
            return {"list": []}
        
        if "@" in did:
            parts = did.split("@")
            sid = parts[4] if len(parts) >= 5 and parts[4] else ""
            return self._build_single_song(parts, sid)
        
        vod = {"vod_id": did, "vod_name": "", "vod_pic": "", "vod_content": "", "vod_play_from": "", "vod_play_url": ""}
        songs = []
        
        try:
            if did.startswith("playlist_") or did.startswith("toplist_"):
                pid = did.replace("playlist_", "").replace("toplist_", "")
                data = self._fetch_json(f"{self.host}/api/v3/playlist/detail?id={pid}&n=500")
                if data and "playlist" in data:
                    playlist = data["playlist"]
                    vod["vod_name"] = playlist.get("name", "歌单/排行榜")
                    vod["vod_pic"] = (playlist.get("coverImgUrl", "")) + "?param=500y500"
                    vod["vod_content"] = playlist.get("description", "")
                    track_ids = [t["id"] for t in playlist.get("trackIds", [])]
                    if track_ids:
                        for i in range(0, min(len(track_ids), 500), 200):
                            b = track_ids[i:i+200]
                            d = self._fetch_json(f"{self.host}/api/song/detail?ids=[{','.join(map(str,b))}]")
                            if d and "songs" in d:
                                songs.extend(d["songs"])
            elif did.startswith("artist_"):
                aid = did.replace("artist_", "")
                data = self._fetch_json(f"{self.host}/api/artist/top/song?id={aid}")
                if data and "songs" in data:
                    songs = data["songs"]
                    info = self._fetch_json(f"{self.host}/api/artist/detail?id={aid}")
                    if info and "data" in info:
                        a = info["data"]["artist"]
                        vod["vod_name"] = a.get("name", "") + "的热门歌曲"
                        vod["vod_pic"] = (a.get("picUrl", "") or a.get("img1v1Url", "")) + "?param=500y500"
        except Exception as e:
            print(f"detailContent错误: {e}")
        
        if songs:
            self._build_play_urls(vod, songs)
        return {"list": [vod]}
    
    def _build_play_urls(self, vod, songs):
        # 完整音质列表
        qualities = [
            ["标准", "standard"], ["极高", "exhigh"], ["无损", "lossless"],
            ["Hi-Res", "hires"], ["高清环绕声", "jyeffect"],
            ["沉浸环绕声", "sky"], ["超清母带", "jymaster"]
        ]
        play_from = []
        play_urls = []
        
        for q_name, q_code in qualities:
            play_from.append(q_name)
            eps = []
            for s in songs:
                artists = [ar.get("name", "") for ar in s.get("ar", [])]
                name = f"{s.get('name','')} - {'/'.join(artists)}"
                eps.append(f"{name}${s.get('id','')}|{q_code}")
            play_urls.append("#".join(eps))
        
        play_from.append("📥 下载")
        eps2 = [f"{s.get('name','')} - {'/'.join([ar.get('name','') for ar in s.get('ar',[])])}${s.get('id','')}|download" for s in songs]
        play_urls.append("#".join(eps2))
        
        vod["vod_play_from"] = "$$$".join(play_from)
        vod["vod_play_url"] = "$$$".join(play_urls)
    
    def _build_single_song(self, parts, sid):
        vod = {"vod_id": parts[0], "vod_name": parts[1], "vod_pic": "", "vod_remarks": parts[2], "vod_actor": parts[3], "vod_year": parts[7] if len(parts) > 7 else ""}
        songs = [{"id": parts[0], "name": parts[1], "artist": parts[2]}]
        
        if sid:
            try:
                d = self._fetch_json(f"{self.host}/api/artist/top/song?id={sid}")
                if d and "songs" in d:
                    for s in d["songs"]:
                        if str(s.get("id","")) != parts[0]:
                            ar = "/".join([a.get("name","") for a in s.get("ar",[])])
                            songs.append({"id": str(s.get("id","")), "name": s.get("name",""), "artist": ar})
                            if len(songs) >= 10: break
            except:
                pass
        
        # 完整音质列表
        qualities = [
            ["标准", "standard"], ["极高", "exhigh"], ["无损", "lossless"],
            ["Hi-Res", "hires"], ["高清环绕声", "jyeffect"],
            ["沉浸环绕声", "sky"], ["超清母带", "jymaster"]
        ]
        play_from = []
        play_urls = []
        
        for q_name, q_code in qualities:
            play_from.append(q_name)
            eps = [f"{s['name']} - {s['artist']}${s['id']}|{q_code}" for s in songs]
            play_urls.append("#".join(eps))
        
        play_from.append("📥 下载")
        eps2 = [f"{s['name']} - {s['artist']}${s['id']}|download" for s in songs]
        play_urls.append("#".join(eps2))
        
        vod["vod_play_from"] = "$$$".join(play_from)
        vod["vod_play_url"] = "$$$".join(play_urls)
        return {"list": [vod]}

    # ==================== 搜索 ====================
    def searchContent(self, key, quick, pg="1"):
        pg = int(pg or 1)
        offset = (pg - 1) * 30
        videos = []
        
        local_songs = self._scan_local_songs()
        for song in local_songs:
            if key.lower() in song['display'].lower():
                videos.append({
                    "vod_id": f"local_{song['display']}",
                    "vod_name": song['display'],
                    "vod_pic": song['cover_url'],
                    "vod_remarks": f"本地 · {song['ext'].upper()}"
                })
        
        try:
            params = {"s": key, "type": 1, "offset": offset, "limit": 30}
            headers = {"Content-Type": "application/x-www-form-urlencoded"}
            text = self._fetch(f"{self.host}/api/cloudsearch/pc", "POST", urlencode(params), headers)
            if text:
                data = json.loads(text)
                if "result" in data and "songs" in data["result"]:
                    for s in data["result"]["songs"]:
                        ar_names = "/".join([ar["name"] for ar in s.get("ar", [])])
                        id_parts = [str(s["id"]), s["name"], ar_names, ar_names,
                            str(s["ar"][0]["id"]) if s.get("ar") else "",
                            str(s["al"]["id"]) if s.get("al") else "",
                            s["al"]["name"] if s.get("al") else "",
                            str(s.get("publishTime",0)//1000)[:4], str(s.get("mv",0))]
                        is_cached = str(s["id"]) in self.cache_metadata
                        remark = "📥 已缓存" if is_cached else "在线"
                        videos.append({"vod_id": "@".join(id_parts), "vod_name": s["name"],
                            "vod_pic": (s.get("al",{}).get("picUrl","")) + "?param=300y300",
                            "vod_remarks": f"{ar_names} · {remark}"})
        except Exception as e:
            print(f"搜索失败: {e}")
        
        return {"list": videos, "page": pg}

    # ==================== 播放器 ====================
    def _get_song_url(self, song_id, quality_code="standard"):
        quality = self.quality_map.get(quality_code, self.quality_map["standard"])
        
        try:
            api_url = f"{self.api_base}?id={song_id}&quality={quality_code}"
            print(f"[播放API] 请求: {api_url}")
            data = self._fetch_json(api_url)
            print(f"[播放API] 返回状态: {data.get('status') if data else 'None'}")
            
            if data and data.get("status") == 200:
                play_url = data.get("song_file_url")
                if play_url and len(play_url) > 50:
                    ext = 'flac' if '.flac' in play_url.lower() else 'mp3'
                    print(f"[播放API] 获取到播放链接")
                    return play_url, ext
        except Exception as e:
            print(f"[播放API] 主API失败: {e}")
        
        for api in self.play_apis:
            try:
                if api["type"] == "custom_main":
                    continue
                elif api["type"] == "cenguigui":
                    url = f"{api['url']}?id={song_id}&type=json&level={quality['code']}"
                elif api["type"] == "66mz8":
                    url = f"{api['url']}?url=https://music.163.com/song/{song_id}"
                elif api["type"] == "uomg":
                    url = f"{api['url']}?url=https://music.163.com/song?id={song_id}&type=json"
                else:
                    url = f"{api['url']}?id={song_id}"
                data = self._fetch_json(url)
                if data:
                    d = data.get("data", {})
                    play_url = None
                    if isinstance(d, dict):
                        play_url = d.get("url") or d.get("musicUrl")
                    if play_url and len(play_url) > 50:
                        return play_url, quality['ext']
            except:
                continue
        
        return f"https://music.163.com/song/media/outer/url?id={song_id}.mp3", "mp3"

    def playerContent(self, flag, id, vipFlags):
        # 连点删除检测（简化，保持原有功能）
        song_key = id
        current_time = time.time()
        
        if song_key in self.click_timer:
            time_diff = current_time - self.click_timer[song_key]
            if time_diff < 2:
                self.click_count[song_key] = self.click_count.get(song_key, 0) + 1
            else:
                self.click_count[song_key] = 1
        else:
            self.click_count[song_key] = 1
        
        self.click_timer[song_key] = current_time
        count = self.click_count.get(song_key, 1)
        
        if count >= 3:
            self.click_count[song_key] = 0
            if song_key.startswith("http://127.0.0.1:9978/file/"):
                relative_path = song_key.replace("http://127.0.0.1:9978/file/", "")
                file_path = "/storage/emulated/0/" + relative_path
                success, msg = self._delete_to_trash(file_path)
                if success:
                    return self._result_message(True, f"删除成功: {os.path.basename(file_path)}", "local_music")
                else:
                    return self._result_message(False, msg, None)
            else:
                return self._result_message(False, "只能删除本地歌曲", None)
        
        # ==================== 播放列表处理（修复） ====================
        if "#" in id:
            # 本地文件播放列表或在线播放列表都直接返回
            return {"parse": 0, "url": id, "header": "", "pic": "", "lrc": ""}
        
        # ==================== 本地文件单独播放 ====================
        if id.startswith("http://127.0.0.1:9978/file/"):
            lrc_str = self._get_local_lyrics_for_file(id)
            return {"parse": 0, "url": id, "header": "", "pic": "", "lrc": lrc_str}
        
        # ==================== 删除本地歌曲 ====================
        if id.startswith("delete_local://"):
            encoded_path = id.replace("delete_local://", "")
            file_path = self.b64u_decode(encoded_path)
            success, msg = self._delete_to_trash(file_path)
            return self._result_message(success, msg, "local_music")
        
        # ==================== 删除缓存歌曲 ====================
        if id.startswith("delete_cache_"):
            song_id = id.replace("delete_cache_", "")
            if "|" in song_id:
                song_id = song_id.split("|")[0]
            success, msg = self._delete_cached_song(song_id)
            return self._result_message(success, msg, None)
        
        # ==================== 恢复回收站文件 ====================
        if id.startswith("restore_trash_action://"):
            encoded_name = id.replace("restore_trash_action://", "")
            file_name = self.b64u_decode(encoded_name)
            success, msg = self._restore_from_trash(file_name)
            return self._result_message(success, msg, "trash_can")
        
        if id.startswith("restore_trash$"):
            file_name = id.replace("restore_trash$", "")
            success, msg = self._restore_from_trash(file_name)
            return self._result_message(success, msg, "trash_can")
        
        if flag == "返回" and id == "back_to_trash":
            return {"parse": 0, "url": "", "header": "", "pic": "", "lrc": "", "msg": "返回回收站"}
        
        if "###" in id:
            if id in ["暂无缓存歌曲，请先下载", "暂无歌曲可删除", "暂无缓存歌曲"]:
                return {"parse": 0, "url": "", "header": "", "pic": "", "lrc": "", "msg": f"📭 {id}", "playUrl": ""}
            return {"parse": 0, "url": id, "header": "", "pic": "", "lrc": ""}
        
        # ==================== 在线歌曲 ====================
        parts = id.split("|")
        raw = parts[0] if len(parts) > 0 else ""
        action = parts[1] if len(parts) > 1 else "play"
        
        song_id = raw
        song_display = raw
        if "$" in raw:
            name_part, song_id = raw.rsplit("$", 1)
            song_display = name_part.strip()
        song_id = song_id.strip()
        
        if action in self.quality_map:
            self.current_quality = action
            self.download_mode = False
            print(f"[播放] 音质切换为: {self.quality_map[action]['name']}")
        elif action == "download":
            self.download_mode = True
            print(f"[播放] 下载模式")
        else:
            self.current_quality = "standard"
            self.download_mode = False
        
        # 检查缓存
        cache_url, cache_path = self._get_cache_audio_url(song_id, song_display)
        if cache_url:
            pic = self._get_cache_cover_url(song_id)
            lrc_str = self._get_lyrics_by_song_id(song_id)
            return {"parse": 0, "url": cache_url, "header": json.dumps(self.headers), "pic": pic or "", "lrc": lrc_str or "", "msg": "💿 已缓存"}
        
        # 获取封面和歌名
        pic = ""
        try:
            data = self._fetch_json(f"{self.api_base}?id={song_id}")
            if data and data.get("status") == 200:
                name = data.get("name", "")
                ar_name = data.get("ar_name", "")
                pic = data.get("img", "")
                if pic and pic.startswith("//"):
                    pic = "https:" + pic
                if ar_name:
                    ar_name = ar_name.replace("/", "、")
                song_display = f"{name} - {ar_name}" if ar_name else name
                print(f"[播放] 歌曲信息: {song_display}")
        except:
            pass
        
        print(f"🎵 播放: {song_display} (ID: {song_id})")
        
        lrc_str = self._get_lyrics_by_song_id(song_id)
        
        # 下载模式
        if self.download_mode or action == "download":
            print(f"📥 开始下载: {song_id}")
            
            info = self._get_song_info_and_url(song_id, self.current_quality)
            
            if not info or not info.get('play_url'):
                print("[下载] 主API获取失败，尝试备用方式")
                play_url, ext = self._get_song_url(song_id, self.current_quality)
                if not play_url:
                    return {"parse": 0, "url": "", "header": "", "pic": pic, "lrc": "", "msg": "❌ 获取播放地址失败"}
                ext = 'flac' if '.flac' in play_url.lower() else 'mp3'
            else:
                play_url = info['play_url']
                song_display = info['song_display']
                pic = info['pic']
                lrc_str = info['lyric'] if info['lyric'] else lrc_str
                ext = info['ext']
            
            paths = self._get_cache_paths(song_display, song_id, ext)
            audio_path = paths["audio_flac"] if ext == "flac" else paths["audio_mp3"]
            cover_path = paths["cover"]
            lrc_path = paths["lrc"]
            
            print(f"[下载] 目标音频: {os.path.basename(audio_path)}")
            
            temp_path = os.path.join(self.cache_dir, f"tmp_{song_id}_{int(time.time())}.tmp")
            
            try:
                print(f"[下载] 开始下载音频...")
                r = self.session.get(play_url, stream=True, timeout=120)
                with open(temp_path, 'wb') as f:
                    for chunk in r.iter_content(8192):
                        if chunk: f.write(chunk)
                
                os.makedirs(self.cache_dir, exist_ok=True)
                if os.path.exists(audio_path):
                    os.remove(audio_path)
                os.rename(temp_path, audio_path)
                print(f"✓ 音频已保存: {os.path.basename(audio_path)}")
                
                saved_cover = None
                if pic and pic.startswith("http"):
                    try:
                        print(f"[下载] 下载封面: {pic}")
                        r2 = self.session.get(pic, timeout=15, headers={
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                            "Referer": "https://music.163.com/",
                        })
                        if r2.status_code == 200 and len(r2.content) > 500:
                            if os.path.exists(cover_path):
                                os.remove(cover_path)
                            with open(cover_path, 'wb') as f:
                                f.write(r2.content)
                            saved_cover = cover_path
                            print(f"✓ 封面已保存: {os.path.basename(cover_path)} ({len(r2.content)} bytes)")
                        else:
                            print(f"封面下载失败: HTTP {r2.status_code}")
                    except Exception as e:
                        print(f"封面下载异常: {e}")
                else:
                    print(f"[下载] 无封面URL: {pic}")
                
                saved_lrc = None
                if not lrc_str:
                    lrc_str = self._get_lyrics_by_song_id(song_id)
                
                if lrc_str and len(lrc_str) > 20:
                    try:
                        with open(lrc_path, 'w', encoding='utf-8') as f:
                            f.write(lrc_str)
                        saved_lrc = lrc_path
                        print(f"✓ 歌词已保存: {os.path.basename(lrc_path)} ({len(lrc_str)} chars)")
                    except Exception as e:
                        print(f"歌词保存失败: {e}")
                
                self.cache_metadata[song_id] = {
                    "song_id": song_id,
                    "song_name": song_display,
                    "audio_path": audio_path,
                    "cover_path": saved_cover,
                    "lrc_path": saved_lrc,
                    "format": ext,
                    "quality": self.current_quality,
                    "cached_at": time.strftime("%Y-%m-%d %H:%M:%S")
                }
                self._save_cache_metadata()
                
                return {
                    "parse": 0,
                    "url": audio_path,
                    "header": json.dumps(self.headers),
                    "pic": pic,
                    "lrc": lrc_str,
                    "msg": f"✅ 已下载: {song_display}"
                }
            except Exception as e:
                print(f"下载失败: {e}")
                if os.path.exists(temp_path):
                    try:
                        os.remove(temp_path)
                    except:
                        pass
        
        # 正常播放
        play_url, ext = self._get_song_url(song_id, self.current_quality)
        return {"parse": 0, "url": play_url or "", "header": json.dumps(self.headers), "pic": pic, "lrc": lrc_str, "msg": "🎵 点击下载可缓存"}

spider = Spider
