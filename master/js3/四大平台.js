import { Crypto, _ } from 'assets://js/lib/cat.js';
let siteKey = '';
let siteType = 0;
const HOST = "http://cj.tianwe.cn";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36";
const DEFAULT_HEADERS = {
    "User-Agent": UA,
    "Accept": "*/*"
};
// 直链解析api
const PARSE_API = "https://jx.kptv.us/?url=";
// webview解析站列表
const PARSE_SITES = [
    "https://jx.xmflv.com/?url=",
    "https://jx.playerjy.com/?url=",
    "https://jx.2s0.cn/?url=",
    "https://jx.m3u8.tv/jiexi/?url=",
    "https://www.daga.cc/vip1/?url=",
    "https://jx.xmflv.cc/?url="
];

async function request(url, optHeaders = {}) {
    try {
        const headers = Object.assign({}, DEFAULT_HEADERS, optHeaders);
        const res = await req(url, {
            method: "GET",
            headers: headers,
            timeout: 10000
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

// 分类映射 数字tid -> 接口from参数
const CAT_MAP = {
    "1": "qq",
    "2": "qiyi",
    "3": "youku",
    "4": "mgtv",
    "5": "bilibili"
};

const AITM_CLASSES = [
    { type_id: "1", type_name: "腾讯视频", land: 1, ratio: 1.33 },
    { type_id: "2", type_name: "爱奇艺", land: 1, ratio: 1.33 },
    { type_id: "3", type_name: "优酷视频", land: 1, ratio: 1.33 },
    { type_id: "4", type_name: "芒果TV", land: 1, ratio: 1.33 },
    { type_id: "5", type_name: "B站", land: 1, ratio: 1.33 }
];

// 筛选配置
const AITM_FILTER = {
    "1": [
        { "key": "class", "name": "类型", "value": [{"n":"全部","v":""},{"n":"电视剧","v":"2"},{"n":"电影","v":"1"},{"n":"动漫","v":"4"},{"n":"综艺","v":"3"},{"n":"少儿","v":"5"},{"n":"纪录片","v":"6"},{"n":"短剧","v":"7"}] },
        { "key": "year", "name": "年份", "value": [{"n":"全部","v":""},{"n":"2026","v":"2026"},{"n":"2025","v":"2025"},{"n":"2024","v":"2024"},{"n":"2023","v":"2023"},{"n":"2022","v":"2022"}] }
    ],
    "2": [
        { "key": "class", "name": "类型", "value": [{"n":"全部","v":""},{"n":"电视剧","v":"2"},{"n":"电影","v":"1"},{"n":"动漫","v":"4"},{"n":"综艺","v":"3"},{"n":"少儿","v":"5"},{"n":"纪录片","v":"6"},{"n":"短剧","v":"7"}] },
        { "key": "year", "name": "年份", "value": [{"n":"全部","v":""},{"n":"2026","v":"2026"},{"n":"2025","v":"2025"},{"n":"2024","v":"2024"},{"n":"2023","v":"2023"},{"n":"2022","v":"2022"}] }
    ],
    "3": [
        { "key": "class", "name": "类型", "value": [{"n":"全部","v":""},{"n":"电视剧","v":"2"},{"n":"电影","v":"1"},{"n":"动漫","v":"4"},{"n":"综艺","v":"3"},{"n":"少儿","v":"5"},{"n":"纪录片","v":"6"},{"n":"短剧","v":"7"}] },
        { "key": "year", "name": "年份", "value": [{"n":"全部","v":""},{"n":"2026","v":"2026"},{"n":"2025","v":"2025"},{"n":"2024","v":"2024"},{"n":"2023","v":"2023"},{"n":"2022","v":"2022"}] }
    ],
    "4": [
        { "key": "class", "name": "类型", "value": [{"n":"全部","v":""},{"n":"电视剧","v":"2"},{"n":"电影","v":"1"},{"n":"动漫","v":"4"},{"n":"综艺","v":"3"},{"n":"少儿","v":"5"},{"n":"纪录片","v":"6"},{"n":"短剧","v":"7"}] },
        { "key": "year", "name": "年份", "value": [{"n":"全部","v":""},{"n":"2026","v":"2026"},{"n":"2025","v":"2025"},{"n":"2024","v":"2024"},{"n":"2023","v":"2023"},{"n":"2022","v":"2022"}] }
    ],
    "5": [
        { "key": "class", "name": "类型", "value": [{"n":"全部","v":""},{"n":"电视剧","v":"2"},{"n":"电影","v":"1"},{"n":"动漫","v":"4"},{"n":"综艺","v":"3"},{"n":"少儿","v":"5"},{"n":"纪录片","v":"6"},{"n":"短剧","v":"7"}] },
        { "key": "year", "name": "年份", "value": [{"n":"全部","v":""},{"n":"2026","v":"2026"},{"n":"2025","v":"2025"},{"n":"2024","v":"2024"},{"n":"2023","v":"2023"},{"n":"2022","v":"2022"}] }
    ]
};

let extendObj = { classes: [...AITM_CLASSES], filter: AITM_FILTER };

async function init(cfg) {
    try {
        siteKey = cfg.skey;
        siteType = cfg.stype;
        extendObj = { classes: [...AITM_CLASSES], filter: AITM_FILTER };
    } catch (e) {
        console.error("init error", e.message);
        extendObj = { classes: [...AITM_CLASSES], filter: AITM_FILTER };
    }
}

function home(filter) {
    try {
        return JSON.stringify({ class: extendObj.classes || AITM_CLASSES, filters: extendObj.filter || {} });
    } catch (e) {
        return JSON.stringify({ class: AITM_CLASSES, filters: {} });
    }
}

async function homeVod() {
    //原py无首页推荐
    return JSON.stringify({ list: [] });
}

async function category(tid, pg, filter, ext) {
    pg = Number(pg) || 1;
    try {
        const fromVal = CAT_MAP[tid] || "qq";
        const qs = [];
        qs.push(`from=${fromVal}`);
        qs.push("ac=detail");
        qs.push("limit=24");
        qs.push(`pg=${pg}`);
        if (ext?.class) qs.push(`t=${ext.class}`);
        if (ext?.year) qs.push(`year=${encodeURIComponent(ext.year)}`);
        const url = `${HOST}/api.php/provide/vod/?${qs.join("&")}`;
        const resp = await request(url);
        const jo = safeJson(resp);
        const list = [];
        if (jo && Array.isArray(jo.list)) {
            for (const v of jo.list) {
                const vodId = String(v.vod_id || "");
                const name = (v.vod_name || "").trim();
                const pic = fixPicUrl(v.vod_pic || "");
                const remarks = (v.vod_remarks || "").trim();
                if (!vodId || !name) continue;
                list.push({
                    vod_id: vodId,
                    vod_name: name,
                    vod_pic: pic,
                    vod_remarks: remarks,
                    style: { type: 'rect', ratio: 1.33 }
                });
            }
        }
        const pagecount = jo?.pagecount ? Number(jo.pagecount) : 1;
        return JSON.stringify({
            list,
            page: pg,
            pagecount: pagecount,
            limit: 24,
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
        const kw = encodeURIComponent(key);
        const url = `${HOST}/api.php/provide/vod/?ac=detail&wd=${kw}&pg=${pg}`;
        const resp = await request(url);
        const jo = safeJson(resp);
        const list = [];
        if (jo && Array.isArray(jo.list)) {
            for (const v of jo.list) {
                const vodId = String(v.vod_id || "");
                const name = (v.vod_name || v.name || "").trim();
                const pic = fixPicUrl(v.vod_pic || v.pic || "");
                const remarks = (v.vod_remarks || "").trim();
                if (!vodId || !name) continue;
                list.push({
                    vod_id: vodId,
                    vod_name: name,
                    vod_pic: pic,
                    vod_remarks: remarks,
                    style: { type: 'rect', ratio: 1.33 }
                });
            }
        }
        const pagecount = jo?.pagecount ? Number(jo.pagecount) : 1;
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
        const url = `${HOST}/api.php/provide/vod/?ac=detail&ids=${encodeURIComponent(vodId)}`;
        const resp = await request(url);
        const jo = safeJson(resp);
        if (!jo || !Array.isArray(jo.list) || jo.list.length === 0) {
            return JSON.stringify({ list: [] });
        }
        const item = jo.list[0];
        const vod = {
            vod_id: String(item.vod_id || ""),
            vod_name: (item.vod_name || "").trim(),
            vod_pic: fixPicUrl(item.vod_pic || ""),
            vod_year: (item.vod_year || "").trim(),
            vod_area: (item.vod_area || "").trim(),
            vod_remarks: (item.vod_remarks || "").trim(),
            vod_actor: "",
            vod_director: "",
            vod_content: (item.vod_content || "").trim(),
            vod_play_from: item.vod_play_from || "",
            vod_play_url: item.vod_play_url || ""
        };
        // 将每一集播放链接base64编码，供play函数读取
        if (vod.vod_play_url) {
            const newPlayUrlGroups = [];
            const fromArr = vod.vod_play_from.split("$$$");
            const urlGroups = vod.vod_play_url.split("$$$");
            for (let i = 0; i < urlGroups.length; i++) {
                const epList = urlGroups[i].split("#");
                const encodedEpList = [];
                for (const epStr of epList) {
                    const sp = epStr.split("$");
                    if (sp.length < 2) continue;
                    const epName = sp[0];
                    const rawPlayUrl = sp[1];
                    encodedEpList.push(`${epName}$${b64EncodeUtf8(rawPlayUrl)}`);
                }
                newPlayUrlGroups.push(encodedEpList.join("#"));
            }
            vod.vod_play_url = newPlayUrlGroups.join("$$$");
        }
        return JSON.stringify({ list: [vod] });
    } catch (e) {
        console.error("detail error", e.message);
        return JSON.stringify({ list: [] });
    }
}

// 提取apiToken
function extractApiToken(text) {
    const m = text.match(/apiToken\s*:\s*["']([^"']+)["']/);
    return m ? m[1] : "";
}

// 简单url格式修复
function formatUrl(u) {
    if (!u) return "";
    let s = String(u).replace(/\\/g, "");
    s = s.replace(/^(https?:\/)(?!\/)/i, "$1/");
    return s;
}

// 判断是否为直链
function isDirectUrl(u) {
    const s = String(u || "");
    return s.includes("m3u") || s.includes("mp4");
}

// 调用kptv直链解析
async function tryKptvParse(videoUrl) {
    try {
        const resolveUrl = PARSE_API + encodeURIComponent(videoUrl);
        const t1 = await request(resolveUrl);
        const token = extractApiToken(t1);
        if (!token) return "";
        const hostDomain = PARSE_API.split("//")[1].split("/")[0];
        const apiUrl = `https://${hostDomain}/api/resolve.php?token=${encodeURIComponent(token)}`;
        const t2 = await request(apiUrl);
        const jo = safeJson(t2);
        const real = formatUrl(jo?.url || "");
        return real;
    } catch (err) {
        console.error("kptv parse fail", err.message);
        return "";
    }
}

// 获取第一个webview解析地址
function getWebviewJx(videoUrl) {
    for (const site of PARSE_SITES) {
        if (site) return site + encodeURIComponent(videoUrl);
    }
    return "";
}

async function play(flag, id, flags) {
    try {
        const rawVideoUrl = b64DecodeUtf8(id || "");
        if (!rawVideoUrl) {
            return JSON.stringify({ parse: 1, url: "", header: { "User-Agent": UA } });
        }
        // 1. 如果本身就是m3u/mp4直链直接播放
        if (isDirectUrl(rawVideoUrl)) {
            return JSON.stringify({
                parse: 0,
                url: rawVideoUrl,
                header: { "User-Agent": UA }
            });
        }
        // 2.尝试kptv直链解析
        const kptvResult = await tryKptvParse(rawVideoUrl);
        if (kptvResult) {
            return JSON.stringify({
                parse: 0,
                url: kptvResult,
                header: { "User-Agent": UA }
            });
        }
        // 3. 获取webview解析地址，返回parse:1交给壳子webview解析
        const jxUrl = getWebviewJx(rawVideoUrl);
        if (jxUrl) {
            return JSON.stringify({
                parse: 1,
                url: jxUrl,
                header: { "User-Agent": UA }
            });
        }
        //兜底
        return JSON.stringify({
            parse: 1,
            url: rawVideoUrl,
            header: { "User-Agent": UA }
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
//（注：内容由AI生成）
