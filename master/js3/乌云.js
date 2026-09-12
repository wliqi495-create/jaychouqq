import { Crypto, _ } from 'assets://js/lib/cat.js';
let siteKey = '';
let siteType = 0;

const HOST = "https://wooyun.tv";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36";
const DEFAULT_HEADERS = {
    "User-Agent": UA,
    "Referer": HOST,
    "Content-Type": "application/json"
};

/** tid映射接口topCode */
function mapTopCode(classId) {
    const id = String(classId || '1');
    if (id === '1') return 'movie';
    if (id === '2') return 'tv_series';
    if (id === '3') return 'variety';
    if (id === '4') return 'animation';
    if (id === '72') return 'short_drama';
    if (id === '5') return 'concert';
    if (id === '53') return 'documentary';
    return 'movie';
}

async function request(url, optHeaders = {}, postBody) {
    try {
        const headers = Object.assign({}, DEFAULT_HEADERS, optHeaders);
        const res = await req(url, {
            method: postBody ? "POST" : "GET",
            headers: headers,
            timeout: 15000,
            data: postBody
        });
        return res;
    } catch (e) {
        console.error("request error:", url, e?.message);
        return null;
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

/** post搜索接口 */
async function postMediaSearch(payload) {
    const url = `${HOST}/api/proxy?url=%2Fmovie%2Fmedia%2Fsearch`;
    const body = JSON.stringify(payload);
    return await request(url, {}, body);
}

/** 获取剧集列表接口 */
async function getMediaVideoList(mediaId) {
    const path = `/movie/media/video/list?mediaId=${encodeURIComponent(mediaId)}&lineName=&resolutionCode=`;
    const url = `${HOST}/api/proxy?url=${encodeURIComponent(path)}`;
    return await request(url);
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
            { type_id: "1", type_name: "电影", land: 1, ratio: 1.33 },
            { type_id: "2", type_name: "电视剧", land: 1, ratio: 1.33 },
            { type_id: "3", type_name: "综艺", land: 1, ratio: 1.33 },
            { type_id: "4", type_name: "动漫", land: 1, ratio: 1.33 },
            { type_id: "72", type_name: "短剧", land: 1, ratio: 1.33 },
            { type_id: "5", type_name: "演唱会", land: 1, ratio: 1.33 },
            { type_id: "53", type_name: "纪录片", land: 1, ratio: 1.33 }
        ];
        // 筛选器，对应原uz getSubclassList
        const filterItem = [
            {
                "key": "genre",
                "name": "类型",
                "value": [
                    {"n":"全部","v":""},
                    {"n":"动作","v":"action"},
                    {"n":"喜剧","v":"comedy"},
                    {"n":"剧情","v":"drama"},
                    {"n":"爱情","v":"romance"},
                    {"n":"惊悚","v":"thriller"},
                    {"n":"恐怖","v":"horror"},
                    {"n":"科幻","v":"sci_fi"},
                    {"n":"奇幻","v":"fantasy"},
                    {"n":"战争","v":"war"},
                    {"n":"历史","v":"history"},
                    {"n":"冒险","v":"adventure"},
                    {"n":"犯罪","v":"crime"}
                ]
            },
            {
                "key": "region",
                "name": "地区",
                "value": [
                    {"n":"全部","v":""},
                    {"n":"大陆","v":"china"},
                    {"n":"香港","v":"hongkong"},
                    {"n":"台湾","v":"taiwan"},
                    {"n":"美国","v":"usa"},
                    {"n":"英国","v":"uk"},
                    {"n":"日本","v":"japan"},
                    {"n":"韩国","v":"korea"}
                ]
            },
            {
                "key": "language",
                "name": "语言",
                "value": [
                    {"n":"全部","v":""},
                    {"n":"中文","v":"chinese"},
                    {"n":"英语","v":"english"},
                    {"n":"日语","v":"japanese"},
                    {"n":"韩语","v":"korean"},
                    {"n":"法语","v":"french"},
                    {"n":"德语","v":"german"},
                    {"n":"泰语","v":"thai"},
                    {"n":"俄语","v":"russian"}
                ]
            },
            {
                "key": "year",
                "name": "年份",
                "value": [
                    {"n":"全部","v":""},
                    {"n":"今年","v":"THIS_YEAR"},
                    {"n":"去年","v":"LAST_YEAR"},
                    {"n":"更早","v":"EARLIER"},
                    {"n":"2026","v":"2026"},
                    {"n":"2025","v":"2025"},
                    {"n":"2024","v":"2024"}
                ]
            },
            {
                "key": "sort",
                "name": "排序",
                "value": [
                    {"n":"最新排序","v":"newest"},
                    {"n":"默认排序","v":"default"},
                    {"n":"人气排序","v":"hits"},
                    {"n":"评分排序","v":"score"}
                ]
            }
        ];
        const filters = {};
        classes.forEach(c=>{
            filters[c.type_id] = filterItem;
        });
        return JSON.stringify({ class: classes, filters: filters });
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
        const topCode = mapTopCode(tid);
        // ext筛选参数
        const genre = ext?.genre ?? '';
        const region = ext?.region ?? '';
        const language = ext?.language ?? '';
        const year = ext?.year ?? '';
        const sortCode = ext?.sort ?? 'default';
        const menuCodeList = [];
        if(genre) menuCodeList.push(genre);
        if(region) menuCodeList.push(region);
        if(language) menuCodeList.push(language);
        if(year) menuCodeList.push(year);

        const payload = {
            menuCodeList: menuCodeList,
            pageIndex: String(pg),
            pageSize: 24,
            searchKey: "",
            sortCode: sortCode,
            topCode: topCode
        };
        const resp = await postMediaSearch(payload);
        const json = safeJson(resp?.content);
        const records = json?.data?.records || [];
        const list = [];
        records.forEach(item=>{
            list.push({
                vod_id: `${topCode}|${item.id}`,
                vod_name: item.title || "",
                vod_pic: item.posterUrlS3 || item.posterUrl || "",
                vod_remarks: item.episodeStatus || "",
                style: { type: 'rect', ratio:1.33 }
            });
        });
        return JSON.stringify({
            list: list,
            page: pg,
            pagecount: pg+1,
            limit:24,
            total: json?.data?.total || 9999
        });
    } catch (e) {
        console.error("category error",e.message);
        return JSON.stringify({ list:[], page:pg, pagecount:0 });
    }
}

async function detail(vodId) {
    try {
        const parts = String(vodId).split('|');
        const topCode = parts[0] || 'movie';
        const mediaId = parts[1] || '';
        // 获取剧集token列表
        const listResp = await getMediaVideoList(mediaId);
        const listJson = safeJson(listResp?.content);
        const seasons = listJson?.data || [];
        const epArr = [];
        for(const s of seasons) {
            const videoList = s.videoList || [];
            for(const ep of videoList) {
                const epName = ep.remark || `第${ep.epNo||1}集`;
                const token = `wooyun://play?mediaId=${encodeURIComponent(mediaId)}&videoId=${encodeURIComponent(ep.id)}`;
                epArr.push(`${epName}$${token}`);
            }
        }
        const vodObj = {
            vod_id: vodId,
            vod_name: "",
            vod_pic: "",
            vod_year: "",
            vod_area: "",
            vod_actor: "",
            vod_director: "",
            vod_content: "",
            vod_play_from: "线路1",
            vod_play_url: epArr.join('#')
        };
        return JSON.stringify({ list:[vodObj] });
    } catch (e) {
        console.error("detail error",e.message);
        return JSON.stringify({ list:[] });
    }
}

async function play(flag, playId, flags) {
    try {
        let rawPlayUrl = "";
        if(!playId.startsWith("wooyun://play?")){
            return JSON.stringify({
                parse:0,
                url: playId,
                header: { "User-Agent":UA, "Referer":HOST }
            });
        }
        //解析自定义协议参数
        const qs = playId.split('?')[1] || "";
        let mediaId = "", videoId = "";
        qs.split('&').forEach(pair=>{
            const kv = pair.split('=');
            if(kv.length===2){
                const k = kv[0];
                const v = decodeURIComponent(kv[1]);
                if(k==="mediaId") mediaId = v;
                if(k==="videoId") videoId = v;
            }
        });
        //拉取播放列表拿到playUrl
        const listResp = await getMediaVideoList(mediaId);
        const listJson = safeJson(listResp?.content);
        const seasons = listJson?.data || [];
        for(const s of seasons){
            const vl = s.videoList||[];
            for(const ep of vl){
                if(String(ep.id) === String(videoId)){
                    rawPlayUrl = ep.playUrl || "";
                    break;
                }
            }
            if(rawPlayUrl) break;
        }
        let finalUrl = rawPlayUrl;
        if(rawPlayUrl){
            const jumpRes = await request(rawPlayUrl);
            if(jumpRes?.headers){
                const loc = jumpRes.headers.location || jumpRes.headers.Location;
                if(loc){
                    if(/^https?:\/\//i.test(loc)) finalUrl = loc;
                    else if(loc.startsWith('/')){
                        const origin = rawPlayUrl.match(/^https?:\/\/[^/]+/i)?.[0] || HOST;
                        finalUrl = origin + loc;
                    }
                }
                if(jumpRes.url && /^https?:\/\//.test(jumpRes.url)) finalUrl = jumpRes.url;
            }
        }
        return JSON.stringify({
            parse:0,
            url: finalUrl,
            header: { "User-Agent":UA, "Referer":HOST }
        });
    } catch (e) {
        console.error("play error",e.message);
        return JSON.stringify({ parse:1, url:playId, header:{ "User-Agent":UA } });
    }
}

async function search(key, quick, pg) {
    pg = Number(pg)||1;
    try {
        const keyword = String(key||"").trim();
        if(!keyword){
            return JSON.stringify({ list:[], page:pg, pagecount:0, land:1, ratio:1.33 });
        }
        const payload = {
            menuCodeList:[],
            pageIndex:String(pg),
            pageSize:10,
            searchKey: keyword,
            topCode:""
        };
        const resp = await postMediaSearch(payload);
        const json = safeJson(resp?.content);
        const records = json?.data?.records || [];
        const list = [];
        records.forEach(item=>{
            const mediaTypeCode = item.mediaType?.code || "movie";
            list.push({
                vod_id: `${mediaTypeCode}|${item.id}`,
                vod_name: item.title || "",
                vod_pic: item.posterUrlS3 || item.posterUrl || "",
                vod_remarks: item.episodeStatus || "",
                style: { type:'rect', ratio:1.33 }
            });
        });
        return JSON.stringify({
            list: list,
            page: pg,
            pagecount: pg+1,
            limit:10,
            total: json?.data?.total||9999,
            land:1,
            ratio:1.33
        });
    } catch (e) {
        console.error("search error",e.message);
        return JSON.stringify({ list:[], page:pg, pagecount:0, land:1, ratio:1.33 });
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