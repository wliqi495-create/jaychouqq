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

/** 图片路径修复 */
function fixImageUrl(url) {
    if (!url) return '';
    url = url.trim().replace(/^['"]+|['"]+$/g, '');
    if (url.startsWith('//')) return 'https:' + url;
    if (url.startsWith('/')) return HOST + url;
    if (url.startsWith('http://')) return url.replace('http://', 'https://');
    return url;
}

/** 正则提取视频列表，提取 vid、标题、封面、备注 */
function parseVodList(html) {
    const list = [];
    // 匹配 /voddetail/数字/ 链接
    const regLink = /<a[^>]+href="(\/voddetail\/(\d+)\/)"[^>]*>([\s\S]*?)<\/a>/g;
    let match;
    while ((match = regLink.exec(html)) !== null) {
        const detailHref = match[1];
        const vodId = match[2];
        const innerHtml = match[3];
        // 提取标题
        let title = '';
        const titleReg = /title="([^"]+)"/;
        const tMatch = innerHtml.match(titleReg);
        if (tMatch) title = tMatch[1].trim();
        if (!title) {
            const textReg = />([^<]+)</;
            const txtMatch = innerHtml.match(textReg);
            if (txtMatch) title = txtMatch[1].trim();
        }
        if (!title) continue;
        //提取封面
        let pic = '';
        const imgReg = /data-original="([^"]+)"/;
        const imgSrcReg = /src="([^"]+)"/;
        const imgMatch = innerHtml.match(imgReg) || innerHtml.match(imgSrcReg);
        if (imgMatch) pic = fixImageUrl(imgMatch[1]);
        if (!pic) pic = "https://placehold.co/300x450/2c3e50/ecf0f1?text=" + encodeURIComponent(title.substring(0,8));
        //提取更新备注
        let remarks = '';
        const noteReg = /class="[^"]*note[^"]*">([^<]+)</;
        const noteMatch = innerHtml.match(noteReg);
        if(noteMatch) remarks = noteMatch[1].trim();

        list.push({
            vod_id: vodId,
            vod_name: title,
            vod_pic: pic,
            vod_remarks: remarks,
            style: { type: 'rect', ratio:1.33 }
        })
    }
    //去重
    const seen = new Set();
    return list.filter(item=>{
        if(seen.has(item.vod_id)) return false;
        seen.add(item.vod_id);
        return true;
    })
}

/** 解析详情页面，元数据+播放集数 */
function parseDetail(html) {
    const result = {
        vod_name:"",
        vod_pic:"",
        vod_year:"",
        vod_area:"",
        vod_actor:"",
        vod_director:"",
        vod_content:"",
        playList:[]
    }
    //标题
    const titleMatch = html.match(/<h1[^>]*>([^<]+)</);
    if(titleMatch) result.vod_name = titleMatch[1].trim();
    //封面
    const picMatch = html.match(/og:image" content="([^"]+)"/) || html.match(/data-original="([^"]+)"/);
    if(picMatch) result.vod_pic = fixImageUrl(picMatch[1]);
    //简介
    const descMatch = html.match(/module-info-introduction-content[^>]*>([\s\S]*?)<\//);
    if(descMatch) result.vod_content = descMatch[1].replace(/<[^>]+>/g,"").trim();

    //提取播放集链接 /play/xxx-xxx-xxx/
    const playReg = /<a[^>]+href="(\/play\/([^\/]+)\/)"[^>]*>([^<]+)</g;
    let pm;
    const playArr = [];
    while((pm = playReg.exec(html))!==null){
        const playId = pm[2];
        const epName = pm[3].trim() || "正片";
        playArr.push(`${epName}$${playId}`);
    }
    result.playList = playArr;
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
            { type_id: "1", type_name: "电影", land:1, ratio:1.33 },
            { type_id: "2", type_name: "剧集", land:1, ratio:1.33 },
            { type_id: "3", type_name: "综艺", land:1, ratio:1.33 },
            { type_id: "4", type_name: "动漫", land:1, ratio:1.33 }
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
        let url;
        if(pg >1){
            url = `${HOST}/vodtype/${tid}/page/${pg}/`;
        }else{
            url = `${HOST}/vodtype/${tid}/`;
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
        //匹配 player_aaaa url m3u8
        let videoUrl = null;
        const regPlayer = /var player_aaaa=.*?"url":"([^"]+\.m3u8)"/;
        const m = resp.match(regPlayer);
        if(m && m[1]){
            videoUrl = m[1].replace(/\\\//g,"/");
            if(videoUrl.startsWith("//")) videoUrl = "https:" + videoUrl;
        }
        if(!videoUrl){
            return JSON.stringify({
                parse:1,
                url: playUrl,
                header:{
                    "User-Agent":UA,
                    "Referer":HOST+"/"
                }
            })
        }
        return JSON.stringify({
            parse:0,
            url: videoUrl,
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
