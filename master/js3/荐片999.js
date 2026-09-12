import { Crypto, _ } from 'assets://js/lib/cat.js';
let siteKey = '';
let siteType = 0;
const HOST = "https://api.ztcgi.com";
const UA = "Mozilla/5.0 (Linux; Android 9; V2196A Build/PQ3A.190705.08211809; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/91.0.4472.114 Mobile Safari/537.36;webank/h5face;webank/1.0;netType:NETWORK_WIFI;appVersion:416;packageName:com.jp3.xg3";
const DEFAULT_HEADERS = {
    "User-Agent": UA,
    "Accept": "*/*"
};
let imghost = '';

async function request(url, optHeaders = {}) {
    try {
        const headers = Object.assign({}, DEFAULT_HEADERS, optHeaders);
        const res = await req(url, {
            method: "GET",
            headers: headers,
            timeout: 15000
        });
        return res;
    } catch (e) {
        console.error("request error:", url, e?.message);
        return null;
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

async function init(cfg) {
    try {
        siteKey = cfg.skey;
        siteType = cfg.stype;
        imghost = 'https://img.jianpian.com';
        const res = await request(`${HOST}/api/appAuthConfig`);
        if(res && res.content){
            let config = safeJson(res.content);
            if(config && config.data && config.data.imgDomain){
                imghost = `https://${config.data.imgDomain}`;
            }
        }
    } catch (e) {
        console.error("init error", e.message);
        imghost = 'https://img.jianpian.com';
    }
}

function home(filter) {
    try {
        let classes = [
            {type_id: '1', type_name: '电影'},
            {type_id: '2', type_name: '电视剧'},
            {type_id: '3', type_name: '动漫'},
            {type_id: '4', type_name: '综艺'}
        ];
        const filterItem = [
            {"key": "cateId", "name": "分类", "value": [{"v": "1", "n": "剧情"}, {"v": "2", "n": "爱情"}, {"v": "3", "n": "动画"}, {"v": "4", "n": "喜剧"}, {"v": "5", "n": "战争"}, {"v": "6", "n": "歌舞"}, {"v": "7", "n": "古装"}, {"v": "8", "n": "奇幻"}, {"v": "9", "n": "冒险"}, {"v": "10", "n": "动作"}, {"v": "11", "n": "科幻"}, {"v": "12", "n": "悬疑"}, {"v": "13", "n": "犯罪"}, {"v": "14", "n": "家庭"}, {"v": "15", "n": "传记"}, {"v": "16", "n": "运动"}, {"v": "18", "n": "惊悚"}, {"v": "20", "n": "短片"}, {"v": "21", "n": "历史"}, {"v": "22", "n": "音乐"}, {"v": "23", "n": "西部"}, {"v": "24", "n": "武侠"}, {"v": "25", "n": "恐怖"}]},
            {"key": "area", "name": "地區", "value": [{"v": "1", "n": "国产"}, {"v": "3", "n": "中国香港"}, {"v": "6", "n": "中国台湾"}, {"v": "5", "n": "美国"}, {"v": "18", "n": "韩国"}, {"v": "2", "n": "日本"}]},
            {"key": "year", "name": "年代", "value": [{"v": "107", "n": "2025"}, {"v": "119", "n": "2024"}, {"v": "153", "n": "2023"}, {"v": "101", "n": "2022"}, {"v": "118", "n": "2021"}, {"v": "16", "n": "2020"}, {"v": "7", "n": "2019"}, {"v": "22", "n": "2016"}, {"v": "2015", "n": "2015以前"}]},
            {"key": "sort", "name": "排序", "value": [{"v": "update", "n": "最新"}, {"v": "hot", "n": "最热"}, {"v": "rating", "n": "评分"}]}
        ];
        let filterObj = {"1": filterItem, "2": filterItem, "3": filterItem, "4": filterItem};
        return JSON.stringify({ class: classes, filters: filterObj });
    } catch (e) {
        console.error("home error", e.message);
        return JSON.stringify({ class: [], filters: {} });
    }
}

async function homeVod() {
    try {
        const res = await request(`${HOST}/api/slide/list?pos_id=88`, { "Referer": HOST });
        if(!res || !res.content) return JSON.stringify({ list: [] });
        let json = safeJson(res.content);
        if(!json || !json.data) return JSON.stringify({ list: [] });
        const list = json.data.map(item => {
            let pic = item.thumbnail.includes('http') ? item.thumbnail : `${imghost}${item.thumbnail}`;
            return {
                vod_id: item.jump_id,
                vod_name: item.title,
                vod_pic: fixPicUrl(pic),
                vod_remarks: ""
            };
        });
        return JSON.stringify({ list });
    } catch (e) {
        console.error("homeVod error", e.message);
        return JSON.stringify({ list: [] });
    }
}

async function category(tid, pg, filter, ext) {
    pg = Number(pg) || 1;
    try {
        let url = `${HOST}/api/crumb/list?fcate_pid=${tid}&category_id=&area=${ext?.area || ''}&year=${ext?.year || ''}&type=${ext?.cateId || ''}&sort=${ext?.sort || ''}&page=${pg}`;
        const res = await request(url, { "Referer": HOST });
        if(!res || !res.content) return JSON.stringify({ list:[], page:pg, pagecount:0 });
        let json = safeJson(res.content);
        if(!json || !json.data) return JSON.stringify({ list:[], page:pg, pagecount:0 });
        const list = json.data.map(item => {
            let pic = item.path.includes('http') ? item.path : `${imghost}${item.path}`;
            return {
                vod_id: item.id,
                vod_name: item.title,
                vod_pic: fixPicUrl(pic),
                vod_remarks: item.mask || ""
            };
        });
        return JSON.stringify({
            list,
            page: pg,
            pagecount: 99,
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
        let url = `${HOST}/api/v2/search/videoV2?key=${kw}&category_id=88&page=${pg}&pageSize=20`;
        const res = await request(url, { "Referer": HOST });
        if(!res || !res.content) return JSON.stringify({ list:[], page:pg, pagecount:0 });
        let json = safeJson(res.content);
        if(!json || !json.data) return JSON.stringify({ list:[], page:pg, pagecount:0 });
        const list = json.data.map(item => {
            let pic = item.thumbnail.includes('http') ? item.thumbnail : `${imghost}${item.thumbnail}`;
            return {
                vod_id: item.id,
                vod_name: item.title,
                vod_pic: fixPicUrl(pic),
                vod_remarks: item.mask || ""
            };
        });
        return JSON.stringify({
            list,
            page:pg,
            pagecount:10
        });
    } catch(e){
        console.error("search error",e.message);
        return JSON.stringify({ list:[], page:pg, pagecount:0 });
    }
}

async function detail(vodId) {
    try {
        const res = await request(`${HOST}/api/video/detailv2?id=${vodId}`, { "Referer": HOST });
        if(!res || !res.content) return JSON.stringify({ list:[] });
        let json = safeJson(res.content);
        if(!json || !json.data) return JSON.stringify({ list:[] });
        const data = json.data;

        let play_from = "";
        let play_url = "";
        if(data.source_list_source && Array.isArray(data.source_list_source)){
            play_from = data.source_list_source.map(item => item.name).join('$$$').replace(/常规线路/g, '边下边播');
            play_url = data.source_list_source.map(play =>
                play.source_list.map(({source_name, url}) => `${source_name}$${b64EncodeUtf8(url)}`).join('#')
            ).join('$$$');
        }

        let pic = data.thumbnail.includes('http') ? data.thumbnail : `${imghost}${data.thumbnail}`;

        const vod = {
            vod_id: data.id,
            vod_name: data.title || "",
            vod_pic: fixPicUrl(pic),
            vod_year: data.year || "",
            vod_area: data.area || "",
            vod_remarks: data.mask || "",
            vod_actor: "",
            vod_director: "",
            vod_content: data.description || "",
            vod_play_from: play_from,
            vod_play_url: play_url
        };
        return JSON.stringify({ list:[vod] });
    } catch (e) {
        console.error("detail error",e.message);
        return JSON.stringify({ list:[] });
    }
}

async function play(flag, id, flags) {
    try {
        const realId = b64DecodeUtf8(id||"");
        if(!realId){
            return JSON.stringify({ parse:1, url:"", header:{"User-Agent":UA,"Referer":HOST+"/"} });
        }
        let playUrl = realId;
        if (!realId.includes(".m3u8") && !realId.includes(".mp4")) {
            playUrl = `tvbox-xg:${realId}`;
        }
        return JSON.stringify({
            parse: 0,
            url: playUrl,
            header:{
                "User-Agent":UA,
                "Referer": HOST
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
//（注：内容由AI生成）
