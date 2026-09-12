import { Crypto, _ } from 'assets://js/lib/cat.js';
let siteKey = '';
let siteType = 0;

const HOST = "https://www.ylys.tv";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";
const DEFAULT_HEADERS = {
    "User-Agent": UA,
    "Referer": `${HOST}/`,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
};

// 站点真实分类ID映射 【修复：CAT展示名称 → 网站真实tid】
const CATEGORY_MAP = {
    "电影": "1",
    "剧集": "2",
    "综艺": "3",
    "动漫": "4"
};

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

function fixImageUrl(url) {
    if (!url) return '';
    url = url.trim().replace(/^['"]+|['"]+$/g, '');
    if (url.startsWith('//')) return 'https:' + url;
    if (url.startsWith('/')) return HOST + url;
    if (url.startsWith('http://')) return url.replace('http://', 'https://');
    return url;
}

function parseVodList(html) {
    const list = [];
    const regLink = /<a[^>]+href="(\/voddetail\/(\d+)\/)"[^>]*>([\s\S]*?)<\/a>/g;
    let match;
    while ((match = regLink.exec(html)) !== null) {
        const vodId = match[2];
        const innerHtml = match[3];
        let title = '';
        const tMatch = innerHtml.match(/title="([^"]+)"/);
        if (tMatch) title = tMatch[1].trim();
        if (!title) {
            const txtMatch = innerHtml.match(/>([^<]+)</);
            if (txtMatch) title = txtMatch[1].trim();
        }
        if (!title || title.length < 2) continue;
        let pic = '';
        const imgMatch = innerHtml.match(/data-original="([^"]+)"/) || innerHtml.match(/src="([^"]+)"/);
        if (imgMatch) pic = fixImageUrl(imgMatch[1]);
        if (!pic) pic = "https://placehold.co/300x450/2c3e50/ecf0f1?text=" + encodeURIComponent(title.substring(0,8));
        let remarks = '';
        const noteMatch = innerHtml.match(/class="[^"]*note[^"]*">([^<]+)</);
        if(noteMatch) remarks = noteMatch[1].trim();
        list.push({
            vod_id: vodId,
            vod_name: title,
            vod_pic: pic,
            vod_remarks: remarks,
            style: { type: 'rect', ratio:1.33 }
        })
    }
    const seen = new Set();
    return list.filter(item=>{
        if(seen.has(item.vod_id)) return false;
        seen.add(item.vod_id);
        return true;
    })
}

function parseDetail(html) {
    const result = {
        vod_name:"",
        vod_pic:"",
        vod_year:"",
        vod_area:"",
        vod_actor:"未知",
        vod_director:"未知",
        vod_content:"暂无简介",
        playList:[]
    }
    const titleMatch = html.match(/<h1[^>]*>([^<]+)</);
    if(titleMatch) result.vod_name = titleMatch[1].trim();
    const picMatch = html.match(/og:image" content="([^"]+)"/) || html.match(/data-original="([^"]+)"/);
    if(picMatch) result.vod_pic = fixImageUrl(picMatch[1]);
    const descMatch = html.match(/module-info-introduction-content[^>]*>([\s\S]*?)<\//);
    if(descMatch) result.vod_content = descMatch[1].replace(/<[^>]+>/g,"").trim() || "暂无简介";

    const playReg = /<a[^>]+href="(\/play\/([^\/]+)\/)"[^>]*>([^<]+)</g;
    let pm;
    while((pm = playReg.exec(html))!==null){
        const playId = pm[2];
        const epName = pm[3].trim() || "正片";
        result.playList.push(`${epName}$${playId}`);
    }
    return result;
}

async function init(cfg) {
    try {
        siteKey = cfg.skey;
        siteType = cfg.stype;
    } catch (e) {
        console.error("init error", e.message);
    }
}

async function home(filter) {
    try {
        const classes = [
            { type_id: CATEGORY_MAP["电影"], type_name: "电影", land:1, ratio:1.33 },
            { type_id: CATEGORY_MAP["剧集"], type_name: "剧集", land:1, ratio:1.33 },
            { type_id: CATEGORY_MAP["综艺"], type_name: "综艺", land:1, ratio:1.33 },
            { type_id: CATEGORY_MAP["动漫"], type_name: "动漫", land:1, ratio:1.33 }
        ];
        return JSON.stringify({ class: classes, filters: {} });
    } catch (e) {
        console.error("home error", e.message);
        return JSON.stringify({ class:[], filters:{} });
    }
}

async function homeVod() {
    try {
        const resp = await request(`${HOST}/`);
        const list = parseVodList(resp);
        return JSON.stringify({ list: list.slice(0,20) });
    } catch (e) {
        console.error("homeVod error", e.message);
        return JSON.stringify({ list:[] });
    }
}

async function category(tid, pg, filter, ext) {
    pg = Number(pg) || 1;
    try {
        // 修复：tid是type_name，映射为网站真实数字id
        let realTid = tid;
        if(CATEGORY_MAP[tid]){
            realTid = CATEGORY_MAP[tid];
        }
        let url;
        if(pg > 1){
            url = `${HOST}/vodtype/${realTid}/page/${pg}/`;
        }else{
            url = `${HOST}/vodtype/${realTid}/`;
        }
        const resp = await request(url);
        const list = parseVodList(resp);
        return JSON.stringify({
            list,
            page: pg,
            pagecount: pg+1,
            limit:20,
            total:9999
        })
    } catch (e) {
        console.error("category error",e.message);
        return JSON.stringify({ list:[], page:pg, pagecount:0 });
    }
}

async function search(key, quick, pg) {
    pg = Number(pg) ||1;
    try {
        // 修复站点搜索路径格式，原路径固定分隔串
        const kw = encodeURIComponent(key);
        let url;
        if(pg>1){
            url = `${HOST}/vodsearch/${kw}-------------/page/${pg}/`;
        }else{
            url = `${HOST}/vodsearch/${kw}-------------/`;
        }
        const resp = await request(url);
        const list = parseVodList(resp);
        return JSON.stringify({
            list,
            page:pg,
            pagecount:pg+1,
            land:1,
            ratio:1.33
        })
    } catch(e){
        console.error("search error",e.message);
        return JSON.stringify({ list:[], page:pg, pagecount:0, land:1, ratio:1.33 });
    }
}

async function detail(vodId) {
    try {
        const url = `${HOST}/voddetail/${vodId}/`;
        const resp = await request(url);
        const parseRes = parseDetail(resp);
        const vod = {
            vod_id: vodId,
            vod_name: parseRes.vod_name,
            vod_pic: parseRes.vod_pic,
            vod_year: parseRes.vod_year,
            vod_area: parseRes.vod_area,
            vod_actor: parseRes.vod_actor,
            vod_director: parseRes.vod_director,
            vod_content: parseRes.vod_content,
            vod_play_from:"永乐视频",
            vod_play_url: parseRes.playList.join("#")
        }
        return JSON.stringify({ list:[vod] });
    } catch (e) {
        console.error("detail error",e.message);
        return JSON.stringify({ list:[] });
    }
}

async function play(flag, playId, flags) {
    try {
        const playUrl = `${HOST}/play/${playId}/`;
        const resp = await request(playUrl);
        let videoUrl = null;
        // 多层正则回退修复转义字符
        let m = resp.match(/var player_aaaa\s*=\s*\{[\s\S]*?"url"\s*:\s*"([^"]+?)"/);
        if(m && m[1]){
            videoUrl = m[1].replace(/\\\//g,"/").replace(/\\u002F/g,"/");
            if(videoUrl.startsWith("//")) videoUrl = "https:" + videoUrl;
        }
        // 第二备选正则
        if(!videoUrl){
            m = resp.match(/player_data\s*=\s*\{[\s\S]*?"url"\s*:\s*"([^"]+?)"/);
            if(m && m[1]){
                videoUrl = m[1].replace(/\\\//g,"/").replace(/\\u002F/g,"/");
                if(videoUrl.startsWith("//")) videoUrl = "https:" + videoUrl;
            }
        }
        if(videoUrl && videoUrl.endsWith(".m3u8")){
            return JSON.stringify({
                parse:0,
                url: videoUrl,
                header:{
                    "User-Agent":UA,
                    "Referer":HOST+"/"
                }
            })
        }
        // 提取失败降级嗅探 parse=1
        return JSON.stringify({
            parse:1,
            url: playUrl,
            header:{
                "User-Agent":UA,
                "Referer":HOST+"/"
            }
        })
    } catch(e){
        console.error("play error",e.message);
        return JSON.stringify({ parse:1, url:"", header:{} });
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
