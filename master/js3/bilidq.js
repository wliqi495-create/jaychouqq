import { Crypto, _ } from 'assets://js/lib/cat.js';
let siteKey = '';
let siteType = 0;
let cookie = '';
let login = false;
let vip = false;
let bili_jct = '';
let extendObj = {};

// ==================== 配置区域 ====================
const BUILT_IN = {
    cookie: ""
};

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const DEFAULT_HEADERS = {
    "User-Agent": UA,
    "Referer": "https://www.bilibili.com",
    "Origin": "https://www.bilibili.com"
};

const MIXIN_KEY_ENC_TAB = [
    46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35,
    27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 17, 6, 28,
];

const CLASSES_RAW = [
    { type_id: "沙雕仙逆", type_name: "傻屌仙逆" },
    { type_id: "沙雕动画", type_name: "沙雕动画" },
    { type_id: "纪录片超清", type_name: "纪录片" },
    { type_id: "演唱会超清", type_name: "演唱会" },
    { type_id: "音乐超清", type_name: "流行音乐" },
    { type_id: "美食超清", type_name: "美食" },
    { type_id: "食谱", type_name: "食谱" },
    { type_id: "体育超清", type_name: "体育" },
    { type_id: "球星", type_name: "球星" },
    { type_id: "中小学教育", type_name: "教育" },
    { type_id: "幼儿教育", type_name: "幼儿教育" },
    { type_id: "旅游", type_name: "旅游" },
    { type_id: "风景4K", type_name: "风景" },
    { type_id: "说案", type_name: "说案" },
    { type_id: "知名UP主", type_name: "知名UP主" },
    { type_id: "探索发现超清", type_name: "探索发现" },
    { type_id: "鬼畜", type_name: "鬼畜" },
    { type_id: "搞笑超清", type_name: "搞笑" },
    { type_id: "儿童超清", type_name: "儿童" },
    { type_id: "动物世界超清", type_name: "动物世界" },
    { type_id: "相声小品超清", type_name: "相声小品" },
    { type_id: "戏曲", type_name: "戏曲" },
    { type_id: "解说", type_name: "解说" },
    { type_id: "演讲", type_name: "演讲" },
    { type_id: "小姐姐超清", type_name: "小姐姐" },
    { type_id: "荒野求生超清", type_name: "荒野求生" },
    { type_id: "健身", type_name: "健身" },
    { type_id: "帕梅拉", type_name: "帕梅拉" },
    { type_id: "太极拳", type_name: "太极拳" },
    { type_id: "广场舞", type_name: "广场舞" },
    { type_id: "舞蹈", type_name: "舞蹈" },
    { type_id: "音乐", type_name: "音乐" },
    { type_id: "歌曲", type_name: "歌曲" },
    { type_id: "MV4K", type_name: "MV" },
    { type_id: "舞曲超清", type_name: "舞曲" },
    { type_id: "4K", type_name: "4K" },
    { type_id: "电影", type_name: "电影" },
    { type_id: "电视剧", type_name: "电视剧" },
    { type_id: "白噪音超清", type_name: "白噪音" },
    { type_id: "考公考证", type_name: "考公考证" },
    { type_id: "平面设计教学", type_name: "平面设计教学" },
    { type_id: "软件教程", type_name: "软件教程" },
    { type_id: "Windows", type_name: "Windows" }
];

// ==================== 工具函数 ====================
async function request(reqUrl, optHeaders = {}, buffer) {
    try {
        const headers = Object.assign({}, DEFAULT_HEADERS, optHeaders || {});
        if (!_.isEmpty(cookie)) headers.Cookie = cookie.trim();
        let res = await req(reqUrl, {
            method: 'GET',
            headers: headers,
            timeout: 20000,
            buffer: buffer ? 1 : 0,
        });
        return res?.content ?? '';
    } catch (e) {
        console.error('request error', reqUrl, e?.message);
        return '';
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

function removeTags(input) {
    return String(input || '').replace(/<[^>]*>/g, '');
}

function fixCover(url) {
    if (!url) return "";
    url = url.trim();
    if (url.startsWith("//")) return "https:" + url;
    return url;
}

function formatDuration(seconds) {
    const sec = parseInt(seconds, 10) || 0;
    if (sec <= 0) return "00:00";
    const minutes = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
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

function getMixinKey(raw) {
    return MIXIN_KEY_ENC_TAB.map((n) => raw[n]).join("").substring(0, 32);
}

// ==================== CAT标准接口 ====================
async function init(cfg) {
    try {
        siteKey = cfg.skey;
        siteType = cfg.stype;
        let ext = cfg.ext || {};
        cookie = ext?.cookie?.trim() || BUILT_IN.cookie;
        // 自动补充 buvid3 buvid4
        if (cookie && !cookie.includes("buvid3")) cookie += `; buvid3=${generateBuvid3()}`;
        if (cookie && !cookie.includes("buvid4")) cookie += `; buvid4=${generateBuvid4()}`;

        bili_jct = '';
        const cookies = (cookie || '').split(';');
        cookies.forEach(c => {
            const item = c.trim();
            if (item.includes('bili_jct')) {
                bili_jct = item.split('=')[1]?.trim() || '';
            }
        });

        const navResp = await request('https://api.bilibili.com/x/web-interface/nav');
        const navJson = safeJson(navResp);
        login = navJson?.data?.isLogin ?? false;
        vip = navJson?.data?.vipStatus ?? 0;

        const classes = CLASSES_RAW.map(item => {
            return {
                type_id: item.type_id,
                type_name: item.type_name,
                land: 1,
                ratio: 1.33
            };
        });
        extendObj = { classes, filter: {} };
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
        const resp = await request("https://api.bilibili.com/x/web-interface/popular?ps=20&pn=1");
        const json = safeJson(resp);
        const listRaw = json?.data?.list || [];
        const list = [];
        for (const item of listRaw) {
            if (!item.aid) continue;
            list.push({
                vod_id: String(item.aid),
                vod_name: removeTags(item.title || ""),
                vod_pic: fixCover(item.pic || ""),
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
        // 哔哩大全逻辑：type_id直接作为搜索关键词
        const keyword = tid;
        let url = `https://api.bilibili.com/x/web-interface/search/type?search_type=video&keyword=${encodeURIComponent(keyword)}&page=${pg}`;
        const resp = await request(url);
        const json = safeJson(resp);
        const resultList = json?.data?.result || [];
        const list = [];
        for (const item of resultList) {
            if (!item.aid || item.type !== "video") continue;
            list.push({
                vod_id: String(item.aid),
                vod_name: removeTags(item.title || ""),
                vod_pic: fixCover(item.pic || ""),
                vod_remarks: item.duration || "",
                style: { type: 'rect', ratio: 1.33 }
            });
        }
        const pagecount = json?.data?.numPages ? json.data.numPages : (list.length > 0 ? pg + 1 : 1);
        return JSON.stringify({
            list,
            page: pg,
            pagecount: pagecount,
            limit: list.length,
            total: 0
        });
    } catch (e) {
        console.error("category error", e.message);
        return JSON.stringify({ list: [], page: pg, pagecount: 0 });
    }
}

async function search(key, quick, pg) {
    pg = Number(pg) || 1;
    try {
        let url = `https://api.bilibili.com/x/web-interface/search/type?search_type=video&keyword=${encodeURIComponent(key)}&page=${pg}`;
        const resp = await request(url);
        const json = safeJson(resp);
        const resultList = json?.data?.result || [];
        const list = [];
        for (const item of resultList) {
            if (!item.aid || item.type !== "video") continue;
            list.push({
                vod_id: String(item.aid),
                vod_name: removeTags(item.title || ""),
                vod_pic: fixCover(item.pic || ""),
                vod_remarks: item.duration || "",
                style: { type: 'rect', ratio: 1.33 }
            });
        }
        const pagecount = json?.data?.numPages ? json.data.numPages : (list.length > 0 ? pg + 1 : 1);
        return JSON.stringify({
            list,
            page: pg,
            pagecount: pagecount,
            land: 1,
            ratio: 1.33
        });
    } catch (e) {
        console.error("search error", e.message);
        return JSON.stringify({ list: [], page: pg, pagecount: 0, land:1, ratio:1.33 });
    }
}

async function detail(aidStr) {
    try {
        const aid = Number(aidStr);
        const url = `https://api.bilibili.com/x/web-interface/view?aid=${aid}`;
        const resp = await request(url);
        const json = safeJson(resp);
        const data = json?.data;
        if (!data) return JSON.stringify({ list: [] });
        const picUrl = fixCover(data.pic || "");
        const video = {
            vod_id: String(aid),
            vod_name: removeTags(data.title || ""),
            vod_pic: picUrl,
            vod_year: "",
            vod_area: "",
            vod_remarks: formatDuration(data.duration),
            vod_actor: "",
            vod_director: "",
            vod_content: removeTags(data.desc || "")
        };
        const pages = data.pages || [];
        const playList = [];
        for (let j = 0; j < pages.length; j++) {
            const p = pages[j];
            const cid = p.cid;
            const partTitle = removeTags(p.part || `P${j + 1}`);
            playList.push(`${partTitle}$${aid}+${cid}`);
        }
        video.vod_play_from = "mp4";
        video.vod_play_url = playList.join('#');
        return JSON.stringify({ list: [video] });
    } catch (e) {
        console.error("detail error", e.message);
        return JSON.stringify({ list: [] });
    }
}

async function play(flag, id, flags) {
    try {
        const playHeaders = {
            Referer: 'https://www.bilibili.com',
            'User-Agent': UA
        };
        if (!_.isEmpty(cookie)) playHeaders.Cookie = cookie.trim();
        const ids = String(id || '').split('+');
        const aid = ids[0];
        const cid = ids[1];
        // 仅MP4线路，不使用dash代理
        const qualityList = login ? [127, 120, 80, 64,32,16] : [80,64,32,16];
        let urls = [];
        for(const qn of qualityList){
            const purl = `https://api.bilibili.com/x/player/playurl?avid=${aid}&cid=${cid}&qn=${qn}&fnval=1&fourk=1`;
            const respJson = safeJson(await request(purl));
            const data = respJson?.data;
            if(!data || !data.durl || !data.durl[0]) continue;
            if(data.quality !== qn) continue;
            urls.push(`${qn}P`, data.durl[0].url);
        }
        return JSON.stringify({ parse:0, url:urls, header:playHeaders });
    } catch (e) {
        console.error("play error", e.message);
    }
    return JSON.stringify({ parse:0, url:'', header:{} });
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
