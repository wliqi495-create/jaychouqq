import sys
import json
import re
import string
import random
import os
import time
from urllib.parse import quote, urlencode
from urllib.parse import urlparse
from pyquery import PyQuery as pq
from requests import Session, adapters
from urllib3.util.retry import Retry
sys.path.append('..')
from base.spider import Spider

# ==================== 配置区域（可自行修改） ====================
# 缓存目录路径，默认为手机Music目录
CACHE_DIR = "/storage/emulated/0/Music"
# 是否启用缓存（True=启用，False=禁用）
CACHE_ENABLED = True
# 音质优先级（越靠前优先级越高）
# 可选：lossless(无损)、jymaster(超清母带)、hires(Hi-Res)、exhigh(极高)、standard(标准)
QUALITY_PRIORITY = ["lossless", "jymaster", "hires", "exhigh", "standard"]
# ================================================================

class Spider(Spider):
    def init(self, extend=""):
        self.host = "https://music.163.com"
        self.api_base = "https://ncm.zhenxin.me"
        
        # 多个备用API列表
        self.play_apis = [
            {"url": "https://api.cenguigui.cn/api/netease/music_v1.php", "type": "cenguigui"},
            {"url": "https://api.66mz8.com/api/163.php", "type": "66mz8"},
            {"url": "https://api.uomg.com/api/163music", "type": "uomg"},
            {"url": "https://api.52hyjs.com/api/163music", "type": "52hyjs"},
            {"url": "https://api.93zbh.com/163", "type": "93zbh"},
            {"url": "https://api.yiyibot.cn/api/163", "type": "yiyibot"},
        ]
        
        self.lyric_api = "https://node.api.xfabe.com/api/wangyi/lyrics"
        
        # 缓存配置
        self.cache_enabled = CACHE_ENABLED
        self.cache_dir = CACHE_DIR
        self._init_cache_dir()
        
        # 音质优先级映射
        self.quality_map = {
            "lossless": {"name": "无损", "code": "lossless", "br": 999000},
            "jymaster": {"name": "超清母带", "code": "jymaster", "br": 999000},
            "hires": {"name": "Hi-Res", "code": "hires", "br": 921600},
            "exhigh": {"name": "极高", "code": "exhigh", "br": 320000},
            "standard": {"name": "标准", "code": "standard", "br": 128000}
        }
        
        # 按配置顺序生成音质优先级列表
        self.quality_priority = []
        for q in QUALITY_PRIORITY:
            if q in self.quality_map:
                self.quality_priority.append(self.quality_map[q])
        
        self.session = Session()
        adapter = adapters.HTTPAdapter(
            max_retries=Retry(total=3, backoff_factor=0.5, status_forcelist=[429, 500, 502, 503, 504]),
            pool_connections=20,
            pool_maxsize=50
        )
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)
        
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": self.host + "/",
            "Accept": "application/json, text/plain, */*",
        }
        self.session.headers.update(self.headers)
        
        self.pinyin_dict = self._load_complete_pinyin_dict()
        self.cache_metadata = self._load_cache_metadata()

    def _init_cache_dir(self):
        """初始化缓存目录"""
        if not self.cache_enabled:
            print("缓存功能已禁用")
            return
            
        if not os.path.exists(self.cache_dir):
            try:
                os.makedirs(self.cache_dir)
                print(f"创建缓存目录: {self.cache_dir}")
            except Exception as e:
                print(f"创建缓存目录失败: {e}")
                self.cache_enabled = False
                print("缓存功能已禁用")
        else:
            print(f"使用缓存目录: {self.cache_dir}")
    
    def _get_safe_filename(self, song_name, artist_name, song_id):
        """生成安全的文件名"""
        if artist_name and artist_name != "未知歌手":
            filename = f"{song_name} - {artist_name}"
        else:
            filename = song_name
        
        illegal_chars = r'[<>:"/\\|?*]'
        filename = re.sub(illegal_chars, '', filename)
        filename = filename.strip('. ')
        if len(filename) > 200:
            filename = filename[:200]
        if not filename:
            filename = song_id
        return filename
    
    def _get_audio_extension(self, url):
        """根据URL获取音频扩展名"""
        if not url:
            return "mp3"
        url_lower = url.lower()
        if '.flac' in url_lower:
            return "flac"
        elif '.m4a' in url_lower:
            return "m4a"
        elif '.wav' in url_lower:
            return "wav"
        elif '.ogg' in url_lower:
            return "ogg"
        else:
            return "mp3"
    
    def _get_cache_paths(self, song_name, artist_name, song_id):
        """获取缓存文件路径"""
        safe_name = self._get_safe_filename(song_name, artist_name, song_id)
        return {
            "base_name": safe_name,
            "audio_mp3": os.path.join(self.cache_dir, f"{safe_name}.mp3"),
            "audio_flac": os.path.join(self.cache_dir, f"{safe_name}.flac"),
            "cover": os.path.join(self.cache_dir, f"{safe_name}.jpg"),
            "lrc": os.path.join(self.cache_dir, f"{safe_name}.lrc")
        }
    
    def _load_cache_metadata(self):
        """加载缓存元数据"""
        metadata_file = os.path.join(self.cache_dir, "网易云缓存索引.json")
        if os.path.exists(metadata_file):
            try:
                with open(metadata_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except:
                return {}
        return {}
    
    def _save_cache_metadata(self):
        """保存缓存元数据"""
        metadata_file = os.path.join(self.cache_dir, "网易云缓存索引.json")
        try:
            with open(metadata_file, 'w', encoding='utf-8') as f:
                json.dump(self.cache_metadata, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"保存缓存元数据失败: {e}")
    
    def _is_cached(self, song_id):
        """检查歌曲是否已缓存"""
        if not self.cache_enabled:
            return False, None, None, None
        
        if song_id in self.cache_metadata:
            meta = self.cache_metadata[song_id]
            audio_path = meta.get("audio_path", "")
            cover_path = meta.get("cover_path", "")
            lrc_path = meta.get("lrc_path", "")
            if audio_path and os.path.exists(audio_path):
                return True, audio_path, cover_path, lrc_path
            else:
                del self.cache_metadata[song_id]
                self._save_cache_metadata()
        
        return False, None, None, None
    
    def _get_song_url(self, song_id):
        """获取歌曲播放地址 - 多API轮询"""
        print(f"正在获取歌曲 {song_id} 的播放地址...")
        
        # 方法1：使用ncm.zhenxin.me API
        try:
            for quality in self.quality_priority:
                api_url = f"{self.api_base}/song/url?id={song_id}&br={quality['code']}"
                resp = self._fetch(api_url)
                data = json.loads(resp)
                if "data" in data and data["data"]:
                    for item in data["data"]:
                        url = item.get("url", "")
                        if url and len(url) > 50 and not self._is_trial_audio(url):
                            ext = self._get_audio_extension(url)
                            print(f"✓ ncm API获取成功: {quality['name']} ({ext})")
                            return url, ext
        except Exception as e:
            print(f"ncm API失败: {e}")
        
        # 方法2：遍历所有备用API
        for api in self.play_apis:
            try:
                if api["type"] == "cenguigui":
                    url = f"{api['url']}?id={song_id}&type=json&level=lossless"
                elif api["type"] == "66mz8":
                    url = f"{api['url']}?url=https://music.163.com/song/{song_id}"
                elif api["type"] == "uomg":
                    url = f"{api['url']}?url=https://music.163.com/song?id={song_id}&type=json"
                elif api["type"] == "52hyjs":
                    url = f"{api['url']}?id={song_id}"
                elif api["type"] in ["93zbh", "yiyibot"]:
                    url = f"{api['url']}?id={song_id}"
                else:
                    continue
                
                resp = self._fetch(url)
                data = json.loads(resp)
                
                play_url = None
                if isinstance(data, dict):
                    if "data" in data:
                        if isinstance(data["data"], dict):
                            for key in ["url", "musicUrl", "audioUrl"]:
                                if key in data["data"] and data["data"][key]:
                                    play_url = data["data"][key]
                                    break
                        elif isinstance(data["data"], str) and data["data"].startswith("http"):
                            play_url = data["data"]
                    if not play_url and "url" in data and data["url"]:
                        play_url = data["url"]
                    if not play_url and "musicUrl" in data and data["musicUrl"]:
                        play_url = data["musicUrl"]
                
                if play_url and len(play_url) > 50 and not self._is_trial_audio(play_url):
                    ext = self._get_audio_extension(play_url)
                    print(f"✓ {api['type']} API获取成功 ({ext})")
                    return play_url, ext
                    
            except Exception as e:
                print(f"{api['type']} API失败: {e}")
                continue
        
        # 方法3：直接使用网易云官方API
        try:
            official_url = f"https://music.163.com/song/media/outer/url?id={song_id}.mp3"
            print(f"✓ 使用官方外链")
            return official_url, "mp3"
        except:
            pass
        
        print(f"✗ 所有API都无法获取播放地址: {song_id}")
        return None, None
    
    def _is_trial_audio(self, url):
        """检测是否为试听片段"""
        if not url:
            return True
        if 'm70' in url or 'm701' in url or 'm702' in url or 'm703' in url:
            return True
        if len(url) < 80:
            return True
        return False
    
    def _cache_song(self, song_id, song_name, artist_name, cover_url):
        """缓存歌曲（同步下载，完成后返回）"""
        if not self.cache_enabled:
            return None, None, None
        
        # 检查是否已缓存
        is_cached, cached_audio, cached_cover, cached_lrc = self._is_cached(song_id)
        if is_cached:
            print(f"✓ 歌曲已缓存: {os.path.basename(cached_audio)}")
            return cached_audio, cached_cover, cached_lrc
        
        print(f"开始下载: {song_name} - {artist_name}")
        
        play_url, ext = self._get_song_url(song_id)
        if not play_url:
            print(f"✗ 获取播放地址失败")
            return None, None, None
        
        paths = self._get_cache_paths(song_name, artist_name, song_id)
        
        # 确定最终音频路径
        if ext == "flac":
            final_audio_path = paths["audio_flac"]
        else:
            final_audio_path = paths["audio_mp3"]
        
        temp_path = os.path.join(self.cache_dir, f"temp_{int(time.time())}_{song_id}.tmp")
        
        # 下载音频（同步）
        audio_path = None
        try:
            print(f"开始下载，请稍候...")
            response = self.session.get(play_url, stream=True, timeout=120)
            response.raise_for_status()
            
            total_size = int(response.headers.get('content-length', 0))
            downloaded = 0
            last_print = 0
            
            with open(temp_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
                        downloaded += len(chunk)
                        if total_size > 0:
                            percent = (downloaded / total_size) * 100
                            if percent - last_print >= 10:
                                print(f"下载进度: {percent:.0f}%")
                                last_print = percent
            
            if os.path.exists(final_audio_path):
                os.remove(final_audio_path)
            os.rename(temp_path, final_audio_path)
            audio_path = final_audio_path
            size_mb = os.path.getsize(audio_path) / (1024*1024)
            print(f"✓ 下载完成: {size_mb:.1f} MB ({ext.upper()})")
            
        except Exception as e:
            print(f"✗ 下载失败: {e}")
            if os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except:
                    pass
            return None, None, None
        
        # 下载封面
        cover_path = None
        if cover_url:
            try:
                resp = self.session.get(cover_url, timeout=10)
                if resp.status_code == 200:
                    with open(paths["cover"], 'wb') as f:
                        f.write(resp.content)
                    cover_path = paths["cover"]
                    print(f"✓ 封面已保存")
            except Exception as e:
                print(f"封面保存失败: {e}")
        
        # 获取歌词
        lrc_path = None
        try:
            lrc = self._get_lyrics_by_song_id(song_id)
            if lrc:
                with open(paths["lrc"], 'w', encoding='utf-8') as f:
                    f.write(lrc)
                lrc_path = paths["lrc"]
                print(f"✓ 歌词已保存")
        except Exception as e:
            print(f"歌词保存失败: {e}")
        
        # 保存元数据
        self.cache_metadata[song_id] = {
            "song_id": song_id,
            "song_name": song_name,
            "artist_name": artist_name,
            "audio_path": audio_path,
            "cover_path": cover_path,
            "lrc_path": lrc_path,
            "format": ext,
            "size_mb": round(size_mb, 2),
            "cached_at": time.strftime("%Y-%m-%d %H:%M:%S")
        }
        self._save_cache_metadata()
        
        print(f"✓ 歌曲缓存完成: {song_name} - {artist_name}")
        return audio_path, cover_path, lrc_path
    
    def _get_cached_audio_path(self, song_id):
        if not self.cache_enabled:
            return None
        is_cached, audio_path, _, _ = self._is_cached(song_id)
        return audio_path if is_cached else None
    
    def _get_cached_cover_url(self, song_id):
        if not self.cache_enabled:
            return ""
        is_cached, _, cover_path, _ = self._is_cached(song_id)
        if is_cached and cover_path and os.path.exists(cover_path):
            return f"file://{cover_path}"
        return ""
    
    def _get_cached_lrc(self, song_id):
        if not self.cache_enabled:
            return None
        is_cached, _, _, lrc_path = self._is_cached(song_id)
        if is_cached and lrc_path and os.path.exists(lrc_path):
            try:
                with open(lrc_path, 'r', encoding='utf-8') as f:
                    return f.read()
            except:
                pass
        return None

    def getName(self):
        return "网易云音乐"
    
    def isVideoFormat(self, url):
        return bool(re.search(r'\.(m3u8|mp4|mp3|m4a|flv)(\?|$)', url or "", re.I))
    
    def manualVideoCheck(self):
        return False
    
    def destroy(self):
        self.session.close()

    def homeContent(self, filter):
        classes = [
            {"type_name": "歌单分类", "type_id": "hot_playlist"},
            {"type_name": "推荐歌单", "type_id": "recommend_playlist"},
            {"type_name": "排行榜", "type_id": "toplist"},
            {"type_name": "歌手分类", "type_id": "artist_cat"}
        ]
        
        filters = {
            "artist_cat": [
                {
                    "key": "area",
                    "name": "地区",
                    "value": [{"n": n, "v": v} for n,v in [
                        ("全部", "-1"), ("华语", "7"), ("欧美", "96"), ("韩国", "16"), ("日本", "8")
                    ]]
                },
                {
                    "key": "genre",
                    "name": "性别",
                    "value": [{"n": n, "v": v} for n,v in [
                        ("全部", "-1"), ("男歌手", "1"), ("女歌手", "2"), ("组合", "3")
                    ]]
                },
                {
                    "key": "letter",
                    "name": "字母",
                    "value": [{"n": "全部", "v": "-1"}] + 
                             [{"n": chr(i), "v": chr(i).upper()} for i in range(65, 91)] +
                             [{"n": "#", "v": "0"}]
                }
            ],
            "hot_playlist": [
                {
                    "key": "cat",
                    "name": "类型",
                    "value": [{"n": "全部", "v": "全部"}] + [{"n": c, "v": c} for c in [
                        "华语", "欧美", "日语", "韩语", "粤语", "流行", "摇滚", "民谣", "电子", "说唱",
                        "R&B", "爵士", "古典", "轻音乐", "ACG", "影视原声", "怀旧", "治愈", "国风", "古风"
                    ]]
                },
                {
                    "key": "order",
                    "name": "排序",
                    "value": [{"n": "推荐", "v": "hot"}, {"n": "最新", "v": "new"}]
                }
            ]
        }
        
        videos = []
        
        # 添加排行榜到首页
        try:
            json_str = self._fetch(f"{self.api_base}/toplist")
            data = json.loads(json_str)
            if "list" in data:
                for it in data["list"][:8]:
                    videos.append({
                        "vod_id": f"toplist_{it['id']}",
                        "vod_name": it["name"],
                        "vod_pic": (it.get("coverImgUrl") or it.get("picUrl", "")) + "?param=300y300",
                        "vod_remarks": it.get("updateFrequency", "排行榜")
                    })
        except Exception as e:
            print(f"获取排行榜失败: {e}")
        
        # 添加推荐歌单
        try:
            json_str = self._fetch(f"{self.api_base}/personalized?limit=12")
            data = json.loads(json_str)
            for it in data.get("result", []):
                videos.append({
                    "vod_id": f"playlist_{it['id']}",
                    "vod_name": it["name"],
                    "vod_pic": (it.get("picUrl") or it.get("coverImgUrl", "")) + "?param=300y300",
                    "vod_remarks": f"播放: {self._format_count(it.get('playCount', 0))}"
                })
        except Exception as e:
            print(f"获取推荐歌单失败: {e}")
        
        # 添加热门歌单
        try:
            json_str = self._fetch(f"{self.api_base}/top/playlist?limit=12")
            data = json.loads(json_str)
            for it in data.get("playlists", []):
                videos.append({
                    "vod_id": f"playlist_{it['id']}",
                    "vod_name": it["name"],
                    "vod_pic": (it.get("coverImgUrl", "")) + "?param=300y300",
                    "vod_remarks": f"热门 | 播放: {self._format_count(it.get('playCount', 0))}"
                })
        except Exception as e:
            print(f"获取热门歌单失败: {e}")
        
        return {"class": classes, "filters": filters, "list": videos}

    def homeVideoContent(self):
        return {"list": []}

    def categoryContent(self, tid, pg, filter, extend):
        pg = int(pg or 1)
        limit = 30
        
        if tid == "toplist":
            videos = []
            try:
                json_str = self._fetch(f"{self.api_base}/toplist")
                data = json.loads(json_str)
                if "list" in data:
                    for it in data["list"]:
                        videos.append({
                            "vod_id": f"toplist_{it['id']}",
                            "vod_name": it["name"],
                            "vod_pic": (it.get("coverImgUrl") or it.get("picUrl", "")) + "?param=300y300",
                            "vod_remarks": it.get("updateFrequency", "排行榜")
                        })
            except Exception as e:
                print(f"获取排行榜列表失败: {e}")
        
        elif tid == "recommend_playlist":
            videos = self._parse_playlist(f"{self.api_base}/personalized?limit={limit}", is_personalized=True)
        
        elif tid == "hot_playlist":
            cat = extend.get("cat", "全部")
            order = extend.get("order", "hot")
            offset = (pg - 1) * limit
            if cat == "全部":
                api_url = f"{self.api_base}/top/playlist?limit={limit}&offset={offset}&order={order}"
            else:
                api_url = f"{self.api_base}/top/playlist?cat={quote(cat)}&limit={limit}&offset={offset}&order={order}"
            videos = self._parse_playlist(api_url)
        
        elif tid == "artist_cat":
            videos = self._get_artists_independent_filters(extend, pg, limit)
        
        else:
            videos = []
        
        return {
            "list": videos,
            "page": pg,
            "pagecount": 9999,
            "limit": limit,
            "total": 999999
        }

    def searchContent(self, key, quick, pg="1"):
        pg = int(pg or 1)
        offset = (pg - 1) * 30
        videos = []
        
        try:
            params = {"s": key, "type": 1, "offset": offset, "limit": 30}
            headers = self.headers.copy()
            headers["Content-Type"] = "application/x-www-form-urlencoded"
            
            json_str = self._fetch(
                f"{self.host}/api/cloudsearch/pc",
                method="POST",
                data=urlencode(params),
                headers=headers
            )
            data = json.loads(json_str)
            
            if "result" in data and "songs" in data["result"]:
                for s in data["result"]["songs"]:
                    ar_names = "/".join([ar["name"] for ar in s.get("ar", [])])
                    id_parts = [
                        str(s["id"]), s["name"], ar_names, ar_names,
                        str(s["ar"][0]["id"]) if s.get("ar") else "",
                        str(s["al"]["id"]) if s.get("al") else "",
                        s["al"]["name"] if s.get("al") else "",
                        str(s.get("publishTime", "") // 1000)[:4] if s.get("publishTime") else "",
                        str(s.get("mv", 0))
                    ]
                    videos.append({
                        "vod_id": "@".join(id_parts),
                        "vod_name": s["name"],
                        "vod_pic": (s.get("al", {}).get("picUrl", "")) + "?param=300y300",
                        "vod_remarks": ar_names
                    })
        except Exception as e:
            print(f"搜索失败: {e}")
        
        return {"list": videos, "page": pg}

    def detailContent(self, ids):
        did = ids[0] if isinstance(ids, list) else ids
        vod = {"vod_id": did, "vod_name": "", "vod_pic": "", "vod_content": "", "vod_play_from": "", "vod_play_url": ""}
        
        if "@" in did:
            parts = did.split("@")
            song_id = parts[0]
            singer_id = parts[4] if len(parts) >= 5 and parts[4] else ""
            return self._build_single_song_detail(parts, singer_id)
        
        songs = []
        
        if did.startswith("playlist_") or did.startswith("toplist_"):
            pid = did.replace("playlist_", "").replace("toplist_", "")
            json_str = self._fetch(f"{self.api_base}/playlist/detail?id={pid}")
            data = json.loads(json_str)
            playlist = data.get("playlist", {})
            vod["vod_name"] = playlist.get("name", "歌单/排行榜")
            vod["vod_pic"] = (playlist.get("coverImgUrl", "")) + "?param=500y500"
            vod["vod_content"] = playlist.get("description", f"网易云音乐{playlist.get('name', '')}")
            songs = playlist.get("tracks", [])
        
        elif did.startswith("artist_"):
            aid = did.replace("artist_", "")
            json_str = self._fetch(f"{self.api_base}/artists?id={aid}")
            data = json.loads(json_str)
            vod["vod_name"] = data.get("artist", {}).get("name", "") + "的热门歌曲"
            vod["vod_pic"] = (data.get("artist", {}).get("picUrl", "")) + "?param=500y500"
            songs = data.get("hotSongs", [])
        
        if songs:
            self._build_play_urls(vod, songs)
        
        return {"list": [vod]}

    def playerContent(self, flag, id, vipFlags):
        parts = id.split("|")
        song_id = parts[0] if len(parts) > 0 else ""
        
        # 获取歌曲信息
        song_name = song_id
        artist_name = "未知歌手"
        pic = ""
        
        try:
            detail_url = f"{self.api_base}/song/detail?ids={song_id}"
            detail_json = self._fetch(detail_url)
            detail_data = json.loads(detail_json)
            if "songs" in detail_data and detail_data["songs"]:
                song = detail_data["songs"][0]
                song_name = song.get("name", song_id)
                artists = song.get("ar", [])
                if artists:
                    artist_name = "/".join([ar.get("name", "") for ar in artists])
                pic = song.get("al", {}).get("picUrl", "")
        except:
            pass
        
        # 检查缓存
        cached_audio = self._get_cached_audio_path(song_id)
        if cached_audio:
            print(f"✓ 使用缓存: {os.path.basename(cached_audio)}")
            cached_cover = self._get_cached_cover_url(song_id)
            cached_lrc = self._get_cached_lrc(song_id)
            return {
                "parse": 0,
                "url": f"file://{cached_audio}",
                "header": json.dumps(self.headers),
                "pic": cached_cover or pic,
                "lrc": cached_lrc or ""
            }
        
        # 下载并缓存歌曲
        print(f"开始下载歌曲: {song_name} - {artist_name}")
        cached_audio, cached_cover, cached_lrc = self._cache_song(song_id, song_name, artist_name, pic)
        
        if cached_audio:
            print(f"✓ 下载完成，开始播放: {os.path.basename(cached_audio)}")
            return {
                "parse": 0,
                "url": f"file://{cached_audio}",
                "header": json.dumps(self.headers),
                "pic": cached_cover or pic,
                "lrc": cached_lrc or ""
            }
        
        # 缓存失败，在线播放
        print("缓存失败，尝试在线播放...")
        play_url, _ = self._get_song_url(song_id)
        lrc = self._get_lyrics_by_song_id(song_id)
        
        return {
            "parse": 0,
            "url": play_url or "",
            "header": json.dumps(self.headers),
            "pic": pic,
            "lrc": lrc or ""
        }

    # ================= 辅助方法 =================

    def _format_count(self, count):
        if count > 100000000:
            return f"{round(count / 100000000, 1)}亿"
        elif count > 10000:
            return f"{round(count / 10000, 1)}万"
        return str(count)

    def _fetch(self, url, method="GET", data=None, headers=None):
        try:
            h = self.headers.copy()
            if headers:
                h.update(headers)
            if method == "POST":
                r = self.session.post(url, data=data, headers=h, timeout=15)
            else:
                r = self.session.get(url, headers=h, timeout=15)
            r.encoding = "utf-8"
            return r.text
        except Exception as e:
            print(f"请求失败: {url[:50]}... 错误: {e}")
            return "{}"

    def _build_play_urls(self, vod, songs):
        qualities = [["标准", "standard"], ["极高", "exhigh"], ["无损", "lossless"], ["Hi-Res", "hires"]]
        play_from = []
        play_urls = []
        
        for q_name, q_code in qualities:
            play_from.append(q_name)
            eps = []
            for s in songs:
                artists = [ar.get("name", "") for ar in s.get("ar", [])]
                name = f"{s.get('name', '')} - {'/'.join(artists)}"
                eps.append(f"{name}${s.get('id', '')}|{q_code}")
            play_urls.append("#".join(eps))
        
        vod["vod_play_from"] = "$$$".join(play_from)
        vod["vod_play_url"] = "$$$".join(play_urls)

    def _build_single_song_detail(self, parts, singer_id):
        vod = {
            "vod_id": parts[0],
            "vod_name": parts[1],
            "vod_pic": "",
            "vod_remarks": parts[2],
            "vod_actor": parts[3],
            "vod_year": parts[7] if len(parts) > 7 else ""
        }
        
        try:
            json_str = self._fetch(f"{self.api_base}/album/detail?id={parts[5]}")
            data = json.loads(json_str)
            vod["vod_pic"] = (data.get("album", {}).get("picUrl", "")) + "?param=500y500"
        except:
            pass
        
        qualities = [["标准", "standard"], ["极高", "exhigh"], ["无损", "lossless"], ["Hi-Res", "hires"]]
        play_from = []
        play_urls = []
        
        singer_songs = [{"id": parts[0], "name": parts[1], "artist": parts[2]}]
        if singer_id:
            singer_songs += self._get_singer_hot_songs(singer_id, parts[0])[:9]
        
        for q_name, q_code in qualities:
            play_from.append(q_name)
            eps = []
            for s in singer_songs:
                eps.append(f"{s['name']} - {s['artist']}${s['id']}|{q_code}")
            play_urls.append("#".join(eps))
        
        vod["vod_play_from"] = "$$$".join(play_from)
        vod["vod_play_url"] = "$$$".join(play_urls)
        
        return {"list": [vod]}
    
    def _get_singer_hot_songs(self, singer_id, exclude_song_id=""):
        songs = []
        try:
            json_str = self._fetch(f"{self.api_base}/artists?id={singer_id}")
            data = json.loads(json_str)
            for s in data.get("hotSongs", []):
                song_id = str(s.get("id", ""))
                if song_id and song_id != str(exclude_song_id):
                    ar_names = "/".join([ar.get("name", "") for ar in s.get("ar", [])])
                    songs.append({"id": song_id, "name": s.get("name", ""), "artist": ar_names})
                    if len(songs) >= 10:
                        break
        except:
            pass
        return songs

    def _parse_playlist(self, api_url, is_personalized=False):
        videos = []
        try:
            data = json.loads(self._fetch(api_url))
            items = data.get("result", []) if is_personalized else data.get("playlists", [])
            for it in items:
                videos.append({
                    "vod_id": f"playlist_{it['id']}",
                    "vod_name": it["name"],
                    "vod_pic": (it.get("picUrl") or it.get("coverImgUrl", "")) + "?param=300y300",
                    "vod_remarks": f"播放: {self._format_count(it.get('playCount', 0))}"
                })
        except:
            pass
        return videos

    def _get_lyrics_by_song_id(self, song_id):
        if not song_id or not song_id.isdigit():
            return ""
        try:
            lyric_url = f"{self.lyric_api}?id={song_id}"
            response = self._fetch(lyric_url)
            data = json.loads(response)
            
            if "data" in data and isinstance(data["data"], dict):
                lrc = data["data"].get("lrc", {}).get("lyric", "")
                if lrc:
                    return lrc
            return ""
        except:
            return ""

    # ================= 歌手分类筛选方法 =================

    def _load_complete_pinyin_dict(self):
        pinyin_dict = {}
        common_surnames = {
            'A': ['阿','艾','安'], 'B': ['白','包','鲍'], 'C': ['陈','程','蔡'],
            'D': ['邓','丁','董'], 'F': ['冯','范','方'], 'G': ['郭','高','顾'],
            'H': ['黄','何','韩'], 'J': ['金','蒋','贾'], 'K': ['孔','康','柯'],
            'L': ['李','刘','林'], 'M': ['马','毛','孟'], 'N': ['倪','聂','牛'],
            'O': ['欧','欧阳'], 'P': ['潘','彭','庞'], 'Q': ['钱','秦','邱'],
            'R': ['任','阮','荣'], 'S': ['孙','沈','宋'], 'T': ['唐','田','陶'],
            'W': ['王','汪','魏'], 'X': ['许','徐','谢'], 'Y': ['杨','叶','余'],
            'Z': ['张','赵','周']
        }
        for letter, chars in common_surnames.items():
            for char in chars:
                pinyin_dict[char] = letter
        return pinyin_dict
    
    def _get_pinyin_initial(self, chinese_char):
        if chinese_char in self.pinyin_dict:
            return self.pinyin_dict[chinese_char]
        if '\u4e00' <= chinese_char <= '\u9fff':
            return 'Z'
        return chinese_char.upper()

    def _get_artists_independent_filters(self, extend, pg, limit):
        offset = (pg - 1) * limit
        area = extend.get("area", "-1")
        genre = extend.get("genre", "-1")
        letter = extend.get("letter", "-1")
        
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
            json_str = self._fetch(api_url)
            data = json.loads(json_str)
            
            for artist in data.get("artists", []):
                img_url = artist.get("picUrl") or artist.get("img1v1Url", "")
                if img_url and not img_url.startswith("http"):
                    img_url = "https:" + img_url
                
                videos.append({
                    "vod_id": f"artist_{artist['id']}",
                    "vod_name": artist.get("name", "未知歌手"),
                    "vod_pic": f"{img_url}?param=300y300" if img_url else "",
                    "vod_remarks": f"歌曲:{artist.get('musicSize', 0)} | 专辑:{artist.get('albumSize', 0)}"
                })
        except Exception as e:
            print(f"获取歌手列表失败: {e}")
        
        return videos