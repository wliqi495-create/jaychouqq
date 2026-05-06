/*
@header({
  searchable: 1,
  filterable: 1,
  quickSearch: 0,
  title: '央视大全',
  lang: 'ds',
  isProxyPath: true,
  more: {
      parseApi: [
        {
            host: 'cctv://(.+)',
            flag: 'CCTV'
        },
        {
            host: 'cctv4k://(.+)',
            flag: 'CCTV4K'
        },
        {
            host: 'cctvlive://(.+)',
            flag: 'CCTV直播'
        },
      ]
  },

})
*/

// const {processFile, indexHtml} = $.require('./_lib.cntv.js');
const {parseCCTVUrl, detectInputType, getVideoInfoByPid} = require('./_lib.cntv-urlparse.cjs');
const {processFile} = require('./_lib.cntv2026.cjs');
const {indexHtml} = $.require('./_lib.cntv.js');
const {setH5Str} = $.require('./_lib.cntv.live.js');
var rule = {
    title: '央视大全',
    host: 'https://api.cntv.cn',
    homeUrl: '/lanmu/columnSearch?&fl=&fc=&cid=&p=1&n=500&serviceId=tvcctv&t=json',
    // url: '/list/getVideoAlbumList?fyfilter&area=&letter=&n=24&serviceId=tvcctv&topv=1&t=json',
    url: '/list/getVideoAlbumList?p=fypage&n=24&serviceId=tvcctv&topv=1&t=json',
    searchUrl: 'https://search.cctv.com/ifsearch.php?page=fypage&qtext=**&sort=relevance&pageSize=20&type=video&vtime=-1&datepid=1&channel=&pageflag=0&qtext_str=**',
    searchable: 1,
    filterable: 1,
    quickSearch: 0,
    class_name: '4K专区&栏目大全&特别节目&纪录片&电视剧&动画片',
    class_url: '4K专区&栏目大全&特别节目&纪录片&电视剧&动画片',
    filter_url: 'channel={{fl.channel}}&sc={{fl.sc}}&bigday={{fl.bigday}}&year={{fl.year}}',
    filter: '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',
    headers: {
        'User-Agent': 'PC_UA'
    },
    timeout: 10000,
    play_parse: true,
    lazy: async function () {
        let {input, flag, getProxyUrl} = this;
        log(input);
        // log(flag);
        let guid = '';
        let url = '';
        if (flag === 'CCTV') {
            guid = input;
            url = await getM3u8(guid, getProxyUrl);
        } else if (flag === 'CCTV4K') {
            guid = input;
            // url = 'https://hls09.cntv.myhwcdn.cn/asp/hls/4000/0303000a/3/default/' + guid + '/4000.m3u8';
            url = await getM3u8(guid, getProxyUrl);
        } else if (flag === 'CCTV直播') {
            let channel = input.split('/').slice(-2)[0];
            url = `https://vdnx.live.cntv.cn/api/v3/vdn/live?channel=${channel}&vn=1`;
            // log(channel);
            let authKey = getAuthKey(channel);
            let html = await request(url, {headers: {'auth-key': authKey}});
            let json = JSON.parse(html);
            let indexM3u8 = json.manifest.hls_cdrm.split('?')[0]; // 不去除问号后面的内容的话只能获取到最高720p分辨率
            // log(indexM3u8);
            html = await request(indexM3u8);
            let hdUrl = html.split('\n').find(i => i && !i.startsWith('#'));
            hdUrl = urljoin(indexM3u8, hdUrl);
            // log(html);
            // log(hdUrl);
            return {
                parse: 0,
                url: getProxyUrl() + '&url=' + base64Encode(hdUrl) + '#.m3u8',
                header: {'user-agent': PC_UA, 'referer': 'https://tv.cctv.com/', 'origin': 'https://tv.cctv.com/'}
            }
        } else {
            let html = await request(input);
            guid = getRegexText(html, 'var\\sguid\\s*=\\s*"(.+?)";', 1);
            url = await getM3u8(guid, getProxyUrl);
        }
        return {
            parse: 0,
            url: url,
            headers: rule.headers
        }
    },
    limit: 6,
    double: false,

    推荐: async function () {
        let {input, publicUrl} = this;
        let liveImgUrl = urljoin(publicUrl, './images/lives.jpg');
        let html = await request(input);
        let vods = get_list_lm(html, '栏目大全');
        vods.unshift({
            vod_name: '央视直播',
            vod_pic: liveImgUrl,
            vod_id: 'https://tv.cctv.com/epg/index.shtml#央视直播',
            vod_remarks: 'CCTV台',
        });
        return vods
    },

    一级: async function () {
        let {input, MY_CATE, MY_FL, MY_PAGE} = this;
        let page_count = 24;
        let queryString = objectToQueryString(MY_FL);
        let year_prefix = ''  //栏目大全的年月筛选过滤
        if (MY_CATE === '栏目大全') {
            page_count = 20;
            let url = `${HOST}/lanmu/columnSearch?p=${MY_PAGE}&n=${page_count}&serviceId=tvcctv&t=json`;
            if (queryString) {
                url += `&${queryString}`;
            }
            let year = MY_FL.year || '';
            let month = MY_FL.month || '';
            if (year) {
                year_prefix = year + month
            }
            let html = await request(url);
            return get_list_lm(html, MY_CATE, year_prefix)

        } else if (MY_CATE === '4K专区') {
            let cid = 'CHAL1558416868484111'
            let url = `${HOST}/NewVideo/getLastVideoList4K?serviceId=cctv4k&cid=${cid}&p=${MY_PAGE}&n=${page_count}&t=json`;
            let html = await request(url);
            return get_list_4k(html, MY_CATE);
        } else {
            let channelMap = {
                "特别节目": "CHAL1460955953877151",
                "纪录片": "CHAL1460955924871139",
                "电视剧": "CHAL1460955853485115",
                "动画片": "CHAL1460955899450127",
            };
            let channelid = channelMap[MY_CATE];
            let url = input + `&channelid=${channelid}`;
            if (queryString) {
                url += `&${queryString}`;
            }
            let html = await request(url);
            return get_list_pk(html, MY_CATE)
        }
    },
    二级: async function () {
        let {orId, publicUrl, pdfa} = this;
        // log('orId:', orId);
        let vid = orId;
        if (vid.includes('#央视直播')) {
            let html = await request(vid);
            let video_list = [];
            let list = pdfa(html, '#jiemudan01&&.channel_con&&ul&&li');
            // log(list);
            list.forEach((it) => {
                let _title = pdfh(it, 'img&&title');
                let _url = `https://tv.cctv.com/live/${_title}/`;
                video_list.append(`${_title}$${_url}`);
            });
            let liveImgUrl = urljoin(publicUrl, './images/lives.jpg');
            let vod = {
                "vod_id": vid,
                "vod_name": 'CCTV直播频道列表',
                "vod_pic": liveImgUrl,
                "type_name": '直播',
                "vod_year": '',
                "vod_area": "",
                "vod_remarks": '只含官方CCTV频道',
                "vod_actor": '',
                "vod_director": '',
                "vod_content": '并非全部高清分辨率，取官方网页版最高分辨率'
            };
            vod['vod_play_from'] = 'CCTV直播';
            vod['vod_play_url'] = video_list.join('#');
            return vod
        }
        let year_prefix = '';
        if (orId.includes('$$$')) {
            year_prefix = orId.split('$$$')[0];
            vid = orId.split('$$$')[1];
        }
        let aid = vid.split('||');
        let tid = aid[0];
        let title = aid[1];
        let lastVideo = aid[2];
        let logo = aid[3];
        let id = aid[4];
        let vod_year = aid[5];
        let actors = aid.length > 6 ? aid[6] : '';
        let brief = aid.length > 7 ? aid[7] : '';
        let count = aid.length > 8 ? aid[8] : '';
        let desc = aid.length > 9 ? aid[9] : '';
        let fromId = 'CCTV';
        let reqUrl = '';
        if (tid === '栏目大全') {
            let lastUrl = `https://api.cntv.cn/video/videoinfoByGuid?guid=${id}&serviceId=tvcctv`;
            let html = await request(lastUrl);
            let topicId = JSON.parse(html).ctid;
            reqUrl = `https://api.cntv.cn/NewVideo/getVideoListByColumn?id=${topicId}&d=&p=1&n=100&sort=desc&mode=0&serviceId=tvcctv&t=json&d=${year_prefix}`;
        } else if (tid === '4K专区') {
            reqUrl = `https://api.cntv.cn/NewVideo/getVideoListByAlbumIdNew?id=${id}&serviceId=cctv4k&p=1&n=100&mode=0&pub=1`;
            fromId = 'CCTV4K';
        } else {
            reqUrl = `https://api.cntv.cn/NewVideo/getVideoListByAlbumIdNew?id=${id}&serviceId=tvcctv&p=1&n=100&mode=0&pub=1`;
        }
        let video_list = [];
        try {
            if (tid === '搜索') {
                fromId = '中央台';
                video_list = [title + "$" + lastVideo];
            } else {
                let html = await request(reqUrl);
                let list = JSON.parse(html).data.list;
                video_list = get_episodes_list(list);
                if (video_list.length < 1) {
                    html = await request(lastVideo);
                    let patternTxt;
                    if (['电视剧', '纪录片', '4K专区'].includes(tid)) {
                        // 调整为普通捕获组
                        patternTxt = "'title':\\s*'(.+?)',\\n{0,1}\\s*'brief':\\s*'(.+?)',\\n{0,1}\\s*'img':\\s*'(.+?)',\\n{0,1}\\s*'url':\\s*'(.+?)'";
                    } else if (tid === '特别节目') {
                        // 调整为普通捕获组
                        patternTxt = "class=\"tp1\"><a\\s*href=\"(https://.+?)\"\\s*target=\"_blank\"\\s*title=\"(.+?)\"></a></div>";
                    } else if (tid === '动画片') {
                        patternTxt = `'title':\\s*'(.+?)',\\n{0,1}\\s*'img':\\s*'(.+?)',\\n{0,1}\\s*'brief':\\s*'(.+?)',\\n{0,1}\\s*'url':\\s*'(.+?)'`;
                    } else if (tid === '栏目大全') {
                        // 调整为普通捕获组
                        patternTxt = "href=\"(.+?)\" target=\"_blank\" alt=\"(.+?)\" title=\".+?\">";
                    }
                    video_list = get_episodes_list_re(html, patternTxt, tid);
                    fromId = '央视';
                }
            }
        } catch (e) {
            log(`解析二级发生了错误: ${e.message}`);
        }
        if (video_list.length < 1) {
            return {}
        }
        let vod = {
            "vod_id": vid,
            "vod_name": title.replace(' ', ''),
            "vod_pic": logo,
            "type_name": tid,
            "vod_year": vod_year,
            "vod_area": "",
            "vod_remarks": count ? `共${count}集` : desc,
            "vod_actor": actors,
            "vod_director": '',
            "vod_content": brief
        };
        vod['vod_play_from'] = fromId;
        vod['vod_play_url'] = video_list.join('#');
        return vod
    },
    搜索: async function () {
        let {input} = this;
        let html = await request(input);
        return get_list_search(html, '搜索');
    },
    proxy_rule: async function () {
        let {input, proxyPath, getProxyUrl} = this;
        // log('input:', input);
        // log('proxyPath:', proxyPath);
        let url = '';
        let is_live = 0;
        if (proxyPath) {
            // const BASE_URL = 'https://dh5.cntv.qcloudcdn.com/'.rstrip('/');
            // const BASE_URL = 'https://dh5.cntv.myalicdn.com/'.rstrip('/');
            // url = `${BASE_URL}/${proxyPath}`;
            url = proxyPath;
        } else {
            url = base64Decode(input.split('#')[0]);
            is_live = 1;
        }
        log('start proxy:', url);
        try {
            const filename = pathLib.basename(new URL(url).pathname);
            const extension = pathLib.extname(filename).toLowerCase();
            // log('filename:', filename);
            // log('extension:', extension);
            if (extension !== '.ts' && extension !== '.m3u8') {
                if (filename.endsWith('index.html')) {
                    return [200, 'text/html', indexHtml]
                }
                return [400, 'text/plain', 'Only .ts and .m3u8 files are supported']
            }
            if (is_live && extension === '.m3u8') {
                // log('处理直播的m3u8地址');
                let proxy_url = getProxyUrl();
                let html = await request(url);
                let m3u8Str = html.split('\n').map((it) => {
                    if (it && !it.startsWith("#")) {
                        return proxy_url + '&url=' + base64Encode(urljoin(url, it));
                    }
                    return it
                }).join('\n');
                // log(m3u8Str);
                return [200, 'application/vnd.apple.mpegurl', m3u8Str]
            }
            const contentType = extension === '.ts' ? 'video/MP2T' : 'application/vnd.apple.mpegurl';
            // log('url:', url);
            const buffer = await processFile(url, extension);
            const headers = {
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Type': contentType,
            }
            return [200, contentType, buffer, headers]

        } catch (e) {
            log('proxy error:', e.message);
            return [500, 'text/plain', e.message]
        }
    },
}

// 获取片库一级数据
function get_list_pk(html, tid) {
    let d = [];
    let list = JSON.parse(html).data.list;
    list.forEach(it => {
        let url = it.url;
        let title = it.title;
        let desc = it.sc + ((typeof it.year === 'undefined' || it.year === '') ? '' : ('•' + it.year)) + ((typeof it.count === 'undefined' || it.count === '') ? '' : ('•共' + it.count + '集'));
        let img = it.image;
        let id = it.id;
        let brief = it.brief || '';
        let year = it.year || '';
        let actors = it.actors || '';
        let count = it.count;
        if (url) {
            let guids = [tid, title, url, img, id, year, actors, brief, count];
            let guid = guids.join('||');
            d.push({
                title: title,
                desc: desc,
                pic_url: img,
                url: guid
            });
        }
    });
    return setResult(d)
}

// 获取栏目一级数据
function get_list_lm(html, tid, year_prefix) {
    let d = [];
    let list = JSON.parse(html).response.docs;
    list.forEach(it => {
        let id = it.lastVIDE.videoSharedCode;
        let desc = it.lastVIDE.videoTitle;
        let title = it.column_name;
        let url = it.column_website;
        let img = it.column_logo;
        let year = it.column_playdate;
        let actors = '';
        let brief = it.column_brief;
        let count = it.count;
        if (url.toString().length > 0) {
            let guids = [tid, title, url, img, id, year, actors, brief, count, desc];
            let guid = guids.join('||');
            //log(`✅guid的结果: ${guid}`);
            d.push({
                title: title,
                desc: desc.includes('》') ? desc.split('》')[1].strip() : desc.strip(),
                pic_url: img,
                url: year_prefix ? year_prefix + '$$$' + guid : guid
            });

        }
    });
    return setResult(d)
}

// 获取4k一级数据
function get_list_4k(html, tid) {
    let d = [];
    let list = JSON.parse(html).data.list;
    list.forEach(it => {
        let desc = it.sc + ' ' + it.title;
        let id = it.id;
        let vod = it.last_video;
        let img = vod.image;
        let url = vod.url;
        let title = vod.title;
        let brief = vod.brief || '';
        let year = vod.year || '';
        let actors = vod.actors || '';
        let count = it.count;
        if (url) {
            let guids = [tid, title, url, img, id, year, actors, brief, count];
            let guid = guids.join('||');
            d.push({
                title: title,
                desc: desc,
                pic_url: img,
                url: guid,
            })
        }
    });
    return setResult(d)
}

// 获取搜索列表数据
function get_list_search(html, tid) {
    let d = [];
    let list = JSON.parse(html).list;
    list.forEach(it => {
        let url = it.urllink;
        let title = removeHtml(it.title);
        let img = it.imglink;
        let vid = it.id;
        let brief = it.channel;
        let year = it.uploadtime;
        if (url) {
            let guids = [tid, title, url, img, vid, year, '', brief];
            let guid = "||".join(guids);
            d.push({
                title: title,
                desc: year,
                pic_url: img,
                url: guid,

            });
        }
    });
    return setResult(d)
}

// 获取集数
function get_episodes_list(json_list) {
    let videos = []
    for (const vod of json_list) {
        let url = vod['guid'];
        let title = vod['title'];
        if (url) {
            videos.append(title + "$" + url);
        }
    }
    return videos
}

// 获取集数列表
function get_episodes_list_re(htmlTxt, patternTxt, tid) {
    const regex = new RegExp(patternTxt, 'gm'); // 全局和多行匹配
    const matches = [...htmlTxt.matchAll(regex)]; // 获取所有匹配项
    const videos = [];

    for (const match of matches) {
        let title = null;
        let url = null;
        if (['电视剧', '纪录片', '4K专区', '动画片'].includes(tid)) {
            title = match[1];
            url = match[4];
        } else {
            title = match[2];
            url = match[1];
        }
        if (!title || !url) continue; // 如果没有 title 或 url，跳过
        videos.push(`${title}$${url}`);
    }

    return videos;
}

function removeHtml(txt) {
    // 使用正则表达式移除 HTML 标签
    const htmlTagRegex = /<[^>]+>/g;
    txt = txt.replace(htmlTagRegex, '');

    // 替换 "&nbsp;" 为普通空格
    return txt.replace(/&nbsp;/g, ' ');
}

// 正则取文本
function getRegexText(text, regexText, index) {
    let returnTxt = "";
    const regex = new RegExp(regexText, 'ms'); // 'm' 多行匹配, 's' 让 '.' 匹配换行符
    const match = text.match(regex);

    if (!match) {
        returnTxt = "";
    } else {
        returnTxt = match[index] || "";
    }

    return returnTxt;
}

async function getM3u8(pid, getProxyUrl) {
    const info = await getVideoInfoByPid(pid);
    const proxy_path = info.download_url;
    log('[getM3u8] proxy_path:', proxy_path);
    return getProxyUrl().split('?')[0].rstrip('/') + '/' + proxy_path;
}

async function getM3u8Old(pid, getProxyUrl) {
    const url = `https://vdn.apps.cntv.cn/api/getHttpVideoInfo.do?pid=${pid}`;
    const htmlTxt = await request(url);
    const jo = JSON.parse(htmlTxt);
    const link = jo.hls_url.trim();
    const link1 = jo.manifest.hls_h5e_url.trim();
    const urlPrefix = link.match(/(http[s]?:\/\/[a-zA-Z0-9.]+)\//)?.[1] || '';
    let newLink = link1.split('?')[0];
    newLink = newLink.replace('https://dh5.cntv.qcloudcdn.com', 'https://dh5.cntv.myhwcdn.cn');
    const htmlResponse = await request(newLink);
    const content = htmlResponse.trim();
    const arr = content.split('\n');
    const subUrl = arr[arr.length - 1].split('/');
    const maxVideo = subUrl[subUrl.length - 1].replace('.m3u8', '');
    let hdUrl = link.replaceAll('main', maxVideo);
    if (hdUrl === '') {
        hdUrl = '2000';
    }
    hdUrl = hdUrl.replace(urlPrefix, 'https://newcntv.qcloudcdn.com');
    /*
    const hdResponse = await request(hdUrl);
    if (hdResponse) {
        return hdUrl.split('?')[0];
    } else {
        return '';
    }
    */
    return hookM3u8(hdUrl.split('?')[0], getProxyUrl);
}

function hookM3u8(url, getProxyUrl) {
    let proxy_path = url.replace('https://newcntv.qcloudcdn.com', '').replace('/asp/hls/', '/asp/h5e/hls/');
    let proxy_url = getProxyUrl().split('?')[0].rstrip('/') + proxy_path;
    // log('proxy_url:', proxy_url);
    log('typeof WebAssembly:', typeof WebAssembly);
    return proxy_url
}

function getAuthKey(channel) {
    // channel 如 cctv1
    let time = new Date().getTime();
    let key = "a4220a71b31746908fa3e7fdd7a6852a";
    let number = Math.round(Math.random() * 1000);
    number - 100 < 0 && (number += 100);
    let authKey = time + "-" + number + "-" + setH5Str(channel + time + number + key).toLocaleLowerCase();
    return authKey
}