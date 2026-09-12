import { Crypto, _ } from 'assets://js/lib/cat.js';
let siteKey = '';
let siteType = 0;
// 多域名列表，顺序尝试切换
const HOSTS = ["https://www.ncat25.com", "https://www.ncat1.app"];
let HOST = HOSTS[0];
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36";
const DEFAULT_HEADERS = {
    "User-Agent": UA,
    "Accept-Language": "zh-CN,zh;q=0.9",
    "Referer": HOST + "/"
};

async function request(url, optHeaders = {}) {
    for (const hostItem of HOSTS) {
        try {
            const realUrl = url.startsWith("http") ? url : hostItem + url;
            const headers = Object.assign({}, DEFAULT_HEADERS, { Referer: hostItem + "/" }, optHeaders);
            const res = await req(realUrl, {
                method: "GET",
                headers: headers,
                timeout: 20000
            });
            const text = res?.content ?? "";
            // 检测反爬挑战页，换下一个域名
            if (text.includes("cdndefend") || text.includes("a0_0x2a54")) {
                continue;
            }
            HOST = hostItem;
            return text;
        } catch (e) {
            continue;
        }
    }
    console.error("request: all host failed");
    return "";
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
    return HOST + url;
}

// 分类，复刻py homeContent
const NCAT_CLASSES = [
    { type_id: "1", type_name: "电影", land: 1, ratio: 1.33 },
    { type_id: "2", type_name: "连续剧", land: 1, ratio: 1.33 },
    { type_id: "3", type_name: "动漫", land: 1, ratio: 1.33 },
    { type_id: "4", type_name: "综艺纪录", land: 1, ratio: 1.33 },
    { type_id: "6", type_name: "短剧", land: 1, ratio: 1.33 }
];
let extendObj = { classes: [...NCAT_CLASSES], filter: {} };

async function init(cfg) {
    try {
        siteKey = cfg.skey;
        siteType = cfg.stype;
        extendObj = { classes: [...NCAT_CLASSES], filter: {} };
    } catch (e) {
        console.error("init error", e.message);
        extendObj = { classes: [...NCAT_CLASSES], filter: {} };
    }
}

function home(filter) {
    try {
        return JSON.stringify({ class: extendObj.classes || NCAT_CLASSES, filters: extendObj.filter || {} });
    } catch (e) {
        return JSON.stringify({ class: NCAT_CLASSES, filters: {} });
    }
}

/** 解析模块列表，复刻 _parse_videos */
function parseVideoList(html) {
    const list = [];
    const seen = new Set();
    // 首页/分类 module-item
    const reg1 = /<div class="module-item">\s*<a href="\/detail\/(\d+)\.html"[^>]*>.*?<div class="v-item-bottom">\s*<span>\s*([^<]*?)\s*<\/span>.*?<div class="v-item-title">([^<]*)<\/div>/gs;
    let m;
    while ((m = reg1.exec(html)) !== null) {
        const vid = m[1];
        const remarks = (m[2] || "").trim();
        const name = (m[3] || "").trim();
        if (!name || seen.has(vid)) continue;
        seen.add(vid);
        // 提取封面，过滤占位图
        let pic = "";
        const subStr = m[0];
        const picReg = /data-original="([^"]+)"/g;
        let pm;
        while ((pm = picReg.exec(subStr)) !== null) {
            const p = pm[1];
            if (!p.includes("logo_placeholder") && !p.includes("vod_pc_static_ncat")) {
                pic = p;
                break;
            }
        }
        list.push({
            vod_id: vid,
            vod_name: name,
            vod_pic: fixPicUrl(pic),
            vod_remarks: remarks,
            style: { type: 'rect', ratio: 1.33 }
        });
    }
    // 搜索结果 search‑result‑item
    if (list.length === 0) {
        const regSearch = /<a href="\/detail\/(\d+)\.html" class="search-result-item">.*?<img[^>]+data-original="([^"]+)"[^>]*>.*?<img[^>]+alt="([^"]+)"/gs;
        while ((m = regSearch.exec(html)) !== null) {
            const vid = m[1];
            const pic = m[2];
            const name = (m[3] || "").trim();
            if (!name || seen.has(vid)) continue;
            seen.add(vid);
            list.push({
                vod_id: vid,
                vod_name: name,
                vod_pic: fixPicUrl(pic),
                vod_remarks: "",
                style: { type: 'rect', ratio: 1.33 }
            });
        }
    }
    return list;
}

async function homeVod() {
    try {
        const html = await request("/");
        let list = parseVideoList(html);
        if (list.length > 30) list = list.slice(0, 30);
        return JSON.stringify({ list });
    } catch (e) {
        console.error("homeVod error", e.message);
        return JSON.stringify({ list: [] });
    }
}

async function category(tid, pg, filter, ext) {
    pg = Number(pg) || 1;
    try {
        // 源py分类无分页，固定一页
        const html = await request(`/channel/${tid}.html`);
        const list = parseVideoList(html);
        return JSON.stringify({
            list,
            page: pg,
            pagecount: 1,
            limit: list.length,
            total: list.length
        });
    } catch (e) {
        console.error("category error", e.message);
        return JSON.stringify({ list: [], page: pg, pagecount: 0 });
    }
}

async function search(key, quick, pg) {
    pg = Number(pg) || 1;
    try {
        // 获取搜索token
        const indexHtml = await request("/");
        const tokenMatch = indexHtml.match(/name="t" value="([^"]+)"/);
        if (!tokenMatch) {
            return JSON.stringify({ list: [], page: pg, pagecount: 0, land: 1, ratio: 1.33 });
        }
        const token = tokenMatch[1];
        const kw = encodeURIComponent(key);
        const t = encodeURIComponent(token);
        const html = await request(`/search?k=${kw}&t=${t}`);
        const list = parseVideoList(html);
        return JSON.stringify({
            list,
            page: pg,
            pagecount: 1,
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
        const html = await request(`/detail/${vodId}.html`);
        if (!html) return JSON.stringify({ list: [] });
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
            vod_play_from: "网飞猫",
            vod_play_url: ""
        };
        // 解析标题，过滤水印特殊字符域名
        const titleBox = html.match(/class="detail-title[^"]*"[^>]*>(.*?)<\/div>/s);
        if (titleBox) {
            const titleReg = /<strong[^>]*>([^<]{2,60})<\/strong>/gs;
            let tm;
            while ((tm = titleReg.exec(titleBox[1])) !== null) {
                const t = tm[1].trim();
                // 简单过滤水印域名（cat无法unicode区间判断，用正则过滤域名特征）
                if (t && !/[a-zA-Z0-9]+\.[a-zA-Z0-9]+/.test(t)) {
                    vod.vod_name = t;
                    break;
                }
            }
        }
        // 封面
        const picMatch = html.match(/data-original="(\/vod1\/vod\/cover\/[^"]+)"/);
        if (picMatch) vod.vod_pic = fixPicUrl(picMatch[1]);
        // 解析导演、演员、首映、备注
        const infoReg = /class="detail-info-row-side">([^<]*)<\/div>\s*<div class="detail-info-row-main">(.*?)<\/div>/gs;
        let infoM;
        while ((infoM = infoReg.exec(html)) !== null) {
            const side = infoM[1].trim().replace(/[：:]$/, "");
            let main = infoM[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
            if (side === "导演") vod.vod_director = main;
            if (side === "演员") vod.vod_actor = main;
            if (side === "首映") vod.vod_year = main.substring(0, 4);
            if (side === "备注") vod.vod_remarks = main;
        }
        // 解析线路与集数
        const sourceMatches = [...html.matchAll(/<span class="source-item-label">([^<]*)<\/span>/g)];
        const boxMatch = html.match(/<div class="episode-list-box-main[^"]*"[^>]*>(.*?)<\/div>\s*<\/div>\s*<\/div>/s);
        const playFromArr = [];
        const playUrlArr = [];
        if (boxMatch && sourceMatches.length > 0) {
            const sourceList = sourceMatches.map(x => x[1].trim());
            const epBoxList = [...boxMatch[1].matchAll(/<div class="episode-list[^"]*"[^>]*>(.*?)<\/div>/gs)];
            for (let idx = 0; idx < sourceList.length; idx++) {
                if (idx >= epBoxList.length) break;
                const srcName = sourceList[idx];
                const epHtml = epBoxList[idx][1];
                const eps = [...epHtml.matchAll(/href="(\/play\/[^"]+)"[^>]*class="episode-item"[^>]*>\s*<span>([^<]*)<\/span>/gs)];
                if (eps.length === 0) continue;
                playFromArr.push(srcName);
                const epStr = eps.map(epItem => `${epItem[2]}$${b64EncodeUtf8(HOST + epItem[1])}`).join("#");
                playUrlArr.push(epStr);
            }
        }
        if (playFromArr.length > 0) {
            vod.vod_play_from = playFromArr.join("$$$");
            vod.vod_play_url = playUrlArr.join("$$$");
        }
        return JSON.stringify({ list: [vod] });
    } catch (e) {
        console.error("detail error", e.message);
        return JSON.stringify({ list: [] });
    }
}

async function play(flag, id, flags) {
    try {
        const playUrl = b64DecodeUtf8(id || "");
        if (!playUrl) {
            return JSON.stringify({ parse: 1, url: "", header: { "User-Agent": UA, "Referer": HOST + "/" } });
        }
        const html = await request(playUrl);
        // 提取playSource.src m3u8
        const srcMatch = html.match(/playSource\s*=\s*\{\s*src:\s*"([^"]+)"/);
        if (srcMatch && srcMatch[1].startsWith("http")) {
            return JSON.stringify({
                parse: 0,
                url: srcMatch[1],
                header: {
                    "User-Agent": UA,
                    "Referer": playUrl
                }
            });
        }
        return JSON.stringify({
            parse: 1,
            url: playUrl,
            header: {
                "User-Agent": UA,
                "Referer": playUrl
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
//（注：内容由AI生成）
