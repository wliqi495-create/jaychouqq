# coding: utf-8
import os
import re
import time
import threading
import sqlite3
from concurrent.futures import ThreadPoolExecutor, as_completed

import sys
sys.path.append('..')
from base.spider import Spider as BaseSpider


class Spider(BaseSpider):
    """智能本地数据库爬虫 - 极速版"""

    def init(self, extend=""):
        self.db_folder = "/storage/emulated/0/lz/db"
        self.page_size = 200
        self.databases = []
        self.db_cache = {}

        self.db_read_timeout = 5
        self.total_scan_timeout = 15
        self.cache_ttl = 200

        self.default_category_pic = "https://www.252035.xyz/imgs?t=1335527662"

        if extend and extend.strip():
            try:
                if "=" in extend:
                    pairs = extend.split(",")
                    for pair in pairs:
                        if "timeout" in pair:
                            self.db_read_timeout = float(pair.split("=")[1].strip())
                        elif "total" in pair:
                            self.total_scan_timeout = float(pair.split("=")[1].strip())
                        elif "cache_ttl" in pair:
                            self.cache_ttl = float(pair.split("=")[1].strip())
                else:
                    self.db_read_timeout = float(extend)
            except:
                pass

        self.last_scan_time = 0
        self.cached_databases = None
        self._local = threading.local()

        print(f"超时设置: 单库{self.db_read_timeout}s | 总扫描{self.total_scan_timeout}s | 缓存{self.cache_ttl}s")

    # ────────────────────────── 扫描与分析 ──────────────────────────
    def scan_databases(self, force=False, max_total_wait=None):
        now = time.time()
        if not force and self.cached_databases is not None and (now - self.last_scan_time) < self.cache_ttl:
            print(f"使用缓存数据库列表（{len(self.cached_databases)}个）")
            return self.cached_databases

        if not os.path.exists(self.db_folder):
            print("数据库文件夹不存在")
            self.cached_databases = []
            self.last_scan_time = now
            return []

        db_files = []
        for f in os.listdir(self.db_folder):
            if f.endswith('.db'):
                path = os.path.join(self.db_folder, f)
                name = f.replace('.db', '')
                db_files.append((name, path))

        if not db_files:
            print("未找到任何.db文件")
            self.cached_databases = []
            self.last_scan_time = now
            return []

        print(f"并行扫描 {len(db_files)} 个数据库...")
        databases = []
        with ThreadPoolExecutor(max_workers=min(len(db_files), 10)) as executor:
            futures = {executor.submit(self._analyze_db_worker, p, n): (n, p) for n, p in db_files}
            total_wait = max_total_wait if max_total_wait is not None else self.total_scan_timeout
            start = time.time()
            for f in as_completed(futures, timeout=total_wait):
                if time.time() - start >= total_wait:
                    print("总扫描超时，跳过剩余数据库")
                    break
                n, p = futures[f]
                try:
                    res = f.result()
                except Exception as e:
                    print(f"数据库 {n} 异常: {e}")
                    res = None
                if res and res.get('has_video_table'):
                    cnt = res.get('video_count', 0)
                    databases.append({'id': n, 'name': res.get('db_display_name', n), 'path': p,
                                     'structure': res, 'video_count': cnt})
                    print(f"✓ {res.get('db_display_name', n)} ({cnt}个视频)")
                elif res is None:
                    print(f"✗ {n} 超时或失败，跳过")
                else:
                    print(f"✗ {n} 无视频表，跳过")
        self.cached_databases = databases
        self.last_scan_time = time.time()
        print(f"扫描完成，{len(databases)} 个数据库，耗时 {time.time()-start:.2f}s")
        return databases

    def _analyze_db_worker(self, db_path, db_name):
        conn = self.get_db_connection(db_path)
        if not conn:
            return None
        try:
            return self.analyze_db_structure(conn, db_path)
        except Exception as e:
            print(f"分析失败 {db_path}: {e}")
            return None

    def analyze_db_structure(self, conn, db_path):
        try:
            tables = [row[0] for row in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")]
            video_table = None
            for pt in ['vod_unified_data', 'video', 'videos', 'movie', 'movies', 'vod', 'media']:
                if pt in tables:
                    video_table = pt
                    break
            if not video_table:
                for t in tables:
                    cols = [c[1] for c in conn.execute(f"PRAGMA table_info({t})")]
                    if any(f in cols for f in ['vod_name', 'title', 'video_name']):
                        video_table = t
                        break
            if not video_table:
                return None

            columns = [c[1] for c in conn.execute(f"PRAGMA table_info({video_table})")]
            mapping = self.smart_field_mapping(columns)
            count = conn.execute(f"SELECT COUNT(*) FROM {video_table}").fetchone()[0]

            cat_field = mapping.get('type_name', 'type_name')
            cat_map_table = self.find_category_mapping_table(conn, tables)
            categories = []
            cat_is_id = False
            if cat_map_table:
                cat_is_id = True
                categories = self.get_categories_from_mapping_table(conn, video_table, cat_field, cat_map_table)
                if categories:
                    print(f"  映射表分类: {len(categories)}个")
            if not categories and cat_field in columns:
                categories = self.get_categories_from_video_table(conn, video_table, cat_field)
                if categories:
                    print(f"  视频表分类: {len(categories)}个")
            if not categories and count > 0:
                categories = [{'id': 'all', 'name': '全部视频', 'count': count}]
                print(f"  默认分类: 全部视频 ({count}个)")

            db_display = os.path.basename(db_path).replace('.db', '')
            if 'db_info' in tables:
                try:
                    row = conn.execute("SELECT name FROM db_info LIMIT 1").fetchone()
                    if row:
                        db_display = row[0]
                except:
                    pass

            return {
                'table_name': video_table,
                'columns': columns,
                'field_mapping': mapping,
                'video_count': count,
                'categories': categories,
                'category_field': cat_field,
                'category_is_id': cat_is_id,
                'category_mapping_table': cat_map_table,
                'db_display_name': db_display,
                'has_video_table': True
            }
        except Exception as e:
            print(f"结构分析失败: {e}")
            return None

    def find_category_mapping_table(self, conn, tables):
        for t in tables:
            tl = t.lower()
            for mt in ['category', 'categories', 'type', 'types', 'cate', 'cates', 'class', 'classes']:
                if mt == tl or mt in tl:
                    try:
                        cols = [c[1] for c in conn.execute(f"PRAGMA table_info({t})")]
                        cl = [c.lower() for c in cols]
                        if any('id' in c or 'type_id' in c or 'cate_id' in c for c in cl) and \
                           any('name' in c or 'type_name' in c or 'cate_name' in c for c in cl):
                            id_f = name_f = None
                            for c in cols:
                                lc = c.lower()
                                if lc == 'id' or lc == 'type_id' or lc == 'cate_id': id_f = c
                                elif lc == 'name' or lc == 'type_name' or lc == 'cate_name': name_f = c
                            if not id_f:
                                for c in cols:
                                    if 'id' in c.lower(): id_f = c; break
                            if not name_f:
                                for c in cols:
                                    if 'name' in c.lower(): name_f = c; break
                            if id_f and name_f:
                                print(f"  分类映射表: {t} (id:{id_f}, name:{name_f})")
                                return {'table': t, 'id_field': id_f, 'name_field': name_f}
                    except:
                        pass
        return None

    def get_categories_from_mapping_table(self, conn, vt, cf, mt):
        cats = []
        try:
            ids = [str(r[0]) for r in conn.execute(f"SELECT DISTINCT {cf} FROM {vt} WHERE {cf} IS NOT NULL AND {cf} != ''")]
            if not ids: return cats
            ph = ','.join(['?']*len(ids))
            sql = f"SELECT {mt['id_field']}, {mt['name_field']} FROM {mt['table']} WHERE CAST({mt['id_field']} AS TEXT) IN ({ph}) ORDER BY {mt['name_field']}"
            for row in conn.execute(sql, ids):
                cid = str(row[0])
                cname = str(row[1])
                cnt = conn.execute(f"SELECT COUNT(*) FROM {vt} WHERE {cf}=?", [cid]).fetchone()[0]
                cats.append({'id': cid, 'name': cname, 'count': cnt})
        except Exception as e:
            print(f"映射分类失败: {e}")
        return cats

    def get_categories_from_video_table(self, conn, vt, cf):
        cats = []
        try:
            for row in conn.execute(f"SELECT {cf}, COUNT(*) as cnt FROM {vt} WHERE {cf} IS NOT NULL AND {cf}!='' GROUP BY {cf} ORDER BY cnt DESC"):
                cats.append({'id': str(row[0]), 'name': str(row[0]), 'count': row[1]})
        except Exception as e:
            print(f"视频表分类失败: {e}")
        return cats

    # ──────────── 字段映射 ────────────
    def smart_field_mapping(self, columns):
        mapping = {}
        rules = {
            'vod_id':       ['vod_id', 'id', 'video_id', 'vid', '_id'],
            'vod_name':     ['vod_name', 'title', 'video_name', 'movie_name', 'media_name'],
            'vod_pic':      ['vod_pic', 'pic', 'cover', 'image', 'thumbnail', 'poster', 'img'],
            'vod_play_url': ['vod_play_url','m3u8_url', 'play_url', 'video_url', 'vod_url', 'playurl', 'url'],
            'vod_play_from':['vod_play_from', 'play_from', 'source_name', 'platform', 'source', 'from'],
            'vod_remarks':  ['vod_remarks', 'remarks', 'remark', 'note', 'desc_short'],
            'vod_year':     ['vod_year', 'year', 'release_year', 'pubdate'],
            'vod_area':     ['vod_area', 'area', 'region', 'country'],
            'vod_actor':    ['vod_actor', 'actor', 'actors', 'starring', 'cast'],
            'vod_director': ['vod_director', 'director', 'directors'],
            'vod_content':  ['vod_content', 'content', 'description', 'intro', 'introduction', 'plot'],
            'type_name':    ['type_name', 'type', 'category', 'cate', 'class', 'genre', 'kind']
        }
        for target, candidates in rules.items():
            for col in columns:
                lc = col.lower()
                for pn in candidates:
                    if pn == lc or (pn in lc and len(pn) > 3):
                        mapping[target] = col
                        break
                if target in mapping:
                    break
        if 'vod_name' not in mapping and columns:
            mapping['vod_name'] = columns[0]
        return mapping

    # ──────────── 连接池 ────────────
    def get_db_connection(self, db_path):
        if not hasattr(self._local, 'conn_pool'):
            self._local.conn_pool = {}
        conn = self._local.conn_pool.get(db_path)
        if conn is None:
            try:
                if not os.path.exists(db_path):
                    return None
                conn = sqlite3.connect(db_path, timeout=self.db_read_timeout, check_same_thread=False)
                conn.row_factory = sqlite3.Row
                conn.execute(f"PRAGMA cache_size = -8000")
                conn.execute(f"PRAGMA synchronous = OFF")
                conn.execute(f"PRAGMA journal_mode = MEMORY")
                conn.execute(f"PRAGMA busy_timeout = {int(self.db_read_timeout * 1000)}")
                self._local.conn_pool[db_path] = conn
            except Exception as e:
                print(f"连接失败 {db_path}: {e}")
                return None
        return conn

    # ──────────── 名称清理 ────────────
    def _clean_name(self, raw_name):
        """
        清理视频名称中的冗余信息：
        1. 去除方括号/圆括号中的内容（如 [VIP]、【独家】等）
        2. 去除开头的"目录"、"第X集"等无意义前缀
        3. 如果名称包含中文，去除开头的纯英文/数字/符号前缀
        4. 去除开头的标点符号和空白字符
        """
        s = str(raw_name).strip()
        if not s:
            return s

        # 去除方括号和圆括号中的内容
        s = re.sub(
            r'[$$\[\【《][^$$\]】》]*[\)\]】》]', '', s
        )
        # 去除开头的"目录"、"第X页/集/章节/回"等前缀
        s = re.sub(
            r'^(目录\s*[:：\-]?\s*|'
            r'第\s*\d+\s*[页集章节回]\s*|'
            r'\d+[\s\-\._/]*\s*)',
            '', s
        )
        # 如果名称包含中文，去除开头的纯英文/数字/符号前缀
        if re.search(r'[\u4e00-\u9fff]', s):
            s = re.sub(
                r'^[a-zA-Z0-9\-_\.~!@#$%^&*()=+${}|;:,<>?/\\ ]+',
                '', s
            )
        # 去除开头的标点符号和空白
        s = re.sub(
            r'^[\s\-_—–·.。、,，:：;；]+', '', s
        )
        return s.strip() if s.strip() else str(raw_name).strip()

    # ──────────── 蜘蛛主流程 ────────────
    def getName(self):
        return "📚 智能数据库"

    def homeContent(self, filter):
        self.databases = self.scan_databases(force=False, max_total_wait=self.total_scan_timeout)
        types = []
        for db in self.databases:
            types.append({"type_id": f"db_{db['id']}", "type_name": f"{db['name']} ({db.get('video_count', 0)})"})
        if not types:
            types = [{"type_id": "db_empty", "type_name": "暂无数据库 (0)"}]
        return {"class": types, "filters": {}}

    def homeVideoContent(self):
        return {"list": []}

    def categoryContent(self, tid, pg, filter, extend):
        pg = int(pg) if pg else 1
        limit = self.page_size
        offset = (pg - 1) * limit
        parts = tid.split("_sub_")
        if len(parts) == 2:
            return self.get_videos_by_category(parts[0].replace("db_", ""), parts[1], pg, limit, offset)
        else:
            db_id = tid.replace("db_", "")
            for db in self.databases:
                if db['id'] == db_id:
                    db_info = db
                    break
            else:
                return {"list": [], "page": pg, "pagecount": 1, "limit": limit, "total": 0}
            cats = db_info['structure'].get('categories', [])
            if len(cats) == 1:
                return self.get_videos_by_category(db_id, cats[0]['id'], pg, limit, offset)
            return self.get_categories_list(db_id, pg, limit, offset)

    # ──────────── 分类列表 ────────────
    def get_categories_list(self, db_id, pg, limit, offset):
        for db in self.databases:
            if db['id'] == db_id:
                db_info = db
                break
        else:
            return {"list": [], "page": pg, "pagecount": 1, "limit": limit, "total": 0}
        structure = db_info['structure']
        categories = structure.get('categories', [])
        if not categories:
            conn = self.get_db_connection(db_info['path'])
            if conn:
                categories = self.refresh_categories(conn, db_info)
                if categories:
                    structure['categories'] = categories
        if not categories:
            return {"list": [], "page": pg, "pagecount": 1, "limit": limit, "total": 0}

        vod_pic_map = {}
        conn = self.get_db_connection(db_info['path'])
        if conn and categories:
            tname = structure['table_name']
            catf = structure.get('category_field')
            picf = structure['field_mapping'].get('vod_pic', 'vod_pic')
            if catf:
                try:
                    sql = f"""
                        SELECT {catf}, {picf}
                        FROM {tname}
                        WHERE rowid IN (
                            SELECT MIN(rowid) FROM {tname}
                            WHERE {catf} IS NOT NULL AND {catf} != ''
                            GROUP BY {catf}
                        )
                        AND {picf} IS NOT NULL AND {picf} != ''
                    """
                    for row in conn.execute(sql):
                        if row[1] and str(row[1]).startswith('http'):
                            vod_pic_map[str(row[0])] = str(row[1])
                except Exception as e:
                    print(f"批量封面失败: {e}")
            if 'all' not in vod_pic_map:
                try:
                    r = conn.execute(f"SELECT {picf} FROM {tname} WHERE {picf} IS NOT NULL AND {picf} != '' LIMIT 1").fetchone()
                    if r and r[0] and str(r[0]).startswith('http'):
                        vod_pic_map['all'] = str(r[0])
                except:
                    pass

        start = (pg - 1) * limit
        end = start + limit
        page_cats = categories[start:end]
        result = []
        for cat in page_cats:
            cid = cat['id']
            result.append({
                "vod_id": f"db_{db_id}_sub_{cid}",
                "vod_name": cat['name'],
                "vod_pic": vod_pic_map.get(cid, self.default_category_pic),
                "vod_remarks": f"{cat.get('count', 0)} 个视频",
                "vod_tag": "folder",
                "style": {"type": "rect", "ratio": 1.0}
            })
        total = len(categories)
        return {"list": result, "page": pg, "pagecount": (total+limit-1)//limit, "limit": limit, "total": total}

    def refresh_categories(self, conn, db_info):
        s = db_info['structure']
        if not s.get('category_field'):
            return []
        if s.get('category_mapping_table'):
            cats = self.get_categories_from_mapping_table(conn, s['table_name'], s['category_field'], s['category_mapping_table'])
            if cats: return cats
        return self.get_categories_from_video_table(conn, s['table_name'], s['category_field'])

    # ──────────── 视频列表 ────────────
    def _build_id_name_map(self, db_info, conn):
        id2name = {}
        for c in db_info['structure'].get('categories', []):
            id2name[c['id']] = c['name']
        mt = db_info['structure'].get('category_mapping_table')
        if mt:
            try:
                for row in conn.execute(f"SELECT {mt['id_field']}, {mt['name_field']} FROM {mt['table']}"):
                    k = str(row[0])
                    if k not in id2name:
                        id2name[k] = str(row[1])
            except:
                pass
        return id2name

    def get_all_videos(self, db_info, pg, limit, offset):
        s = db_info['structure']
        conn = self.get_db_connection(db_info['path'])
        if not conn:
            return {"list": [], "page": pg, "pagecount": 1, "limit": limit, "total": 0}
        try:
            total = db_info.get('video_count', 0)
            id2name = self._build_id_name_map(db_info, conn) if s.get('category_is_id') else {}
            rows = conn.execute(f"SELECT * FROM {s['table_name']} LIMIT ? OFFSET ?", [limit, offset]).fetchall()
            videos = []
            for row in rows:
                v = self.map_video_data(row, s['field_mapping'], db_info, conn, id2name)
                if v: videos.append(v)
            return {"list": videos, "page": pg, "pagecount": (total+limit-1)//limit, "limit": limit, "total": total, "parse": 0, "jx": 0}
        except Exception as e:
            print(f"get_all_videos 错误: {e}")
            return {"list": [], "page": pg, "pagecount": 1, "limit": limit, "total": 0}

    def get_videos_by_category(self, db_id, cat_val, pg, limit, offset):
        for db in self.databases:
            if db['id'] == db_id:
                db_info = db
                break
        else:
            return {"list": [], "page": pg, "pagecount": 1, "limit": limit, "total": 0}
        if cat_val == 'all':
            return self.get_all_videos(db_info, pg, limit, offset)

        s = db_info['structure']
        cf = s.get('category_field')
        if not cf:
            return self.get_all_videos(db_info, pg, limit, offset)

        total = 0
        for cat in s.get('categories', []):
            if cat['id'] == cat_val:
                total = cat.get('count', 0)
                break

        conn = self.get_db_connection(db_info['path'])
        if not conn:
            return {"list": [], "page": pg, "pagecount": 1, "limit": limit, "total": 0}

        try:
            id2name = self._build_id_name_map(db_info, conn) if s.get('category_is_id') else {}
            rows = conn.execute(
                f"SELECT * FROM {s['table_name']} WHERE {cf}=? ORDER BY rowid LIMIT ? OFFSET ?",
                [cat_val, limit, offset]
            ).fetchall()
            videos = []
            for row in rows:
                v = self.map_video_data(row, s['field_mapping'], db_info, conn, id2name)
                if v: videos.append(v)
            return {"list": videos, "page": pg, "pagecount": (total+limit-1)//limit, "limit": limit, "total": total, "parse": 0, "jx": 0}
        except Exception as e:
            print(f"get_videos_by_category 错误: {e}")
            return {"list": [], "page": pg, "pagecount": 1, "limit": limit, "total": 0}

    # ──────────── 工具函数 ────────────
    def sort_sources_by_m3u8(self, ps, pu):
        if not ps or not pu:
            return ps, pu
        sep1 = '#' if '#' in ps else '$$'
        sep2 = '#' if '#' in pu else '$$$$$'
        srcs = ps.split(sep1)
        urls = pu.split(sep2)
        ml = min(len(srcs), len(urls))
        pairs = []
        for i in range(ml):
            ism = '.m3u8' in urls[i].lower() or 'm3u8' in srcs[i].lower() or 'hls' in srcs[i].lower()
            pairs.append({'s': srcs[i].strip(), 'u': urls[i].strip(), 'm': ism})
        m3u8 = [p for p in pairs if p['m']]
        other = [p for p in pairs if not p['m']]
        sorted_pairs = m3u8 + other
        return '#'.join(p['s'] for p in sorted_pairs), '#'.join(p['u'] for p in sorted_pairs)

    def parse_episodes(self, url_str):
        if not url_str: return [], []
        epn, epu = [], []
        if '#' in url_str and '$' in url_str:
            for part in url_str.split('#'):
                if '$' in part:
                    a, b = part.split('$', 1)
                    epn.append(a.strip()); epu.append(b.strip())
        elif '$$' in url_str and '$' in url_str:
            for part in url_str.split('$$$$$'):
                if '$' in part:
                    a, b = part.split('$', 1)
                    epn.append(a.strip()); epu.append(b.strip())
        return epn, epu

    def format_episodes(self, names, urls):
        return '#'.join(f"{n}${u}" for n, u in zip(names, urls))

    def map_video_data(self, row, fmap, db_info, conn=None, id_to_name=None):
        def gv(f, d=''):
            mf = fmap.get(f)
            if mf and mf in row.keys() and row[mf] is not None:
                val = row[mf]
                if isinstance(val, bytes):
                    val = val.decode('utf-8', errors='ignore')
                return str(val)
            return d
        vid = gv('vod_id')
        vname = gv('vod_name')
        if not vname:
            return None
        if not vid:
            vid = str(row['rowid']) if 'rowid' in row.keys() else vname
        pic = gv('vod_pic') or self.default_category_pic
        pf, pu = self.sort_sources_by_m3u8(gv('vod_play_from'), gv('vod_play_url'))
        if not pf.strip():
            pf = "直接播放"
        remarks = gv('vod_remarks') or gv('vod_year') or ''
        actor = gv('vod_actor')
        director = gv('vod_director')
        content = gv('vod_content')
        tname = gv('type_name')
        if id_to_name and (db_info['structure'].get('category_is_id') or (tname and tname.isdigit())):
            tname = id_to_name.get(tname, tname)
        tid = f"db_video__{db_info['id']}__{vid}"
        if not pu.strip():
            pu = f"播放${tid}"
        return {
            "vod_id": tid,
            "vod_name": vname,
            "vod_pic": pic,
            "vod_remarks": remarks,
            "vod_actor": actor or "",
            "vod_director": director or "",
            "type_name": tname,
            "vod_play_from": pf,
            "vod_play_url": pu,
            "vod_content": content or "",
            "vod_year": gv('vod_year'),
            "vod_area": gv('vod_area'),
            "style": {"type": "rect", "ratio": 0.75}
        }

    def detailContent(self, ids):
        if not ids: return {"list": []}
        parts = ids[0].split("__")
        if len(parts) >= 3 and parts[0] == "db_video":
            for db in self.databases:
                if db['id'] == parts[1]:
                    return self.get_video_detail(db, parts[2], ids[0])
        return {"list": []}

    def get_video_detail(self, db_info, oid, vid):
        s = db_info['structure']
        conn = self.get_db_connection(db_info['path'])
        if not conn: return {"list": []}
        try:
            if s['field_mapping'].get('vod_id'):
                row = conn.execute(f"SELECT * FROM {s['table_name']} WHERE {s['field_mapping']['vod_id']}=?", [oid]).fetchone()
            else:
                row = conn.execute(f"SELECT *, rowid FROM {s['table_name']} WHERE rowid=? OR {s['field_mapping'].get('vod_name','name')}=?", [oid, oid]).fetchone()
            if not row: return {"list": []}
            def gv(f):
                mf = s['field_mapping'].get(f)
                if mf and mf in row.keys() and row[mf] is not None:
                    val = row[mf]
                    if isinstance(val, bytes): val = val.decode('utf-8', errors='ignore')
                    return str(val)
                return ''
            vname = gv('vod_name')
            if not vname: return {"list": []}
            pic = gv('vod_pic') or self.default_category_pic
            pf, pu = self.sort_sources_by_m3u8(gv('vod_play_from'), gv('vod_play_url'))
            epn, epu = self.parse_episodes(gv('vod_play_url'))
            if epn and len(epn) > 1:
                if not ('$' in pu and '#' in pu):
                    pu = self.format_episodes(epn, epu)
            if not pf.strip(): pf = "直接播放"
            return {"list": [{
                "vod_id": f"db_video__{db_info['id']}__{oid}",
                "vod_name": vname,
                "vod_pic": pic,
                "vod_remarks": gv('vod_remarks') or gv('vod_year') or "",
                "vod_actor": gv('vod_actor') or "",
                "vod_director": gv('vod_director') or "",
                "type_name": gv('type_name'),
                "vod_play_from": pf,
                "vod_play_url": pu,
                "vod_content": gv('vod_content') or "",
                "vod_year": gv('vod_year'),
                "vod_area": gv('vod_area'),
                "style": {"type": "rect", "ratio": 0.75}
            }]}
        except Exception as e:
            print(f"detailContent error: {e}")
            return {"list": []}

    # ──────────── 搜索内容（替换为第一个爬虫的搜索逻辑） ────────────
    def searchContent(self, key, quick, pg="1"):
        """
        在所有有效数据库中搜索视频名称。
        使用 SQL LIKE 进行模糊匹配，每个数据库最多返回20条结果。
        搜索结果前附加数据库名称作为来源标识（如 [数据库名] 视频名）。
        """
        if not key:
            return {"list": [], "page": pg}

        search_list = []
        limit = 20  # 每个数据库最多返回 20 条匹配结果

        if not self.databases:
            self.databases = self.scan_databases()

        for db in self.databases:
            db_path = db.get("path", "")
            if not db_path or not os.path.exists(db_path):
                continue  # 文件不存在，跳过

            conn = self.get_db_connection(db_path)
            if not conn:
                continue  # 无法连接，跳过

            try:
                s = db["structure"]
                field_mapping = s["field_mapping"]

                title_field = field_mapping.get("vod_name")
                if not title_field:
                    continue  # 没有名称字段，无法搜索

                f_id = field_mapping.get("vod_id") or "rowid"
                f_pic = field_mapping.get("vod_pic") or "''"
                f_rem = field_mapping.get("vod_remarks") or "''"

                table_name = s["table_name"]
                cursor = conn.cursor()

                # 使用 LIKE 进行模糊搜索（%key% 匹配包含关键词的名称）
                sql = (
                    f"SELECT `{f_id}`, `{title_field}`, "
                    f"{f_pic}, {f_rem} "
                    f"FROM `{table_name}` "
                    f"WHERE `{title_field}` LIKE ? "
                    f"LIMIT {limit}"
                )
                cursor.execute(sql, (f"%{key}%",))

                db_name = db.get("name", "")

                for row in cursor.fetchall():
                    name = str(row[1]) if row[1] else ""
                    if not name:
                        continue

                    # 验证封面图 URL
                    pic = (
                        str(row[2])
                        if row[2]
                        and str(row[2]).startswith("http")
                        else ""
                    )
                    rem = str(row[3]) if row[3] else ""

                    # 清理名称中的冗余信息（来自第一个爬虫的逻辑）
                    cleaned_name = self._clean_name(name)

                    search_list.append({
                        "vod_id": f"db_video__{db['id']}__{row[0]}",
                        "vod_name": f"[{db_name}] {cleaned_name}",
                        "vod_pic": pic,
                        "vod_remarks": rem
                    })
            except Exception as e:
                print(f"搜索错误 {db.get('name', '')}: {e}")
                pass

        return {"list": search_list, "page": pg}

    def playerContent(self, flag, id, vipFlags):
        if id.startswith('http://') or id.startswith('https://'):
            return {"parse": 0, "url": id}
        if id.startswith("播放$"):
            id = id[3:]
        parts = id.split("__")
        if len(parts) >= 3 and parts[0] == "db_video":
            for db in self.databases:
                if db['id'] == parts[1]:
                    url = self.get_play_url_from_db(db, parts[2], flag)
                    if url: return {"parse": 0, "url": url}
        return {"parse": 0, "url": ""}

    def get_play_url_from_db(self, db_info, oid, flag=None):
        s = db_info['structure']
        conn = self.get_db_connection(db_info['path'])
        if not conn: return None
        try:
            idf = s['field_mapping'].get('vod_id')
            plf = s['field_mapping'].get('vod_play_url', 'vod_play_url')
            if idf:
                row = conn.execute(f"SELECT {plf} FROM {s['table_name']} WHERE {idf}=?", [oid]).fetchone()
            else:
                row = conn.execute(f"SELECT {plf} FROM {s['table_name']} WHERE {s['field_mapping'].get('vod_name','name')}=?", [oid]).fetchone()
            if row and row[0]:
                url = str(row[0])
                en, eu = self.parse_episodes(url)
                if en and len(en)>1:
                    if flag:
                        for i, n in enumerate(en):
                            if flag == n: return eu[i]
                            cf = flag.replace('第','').replace('集','').strip()
                            cn = n.replace('第','').replace('集','').strip()
                            if cf == cn: return eu[i]
                    return eu[0]
                if url.startswith('http'):
                    return url
                if '$' in url and '#' not in url:
                    return url.split('$',1)[1]
                return url
        except Exception as e:
            print(f"获取播放地址失败: {e}")
        return None

    def destroy(self):
        self.databases = []
        self.db_cache = {}
        self.cached_databases = None
