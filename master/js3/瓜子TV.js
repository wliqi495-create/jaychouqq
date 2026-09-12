import { Crypto, _ } from 'assets://js/lib/cat.js';
let siteKey = '';
let siteType = 0;
let extendObj = {};

// 配置复刻py
const HOSTS = [
    'https://apinew.uozvr.com',
    'https://api.w32z7vtd.com',
    'https://api.6a7nnf7.com',
    'https://api.umygrx3.com',
    'https://api.rmedphk.com'
];
let hostIndex = 0;
let currentHost = HOSTS[hostIndex];

const AES_KEY = 'OITxa5OqAYjhswxx';
const AES_IV = 'rCMNwZASNBKZ8mXV';
const DEVICE_OLD_KEY = "aLFBMWpxBrIDAD1Si/KVvm41";

let deviceId = "";
let deviceKey = "";
let token = "";
let tokenId = "";
let registered = false;

const UA = "Lavf/57.83.100";
const HEADERS_BASE = {
    'User-Agent': UA,
    'code': 'GZ0369',
    'lang': 'zh_cn',
    'Cache-Control': 'no-cache',
    'Content-Type': 'application/x-www-form-urlencoded',
    'Version': '2604028',
    'PackageName': 'com.ae06aebdbb.y286327f5a.ofe849883320260517',
    'Ver': '3.0.3.2',
    'api-ver': '3.0.3.2',
    'Referer': ''
};

// ========== CAT沙箱缺失加密库，全部为占位桩函数 ==========
function md5Stub() { return ""; }
function aesEncryptStub() { return ""; }
function aesDecryptStub() { return ""; }
function rsaEncryptStub() { return ""; }
function rsaDecryptStub() { return ""; }

async function request(url, optHeaders = {}, body) {
    try {
        const headers = Object.assign({}, HEADERS_BASE, optHeaders || {});
        headers.Referer = currentHost;
        const res = await req(url, {
            method: body ? "POST" : "GET",
            headers: headers,
            timeout: 10000,
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

// 【占位桩】原py加密请求，CAT无RSA/AES‑CBC，直接返回null
async function sendEncryptedRequest(data, path, isAuth = false) {
    console.warn("瓜子影视：CAT环境缺少RSA/AES‑CBC加密，无法执行加密API请求");
    return null;
}

async function init(cfg) {
    try {
        siteKey = cfg.skey;
        siteType = cfg.stype;
        // 模拟设备信息
        deviceId = String(864150060000000 + Math.floor(Math.random() * 9999));
        const hexChars = "0123456789ABCDEF";
        deviceKey = Array.from({ length: 40 }, () => hexChars[Math.floor(Math.random() * 16)]).join("");

        // 分类&筛选，完全复刻py homeContent
        const classesRaw = [
            { type_name: "电影", type_id: "1", land: 1, ratio: 1.33 },
            { type_name: "电视剧", type_id: "2", land: 1, ratio: 1.33 },
            { type_name: "动漫", type_id: "4", land: 1, ratio: 1.33 },
            { type_name: "综艺", type_id: "3", land: 1, ratio: 1.33 },
            { type_name: "短剧", type_id: "64", land: 1, ratio: 1.33 }
        ];
        const filterObj = {};
        const filterItemTemplate = [
            {
                key: "area",
                name: "地区",
                value: [
                    { n: "全部", v: "0" }, { n: "大陆", v: "大陆" }, { n: "香港", v: "香港" },
                    { n: "台湾", v: "台湾" }, { n: "美国", v: "美国" }, { n: "韩国", v: "韩国" },
                    { n: "日本", v: "日本" }, { n: "英国", v: "英国" }, { n: "法国", v: "法国" },
                    { n: "泰国", v: "泰国" }, { n: "印度", v: "印度" }, { n: "其他", v: "其他" }
                ]
            },
            {
                key: "year",
                name: "年份",
                value: [
                    { n: "全部", v: "0" }, { n: "2025", v: "2025" }, { n: "2024", v: "2024" },
                    { n: "2023", v: "2023" }, { n: "2022", v: "2022" }, { n: "2021", v: "2021" },
                    { n: "2020", v: "2020" }, { n: "2019", v: "2019" }, { n: "2018", v: "2018" },
                    { n: "2017", v: "2017" }, { n: "2016", v: "2016" }, { n: "2015", v: "2015" },
                    { n: "2014", v: "2014" }, { n: "2013", v: "2013" }, { n: "2012", v: "2012" },
                    { n: "2011", v: "2011" }, { n: "2010", v: "2010" }, { n: "2009", v: "2009" },
                    { n: "2008", v: "2008" }, { n: "2007", v: "2007" }, { n: "2006", v: "2006" },
                    { n: "2005", v: "2005" }, { n: "更早", v: "2004" }
                ]
            },
            {
                key: "sort",
                name: "排序",
                value: [
                    { n: "最新", v: "d_id" }, { n: "最热", v: "d_hits" }, { n: "推荐", v: "d_score" }
                ]
            }
        ];
        for (const c of classesRaw) {
            filterObj[c.type_id] = [...filterItemTemplate];
        }
        extendObj = { classes: classesRaw, filter: filterObj };
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
    // py homeVideoContent 返回空列表
    return JSON.stringify({ list: [] });
}

async function category(tid, pg, filter, ext) {
    pg = Number(pg) || 1;
    try {
        // CAT无法加密请求API，返回空列表
        console.warn("瓜子影视 category：缺少RSA/AES‑CBC，无法请求业务接口");
        return JSON.stringify({
            list: [],
            page: pg,
            pagecount: 9999,
            limit: 30,
            total: 999999
        });
    } catch (e) {
        console.error("category error", e.message);
        return JSON.stringify({ list: [], page: pg, pagecount: 0 });
    }
}

async function search(key, quick, pg) {
    pg = Number(pg) || 1;
    try {
        console.warn("瓜子影视 search：缺少RSA/AES‑CBC，无法请求业务接口");
        return JSON.stringify({
            list: [],
            page: pg,
            pagecount: 9999,
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
        console.warn("瓜子影视 detail：缺少RSA/AES‑CBC，无法请求业务接口");
        return JSON.stringify({ list: [] });
    } catch (e) {
        console.error("detail error", e.message);
        return JSON.stringify({ list: [] });
    }
}

async function play(flag, idB64, flags) {
    try {
        console.warn("瓜子影视 play：缺少RSA/AES‑CBC，无法解析播放");
        return JSON.stringify({ parse: 1, url: "", header: { "User‑Agent": UA } });
    } catch (e) {
        console.error("play error", e.message);
        return JSON.stringify({ parse: 1, url: "", header: { "User‑Agent": UA } });
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