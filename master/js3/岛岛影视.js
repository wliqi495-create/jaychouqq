import { Crypto, _ } from 'assets://js/lib/cat.js';
let siteKey = '';
let siteType = 0;
let HOST = "https://323433ssdfd.top";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36";

const X_CLIENT = "8f3d2a1c7b6e5d4c9a0b1f2e3d4c5b6a";
const WEB_SIGN = "ddtvf65f3a83d6d9ad6f";
const _FINGER = "WF-2c064bc5b3400788f31b848849bc3a60f835423ba2dfe69d7ea93974c216e4f2";
const _AID = "com.web.player";
const _SK = "WEB-50a8e9c84a1dc05669a692ded99a2dac46527229e607a7be15db88dbc59059d1";

const DEFAULT_HEADERS = {
    "User-Agent": UA,
    "Accept": "application/json",
    "X-Client": X_CLIENT,
    "web-sign": WEB_SIGN,
    "Referer": HOST + "/",
    "Origin": HOST
};

async function request(url, optHeaders = {}, postBody = null) {
    try {
        const headers = Object.assign({}, DEFAULT_HEADERS, optHeaders);
        const opts = {
            method: postBody ? "POST" : "GET",
            headers: headers,
            timeout: 15000
        };
        if (postBody) opts.body = postBody;
        const res = await req(url, opts);
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
        console.error("safeJson parse", e.message);
        return null;
    }
}

function fixPicUrl(url) {
    if (!url) return '';
    url = url.trim();
    if (url.startsWith('http')) return url;
    if (url.startsWith('//')) return `https:${url}`;
    return HOST + "/" + url;
}

let extendObj = { classes: [], filter: {} };
let _typeMap = {};
const BLOCKED_SOURCES = new Set(["qsvip", "RE蓝光", "qq", "qiyi", "youku", "mgtv", "bilibili"]);

async function init(cfg) {
    try {
        siteKey = cfg.skey;
        siteType = cfg.stype;
        if (cfg?.extend) {
            const ext = safeJson(cfg.extend);
            if (ext?.host) HOST = ext.host.rstrip("/");
        }
        extendObj = { classes: [], filter: {} };
        _typeMap = {};
    } catch (e) {
        console.error("init error", e.message);
    }
}

function buildFilters() {
    return {
        "1": [
            {"key":"class","name":"类型","value":[{"n":"全部","v":""},{"n":"动作","v":"动作"},{"n":"喜剧","v":"喜剧"},{"n":"爱情","v":"爱情"},{"n":"科幻","v":"科幻"},{"n":"恐怖","v":"恐怖"},{"n":"悬疑","v":"悬疑"},{"n":"犯罪","v":"犯罪"},{"n":"战争","v":"战争"}]},
            {"key":"area","name":"地区","value":[{"n":"全部","v":""},{"n":"内地","v":"内地"},{"n":"香港","v":"香港"},{"n":"台湾","v":"台湾"},{"n":"日本","v":"日本"},{"n":"韩国","v":"韩国"},{"n":"美国","v":"美国"}]},
            {"key":"year","name":"年份","value":[{"n":"全部","v":""},{"n":"2025","v":"2025"},{"n":"2024","v":"2024"},{"n":"2023","v":"2023"}]}
        ]
    };
}

// 数组转vod对象
function arr2vods(arr) {
    const list = [];
    if (!Array.isArray(arr)) return list;
    for (const item of arr) {
        const vodId = String(item.vod_id || "");
        const name = (item.vod_name || "").trim();
        if (!vodId || !name) continue;
        list.push({
            vod_id: vodId,
            vod_name: name,
            vod_pic: fixPicUrl(item.vod_pic || ""),
            vod_remarks: (item.vod_remarks || "").trim(),
            style: { type: 'rect', ratio: 1.33 }
        });
    }
    return list;
}

async function home(filter) {
    try {
        const respText = await request(`${HOST}/api.php/web/index/home`);
        const jo = safeJson(respText);
        if (!jo || !jo.data) {
            return JSON.stringify({ class: [], filters: {} });
        }
        const data = jo.data;
        const categories = data.categories || [];
        const clsList = [];
        _typeMap = {};
        for (const cat of categories) {
            const tid = String(cat.type_id || "");
            const tname = (cat.type_name || "").trim();
            if (!tid || !tname) continue;
            _typeMap[tid] = tname;
            clsList.push({ type_id: tid, type_name: tname, land:1, ratio:1.33 });
        }
        extendObj.classes = clsList;
        extendObj.filter = buildFilters();
        return JSON.stringify({ class: clsList, filters: extendObj.filter });
    } catch (e) {
        console.error("home error", e.message);
        return JSON.stringify({ class: [], filters: {} });
    }
}

async function homeVod() {
    try {
        const respText = await request(`${HOST}/api.php/web/index/home`);
        const jo = safeJson(respText);
        if (!jo || !jo.data) return JSON.stringify({ list: [] });
        const categories = jo.data.categories || [];
        let allVods = [];
        for (const cat of categories) {
            const videos = cat.videos || [];
            allVods = allVods.concat(arr2vods(videos));
        }
        return JSON.stringify({ list: allVods.slice(0,30) });
    } catch (e) {
        console.error("homeVod error", e.message);
        return JSON.stringify({ list: [] });
    }
}

async function category(tid, pg, filter, ext) {
    pg = Number(pg) || 1;
    try {
        const qs = [];
        qs.push(`type_id=${encodeURIComponent(tid)}`);
        qs.push(`page=${pg}`);
        qs.push("page_size=24");
        if(ext?.class) qs.push(`class=${encodeURIComponent(ext.class)}`);
        if(ext?.area) qs.push(`area=${encodeURIComponent(ext.area)}`);
        if(ext?.year) qs.push(`year=${encodeURIComponent(ext.year)}`);
        const url = `${HOST}/api.php/web/filter/vod?${qs.join("&")}`;
        const respText = await request(url);
        const jo = safeJson(respText);
        if (!jo || !jo.data) {
            return JSON.stringify({ list:[], page:pg, pagecount:0 });
        }
        const vodList = arr2vods(jo.data.list || []);
        const pc = jo.data.page_count ? Number(jo.data.page_count) : 1;
        return JSON.stringify({
            list: vodList,
            page: pg,
            pagecount: pc,
            limit:24,
            total:9999
        });
    } catch (e) {
        console.error("category error", e.message);
        return JSON.stringify({ list:[], page:pg, pagecount:0 });
    }
}

async function search(key, quick, pg) {
    pg = Number(pg) || 1;
    try {
        const kw = encodeURIComponent(key);
        const url = `${HOST}/api.php/web/search/index?keyword=${kw}&page=${pg}&page_size=24`;
        const respText = await request(url);
        const jo = safeJson(respText);
        if (!jo || !jo.data) {
            return JSON.stringify({ list:[], page:pg, pagecount:0, land:1, ratio:1.33 });
        }
        const vodList = arr2vods(jo.data.list || []);
        const pc = jo.data.page_count ? Number(jo.data.page_count) : 1;
        return JSON.stringify({
            list: vodList,
            page: pg,
            pagecount: pc,
            land:1,
            ratio:1.33
        });
    } catch (e) {
        console.error("search error", e.message);
        return JSON.stringify({ list:[], page:pg, pagecount:0, land:1, ratio:1.33 });
    }
}

async function detail(vodId) {
    try {
        const url = `${HOST}/api.php/web/vod/get_detail?vod_id=${encodeURIComponent(vodId)}`;
        const respText = await request(url);
        const jo = safeJson(respText);
        if (!jo || !jo.data) return JSON.stringify({ list: [] });
        const d = jo.data;
        const vod = {
            vod_id: String(d.vod_id || vodId),
            vod_name: (d.vod_name || "").trim(),
            vod_pic: fixPicUrl(d.vod_pic || ""),
            vod_year: (d.vod_year || "").trim(),
            vod_area: (d.vod_area || "").trim(),
            vod_remarks: (d.vod_remarks || "").trim(),
            vod_actor: (d.vod_actor || "").trim(),
            vod_director: (d.vod_director || "").trim(),
            vod_content: (d.vod_content || "").trim(),
            vod_play_from: "",
            vod_play_url: ""
        };
        const sourceList = d.source_list || [];
        const fromArr = [];
        const urlArr = [];
        for(const src of sourceList){
            const sName = (src.source_name || "").trim();
            const sCode = (src.source_code || "").trim();
            if(BLOCKED_SOURCES.has(sCode) || BLOCKED_SOURCES.has(sName)) continue;
            const epList = src.episode_list || [];
            const epOut = [];
            for(const ep of epList){
                const epName = (ep.episode_name || "").trim();
                //携带：source_code + episode_id，base64传给play
                const pack = JSON.stringify({sc:sCode, eid:ep.episode_id});
                epOut.push(`${epName}$${b64EncodeUtf8(pack)}`);
            }
            if(epOut.length>0){
                fromArr.push(sName);
                urlArr.push(epOut.join("#"));
            }
        }
        vod.vod_play_from = fromArr.join("$$$");
        vod.vod_play_url = urlArr.join("$$$");
        return JSON.stringify({ list:[vod] });
    } catch (e) {
        console.error("detail error", e.message);
        return JSON.stringify({ list: [] });
    }
}

/**
 * ⚠️cat.js环境限制！！
 * 原py播放逻辑：protobuf二进制POST /api.php/web/decode/url，需要os.urandom(16)随机字节；
 * cat.js没有安全真随机字节API，无法生成原始pb请求，不能实现原解密流程。
 * 此处仅做占位，返回parse:1提示环境限制。
 */
async function play(flag, id, flags) {
    try {
        const rawPack = b64DecodeUtf8(id || "");
        const packObj = safeJson(rawPack);
        if(!packObj || !packObj.sc || !packObj.eid){
            return JSON.stringify({ parse:1, url:"", header:{"User-Agent":UA,"Referer":HOST} });
        }
        console.log("多多影视：cat.js环境缺少随机字节，protobuf解密接口无法调用，源站播放不可用");
        return JSON.stringify({
            parse: 1,
            url: "",
            header: { "User-Agent": UA, "Referer": HOST }
        });
    } catch(e){
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
        detail,
        search,
        play
    };
}
//（注：内容由AI生成）
