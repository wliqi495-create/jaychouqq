import { Crypto, _ } from 'assets://js/lib/cat.js';
let siteKey = '';
let siteType = 0;
let extendObj = {};

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const DEFAULT_HEADERS = {
    "User-Agent": UA,
    "Referer": "https://movie.douban.com/",
    "Accept": "*/*"
};

async function request(url, optHeaders = {}) {
    try {
        const headers = Object.assign({}, DEFAULT_HEADERS, optHeaders || {});
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

function text(value) {
    return String(value == null ? "" : value).trim();
}

// 【关键修复】CAT标准filters，key=分类type_id，值为该分类的筛选数组
const CAT_FILTERS = {
    "movie": [
        { key: "category", name: "分类", value: [
            { name: "全部", value: "" },
            { name: "热门", value: "热门" },
            { name: "最新", value: "最新" },
            { name: "豆瓣高分", value: "豆瓣高分" },
            { name: "冷门佳片", value: "冷门佳片" }
        ]},
        { key: "type", name: "地区", value: [
            { name: "全部", value: "" },
            { name: "华语", value: "华语" },
            { name: "欧美", value: "欧美" },
            { name: "韩国", value: "韩国" },
            { name: "日本", value: "日本" }
        ]}
    ],
    "tv": [
        { key: "type", name: "类型", value: [
            { name: "全部", value: "" },
            { name: "国产剧", value: "tv_domestic" },
            { name: "欧美剧", value: "tv_american" },
            { name: "日剧", value: "tv_japanese" },
            { name: "韩剧", value: "tv_korean" },
            { name: "动漫", value: "tv_animation" },
            { name: "纪录片", value: "tv_documentary" }
        ]}
    ],
    "show": [
        { key: "type", name: "类型", value: [
            { name: "全部", value: "" },
            { name: "综合", value: "show" },
            { name: "国内", value: "show_domestic" },
            { name: "国外", value: "show_foreign" }
        ]}
    ],
    "movie_filter": [
        { key: "genre", name: "类型", value: [
            { name: "全部", value: "" },
            { name: "喜剧", value: "喜剧" },
            { name: "爱情", value: "爱情" },
            { name: "动作", value: "动作" },
            { name: "科幻", value: "科幻" },
            { name: "动画", value: "动画" },
            { name: "悬疑", value: "悬疑" },
            { name: "犯罪", value: "犯罪" },
            { name: "惊悚", value: "惊悚" },
            { name: "冒险", value: "冒险" },
            { name: "音乐", value: "音乐" },
            { name: "历史", value: "历史" },
            { name: "奇幻", value: "奇幻" },
            { name: "恐怖", value: "恐怖" },
            { name: "战争", value: "战争" },
            { name: "传记", value: "传记" },
            { name: "歌舞", value: "歌舞" },
            { name: "武侠", value: "武侠" },
            { name: "情色", value: "情色" },
            { name: "灾难", value: "灾难" },
            { name: "西部", value: "西部" },
            { name: "纪录片", value: "纪录片" },
            { name: "短片", value: "短片" }
        ]},
        { key: "region", name: "地区", value: [
            { name: "全部", value: "" },
            { name: "华语", value: "华语" },
            { name: "欧美", value: "欧美" },
            { name: "韩国", value: "韩国" },
            { name: "日本", value: "日本" },
            { name: "中国大陆", value: "中国大陆" },
            { name: "美国", value: "美国" },
            { name: "中国香港", value: "中国香港" },
            { name: "中国台湾", value: "中国台湾" },
            { name: "英国", value: "英国" },
            { name: "法国", value: "法国" },
            { name: "德国", value: "德国" },
            { name: "意大利", value: "意大利" },
            { name: "西班牙", value: "西班牙" },
            { name: "印度", value: "印度" },
            { name: "泰国", value: "泰国" },
            { name: "俄罗斯", value: "俄罗斯" },
            { name: "加拿大", value: "加拿大" },
            { name: "澳大利亚", value: "澳大利亚" },
            { name: "爱尔兰", value: "爱尔兰" },
            { name: "瑞典", value: "瑞典" },
            { name: "巴西", value: "巴西" },
            { name: "丹麦", value: "丹麦" }
        ]},
        { key: "year", name: "年代", value: [
            { name: "全部", value: "" },
            { name: "2026", value: "2026" },
            { name: "2025", value: "2025" },
            { name: "2024", value: "2024" },
            { name: "2023", value: "2023" },
            { name: "2022", value: "2022" },
            { name: "2021", value: "2021" },
            { name: "2020", value: "2020" },
            { name: "2019", value: "2019" },
            { name: "2020年代", value: "2020年代" },
            { name: "2010年代", value: "2010年代" },
            { name: "2000年代", value: "2000年代" },
            { name: "90年代", value: "90年代" },
            { name: "80年代", value: "80年代" },
            { name: "70年代", value: "70年代" },
            { name: "60年代", value: "60年代" },
            { name: "更早", value: "更早" }
        ]},
        { key: "sort", name: "排序", value: [
            { name: "热度", value: "U" },
            { name: "评分", value: "S" },
            { name: "时间", value: "R" }
        ]}
    ],
    "tv_filter": [
        { key: "genre", name: "类型", value: [
            { name: "全部", value: "" },
            { name: "喜剧", value: "喜剧" },
            { name: "爱情", value: "爱情" },
            { name: "悬疑", value: "悬疑" },
            { name: "动画", value: "动画" },
            { name: "武侠", value: "武侠" },
            { name: "古装", value: "古装" },
            { name: "家庭", value: "家庭" },
            { name: "犯罪", value: "犯罪" },
            { name: "科幻", value: "科幻" },
            { name: "恐怖", value: "恐怖" },
            { name: "历史", value: "历史" },
            { name: "战争", value: "战争" },
            { name: "动作", value: "动作" },
            { name: "冒险", value: "冒险" },
            { name: "传记", value: "传记" },
            { name: "剧情", value: "剧情" },
            { name: "奇幻", value: "奇幻" },
            { name: "惊悚", value: "惊悚" },
            { name: "灾难", value: "灾难" },
            { name: "歌舞", value: "歌舞" },
            { name: "音乐", value: "音乐" }
        ]},
        { key: "region", name: "地区", value: [
            { name: "全部", value: "" },
            { name: "华语", value: "华语" },
            { name: "欧美", value: "欧美" },
            { name: "国外", value: "国外" },
            { name: "韩国", value: "韩国" },
            { name: "日本", value: "日本" },
            { name: "中国大陆", value: "中国大陆" },
            { name: "中国香港", value: "中国香港" },
            { name: "美国", value: "美国" },
            { name: "英国", value: "英国" },
            { name: "泰国", value: "泰国" },
            { name: "中国台湾", value: "中国台湾" },
            { name: "意大利", value: "意大利" },
            { name: "法国", value: "法国" },
            { name: "德国", value: "德国" },
            { name: "西班牙", value: "西班牙" },
            { name: "俄罗斯", value: "俄罗斯" },
            { name: "瑞典", value: "瑞典" },
            { name: "巴西", value: "巴西" },
            { name: "丹麦", value: "丹麦" },
            { name: "印度", value: "印度" },
            { name: "加拿大", value: "加拿大" },
            { name: "爱尔兰", value: "爱尔兰" },
            { name: "澳大利亚", value: "澳大利亚" }
        ]},
        { key: "year", name: "年代", value: [
            { name: "全部", value: "" },
            { name: "2026", value: "2026" },
            { name: "2025", value: "2025" },
            { name: "2024", value: "2024" },
            { name: "2023", value: "2023" },
            { name: "2022", value: "2022" },
            { name: "2021", value: "2021" },
            { name: "2020", value: "2020" },
            { name: "2019", value: "2019" },
            { name: "2020年代", value: "2020年代" },
            { name: "2010年代", value: "2010年代" },
            { name: "2000年代", value: "2000年代" },
            { name: "90年代", value: "90年代" },
            { name: "80年代", value: "80年代" },
            { name: "70年代", value: "70年代" },
            { name: "60年代", value: "60年代" },
            { name: "更早", value: "更早" }
        ]},
        { key: "platform", name: "平台", value: [
            { name: "全部", value: "" },
            { name: "腾讯视频", value: "腾讯视频" },
            { name: "爱奇艺", value: "爱奇艺" },
            { name: "优酷", value: "优酷" },
            { name: "湖南卫视", value: "湖南卫视" },
            { name: "Netflix", value: "Netflix" },
            { name: "HBO", value: "HBO" },
            { name: "BBC", value: "BBC" },
            { name: "NHK", value: "NHK" },
            { name: "CBS", value: "CBS" },
            { name: "NBC", value: "NBC" },
            { name: "tvN", value: "tvN" }
        ]},
        { key: "sort", name: "排序", value: [
            { name: "热度", value: "U" },
            { name: "评分", value: "S" },
            { name: "时间", value: "R" }
        ]}
    ],
    "show_filter": [
        { key: "genre", name: "类型", value: [
            { name: "全部", value: "" },
            { name: "真人秀", value: "真人秀" },
            { name: "脱口秀", value: "脱口秀" },
            { name: "音乐", value: "音乐" },
            { name: "歌舞", value: "歌舞" }
        ]},
        { key: "region", name: "地区", value: [
            { name: "全部", value: "" },
            { name: "华语", value: "华语" },
            { name: "欧美", value: "欧美" },
            { name: "国外", value: "国外" },
            { name: "韩国", value: "韩国" },
            { name: "日本", value: "日本" },
            { name: "中国大陆", value: "中国大陆" },
            { name: "中国香港", value: "中国香港" },
            { name: "美国", value: "美国" },
            { name: "英国", value: "英国" },
            { name: "泰国", value: "泰国" },
            { name: "中国台湾", value: "中国台湾" },
            { name: "意大利", value: "意大利" },
            { name: "法国", value: "法国" },
            { name: "德国", value: "德国" },
            { name: "西班牙", value: "西班牙" },
            { name: "俄罗斯", value: "俄罗斯" },
            { name: "瑞典", value: "瑞典" },
            { name: "巴西", value: "巴西" },
            { name: "丹麦", value: "丹麦" },
            { name: "印度", value: "印度" },
            { name: "加拿大", value: "加拿大" },
            { name: "爱尔兰", value: "爱尔兰" },
            { name: "澳大利亚", value: "澳大利亚" }
        ]},
        { key: "year", name: "年代", value: [
            { name: "全部", value: "" },
            { name: "2026", value: "2026" },
            { name: "2025", value: "2025" },
            { name: "2024", value: "2024" },
            { name: "2023", value: "2023" },
            { name: "2022", value: "2022" },
            { name: "2021", value: "2021" },
            { name: "2020", value: "2020" },
            { name: "2019", value: "2019" },
            { name: "2020年代", value: "2020年代" },
            { name: "2010年代", value: "2010年代" },
            { name: "2000年代", value: "2000年代" },
            { name: "90年代", value: "90年代" },
            { name: "80年代", value: "80年代" },
            { name: "70年代", value: "70年代" },
            { name: "60年代", value: "60年代" },
            { name: "更早", value: "更早" }
        ]},
        { key: "platform", name: "平台", value: [
            { name: "全部", value: "" },
            { name: "腾讯视频", value: "腾讯视频" },
            { name: "爱奇艺", value: "爱奇艺" },
            { name: "优酷", value: "优酷" },
            { name: "湖南卫视", value: "湖南卫视" },
            { name: "Netflix", value: "Netflix" },
            { name: "HBO", value: "HBO" },
            { name: "BBC", value: "BBC" },
            { name: "NHK", value: "NHK" },
            { name: "CBS", value: "CBS" },
            { name: "NBC", value: "NBC" },
            { name: "tvN", value: "tvN" }
        ]},
        { key: "sort", name: "排序", value: [
            { name: "热度", value: "U" },
            { name: "评分", value: "S" },
            { name: "时间", value: "R" }
        ]}
    ]
};

const DEFAULT_CLASSES = [
    { type_id: "movie", type_name: "选电影", land: 1, ratio: 1.33 },
    { type_id: "tv", type_name: "选剧集", land: 1, ratio: 1.33 },
    { type_id: "show", type_name: "选综艺", land: 1, ratio: 1.33 },
    { type_id: "movie_filter", type_name: "电影筛选", land: 1, ratio: 1.33 },
    { type_id: "tv_filter", type_name: "电视剧筛选", land: 1, ratio: 1.33 },
    { type_id: "show_filter", type_name: "综艺筛选", land: 1, ratio: 1.33 }
];

async function init(cfg) {
    try {
        siteKey = cfg.skey;
        siteType = cfg.stype;
        extendObj = { classes: [...DEFAULT_CLASSES], filter: CAT_FILTERS };
    } catch (e) {
        console.error("init error", e.message);
        extendObj = { classes: [...DEFAULT_CLASSES], filter: CAT_FILTERS };
    }
}

// home返回filters！！UI才能渲染筛选面板
function home(filter) {
    try {
        return JSON.stringify({
            class: extendObj.classes || DEFAULT_CLASSES,
            filters: extendObj.filter || CAT_FILTERS
        });
    } catch (e) {
        return JSON.stringify({ class: DEFAULT_CLASSES, filters: CAT_FILTERS });
    }
}

async function homeVod() {
    try {
        const url = "https://m.douban.com/rexxar/api/v2/subject/recent_hot/tv?start=0&limit=20&category=tv&type=tv";
        const resp = await request(url);
        const json = safeJson(resp);
        const list = [];
        if (json && Array.isArray(json.items)) {
            for (const item of json.items) {
                const vodId = text(item.id || "");
                const vodName = text(item.title || "");
                if (!vodId || !vodName) continue;
                let vodPic = text(item.pic?.large || item.pic?.normal || "");
                let vodRemarks = text(item.episodes_info || "");
                if (!vodRemarks && item.is_new) vodRemarks = "新剧";
                list.push({
                    vod_id: vodId,
                    vod_name: vodName,
                    vod_pic: vodPic,
                    vod_remarks: vodRemarks,
                    style: { type: 'rect', ratio: 1.33 }
                });
                if (list.length >= 20) break;
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
    const limit = 20;
    const start = (pg - 1) * limit;
    let url = "";
    try {
        if (tid === "movie") {
            const cat = ext?.category || "热门";
            const tp = ext?.type || "全部";
            url = `https://m.douban.com/rexxar/api/v2/subject/recent_hot/movie?start=${start}&limit=${limit}&category=${encodeURIComponent(cat)}&type=${encodeURIComponent(tp)}`;
        } else if (tid === "tv" || tid === "show") {
            const tp = ext?.type || (tid === "tv" ? "tv_domestic" : "show");
            url = `https://m.douban.com/rexxar/api/v2/subject/recent_hot/tv?start=${start}&limit=${limit}&category=${encodeURIComponent(tid)}&type=${encodeURIComponent(tp)}`;
        } else if (tid === "movie_filter") {
            const genre = ext?.genre || "";
            const region = ext?.region || "";
            const year = ext?.year || "";
            const sort = ext?.sort || "U";
            const selObj = {};
            if (genre) selObj["类型"] = genre;
            if (region) selObj["地区"] = region;
            const selStr = JSON.stringify(selObj);
            const tagArr = [];
            if (genre) tagArr.push(genre);
            if (region) tagArr.push(region);
            if (year) tagArr.push(year);
            const tags = tagArr.join(",");
            url = `https://m.douban.com/rexxar/api/v2/movie/recommend?refresh=0&start=${start}&count=${limit}&selected_categories=${encodeURIComponent(selStr)}&uncollect=false&score_range=0,10&tags=${encodeURIComponent(tags)}&sort=${sort}`;
        } else if (tid === "tv_filter") {
            const genre = ext?.genre || "";
            const region = ext?.region || "";
            const year = ext?.year || "";
            const platform = ext?.platform || "";
            const sort = ext?.sort || "U";
            const selObj = { "形式": "电视剧" };
            if (genre) selObj["类型"] = genre;
            if (region) selObj["地区"] = region;
            const selStr = JSON.stringify(selObj);
            const tagArr = [];
            if (genre) tagArr.push(genre);
            if (region) tagArr.push(region);
            if (year) tagArr.push(year);
            if (platform) tagArr.push(platform);
            const tags = tagArr.join(",");
            url = `https://m.douban.com/rexxar/api/v2/tv/recommend?refresh=0&start=${start}&count=${limit}&selected_categories=${encodeURIComponent(selStr)}&uncollect=false&score_range=0,10&tags=${encodeURIComponent(tags)}&sort=${sort}`;
        } else if (tid === "show_filter") {
            const genre = ext?.genre || "";
            const region = ext?.region || "";
            const year = ext?.year || "";
            const platform = ext?.platform || "";
            const sort = ext?.sort || "U";
            const selObj = { "形式": "综艺" };
            if (genre) selObj["类型"] = genre;
            if (region) selObj["地区"] = region;
            const selStr = JSON.stringify(selObj);
            const tagArr = [];
            if (genre) tagArr.push(genre);
            if (region) tagArr.push(region);
            if (year) tagArr.push(year);
            if (platform) tagArr.push(platform);
            const tags = tagArr.join(",");
            url = `https://m.douban.com/rexxar/api/v2/tv/recommend?refresh=0&start=${start}&count=${limit}&selected_categories=${encodeURIComponent(selStr)}&uncollect=false&score_range=0,10&tags=${encodeURIComponent(tags)}&sort=${sort}`;
        }
        if (!url) throw new Error("unknown tid");
        const resp = await request(url);
        const json = safeJson(resp);
        const list = [];
        if (json && Array.isArray(json.items)) {
            for (const item of json.items) {
                const vodId = text(item.id || "");
                const vodName = text(item.title || "");
                if (!vodId || !vodName) continue;
                let vodPic = text(item.pic?.large || item.pic?.normal || "");
                let vodRemarks = text(item.episodes_info || "");
                if (!vodRemarks && item.is_new) vodRemarks = "新剧";
                list.push({
                    vod_id: vodId,
                    vod_name: vodName,
                    vod_pic: vodPic,
                    vod_remarks: vodRemarks,
                    style: { type: 'rect', ratio: 1.33 }
                });
            }
        }
        const pagecount = list.length >= limit ? pg + 1 : pg;
        return JSON.stringify({
            list,
            page: pg,
            pagecount: pagecount,
            limit: limit,
            total: 9999
        });
    } catch (e) {
        console.error("category error", e.message);
        return JSON.stringify({ list: [], page: pg, pagecount: 0 });
    }
}

async function search(key, quick, pg) {
    pg = Number(pg) || 1;
    try {
        const encodedKw = encodeURIComponent(key);
        const url = `https://m.douban.com/rexxar/api/v2/search/subjects?search_text=${encodedKw}&start=${(pg - 1) * 20}&limit=20`;
        const resp = await request(url);
        const json = safeJson(resp);
        const list = [];
        if (json && Array.isArray(json.items)) {
            for (const item of json.items) {
                const vodId = text(item.id || "");
                const vodName = text(item.title || "");
                if (!vodId || !vodName) continue;
                let vodPic = text(item.pic?.large || item.pic?.normal || "");
                list.push({
                    vod_id: vodId,
                    vod_name: vodName,
                    vod_pic: vodPic,
                    vod_remarks: text(item.rating?.value || ""),
                    style: { type: 'rect', ratio: 1.33 }
                });
            }
        }
        const pagecount = list.length >= 20 ? pg + 1 : pg;
        return JSON.stringify({
            list,
            page: pg,
            pagecount: pagecount,
            land: 1,
            ratio: 1.33
        });
    } catch (e) {
        console.error("search error", e.message);
        return JSON.stringify({ list: [], page: pg, pagecount: 0, land: 1, ratio: 1.33 });
    }
}

async function detail(vodId) {
    try {
        const url = `https://m.douban.com/rexxar/api/v2/subject/${vodId}`;
        const resp = await request(url);
        const json = safeJson(resp);
        if (!json) return JSON.stringify({ list: [] });
        const vod = {
            vod_id: String(vodId),
            vod_name: text(json.title || ""),
            vod_pic: text(json.pic?.large || json.pic?.normal || ""),
            vod_year: text(json.year || ""),
            vod_area: "",
            vod_remarks: text(json.rating?.value ? `评分:${json.rating.value}` : ""),
            vod_actor: Array.isArray(json.actors) ? json.actors.map(x => text(x.name)).filter(Boolean).join(",") : "",
            vod_director: Array.isArray(json.directors) ? json.directors.map(x => text(x.name)).filter(Boolean).join(",") : "",
            vod_content: text(json.intro || ""),
            vod_play_from: "豆瓣",
            vod_play_url: ""
        };
        return JSON.stringify({ list: [vod] });
    } catch (e) {
        console.error("detail error", e.message);
        return JSON.stringify({ list: [] });
    }
}

async function play(flag, id, flags) {
    try {
        return JSON.stringify({
            parse: 1,
            url: `https://movie.douban.com/subject/${id}`,
            header: {
                "User-Agent": UA,
                "Referer": "https://movie.douban.com/"
            }
        });
    } catch (e) {
        console.error("play error", e.message);
        return JSON.stringify({ parse: 1, url: "", header: { "User-Agent": UA } });
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