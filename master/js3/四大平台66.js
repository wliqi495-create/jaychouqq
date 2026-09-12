import { Crypto, _ } from 'assets://js/lib/cat.js';
let siteKey = '';
let siteType = 0;
let extendObj = {};

// 内置嗅探解析接口列表
const PARSE_SERVERS = [
    {
        "name": "💕分享者嗅探",
        "type": 0,
        "url": "shturl.cc/bYteQtzjqePe8Qw5hlQ1SiM4"
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
    "User-Agent": UA,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
};

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

function fixPic(url) {
    url = text(url);
    if (!url) return "";
    if (url.startsWith("//")) return "https:" + url;
    if (url.startsWith("http")) return url;
    return "";
}

// 轮询嗅探接口解析播放链接
async function tryParseVideo(playPageUrl) {
    for (const item of PARSE_SERVERS) {
        try {
            const parseUrl = item.url + encodeURIComponent(playPageUrl);
            const resp = await request(parseUrl);
            const json = safeJson(resp);
            let realUrl = "";
            if (json) {
                realUrl = text(json.url || json.data || json.playurl || json.vurl || "");
            }
            if (!realUrl) {
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

// 平台网页url模板
const PLATFORM_URL_MAP = {
    "qq": "https://v.qq.com/x/list/movie?cate=$CATE&year=$YEAR&page=$PAGE",
    "iqiyi": "https://www.iqiyi.com/lib/m_$CATE____$PAGE.html",
    "youku": "https://list.youku.com/category/show/c_$CATE_s_1_d_1_p_$PAGE.html",
    "tencent": "https://v.qq.com/x/list/movie?cate=$CATE&year=$YEAR&page=$PAGE",
    "bilibili": "https://search.bilibili.com/all?keyword=$CATE&page=$PAGE"
};

// --------------------网页解析正则配置--------------------
const PLATFORM_REG = {
    qq: {
        item: /<div class="list_item".*?href="([^"]+)".*?title="([^"]+)".*?data-src="([^"]+)"/gs,
        titleIdx: 2,
        picIdx:3,
        linkIdx:1
    },
    iqiyi: {
        item: /<div class="qy-mod-item".*?href="([^"]+)".*?title="([^"]+)".*?data-original="([^"]+)"/gs,
        titleIdx:2,
        picIdx:3,
        linkIdx:1
    },
    youku: {
        item: /<li class="item".*?href="([^"]+)".*?title="([^"]+)".*?data-src="([^"]+)"/gs,
        titleIdx:2,
        picIdx:3,
        linkIdx:1
    },
    tencent: {
        item: /<div class="list_item".*?href="([^"]+)".*?title="([^"]+)".*?data-src="([^"]+)"/gs,
        titleIdx:2,
        picIdx:3,
        linkIdx:1
    },
    bilibili: {
        item: /<div class="bili-video-card".*?href="([^"]+)".*?alt="([^"]+)".*?data-src="([^"]+)"/gs,
        titleIdx:2,
        picIdx:3,
        linkIdx:1
    }
};

async function init(cfg) {
    try {
        siteKey = cfg.skey;
        siteType = cfg.stype;
        const classesRaw = [
            { type_id: "qq", type_name: "腾讯", land: 1, ratio: 1.33 },
            { type_id: "iqiyi", type_name: "爱奇艺", land: 1, ratio: 1.33 },
            { type_id: "youku", type_name: "优酷", land: 1, ratio: 1.33 },
            { type_id: "tencent", type_name: "腾讯视频", land: 1, ratio: 1.33 },
            { type_id: "bilibili", type_name: "B站", land: 1, ratio: 1.33 }
        ];
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
    return JSON.stringify({ list: [] });
}

async function category(tid, pg, filter, ext) {
    pg = Number(pg) || 1;
    try {
        const cate = ext?.cate || "";
        const year = ext?.year || "";
        const tpl = PLATFORM_URL_MAP[tid];
        const regCfg = PLATFORM_REG[tid];
        if (!tpl || !regCfg) return JSON.stringify({ list: [], page: pg, pagecount: 0 });

        let pageUrl = tpl.replace(/\$CATE/g, encodeURIComponent(cate)).replace(/\$YEAR/g, encodeURIComponent(year)).replace(/\$PAGE/g, String(pg));
        const html = await request(pageUrl);
        const list = [];
        let match;
        while ((match = regCfg.item.exec(html)) !== null) {
            const link = fixPic(match[regCfg.linkIdx]);
            const title = text(match[regCfg.titleIdx]);
            const pic = fixPic(match[regCfg.picIdx]);
            if (!link || !title) continue;
            const payload = b64EncodeUtf8(JSON.stringify({
                plat: tid,
                playPageUrl: link
            }));
            list.push({
                vod_id: payload,
                vod_name: title,
                vod_pic: pic,
                vod_remarks: tid,
                style: { type: 'rect', ratio: 1.33 }
            });
            if(list.length >=25) break;
        }
        const pagecount = list.length > 0 ? pg + 1 : pg;
        return JSON.stringify({
            list,
            page: pg,
            pagecount: pagecount,
            limit:25,
            total:9999
        });
    } catch (e) {
        console.error("category error", e.message);
        return JSON.stringify({ list: [], page: pg, pagecount: 0 });
    }
}

async function search(key, quick, pg) {
    pg = Number(pg) || 1;
    try {
        // 默认使用B站搜索页面做演示，可自行切换其他平台
        const pageUrl = `https://search.bilibili.com/all?keyword=${encodeURIComponent(key)}&page=${pg}`;
        const regCfg = PLATFORM_REG.bilibili;
        const html = await request(pageUrl);
        const list = [];
        let match;
        while ((match = regCfg.item.exec(html)) !== null) {
            const link = fixPic(match[regCfg.linkIdx]);
            const title = text(match[regCfg.titleIdx]);
            const pic = fixPic(match[regCfg.picIdx]);
            if (!link || !title) continue;
            const payload = b64EncodeUtf8(JSON.stringify({
                plat: "bilibili",
                playPageUrl: link
            }));
            list.push({
                vod_id: payload,
                vod_name: title,
                vod_pic: pic,
                vod_remarks: "搜索结果",
                style: { type: 'rect', ratio: 1.33 }
            });
            if(list.length >=25) break;
        }
        const pagecount = list.length>0 ? pg+1 : pg;
        return JSON.stringify({
            list,
            page:pg,
            pagecount:pagecount,
            land:1,
            ratio:1.33
        });
    } catch(e){
        console.error("search error",e.message);
        return JSON.stringify({ list:[], page:pg, pagecount:0, land:1, ratio:1.33 });
    }
}

async function detail(vodIdB64) {
    try {
        const raw = b64DecodeUtf8(vodIdB64);
        const meta = safeJson(raw);
        if (!meta || !meta.playPageUrl) return JSON.stringify({ list: [] });
        const vod = {
            vod_id: vodIdB64,
            vod_name: "解析播放",
            vod_pic: "",
            vod_year: "",
            vod_area: "",
            vod_remarks: meta.plat || "",
            vod_actor: "",
            vod_director: "",
            vod_content: "源为网页嗅探源，点击集数调用第三方解析接口。\n原始页面："+meta.playPageUrl,
            vod_play_from: "嗅探",
            vod_play_url: ""
        };
        const playList = [];
        const epPayload = b64EncodeUtf8(JSON.stringify({ playPageUrl: meta.playPageUrl }));
        playList.push(`播放$${epPayload}`);
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
            return JSON.stringify({ parse: 1, url: "", header: { "User-Agent": UA } });
        }
        const playPage = text(meta.playPageUrl);
        const realVideoUrl = await tryParseVideo(playPage);
        if (realVideoUrl) {
            return JSON.stringify({
                parse: 0,
                url: realVideoUrl,
                header: {
                    "User-Agent": UA,
                    "Referer": playPage
                }
            });
        } else {
            return JSON.stringify({
                parse: 1,
                url: playPage,
                header: {
                    "User-Agent": UA,
                    "Referer": playPage
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