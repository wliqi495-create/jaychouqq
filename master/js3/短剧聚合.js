import { Crypto, _ } from 'assets://js/lib/cat.js';
let siteKey = '';
let siteType = 0;
const HOST = "https://lssy.net";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const DEFAULT_HEADERS = {
    "User-Agent": UA,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9",
    "Referer": HOST + "/"
};

async function request(url, optHeaders = {}) {
    try {
        const headers = Object.assign({}, DEFAULT_HEADERS, optHeaders);
        const res = await req(url, {
            method: "GET",
            headers: headers,
            timeout: 12000
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
    if (url.startsWith('/')) return HOST + url;
    return HOST + "/" + url;
}

// 分类配置，复刻py categories
const LSSY_CLASSES = [
    { type_id: "1", type_name: "短剧大全", land: 1, ratio: 1.33 },
    { type_id: "2", type_name: "重生", land: 1, ratio: 1.33 },
    { type_id: "3", type_name: "穿越", land: 1, ratio: 1.33 },
    { type_id: "4", type_name: "都市", land: 1, ratio: 1.33 },
    { type_id: "5", type_name: "甜宠", land: 1, ratio: 1.33 },
    { type_id: "6", type_name: "虐恋", land: 1, ratio: 1.33 },
    { type_id: "7", type_name: "战神", land: 1, ratio: 1.33 },
    { type_id: "8", type_name: "逆袭", land: 1, ratio: 1.33 },
    { type_id: "9", type_name: "古装", land: 1, ratio: 1.33 },
    { type_id: "10", type_name: "家庭", land: 1, ratio: 1.33 },
    { type_id: "11", type_name: "悬疑", land: 1, ratio: 1.33 },
    { type_id: "12", type_name: "剧情", land: 1, ratio: 1.33 }
];

// tid映射搜索关键词
const CAT_KEYWORD_MAP = {
    "1": "",
    "2": "重生",
    "3": "穿越",
    "4": "都市",
    "5": "甜宠",
    "6": "虐恋",
    "7": "战神",
    "8": "逆袭",
    "9": "古装",
    "10": "家庭",
    "11": "悬疑",
    "12": "剧情"
};

let extendObj = { classes: [...LSSY_CLASSES], filter: {} };

async function init(cfg) {
    try {
        siteKey = cfg.skey;
        siteType = cfg.stype;
        extendObj = { classes: [...LSSY_CLASSES], filter: {} };
    } catch (e) {
        console.error("init error", e.message);
        extendObj = { classes: [...LSSY_CLASSES], filter: {} };
    }
}

function home(filter) {
    try {
        return JSON.stringify({ class: extendObj.classes || LSSY_CLASSES, filters: extendObj.filter || {} });
    } catch (e) {
        return JSON.stringify({ class: LSSY_CLASSES, filters: {} });
    }
}

/** 解析卡片列表，复刻 _parse_video_list */
function parseVideoList(html) {
    const list = [];
    const seen = new Set();
    const cardReg = /<div class="card">(.*?)<\/div>\s*<\/div>/gs;
    let cardMatch;
    while ((cardMatch = cardReg.exec(html)) !== null) {
        const block = cardMatch[1];
        const vidMatch = block.match(/detail\.php\?vid=(\d+)/);
        if (!vidMatch) continue;
        const vodId = vidMatch[1];
        if (seen.has(vodId)) continue;
        seen.add(vodId);

        //标题
        let title = "";
        const titleMatch = block.match(/<div class="title">(.*?)<\/div>/s);
        if (titleMatch) title = titleMatch[1].replace(/<[^>]+>/g, "").trim();

        //封面
        let pic = "";
        let picMatch = block.match(/data-original="([^"]+)"/);
        if (!picMatch) picMatch = block.match(/src="([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/);
        if (picMatch) pic = fixPicUrl(picMatch[1]);

        //集数备注
        let remarks = "";
        const epMatch = block.match(/(\d+)\s*集/);
        if (epMatch) remarks = `${epMatch[1]}集`;

        if (!title) continue;
        list.push({
            vod_id: vodId,
            vod_name: title,
            vod_pic: pic,
            vod_remarks: remarks,
            style: { type: 'rect', ratio: 1.33 }
        });
    }
    return list;
}

/** 提取最大页码，复刻 _extract_page_info */
function extractPageInfo(html) {
    let pagecount = 1;
    const pageReg = /\?p=(\d+)&keyword=/g;
    let pm;
    while ((pm = pageReg.exec(html)) !== null) {
        const num = Number(pm[1]);
        if (num > pagecount) pagecount = num;
    }
    return pagecount;
}

async function homeVod() {
    try {
        const html = await request(`${HOST}/`);
        const list = parseVideoList(html);
        return JSON.stringify({ list });
    } catch (e) {
        console.error("homeVod error", e.message);
        return JSON.stringify({ list: [] });
    }
}

async function category(tid, pg, filter, ext) {
    pg = Number(pg) || 1;
    try {
        const kw = CAT_KEYWORD_MAP[String(tid)] || "";
        let url;
        if (kw) {
            url = `${HOST}/?keyword=${encodeURIComponent(kw)}&p=${pg}`;
        } else {
            if (pg <= 1) {
                url = `${HOST}/`;
            } else {
                url = `${HOST}/?p=${pg}`;
            }
        }
        const html = await request(url);
        const list = parseVideoList(html);
        const pagecount = extractPageInfo(html);
        return JSON.stringify({
            list,
            page: pg,
            pagecount: pagecount,
            limit: 20,
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
        const kw = encodeURIComponent(key);
        const url = `${HOST}/?keyword=${kw}&p=${pg}`;
        const html = await request(url);
        const list = parseVideoList(html);
        const pagecount = extractPageInfo(html);
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
        const url = `${HOST}/detail.php?vid=${vodId}`;
        const html = await request(url);
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
            vod_play_from: "直链播放",
            vod_play_url: ""
        };

        //标题
        let titleMatch = html.match(/<title>(.*?)<\/title>/);
        if (titleMatch) {
            vod.vod_name = titleMatch[1].split("-")[0].split("_")[0].trim();
        }
        if (!vod.vod_name || vod.vod_name === "短剧大全") {
            const altTitle = html.match(/<div class="video-title">(.*?)<\/div>/s);
            if (altTitle) vod.vod_name = altTitle[1].replace(/<[^>]+>/g, "").trim();
        }

        //封面
        let picMatch = html.match(/<video[^>]*poster="([^"]+)"/);
        if (!picMatch) picMatch = html.match(/data-original="([^"]+)"/);
        if (picMatch) vod.vod_pic = fixPicUrl(picMatch[1]);

        //简介
        const descMatch = html.match(/<meta name="description" content="([^"]+)"/);
        if (descMatch) {
            vod.vod_content = descMatch[1].replace(/短剧大全-短剧网提供.*?在线观看[。，]?/, "").trim();
        }

        //年份
        const yearMatch = html.match(/(\d{4})[年/-]/);
        if (yearMatch) vod.vod_year = yearMatch[1];

        //解析分集
        const playItems = [];
        const epReg = /<div[^>]*class="episode[^"]*"[^>]*data-src="([^"]+)"[^>]*>(.*?)<\/div>/gs;
        let epMatch;
        while ((epMatch = epReg.exec(html)) !== null) {
            let epName = epMatch[2].replace(/<[^>]+>/g, "").trim();
            const src = fixPicUrl(epMatch[1]);
            if (!epName) epName = `第${playItems.length + 1}集`;
            playItems.push(`${epName}$${b64EncodeUtf8(src)}`);
        }
        //兜底直接抓取页面全部m3u8
        if (playItems.length === 0) {
            const m3u8Reg = /https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/g;
            let mMatch;
            const tempSet = new Set();
            while ((mMatch = m3u8Reg.exec(html)) !== null) {
                const u = mMatch[0];
                if (tempSet.has(u)) continue;
                tempSet.add(u);
                playItems.push(`第${playItems.length + 1}集$${b64EncodeUtf8(u)}`);
            }
        }
        vod.vod_play_url = playItems.join("#");
        return JSON.stringify({ list: [vod] });
    } catch (e) {
        console.error("detail error", e.message);
        return JSON.stringify({ list: [] });
    }
}

async function play(flag, id, flags) {
    try {
        const realUrl = b64DecodeUtf8(id || "");
        if (!realUrl) {
            return JSON.stringify({ parse: 1, url: "", header: { "User-Agent": UA, "Referer": HOST + "/" } });
        }
        return JSON.stringify({
            parse: 0,
            url: realUrl,
            header: {
                "User-Agent": UA,
                "Referer": HOST + "/"
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
