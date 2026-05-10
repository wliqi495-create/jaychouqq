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
CACHE_DIR = "/storage/emulated/0/Download/KuwoMusic/music/测试"
CACHE_ENABLED = True
QUALITY_PRIORITY = ["lossless", "jymaster", "hires", "exhigh", "standard"]
COVER_MAX_SIZE_KB = 200

# ==================== 本地文件协议头配置 ====================
LOCAL_FILE_PREFIX = "http://127.0.0.1:9978/file/"

# ==================== 本地音乐配置 ====================
LOCAL_MUSIC_FOLDERS = [
    "/storage/emulated/0/Download/KuwoMusic/music/测试",
    "/storage/emulated/0/Download/KuwoMusic/music/华语",
    "/storage/emulated/0/Download/KuwoMusic/music/欧美",
    "/storage/emulated/0/Download/KuwoMusic/music/日语",
    "/storage/emulated/0/Download/KuwoMusic/music/文艺",
]

AUDIO_EXTENSIONS = [".mp3", ".flac", ".m4a", ".wav", ".ape", ".ogg"]

# ==================== 回收站配置 ====================
TRASH_DIR = '/storage/emulated/0/tmp/trash/'

# ==================== 清空回收站封面图 ====================
EMPTY_TRASH_PIC_URL = "https://ss0.baidu.com/94o3dSag_xI4khGko9WTAnF6hhy/zhidao/pic/item/b3b7d0a20cf431ad837e5f974a36acaf2fdd98eb.jpg"
# ===========================================================

class Spider(Spider):
    def init(self, extend=""):
        self.host = "https://music.163.com"
        self.api_base = "https://ncm.zhenxin.me"
        
        self.play_apis = [
            {"url": "https://api.cenguigui.cn/api/netease/music_v1.php", "type": "cenguigui"},
            {"url": "https://api.66mz8.com/api/163.php", "type": "66mz8"},
            {"url": "https://api.uomg.com/api/163music", "type": "uomg"},
            {"url": "https://api.52hyjs.com/api/163music", "type": "52hyjs"},
            {"url": "https://api.93zbh.com/163", "type": "93zbh"},
            {"url": "https://api.yiyibot.cn/api/163", "type": "yiyibot"},
        ]
        
        self.cache_enabled = CACHE_ENABLED
        self.cache_dir = CACHE_DIR
        self._init_cache_dir()
        
        os.makedirs(TRASH_DIR, exist_ok=True)
        
        self.cover_max_size_kb = COVER_MAX_SIZE_KB
        
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
        adapter = adapters.HTTPAdapter(
            max_retries=Retry(total=3, backoff_factor=0.5),
            pool_connections=20, pool_maxsize=50
        )
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)
        
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Referer": self.host + "/",
            "Accept": "application/json, text/plain, */*",
        }
        self.session.headers.update(self.headers)
        
        self.cache_metadata = self._load_cache_metadata()
        self.pinyin_dict = self._load_pinyin_dict()
        self.download_mode = False
        self.current_quality = "standard"
        
        self._local_songs_cache = None
        self._last_scan_time = 0
        self._trash_cache = None
        self._trash_cache_time = 0
        
        # 用于连点删除
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
        illegal_chars = r'[<>:"/\\|?*]'
        name = re.sub(illegal_chars, '', name)
        name = name.strip('. ')
        if len(name) > 200:
            name = name[:200]
        if not name:
            name = str(int(time.time()))
        return name
    
    def _get_audio_extension(self, url):
        if not url:
            return "mp3"
        if '.flac' in url.lower():
            return "flac"
        elif '.m4a' in url.lower():
            return "m4a"
        return "mp3"
    
    def _get_cache_paths(self, name, song_id, ext="mp3"):
        safe_name = self._get_safe_filename(name)
        return {
            "audio": os.path.join(self.cache_dir, f"{safe_name}.{ext}"),
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
            print(f"请求失败 [{url[:60]}]: {e}")
            return "{}"

    def _fetch_json(self, url, timeout=10):
        try:
            text = self._fetch(url, timeout=timeout)
            if text:
                return json.loads(text)
        except:
            pass
        return None

    # ==================== Base64 编解码 ====================
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

    # ==================== 操作结果返回 ====================
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
            all_files = {}
            for filename in os.listdir(TRASH_DIR):
                file_path = os.path.join(TRASH_DIR, filename)
                if os.path.isfile(file_path) and not filename.endswith('.meta'):
                    ext = os.path.splitext(filename)[1].lower()
                    original_name = filename
                    if '_' in filename:
                        parts = filename.split('_', 1)
                        if len(parts) == 2 and parts[0].isdigit():
                            original_name = parts[1]
                    
                    base_name = os.path.splitext(original_name)[0]
                    
                    if base_name not in all_files:
                        all_files[base_name] = {"audio": None, "cover": None, "size": 0, "mtime": 0}
                    
                    if ext in AUDIO_EXTENSIONS:
                        if all_files[base_name]["audio"] is None:
                            all_files[base_name]["audio"] = {
                                "name": filename, "path": file_path, "size": os.path.getsize(file_path),
                                "mtime": os.path.getmtime(file_path), "original_name": original_name
                            }
                            all_files[base_name]["size"] += os.path.getsize(file_path)
                            all_files[base_name]["mtime"] = max(all_files[base_name]["mtime"], os.path.getmtime(file_path))
                    elif ext in ['.jpg', '.jpeg', '.png', '.webp', '.gif']:
                        if all_files[base_name]["cover"] is None:
                            all_files[base_name]["cover"] = {"name": filename, "path": file_path}
                        all_files[base_name]["size"] += os.path.getsize(file_path)
            
            for base_name, data in all_files.items():
                if data["audio"]:
                    audio = data["audio"]
                    cover_url = f"file://{data['cover']['path']}" if data["cover"] else ""
                    files.append({
                        "name": audio["name"], "original_name": audio["original_name"], "path": audio["path"],
                        "size": data["size"], "mtime": data["mtime"], "is_audio": True, "cover_url": cover_url
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
            
            meta_file = os.path.join(TRASH_DIR, f"{file_name}.meta")
            original_path = None
            if os.path.exists(meta_file):
                with open(meta_file, 'r', encoding='utf-8') as f:
                    original_path = json.load(f).get("original_path")
            
            if not original_path:
                original_name = file_name
                if '_' in file_name:
                    parts = file_name.split('_', 1)
                    if len(parts) == 2 and parts[0].isdigit():
                        original_name = parts[1]
                
                ext = os.path.splitext(original_name)[1].lower()
                if ext in AUDIO_EXTENSIONS:
                    for folder in LOCAL_MUSIC_FOLDERS:
                        test_path = os.path.join(folder, original_name)
                        if not os.path.exists(test_path):
                            original_path = test_path
                            break
                    if not original_path:
                        original_path = os.path.join(LOCAL_MUSIC_FOLDERS[0], original_name)
                else:
                    original_path = os.path.join(LOCAL_MUSIC_FOLDERS[0], original_name)
            
            os.makedirs(os.path.dirname(original_path), exist_ok=True)
            os.rename(trash_path, original_path)
            
            if os.path.exists(meta_file):
                os.remove(meta_file)
            
            base_name = os.path.splitext(file_name)[0]
            for trash_file in os.listdir(TRASH_DIR):
                if trash_file.startswith(base_name) and trash_file != file_name and not trash_file.endswith('.meta'):
                    trash_file_path = os.path.join(TRASH_DIR, trash_file)
                    if os.path.isfile(trash_file_path):
                        file_meta_file = os.path.join(TRASH_DIR, f"{trash_file}.meta")
                        if os.path.exists(file_meta_file):
                            with open(file_meta_file, 'r', encoding='utf-8') as f:
                                orig_path = json.load(f).get("original_path")
                            if orig_path and os.path.exists(os.path.dirname(orig_path)):
                                os.rename(trash_file_path, orig_path)
                                os.remove(file_meta_file)
                        else:
                            orig_dir = os.path.dirname(original_path)
                            orig_file_name = trash_file.split('_', 1)[-1] if '_' in trash_file else trash_file
                            os.rename(trash_file_path, os.path.join(orig_dir, orig_file_name))
            
            self._trash_cache = None
            self._local_songs_cache = None
            return True, f"已恢复: {os.path.basename(original_path)}"
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
                        file_size = os.path.getsize(file_path)
                        os.remove(file_path)
                        deleted_count += 1
                        deleted_size += file_size
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
            original_dir = os.path.dirname(file_path)
            unique_name = f"{int(time.time())}_{file_name}"
            trash_path = os.path.join(TRASH_DIR, unique_name)
            
            meta_file = os.path.join(TRASH_DIR, f"{unique_name}.meta")
            with open(meta_file, 'w', encoding='utf-8') as f:
                json.dump({"original_path": file_path, "original_dir": original_dir}, f)
            os.rename(file_path, trash_path)
            
            audio_dir = os.path.dirname(file_path)
            audio_name = os.path.splitext(file_name)[0]
            
            for lrc_ext in ['lrc', 'krc', 'qrc', 'yrc', 'trc']:
                lrc_path = os.path.join(audio_dir, f"{audio_name}.{lrc_ext}")
                if os.path.exists(lrc_path):
                    lrc_trash_name = f"{int(time.time())}_{audio_name}.{lrc_ext}"
                    lrc_trash_path = os.path.join(TRASH_DIR, lrc_trash_name)
                    lrc_meta_file = os.path.join(TRASH_DIR, f"{lrc_trash_name}.meta")
                    with open(lrc_meta_file, 'w', encoding='utf-8') as f:
                        json.dump({"original_path": lrc_path, "original_dir": audio_dir}, f)
                    os.rename(lrc_path, lrc_trash_path)
            
            for cover_ext in ['jpg', 'jpeg', 'png', 'webp', 'gif']:
                cover_path = os.path.join(audio_dir, f"{audio_name}.{cover_ext}")
                if os.path.exists(cover_path):
                    cover_trash_name = f"{int(time.time())}_{audio_name}.{cover_ext}"
                    cover_trash_path = os.path.join(TRASH_DIR, cover_trash_name)
                    cover_meta_file = os.path.join(TRASH_DIR, f"{cover_trash_name}.meta")
                    with open(cover_meta_file, 'w', encoding='utf-8') as f:
                        json.dump({"original_path": cover_path, "original_dir": audio_dir}, f)
                    os.rename(cover_path, cover_trash_path)
            
            self._local_songs_cache = None
            self._trash_cache = None
            return True, f"已删除: {file_name}"
        except Exception as e:
            print(f"删除文件失败: {e}")
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
                        print(f"跳过纯数字文件: {filename}")
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
                    
                    if not cover_url:
                        folder_cover = os.path.join(folder, "folder.jpg")
                        if os.path.exists(folder_cover):
                            rel_cover = folder_cover.replace("/storage/emulated/0/", "")
                            cover_url = f"{LOCAL_FILE_PREFIX}{rel_cover}"
                    
                    display_name = f"{song_name} - {artist}" if artist else song_name
                    
                    songs.append({
                        "name": song_name,
                        "artist": artist,
                        "display": display_name,
                        "filename": filename,
                        "file_path": file_path,
                        "play_url": play_url,
                        "cover_url": cover_url,
                        "size": os.path.getsize(file_path),
                        "ext": ext,
                        "modified": os.path.getmtime(file_path)
                    })
            except Exception as e:
                print(f"扫描文件夹失败 {folder}: {e}")
        
        songs.sort(key=lambda x: x.get("modified", 0), reverse=True)
        self._local_songs_cache = songs
        self._last_scan_time = current_time
        print(f"本地歌曲扫描完成: {len(songs)} 首")
        return songs

    def _get_local_lyrics_for_file(self, file_path):
        try:
            if file_path.startswith("http://127.0.0.1:9978/file/"):
                file_path = file_path.replace("http://127.0.0.1:9978/file/", "")
                file_path = "/storage/emulated/0/" + file_path
            elif file_path.startswith("file://"):
                file_path = file_path[7:]
            
            audio_dir = os.path.dirname(file_path)
            audio_name = os.path.splitext(os.path.basename(file_path))[0]
            
            for lrc_ext in ['lrc', 'krc', 'qrc', 'yrc', 'trc', 'txt']:
                lrc_path = os.path.join(audio_dir, f"{audio_name}.{lrc_ext}")
                if os.path.exists(lrc_path):
                    with open(lrc_path, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                        if content and len(content) > 20:
                            return content
                
                lrc_path_upper = os.path.join(audio_dir, f"{audio_name}.{lrc_ext.upper()}")
                if os.path.exists(lrc_path_upper):
                    with open(lrc_path_upper, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                        if content and len(content) > 20:
                            return content
            
            for subdir in ['Lyrics', 'lyrics', '歌词', 'LRC', 'lrc']:
                lyrics_dir = os.path.join(audio_dir, subdir)
                if os.path.exists(lyrics_dir) and os.path.isdir(lyrics_dir):
                    for name in os.listdir(lyrics_dir):
                        if name.startswith('.'):
                            continue
                        ext = os.path.splitext(name)[1].lower()
                        if ext in ['.lrc', '.krc', '.qrc', '.yrc', '.trc', '.txt']:
                            lrc_name = os.path.splitext(name)[0]
                            if lrc_name == audio_name or lrc_name.lower() == audio_name.lower():
                                full_path = os.path.join(lyrics_dir, name)
                                with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                                    content = f.read()
                                    if content and len(content) > 20:
                                        return content
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

    def _get_lyrics_by_song_id(self, song_id):
        if not song_id or not str(song_id).isdigit():
            return ""
        local_lrc = self._get_cache_lrc_content(song_id)
        if local_lrc:
            return local_lrc
        try:
            url = f"https://music.163.com/api/song/lyric?id={song_id}&lv=1&kv=1&tv=-1"
            data = self._fetch_json(url)
            lrc = data.get("lrc", {}).get("lyric", "") if data else ""
            if lrc and len(lrc) > 20:
                return self._clean_lyrics(lrc)
        except:
            pass
        try:
            data = self._fetch_json(f"{self.api_base}/lyric?id={song_id}")
            lrc = data.get("lrc", {}).get("lyric", "") if data else ""
            if lrc and len(lrc) > 20:
                return self._clean_lyrics(lrc)
        except:
            pass
        return ""
    
    def _clean_lyrics(self, lrc):
        if not lrc:
            return ""
        lines = lrc.split('\n')
        out = []
        for line in lines:
            line = line.strip()
            if re.match(r'^\[\d{2}:\d{2}', line) or re.match(r'^\[(ti|ar|al|by):', line, re.I):
                out.append(line)
        return '\n'.join(out)

    def _get_song_url_by_quality(self, song_id, quality_code):
        quality = self.quality_map.get(quality_code, self.quality_map["standard"])
        try:
            data = self._fetch_json(f"{self.api_base}/song/url?id={song_id}&br={quality['code']}")
            if data and "data" in data and data["data"]:
                for item in data["data"]:
                    url = item.get("url", "")
                    if url and len(url) > 50:
                        return url, quality['ext']
        except:
            pass
        for api in self.play_apis:
            try:
                if api["type"] == "cenguigui":
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

    # ==================== 首页 ====================
    def homeContent(self, filter):
        playlist_categories = [
            {"n": "全部", "v": "全部"}, {"n": "华语", "v": "华语"}, {"n": "欧美", "v": "欧美"},
            {"n": "日语", "v": "日语"}, {"n": "韩语", "v": "韩语"}, {"n": "流行", "v": "流行"},
            {"n": "摇滚", "v": "摇滚"}, {"n": "民谣", "v": "民谣"}, {"n": "电子", "v": "电子"},
            {"n": "说唱", "v": "说唱"}, {"n": "古风", "v": "古风"}, {"n": "ACG", "v": "ACG"},
            {"n": "轻音乐", "v": "轻音乐"}, {"n": "经典", "v": "经典"}, {"n": "影视原声", "v": "影视原声"}
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
        
        try:
            data = self._fetch_json(f"{self.host}/api/playlist/hot")
            if data and "tags" in data:
                for tag in data["tags"][:3]:
                    playlists = self._fetch_json(f"{self.host}/api/playlist/list?cat={quote(tag['name'])}&limit=4")
                    if playlists and "playlists" in playlists:
                        for it in playlists["playlists"][:2]:
                            videos.append({
                                "vod_id": f"playlist_{it['id']}",
                                "vod_name": it.get("name", ""),
                                "vod_pic": (it.get("coverImgUrl", "") or "") + "?param=300y300",
                                "vod_remarks": f"{tag['name']} · {self._format_count(it.get('playCount', 0))}"
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
                icon = "🎵" if f.get('is_audio', True) else "📄"
                size_str = self._format_file_size(f['size'])
                time_str = time.strftime('%m-%d %H:%M', time.localtime(f['mtime']))
                pic = f.get('cover_url', '')
                
                videos.append({
                    "vod_id": f"trash_file_{f['name']}",
                    "vod_name": f"{icon} {f['original_name']}",
                    "vod_pic": pic,
                    "vod_remarks": f"{size_str} · {time_str}"
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
                videos = self._get_artists_with_filters(extend, pg, limit)
        except Exception as e:
            print(f"categoryContent错误 [{tid}]: {e}")
        
        pagecount = 9999 if len(videos) >= limit else (len(videos) + limit - 1) // limit if videos else 0
        return {"list": videos, "page": pg, "pagecount": pagecount, "limit": limit, "total": len(videos)}

    # ==================== 歌手筛选 ====================
    def _load_pinyin_dict(self):
        pinyin_dict = {}
        common_surnames = {
            'A': ['阿', '艾', '安', '敖'], 'B': ['白', '包', '鲍', '毕'],
            'C': ['陈', '程', '蔡', '曹'], 'D': ['邓', '丁', '董', '杜'],
            'E': ['鄂', '尔', '俄', '恩'], 'F': ['冯', '范', '方', '傅'],
            'G': ['郭', '高', '顾', '龚'], 'H': ['黄', '何', '韩', '胡'],
            'J': ['金', '蒋', '贾', '江'], 'K': ['孔', '康', '柯', '邝'],
            'L': ['李', '刘', '林', '梁'], 'M': ['马', '毛', '孟', '莫'],
            'N': ['倪', '聂', '牛', '农'], 'O': ['欧', '欧阳', '区'],
            'P': ['潘', '彭', '庞', '裴'], 'Q': ['钱', '秦', '邱', '齐'],
            'R': ['任', '阮', '荣', '茹'], 'S': ['孙', '沈', '宋', '苏'],
            'T': ['唐', '田', '陶', '谭'], 'W': ['汪', '王', '魏', '卫'],
            'X': ['许', '徐', '谢', '萧'], 'Y': ['杨', '叶', '余', '袁'],
            'Z': ['张', '赵', '周', '郑']
        }
        for letter, chars in common_surnames.items():
            for char in chars:
                pinyin_dict[char] = letter
        return pinyin_dict
    
    def _get_pinyin_initial(self, chinese_char):
        if chinese_char in self.pinyin_dict:
            return self.pinyin_dict[chinese_char]
        if '\u4e00' <= chinese_char <= '\u9fff':
            map = {'阿':'A','八':'B','擦':'C','大':'D','额':'E','发':'F','嘎':'G','哈':'H','机':'J','卡':'K','拉':'L','妈':'M','拿':'N','哦':'O','怕':'P','七':'Q','日':'R','撒':'S','他':'T','哇':'W','西':'X','压':'Y','咋':'Z'}
            for k, v in map.items():
                if ord(chinese_char) >= ord(k):
                    return v
        return chinese_char.upper()
    
    def _get_artists_with_filters(self, extend, pg, limit):
        offset = (pg - 1) * limit
        area = extend.get("area", "-1") if extend else "-1"
        genre = extend.get("genre", "-1") if extend else "-1"
        letter = extend.get("letter", "-1") if extend else "-1"
        videos = []
        try:
            params = {"limit": limit, "offset": offset}
            if area != "-1":
                params["area"] = area
            if genre != "-1":
                params["type"] = genre
            if letter != "-1" and letter != "0":
                params["initial"] = letter.upper()
            param_str = "&".join([f"{k}={v}" for k, v in params.items()])
            api_url = f"{self.api_base}/artist/list?{param_str}"
            data = json.loads(self._fetch(api_url))
            if "artists" in data:
                for artist in data["artists"]:
                    img_url = artist.get("picUrl") or artist.get("img1v1Url", "")
                    if img_url and not img_url.startswith("http"):
                        img_url = "https:" + img_url
                    videos.append({
                        "vod_id": f"artist_{artist['id']}",
                        "vod_name": artist.get("name", "未知歌手"),
                        "vod_pic": f"{img_url}?param=300y300" if img_url else "",
                        "vod_remarks": f"歌曲:{artist.get('musicSize', 0)}"
                    })
        except Exception as e:
            print(f"歌手筛选失败: {e}")
        return videos

    # ==================== 详情 ====================
    def detailContent(self, ids):
        did = ids[0] if isinstance(ids, list) else ids
        
        if did.startswith("trash_file_"):
            file_name = did.replace("trash_file_", "")
            files = self._scan_trash_files()
            for f in files:
                if f['name'] == file_name:
                    encoded_name = self.b64u_encode(file_name)
                    return {
                        "list": [{
                            "vod_id": did,
                            "vod_name": f"📄 {f['original_name']}",
                            "vod_pic": f.get('cover_url', ''),
                            "vod_content": f"文件: {f['original_name']}\n大小: {self._format_file_size(f['size'])}\n删除时间: {time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(f['mtime']))}\n\n点击「恢复」可将文件还原到原位置",
                            "vod_play_from": "恢复",
                            "vod_play_url": f"restore_trash_action://{encoded_name}"
                        }]
                    }
            return {"list": []}
        
        if did == "trash_empty_all":
            count, size_str = self._empty_trash()
            return self._result_message(True, f"已删除 {count} 个文件，释放 {size_str}", "trash_can")
        
        # ==================== 本地音乐详情 - 播放全部 ====================
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
                # 构建播放列表：从当前歌曲开始循环
                playlist_songs = []
                for i in range(matched_index, len(songs)):
                    playlist_songs.append(songs[i])
                for i in range(0, matched_index):
                    playlist_songs.append(songs[i])
                
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
        
        # 删除缓存选项已移除
        
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
        
        # 删除缓存选项已移除
        
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
            if key.lower() in song['name'].lower() or key.lower() in (song['artist'] or "").lower():
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

    # ==================== 播放器 - 连点3次删除 ====================
    def playerContent(self, flag, id, vipFlags):
        # 【核心功能】连点3次删除当前歌曲
        song_key = id
        current_time = time.time()
        
        # 检查是否是同一个歌曲的连续点击
        if song_key in self.click_timer:
            time_diff = current_time - self.click_timer[song_key]
            if time_diff < 2:  # 2秒内的点击算连续
                self.click_count[song_key] = self.click_count.get(song_key, 0) + 1
            else:
                self.click_count[song_key] = 1
        else:
            self.click_count[song_key] = 1
        
        self.click_timer[song_key] = current_time
        count = self.click_count.get(song_key, 1)
        
        print(f"连点检测: 第{count}次点击 - {song_key[:80]}")
        
        # 如果达到3次，执行删除
        if count >= 3:
            # 重置计数
            self.click_count[song_key] = 0
            
            # 从 URL 中提取文件路径并删除
            if song_key.startswith("http://127.0.0.1:9978/file/"):
                relative_path = song_key.replace("http://127.0.0.1:9978/file/", "")
                file_path = "/storage/emulated/0/" + relative_path
                success, msg = self._delete_to_trash(file_path)
                self._local_songs_cache = None
                if success:
                    return self._result_message(True, f"连点3次删除成功: {os.path.basename(file_path)}", "local_music")
                else:
                    return self._result_message(False, msg, None)
            else:
                return self._result_message(False, "只能删除本地歌曲", None)
        
        # 未达到3次，正常播放
        # 处理播放列表（#分隔）
        if "#" in id and not id.startswith("http"):
            return {"parse": 0, "url": id, "header": "", "pic": "", "lrc": ""}
        
        # 本地文件单独播放
        if id.startswith("http://127.0.0.1:9978/file/"):
            lrc_str = self._get_local_lyrics_for_file(id)
            return {"parse": 0, "url": id, "header": "", "pic": "", "lrc": lrc_str}
        
        # 删除本地歌曲（标准格式）
        if id.startswith("delete_local://"):
            encoded_path = id.replace("delete_local://", "")
            file_path = self.b64u_decode(encoded_path)
            success, msg = self._delete_to_trash(file_path)
            self._local_songs_cache = None
            return self._result_message(success, msg, "local_music")
        
        # 删除缓存歌曲
        if id.startswith("delete_cache_"):
            song_id = id.replace("delete_cache_", "")
            if "|" in song_id:
                song_id = song_id.split("|")[0]
            success, msg = self._delete_cached_song(song_id)
            return self._result_message(success, msg, None)
        
        # 恢复回收站文件
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
        
        # 在线歌曲
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
        elif action == "download":
            self.download_mode = True
        
        cache_url, cache_path = self._get_cache_audio_url(song_id, song_display)
        if cache_url:
            pic = self._get_cache_cover_url(song_id)
            lrc_str = self._get_cache_lrc_content(song_id)
            if lrc_str is None:
                lrc_str = self._get_lyrics_by_song_id(song_id)
            return {"parse": 0, "url": cache_url, "header": json.dumps(self.headers), "pic": pic or "", "lrc": lrc_str or "", "msg": "💿 已缓存"}
        
        if song_display == song_id or not song_display:
            try:
                data = self._fetch_json(f"{self.api_base}/song/detail?ids={song_id}")
                if data and "songs" in data and data["songs"]:
                    s = data["songs"][0]
                    name = s.get("name", "")
                    artists = s.get("ar", [])
                    if artists:
                        song_display = f"{name} - {'/'.join([a.get('name','') for a in artists])}"
                    else:
                        song_display = name
            except:
                pass
        
        pic = ""
        try:
            data = self._fetch_json(f"{self.api_base}/song/detail?ids={song_id}")
            if data and "songs" in data and data["songs"]:
                pic = data["songs"][0].get("al", {}).get("picUrl", "")
                if pic and not pic.startswith("http"):
                    pic = "https:" + pic
        except:
            pass
        lrc_str = self._get_lyrics_by_song_id(song_id)
        
        if self.download_mode or action == "download":
            quality_info = self.quality_map.get(self.current_quality, self.quality_map["standard"])
            play_url, ext = self._get_song_url_by_quality(song_id, self.current_quality)
            
            if not play_url:
                return {"parse": 0, "url": "", "header": "", "pic": pic, "lrc": "", "msg": "❌ 获取失败"}
            
            paths = self._get_cache_paths(song_display, song_id, quality_info['ext'])
            audio_path = paths["audio"]
            temp_path = os.path.join(self.cache_dir, f"tmp_{song_id}.tmp")
            
            try:
                r = self.session.get(play_url, stream=True, timeout=120)
                with open(temp_path, 'wb') as f:
                    for chunk in r.iter_content(8192):
                        if chunk: f.write(chunk)
                if os.path.exists(audio_path): os.remove(audio_path)
                os.rename(temp_path, audio_path)
                
                cover_path = None
                if pic and pic.startswith("http"):
                    try:
                        r2 = self.session.get(pic, timeout=15)
                        if r2.status_code == 200:
                            cover_path = paths["cover"]
                            with open(cover_path, 'wb') as f:
                                f.write(r2.content)
                    except:
                        pass
                
                if lrc_str:
                    with open(paths["lrc"], 'w', encoding='utf-8') as f:
                        f.write(lrc_str)
                
                self.cache_metadata[song_id] = {
                    "song_id": song_id, "song_name": song_display,
                    "audio_path": audio_path, "cover_path": cover_path,
                    "lrc_path": paths["lrc"] if lrc_str else None,
                    "format": quality_info['ext'], "quality": self.current_quality,
                    "cached_at": time.strftime("%Y-%m-%d %H:%M:%S")
                }
                self._save_cache_metadata()
                
                cache_url, _ = self._get_cache_audio_url(song_id, song_display)
                return {"parse": 0, "url": cache_url or play_url, "header": json.dumps(self.headers), "pic": pic, "lrc": lrc_str, "msg": f"✅ 已下载 {quality_info['name']}"}
            except Exception as e:
                print(f"下载失败: {e}")
                if os.path.exists(temp_path): os.remove(temp_path)
        
        play_url, ext = self._get_song_url_by_quality(song_id, self.current_quality)
        return {"parse": 0, "url": play_url or "", "header": json.dumps(self.headers), "pic": pic, "lrc": lrc_str, "msg": "🎵 点击下载可缓存"}

spider = Spider
