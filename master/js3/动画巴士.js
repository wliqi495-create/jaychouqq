import { Crypto, _ } from 'assets://js/lib/cat.js';
let siteKey = '';
let siteType = 0;

const HOST = "https://dm845.com";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
const DEFAULT_HEADERS = {
    "User-Agent": UA,
    "Referer": `${HOST}/`,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
};

const FILTER_SLOT = {
    "class": 3,
    "area": 1,
    "by": 2,
    "lang": 4,
    "letter": 5,
    "year": 11,
};
const GROUP_KEY = {
    "类型": "class",
    "剧情": "class",
    "地区": "area",
    "年代": "year",
    "年份": "year",
    "排序": "by",
    "语言": "lang",
    "字母": "letter",
};
const SORT_VALUE = {"按时间": "time", "按人气": "hits", "按评分": "score"};

let cacheHome = null;
let cacheTs = 0;
const CACHE_EXPIRE = 1800;

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

/** html清理，等同于py _clean */
function htmlClean(text) {
    if (!text) return "";
    text = text.replace(/<[^>]+>/g, '');
    text = text.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
    text = text.replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    text = text.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    text = text.replace(/\s+/g, ' ');
    return text.trim();
}

/** 获取正则匹配分组，py _s */
function reSearch(text, regStr, idx = 1, def = "") {
    const reg = new RegExp(regStr, "s");
    const m = reg.exec(text);
    return m ? (m[idx] || def).trim() : def;
}

/** 补全相对url为绝对链接 py _abs */
function absUrl(url) {
    if (!url) return "";
    if (url.startsWith("//")) return "https:" + url;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return HOST + "/" + url.replace(/^\//, "");
}

/** 构建筛选show链接 build_show */
function buildShowUrl(tid, page = 1, extend = {}) {
    const segs = Array(12).fill('');
    segs[0] = String(tid);
    if (page && Number(page) > 1) segs[8] = String(page);
    for (const [k, v] of Object.entries(extend)) {
        const slot = FILTER_SLOT[k];
        if (slot === undefined || !v || v === "全部" || v === "0") continue;
        segs[slot] = encodeURIComponent(String(v));
    }
    const path = segs.join("-");
    return `${HOST}/show-${path}.html`;
}

/** build_list */
function buildListUrl(tid, page = 1) {
    if (page && Number(page) > 1) {
        return `${HOST}/list-${tid}-${page}.html`;
    }
    return `${HOST}/list-${tid}.html`;
}

/** build_search */
function buildSearchUrl(key, page = 1) {
    const segs = Array(14).fill('');
    segs[0] = encodeURIComponent(key);
    if (page && Number(page) > 1) segs[10] = String(page);
    const path = segs.join("-");
    return `${HOST}/s-${path}.html`;
}

/** 解析列表页html _parse_list */
function parseVodList(html) {
    const items = [];
    const seen = new Set();
    // 第一套正则
    const reg1 = /<a\s+href="\/v\/(\d+)\.html"\s+class="cover[^"]*"[^>]*?data-bg="([^"]*)"[^>]*>[\s\S]{0,400}?<a\s+class="title"\s+href="\/v\/\1\.html"\s+title="([^"]*)"[^>]*>[\s\S]*?<\/a>(?:\s*<span\s+class="desc">([^<]*)<\/span>)?/g;
    let m;
    while ((m = reg1.exec(html)) !== null) {
        const vid = m[1];
        if (seen.has(vid)) continue;
        seen.add(vid);
        items.push({
            vod_id: vid,
            vod_name: htmlClean(m[3]),
            vod_pic: absUrl(m[2]),
            vod_remarks: htmlClean(m[4] || ""),
            style: { type: 'rect', ratio: 1.33 }
        });
    }
    if (items.length > 0) return items;

    //第二套正则 .item块
    const regItem = /<div class="item">([\s\S]*?)<\/div>/g;
    while ((m = regItem.exec(html)) !== null) {
        const blk = m[1];
        const vid = reSearch(blk, /\/v\/(\d+)\.html/);
        if (!vid || seen.has(vid)) continue;
        const pic = reSearch(blk, /data-bg="([^"]+)"/) || reSearch(blk, /src="([^"]+\.(?:jpg|jpeg|png|webp|gif))"/);
        const name = reSearch(blk, /class="title"[^>]*title="([^"]+)"/) || reSearch(blk, /class="title"[^>]*>([^<]+)</);
        if (!name) continue;
        seen.add(vid);
        items.push({
            vod_id: vid,
            vod_name: htmlClean(name),
            vod_pic: absUrl(pic),
            vod_remarks: htmlClean(reSearch(blk, /class="desc">([^<]*)</)),
            style: { type: 'rect', ratio: 1.33 }
        });
    }
    if (items.length > 0) return items;

    //兜底正则
    const regSimple = /<a class="title" href="\/v\/(\d+)\.html" title="([^"]*)"/g;
    while ((m = regSimple.exec(html)) !== null) {
        const vid = m[1];
        if (seen.has(vid)) continue;
        seen.add(vid);
        items.push({
            vod_id: vid,
            vod_name: htmlClean(m[2]),
            vod_pic: "",
            vod_remarks: "",
            style: { type: 'rect', ratio: 1.33 }
        });
    }
    return items;
}

/** 解析总页数 _parse_pagecount */
function parsePageCount(html, def = 1) {
    const m = reSearch(html, /href="[^"]*?\/list-\d+-(\d+)\.html"[^>]*>\s*尾页/, 1, "");
    if (m) return Number(m);
    const nums = [];
    let mt;
    const regPg1 = /\/list-\d+-(\d+)\.html/g;
    while ((mt = regPg1.exec(html)) !== null) nums.push(Number(mt[1]));
    const regPg2 = /\/s-[^"]*?-(\d+)---\.html/g;
    while ((mt = regPg2.exec(html)) !== null) nums.push(Number(mt[1]));
    return nums.length > 0 ? Math.max(...nums) : def;
}

/** 解析筛选器 parse_filters */
async function parseFilters(tid) {
    const url = buildListUrl(tid);
    const html = await request(url);
    if (!html) return [];
    const blk = reSearch(html, /<ul class="list_filter"[^>]*>([\s\S]*?)<\/ul>/);
    if (!blk) return [];
    const out = [];
    const regDiv = /<div><span>([^<]+)<\/span>([\s\S]*?)<\/div>/g;
    let dm;
    while ((dm = regDiv.exec(blk)) !== null) {
        const gname = htmlClean(dm[1]);
        const body = dm[2];
        let key = GROUP_KEY[gname];
        const values = [];
        const seenVal = new Set();
        const regA = /<a[^>]*?href="(\/show-[^"]+)"[^>]*>([^<]+)<\/a>/g;
        let am;
        while ((am = regA.exec(body)) !== null) {
            const href = am[1];
            const label = htmlClean(am[2]);
            if (!label) continue;
            const rawSeg = decodeURIComponent(href.replace("/show-", "").replace(".html", "")).split('-');
            let val = "";
            let slotHit = null;
            for (let i = 0; i < rawSeg.length; i++) {
                if (i === 0 || !rawSeg[i]) continue;
                val = rawSeg[i];
                slotHit = i;
                break;
            }
            if (key === undefined && slotHit !== null) {
                for (const [k, vSlot] of Object.entries(FILTER_SLOT)) {
                    if (vSlot === slotHit) {
                        key = k;
                        break;
                    }
                }
            }
            if (label === "全部") val = "";
            else if (!val) val = SORT_VALUE[label] || label;
            if (seenVal.has(val)) continue;
            seenVal.add(val);
            values.push({ n: label, v: val });
        }
        if (!key || values.length < 2) continue;
        if (key === "by" && values.length && values[0].v) {
            values.unshift({ n: "默认", v: "" });
        }
        out.push({ key, name: gname, value: values });
    }
    return out;
}

/** 加载首页缓存 _load_home */
async function loadHome(force = false) {
    const now = Math.floor(Date.now() / 1000);
    if (!force && cacheHome && (now - cacheTs) < CACHE_EXPIRE) {
        return cacheHome;
    }
    const html = await request(HOST + "/");
    const classes = [];
    const navHtml = reSearch(html, /<ul class="nav_row">([\s\S]*?)<\/ul>/);
    const regNavA = /<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
    let navM;
    while ((navM = regNavA.exec(navHtml || "")) !== null) {
        const href = navM[1];
        const name = htmlClean(navM[2]);
        const tidMatch = reSearch(href, /\/list-(\d+)\.html/);
        if (!tidMatch || !name || name === "首页") continue;
        classes.push({ type_id: tidMatch, type_name: name });
    }
    if (classes.length === 0) {
        classes.push(
            { type_id: "28", type_name: "国漫" },
            { type_id: "30", type_name: "日漫" },
            { type_id: "31", type_name: "欧美动漫" },
            { type_id: "33", type_name: "电影" }
        );
    }
    const filters = {};
    for (const c of classes) {
        const f = await parseFilters(c.type_id);
        if (f && f.length > 0) filters[c.type_id] = f;
    }
    const list = parseVodList(html);
    cacheHome = { class: classes, filters, list };
    cacheTs = now;
    return cacheHome;
}

async function init(cfg) {
    try {
        siteKey = cfg.skey;
        siteType = cfg.stype;
    } catch (e) {
        console.error("init error", e.message);
    }
}

async function home(filter) {
    try {
        const data = await loadHome();
        return JSON.stringify({
            class: data.class,
            filters: data.filters
        });
    } catch (e) {
        console.error("home error", e.message);
        return JSON.stringify({ class: [], filters: {} });
    }
}

async function homeVod() {
    try {
        const data = await loadHome();
        return JSON.stringify({ list: data.list || [] });
    } catch (e) {
        console.error("homeVod error", e.message);
        return JSON.stringify({ list: [] });
    }
}

async function category(tid, pg, filter, ext) {
    pg = Number(pg) || 1;
    try {
        const pn = Math.max(pg, 1);
        const extend = ext || {};
        const activeExt = {};
        for (const [k, v] of Object.entries(extend)) {
            if (v && String(v) !== "全部" && String(v) !== "0" && String(v) !== "") {
                activeExt[k] = v;
            }
        }
        let url;
        if (Object.keys(activeExt).length > 0) {
            url = buildShowUrl(tid, pn, activeExt);
        } else {
            url = buildListUrl(tid, pn);
        }
        let html = await request(url);
        let items = parseVodList(html);
        if (items.length === 0 && Object.keys(activeExt).length > 0 && pn === 1) {
            html = await request(buildListUrl(tid, pn));
            items = parseVodList(html);
        }
        let pagecount = parsePageCount(html, 0);
        if (!pagecount) {
            pagecount = items.length >= 36 ? (pn + 1) : pn;
        }
        pagecount = Math.max(pagecount, pn);
        return JSON.stringify({
            list: items,
            page: pn,
            pagecount: pagecount,
            limit: items.length || 36,
            total: pagecount * (items.length || 36)
        });
    } catch (e) {
        console.error("category error", e.message);
        return JSON.stringify({ list: [], page: pg, pagecount: 1, limit: 36, total: 0 });
    }
}

async function search(key, quick, pg) {
    pg = Number(pg) || 1;
    try {
        const pn = Math.max(pg, 1);
        let url = buildSearchUrl(key, pn);
        let html = await request(url);
        let items = parseVodList(html);
        if (items.length === 0 && pn === 1) {
            const fallbackUrl = `${HOST}/s--------------.html?wd=${encodeURIComponent(key)}`;
            html = await request(fallbackUrl);
            items = parseVodList(html);
        }
        let pagecount = parsePageCount(html, 0);
        if (!pagecount) {
            pagecount = items.length >= 16 ? (pn + 1) : pn;
        }
        pagecount = Math.max(pagecount, pn);
        return JSON.stringify({
            list: items,
            page: pn,
            pagecount: pagecount,
            limit: items.length || 16,
            total: pagecount * (items.length || 16),
            land:1,
            ratio:1.33
        });
    } catch (e) {
        console.error("search error", e.message);
        return JSON.stringify({ list: [], page: pg, pagecount:1, limit:16, total:0, land:1, ratio:1.33 });
    }
}

async function detail(vodId) {
    try {
        let vid = String(vodId || "").replace(/\D/g, "");
        if (!vid) return JSON.stringify({ list: [] });
        const url = `${HOST}/v/${vid}.html`;
        const html = await request(url);
        if (!html) return JSON.stringify({ list: [] });

        const name = htmlClean(reSearch(html, /<h1 class="v_title">\s*<a[^>]*>([\s\S]*?)<\/a>/) || reSearch(html, /<h1[^>]*>([\s\S]*?)<\/h1>/));
        const pic = absUrl(reSearch(html, /<div class="cover">\s*<img[^>]+src="([^"]+)"/) || reSearch(html, /<meta property="og:image" content="([^"]+)"/));
        const descHtml = reSearch(html, /<p class="v_desc">([\s\S]*?)<\/p>/);
        const remarks = htmlClean(reSearch(descHtml || "", /<span class="desc">([^<]*)<\/span>/));
        const parts = (descHtml || "").split(/<em[^>]*class="hr"[^>]*>\s*\|\s*<\/em>/).map(p=>htmlClean(p)).filter(p=>p);

        let year = "", area = "", tags = "";
        let iy = -1;
        for(let i=0; i<parts.length;i++){
            if (/^(19|20)\d{2}$/.test(parts[i])) {
                iy = i;
                break;
            }
        }
        if (iy >= 0) {
            year = parts[iy];
            if (iy+1 < parts.length) area = parts[iy+1];
            if (iy+2 < parts.length) tags = parts.slice(iy+2).join(',');
        } else {
            tags = parts.filter(p=>p).join(',');
        }

        const introBlk = reSearch(html, /<div id="intro">([\s\S]*?)<div class="show_more"/) || reSearch(html, /<div id="intro">([\s\S]*?)<\/div>/);
        let content = "", alias = "";
        const regP = /<p>([\s\S]*?)<\/p>/g;
        let pm;
        while ((pm = regP.exec(introBlk || "")) !== null) {
            const t = htmlClean(pm[1]);
            if (t.startsWith("又名")) alias = t;
            else if (t.startsWith("剧情") || t.length > content.length) content = t;
        }
        content = content.replace(/^剧情[:：]\s*/, "");
        if (alias) content = (alias + "\n" + content).trim();

        const tabCtrl = reSearch(html, /<ul class="tab_control play_from">([\s\S]*?)<\/ul>/);
        const fromNames = [];
        const regLi = /<li[^>]*>([^<]+)<\/li>/g;
        let lim;
        while ((lim = regLi.exec(tabCtrl || "")) !== null) {
            fromNames.push(htmlClean(lim[1].replace(/\(\d+\)\s*$/, '')));
        }

        const listUlReg = /<ul class="play_list[^"]*">([\s\S]*?)<\/ul>/g;
        const playFromArr = [];
        const playUrlArr = [];
        let ulM;
        let idxLine = 0;
        while ((ulM = listUlReg.exec(html)) !== null) {
            const ulBody = ulM[1];
            const eps = [];
            const regAep = /<a\s+title="([^"]*)"\s+href="(\/p\/[^"]+\.html)"[^>]*>([^<]*)<\/a>/g;
            let amEp;
            while ((amEp = regAep.exec(ulBody)) !== null) {
                const epName = htmlClean(amEp[1] || amEp[3]);
                eps.push(`${epName}$${amEp[2]}`);
            }
            if (eps.length === 0) {
                const regAep2 = /<a[^>]+href="(\/p\/[^"]+\.html)"[^>]*>([^<]+)<\/a>/g;
                while ((amEp = regAep2.exec(ulBody)) !== null) {
                    eps.push(`${htmlClean(amEp[2])}$${amEp[1]}`);
                }
            }
            if (eps.length ===0) continue;
            const fname = idxLine < fromNames.length ? fromNames[idxLine] : `线路${idxLine+1}`;
            playFromArr.push(fname);
            playUrlArr.push(eps.join("#"));
            idxLine++;
        }

        const vod = {
            vod_id: vid,
            vod_name: name,
            vod_pic: pic,
            vod_year: year,
            vod_area: area,
            type_name: tags,
            vod_remarks: remarks,
            vod_actor: "",
            vod_director: "",
            vod_content: content,
            vod_play_from: playFromArr.join("$$$"),
            vod_play_url: playUrlArr.join("$$$")
        };
        return JSON.stringify({ list: [vod] });
    } catch (e) {
        console.error("detail error", e.message);
        return JSON.stringify({ list: [] });
    }
}

async function play(flag, playId, flags) {
    const headers = { "User-Agent": UA, "Referer": HOST + "/" };
    try {
        let pid = String(playId || "");
        if (pid.includes("$")) pid = pid.split('$').pop();
        let url = pid.startsWith("http") ? pid : absUrl(pid);
        const html = await request(url);
        let realUrl = "";
        // 匹配iframe src
        const iframeMatch = reSearch(html, /<iframe[^>]*?src="([^"]+)"/);
        if (iframeMatch) {
            let src = iframeMatch;
            const urlParam = reSearch(src, /[?&]url=([^&"\']+)/);
            realUrl = urlParam ? decodeURIComponent(urlParam) : absUrl(src);
        }
        //匹配 player_aaaa
        if (!realUrl) {
            const playerScript = reSearch(html, /player_aaaa\s*=\s*(\{[\s\S]*?\})\s*<\/script>/);
            if (playerScript) {
                const jo = safeJson(playerScript);
                if (jo && jo.url) realUrl = jo.url.replace(/\\\//g, '/');
                else {
                    realUrl = reSearch(playerScript, /"url"\s*:\s*"([^"]+)"/).replace(/\\\//g, '/');
                }
            }
        }
        //兜底直接抓m3u8
        if (!realUrl) {
            realUrl = reSearch(html, /(https?:\/\/[^\s"\']+\.m3u8[^\s"\']*)/);
        }
        if (!realUrl) {
            return JSON.stringify({ parse:1, url:url, header: headers });
        }
        const isVideo = /\.(m3u8|mp4|flv|mkv|avi|ts)(\?|$)/i.test(realUrl);
        return JSON.stringify({
            parse: isVideo ? 0 :1,
            url: realUrl,
            header: headers
        });
    } catch (e) {
        console.error("play error", e.message);
        return JSON.stringify({ parse:1, url:playId, header: headers });
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