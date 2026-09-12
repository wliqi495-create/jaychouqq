import { Crypto, jinja2, _ } from 'assets://js/lib/cat.js';

let siteKey = '';
let siteType = 0;

let cookie = '';
let login = '';
let vip = false;
let extendObj = {};
let bili_jct = '';
let vod_audio_id = {
    30280: 192000,
    30232: 132000,
    30216: 64000,
};

let vod_codec = {
    // 13: 'AV1',
    12: 'HEVC',
    7: 'AVC',
};

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36';

async function request(reqUrl, ua, buffer) {
    let res = await req(reqUrl, {
        method: 'get',
        headers: ua ? ua : { 'User-Agent': UA },
        timeout: 60000,
        buffer: buffer ? 1 : 0,
    });
    return res.content;
}

async function post(reqUrl, postData, ua, posttype) {
    let res = await req(reqUrl, {
        method: 'post',
        headers: ua ? ua : { 'User-Agent': UA },
        data: postData,
        timeout: 60000,
        postType: posttype,
    });
    return res.content;
}

function getHeaders() {
    const headers = {
        'User-Agent': UA,
    };
    if (!_.isEmpty(cookie)) {
        headers.cookie = cookie;
    }
    return headers;
}

async function getCookie() {
    let result = await req('https://www.bilibili.com', {
        method: 'get',
        headers: { 'User-Agent': UA },
        timeout: 60000,
    });
    const setCookieHeaders = result.headers['set-cookie'];
    cookie = setCookieHeaders.map((kk) => kk.split(';')[0] + ';').join('');
}

async function init(cfg) {
    siteKey = cfg.skey;
    siteType = cfg.stype;
    let extend = cfg.ext;

    if (cfg.ext.hasOwnProperty('categories')) extend = cfg.ext.categories;
    if (cfg.ext.hasOwnProperty('cookie')) cookie = cfg.ext.cookie;
    if (cookie.startsWith('http')) cookie = await request(cookie);
    // 获取csrf
    const cookies = cookie.split(';');
    cookies.forEach(cookie => {
        if (cookie.includes('bili_jct')) {
            bili_jct = cookie.split('=')[1];
        }
    });

    if (_.isEmpty(cookie)) await getCookie();
    let result = JSON.parse(await request('https://api.bilibili.com/x/web-interface/nav', getHeaders()));
    login = result.data.isLogin;
    vip = result.data.vipStatus;
    const ext = extend.split('#');
    const jsonData = [
        {
            key: 'order',
            name: '排序',
            value: [
                { n: '综合排序', v: '0' },
                { n: '最多点击', v: 'click' },
                { n: '最新发布', v: 'pubdate' },
                { n: '最多弹幕', v: 'dm' },
                { n: '最多收藏', v: 'stow' },
            ],
        },
        {
            key: 'duration',
            name: '时长',
            value: [
                { n: '全部时长', v: '0' },
                { n: '60分钟以上', v: '4' },
                { n: '30~60分钟', v: '3' },
                { n: '10~30分钟', v: '2' },
                { n: '10分钟以下', v: '1' },
            ],
        },
    ];
    const newarr = [];
    const d = {};
    const sc = {
        type_name: "首页",
        type_id: "首页",
        land: 1,
        ratio: 1.33,
    }
    newarr.push(sc);
    for (const kk of ext) {
        const c = {
            type_name: kk,
            type_id: kk,
            land: 1,
            ratio: 1.33,
        };
        newarr.push(c);
        d[kk] = jsonData;
    }
    if (!_.isEmpty(bili_jct)) {
        const hc = {
            type_name: "历史记录",
            type_id: "历史记录",
            land: 1,
            ratio: 1.33,
        }
        newarr.push(hc);
    }
    extendObj = {
        classes: newarr,
        filter: d,
    };
}

function home(filter) {
    try {
        const jSONObject = {
            class: extendObj.classes,
        };
        if (filter) {
            jSONObject.filters = extendObj.filter;
        }
        return JSON.stringify(jSONObject);
    } catch (e) {
        return '';
    }
}

async function homeVod() {
    try {
        const list = [];
        const url = 'https://api.bilibili.com/x/web-interface/index/top/rcmd?ps=14&fresh_idx=1&fresh_idx_1h=1';

        const response = await request(url, getHeaders());
        const responseData = JSON.parse(response);
        const vods = responseData.data.item;

        for (const item of vods) {
            const vod = {};
            let imageUrl = item.pic;
            if (imageUrl) {
                if (imageUrl.startsWith('//')) {
                    imageUrl = 'https:' + imageUrl;
                } else if (imageUrl.startsWith('http://')) {
                    imageUrl = 'https://' + imageUrl.substring(7);
                }
            } else {
                imageUrl = '';
            }
            let cd = getFullTime(item.duration);

            vod.vod_id = item.bvid;
            vod.vod_name = htmlDecode(removeTags(item.title));
            vod.vod_pic = imageUrl;
            vod.vod_remarks = cd;
            vod.style = {
                type: 'rect',
                ratio: 1.33,
            },
                list.push(vod);
        }

        const result = { list: list };
        return JSON.stringify(result);
    } catch (e) { }
}

async function category(tid, page, filter, ext) {
    if (page < 1) page = 1;
    ext = ext || {};
    tid = (tid === null || tid === undefined) ? '' : String(tid);
    try {
        if (Object.keys(ext).length > 0 && ext.hasOwnProperty('tid') && ext['tid'].length > 0) {
            tid = ext['tid'];
        }
        let url = '';
        url = `https://api.bilibili.com/x/web-interface/search/type?search_type=video&keyword=${encodeURIComponent(tid)}`;

        if (Object.keys(ext).length > 0) {
            for (const k in ext) {
                if (k == 'tid') {
                    continue;
                }
                url += `&${encodeURIComponent(k)}=${encodeURIComponent(ext[k])}`;
            }
        }

        url += `&page=${encodeURIComponent(page)}`;

        if (tid == "首页") {
            url = "https://api.bilibili.com/x/web-interface/index/top/rcmd?ps=14&fresh_idx=" + page + "&fresh_idx_1h=" + page;
        } else if (tid == "历史记录") {
            url = "https://api.bilibili.com/x/v2/history?pn=" + page;
        }

        const resp = JSON.parse(await request(url, getHeaders()));
        if (!resp || resp.code !== 0 || !resp.data) {
            // 风控/无权限/空返回:返回空列表而不是崩溃
            return JSON.stringify({
                page: page,
                pagecount: page,
                limit: 0,
                total: 0,
                list: [],
            });
        }
        const data = resp.data;
        let items = null;
        if (tid == "首页") {
            items = (data && data.item) || [];
        } else if (tid == "历史记录") {
            items = Array.isArray(data) ? data : [];
        } else {
            items = (data && data.result) || [];
        }

        const videos = [];
        for (const item of items) {
            const video = {};
            let pic = item.pic;
            if (pic) {
                if (pic.startsWith('//')) {
                    pic = 'https:' + pic;
                } else if (pic.startsWith('http://')) {
                    pic = 'https://' + pic.substring(7);
                }
            }
            let cd = getFullTime(item.duration);

            video.vod_remarks = cd;
            video.vod_id = item.bvid || item.aid;
            video.vod_name = htmlDecode(removeTags(item.title));
            video.vod_pic = pic || '';

            video.style = {
                type: 'rect',
                ratio: 1.33,
            };
            videos.push(video);
        }

        let pagecount = data.numPages;
        if (!pagecount && data.numResults) {
            pagecount = Math.ceil(data.numResults / 20);
        }
        if (!pagecount) pagecount = page + 1;

        const result = {
            page: page,
            pagecount: pagecount,
            limit: videos.length,
            total: videos.length,
            list: videos,
        };

        return JSON.stringify(result);
    } catch (e) { }
    return null;
}

async function detail(ids) {
    try {
        const bvid = ids;
        const detailUrl = `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`;

        const detailData = JSON.parse(await request(detailUrl, getHeaders())).data;
        // 记录历史
        if (!_.isEmpty(bili_jct)) {
            const historyReport = 'https://api.bilibili.com/x/v2/history/report';
            let dataPost = {
                aid: detailData.aid,
                cid: detailData.cid,
                csrf: bili_jct,
            }
            await post(historyReport, dataPost, getHeaders(), 'form');
        }
        let cd = getFullTime(detailData.duration);
        const aid = detailData.aid;
        let dpic = detailData.pic;
        if (dpic) {
            if (dpic.startsWith('//')) {
                dpic = 'https:' + dpic;
            } else if (dpic.startsWith('http://')) {
                dpic = 'https://' + dpic.substring(7);
            }
        } else {
            dpic = '';
        }
        const video = {
            vod_id: bvid,
            vod_name: htmlDecode(removeTags(detailData.title)),
            vod_pic: dpic,
            type_name: detailData.tname,
            vod_year: '',
            vod_area: '',
            vod_remarks: cd,
            vod_actor: '',
            vod_director: '',
            vod_content: htmlDecode(removeTags(detailData.desc)),
        };

        const playurldata = 'https://api.bilibili.com/x/player/playurl?avid=' + aid + '&cid=' + detailData.cid + '&qn=127&fnval=4048&fourk=1';
        const playurldatas = JSON.parse(await request(playurldata, getHeaders()));

        const playurldatalist = playurldatas.data;
        const accept_quality = playurldatalist.accept_quality;
        const accept_description = playurldatalist.accept_description;
        const qualitylist = [];
        const descriptionList = [];

        for (let i = 0; i < accept_quality.length; i++) {
            if (!vip) {
                if (!login) {
                    if (accept_quality[i] > 32) continue;
                } else {
                    if (accept_quality[i] > 80) continue;
                }
            }
            descriptionList.push(base64Encode(accept_description[i]));
            qualitylist.push(accept_quality[i]);
        }

        let treeMap = {};
        const jSONArray = detailData.pages;
        let playList = [];
        for (let j = 0; j < jSONArray.length; j++) {
            const jSONObject6 = jSONArray[j];
            const cid = jSONObject6.cid;
            const playUrl = j + '$' + aid + '+' + cid + '+' + qualitylist.join(':') + '+' + descriptionList.join(':');
            playList.push(playUrl);
        }
        treeMap['dash'] = playList.join('#');
        treeMap['mp4'] = playList.join('#');

        const relatedUrl = 'https://api.bilibili.com/x/web-interface/archive/related?bvid=' + bvid;
        const relatedData = JSON.parse(await request(relatedUrl, getHeaders())).data;
        playList = [];
        for (let j = 0; j < relatedData.length; j++) {
            const jSONObject6 = relatedData[j];
            const cid = jSONObject6.cid;
            const title = jSONObject6.title;
            const aaid = jSONObject6.aid;
            const playUrl = title + '$' + aaid + '+' + cid + '+' + qualitylist.join(':') + '+' + descriptionList.join(':');
            playList.push(playUrl);
        }
        treeMap['相关'] = playList.join('#');

        video.vod_play_from = Object.keys(treeMap).join("$$$");
        video.vod_play_url = Object.values(treeMap).join("$$$");

        const list = [video];
        const result = { list };
        return JSON.stringify(result);
    } catch (e) { }
    return null;
}

async function play(flag, id, flags) {
    try {
        const playHeaders = { Referer: 'https://www.bilibili.com', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36' };
        const ids = id.split('+');
        const aid = ids[0];
        const cid = ids[1];
        const qualityIds = ids[2].split(':');
        const qualityName = ids[3].split(':');
        if (flag == 'dash' || flag == '相关') {
            // dash mpd 代理
            const js2Base = await js2Proxy(true, siteType, siteKey, 'dash/', {});
            let urls = [];
            for (let i = 0; i < qualityIds.length; i++) {
                urls.push(base64Decode(qualityName[i]), js2Base + base64Encode(aid + '+' + cid + '+' + qualityIds[i]));
            }
            return JSON.stringify({
                parse: 0,
                url: urls,
                header: playHeaders,
            });
        } else if (flag == 'mp4') {
            // 直链
            let urls = [];
            for (let i = 0; i < qualityIds.length; i++) {
                const url = `https://api.bilibili.com/x/player/playurl?avid=${aid}&cid=${cid}&qn=${qualityIds[i]}&fourk=1`;
                const resp = JSON.parse(await request(url, getHeaders()));
                const data = resp.data;
                if (data.quality != qualityIds[i]) continue;
                let durl = data.durl[0].url;
                urls.push(base64Decode(qualityName[i]), durl);
            }

            return JSON.stringify({
                parse: 0,
                url: urls,
                header: playHeaders,
            });
        } else {
            // 音频外挂
            let urls = [];
            let audios = [];
            for (let i = 0; i < qualityIds.length; i++) {
                const url = `https://api.bilibili.com/x/player/playurl?avid=${aid}&cid=${cid}&qn=${qualityIds[i]}&fnval=4048&fourk=1`;
                let resp = JSON.parse(await request(url, getHeaders()));
                const dash = resp.data.dash;
                const video = dash.video;
                const audio = dash.audio;
                for (let j = 0; j < video.length; j++) {
                    const dashjson = video[j];
                    if (dashjson.id == qualityIds[i]) {
                        for (const key in vod_codec) {
                            if (dashjson.codecid == key) {
                                urls.push(base64Decode(qualityName[i]) + ' ' + vod_codec[key], dashjson.baseUrl);
                            }
                        }
                    }
                }
                if (audios.length == 0) {
                    for (let j = 0; j < audio.length; j++) {
                        const dashjson = audio[j];
                        for (const key in vod_audio_id) {
                            if (dashjson.id == key) {
                                audios.push({
                                    title: _.floor(parseInt(vod_audio_id[key]) / 1024) + 'Kbps',
                                    bit: vod_audio_id[key],
                                    url: dashjson.baseUrl,
                                });
                            }
                        }
                    }
                    audios = _.sortBy(audios, 'bit');
                }
            }

            return JSON.stringify({
                parse: 0,
                url: urls,
                extra: {
                    audio: audios,
                },
                header: playHeaders,
            });
        }
    } catch (e) { }
    return null;
}

async function search(key, quick, pg) {
    let page = pg || 1;
    if (page < 1) page = 1;
    try {
        const respStr = await category(key, page, true, {});
        if (!respStr) {
            return JSON.stringify({
                page: page,
                pagecount: page,
                limit: 0,
                total: 0,
                land: 1,
                ratio: 1.33,
                list: [],
            });
        }
        let resp = null;
        try {
            resp = JSON.parse(respStr);
        } catch (e) {
            resp = null;
        }
        const catVideos = (resp && resp.list) || [];
        const pageCount = (resp && resp.pagecount) || page;
        const result = {
            page: page,
            pagecount: pageCount,
            land: 1,
            ratio: 1.33,
            list: catVideos,
        };
        return JSON.stringify(result);
    } catch (e) { }
    return null;
}

async function proxy(segments, headers) {
    let what = segments[0];
    let url = base64Decode(segments[1]);
    if (what == 'dash') {
        const ids = url.split('+');
        const aid = ids[0];
        const cid = ids[1];
        const str5 = ids[2];
        const urls = `https://api.bilibili.com/x/player/playurl?avid=${aid}&cid=${cid}&qn=${str5}&fnval=4048&fourk=1`;
        let videoList = '';
        let audioList = '';

        let resp = JSON.parse(await request(urls, getHeaders()));
        const dash = resp.data.dash;
        const video = dash.video;
        const audio = dash.audio;

        for (let i = 0; i < video.length; i++) {
            // if (i > 0) continue; // 只取一个
            const dashjson = video[i];
            if (dashjson.id == str5) {
                videoList += getDashMedia(dashjson);
            }
        }

        for (let i = 0; i < audio.length; i++) {
            // if (i > 0) continue;
            const ajson = audio[i];
            for (const key in vod_audio_id) {
                if (ajson.id == key) {
                    audioList += getDashMedia(ajson);
                }
            }
        }

        let mpd = getDash(resp, videoList, audioList);

        return JSON.stringify({
            code: 200,
            content: mpd,
            headers: {
                'Content-Type': 'application/dash+xml',
            },
        });
    }
    return JSON.stringify({
        code: 500,
        content: '',
    });
}

function getDashMedia(dash) {
    try {
        let qnid = dash.id;
        const codecid = dash.codecid;
        const media_codecs = dash.codecs;
        const media_bandwidth = dash.bandwidth;
        const media_startWithSAP = dash.startWithSap;
        const media_mimeType = dash.mimeType;
        const media_BaseURL = dash.baseUrl.replace(/&/g, '&amp;');
        const media_SegmentBase_indexRange = dash.SegmentBase.indexRange;
        const media_SegmentBase_Initialization = dash.SegmentBase.Initialization;
        const mediaType = media_mimeType.split('/')[0];
        let media_type_params = '';

        if (mediaType == 'video') {
            const media_frameRate = dash.frameRate;
            const media_sar = dash.sar;
            const media_width = dash.width;
            const media_height = dash.height;
            media_type_params = `height='${media_height}' width='${media_width}' frameRate='${media_frameRate}' sar='${media_sar}'`;
        } else if (mediaType == 'audio') {
            for (const key in vod_audio_id) {
                if (qnid == key) {
                    const audioSamplingRate = vod_audio_id[key];
                    media_type_params = `numChannels='2' sampleRate='${audioSamplingRate}'`;
                }
            }
        }
        qnid += '_' + codecid;

        return `<AdaptationSet lang="chi">
        <ContentComponent contentType="${mediaType}"/>
        <Representation id="${qnid}" bandwidth="${media_bandwidth}" codecs="${media_codecs}" mimeType="${media_mimeType}" ${media_type_params} startWithSAP="${media_startWithSAP}">
          <BaseURL>${media_BaseURL}</BaseURL>
          <SegmentBase indexRange="${media_SegmentBase_indexRange}">
            <Initialization range="${media_SegmentBase_Initialization}"/>
          </SegmentBase>
        </Representation>
      </AdaptationSet>`;
    } catch (e) {
        // Handle exceptions here
    }
}

function getDash(ja, videoList, audioList) {
    const duration = ja.data.dash.duration;
    const minBufferTime = ja.data.dash.minBufferTime;
    return `<MPD xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="urn:mpeg:dash:schema:mpd:2011" xsi:schemaLocation="urn:mpeg:dash:schema:mpd:2011 DASH-MPD.xsd" type="static" mediaPresentationDuration="PT${duration}S" minBufferTime="PT${minBufferTime}S" profiles="urn:mpeg:dash:profile:isoff-on-demand:2011">
      <Period duration="PT${duration}S" start="PT0S">
        ${videoList}
        ${audioList}
      </Period>
    </MPD>`;
}


function base64Encode(text) {
    return Crypto.enc.Base64.stringify(Crypto.enc.Utf8.parse(text));
}

function base64Decode(text) {
    return Crypto.enc.Utf8.stringify(Crypto.enc.Base64.parse(text));
}



function removeTags(input) {
    if (!input) return '';
    return String(input).replace(/<[^>]*>/g, '');
}

function htmlDecode(input) {
    if (!input) return '';
    return String(input)
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ');
}

function getFullTime(numberSec) {
    let totalSeconds = NaN;
    try {
        if (numberSec === null || numberSec === undefined || numberSec === '') {
            return '';
        }
        if (typeof numberSec === 'number') {
            totalSeconds = numberSec;
        } else {
            const s = String(numberSec).trim();
            if (s === '') return '';
            if (s.indexOf(':') >= 0) {
                const parts = s.split(':').map((x) => parseInt(x, 10));
                if (parts.some(isNaN)) {
                    return '';
                }
                // 兼容 mm:ss 与 h:mm:ss
                totalSeconds = 0;
                for (let i = 0; i < parts.length; i++) {
                    totalSeconds = totalSeconds * 60 + parts[i];
                }
            } else {
                totalSeconds = parseInt(s, 10);
            }
        }
    } catch (e) {
        totalSeconds = parseInt(String(numberSec), 10);
    }
    if (isNaN(totalSeconds) || totalSeconds < 0) {
        return '';
    }
    totalSeconds = Math.floor(totalSeconds);
    if (totalSeconds >= 3600) {
        const hours = Math.floor(totalSeconds / 3600);
        const remainingSecondsAfterHours = totalSeconds % 3600;
        const minutes = Math.floor(remainingSecondsAfterHours / 60);
        const seconds = remainingSecondsAfterHours % 60;
        return `${hours}小时 ${minutes}分钟 ${seconds}秒`;
    } else {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}分钟 ${seconds}秒`;
    }
}

export function __jsEvalReturn() {
    return {
        init: init,
        home: home,
        homeVod: homeVod,
        category: category,
        detail: detail,
        play: play,
        proxy: proxy,
        search: search,
    };
}
