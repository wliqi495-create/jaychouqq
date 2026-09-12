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
        return "";
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

function getPicUrl(path) {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const normalizedPath = path.startsWith('/') ? path : '/' + path;
    return `${IMG_HOST}${normalizedPath}`;
}

async function init(cfg) {
    try {
        siteKey = cfg.skey;
        siteType = cfg.stype;
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
        extendObj = { classes: classesRaw, filter: {} };
    } catch (e) {
        console.error("init error", e.message);
        extendObj = { classes: [], filter: {} };
    }
}

function home(filter) {
    try {
        return JSON.stringify({ class: extendObj.classes || [], filters: extendObj.filter || {} });
    } catch (e) {
        return JSON.stringify({ class: [], filters: {} });
    }
}

async function homeVod() {
    try {
        const resp = await request(`${HOST}/api/dyTag/hand_data?category_id=88`);
        const json = safeJson(resp);
        const list = [];
        if (json && json.code === 1 && json.data) {
            for (const key in json.data) {
                const arr = json.data[key];
                if (!Array.isArray(arr)) continue;
                for (const i of arr) {
                    if (!i.id || String(i.id) === '0') continue;
                    const pic = getPicUrl(i.path || i.tvimg || i.tagimg || '');
                    list.push({
                        vod_id: String(i.id),
                        vod_name: i.title || "未知标题",
                        vod_pic: pic,
                        vod_remarks: i.mask || (i.score ? `评分:${i.score}` : ''),
                        style: { type: 'rect', ratio: 1.33 }
                    });
                }
            }
        }
        return JSON.stringify({ list: list.slice(0, 20) });
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
        const params = new URLSearchParams();
        params.append('fcate_pid', tid);
        params.append('page', pg);
        params.append('category_id', ext?.type || '');
        params.append('area', ext?.area || '');
        params.append('year', ext?.year || '');
        params.append('sort', ext?.sort || '');
        const url = `${HOST}/api/crumb/list?${params.toString()}`;
        const resp = await request(url);
        const json = safeJson(resp);
        const list = [];
        if (json && json.code === 1 && Array.isArray(json.data)) {
            for (const i of json.data) {
                if (!i.id || String(i.id) === '0') continue;
                const pic = getPicUrl(i.path || i.tvimg || i.tagimg || '');
                list.push({
                    vod_id: String(i.id),
                    vod_name: i.title || "未知标题",
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
        const params = new URLSearchParams();
        params.append('keyword', key);
        params.append('page', pg);
        const url = `${HOST}/api/v2/search/videoV2?key=${params.toString()}`;
        const resp = await request(url);
        const json = safeJson(resp);
        const list = [];
        if (json && json.code === 1 && Array.isArray(json.data)) {
            const kwLow = String(key).toLowerCase();
            for (const i of json.data) {
                if (!i.id || String(i.id) === '0') continue;
                const name = (i.title || '').toLowerCase();
                if (!name.includes(kwLow)) continue;
                const pic = getPicUrl(i.path || i.tvimg || i.tagimg || '');
                list.push({
                    vod_id: String(i.id),
                    vod_name: i.title || "未知标题",
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
            land: 1,
            ratio: 1.33
        });
    } catch (e) {
        console.error("search error", e.message);
        return JSON.stringify({ list: [], page: pg, pagecount: 0, land: 1, ratio: 1.33 });
    }
}

async function detail(vodId) {
    try {
        const url = `${HOST}/api/video/detailv2?id=${vodId}`;
        const resp = await request(url);
        const json = safeJson(resp);
        if (!json || json.code !== 1 || !json.data) return JSON.stringify({ list: [] });
        const v = json.data;
        const picUrl = getPicUrl(v.tvimg || v.thumbnail || v.path || '');
        const playList = [];
        if (Array.isArray(v.source_list_source)) {
            for (const src of v.source_list_source) {
                const srcName = (src.name || '').toLowerCase();
                if (srcName.includes('vip') || srcName.includes('ftp') || srcName === '常规' || srcName === '常规线路') continue;
                if (!Array.isArray(src.source_list)) continue;
                for (let idx = 0; idx < src.source_list.length; idx++) {
                    const ep = src.source_list[idx];
                    const epName = ep.source_name || `第${idx + 1}集`;
                    const playUrl = ep.url || '';
                    if (!playUrl) continue;
                    playList.push(`${epName}$${b64EncodeUtf8(playUrl)}`);
                }
            }
        }
        const vod = {
            vod_id: String(vodId),
            vod_name: v.title || "",
            vod_pic: picUrl,
            vod_year: v.year || "",
            vod_area: v.area || "",
            vod_actor: Array.isArray(v.actors) ? v.actors.map(a => a.name).join(',') : "",
            vod_director: "",
            vod_remarks: v.mask || (v.score ? `评分${v.score}` : ""),
            vod_content: v.description || "",
            vod_play_from: "荐片",
            vod_play_url: playList.join('#')
        };
        return JSON.stringify({ list: [vod] });
    } catch (e) {
        console.error("detail error", e.message);
        return JSON.stringify({ list: [] });
    }
}

async function play(flag, id, flags) {
    try {
        const playUrl = b64DecodeUtf8(id || '');
        if (!playUrl) {
            return JSON.stringify({ parse: 1, url: "", header: { "User-Agent": UA, "Referer": HOST + "/" } });
        }
        return JSON.stringify({
            parse: 0,
            url: playUrl,
            header: {
                "User-Agent": UA,
                "Referer": HOST + "/"
            }
        });
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