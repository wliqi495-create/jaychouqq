import { Crypto, _ } from 'assets://js/lib/cat.js';
let siteKey = '';
let siteType = 0;

//复刻py分类数据
const CATEGORIES = [
    {"type_name": "小姐姐①", "type_id": "http://api.yujn.cn/api/zzxjj.php"},
    {"type_name": "小姐姐②", "type_id": "http://api.yujn.cn/api/xjj.php"},
    {"type_name": "女大学生", "type_id": "http://api.yujn.cn/api/nvda.php"},
    {"type_name": "黑丝", "type_id": "http://api.yujn.cn/api/heisis.php"},
    {"type_name": "Cosplay", "type_id": "http://api.yujn.cn/api/manzhan.php"},
    {"type_name": "白丝", "type_id": "http://api.yujn.cn/api/baisis.php"},
    {"type_name": "极品身材", "type_id": "http://api.yujn.cn/api/wmsc.php"},
    {"type_name": "蛇姐", "type_id": "http://api.yujn.cn/api/shejie.php"},
    {"type_name": "性感吊带", "type_id": "http://api.yujn.cn/api/diaodai.php"},
    {"type_name": "玉足", "type_id": "http://api.yujn.cn/api/jpmt.php"},
    {"type_name": "清纯", "type_id": "http://api.yujn.cn/api/qingchun.php"},
    {"type_name": "萝莉", "type_id": "http://api.yujn.cn/api/luoli.php"},
];

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const DEFAULT_HEADERS = {
    "User-Agent": UA,
    "Accept": "application/json, text/javascript, */*; q=0.01"
};

// 校验http链接
function isHttpUrl(s) {
    return /^https?:\/\//i.test(text(s));
}
// 校验视频后缀
function isVideoLink(s) {
    s = text(s).toLowerCase();
    return /\.(mp4|m3u8)(\?|#|$)/.test(s);
}

async function request(url, optHeaders = {}, body) {
    try {
        const headers = Object.assign({}, DEFAULT_HEADERS, optHeaders || {});
        const res = await req(url, {
            method: body ? "POST" : "GET",
            headers: headers,
            timeout: 8000,
            data: body,
            redirect:0 // 关闭自动跟随302，捕获Location头！核心修复
        });
        return res; // 返回完整res对象 {content,headers,status}
    } catch (e) {
        console.error("request error:", url, e?.message);
        return { content: "", headers: {}, status: 0 };
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
        const classArr = CATEGORIES.map(item => {
            return {
                type_id: item.type_id,
                type_name: item.type_name,
                land: 1,
                ratio: 0.56
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
    // homeVideoContent 复用第一个分类接口
    return await category("http://api.yujn.cn/api/zzxjj.php", 1, null, {});
}

async function category(tid, pg, filter, ext) {
    pg = Number(pg) || 1;
    try {
        const videos = [];
        for (let i = 0; i < 20; i++) {
            videos.push({
                vod_id: `yujn$${tid}`,
                vod_name: `冬天专线 ${pg}-${i + 1}`,
                vod_pic: "https://t.mwm.moe/mp/",
                vod_remarks: "",
                style: { type: "rect", ratio: 0.56 }
            });
        }
        return JSON.stringify({
            list: videos,
            page: pg,
            pagecount: 9999,
            limit: 20,
            total: 999999
        });
    } catch (e) {
        console.error("category error", e.message);
        return JSON.stringify({ list: [], page: pg, pagecount: 0 });
    }
}

async function detail(vodIdRaw) {
    try {
        // 拆分 yujn$http://xxx.php
        const parts = vodIdRaw.split("$");
        const apiUrl = parts[1];
        const sessionId = String(Date.now()).slice(-4);
        const randSalt = Math.floor(1000000 + Math.random() * 9000000).toString();
        const playList = [];
        for (let i = 0; i < 80; i++) {
            const title = `${i + 1}.冬天随机 🕒${sessionId}`;
            const fullApi = `${apiUrl}?type=json`;
            playList.push(`${title}$yujn_play$${fullApi}@@${randSalt}_${i}`);
        }
        const vod = {
            vod_id: `yujn_${randSalt}`,
            vod_name: "快活冬天",
            vod_pic: "https://t.mwm.moe/mp/",
            vod_year:"",
            vod_area:"",
            vod_actor:"",
            vod_director:"",
            vod_content:"",
            vod_play_from: "冬天引擎",
            vod_play_url: playList.join("#")
        };
        return JSON.stringify({ list: [vod] });
    } catch (e) {
        console.error("detail error", e.message);
        return JSON.stringify({ list: [] });
    }
}

async function play(flag, id, flags) {
    try {
        if (id.startsWith("yujn_play$")) {
            // yujn_play$http://xxx?type=json@@rand_0
            const part1 = id.split("$")[1];
            const realApi = part1.split("@@")[0];
            //追加时间戳防缓存
            const reqUrl = realApi + (realApi.includes("?")?"&":"?") + "_t=" + Date.now();
            const res = await request(reqUrl);
            let videoUrl = "";

            //【优先级1：捕获302重定向Location头，yujn接口主要靠这个】
            if(res && res.headers){
                let loc = res.headers.Location || res.headers.location;
                if(loc && isHttpUrl(loc)){
                    videoUrl = text(loc);
                    console.log("play捕获302地址：",videoUrl);
                }
            }

            //【优先级2：JSON解析提取】
            if(!isVideoLink(videoUrl)){
                const r = safeJson(res.content||"");
                if (r) {
                    videoUrl = r.data || r.url || r.video || r.msg;
                    if (typeof videoUrl === "object" && videoUrl !== null) {
                        videoUrl = videoUrl.url || videoUrl.video || videoUrl.data;
                    }
                }
            }

            //【优先级3：正则从返回文本抓取mp4链接】
            if(!isVideoLink(videoUrl)){
                const m = (res.content||"").match(/https?:\/\/[^"'<> \n]+\.mp4[^"'<> \n]*/g);
                if(m&&m.length>0){
                    videoUrl = text(m[0]);
                }
            }

            // 校验是否有效视频链接
            if (isHttpUrl(videoUrl) && isVideoLink(videoUrl)) {
                return JSON.stringify({
                    parse: 0,
                    url: videoUrl,
                    header: DEFAULT_HEADERS
                });
            } else {
                // 删除toast伪协议，使用标准解析失败
                return JSON.stringify({
                    parse: 1,
                    url: "",
                    header: DEFAULT_HEADERS
                });
            }
        }
        return JSON.stringify({
            parse: 0,
            url: id,
            header: DEFAULT_HEADERS
        });
    } catch (e) {
        console.error("play error", e.message);
        return JSON.stringify({ parse: 1, url: "", header: {} });
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
            ratio: 0.56
        });
    } catch (e) {
        console.error("search error", e.message);
        return JSON.stringify({ list: [], page: pg, pagecount: 0, land: 1, ratio: 0.56 });
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