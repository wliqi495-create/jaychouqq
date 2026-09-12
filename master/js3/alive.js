import { Crypto, _ } from 'assets://js/lib/cat.js';
let siteKey = '';
let siteType = 0;

//复刻py cateManual 站点配置
const ALIST_SITES = [
    { "type_name": "🌊七米蓝", "type_id": "https://al.chirmyram.com" },
    { "type_name": "🐝组织云盘", "type_id": "https://w2.apachecn.org/" },
    { "type_name": "📽️网呢", "type_id": "https://pan.clun.top" },
    { "type_name": "✨亿苯正经", "type_id": "https://pan.lm379.cn" },
    { "type_name": "🐉神族九帝", "type_id": "https://alist.shenzjd.com" },
    { "type_name": "🍓趣盘", "type_id": "https://pan.mediy.cn/" }
];

const UA = "Mozilla/5.0 (Linux; Android 16; ELI‑AN00 Build/HONORELI‑AN00) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.7499.192 Mobile Safari/537.36";
const DEFAULT_HEADERS = { "User‑Agent": UA };

async function request(url, optHeaders = {}, body) {
    try {
        const headers = Object.assign({}, DEFAULT_HEADERS, optHeaders || {});
        const res = await req(url, {
            method: body ? "POST" : "GET",
            headers: headers,
            timeout: 10000,
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

//复刻py getSize 格式化文件大小
function getSize(sizeVal) {
    if (sizeVal == null) return "0B";
    try {
        let size = Number(sizeVal);
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        let n = 0;
        while (size >= 1024 && n < units.length - 1) {
            size /= 1024;
            n++;
        }
        return `${Number(size.toFixed(2))}${units[n]}`;
    } catch (e) {
        return "未知";
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

function home(filter) {
    try {
        const classArr = ALIST_SITES.map(item => {
            return {
                type_id: text(item.type_id),
                type_name: text(item.type_name),
                land: 1,
                ratio: 1.33
            };
        });
        return JSON.stringify({
            class: classArr,
            filters: {}
        });
    } catch (e) {
        console.error("home error", e.message);
        return JSON.stringify({ class: [], filters: {} });
    }
}

async function homeVod() {
    return JSON.stringify({ list: [] });
}

async function category(tid, pg, filter, ext) {
    pg = Number(pg) || 1;
    try {
        const tidRaw = text(tid);
        //提取host
        const hostReg = /(https?:\/\/[^/]+)/;
        const hostMatch = tidRaw.match(hostReg);
        if (!hostMatch) {
            return JSON.stringify({ list: [], page: pg, pagecount: 0, limit: 0, total: 0 });
        }
        const host = hostMatch[1];
        //提取path
        let path = tidRaw.replace(host, "").trim();
        if (!path.startsWith("/")) path = "/" + path;
        if (path.length > 1) path = path.rstrip("/");

        const hd = {
            "User‑Agent": UA,
            "Content‑Type": "application/json",
            "Referer": host + "/",
            "Origin": host,
            "Accept": "application/json"
        };
        const postBody = JSON.stringify({
            "path": path,
            "password": "",
            "page": pg,
            "per_page": 50
        });
        const apiUrl = host.replace(/\/$/, "") + "/api/fs/list";
        const respText = await request(apiUrl, hd, postBody);
        const jo = safeJson(respText);
        const videos = [];
        if (jo && jo.code === 200 && jo.data) {
            const dataObj = jo.data;
            const dataList = Array.isArray(dataObj.content) ? dataObj.content : [];
            for (const item of dataList) {
                if (!item) continue;
                const name = text(item.name || "未知");
                if (name.startsWith(".")) continue;
                const isDir = item.type === 1;
                //拼接新完整路径
                let newPath;
                if (path === "/") {
                    newPath = "/" + name;
                } else {
                    newPath = path + "/" + name;
                }
                const newTid = host + newPath;
                const remarks = isDir ? "文件夹" : getSize(item.size);
                videos.push({
                    vod_id: newTid,
                    vod_name: name,
                    vod_remarks: remarks,
                    vod_tag: isDir ? "folder" : "",
                    vod_pic: "",
                    style: { type: 'rect', ratio: 1.33 }
                });
            }
        }
        return JSON.stringify({
            list: videos,
            page: pg,
            pagecount: 999,
            limit: 50,
            total: videos.length
        });
    } catch (e) {
        console.error("category error", e.message);
        return JSON.stringify({ list: [], page: pg, pagecount: 0, limit: 0, total: 0 });
    }
}

async function detail(vodIdRaw) {
    try {
        const id = text(vodIdRaw);
        let name = id.split('/').pop();
        name = decodeURIComponent(text(name));
        const vod = {
            vod_id: id,
            vod_name: name,
            vod_pic: "",
            vod_year: "",
            vod_area: "",
            vod_actor: "",
            vod_director: "",
            vod_content: "",
            vod_play_from: "Alist",
            vod_play_url: `${name}$${id}`
        };
        return JSON.stringify({ list: [vod] });
    } catch (e) {
        console.error("detail error", e.message);
        return JSON.stringify({ list: [] });
    }
}

async function play(flag, id, flags) {
    try {
        const playId = text(id);
        const hostReg = /(https?:\/\/[^/]+)/;
        const hostMatch = playId.match(hostReg);
        if (!hostMatch) {
            return JSON.stringify({ parse: 0, url: playId, header: { "User‑Agent": UA } });
        }
        const host = hostMatch[1];
        let path = playId.replace(host, "").trim();
        if (!path.startsWith("/")) path = "/" + path;

        const hd = {
            "User‑Agent": UA,
            "Content‑Type": "application/json",
            "Referer": host + "/"
        };
        const postBody = JSON.stringify({
            "path": path,
            "password": ""
        });
        const apiUrl = host.replace(/\/$/, "") + "/api/fs/get";
        const respText = await request(apiUrl, hd, postBody);
        const jo = safeJson(respText);
        let outUrl = playId;
        let outHeader = { "User‑Agent": UA };
        if (jo && jo.code === 200 && jo.data) {
            const data = jo.data;
            outUrl = text(data.raw_url || "");
            if (outUrl.startsWith("/")) {
                outUrl = host.replace(/\/$/, "") + outUrl;
            }
            const provider = text(data.provider || "");
            if (provider.includes("Baidu")) {
                outHeader = { "User‑Agent": "pan.baidu.com" };
            }
        }
        return JSON.stringify({
            parse: 0,
            url: outUrl,
            header: outHeader
        });
    } catch (e) {
        console.error("play error", e.message);
        return JSON.stringify({ parse: 1, url: id, header: { "User‑Agent": UA } });
    }
}

async function search(key, quick, pg) {
    pg = Number(pg) || 1;
    try {
        return JSON.stringify({
            list: [],
            page: pg,
            pagecount: 0,
            land: 1,
            ratio: 1.33
        });
    } catch (e) {
        console.error("search error", e.message);
        return JSON.stringify({ list: [], page: pg, pagecount: 0, land: 1, ratio: 1.33 });
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