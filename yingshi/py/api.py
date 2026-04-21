# -*- coding: utf-8 -*-
import sys
import json
import base64
from urllib.parse import quote

import requests

sys.path.append("..")
from base.spider import Spider


class Spider(Spider):
    url = ""
    name = ""
    extend = ""

    def init(self, extend=""):
        src = extend
        try:
            if extend.startswith("http"):
                r = requests.get(extend, headers={"User-Agent": "okhttp/5.0.0"})
                src = r.text
            params = json.loads(src)
            if params.get("api"):
                self.url = params.get("api")
                del params["api"]
            if params.get("name"):
                self.name = params.get("name")
                del params["name"]

            self.extend = json.dumps(params, ensure_ascii=False)
            pass
        except:
            self.extend = src
            pass

    def getName(self):
        return self.name

    def isVideoFormat(self, url):
        return False

    def manualVideoCheck(self):
        return False

    def destroy(self):
        pass

    def homeContent(self, filter):
        try:
            postJson = {
                "extend": self.extend
            }
            r = self.post(self.url, data=postJson, timeout=30)
            return r.json()
        except:
            return {'list': []}

    def homeVideoContent(self):
        return {'list': []}

    def categoryContent(self, tid, pg, filter, extend):
        try:
            filterStr = json.dumps(extend, ensure_ascii=False)
            filterByte = filterStr.encode('utf-8')
            filterStr = base64.urlsafe_b64encode(filterByte).decode('utf-8')
            postJson = {
                "t": tid,
                "pg": pg,
                "ext": quote(filterStr),
                "extend": self.extend
            }
            r = self.post(self.url, data=postJson, timeout=30)
            return r.json()
        except Exception as err:
            return {'list': [], 'msg': err}

    def detailContent(self, ids):
        try:
            postJson = {
                "ids": ids[0],
                "extend": self.extend
            }
            r = self.post(self.url, data=postJson, timeout=30)
            return r.json()
        except Exception as err:
            return {'list': [], 'msg': err}

    def searchContent(self, key, quick, pg="1"):
        try:
            postJson = {
                "wd": key,
                "pg": pg,
                "extend": self.extend
            }
            if quick:
                postJson["quick"] = "true"
            else:
                postJson["quick"] = "false"
            r = self.post(self.url, data=postJson, timeout=30)
            return r.json()
        except Exception as err:
            return {'list': [], 'msg': err}

    def playerContent(self, flag, pid, vipFlags):
        try:
            params = json.loads(pid)
            renewID = params.get("renewID")
            if renewID:
                renewParams = json.loads(renewID)
                append = renewParams.get("append", False)
                if "append" in renewParams:
                    del renewParams["append"]
                renewID = json.dumps(renewParams, ensure_ascii=False)
                renewJson = {
                    "ids": renewID,
                    "extend": self.extend
                }
                r = self.post(self.url, data=renewJson, timeout=30)
                values = r.json().get("list")
                if values and len(values) > 0:
                    vodJson = {}
                    for key, value in values[0].items():
                        if value:
                            if key in ["vod_play_from", "vod_play_url", "vod_id"] and not append:
                                continue
                            vodJson[key] = value
                    if len(vodJson) > 0:
                        postJson = {"json": json.dumps(vodJson, ensure_ascii=False)}
                        try:
                            self.post("http://127.0.0.1:9978/action?do=refresh&type=vod", data=postJson)
                        except Exception as err:
                            return {'list': [], 'msg': err}
            postJson = {
                "flag": flag,
                "play": pid,
                "extend": self.extend
            }

            r = self.post(self.url, data=postJson, timeout=30)
            return r.json()
        except Exception as err:
            return {'list': [], 'msg': err}

    def localProxy(self, param):
        pass
