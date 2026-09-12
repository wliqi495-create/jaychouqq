import { Crypto, jinja2, _ } from 'assets://js/lib/cat.js';
let siteKey = '';
let siteType = 0;
// 豆瓣frodo App专用UA + bid cookie，绕过简单风控
const DOUBA_UA = 'api-client/1 com.douban.frodo/7.18.0(240) Android/30  product/Redmi vendor/Xiaomi model/Mi11 rom/android network/wifi udid/a0f9cde79ec841a748625f766273e8f4333ed9c1 platform/mobile';
const DOUBA_COOKIE = 'bid=EGo8Z7aSUAI;';
// 备用apikey池，一个失效自动换下一个
const API_KEYS = [
    "0dad551ec0f84ed02907ff5c42e8e7c0",
    "0ac44ae016490db2204ce0a042db2916",
    "0b2bdeda43b5688921839c8ecb20399b"
];
let apiKeyIndex = 0;

async function request(reqUrl) {
    let res = await req(reqUrl, {
        method: 'get',
        headers: {
            'User-Agent': DOUBA_UA,
            'Cookie': DOUBA_COOKIE,
            'Referer': 'https://m.douban.com/'
        },
        timeout: 60000
    });
    return res?.content ?? '';
}

// 获取可用apikey，简单轮询
function getApiKey() {
    return API_KEYS[apiKeyIndex % API_KEYS.length];
}

async function init(cfg) {
    siteKey = cfg.skey;
    siteType = cfg.stype;
}

function home(filter) {
    const classes = [
        { type_name: "热门电影", type_id: "movie_hot", land: 1, ratio: 1.33 },
        { type_name: "热门剧集", type_id: "tv_hot", land: 1, ratio: 1.33 },
        { type_name: "高分电影", type_id: "movie_highscore", land: 1, ratio: 1.33 },
        { type_name: "国产剧", type_id: "tv_domestic", land: 1, ratio: 1.33 },
        { type_name: "美剧", type_id: "tv_american", land: 1, ratio: 1.33 },
        { type_name: "日剧", type_id: "tv_japanese", land: 1, ratio: 1.33 },
        { type_name: "韩剧", type_id: "tv_korean", land: 1, ratio: 1.33 },
        { type_name: "动画", type_id: "tv_animation", land: 1, ratio: 1.33 },
        { type_name: "纪录片", type_id: "documentary", land: 1, ratio: 1.33 }
    ];
    return JSON.stringify({ class: classes });
}

async function homeVod() {
    try {
        const apikey = getApiKey();
        const url = `https://frodo.douban.com/api/v2/movie/category_ranks?count=30&category=recent_hot&apikey=${apikey}`;
        const respText = await request(url);
        console.log("homeVod原始返回：", respText.substring(0,500));
        const json = safeJson(respText);
        if (!json || json.code) {
            apiKeyIndex++; // apikey失效轮换
            return JSON.stringify({ list: [] });
        }
        const items = json?.items ?? [];
        const list = parseVodItems(items);
        return JSON.stringify({ list });
    } catch (e) {
        console.error("homeVod err", e.message);
    }
    return JSON.stringify({ list: [] });
}

async function category(tid, page, filter, extend) {
    if (page < 1) page = 1;
    const start = (page - 1) * 30;
    const apikey = getApiKey();
    let apiUrl = "";
    switch (tid) {
        case "movie_hot":
            apiUrl = `https://frodo.douban.com/api/v2/movie/category_ranks?count=30&start=${start}&category=recent_hot&apikey=${apikey}`;
            break;
        case "movie_highscore":
            apiUrl = `https://frodo.douban.com/api/v2/movie/category_ranks?count=30&start=${start}&category=high_score&apikey=${apikey}`;
            break;
        case "tv_hot":
            apiUrl = `https://frodo.douban.com/api/v2/subject_collection/show_hot/items?count=30&start=${start}&apikey=${apikey}`;
            break;
        case "tv_domestic":
            apiUrl = `https://frodo.douban.com/api/v2/subject_collection/tv_domestic/items?count=30&start=${start}&apikey=${apikey}`;
            break;
        case "tv_american":
            apiUrl = `https://frodo.douban.com/api/v2/subject_collection/tv_american/items?count=30&start=${start}&apikey=${apikey}`;
            break;
        case "tv_japanese":
            apiUrl = `https://frodo.douban.com/api/v2/subject_collection/tv_japanese/items?count=30&start=${start}&apikey=${apikey}`;
            break;
        case "tv_korean":
            apiUrl = `https://frodo.douban.com/api/v2/subject_collection/tv_korean/items?count=30&start=${start}&apikey=${apikey}`;
            break;
        case "tv_animation":
            apiUrl = `https://frodo.douban.com/api/v2/subject_collection/tv_animation/items?count=30&start=${start}&apikey=${apikey}`;
            break;
        case "documentary":
            apiUrl = `https://frodo.douban.com/api/v2/subject_collection/documentary/items?count=30&start=${start}&apikey=${apikey}`;
            break;
        default:
            return JSON.stringify({ list: [], page: 1, pagecount: 0, limit: 30, total: 0 });
    }

    try {
        const respText = await request(apiUrl);
        console.log(`category[${tid}]原始响应：`, respText.substring(0,600));
        const json = safeJson(respText);
        if (!json || json.code) {
            apiKeyIndex++;
            return JSON.stringify({ list: [], page: 1, pagecount: 0, limit: 30, total: 0 });
        }
        const items = json?.items ?? [];
        const list = parseVodItems(items);
        const total = json?.total ?? 0;
        const pagecount = total > 0 ? Math.ceil(total / 30) : page;
        return JSON.stringify({
            list,
            page,
            pagecount,
            limit: 30,
            total
        });
    } catch (e) {
        console.error("category err", e.message);
    }
    return JSON.stringify({ list: [], page: 1, pagecount: 0, limit: 30, total: 0 });
}

async function detail(ids) {
    try {
        const apikey = getApiKey();
        const detailUrl = `https://frodo.douban.com/api/v2/movie/${ids}?apikey=${apikey}`;
        const respText = await request(detailUrl);
        const json = safeJson(respText);
        if (!json || json.code) throw new Error("detail接口返回错误");

        let pic = json?.pic?.normal ?? '';
        if (pic.startsWith('//')) pic = 'https:' + pic;

        const vod = {
            vod_id: ids,
            vod_name: json.title || '',
            vod_pic: pic,
            vod_remarks: json.rating?.value ? `评分:${json.rating.value}` : '',
            vod_year: json.year || '',
            vod_area: json?.countries?.join(' / ') || '',
            vod_actor: json?.actors?.map(i => i.name).join(' / ') || '',
            vod_director: json?.directors?.map(i => i.name).join(' / ') || '',
            vod_content: json.intro || '',
            vod_play_from: '豆瓣信息',
            vod_play_url: '无播放源$#'
        };
        return JSON.stringify({ list: [vod] });
    } catch (e) {
        console.error("detail err", e.message);
    }
    return JSON.stringify({ list: [] });
}

async function play(flag, id, flags) {
    //仅信息源，无播放
    return JSON.stringify({ jx: 0, parse: 0, url: "", header: {} });
}

async function search(key, quick, pg) {
    if (pg < 1) pg = 1;
    const start = (pg - 1) * 30;
    const apikey = getApiKey();
    const url = `https://frodo.douban.com/api/v2/search?q=${encodeURIComponent(key)}&start=${start}&count=30&apikey=${apikey}`;
    try {
        const respText = await request(url);
        console.log("search原始返回：", respText.substring(0,600));
        const json = safeJson(respText);
        if (!json || json.code) {
            apiKeyIndex++;
            return JSON.stringify({ list: [], page: 1, pagecount: 0, limit: 30, total: 0 });
        }
        //兼容搜索返回target嵌套结构
        let rawItems = json?.items ?? [];
        let realItems = [];
        for(let it of rawItems){
            if(it.target) realItems.push(it.target);
            else realItems.push(it);
        }
        //只保留电影、剧集
        const filterItems = realItems.filter(x => x.type === "movie" || x.type === "tv");
        const list = parseVodItems(filterItems);
        const total = json?.total ?? 0;
        const pagecount = total > 0 ? Math.ceil(total / 30) : pg;
        return JSON.stringify({
            list,
            page: pg,
            pagecount,
            limit: 30,
            total
        });
    } catch (e) {
        console.error("search err", e.message);
    }
    return JSON.stringify({ list: [], page: 1, pagecount: 0, limit: 30, total: 0 });
}

/**
 * 修复片库列表解析
 * 兼容两种返回结构：直接顶层字段 / target嵌套对象
 */
function parseVodItems(items) {
    const out = [];
    if (!Array.isArray(items)) return out;
    for (let item of items) {
        //兼容搜索返回的target嵌套
        const subj = item.target ? item.target : item;
        if (!subj?.id) continue;
        let pic = subj?.pic?.normal ?? '';
        if (pic.startsWith('//')) pic = 'https:' + pic;
        const name = subj.title || '';
        if (!name) continue;
        let remark = '';
        if (subj.rating?.value) remark = `⭐${subj.rating.value}`;
        if (subj.year) remark += ` ${subj.year}`;
        out.push({
            vod_id: String(subj.id),
            vod_name: name,
            vod_pic: pic,
            vod_remarks: remark,
            style: { type: 'rect', ratio: 1.33 }
        });
    }
    return out;
}

function safeJson(str) {
    try {
        if (!str) return null;
        return JSON.parse(str);
    } catch (err) {
        console.log("JSON解析失败，原始片段：", String(str).substring(0,300));
        return null;
    }
}

export function __jsEvalReturn() {
    return {
        init,
        home,
        homeVod,
        category,
        detail,
        play,
        search,
        proxy: null
    };
}