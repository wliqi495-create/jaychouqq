import { Crypto, _ } from 'assets://js/lib/cat.js';
let siteKey = '';
let siteType = 0;
let extendObj = {};
// 内存缓存：分类解析结果
const categoryCache = {};

// 内置直播源配置
const LIVS_SOURCES = [
    {
        "name": "👖裤佬TV直播",
        "url": "https://live.445569.xyz/live.m3u"
    },
    {
        "name": "👖潇雨TV直播",
        "url": "https://0701.tv1288.xyz/m3u"
    },
    {
        "name": "👖日后TV直播",
        "url": "http://rihou.cc:555/gggg.nzk"
    },
    {
        "name": "👖涛涛TV直播",
        "url": "https://445569.pages.dev/https://raw.githubusercontent.com/taoBox2620/taoBox2620/refs/heads/main/logo1.png"
    },
    {
        "name": "👖华视TV直播",
        "url": "https://445569.pages.dev/https://raw.githubusercontent.com/swhtv/111/refs/heads/main/华视box华视大全swtv"
    },
    {
        "name": "👖易发TV直播",
        "url": "https://445569.pages.dev/https://raw.githubusercontent.com/fafa002/yf2025/refs/heads/main/yiyifafa.txt"
    },
    {
        "name": "👖土耳其TV直播",
        "url": "https://445569.pages.dev/https://raw.githubusercontent.com/nigelhayes11/temp/refs/heads/main/MAN%20NORMAL%20TV%202025.m3u"
    },
    {
        "name": "👖俄罗斯TV直播",
        "url": "https://ilook.epg.one/5CM5SY98BF24PL/2"
    },
    {
        "name": "👖全球TV直播",
        "url": "https://seep.eu.org/iptv-org.github.io/iptv/index.m3u"
    }
];

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const DEFAULT_HEADERS = { "User‑Agent": UA };
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

/**
 * 解析m3u文本，输出频道数组 [{name,url}]
 */
function parseM3u(content) {
    const list = [];
    const reg = /#EXTINF:-?\d+[^,]*?,(.+?)\r?\n([htrv][^ \r\n]+)/g;
    let m;
    while ((m = reg.exec(content)) !== null) {
        const name = text(m[1]);
        const url = text(m[2]);
        if (name && url && /^(http|rtmp|rtsp)/.test(url)) {
            list.push({ name, url });
        }
    }
    return list;
}

async function init(cfg) {
    try {
        siteKey = cfg.skey;
        siteType = cfg.stype;
        const classes = [];
        for (const item of LIVS_SOURCES) {
            classes.push({
                type_id: `${item.name}$$$${item.url}`,
                type_name: item.name,
                land: 1,
                ratio: 1.33
            });
        }
        extendObj = { classes, filter: {} };
    } catch (e) {
        console.error("init error", e.message);
        extendObj = { classes: [], filter: {} };
    }
}

function home(filter) {
    try {
        return JSON.stringify({
            class: extendObj.classes || [],
            filters: extendObj.filter || {}
        });
    } catch (e) {
        return JSON.stringify({ class: [], filters: {} });
    }
}

async function homeVod() {
    // 直播源无首页推荐
    return JSON.stringify({ list: [] });
}

async function category(tid, pg, filter, ext) {
    pg = Number(pg) || 1;
    try {
        // tid格式：名称$$$url
        const spl = tid.split("$$$");
        if (spl.length < 2) return JSON.stringify({ list: [], page: pg, pagecount: 0 });
        const m3uUrl = spl[1];
        const cacheKey = tid;

        let channelList = [];
        if (categoryCache[cacheKey]) {
            channelList = categoryCache[cacheKey];
        } else {
            const resp = await request(m3uUrl);
            channelList = parseM3u(resp);
            categoryCache[cacheKey] = channelList;
        }

        const outList = [];
        for (const ch of channelList) {
            const payload = b64EncodeUtf8(JSON.stringify({ liveUrl: ch.url }));
            outList.push({
                vod_id: payload,
                vod_name: text(ch.name),
                vod_pic: DEFAULT_PIC,
                vod_remarks: "直播",
                style: { type: 'rect', ratio: 1.33 }
            });
        }
        return JSON.stringify({
            list: outList,
            page: pg,
            pagecount: pg + 1,
            limit: 50,
            total: outList.length
        });
    } catch (e) {
        console.error("category error", e.message);
        return JSON.stringify({ list: [], page: pg, pagecount: 0 });
    }
}

async function detail(vodIdB64) {
    try {
        const raw = b64DecodeUtf8(vodIdB64);
        const meta = safeJson(raw);
        if (!meta || !meta.liveUrl) return JSON.stringify({ list: [] });

        const vod = {
            vod_id: vodIdB64,
            vod_name: "直播频道",
            vod_pic: DEFAULT_PIC,
            vod_year: "",
            vod_area: "",
            vod_remarks: "直播源",
            vod_actor: "",
            vod_director: "",
            vod_content: "直播频道",
            vod_play_from: "直播",
            vod_play_url: `直播$${vodIdB64}`
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
        if (!meta || !meta.liveUrl) {
            return JSON.stringify({ parse: 1, url: "", header: { "User‑Agent": UA } });
        }
        return JSON.stringify({
            parse: 0,
            url: meta.liveUrl,
            header: { "User‑Agent": UA }
        });
    } catch (e) {
        console.error("play error", e.message);
        return JSON.stringify({ parse: 1, url: "", header: { "User‑Agent": UA } });
    }
}

async function search(key, quick, pg) {
    // 直播源不做搜索
    return JSON.stringify({
        list: [],
        page: pg,
        pagecount: 0,
        land: 1,
        ratio: 1.33
    });
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