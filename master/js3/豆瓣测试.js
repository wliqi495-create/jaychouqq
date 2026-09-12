import { Crypto, _ } from 'assets://js/lib/cat.js';
let siteKey = '';
let siteType = 0;
let extendObj = {};

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const DEFAULT_HEADERS = {
    "User-Agent": UA,
    "Referer": "https://movie.douban.com/",
    "Accept": "*/*"
};

async function request(url, optHeaders = {}) {
    try {
        const headers = Object.assign({}, DEFAULT_HEADERS, optHeaders || {});
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

function text(value) {
    return String(value == null ? "" : value).trim();
}

// 默认分类，防止init异步时序导致空白
const DEFAULT_CLASSES = [
    { type_id: "movie", type_name: "选电影", land: 1, ratio: 1.33 },
    { type_id: "tv", type_name: "选剧集", land: 1, ratio: 1.33 },
    { type_id: "show", type_name: "选综艺", land: 1, ratio: 1.33 },
    { type_id: "movie_filter", type_name: "电影筛选", land: 1, ratio: 1.33 },
    { type_id: "tv_filter", type_name: "电视剧筛选", land: 1, ratio: 1.33 },
    { type_id: "show_filter", type_name: "综艺筛选", land: 1, ratio: 1.33 }
];

async function init(cfg) {
    try {
        siteKey = cfg.skey;
        siteType = cfg.stype;
        extendObj = { classes: [...DEFAULT_CLASSES], filter: {} };
    } catch (e) {
        console.error("init error", e.message);
        extendObj = { classes: [...DEFAULT_CLASSES], filter: {} };
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
        const url = "https://m.douban.com/rexxar/api/v2/subject/recent_hot/tv?start=0&limit=20&category=tv&type=tv";
        const resp = await request(url);
        const json = safeJson(resp);
        const list = [];
        if (json && Array.isArray(json.items)) {
            for (const item of json.items) {
                const vodId = text(item.id || "");
                const vodName = text(item.title || "");
                if (!vodId || !vodName) continue;
                let vodPic = text(item.pic?.large || item.pic?.normal || "");
                let vodRemarks = text(item.episodes_info || "");
                if (!vodRemarks && item.is_new) vodRemarks = "新剧";
                list.push({
                    vod_id: vodId,
                    vod_name: vodName,
                    vod_pic: vodPic,
                    vod_remarks: vodRemarks,
                    style: { type: 'rect', ratio: 1.33 }
                });
                if (list.length >= 20) break;
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
    const limit = 20;
    const start = (pg - 1) * limit;
    let url = "";
    try {
        if (tid === "movie") {
            const cat = ext?.category || "热门";
            const tp = ext?.type || "全部";
            url = `https://m.douban.com/rexxar/api/v2/subject/recent_hot/movie?start=${start}&limit=${limit}&category=${encodeURIComponent(cat)}&type=${encodeURIComponent(tp)}`;
        } else if (tid === "tv" || tid === "show") {
            const tp = ext?.type || (tid === "tv" ? "tv_domestic" : "show");
            url = `https://m.douban.com/rexxar/api/v2/subject/recent_hot/tv?start=${start}&limit=${limit}&category=${encodeURIComponent(tid)}&type=${encodeURIComponent(tp)}`;
        } else if (tid === "movie_filter") {
            const genre = ext?.genre || "";
            const region = ext?.region || "";
            const year = ext?.year || "";
            const sort = ext?.sort || "U";
            const selObj = {};
            if (genre) selObj["类型"] = genre;
            if (region) selObj["地区"] = region;
            const selStr = JSON.stringify(selObj);
            const tagArr = [];
            if (genre) tagArr.push(genre);
            if (region) tagArr.push(region);
            if (year) tagArr.push(year);
            const tags = tagArr.join(",");
            url = `https://m.douban.com/rexxar/api/v2/movie/recommend?refresh=0&start=${start}&count=${limit}&selected_categories=${encodeURIComponent(selStr)}&uncollect=false&score_range=0,10&tags=${encodeURIComponent(tags)}&sort=${sort}`;
        } else if (tid === "tv_filter") {
            const genre = ext?.genre || "";
            const region = ext?.region || "";
            const year = ext?.year || "";
            const platform = ext?.platform || "";
            const sort = ext?.sort || "U";
            const selObj = { "形式": "电视剧" };
            if (genre) selObj["类型"] = genre;
            if (region) selObj["地区"] = region;
            const selStr = JSON.stringify(selObj);
            const tagArr = [];
            if (genre) tagArr.push(genre);
            if (region) tagArr.push(region);
            if (year) tagArr.push(year);
            if (platform) tagArr.push(platform);
            const tags = tagArr.join(",");
            url = `https://m.douban.com/rexxar/api/v2/tv/recommend?refresh=0&start=${start}&count=${limit}&selected_categories=${encodeURIComponent(selStr)}&uncollect=false&score_range=0,10&tags=${encodeURIComponent(tags)}&sort=${sort}`;
        } else if (tid === "show_filter") {
            const genre = ext?.genre || "";
            const region = ext?.region || "";
            const year = ext?.year || "";
            const platform = ext?.platform || "";
            const sort = ext?.sort || "U";
            const selObj = { "形式": "综艺" };
            if (genre) selObj["类型"] = genre;
            if (region) selObj["地区"] = region;
            const selStr = JSON.stringify(selObj);
            const tagArr = [];
            if (genre) tagArr.push(genre);
            if (region) tagArr.push(region);
            if (year) tagArr.push(year);
            if (platform) tagArr.push(platform);
            const tags = tagArr.join(",");
            url = `https://m.douban.com/rexxar/api/v2/tv/recommend?refresh=0&start=${start}&count=${limit}&selected_categories=${encodeURIComponent(selStr)}&uncollect=false&score_range=0,10&tags=${encodeURIComponent(tags)}&sort=${sort}`;
        }
        if (!url) throw new Error("unknown tid");
        const resp = await request(url);
        const json = safeJson(resp);
        const list = [];
        if (json && Array.isArray(json.items)) {
            for (const item of json.items) {
                const vodId = text(item.id || "");
                const vodName = text(item.title || "");
                if (!vodId || !vodName) continue;
                let vodPic = text(item.pic?.large || item.pic?.normal || "");
                let vodRemarks = text(item.episodes_info || "");
                if (!vodRemarks && item.is_new) vodRemarks = "新剧";
                list.push({
                    vod_id: vodId,
                    vod_name: vodName,
                    vod_pic: vodPic,
                    vod_remarks: vodRemarks,
                    style: { type: 'rect', ratio: 1.33 }
                });
            }
        }
        const pagecount = list.length >= limit ? pg + 1 : pg;
        return JSON.stringify({
            list,
            page: pg,
            pagecount: pagecount,
            limit: limit,
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
        const encodedKw = encodeURIComponent(key);
        const url = `https://m.douban.com/rexxar/api/v2/search/subjects?search_text=${encodedKw}&start=${(pg - 1) * 20}&limit=20`;
        const resp = await request(url);
        const json = safeJson(resp);
        const list = [];
        if (json && Array.isArray(json.items)) {
            for (const item of json.items) {
                const vodId = text(item.id || "");
                const vodName = text(item.title || "");
                if (!vodId || !vodName) continue;
                let vodPic = text(item.pic?.large || item.pic?.normal || "");
                list.push({
                    vod_id: vodId,
                    vod_name: vodName,
                    vod_pic: vodPic,
                    vod_remarks: text(item.rating?.value || ""),
                    style: { type: 'rect', ratio: 1.33 }
                });
            }
        }
        const pagecount = list.length >= 20 ? pg + 1 : pg;
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
        // 豆瓣只有元数据，没有播放源，仅返回信息，无播放集数
        const url = `https://m.douban.com/rexxar/api/v2/subject/${vodId}`;
        const resp = await request(url);
        const json = safeJson(resp);
        if (!json) return JSON.stringify({ list: [] });
        const vod = {
            vod_id: String(vodId),
            vod_name: text(json.title || ""),
            vod_pic: text(json.pic?.large || json.pic?.normal || ""),
            vod_year: text(json.year || ""),
            vod_area: "",
            vod_remarks: text(json.rating?.value ? `评分:${json.rating.value}` : ""),
            vod_actor: Array.isArray(json.actors) ? json.actors.map(x=>text(x.name)).filter(Boolean).join(",") : "",
            vod_director: Array.isArray(json.directors) ? json.directors.map(x=>text(x.name)).filter(Boolean).join(",") : "",
            vod_content: text(json.intro || ""),
            vod_play_from: "豆瓣",
            vod_play_url: ""
        };
        return JSON.stringify({ list: [vod] });
    } catch (e) {
        console.error("detail error", e.message);
        return JSON.stringify({ list: [] });
    }
}

async function play(flag, id, flags) {
    try {
        // 豆瓣接口不提供播放地址，直接嗅探豆瓣网页
        return JSON.stringify({
            parse: 1,
            url: `https://movie.douban.com/subject/${id}`,
            header: {
                "User-Agent": UA,
                "Referer": "https://movie.douban.com/"
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