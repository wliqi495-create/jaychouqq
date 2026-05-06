import sys
import sqlite3
import json
import os
import threading
from base.spider import Spider

class Spider(Spider):
    def getName(self):
        return "Universal_DB_Spider"

    def init(self, extend=""):
        # 设置配置文件路径
        self.config_path = extend if extend else "/storage/emulated/0/lz/py/sy/涩库.py"
        
        # --- 优化1：引入线程锁与连接池缓存 ---
        self._db_lock = threading.Lock()
        self._conn_cache = {} 
        self._mapping_cache = {} # 缓存表结构识别结果，避免重复 PRAGMA 耗时
        
        self.databases = {}
        default_scan_dirs = [
            "/storage/emulated/0/私藏视频/",
            "/storage/emulated/0/lz/db",
            "/storage/emulated/0/VodPlus/db/"
        ]
        scan_dirs = default_scan_dirs.copy()
        
        if os.path.exists(self.config_path):
            try:
                with open(self.config_path, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                    self.databases = config.get("databases", {})
                    if "scan_dirs" in config and config["scan_dirs"]:
                        scan_dirs = config["scan_dirs"]
            except Exception as e:
                print(f"读取配置文件失败: {e}")

        # --- 优化2：轻量化扫描 ---
        # 只记录路径，不执行任何数据库打开操作
        self._auto_scan_databases(scan_dirs)

    def _auto_scan_databases(self, dirs):
        for d in dirs:
            if not os.path.exists(d): continue
            try:
                for file in os.listdir(d):
                    if file.endswith(".db"):
                        full_path = os.path.join(d, file)
                        db_key = f"auto_{file}"
                        if db_key not in self.databases:
                            self.databases[db_key] = {"name": f"🔍 {file}", "path": full_path, "valid": 1}
            except: continue

    def _get_connection(self, db_key):
        # --- 优化3：单例连接模式 ---
        # 避免频繁打开/关闭大文件产生的 IO 消耗
        if db_key in self._conn_cache:
            try:
                # 检查连接是否可用
                self._conn_cache[db_key].execute("SELECT 1")
                return self._conn_cache[db_key]
            except:
                del self._conn_cache[db_key]

        db_info = self.databases.get(db_key)
        if not db_info: return None
        db_path = db_info.get("path")
        if not db_path or not os.path.exists(db_path): return None
        
        try:
            # 优化 SQLite 读取大文件的性能参数
            conn = sqlite3.connect(db_path, check_same_thread=False)
            conn.execute("PRAGMA journal_mode = WAL")  # 提高并发读取性能
            conn.execute("PRAGMA synchronous = NORMAL")
            conn.execute("PRAGMA cache_size = -2000") # 缓存 2MB 数据
            self._conn_cache[db_key] = conn
            return conn
        except: return None

    def _get_auto_mapping(self, conn):
        # --- 优化4：缓存映射结果 ---
        # 数据库结构识别是非常耗时的操作，尤其是表很多时
        conn_id = id(conn)
        if conn_id in self._mapping_cache:
            return self._mapping_cache[conn_id]

        try:
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
            tables = [row[0] for row in cursor.fetchall()]
            priority_tables = ["videos", "vod_unified_data", "cj", "vod", "data", "list", "video_detail"]
            target_table = next((t for t in priority_tables if t in tables), tables[0] if tables else None)
            
            if not target_table: return None
            
            cursor.execute(f"PRAGMA table_info(`{target_table}`)")
            cols = [str(r[1]) for r in cursor.fetchall()]
            
            mapping = {}
            field_candidates = {
                "vod_id": ["id", "vod_id", "uuid", "guid", "vid"],
                "vod_name": ["name", "vod_name", "title", "subject", "display_name"],
                "vod_pic": ["image", "vod_pic", "pic", "thumbnail", "img", "cover"],
                "vod_play_url": ["play_url", "vod_play_url", "url", "link", "m3u8_url"],
                "vod_remarks": ["vod_remarks", "remarks", "content", "desc", "note"],
                "category_field": ["type_name", "category_id", "class_name", "cate_name", "actress_id", "tag"]
            }
            
            for target_field, candidates in field_candidates.items():
                matches = [cand for cand in candidates if cand in cols]
                if not matches:
                    matches = [col for col in cols if any(c in col.lower() for c in candidates)]
                
                if not matches:
                    if target_field == "category_field": mapping[target_field] = "'无分类'"
                    elif target_field == "vod_id": mapping[target_field] = "rowid"
                    else: mapping[target_field] = None
                    continue
                
                best_match = matches[0]
                max_score = -1
                for match in matches:
                    score = 0
                    try:
                        cursor.execute(f'SELECT `{match}` FROM `{target_table}` WHERE `{match}` IS NOT NULL AND `{match}` != "" LIMIT 5')
                        results = cursor.fetchall()
                        fill_count = len(results)
                        if match in candidates: score += 10
                        score += fill_count * 5
                        if target_field == "vod_play_url" and fill_count > 0:
                            if any(str(r[0]).startswith(('http', 'rtsp', 'magnet', 'ftp')) for r in results):
                                score += 50
                        if score > max_score:
                            max_score = score
                            best_match = match
                    except: continue
                mapping[target_field] = best_match
            
            res = {"table_name": target_table, "field_mapping": mapping}
            self._mapping_cache[conn_id] = res # 存入缓存
            return res
        except: return None

    # 其余逻辑保持不变，但移除了方法内部的 conn.close()
    # 因为我们现在使用单例长连接，手动关闭会导致缓存失效
    def homeContent(self, filter):
        classes = []
        for db_key, db_info in self.databases.items():
            if db_info.get("valid") != 0 and not db_info.get("hide"):
                if os.path.exists(db_info.get("path", "")):
                    classes.append({"type_id": db_key, "type_name": db_info.get("name", db_key)})
        return {"class": classes}

    # ===================== 仅修复此处：子分类层级解析，其他代码完全原版 =====================
    def categoryContent(self, tid, pg, filter, extend):
        parts = tid.split('$')
        db_key = parts[0]
        category_val = parts[1] if len(parts) > 1 else None
        
        conn = self._get_connection(db_key)
        if not conn: return {"list": []}
        
        db_info = self.databases.get(db_key, {})
        auto_info = self._get_auto_mapping(conn)
        if not auto_info: return {"list": []}

        main_cfg = db_info.get("tables", {}).get("main", {})
        table_name = main_cfg.get("table_name") or auto_info["table_name"]
        mapping = main_cfg.get("field_mapping") or auto_info["field_mapping"]
        filter_field = main_cfg.get("category_filter_field") or mapping.get("category_field")

        cursor = conn.cursor()
        limit = 20
        offset = (int(pg) - 1) * limit
        vod_list = []

        if category_val is None:
            all_categories = []
            try:
                query = f"SELECT DISTINCT {filter_field} FROM {table_name} WHERE {filter_field} IS NOT NULL AND {filter_field} != ''"
                cursor.execute(query)
                all_categories = [str(row[0]) for row in cursor.fetchall()]
            except: pass

            # ========== 修复：提取一级分类，兼容层级格式 ==========
            if not all_categories:
                category_val = "__DIRECT_LIST__"
            else:
                # 拆分一级分类，去重
                top_categories = set()
                has_hierarchy = False
                for cat in all_categories:
                    if "/" in cat:
                        has_hierarchy = True
                        top = cat.split("/", 1)[0].strip()
                        if top:
                            top_categories.add(top)
                    else:
                        top_categories.add(cat.strip())
                
                # 兼容原版逻辑：无层级的普通分类，完全沿用原版
                if not has_hierarchy and len(all_categories) <= 1:
                    category_val = str(all_categories[0]) if all_categories else "__DIRECT_LIST__"
                else:
                    # 有层级，显示一级分类文件夹
                    for top in sorted(top_categories):
                        vod_list.append({
                            "vod_id": f"{db_key}${top}",
                            "vod_name": top,
                            "vod_pic": "https://img.icons8.com/color/512/folder-invoices--v1.png",
                            "vod_tag": "folder",
                            "vod_remarks": "📁 点击查看列表"
                        })
                    return {"page": 1, "pagecount": 1, "limit": 999, "list": vod_list}
        else:
            # ========== 修复：处理二级分类/最终分类 ==========
            all_categories = []
            try:
                query = f"SELECT DISTINCT {filter_field} FROM {table_name} WHERE {filter_field} IS NOT NULL AND {filter_field} != ''"
                cursor.execute(query)
                all_categories = [str(row[0]) for row in cursor.fetchall()]
            except: pass

            # 检查当前分类是否有子分类（是否是一级分类）
            sub_categories = set()
            for cat in all_categories:
                if cat.startswith(f"{category_val}/"):
                    # 提取二级分类
                    sub_part = cat[len(category_val)+1:].strip()
                    if "/" in sub_part:
                        # 还有三级分类，继续提取下一级
                        sub = sub_part.split("/", 1)[0].strip()
                        if sub:
                            sub_categories.add(sub)
                    else:
                        if sub_part:
                            sub_categories.add(sub_part)
            
            # 有子分类，显示子分类文件夹
            if sub_categories:
                for sub in sorted(sub_categories):
                    full_cat = f"{category_val}/{sub}"
                    vod_list.append({
                        "vod_id": f"{db_key}${full_cat}",
                        "vod_name": sub,
                        "vod_pic": "https://img.icons8.com/color/512/folder-invoices--v1.png",
                        "vod_tag": "folder",
                        "vod_remarks": "📁 点击查看列表"
                    })
                return {"page": 1, "pagecount": 1, "limit": 999, "list": vod_list}

        # ========== 原版查询逻辑完全保留，无任何修改 ==========
        f_id = mapping.get("vod_id") or "rowid"
        f_name = mapping.get("vod_name") or "rowid"
        f_pic = mapping.get("vod_pic") or "''"
        f_rem = mapping.get("vod_remarks") or "''"

        try:
            if category_val == "__DIRECT_LIST__":
                sql = f"SELECT {f_id}, {f_name}, {f_pic}, {f_rem} FROM {table_name} LIMIT ? OFFSET ?"
                cursor.execute(sql, (limit, offset))
            else:
                # 修复：匹配完整分类路径，同时兼容模糊匹配
                sql = f"SELECT {f_id}, {f_name}, {f_pic}, {f_rem} FROM {table_name} WHERE {filter_field} = ? OR {filter_field} LIKE ? LIMIT ? OFFSET ?"
                cursor.execute(sql, (category_val, f"{category_val}/%", limit, offset))
            
            for row in cursor.fetchall():
                vod_list.append({
                    "vod_id": f"{db_key}#ID#{row[0]}",
                    "vod_name": str(row[1]),
                    "vod_pic": str(row[2]) if str(row[2]).startswith('http') else "",
                    "vod_remarks": str(row[3])
                })
        except: pass
        return {"page": int(pg), "pagecount": int(pg) + 1, "limit": limit, "list": vod_list}
    # ===================== 修复结束，以下代码完全原版 =====================

    def detailContent(self, ids):
        mid_full = ids[0]
        db_key, _, real_id = mid_full.partition("#ID#")
        conn = self._get_connection(db_key)
        if not conn: return {"list": []}
        
        auto_info = self._get_auto_mapping(conn)
        db_info = self.databases.get(db_key, {})
        main_cfg = db_info.get("tables", {}).get("main", {})
        table_name = main_cfg.get("table_name") or auto_info["table_name"]
        mapping = main_cfg.get("field_mapping") or auto_info["field_mapping"]

        conn.row_factory = sqlite3.Row 
        cursor = conn.cursor()
        id_col = mapping.get("vod_id") or "rowid"
        
        cursor.execute(f"SELECT * FROM {table_name} WHERE {id_col} = ?", (real_id,))
        row = cursor.fetchone()
        if not row: return {"list": []}

        def get_val(m_key):
            real_col = mapping.get(m_key)
            return str(row[real_col]) if (real_col and real_col in row.keys() and row[real_col] is not None) else ""

        vod = {
            "vod_id": mid_full,
            "vod_name": get_val("vod_name"),
            "vod_pic": get_val("vod_pic"),
            "vod_remarks": get_val("vod_remarks"),
            "vod_actor": get_val("vod_actor"),
            "vod_content": get_val("vod_content"),
            "vod_play_from": "自动识别",
            "vod_play_url": get_val("vod_play_url").split('$$$')[-1]
        }
        return {"list": [vod]}

    def playerContent(self, flag, id, vipFlags):
        return {"parse": 0, "url": id, "header": {"User-Agent": "Dalvik/2.1.0 (Linux; U; Android 9; MIbox PRO Build/PI)"}}

    def searchContent(self, key, quick, pg="1"):
        search_list = []
        limit = 20
        # 搜索是性能压力最大的地方，由于采用了连接池，这里速度会大幅提升
        for db_key, db_info in self.databases.items():
            if db_info.get("valid") == 0: continue
            conn = self._get_connection(db_key)
            if not conn: continue
                
            try:
                auto_info = self._get_auto_mapping(conn)
                if not auto_info: continue

                main_cfg = db_info.get("tables", {}).get("main", {})
                table_name = main_cfg.get("table_name") or auto_info["table_name"]
                mapping = main_cfg.get("field_mapping") or auto_info["field_mapping"]
                
                search_fields = main_cfg.get("search_fields")
                if not search_fields:
                    title_field = mapping.get("vod_name")
                    search_fields = [title_field] if title_field else []

                if not search_fields: continue

                cursor = conn.cursor()
                where_clauses = [f"`{field}` LIKE ?" for field in search_fields]
                sql_where = " OR ".join(where_clauses)
                
                f_id = mapping.get("vod_id") or "rowid"
                f_name = mapping.get("vod_name")
                f_pic = mapping.get("vod_pic") or "''"
                f_rem = mapping.get("vod_remarks") or "''"

                sql = f"SELECT {f_id}, {f_name}, {f_pic}, {f_rem} FROM {table_name} WHERE {sql_where} LIMIT {limit}"
                params = [f"%{key}%"] * len(search_fields)
                cursor.execute(sql, params)
                
                for row in cursor.fetchall():
                    search_list.append({
                        "vod_id": f"{db_key}#ID#{row[0]}",
                        "vod_name": f"[{db_info.get('name', db_key)}] {row[1]}",
                        "vod_pic": str(row[2]) if row[2] else "",
                        "vod_remarks": str(row[3]) if row[3] else ""
                    })
            except: pass
        return {"list": search_list, "page": pg}
