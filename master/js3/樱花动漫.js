import { Crypto, _ } from 'assets://js/lib/cat.js';
let siteKey = '';
let siteType = 0;
let extendObj = {};

const HOST = "https://www.dmvvv.com";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const DEFAULT_HEADERS = {
    "User-Agent": UA,
    "Referer": HOST + "/",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
};
const DEFAULT_PIC = "https://p.qqan.com/up/2021-1/16104169378734044.jpg";

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
    { type_id: "guoman", type_name: "国产动漫", land: 1, ratio: 1.33 },
    { type_id: "riman", type_name: "日本动漫", land: 1, ratio: 1.33 },
    { type_id: "oman", type_name: "欧美动漫", land: 1, ratio: 1.33 },
    { type_id: "dmfilm", type_name: "动漫电影", land: 1, ratio: 1.33 }
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
        const regLi = /<li>[\s\S]*?<a href="(\/detail\/\d+\/)"[\s\S]*?data-original="([^"]+)"[\s\S]*?title="([^"]+)"[\s\S]*?<p>([^<]*)<\/p>/gs;
        const list = [];
        let match;
        while ((match = regLi.exec(html)) !== null) {
            const href = text(match[1]);
            const pic = fixPicUrl(match[2]);
            const title = text(match[3]);
            const remarks = text(match[4]);
            if (!href || !title) continue;
            const vodId = b64EncodeUtf8(JSON.stringify({ url: href }));
            list.push({
                vod_id: vodId,
                vod_name: title,
                vod_pic: pic,
                vod_remarks: remarks,
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
        let pageUrl;
        if (pg <= 1) {
            pageUrl = `${HOST}/type/${tid}/`;
        } else {
            pageUrl = `${HOST}/type/${tid}/${pg}/`;
        }
        const html = await request(pageUrl);
        const regLi = /<li>[\s\S]*?<a href="(\/detail\/\d+\/)"[\s\S]*?data-original="([^"]+)"[\s\S]*?title="([^"]+)"[\s\S]*?<p>([^<]*)<\/p>/gs;
        const list = [];
        let match;
        while ((match = regLi.exec(html)) !== null) {
            const href = text(match[1]);
            const pic = fixPicUrl(match[2]);
            const title = text(match[3]);
            const remarks = text(match[4]);
            if (!href || !title) continue;
            const vodId = b64EncodeUtf8(JSON.stringify({ url: href }));
            list.push({
                vod_id: vodId,
                vod_name: title,
                vod_pic: pic,
                vod_remarks: remarks,
                style: { type: 'rect', ratio: 1.33 }
            });
            if (list.length >= 36) break;
        }
        const pagecount = list.length > 0 ? pg + 1 : pg;
        return JSON.stringify({
            list,
            page: pg,
            pagecount: pagecount,
            limit: 36,
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
        let pageUrl;
        if (pg <= 1) {
            pageUrl = `${HOST}/search/?wd=${encodeURIComponent(key)}`;
        } else {
            pageUrl = `${HOST}/search/?wd=${encodeURIComponent(key)}&pageno=${pg}`;
        }
        const html = await request(pageUrl);
        const regLi = /<li>\s*<a class="cover" href="(\/detail\/\d+\/)"[\s\S]*?data-original="([^"]+)"[\s\S]*?title="([^"]+)"[\s\S]*?<div class="item"><span>状态:<\/span>([^<]*)/gs;
        const list = [];
        let match;
        while ((match = regLi.exec(html)) !== null) {
            const href = text(match[1]);
            const pic = fixPicUrl(match[2]);
            const title = text(match[3]);
            const remarks = text(match[4]);
            if (!href || !title) continue;
            const vodId = b64EncodeUtf8(JSON.stringify({ url: href }));
            list.push({
                vod_id: vodId,
                vod_name: title,
                vod_pic: pic,
                vod_remarks: remarks,
                style: { type: 'rect', ratio: 1.33 }
            });
            if (list.length >= 36) break;
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

        //标题
        let vodName = "";
        const titleReg1 = /<div class="detail">.*?<h2>([^<]+)<\/h2>/s;
        const t1 = html.match(titleReg1);
        if (t1) vodName = text(t1[1]);
        else {
            const t2 = html.match(/<title>([^<]+)/);
            if (t2) vodName = text(t2[1].split('-')[0]);
        }
        //封面
        const coverReg = /<div class="cover">\s*<img[^>]+data-original="([^"]+)"/;
        const coverMatch = html.match(coverReg);
        const vodPic = coverMatch ? fixPicUrl(coverMatch[1]) : DEFAULT_PIC;

        //元信息
        function getField(label) {
            const reg = new RegExp(`<span>${label}:<\\/span><em>([^<]+)<\\/em>`);
            const m = html.match(reg);
            return m ? text(m[1]) : "";
        }
        const vodRemarks = getField("状态");
        const vodYear = getField("年份");
        const vodArea = getField("地区");
        const vodActor = getField("主演");

        //简介
        const descReg = /class="blurb"[^>]*>.*?<span>[^<]+<\/span>(.*?)<\/li>/s;
        const descMatch = html.match(descReg);
        const vodContent = descMatch ? text(descMatch[1].replace(/<[^>]+>/g, "")) : "";

        //提取视频id /detail/1234/ →1234
        const idMatch = detailUrl.match(/\/detail\/(\d+)\/$/);
        const videoId = idMatch ? text(idMatch[1]) : "";
        const sourceNames = ["高清", "ikun", "非凡", "量子"];
        const playList = [];

        //遍历4条线路
        for (let sourceIdx = 1; sourceIdx <= 4; sourceIdx++) {
            const testPlayUrl = `${HOST}/play/${videoId}-${sourceIdx}-1/`;
            const testHtml = await request(testPlayUrl);
            if (!testHtml) continue;
            //简单判断线路是否有效，有页面就生成该线路全部集数(取24集上限)
            for (let epIdx = 1; epIdx <= 24; epIdx++) {
                const epName = epIdx < 10 ? `第0${epIdx}集` : `第${epIdx}集`;
                const epPlayPath = `/play/${videoId}-${sourceIdx}-${epIdx}/`;
                const payload = b64EncodeUtf8(JSON.stringify({ playPage: HOST + epPlayPath, lineName: sourceNames[sourceIdx - 1] }));
                playList.push(`${epName}$${payload}`);
            }
        }

        const vod = {
            vod_id: vodIdB64,
            vod_name: vodName,
            vod_pic: vodPic,
            vod_year: vodYear,
            vod_area: vodArea,
            vod_remarks: vodRemarks,
            vod_actor: vodActor,
            vod_director: "",
            vod_content: vodContent,
            vod_play_from: "樱花动漫",
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
        if (!meta || !meta.playPage) {
            return JSON.stringify({ parse: 1, url: "", header: { "User-Agent": UA } });
        }
        const playPageUrl = meta.playPage;
        const html = await request(playPageUrl);
        let realUrl = "";
        //正则提取播放地址
        const jsUrlReg = /url:\s*['"](https?:\/\/[^'"]+)['"]/;
        const m1 = html.match(jsUrlReg);
        if (m1) realUrl = text(m1[1]);
        if (!realUrl) {
            const m3u8Reg = /(https?:\/\/[^\s'"]+\.m3u8(\?[^'">]*)?)/i;
            const m2 = html.match(m3u8Reg);
            if (m2) realUrl = text(m2[1]);
        }
        if (realUrl) {
            return JSON.stringify({
                parse: 0,
                url: realUrl,
                header: {
                    "User-Agent": UA,
                    "Referer": playPageUrl
                }
            });
        } else {
            //提取失败降级网页嗅探
            return JSON.stringify({
                parse: 1,
                url: playPageUrl,
                header: {
                    "User-Agent": UA,
                    "Referer": playPageUrl
                }
            });
        }
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