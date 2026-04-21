import re
import sys
import json
import requests
import urllib.parse
from urllib.parse import urlparse
import urllib3

# 禁用 requests 的 SSL 警告，保持日志干净
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

sys.path.append('..')
from base.spider import Spider

class Spider(Spider):
    """基于POST接口的爬虫，完美适配 xmhk 真实数据结构"""

    def getName(self):
        return "POST传媒"

    def init(self, extend):
        self.base_url = "https://xmhk.7wzx9.com/forward"
        self.headers = {
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Linux; Android 14; 22127RK46C Build/UKQ1.230804.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/145.0.7632.162 Mobile Safari/537.36",
            "Referer": "https://www.88xsp85.com/"
        }
        self.records_page = 20          
        self.type_mid = "1"             
        
        # 备用域名（从真实JSON中提取）
        self.default_domain = "https://eu7tu.shuma5588.com"
        self.video_domain = None        
        print("[POST传媒] 初始化完成")

    def homeContent(self, filter):
        """使用抓包获取的真实分类"""
        classes = [
            {"type_id": "1", "type_name": "传媒"},
            {"type_id": "2", "type_name": "视频"},
            {"type_id": "3", "type_name": "电影"}
        ]
        return {
            "class": classes,
            "list": []
        }

    def homeVideoContent(self):
        """首页视频推荐，暂不实现"""
        return {"list": []}

    def _post_request(self, payload):
        """使用标准 requests 库发送 POST 请求，彻底绕过底包有缺陷的 fetch"""
        try:
            print(f"[POST传媒] 准备发送数据: {payload}")
            
            # 使用 requests.post 直接发送，json=payload 会自动处理字典转JSON
            rsp = requests.post(
                self.base_url, 
                headers=self.headers, 
                json=payload, 
                timeout=10, 
                verify=False # 忽略证书错误，防止部分源阻断
            )
            
            if rsp.status_code == 200:
                try:
                    data = rsp.json()
                    if str(data.get("errorCode")) == "0":
                        return data.get("data")
                    else:
                        print(f"[POST传媒] 接口返回业务错误: {data.get('message')}")
                except ValueError:
                    print(f"[POST传媒] JSON解析失败: {rsp.text[:100]}")
            else:
                print(f"[POST传媒] 网络请求失败，状态码: {rsp.status_code}")
            return None
        except Exception as e:
            print(f"[POST传媒] 网络请求异常: {e}")
            return None

    def _extract_domain(self, url):
        """提取URL中的域名部分"""
        if not url or not url.startswith("http"):
            return None
        try:
            parsed = urlparse(url)
            return f"{parsed.scheme}://{parsed.netloc}"
        except:
            return None

    def _get_active_domain(self):
        return self.video_domain if self.video_domain else self.default_domain

    def _parse_video_item(self, item, domain):
        """解析单个节点，自动过滤非视频内容（如图片、小说、广告）"""
        # 只有包含 vod_name 的才是合法视频
        if "vod_name" not in item:
            return None
            
        vod_pic = item.get("vod_pic", "")
        if vod_pic and not vod_pic.startswith("http"):
            vod_pic = domain + vod_pic if vod_pic.startswith("/") else domain + "/" + vod_pic

        return {
            "vod_id": str(item.get("id", "")),
            "vod_name": item.get("vod_name", ""),
            "vod_pic": vod_pic,
            "vod_remarks": item.get("vod_class", "")
        }

    def categoryContent(self, tid, pg, filter, extend):
        """获取分类列表，兼容嵌套(t_list)和扁平结构"""
        result = {"list": [], "page": pg, "pagecount": 0, "limit": self.records_page, "total": 0}
        
        if int(pg) > 99:
            return result

        payload = {
            "command": "WEB_GET_INFO",
            "pageNumber": int(pg),
            "RecordsPage": self.records_page,
            "typeId": str(tid),
            "typeMid": self.type_mid,
            "languageType": "CN",
            "content": ""
        }

        data = self._post_request(payload)
        if not data:
            return result

        result_list = data.get("resultList", [])
        if not result_list:
            return result

        domain = self._get_active_domain()
        videos = []
        
        # 遍历解析数据（适配真实 JSON 结构）
        for item in result_list:
            # 如果存在 t_list，说明是嵌套结构
            if "t_list" in item and isinstance(item["t_list"], list):
                for sub_item in item["t_list"]:
                    parsed = self._parse_video_item(sub_item, domain)
                    if parsed:
                        videos.append(parsed)
            else:
                # 否则作为扁平结构处理
                parsed = self._parse_video_item(item, domain)
                if parsed:
                    videos.append(parsed)

        result["list"] = videos
        total_pages = int(data.get("pageAllNumber", 0))
        result["pagecount"] = min(total_pages, 99) if total_pages > 0 else 0
        result["total"] = int(data.get("count", 0))
        return result

    def detailContent(self, array):
        """获取详情"""
        if not array or not array[0]:
            return {"list": []}

        vid = str(array[0])
        payload = {
            "command": "WEB_GET_INFO_DETAIL",
            "type_Mid": self.type_mid,
            "id": vid,
            "languageType": "CN"
        }

        data = self._post_request(payload)
        if not data:
            return {"list": []}

        detail = data.get("result", {})
        if not detail:
            return {"list": []}

        domain = self._get_active_domain()

        vod_pic = detail.get("vod_pic", "")
        if vod_pic and not vod_pic.startswith("http"):
            vod_pic = domain + vod_pic if vod_pic.startswith("/") else domain + "/" + vod_pic

        play_url = detail.get("vod_url", "")
        if play_url and not play_url.startswith("http"):
            play_url = domain + play_url if play_url.startswith("/") else domain + "/" + play_url

        vod_info = {
            "vod_id": vid,
            "vod_name": detail.get("vod_name", ""),
            "vod_pic": vod_pic,
            "vod_remarks": detail.get("vod_class", ""),
            "vod_content": detail.get("vod_name", ""),
            "vod_play_from": "默认线路",
            "vod_play_url": f"正片${play_url}" if play_url else ""
        }

        return {"list": [vod_info]}

    def playerContent(self, flag, id, vipFlags):
        """播放器解析"""
        result = {}
        if not id:
            return result

        result["parse"] = 0
        result["url"] = id
        result["header"] = self.headers
            
        return result

    def searchContent(self, key, quick, page='1'):
        return {"list": []}

    def isVideoFormat(self, url):
        return False

    def manualVideoCheck(self):
        return False

    def localProxy(self, param):
        return {}
