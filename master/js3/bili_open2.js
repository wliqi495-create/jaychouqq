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
    try {
        let res = await req(reqUrl, {
            method: 'get',
            headers: ua ? ua : { 'User-Agent': UA },
            timeout: 60000,
            buffer: buffer ? 1 : 0,
        });
        return res?.content ?? '';
    } catch (e) {
        console.error('request error', reqUrl, e?.message);
        return '';
    }
}

async function post(reqUrl, postData, ua, posttype) {
    try {
        let res = await req(reqUrl, {
            method: 'post',
            headers: ua ? ua : { 'User-Agent': UA },
            data: postData,
            timeout: 60000,
            postType: posttype,
        });
        return res?.content ?? '';
    } catch (e) {
        console.error('post error', reqUrl, e?.message);
        return '';
    }
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
    try {
        let result = await req('https://www.bilibili.com', {
            method: 'get',
            headers: { 'User-Agent': UA },
            timeout: 60000,
        });
        const sc = result?.headers?.['set-cookie'];
        if (sc && Array.isArray(sc)) {
            cookie = sc.map((kk) => kk.split(';')[0] + ';').join('');
        }
    } catch (e) {
        console.error('getCookie error', e?.message);
    }
}

async function init(cfg) {
    try {
        siteKey = cfg.skey;
        siteType = cfg.stype;
        let extend = cfg.ext;

        if (cfg.ext?.hasOwnProperty('categories')) extend = cfg.ext.categories;
        if (cfg.ext?.hasOwnProperty('cookie')) cookie = cfg.ext.cookie;
        if (cookie && cookie.startsWith('http')) cookie = await request(cookie);
        // 获取csrf
        bili_jct = '';
        const cookies = (cookie || '').split(';');
        cookies.forEach(c => {
            if (c.includes('bili_jct')) {
                bili_jct = c.split('=')[1]?.trim() || '';
            }
        });

        if (_.isEmpty(cookie)) await getCookie();
        let result = safeJson(await request('https://api.bilibili.com/x/web-interface/nav', getHeaders()));
        login = result?.data?.isLogin ?? false;
        vip = result?.data?.vipStatus ?? 0;
        const ext = (extend || '').split('#');
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
        newarr.push({ type_name: "首页", type_id: "首页", land: 1, ratio: 1.33 });
        for (const kk of ext) {
            if (!kk) continue;
            newarr.push({ type_name: kk, type_id: kk, land: 1, ratio: 1.33 });
            d[kk] = jsonData;
        }
        if (!_.isEmpty(bili_jct)) {
            newarr.push({ type_name: "历史记录", type_id: "历史记录", land: 1, ratio: 1.33 });
        }
        extendObj = { classes: newarr, filter: d };
    } catch (e) {
        console.error('init error', e?.message);
        extendObj = { classes: [{ type_name: "首页", type_id: "首页", land: 1, ratio: 1.33 }], filter: {} };
    }
}

function home(filter) {
    try {
        const jSONObject = { class: extendObj.classes || [] };
        if (filter) {
            jSONObject.filters = extendObj.filter || {};
        }
        return JSON.stringify(jSONObject);
    } catch (e) {
        return JSON.stringify({ class: [] });
    }
}

async function homeVod() {
    try {
        const list = [];
        const url = 'https://api.bilibili.com/x/web-interface/index/top/rcmd?ps=14&fresh_idx=1&fresh_idx_1h=1';
        const response = await request(url, getHeaders());
        const responseData = safeJson(response);
        const vods = responseData?.data?.item ?? [];
        for (const item of vods) {
            if (!item?.bvid) continue;
            let imageUrl = item.pic || '';
            if (imageUrl.startsWith('//')) imageUrl = 'https:' + imageUrl;
            list.push({
                vod_id: item.bvid,
                vod_name: removeTags(item.title || ''),
                vod_pic: imageUrl,
                vod_remarks: getFullTime(item.duration),
                style: { type: 'rect', ratio: 1.33 }
            });
        }
        return JSON.stringify({ list });
    } catch (e) {
        console.error('homeVod error', e?.message);
        return JSON.stringify({ list: [] });
    }
}

async function category(tid, page, filter, ext) {
    if (page < 1) page = 1;
    try {
        ext = ext || {};
        if (Object.keys(ext).length > 0 && ext.hasOwnProperty('tid') && ext['tid']?.length > 0) {
            tid = ext['tid'];
        }
        let url = '';
        if (tid === "首页") {
            url = "https://api.bilibili.com/x/web-interface/index/top/rcmd?ps=14&fresh_idx=" + page + "&fresh_idx_1h=" + page;
        } else if (tid === "历史记录") {
            url = "https://api.bilibili.com/x/v2/history?pn=" + page;
        } else {
            url = `https://api.bilibili.com/x/web-interface/search/type?search_type=video&keyword=${encodeURIComponent(tid)}`;
            for (const k in ext) {
                if (k === 'tid') continue;
                url += `&${encodeURIComponent(k)}=${encodeURIComponent(ext[k])}`;
            }
            url += `&page=${encodeURIComponent(page)}`;
        }

        const respText = await request(url, getHeaders());
        const dataJson = safeJson(respText);
        const data = dataJson?.data ?? {};
        let items = [];
        if (tid === "首页") items = data.item ?? [];
        else if (tid === "历史记录") items = Array.isArray(data) ? data : (data.list ?? []);
        else items = data.result ?? [];

        const videos = [];
        for (const item of items) {
            if (!item?.bvid) continue;
            let pic = item.pic || '';
            if (pic.startsWith('//')) pic = 'https:' + pic;
            videos.push({
                vod_id: item.bvid,
                vod_name: removeTags(item.title || ''),
                vod_pic: pic,
                vod_remarks: getFullTime(item.duration),
                style: { type: 'rect', ratio: 1.33 }
            });
        }

        const pagecount = data.numPages ?? (videos.length > 0 ? page + 1 : page);
        return JSON.stringify({
            page: page,
            pagecount: pagecount,
            limit: videos.length,
            total: 0,
            list: videos,
        });
    } catch (e) {
        console.error('category error', e?.message);
    }
    return JSON.stringify({ list: [], page: 1, pagecount: 0, limit: 0, total: 0 });
}

async function detail(ids) {
    try {
        const bvid = ids;
        const detailUrl = `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`;
        const detailJson = safeJson(await request(detailUrl, getHeaders()));
        const detailData = detailJson?.data;
        if (!detailData) throw new Error('detail api empty');

        // 记录历史
        if (!_.isEmpty(bili_jct)) {
            await post('https://api.bilibili.com/x/v2/history/report', {
                aid: detailData.aid,
                cid: detailData.cid,
                csrf: bili_jct,
            }, getHeaders(), 'form');
        }

        const aid = detailData.aid;
        let picUrl = detailData.pic || '';
        if (picUrl.startsWith('//')) picUrl = 'https:' + picUrl;
        const video = {
            vod_id: bvid,
            vod_name: detailData.title,
            vod_pic: picUrl,
            type_name: detailData.tname || '',
            vod_year: '',
            vod_area: '',
            vod_remarks: getFullTime(detailData.duration),
            vod_actor: '',
            vod_director: '',
            vod_content: detailData.desc || '',
        };

        const playurldata = 'https://api.bilibili.com/x/player/playurl?avid=' + aid + '&cid=' + detailData.cid + '&qn=127&fnval=4048&fourk=1';
        const playurldatas = safeJson(await request(playurldata, getHeaders()));
        const playurldatalist = playurldatas?.data ?? {};
        const accept_quality = playurldatalist.accept_quality ?? [];
        const accept_description = playurldatalist.accept_description ?? [];
        const qualitylist = [];
        const descriptionList = [];

        for (let i = 0; i < accept_quality.length; i++) {
            const q = accept_quality[i];
            let skip = false;
            if (!login) {
                if (q > 64) skip = true;
            } else if (!vip) {
                if (q > 80) skip = true;
            }
            if (!skip) {
                qualitylist.push(q);
                descriptionList.push(base64Encode(accept_description[i] || ''));
            }
        }
        // 兜底：过滤完为空就全部保留
        if (qualitylist.length === 0 && accept_quality.length > 0) {
            qualitylist.push(...accept_quality);
            accept_description.forEach(d => descriptionList.push(base64Encode(d || '')));
        }

        const treeMap = {};
        const jSONArray = detailData.pages ?? [];
        const playList = [];
        // fix: 分P标题使用 pages[].part 真实标题，不再只用数字序号
        for (let j = 0; j < jSONArray.length; j++) {
            const pageItem = jSONArray[j];
            const cid = pageItem.cid;
            const partTitle = removeTags(pageItem.part || `P${j + 1}`);
            const playUrl = `${partTitle}$${aid}+${cid}+${qualitylist.join(':')}+${descriptionList.join(':')}`;
            playList.push(playUrl);
        }
        treeMap['dash'] = playList.join('#');
        treeMap['mp4'] = playList.join('#');

        const relatedUrl = 'https://api.bilibili.com/x/web-interface/archive/related?bvid=' + bvid;
        const relatedJson = safeJson(await request(relatedUrl, getHeaders()));
        const relatedData = relatedJson?.data ?? [];
        const relatedPlay = [];
        for (const item of relatedData) {
            if (!item?.aid || !item?.cid) continue;
            relatedPlay.push(`${removeTags(item.title || '相关视频')}$${item.aid}+${item.cid}+${qualitylist.join(':')}+${descriptionList.join(':')}`);
        }
        treeMap['相关'] = relatedPlay.join('#');

        video.vod_play_from = Object.keys(treeMap).join("$$$");
        video.vod_play_url = Object.values(treeMap).join("$$$");
        return JSON.stringify({ list: [video] });
    } catch (e) {
        console.error('detail error', e?.message);
    }
    return JSON.stringify({ list: [] });
}

async function play(flag, id, flags) {
    try {
        const playHeaders = {
            Referer: 'https://www.bilibili.com',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
        };
        const ids = String(id || '').split('+');
        const aid = ids[0];
        const cid = ids[1];
        const qualityIds = (ids[2] || '').split(':').filter(Boolean);
        const qualityName = (ids[3] || '').split(':').filter(Boolean);

        if (flag === 'dash' || flag === '相关') {
            const js2Base = await js2Proxy(true, siteType, siteKey, 'dash/', {});
            let urls = [];
            for (let i = 0; i < qualityIds.length; i++) {
                if (!qualityName[i]) continue;
                urls.push(base64Decode(qualityName[i]), js2Base + base64Encode(aid + '+' + cid + '+' + qualityIds[i]));
            }
            return JSON.stringify({ parse: 0, url: urls, header: playHeaders });
        } else if (flag === 'mp4') {
            let urls = [];
            for (let i = 0; i < qualityIds.length; i++) {
                const url = `https://api.bilibili.com/x/player/playurl?avid=${aid}&cid=${cid}&qn=${qualityIds[i]}&fourk=1`;
                const respJson = safeJson(await request(url, getHeaders()));
                const data = respJson?.data;
                if (!data || !data.durl || !data.durl[0]) continue;
                if (data.quality != qualityIds[i]) continue;
                urls.push(base64Decode(qualityName[i] || ''), data.durl[0].url);
            }
            return JSON.stringify({ parse: 0, url: urls, header: playHeaders });
        } else {
            let urls = [];
            let audios = [];
            for (let i = 0; i < qualityIds.length; i++) {
                const url = `https://api.bilibili.com/x/player/playurl?avid=${aid}&cid=${cid}&qn=${qualityIds[i]}&fnval=4048&fourk=1`;
                const respJson = safeJson(await request(url, getHeaders()));
                const dash = respJson?.data?.dash;
                if (!dash) continue;
                const video = dash.video ?? [];
                const audio = dash.audio ?? [];
                for (const dashjson of video) {
                    if (dashjson.id == qualityIds[i]) {
                        for (const key in vod_codec) {
                            if (dashjson.codecid == key) {
                                urls.push(base64Decode(qualityName[i] || '') + ' ' + vod_codec[key], dashjson.baseUrl);
                            }
                        }
                    }
                }
                if (audios.length === 0) {
                    for (const dashjson of audio) {
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
            return JSON.stringify({ parse: 0, url: urls, extra: { audio: audios }, header: playHeaders });
        }
    } catch (e) {
        console.error('play error', e?.message);
    }
    return JSON.stringify({ parse: 0, url: '', header: {} });
}

// fix: search 独立请求搜索接口，不再调用 category，避免首页/历史记录分支干扰
async function search(key, quick, pg) {
    let page = pg || 1;
    if (page <= 0) page = 1;
    try {
        const url = `https://api.bilibili.com/x/web-interface/search/type?search_type=video&keyword=${encodeURIComponent(key)}&page=${page}&order=0&duration=0`;
        const respText = await request(url, getHeaders());
        const json = safeJson(respText);
        const items = json?.data?.result ?? [];
        const videos = [];
        for (const item of items) {
            if (!item?.bvid || item.type !== 'video') continue;
            let pic = item.pic || '';
            if (pic.startsWith('//')) pic = 'https:' + pic;
            videos.push({
                vod_id: item.bvid,
                vod_name: removeTags(item.title || ''),
                vod_pic: pic,
                vod_remarks: getFullTime(item.duration),
                style: { type: 'rect', ratio: 1.33 }
            });
        }
        const pagecount = json?.data?.numPages ?? (videos.length > 0 ? page + 1 : page);
        return JSON.stringify({
            page: page,
            pagecount: pagecount,
            land: 1,
            ratio: 1.33,
            list: videos,
        });
    } catch (e) {
        console.error('search error', e?.message);
    }
    return JSON.stringify({ page: 1, pagecount: 0, land: 1, ratio: 1.33, list: [] });
}

async function proxy(segments, headers) {
    try {
        const what = segments[0];
        const url = base64Decode(segments[1]);
        if (what === 'dash') {
            const ids = url.split('+');
            const aid = ids[0];
            const cid = ids[1];
            const str5 = ids[2];
            const urls = `https://api.bilibili.com/x/player/playurl?avid=${aid}&cid=${cid}&qn=${str5}&fnval=4048&fourk=1`;
            const respJson = safeJson(await request(urls, getHeaders()));
            const dash = respJson?.data?.dash;
            if (!dash) throw new Error('dash empty');
            let videoList = '';
            let audioList = '';
            for (const dashjson of dash.video ?? []) {
                if (dashjson.id == str5) {
                    videoList += getDashMedia(dashjson);
                }
            }
            for (const ajson of dash.audio ?? []) {
                for (const key in vod_audio_id) {
                    if (ajson.id == key) {
                        audioList += getDashMedia(ajson);
                    }
                }
            }
            const mpd = getDash(respJson, videoList, audioList);
            return JSON.stringify({
                code: 200,
                content: mpd,
                headers: { 'Content-Type': 'application/dash+xml' },
            });
        }
    } catch (e) {
        console.error('proxy error', e?.message);
    }
    return JSON.stringify({ code: 500, content: '' });
}

function getDashMedia(dash) {
    try {
        let qnid = dash.id;
        const codecid = dash.codecid;
        const media_codecs = dash.codecs;
        const media_bandwidth = dash.bandwidth;
        const media_startWithSAP = dash.startWithSap;
        const media_mimeType = dash.mimeType;
        const media_BaseURL = (dash.baseUrl || '').replace(/&/g, '&amp;');
        const media_SegmentBase_indexRange = dash.SegmentBase?.indexRange || '';
        const media_SegmentBase_Initialization = dash.SegmentBase?.Initialization || '';
        const mediaType = media_mimeType.split('/')[0];
        let media_type_params = '';

        if (mediaType === 'video') {
            media_type_params = `height='${dash.height}' width='${dash.width}' frameRate='${dash.frameRate}' sar='${dash.sar}'`;
        } else if (mediaType === 'audio') {
            for (const key in vod_audio_id) {
                if (qnid == key) {
                    media_type_params = `numChannels='2' sampleRate='${vod_audio_id[key]}'`;
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
        return '';
    }
}

function getDash(ja, videoList, audioList) {
    const duration = ja?.data?.dash?.duration ?? 0;
    const minBufferTime = ja?.data?.dash?.minBufferTime ?? 0;
    return `<MPD xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="urn:mpeg:dash:schema:mpd:2011" xsi:schemaLocation="urn:mpeg:dash:schema:mpd:2011 DASH-MPD.xsd" type="static" mediaPresentationDuration="PT${duration}S" minBufferTime="PT${minBufferTime}S" profiles="urn:mpeg:dash:profile:isoff-on-demand:2011">
      <Period duration="PT${duration}S" start="PT0S">
        ${videoList}
        ${audioList}
      </Period>
    </MPD>`;
}

function base64Encode(text) {
    return Crypto.enc.Base64.stringify(Crypto.enc.Utf8.parse(text || ''));
}

function base64Decode(text) {
    if (!text) return '';
    try {
        return Crypto.enc.Utf8.stringify(Crypto.enc.Base64.parse(text));
    } catch (e) {
        return '';
    }
}

function removeTags(input) {
    return String(input || '').replace(/<[^>]*>/g, '');
}

// fix: B站 duration 字段是整数秒数，不再无脑 split(":")
function getFullTime(dur) {
    if (!dur && dur !== 0) return '';
    let sec = 0;
    if (typeof dur === 'number') {
        sec = dur;
    } else {
        const s = String(dur).trim();
        if (s.includes(':')) {
            const arr = s.split(':');
            const min = parseInt(arr[0]) || 0;
            const ss = parseInt(arr[1]) || 0;
            sec = min * 60 + ss;
        } else {
            sec = parseInt(s) || 0;
        }
    }
    if (isNaN(sec) || sec <= 0) return '';
    if (sec >= 3600) {
        const h = Math.floor(sec / 3600);
        const rem = sec % 3600;
        const m = Math.floor(rem / 60);
        const s = rem % 60;
        return `${h}小时${m}分${s}秒`;
    } else {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}分${s}秒`;
    }
}

function safeJson(str) {
    try {
        if (!str) return null;
        return JSON.parse(str);
    } catch (e) {
        return null;
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
