# coding=utf-8
import re,json,requests
from lxml import etree
from base.spider import Spider
class Spider(Spider):
    def __init__(self):
        self.name="daishuys"
        self.host="https://daishuys.com"
        self.header={'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36','Accept-Language':'zh-CN,zh;q=0.9','Referer':self.host}
    def getName(self):return self.name
    def init(self,extend=''):pass
    def homeContent(self,filter):
        result={"class":[]}
        try:
            classes=[{"type_name":"电影","type_id":"1"},{"type_name":"电视剧","type_id":"2"},{"type_name":"综艺","type_id":"3"},{"type_name":"动漫","type_id":"4"},{"type_name":"恐怖片","type_id":"8"}]
            result["class"]=classes
            filters={}
            for c in classes:
                tid=c['type_id']
                filters[tid]=[{"key":"area","name":"地区","value":[{"n":"全部","v":""},{"n":"大陆","v":"大陆"},{"n":"香港","v":"香港"},{"n":"台湾","v":"台湾"},{"n":"美国","v":"美国"},{"n":"韩国","v":"韩国"},{"n":"日本","v":"日本"},{"n":"英国","v":"英国"},{"n":"法国","v":"法国"},{"n":"泰国","v":"泰国"},{"n":"印度","v":"印度"},{"n":"其他","v":"其他"}]},{"key":"year","name":"年份","value":[{"n":"全部","v":""},{"n":"2025","v":"2025"},{"n":"2024","v":"2024"},{"n":"2023","v":"2023"},{"n":"2022","v":"2022"},{"n":"2021","v":"2021"},{"n":"2020","v":"2020"},{"n":"2019","v":"2019"},{"n":"2018","v":"2018"},{"n":"2017","v":"2017"},{"n":"2016","v":"2016"},{"n":"2015","v":"2015"},{"n":"更早","v":"2014"}]},{"key":"yuyan","name":"语言","value":[{"n":"全部","v":""},{"n":"国语","v":"国语"},{"n":"粤语","v":"粤语"},{"n":"英语","v":"英语"},{"n":"日语","v":"日语"},{"n":"韩语","v":"韩语"}]},{"key":"order","name":"排序","value":[{"n":"周热门","v":"weekhit"},{"n":"最新","v":"time"},{"n":"人气","v":"hit"},{"n":"评分","v":"douban"}]}]
            result["filters"]=filters
        except Exception as e:pass
        return result
    def homeVideoContent(self):return {"list":[]}
    def categoryContent(self,tid,pg,filter,extend):
        videos=[]
        try:
            url=f"{self.host}/search.php"
            params={"page":pg,"searchtype":"5","tid":tid}
            if extend:
                if 'order' in extend and extend['order']:params['order']=extend['order']
                if 'area' in extend and extend['area']:params['area']=extend['area']
                if 'year' in extend and extend['year']:params['year']=extend['year']
                if 'yuyan' in extend and extend['yuyan']:params['yuyan']=extend['yuyan']
            if 'order' not in params:params['order']='weekhit'
            r=requests.get(url,headers=self.header,params=params,timeout=10);r.encoding='utf-8';root=etree.HTML(r.text)
            items=root.xpath('//li[contains(@class, "col-md-2")]')
            for item in items:
                try:
                    a=item.xpath('.//a[contains(@class, "videopic")]')[0];href=a.get('href','')
                    id_match=re.search(r'/movie/index(\d+)\.html',href)
                    if not id_match:continue
                    vod_id=id_match.group(1)
                    title_elem=item.xpath('.//h5/a');vod_name=title_elem[0].text.strip() if title_elem else ''
                    pic=a.get('data-original') or a.get('src','')
                    if pic and pic.startswith('//'):pic='https:'+pic
                    elif pic and pic.startswith('/'):pic=self.host+pic
                    note=a.xpath('.//span[contains(@class,"note")]/text()');remarks=note[0].strip() if note else ''
                    videos.append({"vod_id":vod_id,"vod_name":vod_name,"vod_pic":pic,"vod_remarks":remarks})
                except Exception as e:pass
            total_pages=1
            page_links=root.xpath('//div[contains(@class,"hy-page")]//ul/li/a')
            for link in page_links:
                text=link.text
                if text and text.isdigit():total_pages=max(total_pages,int(text))
            last_link=root.xpath('//div[contains(@class,"hy-page")]//ul/li/a[contains(text(),"尾页")]')
            if last_link:
                href_last=last_link[0].get('href','');num=re.search(r'page=(\d+)',href_last)
                if num:total_pages=int(num.group(1))
            return {'list':videos,'page':int(pg),'pagecount':total_pages,'limit':len(videos),'total':total_pages*20}
        except Exception as e:return {'list':[],'page':1,'pagecount':0,'limit':0,'total':0}
    def detailContent(self,ids):
        try:
            vod_id=ids[0];detail_url=f"{self.host}/movie/index{vod_id}.html"
            r=requests.get(detail_url,headers=self.header,timeout=10);r.encoding='utf-8';root=etree.HTML(r.text)
            title=root.xpath('//h1/text()');vod_name=title[0].strip() if title else ''
            pic=root.xpath('//dt//img/@src');vod_pic=pic[0] if pic else ''
            if vod_pic and vod_pic.startswith('//'):vod_pic='https:'+vod_pic
            actor=director=year=area=content=''
            lis=root.xpath('//dd/ul/li')
            for li in lis:
                text=li.xpath('string(.)').strip()
                if '主演：' in text:actor=re.sub(r'^.*?主演：','',text).strip()
                elif '导演：' in text:director=re.sub(r'^.*?导演：','',text).strip()
                elif '年份：' in text:year=re.sub(r'^.*?年份：','',text).strip()
                elif '地区：' in text:area=re.sub(r'^.*?地区：','',text).strip()
            plot=root.xpath('//div[@class="plot"]/text()')
            if plot:content=plot[0].strip()
            playlist_container=root.xpath('//div[@id="playlist"]')
            if not playlist_container:
                playlist_container=root.xpath('//div[contains(@class,"hy-play-list")]')
            vod_play_from=[];vod_play_url=[]
            if playlist_container:
                container=playlist_container[0];panels=container.xpath('.//div[contains(@class,"panel")]')
                for panel in panels:
                    option=panel.xpath('.//a[contains(@class,"option")]')
                    if not option:continue
                    line_raw=option[0].xpath('string(.)').strip()
                    line_name=re.sub(r'\s*<span.*','',line_raw);line_name=re.sub(r'\s+[<]?[^>]*$','',line_name).strip()
                    if not line_name:line_name=option[0].get('title','').strip()
                    if not line_name:continue
                    playlist_div=panel.xpath('.//div[contains(@class,"playlist")]')
                    if not playlist_div:continue
                    items=playlist_div[0].xpath('.//li/a')
                    if not items:continue
                    play_list=[]
                    for a in items:
                        ep_name=a.get('title') or a.text.strip();href=a.get('href')
                        if not href:continue
                        if href.startswith('//'):url_full='https:'+href
                        elif href.startswith('/'):url_full=self.host+href
                        else:url_full=href
                        play_list.append(f"{ep_name}${url_full}")
                    if play_list:
                        vod_play_from.append(line_name);vod_play_url.append("#".join(play_list))
            if vod_play_from:
                vod_play_from_str="$$$".join(vod_play_from);vod_play_url_str="$$$".join(vod_play_url)
            else:vod_play_from_str="默认";vod_play_url_str=""
            detail={"vod_id":vod_id,"vod_name":vod_name,"vod_pic":vod_pic,"vod_year":year,"vod_area":area,"vod_actor":actor,"vod_director":director,"vod_content":content,"vod_play_from":vod_play_from_str,"vod_play_url":vod_play_url_str}
            return {'list':[detail]}
        except Exception as e:return {'list':[]}
    def playerContent(self,flag,id,vipFlags):
        try:
            r=requests.get(id,headers=self.header,timeout=10);r.encoding='utf-8';html=r.text
            now_match=re.search(r'var now="([^"]+)"',html)
            if now_match:real_url=now_match.group(1);return {"parse":0,"playUrl":"","url":real_url,"header":json.dumps(self.header)}
            iframe_match=re.search(r'<iframe[^>]+src="([^"]+)"',html)
            if iframe_match:
                real_url=iframe_match.group(1)
                if real_url.startswith('//'):real_url='https:'+real_url
                elif real_url.startswith('/'):real_url=self.host+real_url
                return {"parse":0,"playUrl":"","url":real_url,"header":json.dumps(self.header)}
            return {"parse":0,"playUrl":"","url":id,"header":json.dumps(self.header)}
        except Exception as e:return {"parse":0,"playUrl":"","url":""}
    def searchContent(self,key,quick,pg='1'):
        videos=[]
        try:
            search_url=f"{self.host}/search.php";data={"searchword":key,"searchtype":"5"}
            r=requests.post(search_url,headers=self.header,data=data,timeout=10);r.encoding='utf-8';root=etree.HTML(r.text)
            items=root.xpath('//li[contains(@class, "col-md-2")]')
            for item in items:
                try:
                    a=item.xpath('.//a[contains(@class, "videopic")]')[0];href=a.get('href','')
                    id_match=re.search(r'/movie/index(\d+)\.html',href)
                    if not id_match:continue
                    vod_id=id_match.group(1)
                    title_elem=item.xpath('.//h5/a');vod_name=title_elem[0].text.strip() if title_elem else ''
                    pic=a.get('data-original') or a.get('src','')
                    if pic and pic.startswith('//'):pic='https:'+pic
                    elif pic and pic.startswith('/'):pic=self.host+pic
                    remarks=a.xpath('.//span[contains(@class,"note")]/text()');vod_remarks=remarks[0].strip() if remarks else ''
                    videos.append({"vod_id":vod_id,"vod_name":vod_name,"vod_pic":pic,"vod_remarks":vod_remarks})
                except Exception as e:pass
            return {'list':videos,'page':int(pg),'pagecount':1,'limit':len(videos),'total':len(videos)}
        except Exception as e:return {'list':[],'page':1,'pagecount':0,'limit':0,'total':0}
    def isVideoFormat(self,url):return any(url.lower().endswith(fmt) for fmt in ['.m3u8','.mp4','.flv','.ts'])
    def manualVideoCheck(self):pass
    def localProxy(self,params):return None
    def destroy(self):pass