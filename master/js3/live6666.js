import { Crypto, _ } from 'assets://js/lib/cat.js';
let siteKey = '';
let siteType = 0;

// 内置直播源配置
const LIVS_SOURCES = [
    {
        "name": "裤佬TV直播",
        "url": "https://live.445569.xyz/live.m3u"
    },
    {
        "name": "潇雨TV直播",
        "url": "https://0701.tv1288.xyz/m3u"
    },
    {
        "name": "日后TV直播",
        "url": "http://rihou.cc:555/gggg.nzk"
    },
    {
        "name": "涛涛TV直播",
        "url": "https://445569.pages.dev/https://raw.githubusercontent.com/taoBox2620/taoBox2620/refs/heads/main/logo1.png"
    },
    {
        "name": "华视TV直播",
        "url": "https://445569.pages.dev/https://raw.githubusercontent.com/swhtv/111/refs/heads/main/华视box华视大全swtv"
    },
    {
        "name": "易发TV直播",
        "url": "https://445569.pages.dev/https://raw.githubusercontent.com/fafa002/yf2025/refs/heads/main/yiyifafa.txt"
    },
    {
        "name": "土耳其TV直播",
        "url": "https://445569.pages.dev/https://raw.githubusercontent.com/nigelhayes11/temp/refs/heads/main/MAN%20NORMAL%20TV%202025.m3u"
    },
    {
        "name": "俄罗斯TV直播",
        "url": "https://ilook.epg.one/5CM5SY98BF24PL/2"
    },
    {
        "name": "全球TV直播",
        "url": "https://seep.eu.org/iptv-org.github.io/iptv/index.m3u"
    }
];

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const DEFAULT_HEADERS = { "User-Agent": UA };
const DEFAULT_PIC = "https://p.qqan.com/up/2021-1/16104169378734044.jpg";

// 兼容版请求函数，手动处理302重定向
async function request(url, optHeaders, body) {
    optHeaders = optHeaders || {};
    body = body || "";
    try {
        const headers = Object.assign({}, DEFAULT_HEADERS, optHeaders);
        let res = await req(url, {
            method: body ? "POST" : "GET",
            headers: headers,
            timeout: 20000,
            data: body
        });
        // 处理302重定向
        if (res && res.headers && res.headers.location) {
            var loc = text(res.headers.location);
            if (loc && loc.indexOf("http") === 0) {
                console.log("redirect to:", loc);
                res = await req(loc, {
                    method: "GET",
                    headers: headers,
                    timeout: 20000
                });
            }
        }
        return res && res.content ? res.content : "";
    } catch (e) {
        console.error("request error:", url, e && e.message);
        return "";
    }
}

function b64EncodeUtf8(str) {
    try {
        return Crypto.enc.Base64.stringify(Crypto.enc.Utf8.parse(str || ""));
    } catch (err) {
        console.error("b64EncodeUtf8 error", err);
        return "";
    }
}

function b64DecodeUtf8(b64) {
    try {
        return Crypto.enc.Utf8.stringify(Crypto.enc.Base64.parse(b64 || ""));
    } catch (e) {
        console.error("b64DecodeUtf8 error", e);
        return "";
    }
}

function safeJson(str) {
    try {
        if (!str) return null;
        return JSON.parse(str);
    } catch (e) {
        console.error("safeJson parse fail", e);
        return null;
    }
}

function text(v) {
    return String(v == null ? "" : v).trim();
}

// 增强M3U解析，兼容各类换行格式
function parseM3u(content) {
    var list = [];
    if (!content) return list;
    var txt = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    var lines = txt.split("\n");
    var channelName = "";
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (line.indexOf("#EXTINF") === 0) {
            var idx = line.lastIndexOf(",");
            if (idx !== -1) {
                channelName = line.slice(idx + 1).trim();
            }
        } else if (line && line.indexOf("#") !== 0 && channelName) {
            if (/^(http|rtmp|rtsp)/.test(line)) {
                list.push({ name: channelName, url: line });
            }
            channelName = "";
        }
    }
    return list;
}

async function init(cfg) {
    try {
        siteKey = cfg.skey;
        siteType = cfg.stype;
    } catch (e) {
        console.error("init error", e && e.message);
    }
}

function home(filter) {
    try {
        var classes = [];
        for (var i = 0; i < LIVS_SOURCES.length; i++) {
            var item = LIVS_SOURCES[i];
            var jsonStr = JSON.stringify({ srcName: item.name, srcUrl: item.url });
            var tid = b64EncodeUtf8(jsonStr);
            classes.push({
                type_id: tid,
                type_name: item.name,
                land: 1,
                ratio: 1.33
            });
        }
        return JSON.stringify({
            class: classes,
            filters: {}
        });
    } catch (e) {
        console.error("home error", e && e.message);
        return JSON.stringify({ class: [], filters: {} });
    }
}

async function homeVod() {
    return JSON.stringify({ list: [] });
}

async function category(tid, pg, filter, ext) {
    pg = Number(pg) || 1;
    try {
        var raw = b64DecodeUtf8(tid);
        var meta = safeJson(raw);
        if (!meta || !meta.srcUrl) {
            console.warn("category: tid parse fail", tid);
            return JSON.stringify({ list: [], page: pg, pagecount: 0 });
        }
        var m3uUrl = meta.srcUrl;
        console.log("category fetch m3u:", m3uUrl);

        var resp = await request(m3uUrl);
        if (!resp) {
            console.warn("m3u empty", m3uUrl);
            return JSON.stringify({ list: [], page: pg, pagecount: 0 });
        }
        var channelList = parseM3u(resp);
        console.log("parsed channels:", channelList.length);

        var outList = [];
        for (var j = 0; j < channelList.length; j++) {
            var ch = channelList[j];
            var payload = b64EncodeUtf8(JSON.stringify({ liveUrl: ch.url }));
            outList.push({
                vod_id: payload,
                vod_name: text(ch.name),
                vod_pic: DEFAULT_PIC,
                vod_remarks: "直播",
                style: { type: "rect", ratio: 1.33 }
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
        console.error("category error", e && e.message);
        return JSON.stringify({ list: [], page: pg, pagecount: 0 });
    }
}

async function detail(vodIdB64) {
    try {
        var raw = b64DecodeUtf8(vodIdB64);
        var meta = safeJson(raw);
        if (!meta || !meta.liveUrl) return JSON.stringify({ list: [] });

        var vod = {
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
            vod_play_url: "直播$" + vodIdB64
        };
        return JSON.stringify({ list: [vod] });
    } catch (e) {
        console.error("detail error", e && e.message);
        return JSON.stringify({ list: [] });
    }
}

async function play(flag, idB64, flags) {
    try {
        var raw = b64DecodeUtf8(idB64 || "");
        var meta = safeJson(raw);
        if (!meta || !meta.liveUrl) {
            return JSON.stringify({ parse: 1, url: "", header: { "User-Agent": UA } });
        }
        return JSON.stringify({
            parse: 0,
            url: meta.liveUrl,
            header: { "User-Agent": UA }
        });
    } catch (e) {
        console.error("play error", e && e.message);
        return JSON.stringify({ parse: 1, url: "", header: { "User-Agent": UA } });
    }
}

async function search(key, quick, pg) {
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
        init: init,
        home: home,
        homeVod: homeVod,
        category: category,
        detail: detail,
        search: search,
        play: play
    };
}
