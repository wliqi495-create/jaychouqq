import { Crypto, _ } from 'assets://js/lib/cat.js';
let siteKey = '';
let siteType = 0;

const HOST = "https://a123tv.com";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36";
const DEFAULT_HEADERS = {
    "User-Agent": UA,
    "Accept": "*/*"
};

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
    if (url.startsWith('http')) return url;
    if (url.startsWith('//')) return `https:${url}`;
    return `https://${url}`;
}

const DEFAULT_CLASSES = [
    { type_id: "10", type_name: "电影", land: 1, ratio: 1.33 },
    { type_id: "11", type_name: "连续剧", land: 1, ratio: 1.33 },
    { type_id: "12", type_name: "综艺", land: 1, ratio: 1.33 },
    { type_id: "13", type_name: "动漫", land: 1, ratio: 1.33 }
];
let extendObj = { classes: [...DEFAULT_CLASSES], filter: {} };

async function init(cfg) {
    try {
        siteKey = cfg.skey;
        siteType = cfg.stype;
        extendObj = { classes: [...DEFAULT_CLASSES], filter: {} };
    } catch (e) {
        console.error("init error", e.message);
        extendObj = { classes: [...DEFAULT_CLASSES], filter: {} };
    }
}

function home(filter) {
    try {
        return JSON.stringify({ class: extendObj.classes || DEFAULT_CLASSES, filters: extendObj.filter || {} });
    } catch (e) {
        return JSON.stringify({ class: DEFAULT_CLASSES, filters: {} });
    }
}

async function homeVod() {
    try {
        const resp = await request(`${HOST}`);
        const html = resp;
        const reg = /<a class="w4-item" href="([^"]+)".*?<img.*?data-src="([^"]+)".*?<div class="s">.*?<span>([^<]+)<\/span>.*?<div class="t"[^>]*title="([^"]+)">.*?<div class="i">([^<]+)<\/div>/gs;
        const list = [];
        let match;
        while ((match = reg.exec(html)) !== null) {
            const vodId = match[1];
            const pic = fixPicUrl(match[2]);
            const remarks = (match[3] || '').trim();
            const name = (match[4] || '').trim();
            if (!vodId || !name) continue;
            list.push({
                vod_id: vodId,
                vod_name: name,
                vod_pic: pic,
                vod_remarks: remarks,
                style: { type: 'rect', ratio: 1.33 }
            });
            if(list.length >= 20) break;
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
        let url;
        if(pg === 1){
            url = `${HOST}/t/${tid}.html`;
        }else{
            url = `${HOST}/t/${tid}/p${pg}.html`;
        }
        const resp = await request(url);
        const html = resp;
        const reg = /<a class="w4-item" href="([^"]+)".*?<img.*?data-src="([^"]+)".*?<div class="s">.*?<span>([^<]+)<\/span>.*?<div class="t"[^>]*title="([^"]+)">.*?<div class="i">([^<]+)<\/div>/gs;
        const list = [];
        let match;
        while ((match = reg.exec(html)) !== null) {
            const vodId = match[1];
            const pic = fixPicUrl(match[2]);
            const remarks = (match[3] || '').trim();
            const name = (match[4] || '').trim();
            if (!vodId || !name) continue;
            list.push({
                vod_id: vodId,
                vod_name: name,
                vod_pic: pic,
                vod_remarks: remarks,
                style: { type: 'rect', ratio: 1.33 }
            });
        }
        let maxPage = pg;
        const pageReg = /\/p(\d+)\.html"[^>]*>(\d+)<\/a>/g;
        let pm;
        while((pm = pageReg.exec(html))!==null){
            maxPage = Math.max(maxPage, Number(pm[2]));
        }
        return JSON.stringify({
            list,
            page: pg,
            pagecount: maxPage,
            limit:20,
            total:9999
        });
    } catch (e) {
        console.error("category error",e.message);
        return JSON.stringify({ list:[], page:pg, pagecount:0 });
    }
}

async function search(key, quick, pg) {
    pg = Number(pg) ||1;
    try {
        const kw = encodeURIComponent(key);
        let url;
        if(pg ===1){
            url = `${HOST}/s/${kw}.html`;
        }else{
            url = `${HOST}/s/${kw}/p${pg}.html`;
        }
        const resp = await request(url);
        const html = resp;
        const reg = /<a class="w4-item" href="([^"]+)".*?<img.*?data-src="([^"]+)".*?<div class="t"[^>]*>([^<]+)<\/div>.*?<div class="i">([^<]+)<\/div>/gs;
        const list = [];
        let match;
        while ((match = reg.exec(html)) !== null) {
            const vodId = match[1];
            const pic = fixPicUrl(match[2]);
            const name = (match[3] || '').trim();
            const remarks = (match[4] || '').trim();
            if (!vodId || !name) continue;
            list.push({
                vod_id: vodId,
                vod_name: name,
                vod_pic: pic,
                vod_remarks: remarks,
                style: { type: 'rect', ratio: 1.33 }
            });
        }
        return JSON.stringify({
            list,
            page:pg,
            pagecount:10,
            land:1,
            ratio:1.33
        });
    } catch(e){
        console.error("search error",e.message);
        return JSON.stringify({ list:[], page:pg, pagecount:0, land:1, ratio:1.33 });
    }
}

async function detail(vodId) {
    try {
        const url = vodId.startsWith('http') ? vodId : `${HOST}${vodId}`;
        const resp = await request(url);
        const html = resp;
        const vod = {
            vod_id: vodId,
            vod_name:"",
            vod_pic:"",
            vod_year:"",
            vod_area:"",
            vod_remarks:"",
            vod_actor:"",
            vod_director:"",
            vod_content:"",
            vod_play_from:"123TV",
            vod_play_url:""
        };
        const titleMatch = html.match(/<li class="on"><h1>([^<]+)<\/h1><\/li>/);
        if(titleMatch) vod.vod_name = titleMatch[1].trim();
        const picMatch = html.match(/data-poster="([^"]+)"/);
        if(picMatch) vod.vod_pic = fixPicUrl(picMatch[1]);
        const descMatch = html.match(/name="description" content="(.*?)"/);
        if(descMatch){
            const content = descMatch[1]||"";
            vod.vod_content = content;
            const actorMatch = content.match(/演员:(.*?)(。|$)/);
            if(actorMatch) vod.vod_actor = actorMatch[1].trim();
            const areaMatch = content.match(/地区:(.*?)(。|$)/);
            if(areaMatch) vod.vod_area = areaMatch[1].trim();
            const dirMatch = content.match(/导演:(.*?)(。|$)/);
            if(dirMatch) vod.vod_director = dirMatch[1].trim();
        }
        const scriptMatch = html.match(/var pp=({.*?});/s);
        const playList = [];
        if(scriptMatch){
            const ppJson = safeJson(scriptMatch[1]);
            if(ppJson && Array.isArray(ppJson.la)){
                const vno = ppJson.no||"";
                for(const line of ppJson.la){
                    const [lineId,lineName,epCount] = line;
                    for(let i=0;i<epCount;i++){
                        const epName = `第${i+1}集`;
                        const playPath = `/v/${vno}/${lineId}z${i}.html`;
                        playList.push(`${epName}$${b64EncodeUtf8(playPath)}`);
                    }
                }
            }
        }
        vod.vod_play_url = playList.join('#');
        return JSON.stringify({ list:[vod] });
    } catch (e) {
        console.error("detail error",e.message);
        return JSON.stringify({ list:[] });
    }
}

async function play(flag, id, flags) {
    try {
        const playPath = b64DecodeUtf8(id||"");
        if(!playPath){
            return JSON.stringify({ parse:1, url:"", header:{"User-Agent":UA,"Referer":HOST+"/"} });
        }
        const playUrl = playPath.startsWith('http') ? playPath : `${HOST}${playPath}`;
        const resp = await request(playUrl);
        const html = resp;
        const srcMatch = html.match(/data-src="([^"]+)"/);
        if(srcMatch && srcMatch[1]){
            const realUrl = srcMatch[1];
            return JSON.stringify({
                parse:0,
                url:realUrl,
                header:{
                    "User-Agent":UA,
                    "Referer":playUrl
                }
            });
        }
        return JSON.stringify({
            parse:1,
            url:playUrl,
            header:{
                "User-Agent":UA,
                "Referer":playUrl
            }
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