#coding=utf-8
#!/usr/bin/python
import sys
sys.dont_write_bytecode = True  # ✅ 禁止生成 __pycache__ 编译缓存

import re
import os
import json
import time
import requests
from lxml import etree
from abc import ABCMeta
from importlib.machinery import SourceFileLoader

# ============================================================
# 模拟 Android 的 Proxy 和 Python 模块（无缓存路径版本）
# ============================================================

class Proxy:
    @staticmethod
    def getUrl(local=True):
        return "http://127.0.0.1:9978"

    @staticmethod
    def getPort():
        return 9978


class Python:
    class Platform:
        def __init__(self):
            # 不使用任何缓存目录
            self.cache_dir = os.getcwd()

        def getApplication(self):
            return self

        def getCacheDir(self):
            class Cache:
                def getAbsolutePath(inner_self):
                    # 始终返回当前工作目录
                    return self.cache_dir
            return Cache()

    @staticmethod
    def getPlatform():
        return Python.Platform()


# ============================================================
# Spider 主类（无缓存、实时加载、无 __pycache__）
# ============================================================

class Spider(metaclass=ABCMeta):
    _instance = None

    def __init__(self):
        self.extend = ''

    def __new__(cls, *args, **kwargs):
        if cls._instance:
            return cls._instance
        else:
            cls._instance = super().__new__(cls)
            return cls._instance

    def init(self, extend=""):
        self.extend = extend

    # -------------------------------
    # 核心内容接口
    # -------------------------------
    def homeContent(self, filter):
        return {"class": [], "list": []}

    def homeVideoContent(self):
        return []

    def categoryContent(self, cid=None, page="1", filter=None, ext=None):
        print(f"[调试] categoryContent called with cid={cid}, page={page}, ext={ext}")
        return {"class": [{"type_name": "示例分类", "type_id": "1"}], "list": [], "page": page}

    def detailContent(self, ids):
        return {"list": [{"vod_id": ids, "vod_name": "示例视频"}]}

    def searchContent(self, key, quick, pg="1"):
        return {"list": [{"vod_id": "1", "vod_name": f"搜索结果: {key}"}]}

    def playerContent(self, flag, flag_id=None, vipFlags=None):
        if flag_id is None and hasattr(self, 'id'):
            flag_id = self.id
        print(f"[调试] playerContent called with flag={flag}, flag_id={flag_id}, vipFlags={vipFlags}")
        return {"url": f"http://example.com/{flag_id}.m3u8", "parse": 0}

    def liveContent(self, url):
        return {}

    def localProxy(self, param):
        return {}

    def isVideoFormat(self, url):
        return url.endswith((".mp4", ".m3u8"))

    def manualVideoCheck(self):
        return False

    def action(self, action):
        return {}

    def destroy(self):
        pass

    def getName(self):
        return "Spider"

    def getDependence(self):
        return []

    # -------------------------------
    # 模块加载（实时加载，无缓存）
    # -------------------------------
    def loadSpider(self, name):
        return self.loadModule(name).Spider()

    def loadModule(self, name):
        # ✅ 实时从当前目录加载，不再使用缓存目录
        path = os.path.join(os.getcwd(), f"{name}.py")
        if not os.path.exists(path):
            raise FileNotFoundError(f"模块文件不存在: {path}")
        # 每次强制重新加载模块，防止 Python 缓存
        if name in sys.modules:
            del sys.modules[name]
        module = SourceFileLoader(name, path).load_module()
        print(f"[加载成功] {module.__name__} -> {module.Spider}")
        return module

    # -------------------------------
    # 工具方法
    # -------------------------------
    def regStr(self, reg, src, group=1):
        m = re.search(reg, src)
        return m.group(group) if m else ''

    def removeHtmlTags(self, src):
        clean = re.compile('<.*?>')
        return re.sub(clean, '', src)

    def cleanText(self, src):
        clean = re.sub('[\U0001F600-\U0001F64F\U0001F300-\U0001F5FF\U0001F680-\U0001F6FF\U0001F1E0-\U0001F1FF]', '', src)
        return clean

    def fetch(self, url, params=None, cookies=None, headers=None, timeout=5, verify=True, stream=False, allow_redirects=True):
        rsp = requests.get(url, params=params, cookies=cookies, headers=headers,
                           timeout=timeout, verify=verify, stream=stream, allow_redirects=allow_redirects)
        rsp.encoding = 'utf-8'
        return rsp

    def post(self, url, params=None, data=None, json=None, cookies=None, headers=None,
             timeout=5, verify=True, stream=False, allow_redirects=True):
        rsp = requests.post(url, params=params, data=data, json=json, cookies=cookies, headers=headers,
                            timeout=timeout, verify=verify, stream=stream, allow_redirects=allow_redirects)
        rsp.encoding = 'utf-8'
        return rsp

    def html(self, content):
        return etree.HTML(content)

    def str2json(self, s):
        return json.loads(s)

    def json2str(self, s):
        return json.dumps(s, ensure_ascii=False)

    def getProxyUrl(self, local=True):
        return f'{Proxy.getUrl(local)}?do=py'

    def log(self, msg):
        if isinstance(msg, (dict, list)):
            print(json.dumps(msg, ensure_ascii=False))
        else:
            print(f'{msg}')

    # -------------------------------
    # 缓存接口（仅保留接口，不执行任何操作）
    # -------------------------------
    def getCache(self, key):
        return None

    def setCache(self, key, value):
        return 'succeed'

    def delCache(self, key):
        return 'succeed'