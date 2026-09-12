import { Crypto, _ } from 'assets://js/lib/cat.js';
let siteKey = '';
let siteType = 0;

// === 整合第三份文档直播.txt 源列表 ===
const LIVE_SOURCE_LIST = [
    {"name":"🥘台湾直播👿","url":"http://mqitv.magicluweibo1.hz.cz:11601/twhotel.txt&&&http://api.btstu.cn/sjbz/"},
    {"name":"🥘精彩直播👿","url":"https://cdn.qd.je/live.m3u&&&http://api.btstu.cn/sjbz/"},
    {"name":"🥘国外直播👿","url":"https://proxy.api.030101.xyz/iptv-org.github.io/iptv/index.m3u&&&http://api.btstu.cn/sjbz/"},
    {"name":"🥘国际直播👿","url":"http://tv123.vvvv.ee/tv.m3u&&&http://api.btstu.cn/sjbz/"},
    {"name":"🥘jackTV👿","url":"https://php.946985.filegear-sg.me/jackTV.m3u&&&http://api.btstu.cn/sjbz/"},
    {"name":"🥘易发👿","url":"https://down.nigx.cn/raw.githubusercontent.com/fafa002/yf2025/refs/heads/main/yiyifafa.txt&&&http://api.btstu.cn/sjbz/"},
    {"name":"🥘Jsnzkpg👿","url":"https://gh-proxy.org/https://raw.githubusercontent.com/mhmdxahmd/mafly/refs/heads/main/MAfly1/mafly.m3u&&&http://api.btstu.cn/sjbz/"},
    {"name":"🥘韩国女团","url":"https://gist.githubusercontent.com/yuanwangokk-1/a661dd0e88466aa22f2a7c1fb375635e/raw/8708d9947be1c64c52bb1610a30aaa1b595848c9/韩国女团直播.m3u&&&http://api.btstu.cn/sjbz/"}
];

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";
const DEFAULT_HEADERS = {
    "User-Agent": UA
};
const DEFAULT_PIC = "https://p.qqan.com/up/2021-1/16104169378734044.jpg";

let classes = [];
let catesCache = {};
let picUrlBase = "";
let webPathMap = {};

async function request(url, optHeaders = {}) {
    try {
        const headers = Object.assign({}, DEFAULT_HEADERS, optHeaders);
        const res = await req(url, {
            method: "GET",
            headers: headers,
            timeout: 20000
        });
        return res?.content ?? "";
    } catch (e) {
        console.error("request error:", url, e?.message);
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

/** m3u解析 */
function parseM3u(content, defaultGroup) {
    const groupMap = {};
    if (!content) return "";
    const txt = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const lines = txt.split("\n");
    let curName = "";
    let curGroup = defaultGroup || "默认";
    const regGroup = /group-title="([^"]+)"/;

    for(const line of lines) {
        const trimLine = line.trim();
        if(trimLine.startsWith("#EXTINF")) {
            const matchGroup = trimLine.match(regGroup);
            if(matchGroup) curGroup = matchGroup[1];
            const idx = trimLine.lastIndexOf(",");
            if(idx !== -1) curName = trimLine.slice(idx+1).trim();
        } else if(trimLine && !trimLine.startsWith("#")) {
            if(/^http|rtmp|rtsp/.test(trimLine) && curName) {
                if(!groupMap[curGroup]) groupMap[curGroup] = [];
                groupMap[curGroup].push(`${curName},${trimLine}`);
            }
            curName = "";
        }
    }
    let outStr = "";
    for(const gName in groupMap) {
        outStr += gName + "\n";
        groupMap[gName].forEach(item=>{
            outStr += item + "\n";
        });
    }
    return outStr;
}

/** 解析fm格式 */
function parseFm(jsonStr) {
    const data = safeJson(jsonStr);
    if(!data) return "";
    let out = "";
    for(const cat of data) {
        const cName = cat.name || "";
        out += cName + "\n";
        const lists = cat.lists || [];
        for(const ch of lists) {
            const n = ch.name;
            const uris = ch.urls || [];
            uris.forEach(u=>{
                out += `${n},${u}\n`;
            });
        }
    }
    return out;
}

/** 解析lu格式 */
function parseLu(jsonStr) {
    const data = safeJson(jsonStr);
    if(!data || !data.datalist) return "";
    let out = "";
    for(const item of data.datalist) {
        const catName = item.name || "";
        out += catName + "\n";
        const channels = item.datalist || [];
        for(const ch of channels) {
            const cName = ch.name;
            const urlItem = ch.url;
            out += `${cName},${urlItem}\n`;
        }
    }
    return out;
}

async function init(cfg) {
    try {
        siteKey = cfg.skey;
        siteType = cfg.stype;
        classes = [];
        catesCache = {};
        for(const src of LIVE_SOURCE_LIST) {
            const rawId = src.url;
            classes.push({
                type_id: rawId,
                type_name: src.name,
                land:1,
                ratio:1.33
            });
        }
    } catch (e) {
        console.error("init error", e.message);
    }
}

function home(filter) {
    try {
        return JSON.stringify({ class: classes, filters: {} });
    } catch (e) {
        console.error("home error", e.message);
        return JSON.stringify({ class: [], filters: {} });
    }
}

async function getCateData(tid) {
    if(catesCache[tid]) return catesCache[tid];
    const parts = tid.split("&&&");
    let realUrl = parts[0];
    let picExtra = parts.length>1 ? parts[1] : "";
    let respText = await request(realUrl);
    let parseResult = respText;
    // 判断格式做对应解析
    if(respText.includes("#EXTM3U")) {
        parseResult = parseM3u(respText, "");
    } else {
        const jData = safeJson(respText);
        if(jData && Array.isArray(jData)) {
            if(jData[0].lists) parseResult = parseFm(respText);
            else if(jData[0].datalist) parseResult = parseLu(respText);
        }
    }
    const lines = parseResult.replace(/\r/g,"").split("\n");
    const vodList = [];
    let curCatName = "";
    for(const line of lines) {
        const tl = line.trim();
        if(!tl) continue;
        if(tl.indexOf(",") === -1) {
            curCatName = tl;
            continue;
        }
        const spArr = tl.split(",");
        const chName = spArr[0].trim();
        const chUrl = spArr[1]?.trim() || "";
        if(!chUrl || !/^http|rtmp|rtsp/.test(chUrl)) continue;
        vodList.push({
            vod_id: `${tid}###${vodList.length}`,
            vod_name: chName,
            vod_pic: DEFAULT_PIC,
            vod_remarks: "直播",
            type_name: curCatName || "直播",
            vod_year: "",
            vod_area: "",
            vod_actor: "",
            vod_director: "",
            vod_content: "",
            vod_play_from: "live",
            vod_play_url: `${chName}$${chUrl}`
        });
    }
    catesCache[tid] = vodList;
    return vodList;
}

async function homeVod() {
    try {
        if(!classes.length) return JSON.stringify({list:[]});
        const list = await getCateData(classes[0].type_id);
        return JSON.stringify({ list: list });
    } catch (e) {
        console.error("homeVod error", e.message);
        return JSON.stringify({ list: [] });
    }
}

async function category(tid, pg, filter, ext) {
    pg = Number(pg) || 1;
    try {
        const list = pg === 1 ? await getCateData(tid) : [];
        return JSON.stringify({
            list: list,
            page: pg,
            pagecount: pg +1,
            limit:50,
            total: list.length
        });
    } catch (e) {
        console.error("category error", e.message);
        return JSON.stringify({ list: [], page: pg, pagecount:0 });
    }
}

async function detail(vodId) {
    try {
        const sp = vodId.split("###");
        const realTid = sp[0];
        const idx = Number(sp[1]) || 0;
        const arr = await getCateData(realTid);
        const item = arr[idx];
        if(!item) return JSON.stringify({list:[]});
        return JSON.stringify({ list:[item] });
    } catch (e) {
        console.error("detail error", e.message);
        return JSON.stringify({ list: [] });
    }
}

async function play(flag, id, flags) {
    try {
        return JSON.stringify({
            parse:0,
            url: id,
            header: { "User-Agent":UA }
        });
    } catch (e) {
        console.error("play error", e.message);
        return JSON.stringify({ parse:1, url:id, header:{"User-Agent":UA} });
    }
}

// ==========修复后的search函数==========
async function search(key, quick, pg) {
    pg = Number(pg) || 1;
    try {
        const keyword = key.toLowerCase().trim();
        let result = [];
        //遍历全部已缓存的源数据
        for (const cacheKey in catesCache) {
            const vodArr = catesCache[cacheKey];
            if (!Array.isArray(vodArr)) continue;
            for (const vod of vodArr) {
                //频道名称模糊匹配，忽略大小写
                if (vod.vod_name.toLowerCase().includes(keyword)) {
                    result.push(vod);
                }
            }
        }
        //注意：只有打开过对应分类（category），该源才会被缓存，没打开过的源不会参与搜索
        return JSON.stringify({
            list: result,
            page: pg,
            pagecount: 1,
            land:1,
            ratio:1.33
        });
    } catch (e) {
        console.error("search error", e.message);
        return JSON.stringify({
            list:[],
            page:pg,
            pagecount:0,
            land:1,
            ratio:1.33
        });
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