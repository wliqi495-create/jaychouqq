import { Crypto, _ } from 'assets://js/lib/cat.js';
let siteKey = '';
let siteType = 0;
const HOST = "https://api.bilibili.com";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36";
const DEFAULT_HEADERS = {
    "User-Agent": UA,
    "Accept": "*/*",
    "Referer": "https://www.bilibili.com/"
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
    } catch (e) {
        return "";
    }
}

function safeJson(str) {
    try {
        if (!str) return null;
        return JSON.parse(str);
    } catch (e) {
        console.error("safeJson parse error", e.message);
        return null;
    }
}

function fixPicUrl(url) {
    if (!url) return '';
    url = url.trim();
    if (url.startsWith('http')) return url;
    if (url.startsWith('//')) return `https:${url}`;
    return `https://${url}`;
}

// 分类配置 复刻py cateManual
const BILI_CLASSES = [
    { type_id: "movie", type_name: "电影", land: 1, ratio: 1.33 },
    { type_id: "tv", type_name: "电视剧", land: 1, ratio: 1.33 },
    { type_id: "variety", type_name: "综艺", land: 1, ratio: 1.33 },
    { type_id: "anime", type_name: "动漫", land: 1, ratio: 1.33 },
    { type_id: "documentary", type_name: "纪录片", land: 1, ratio: 1.33 }
];

// 筛选配置，复刻py config.filter
const BILI_FILTER = {
    "movie": [
        {"key":"area","name":"地区","value":[{"n":"全部","v":""},{"n":"内地","v":"内地"},{"n":"香港","v":"香港"},{"n":"台湾","v":"台湾"},{"n":"日本","v":"日本"},{"n":"美国","v":"美国"}]},
        {"key":"year","name":"年份","value":[{"n":"全部","v":""},{"n":"2025","v":"2025"},{"n":"2024","v":"2024"},{"n":"2023","v":"2023"},{"n":"2022","v":"2022"},{"n":"2021","v":"2021"}]}
    ],
    "tv": [
        {"key":"area","name":"地区","value":[{"n":"全部","v":""},{"n":"内地","v":"内地"},{"n":"香港","v":"香港"},{"n":"台湾","v":"台湾"},{"n":"韩国","v":"韩国"},{"n":"日本","v":"日本"}]},
        {"key":"year","name":"年份","value":[{"n":"全部","v":""},{"n":"2025","v":"2025"},{"n":"2024","v":"2024"},{"n":"2023","v":"2023"}]}
    ],
    "variety": [
        {"key":"area","name":"地区","value":[{"n":"全部","v":""},{"n":"内地","v":"内地"},{"n":"台湾","v":"台湾"},{"n":"欧美","v":"欧美"}]},
        {"key":"year","name":"年份","value":[{"n":"全部","v":""},{"n":"2025","v":"2025"},{"n":"2024","v":"2024"}]}
    ],
    "anime": [
        {"key":"area","name":"地区","value":[{"n":"全部","v":""},{"n":"日本","v":"日本"},{"n":"国产","v":"国产"},{"n":"欧美","v":"欧美"}]},
        {"key":"year","name":"年份","value":[{"n":"全部","v":""},{"n":"2025","v":"2025"},{"n":"2024","v":"2024"}]}
    ],
    "documentary": [
        {"key":"area","name":"地区","value":[{"n":"全部","v":""},{"n":"内地","v":"内地"},{"n":"海外","v":"海外"}]},
        {"key":"year","name":"年份","value":[{"n":"全部","v":""},{"n":"2025","v":"2025"},{"n":"2024","v":"2024"}]}
    ]
};

let extendObj = { classes: [...BILI_CLASSES], filter: BILI_FILTER };

async function init(cfg) {
    try {
        siteKey = cfg.skey;
        siteType = cfg.stype;
        extendObj = { classes: [...BILI_CLASSES], filter: BILI_FILTER };
    } catch (e) {
        console.error("init error", e.message);
        extendObj = { classes: [...BILI_CLASSES], filter: BILI_FILTER };
    }
}

function home(filter) {
    try {
        return JSON.stringify({ class: extendObj.classes, filters: extendObj.filter });
    } catch (e) {
        return JSON.stringify({ class: BILI_CLASSES, filters: BILI_FILTER });
    }
}

async function homeVod() {
    try {
        // 首页取电影分类第一页作为首页推荐，复刻py逻辑
        const url = `${HOST}/x/web-interface/newlist?rid=2&pn=1&ps=20`;
        const resp = await request(url);
        const jo = safeJson(resp);
        const list = [];
        if (jo && jo.data && Array.isArray(jo.data.archives)) {
            for (const item of jo.data.archives) {
                const title = (item.title || "").trim();
                const pic = fixPicUrl(item.pic || "");
                const bvid = item.bvid || "";
                const remarks = item.pubdate ? new Date(item.pubdate * 1000).getFullYear().toString() : "";
                if (!bvid || !title) continue;
                list.push({
                    vod_id: bvid,
                    vod_name: title,
                    vod_pic: pic,
                    vod_remarks: remarks,
                    style: { type: 'rect', ratio: 1.33 }
                });
            }
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
        let rid = 2;
        if (tid === "movie") rid = 2;
        else if (tid === "tv") rid = 11;
        else if (tid === "variety") rid = 13;
        else if (tid === "anime") rid = 1;
        else if (tid === "documentary") rid = 177;

        const ps = 20;
        let url = `${HOST}/x/web-interface/newlist?rid=${rid}&pn=${pg}&ps=${ps}`;
        // 拼接筛选参数，只拼接非空值
        const qs = [];
        if (ext?.area) qs.push(`area=${encodeURIComponent(ext.area)}`);
        if (ext?.year) qs.push(`year=${encodeURIComponent(ext.year)}`);
        if (qs.length > 0) url += "&" + qs.join("&");

        const resp = await request(url);
        const jo = safeJson(resp);
        const list = [];
        if (jo && jo.data && Array.isArray(jo.data.archives)) {
            for (const item of jo.data.archives) {
                const title = (item.title || "").trim();
                const pic = fixPicUrl(item.pic || "");
                const bvid = item.bvid || "";
                const remarks = item.pubdate ? new Date(item.pubdate * 1000).getFullYear().toString() : "";
                if (!bvid || !title) continue;
                list.push({
                    vod_id: bvid,
                    vod_name: title,
                    vod_pic: pic,
                    vod_remarks: remarks,
                    style: { type: 'rect', ratio: 1.33 }
                });
            }
        }
        const pagecount = list.length >= ps ? 99 : pg;
        return JSON.stringify({
            list,
            page: pg,
            pagecount: pagecount,
            limit: ps,
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
        const ps = 20;
        const pn = pg;
        const url = `${HOST}/x/web-interface/search/all?keyword=${kw}&pn=${pn}&ps=${ps}`;
        const resp = await request(url);
        const jo = safeJson(resp);
        const list = [];
        if (jo && jo.data && jo.data.result && Array.isArray(jo.data.result.video)) {
            for (const item of jo.data.result.video) {
                const title = (item.title || "").replace(/<[^>]+>/g, "").trim();
                const pic = fixPicUrl(item.pic || "");
                const bvid = item.bvid || "";
                const remarks = item.pubdate ? new Date(item.pubdate * 1000).getFullYear().toString() : "";
                if (!bvid || !title) continue;
                list.push({
                    vod_id: bvid,
                    vod_name: title,
                    vod_pic: pic,
                    vod_remarks: remarks,
                    style: { type: 'rect', ratio: 1.33 }
                });
            }
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
        return JSON.stringify({ list: [], page: pg, pagecount: 0, land:1, ratio:1.33 });
    }
}

async function detail(vodId) {
    try {
        const bvid = vodId;
        const infoUrl = `${HOST}/x/web-interface/view?bvid=${bvid}`;
        const resp = await request(infoUrl);
        const jo = safeJson(resp);
        if (!jo || !jo.data) return JSON.stringify({ list: [] });
        const d = jo.data;
        const vod = {
            vod_id: bvid,
            vod_name: (d.title || "").trim(),
            vod_pic: fixPicUrl(d.pic || ""),
            vod_year: d.pubdate ? new Date(d.pubdate *1000).getFullYear().toString() : "",
            vod_area: "",
            vod_remarks: d.owner?.name || "",
            vod_actor: d.owner?.name || "",
            vod_director: "",
            vod_content: (d.desc || "").trim(),
            vod_play_from: "哔哩影视",
            vod_play_url: ""
        };
        const pages = d.pages || [];
        const playArr = [];
        for (const p of pages) {
            const cid = p.cid;
            const part = (p.part || `P${p.page}`).trim();
            playArr.push(`${part}$${b64EncodeUtf8(JSON.stringify({bvid:bvid,cid:cid}))}`);
        }
        vod.vod_play_url = playArr.join("#");
        return JSON.stringify({ list:[vod] });
    } catch (e) {
        console.error("detail error", e.message);
        return JSON.stringify({ list: [] });
    }
}

async function play(flag, id, flags) {
    try {
        const raw = b64DecodeUtf8(id||"");
        const playObj = safeJson(raw);
        if (!playObj || !playObj.bvid || !playObj.cid) {
            return JSON.stringify({ parse:1, url:"", header:{"User-Agent":UA,"Referer":"https://www.bilibili.com/"} });
        }
        // 复刻py：获取playurl
        const playUrlApi = `https://api.bilibili.com/x/player/playurl?bvid=${playObj.bvid}&cid=${playObj.cid}&qn=64`;
        const resp = await request(playUrlApi);
        const jo = safeJson(resp);
        let realUrl = "";
        if (jo && jo.data && jo.data.durl && jo.data.durl.length>0) {
            realUrl = jo.data.durl[0].url || "";
        }
        if (realUrl) {
            return JSON.stringify({
                parse:0,
                url: realUrl,
                header: {
                    "User-Agent": UA,
                    "Referer": "https://www.bilibili.com/"
                }
            });
        } else {
            return JSON.stringify({
                parse:1,
                url:"",
                header:{"User-Agent":UA,"Referer":"https://www.bilibili.com/"}
            });
        }
    } catch(e) {
        console.error("play error",e.message);
        return JSON.stringify({ parse:1, url:"", header:{"User-Agent":UA} });
    }
}

export function __jsEvalReturn() {
    return {
        init,
        home,
        homeVod,
        category,
        search,
        detail,
        play
    };
}
//（注：内容由AI生成）
