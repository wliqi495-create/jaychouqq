import { Crypto, _, cheerio } from 'assets://js/lib/cat.js';
let siteKey = '';
let siteType = 0;

// ✔和py保持完全一致真实域名
const HOST = www.59v.net";
const UA = "Mozilla/5.0 (Linux; Android 14; M2102J2SC Build/UKQ1.240624.001) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36";
const DEFAULT_HEADERS = {
    "User-Agent": UA,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9",
    "Referer": HOST + "/"
};

// 分类筛选配置，完全复刻py
const CLASSES = [
    { "type_id": "1", "type_name": "电影", "land":1, "ratio":1.33 },
    { "type_id": "2", "type_name": "剧集", "land":1, "ratio":1.33 },
    { "type_id": "3", "type_name": "综艺", "land":1, "ratio":1.33 },
    { "type_id": "4", "type_name": "动漫", "land":1, "ratio":1.33 }
];
const FILTERS = {
    "1": [{
        "key": "sub",
        "name": "类型",
        "value": [
            { "n": "全部", "v": "" },
            { "n": "动作片", "v": "6" },
            { "n": "喜剧片", "v": "7" },
            { "n": "爱情片", "v": "8" },
            { "n": "科幻片", "v": "9" },
            { "n": "恐怖片", "v": "10" },
            { "n": "剧情片", "v": "11" },
            { "n": "战争片", "v": "12" },
            { "n": "动漫电影", "v": "26" }
        ]
    }],
    "2": [{
        "key": "sub",
        "name": "类型",
        "value": [
            { "n": "全部", "v": "" },
            { "n": "国产剧", "v": "13" },
            { "n": "港台剧", "v": "14" },
            { "n": "韩国剧", "v": "15" },
            { "n": "欧美剧", "v": "16" },
            { "n": "日本剧", "v": "17" },
            { "n": "泰国剧", "v": "27" }
        ]
    }],
    "3": [{
        "key": "sub",
        "name": "类型",
        "value": [
            { "n": "全部", "v": "" },
            { "n": "国内综艺", "v": "18" },
            { "n": "港台综艺", "v": "19" },
            { "n": "日韩综艺", "v": "20" },
            { "n": "欧美综艺", "v": "21" }
        ]
    }],
    "4": [{
        "key": "sub",
        "name": "类型",
        "value": [
            { "n": "全部", "v": "" },
            { "n": "国产动漫", "v": "22" },
            { "n": "欧美动漫", "v": "23" },
            { "n": "日韩动漫", "v": "24" },
            { "n": "港台动漫", "v": "25" }
        ]
    }]
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

function b64EncodeUtf8(str) {
    return Crypto.enc.Base64.stringify(Crypto.enc.Utf8.parse(str || ""));
}
function b64DecodeUtf8(b64) {
    try {
        return Crypto.enc.Utf8.stringify(Crypto.enc.Base64.parse(b64 || ""));
    } catch (e) { return ""; }
}
function safeJson(str) {
    try {
        if (!str) return null;
        return JSON.parse(str);
    } catch (e) { return null; }
}
function text(v) {
    return String(v == null ? "" : v).trim();
}

// ✔修复urlJoin，完全模拟py urllib.parse.urljoin，处理//相对协议图片
function urlJoin(base, path) {
    if (!path) return "";
    path = text(path);
    if (path.startsWith("http")) return path;
    if (path.startsWith("//")) return "https:" + path;
    try {
        return new URL(path, base).href;
    } catch (err) {
        if(base.endsWith("/")) return base + path.replace(/^\//,"");
        return base + "/" + path.replace(/^\//,"");
    }
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
        return JSON.stringify({
            class: CLASSES,
            filters: FILTERS
        });
    } catch (e) {
        console.error("home error", e.message);
        return JSON.stringify({ class: [], filters: {} });
    }
}

async function homeVod() {
    try {
        const html = await request(HOST);
        if(!html) return JSON.stringify({ list: [] });
        const $ = cheerio.load(html);
        const videos = [];
        $(".module-item").each((_, el) => {
            try {
                const $el = $(el);
                let $a = $el.is("a") ? $el : $el.find("a").first();
                if (!$a.length) return;
                const href = text($a.attr("href"));
                if (!href.startsWith("/voddetail/")) return;

                let title = text($a.attr("title"));
                if (!title) {
                    const t = $a.find(".module-poster-item-title").first();
                    title = text(t.text());
                }
                const $img = $a.find("img").first();
                let pic = "";
                if ($img.length) {
                    pic = text($img.attr("data-original") || $img.attr("src"));
                }
                pic = urlJoin(HOST, pic);

                const $note = $a.find(".module-item-note").first();
                const remarks = text($note.text());

                videos.push({
                    vod_id: href,
                    vod_name: title,
                    vod_pic: pic,
                    vod_remarks: remarks,
                    style: { type: 'rect', ratio: 1.33 }
                });
            } catch (innerErr) {
                //单条出错跳过，不中断整个列表
            }
        });
        return JSON.stringify({ list: videos });
    } catch (e) {
        console.error("homeVod error", e.message);
        return JSON.stringify({ list: [] });
    }
}

async function category(tid, pg, filter, ext) {
    pg = Number(pg) || 1;
    try {
        const sub = ext && ext.sub ? text(ext.sub) : "";
        const cid = sub ? sub : tid;
        const url = `${HOST}/vodshow/${cid}--------${pg}---/`;
        const html = await request(url);
        if(!html) return JSON.stringify({ list: [], page: pg, pagecount:0, limit:0, total:0 });
        const $ = cheerio.load(html);
        const videos = [];
        $(".module-item").each((_, el) => {
            try {
                const $el = $(el);
                let $a = $el.is("a") ? $el : $el.find("a").first();
                if (!$a.length) return;
                const href = text($a.attr("href"));
                if (!href.startsWith("/voddetail/")) return;

                const title = text($a.attr("title"));
                const $img = $a.find("img").first();
                let pic = "";
                if ($img.length) {
                    pic = text($img.attr("data-original") || $img.attr("src"));
                }
                pic = urlJoin(HOST, pic);

                const $note = $a.find(".module-item-note").first();
                const remarks = text($note.text());

                videos.push({
                    vod_id: href,
                    vod_name: title,
                    vod_pic: pic,
                    vod_remarks: remarks,
                    style: { type: 'rect', ratio: 1.33 }
                });
            } catch (innerErr) {}
        });
        // ✔和py一致，固定pagecount=999，支持无限下拉翻页
        return JSON.stringify({
            list: videos,
            page: pg,
            pagecount: 999,
            limit: 40,
            total: 999999
        });
    } catch (e) {
        console.error("category error", e.message);
        return JSON.stringify({ list: [], page: pg, pagecount:0, limit:0, total:0 });
    }
}

async function detail(vodId) {
    try {
        const url = urlJoin(HOST, vodId);
        const html = await request(url);
        if(!html) return JSON.stringify({ list: [] });
        const $ = cheerio.load(html);
        const vod = {
            vod_id: vodId,
            vod_name: "未知",
            vod_pic: "",
            vod_year: "",
            vod_area: "",
            vod_actor: "",
            vod_director: "",
            vod_content: "",
            vod_remarks: "",
            vod_play_from: "",
            vod_play_url: ""
        };

        const h1 = $(".module-info-heading h1").first();
        if (!h1.length) h1 = $(".page-title").first();
        if (h1.length) vod.vod_name = text(h1.text());

        const img = $(".module-info-poster img").first();
        if (!img.length) img = $(".module-item-pic img").first();
        if (img.length) {
            const src = text(img.attr("data-original") || img.attr("src"));
            vod.vod_pic = urlJoin(HOST, src);
        }

        const intro = $(".module-info-introduction-content p").first();
        if (intro.length) vod.vod_content = text(intro.text());

        $(".module-info-item").each((_, el) => {
            const txt = text($(el).text());
            if (txt.includes("导演：")) vod.vod_director = text(txt.replace("导演：", ""));
            else if (txt.includes("主演：")) vod.vod_actor = text(txt.replace("主演：", ""));
            else if (txt.includes("上映：")) vod.vod_year = text(txt.replace("上映：", ""));
            else if (txt.includes("备注：")) vod.vod_remarks = text(txt.replace("备注：", ""));
        });

        const playSources = [];
        const tabBox = $(".module-tab-items-box").first();
        let $tabs;
        if (tabBox.length) {
            $tabs = tabBox.find(".tab-item");
        } else {
            $tabs = $(".module-tab-item.tab-item");
        }
        $tabs.each((_, el) => {
            const $el = $(el);
            const span = $el.find("span").first();
            let name = span.length ? text(span.text()) : text($el.text().replace(/\d+$/, ""));
            if (name && !playSources.includes(name)) playSources.push(name);
        });

        const playLists = [];
        $(".module-play-list-content").each((_, el) => {
            const eps = [];
            $(el).find("a.module-play-list-link").each((_, aEl) => {
                const $a = $(aEl);
                const span = $a.find("span").first();
                const epName = span.length ? text(span.text()) : text($a.text());
                const epHref = text($a.attr("href"));
                if (epHref) eps.push(`${epName}$${epHref}`);
            });
            if (eps.length > 0) playLists.push(eps.join("#"));
        });

        if (playSources.length > 0 && playLists.length > 0) {
            const n = Math.min(playSources.length, playLists.length);
            vod.vod_play_from = playSources.slice(0, n).join("$$$");
            vod.vod_play_url = playLists.slice(0, n).join("$$$");
        }
        return JSON.stringify({ list: [vod] });
    } catch (e) {
        console.error("detail error", e.message);
        return JSON.stringify({ list: [] });
    }
}

async function search(key, quick, pg) {
    pg = Number(pg) || 1;
    try {
        const kw = encodeURIComponent(key);
        let url;
        if (pg === 1) {
            url = `${HOST}/vodsearch/${kw}-------------/`;
        } else {
            url = `${HOST}/vodsearch/${kw}----------${pg}---/`;
        }
        const html = await request(url);
        if(!html) return JSON.stringify({ list:[], page:pg, pagecount:0, land:1, ratio:1.33 });
        const $ = cheerio.load(html);
        const videos = [];
        const items = $(".module-card-item").length ? $(".module-card-item") : $(".module-item");
        items.each((_, el) => {
            try {
                const $el = $(el);
                let $a = $el.find(".module-card-item-poster a").first();
                if (!$a.length) $a = $el.find(".module-card-item-title a").first();
                if (!$a.length) $a = $el.find("a").first();
                if (!$a.length) return;

                const href = text($a.attr("href"));
                if (!href.startsWith("/voddetail/")) return;

                let title = "";
                const t1 = $el.find(".module-card-item-title strong").first();
                const t2 = $el.find(".module-card-item-title a").first();
                if (t1.length) title = text(t1.text());
                else if (t2.length) title = text(t2.text());

                const $img = $el.find("img").first();
                if (!title && $img.length) title = text($img.attr("alt"));

                let pic = "";
                if ($img.length) {
                    pic = text($img.attr("data-original") || $img.attr("src"));
                }
                pic = urlJoin(HOST, pic);

                const $note = $el.find(".module-item-note").first();
                const remarks = text($note.text());

                videos.push({
                    vod_id: href,
                    vod_name: title,
                    vod_pic: pic,
                    vod_remarks: remarks,
                    style: { type: 'rect', ratio: 1.33 }
                });
            } catch (innerErr) {}
        });
        return JSON.stringify({
            list: videos,
            page: pg,
            pagecount: 999,
            land: 1,
            ratio: 1.33
        });
    } catch (e) {
        console.error("search error", e.message);
        return JSON.stringify({ list:[], page:pg, pagecount:0, land:1, ratio:1.33 });
    }
}

async function play(flag, id, flags) {
    try {
        const url = urlJoin(HOST, id);
        const html = await request(url);
        const reg = /var\s+player_aaaa\s*=\s*(\{.+?\})<\/script>/;
        const match = html.match(reg);
        if (match) {
            const playerData = safeJson(match[1]);
            if (playerData) {
                const realUrl = text(playerData.url || "");
                if (realUrl.endsWith(".m3u8") || realUrl.endsWith(".mp4")) {
                    // ✔带上防盗链Referer头，和py行为对齐
                    return JSON.stringify({
                        parse: 0,
                        url: realUrl,
                        header: DEFAULT_HEADERS
                    });
                }
            }
        }
        return JSON.stringify({ parse: 1, url: url, header: DEFAULT_HEADERS });
    } catch (e) {
        console.error("play error", e.message);
        return JSON.stringify({ parse: 1, url: id, header: {} });
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