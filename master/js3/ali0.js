import { Crypto, _ } from 'assets://js/lib/cat.js';
let siteKey = '';
let siteType = 0;

// Alist站点列表，网上公开站点随时失效
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

async function request(url, optHeaders = {}, bodyObj) {
    try {
        const headers = Object.assign({}, DEFAULT_HEADERS, optHeaders || {});
        let body = null;
        if (bodyObj) {
            body = JSON.stringify(bodyObj);
            headers["Content‑Type"] = "application/json";
        }
        console.log("[Alist] request url =", url);
        const res = await req(url, {
            method: body ? "POST" : "GET",
            headers: headers,
            timeout: 12000,
            data: body
        });
        const content = res?.content ?? "";
        console.log("[Alist] resp =", content.substring(0,600));
        return content;
    } catch (e) {
        console.error("[Alist] request error:", url, e?.message);
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
    } catch (e) {
        console.error("[Alist] json parse error");
        return null;
    }
}
function text(v) {
    return String(v == null ? "" : v).trim();
}

// 文件大小格式化
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
        const hostReg = /(https?:\/\/[^/]+)/;
        const hostMatch = tidRaw.match(hostReg);
        if (!hostMatch) {
            return JSON.stringify({ list: [], page: pg, pagecount: 0, limit: 0, total: 0 });
        }
        const host = hostMatch[1];
        let path = tidRaw.replace(host, "").trim();
        if (!path.startsWith("/")) path = "/"+path;
        if (path.length>1) path = path.rstrip("/");

        // 删除Origin！Origin会触发alist v3跨域拦截
        const hd = {
            "User‑Agent": UA,
            "Referer": host + "/",
            "Accept": "application/json"
        };
        // per_page=0：alist api文档代表返回全部，规避50限制[[(AList)]](https://alist.nn.ci/guide/api/fs?f_link_type=f_linkinlinenote&flow_extra=eyJpbmxpbmVfZGlzcGxheV9wb3NpdGlvbiI6MCwiZG9jX3Bvc2l0aW9uIjowLCJkb2NfaWQiOiIxZGQzMmExYmM1NGZlMzE0LTc5YWUzZmY4NmM3ZTJhYTkifQ%3D%3D "(AList)")
        const postBodyObj = {
            "path": path,
            "password": "",
            "page": pg,
            "per_page": 0
        };
        const apiUrl = host.replace(/\/$/, "") + "/api/fs/list";
        const respText = await request(apiUrl, hd, postBodyObj);
        const jo = safeJson(respText);
        const videos = [];

        if (!jo) {
            return JSON.stringify({ list: [], page: pg, pagecount: 0, limit: 0, total: 0 });
        }
        if (jo.code !== 200) {
            console.log("[Alist] api code error code=",jo.code,"msg=",jo.message);
            return JSON.stringify({ list: [], page: pg, pagecount: 0, limit: 0, total: 0 });
        }

        // 兼容两种返回格式：1.data:{content:[...]}  2.data直接是数组
        let dataList = [];
        if(jo.data){
            if(Array.isArray(jo.data)){
                dataList = jo.data;
            }else if(Array.isArray(jo.data.content)){
                dataList = jo.data.content;
            }
        }

        for (const item of dataList) {
            if (!item) continue;
            const name = text(item.name || "未知");
            if (name.startsWith(".")) continue;
            const isDir = !!item.is_dir;

            let newPath;
            if(path === "/"){
                newPath = "/"+name;
            }else{
                newPath = path + "/" + name;
            }
            const newTid = host + newPath;
            const remarks = isDir ? "📂文件夹" : getSize(item.size);

            videos.push({
                vod_id: newTid,
                vod_name: name,
                vod_remarks: remarks,
                vod_pic: "",
                style: { type: 'rect', ratio: 1.33 }
            });
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
        if (!path.startsWith("/")) path = "/"+path;

        const hd = {
            "User‑Agent": UA,
            "Referer": host + "/"
        };
        const postBodyObj = {
            "path": path,
            "password": ""
        };
        const apiUrl = host.replace(/\/$/, "") + "/api/fs/get";
        const respText = await request(apiUrl, hd, postBodyObj);
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