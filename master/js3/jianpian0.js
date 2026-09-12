import { Crypto, _ } from 'assets://js/lib/cat.js';
let siteKey = '';
let siteType = 0;
let extendObj = {};

const HOST = 'https://api.ztcgi.com';
const UA = 'Mozilla/5.0 (Linux; Android 9; V2196A Build/PQ3A.190705.08211809; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/91.0.4472.114 Mobile Safari/537.36;webank/h5face;webank/1.0;netType:NETWORK_WIFI;appVersion:416;packageName:com.jp3.xg3';
let imghost = 'https://img.jianpian.com';

const DEFAULT_PIC_LIST = [
    "https://p.qqan.com/up/2021-1/16104169378734044.jpg",
    "https://img0.baidu.com/it/u=3827432118,3037803323&fm=253&fmt=auto&app=138&f=JPEG?w=500&h=700"
];
const DEFAULT_HEADERS = {
    "User‑Agent": UA,
    "Referer": HOST,
    "Accept": "application/json,text/plain,*/*"
};

async function request(url, optHeaders = {}, body) {
    try {
        const headers = Object.assign({}, DEFAULT_HEADERS, optHeaders || {});
        console.log("[荐片] GET:", url);
        const res = await req(url, {
            method: body ? "POST" : "GET",
            headers: headers,
            timeout: 20000,
            data: body
        });
        const cnt = res?.content ?? "";
        console.log("[荐片] resp len:", cnt.length);
        return cnt;
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

// ✅手动拼接query，替代不兼容的URLSearchParams
function buildQuery(paramsObj) {
    const arr = [];
    for(let key in paramsObj) {
        let val = text(paramsObj[key]);
        if(val !== "") {
            arr.push(encodeURIComponent(key)+"="+encodeURIComponent(val));
        }
    }
    return arr.join("&");
}

function fixPicUrl(url) {
    url = text(url);
    if (!url) return DEFAULT_PIC_LIST[0];
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    if (url.startsWith("//")) return "https:" + url;
    if (imghost) {
        const full = `${imghost}${url}`;
        return full;
    }
    return DEFAULT_PIC_LIST[0];
}

async function init(cfg) {
    try {
        siteKey = cfg.skey;
        siteType = cfg.stype;
        // 先赋值兜底，接口失败不会坏掉图片域名
        imghost = 'https://img.jianpian.com';
        const respText = await request(`${HOST}/api/appAuthConfig`);
        const config = safeJson(respText);
        if (config && config.data && config.data.imgDomain) {
            imghost = `https://${config.data.imgDomain}`;
        }
    } catch (e) {
        console.error("init error", e.message);
        imghost = 'https://img.jianpian.com';
    }
}

function home(filter) {
    try {
        const classes = [
            { type_id: '1', type_name: '电影', land: 1, ratio: 1.33 },
            { type_id: '2', type_name: '电视剧', land: 1, ratio: 1.33 },
            { type_id: '3', type_name: '动漫', land: 1, ratio: 1.33 },
            { type_id: '4', type_name: '综艺', land: 1, ratio: 1.33 }
        ];
        const filterItem = [
            {"key": "cateId", "name": "分类", "value": [
                {"v": "1", "n": "剧情"},{"v": "2", "n": "爱情"},{"v": "3", "n": "动画"},{"v": "4", "n": "喜剧"},
                {"v": "5", "n": "战争"},{"v": "6", "n": "歌舞"},{"v": "7", "n": "古装"},{"v": "8", "n": "奇幻"},
                {"v": "9", "n": "冒险"},{"v": "10", "n": "动作"},{"v": "11", "n": "科幻"},{"v": "12", "n": "悬疑"},
                {"v": "13", "n": "犯罪"},{"v": "14", "n": "家庭"},{"v": "15", "n": "传记"},{"v": "16", "n": "运动"},
                {"v": "18", "n": "惊悚"},{"v": "20", "n": "短片"},{"v": "21", "n": "历史"},{"v": "22", "n": "音乐"},
                {"v": "23", "n": "西部"},{"v": "24", "n": "武侠"},{"v": "25", "n": "恐怖"}
            ]},
            {"key": "area", "name": "地區", "value": [
                {"v": "1", "n": "国产"},{"v": "3", "n": "中国香港"},{"v": "6", "n": "中国台湾"},
                {"v": "5", "n": "美国"},{"v": "18", "n": "韩国"},{"v": "2", "n": "日本"}
            ]},
            {"key": "year", "name": "年代", "value": [
                {"v": "107", "n": "2025"},{"v": "119", "n": "2024"},{"v": "153", "n": "2023"},
                {"v": "101", "n": "2022"},{"v": "118", "n": "2021"},{"v": "16", "n": "2020"},
                {"v": "7", "n": "2019"},{"v": "22", "n": "2016"},{"v": "2015", "n": "2015以前"}
            ]},
            {"key": "sort", "name": "排序", "value": [
                {"v": "update", "n": "最新"},{"v": "hot", "n": "最热"},{"v": "rating", "n": "评分"}
            ]}
        ];
        const filterObj = {"1": filterItem, "2": filterItem, "3": filterItem, "4": filterItem};
        extendObj = { classes, filter: filterObj };
        return JSON.stringify({
            class: extendObj.classes || classes,
            filters: extendObj.filter || filterObj
        });
    } catch (e) {
        console.error("home error", e.message);
        return JSON.stringify({
            class: [
                { type_id: '1', type_name: '电影', land: 1, ratio: 1.33 }
            ],
            filters: {}
        });
    }
}

async function homeVod() {
    try {
        const query = buildQuery({"pos_id":"88"});
        const respText = await request(`${HOST}/api/slide/list?${query}`);
        const res = safeJson(respText);
        const list = [];
        if (res && Array.isArray(res.data)) {
            for (const item of res.data) {
                list.push({
                    vod_id: text(item.jump_id),
                    vod_name: text(item.title),
                    vod_pic: fixPicUrl(item.thumbnail),
                    vod_remarks: "",
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
        const paramsObj = {
            "fcate_pid": text(tid),
            "category_id": text(ext?.cateId || ""),
            "area": text(ext?.area || ""),
            "year": text(ext?.year || ""),
            "sort": text(ext?.sort || ""),
            "page": String(pg)
        };
        const queryStr = buildQuery(paramsObj);
        const url = `${HOST}/api/crumb/list?${queryStr}`;
        const respText = await request(url);
        const res = safeJson(respText);
        const list = [];
        if (res && res.data && Array.isArray(res.data)) {
            for (const item of res.data) {
                list.push({
                    vod_id: text(item.id),
                    vod_name: text(item.title),
                    vod_pic: fixPicUrl(item.path),
                    vod_remarks: text(item.mask),
                    style: { type: 'rect', ratio: 1.33 }
                });
            }
        }
        return JSON.stringify({
            list,
            page: pg,
            pagecount: 999,
            limit: 20,
            total: 9999
        });
    } catch (e) {
        console.error("category error", e.message);
        return JSON.stringify({ list: [], page: pg, pagecount: 0 });
    }
}

async function detail(id) {
    try {
        const query = buildQuery({"id":text(id)});
        const url = `${HOST}/api/video/detailv2?${query}`;
        const respText = await request(url);
        const res = safeJson(respText);
        if (!res || !res.data) return JSON.stringify({ list: [] });
        const data = res.data;
        const play_from = Array.isArray(data.source_list_source)
            ? data.source_list_source.map(item => text(item.name)).join('$$$').replace(/常规线路/g, '边下边播')
            : "";
        let play_url = "";
        if (Array.isArray(data.source_list_source)) {
            const lineArr = [];
            for (const play of data.source_list_source) {
                if (Array.isArray(play.source_list)) {
                    const epArr = play.source_list.map(({source_name, url}) => {
                        const payload = b64EncodeUtf8(JSON.stringify({ rawUrl: text(url) }));
                        return `${text(source_name)}$${payload}`;
                    });
                    lineArr.push(epArr.join('#'));
                }
            }
            play_url = lineArr.join('$$$');
        }
        const vod = {
            vod_id: text(data.id),
            vod_name: text(data.title),
            vod_year: text(data.year),
            vod_area: text(data.area),
            vod_remarks: text(data.mask),
            vod_content: text(data.description),
            vod_play_from: play_from,
            vod_play_url: play_url,
            vod_pic: fixPicUrl(data.thumbnail)
        };
        return JSON.stringify({ list: [vod] });
    } catch (e) {
        console.error("detail error", e.message);
        return JSON.stringify({ list: [] });
    }
}

async function search(wd, quick, pg) {
    pg = Number(pg) || 1;
    const paramsObj = {
        "key": text(wd),
        "category_id":"88",
        "page":String(pg),
        "pageSize":"20"
    };
    const query = buildQuery(paramsObj);
    const url = `${HOST}/api/v2/search/videoV2?${query}`;
    try {
        const respText = await request(url);
        const res = safeJson(respText);
        const list = [];
        if (res && Array.isArray(res.data)) {
            for (const item of res.data) {
                list.push({
                    vod_id: text(item.id),
                    vod_name: text(item.title),
                    vod_pic: fixPicUrl(item.thumbnail),
                    vod_remarks: text(item.mask),
                    style: { type: 'rect', ratio: 1.33 }
                });
            }
        }
        return JSON.stringify({
            list,
            page: pg,
            pagecount: 999,
            land: 1,
            ratio: 1.33
        });
    } catch (e) {
        console.error("search error", e.message);
        return JSON.stringify({ list: [], page: pg, pagecount: 0, land: 1, ratio: 1.33 });
    }
}

async function play(flag, idB64, flags) {
    try {
        const raw = b64DecodeUtf8(idB64 || "");
        const meta = safeJson(raw);
        if (!meta || !meta.rawUrl) {
            return JSON.stringify({ parse: 1, url: "", header: { "User‑Agent": UA, "Referer": HOST } });
        }
        const originPlayUrl = text(meta.rawUrl);
        return JSON.stringify({
            parse: 1,
            url: originPlayUrl,
            header: { "User‑Agent": UA, "Referer": HOST }
        });
    } catch (e) {
        console.error("play error", e.message);
        return JSON.stringify({ parse: 1, url: "", header: { "User‑Agent": UA, "Referer": HOST } });
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