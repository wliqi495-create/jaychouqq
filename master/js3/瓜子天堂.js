import { Crypto, _ } from 'assets://js/lib/cat.js';
let siteKey = '';
let siteType = 0;
let extendObj = {};

// =====================【必须修改为你自己部署的代理地址】=====================
const PROXY_BASE = "http://127.0.0.1:5000/api/gz";
// ==========================================================================

const UA = "Lavf/57.83.100";
const DEFAULT_PIC = "https://p.qqan.com/up/2021-1/16104169378734044.jpg";

async function request(url, optHeaders = {}, body) {
    try {
        const headers = Object.assign({}, { "User‑Agent": UA, "Content‑Type": "application/json" }, optHeaders || {});
        const res = await req(url, {
            method: body ? "POST" : "GET",
            headers: headers,
            timeout: 15000,
            data: JSON.stringify(body)
        });
        return res?.content ?? "";
    } catch (e) {
        console.error("proxy request error:", url, e?.message);
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

// 图片修复：补全协议，空图返回默认占位
function fixPicUrl(url) {
    url = text(url);
    if (!url) return DEFAULT_PIC;
    if (url.startsWith("//")) return "https:" + url;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return DEFAULT_PIC;
}

// 分类、筛选配置，完全复刻原Python脚本
const CLASSES_RAW = [
    { type_name: "电影", type_id: "1", land: 1, ratio: 1.33 },
    { type_name: "电视剧", type_id: "2", land: 1, ratio: 1.33 },
    { type_name: "动漫", type_id: "4", land: 1, ratio: 1.33 },
    { type_name: "综艺", type_id: "3", land: 1, ratio: 1.33 },
    { type_name: "短剧", type_id: "64", land: 1, ratio: 1.33 }
];

const FILTER_TPL = [
    {
        key: "area",
        name: "地区",
        value: [
            { n: "全部", v: "0" }, { n: "大陆", v: "大陆" }, { n: "香港", v: "香港" },
            { n: "台湾", v: "台湾" }, { n: "美国", v: "美国" }, { n: "韩国", v: "韩国" },
            { n: "日本", v: "日本" }, { n: "英国", v: "英国" }, { n: "法国", v: "法国" },
            { n: "泰国", v: "泰国" }, { n: "印度", v: "印度" }, { n: "其他", v: "其他" }
        ]
    },
    {
        key: "year",
        name: "年份",
        value: [
            { n: "全部", v: "0" }, { n: "2025", v: "2025" }, { n: "2024", v: "2024" },
            { n: "2023", v: "2023" }, { n: "2022", v: "2022" }, { n: "2021", v: "2021" },
            { n: "2020", v: "2020" }, { n: "2019", v: "2019" }, { n: "2018", v: "2018" },
            { n: "2017", v: "2017" }, { n: "2016", v: "2016" }, { n: "2015", v: "2015" },
            { n: "2014", v: "2014" }, { n: "2013", v: "2013" }, { n: "2012", v: "2012" },
            { n: "2011", v: "2011" }, { n: "2010", v: "2010" }, { n: "2009", v: "2009" },
            { n: "2008", v: "2008" }, { n: "2007", v: "2007" }, { n: "2006", v: "2006" },
            { n: "2005", v: "2005" }, { n: "更早", v: "2004" }
        ]
    },
    {
        key: "sort",
        name: "排序",
        value: [
            { n: "最新", v: "d_id" }, { n: "最热", v: "d_hits" }, { n: "推荐", v: "d_score" }
        ]
    }
];

async function init(cfg) {
    try {
        siteKey = cfg.skey;
        siteType = cfg.stype;
        const filterObj = {};
        for (const item of CLASSES_RAW) {
            filterObj[item.type_id] = [...FILTER_TPL];
        }
        extendObj = { classes: [...CLASSES_RAW], filter: filterObj };
    } catch (e) {
        console.error("init error", e.message);
        extendObj = { classes: [...CLASSES_RAW], filter: {} };
    }
}

function home(filter) {
    try {
        return JSON.stringify({
            class: extendObj.classes || CLASSES_RAW,
            filters: extendObj.filter || {}
        });
    } catch (e) {
        return JSON.stringify({ class: CLASSES_RAW, filters: {} });
    }
}

async function homeVod() {
    return JSON.stringify({ list: [] });
}

async function category(tid, pg, filter, ext) {
    pg = Number(pg) || 1;
    try {
        const body = {
            tid: tid,
            pg: pg,
            area: ext?.area ?? "0",
            year: ext?.year ?? "0",
            sort: ext?.sort ?? "d_id"
        };
        const respText = await request(`${PROXY_BASE}/category`, {}, body);
        const resData = safeJson(respText);
        if (!resData || !Array.isArray(resData.list)) {
            return JSON.stringify({ list: [], page: pg, pagecount: 0 });
        }
        const outList = [];
        for (const it of resData.list) {
            const payload = b64EncodeUtf8(JSON.stringify({ vodId: text(it.vod_id) }));
            outList.push({
                vod_id: payload,
                vod_name: text(it.vod_name),
                vod_pic: fixPicUrl(it.vod_pic),
                vod_remarks: text(it.vod_remarks),
                style: { type: 'rect', ratio: 1.33 }
            });
        }
        return JSON.stringify({
            list: outList,
            page: Number(resData.page || pg),
            pagecount: Number(resData.pagecount || 9999),
            limit: 30,
            total: 999999
        });
    } catch (e) {
        console.error("category error", e.message);
        return JSON.stringify({ list: [], page: pg, pagecount: 0 });
    }
}

async function search(key, quick, pg) {
    pg = Number(pg) || 1;
    try {
        const body = { key: key, pg: pg };
        const respText = await request(`${PROXY_BASE}/search`, {}, body);
        const resData = safeJson(respText);
        if (!resData || !Array.isArray(resData.list)) {
            return JSON.stringify({ list: [], page: pg, pagecount: 0, land:1, ratio:1.33 });
        }
        const outList = [];
        for (const it of resData.list) {
            const payload = b64EncodeUtf8(JSON.stringify({ vodId: text(it.vod_id) }));
            outList.push({
                vod_id: payload,
                vod_name: text(it.vod_name),
                vod_pic: fixPicUrl(it.vod_pic),
                vod_remarks: text(it.vod_remarks),
                style: { type: 'rect', ratio: 1.33 }
            });
        }
        return JSON.stringify({
            list: outList,
            page: pg,
            pagecount: Number(resData.pagecount || 9999),
            land:1,
            ratio:1.33
        });
    } catch (e) {
        console.error("search error", e.message);
        return JSON.stringify({ list: [], page: pg, pagecount:0, land:1, ratio:1.33 });
    }
}

async function detail(vodIdB64) {
    try {
        const raw = b64DecodeUtf8(vodIdB64);
        const meta = safeJson(raw);
        if (!meta || !meta.vodId) return JSON.stringify({ list: [] });
        const body = { vod_id: meta.vodId };
        const respText = await request(`${PROXY_BASE}/detail`, {}, body);
        const resData = safeJson(respText);
        if (!resData) return JSON.stringify({ list: [] });
        const vod = {
            vod_id: vodIdB64,
            vod_name: text(resData.vod_name),
            vod_pic: fixPicUrl(resData.vod_pic),
            vod_year: text(resData.vod_year),
            vod_area: text(resData.vod_area),
            vod_remarks: text(resData.vod_remarks),
            vod_actor: text(resData.vod_actor),
            vod_director: text(resData.vod_director),
            vod_content: text(resData.vod_content),
            vod_play_from: "瓜子影视",
            vod_play_url: text(resData.vod_play_url || "")
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
        if (!meta || !meta.vodId) {
            return JSON.stringify({ parse: 1, url: "", header: { "User‑Agent": UA } });
        }
        const body = { vod_id: meta.vodId, flag: flag };
        const respText = await request(`${PROXY_BASE}/play`, {}, body);
        const resData = safeJson(respText);
        const realUrl = text(resData?.url || "");
        if (realUrl) {
            return JSON.stringify({
                parse:0,
                url: realUrl,
                header: { "User‑Agent": UA, "Referer": "https://apinew.uozvr.com" }
            });
        } else {
            return JSON.stringify({ parse:1, url:"", header: { "User‑Agent": UA } });
        }
    } catch (e) {
        console.error("play error", e.message);
        return JSON.stringify({ parse:1, url:"", header: { "User‑Agent": UA } });
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