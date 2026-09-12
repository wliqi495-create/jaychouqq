import { Crypto, _ } from 'assets://js/lib/cat.js';
let siteKey = '';
let siteType = 0;

// 域名池
const HOSTS = [
    'https://apinew.uozvr.com',
    'https://api.w32z7vtd.com',
    'https://api.6a7nnf7.com',
    'https://api.umygrx3.com',
    'https://api.rmedphk.com'
];
let hostIndex = 0;
let HOST = HOSTS[hostIndex];

// AES配置
const AES_KEY = 'OITxa5OqAYjhswxx';
const AES_IV = 'rCMNwZASNBKZ8mXV';
const DEVICE_OLD_KEY = "aLFBMWpxBrIDAD1Si/KVvm41";

// 设备、token状态
let deviceId = "";
let deviceKey = "";
let token = "";
let token_id = "";
let registered = false;

const UA = "Lavf/57.83.100";
const DEFAULT_HEADERS = {
    "User-Agent": UA,
    "code": "GZ0369",
    "lang": "zh_cn",
    "Cache-Control": "no-cache",
    "Content-Type": "application/x-www-form-urlencoded",
    "Version": "2604028",
    "PackageName": "com.ae06aebdbb.y286327f5a.ofe849883320260517",
    "Ver": "3.0.3.2",
    "api-ver": "3.0.3.2",
    "Referer": HOST
};

let cache = {};
const CACHE_TIMEOUT = 300;

async function request(url, optHeaders = {}, body) {
    try {
        const headers = Object.assign({}, DEFAULT_HEADERS, optHeaders);
        headers.Referer = HOST;
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

function safeJson(str) {
    try {
        if (!str) return null;
        return JSON.parse(str);
    } catch (e) {
        return null;
    }
}

function getTimestamp() {
    return Math.floor(Date.now() / 1000).toString();
}

function randomString(len) {
    const chars = '0123456789ABCDEF';
    let s = '';
    for (let i = 0; i < len; i++) {
        s += chars[Math.floor(Math.random() * chars.length)];
    }
    return s;
}

// ===================== 【重要】cat.js无AES‑CBC / RSA 原生支持，以下加解密仅占位，实际无法工作 =====================
/**
 * 原py aes_encrypt：JS环境缺少PKCS7Padding，cat内置Crypto不支持CBC模式
 */
function aesEncrypt(text, key, iv) {
    console.warn("⚠️ cat.js不支持AES‑CBC，加密返回空，该源无法直接运行");
    return "";
}
function aesDecrypt(hexStr, key, iv) {
    console.warn("⚠️ cat.js不支持AES‑CBC，解密返回空");
    return "";
}
/**
 * RSA公钥加密 / RSA私钥解密，cat环境完全无RSA实现
 */
function rsaEncrypt(text) { return ""; }
function rsaDecrypt(b64Str) { return ""; }

function md5Upper(str) {
    return Crypto.MD5(str).toUpperCase();
}

/** 设备注册 signUp */
async function signUp() {
    const params = {
        "new_key": deviceKey,
        "old_key": DEVICE_OLD_KEY,
        "phone_type": 1,
        "code": ""
    };
    const ret = await authRequest('/App/Authentication/Device/signUp', params);
    if (ret && ret.token) {
        token = ret.token;
        token_id = ret.app_user_id || "";
        registered = true;
    }
}

async function refreshToken() {
    const ret = await authRequest('/App/Authentication/Authenticator/refresh', {});
    if (ret && ret.token) {
        token = ret.token;
        token_id = ret.app_user_id || "";
    }
}

async function authRequest(path, params) {
    // 占位：真正需要：AES+RSA加密请求体，cat环境做不到
    return {};
}

async function ensureToken() {
    if (!token || !token_id) {
        if (!registered) {
            await signUp();
        }
        await refreshToken();
    }
}

/** 加密业务请求占位 */
async function sendEncryptedRequest(data, path, isAuth = false) {
    if (!isAuth) await ensureToken();
    console.warn("瓜子源：缺少AES‑CBC/RSA实现，请求无法发出");
    return null;
}

async function getApiData(data, path, useCache = true) {
    const cacheKey = path + "_" + JSON.stringify(data);
    if (useCache && cache[cacheKey]) {
        const [obj, ts] = cache[cacheKey];
        if (Date.now() / 1000 - ts < CACHE_TIMEOUT) {
            return obj;
        }
    }
    let result = null;
    // 多域名轮询占位
    for (let tryHost = 0; tryHost < HOSTS.length; tryHost++) {
        HOST = HOSTS[(hostIndex++) % HOSTS.length];
        result = await sendEncryptedRequest(data, path);
        if (result) break;
    }
    if (result && useCache) {
        cache[cacheKey] = [result, Date.now() / 1000];
    }
    return result;
}

// ===================== cat标准入口函数 =====================
async function init(cfg) {
    try {
        siteKey = cfg.skey;
        siteType = cfg.stype;
        // 初始化设备信息
        deviceId = String(864150060000000 + Math.floor(Math.random() * 10000));
        deviceKey = randomString(40);
        token = "";
        token_id = "";
        registered = false;
    } catch (e) {
        console.error("init error", e.message);
    }
}

async function home(filter) {
    try {
        const classes = [
            { type_id: "1", type_name: "电影", land: 1, ratio: 1.33 },
            { type_id: "2", type_name: "电视剧", land: 1, ratio: 1.33 },
            { type_id: "4", type_name: "动漫", land: 1, ratio: 1.33 },
            { type_id: "3", type_name: "综艺", land: 1, ratio: 1.33 },
            { type_id: "64", type_name: "短剧", land: 1, ratio: 1.33 }
        ];
        const filters = {};
        const filterItem = [
            {
                "key": "area",
                "name": "地区",
                "value": [
                    { "n": "全部", "v": "0" }, { "n": "大陆", "v": "大陆" }, { "n": "香港", "v": "香港" },
                    { "n": "台湾", "v": "台湾" }, { "n": "美国", "v": "美国" }, { "n": "韩国", "v": "韩国" },
                    { "n": "日本", "v": "日本" }, { "n": "英国", "v": "英国" }, { "n": "法国", "v": "法国" },
                    { "n": "泰国", "v": "泰国" }, { "n": "印度", "v": "印度" }, { "n": "其他", "v": "其他" }
                ]
            },
            {
                "key": "year",
                "name": "年份",
                "value": [
                    { "n": "全部", "v": "0" }, { "n": "2025", "v": "2025" }, { "n": "2024", "v": "2024" },
                    { "n": "2023", "v": "2023" }, { "n": "2022", "v": "2022" }, { "n": "2021", "v": "2021" },
                    { "n": "2020", "v": "2020" }, { "n": "2019", "v": "2019" }, { "n": "2018", "v": "2018" },
                    { "n": "2017", "v": "2017" }, { "n": "2016", "v": "2016" }, { "n": "2015", "v": "2015" },
                    { "n": "2014", "v": "2014" }, { "n": "2013", "v": "2013" }, { "n": "2012", "v": "2012" },
                    { "n": "2011", "v": "2011" }, { "n": "2010", "v": "2010" }, { "n": "2009", "v": "2009" },
                    { "n": "2008", "v": "2008" }, { "n": "2007", "v": "2007" }, { "n": "2006", "v": "2006" },
                    { "n": "2005", "v": "2005" }, { "n": "更早", "v": "2004" }
                ]
            },
            {
                "key": "sort",
                "name": "排序",
                "value": [
                    { "n": "最新", "v": "d_id" }, { "n": "最热", "v": "d_hits" }, { "n": "推荐", "v": "d_score" }
                ]
            }
        ];
        classes.forEach(cate => {
            filters[cate.type_id] = filterItem;
        });
        return JSON.stringify({ class: classes, filters: filters });
    } catch (e) {
        console.error("home error", e.message);
        return JSON.stringify({ class: [], filters: {} });
    }
}

async function homeVod() {
    return JSON.stringify({ list: [] });
}

async function category(tid, pg, filter, ext) {
    pg = Number(pg) || 1;
    try {
        const body = {
            "area": ext?.area ?? '0',
            "year": ext?.year ?? '0',
            "pageSize": "30",
            "sort": ext?.sort ?? 'd_id',
            "page": String(pg),
            "tid": tid
        };
        const data = await getApiData(body, '/App/IndexList/indexList');
        const list = [];
        if (data && Array.isArray(data.list)) {
            data.list.forEach(item => {
                const vod_continu = item.vod_continu || 0;
                const remarks = vod_continu === 0 ? "电影" : `更新至${vod_continu}集`;
                list.push({
                    vod_id: `${item.vod_id || ""}/${vod_continu}`,
                    vod_name: item.vod_name || "",
                    vod_pic: item.vod_pic || "",
                    vod_remarks: remarks,
                    style: { type: 'rect', ratio: 1.33 }
                });
            });
        }
        return JSON.stringify({
            list: list,
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
        const body = {
            "keywords": key,
            "order_val": "1",
            "page": String(pg)
        };
        const data = await getApiData(body, '/App/Index/findMoreVod', false);
        const list = [];
        if (data && Array.isArray(data.list)) {
            data.list.forEach(item => {
                const vod_continu = item.vod_continu || 0;
                const remarks = vod_continu === 0 ? "电影" : `更新至${vod_continu}集`;
                list.push({
                    vod_id: `${item.vod_id || ""}/${vod_continu}`,
                    vod_name: item.vod_name || "",
                    vod_pic: item.vod_pic || "",
                    vod_remarks: remarks,
                    style: { type: 'rect', ratio: 1.33 }
                });
            });
        }
        return JSON.stringify({
            list: list,
            page: pg,
            pagecount: 9999,
            limit: 30,
            total: 999999,
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
        const realVodId = vodId.split('/')[0];
        const t = getTimestamp();
        const body1 = { "token_id": token_id, "vod_id": realVodId, "mobile_time": t, "token": token };
        const qdata = await getApiData(body1, '/App/IndexPlay/playInfo');
        const body2 = { "vurl_cloud_id": "2", "vod_d_id": realVodId };
        const jdata = await getApiData(body2, '/App/Resource/Vurl/show');
        if (!qdata || !qdata.vodInfo) return JSON.stringify({ list: [] });
        const vod = qdata.vodInfo;
        const playList = [];
        if (jdata && Array.isArray(jdata.list)) {
            jdata.list.forEach((item, idx) => {
                if (item.play) {
                    const nArr = [];
                    const pArr = [];
                    for (const k in item.play) {
                        const val = item.play[k];
                        if (val.param) {
                            nArr.push(k);
                            pArr.push(val.param);
                        }
                    }
                    if (pArr.length > 0) {
                        const playName = jdata.list.length === 1 ? vod.vod_name : String(idx + 1);
                        const playUrl = `${pArr[pArr.length - 1]}||${nArr.join('@')}`;
                        playList.push(`${playName}$${playUrl}`);
                    }
                }
            });
        }
        const vodObj = {
            vod_id: realVodId,
            vod_name: vod.vod_name || "",
            vod_pic: vod.vod_pic || "",
            vod_year: vod.vod_year || "",
            vod_area: vod.vod_area || "",
            vod_actor: vod.vod_actor || "",
            vod_director: vod.vod_director || "",
            vod_content: (vod.vod_use_content || "").trim(),
            vod_play_from: "瓜子影视",
            vod_play_url: playList.join('#')
        };
        return JSON.stringify({ list: [vodObj] });
    } catch (e) {
        console.error("detail error", e.message);
        return JSON.stringify({ list: [] });
    }
}

async function play(flag, playId, flags) {
    try {
        const parts = playId.split('||');
        if (parts.length < 2) {
            return JSON.stringify({ parse: 0, url: "", header: { "User‑Agent": UA } });
        }
        const paramStr = parts[0];
        const resolutions = parts[1].split('@');
        const params = {};
        paramStr.split('&').forEach(pair => {
            const kv = pair.split('=', 2);
            if (kv.length === 2) params[kv[0]] = kv[1];
        });
        if (resolutions.length > 0) {
            resolutions.sort((a, b) => (Number(b) || 0) - (Number(a) || 0));
            params.resolution = resolutions[0];
            const data = await getApiData(params, '/App/Resource/VurlDetail/showOne', false);
            if (data && data.url) {
                return JSON.stringify({
                    parse: 0,
                    url: data.url,
                    header: { "User‑Agent": UA, "Referer": "http://WJiZxLXA2.com/" }
                });
            }
        }
        return JSON.stringify({ parse: 0, url: "", header: { "User‑Agent": UA } });
    } catch (e) {
        console.error("play error", e.message);
        return JSON.stringify({ parse: 0, url: "", header: { "User‑Agent": UA } });
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