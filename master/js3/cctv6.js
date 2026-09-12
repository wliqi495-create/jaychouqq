import { Crypto, _ } from 'assets://js/lib/cat.js';
let siteKey = '';
let siteType = 0;
const HOST = "https://api.cntv.cn";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";
const DEFAULT_HEADERS = {
    "User-Agent": UA,
    "Accept": "*/*",
    "Host": "tv.cctv.com",
    "Referer": "https://tv.cctv.com/"
};

async function request(url, optHeaders = {}) {
    try {
        const headers = Object.assign({}, DEFAULT_HEADERS, optHeaders);
        const res = await req(url, {
            method: "GET",
            headers: headers,
            timeout: 15000
        });
        return res?.content ?? "";
    } catch (e) {
        console.error("request error:", url, e?.message);
        return "";
    }
}

function b64EncodeUtf8(str) {
    return Crypto.enc.Base64.stringify(Crypto.enc.Utf8.parse(str || ""));
}

function b64DecodeUtf8(b64) {
    try {
        return Crypto.enc.Utf8.stringify(Crypto.enc.Base64.parse(b64 || ""));
    } catch (e) {
        return "";
    }
}

function safeJson(str) {
    try {
        if (!str) return null;
        return JSON.parse(str);
    } catch (e) {
        console.error("safeJson parse error", e.message);
        return null;
    }
}

function fixPicUrl(url) {
    if (!url) return '';
    url = url.trim();
    if (url.startsWith('http')) return url;
    if (url.startsWith('//')) return `https:${url}`;
    return `https://${url}`;
}

// 分类定义
const CCTV_CLASSES = [
    { type_id: "栏目大全", type_name: "栏目大全", land: 1, ratio: 1.33 },
    { type_id: "电视剧", type_name: "电视剧", land: 1, ratio: 1.33 },
    { type_id: "动画片", type_name: "动画片", land: 1, ratio: 1.33 },
    { type_id: "纪录片", type_name: "纪录片", land: 1, ratio: 1.33 },
    { type_id: "特别节目", type_name: "特别节目", land: 1, ratio: 1.33 }
];

// 筛选配置，完全复制原python config.filter
const CCTV_FILTER = {
    "电视剧": [
        {"key":"datafl-sc","name":"类型","value":[{"n":"全部","v":""},{"n":"谍战","v":"谍战"},{"n":"悬疑","v":"悬疑"},{"n":"刑侦","v":"刑侦"},{"n":"历史","v":"历史"},{"n":"古装","v":"古装"},{"n":"武侠","v":"武侠"},{"n":"军旅","v":"军旅"},{"n":"战争","v":"战争"},{"n":"喜剧","v":"喜剧"},{"n":"青春","v":"青春"},{"n":"言情","v":"言情"},{"n":"偶像","v":"偶像"},{"n":"家庭","v":"家庭"},{"n":"年代","v":"年代"},{"n":"革命","v":"革命"},{"n":"农村","v":"农村"},{"n":"都市","v":"都市"},{"n":"其他","v":"其他"}]},
        {"key":"datanf-year","name":"年份","value":[{"n":"全部","v":""},{"n":"2023","v":"2023"},{"n":"2022","v":"2022"},{"n":"2021","v":"2021"},{"n":"2020","v":"2020"},{"n":"2019","v":"2019"},{"n":"2018","v":"2018"},{"n":"2017","v":"2017"},{"n":"2016","v":"2016"},{"n":"2015","v":"2015"},{"n":"2014","v":"2014"},{"n":"2013","v":"2013"},{"n":"2012","v":"2012"},{"n":"2011","v":"2011"},{"n":"2010","v":"2010"},{"n":"2009","v":"2009"},{"n":"2008","v":"2008"},{"n":"2007","v":"2007"},{"n":"2006","v":"2006"},{"n":"2005","v":"2005"},{"n":"2004","v":"2004"},{"n":"2003","v":"2003"},{"n":"2002","v":"2002"},{"n":"2001","v":"2001"},{"n":"2000","v":"2000"},{"n":"1999","v":"1999"},{"n":"1998","v":"1998"},{"n":"1997","v":"1997"}]},
        {"key":"dataszm-letter","name":"字母","value":[{"n":"全部","v":""},{"n":"A","v":"A"},{"n":"C","v":"C"},{"n":"E","v":"E"},{"n":"F","v":"F"},{"n":"G","v":"G"},{"n":"H","v":"H"},{"n":"I","v":"I"},{"n":"J","v":"J"},{"n":"K","v":"K"},{"n":"L","v":"L"},{"n":"M","v":"M"},{"n":"N","v":"N"},{"n":"O","v":"O"},{"n":"P","v":"P"},{"n":"Q","v":"Q"},{"n":"R","v":"R"},{"n":"S","v":"S"},{"n":"T","v":"T"},{"n":"U","v":"U"},{"n":"V","v":"V"},{"n":"W","v":"W"},{"n":"X","v":"X"},{"n":"Y","v":"Y"},{"n":"Z","v":"Z"},{"n":"0-9","v":"0-9"}]}
    ],
    "动画片": [
        {"key":"datafl-sc","name":"类型","value":[{"n":"全部","v":""},{"n":"亲子","v":"亲子"},{"n":"搞笑","v":"搞笑"},{"n":"冒险","v":"冒险"},{"n":"动作","v":"动作"},{"n":"宠物","v":"宠物"},{"n":"体育","v":"体育"},{"n":"益智","v":"益智"},{"n":"历史","v":"历史"},{"n":"教育","v":"教育"},{"n":"校园","v":"校园"},{"n":"言情","v":"言情"},{"n":"武侠","v":"武侠"},{"n":"经典","v":"经典"},{"n":"未来","v":"未来"},{"n":"古代","v":"古代"},{"n":"神话","v":"神话"},{"n":"真人","v":"真人"},{"n":"励志","v":"励志"},{"n":"热血","v":"热血"},{"n":"奇幻","v":"奇幻"},{"n":"童话","v":"童话"},{"n":"剧情","v":"剧情"},{"n":"夺宝","v":"夺宝"},{"n":"其他","v":"其他"}]},
        {"key":"datadq-area","name":"地区","value":[{"n":"全部","v":""},{"n":"中国大陆","v":"中国大陆"},{"n":"美国","v":"美国"},{"n":"欧洲","v":"欧洲"}]},
        {"key":"dataszm-letter","name":"字母","value":[{"n":"全部","v":""},{"n":"A","v":"A"},{"n":"C","v":"C"},{"n":"E","v":"E"},{"n":"F","v":"F"},{"n":"G","v":"G"},{"n":"H","v":"H"},{"n":"I","v":"I"},{"n":"J","v":"J"},{"n":"K","v":"K"},{"n":"L","v":"L"},{"n":"M","v":"M"},{"n":"N","v":"N"},{"n":"O","v":"O"},{"n":"P","v":"P"},{"n":"Q","v":"Q"},{"n":"R","v":"R"},{"n":"S","v":"S"},{"n":"T","v":"T"},{"n":"U","v":"U"},{"n":"V","v":"V"},{"n":"W","v":"W"},{"n":"X","v":"X"},{"n":"Y","v":"Y"},{"n":"Z","v":"Z"},{"n":"0-9","v":"0-9"}]}
    ],
    "纪录片": [
        {"key":"datapd-channel","name":"频道","value":[{"n":"全部","v":""},{"n":"CCTV-1 综合","v":"CCTV-1综合"},{"n":"CCTV-2 财经","v":"CCTV-2财经"},{"n":"CCTV-3 综艺","v":"CCTV-3综艺"},{"n":"CCTV-4 中文国际","v":"CCTV-4中文国际(亚)"},{"n":"CCTV-5 体育","v":"CCTV-5体育"},{"n":"CCTV-6 电影","v":"CCTV-6电影"},{"n":"CCTV-7 国防军事","v":"CCTV-7军事农业"},{"n":"CCTV-8 电视剧","v":"CCTV-8电视剧"},{"n":"CCTV-9 纪录","v":"CCTV-9纪录"},{"n":"CCTV-10 科教","v":"CCTV-10科教"},{"n":"CCTV-11 戏曲","v":"CCTV-11戏曲"},{"n":"CCTV-12 社会与法","v":"CCTV-12社会与法"},{"n":"CCTV-13 新闻","v":"CCTV-13新闻"},{"n":"CCTV-14 少儿","v":"CCTV-14少儿"},{"n":"CCTV-15 音乐","v":"CCTV-15音乐"},{"n":"CCTV-17 农业农村","v":"CCTV-17农业农村高清"}]},
        {"key":"datafl-sc","name":"类型","value":[{"n":"全部","v":""},{"n":"人文历史","v":"人文历史"},{"n":"人物","v":"人物"},{"n":"军事","v":"军事"},{"n":"探索","v":"探索"},{"n":"社会","v":"社会"},{"n":"时政","v":"时政"},{"n":"经济","v":"经济"},{"n":"科技","v":"科技"}]},
        {"key":"datanf-year","name":"年份","value":[{"n":"全部","v":""},{"n":"2023","v":"2023"},{"n":"2022","v":"2022"},{"n":"2021","v":"2021"},{"n":"2020","v":"2020"},{"n":"2019","v":"2019"},{"n":"2018","v":"2018"},{"n":"2017","v":"2017"},{"n":"2016","v":"2016"},{"n":"2015","v":"2015"},{"n":"2014","v":"2014"},{"n":"2013","v":"2013"},{"n":"2012","v":"2012"},{"n":"2011","v":"2011"},{"n":"2010","v":"2010"},{"n":"2009","v":"2009"},{"n":"2008","v":"2008"}]},
        {"key":"dataszm-letter","name":"字母","value":[{"n":"全部","v":""},{"n":"A","v":"A"},{"n":"C","v":"C"},{"n":"E","v":"E"},{"n":"F","v":"F"},{"n":"G","v":"G"},{"n":"H","v":"H"},{"n":"I","v":"I"},{"n":"J","v":"J"},{"n":"K","v":"K"},{"n":"L","v":"L"},{"n":"M","v":"M"},{"n":"N","v":"N"},{"n":"O","v":"O"},{"n":"P","v":"P"},{"n":"Q","v":"Q"},{"n":"R","v":"R"},{"n":"S","v":"S"},{"n":"T","v":"T"},{"n":"U","v":"U"},{"n":"V","v":"V"},{"n":"W","v":"W"},{"n":"X","v":"X"},{"n":"Y","v":"Y"},{"n":"Z","v":"Z"},{"n":"0-9","v":"0-9"}]}
    ],
    "特别节目": [
        {"key":"datapd-channel","name":"频道","value":[{"n":"全部","v":""},{"n":"CCTV-1 综合","v":"CCTV-1综合"},{"n":"CCTV-2 财经","v":"CCTV-2财经"},{"n":"CCTV-3 综艺","v":"CCTV-3综艺"},{"n":"CCTV-4 中文国际","v":"CCTV-4中文国际(亚)"},{"n":"CCTV-5 体育","v":"CCTV-5体育"},{"n":"CCTV-6 电影","v":"CCTV-6电影"},{"n":"CCTV-7 国防军事","v":"CCTV-7军事农业"},{"n":"CCTV-8 电视剧","v":"CCTV-8电视剧"},{"n":"CCTV-9 纪录","v":"CCTV-9纪录"},{"n":"CCTV-10 科教","v":"CCTV-10科教"},{"n":"CCTV-11 戏曲","v":"CCTV-11戏曲"},{"n":"CCTV-12 社会与法","v":"CCTV-12社会与法"},{"n":"CCTV-13 新闻","v":"CCTV-13新闻"},{"n":"CCTV-14 少儿","v":"CCTV-14少儿"},{"n":"CCTV-15 音乐","v":"CCTV-15音乐"},{"n":"CCTV-17 农业农村","v":"CCTV-17农业农村高清"}]},
        {"key":"datafl-sc","name":"类型","value":[{"n":"全部","v":""},{"n":"全部","v":"全部"},{"n":"新闻","v":"新闻"},{"n":"经济","v":"经济"},{"n":"综艺","v":"综艺"},{"n":"体育","v":"体育"},{"n":"军事","v":"军事"},{"n":"影视","v":"影视"},{"n":"科教","v":"科教"},{"n":"戏曲","v":"戏曲"},{"n":"青少","v":"青少"},{"n":"音乐","v":"音乐"},{"n":"社会","v":"社会"},{"n":"公益","v":"公益"},{"n":"其他","v":"其他"}]},
        {"key":"dataszm-letter","name":"字母","value":[{"n":"全部","v":""},{"n":"A","v":"A"},{"n":"C","v":"C"},{"n":"E","v":"E"},{"n":"F","v":"F"},{"n":"G","v":"G"},{"n":"H","v":"H"},{"n":"I","v":"I"},{"n":"J","v":"J"},{"n":"K","v":"K"},{"n":"L","v":"L"},{"n":"M","v":"M"},{"n":"N","v":"N"},{"n":"O","v":"O"},{"n":"P","v":"P"},{"n":"Q","v":"Q"},{"n":"R","v":"R"},{"n":"S","v":"S"},{"n":"T","v":"T"},{"n":"U","v":"U"},{"n":"V","v":"V"},{"n":"W","v":"W"},{"n":"X","v":"X"},{"n":"Y","v":"Y"},{"n":"Z","v":"Z"},{"n":"0-9","v":"0-9"}]}
    ],
    "栏目大全": [
        {"key":"cid","name":"频道","value":[{"n":"全部","v":""},{"n":"CCTV-1综合","v":"EPGC1386744804340101"},{"n":"CCTV-2财经","v":"EPGC1386744804340102"},{"n":"CCTV-3综艺","v":"EPGC1386744804340103"},{"n":"CCTV-4中文国际","v":"EPGC1386744804340104"},{"n":"CCTV-5体育","v":"EPGC1386744804340107"},{"n":"CCTV-6电影","v":"EPGC1386744804340108"},{"n":"CCTV-7国防军事","v":"EPGC1386744804340109"},{"n":"CCTV-8电视剧","v":"EPGC1386744804340110"},{"n":"CCTV-9纪录","v":"EPGC1386744804340112"},{"n":"CCTV-10科教","v":"EPGC1386744804340113"},{"n":"CCTV-11戏曲","v":"EPGC1386744804340114"},{"n":"CCTV-12社会与法","v":"EPGC1386744804340115"},{"n":"CCTV-13新闻","v":"EPGC1386744804340116"},{"n":"CCTV-14少儿","v":"EPGC1386744804340117"},{"n":"CCTV-15音乐","v":"EPGC1386744804340118"},{"n":"CCTV-16奥林匹克","v":"EPGC1634630207058998"},{"n":"CCTV-17农业农村","v":"EPGC1563932742616872"},{"n":"CCTV-5+体育赛事","v":"EPGC1468294755566101"}]},
        {"key":"fc","name":"分类","value":[{"n":"全部","v":""},{"n":"新闻","v":"新闻"},{"n":"体育","v":"体育"},{"n":"综艺","v":"综艺"},{"n":"健康","v":"健康"},{"n":"生活","v":"生活"},{"n":"科教","v":"科教"},{"n":"经济","v":"经济"},{"n":"农业","v":"农业"},{"n":"法治","v":"法治"},{"n":"军事","v":"军事"},{"n":"少儿","v":"少儿"},{"n":"动画","v":"动画"},{"n":"纪实","v":"纪实"},{"n":"戏曲","v":"戏曲"},{"n":"音乐","v":"音乐"},{"n":"影视","v":"影视"}]},
        {"key":"fl","name":"字母","value":[{"n":"全部","v":""},{"n":"A","v":"A"},{"n":"B","v":"B"},{"n":"C","v":"C"},{"n":"D","v":"D"},{"n":"E","v":"E"},{"n":"F","v":"F"},{"n":"G","v":"G"},{"n":"H","v":"H"},{"n":"I","v":"I"},{"n":"J","v":"J"},{"n":"K","v":"K"},{"n":"L","v":"L"},{"n":"M","v":"M"},{"n":"N","v":"N"},{"n":"O","v":"O"},{"n":"P","v":"P"},{"n":"Q","v":"Q"},{"n":"R","v":"R"},{"n":"S","v":"S"},{"n":"T","v":"T"},{"n":"U","v":"U"},{"n":"V","v":"V"},{"n":"W","v":"W"},{"n":"X","v":"X"},{"n":"Y","v":"Y"},{"n":"Z","v":"Z"}]},
        {"key":"year","name":"年份","value":[{"n":"全部","v":""},{"n":"2022","v":"2022"},{"n":"2021","v":"2021"},{"n":"2020","v":"2020"},{"n":"2019","v":"2019"},{"n":"2018","v":"2018"},{"n":"2017","v":"2017"},{"n":"2016","v":"2016"},{"n":"2015","v":"2015"},{"n":"2014","v":"2014"},{"n":"2013","v":"2013"},{"n":"2012","v":"2012"},{"n":"2011","v":"2011"},{"n":"2010","v":"2010"},{"n":"2009","v":"2009"},{"n":"2008","v":"2008"},{"n":"2007","v":"2007"},{"n":"2006","v":"2006"},{"n":"2005","v":"2005"},{"n":"2004","v":"2004"},{"n":"2003","v":"2003"},{"n":"2002","v":"2002"},{"n":"2001","v":"2001"},{"n":"2000","v":"2000"}]},
        {"key":"month","name":"月份","value":[{"n":"全部","v":""},{"n":"12","v":"12"},{"n":"11","v":"11"},{"n":"10","v":"10"},{"n":"09","v":"09"},{"n":"08","v":"08"},{"n":"07","v":"07"},{"n":"06","v":"06"},{"n":"05","v":"05"},{"n":"04","v":"04"},{"n":"03","v":"03"},{"n":"02","v":"02"},{"n":"01","v":"01"}]}
    ]
};

let extendObj = { classes: [...CCTV_CLASSES], filter: CCTV_FILTER };

async function init(cfg) {
    try {
        siteKey = cfg.skey;
        siteType = cfg.stype;
        extendObj = { classes: [...CCTV_CLASSES], filter: CCTV_FILTER };
    } catch (e) {
        console.error("init error", e.message);
        extendObj = { classes: [...CCTV_CLASSES], filter: CCTV_FILTER };
    }
}

function home(filter) {
    try {
        return JSON.stringify({ class: extendObj.classes, filters: extendObj.filter });
    } catch (e) {
        return JSON.stringify({ class: CCTV_CLASSES, filters: CCTV_FILTER });
    }
}

async function homeVod() {
    return JSON.stringify({ list: [] });
}

async function getM3u8(pid) {
    try {
        const infoUrl = `https://vdn.apps.cntv.cn/api/getHttpVideoInfo.do?pid=${pid}`;
        const resp = await request(infoUrl);
        const jo = safeJson(resp);
        if (!jo || !jo.hls_url) return "";
        let link = jo.hls_url.trim();
        const m3u8Resp = await request(link);
        const arr = m3u8Resp.split('\n');
        const prefixMatch = link.match(/(https?:\/\/[a-zA-z0-9.]+)\//);
        if (!prefixMatch) return link;
        const urlPrefix = prefixMatch[1];
        const lastLine = arr[arr.length - 1] || "";
        const subUrl = lastLine.split('/');
        subUrl[3] = '1200';
        subUrl[subUrl.length - 1] = '1200.m3u8';
        const hdUrl = urlPrefix + '/' + subUrl.join('/');
        const hdTest = await request(hdUrl);
        if (hdTest) {
            return hdUrl;
        } else {
            return link;
        }
    } catch (e) {
        console.error("getM3u8 error", e.message);
        return "";
    }
}

// 修复jsonp解析：正则剥离ko(...)包装，不再写死substring(3)
function parseJsonp(rawText, callbackName = "ko") {
    if (!rawText) return null;
    const reg = new RegExp(`^\\s*${callbackName}\\s*\\(\\s*([\\s\\S]*?)\\s*\\);?\\s*$`);
    const m = rawText.match(reg);
    if (m && m[1]) {
        return safeJson(m[1]);
    }
    return safeJson(rawText);
}

async function category(tid, pg, filter, ext) {
    pg = Number(pg) || 1;
    let queryParts = [];
    let url = "";
    if (tid === "动画片") {
        const area = ext?.['datadq-area'] || "";
        const letter = ext?.['dataszm-letter'] || "";
        const datafl = ext?.['datafl-sc'] || "";
        queryParts.push(`channelid=CHAL1460955899450127`);
        if(area) queryParts.push(`area=${encodeURIComponent(area)}`);
        if(datafl) queryParts.push(`sc=${encodeURIComponent(datafl)}`);
        queryParts.push(`fc=${encodeURIComponent(tid)}`);
        if(letter) queryParts.push(`letter=${encodeURIComponent(letter)}`);
        queryParts.push(`p=${pg}&n=24&serviceId=tvcctv&topv=1&t=json`);
        url = `${HOST}/list/getVideoAlbumList?${queryParts.join('&')}`;
    } else if (tid === "纪录片") {
        const channel = ext?.['datapd-channel'] || "";
        const datafl = ext?.['datafl-sc'] || "";
        const year = ext?.['datanf-year'] || "";
        const letter = ext?.['dataszm-letter'] || "";
        queryParts.push(`channelid=CHAL1460955924871139`);
        queryParts.push(`fc=${encodeURIComponent(tid)}`);
        if(channel) queryParts.push(`channel=${encodeURIComponent(channel)}`);
        if(datafl) queryParts.push(`sc=${encodeURIComponent(datafl)}`);
        if(year) queryParts.push(`year=${encodeURIComponent(year)}`);
        if(letter) queryParts.push(`letter=${encodeURIComponent(letter)}`);
        queryParts.push(`p=${pg}&n=24&serviceId=tvcctv&topv=1&t=json`);
        url = `${HOST}/list/getVideoAlbumList?${queryParts.join('&')}`;
    } else if (tid === "电视剧") {
        const datafl = ext?.['datafl-sc'] || "";
        const year = ext?.['datanf-year'] || "";
        const letter = ext?.['dataszm-letter'] || "";
        queryParts.push(`channelid=CHAL1460955853485115`);
        queryParts.push(`area=`);
        if(datafl) queryParts.push(`sc=${encodeURIComponent(datafl)}`);
        queryParts.push(`fc=${encodeURIComponent(tid)}`);
        if(year) queryParts.push(`year=${encodeURIComponent(year)}`);
        if(letter) queryParts.push(`letter=${encodeURIComponent(letter)}`);
        queryParts.push(`p=${pg}&n=24&serviceId=tvcctv&topv=1&t=json`);
        url = `${HOST}/list/getVideoAlbumList?${queryParts.join('&')}`;
    } else if (tid === "特别节目") {
        const channel = ext?.['datapd-channel'] || "";
        const datafl = ext?.['datafl-sc'] || "";
        const letter = ext?.['dataszm-letter'] || "";
        queryParts.push(`channelid=CHAL1460955953877151`);
        if(channel) queryParts.push(`channel=${encodeURIComponent(channel)}`);
        if(datafl) queryParts.push(`sc=${encodeURIComponent(datafl)}`);
        queryParts.push(`fc=${encodeURIComponent(tid)}`);
        queryParts.push(`bigday=`);
        if(letter) queryParts.push(`letter=${encodeURIComponent(letter)}`);
        queryParts.push(`p=${pg}&n=24&serviceId=tvcctv&topv=1&t=json`);
        url = `${HOST}/list/getVideoAlbumList?${queryParts.join('&')}`;
    } else if (tid === "栏目大全") {
        const cid = ext?.['cid'] || "";
        const fc = ext?.['fc'] || "";
        const fl = ext?.['fl'] || "";
        queryParts.push(`serviceId=tvcctv&t=json&cb=ko`);
        if(cid) queryParts.push(`cid=${encodeURIComponent(cid)}`);
        if(fc) queryParts.push(`fc=${encodeURIComponent(fc)}`);
        if(fl) queryParts.push(`fl=${encodeURIComponent(fl)}`);
        queryParts.push(`p=${pg}&n=20`);
        url = `${HOST}/lanmu/columnSearch?${queryParts.join('&')}`;
    }
    if (!url) {
        return JSON.stringify({ list: [], page: pg, pagecount: 0 });
    }
    const resp = await request(url);
    let jo;
    if (tid === "栏目大全") {
        jo = parseJsonp(resp, "ko");
    } else {
        jo = safeJson(resp);
    }
    const list = [];
    if (tid === "栏目大全") {
        if (jo && jo.response && Array.isArray(jo.response.docs)) {
            for (const vod of jo.response.docs) {
                const id = vod.lastVIDE?.videoSharedCode || "";
                const title = (vod.column_name || "").trim();
                const img = vod.column_logo || "";
                const year = vod.column_playdate || "";
                const brief = vod.column_brief || "";
                if(!title) continue;
                const guid = `${tid}###${title}###${vod.column_website||""}###${img||""}###${id||""}###${year||""}###${""}###${brief||""}`;
                list.push({
                    vod_id: guid,
                    vod_name: title,
                    vod_pic: fixPicUrl(img),
                    vod_remarks: "",
                    style: { type: 'rect', ratio: 1.33 }
                });
            }
        }
    } else {
        if (jo && jo.data && jo.data.list && Array.isArray(jo.data.list)) {
            for (const vod of jo.data.list) {
                const id = vod.id || "";
                const title = (vod.title || "").trim();
                const img = vod.image || "";
                const urlVal = vod.url || "";
                const brief = vod.brief || "";
                const year = vod.year || "";
                const actors = vod.actors || "";
                if(!title) continue;
                const guid = `${tid}###${title}###${urlVal||""}###${img||""}###${id||""}###${year||""}###${actors||""}###${brief||""}`;
                list.push({
                    vod_id: guid,
                    vod_name: title,
                    vod_pic: fixPicUrl(img),
                    vod_remarks: "",
                    style: { type: 'rect', ratio: 1.33 }
                });
            }
        }
    }
    const pagecount = list.length >= 20 ? 99 : pg;
    return JSON.stringify({
        list,
        page: pg,
        pagecount: pagecount,
        limit: 24,
        total: 9999
    });
}

async function detail(vodId) {
    try {
        const aid = vodId.split('###');
        const tid = aid[0];
        const title = aid[1] || "";
        const lastVideo = aid[2] || "";
        const logo = aid[3] || "";
        const id = aid[4] || "";
        const vod_year = aid[5] || "";
        const actors = aid[6] || "";
        const brief = aid[7] || "";
        let videoList = [];
        let fromId = 'CCTV';
        if (tid === "栏目大全") {
            if(!id) throw new Error("miss id");
            const infoUrl = `https://api.cntv.cn/video/videoinfoByGuid?guid=${id}&serviceId=tvcctv`;
            const infoResp = await request(infoUrl);
            const infoJo = safeJson(infoResp);
            if (!infoJo || !infoJo.ctid) throw new Error("no ctid");
            const topicId = infoJo.ctid;
            const listUrl = `https://api.cntv.cn/NewVideo/getVideoListByColumn?id=${topicId}&d=&p=1&n=100&sort=desc&mode=0&serviceId=tvcctv&t=json`;
            const listResp = await request(listUrl);
            const listJo = safeJson(listResp);
            if (listJo && listJo.data && Array.isArray(listJo.data.list)) {
                for (const item of listJo.data.list) {
                    const g = item.guid || "";
                    const t = item.title || "";
                    if (g) videoList.push(`${t}$${b64EncodeUtf8(g)}`);
                }
            }
        } else {
            if(!id) throw new Error("miss id");
            const listUrl = `https://api.cntv.cn/NewVideo/getVideoListByAlbumIdNew?id=${id}&serviceId=tvcctv&p=1&n=100&mode=0&pub=1`;
            const listResp = await request(listUrl);
            const listJo = safeJson(listResp);
            if (listJo && listJo.data && Array.isArray(listJo.data.list)) {
                for (const item of listJo.data.list) {
                    const g = item.guid || "";
                    const t = item.title || "";
                    if (g) videoList.push(`${t}$${b64EncodeUtf8(g)}`);
                }
            }
        }
        const vod = {
            vod_id: vodId,
            vod_name: title,
            vod_pic: fixPicUrl(logo),
            vod_year: vod_year,
            vod_area: "",
            vod_remarks: "",
            vod_actor: actors,
            vod_director: "",
            vod_content: brief,
            vod_play_from: fromId,
            vod_play_url: videoList.join("#")
        };
        return JSON.stringify({ list: [vod] });
    } catch (e) {
        console.error("detail error", e.message);
        return JSON.stringify({ list: [] });
    }
}

async function search(key, quick, pg) {
    pg = Number(pg) || 1;
    return JSON.stringify({
        list: [],
        page: pg,
        pagecount: 0,
        land: 1,
        ratio: 1.33
    });
}

async function play(flag, id, flags) {
    try {
        const guid = b64DecodeUtf8(id || "");
        if (!guid) {
            return JSON.stringify({ parse: 1, url: "", header: { "User-Agent": UA, "Referer": HOST } });
        }
        const realUrl = await getM3u8(guid);
        if (realUrl) {
            return JSON.stringify({
                parse: 0,
                url: realUrl,
                header: { "User-Agent": UA, "Referer": "https://tv.cctv.com/" }
            });
        } else {
            return JSON.stringify({
                parse: 1,
                url: "",
                header: { "User-Agent": UA, "Referer": "https://tv.cctv.com/" }
            });
        }
    } catch (e) {
        console.error("play error", e.message);
        return JSON.stringify({ parse: 1, url: "", header: { "User-Agent": UA } });
    }
}

export function __jsEvalReturn() {
    return {
        init,
        home,
        homeVod,
        category,
        detail,
        search,
        play
    };
}
//（注：内容由AI生成）
