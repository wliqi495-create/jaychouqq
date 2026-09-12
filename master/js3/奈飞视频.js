import { Crypto, _ } from 'assets://js/lib/cat.js';
let siteKey = '';
let siteType = 0;

const HOST = "https://www.netflixgc.com";
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const DEFAULT_HEADERS = {
    "User-Agent": UA,
    "Referer": HOST
};
const AJAX_HEADERS = {
    "User-Agent": UA,
    "Referer": HOST,
    "Accept": "application/json, text/javascript, */*",
    "X-Requested-With": "XMLHttpRequest"
};

// 分类映射
const CAT_MAP = {
    '1': '电影',
    '2': '连续剧',
    '3': '漫剧',
    '23': '综艺',
    '24': '纪录片',
    '57': '直播'
};

// 兜底首页静态数据
const _HOME_VIDEOS = [
    {"vod_id": "119709", "vod_name": "EinSommerinItalien", "vod_pic": "https://img.picbf.com/upload/vod/20260713-1/e1b9fe99ca9869df16890f886128462f.jpg", "vod_remarks": ""},
    {"vod_id": "119111", "vod_name": "孤单又灿烂的神：鬼怪十周年特辑", "vod_pic": "https://img.picbf.com/upload/vod/20260706-1/a1b2c3d4e5f6.jpg", "vod_remarks": ""},
    {"vod_id": "82500", "vod_name": "追寻幽灵大象", "vod_pic": "https://img.picbf.com/upload/vod/20260309-1/16ee74cb46b50561.jpg", "vod_remarks": "更新至HD"},
    {"vod_id": "120047", "vod_name": "蚌家镇怪谈", "vod_pic": "", "vod_remarks": ""},
    {"vod_id": "119214", "vod_name": "非演员", "vod_pic": "", "vod_remarks": ""},
];

// 详情内存缓存 key:vodId
const _DETAILS = {};

// ================= 工具函数（来自123ttv.js） =================
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
    // 百度图片跳转链接提取真实url
    if (url.startsWith("https://image.baidu.com/search/down?url=")) {
        const m = url.match(/url=(https?:[^&]+)/);
        if (m) url = decodeURIComponent(m[1]);
    }
    if (url.startsWith('http')) return url;
    if (url.startsWith('//')) return `https:${url}`;
    return `${HOST}/${url}`;
}

function reSearch(text, regStr, idx = 1, def = "") {
    const reg = new RegExp(regStr, "s");
    const m = reg.exec(text);
    return m ? (m[idx] || def).trim() : def;
}

function reMatchAll(text, regStr) {
    const arr = [];
    const reg = new RegExp(regStr, "gs");
    let m;
    while ((m = reg.exec(text)) !== null) {
        arr.push(m);
    }
    return arr;
}

/** 双重url解码，对应py unquote两次 */
function doubleUrlDecode(s) {
    try {
        return decodeURIComponent(decodeURIComponent(s));
    } catch (e) {
        return s;
    }
}

/** 提取player_aaaa对象，处理js大括号嵌套 */
function extractPlayerAaaa(html) {
    const idx = html.indexOf("var player_aaaa");
    if (idx < 0) return null;
    const start = html.indexOf("{", idx);
    let depth = 0;
    let end = start;
    for (let i = 0; i < html.slice(start).length; i++) {
        const c = html[start + i];
        if (c === '{') depth++;
        else if (c === '}') {
            depth--;
            if (depth === 0) {
                end = start + i + 1;
                break;
            }
        }
    }
    const sub = html.slice(start, end);
    try {
        return JSON.parse(sub);
    } catch (e) {
        return null;
    }
}

// ================= 分类&筛选配置 =================
function getClassList() {
    const arr = [];
    for (const [tid, name] of Object.entries(CAT_MAP)) {
        arr.push({ type_id: tid, type_name: name, land: 1, ratio: 1.33 });
    }
    return arr;
}

function getFilterObj() {
    const filterItem = [
        {
            key: "area",
            name: "地区",
            value: [
                { n: "全部", v: "" },
                { n: "中国大陆", v: "中国大陆" },
                { n: "美国", v: "美国" },
                { n: "日本", v: "日本" },
                { n: "韩国", v: "韩国" },
                { n: "英国", v: "英国" }
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
        },
        {
            key: "by",
            name: "排序",
            value: [
                { n: "时间", v: "time" },
                { n: "人气", v: "hits" },
                { n: "评分", v: "score" }
            ]
        }
    ];
    const filters = {};
    for (const tid of Object.keys(CAT_MAP)) {
        filters[tid] = filterItem;
    }
    return filters;
}

let extendObj = { classes: getClassList(), filter: getFilterObj() };

async function init(cfg) {
    try {
        siteKey = cfg.skey;
        siteType = cfg.stype;
        extendObj = { classes: getClassList(), filter: getFilterObj() };
    } catch (e) {
        console.error("init error", e.message);
        extendObj = { classes: getClassList(), filter: getFilterObj() };
    }
}

function home(filter) {
    try {
        return JSON.stringify({
            class: extendObj.classes,
            filters: extendObj.filter
        });
    } catch (e) {
        return JSON.stringify({ class: getClassList(), filters: {} });
    }
}

async function homeVod() {
    try {
        const ajaxUrl = `${HOST}/index.php/ajax/data?mid=1&page=1&limit=20`;
        const respText = await request(ajaxUrl, AJAX_HEADERS);
        const data = safeJson(respText);
        let list = [];
        if (data && Array.isArray(data.list)) {
            for (const item of data.list) {
                list.push({
                    vod_id: String(item.vod_id || ""),
                    vod_name: item.vod_name || "",
                    vod_pic: fixPicUrl(item.vod_pic || ""),
                    vod_remarks: item.vod_remarks || "",
                    style: { type: 'rect', ratio: 1.33 }
                });
            }
        }
        // 接口失败使用兜底静态数据
        if (list.length === 0) {
            list = _HOME_VIDEOS.map(x => ({
                ...x,
                style: { type: 'rect', ratio: 1.33 }
            }));
        }
        list = list.slice(0, 20);
        return JSON.stringify({ list });
    } catch (e) {
        console.error("homeVod error", e.message);
        const list = _HOME_VIDEOS.map(x => ({ ...x, style: { type: 'rect', ratio: 1.33 } })).slice(0, 20);
        return JSON.stringify({ list });
    }
}

async function category(tid, pg, filter, ext) {
    pg = Number(pg) || 1;
    try {
        const ajaxUrl = `${HOST}/index.php/ajax/data?mid=1&tid=${tid}&page=${pg}&limit=20`;
        const respText = await request(ajaxUrl, AJAX_HEADERS);
        const data = safeJson(respText);
        const list = [];
        let total = 0;
        if (data && Array.isArray(data.list)) {
            for (const item of data.list) {
                list.push({
                    vod_id: String(item.vod_id || ""),
                    vod_name: item.vod_name || "",
                    vod_pic: fixPicUrl(item.vod_pic || ""),
                    vod_remarks: item.vod_remarks || "",
                    style: { type: 'rect', ratio: 1.33 }
                });
            }
            total = Number(data.total || 0);
        }
        const pagecount = total > 0 ? Math.max(1, Math.floor((total + 19) / 20)) : pg;
        return JSON.stringify({
            list,
            page: pg,
            pagecount: pagecount,
            limit: 20,
            total: total
        });
    } catch (e) {
        console.error("category error", e.message);
        return JSON.stringify({ list: [], page: pg, pagecount: 0, limit: 20, total: 0 });
    }
}

async function detail(vodId) {
    try {
        const vid = String(vodId);
        // 读取内存缓存
        if (_DETAILS[vid]) {
            const cacheVod = Object.assign({}, _DETAILS[vid]);
            cacheVod.vod_id = vid;
            return JSON.stringify({ list: [cacheVod] });
        }
        // 拉取ajax列表寻找视频元信息
        let info = null;
        const ajaxUrlAll = `${HOST}/index.php/ajax/data?mid=1&page=1&limit=500`;
        const respAll = await request(ajaxUrlAll, AJAX_HEADERS);
        const dataAll = safeJson(respAll);
        if (dataAll && Array.isArray(dataAll.list)) {
            for (const item of dataAll.list) {
                if (String(item.vod_id) === vid) {
                    info = item;
                    break;
                }
            }
        }
        // 找不到尝试直播分类tid=58
        if (!info) {
            const respLive = await request(`${HOST}/index.php/ajax/data?mid=1&tid=58&page=1&limit=20`, AJAX_HEADERS);
            const dataLive = safeJson(respLive);
            if (dataLive && Array.isArray(dataLive.list)) {
                for (const item of dataLive.list) {
                    if (String(item.vod_id) === vid) {
                        info = item;
                        break;
                    }
                }
            }
        }
        if (!info) {
            return JSON.stringify({ list: [] });
        }
        const playFroms = [];
        const playUrls = [];
        // 循环线路pf从1~9
        for (let pf = 1; pf <= 9; pf++) {
            const playPageUrl = `${HOST}/vodplay/${vid}-${pf}-1.html`;
            const html = await request(playPageUrl);
            const pa = extractPlayerAaaa(html);
            if (!pa) continue;
            const fromVal = pa.from || "";
            const rawUrl = pa.url || "";
            if (!fromVal || !rawUrl) continue;
            const realPlayUrl = doubleUrlDecode(b64DecodeUtf8(rawUrl));
            if (!realPlayUrl.startsWith("http")) continue;
            playFroms.push(fromVal);
            playUrls.push(`第1集$${b64EncodeUtf8(realPlayUrl)}`);
        }
        const vod = {
            vod_id: vid,
            vod_name: info.vod_name || "",
            vod_pic: fixPicUrl(info.vod_pic || ""),
            type_name: info?.type?.type_name || "",
            vod_remarks: info.vod_remarks || "",
            vod_content: (info.vod_blurb || "").trim(),
            vod_actor: info.vod_actor || "",
            vod_director: info.vod_director || "",
            vod_year: info.vod_year || "",
            vod_area: info.vod_area || "",
            vod_play_from: playFroms.join("$$$"),
            vod_play_url: playUrls.join("$$$")
        };
        // 写入缓存
        _DETAILS[vid] = vod;
        return JSON.stringify({ list: [vod] });
    } catch (e) {
        console.error("detail error", e.message);
        return JSON.stringify({ list: [] });
    }
}

async function search(key, quick, pg) {
    pg = Number(pg) || 1;
    try {
        const kw = encodeURIComponent(key);
        const url = `${HOST}/vodsearch/-------------.html?wd=${kw}`;
        const html = await request(url);
        const list = [];
        // 正则匹配搜索结果 <a href="/voddetail/123">...<h3>标题
        const matches = reMatchAll(html, /<a[^>]*href=["'](\/voddetail\/(\d+)[^"']*)["'][^>]*>.*?<h3[^>]*>([^<]+)<\/h3>/);
        const seen = new Set();
        for (const m of matches) {
            const vid = m[2];
            const name = (m[3] || "").trim();
            if (seen.has(vid) || !vid || !name) continue;
            seen.add(vid);
            list.push({
                vod_id: vid,
                vod_name: name,
                vod_pic: "",
                vod_remarks: "",
                style: { type: 'rect', ratio: 1.33 }
            });
        }
        return JSON.stringify({
            list: list.slice(0, 50),
            page: pg,
            pagecount: 10,
            limit: 50,
            total: list.length,
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
        let idStr = String(id || "");
        // 去除$后面名称部分
        if (idStr.includes("$")) {
            idStr = idStr.split("$").pop();
        }
        // base64解码
        let playUrlCandidate = b64DecodeUtf8(idStr);
        // 如果已经是http直链直接返回
        if (playUrlCandidate.startsWith("http")) {
            return JSON.stringify({
                parse: 0,
                url: playUrlCandidate,
                header: { "User-Agent": UA, "Referer": HOST }
            });
        }
        // 匹配 vid-pf-ep 格式
        const m = playUrlCandidate.match(/(\d+)-(\d+)-(\d+)/);
        if (m) {
            const vid = m[1];
            const pf = m[2];
            const playPageUrl = `${HOST}/vodplay/${vid}-${pf}-1.html`;
            const html = await request(playPageUrl);
            const pa = extractPlayerAaaa(html);
            if (pa) {
                const rawUrl = pa.url || "";
                const realUrl = doubleUrlDecode(b64DecodeUtf8(rawUrl));
                if (realUrl.startsWith("http")) {
                    return JSON.stringify({
                        parse: 0,
                        url: realUrl,
                        header: { "User-Agent": UA, "Referer": HOST }
                    });
                }
            }
        }
        // 兜底
        return JSON.stringify({
            parse: 1,
            url: playUrlCandidate,
            header: { "User-Agent": UA, "Referer": HOST }
        });
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
