import { Crypto, _ } from 'assets://js/lib/cat.js';
let siteKey = '';
let siteType = 0;

// ========== 配置 复刻py ==========
const HOSTS = [
    'https://apinew.uozvr.com',
    'https://api.w32z7vtd.com',
    'https://api.6a7nnf7.com',
    'https://api.umygrx3.com',
    'https://api.rmedphk.com'
];
let hostIndex = 0;
let host = HOSTS[hostIndex];

const AES_KEY = 'OITxa5OqAYjhswxx';
const AES_IV = 'rCMNwZASNBKZ8mXV';
const RSA_PUBLIC_KEY = "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDUM5+/y8sPsWkd1/RQS64X259EUwxFXFE5HlA65MqrxnPs0JqoSRojSDy5QhwvROlaD6TwRQHKMY2OAZ6SnQeUJsChTEFIR9qUkwrs3/MVUMxjsv6JS6Oe/juclyJGTgVmDhB55EafXsD0SQYVj/QXXsxR6ewR5E2kL52yAAD4yQIDAQAB";
const RSA_PRIVATE_KEY = `-----BEGIN RSA PRIVATE KEY-----
MIICdgIBADANBgkqhkiG9w0BAQEFAASCAmAwggJcAgEAAoGAe6hKrWLi1zQmjTT1
ozbE4QdFeJGNxubxld6GrFGximxfMsMB6BpJhpcTouAqywAFppiKetUBBbXwYsYU
1wNr648XVmPmCMCy4rY8vdliFnbMUj086DU6Z+/oXBdWU3/b1G0DN3E9wULRSwcK
ZT3wj/cCI1vsCm3gj2R5SqkA9Y0CAwEAAQKBgAJH+4CxV0/zBVcLiBCHvSANm0l7
HetybTh/j2p0Y1sTXro4ALwAaCTUeqdBjWiLSo9lNwDHFyq8zX90+gNxa7c5EqcW
V9FmlVXr8VhfBzcZo1nXeNdXFT7tQ2yah/odtdcx+vRMSGJd1t/5k5bDd9wAvYdI
DblMAg+wiKKZ5KcdAkEA1cCakEN4NexkF5tHPRrR6XOY/XHfkqXxEhMqmNbB9U34
saTJnLWIHC8IXys6Qmzz30TtzCjuOqKRRy+FMM4TdwJBAJQZFPjsGC+RqcG5UvVM
iMPhnwe/bXEehShK86yJK/g/UiKrO87h3aEu5gcJqBygTq3BBBoH2md3pr/W+hUM
WBsCQQChfhTIrdDinKi6lRxrdBnn0Ohjg2cwuqK5zzU9p/N+S9x7Ck8wUI53DKm8
jUJE8WAG7WLj/oCOWEh+ic6NIwTdAkEAj0X8nhx6AXsgCYRql1klbqtVmL8+95KZ
K7PnLWG/IfjQUy3pPGoSaZ7fdquG8bq8oyf5+dzjE/oTXcByS+6XRQJAP/5ciy1b
L3NhUhsaOVy55MHXnPjdcTX0FaLi+ybXZIfIQ2P4rb19mVq1feMbCXhz+L1rG8oa
t5lYKfpe8k83ZA==
-----END RSA PRIVATE KEY-----`;
const DEVICE_OLD_KEY = "aLFBMWpxBrIDAD1Si/KVvm41";

let deviceId = "";
let deviceKey = "";
let token = "";
let tokenId = "";
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
    "api-ver": "3.0.3.2"
};

// 内存缓存
const cache = {};
const CACHE_TIMEOUT = 300 * 1000;

// ===================== 工具函数（模仿乌云.js） =====================
async function request(url, optHeaders = {}, postBody) {
    try {
        const headers = Object.assign({}, DEFAULT_HEADERS, optHeaders);
        headers['deviceId'] = deviceId;
        headers['Referer'] = host;
        const res = await req(url, {
            method: postBody ? "POST" : "GET",
            headers: headers,
            timeout: 15000,
            data: postBody
        });
        return res;
    } catch (e) {
        console.error("request error:", url, e?.message);
        return null;
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

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** 生成随机deviceId */
function genDeviceId() {
    const base = 864150060000000;
    return String(base + randomInt(0, 9999));
}
/** 40位大写16进制 deviceKey */
function genDeviceKey() {
    const pool = "0123456789ABCDEF";
    let s = "";
    for (let i = 0; i < 40; i++) {
        s += pool[randomInt(0, 15)];
    }
    return s;
}

// -------- AES‑CBC 加密解密 CAT CryptoJS 实现 --------
function aesEncrypt(text, keyStr, ivStr) {
    try {
        const key = Crypto.enc.Utf8.parse(keyStr);
        const iv = Crypto.enc.Utf8.parse(ivStr);
        const src = Crypto.enc.Utf8.parse(text);
        const encrypted = Crypto.AES.encrypt(src, key, {
            iv: iv,
            mode: Crypto.mode.CBC,
            padding: Crypto.pad.Pkcs7
        });
        return encrypted.ciphertext.toString(Crypto.enc.Hex).toUpperCase();
    } catch (e) {
        console.error("aesEncrypt err", e);
        return "";
    }
}

function aesDecrypt(hexStr, keyStr, ivStr) {
    try {
        const key = Crypto.enc.Utf8.parse(keyStr);
        const iv = Crypto.enc.Utf8.parse(ivStr);
        const cipherBytes = Crypto.enc.Hex.parse(hexStr);
        const cipher = Crypto.lib.CipherParams.create({ ciphertext: cipherBytes });
        const decrypted = Crypto.AES.decrypt(cipher, key, {
            iv: iv,
            mode: Crypto.mode.CBC,
            padding: Crypto.pad.Pkcs7
        });
        return decrypted.toString(Crypto.enc.Utf8);
    } catch (e) {
        console.error("aesDecrypt err", e);
        return "";
    }
}

function md5Upper(str) {
    return Crypto.MD5(str).toString().toUpperCase();
}

// ⚠️【重要】CAT JS环境没有RSA库，下面两个函数为桩函数，无法工作。需要引入jsrsa库才能真正运行。
function rsaEncrypt(text, pubKey) {
    console.error("RSA加密未实现，CAT缺少RSA库");
    return "";
}
function rsaDecrypt(b64Text, priKey) {
    console.error("RSA解密未实现，CAT缺少RSA库");
    return "";
}

// ===================== 认证逻辑 复刻Python =====================
/** 应用认证返回结果，设置token/tokenId */
function applyAuth(result) {
    const newToken = result?.token || "";
    if (!newToken) throw new Error("认证无token");
    token = newToken;
    tokenId = result?.app_user_id || "";
}

/** 设备注册 signUp */
async function signUp() {
    const params = {
        new_key: deviceKey,
        old_key: DEVICE_OLD_KEY,
        phone_type: 1,
        code: ""
    };
    const res = await authRequest('/App/Authentication/Device/signUp', params);
    applyAuth(res);
    registered = true;
}

/** 设备登录 signIn */
async function signIn() {
    const params = {
        new_key: deviceKey,
        old_key: DEVICE_OLD_KEY
    };
    const res = await authRequest('/App/Authentication/Device/signIn', params);
    applyAuth(res);
}

/** 刷新token */
async function refreshToken() {
    const res = await authRequest('/App/Authentication/Authenticator/refresh', {});
    applyAuth(res);
}

/** 确保token有效 */
async function ensureToken() {
    if (!token || !tokenId) {
        if (registered) {
            await signIn();
        } else {
            await signUp();
        }
    }
    await refreshToken();
}

/** 认证请求（不走ensureToken） */
async function authRequest(path, params) {
    return await sendEncryptedRequest(params, path, true);
}

/**
 * 核心：发送加密请求
 * @param {object} data 业务参数
 * @param {string} path api路径
 * @param {boolean} isAuth 是否认证接口
 */
async function sendEncryptedRequest(data, path, isAuth = false) {
    try {
        if (!isAuth) await ensureToken();
        // 1.AES加密业务json
        const jsonParams = JSON.stringify(data);
        const requestKey = aesEncrypt(jsonParams, AES_KEY, AES_IV);
        // 2.RSA加密iv+key json
        const keyJson = JSON.stringify({ iv: AES_IV, key: AES_KEY });
        const keys = rsaEncrypt(keyJson, RSA_PUBLIC_KEY);
        if (!keys) return null;

        //3.生成签名
        const t = String(Math.floor(Date.now() / 1000));
        const signStr = `token_id=,token=${token},phone_type=1,request_key=${requestKey},app_id=1,time=${t},keys=${keys}*&zvdvdvddbfikkkumtmdwqppp?|4Y!s!2br`;
        const signature = md5Upper(signStr);

        // 请求体
        const bodyData = {
            token: token,
            token_id: "",
            phone_type: "1",
            time: t,
            phone_model: "xiaomi-25031",
            keys: keys,
            request_key: requestKey,
            signature: signature,
            app_id: "1",
            ad_version: "1"
        };
        const url = `${host}${path}`;
        const respObj = await request(url, {}, bodyData);
        if (!respObj) return null;
        const respJson = safeJson(respObj.content);
        if (!respJson) return null;
        if (respJson.code !== 200) {
            console.error("业务错误码", respJson.code);
            return null;
        }
        const dataSec = respJson.data;
        if (!dataSec) return null;
        const encResp = dataSec.response_key;
        const encKeys = dataSec.keys;
        // RSA解密返回的keys
        const decKeysJson = rsaDecrypt(encKeys, RSA_PRIVATE_KEY);
        if (!decKeysJson) return null;
        const keyInfo = safeJson(decKeysJson);
        const respKey = keyInfo.key;
        const respIv = keyInfo.iv;
        const decStr = aesDecrypt(encResp, respKey, respIv);
        return safeJson(decStr);
    } catch (e) {
        console.error("sendEncryptedRequest exception", path, e.message);
        return null;
    }
}

/** 带缓存、域名轮询、重试获取数据 */
async function getData(data, path, useCache = true) {
    let cacheKey = null;
    if (useCache) {
        cacheKey = `${path}_${JSON.stringify(data)}`;
        const cached = cache[cacheKey];
        if (cached) {
            const { data: cData, ts } = cached;
            if (Date.now() - ts < CACHE_TIMEOUT) {
                return cData;
            }
        }
    }
    // 最多重试3次
    for (let attempt = 0; attempt < 3; attempt++) {
        let tried = 0;
        while (tried < HOSTS.length) {
            host = HOSTS[hostIndex];
            const res = await sendEncryptedRequest(data, path);
            if (res !== null) {
                console.log("请求成功", path, host);
                if (useCache && cacheKey) {
                    cache[cacheKey] = { data: res, ts: Date.now() };
                }
                return res;
            }
            hostIndex = (hostIndex + 1) % HOSTS.length;
            tried++;
        }
        // 全部域名失败，重新认证
        if (attempt < 2) {
            console.log("全部域名失败，重新认证");
            try { await ensureToken(); } catch (e) { }
            hostIndex = 0;
        }
    }
    return null;
}

// ===================== CAT标准接口 =====================
async function init(cfg) {
    try {
        siteKey = cfg.skey;
        siteType = cfg.stype;
        // 初始化设备
        deviceId = genDeviceId();
        deviceKey = genDeviceKey();
        token = "";
        tokenId = "";
        registered = false;
        console.log("瓜子影视初始化设备完成");
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
        const filterItem = [
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
                    { n: "全部", v: "0" },
                    { n: "2025", v: "2025" }, { n: "2024", v: "2024" }, { n: "2023", v: "2023" },
                    { n: "2022", v: "2022" }, { n: "2021", v: "2021" }, { n: "2020", v: "2020" },
                    { n: "2019", v: "2019" }, { n: "2018", v: "2018" }, { n: "2017", v: "2017" },
                    { n: "2016", v: "2016" }, { n: "2015", v: "2015" }, { n: "2014", v: "2014" },
                    { n: "2013", v: "2013" }, { n: "2012", v: "2012" }, { n: "2011", v: "2011" },
                    { n: "2010", v: "2010" }, { n: "2009", v: "2009" }, { n: "2008", v: "2008" },
                    { n: "2007", v: "2007" }, { n: "2006", v: "2006" }, { n: "2005", v: "2005" },
                    { n: "更早", v: "2004" }
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
        const filters = {};
        for (const c of classes) {
            filters[c.type_id] = filterItem;
        }
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
            area: ext?.area ?? '0',
            year: ext?.year ?? '0',
            pageSize: "30",
            sort: ext?.sort ?? 'd_id',
            page: String(pg),
            tid: tid
        };
        const data = await getData(body, '/App/IndexList/indexList');
        const list = [];
        if (data && Array.isArray(data.list)) {
            for (const item of data.list) {
                const vodContinu = Number(item.vod_continu || 0);
                const remarks = vodContinu === 0 ? "电影" : `更新至${vodContinu}集`;
                list.push({
                    vod_id: `${item.vod_id || ""}/${vodContinu}`,
                    vod_name: item.vod_name || "",
                    vod_pic: item.vod_pic || "",
                    vod_remarks: remarks,
                    style: { type: 'rect', ratio: 1.33 }
                });
            }
        }
        return JSON.stringify({
            list,
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

async function detail(vodId) {
    try {
        const realVodId = String(vodId).split('/')[0];
        const t = String(Math.floor(Date.now() / 1000));
        const body1 = {
            token_id: tokenId,
            vod_id: realVodId,
            mobile_time: t,
            token: token
        };
        const qdata = await getData(body1, '/App/IndexPlay/playInfo');
        const body2 = { vurl_cloud_id: "2", vod_d_id: realVodId };
        const jdata = await getData(body2, '/App/Resource/Vurl/show');
        if (!qdata || !qdata.vodInfo) {
            return JSON.stringify({ list: [] });
        }
        const vodInfo = qdata.vodInfo;
        const vodObj = {
            vod_id: vodId,
            vod_name: vodInfo.vod_name || "",
            vod_pic: vodInfo.vod_pic || "",
            vod_year: vodInfo.vod_year || "",
            vod_area: vodInfo.vod_area || "",
            vod_actor: vodInfo.vod_actor || "",
            vod_director: vodInfo.vod_director || "",
            vod_content: (vodInfo.vod_use_content || "").trim(),
            vod_play_from: "瓜子影视",
            vod_play_url: ""
        };
        const playList = [];
        if (jdata && Array.isArray(jdata.list)) {
            for (let index = 0; index < jdata.list.length; index++) {
                const item = jdata.list[index];
                if (!item.play) continue;
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
                    const playName = jdata.list.length !== 1 ? String(index + 1) : vodInfo.vod_name;
                    const playUrl = `${pArr[pArr.length - 1]}||${nArr.join('@')}`;
                    playList.push(`${playName}$${playUrl}`);
                }
            }
        }
        vodObj.vod_play_url = playList.join("#");
        return JSON.stringify({ list: [vodObj] });
    } catch (e) {
        console.error("detail error", e.message);
        return JSON.stringify({ list: [] });
    }
}

async function play(flag, id, flags) {
    try {
        const parts = id.split('||');
        if (parts.length < 2) {
            return JSON.stringify({ parse: 0, url: "", header: { "User-Agent": UA } });
        }
        const paramStr = parts[0];
        const resolutions = parts[1].split('@');
        const params = {};
        for (const pair of paramStr.split('&')) {
            const kv = pair.split('=');
            if (kv.length === 2) {
                params[kv[0]] = kv[1];
            }
        }
        if (resolutions.length > 0) {
            // 分辨率降序
            resolutions.sort((a, b) => {
                const na = parseInt(a, 10) || 0;
                const nb = parseInt(b, 10) || 0;
                return nb - na;
            });
            params.resolution = resolutions[0];
            const data = await getData(params, '/App/Resource/VurlDetail/showOne', false);
            if (data && data.url) {
                return JSON.stringify({
                    parse: 0,
                    url: data.url,
                    header: { "User-Agent": UA }
                });
            }
        }
        return JSON.stringify({ parse: 0, url: "", header: { "User-Agent": UA } });
    } catch (e) {
        console.error("play error", e.message);
        return JSON.stringify({ parse: 1, url: "", header: { "User-Agent": UA } });
    }
}

async function search(key, quick, pg) {
    pg = Number(pg) || 1;
    try {
        const body = {
            keywords: key,
            order_val: "1",
            page: String(pg)
        };
        const data = await getData(body, '/App/Index/findMoreVod', false);
        const list = [];
        if (data && Array.isArray(data.list)) {
            for (const item of data.list) {
                const vodContinu = Number(item.vod_continu || 0);
                const remarks = vodContinu === 0 ? "电影" : `更新至${vodContinu}集`;
                list.push({
                    vod_id: `${item.vod_id || ""}/${vodContinu}`,
                    vod_name: item.vod_name || "",
                    vod_pic: item.vod_pic || "",
                    vod_remarks: remarks,
                    style: { type: 'rect', ratio: 1.33 }
                });
            }
        }
        return JSON.stringify({
            list,
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
