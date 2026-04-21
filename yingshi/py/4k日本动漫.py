import sys, re, requests, urllib.parse
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry
from base.spider import Spider

requests.packages.urllib3.disable_warnings()

class Spider(Spider):
    def getName(self): return "Hstream"

    def init(self, extend=""):
        self.siteUrl = "https://hstream.moe"
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': self.siteUrl + '/',
            'Origin': self.siteUrl,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
        }
        self.sess = requests.Session()
        adapter = HTTPAdapter(
            max_retries=Retry(total=2, backoff_factor=0.5, status_forcelist=[500, 502, 503, 504]),
            pool_connections=10,
            pool_maxsize=20
        )
        self.sess.mount('https://', adapter)

    def fetch(self, url):
        try: 
            return self.sess.get(url, headers=self.headers, timeout=10, verify=False)
        except: 
            return None

    def homeContent(self, filter):
        cats = [
            {"type_id": "recently-uploaded", "type_name": "最近上传"},
            {"type_id": "recently-released", "type_name": "最新发布"},
            {"type_id": "view-count", "type_name": "最多观看"},
            {"type_id": "tag_uncensored", "type_name": "步兵无码"},
            {"type_id": "tag_milf", "type_name": "人妻(Milf)"},
            {"type_id": "tag_school-girl", "type_name": "学生妹"},
            {"type_id": "tag_big-boobs", "type_name": "巨乳(Boobs)"},
            {"type_id": "tag_succubus", "type_name": "魅魔"},
            {"type_id": "tag_tentacle", "type_name": "触手"},
            {"type_id": "tag_maid", "type_name": "女仆"},
            {"type_id": "tag_bdsm", "type_name": "调教(BDSM)"},
            {"type_id": "tag_elf", "type_name": "精灵(Elf)"},
            {"type_id": "tag_4k-48fps", "type_name": "4K专区"}
        ]
        return {'class': cats}

    def categoryContent(self, tid, pg, filter, extend):
        if tid.startswith("tag_"):
            tag_slug = tid.replace("tag_", "")
            url = f"{self.siteUrl}/search?order=recently-uploaded&tags%5B0%5D={tag_slug}&page={pg}"
        else:
            url = f"{self.siteUrl}/search?order={tid}&page={pg}"
        return self.postList(url, int(pg))

    def searchContent(self, key, quick, pg=1):
        url = f"{self.siteUrl}/search?search={key}&page={pg}"
        return self.postList(url, int(pg))

    def postList(self, url, pg):
        r = self.fetch(url)
        l = []
        total_pages = pg
        
        if r and r.ok:
            pagination_match = re.search(r'<nav[^>]*class=["\']pagination["\'][^>]*>(.*?)</nav>', r.text, re.S)
            if pagination_match:
                page_links = re.findall(r'<a[^>]*href=["\'][^"\']*page=(\d+)["\'][^>]*>', pagination_match.group(1))
                active_page = re.search(r'<li[^>]*class=["\']active["\'][^>]*>.*?(\d+).*?</li>', pagination_match.group(1), re.S)
                
                if page_links:
                    max_page = max([int(p) for p in page_links])
                    total_pages = max_page
                elif active_page:
                    total_text = re.search(r'共\s*(\d+)\s*页', pagination_match.group(1))
                    if total_text:
                        total_pages = int(total_text.group(1))
            
            if total_pages == pg:
                json_match = re.search(r'window\.__INITIAL_STATE__\s*=\s*({[^;]+});', r.text)
                if json_match:
                    try:
                        import json
                        state_data = json.loads(json_match.group(1))
                        if 'pagination' in state_data:
                            pagination = state_data['pagination']
                            if 'totalPages' in pagination:
                                total_pages = int(pagination['totalPages'])
                            elif 'total' in pagination and 'perPage' in pagination:
                                total_pages = (int(pagination['total']) + int(pagination['perPage']) - 1) // int(pagination['perPage'])
                        elif 'total' in state_data and 'perPage' in state_data:
                            total_pages = (int(state_data['total']) + int(state_data['perPage']) - 1) // int(state_data['perPage'])
                        elif 'totalPages' in state_data:
                            total_pages = int(state_data['totalPages'])
                    except:
                        pass
            
            if total_pages == pg:
                next_match = re.search(r'<a[^>]*rel=["\']next["\'][^>]*>', r.text, re.I)
                if next_match:
                    total_pages = pg + 1
                else:
                    total_pages = pg
            
            blocks = re.findall(r'<a[^>]*href=["\'][^"\']*/hentai/([^"\']+)["\'][^>]*>(.*?)</a>', r.text, re.S)
            seen = set()
            for block in blocks:
                vod_id = block[0]
                if vod_id in seen: continue
                seen.add(vod_id)
                
                inner_html = block[1]
                
                pic_match = re.search(r'src=["\']([^"\']+)["\']', inner_html)
                vod_pic = pic_match.group(1) if pic_match else f"{self.siteUrl}/images/default-avatar.webp"
                if not vod_pic.startswith("http"): vod_pic = f"{self.siteUrl}{vod_pic}"
                
                t_match = re.search(r'alt=["\']([^"\']+)["\']', inner_html)
                vod_name = t_match.group(1) if t_match else re.sub(r'<[^>]+>', '', inner_html).strip()
                if not vod_name: vod_name = vod_id

                l.append({
                    'vod_id': f"{vod_id}@@@{vod_name}@@@{vod_pic}",
                    'vod_name': vod_name,
                    'vod_pic': vod_pic,
                    'vod_remarks': '4K/FHD',
                    'style': {"type": "rect", "ratio": 1.33}
                })
                
        return {'list': l, 'page': pg, 'pagecount': total_pages, 'limit': 24, 'total': total_pages * 24}

    def detailContent(self, ids):
        vid = ids[0]
        name, pic = vid, ""
        
        if "@@@" in vid:
            parts = vid.split("@@@")
            vid = parts[0]
            name = parts[1] if len(parts) > 1 else name
            pic = parts[2] if len(parts) > 2 else pic

        page_url = f"{self.siteUrl}/hentai/{vid}"
        r = self.fetch(page_url)
        
        has_4k = False
        if r and r.ok:
            if re.search(r'4K|2160|3840', r.text, re.I):
                has_4k = True
        
        play_list = []
        if has_4k:
            play_list.append(f"4K超清${vid}|4k/manifest.mpd")
        play_list.append(f"1080P高清${vid}|1080/manifest.mpd")
        play_list.append(f"720P流畅${vid}|720/manifest.mpd")

        vod = {
            'vod_id': ids[0],
            'vod_name': name,
            'vod_pic': pic,
            'type_name': '动漫',
            'vod_play_from': 'HStream',
            'vod_play_url': "#".join(play_list)
        }
        return {'list': [vod]}

    def playerContent(self, flag, id, vipFlags):
        id_parts = id.split("|")
        vid = id_parts[0]
        quality = id_parts[1] if len(id_parts) > 1 else "1080/manifest.mpd"

        page_url = f"{self.siteUrl}/hentai/{vid}"
        
        try:
            r = self.sess.get(page_url, headers=self.headers, verify=False, timeout=10)
            
            if not r.ok:
                return {"parse": 0, "url": f"error://page_error_{r.status_code}"}
            
            xsrf_cookie = self.sess.cookies.get('XSRF-TOKEN', '')
            if xsrf_cookie:
                xsrf_cookie = urllib.parse.unquote(xsrf_cookie)
                
            meta_token = ""
            token_match = re.search(r'<meta name="csrf-token" content="([^"]+)">', r.text)
            if token_match:
                meta_token = token_match.group(1)
            
            episode_id = None
            
            e_id_match = re.search(r'<input[^>]*id=["\']e_id["\'][^>]*value=["\'](\d+)["\']', r.text, re.I)
            if not e_id_match:
                e_id_match = re.search(r'value=["\'](\d+)["\'][^>]*id=["\']e_id["\']', r.text, re.I)
            
            if e_id_match:
                episode_id = e_id_match.group(1)
            
            if not episode_id:
                state_match = re.search(r'window\.__INITIAL_STATE__\s*=\s*({[^;]+});', r.text)
                if state_match:
                    try:
                        import json
                        state_data = json.loads(state_match.group(1))
                        if 'episode' in state_data and 'id' in state_data['episode']:
                            episode_id = str(state_data['episode']['id'])
                        elif 'currentEpisode' in state_data and 'id' in state_data['currentEpisode']:
                            episode_id = str(state_data['currentEpisode']['id'])
                    except:
                        pass
            
            if not episode_id:
                return {"parse": 0, "url": "error://no_episode_id"}
            
            api_headers = {
                'User-Agent': self.headers['User-Agent'],
                'Accept': 'application/json, text/plain, */*',
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': page_url,
                'Origin': self.siteUrl
            }
            
            if xsrf_cookie:
                api_headers['X-XSRF-TOKEN'] = xsrf_cookie
            if meta_token:
                api_headers['X-CSRF-TOKEN'] = meta_token
            
            payload = {"episode_id": int(episode_id)}
            api_url = f"{self.siteUrl}/player/api"
            
            try:
                api_res = self.sess.post(api_url, json=payload, headers=api_headers, timeout=10, verify=False)
            except requests.Timeout:
                return {"parse": 0, "url": "error://api_timeout"}
            except Exception as e:
                return {"parse": 0, "url": f"error://api_exception"}
            
            if api_res and api_res.status_code == 200:
                try:
                    data = api_res.json()
                    
                    stream_url = data.get("stream_url", "")
                    domains = data.get("stream_domains", [])
                    
                    if not domains:
                        domains = data.get("asia_stream_domains", [])
                    
                    if stream_url:
                        if stream_url.startswith('http'):
                            base_url = stream_url.rstrip('/')
                        elif domains and len(domains) > 0:
                            domain = domains[0].rstrip('/')
                            stream_path = stream_url.lstrip('/')
                            base_url = f"{domain}/{stream_path}"
                        else:
                            base_url = f"{self.siteUrl}/{stream_url.lstrip('/')}"
                        
                        if quality == "4k/manifest.mpd":
                            if "4k" in base_url.lower() or "2160" in base_url.lower():
                                play_url = f"{base_url}/{quality}"
                            else:
                                play_url = base_url.replace("/1080/", "/4k/").replace("/720/", "/4k/")
                                if not play_url.endswith(quality):
                                    play_url = f"{play_url.rstrip('/')}/{quality}"
                        else:
                            play_url = f"{base_url}/{quality}"
                        
                        if quality == "4k/manifest.mpd":
                            try:
                                test_res = self.sess.head(play_url, headers=self.headers, timeout=3, verify=False)
                                if test_res.status_code != 200:
                                    play_url = f"{base_url}/1080/manifest.mpd"
                                    quality = "1080/manifest.mpd"
                            except:
                                play_url = f"{base_url}/1080/manifest.mpd"
                                quality = "1080/manifest.mpd"
                        
                        return {
                            "parse": 0, 
                            "url": play_url, 
                            "header": {
                                "Referer": self.siteUrl + "/",
                                "User-Agent": self.headers['User-Agent']
                            }
                        }
                    else:
                        return {"parse": 0, "url": "error://no_stream_url"}
                        
                except ValueError:
                    return {"parse": 0, "url": "error://json_parse_failed"}
                except Exception as e:
                    return {"parse": 0, "url": f"error://data_error"}
            else:
                return {"parse": 0, "url": f"error://api_failed"}
                
        except requests.Timeout:
            return {"parse": 0, "url": "error://page_timeout"}
        except Exception as e:
            return {"parse": 0, "url": f"error://exception_{str(e)[:30]}"}