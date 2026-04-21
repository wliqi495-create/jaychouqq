#coding=utf-8
#!/usr/bin/python
import os
import sys
import json
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn
from importlib.machinery import SourceFileLoader
from urllib.parse import urlparse, parse_qs
import types
import base64

# ============================================================
# 禁止生成 __pycache__
# ============================================================
sys.dont_write_bytecode = True

# ============================================================
# 自动兼容旧版 Spider 导入
# ============================================================
if 'base' not in sys.modules:
    base_module = types.ModuleType('base')
    sys.modules['base'] = base_module

if 'base.spider' not in sys.modules:
    import spider  # spider.py 与 server.py 同目录
    sys.modules['base.spider'] = spider

# ============================================================
# 强制标准输出为 UTF-8（防止中文打印报错）
# ============================================================
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

# ============================================================
# Spider 动态加载
# ============================================================
_spider_module_cache = {}  # 缓存模块对象

def load_spider(spider_name):
    # 1️⃣ 检查模块缓存
    if spider_name in _spider_module_cache:
        module = _spider_module_cache[spider_name]
    else:
        # 2️⃣ 指定 sy 子目录
        server_dir = os.path.dirname(os.path.abspath(__file__))
        path = os.path.join(server_dir, "sy", f"{spider_name}.py")
        if not os.path.exists(path):
            raise FileNotFoundError(f"Spider file not found: {path}")

        module = SourceFileLoader(spider_name, path).load_module()
        _spider_module_cache[spider_name] = module

    # 3️⃣ 每次生成新的 Spider 实例
    spider_instance = module.Spider()
    if hasattr(spider_instance, 'init'):
        spider_instance.init(extend="")  # 实时初始化

    print(f"[载入] 已初始化 Spider: {spider_name}")
    return spider_instance

# ============================================================
# 多线程 HTTPServer
# ============================================================
class ThreadingHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True
    timeout = 10

# ============================================================
# HTTP 请求处理
# ============================================================
class SpiderHandler(BaseHTTPRequestHandler):

    def do_GET(self):
        self.connection.settimeout(10)
        query = urlparse(self.path).query
        params = parse_qs(query)
        response = {}

        sp = params.get('sp', [None])[0]
        t = params.get('t', [None])[0]
        pg = params.get('pg', ['1'])[0]
        ids = params.get('ids', [None])[0]
        play = params.get('play', [None])[0]
        wd = params.get('wd', [None])[0]
        filter_param = params.get('filter', [None])[0]

        # 兼容 ext 参数（Base64 编码 JSON）
        ext = params.get('ext', [None])[0]
        ext_obj = {}
        if ext:
            try:
                ext_json = base64.b64decode(ext).decode('utf-8')
                ext_obj = json.loads(ext_json) if ext_json.strip() else {}
            except Exception:
                ext_obj = {}

        if not sp:
            self.send_error(400, "Missing 'sp' parameter (e.g. ?sp=Iktv)")
            return

        try:
            spider = load_spider(sp)

            # ===========================
            # 根据参数判断访问类型
            # ===========================
            if (not t and not ids and not play and not wd) or (filter_param and not t and not ids and not play and not wd):
                response = spider.homeContent(filter=filter_param)
                access_type = "home"
            elif ids:
                response = spider.detailContent([ids])
                access_type = "detail"
            elif play:
                response = spider.playerContent("", play, None)
                access_type = "play"
            elif wd:
                response = spider.searchContent(key=wd, quick=False)
                access_type = "search"
            elif t:
                response = spider.categoryContent(t, pg, None, ext_obj)
                access_type = "category"
            else:
                response = spider.homeContent(filter=filter_param)
                access_type = "home"

            # ===========================
            # 返回 JSON
            # ===========================
            self.send_response(200)
            self.send_header("Content-type", "application/json; charset=utf-8")
            self.end_headers()
            try:
                self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
            except BrokenPipeError:
                print("[警告] 客户端已断开连接（BrokenPipeError）")
                return

            # 日志
            try:
                log_line = f"[访问] Spider={sp}, 类型={access_type}, params={params}"
                print(log_line.encode('utf-8', 'ignore').decode('utf-8'))
            except Exception as log_error:
                print("[日志错误]", log_error)

        except BrokenPipeError:
            print("[警告] 客户端已断开连接（BrokenPipeError）")
        except Exception as e:
            self.send_response(500)
            self.end_headers()
            try:
                self.wfile.write(str(e).encode('utf-8'))
            except Exception:
                pass
            print(f"[错误] {e}")

# ============================================================
# 启动服务
# ============================================================
def run_server(host="0.0.0.0", port=8080):
    try:
        server = ThreadingHTTPServer((host, port), SpiderHandler)
        print(f"[提示] 动态 Spider 服务已启动: http://{host}:{port}/?sp=YourSpider")
        server.serve_forever()
    except Exception as e:
        print(f"[错误] 服务启动失败: {e}")

# ============================================================
# 命令行入口
# ============================================================
if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8080, help="端口号")
    args = parser.parse_args()
    run_server(port=args.port)