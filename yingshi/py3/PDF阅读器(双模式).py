import sys
import os
import threading
import zipfile
import xml.etree.ElementTree as ET
import re
import json
import base64
import urllib.parse
from base.spider import Spider
from urllib3 import disable_warnings
disable_warnings()

from java import jclass

class Spider(Spider):
    # ========== 可自行修改 ==========
    PDF_DIR = "/storage/emulated/0/lz/PDF"
    IMG_BASE_URL = "http://127.0.0.1:9978/file"
    DEFAULT_EPUB_THRESHOLD = 10        # 默认阈值（内嵌图片数 >= 该值 → 图片模式）
    # ===============================

    NOVEL_PREFIX = "novel://"           # 小说阅读器协议前缀

    # ★★★ TXT 默认封面图片（网络图标）★★★
    TXT_DEFAULT_COVER = "https://img.icons8.com/color/96/000000/txt.png"

    def getName(self):
        return "文档阅读器"

    def init(self, extend=""):
        if not os.path.exists(self.PDF_DIR):
            os.makedirs(self.PDF_DIR, exist_ok=True)
        self.epub_chapters_cache = {}   # 缓存 EPUB 章节
        self.txt_chapters_cache = {}    # 缓存 TXT 章节
        self.current_epub_path = None   # 当前打开的 EPUB 路径
        self.epub_threshold = self.DEFAULT_EPUB_THRESHOLD

    # ---------- TXT 章节解析 ----------
    def _parse_txt_chapters(self, txt_path):
        chapters = []
        try:
            with open(txt_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
        except:
            return [{'title': os.path.basename(txt_path), 'content': ''}]

        patterns = [
            r'^[  \t]*(?:第[一二三四五六七八九十百千0-9]+章)[ \t]*[^\n]{0,40}',
            r'^[  \t]*(?:第[一二三四五六七八九十百千0-9]+节)[ \t]*[^\n]{0,40}',
            r'^[  \t]*(?:Chapter\s+\d+)[.:]?\s*[^\n]{0,40}',
            r'^[  \t]*(?:第\s*\d+\s*章)[ \t]*[^\n]{0,40}',
            r'^[  \t]*(?:第\s*\d+\s*节)[ \t]*[^\n]{0,40}',
            r'^[  \t]*(?:序章|楔子|尾声|番外)[ \t]*[^\n]{0,40}'
        ]

        matches = []
        for pattern in patterns:
            for m in re.finditer(pattern, content, re.MULTILINE):
                pos = m.start()
                title = m.group().strip()
                if len(title) > 1 and not title.isdigit():
                    matches.append((pos, title))

        matches = sorted(list(set(matches)), key=lambda x: x[0])

        if not matches:
            return [{'title': os.path.basename(txt_path), 'content': content}]

        for i, (pos, title) in enumerate(matches):
            start = pos
            end = matches[i+1][0] if i+1 < len(matches) else len(content)
            chap_content = content[start:end].strip()
            if chap_content.startswith(title):
                chap_content = chap_content[len(title):].lstrip('\r\n')
            chapters.append({
                'title': title,
                'content': chap_content
            })

        if matches and matches[0][0] > 0 and content[:matches[0][0]].strip():
            chapters.insert(0, {
                'title': '前言',
                'content': content[:matches[0][0]].strip()
            })

        return chapters

    # ---------- 辅助方法 ----------
    def _get_subdirs(self):
        try:
            items = os.listdir(self.PDF_DIR)
            return [d for d in items if os.path.isdir(os.path.join(self.PDF_DIR, d))]
        except:
            return []

    def _get_doc_files(self, subdir):
        dir_path = os.path.join(self.PDF_DIR, subdir)
        if not os.path.isdir(dir_path):
            return []
        try:
            files = os.listdir(dir_path)
            return [f for f in files if f.lower().endswith(('.pdf', '.epub', '.txt'))]
        except:
            return []

    def _get_doc_cache_dir(self, doc_full_path, doc_name):
        doc_dir = os.path.dirname(doc_full_path)
        doc_base = os.path.splitext(doc_name)[0]
        cache_dir = os.path.join(doc_dir, doc_base)
        os.makedirs(cache_dir, exist_ok=True)
        return cache_dir

    # ---------- PDF 处理 ----------
    def _ensure_pdf_page0_image(self, pdf_full_path, subdir, pdf_name):
        base_name = os.path.splitext(pdf_name)[0]
        cache_dir = self._get_doc_cache_dir(pdf_full_path, pdf_name)
        img_name = f"{base_name}_page0.png"
        img_path = os.path.join(cache_dir, img_name)
        if os.path.exists(img_path):
            return self._build_img_url(img_path)

        try:
            File = jclass("java.io.File")
            ParcelFileDescriptor = jclass("android.os.ParcelFileDescriptor")
            PdfRenderer = jclass("android.graphics.pdf.PdfRenderer")
            Bitmap = jclass("android.graphics.Bitmap")
            CompressFormat = jclass("android.graphics.Bitmap$CompressFormat")

            fd = ParcelFileDescriptor.open(File(pdf_full_path), ParcelFileDescriptor.MODE_READ_ONLY)
            renderer = PdfRenderer(fd)
            if renderer.getPageCount() > 0:
                page = renderer.openPage(0)
                bitmap = Bitmap.createBitmap(page.getWidth(), page.getHeight(), Bitmap.Config.ARGB_8888)
                page.render(bitmap, None, None, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
                fos = jclass("java.io.FileOutputStream")(img_path)
                bitmap.compress(CompressFormat.PNG, 100, fos)
                fos.flush()
                fos.close()
                page.close()
            renderer.close()
            fd.close()
            return self._build_img_url(img_path)
        except Exception as e:
            print("[PDF] 生成封面失败:", e)
            return ""

    def _lazy_render_pdf_other_pages(self, pdf_full_path, subdir, pdf_name):
        try:
            File = jclass("java.io.File")
            ParcelFileDescriptor = jclass("android.os.ParcelFileDescriptor")
            PdfRenderer = jclass("android.graphics.pdf.PdfRenderer")
            Bitmap = jclass("android.graphics.Bitmap")
            CompressFormat = jclass("android.graphics.Bitmap$CompressFormat")

            fd = ParcelFileDescriptor.open(File(pdf_full_path), ParcelFileDescriptor.MODE_READ_ONLY)
            renderer = PdfRenderer(fd)
            base_name = os.path.splitext(pdf_name)[0]
            cache_dir = self._get_doc_cache_dir(pdf_full_path, pdf_name)

            for i in range(1, renderer.getPageCount()):
                img_name = f"{base_name}_page{i}.png"
                img_path = os.path.join(cache_dir, img_name)
                if os.path.exists(img_path):
                    continue
                page = renderer.openPage(i)
                bitmap = Bitmap.createBitmap(page.getWidth(), page.getHeight(), Bitmap.Config.ARGB_8888)
                page.render(bitmap, None, None, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
                fos = jclass("java.io.FileOutputStream")(img_path)
                bitmap.compress(CompressFormat.PNG, 100, fos)
                fos.flush()
                fos.close()
                page.close()
            renderer.close()
            fd.close()
        except Exception as e:
            print("[PDF][Lazy]", e)

    # ---------- EPUB 章节提取 ----------
    def _extract_epub_chapters(self, epub_path, subdir, epub_name):
        chapters = []
        try:
            with zipfile.ZipFile(epub_path, 'r') as zf:
                if "META-INF/container.xml" not in zf.namelist():
                    return []
                container = zf.read("META-INF/container.xml")
                root = ET.fromstring(container)
                ns = {'ns': 'urn:oasis:names:tc:opendocument:xmlns:container'}
                rootfile_path = root.find('.//ns:rootfile', ns).get('full-path')

                opf_data = zf.read(rootfile_path)
                opf_root = ET.fromstring(opf_data)
                opf_ns = {'opf': 'http://www.idpf.org/2007/opf'}

                items = {}
                for item in opf_root.findall('.//opf:item', opf_ns):
                    items[item.get('id')] = {
                        'href': item.get('href'),
                        'media_type': item.get('media-type', '')
                    }

                spine = opf_root.find('.//opf:spine', opf_ns)
                if spine is None:
                    return []
                base_dir = os.path.dirname(rootfile_path)

                chapter_idx = 0
                for itemref in spine.findall('opf:itemref', opf_ns):
                    idref = itemref.get('idref')
                    if idref not in items:
                        continue
                    item_info = items[idref]
                    media_type = item_info['media_type']
                    if media_type not in ('application/xhtml+xml', 'text/html', 'application/xml'):
                        continue

                    href = item_info['href']
                    import posixpath
                    full_path = posixpath.join(base_dir, href) if base_dir else href
                    if full_path not in zf.namelist():
                        continue

                    raw = zf.read(full_path)
                    try:
                        content = raw.decode('utf-8')
                    except:
                        content = raw.decode('latin-1', errors='ignore')

                    title = None
                    for h_tag in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']:
                        m = re.search(rf'<{h_tag}[^>]*>(.*?)</{h_tag}>', content, re.IGNORECASE | re.DOTALL)
                        if m:
                            raw_title = re.sub(r'<[^>]+>', '', m.group(1)).strip()
                            raw_title = re.sub(r'^\d+\s*', '', raw_title)
                            if raw_title:
                                title = raw_title
                                break
                    if not title:
                        m = re.search(r'<title[^>]*>(.*?)</title>', content, re.IGNORECASE | re.DOTALL)
                        if m:
                            raw_title = re.sub(r'<[^>]+>', '', m.group(1)).strip()
                            raw_title = re.sub(r'^\d+\s*', '', raw_title)
                            title = raw_title
                    if not title:
                        title = os.path.splitext(os.path.basename(href))[0]
                        title = re.sub(r'^[\d_\-]+', '', title).strip()
                    if not title:
                        title = f"{chapter_idx+1}"

                    text = content
                    text = re.sub(r'<script[^>]*>.*?</script>', '', text, flags=re.DOTALL | re.IGNORECASE)
                    text = re.sub(r'<style[^>]*>.*?</style>', '', text, flags=re.DOTALL | re.IGNORECASE)
                    block_tags = ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'pre', 'blockquote']
                    for tag in block_tags:
                        text = re.sub(rf'<{tag}[^>]*>', '\n\n', text, flags=re.IGNORECASE)
                        text = re.sub(rf'</{tag}>', '\n', text, flags=re.IGNORECASE)
                    text = re.sub(r'<br\s*/?>', '\n', text, flags=re.IGNORECASE)
                    text = re.sub(r'<[^>]+>', ' ', text)
                    text = text.replace('&nbsp;', ' ').replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>')
                    text = re.sub(r'[ \t]+', ' ', text)
                    text = re.sub(r'\n{3,}', '\n\n', text)
                    text = text.strip()

                    if text:
                        chapters.append({
                            'title': title,
                            'content': text,
                            'index': chapter_idx
                        })
                        chapter_idx += 1
            return chapters
        except Exception as e:
            print("[EPUB] 提取章节失败:", e)
            return []

    # ---------- EPUB 图片处理 ----------
    def _extract_epub_images(self, epub_path, subdir, epub_name):
        base_name = os.path.splitext(epub_name)[0]
        cache_dir = self._get_doc_cache_dir(epub_path, epub_name)
        img_urls = []
        try:
            with zipfile.ZipFile(epub_path, 'r') as zf:
                image_exts = ('.jpg', '.jpeg', '.png', '.gif', '.webp')
                image_files = [f for f in zf.namelist() if f.lower().endswith(image_exts)]
                image_files.sort()
                for idx, img_path_in_zip in enumerate(image_files):
                    ext = os.path.splitext(img_path_in_zip)[1].lower()
                    out_name = f"{base_name}_img_{idx:04d}{ext}"
                    out_path = os.path.join(cache_dir, out_name)
                    if not os.path.exists(out_path):
                        data = zf.read(img_path_in_zip)
                        with open(out_path, 'wb') as f:
                            f.write(data)
                    img_urls.append(self._build_img_url(out_path))
            return img_urls, len(image_files)
        except Exception as e:
            print("[EPUB] 提取图片失败:", e)
            return [], 0

    def _get_epub_cover(self, epub_path, subdir, epub_name):
        img_urls, _ = self._extract_epub_images(epub_path, subdir, epub_name)
        return img_urls[0] if img_urls else ""

    def _build_img_url(self, local_path):
        prefix = "/storage/emulated/0/"
        if local_path.startswith(prefix):
            rel_path = local_path[len(prefix):]
        else:
            rel_path = local_path.lstrip('/')
        return f"{self.IMG_BASE_URL}/{rel_path}"

    # ---------- TVBox 接口 ----------
    def homeContent(self, filter):
        subdirs = self._get_subdirs()
        classes = [{"type_id": d, "type_name": d} for d in subdirs]
        classes.append({"type_id": "settings", "type_name": "⚙️ 设置"})
        if not classes:
            classes.append({"type_id": "root", "type_name": "文档"})
        return {"class": classes}

    def categoryContent(self, tid, pg, filter, extend):
        if tid == "settings":
            current_thresh = self.epub_threshold
            action_config = {
                "actionId": "单项输入",
                "id": "text",
                "type": "input",
                "title": "EPUB阈值设置：\n纯文本阅读/图片播放",
                "tip": "内嵌图片数 >= 该值 → 图片模式",
                "value": str(current_thresh),
                "msg": "请输入新阈值决定阅读模式"
            }
            return {
                "page": 1,
                "pagecount": 1,
                "limit": 1,
                "total": 1,
                "list": [{
                    "vod_id": json.dumps(action_config, ensure_ascii=False),
                    "vod_name": f"📐 EPUB图文阈值（当前默认: {current_thresh}）",
                    "vod_pic": self._generate_default_icon("⚙️"),
                    "vod_remarks": "阈值越小则纯文本阅读，否则图片播放",
                    "vod_tag": "action",
                    "style": {"type": "list"}
                }]
            }

        if tid == "root":
            return {"list": []}
        subdir = tid
        dir_path = os.path.join(self.PDF_DIR, subdir)
        if not os.path.isdir(dir_path):
            return {"list": []}

        doc_files = self._get_doc_files(subdir)
        video_list = []
        for doc in doc_files:
            doc_full_path = os.path.join(dir_path, doc)
            ext = doc.split('.')[-1].lower()
            cover_url = ""
            if ext == 'pdf':
                cover_url = self._ensure_pdf_page0_image(doc_full_path, subdir, doc)
                t = threading.Thread(target=self._lazy_render_pdf_other_pages, args=(doc_full_path, subdir, doc))
                t.start()
            elif ext == 'epub':
                cover_url = self._get_epub_cover(doc_full_path, subdir, doc)
            elif ext == 'txt':
                # ★★★ TXT 统一默认封面 ★★★
                cover_url = self.TXT_DEFAULT_COVER
            else:
                continue
            video_list.append({
                "vod_id": f"doc::{subdir}::{doc}",
                "vod_name": doc,
                "vod_pic": cover_url,
                "vod_remarks": ext.upper()
            })
        return {
            "page": 1,
            "pagecount": 1,
            "limit": len(video_list),
            "total": len(video_list),
            "list": video_list
        }

    def searchContent(self, key, quick):
        return {"list": []}

    def detailContent(self, ids):
        parts = ids[0].split("::")
        if len(parts) != 3:
            return {"list": []}
        subdir = parts[1]
        doc_name = parts[2]
        doc_full_path = os.path.join(self.PDF_DIR, subdir, doc_name)
        ext = doc_name.split('.')[-1].lower()
        base_name = os.path.splitext(doc_name)[0]

        if ext == 'pdf':
            try:
                File = jclass("java.io.File")
                ParcelFileDescriptor = jclass("android.os.ParcelFileDescriptor")
                PdfRenderer = jclass("android.graphics.pdf.PdfRenderer")
                fd = ParcelFileDescriptor.open(File(doc_full_path), ParcelFileDescriptor.MODE_READ_ONLY)
                renderer = PdfRenderer(fd)
                page_count = renderer.getPageCount()
                renderer.close()
                fd.close()
            except Exception as e:
                print("[PDF] 获取页数失败:", e)
                page_count = 0
            cache_dir = self._get_doc_cache_dir(doc_full_path, doc_name)
            image_urls = [self._build_img_url(os.path.join(cache_dir, f"{base_name}_page{i}.png")) for i in range(page_count)]
            play_url = "pics://" + "&&".join(image_urls)
            cover = image_urls[0] if image_urls else ""
            return {
                "list": [{
                    "vod_id": doc_full_path,
                    "vod_name": doc_name,
                    "vod_pic": cover,
                    "vod_play_from": "图片播放",
                    "vod_play_url": play_url
                }]
            }

        elif ext == 'epub':
            _, img_count = self._extract_epub_images(doc_full_path, subdir, doc_name)
            if img_count >= self.epub_threshold:
                img_urls, _ = self._extract_epub_images(doc_full_path, subdir, doc_name)
                play_url = "pics://" + "&&".join(img_urls)
                cover = img_urls[0] if img_urls else ""
                return {
                    "list": [{
                        "vod_id": doc_full_path,
                        "vod_name": doc_name,
                        "vod_pic": cover,
                        "vod_play_from": "图片播放",
                        "vod_play_url": play_url
                    }]
                }
            else:
                novel_id = self.NOVEL_PREFIX + self._b64u_encode(doc_full_path)
                self.current_epub_path = doc_full_path
                mtime = os.path.getmtime(doc_full_path)
                cache_key = f"epub_chapters_{subdir}_{base_name}_{int(mtime)}"
                if cache_key in self.epub_chapters_cache:
                    chapters = self.epub_chapters_cache[cache_key]
                else:
                    chapters = self._extract_epub_chapters(doc_full_path, subdir, doc_name)
                    if chapters:
                        self.epub_chapters_cache[cache_key] = chapters
                if not chapters:
                    return {"list": []}
                play_url_parts = []
                for idx, ch in enumerate(chapters):
                    title = ch['title'].replace('$', ' ').replace('#', ' ')
                    chapter_ref = f"{novel_id}?chapter={idx}"
                    play_url_parts.append(f"{title}${chapter_ref}")
                play_url = "#".join(play_url_parts)
                cover = self._get_epub_cover(doc_full_path, subdir, doc_name) or self._generate_default_icon(doc_name)
                return {
                    "list": [{
                        "vod_id": novel_id,
                        "vod_name": doc_name,
                        "vod_pic": cover,
                        "vod_play_from": "纯文本阅读",
                        "vod_play_url": play_url,
                        "vod_remarks": f"共{len(chapters)}章",
                        "style": {"type": "list"}
                    }]
                }

        elif ext == 'txt':
            novel_id = self.NOVEL_PREFIX + self._b64u_encode(doc_full_path)
            mtime = os.path.getmtime(doc_full_path)
            cache_key = f"txt_chapters_{subdir}_{base_name}_{int(mtime)}"
            if cache_key in self.txt_chapters_cache:
                chapters = self.txt_chapters_cache[cache_key]
            else:
                chapters = self._parse_txt_chapters(doc_full_path)
                self.txt_chapters_cache[cache_key] = chapters

            play_url_parts = []
            for idx, ch in enumerate(chapters):
                title = ch['title'].replace('$', ' ').replace('#', ' ')
                chapter_ref = f"{novel_id}?chapter={idx}"
                play_url_parts.append(f"{title}${chapter_ref}")
            play_url = "#".join(play_url_parts)
            cover = self.TXT_DEFAULT_COVER
            return {
                "list": [{
                    "vod_id": novel_id,
                    "vod_name": doc_name,
                    "vod_pic": cover,
                    "vod_play_from": "纯文本阅读",
                    "vod_play_url": play_url,
                    "vod_remarks": f"共{len(chapters)}章",
                    "style": {"type": "list"}
                }]
            }
        else:
            return {"list": []}

    def playerContent(self, flag, id, vipFlags):
        if isinstance(id, str) and id.startswith(self.NOVEL_PREFIX):
            query = {}
            if '?' in id:
                base_part, query_str = id.split('?', 1)
                for pair in query_str.split('&'):
                    if '=' in pair:
                        k, v = pair.split('=', 1)
                        query[k] = v
            else:
                base_part = id
            encoded = base_part[len(self.NOVEL_PREFIX):] if base_part.startswith(self.NOVEL_PREFIX) else base_part
            chapter_idx = int(query.get('chapter', '0'))
            file_path = self._b64u_decode(encoded)
            if not os.path.exists(file_path):
                return {"parse": 0, "playUrl": "", "url": "", "header": {}}
            ext = file_path.split('.')[-1].lower()

            if ext == 'txt':
                subdir = os.path.basename(os.path.dirname(file_path))
                base_name = os.path.splitext(os.path.basename(file_path))[0]
                mtime = os.path.getmtime(file_path)
                cache_key = f"txt_chapters_{subdir}_{base_name}_{int(mtime)}"
                if cache_key in self.txt_chapters_cache:
                    chapters = self.txt_chapters_cache[cache_key]
                else:
                    chapters = self._parse_txt_chapters(file_path)
                    self.txt_chapters_cache[cache_key] = chapters

                if 0 <= chapter_idx < len(chapters):
                    ch = chapters[chapter_idx]
                    data = {"title": ch['title'], "content": ch['content']}
                    return {
                        "parse": 0,
                        "playUrl": "",
                        "url": "novel://" + json.dumps(data, ensure_ascii=False),
                        "header": "",
                        "content": ch['content'],
                        "vod_player": "书"
                    }
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                    return {
                        "parse": 0,
                        "playUrl": "",
                        "url": "novel://" + json.dumps({"title": os.path.basename(file_path), "content": content}, ensure_ascii=False),
                        "header": "",
                        "content": content,
                        "vod_player": "书"
                    }
                except:
                    pass
                return {"parse": 0, "playUrl": "", "url": "", "header": {}}

            elif ext == 'epub':
                subdir = os.path.basename(os.path.dirname(file_path))
                base_name = os.path.splitext(os.path.basename(file_path))[0]
                mtime = os.path.getmtime(file_path)
                cache_key = f"epub_chapters_{subdir}_{base_name}_{int(mtime)}"
                if cache_key not in self.epub_chapters_cache:
                    self.epub_chapters_cache[cache_key] = self._extract_epub_chapters(file_path, subdir, os.path.basename(file_path))
                chapters = self.epub_chapters_cache.get(cache_key, [])
                if 0 <= chapter_idx < len(chapters):
                    ch = chapters[chapter_idx]
                    data = {"title": ch['title'], "content": ch['content']}
                    return {
                        "parse": 0,
                        "playUrl": "",
                        "url": "novel://" + json.dumps(data, ensure_ascii=False),
                        "header": "",
                        "content": ch['content'],
                        "vod_player": "书"
                    }
            return {"parse": 0, "playUrl": "", "url": "", "header": {}}
        elif flag == "纯文本阅读" and isinstance(id, str) and id.startswith("chapter_"):
            pass
        return {
            "parse": 0,
            "url": id,
            "header": {}
        }

    # ---------- action 接口 ----------
    def action(self, action_str):
        try:
            obj = json.loads(action_str) if isinstance(action_str, str) else action_str
        except:
            return {"action": {"actionId": "toast", "msg": "输入格式错误"}}

        act_id = obj.get("actionId", "") or obj.get("action", "")
        value = obj.get("value", "")

        if act_id == "单项输入":
            if isinstance(value, dict):
                input_val = value.get("text", "")
            else:
                input_val = str(value)

            if input_val.strip().isdigit():
                new_thresh = int(input_val.strip())
                self.epub_threshold = new_thresh
                return {
                    "action": {
                        "actionId": "toast",
                        "msg": f"✅ EPUB阈值已设置为 {self.epub_threshold}"
                    }
                }
            else:
                return {
                    "action": {
                        "actionId": "toast",
                        "msg": "❌ 请输入有效数字"
                    }
                }
        return {"action": {"actionId": "toast", "msg": "未知动作"}}

    # ---------- 工具方法 ----------
    def _b64u_encode(self, data):
        if isinstance(data, str):
            data = data.encode('utf-8')
        encoded = base64.b64encode(data).decode('ascii')
        return encoded.replace('+', '-').replace('/', '_').rstrip('=')

    def _b64u_decode(self, data):
        data = data.replace('-', '+').replace('_', '/')
        pad = len(data) % 4
        if pad:
            data += '=' * (4 - pad)
        try:
            return base64.b64decode(data).decode('utf-8')
        except:
            return ''

    def _generate_default_icon(self, name):
        """生成彩色默认图标（备用）"""
        color = "#9D65C9"
        first_char = name[0] if name else "📖"
        svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
            <rect width="200" height="200" rx="40" ry="40" fill="{color}"/>
            <circle cx="100" cy="100" r="70" fill="white" opacity="0.3"/>
            <text x="100" y="140" font-size="100" text-anchor="middle" fill="white" font-family="Arial" font-weight="bold">{first_char}</text>
        </svg>'''
        return f"data:image/svg+xml;base64,{base64.b64encode(svg.encode()).decode()}"