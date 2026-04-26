import re
import sys
import json
import os
import time
from base64 import b64encode, b64decode
from urllib.parse import quote, unquote
from pyquery import PyQuery as pq
from requests import Session, adapters
from urllib3.util.retry import Retry
from concurrent.futures import ThreadPoolExecutor, as_completed
sys.path.append('..')
from base.spider import Spider

# ==================== 缓存配置 ====================
CACHE_DIR = "/storage/emulated/0/Download/爱听音乐"
CACHE_ENABLED = True
# ================================================

class Spider(Spider):
    def init(self, extend=""):
        self.host = "https://www.22a5.com"
        self.session = Session()
        adapter = adapters.HTTPAdapter(max_retries=Retry(total=3, backoff_factor=0.5, status_forcelist=[429, 500, 502, 503, 504]), pool_connections=20, pool_maxsize=50)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)
        self.headers = {"User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"}
        self.session.headers.update(self.headers)
        
        # 缓存
        self.cache_enabled = CACHE_ENABLED
        self.cache_dir = CACHE_DIR
        self._init_cache_dir()
        self.cache_metadata = self._load_cache_metadata()

    def getName(self): return "爱听音乐"
    def isVideoFormat(self, url): return bool(re.search(r'\.(m3u8|mp4|mp3|m4a|flv)(\?|$)', url or "", re.I))
    def manualVideoCheck(self): return False
    def destroy(self): self.session.close()

    # ==================== 缓存方法 ====================
    
    def _init_cache_dir(self):
        if not self.cache_enabled:
            return
        try:
            if not os.path.exists(self.cache_dir):
                os.makedirs(self.cache_dir)
        except:
            self.cache_enabled = False
    
    def _get_safe_filename(self, song_name, artist_name):
        """生成安全的文件名"""
        if artist_name and artist_name not in ["", "未知歌手", "未知艺术家"]:
            filename = f"{song_name} - {artist_name}"
        else:
            filename = song_name
        # 去除非法字符
        illegal_chars = r'[<>:"/\\|?*]'
        filename = re.sub(illegal_chars, '', filename)
        filename = filename.strip()
        if not filename:
            filename = "unknown_song"
        # 限制长度
        if len(filename) > 100:
            filename = filename[:100]
        return filename
    
    def _get_cache_paths(self, song_name, artist_name):
        """获取缓存文件路径"""
        safe_name = self._get_safe_filename(song_name, artist_name)
        return {
            "audio": os.path.join(self.cache_dir, f"{safe_name}.mp3"),
            "cover": os.path.join(self.cache_dir, f"{safe_name}.jpg"),
            "lrc": os.path.join(self.cache_dir, f"{safe_name}.lrc")
        }
    
    def _load_cache_metadata(self):
        metadata_file = os.path.join(self.cache_dir, "cache_index.json")
        if os.path.exists(metadata_file):
            try:
                with open(metadata_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except:
                return {}
        return {}
    
    def _save_cache_metadata(self):
        metadata_file = os.path.join(self.cache_dir, "cache_index.json")
        try:
            with open(metadata_file, 'w', encoding='utf-8') as f:
                json.dump(self.cache_metadata, f, ensure_ascii=False, indent=2)
        except:
            pass
    
    def _is_cached(self, song_url):
        """根据URL检查是否已缓存"""
        song_id = re.search(r'/(song|mp3)/([^/]+)\.html', song_url)
        if song_id:
            song_id = song_id.group(2)
            for sid, meta in self.cache_metadata.items():
                if sid == song_id or meta.get("song_url") == song_url:
                    audio_path = meta.get("audio_path", "")
                    if audio_path and os.path.exists(audio_path):
                        return True, audio_path, meta.get("cover_path", ""), meta.get("lrc_path", "")
        return False, None, None, None
    
    def _save_to_cache(self, song_url, song_name, artist_name, cover_url, lrc_url, audio_url):
        """保存歌曲到缓存"""
        if not self.cache_enabled or not audio_url:
            return None, None, None
        
        # 提取歌曲ID作为唯一标识
        song_id_match = re.search(r'/(song|mp3)/([^/]+)\.html', song_url)
        song_id = song_id_match.group(2) if song_id_match else None
        
        # 检查是否已缓存
        if song_id:
            for sid, meta in self.cache_metadata.items():
                if sid == song_id:
                    audio_path = meta.get("audio_path", "")
                    if audio_path and os.path.exists(audio_path):
                        return audio_path, meta.get("cover_path", ""), meta.get("lrc_path", "")
        
        # 获取缓存路径
        paths = self._get_cache_paths(song_name, artist_name)
        
        # 下载音频
        audio_path = None
        try:
            response = self.session.get(audio_url, stream=True, timeout=60)
            response.raise_for_status()
            with open(paths['audio'], 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
            if os.path.exists(paths['audio']) and os.path.getsize(paths['audio']) > 0:
                audio_path = paths['audio']
        except Exception as e:
            print(f"音频下载失败: {e}")
        
        # 下载封面
        cover_path = None
        if cover_url:
            try:
                resp = self.session.get(cover_url, timeout=10)
                if resp.status_code == 200:
                    with open(paths['cover'], 'wb') as f:
                        f.write(resp.content)
                    cover_path = paths['cover']
            except:
                pass
        
        # 下载歌词
        lrc_path = None
        if lrc_url:
            try:
                resp = self.session.get(lrc_url, timeout=10)
                if resp.status_code == 200:
                    lrc_content = resp.text
                    # 过滤广告
                    lrc_content = self._filter_lrc_ads(lrc_content)
                    if lrc_content and len(lrc_content) > 50:
                        with open(paths['lrc'], 'w', encoding='utf-8') as f:
                            f.write(lrc_content)
                        lrc_path = paths['lrc']
            except:
                pass
        
        # 保存元数据
        if audio_path and song_id:
            self.cache_metadata[song_id] = {
                "song_id": song_id,
                "song_url": song_url,
                "song_name": song_name,
                "artist_name": artist_name,
                "audio_path": audio_path,
                "cover_path": cover_path,
                "lrc_path": lrc_path,
                "cached_at": time.strftime("%Y-%m-%d %H:%M:%S")
            }
            self._save_cache_metadata()
        
        return audio_path, cover_path, lrc_path

    def homeContent(self, filter):
        classes = [{"type_name": n, "type_id": i} for n, i in [("歌手","/singerlist/index/index/index/index.html"), ("TOP榜单","/list/top.html"), ("新歌榜","/list/new.html"), ("电台","/radiolist/index.html"), ("高清MV","/mvlist/oumei.html"), ("专辑","/albumlist/index.html"), ("歌单","/playtype/index.html")]]
        filters = {p: d for p in [c["type_id"] for c in classes if "singer" not in c["type_id"]] if (d := self._fetch_filters(p))}
        
        if "/radiolist/index.html" not in filters:
            filters["/radiolist/index.html"] = [{"key": "id", "name": "分类", "value": [{"n": n, "v": v} for n,v in zip(["最新","最热","有声小说","相声","音乐","情感","国漫","影视","脱口秀","历史","儿童","教育","八卦","推理","头条"], ["index","hot","novel","xiangyi","music","emotion","game","yingshi","talkshow","history","children","education","gossip","tuili","headline"])]}]

        filters["/singerlist/index/index/index/index.html"] = [
            {"key": "area", "name": "地区", "value": [{"n": n, "v": v} for n,v in [("全部","index"),("华语","huayu"),("欧美","oumei"),("韩国","hanguo"),("日本","ribrn")]]},
            {"key": "sex", "name": "性别", "value": [{"n": n, "v": v} for n,v in [("全部","index"),("男","male"),("女","girl"),("组合","band")]]},
            {"key": "genre", "name": "流派", "value": [{"n": n, "v": v} for n,v in [("全部","index"),("流行","liuxing"),("电子","dianzi"),("摇滚","yaogun"),("嘻哈","xiha"),("R&B","rb"),("民谣","minyao"),("爵士","jueshi"),("古典","gudian")]]},
            {"key": "char", "name": "字母", "value": [{"n": "全部", "v": "index"}] + [{"n": chr(i), "v": chr(i).lower()} for i in range(65, 91)]}
        ]
        return {"class": classes, "filters": filters, "list": []}

    def homeVideoContent(self): return {"list": []}

    def categoryContent(self, tid, pg, filter, extend):
        pg = int(pg or 1)
        url = tid
        if "/singerlist/" in tid:
            p = tid.split('/')
            if len(p) >= 6:
                url = "/".join(p[:2] + [extend.get(k, p[i]) for i, k in enumerate(["area", "sex", "genre"], 2)] + [f"{extend.get('char', 'index')}.html"])
        elif "id" in extend and extend["id"] not in ["index", "top"]:
            url = tid.replace("index.html", f"{extend['id']}.html").replace("top.html", f"{extend['id']}.html")
            if url == tid: url = f"{tid.rsplit('/', 1)[0]}/{extend['id']}.html"

        if pg > 1:
            sep = "/" if any(x in url for x in ["/singerlist/", "/radiolist/", "/mvlist/", "/playtype/", "/list/"]) else "_"
            url = re.sub(r'(_\d+|/\d+)?\.html$', f'{sep}{pg}.html', url)
        
        doc = self.getpq(url)
        return {"list": self._parse_list(doc(".play_list li, .video_list li, .pic_list li, .singer_list li, .ali li, .layui-row li, .base_l li"), tid), "page": pg, "pagecount": 9999, "limit": 90, "total": 999999}

    def searchContent(self, key, quick, pg="1"):
        return {"list": self._parse_list(self.getpq(f"/so/{quote(key)}/{pg}.html")(".base_l li, .play_list li"), "search"), "page": int(pg)}

    def detailContent(self, ids):
        url = self._abs(ids[0])
        doc = self.getpq(url)
        
        # 获取页面基本信息
        vod_name = self._clean(doc("h1").text() or doc("title").text())
        vod_pic = self._abs(doc(".djpg img, .pic img, .djpic img").attr("src"))
        
        vod = {"vod_id": url, "vod_name": vod_name, "vod_pic": vod_pic, "vod_play_from": "爱听音乐", "vod_content": ""}

        # 判断是否是歌单/专辑/歌手页面
        if any(x in url for x in ["/playlist/", "/album/", "/list/", "/singer/", "/special/", "/radio/", "/radiolist/", "/playtype/"]):
            eps = self._get_eps(doc, url, vod_pic)
            page_urls = {self._abs(a.attr("href")) for a in doc(".page a, .dede_pages a, .pagelist a").items() if a.attr("href") and "javascript" not in a.attr("href")} - {url}
            if page_urls:
                with ThreadPoolExecutor(max_workers=5) as ex:
                    futures = []
                    for page_url in sorted(page_urls, key=lambda x: int(re.search(r'[_\/](\d+)\.html', x).group(1)) if re.search(r'[_\/](\d+)\.html', x) else 0):
                        futures.append(ex.submit(self._get_eps, self.getpq(page_url), page_url, vod_pic))
                    for f in as_completed(futures):
                        eps.extend(f.result() or [])
            
            if eps:
                # 去重
                seen = set()
                unique_eps = []
                for ep in eps:
                    key = ep.split("$")[0] if "$" in ep else ep
                    if key not in seen:
                        seen.add(key)
                        unique_eps.append(ep)
                
                # 普通播放列表
                play_eps = [ep for ep in unique_eps if "|download" not in ep]
                # 下载列表（标记为下载）
                download_eps = [f"{ep.split('$')[0] if '$' in ep else ep}${ep.split('$')[1] if '$' in ep else ''}|download" for ep in unique_eps]
                
                if download_eps:
                    vod.update({
                        "vod_play_from": "🎵 播放列表$$$📥 下载歌曲", 
                        "vod_play_url": "#".join(play_eps) + "$$$" + "#".join(download_eps)
                    })
                else:
                    vod.update({"vod_play_from": "播放列表", "vod_play_url": "#".join(play_eps)})
                return {"list": [vod]}

        # 单曲页面
        song_id_match = re.search(r'/(song|mp3)/([^/]+)\.html', url)
        if song_id_match:
            song_id = song_id_match.group(2)
            lrc_url = f"{self.host}/plug/down.php?ac=music&lk=lrc&id={song_id}"
            
            # 获取歌曲详细信息
            song_name = self._clean(doc("h1").text() or doc("title").text())
            artist_name = doc(".singer a, .artist a, .info a").text() or "未知歌手"
            cover_url = self._abs(doc(".djpg img, .pic img, .detail img").attr("src") or vod_pic)
            
            # 编码歌曲信息
            song_info = f"{song_id}|{song_name}|{artist_name}|{cover_url}|{lrc_url}"
            
            # 普通播放
            play_option = f"🎵 播放${self.e64(f'play@@@@{url}|||{lrc_url}')}"
            # 下载选项
            download_option = f"📥 下载${self.e64(f'download@@@@{url}|||{song_info}')}"
            
            vod["vod_play_from"] = "选项"
            vod["vod_play_url"] = "#".join([play_option, download_option])
        
        return {"list": [vod]}

    def playerContent(self, flag, id, vipFlags):
        decoded = self.d64(id)
        
        # ========== 下载请求 ==========
        if decoded.startswith("download@@@@"):
            parts = decoded.split("@@@@")
            if len(parts) >= 2:
                rest = parts[1]
                # 解析: download@@@@url|||song_id|song_name|artist_name|cover_url|lrc_url
                if "|||" in rest:
                    url_part, info_part = rest.split("|||", 1)
                    song_url = url_part.replace(r"\/", "/")
                    info_parts = info_part.split("|")
                    
                    if len(info_parts) >= 5:
                        song_id = info_parts[0]
                        song_name = info_parts[1]
                        artist_name = info_parts[2]
                        cover_url = info_parts[3]
                        lrc_url = info_parts[4]
                    else:
                        # 降级处理
                        song_id = "unknown"
                        song_name = "未知歌曲"
                        artist_name = "未知歌手"
                        cover_url = ""
                        lrc_url = ""
                    
                    print(f"[下载] 歌曲: {song_name} - {artist_name}")
                    
                    # 检查缓存
                    is_cached, cached_audio, cached_cover, cached_lrc = self._is_cached(song_url)
                    if is_cached:
                        print(f"[下载] 使用缓存")
                        return {
                            "parse": 0,
                            "url": f"file://{cached_audio}",
                            "header": {"User-Agent": self.headers["User-Agent"]},
                            "pic": cached_cover if cached_cover else cover_url,
                            "lrc": open(cached_lrc, 'r', encoding='utf-8').read() if cached_lrc and os.path.exists(cached_lrc) else "",
                            "msg": f"✅ 已有缓存: {song_name}"
                        }
                    
                    # 获取真实播放URL
                    real_url = song_url
                    if ".html" in song_url:
                        mid = re.search(r'/(song|mp3)/([^/]+)\.html', song_url)
                        if mid:
                            api_result = self._api("/js/play.php", method="POST", 
                                                  data={"id": mid.group(2), "type": "music"},
                                                  headers={"Referer": song_url, "X-Requested-With": "XMLHttpRequest"})
                            if api_result and ".php" not in api_result and api_result.startswith("http"):
                                real_url = api_result
                    
                    # 下载
                    if real_url and self.isVideoFormat(real_url):
                        audio_path, cover_path, lrc_path = self._save_to_cache(
                            song_url, song_name, artist_name, cover_url, lrc_url, real_url
                        )
                        if audio_path:
                            lrc_content = ""
                            if lrc_path and os.path.exists(lrc_path):
                                with open(lrc_path, 'r', encoding='utf-8') as f:
                                    lrc_content = f.read()
                            return {
                                "parse": 0,
                                "url": f"file://{audio_path}",
                                "header": {"User-Agent": self.headers["User-Agent"]},
                                "pic": cover_path if cover_path else cover_url,
                                "lrc": lrc_content,
                                "msg": f"✅ 下载完成: {song_name}"
                            }
                    
                    return {
                        "parse": 0,
                        "url": real_url if real_url else "",
                        "header": {"User-Agent": self.headers["User-Agent"]},
                        "msg": f"⚠️ 下载失败，在线播放: {song_name}"
                    }
        
        # ========== 播放请求 ==========
        if decoded.startswith("play@@@@"):
            decoded = decoded.replace("play@@@@", "0@@@@")
        
        raw = decoded.split("@@@@")[-1]
        url, subt = raw.split("|||") if "|||" in raw else (raw, "")
        url = url.replace(r"\/", "/")
        
        # 检查缓存
        is_cached, cached_audio, cached_cover, cached_lrc = self._is_cached(url)
        if is_cached:
            print(f"[播放] 使用缓存")
            lrc_content = ""
            if cached_lrc and os.path.exists(cached_lrc):
                with open(cached_lrc, 'r', encoding='utf-8') as f:
                    lrc_content = f.read()
            return {
                "parse": 0,
                "url": f"file://{cached_audio}",
                "header": {"User-Agent": self.headers["User-Agent"]},
                "pic": cached_cover if cached_cover else "",
                "lrc": lrc_content
            }
        
        # 获取真实播放URL
        if ".html" in url and not self.isVideoFormat(url):
            if mid := re.search(r'/(song|mp3)/([^/]+)\.html', url):
                if r_url := self._api("/js/play.php", method="POST", 
                                     data={"id": mid.group(2), "type": "music"},
                                     headers={"Referer": url, "X-Requested-With": "XMLHttpRequest"}):
                    url = r_url if ".php" not in r_url else url
            elif vid := re.search(r'/(video|mp4)/([^/]+)\.html', url):
                with ThreadPoolExecutor(max_workers=3) as ex:
                    for f in as_completed([ex.submit(self._api, "/plug/down.php", {"ac": "vplay", "id": vid.group(2), "q": q}) for q in [1080, 720, 480]]):
                        if v_url := f.result():
                            url = v_url
                            break
        
        result = {"parse": 0, "url": url, "header": {"User-Agent": self.headers["User-Agent"]}}
        if "22a5.com" in url:
            result["header"]["Referer"] = self.host + "/"
        
        # LRC歌词
        if subt and subt.startswith("http"):
            try:
                r = self.session.get(subt, headers={"Referer": self.host + "/"}, timeout=5)
                lrc_content = r.text
                if lrc_content:
                    lrc_content = self._filter_lrc_ads(lrc_content)
                    result["lrc"] = lrc_content
            except:
                pass
        
        return result

    def _filter_lrc_ads(self, lrc_text):
        if not lrc_text:
            return ""
        lines = lrc_text.splitlines()
        filtered_lines = []
        ad_patterns = [
            r'欢迎来访', r'本站', r'广告', r'QQ群', r'www\.', r'http',
            r'\.com', r'\.cn', r'\.net', r'音乐网', r'提供', r'下载'
        ]
        for line in lines:
            is_ad = False
            for pattern in ad_patterns:
                if re.search(pattern, line, re.I):
                    is_ad = True
                    break
            if not is_ad:
                filtered_lines.append(line)
        return '\n'.join(filtered_lines)

    def localProxy(self, param):
        url = unquote(param.get("url", ""))
        type_ = param.get("type")
        
        if type_ == "img":
            try:
                resp = self.session.get(url, headers={"Referer": self.host + "/"}, timeout=10)
                return [200, "image/jpeg", resp.content, {}]
            except:
                return [404, "text/plain", b"", {}]
        elif type_ == "lrc":
            try:
                resp = self.session.get(url, headers={"Referer": self.host + "/"}, timeout=10)
                lrc_content = self._filter_lrc_ads(resp.text)
                return [200, "application/octet-stream", lrc_content.encode('utf-8'), {}]
            except:
                return [404, "text/plain", b"Error", {}]
        return None

    def _parse_list(self, items, tid=""):
        res = []
        for li in items.items():
            a = li("a").eq(0)
            if not (href := a.attr("href")) or href == "/" or any(x in href for x in ["/user/", "/login/", "javascript"]):
                continue
            if not (name := self._clean(li(".name").text() or a.attr("title") or a.text())):
                continue
            pic = self._abs((li("img").attr("src") or "").replace('120', '500'))
            res.append({
                "vod_id": self._abs(href), 
                "vod_name": name, 
                "vod_pic": f"{self.getProxyUrl()}&url={pic}&type=img" if pic else "", 
                "style": {"type": "oval" if "/singer/" in href else ("list" if any(x in tid for x in ["/list/", "/playtype/", "/albumlist/"]) else "rect"), "ratio": 1 if "/singer/" in href else 1.33}
            })
        return res

    def _get_eps(self, doc, page_url="", default_cover=""):
        eps = []
        for li in doc(".play_list li, .song_list li, .music_list li").items():
            a = li("a").eq(0)
            href = a.attr("href")
            if not href:
                continue
            
            # 匹配歌曲链接
            mid = re.search(r'/(song|mp3)/([^/]+)\.html', href)
            if not mid:
                continue
            
            full_url = self._abs(href)
            song_id = mid.group(2)
            lrc_url = f"{self.host}/plug/down.php?ac=music&lk=lrc&id={song_id}"
            
            # 获取歌曲名称和艺术家
            song_name = self._clean(a.text() or li(".name").text() or li("h3").text())
            
            # 尝试获取艺术家
            artist_elem = li(".singer a, .artist a, .author a")
            artist_name = artist_elem.text() if artist_elem else "网络歌手"
            artist_name = self._clean(artist_name) or "网络歌手"
            
            # 获取封面
            cover_url = self._abs(li("img").attr("src") or default_cover)
            
            # 编码所有信息: song_id|song_name|artist_name|cover_url|lrc_url
            song_info = f"{song_id}|{song_name}|{artist_name}|{cover_url}|{lrc_url}"
            
            # 播放用
            play_data = self.e64(f'play@@@@{full_url}|||{lrc_url}')
            # 下载用
            download_data = self.e64(f'download@@@@{full_url}|||{song_info}')
            
            # 添加播放和下载两个选项
            eps.append(f"{song_name}${play_data}")
            eps.append(f"📥 {song_name}${download_data}")
        
        return eps

    def _clean(self, text):
        if not text:
            return ""
        return re.sub(r'(爱玩音乐网|视频下载说明|视频下载地址|www\.2t58\.com|MP3免费下载|LRC歌词下载|全部歌曲|\[第\d+页\]|刷新|每日推荐|最新|热门|推荐|MV|高清|无损|下载|播放)', '', text, flags=re.I).strip()

    def _fetch_filters(self, url):
        doc, filters = self.getpq(url), []
        for i, group in enumerate([doc(s) for s in [".ilingku_fl", ".class_list", ".screen_list", ".box_list", ".nav_list"] if doc(s)]):
            opts, seen = [{"n": "全部", "v": "top" if "top" in url else "index"}], set()
            for a in group("a").items():
                v = (a.attr("href") or "").split("?")[0].rstrip('/').split('/')[-1].replace('.html','')
                if v and v not in seen:
                    opts.append({"n": a.text().strip(), "v": v})
                    seen.add(v)
            if len(opts) > 1:
                filters.append({"key": f"id{i}" if i else "id", "name": "分类", "value": opts})
        return filters

    def _api(self, path, params=None, method="GET", headers=None, data=None):
        try:
            h = self.headers.copy()
            if headers:
                h.update(headers)
            r = (self.session.post if method == "POST" else self.session.get)(
                f"{self.host}{path}", params=params, data=data, headers=h, timeout=10, allow_redirects=False
            )
            if loc := r.headers.get("Location"):
                return self._abs(loc.strip())
            try:
                json_data = r.json()
                return self._abs(json_data.get("url", "").replace(r"\/", "/"))
            except:
                text = r.text.strip()
                if text.startswith("http"):
                    return self._abs(text)
                return ""
        except:
            return ""

    def getpq(self, url):
        import time
        for _ in range(2):
            try:
                return pq(self.session.get(self._abs(url), timeout=5).text)
            except:
                time.sleep(0.1)
        return pq("<html></html>")

    def _abs(self, url):
        if not url:
            return ""
        if url.startswith("http"):
            return url
        return f"{self.host}{'/' if not url.startswith('/') else ''}{url}"
    
    def e64(self, text):
        return b64encode(text.encode("utf-8")).decode("utf-8")
    
    def d64(self, text):
        return b64decode(text.encode("utf-8")).decode("utf-8")