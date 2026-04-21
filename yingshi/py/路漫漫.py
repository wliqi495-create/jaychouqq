import re
from base.spider import Spider

class Spider(Spider):
    def getName(self): return "路漫漫动漫"
    def init(self, extend=""): pass
    def isVideoFormat(self, url): pass
    def manualVideoCheck(self): pass
    def destroy(self): pass
    #https://ho9.net/lmm
    def __init__(self):
        self.url = 'https://www.lmm85.com'
        self.header = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', 'Referer': self.url}

    def homeContent(self, filter):
        c = [('国产动漫','guochandongman'),('动态漫画','dongtaiman'),('日本动漫','ribendongman'),('欧美动漫','oumeidongman'),('国产电影','guochandonghuadianying'),('日本电影','ribendonghuadianying'),('欧美电影','oumeidonghuadianying'),('特摄剧','teshepian')]
        return {'class': [{'type_name': n, 'type_id': i} for n, i in c]}

    def homeVideoContent(self):
        try: return {'list': self._p(self.fetch(self.url, headers=self.header).text)}
        except: return {'list': []}

    def categoryContent(self, tid, pg, filter, extend):
        try:
            u = f'{self.url}/type/{tid}.html' if pg == '1' else f'{self.url}/type/{tid}_{pg}.html'
            return {'list': self._p(self.fetch(u, headers=self.header).text), 'page': int(pg), 'pagecount': 9999, 'limit': 20, 'total': 9999}
        except: return {'list': []}

    def detailContent(self, ids):
        try:
            h = self.fetch(f'{self.url}/detail/{ids[0]}.html', headers=self.header).text
            v = {'vod_id': ids[0], 'vod_name': '', 'vod_pic': '', 'vod_type': '', 'vod_year': '', 'vod_area': '', 'vod_remarks': '', 'vod_actor': '', 'vod_director': '', 'vod_content': ''}
            m1 = re.search(r'<h1 class="page-title">(.*?)</h1>', h)
            if m1: v['vod_name'] = m1.group(1)
            m2 = re.search(r'class="url_img" alt=".*?" src="(.*?)"', h)
            if m2: v['vod_pic'] = m2.group(1)
            m3 = re.search(r'class="video-info-item video-info-content">(.*?)</div>', h, re.S)
            if m3: v['vod_content'] = re.sub(r'<[^>]+>', '', m3.group(1)).strip()
            ts = list(dict.fromkeys(re.findall(r'data-dropdown-value="(.*?)"', h)))
            us = []
            for b in h.split('class="module-list')[1:]:
                if 'module-blocklist' not in b: continue
                es = [f"{n}${self.url}{u}" for u, n in re.findall(r'<a href="(/play/.*?.html)".*?<span>(.*?)</span>', b)]
                if es: us.append("#".join(es))
            v['vod_play_from'] = "$$$".join(ts if len(ts) == len(us) else [f"线路{i+1}" for i in range(len(us))])
            v['vod_play_url'] = "$$$".join(us)
            return {'list': [v]}
        except: return {'list': []}

    def searchContent(self, key, quick, pg="1"):
        try: return {'list': self._p(self.fetch(f'{self.url}/vod/search.html?wd={key}&page={pg}', headers=self.header).text)}
        except: return {'list': []}

    def playerContent(self, flag, id, vipFlags):
        return {'parse': 1, 'url': id, 'header': self.header}

    def localProxy(self, param): return None

    def _p(self, h):
        l = []
        for c, t in re.findall(r'<div class="video-img-box.*?>(.*?)<h6 class="title">(.*?)</h6>', h, re.S):
            try:
                vid = re.search(r'href="/detail/(\d+).html"', c)
                if not vid: continue
                img = re.search(r'data-src="(.*?)"', c) or re.search(r'src="(.*?)"', c)
                rem = re.search(r'class="label">(.*?)</span>', c)
                tit = re.search(r'<a.*?>(.*?)</a>', t)
                l.append({'vod_id': vid.group(1), 'vod_name': tit.group(1) if tit else '', 'vod_pic': img.group(1) if img else '', 'vod_remarks': rem.group(1) if rem else ''})
            except: pass
        return l
