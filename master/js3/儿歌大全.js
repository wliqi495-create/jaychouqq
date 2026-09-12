import { Crypto, _ } from 'assets://js/lib/cat.js';
let siteKey = '';
let siteType = 0;

const HOST = "https://beddysongs.com/zh";
const API = "https://vyourtime.com/api";
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1";
const DEFAULT_HEADERS = {
    "User-Agent": UA,
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "zh-CN,zh;q=0.9",
    "Referer": HOST
};

const PAGE_SIZE = 8;
const SEARCH_PER_PAGE = 20;

// 名称映射（复刻py）
const TYPE_NAMES = {
    'lullaby': '摇篮曲', 'action': '动作歌', 'numbers': '数字歌',
    'roleplay': '角色扮演', 'nature': '自然主题',
    'family': '家庭亲情', 'education': '教育启蒙',
};
const COUNTRY_NAMES = {
    'CN': '中国', 'DE': '德国', 'ES': '西班牙', 'FR': '法国',
    'JP': '日本', 'KR': '韩国', 'RU': '俄罗斯', 'US': '美国',
};
const AGE_NAMES = {
    '0-1': '0‑12个月', '1‑2': '1‑2岁', '2‑3': '2‑3岁', '3‑4': '3‑4岁',
    '4‑5': '4‑5岁', '5‑6': '5‑6岁', '6‑8': '6‑8岁',
};

const CATEGORIES = [
    { type_id: "country", type_name: "国家", land: 1, ratio: 1.33 },
    { type_id: "all", type_name: "全部儿歌", land: 1, ratio: 1.33 }
];

const FILTERS = {
    "type": [{
        key: "subtype",
        name: "类型",
        value: [
            { n: "摇篮曲", v: "lullaby" },
            { n: "动作歌", v: "action" },
            { n: "数字歌", v: "numbers" },
            { n: "角色扮演", v: "roleplay" },
            { n: "自然主题", v: "nature" },
            { n: "家庭亲情", v: "family" },
            { n: "教育启蒙", v: "education" }
        ]
    }],
    "country": [{
        key: "subtype",
        name: "国家",
        value: [
            { n: "中国", v: "CN" }, { n: "德国", v: "DE" },
            { n: "西班牙", v: "ES" }, { n: "法国", v: "FR" },
            { n: "日本", v: "JP" }, { n: "韩国", v: "KR" },
            { n: "俄罗斯", v: "RU" }, { n: "美国", v: "US" }
        ]
    }],
    "age": [{
        key: "subtype",
        name: "年龄",
        value: [
            { n: "0‑12个月", v: "0‑1" }, { n: "1‑2岁", v: "1‑2" },
            { n: "2‑3岁", v: "2‑3" }, { n: "3‑4岁", v: "3‑4" },
            { n: "4‑5岁", v: "4‑5" }, { n: "5‑6岁", v: "5‑6" },
            { n: "6‑8岁", v: "6‑8" }
        ]
    }]
};
const DEFAULT_SUBTYPE = { "type": "lullaby", "country": "CN", "age": "0‑1" };

// 搜索内存缓存
const _searchCache = {};

// ========== 完全复制123ttv.js工具函数 ==========
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
        return null;
    }
}

function fixPicUrl(url) {
    if (!url) return '';
    url = url.trim();
    if (url.startsWith('http')) return url;
    if (url.startsWith('//')) return `https:${url}`;
    return `${HOST}/${url}`;
}

// ========== 业务辅助函数 ==========
/** 解析song对象为vod对象 */
function parseSong(song) {
    const title = song.title || song.titleLocale || "未知";
    const remarksParts = [];
    const st = song.songType || "";
    if (st) remarksParts.push(TYPE_NAMES[st] || song.songTypeName || st);
    const cc = song.countryCode || "";
    if (cc) remarksParts.push(COUNTRY_NAMES[cc] || song.countryCodeName || cc);
    const dur = song.durationName || "";
    if (dur) remarksParts.push(dur);
    return {
        vod_id: song.urlSlug || "",
        vod_name: title,
        vod_pic: fixPicUrl(song.coverImage || ""),
        vod_remarks: remarksParts.join(" | "),
        style: { type: 'rect', ratio: 1.33 }
    };
}

/** 构建列表接口url */
function buildListUrl(searchKey, searchValue, page) {
    let base = `${API}/song/query/list`;
    if (searchKey) {
        return `${base}?searchKey=${encodeURIComponent(searchKey)}&searchValue=${encodeURIComponent(searchValue)}&page=${page}&pageSize=${PAGE_SIZE}`;
    } else {
        return `${base}?searchKey=&searchValue=&page=${page}&pageSize=${PAGE_SIZE}`;
    }
}

/** 获取全部歌曲数据（顺序拉取，无线程池） */
async function fetchAllSongs() {
    const allSongs = [];
    const seen = new Set();
    let page = 1;
    const maxPage = 60;
    while (page <= maxPage) {
        const url = buildListUrl("", "", page);
        const respText = await request(url);
        const data = safeJson(respText);
        const songs = Array.isArray(data?.data) ? data.data : [];
        if (songs.length === 0) break;
        for (const s of songs) {
            const slug = s.urlSlug;
            if (slug && !seen.has(slug)) {
                seen.add(slug);
                allSongs.push(s);
            }
        }
        page++;
    }
    return allSongs;
}

let extendObj = { classes: [...CATEGORIES], filter: FILTERS };

async function init(cfg) {
    try {
        siteKey = cfg.skey;
        siteType = cfg.stype;
        extendObj = { classes: [...CATEGORIES], filter: FILTERS };
        // 清空缓存
        Object.keys(_searchCache).forEach(k => delete _searchCache[k]);
    } catch (e) {
        console.error("init error", e.message);
        extendObj = { classes: [...CATEGORIES], filter: FILTERS };
    }
}

function home(filter) {
    try {
        return JSON.stringify({
            class: extendObj.classes || CATEGORIES,
            filters: extendObj.filter || {}
        });
    } catch (e) {
        return JSON.stringify({ class: CATEGORIES, filters: {} });
    }
}

async function homeVod() {
    try {
        const url = `${API}/song/query/index`;
        const respText = await request(url);
        const data = safeJson(respText);
        const songs = Array.isArray(data?.data) ? data.data : [];
        const list = [];
        for (const s of songs.slice(0, 20)) {
            list.push(parseSong(s));
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
        let searchKey = "";
        let searchValue = "";
        const extObj = typeof ext === "string" ? safeJson(ext) : ext;
        const subtype = extObj?.subtype ?? "";
        if (tid !== "all") {
            searchKey = tid;
            searchValue = subtype || DEFAULT_SUBTYPE[tid] || "";
        }
        const url = buildListUrl(searchKey, searchValue, pg);
        const respText = await request(url);
        const data = safeJson(respText);
        const songs = Array.isArray(data?.data) ? data.data : [];
        const list = [];
        for (const s of songs) {
            list.push(parseSong(s));
        }
        return JSON.stringify({
            list,
            page: pg,
            pagecount: 9999,
            limit: PAGE_SIZE,
            total: 999999
        });
    } catch (e) {
        console.error("category error", e.message);
        return JSON.stringify({ list: [], page: pg, pagecount: 0, limit: PAGE_SIZE, total: 0 });
    }
}

async function detail(vodId) {
    try {
        const rid = String(vodId || "").trim();
        if (!rid) return JSON.stringify({ list: [] });
        const url = `${API}/song/query/${rid}`;
        const respText = await request(url);
        const data = safeJson(respText);
        const song = data?.data || {};
        if (!song) {
            return JSON.stringify({
                list: [{
                    vod_id: rid,
                    vod_name: "未找到",
                    vod_content: "未找到该歌曲",
                    vod_remarks: "未找到",
                    vod_play_from: "酷鱼专线",
                    vod_play_url: ""
                }]
            });
        }
        const title = song.title || song.titleLocale || "未知";
        const contentParts = [];
        if (song.description) contentParts.push(`简介: ${song.description}`);
        const st = song.songType || "";
        if (st) contentParts.push(`类型: ${TYPE_NAMES[st] || st}`);
        const cc = song.countryCode || "";
        if (cc) contentParts.push(`国家: ${COUNTRY_NAMES[cc] || cc}`);
        const ar = song.ageRange || "";
        if (ar) contentParts.push(`适合年龄: ${AGE_NAMES[ar] || ar}`);
        if (song.durationName) contentParts.push(`时长: ${song.durationName}`);
        if (song.playCount) contentParts.push(`播放: ${song.playCount}次`);
        if (song.favoriteCount) contentParts.push(`收藏: ${song.favoriteCount}次`);
        if (song.rating) contentParts.push(`评分: ${song.rating}`);
        if (song.lyrics) contentParts.push(`\n歌词:\n${song.lyrics}`);
        if (song.lyricsI18n) contentParts.push(`\n歌词翻译:\n${song.lyricsI18n}`);

        const remarksParts = [];
        if (st) remarksParts.push(TYPE_NAMES[st] || st);
        if (cc) remarksParts.push(COUNTRY_NAMES[cc] || cc);
        if (song.durationName) remarksParts.push(song.durationName);

        const vod = {
            vod_id: rid,
            vod_name: title,
            vod_pic: fixPicUrl(song.coverImage || ""),
            vod_year: "",
            vod_area: COUNTRY_NAMES[cc] || cc || "",
            vod_actor: AGE_NAMES[ar] || ar || "",
            vod_director: "",
            vod_content: contentParts.join("\n"),
            vod_remarks: remarksParts.join(" | "),
            vod_play_from: "酷鱼专线",
            vod_play_url: `${title}$${b64EncodeUtf8(rid)}`
        };
        return JSON.stringify({ list: [vod] });
    } catch (e) {
        console.error("detail error", e.message);
        return JSON.stringify({ list: [] });
    }
}

async function search(key, quick, pg) {
    pg = Number(pg) || 1;
    try {
        const kw = String(key || "").trim().toLowerCase();
        if (!kw) return JSON.stringify({ list: [], page: pg, pagecount: 0, land: 1, ratio: 1.33 });
        // 缓存逻辑
        if (!_searchCache[kw]) {
            const allSongs = await fetchAllSongs();
            const matched = [];
            for (const s of allSongs) {
                const title = (s.title || "").toLowerCase();
                const titleLocale = (s.titleLocale || "").toLowerCase();
                const desc = (s.description || "").toLowerCase();
                const lyrics = (s.lyrics || "").toLowerCase();
                if (title.includes(kw) || titleLocale.includes(kw) || desc.includes(kw) || lyrics.includes(kw)) {
                    matched.push(s);
                }
            }
            _searchCache[kw] = matched;
        }
        const matched = _searchCache[kw];
        const perPage = SEARCH_PER_PAGE;
        const start = (pg - 1) * perPage;
        const end = start + perPage;
        const pageSongs = matched.slice(start, end);
        const total = matched.length;
        const pagecount = total > 0 ? Math.max(1, Math.floor((total + perPage - 1) / perPage)) : 1;
        const list = [];
        for (const s of pageSongs) {
            list.push(parseSong(s));
        }
        return JSON.stringify({
            list,
            page: pg,
            pagecount: pagecount,
            limit: perPage,
            total: total,
            land: 1,
            ratio: 1.33
        });
    } catch (e) {
        console.error("search error", e.message);
        return JSON.stringify({ list: [], page: pg, pagecount: 0, land: 1, ratio: 1.33 });
    }
}

async function play(flag, id, flags) {
    try {
        const raw = b64DecodeUtf8(id || "");
        if (!raw) {
            return JSON.stringify({ parse: 1, url: "", header: { "User‑Agent": UA, "Referer": HOST } });
        }
        // 如果直接是http音频链接直接返回
        if (raw.startsWith("http") && (raw.endsWith(".mp3") || raw.endsWith(".m4a"))) {
            return JSON.stringify({
                parse: 0,
                url: raw,
                header: { "User‑Agent": UA, "Referer": HOST }
            });
        }
        // raw为urlSlug，请求详情拿audioUrl
        const url = `${API}/song/query/${raw}`;
        const respText = await request(url);
        const data = safeJson(respText);
        const song = data?.data || {};
        const audioUrl = song.audioUrl || "";
        if (audioUrl) {
            return JSON.stringify({
                parse: 0,
                url: audioUrl,
                header: { "User‑Agent": UA, "Referer": HOST }
            });
        }
        // 获取失败回退网页嗅探
        const fallbackUrl = `${HOST}/song/${raw}`;
        return JSON.stringify({
            parse: 1,
            url: fallbackUrl,
            header: { "User‑Agent": UA, "Referer": HOST }
        });
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
