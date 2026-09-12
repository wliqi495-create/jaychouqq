import { Crypto, _ } from 'assets://js/lib/cat.js';
let siteKey = '';
let siteType = 0;
let extendObj = {};

// 内置嗅探解析接口列表
const PARSE_SERVERS = [
    {
        "name": "💕分享者嗅探",
        "type": 0,
        "url": "shturl.cc/SYA6TB0xvjcz6R8a9ywVg6rM"
    },
    {
        "name": "💕分享者嗅探*",
        "type": 0,
        "url": "http://154.44.26.196/player/qu.php?v="
    },
    {
        "name": "💝分享者解析-",
        "type": 0,
        "url": "https://jx.2s0.cn/player/?url="
    }
];

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const DEFAULT_HEADERS = {
    "User‑Agent": UA,
    "Accept": "*/*"
};

// 源后端接口域名（原混淆脚本提取）
const API_HOST = "http://cj.tianwe.cn";

async function request(url, optHeaders = {}, body) {
    try {
        const headers = Object.assign({}, DEFAULT_HEADERS, optHeaders || {});
        const res = await req(url, {
            method: body ? "POST" : "GET",
            headers: headers,
            timeout: 18000,
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

function text(value) {
    return String(value == null ? "" : value).trim();
}

// 轮询嗅探接口解析播放链接
async function tryParseVideo(playPageUrl) {
    for (const item of PARSE_SERVERS) {
        try {
            const parseUrl = item.url + encodeURIComponent(playPageUrl);
            const resp = await request(parseUrl);
            const json = safeJson(resp);
            // 适配常见嗅探返回格式
            let realUrl = "";
            if (json) {
                realUrl = text(json.url || json.data || json.playurl || json.vurl || "");
            }
            if (!realUrl) {
                // 正则从html抓取mp4/m3u8
                const reg = /https?:\/\/[^"'<> ]+\.(m3u8|mp4)(\?[^"']*)?/i;
                const m = resp.match(reg);
                if (m) realUrl = m[0];
            }
            if (realUrl) {
                return realUrl;
            }
        } catch (err) {
            console.error("parse server fail", item.name, err.message);
            continue;
        }
    }
    return "";
}

async function init(cfg) {
    try {
        siteKey = cfg.skey;
        siteType = cfg.stype;
        // 分类定义 qq、爱奇艺、优酷、腾讯、b站
        const classesRaw = [
            { type_id: "qq", type_name: "腾讯", land: 1, ratio: 1.33 },
            { type_id: "iqiyi", type_name: "爱奇艺", land: 1, ratio: 1.33 },
            { type_id: "youku", type_name: "优酷", land: 1, ratio: 1.33 },
            { type_id: "tencent", type_name: "腾讯视频", land: 1, ratio: 1.33 },
            { type_id: "bilibili", type_name: "B站", land: 1, ratio: 1.33 }
        ];
        // 筛选配置
        const filterObj = {
            "qq": [
                {
                    key: "cate",
                    name: "类型",
                    value: [
                        { n: "全部", v: "" },
                        { n: "电视剧", v: "2" },
                        { n: "电影", v: "1" },
                        { n: "动漫", v: "4" },
                        { n: "综艺", v: "3" },
                        { n: "少儿", v: "5" },
                        { n: "纪录片", v: "6" },
                        { n: "短剧", v: "7" }
                    ]
                },
                {
                    key: "year",
                    name: "年份",
                    value: [
                        { n: "全部", v: "" },
                        { n: "2026", v: "2026" },
                        { n: "2025", v: "2025" },
                        { n: "2024", v: "2024" },
                        { n: "2023", v: "2023" },
                        { n: "2022", v: "2022" }
                    ]
                }
            ],
            "iqiyi": [
                {
                    key: "cate",
                    name: "类型",
                    value: [
                        { n: "全部", v: "" },
                        { n: "电视剧", v: "2" },
                        { n: "电影", v: "1" },
                        { n: "动漫", v: "4" },
                        { n: "综艺", v: "3" },
                        { n: "少儿", v: "5" },
                        { n: "纪录片", v: "6" },
                        { n: "短剧", v: "7" }
                    ]
                }
            ],
            "youku": [
                {
                    key: "cate",
                    name: "类型",
                    value: [
                        { n: "全部", v: "" },
                        { n: "电视剧", v: "2" },
                        { n: "电影", v: "1" },
                        { n: "动漫", v: "4" },
                        { n: "综艺", v: "3" }
                    ]
                }
            ],
            "tencent": [
                {
                    key: "cate",
                    name: "类型",
                    value: [
                        { n: "全部", v: "" },
                        { n: "电视剧", v: "2" },
                        { n: "电影", v: "1" },
                        { n: "动漫", v: "4" }
                    ]
                }
            ],
            "bilibili": [
                {
                    key: "cate",
                    name: "类型",
                    value: [
                        { n: "全部", v: "" },
                        { n: "番剧", v: "1" },
                        { n: "纪录片", v: "2" },
                        { n: "综艺", v: "3" }
                    ]
                }
            ]
        };
        extendObj = { classes: classesRaw, filter: filterObj };
    } catch (e) {
        console.error("init error", e.message);
        extendObj = {
            classes: [
                { type_id: "qq", type_name: "腾讯", land: 1, ratio: 1.33 }
            ],
            filter: {}
        };
    }
}

function home(filter) {
    try {
        return JSON.stringify({
            class: extendObj.classes || [],
            filters: extendObj.filter || {}
        });
    } catch (e) {
        return JSON.stringify({
            class: [{ type_id: "qq", type_name: "腾讯", land: 1, ratio: 1.33 }],
            filters: {}
        });
    }
}

async function homeVod() {
    // 原脚本无首页推荐，返回空列表
    return JSON.stringify({ list: [] });
}

async function category(tid, pg, filter, ext) {
    pg = Number(pg) || 1;
    try {
        const cate = ext?.cate || "";
        const year = ext?.year || "";
        let url = `${API_HOST}/api/category?platform=${encodeURIComponent(tid)}&page=${pg}`;
        if (cate) url += `&cate=${encodeURIComponent(cate)}`;
        if (year) url += `&year=${encodeURIComponent(year)}`;
        const resp = await request(url);
        const json = safeJson(resp);
        const listRaw = Array.isArray(json?.list) ? json.list : [];
        const list = [];
        for (const item of listRaw) {
            const vodIdPayload = b64EncodeUtf8(JSON.stringify({
                plat: tid,
                vid: text(item.vid || ""),
                playUrl: text(item.play_url || "")
            }));
            list.push({
                vod_id: vodIdPayload,
                vod_name: text(item.title || ""),
                vod_pic: text(item.pic || ""),
                vod_remarks: text(item.remarks || ""),
                style: { type: 'rect', ratio: 1.33 }
            });
        }
        const pagecount = list.length >= 15 ? pg + 1 : pg;
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
        const url = `${API_HOST}/api/search?keyword=${encodeURIComponent(key)}&page=${pg}`;
        const resp = await request(url);
        const json = safeJson(resp);
        const listRaw = Array.isArray(json?.list) ? json.list : [];
        const list = [];
        for (const item of listRaw) {
            const vodIdPayload = b64EncodeUtf8(JSON.stringify({
                plat: text(item.platform || ""),
                vid: text(item.vid || ""),
                playUrl: text(item.play_url || "")
            }));
            list.push({
                vod_id: vodIdPayload,
                vod_name: text(item.title || ""),
                vod_pic: text(item.pic || ""),
                vod_remarks: text(item.remarks || ""),
                style: { type: 'rect', ratio: 1.33 }
            });
        }
        const pagecount = list.length >= 15 ? pg + 1 : pg;
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
        if (!meta || !meta.vid) return JSON.stringify({ list: [] });
        const url = `${API_HOST}/api/detail?vid=${encodeURIComponent(meta.vid)}&platform=${encodeURIComponent(meta.plat || "")}`;
        const resp = await request(url);
        const json = safeJson(resp);
        const data = json?.data;
        if (!data) return JSON.stringify({ list: [] });
        const vod = {
            vod_id: vodIdB64,
            vod_name: text(data.title || ""),
            vod_pic: text(data.pic || ""),
            vod_year: text(data.year || ""),
            vod_area: text(data.area || ""),
            vod_remarks: text(data.remarks || ""),
            vod_actor: text(data.actor || ""),
            vod_director: text(data.director || ""),
            vod_content: text(data.desc || ""),
            vod_play_from: text(meta.plat || "parse"),
            vod_play_url: ""
        };
        const playList = [];
        const episodes = Array.isArray(data.episodes) ? data.episodes : [];
        for (let idx = 0; idx < episodes.length; idx++) {
            const ep = episodes[idx];
            const epName = text(ep.name || `第${idx + 1}集`);
            const pageLink = text(ep.play_page || meta.playUrl || "");
            const playPayload = b64EncodeUtf8(JSON.stringify({
                playPageUrl: pageLink
            }));
            playList.push(`${epName}$${playPayload}`);
        }
        vod.vod_play_url = playList.join("#");
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
        if (!meta || !meta.playPageUrl) {
            return JSON.stringify({ parse: 1, url: "", header: { "User‑Agent": UA } });
        }
        const playPage = text(meta.playPageUrl);
        // 使用内置3个嗅探接口轮询解析
        const realVideoUrl = await tryParseVideo(playPage);
        if (realVideoUrl) {
            return JSON.stringify({
                parse: 0,
                url: realVideoUrl,
                header: {
                    "User‑Agent": UA,
                    "Referer": playPage
                }
            });
        } else {
            // 全部解析接口失败，降级parse=1网页嗅探
            return JSON.stringify({
                parse: 1,
                url: playPage,
                header: {
                    "User‑Agent": UA,
                    "Referer": playPage
                }
            });
        }
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