import sys
import os
import threading
from base.spider import Spider
from urllib3 import disable_warnings
disable_warnings()

from java import jclass

class Spider(Spider):
    PDF_DIR = "/storage/emulated/0/pdf"
    IMG_BASE_URL = "http://127.0.0.1:9978/file/pdf"

    def getName(self):
        return "PDF阅读器"

    def init(self, extend=""):
        if not os.path.exists(self.PDF_DIR):
            os.makedirs(self.PDF_DIR, exist_ok=True)

    # ======================
    # 首页分类（仅 PDF）
    # ======================
    def homeContent(self, filter):
        return {
            "class": [
                {"type_id": "pdf", "type_name": "PDF文档"}
            ]
        }

    # ======================
    # PDF 列表（严格按 tid）
    # ======================
    def categoryContent(self, tid, pg, filter, extend):
        # ✅ 只响应 pdf，其它一律返回空
        if tid != "pdf":
            return {"list": []}

        try:
            files = [
                f for f in os.listdir(self.PDF_DIR)
                if f.lower().endswith(".pdf")
            ]
        except Exception:
            files = []

        return {
            "page": 1,
            "pagecount": 1,
            "limit": len(files),
            "total": len(files),
            "list": [
                {
                    "vod_id": f"pdf::{f}",  # ✅ 唯一 ID，防重复
                    "vod_name": f,
                    "vod_remarks": "PDF"
                }
                for f in files
            ]
        }

    # ======================
    # ✅ 搜索直接禁用（关键）
    # ======================
    def searchContent(self, key, quick):
        return {"list": []}

    # ======================
    # 后台生成 PDF 页
    # ======================
    def _lazy_render_pdf(self, pdf_path):
        try:
            File = jclass("java.io.File")
            ParcelFileDescriptor = jclass("android.os.ParcelFileDescriptor")
            PdfRenderer = jclass("android.graphics.pdf.PdfRenderer")
            Bitmap = jclass("android.graphics.Bitmap")
            CompressFormat = jclass("android.graphics.Bitmap$CompressFormat")

            fd = ParcelFileDescriptor.open(
                File(pdf_path),
                ParcelFileDescriptor.MODE_READ_ONLY
            )

            renderer = PdfRenderer(fd)
            base_name = os.path.splitext(os.path.basename(pdf_path))[0]

            for i in range(1, renderer.getPageCount()):
                out_name = f"{base_name}_page{i}.png"
                out_path = os.path.join(self.PDF_DIR, out_name)

                if os.path.exists(out_path):
                    continue

                page = renderer.openPage(i)
                bitmap = Bitmap.createBitmap(
                    page.getWidth(),
                    page.getHeight(),
                    Bitmap.Config.ARGB_8888
                )
                page.render(bitmap, None, None,
                            PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)

                fos = jclass("java.io.FileOutputStream")(out_path)
                bitmap.compress(CompressFormat.PNG, 100, fos)
                fos.flush()
                fos.close()
                page.close()

            renderer.close()
            fd.close()

        except Exception as e:
            print("[PDF][Lazy]", e)

    # ======================
    # 详情（PDF → 图片）
    # ======================
    def detailContent(self, ids):
        pdf_name = ids[0].split("::")[-1]
        pdf_path = os.path.join(self.PDF_DIR, pdf_name)

        File = jclass("java.io.File")
        ParcelFileDescriptor = jclass("android.os.ParcelFileDescriptor")
        PdfRenderer = jclass("android.graphics.pdf.PdfRenderer")
        Bitmap = jclass("android.graphics.Bitmap")
        CompressFormat = jclass("android.graphics.Bitmap$CompressFormat")

        base_name = os.path.splitext(pdf_name)[0]
        image_urls = []

        try:
            fd = ParcelFileDescriptor.open(
                File(pdf_path),
                ParcelFileDescriptor.MODE_READ_ONLY
            )

            renderer = PdfRenderer(fd)
            page_count = renderer.getPageCount()

            # ✅ 第 0 页立即生成
            page = renderer.openPage(0)
            bitmap = Bitmap.createBitmap(
                page.getWidth(),
                page.getHeight(),
                Bitmap.Config.ARGB_8888
            )
            page.render(bitmap, None, None,
                        PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)

            first_img = f"{base_name}_page0.png"
            first_path = os.path.join(self.PDF_DIR, first_img)

            fos = jclass("java.io.FileOutputStream")(first_path)
            bitmap.compress(CompressFormat.PNG, 100, fos)
            fos.flush()
            fos.close()
            page.close()

            image_urls.append(f"{self.IMG_BASE_URL}/{first_img}")

            # ✅ 后台生成剩余页
            if page_count > 1:
                t = threading.Thread(
                    target=self._lazy_render_pdf,
                    args=(pdf_path,)
                )
                t.start()

            renderer.close()
            fd.close()

        except Exception as e:
            print("[PDF][Detail]", e)
            return {"list": []}

        return {
            "list": [{
                "vod_id": pdf_path,
                "vod_name": pdf_name,
                "vod_pic": image_urls[0],
                "vod_play_from": "PDF图片",
                "vod_play_url": "pics://" + "&&".join(
                    f"{self.IMG_BASE_URL}/{base_name}_page{i}.png"
                    for i in range(page_count)
                )
            }]
        }

    # ======================
    # 播放
    # ======================
    def playerContent(self, flag, id, vipFlags):
        return {
            "parse": 0,
            "url": id,
            "header": {}
        }
