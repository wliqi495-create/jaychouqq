import sys
import json
import re
import string
import random
from urllib.parse import quote, urlencode
from pyquery import PyQuery as pq
from requests import Session, adapters
from urllib3.util.retry import Retry
sys.path.append('..')
from base.spider import Spider

class Spider(Spider):
    def init(self, extend=""):
        self.host = "https://music.163.com"
        self.api_base = "https://ncm.zhenxin.me"
        # 主播放API（支持多音质完整歌曲）
        self.play_api = "https://api.cenguigui.cn/api/netease/music_v1.php"
        # 备用播放API
        self.play_api_backup1 = "https://node.api.xfabe.com/api/wangyi/music"
        self.play_api_backup2 = "https://api.bugpk.com/api/163_music"
        self.lyric_api = "https://node.api.xfabe.com/api/wangyi/lyrics"
        self.random_api = "https://node.api.xfabe.com/api/wangyi/randomMusic"
        self.mv_api = "http://api.guaqb.cn/music/vip.php"
        self.mv_api_key = "c62976f298c4e698ffad461e3c0ce950"
        
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
            "Referer": self.host + "/"
        }
        self.session.headers.update(self.headers)
        
        # 拼音转换字典
        self.pinyin_dict = self._load_complete_pinyin_dict()

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
            {"type_name": "随机音乐", "type_id": "random_music"},
            {"type_name": "歌单分类", "type_id": "hot_playlist"},
            {"type_name": "推荐歌单", "type_id": "recommend_playlist"},
            {"type_name": "排行榜", "type_id": "toplist"},
            {"type_name": "歌手分类", "type_id": "artist_cat"},
            {"type_name": "MV专区", "type_id": "mv_category"}
        ]
        
        filters = {
            "artist_cat": [
                {
                    "key": "area",
                    "name": "地区",
                    "value": [{"n": n, "v": v} for n,v in [
                        ("全部", "-1"),
                        ("华语", "7"),
                        ("欧美", "96"),
                        ("韩国", "16"),
                        ("日本", "8")
                    ]]
                },
                {
                    "key": "genre",
                    "name": "性别",
                    "value": [{"n": n, "v": v} for n,v in [
                        ("全部", "-1"),
                        ("男歌手", "1"),
                        ("女歌手", "2"),
                        ("组合", "3")
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
                    "value": [
                        {"n": "全部", "v": "全部"},
                        {"n": "华语", "v": "华语"},
                        {"n": "欧美", "v": "欧美"},
                        {"n": "日语", "v": "日语"},
                        {"n": "韩语", "v": "韩语"},
                        {"n": "粤语", "v": "粤语"},
                        {"n": "流行", "v": "流行"},
                        {"n": "摇滚", "v": "摇滚"},
                        {"n": "民谣", "v": "民谣"},
                        {"n": "电子", "v": "电子"},
                        {"n": "说唱", "v": "说唱"},
                        {"n": "R&B", "v": "R&B"},
                        {"n": "爵士", "v": "爵士"},
                        {"n": "古典", "v": "古典"},
                        {"n": "轻音乐", "v": "轻音乐"},
                        {"n": "ACG", "v": "ACG"},
                        {"n": "影视原声", "v": "影视原声"},
                        {"n": "怀旧", "v": "怀旧"},
                        {"n": "治愈", "v": "治愈"},
                        {"n": "网络歌曲", "v": "网络歌曲"},
                        {"n": "KTV热歌", "v": "KTV热歌"},
                        {"n": "经典", "v": "经典"},
                        {"n": "翻唱", "v": "翻唱"},
                        {"n": "国风", "v": "国风"},
                        {"n": "古风", "v": "古风"},
                        {"n": "蓝调", "v": "蓝调"},
                        {"n": "金属", "v": "金属"},
                        {"n": "朋克", "v": "朋克"},
                        {"n": "乡村", "v": "乡村"},
                        {"n": "世界音乐", "v": "世界音乐"},
                        {"n": "雷鬼", "v": "雷鬼"},
                        {"n": "拉丁", "v": "拉丁"},
                        {"n": "新世纪", "v": "新世纪"},
                        {"n": "器乐", "v": "器乐"}
                    ]
                },
                {
                    "key": "order",
                    "name": "排序",
                    "value": [
                        {"n": "推荐", "v": "hot"},
                        {"n": "最新", "v": "new"}
                    ]
                }
            ],
            "mv_category": [
                {
                    "key": "area",
                    "name": "地区",
                    "value": [{"n": n, "v": v} for n,v in [
                        ("全部", "all"),
                        ("内地", "mainland"),
                        ("港台", "hktw"),
                        ("欧美", "europe"),
                        ("日本", "japan"),
                        ("韩国", "korea")
                    ]]
                },
                {
                    "key": "type",
                    "name": "类型",
                    "value": [
                        {"n": "全部", "v": "all"},
                        {"n": "最新", "v": "new"},
                        {"n": "热门", "v": "hot"},
                        {"n": "推荐", "v": "recommend"}
                    ]
                }
            ]
        }
        
        videos = []
        try:
            # 显示推荐歌单
            json_str = self._fetch(f"{self.api_base}/personalized?limit=12")
            data = json.loads(json_str)
            items = data.get("result", [])
            for it in items:
                videos.append({
                    "vod_id": f"playlist_{it['id']}",
                    "vod_name": it["name"],
                    "vod_pic": (it.get("picUrl") or it.get("coverImgUrl", "")) + "?param=300y300",
                    "vod_remarks": f"播放: {self._format_count(it.get('playCount', 0))}"
                })
            
            # 在首页显示推荐MV
            try:
                mv_list = self._get_mv_simple("all", "recommend", 1, 6)
                for mv in mv_list[:6]:
                    videos.append(mv)
            except:
                pass
                
        except:
            pass
        
        return {"class": classes, "filters": filters, "list": videos}

    def homeVideoContent(self):
        return {"list": []}

    def categoryContent(self, tid, pg, filter, extend):
        pg = int(pg or 1)
        limit = 30
        
        if tid == "toplist":
            api_url = f"{self.api_base}/toplist"
            videos = self._parse_toplist(api_url)
        elif tid == "recommend_playlist":
            api_url = f"{self.api_base}/personalized?limit={limit}"
            videos = self._parse_playlist(api_url, is_personalized=True)
        elif tid == "hot_playlist":
            cat = extend.get("cat", "全部")
            order = extend.get("order", "hot")
            offset = (pg - 1) * limit
            
            if cat == "全部":
                api_url = f"{self.api_base}/top/playlist?limit={limit}&offset={offset}&order={order}"
            else:
                mapped_cat = self._map_playlist_category(cat)
                api_url = f"{self.api_base}/top/playlist?cat={quote(mapped_cat)}&limit={limit}&offset={offset}&order={order}"
            
            videos = self._parse_playlist(api_url)
        elif tid == "artist_cat":
            videos = self._get_artists_independent_filters(extend, pg, limit)
        elif tid == "mv_category":
            area = extend.get("area", "all")
            mv_type = extend.get("type", "all")
            videos = self._get_mv_simple(area, mv_type, pg, limit)
        elif tid == "random_music":
            videos = self._get_random_music(pg, limit)
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
            params = {
                "s": key,
                "type": 1,
                "offset": offset,
                "limit": 30
            }
            
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
                        str(s["id"]),
                        s["name"],
                        ar_names,
                        ar_names,
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
                        "vod_remarks": ar_names + (" [MV]" if s.get("mv") else "")
                    })
            
            # 搜索MV
            params["type"] = 1004
            params["limit"] = 15
            
            json_str = self._fetch(
                f"{self.host}/api/cloudsearch/pc",
                method="POST",
                data=urlencode(params),
                headers=headers
            )
            data = json.loads(json_str)
            
            if "result" in data and "mvs" in data["result"]:
                for mv in data["result"]["mvs"]:
                    artist_name = mv.get("artistName", "")
                    videos.append({
                        "vod_id": f"mv_{mv['id']}",
                        "vod_name": mv.get("name", ""),
                        "vod_pic": (mv.get("cover", "")) + "?param=300y300",
                        "vod_remarks": f"MV | {artist_name} | 播放:{self._format_count(mv.get('playCount', 0))}"
                    })
                    
        except Exception as e:
            print(f"搜索失败: {e}")
        
        return {"list": videos, "page": pg}

    def detailContent(self, ids):
        did = ids[0] if isinstance(ids, list) else ids
        vod = {
            "vod_id": did,
            "vod_name": "",
            "vod_pic": "",
            "vod_content": "",
            "vod_play_from": "",
            "vod_play_url": ""
        }
        
        if "@" in did:
            parts = did.split("@")
            song_id = parts[0]
            singer_id = parts[4] if len(parts)>=5 and parts[4] else ""
            
            try:
                lrc = self._get_lyrics_by_song_id(song_id)
                if lrc:
                    lines = lrc.split('\n')[:20]
                    preview_lrc = '\n'.join(lines)
                    vod["vod_content"] = f"歌词预览:\n{preview_lrc}"
            except Exception as e:
                print(f"获取歌词失败: {e}")
            
            return self._build_single_song_detail(parts, singer_id)
        elif did.startswith("mv_"):
            mv_id = did.replace("mv_", "")
            return self._build_mv_detail_with_singer_mvs(mv_id)
        
        songs = []
        if did.startswith("playlist_") or did.startswith("toplist_"):
            pid = did.replace("playlist_", "").replace("toplist_", "")
            json_str = self._fetch(f"{self.api_base}/playlist/detail?id={pid}")
            data = json.loads(json_str)
            playlist = data.get("playlist", {})
            vod["vod_name"] = playlist.get("name", "歌单")
            vod["vod_pic"] = (playlist.get("coverImgUrl", "")) + "?param=500y500"
            vod["vod_content"] = playlist.get("description", "网易云音乐歌单")
            songs = playlist.get("tracks", [])
        elif did.startswith("artist_"):
            aid = did.replace("artist_", "")
            json_str = self._fetch(f"{self.api_base}/artists?id={aid}")
            data = json.loads(json_str)
            vod["vod_name"] = data.get("artist", {}).get("name", "") + " 的热门歌曲"
            vod["vod_pic"] = (data.get("artist", {}).get("picUrl", "")) + "?param=500y500"
            songs = data.get("hotSongs", [])
        
        if songs:
            self._build_play_urls(vod, songs)
        
        return {"list": [vod]}

    def playerContent(self, flag, id, vipFlags):
        if id.startswith("mv_"):
            mv_id = id.replace("mv_", "")
            res = self._get_mv_player_content(mv_id)
            res["url"] = res.get("url", "") or ""
            res["header"] = res.get("header", json.dumps(self.headers))
            res["pic"] = res.get("pic", "") or ""
            res["lrc"] = res.get("lrc", "") or ""
            return res
        else:
            parts = id.split("|")
            song_id = parts[0] if len(parts)>0 else ""
            quality = parts[1] if len(parts) > 1 else "jymaster"
            
            play_url = ""
            pic = ""
            
            # 尝试多个API源获取完整歌曲
            try:
                # 方法1：使用原API，支持多音质
                play_data_url = f"{self.play_api}?id={song_id}&type=json&level={quality}"
                json_str = self._fetch(play_data_url)
                data = json.loads(json_str)
                
                play_url = data.get("data", {}).get("url", "")
                pic = data.get("data", {}).get("pic", "")
                
                # 如果方法1失败或返回试听片段，尝试方法2
                if not play_url or self._is_trial_audio(play_url):
                    print(f"检测到试听片段或空地址，尝试备用API: {song_id}")
                    play_url, pic = self._try_all_backup_apis(song_id, quality)
                    
            except Exception as e:
                print(f"获取主播放地址失败: {e}")
                # 主API失败时尝试所有备用API
                try:
                    play_url, pic = self._try_all_backup_apis(song_id, quality)
                except Exception as e2:
                    print(f"获取所有备用播放地址失败: {e2}")
            
            # 获取歌词
            lrc = self._get_lyrics_by_song_id(song_id)
            
            return {
                "parse": 0,
                "url": play_url,
                "header": json.dumps(self.headers),
                "pic": pic,
                "lrc": lrc
            }
    
    def _is_trial_audio(self, url):
        """检测是否为试听片段"""
        if not url:
            return True
            
        # 试听片段通常包含特定域名
        trial_domains = ["m701.music.126.net", "m702.music.126.net", "m703.music.126.net"]
        for domain in trial_domains:
            if domain in url:
                return True
                
        # 或者URL长度很短（试听片段URL通常较短）
        if len(url) < 100:
            return True
            
        return False
    
    def _try_all_backup_apis(self, song_id, quality):
        """尝试所有备用API获取完整歌曲"""
        play_url = ""
        pic = ""
        
        # 尝试API 1：ncm.zhenxin.me（支持多音质）
        try:
            ncm_api_url = f"{self.api_base}/song/url?id={song_id}&br={quality}"
            json_str = self._fetch(ncm_api_url)
            data = json.loads(json_str)
            
            if "data" in data and data["data"]:
                for item in data["data"]:
                    if item.get("url") and not self._is_trial_audio(item.get("url", "")):
                        play_url = item["url"]
                        break
                        
                # 获取封面
                if play_url:
                    try:
                        song_detail_url = f"{self.api_base}/song/detail?ids={song_id}"
                        detail_json = self._fetch(song_detail_url)
                        detail_data = json.loads(detail_json)
                        if "songs" in detail_data and detail_data["songs"]:
                            song = detail_data["songs"][0]
                            pic = song.get("al", {}).get("picUrl", "")
                    except:
                        pass
        except Exception as e:
            print(f"备用API1失败: {e}")
        
        # 如果还没获取到，尝试API 2：bugpk.com
        if not play_url:
            try:
                backup_api_url = f"{self.play_api_backup2}?id={song_id}"
                json_str = self._fetch(backup_api_url)
                data = json.loads(json_str)
                
                # 解析备用API的返回格式
                if "data" in data:
                    url_fields = ["url", "musicUrl", "audioUrl", "link", "play_url"]
                    for field in url_fields:
                        if field in data["data"] and data["data"][field]:
                            candidate_url = data["data"][field]
                            if not self._is_trial_audio(candidate_url):
                                play_url = candidate_url
                                break
                    
                    # 获取封面图片
                    if play_url:
                        pic_fields = ["pic", "cover", "albumPic", "picUrl"]
                        for field in pic_fields:
                            if field in data["data"] and data["data"][field]:
                                pic = data["data"][field]
                                break
                elif "url" in data:
                    candidate_url = data["url"]
                    if not self._is_trial_audio(candidate_url):
                        play_url = candidate_url
                elif "musicUrl" in data:
                    candidate_url = data["musicUrl"]
                    if not self._is_trial_audio(candidate_url):
                        play_url = candidate_url
            except Exception as e:
                print(f"备用API2失败: {e}")
        
        # 如果还没获取到，尝试API 3：xfabe.com（检查是否为完整歌曲）
        if not play_url:
            try:
                xfabe_api_url = f"{self.play_api_backup1}?type=json&id={song_id}"
                json_str = self._fetch(xfabe_api_url)
                data = json.loads(json_str)
                
                if data.get("code") == 200 and "data" in data:
                    # 检查是否是完整歌曲（通过duration判断）
                    duration = data["data"].get("duration", 0)
                    candidate_url = data["data"].get("url", "")
                    if duration > 180000 and not self._is_trial_audio(candidate_url):  # 大于3分钟且不是试听
                        play_url = candidate_url
                        pic = data["data"].get("picurl", "")
                    else:
                        print(f"API3返回试听片段或无效，时长: {duration}ms")
            except Exception as e:
                print(f"备用API3失败: {e}")
        
        return play_url, pic

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
                r = self.session.post(url, data=data, headers=h, timeout=10)
            else:
                r = self.session.get(url, headers=h, timeout=10)
            r.encoding = "utf-8"
            return r.text
        except Exception as e:
            print(f"请求失败: {url}, 错误: {e}")
            return "{}"

    def _build_play_urls(self, vod, songs):
        qualities = [
            ["标准", "standard"],
            ["极高", "exhigh"],
            ["无损", "lossless"],
            ["Hi-Res", "hires"],
            ["高清环绕声", "jyeffect"],
            ["沉浸环绕声", "sky"],
            ["超清母带", "jymaster"]
        ]
        
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
        """单曲详情构建：TVBOX连播核心，同歌手100首歌"""
        vod = {
            "vod_id": parts[0],
            "vod_name": parts[1],
            "vod_pic": "",
            "vod_remarks": parts[2],
            "vod_actor": parts[3],
            "vod_year": parts[7]
        }
        
        try:
            json_str = self._fetch(f"{self.api_base}/album/detail?id={parts[5]}")
            data = json.loads(json_str)
            vod["vod_pic"] = (data.get("album", {}).get("picUrl", "")) + "?param=500y500"
        except:
            pass
        
        qualities = [
            ["标准", "standard"],
            ["极高", "exhigh"],
            ["无损", "lossless"],
            ["Hi-Res", "hires"],
            ["高清环绕声", "jyeffect"],
            ["沉浸环绕声", "sky"],
            ["超清母带", "jymaster"]
        ]
        
        play_from = []
        play_urls = []
        
        # 构建连播列表：当前单曲 + 同歌手10首热门歌
        singer_songs = [{"id": parts[0], "name": parts[1], "artist": parts[2]}]
        if singer_id:
            singer_songs += self._get_singer_hot_songs(singer_id, exclude_song_id=parts[0])[:9]
        
        # 为每个音质生成连播列表
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
        """获取歌手热门歌曲：TVBOX适配"""
        songs = []
        try:
            api_url = f"{self.api_base}/artists?id={singer_id}"
            json_str = self._fetch(api_url)
            data = json.loads(json_str)
            
            for s in data.get("hotSongs", []):
                song_id = str(s.get("id", ""))
                if song_id and song_id != str(exclude_song_id):
                    ar_names = "/".join([ar.get("name", "") for ar in s.get("ar", [])])
                    name = s.get("name", "未知歌曲")
                    songs.append({"id": song_id, "name": name, "artist": ar_names})
                    
                    if len(songs) >= 10:  # 最多10首
                        break
                        
        except Exception as e:
            print(f"获取歌手热门歌曲失败: {e}")
        
        return songs

    def _abs(self, url):
        return url if url.startswith("http") else (f"{self.host}{'/' if not url.startswith('/') else ''}{url}" if url else "")

    def _map_playlist_category(self, cat):
        """映射歌单分类名称"""
        cat_mapping = {
            "华语": "华语", "欧美": "欧美", "日语": "日语", "韩语": "韩语", "粤语": "粤语",
            "流行": "流行", "摇滚": "摇滚", "民谣": "民谣", "电子": "电子", "说唱": "说唱",
            "R&B": "R&B", "爵士": "爵士", "古典": "古典", "轻音乐": "轻音乐", "ACG": "ACG",
            "影视原声": "影视原声", "怀旧": "怀旧", "治愈": "治愈", "网络歌曲": "网络歌曲",
            "KTV热歌": "KTV热歌", "经典": "经典", "翻唱": "翻唱", "国风": "国风", "古风": "古风",
            "蓝调": "蓝调", "金属": "金属", "朋克": "朋克", "乡村": "乡村", "世界音乐": "世界音乐",
            "雷鬼": "雷鬼", "拉丁": "拉丁", "新世纪": "新世纪", "器乐": "器乐"
        }
        return cat_mapping.get(cat, cat)

    def _parse_toplist(self, api_url):
        videos = []
        try:
            json_str = self._fetch(api_url)
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
            print(f"解析排行榜失败: {e}")
        
        return videos

    def _parse_playlist(self, api_url, is_personalized=False):
        videos = []
        try:
            json_str = self._fetch(api_url)
            data = json.loads(json_str)
            
            if is_personalized:
                items = data.get("result", [])
            else:
                items = data.get("playlists", [])
            
            for it in items:
                videos.append({
                    "vod_id": f"playlist_{it['id']}",
                    "vod_name": it["name"],
                    "vod_pic": (it.get("picUrl") or it.get("coverImgUrl", "")) + "?param=300y300",
                    "vod_remarks": f"播放: {self._format_count(it.get('playCount', 0))}"
                })
        except Exception as e:
            print(f"解析歌单失败: {e}")
        
        return videos

    # ================= 随机音乐功能 =================
    
    def _get_random_music(self, pg, limit):
        """获取随机音乐"""
        videos = []
        try:
            # 随机音乐API，每页limit参数控制数量
            api_url = f"{self.random_api}?limit={limit}"
            json_str = self._fetch(api_url)
            data = json.loads(json_str)
            
            # 解析返回的歌曲数据
            if "data" in data and isinstance(data["data"], list):
                for song in data["data"]:
                    song_id = song.get("id", "")
                    song_name = song.get("name", "未知歌曲")
                    
                    # 处理歌手信息
                    artists = song.get("artists", [])
                    ar_names = "/".join([ar.get("name", "") for ar in artists])
                    
                    # 处理专辑信息
                    album = song.get("album", {})
                    album_id = album.get("id", "")
                    album_name = album.get("name", "")
                    
                    # 封面图片
                    pic_url = album.get("picUrl", "") or song.get("picUrl", "")
                    
                    # 构建ID部分（与搜索结果的格式保持一致）
                    id_parts = [
                        str(song_id),
                        song_name,
                        ar_names,
                        ar_names,
                        str(artists[0]["id"]) if artists else "",
                        str(album_id),
                        album_name,
                        str(song.get("publishTime", "") // 1000)[:4] if song.get("publishTime") else "",
                        str(song.get("mv", 0))
                    ]
                    
                    videos.append({
                        "vod_id": "@".join(id_parts),
                        "vod_name": song_name,
                        "vod_pic": f"{pic_url}?param=300y300" if pic_url else "",
                        "vod_remarks": f"随机推荐 | {ar_names}"
                    })
            else:
                # 备用方案：从热门歌曲中随机
                videos = self._get_fallback_random_music(limit)
                
        except Exception as e:
            print(f"获取随机音乐失败: {e}")
            # 失败时使用备用方案
            videos = self._get_fallback_random_music(limit)
        
        return videos
    
    def _get_fallback_random_music(self, limit):
        """备用随机音乐方案：从热门歌曲中获取"""
        videos = []
        try:
            # 获取热门歌曲列表
            api_url = f"{self.api_base}/top/song?type=0&limit={limit*2}"
            json_str = self._fetch(api_url)
            data = json.loads(json_str)
            
            if "data" in data:
                songs = data["data"]
                # 随机选择limit首歌
                if len(songs) > limit:
                    songs = random.sample(songs, limit)
                
                for song in songs:
                    song_id = song.get("id", "")
                    song_name = song.get("name", "未知歌曲")
                    
                    artists = song.get("artists", [])
                    ar_names = "/".join([ar.get("name", "") for ar in artists])
                    
                    album = song.get("album", {})
                    pic_url = album.get("picUrl", "")
                    
                    id_parts = [
                        str(song_id),
                        song_name,
                        ar_names,
                        ar_names,
                        str(artists[0]["id"]) if artists else "",
                        str(album.get("id", "")),
                        album.get("name", ""),
                        "",
                        str(song.get("mv", 0))
                    ]
                    
                    videos.append({
                        "vod_id": "@".join(id_parts),
                        "vod_name": song_name,
                        "vod_pic": f"{pic_url}?param=300y300" if pic_url else "",
                        "vod_remarks": f"热门歌曲 | {ar_names}"
                    })
                    
        except Exception as e:
            print(f"备用随机音乐获取失败: {e}")
        
        return videos[:limit]

    # ================= MV连播功能 =================
    
    def _build_mv_detail_with_singer_mvs(self, mv_id):
        """MV详情页 - 包含同歌手其他MV"""
        vod = {
            "vod_id": f"mv_{mv_id}",
            "vod_name": "",
            "vod_pic": "",
            "vod_content": "",
            "vod_play_from": "MV播放",
            "vod_play_url": ""
        }
        
        try:
            # 获取MV详情
            detail_url = f"{self.api_base}/mv/detail?mvid={mv_id}"
            json_str = self._fetch(detail_url)
            detail_data = json.loads(json_str)
            
            if "data" not in detail_data:
                raise Exception("MV详情无数据")
                
            mv_data = detail_data["data"]
            vod["vod_name"] = mv_data.get("name", "MV")
            
            # 获取封面
            cover_url = mv_data.get("cover", "") or mv_data.get("imgurl", "") or mv_data.get("imgurl16v9", "")
            if cover_url:
                vod["vod_pic"] = f"{cover_url}?param=500y500"
            
            # 获取艺术家信息
            artists = []
            artist_id = None
            if "artists" in mv_data and mv_data["artists"]:
                for artist in mv_data["artists"]:
                    artists.append(artist.get("name", ""))
                artist_id = mv_data["artists"][0].get("id")
            
            # 构建描述
            desc = []
            if artists:
                desc.append(f"歌手: {', '.join(artists)}")
            if mv_data.get("playCount"):
                desc.append(f"播放: {self._format_count(mv_data['playCount'])}")
            
            vod["vod_content"] = "\n".join(desc)
            
            # 构建连播列表：当前MV + 同歌手其他MV
            play_urls = [f"{vod['vod_name']}$mv_{mv_id}"]
            
            # 获取同歌手MV（最多9首，加上当前共10首）
            if artist_id:
                singer_mvs = self._get_artist_mvs_for_playlist(artist_id, exclude_mv_id=mv_id)
                for mv in singer_mvs:
                    play_urls.append(f"{mv['name']}$mv_{mv['id']}")
            
            vod["vod_play_url"] = "#".join(play_urls)
                
        except Exception as e:
            print(f"获取MV详情失败: {e}")
            vod["vod_name"] = f"MV {mv_id}"
            vod["vod_play_url"] = f"MV{mv_id}$mv_{mv_id}"
        
        return {"list": [vod]}
    
    def _get_artist_mvs_for_playlist(self, artist_id, exclude_mv_id=""):
        """获取歌手MV用于播放列表"""
        mvs = []
        try:
            # 获取歌手MV列表
            api_url = f"{self.api_base}/artist/mv?id={artist_id}"
            json_str = self._fetch(api_url)
            data = json.loads(json_str)
            
            # 处理返回的MV数据
            mv_list = []
            if "mvs" in data:
                mv_list = data["mvs"]
            elif "data" in data:
                mv_list = data["data"]
            
            for mv in mv_list:
                mv_id = str(mv.get("id", ""))
                if mv_id and mv_id != str(exclude_mv_id):
                    name = mv.get("name", "未知MV")
                    # 获取艺术家名字
                    artist_name = ""
                    if "artistName" in mv:
                        artist_name = mv["artistName"]
                    elif "artists" in mv and mv["artists"]:
                        artist_name = mv["artists"][0].get("name", "")
                    
                    mvs.append({
                        "id": mv_id,
                        "name": f"{name} - {artist_name}" if artist_name else name
                    })
                    
                    if len(mvs) >= 9:  # 最多9首，加上当前MV共10首
                        break
                        
        except Exception as e:
            print(f"获取歌手MV失败: {e}")
        
        return mvs

    # ================= 歌手分类二级筛选方法 =================

    def _load_complete_pinyin_dict(self):
        """加载拼音字典"""
        pinyin_dict = {}
        
        common_surnames = {
            'A': ['阿', '艾', '安', '敖'],
            'B': ['白', '包', '鲍', '毕'],
            'C': ['陈', '程', '蔡', '曹'],
            'D': ['邓', '丁', '董', '杜'],
            'E': ['鄂', '尔', '俄', '恩'],
            'F': ['冯', '范', '方', '傅'],
            'G': ['郭', '高', '顾', '龚'],
            'H': ['黄', '何', '韩', '胡'],
            'J': ['金', '蒋', '贾', '江'],
            'K': ['孔', '康', '柯', '邝'],
            'L': ['李', '刘', '林', '梁'],
            'M': ['马', '毛', '孟', '莫'],
            'N': ['倪', '聂', '牛', '农'],
            'O': ['欧', '欧阳', '区'],
            'P': ['潘', '彭', '庞', '裴'],
            'Q': ['钱', '秦', '邱', '齐'],
            'R': ['任', '阮', '荣', '茹'],
            'S': ['孙', '沈', '宋', '苏'],
            'T': ['唐', '田', '陶', '谭'],
            'W': ['汪', '王', '魏', '卫'],
            'X': ['许', '徐', '谢', '萧'],
            'Y': ['杨', '叶', '余', '袁'],
            'Z': ['张', '赵', '周', '郑']
        }
        
        for letter, chars in common_surnames.items():
            for char in chars:
                pinyin_dict[char] = letter
        
        return pinyin_dict
    
    def _get_pinyin_initial(self, chinese_char):
        """获取汉字拼音首字母"""
        if chinese_char in self.pinyin_dict:
            return self.pinyin_dict[chinese_char]
        
        if '\u4e00' <= chinese_char <= '\u9fff':
            pinyin_initial_map = {
                '阿': 'A', '八': 'B', '擦': 'C', '大': 'D', '额': 'E',
                '发': 'F', '嘎': 'G', '哈': 'H', '机': 'J', '卡': 'K',
                '拉': 'L', '妈': 'M', '拿': 'N', '哦': 'O', '怕': 'P',
                '七': 'Q', '日': 'R', '撒': 'S', '他': 'T', '哇': 'W',
                '西': 'X', '压': 'Y', '咋': 'Z'
            }
            
            for key, value in pinyin_initial_map.items():
                if ord(chinese_char) >= ord(key[0]):
                    return value
        
        return chinese_char.upper()

    def _get_artists_independent_filters(self, extend, pg, limit):
        """独立的歌手筛选方法 - 支持地区、性别、字母三级筛选"""
        offset = (pg - 1) * limit
        
        area = extend.get("area", "-1")
        genre = extend.get("genre", "-1")
        letter = extend.get("letter", "-1")
        
        print(f"筛选参数 - 地区: {area}, 性别: {genre}, 字母: {letter}")
        
        videos = []
        
        if area == "-1" and genre == "-1" and letter == "-1":
            videos = self._get_hot_artists_simple(pg, limit)
        
        elif area == "-1" and genre == "-1" and letter != "-1":
            videos = self._get_artists_by_letter_only(letter, pg, limit)
        
        elif area != "-1" and genre == "-1" and letter == "-1":
            videos = self._get_artists_by_area_only(area, pg, limit)
        
        elif area == "-1" and genre != "-1" and letter == "-1":
            videos = self._get_artists_by_genre_only(genre, pg, limit)
        
        elif area != "-1" and genre == "-1" and letter != "-1":
            videos = self._get_artists_by_area_and_letter(area, letter, pg, limit)
        
        elif area == "-1" and genre != "-1" and letter != "-1":
            videos = self._get_artists_by_genre_and_letter(genre, letter, pg, limit)
        
        elif area != "-1" and genre != "-1" and letter == "-1":
            videos = self._get_artists_by_area_and_genre(area, genre, pg, limit)
        
        elif area != "-1" and genre != "-1" and letter != "-1":
            videos = self._get_artists_by_all_filters(area, genre, letter, pg, limit)
        
        return videos[:limit]
    
    def _get_hot_artists_simple(self, pg, limit):
        """获取热门歌手"""
        offset = (pg - 1) * limit
        videos = []
        
        try:
            api_url = f"{self.api_base}/top/artists?limit={limit}&offset={offset}"
            json_str = self._fetch(api_url)
            data = json.loads(json_str)
            
            if "artists" in data:
                for artist in data["artists"]:
                    videos.append(self._format_artist_item_square(artist, "-1", "-1"))
        except Exception as e:
            print(f"获取热门歌手失败: {e}")
        
        return videos
    
    def _get_artists_by_letter_only(self, letter, pg, limit):
        """仅按字母筛选"""
        offset = (pg - 1) * limit
        videos = []
        
        try:
            if letter == "0":
                all_artists = self._get_hot_artists_simple(pg, limit * 3)
                for artist_data in all_artists:
                    if len(videos) >= limit:
                        break
                    name = artist_data.get("vod_name", "")
                    if name:
                        first_char = name[0]
                        if first_char.isdigit() or not first_char.isalpha():
                            videos.append(artist_data)
            else:
                params = {"limit": limit, "offset": offset, "initial": letter.upper()}
                param_str = "&".join([f"{k}={v}" for k, v in params.items()])
                api_url = f"{self.api_base}/artist/list?{param_str}"
                
                json_str = self._fetch(api_url)
                data = json.loads(json_str)
                
                if "artists" in data:
                    for artist in data["artists"]:
                        videos.append(self._format_artist_item_square(artist, "-1", "-1"))
        except Exception as e:
            print(f"按字母筛选歌手失败: {e}")
        
        if len(videos) < limit:
            all_artists = self._get_hot_artists_simple(pg, limit * 3)
            for artist_data in all_artists:
                if len(videos) >= limit:
                    break
                
                existing_ids = {v["vod_id"] for v in videos}
                if artist_data["vod_id"] in existing_ids:
                    continue
                
                name = artist_data.get("vod_name", "")
                if letter == "0":
                    if name:
                        first_char = name[0]
                        if first_char.isdigit() or not first_char.isalpha():
                            videos.append(artist_data)
                else:
                    if name and self._match_letter_filter(name, letter):
                        videos.append(artist_data)
        
        return videos
    
    def _get_artists_by_area_only(self, area, pg, limit):
        """仅按地区筛选"""
        offset = (pg - 1) * limit
        videos = []
        
        area_map = {
            "7": "7",
            "96": "96",
            "16": "16",
            "8": "8"
        }
        
        if area in area_map:
            try:
                params = {"limit": limit, "offset": offset, "area": area_map[area]}
                param_str = "&".join([f"{k}={v}" for k, v in params.items()])
                api_url = f"{self.api_base}/artist/list?{param_str}"
                
                json_str = self._fetch(api_url)
                data = json.loads(json_str)
                
                if "artists" in data:
                    for artist in data["artists"]:
                        videos.append(self._format_artist_item_square(artist, area, "-1"))
            except Exception as e:
                print(f"按地区筛选歌手失败: {e}")
        
        if len(videos) < limit:
            all_artists = self._get_hot_artists_simple(pg, limit * 2)
            for artist_data in all_artists:
                if len(videos) >= limit:
                    break
                
                existing_ids = {v["vod_id"] for v in videos}
                if artist_data["vod_id"] in existing_ids:
                    continue
                
                videos.append(artist_data)
        
        return videos
    
    def _get_artists_by_genre_only(self, genre, pg, limit):
        """仅按性别筛选"""
        offset = (pg - 1) * limit
        videos = []
        
        genre_map = {
            "1": "1",
            "2": "2",
            "3": "3"
        }
        
        if genre in genre_map:
            try:
                params = {"limit": limit, "offset": offset, "type": genre_map[genre]}
                param_str = "&".join([f"{k}={v}" for k, v in params.items()])
                api_url = f"{self.api_base}/artist/list?{param_str}"
                
                json_str = self._fetch(api_url)
                data = json.loads(json_str)
                
                if "artists" in data:
                    for artist in data["artists"]:
                        videos.append(self._format_artist_item_square(artist, "-1", genre))
            except Exception as e:
                print(f"按性别筛选歌手失败: {e}")
        
        if len(videos) < limit:
            all_artists = self._get_hot_artists_simple(pg, limit * 2)
            for artist_data in all_artists:
                if len(videos) >= limit:
                    break
                
                existing_ids = {v["vod_id"] for v in videos}
                if artist_data["vod_id"] in existing_ids:
                    continue
                
                videos.append(artist_data)
        
        return videos
    
    def _get_artists_by_area_and_letter(self, area, letter, pg, limit):
        """按地区和字母筛选"""
        offset = (pg - 1) * limit
        videos = []
        
        area_map = {
            "7": "7",
            "96": "96",
            "16": "16",
            "8": "8"
        }
        
        if area in area_map and letter != "-1":
            try:
                params = {"limit": limit, "offset": offset, "area": area_map[area]}
                
                if letter != "0":
                    params["initial"] = letter.upper()
                
                param_str = "&".join([f"{k}={v}" for k, v in params.items()])
                api_url = f"{self.api_base}/artist/list?{param_str}"
                
                json_str = self._fetch(api_url)
                data = json.loads(json_str)
                
                if "artists" in data:
                    for artist in data["artists"]:
                        videos.append(self._format_artist_item_square(artist, area, "-1"))
            except Exception as e:
                print(f"按地区和字母筛选歌手失败: {e}")
        
        if len(videos) < limit:
            area_artists = self._get_artists_by_area_only(area, pg, limit * 2)
            for artist_data in area_artists:
                if len(videos) >= limit:
                    break
                
                existing_ids = {v["vod_id"] for v in videos}
                if artist_data["vod_id"] in existing_ids:
                    continue
                
                name = artist_data.get("vod_name", "")
                if letter == "0":
                    if name:
                        first_char = name[0]
                        if first_char.isdigit() or not first_char.isalpha():
                            videos.append(artist_data)
                else:
                    if name and self._match_letter_filter(name, letter):
                        videos.append(artist_data)
        
        return videos
    
    def _get_artists_by_genre_and_letter(self, genre, letter, pg, limit):
        """按性别和字母筛选"""
        offset = (pg - 1) * limit
        videos = []
        
        genre_map = {
            "1": "1",
            "2": "2",
            "3": "3"
        }
        
        if genre in genre_map and letter != "-1":
            try:
                params = {"limit": limit, "offset": offset, "type": genre_map[genre]}
                
                if letter != "0":
                    params["initial"] = letter.upper()
                
                param_str = "&".join([f"{k}={v}" for k, v in params.items()])
                api_url = f"{self.api_base}/artist/list?{param_str}"
                
                json_str = self._fetch(api_url)
                data = json.loads(json_str)
                
                if "artists" in data:
                    for artist in data["artists"]:
                        videos.append(self._format_artist_item_square(artist, "-1", genre))
            except Exception as e:
                print(f"按性别和字母筛选歌手失败: {e}")
        
        if len(videos) < limit:
            genre_artists = self._get_artists_by_genre_only(genre, pg, limit * 2)
            for artist_data in genre_artists:
                if len(videos) >= limit:
                    break
                
                existing_ids = {v["vod_id"] for v in videos}
                if artist_data["vod_id"] in existing_ids:
                    continue
                
                name = artist_data.get("vod_name", "")
                if letter == "0":
                    if name:
                        first_char = name[0]
                        if first_char.isdigit() or not first_char.isalpha():
                            videos.append(artist_data)
                else:
                    if name and self._match_letter_filter(name, letter):
                        videos.append(artist_data)
        
        return videos
    
    def _get_artists_by_area_and_genre(self, area, genre, pg, limit):
        """按地区和性别筛选"""
        offset = (pg - 1) * limit
        videos = []
        
        area_map = {
            "7": "7",
            "96": "96",
            "16": "16",
            "8": "8"
        }
        
        genre_map = {
            "1": "1",
            "2": "2",
            "3": "3"
        }
        
        if area in area_map and genre in genre_map:
            try:
                params = {"limit": limit, "offset": offset, 
                         "area": area_map[area], "type": genre_map[genre]}
                
                param_str = "&".join([f"{k}={v}" for k, v in params.items()])
                api_url = f"{self.api_base}/artist/list?{param_str}"
                
                json_str = self._fetch(api_url)
                data = json.loads(json_str)
                
                if "artists" in data:
                    for artist in data["artists"]:
                        videos.append(self._format_artist_item_square(artist, area, genre))
            except Exception as e:
                print(f"按地区和性别筛选歌手失败: {e}")
        
        if len(videos) < limit:
            area_artists = self._get_artists_by_area_only(area, pg, limit * 2)
            for artist_data in area_artists:
                if len(videos) >= limit:
                    break
                
                existing_ids = {v["vod_id"] for v in videos}
                if artist_data["vod_id"] in existing_ids:
                    continue
                
                videos.append(artist_data)
        
        return videos
    
    def _get_artists_by_all_filters(self, area, genre, letter, pg, limit):
        """按所有条件筛选"""
        offset = (pg - 1) * limit
        videos = []
        
        area_map = {
            "7": "7",
            "96": "96",
            "16": "16",
            "8": "8"
        }
        
        genre_map = {
            "1": "1",
            "2": "2",
            "3": "3"
        }
        
        if area in area_map and genre in genre_map and letter != "-1":
            try:
                params = {"limit": limit, "offset": offset, 
                         "area": area_map[area], "type": genre_map[genre]}
                
                if letter != "0":
                    params["initial"] = letter.upper()
                
                param_str = "&".join([f"{k}={v}" for k, v in params.items()])
                api_url = f"{self.api_base}/artist/list?{param_str}"
                
                json_str = self._fetch(api_url)
                data = json.loads(json_str)
                
                if "artists" in data:
                    for artist in data["artists"]:
                        videos.append(self._format_artist_item_square(artist, area, genre))
            except Exception as e:
                print(f"按所有条件筛选歌手失败: {e}")
        
        if len(videos) < limit:
            area_genre_artists = self._get_artists_by_area_and_genre(area, genre, pg, limit * 2)
            for artist_data in area_genre_artists:
                if len(videos) >= limit:
                    break
                
                existing_ids = {v["vod_id"] for v in videos}
                if artist_data["vod_id"] in existing_ids:
                    continue
                
                name = artist_data.get("vod_name", "")
                if letter == "0":
                    if name:
                        first_char = name[0]
                        if first_char.isdigit() or not first_char.isalpha():
                            videos.append(artist_data)
                else:
                    if name and self._match_letter_filter(name, letter):
                        videos.append(artist_data)
        
        return videos
    
    def _match_letter_filter(self, name, letter):
        """匹配字母筛选"""
        if not name:
            return False
        
        if letter == "-1":
            return True
        
        if letter == "0":
            first_char = name[0]
            if first_char.isdigit() or not first_char.isalpha():
                return True
            return False
        
        first_char = name[0]
        
        if first_char.isalpha() and first_char.upper() == letter.upper():
            return True
        
        if '\u4e00' <= first_char <= '\u9fff':
            pinyin_initial = self._get_pinyin_initial(first_char)
            if pinyin_initial == letter.upper():
                return True
        
        return False
    
    def _format_artist_item_square(self, artist, area, genre):
        """格式化歌手项目为方形显示"""
        img_url = artist.get("picUrl") or artist.get("img1v1Url", "")
        if img_url and not img_url.startswith("http"):
            img_url = "https:" + img_url
        
        remarks = []
        
        area_names = {
            "-1": "",
            "7": "华语",
            "96": "欧美", 
            "16": "韩国",
            "8": "日本"
        }
        
        if area != "-1":
            area_name = area_names.get(area, "")
            if area_name:
                remarks.append(area_name)
        
        genre_names = {
            "-1": "",
            "1": "男",
            "2": "女",
            "3": "组合"
        }
        
        if genre != "-1":
            genre_name = genre_names.get(genre, "")
            if genre_name:
                remarks.append(genre_name)
        
        album_size = artist.get('albumSize', 0)
        music_size = artist.get('musicSize', 0)
        
        if album_size > 0:
            remarks.append(f"专辑:{album_size}")
        if music_size > 0:
            remarks.append(f"歌曲:{music_size}")
        
        name = artist.get("name", "")
        if name and '\u4e00' <= name[0] <= '\u9fff':
            pinyin_initial = self._get_pinyin_initial(name[0])
            remarks.append(f"拼音:{pinyin_initial}")
        
        remark_str = " | ".join([r for r in remarks if r])
        
        return {
            "vod_id": f"artist_{artist['id']}",
            "vod_name": artist.get("name", "未知歌手"),
            "vod_pic": f"{img_url}?param=300y300" if img_url else "",
            "vod_remarks": remark_str,
            "style": {"type": "rect", "ratio": 1}
        }

    # ================= MV相关方法 =================
    
    def _get_mv_simple(self, area, mv_type, pg, limit):
        """简化版MV获取函数，TVBOX适配"""
        offset = (pg - 1) * limit
        videos = []
        
        try:
            api_url = f"{self.api_base}/mv/all"
            params = {"limit": limit, "offset": offset}
            
            # 地区筛选
            area_map = {
                "mainland": "内地",
                "hktw": "港台", 
                "europe": "欧美",
                "japan": "日本",
                "korea": "韩国"
            }
            
            if area != "all" and area in area_map:
                params["area"] = area_map[area]
            
            # 类型筛选
            if mv_type == "new":
                params["order"] = "最新"
            elif mv_type == "hot":
                params["order"] = "最热"
            elif mv_type == "recommend":
                # 使用推荐MV接口
                api_url = f"{self.api_base}/mv/exclusive/rcmd"
            
            param_str = "&".join([f"{k}={v}" for k, v in params.items()])
            full_url = f"{api_url}?{param_str}"
            
            json_str = self._fetch(full_url)
            data = json.loads(json_str)
            
            if "data" in data:
                mv_list = data["data"]
                if isinstance(mv_list, list):
                    for mv in mv_list:
                        videos.append(self._format_mv_item_simple(mv))
                elif isinstance(mv_list, dict) and "data" in mv_list:
                    for mv in mv_list["data"]:
                        videos.append(self._format_mv_item_simple(mv))
            
        except Exception as e:
            print(f"获取MV失败: {e}")
        
        return videos[:limit]
    
    def _format_mv_item_simple(self, mv):
        """简化版MV格式化，TVBOX适配"""
        mv_id = mv.get("id", "")
        name = mv.get("name", "未知MV")
        artist_name = mv.get("artistName", "") or mv.get("creator", {}).get("nickname", "") or mv.get("artists", [{}])[0].get("name", "")
        
        cover_url = mv.get("cover", "") or mv.get("imgurl", "") or mv.get("imgurl16v9", "")
        
        remarks = ["MV"]
        
        if artist_name:
            remarks.append(artist_name)
        
        play_count = mv.get("playCount", 0)
        if play_count > 0:
            remarks.append(f"播放:{self._format_count(play_count)}")
        
        duration = mv.get("duration", 0)
        if duration > 0:
            remarks.append(self._format_duration(duration))
        
        remark_str = " | ".join(remarks)
        
        return {
            "vod_id": f"mv_{mv_id}",
            "vod_name": name,
            "vod_pic": f"{cover_url}?param=300y300" if cover_url else "",
            "vod_remarks": remark_str
        }
    
    def _get_mv_player_content(self, mv_id):
        """获取MV播放内容：TVBOX适配，简化解析"""
        try:
            # 方法1：使用原API
            params = {
                "key": self.mv_api_key,
                "id": mv_id,
                "type": "mv"
            }
            
            param_str = "&".join([f"{k}={v}" for k, v in params.items()])
            api_url = f"{self.mv_api}?{param_str}"
            
            response = self.session.get(api_url, headers=self.headers, timeout=10)
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    
                    if data.get("code") == 200 or data.get("status") == "success":
                        play_url = ""
                        possible_url_fields = ["url", "data", "video_url", "play_url", "link"]
                        for field in possible_url_fields:
                            if field in data and data[field]:
                                if isinstance(data[field], str) and data[field].startswith("http"):
                                    play_url = data[field]
                                    break
                                elif isinstance(data[field], dict):
                                    for sub_field in ["url", "link", "video_url"]:
                                        if sub_field in data[field] and data[field][sub_field]:
                                            play_url = data[field][sub_field]
                                            break
                                    if play_url:
                                        break
                        
                        if play_url and play_url.startswith(("http://", "https://")):
                            # 获取MV封面
                            pic = ""
                            try:
                                detail_url = f"{self.api_base}/mv/detail?mvid={mv_id}"
                                detail_json = self._fetch(detail_url)
                                detail_data = json.loads(detail_json)
                                
                                if "data" in detail_data:
                                    mv_data = detail_data["data"]
                                    pic = mv_data.get("cover", "") or mv_data.get("imgurl", "") or mv_data.get("imgurl16v9", "")
                            except:
                                pass
                            
                            return {
                                "parse": 0,
                                "url": play_url,
                                "header": json.dumps(self.headers),
                                "pic": pic,
                                "lrc": ""
                            }
                
                except json.JSONDecodeError:
                    # 如果返回的不是JSON，可能是直连视频
                    content_type = response.headers.get('Content-Type', '')
                    if 'video' in content_type or 'mp4' in content_type or 'm3u8' in content_type:
                        return {
                            "parse": 0,
                            "url": api_url,
                            "header": json.dumps(self.headers),
                            "pic": "",
                            "lrc": ""
                        }
        
        except Exception as e:
            print(f"获取MV播放地址失败: {e}")
        
        # 备用方案：使用ncm.zhenxin.me API
        return self._get_mv_backup_url(mv_id)
    
    def _get_mv_backup_url(self, mv_id):
        """MV备用播放地址获取"""
        try:
            play_url = f"{self.api_base}/mv/url?id={mv_id}"
            json_str = self._fetch(play_url)
            data = json.loads(json_str)
            
            if "data" in data and "url" in data["data"]:
                mv_url = data["data"]["url"]
                
                if mv_url and mv_url.startswith(("http://", "https://")):
                    # 获取MV封面
                    pic = ""
                    try:
                        detail_url = f"{self.api_base}/mv/detail?mvid={mv_id}"
                        detail_json = self._fetch(detail_url)
                        detail_data = json.loads(detail_json)
                        
                        if "data" in detail_data:
                            mv_data = detail_data["data"]
                            pic = mv_data.get("cover", "") or mv_data.get("imgurl", "") or mv_data.get("imgurl16v9", "")
                    except:
                        pass
                    
                    return {
                        "parse": 0,
                        "url": mv_url,
                        "header": json.dumps(self.headers),
                        "pic": pic,
                        "lrc": ""
                    }
        except Exception as e:
            print(f"获取MV备用地址失败: {e}")
        
        # 兜底返回
        return {
            "parse": 0,
            "url": "",
            "header": json.dumps(self.headers),
            "pic": "",
            "lrc": ""
        }
    
    def _format_duration(self, duration_ms):
        """时长格式化：TVBOX显示适配"""
        if not duration_ms or duration_ms < 1000:
            return "0:00"
        
        total_seconds = duration_ms // 1000
        minutes = total_seconds // 60
        seconds = total_seconds % 60
        return f"{minutes}:{seconds:02d}"
    
    def _get_lyrics_by_song_id(self, song_id):
        """获取歌词"""
        if not song_id or not song_id.isdigit():
            return ""
        
        try:
            lyric_url = f"{self.lyric_api}?id={song_id}"
            response = self._fetch(lyric_url)
            data = json.loads(response)
            
            lrc = ""
            
            lyric_fields = ["lrc", "lyric", "klyric", "tlyric", "lyrics"]
            
            if isinstance(data, str) and "[" in data and "]" in data:
                lrc = data
            
            elif isinstance(data, dict) and "data" in data:
                lyric_data = data["data"]
                if isinstance(lyric_data, dict):
                    for field in lyric_fields:
                        if field in lyric_data:
                            if isinstance(lyric_data[field], dict) and "lyric" in lyric_data[field]:
                                lrc = lyric_data[field]["lyric"]
                                break
                            elif isinstance(lyric_data[field], str):
                                lrc = lyric_data[field]
                                break
                elif isinstance(lyric_data, str) and "[" in lyric_data and "]" in lyric_data:
                    lrc = lyric_data
            
            elif isinstance(data, dict):
                for field in lyric_fields:
                    if field in data:
                        if isinstance(data[field], dict) and "lyric" in data[field]:
                            lrc = data[field]["lyric"]
                            break
                        elif isinstance(data[field], str):
                            lrc = data[field]
                            break
            
            if lrc:
                lrc = lrc.strip()
                
                if lrc.startswith('{') and lrc.endswith('}'):
                    try:
                        lrc_json = json.loads(lrc)
                        if isinstance(lrc_json, dict):
                            for field in lyric_fields:
                                if field in lrc_json:
                                    if isinstance(lrc_json[field], dict) and "lyric" in lrc_json[field]:
                                        lrc = lrc_json[field]["lyric"]
                                        break
                                    elif isinstance(lrc_json[field], str):
                                        lrc = lrc_json[field]
                                        break
                    except:
                        pass
                
                if lrc and "[" in lrc and "]" in lrc:
                    return lrc
                elif lrc:
                    lines = lrc.split('\n')
                    formatted_lines = []
                    line_num = 0
                    for line in lines:
                        line = line.strip()
                        if line and not line.startswith('['):
                            time_tag = f"[00:{line_num:02d}.00]"
                            formatted_lines.append(f"{time_tag}{line}")
                            line_num += 1
                    return '\n'.join(formatted_lines)
                
            return lrc or ""
            
        except Exception as e:
            print(f"获取歌词失败 - 歌曲ID: {song_id}, 错误: {e}")
            return ""