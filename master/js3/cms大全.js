//聚合平台3.js 修复版：兼容 http://192.129.140.23:5757/api/荐片[优]?pwd=dzyyds
import { Crypto, _ } from 'assets://js/lib/cat.js';
let siteKey = '';
let siteType = 0;
let extendObj = {};
// 源配置，完全复刻py里sources；s35新增【荐片[优]】源
const SOURCES = {
    's1': { 'name': '🎬电影天堂', 'api': 'http://caiji.dyttzyapi.com/api.php/provide/vod/from/dyttm3u8/at/json' },
    's2': { 'name': '💧无水印', 'api': 'https://api.wsyzy.net/api.php/provide/vod' },
    's3': { 'name': '🧸量子', 'api': 'https://cj.lziapi.com/api.php/provide/vod' },
    's4': { 'name': '📺1080资源', 'api': 'https://api.1080zyku.com/inc/api_mac10.php' },
    's5': { 'name': '🔥大众资源', 'api': 'https://cdn.dzzyapi.com/api.php/provide/vod/' },
    's6': { 'name': '📺天涯', 'api': 'https://tyyszy.com/api.php/provide/vod' },
    's7': { 'name': '📺暴风', 'api': 'https://bfzyapi.com/api.php/provide/vod' },
    's8': { 'name': '⚡索尼闪电', 'api': 'https://xsd.sdzyapi.com/api.php/provide/vod' },
    's9': { 'name': '📺索尼', 'api': 'https://suoniapi.com/api.php/provide/vod' },
    's10': { 'name': '📺红牛', 'api': 'https://www.hongniuzy2.com/api.php/provide/vod' },
    's11': { 'name': '📺茅台', 'api': 'https://caiji.maotaizy.cc/api.php/provide/vod' },
    's12': { 'name': '🐯虎牙', 'api': 'https://www.huyaapi.com/api.php/provide/vod' },
    's13': { 'name': '📺豆瓣', 'api': 'https://caiji.dbzy.tv/api.php/provide/vod' },
    's14': { 'name': '📺豆瓣2', 'api': 'https://dbzy.tv/api.php/provide/vod' },
    's15': { 'name': '📺豪华', 'api': 'https://hhzyapi.com/api.php/provide/vod' },
    's16': { 'name': '📺CK资源', 'api': 'https://ckzy.me/api.php/provide/vod' },
    's17': { 'name': '📺U酷', 'api': 'https://api.ukuapi.com/api.php/provide/vod' },
    's18': { 'name': '📺ikun', 'api': 'https://ikunzyapi.com/api.php/provide/vod' },
    's19': { 'name': '📺无尽', 'api': 'https://api.wujinapi.cc/api.php/provide/vod' },
    's20': { 'name': '🌕光速', 'api': 'https://api.guangsuapi.com/api.php/provide/vod' },
    's21': { 'name': '📺卧龙', 'api': 'https://collect.wolongzyw.com/api.php/provide/vod' },
    's22': { 'name': '📺新浪', 'api': 'https://api.xinlangapi.com/xinlangapi.php/provide/vod' },
    's23': { 'name': '📺旺旺', 'api': 'https://api.wwzy.tv/api.php/provide/vod' },
    's24': { 'name': '📺最大', 'api': 'https://api.zuidapi.com/api.php/provide/vod' },
    's25': { 'name': '🌸樱花', 'api': 'https://m3u8.apiyhzy.com/api.php/provide/vod' },
    's26': { 'name': '🐮牛牛', 'api': 'https://api.niuniuzy.me/api.php/provide/vod' },
    's27': { 'name': '☁️百度云', 'api': 'https://api.apibdzy.com/api.php/provide/vod' },
    's28': { 'name': '🏎速播', 'api': 'https://subocaiji.com/api.php/provide/vod' },
    's29': { 'name': '🦅金鹰', 'api': 'https://jinyingzy.com/api.php/provide/vod' },
    's30': { 'name': '⚡闪电', 'api': 'https://sdzyapi.com/api.php/provide/vod' },
    's31': { 'name': '👑非凡', 'api': 'https://cj.ffzyapi.com/api.php/provide/vod' },
    's32': { 'name': '🍃飘零', 'api': 'https://p2100.net/api.php/provide/vod' },
    's33': { 'name': '🐾魔爪', 'api': 'https://mozhuazy.com/api.php/provide/vod' },
    's34': { 'name': '📺魔都', 'api': 'https://www.mdzyapi.com/api.php/provide/vod' },
    // 新增：荐片[优]源，原样填写带中文[]的链接，内部自动编码
    's35': { 'name': '🎞荐片[优]', 'api': 'http://192.129.140.23:5757/api/荐片[优]?pwd=dzyyds' }
};
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const DEFAULT_HEADERS = { "User-Agent": UA };

/**
 * 【新增】修复URL路径中文、[]、()保留字符，不破坏query参数
 * @param {string} rawUrl 原始url
 * @returns {string} 处理完成可请求url
 */
function fixUrlSpecialChar(rawUrl) {
    if (!rawUrl) return rawUrl;
    try {
        const urlObj = new URL(rawUrl);
        return urlObj.href;
    } catch (e) {
        let qIndex = rawUrl.indexOf("?");
        let pathStr = rawUrl;
        let queryStr = "";
        if (qIndex > -1) {
            pathStr = rawUrl.substring(0, qIndex);
            queryStr = rawUrl.substring(qIndex);
        }
        const temp = new URL(pathStr, "http://127.0.0.1");
        return temp.href.replace("http://127.0.0.1", "") + queryStr;
    }
}

async function request(url, optHeaders = {}, body) {
    try {
        //【新增】统一预处理特殊字符URL，所有请求自动修复
        url = fixUrlSpecialChar(url);
        const headers = Object.assign({}, DEFAULT_HEADERS, optHeaders || {});
        const res = await req(url, {
            method: body ? "POST" : "GET",
            headers: headers,
            timeout: 8000,
            data: body
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
function text(v) {
    return String(v == null ? "" : v).trim();
}
function fixPicUrl(url) {
    url = text(url);
    if (!url) return "";
    if (url.startsWith("//")) return "https:" + url;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return "";
}
// 复刻py clean_item
function cleanItem(item, sourceKey, sourceName, isDetail = false) {
    const o = Object.assign({}, item);
    if (!isDetail) {
        o.vod_id = `${sourceKey}@@${text(o.vod_id)}`;
    }
    const rem = text(o.vod_remarks || "");
    o.vod_remarks = `${sourceName} | ${rem}`;
    if (o.vod_play_from) {
        const arr = text(o.vod_play_from).split("$$$");
        const newArr = arr.map(x => `${sourceName}-${x}`);
        o.vod_play_from = newArr.join("$$$");
    }
    delete o.vod_down_from;
    delete o.vod_down_url;
    return o;
}
async function loadSourceFilter(sourceKey, sourceApi) {
    const url = `${sourceApi}?ac=list`;
    const html = await request(url);
    const data = safeJson(html) || {};
    const vals = [{ n: "全部(最新)", v: "" }];
    if (Array.isArray(data.class)) {
        for (const c of data.class) {
            vals.push({ n: text(c.type_name), v: text(c.type_id) });
        }
    }
    return { sourceKey, vals };
}
async function init(cfg) {
    try {
        siteKey = cfg.skey;
        siteType = cfg.stype;
        const classes = [];
        const filters = {};
        // 构建分类列表 + 串行拉取每个源的分类筛选
        for (const [sKey, sObj] of Object.entries(SOURCES)) {
            classes.push({
                type_id: sKey,
                type_name: sObj.name,
                land: 1,
                ratio: 1.33
            });
            const fr = await loadSourceFilter(sKey, sObj.api);
            filters[fr.sourceKey] = [{
                key: "cateId",
                name: "分类",
                value: fr.vals
            }];
        }
        extendObj = { classes, filter: filters };
    } catch (e) {
        console.error("init error", e.message);
        extendObj = { classes: [], filter: {} };
    }
}
function home(filter) {
    try {
        return JSON.stringify({
            class: extendObj.classes || [],
            filters: extendObj.filter || {}
        });
    } catch (e) {
        return JSON.stringify({ class: [], filters: {} });
    }
}
async function homeVod() {
    // 原py homeContent list为空
    return JSON.stringify({ list: [] });
}
async function category(tid, pg, filter, ext) {
    pg = Number(pg) || 1;
    try {
        const sourceObj = SOURCES[tid];
        if (!sourceObj) return JSON.stringify({ list: [], page: pg, pagecount: 0 });
        const cateId = ext?.cateId ? text(ext.cateId) : "";
        let url = `${sourceObj.api}?ac=detail&pg=${pg}`;
        if (cateId) url += `&t=${cateId}`;
        const html = await request(url);
        const data = safeJson(html) || {};
        const rawList = Array.isArray(data.list) ? data.list : [];
        const outList = [];
        for (const it of rawList) {
            const cleaned = cleanItem(it, tid, sourceObj.name, false);
            cleaned.vod_pic = fixPicUrl(cleaned.vod_pic);
            cleaned.style = { type: 'rect', ratio: 1.33 };
            outList.push(cleaned);
        }
        return JSON.stringify({
            list: outList,
            page: Number(data.page || pg),
            pagecount: Number(data.pagecount || 1),
            limit: Number(data.limit || 20),
            total: Number(data.total || outList.length)
        });
    } catch (e) {
        console.error("category error", e.message);
        return JSON.stringify({ list: [], page: pg, pagecount: 0 });
    }
}
async function searchOne(sourceKey, sourceObj, keyword, pg) {
    const url = `${sourceObj.api}?ac=detail&wd=${encodeURIComponent(keyword)}&pg=${pg}`;
    const html = await request(url);
    const data = safeJson(html) || {};
    const rawList = Array.isArray(data.list) ? data.list : [];
    const out = [];
    for (const it of rawList) {
        const cleaned = cleanItem(it, sourceKey, sourceObj.name, false);
        cleaned.vod_pic = fixPicUrl(cleaned.vod_pic);
        cleaned.style = { type: 'rect', ratio: 1.33 };
        out.push(cleaned);
    }
    return { list: out, pagecount: Number(data.pagecount || 1) };
}
async function search(key, quick, pg) {
    pg = Number(pg) || 1;
    try {
        let resultList = [];
        let maxPage = 1;
        // 串行遍历所有源模拟py线程池
        for (const [sKey, sObj] of Object.entries(SOURCES)) {
            try {
                const res = await searchOne(sKey, sObj, key, pg);
                resultList.push(...res.list);
                if (res.pagecount > maxPage) maxPage = res.pagecount;
            } catch (err) {
                console.error("search skip source", sKey, err.message);
            }
        }
        return JSON.stringify({
            list: resultList,
            page: pg,
            pagecount: maxPage,
            limit: 40,
            total: 9999,
            land: 1,
            ratio: 1.33
        });
    } catch (e) {
        console.error("search error", e.message);
        return JSON.stringify({ list: [], page: pg, pagecount: 0, land: 1, ratio: 1.33 });
    }
}
async function detail(vodIdRaw) {
    try {
        if (!vodIdRaw.includes("@@")) return JSON.stringify({ list: [] });
        const [sourceKey, realVodId] = vodIdRaw.split("@@", 2);
        const sourceObj = SOURCES[sourceKey];
        if (!sourceObj) return JSON.stringify({ list: [] });
        const url = `${sourceObj.api}?ac=detail&ids=${encodeURIComponent(realVodId)}`;
        const html = await request(url);
        const data = safeJson(html) || {};
        const rawList = Array.isArray(data.list) ? data.list : [];
        const outList = [];
        for (const it of rawList) {
            const cleaned = cleanItem(it, sourceKey, sourceObj.name, true);
            cleaned.vod_id = vodIdRaw;
            cleaned.vod_pic = fixPicUrl(cleaned.vod_pic);
            outList.push(cleaned);
        }
        return JSON.stringify({ list: outList });
    } catch (e) {
        console.error("detail error", e.message);
        return JSON.stringify({ list: [] });
    }
}
async function play(flag, id, flags) {
    // py里playerContent直接透传id，CAT中透传原始播放串，失败parse=1
    try {
        return JSON.stringify({
            parse: 0,
            url: id,
            header: { "User-Agent": UA }
        });
    } catch (e) {
        console.error("play error", e.message);
        return JSON.stringify({ parse: 1, url: id, header: { "User-Agent": UA } });
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