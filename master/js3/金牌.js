import { Crypto, _ } from 'assets://js/lib/cat.js';
let siteKey = '';
let siteType = 0;
const HOST = "https://www.hellorlgzf7sn.com";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";
const DEFAULT_HEADERS = {
    "User‑Agent": UA,
    "Accept": "application/json, text/plain, */*"
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

function safeJson(str) {
    try {
        if (!str) return null;
        return JSON.parse(str);
    } catch (e) {
        return null;
    }
}

// 字符串截取工具，复刻原type2 substring函数
function substring(str, startKey, startOffset, endKey, endOffset) {
    if (!str) return "";
    let idx1 = str.indexOf(startKey);
    if (idx1 === -1) return "";
    idx1 += startOffset;
    let idx2 = str.indexOf(endKey, idx1);
    if (idx2 === -1) return "";
    idx2 += endOffset;
    return str.slice(idx1, idx2);
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
    const classes = [
        { type_id: "2", type_name: "电视剧", land: 1, ratio: 1.33 },
        { type_id: "1", type_name: "电影", land: 1, ratio: 1.33 },
        { type_id: "4", type_name: "动漫", land: 1, ratio: 1.33 },
        { type_id: "2‑14", type_name: "国产剧", land: 1, ratio: 1.33 },
        { type_id: "2‑15", type_name: "欧美剧", land: 1, ratio: 1.33 },
        { type_id: "2‑16", type_name: "港台剧", land: 1, ratio: 1.33 },
        { type_id: "2‑62", type_name: "日韩剧", land: 1, ratio: 1.33 },
        { type_id: "2‑68", type_name: "其它剧", land: 1, ratio: 1.33 },
        { type_id: "1‑22", type_name: "喜剧", land: 1, ratio: 1.33 },
        { type_id: "1‑23", type_name: "动作", land: 1, ratio: 1.33 },
        { type_id: "1‑30", type_name: "科幻", land: 1, ratio: 1.33 },
        { type_id: "1‑26", type_name: "爱情", land: 1, ratio: 1.33 },
        { type_id: "1‑27", type_name: "悬疑", land: 1, ratio: 1.33 },
        { type_id: "1‑36", type_name: "恐怖", land: 1, ratio: 1.33 },
        { type_id: "1‑34", type_name: "惊悚", land: 1, ratio: 1.33 },
        { type_id: "1‑33", type_name: "动画", land: 1, ratio: 1.33 },
        { type_id: "1‑81", type_name: "灾难", land: 1, ratio: 1.33 },
        { type_id: "1‑37", type_name: "剧情", land: 1, ratio: 1.33 }
    ];
    return JSON.stringify({ class: classes, filters: {} });
}

async function homeVod() {
    // 首页推荐取电影第一页
    const html = await request(`${HOST}/vod/show/id/1/page/1`);
    const listStr = substring(html, '"list":',7,']}',1);
    const data = safeJson(listStr);
    const list = [];
    if(Array.isArray(data)){
        data.slice(0,20).forEach(item=>{
            list.push({
                vod_id: item.vodId||"",
                vod_name: item.vodName||"",
                vod_pic: item.vodPic||"",
                vod_remarks: (item.vodRemarks||"") + (item.vodDoubanScore?" 评分:"+item.vodDoubanScore:""),
                style: { type:'rect', ratio:1.33 }
            })
        })
    }
    return JSON.stringify({list});
}

async function category(tid, pg, filter, ext) {
    pg = Number(pg)||1;
    try {
        let arr = tid.split("-");
        let url;
        if(arr.length===2){
            url = `${HOST}/vod/show/id/${arr[0]}/type/${arr[1]}/page/${pg}`;
        }else{
            url = `${HOST}/vod/show/id/${tid}/page/${pg}`;
        }
        const html = await request(url);
        const listStr = substring(html, '"list":',7,']}',1);
        const data = safeJson(listStr);
        const list = [];
        if(Array.isArray(data)){
            data.forEach(item=>{
                list.push({
                    vod_id: item.vodId||"",
                    vod_name: item.vodName||"",
                    vod_pic: item.vodPic||"",
                    vod_remarks: (item.vodRemarks||"") + (item.vodDoubanScore?" 评分:"+item.vodDoubanScore:""),
                    style: { type:'rect', ratio:1.33 }
                })
            })
        }
        return JSON.stringify({
            list,
            page:pg,
            pagecount:pg+1,
            limit:20,
            total:9999
        })
    } catch (e) {
        console.error("category error",e.message);
        return JSON.stringify({list:[],page:pg,pagecount:0})
    }
}

async function search(key, quick, pg) {
    pg = Number(pg)||1;
    try {
        const html = await request(`${HOST}/vod/search/${encodeURIComponent(key)}`);
        const a = substring(html,'"result":',11,']}',1);
        const listStr = substring(a,'"list":',7);
        const data = safeJson(listStr);
        const list = [];
        if(Array.isArray(data)){
            data.forEach(item=>{
                list.push({
                    vod_id: item.vodId||"",
                    vod_name: item.vodName||"",
                    vod_pic: item.vodPic||"",
                    vod_remarks: (item.vodRemarks||"") + (item.vodDoubanScore?" 评分:"+item.vodDoubanScore:""),
                    style: { type:'rect', ratio:1.33 }
                })
            })
        }
        return JSON.stringify({
            list,
            page:pg,
            pagecount:pg+1
        })
    } catch (e) {
        console.error("search error",e.message);
        return JSON.stringify({list:[],page:pg,pagecount:0})
    }
}

async function detail(vodId) {
    try {
        const html = await request(`${HOST}/detail/${vodId}`);
        // 提取episodeList集数，复刻原toc逻辑
        let vodIdReal = substring(html,'"vodId":',8,',');
        let playRaw = substring(html,'episodeList',13,']',1);
        playRaw = playRaw.replaceAll('null',vodIdReal);
        const playData = safeJson(playRaw);
        const playArr = [];
        if(Array.isArray(playData)){
            playData.forEach(ep=>{
                if(ep.playUrl && ep.nid){
                    playArr.push(`${ep.name}$${ep.playUrl}/${vodIdReal}/${ep.nid}`);
                }
            })
        }
        // 详情元信息
        const $ = _(html);
        const vod = {
            vod_id: vodId,
            vod_name: $("h1").text().trim()||"",
            vod_pic: "",
            vod_remarks: "",
            vod_year: "",
            vod_area: "",
            vod_actor: "",
            vod_director: $(".director").text().trim()||"",
            vod_content: $(".item-top").text().trim()||"",
            vod_play_from: "金牌",
            vod_play_url: playArr.join("#")
        };
        return JSON.stringify({ list:[vod] });
    } catch (e) {
        console.error("detail error",e.message);
        return JSON.stringify({ list:[] });
    }
}

async function play(flag, playId, flags) {
    try {
        // playId格式 playUrl/vodId/nid
        const purl = `${HOST}/vod/play/${playId}`;
        return JSON.stringify({
            parse: 1,
            url: purl,
            header: {
                "User‑Agent": UA,
                "Referer": HOST
            }
        });
    } catch (e) {
        console.error("play error",e.message);
        return JSON.stringify({ parse:1, url:playId, header:{ "User‑Agent":UA } });
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