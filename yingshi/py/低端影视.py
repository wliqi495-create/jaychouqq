# coding = utf-8
#!/usr/bin/python
import re
import os
import time
import json
import requests
import concurrent.futures
from lxml import etree
from base.spider import Spider

class Spider(Spider):
    def __init__(self):
        self.name = "ddys"
        self.host = "https://ddys.io"
        self.header = {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36',
            'Accept-Language': 'zh-CN,zh;q=0.9',
            'Referer': self.host
        }
    
    def getName(self):
        return self.name
    
    def init(self, extend=''):
        pass
    
    def homeContent(self, filter):
        result = {"class": []}
        try:
            # 定义分类
            classes = [
                {"type_name": "电影", "type_id": "movie"},
                {"type_name": "电视剧", "type_id": "series"},
                {"type_name": "动漫", "type_id": "anime"},
                {"type_name": "综艺", "type_id": "variety"}
            ]
            result["class"] = classes
            
            # 设置筛选条件
            filters = {}
            for cate in classes:
                tid = cate['type_id']
                filters[tid] = [
                    {"key": "area", "name": "地区", "value": [
                        {"n": "全部", "v": ""},
                        {"n": "大陆", "v": "大陆"},
                        {"n": "香港", "v": "香港"},
                        {"n": "台湾", "v": "台湾"},
                        {"n": "美国", "v": "美国"},
                        {"n": "韩国", "v": "韩国"},
                        {"n": "日本", "v": "日本"},
                        {"n": "英国", "v": "英国"},
                        {"n": "法国", "v": "法国"},
                        {"n": "泰国", "v": "泰国"},
                        {"n": "印度", "v": "印度"},
                        {"n": "其他", "v": "其他"}
                    ]},
                    {"key": "year", "name": "年份", "value": [
                        {"n": "全部", "v": ""},
                        {"n": "2025", "v": "2025"},
                        {"n": "2024", "v": "2024"},
                        {"n": "2023", "v": "2023"},
                        {"n": "2022", "v": "2022"},
                        {"n": "2021", "v": "2021"},
                        {"n": "2020", "v": "2020"},
                        {"n": "2019", "v": "2019"},
                        {"n": "2018", "v": "2018"},
                        {"n": "2017", "v": "2017"},
                        {"n": "2016", "v": "2016"},
                        {"n": "2015", "v": "2015"},
                        {"n": "更早", "v": "2014"}
                    ]},
                    {"key": "sort", "name": "排序", "value": [
                        {"n": "最新", "v": "time"},
                        {"n": "最热", "v": "hits"},
                        {"n": "评分", "v": "score"}
                    ]}
                ]
            result["filters"] = filters
        except Exception as e:
            print(f"获取首页内容失败: {e}")
        return result
    
    def homeVideoContent(self):
        return {"list": []}
    
    def categoryContent(self, tid, pg, filter, extend):
        videos = []
        try:
            # 构建基础URL
            if tid == 'tv':
                base_type = 'series'
            else:
                base_type = tid
            
            # 构建完整URL
            url = f"{self.host}/{base_type}"
            
            # 处理排序
            if extend and 'sort' in extend:
                if extend['sort'] == 'score':
                    url = f"{self.host}/rating/{base_type}"
                elif extend['sort'] == 'hot':
                    url = f"{self.host}/popular/{base_type}"
            
            # 处理分类
            if extend and 'genre' in extend:
                url = f"{self.host}/{base_type}/genre/{extend['genre']}"
            
            # 处理地区
            if extend and 'area' in extend:
                area_map = {
                    '中国': 'china',
                    '大陆': 'china',
                    '香港': 'china',
                    '台湾': 'china',
                    '美国': 'usa',
                    '日本': 'japan',
                    '韩国': 'korea',
                    '英国': 'uk',
                    '法国': 'france',
                    '德国': 'germany',
                    '印度': 'india',
                    '意大利': 'italy',
                    '西班牙': 'spain',
                    '加拿大': 'canada',
                    '澳大利亚': 'australia',
                    '俄罗斯': 'russia',
                    '泰国': 'thailand'
                }
                area_code = area_map.get(extend['area'], extend['area'])
                url = f"{self.host}/{base_type}/region/{area_code}"
            
            # 处理年份
            if extend and 'year' in extend:
                url = f"{self.host}/{base_type}/year/{extend['year']}"
            
            # 添加分页参数
            if int(pg) > 1:
                url += f"?page={pg}"
            
            print(f"爬取分类页面: {url}")
            r = requests.get(url, headers=self.header, timeout=10)
            r.encoding = 'utf-8'
            html = r.text
            root = etree.HTML(html)
            
            # 提取视频项 - 支持多种选择器
            video_items = []
            selectors = [
                '//article[contains(@class, "movie-card")]',
                '//div[contains(@class, "movie-card")]',
                '//article[contains(@class, "item")]',
                '//div[contains(@class, "item")]'
            ]
            
            for selector in selectors:
                items = root.xpath(selector)
                if items:
                    video_items = items
                    break
            
            for item in video_items:
                # 提取标题
                title_elements = item.xpath('.//h3/a | .//h2/a | .//h4/a | .//a[contains(@class, "title")]')
                if not title_elements:
                    continue
                
                title_element = title_elements[0]
                vod_name = title_element.text or ''
                
                # 提取链接
                href = title_element.get('href', '')
                if not href:
                    continue
                
                # 提取ID
                match = re.search(r'/(?:movie|series|anime|variety)/(.*?)(?:\.html)?$', href)
                if not match:
                    continue
                vod_id = match.group(1)
                
                # 提取图片
                pic_elements = item.xpath('.//img')
                vod_pic = ''
                if pic_elements:
                    vod_pic = pic_elements[0].get('src', '')
                    if vod_pic and vod_pic.startswith('//'):
                        vod_pic = 'https:' + vod_pic
                    elif vod_pic and vod_pic.startswith('/'):
                        vod_pic = self.host + vod_pic
                
                if vod_name and vod_id:
                    video = {
                        "vod_id": vod_id,
                        "vod_name": vod_name,
                        "vod_pic": vod_pic,
                        "vod_remarks": ""
                    }
                    videos.append(video)
            
        except Exception as e:
            print(f"获取分类内容失败: {e}")
        
        return {
            'list': videos,
            'page': int(pg),
            'pagecount': 9999,  # 设置一个较大的值，确保翻页功能正常
            'limit': 20,
            'total': 999999
        }
    
    def detailContent(self, ids):
        try:
            vod_id = ids[0]
            # 尝试不同的详情页 URL 格式
            detail_urls = [
                f"{self.host}/play/{vod_id}.html",
                f"{self.host}/movie/{vod_id}",
                f"{self.host}/series/{vod_id}",
                f"{self.host}/anime/{vod_id}",
                f"{self.host}/variety/{vod_id}",
                f"{self.host}/v/{vod_id}.html"
            ]
            
            r = None
            for url in detail_urls:
                print(f"爬取详情页面: {url}")
                r = requests.get(url, headers=self.header, timeout=10)
                if r.status_code == 200:
                    break
            
            if not r or r.status_code != 200:
                print(f"无法访问详情页，状态码: {r.status_code if r else '无响应'}")
                return {'list': []}
            
            html_content = r.text
            root = etree.HTML(html_content)
            
            # 提取标题
            title_elements = root.xpath('//h1 | //h2[@class="title"] | //div[@class="title"]/h1')
            vod_name = title_elements[0].text.strip() if title_elements else vod_id
            
            # 提取图片
            pic_elements = root.xpath('//div[@class="poster"]/img | //div[@class="cover"]/img | //img[@class="poster"]')
            vod_pic = pic_elements[0].get('src', '') if pic_elements else ''
            if vod_pic and not vod_pic.startswith('http'):
                if vod_pic.startswith('//'):
                    vod_pic = 'https:' + vod_pic
                elif vod_pic.startswith('/'):
                    vod_pic = self.host + vod_pic
            
            # 提取播放列表
            vod_play_from = []
            vod_play_url = []
            
            # 提取播放链接
            buttons = root.xpath('//button[contains(@onclick, "switchSource")]')
            if buttons:
                vod_play_from = ["默认"]
                play_list = []
                
                # 收集所有待检测的链接
                links_to_check = []
                for i, button in enumerate(buttons):
                    onclick = button.get('onclick')
                    # 提取 switchSource 函数中的完整播放链接参数
                    match = re.search(r'switchSource\s*\([^,]+\s*,\s*[\'\"]([^\'\"]+)[\'\"]', onclick)
                    if match:
                        play_url = match.group(1)
                        if play_url:
                            # 处理包含多个链接的情况（如 HD国语$url#HD中字$url）
                            if '#' in play_url and '$' in play_url:
                                # 分割多个链接
                                sub_links = play_url.split('#')
                                for sub_link in sub_links:
                                    if '$' in sub_link:
                                        sub_name, sub_url = sub_link.split('$', 1)
                                        source_name = button.text.strip() if button.text else f"播放源 {i + 1}"
                                        links_to_check.append((source_name, sub_name, sub_url, True))
                            else:
                                source_name = button.text.strip() if button.text else f"播放源 {i + 1}"
                                links_to_check.append((source_name, "", play_url, False))
                
                # 并发检测链接
                if links_to_check:
                    print(f"开始并发检测 {len(links_to_check)} 个播放链接")
                    valid_links = []
                    
                    # 定义检测函数
                    def check_link(link_info):
                        source_name, sub_name, url, is_sub_link = link_info
                        try:
                            # 使用GET请求获取m3u8内容，验证是否有效
                            test_r = requests.get(url, headers=self.header, timeout=3)
                            if test_r.status_code == 200 and '#EXTM3U' in test_r.text:
                                if is_sub_link:
                                    result = f"{source_name} - {sub_name}${url}"
                                    print(f"✓ 有效播放链接: {source_name} - {sub_name}")
                                else:
                                    result = f"{source_name}${url}"
                                    print(f"✓ 有效播放链接: {source_name}")
                                return result
                            else:
                                print(f"✗ 无效播放链接: {url} (状态码: {test_r.status_code})")
                                return None
                        except Exception as e:
                            print(f"✗ 链接检测失败: {url} (错误: {e})")
                            return None
                    
                    # 使用线程池并发检测
                    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
                        results = list(executor.map(check_link, links_to_check))
                    
                    # 收集有效的链接
                    valid_links = [result for result in results if result]
                    
                    if valid_links:
                        play_list.extend(valid_links)
                    else:
                        print("警告：未找到有效播放链接")
                
                if play_list:
                    vod_play_url.append("#".join(play_list))
            
            # 尝试 iframe 直接播放
            if not vod_play_url:
                iframe_elements = root.xpath('//iframe[@src]')
                if iframe_elements:
                    vod_play_from = ["默认"]
                    play_list = []
                    for iframe in iframe_elements:
                        iframe_src = iframe.get('src')
                        if iframe_src:
                            if not iframe_src.startswith('http'):
                                if iframe_src.startswith('//'):
                                    iframe_src = 'https:' + iframe_src
                                elif iframe_src.startswith('/'):
                                    iframe_src = self.host + iframe_src
                            play_list.append(f"播放${iframe_src}")
                    if play_list:
                        vod_play_url.append("#".join(play_list))
            
            # 构建视频信息
            video_detail = {
                "vod_id": vod_id,
                "vod_name": vod_name,
                "vod_pic": vod_pic,
                "vod_year": "",
                "vod_area": "",
                "vod_actor": "",
                "vod_director": "",
                "vod_content": "",
                "vod_play_from": "|".join(vod_play_from) if vod_play_from else "默认",
                "vod_play_url": "|".join(vod_play_url) if vod_play_url else ""
            }
            
            return {'list': [video_detail]}
            
        except Exception as e:
            print(f"获取详情失败: {e}")
            return {'list': []}
    
    def searchContent(self, key, quick, pg='1'):
        videos = []
        try:
            # 构建搜索URL
            url = f"{self.host}/search"
            data = {
                'keyword': key
            }
            
            print(f"搜索页面: {url}")
            r = requests.post(url, headers=self.header, data=data, timeout=10)
            r.encoding = 'utf-8'
            html = r.text
            root = etree.HTML(html)
            
            # 提取视频项
            video_items = []
            selectors = [
                '//article[contains(@class, "movie-card")]',
                '//div[contains(@class, "movie-card")]',
                '//article[contains(@class, "item")]',
                '//div[contains(@class, "item")]'
            ]
            
            for selector in selectors:
                items = root.xpath(selector)
                if items:
                    video_items = items
                    break
            
            for item in video_items:
                try:
                    # 提取标题和链接
                    title_elements = item.xpath('.//h3/a | .//h2/a | .//h4/a | .//a[contains(@class, "title")]')
                    if not title_elements:
                        continue
                    
                    title_element = title_elements[0]
                    vod_name = title_element.text or ''
                    href = title_element.get('href', '')
                    
                    if not href:
                        continue
                    
                    # 提取ID
                    match = re.search(r'/(?:movie|series|anime|variety)/(.*?)(?:\.html)?$', href)
                    if not match:
                        continue
                    vod_id = match.group(1)
                    
                    # 提取图片
                    vod_pic = ''
                    pic_elements = item.xpath('.//img')
                    if pic_elements:
                        vod_pic = pic_elements[0].get('src', '')
                        if vod_pic.startswith('//'):
                            vod_pic = 'https:' + vod_pic
                        elif vod_pic.startswith('/'):
                            vod_pic = self.host + vod_pic
                    
                    if vod_name and vod_id:
                        video = {
                            "vod_id": vod_id,
                            "vod_name": vod_name,
                            "vod_pic": vod_pic,
                            "vod_remarks": ""
                        }
                        # 去重
                        if video not in videos:
                            videos.append(video)
                except Exception as e:
                    print(f"处理搜索结果失败: {e}")
                    continue
            
        except Exception as e:
            print(f"搜索失败: {e}")
        
        return {
            'list': videos,
            'page': int(pg),
            'pagecount': 9999,  # 设置一个较大的值，确保翻页功能正常
            'limit': 20,
            'total': 999999
        }
    
    def playerContent(self, flag, id, vipFlags):
        try:
            print(f"获取播放链接: {id}")
            # 构建完整的header，确保包含所有必要的头信息
            play_header = {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36',
                'Accept': '*/*',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                'Referer': self.host,
                'Origin': self.host,
                'Connection': 'keep-alive'
            }
            # 直接返回播放链接
            return {
                "parse": 0,
                "playUrl": "",
                "url": id,
                "header": json.dumps(play_header)
            }
        except Exception as e:
            print(f"播放解析失败: {e}")
            return {"parse": 0, "playUrl": "", "url": ""}
    
    def isVideoFormat(self, url):
        video_formats = ['.m3u8', '.mp4', '.avi', '.mkv', '.flv', '.ts']
        return any(url.lower().endswith(fmt) for fmt in video_formats)
    
    def manualVideoCheck(self):
        pass
    
    def localProxy(self, params):
        return None
    
    def destroy(self):
        pass
