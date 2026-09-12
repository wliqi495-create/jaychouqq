import { Crypto, _ } from 'assets://js/lib/cat.js';
let siteKey = '';
let siteType = 0;

const HOST = "https://103.51.147.112:51120";
const CDN_HOST = "https://vres.zyxpedu.com";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const DEFAULT_HEADERS = {
    "User-Agent": UA,
    "Referer": `${HOST}/`
};

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
    if (url.startsWith('/')) return CDN_HOST + url;
    return `${HOST}/${url}`;
}

function reSearch(text, regStr, idx = 1, def = "") {
    const reg = new RegExp(regStr, "s");
    const m = reg.exec(text);
    return m ? (m[idx] || def).trim() : def;
}

function reMatchAll(text, regStr) {
    const arr = [];
    const reg = new RegExp(regStr, "gs");
    let m;
    while ((m = reg.exec(text)) !== null) {
        arr.push(m);
    }
    return arr;
}

function htmlClean(text) {
    if (!text) return "";
    return text.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

// 分类映射
const CATE_MANUAL = {
    '1': "电影",
    '2': "连续剧",
    '3': "动漫",
    '4': "综艺纪录",
    '6': "短剧"
};
const DEFAULT_CLASSES = [];
for (const [k, v] of Object.entries(CATE_MANUAL)) {
    DEFAULT_CLASSES.push({ type_id: k, type_name: v, land: 1, ratio: 1.33 });
}

let extendObj = { classes: [...DEFAULT_CLASSES], filter: {} };

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
        const resp = await request(`${HOST}/channel/1.html`);
        const html = resp;
        const list = [];
        const seen = new Set();
        // .module-item 卡片解析
        const regItem = /<div class="module-item">[\s\S]*?<a class="v-item" href="\/detail\/(\d+)\.html"[\s\S]*?<img[^>]+data‑original="([^"]+)"[\s\S]*?<div class="v‑item‑title">([\s\S]*?)<\/div>[\s\S]*?<div class="v‑item‑bottom">[\s\S]*?<span>([^<]*)<\/span>/gs;
        let match;
        while ((match = regItem.exec(html)) !== null) {
            const vid = match[1];
            if (seen.has(vid)) continue;
            seen.add(vid);
            const picRaw = match[2];
            let title = htmlClean(match[3]);
            const remarks = htmlClean(match[4]);
            if (!title || title === "可可影视‑kekys.com") continue;
            list.push({
                vod_id: vid,
                vod_name: title,
                vod_pic: fixPicUrl(picRaw),
                vod_remarks: remarks,
                style: { type: 'rect', ratio: 1.33 }
            });
            if (list.length >= 24) break;
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
        const url = `${HOST}/channel/${tid}.html?page=${pg}`;
        const resp = await request(url);
        const html = resp;
        const list = [];
        const seen = new Set();
        const regItem = /<div class="module‑item">[\s\S]*?<a class="v‑item" href="\/detail\/(\d+)\.html"[\s\S]*?<img[^>]+data‑original="([^"]+)"[\s\S]*?<div class="v‑item‑title">([\s\S]*?)<\/div>[\s\S]*?<div class="v‑item‑bottom">[\s\S]*?<span>([^<]*)<\/span>/gs;
        let match;
        while ((match = regItem.exec(html)) !== null) {
            const vid = match[1];
            if (seen.has(vid)) continue;
            seen.add(vid);
            const picRaw = match[2];
            let title = htmlClean(match[3]);
            const remarks = htmlClean(match[4]);
            if (!title || title === "可可影视‑kekys.com") continue;
            list.push({
                vod_id: vid,
                vod_name: title,
                vod_pic: fixPicUrl(picRaw),
                vod_remarks: remarks,
                style: { type: 'rect', ratio: 1.33 }
            });
        }
        const hasMore = list.length > 0;
        return JSON.stringify({
            list,
            page: pg,
            pagecount: hasMore ? pg + 1 : pg,
            limit: list.length,
            total: 9999
        });
    } catch (e) {
        console.error("category error", e.message);
        return JSON.stringify({ list: [], page: pg, pagecount: 0 });
    }
}

async function detail(vodId) {
    try {
        const url = `${HOST}/detail/${vodId}.html`;
        const resp = await request(url);
        const html = resp;
        const vod = {
            vod_id: vodId,
            vod_name: "",
            vod_pic: "",
            vod_year: "",
            vod_area: "",
            vod_remarks: "",
            vod_actor: "",
            vod_director: "㿟㟧",
            vod_content: "",
            vod_play_from: "",
            vod_play_url: ""
        };
        // 标题
        let title = reSearch(html, /<title>(.+?)<\/title>/);
        if (title) {
            title = title.split('-')[0].trim();
            title = title.replace(/[𝕜𝕜𝕪𝕤𝟘𝟙𝕔𝕠𝕞.\s]+/g, " ").replace(/\s+/g, " ").trim();
            vod.vod_name = title;
        }
        //封面
        const picRaw = reSearch(html, /<meta\s+property="og:image"\s+content="([^"]+)"/);
        vod.vod_pic = fixPicUrl(picRaw);
        //简介
        vod.vod_content = reSearch(html, /<meta\s+name="description"\s+content="([^"]+)"/);

        //解析集数 <a class="episode-item" href="/play/xxx">xxx</a>
        const epMatches = reMatchAll(html, /<a[^>]+class="episode‑item"[^>]+href="(\/play\/\d+-(\d+)-(\d+)\.html)"[^>]*>([\s\S]*?)<\/a>/);
        const episodesBySid = {};
        const sidsOrder = [];
        const sidSeen = new Set();
        for (const m of epMatches) {
            const href = m[1];
            const sid = m[2];
            const epText = htmlClean(m[4]);
            if (!epText) continue;
            if (!episodesBySid[sid]) {
                episodesBySid[sid] = [];
            }
            episodesBySid[sid].push(`${epText}$${href}`);
            if (!sidSeen.has(sid)) {
                sidSeen.add(sid);
                sidsOrder.push(sid);
            }
        }
        //线路名称
        const labelMatches = reMatchAll(html, /class="source‑item‑label"[^>]*>([^<]+)</);
        const sourceLabels = [];
        for (const lm of labelMatches) {
            const ln = htmlClean(lm[1]);
            if (ln) sourceLabels.push(ln);
        }
        const playFrom = [];
        const playUrl = [];
        for (let i = 0; i < sidsOrder.length; i++) {
            const sid = sidsOrder[i];
            const epsArr = episodesBySid[sid];
            if (!epsArr || epsArr.length === 0) continue;
            let lineName = (i < sourceLabels.length) ? sourceLabels[i] : `线路${sid}`;
            if (lineName === "4K") continue;
            playFrom.push(lineName);
            playUrl.push(epsArr.join("#"));
        }
        vod.vod_play_from = playFrom.join("$$$");
        vod.vod_play_url = playUrl.join("$$$");
        return JSON.stringify({ list: [vod] });
    } catch (e) {
        console.error("detail error", e.message);
        return JSON.stringify({ list: [] });
    }
}

async function search(key, quick, pg) {
    pg = Number(pg) || 1;
    try {
        //第一步获取搜索token t
        const kw = encodeURIComponent(key);
        let searchUrl = `${HOST}/search?k=${kw}`;
        let resp = await request(searchUrl);
        const html = resp;
        const tVal = reSearch(html, /name="t" value="([^"]+)"/);
        //带t参数搜索
        let url = `${HOST}/search?k=${kw}`;
        if (tVal) url += `&t=${encodeURIComponent(tVal)}`;
        if (pg > 1) url += `&page=${pg}`;
        resp = await request(url);
        const html2 = resp;
        const list = [];
        const regItem = /<a class="search‑result‑item" href="\/detail\/(\d+)\.html"[\s\S]*?<div class="title">([\s\S]*?)<\/div>[\s\S]*?<img[^>]+data‑original="([^"]+)"/gs;
        let match;
        const seen = new Set();
        while ((match = regItem.exec(html2)) !== null) {
            const vid = match[1];
            if (seen.has(vid)) continue;
            seen.add(vid);
            const title = htmlClean(match[2]);
            const picRaw = match[3];
            if (!title) continue;
            list.push({
                vod_id: vid,
                vod_name: title,
                vod_pic: fixPicUrl(picRaw),
                vod_remarks: "",
                style: { type: 'rect', ratio: 1.33 }
            });
        }
        const hasMore = list.length > 0;
        return JSON.stringify({
            list,
            page: pg,
            pagecount: hasMore ? pg + 1 : pg,
            limit: list.length,
            total: 9999,
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
        let playPath = id || "";
        if (!playPath.startsWith("http")) playPath = `${HOST}${playPath}`;
        const resp = await request(playPath);
        const html = resp;
        let realUrl = "";
        //多正则匹配m3u8/mp4
        const pats = [
            /src:\s*["']([^"']+\.(m3u8|mp4)[^"']*)["']/,
            /"url"\s*:\s*"([^"]+\.(m3u8|mp4)[^"]*)"/,
            /url\s*:\s*'([^']+\.(m3u8|mp4)[^']*)'/
        ];
        for (const pat of pats) {
            const m = reSearch(html, pat);
            if (m) {
                realUrl = m;
                break;
            }
        }
        if (!realUrl) {
            //兜底全局链接
            const allMatches = reMatchAll(html, /https?:\/\/[^\s"'<>]+\.(m3u8|mp4)[^\s"'<>]*/);
            if (allMatches.length > 0) {
                realUrl = allMatches[0][0];
            }
        }
        if (realUrl) {
            return JSON.stringify({
                parse: 0,
                url: realUrl,
                header: {
                    "User‑Agent": UA,
                    "Referer": `${HOST}/`
                }
            });
        }
        return JSON.stringify({
            parse: 1,
            url: playPath,
            header: {
                "User‑Agent": UA,
                "Referer": `${HOST}/`
            }
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
