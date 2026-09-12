import { Crypto, _ } from 'assets://js/lib/cat.js';
let siteKey = '';
let siteType = 0;
const HOST = "https://www.ikanbot.com";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36";
const DEFAULT_HEADERS = {
    "User-Agent": UA,
    "Accept": "*/*"
};

// ====================== 工具函数(同123ttv.js) ======================
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
    return HOST + url;
}

function extract(html, regStr) {
    const m = html.match(new RegExp(regStr, 's'));
    return m ? (m[1] || '').trim() : "";
}

// python _gen_token移植JS
function genToken(current_id, e_token) {
    const last4 = current_id.slice(-4);
    let tk = e_token;
    const parts = [];
    for (const ch of last4) {
        const mod = parseInt(ch, 10) % 3 + 1;
        const part = tk.slice(mod, mod + 8);
        parts.push(part);
        tk = tk.slice(mod + 8);
    }
    return parts.join('');
}

// ====================== 分类映射 复刻py CLASS_MAP ======================
const CLASS_MAP = {
    "movie_hot":     {"name": "电影·热门",     "url_type": "hot", "cat": "movie", "tag": "热门"},
    "movie_new":     {"name": "电影·最新",     "url_type": "hot", "cat": "movie", "tag": "最新"},
    "movie_classic": {"name": "电影·经典",     "url_type": "hot", "cat": "movie", "tag": "经典"},
    "movie_douban":  {"name": "电影·豆瓣高分", "url_type": "hot", "cat": "movie", "tag": "豆瓣高分"},
    "movie_hidden":  {"name": "电影·冷门佳片", "url_type": "hot", "cat": "movie", "tag": "冷门佳片"},
    "movie_cn":      {"name": "电影·华语",     "url_type": "hot", "cat": "movie", "tag": "华语"},
    "movie_us":      {"name": "电影·欧美",     "url_type": "hot", "cat": "movie", "tag": "欧美"},
    "movie_kr":      {"name": "电影·韩国",     "url_type": "hot", "cat": "movie", "tag": "韩国"},
    "movie_jp":      {"name": "电影·日本",     "url_type": "hot", "cat": "movie", "tag": "日本"},
    "movie_action":  {"name": "电影·动作",     "url_type": "hot", "cat": "movie", "tag": "动作"},
    "movie_comedy":  {"name": "电影·喜剧",     "url_type": "hot", "cat": "movie", "tag": "喜剧"},
    "movie_love":    {"name": "电影·爱情",     "url_type": "hot", "cat": "movie", "tag": "爱情"},
    "movie_scifi":   {"name": "电影·科幻",     "url_type": "hot", "cat": "movie", "tag": "科幻"},
    "movie_susp":    {"name": "电影·悬疑",     "url_type": "hot", "cat": "movie", "tag": "悬疑"},
    "movie_horror":  {"name": "电影·恐怖",     "url_type": "hot", "cat": "movie", "tag": "恐怖"},
    "movie_grow":    {"name": "电影·成长",     "url_type": "hot", "cat": "movie", "tag": "成长"},
    "movie_top250":  {"name": "豆瓣top250",    "url_type": "hot", "cat": "movie", "tag": "豆瓣top250"},
    "tv_hot":        {"name": "剧集·热门",     "url_type": "hot", "cat": "tv", "tag": "热门"},
    "tv_new":        {"name": "剧集·最新",     "url_type": "hot", "cat": "tv", "tag": "最新"},
    "tv_us":         {"name": "美剧",           "url_type": "hot", "cat": "tv", "tag": "美剧"},
    "tv_uk":         {"name": "英剧",           "url_type": "hot", "cat": "tv", "tag": "英剧"},
    "tv_kr":         {"name": "韩剧",           "url_type": "hot", "cat": "tv", "tag": "韩剧"},
    "tv_jp":         {"name": "日剧",           "url_type": "hot", "cat": "tv", "tag": "日剧"},
    "tv_cn":         {"name": "国产剧",         "url_type": "hot", "cat": "tv", "tag": "国产剧"},
    "tv_hk":         {"name": "港剧",           "url_type": "hot", "cat": "tv", "tag": "港剧"},
    "tv_classic":    {"name": "剧集·经典",     "url_type": "hot", "cat": "tv", "tag": "经典"},
    "tv_douban":     {"name": "剧集·豆瓣高分", "url_type": "hot", "cat": "tv", "tag": "豆瓣高分"},
    "anime":         {"name": "动漫",           "url_type": "category", "cat_id": 18},
    "variety":       {"name": "综艺",           "url_type": "category", "cat_id": 19},
    "documentary":   {"name": "纪录片",         "url_type": "category", "cat_id": 20},
};

let extendObj = { classes: [], filter: {} };

// ====================== 标准CAT接口函数 ======================
async function init(cfg) {
    try {
        siteKey = cfg.skey;
        siteType = cfg.stype;
        const classes = [];
        for (const tid in CLASS_MAP) {
            classes.push({ type_id: tid, type_name: CLASS_MAP[tid].name });
        }
        extendObj = { classes, filter: {} };
    } catch (e) {
        console.error("init error", e.message);
        extendObj = { classes: [], filter: {} };
    }
}

function home(filter) {
    try {
        return JSON.stringify({ class: extendObj.classes, filters: extendObj.filter || {} });
    } catch (e) {
        return JSON.stringify({ class: [], filters: {} });
    }
}

/**
 * 首页推荐 homeVod，电影热门+剧集热门，复刻 homeVideoContent
 */
async function homeVod() {
    try {
        let all = [];
        const movieItems = await fetchHotList("movie", "热门", 1, 24);
        all = all.concat(movieItems);
        const tvItems = await fetchHotList("tv", "热门", 1, 24);
        all = all.concat(tvItems);
        return JSON.stringify({ list: all });
    } catch (e) {
        console.error("homeVod error", e.message);
        return JSON.stringify({ list: [] });
    }
}

/**
 * 获取hot页面列表 /hot/index-{cat}-{tag}[-p-{page}]
 */
async function fetchHotList(cat, tag, page, limit) {
    let url;
    if (page > 1) {
        url = `${HOST}/hot/index-${cat}-${tag}-p-${page}.html`;
    } else {
        url = `${HOST}/hot/index-${cat}-${tag}.html`;
    }
    const html = await request(url);
    const list = parseItemList(html, limit);
    return list;
}

/**
 * 获取category页面列表 /category/{cat_id}?p={page}
 */
async function fetchCategoryList(cat_id, page, limit) {
    const url = `${HOST}/category/${cat_id}?p=${page}`;
    const html = await request(url);
    const list = parseItemList(html, limit);
    return list;
}

/**
 * 解析页面item卡片，复用py正则逻辑
 */
function parseItemList(html, limit) {
    const list = [];
    const reg = /<a\s+class="item"\s+href="\/play\/(\d+)">[\s\S]*?<img[^>]+id="\d+"[^>]+alt="([^"]+)"(?:[^>]+data-src="([^"]+)")?/gs;
    let m;
    while ((m = reg.exec(html)) !== null) {
        const vid = m[1];
        const title = (m[2] || "").trim();
        let cover = m[3] || "";
        if (!cover || cover.startsWith("data:")) continue;
        list.push({
            vod_id: vid,
            vod_name: title,
            vod_pic: fixPicUrl(cover),
            vod_remarks: "",
            style: { type: 'rect', ratio: 1.33 }
        });
        if (list.length >= limit) break;
    }
    return list;
}

async function category(tid, pg, filter, ext) {
    pg = Number(pg) || 1;
    try {
        const info = CLASS_MAP[tid];
        if (!info) {
            return JSON.stringify({ list: [], page: pg, pagecount: 1, limit: 24, total: 0 });
        }
        let items = [];
        if (info.url_type === "hot") {
            items = await fetchHotList(info.cat, info.tag, pg, 24);
        } else {
            items = await fetchCategoryList(info.cat_id, pg, 48);
        }
        return JSON.stringify({
            list: items,
            page: pg,
            pagecount: pg + 10,
            limit: 24,
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
        const kw = encodeURIComponent(key);
        const url = `${HOST}/search?q=${kw}`;
        const html = await request(url);
        const list = [];
        const seen = new Set();
        const reg = /<a[^>]+href="\/play\/(\d+)"[^>]*>[\s\S]*?<img[^>]+id="\d+"[^>]+alt="([^"]+)"(?:[^>]+data-src="([^"]+)")?/gs;
        let m;
        while ((m = reg.exec(html)) !== null) {
            const vid = m[1];
            if (seen.has(vid)) continue;
            seen.add(vid);
            const title = (m[2] || "").trim();
            let cover = m[3] || "";
            list.push({
                vod_id: vid,
                vod_name: title,
                vod_pic: fixPicUrl(cover),
                vod_remarks: "",
                style: { type: 'rect', ratio: 1.33 }
            });
        }
        return JSON.stringify({
            list,
            page: pg,
            pagecount: 10,
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
        const playUrl = `${HOST}/play/${vodId}`;
        const html = await request(playUrl);
        const vod = {
            vod_id: vodId,
            vod_name: "",
            vod_pic: "",
            vod_year: "",
            vod_area: "",
            vod_remarks: "",
            vod_actor: "",
            vod_director: "",
            vod_content: "",
            vod_play_from: "",
            vod_play_url: ""
        };
        vod.vod_name = extract(html, /<h1[^>]*>([^<]+)<\/h1>/);
        vod.vod_pic = fixPicUrl(extract(html, /data-src="([^"]+\.(?:jpg|png|webp))"/));

        const e_token = extract(html, /id="e_token"\s+value="([^"]+)"/);
        const cid = extract(html, /id="current_id"\s+value="([^"]+)"/);
        const mtype = extract(html, /id="mtype"\s+value="([^"]+)"/) || "1";
        if (!cid || !e_token) {
            return JSON.stringify({ list: [vod] });
        }
        const token = genToken(cid, e_token);
        const apiUrl = `${HOST}/api/getResN?videoId=${cid}&mtype=${mtype}&token=${token}`;
        const apiText = await request(apiUrl);
        const apiJson = safeJson(apiText);
        if (!apiJson || apiJson.state !== 1) {
            return JSON.stringify({ list: [vod] });
        }
        const sourceList = apiJson?.data?.list || [];
        const pfList = [];
        const puList = [];
        for (const src of sourceList) {
            const siteId = src.siteId || "";
            let resData = src.resData || "[]";
            const eps = safeJson(resData) || [];
            if (!Array.isArray(eps) || eps.length === 0) continue;
            const epArr = [];
            for (const ep of eps) {
                let epName = ep.flag || `线路${siteId}`;
                let epUrl = ep.url || "";
                if (epUrl.includes("$")) {
                    const sp = epUrl.split("$");
                    epName = sp[0];
                    epUrl = sp[1];
                }
                epArr.push(`${epName}$${epUrl}`);
            }
            pfList.push(`线路${siteId}`);
            puList.push(epArr.join("#"));
        }
        vod.vod_play_from = pfList.join("$$$");
        vod.vod_play_url = puList.join("$$$");
        return JSON.stringify({ list: [vod] });
    } catch (e) {
        console.error("detail error", e.message);
        return JSON.stringify({ list: [] });
    }
}

async function play(flag, id, flags) {
    try {
        let realUrl = id || flag;
        if (!realUrl) {
            return JSON.stringify({ parse: 1, url: "", header: { "User-Agent": UA } });
        }
        if (realUrl.includes("$")) {
            const sp = realUrl.split("$");
            realUrl = sp[1];
        }
        return JSON.stringify({
            parse: 0,
            url: realUrl,
            header: { "User-Agent": UA, "Referer": HOST }
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
