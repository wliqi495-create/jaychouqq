import base64
import sys
import time
import json
import requests
import re
from datetime import datetime
sys.path.append('..')
from base.spider import Spider
from bs4 import BeautifulSoup
from urllib.parse import urlparse


class Spider(Spider):
    def getName(self):
        return "Litv"

    def init(self, extend):
        self.extend = extend
        try:
            self.extendDict = json.loads(extend)
        except:
            self.extendDict = {}

        proxy = self.extendDict.get('proxy', None)
        if proxy is None:
            self.is_proxy = False
        else:
            self.proxy = proxy
            self.is_proxy = True
        pass

    def getDependence(self):
        return []

    def isVideoFormat(self, url):
        pass

    def manualVideoCheck(self):
        pass


    def liveContent(self, url):
        m3u_content = ['#EXTM3U']
        headers = {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'zh,zh-CN;q=0.9,en-US;q=0.8,en;q=0.7',
            'Cache-Control': 'max-age=0',
            'Connection': 'keep-alive',
            'If-Modified-Since': 'Sun, 27 Apr 2025 02:30:02 GMT',
            'If-None-Match': 'W/"680d96aa-36851"',
            'Upgrade-Insecure-Requests': '1',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36',
        }

        # 获取网页内容（已解决编码问题）
        response = requests.get('http://www.yoozb.live/', headers=headers, verify=False)
        html_content = response.content.decode('utf-8-sig')

        # 解析HTML内容
        soup = BeautifulSoup(html_content, 'html.parser')
        data_div = soup.find('div', class_='data')
        rows = data_div.find_all('tr')

        # 初始化变量
        current_date = ""
        matches = {
            "结束": [],
            "直播": [],
            "预告": []
        }

        for row in rows:
            # 处理日期行
            if 'class' in row.attrs and 'date' in row['class']:
                date_text = row.td.get_text(strip=True).split('&nbsp')[0]
                try:
                    dt = datetime.strptime(date_text, "%Y年%m月%d日")
                    current_date = dt.strftime("%m-%d")  # 格式化为 月-日
                except:
                    current_date = ""
                continue
            
            # 跳过表头
            if 'class' in row.attrs and 'head' in row['class']:
                continue
            
            # 处理比赛行
            if row.find('td', class_='matcha'):
                tds = row.find_all('td')
                try:
                    # 提取基础信息
                    category = tds[1].get_text(strip=True)
                    time = f"{current_date} {tds[2].get_text(strip=True)}" if current_date else tds[2].get_text(strip=True)
                    status = tds[3].get_text(strip=True) or "预告"
                    home_team = tds[4].get_text(strip=True)
                    away_team = tds[6].get_text(strip=True)
                    live_links = [a['href'] for a in tds[7].find_all('a') if a.has_attr('href')]
                    
                    # 状态标准化
                    status_key = "直播" if "直播" in status else "结束" if "结束" in status else "预告"
                    
                    # 添加到对应分组
                    matches[status_key].append({
                        "时间": time,
                        "分类": category,
                        "主队": home_team,
                        "客队": away_team,
                        "直播链接": live_links
                    })
                except IndexError:
                    continue
        m3u_content = []
        # 分组输出结果
        for status_group in ['直播', '结束', '预告']:
            #print(f"\n===== {status_group}的比赛 =====")
            if status_group == "直播" or status_group == "结束":
                for i, match in enumerate(matches[status_group], 1):
                    #ch_name = f"{i}. [{match['时间']}] {match['分类']}-{match['主队']} vs {match['客队']}"
                    ch_name = f"[{match['时间']}] {match['分类']}-{match['主队']}vs{match['客队']}"
                    links = match['直播链接'][:1]
                    #print("links:",links)
                    for link in links:
                        link = link.replace("\n","").replace(" ","")
                        if link:
                            ch_url = f"video://{link}"
                            extinf = f'#EXTINF:-1 tvg-name="{ch_name}" group-title="{status_group}",{ch_name}'
                            #print(f"{ch_name}[{k}],{ch_url}")
                            m3u_content.extend([extinf, ch_url])
            elif status_group == "预告":
                for i, match in enumerate(matches[status_group], 1):
                    ch_name = f"{i}. [{match['时间']}] {match['分类']}-{match['主队']} vs {match['客队']}"
                    ch_url = "http://"
                    #print(f"{ch_name},{ch_url}")
                    extinf = f'#EXTINF:-1 tvg-name="{ch_name}]" group-title="{status_group}",{ch_name}'
                    #print(f"{ch_name}[{k}],{ch_url}")
                    m3u_content.extend([extinf, ch_url])

        return '\n'.join(m3u_content)

    def homeContent(self, filter):
        return {}

    def homeVideoContent(self):
        return {}

    def categoryContent(self, cid, page, filter, ext):
        return {}

    def detailContent(self, did):
        return {}

    def searchContent(self, key, quick, page='1'):
        return {}

    def searchContentPage(self, keywords, quick, page):
        return {}

    def playerContent(self, flag, pid, vipFlags):
        return {}

    def localProxy(self, params):
        if params['type'] == "m3u8":
            return self.proxyM3u8(params)
        if params['type'] == "ts":
            return self.get_ts(params)
        return [302, "text/plain", None, {'Location': 'https://sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/mp4/xgplayer-demo-720p.mp4'}]
    def proxyM3u8(self, params):
        pid = params['pid']
        info = pid.split(',')
        a = info[0]
        b = info[1]
        c = info[2]
        timestamp = int(time.time() / 4 - 355017625)
        t = timestamp * 4
        m3u8_text = f'#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:4\n#EXT-X-MEDIA-SEQUENCE:{timestamp}\n'
        for i in range(10):
            url = f'https://ntd-tgc.cdn.hinet.net/live/pool/{a}/litv-pc/{a}-avc1_6000000={b}-mp4a_134000_zho={c}-begin={t}0000000-dur=40000000-seq={timestamp}.ts'
            if self.is_proxy:
                url = f'http://127.0.0.1:9978/proxy?do=py&type=ts&url={self.b64encode(url)}'

            m3u8_text += f'#EXTINF:4,\n{url}\n'
            timestamp += 1
            t += 4
        return [200, "application/vnd.apple.mpegurl", m3u8_text]

    def get_ts(self, params):
        url = self.b64decode(params['url'])
        headers = {'User-Agent': 'Mozilla/5.0'}
        response = requests.get(url, headers=headers, stream=True, proxies=self.proxy)
        return [206, "application/octet-stream", response.content]

    def destroy(self):
        return '正在Destroy'

    def b64encode(self, data):
        return base64.b64encode(data.encode('utf-8')).decode('utf-8')

    def b64decode(self, data):
        return base64.b64decode(data.encode('utf-8')).decode('utf-8')


if __name__ == '__main__':
    pass
