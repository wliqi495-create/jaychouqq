import { Crypto, _ } from 'assets://js/lib/cat.js';
let siteKey = '';
let siteType = 0;
let extendObj = {};

const HOST = "https://www.9hanju.com";
const UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36";
const DEFAULT_HEADERS = {
    "User-Agent": UA,
    "Referer": HOST + "/",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
};
const DEFAULT_PIC = "https://youke2.picui.cn/s1/2025/12/21/694796745c0c6.png";

async function request(url, optHeaders = {}, body) {
    try {
        const headers = Object.assign({}, DEFAULT_HEADERS, optHeaders || {});
        const res = await req(url, {
            method: body ? "POST" : "GET",
            headers: headers,
            timeout: 15000,
            data: body
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

function text(v) {
    return String(v == null ? "" : v).trim();
}

// 图片协议修复
function fixPicUrl(url) {
    url = text(url);
    if (!url) return DEFAULT_PIC;
    if (url.startsWith("//")) return "https:" + url;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    try {
        return new URL(url, HOST).toString();
    } catch {
        return DEFAULT_PIC;
    }
}

// 分类定义
const CLASSES = [
    { type_id: "1", type_name: "韩剧", land: 1, ratio: 1.33 },
    { type_id: "3", type_name: "韩国电影", land: 1, ratio: 1.33 },
    { type_id: "4", type_name: "韩国综艺", land: 1, ratio: 1.33 },
    { type_id: "hot", type_name: "排行榜", land: 1, ratio: 1.33 },
    { type_id: "new", type_name: "最新更新", land: 1, ratio: 1.33 }
];

async function init(cfg) {
    try {
        siteKey = cfg.skey;
        siteType = cfg.stype;
        extendObj = { classes: [...CLASSES], filter: {} };
    } catch (e) {
        console.error("init error", e.message);
        extendObj = { classes: [...CLASSES], filter: {} };
    }
}

function home(filter) {
    try {
        return JSON.stringify({
            class: extendObj.classes || CLASSES,
            filters: extendObj.filter || {}
        });
    } catch (e) {
        return JSON.stringify({ class: CLASSES, filters: {} });
    }
}

async function homeVod() {
    try {
        const html = await request(HOST);
        const regLi = /<li>[\s\S]*?<a href="([^"]+)"[\s\S]*?data-original="([^"]+)"[\s\S]*?title="([^"]+)"[\s\S]*?<span>([^<]*)<\/span>/gs;
        const list = [];
        let match;
        while ((match = regLi.exec(html)) !== null) {
            const href = text(match[1]);
            const pic = fixPicUrl(match[2]);
            const title = text(match[3]);
            const remark = text(match[4]);
            if (!href || !title) continue;
            const vodId = b64EncodeUtf8(JSON.stringify({ url: href }));
            list.push({
                vod_id: vodId,
                vod_name: title,
                vod_pic: pic,
                vod_remarks: remark,
                style: { type: 'rect', ratio: 1.33 }
            });
            if (list.length >= 20) break;
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
        let pageUrl = "";
        if (tid === "hot" || tid === "new") {
            pageUrl = `${HOST}/${tid}.html`;
        } else {
            pageUrl = `${HOST}/list/${tid}---${pg - 1}.html`;
        }
        const html = await request(pageUrl);
        const regLi = /<li>[\s\S]*?<a href="([^"]+)"[\s\S]*?data-original="([^"]+)"[\s\S]*?title="([^"]+)"[\s\S]*?<span>([^<]*)<\/span>/gs;
        const list = [];
        let match;
        while ((match = regLi.exec(html)) !== null) {
            const href = text(match[1]);
            const pic = fixPicUrl(match[2]);
            const title = text(match[3]);
            const remark = text(match[4]);
            if (!href || !title) continue;
            const vodId = b64EncodeUtf8(JSON.stringify({ url: href }));
            list.push({
                vod_id: vodId,
                vod_name: title,
                vod_pic: pic,
                vod_remarks: remark,
                style: { type: 'rect', ratio: 1.33 }
            });
            if (list.length >= 25) break;
        }
        const pagecount = list.length > 0 ? pg + 1 : pg;
        return JSON.stringify({
            list,
            page: pg,
            pagecount: pagecount,
            limit: 25,
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
        const body = `show=searchkey&keyboard=${encodeURIComponent(key)}`;
        const html = await request(`${HOST}/search/`, { "Content-Type": "application/x-www-form-urlencoded" }, body);
        const regLi = /<li>[\s\S]*?<a href="([^"]+)"[\s\S]*?data-original="([^"]+)"[\s\S]*?title="([^"]+)"[\s\S]*?<span>([^<]*)<\/span>/gs;
        const list = [];
        let match;
        while ((match = regLi.exec(html)) !== null) {
            const href = text(match[1]);
            const pic = fixPicUrl(match[2]);
            const title = text(match[3]);
            const remark = text(match[4]);
            if (!href || !title) continue;
            const vodId = b64EncodeUtf8(JSON.stringify({ url: href }));
            list.push({
                vod_id: vodId,
                vod_name: title,
                vod_pic: pic,
                vod_remarks: remark,
                style: { type: 'rect', ratio: 1.33 }
            });
            if (list.length >= 25) break;
        }
        const pagecount = list.length > 0 ? pg + 1 : pg;
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

async function detail(vodIdB64) {
    try {
        const raw = b64DecodeUtf8(vodIdB64);
        const meta = safeJson(raw);
        if (!meta || !meta.url) return JSON.stringify({ list: [] });
        const detailUrl = meta.url.startsWith("http") ? meta.url : HOST + meta.url;
        const html = await request(detailUrl);

        // 解析封面
        const picMatch = html.match(/data-original="([^"]+)"/);
        const vodPic = picMatch ? fixPicUrl(picMatch[1]) : DEFAULT_PIC;

        // 解析标题
        const titleMatch = html.match(/<div class="info">[\s\S]*?<dd>([^<]+)<\/dd>/);
        const vodName = titleMatch ? text(titleMatch[1]) : "";

        // 解析简介
        const descMatch = html.match(/<div class="juqing">([\s\S]*?)<\/div>/);
        const vodContent = descMatch ? text(descMatch[1]) : "";

        // 解析集数 onclick='play("xxx")'
        const epReg = /<a[^>]*onclick=['"]play\(['"]([^'"]+)['"]\)[^>]*>([^<]+)<\/a>/gs;
        const playList = [];
        let epMatch;
        while ((epMatch = epReg.exec(html)) !== null) {
            const fid = text(epMatch[1]);
            const epName = text(epMatch[2]);
            if (!fid) continue;
            const epPayload = b64EncodeUtf8(JSON.stringify({ playPage: detailUrl, fid: fid }));
            playList.push(`${epName}$${epPayload}`);
        }

        const vod = {
            vod_id: vodIdB64,
            vod_name: vodName,
            vod_pic: vodPic,
            vod_year: "",
            vod_area: "",
            vod_remarks: "",
            vod_actor: "",
            vod_director: "",
            vod_content: vodContent,
            vod_play_from: "新韩剧网",
            vod_play_url: playList.join("#")
        };
        return JSON.stringify({ list: [vod] });
    } catch (e) {
        console.error("detail error", e.message);
        return JSON.stringify({ list: [] });
    }
}

async function play(flag, idB64, flags) {
    try {
        const raw = b64DecodeUtf8(idB64 || "");
        const meta = safeJson(raw);
        if (!meta || !meta.fid) {
            return JSON.stringify({ parse: 1, url: "", header: { "User-Agent": UA } });
        }
        // ⚠️原源需要AES‑CBC解密，CAT沙箱没有CryptoJS.AES，无法解密播放地址，降级网页嗅探
        const sniffUrl = `${HOST}/u/u1.php?ud=${encodeURIComponent(meta.fid)}`;
        return JSON.stringify({
            parse: 1,
            url: sniffUrl,
            header: {
                "User-Agent": UA,
                "Referer": meta.playPage || HOST + "/"
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