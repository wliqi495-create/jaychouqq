import { Crypto, _ } from 'assets://js/lib/cat.js';
let siteKey = '';
let siteType = 0;

const HOST = "http://www.guangbomi.com";
const UA = "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Mobile Safari/537.36";
const DEFAULT_HEADERS = {
    "User-Agent": UA,
    "Referer": HOST,
    "Accept-Language": "zh-CN,zh;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
};

// 分类定义 type_id必须和filters的key完全对应
const CATEGORIES = [
    { type_id: "live", type_name: "听广播", land: 1, ratio: 1.33 },
    { type_id: "tv", type_name: "看电视", land: 1, ratio: 1.33 }
];

// 筛选配置
const RAW_FILTERS = {
    "live": [{
        key: "cateId",
        name: "按类型",
        value: [
            { n: "新闻综合", v: "fmlist20" },
            { n: "交通", v: "fmlist58" },
            { n: "音乐", v: "fmlist57" },
            { n: "经济", v: "fmlist56" },
            { n: "生活", v: "fmlist59" },
            { n: "文艺", v: "fmlist60" },
            { n: "都市", v: "fmlist61" },
            { n: "故事", v: "fmlist62" },
            { n: "旅游", v: "fmlist63" },
            { n: "乡村", v: "fmlist64" },
            { n: "娱乐", v: "fmlist65" },
            { n: "戏曲", v: "fmlist66" },
            { n: "体育", v: "fmlist67" },
            { n: "评书相声", v: "fmlist69" },
            { n: "青少科教", v: "fmlist70" },
            { n: "网络台", v: "fmlist113" },
            { n: "汽车", v: "fmlist134" },
            { n: "其他", v: "fmlist135" }
        ]
    }],
    "tv": [{
        key: "cateId",
        name: "按类型",
        value: [
            { n: "卫视台", v: "tvlist200" },
            { n: "省台", v: "tvlist220" },
            { n: "市台", v: "tvlist221" },
            { n: "区县台", v: "tvlist222" },
            { n: "新闻综合", v: "tvlist201" },
            { n: "财经", v: "tvlist202" },
            { n: "综艺", v: "tvlist203" },
            { n: "体育", v: "tvlist204" },
            { n: "影视", v: "tvlist205" },
            { n: "公共", v: "tvlist206" },
            { n: "都市", v: "tvlist207" },
            { n: "少儿", v: "tvlist208" },
            { n: "科教", v: "tvlist209" },
            { n: "记录", v: "tvlist211" },
            { n: "动漫", v: "tvlist212" },
            { n: "生活", v: "tvlist213" },
            { n: "法制", v: "tvlist214" },
            { n: "军事", v: "tvlist215" },
            { n: "文旅", v: "tvlist216" },
            { n: "农科", v: "tvlist217" },
            { n: "数字电视", v: "tvlist218" }
        ]
    }]
};

// ===================== 工具函数（原样复制123ttv.js） =====================
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

/** 正则提取第一个匹配 */
function reSearch(text, regStr, idx = 1, def = "") {
    const reg = new RegExp(regStr, "s");
    const m = reg.exec(text);
    return m ? (m[idx] || def).trim() : def;
}

/** 全局匹配返回全部数组 */
function reMatchAll(text, regStr) {
    const arr = [];
    const reg = new RegExp(regStr, "gs");
    let m;
    while ((m = reg.exec(text)) !== null) {
        arr.push(m);
    }
    return arr;
}

/** html清理 */
function htmlClean(txt) {
    if (!txt) return "";
    return txt.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

// ===================== CAT标准接口 =====================
async function init(cfg) {
    try {
        siteKey = cfg.skey;
        siteType = cfg.stype;
    } catch (e) {
        console.error("init error", e.message);
    }
}

function home(filter) {
    try {
        // 【修复】动态返回，filters key和class的type_id一一对应，CAT才能正常渲染筛选UI
        return JSON.stringify({
            class: CATEGORIES,
            filters: RAW_FILTERS
        });
    } catch (e) {
        return JSON.stringify({ class: CATEGORIES, filters: {} });
    }
}

async function homeVod() {
    try {
        const html = await request(`${HOST}`);
        const matches = reMatchAll(html, /<a[^>]+href="(\/[^"]+\.html)"[^>]*>[\s\S]*?<img[^>]+class="radio‑icon"[^>]+alt="([^"]+)"/gs);
        const list = [];
        for (const m of matches) {
            const href = m[1];
            const title = htmlClean(m[2]);
            if (!href || !title) continue;
            list.push({
                vod_id: b64EncodeUtf8(href),
                vod_name: title,
                vod_pic: "",
                vod_remarks: "",
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
        //【修复】兼容ext为字符串，解析失败赋空对象
        let extObj;
        if(typeof ext === "string"){
            extObj = safeJson(ext);
            if(!extObj) extObj = {};
        }else{
            extObj = ext || {};
        }
        // 默认分类值，live默认fmlist20 tv默认tvlist201
        let cateId = extObj.cateId ?? (tid === "live" ? "fmlist20" : "tvlist201");
        let url = `${HOST}/fyfilter.html?page=fypage&cateId=${encodeURIComponent(cateId)}&fypage=${pg}`;
        const html = await request(url);
        const matches = reMatchAll(html, /<a[^>]+href="(\/[^"]+\.html)"[^>]*>[\s\S]*?<img[^>]+class="radio‑icon"[^>]+alt="([^"]+)"/gs);
        const list = [];
        for (const m of matches) {
            const href = m[1];
            const title = htmlClean(m[2]);
            if (!href || !title) continue;
            list.push({
                vod_id: b64EncodeUtf8(href),
                vod_name: title,
                vod_pic: "",
                vod_remarks: "",
                style: { type: 'rect', ratio: 1.33 }
            });
        }
        return JSON.stringify({
            list,
            page: pg,
            pagecount: 999,
            limit: 20,
            total: 99999
        });
    } catch (e) {
        console.error("category error", e.message);
        return JSON.stringify({ list: [], page: pg, pagecount: 0, limit: 20, total: 0 });
    }
}

async function detail(vodId) {
    try {
        const rawPath = b64DecodeUtf8(vodId || "");
        if (!rawPath) return JSON.stringify({ list: [] });
        const pageUrl = fixPicUrl(rawPath);
        const html = await request(pageUrl);
        const title = htmlClean(reSearch(html, /<h1>([^<]+)<\/h1>/));
        const desc = htmlClean(reSearch(html, /<div class="ax‑des[^"]*">([\s\S]*?)<\/div>/s));
        const iframeSrc = reSearch(html, /<iframe[^>]+src="([^"]+)"/);
        let playItem = "";
        if (iframeSrc) {
            playItem = `${title || "播放"}$${b64EncodeUtf8(iframeSrc)}`;
        }
        const vod = {
            vod_id: vodId,
            vod_name: title || "未知电台",
            vod_pic: "",
            vod_year: "",
            vod_area: "",
            vod_remarks: "",
            vod_actor: "",
            vod_director: "",
            vod_content: desc,
            vod_play_from: "广播迷FM",
            vod_play_url: playItem
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
        const kw = String(key || "").trim();
        if (!kw) return JSON.stringify({ list: [], page: pg, pagecount: 0, land: 1, ratio: 1.33 });
        const url = `${HOST}/index.php?m=search&c=index&a=init&siteid=1&typeid=54&q=${encodeURIComponent(kw)}&page=fypage&fypage=${pg}`;
        const html = await request(url);
        const matches = reMatchAll(html, /<a[^>]+href="(\/[^"]+\.html)"[^>]*>[\s\S]*?<img[^>]+class="radio‑icon"[^>]+alt="([^"]+)"/gs);
        const list = [];
        for (const m of matches) {
            const href = m[1];
            const title = htmlClean(m[2]);
            if (!href || !title) continue;
            list.push({
                vod_id: b64EncodeUtf8(href),
                vod_name: title,
                vod_pic: "",
                vod_remarks: "",
                style: { type: 'rect', ratio: 1.33 }
            });
        }
        return JSON.stringify({
            list,
            page: pg,
            pagecount: 999,
            limit: 20,
            total: 99999,
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
        let iframeRaw = b64DecodeUtf8(id || "");
        if (!iframeRaw) {
            return JSON.stringify({ parse: 1, url: "", header: DEFAULT_HEADERS });
        }
        let iframeUrl = iframeRaw.startsWith("http") ? iframeRaw : fixPicUrl(iframeRaw);
        const iframeHtml = await request(iframeUrl);
        let realPlayUrl = reSearch(iframeHtml, /\.playcode&&iframe&&src="([^"]+)"/);
        if (!realPlayUrl) {
            realPlayUrl = reSearch(iframeHtml, /src="(https?:\/\/[^"]+\.(m3u8|mp3|flv))"/);
        }
        if (realPlayUrl) {
            if(realPlayUrl.startsWith("/")) realPlayUrl = fixPicUrl(realPlayUrl);
            return JSON.stringify({
                parse: 0,
                url: realPlayUrl,
                header: {
                    "User‑Agent": UA,
                    "Referer": iframeUrl
                }
            });
        }
        return JSON.stringify({
            parse: 1,
            url: iframeUrl,
            header: {
                "User‑Agent": UA,
                "Referer": HOST
            }
        });
    } catch (e) {
        console.error("play error", e.message);
        return JSON.stringify({ parse: 1, url: "", header: DEFAULT_HEADERS });
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
