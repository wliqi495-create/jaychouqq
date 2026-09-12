import { Crypto, _ } from 'assets://js/lib/cat.js';
let siteKey = '';
let siteType = 0;
let extendObj = {};

const HOST = "https://h5.jianpianips1.com";
const IMG_HOST = "https://img.ztfgh.com";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const DEFAULT_HEADERS = {
    "User-Agent": UA,
    "Referer": `${HOST}/`,
    "Origin": HOST,
    "Accept": "application/json, text/plain, */*"
};

async function request(url, optHeaders = {}) {
    try {
        const headers = Object.assign({}, DEFAULT_HEADERS, optHeaders);
        const res = await req(url, {
            method: "GET",
            headers: headers,
            timeout: 20000
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
        console.error("b64 decode fail", e);
        return "";
    }
}

function safeJson(str) {
    try {
        if (!str) return null;
        return JSON.parse(str);
    } catch (e) {
        console.error("json parse error", e);
        return null;
    }
}

function getPicUrl(path) {
    if (!path) return '';
    path = String(path).trim();
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const normalizedPath = path.startsWith('/') ? path : '/' + path;
    return `${IMG_HOST}${normalizedPath}`;
}

// 手动拼接query，兼容无URLSearchParams的CAT环境
function buildQuery(paramsObj) {
    const arr = [];
    for(let k in paramsObj){
        const v = paramsObj[k];
        if(v !== undefined && v !== null && v !== ""){
            arr.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
        }
    }
    return arr.join("&");
}

// 默认分类，保证无论接口是否成功，分类一定存在
const DEFAULT_CLASSES = [
    { type_id:"1",type_name:"电影",land:1,ratio:1.33},
    { type_id:"2",type_name:"电视剧",land:1,ratio:1.33},
    { type_id:"3",type_name:"综艺",land:1,ratio:1.33},
    { type_id:"4",type_name:"动漫",land:1,ratio:1.33},
    { type_id:"64",type_name:"短剧",land:1,ratio:1.33},
    { type_id:"netflix",type_name:"Netflix",land:1,ratio:1.33}
];

async function init(cfg) {
    siteKey = cfg.skey;
    siteType = cfg.stype;
    // 先赋值默认分类，防止同步home调用拿不到分类
    extendObj = { classes: [...DEFAULT_CLASSES], filter: {} };
    try {
        const resp = await request(`${HOST}/api/v2/settings/homeCategory`);
        const json = safeJson(resp);
        const classesRaw = [];
        if (json && json.code === 1 && Array.isArray(json.data)) {
            for (const item of json.data) {
                if (item.id === 88 || item.id === 99) continue;
                classesRaw.push({
                    type_id: String(item.id),
                    type_name: item.name,
                    land: 1,
                    ratio: 1.33
                });
            }
        }
        classesRaw.push({ type_id: "netflix", type_name: "Netflix", land: 1, ratio: 1.33 });
        if(classesRaw.length>0){
            extendObj.classes = classesRaw;
        }
    } catch (e) {
        console.error("init error", e.message);
        // 出错保持默认分类不变
    }
}

function home(filter) {
    try {
        return JSON.stringify({ class: extendObj.classes || DEFAULT_CLASSES, filters: extendObj.filter || {} });
    } catch (e) {
        return JSON.stringify({ class: DEFAULT_CLASSES, filters: {} });
    }
}

async function homeVod() {
    try {
        const resp = await request(`${HOST}/api/dyTag/hand_data?category_id=88`);
        const json = safeJson(resp);
        const list = [];
        if (json && json.code === 1 && json.data && typeof json.data === "object") {
            for (const key in json.data) {
                const arr = json.data[key];
                if (!Array.isArray(arr)) continue;
                for (const i of arr) {
                    if (!i.id || String(i.id) === '0' || !i.title) continue;
                    const pic = getPicUrl(i.path || i.tvimg || i.tagimg || '');
                    list.push({
                        vod_id: String(i.id),
                        vod_name: i.title,
                        vod_pic: pic,
                        vod_remarks: i.mask || (i.score ? `评分:${i.score}` : ''),
                        style: { type: 'rect', ratio: 1.33 }
                    });
                    if(list.length >=20) break;
                }
                if(list.length >=20) break;
            }
        }
        return JSON.stringify({ list });
    } catch (e) {
        console.error("homeVod error", e.message);
        return JSON.stringify({ list: [] });
    }
}

async function category(tid, pg, filter, ext) {
    pg = Number(pg) || 1;
    try {
        if (tid === "netflix") {
            return JSON.stringify({ list: [], page: pg, pagecount: 0 });
        }
        const paramsObj = {
            fcate_pid: tid,
            page: pg,
            category_id: ext?.type || '',
            area: ext?.area || '',
            year: ext?.year || '',
            sort: ext?.sort || ''
        };
        const query = buildQuery(paramsObj);
        const url = `${HOST}/api/crumb/list?${query}`;
        const resp = await request(url);
        const json = safeJson(resp);
        const list = [];
        if (json && json.code === 1 && Array.isArray(json.data)) {
            for (const i of json.data) {
                if (!i.id || String(i.id) === '0' || !i.title) continue;
                const pic = getPicUrl(i.path || i.tvimg || i.tagimg || '');
                list.push({
                    vod_id: String(i.id),
                    vod_name: i.title,
                    vod_pic: pic,
                    vod_remarks: i.mask || (i.score ? `评分:${i.score}` : ''),
                    style: { type: 'rect', ratio: 1.33 }
                });
            }
        }
        const pagecount = list.length >= 15 ? pg + 1 : pg;
        return JSON.stringify({
            list,
            page: pg,
            pagecount: pagecount,
            limit: 15,
            total: 9999
        });
    } catch (e) {
        console.error("category error", e.message);
        return JSON.stringify({ list: [], page: pg, pagecount: 0 });
    }
}

async function search(key, quick, pg) {
    pg = Number(pg) || 1;
    try {
        const paramsObj = {
            keyword: key,
            page: pg
        };
        const query = buildQuery(paramsObj);
        const url = `${HOST}/api/v2/search/videoV2?${query}`;
        const resp = await request(url);
        const json = safeJson(resp);
        const list = [];
        if (json && json.code === 1 && Array.isArray(json.data)) {
            const kwLow = String(key).toLowerCase();
            for (const i of json.data) {
                if (!i.id || String(i.id) === '0' || !i.title) continue;
                const name = (i.title || '').toLowerCase();
                if (!name.includes(kwLow)) continue;
                const pic = getPicUrl(i.path || i.tvimg || i.tagimg || '');
                list.push({
                    vod_id: String(i.id),
                    vod_name: i.title,
                    vod_pic: pic,
                    vod_remarks: i.mask || (i.score ? `评分:${i.score}` : ''),
                    style: { type: 'rect', ratio: 1.33 }
                });
            }
        }
        const pagecount = list.length >=15 ? pg+1 : pg;
        return JSON.stringify({
            list,
            page: pg,
            pagecount: pagecount,
            land:1,
            ratio:1.33
        });
    } catch(e){
        console.error("search error",e.message);
        return JSON.stringify({ list:[], page:pg, pagecount:0, land:1, ratio:1.33 });
    }
}

async function detail(vodId) {
    try {
        const url = `${HOST}/api/video/detailv2?id=${encodeURIComponent(vodId)}`;
        const resp = await request(url);
        const json = safeJson(resp);
        if (!json || json.code !== 1 || !json.data) return JSON.stringify({ list:[] });
        const v = json.data;
        const picUrl = getPicUrl(v.tvimg || v.thumbnail || v.path || '');

        const sourceNames = [];
        const sourcePlaylists = [];
        if(Array.isArray(v.source_list_source)){
            for(const src of v.source_list_source){
                const srcName = (src.name||'').trim();
                const srcNameLow = srcName.toLowerCase();
                if(srcNameLow.includes('vip')||srcNameLow.includes('ftp')||srcNameLow==='常规'||srcNameLow==='常规线路') continue;
                if(!Array.isArray(src.source_list) || src.source_list.length ===0) continue;
                const plist = [];
                for(let idx=0;idx<src.source_list.length;idx++){
                    const ep = src.source_list[idx];
                    const epName = ep.source_name||`第${idx+1}集`;
                    const playUrl = ep.url||'';
                    if(!playUrl) continue;
                    plist.push(`${epName}$${b64EncodeUtf8(playUrl)}`);
                }
                if(plist.length>0){
                    sourceNames.push(srcName||"线路"+(sourceNames.length+1));
                    sourcePlaylists.push(plist.join('#'));
                }
            }
        }
        // 修复：没有可用播放源，返回空，防止页面卡死
        const vod = {
            vod_id: String(vodId),
            vod_name: v.title||"",
            vod_pic: picUrl,
            vod_year: v.year||"",
            vod_area: v.area||"",
            vod_actor: (Array.isArray(v.actors) ? v.actors.map(a=>a.name||'').filter(Boolean).join(',') : ""),
            vod_director: "",
            vod_remarks: v.mask||(v.score?`评分${v.score}`:""),
            vod_content: v.description||"",
            vod_play_from: sourceNames.join("$$$"),
            vod_play_url: sourcePlaylists.join("$$$")
        };
        return JSON.stringify({ list:[vod] });
    } catch (e) {
        console.error("detail error",e.message);
        return JSON.stringify({ list:[] });
    }
}

async function play(flag, id, flags) {
    try {
        const playUrl = b64DecodeUtf8(id||'');
        if(!playUrl){
            // 解码失败，强制使用parse=1嗅探模式
            return JSON.stringify({ parse:1, url:"", header:{"User-Agent":UA,"Referer":HOST+"/"} });
        }
        return JSON.stringify({
            parse:0,
            url:playUrl,
            header:{
                "User-Agent":UA,
                "Referer":HOST+"/"
            }
        });
    } catch(e){
        console.error("play error",e.message);
        return JSON.stringify({ parse:1, url:"", header:{"User-Agent":UA} });
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