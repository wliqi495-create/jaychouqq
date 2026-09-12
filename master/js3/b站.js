import { Crypto, _ } from 'assets://js/lib/cat.js';
let siteKey = '';
let siteType = 0;

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const BILI_HEADERS = {
    "User-Agent": UA,
    "Referer": "https://www.bilibili.com",
    "Origin": "https://www.bilibili.com",
    "Sec-Fetch-Site": "same‑site",
    "Sec‑Fetch‑Mode": "cors",
    "Sec‑Fetch‑Dest": "empty"
};

const MIXIN_KEY_ENC_TAB = [
    46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35,
    27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 17, 6, 28,
];

let _wbiKeysCache = null;
let _buvid3 = "";
let _buvid4 = "";

// ========== 完全复制123ttv.js工具函数 ==========
async function request(url, optHeaders = {}) {
    try {
        const headers = Object.assign({}, BILI_HEADERS, optHeaders);
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
        return null;
    }
}

function fixPicUrl(url) {
    if (!url) return '';
    url = url.trim();
    if (url.startsWith('http')) return url;
    if (url.startsWith('//')) return `https:${url}`;
    return url;
}

// ========== B站业务工具 移植自哔哩大全_2.js ==========
function getMixinKey(raw) {
    return MIXIN_KEY_ENC_TAB.map((n) => raw[n]).join("").substring(0, 32);
}

function generateBuvid3() {
    const now = Date.now();
    const rand = Math.random().toString(16).substring(2, 10);
    const ts = now.toString(16);
    return `${ts}${rand}`;
}

function generateBuvid4() {
    const now = Date.now();
    const rand = Math.random().toString(16).substring(2, 14);
    const ts = now.toString(16);
    return `X${ts}${rand}`;
}

async function getWbiKeys() {
    if (_wbiKeysCache) return _wbiKeysCache;
    if (!_buvid3) _buvid3 = generateBuvid3();
    if (!_buvid4) _buvid4 = generateBuvid4();
    const cookieStr = `buvid3=${_buvid3}; buvid4=${_buvid4}`;
    const headers = Object.assign({}, BILI_HEADERS, { Cookie: cookieStr });
    const respText = await request("https://api.bilibili.com/x/web‑interface/nav", headers);
    const data = safeJson(respText);
    if (!data || !data.data || !data.data.wbi_img) {
        return { imgKey: "", subKey: "" };
    }
    const { wbi_img } = data.data;
    const imgKey = (wbi_img.img_url || "").split("/").pop().split(".")[0] || "";
    const subKey = (wbi_img.sub_url || "").split("/").pop().split(".")[0] || "";
    _wbiKeysCache = { imgKey, subKey };
    return _wbiKeysCache;
}

async function signWbiParams(params) {
    const { imgKey, subKey } = await getWbiKeys();
    const mixinKey = getMixinKey(imgKey + subKey);
    const wts = Math.floor(Date.now() / 1000);
    const sortedParams = Object.keys(params)
        .sort()
        .reduce((obj, key) => {
            if (params[key] !== undefined && params[key] !== null) {
                obj[key] = params[key];
            }
            return obj;
        }, {});
    sortedParams.wts = wts;
    const query = Object.entries(sortedParams)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join("&");
    // CAT Crypto MD5
    const w_rid = Crypto.MD5(query + mixinKey).toString();
    return { ...sortedParams, w_rid };
}

function formatDuration(seconds) {
    const sec = parseInt(seconds, 10) || 0;
    if (sec <= 0) return "00:00";
    const minutes = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

// 分类列表
const CLASSES = [
    { type_id: "沙雕仙逆", type_name: "傻屌仙逆", land:1, ratio:1.33 },
    { type_id: "沙雕动画", type_name: "沙雕动画", land:1, ratio:1.33 },
    { type_id: "纪录片超清", type_name: "纪录片", land:1, ratio:1.33 },
    { type_id: "演唱会超清", type_name: "演唱会", land:1, ratio:1.33 },
    { type_id: "音乐超清", type_name: "流行音乐", land:1, ratio:1.33 },
    { type_id: "美食超清", type_name: "美食", land:1, ratio:1.33 },
    { type_id: "食谱", type_name: "食谱", land:1, ratio:1.33 },
    { type_id: "体育超清", type_name: "体育", land:1, ratio:1.33 },
    { type_id: "球星", type_name: "球星", land:1, ratio:1.33 },
    { type_id: "中小学教育", type_name: "教育", land:1, ratio:1.33 },
    { type_id: "幼儿教育", type_name: "幼儿教育", land:1, ratio:1.33 },
    { type_id: "旅游", type_name: "旅游", land:1, ratio:1.33 },
    { type_id: "风景4K", type_name: "风景", land:1, ratio:1.33 },
    { type_id: "说案", type_name: "说案", land:1, ratio:1.33 },
    { type_id: "知名UP主", type_name: "知名UP主", land:1, ratio:1.33 },
    { type_id: "探索发现超清", type_name: "探索发现", land:1, ratio:1.33 },
    { type_id: "鬼畜", type_name: "鬼畜", land:1, ratio:1.33 },
    { type_id: "搞笑超清", type_name: "搞笑", land:1, ratio:1.33 },
    { type_id: "儿童超清", type_name: "儿童", land:1, ratio:1.33 },
    { type_id: "动物世界超清", type_name: "动物世界", land:1, ratio:1.33 },
    { type_id: "相声小品超清", type_name: "相声小品", land:1, ratio:1.33 },
    { type_id: "戏曲", type_name: "戏曲", land:1, ratio:1.33 },
    { type_id: "解说", type_name: "解说", land:1, ratio:1.33 },
    { type_id: "演讲", type_name: "演讲", land:1, ratio:1.33 },
    { type_id: "小姐姐超清", type_name: "小姐姐", land:1, ratio:1.33 },
    { type_id: "荒野求生超清", type_name: "荒野求生", land:1, ratio:1.33 },
    { type_id: "健身", type_name: "健身", land:1, ratio:1.33 },
    { type_id: "帕梅拉", type_name: "帕梅拉", land:1, ratio:1.33 },
    { type_id: "太极拳", type_name: "太极拳", land:1, ratio:1.33 },
    { type_id: "广场舞", type_name: "广场舞", land:1, ratio:1.33 },
    { type_id: "舞蹈", type_name: "舞蹈", land:1, ratio:1.33 },
    { type_id: "音乐", type_name: "音乐", land:1, ratio:1.33 },
    { type_id: "歌曲", type_name: "歌曲", land:1, ratio:1.33 },
    { type_id: "MV4K", type_name: "MV", land:1, ratio:1.33 },
    { type_id: "舞曲超清", type_name: "舞曲", land:1, ratio:1.33 },
    { type_id: "4K", type_name: "4K", land:1, ratio:1.33 },
    { type_id: "电影", type_name: "电影", land:1, ratio:1.33 },
    { type_id: "电视剧", type_name: "电视剧", land:1, ratio:1.33 },
    { type_id: "白噪音超清", type_name: "白噪音", land:1, ratio:1.33 },
    { type_id: "考公考证", type_name: "考公考证", land:1, ratio:1.33 },
    { type_id: "平面设计教学", type_name: "平面设计教学", land:1, ratio:1.33 },
    { type_id: "软件教程", type_name: "软件教程", land:1, ratio:1.33 },
    { type_id: "Windows", type_name: "Windows", land:1, ratio:1.33 },
];

let extendObj = { classes: [...CLASSES], filter: {} };

async function init(cfg) {
    try {
        siteKey = cfg.skey;
        siteType = cfg.stype;
        _wbiKeysCache = null;
        _buvid3 = generateBuvid3();
        _buvid4 = generateBuvid4();
        extendObj = { classes: [...CLASSES], filter: {} };
    } catch (e) {
        console.error("init error", e.message);
        extendObj = { classes: [...CLASSES], filter: {} };
    }
}

function home(filter) {
    try {
        return JSON.stringify({ class: extendObj.classes || CLASSES, filters: extendObj.filter || {} });
    } catch (e) {
        return JSON.stringify({ class: CLASSES, filters: {} });
    }
}

async function homeVod() {
    try {
        const url = "https://api.bilibili.com/x/web‑interface/popular?ps=20&pn=1";
        const respText = await request(url);
        const data = safeJson(respText);
        const rawList = (data?.data?.list) || [];
        const list = [];
        for (const item of rawList) {
            list.push({
                vod_id: String(item.aid || ""),
                vod_name: String(item.title || "").replace(/<[^>]*>/g, ""),
                vod_pic: fixPicUrl(item.pic || ""),
                vod_remarks: formatDuration(item.duration),
                style: { type: 'rect', ratio: 1.33 }
            });
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
        const keyword = tid || "";
        if (!keyword) {
            return JSON.stringify({ list:[], page:pg, pagecount:0, total:0 });
        }
        const rawParams = {
            search_type: "video",
            keyword: keyword,
            page: pg
        };
        const signedParams = await signWbiParams(rawParams);
        const queryParts = [];
        for(const k in signedParams){
            queryParts.push(`${encodeURIComponent(k)}=${encodeURIComponent(signedParams[k])}`);
        }
        const qs = queryParts.join("&");
        const cookieStr = `buvid3=${_buvid3}; buvid4=${_buvid4}`;
        const headers = Object.assign({}, BILI_HEADERS, {
            Cookie: cookieStr,
            Referer:"https://search.bilibili.com/all?keyword=1",
            Origin:"https://search.bilibili.com"
        });
        const url = `https://api.bilibili.com/x/web‑interface/search/type?${qs}`;
        const respText = await request(url, headers);
        const data = safeJson(respText);
        const rawResult = (data?.data?.result) || [];
        const list = [];
        for(const item of rawResult){
            if(item.type !== "video") continue;
            list.push({
                vod_id: String(item.aid || ""),
                vod_name: String(item.title || "").replace(/<[^>]*>/g, ""),
                vod_pic: fixPicUrl(item.pic || ""),
                vod_remarks: "",
                style: { type: 'rect', ratio: 1.33 }
            });
        }
        const numPages = data?.data?.numPages || 1;
        const total = data?.data?.numResults || list.length;
        return JSON.stringify({
            list,
            page: pg,
            pagecount: numPages,
            limit:20,
            total: total
        });
    } catch (e) {
        console.error("category error", e.message);
        return JSON.stringify({ list:[], page:pg, pagecount:0, total:0 });
    }
}

async function search(key, quick, pg) {
    pg = Number(pg) || 1;
    // 搜索直接复用category，tid传关键词
    return await category(key, pg, null, null);
}

async function detail(vodId) {
    try {
        const aid = String(vodId || "");
        if(!aid){
            return JSON.stringify({ list:[] });
        }
        const url = `https://api.bilibili.com/x/web‑interface/view?aid=${aid}`;
        const respText = await request(url);
        const data = safeJson(respText);
        const video = data?.data;
        if(!video){
            return JSON.stringify({ list:[] });
        }
        const pages = video.pages || [];
        const epList = [];
        for(let i=0;i<pages.length;i++){
            const p = pages[i];
            const part = p.part || `第${i+1}集`;
            const cid = p.cid;
            // playId aid_cid，base64编码
            const playRaw = `${aid}_${cid}`;
            epList.push(`${part}$${b64EncodeUtf8(playRaw)}`);
        }
        const vod = {
            vod_id: aid,
            vod_name: String(video.title || "").replace(/<[^>]*>/g, ""),
            vod_pic: fixPicUrl(video.pic || ""),
            vod_year:"",
            vod_area:"",
            vod_remarks:"",
            vod_actor:"",
            vod_director:"",
            vod_content: String(video.desc || ""),
            vod_play_from: "B站",
            vod_play_url: epList.join("#")
        };
        return JSON.stringify({ list:[vod] });
    } catch (e) {
        console.error("detail error", e.message);
        return JSON.stringify({ list:[] });
    }
}

async function play(flag, id, flags) {
    try {
        const raw = b64DecodeUtf8(id||"");
        if(!raw || !raw.includes("_")){
            return JSON.stringify({ parse:1, url:"", header:BILI_HEADERS });
        }
        const [aid,cid] = raw.split("_");
        if(!aid || !cid){
            return JSON.stringify({ parse:1, url:"", header:BILI_HEADERS });
        }
        // 获取播放地址，无登录只能低画质
        const url = `https://api.bilibili.com/x/player/playurl?avid=${aid}&cid=${cid}&qn=80&fnval=1`;
        const respText = await request(url, BILI_HEADERS);
        const data = safeJson(respText);
        if(!data || data.code!==0 || !data.data){
            return JSON.stringify({ parse:1, url:"", header:BILI_HEADERS });
        }
        const payload = data.data;
        let realUrl = "";
        if(payload.durl && Array.isArray(payload.durl) && payload.durl.length>0){
            realUrl = payload.durl[0].url || "";
        }
        if(realUrl){
            return JSON.stringify({
                parse:0,
                url: realUrl,
                header: {
                    "User‑Agent":UA,
                    "Referer":`https://www.bilibili.com/video/av${aid}`
                }
            });
        }
        return JSON.stringify({ parse:1, url:"", header:BILI_HEADERS });
    } catch (e) {
        console.error("play error", e.message);
        return JSON.stringify({ parse:1, url:"", header:BILI_HEADERS });
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
