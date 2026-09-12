import { Crypto, _ } from 'assets://js/lib/cat.js';
let siteKey = '';
let siteType = 0;

const HOST = 'https://247kan.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36';
const DEFAULT_HEADERS = {
    'User-Agent': UA,
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'sec-ch-ua': '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'Referer': HOST
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

function text(v) {
    return String(v == null ? "" : v).trim();
}

function fixUrl(path) {
    if (!path) return '';
    path = text(path);
    if (path.startsWith('http')) return path;
    return HOST + (path.startsWith('/') ? '' : '/' + path);
}

// 数字ID到中文分类名的映射
const categoryNameMap = {
    '1': '电影',
    '2': '连续剧',
    '3': '综艺',
    '4': '动漫',
    '5': '短剧',
    '6': '纪录片'
};

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
            { type_id: '1', type_name: '电影', land: 1, ratio: 1.33 },
            { type_id: '2', type_name: '连续剧', land: 1, ratio: 1.33 },
            { type_id: '3', type_name: '综艺', land: 1, ratio: 1.33 },
            { type_id: '4', type_name: '动漫', land: 1, ratio: 1.33 },
            { type_id: '5', type_name: '短剧', land: 1, ratio: 1.33 },
            { type_id: '6', type_name: '纪录片', land: 1, ratio: 1.33 }
        ];
        return JSON.stringify({ class: classes, filters: {} });
    } catch (e) {
        console.error("home error", e.message);
        return JSON.stringify({ class: [], filters: {} });
    }
}

async function homeVod() {
    try {
        const respText = await request(HOST + '/api/home');
        const json = safeJson(respText);
        const data = json?.data || {};
        const videos = data.featured || data.latest || [];
        const list = videos.map(item => ({
            vod_id: String(item.vod_id),
            vod_name: text(item.vod_name || ''),
            vod_pic: fixUrl(item.vod_pic),
            vod_remarks: text(item.vod_remarks || ''),
            style: { type: 'rect', ratio: 1.33 }
        }));
        return JSON.stringify({ list });
    } catch (e) {
        console.error("homeVod error", e.message);
        return JSON.stringify({ list: [] });
    }
}

async function category(tid, pg, filter, extend = {}) {
    pg = Number(pg) || 1;
    try {
        const page = pg;
        const categoryName = categoryNameMap[tid] || '电影';
        let videos = [];
        if (page === 1) {
            // 第一页：使用 /api/home 中的分类数据
            const respText = await request(HOST + '/api/home');
            const json = safeJson(respText);
            const data = json?.data || {};
            const categories = data.categories || [];
            for (let cat of categories) {
                if (String(cat.type_id) === String(tid)) {
                    videos = cat.videos || [];
                    break;
                }
            }
            if (videos.length === 0) videos = data.featured || data.latest || [];
        } else {
            // 翻页：利用搜索接口，以分类名作为搜索词
            const searchUrl = `${HOST}/api/videos?search=${encodeURIComponent(categoryName)}&page=${page}&limit=20`;
            const respText = await request(searchUrl);
            const json = safeJson(respText);
            const data = json?.data || {};
            videos = data.videos || [];
        }
        const list = videos.map(item => ({
            vod_id: String(item.vod_id),
            vod_name: text(item.vod_name || ''),
            vod_pic: fixUrl(item.vod_pic),
            vod_remarks: text(item.vod_remarks || ''),
            style: { type: 'rect', ratio: 1.33 }
        }));
        let total = 0;
        let pagecount = 2;
        if (page > 1) {
            const respText = await request(`${HOST}/api/videos?search=${encodeURIComponent(categoryName)}&page=${page}&limit=20`);
            const json = safeJson(respText);
            const data = json?.data || {};
            total = data.pagination?.total || data.total || 0;
            pagecount = Math.ceil(total / 20) || 1;
        }
        return JSON.stringify({
            page: page,
            pagecount: pagecount,
            limit: list.length,
            total: total,
            list: list
        });
    } catch (e) {
        console.error("category error", e.message);
        return JSON.stringify({ list: [], page: pg, pagecount: 0, limit: 0, total: 0 });
    }
}

async function detail(id) {
    try {
        let detailId = String(id).match(/(\d+)/)?.[0] || id;
        const url = `${HOST}/api/videos/${detailId}`;
        const respText = await request(url);
        const json = safeJson(respText);
        const data = json?.data || {};

        let playFrom = [];
        let playUrl = [];
        if (data.episodes && Array.isArray(data.episodes)) {
            const routeMap = new Map();
            data.episodes.forEach(ep => {
                const route = ep.route || '默认线路';
                if (!routeMap.has(route)) routeMap.set(route, []);
                routeMap.get(route).push({
                    name: ep.name || `第${ep.episode}集`,
                    url: ep.url
                });
            });
            playFrom = Array.from(routeMap.keys());
            playUrl = playFrom.map(route => {
                const episodes = routeMap.get(route);
                episodes.sort((a, b) => {
                    const aNum = parseInt(a.name.match(/(\d+)/)?.[1] || '0');
                    const bNum = parseInt(b.name.match(/(\d+)/)?.[1] || '0');
                    return aNum - bNum;
                });
                return episodes.map(ep => `${ep.name}$${ep.url}`).join('#');
            });
        }
        if (playFrom.length === 0) {
            playFrom = data.vod_play_from ? data.vod_play_from.split('$$$') : ['默认线路'];
            playUrl = data.vod_play_url ? [data.vod_play_url] : [''];
        }
        const vodInfo = {
            vod_id: String(data.vod_id || detailId),
            vod_name: text(data.vod_name || ''),
            vod_pic: fixUrl(data.vod_pic),
            vod_content: text(data.vod_content || ''),
            vod_actor: text(data.vod_actor || ''),
            vod_director: text(data.vod_director || ''),
            vod_year: text(data.vod_year || ''),
            vod_area: text(data.vod_area || ''),
            vod_remarks: text(data.vod_remarks || ''),
            type_name: text(data.type_name || ''),
            vod_play_from: playFrom.join('$$$'),
            vod_play_url: playUrl.join('$$$')
        };
        return JSON.stringify({ list: [vodInfo] });
    } catch (e) {
        console.error("detail error", e.message);
        return JSON.stringify({ list: [] });
    }
}

async function search(wd, quick, pg) {
    pg = Number(pg) || 1;
    try {
        const page = pg;
        const url = `${HOST}/api/videos?page=${page}&limit=20&search=${encodeURIComponent(wd)}`;
        const respText = await request(url);
        const json = safeJson(respText);
        const data = json?.data || {};
        const videos = data.videos || [];
        const list = videos.map(item => ({
            vod_id: String(item.vod_id),
            vod_name: text(item.vod_name || ''),
            vod_pic: fixUrl(item.vod_pic),
            vod_remarks: text(item.vod_remarks || ''),
            style: { type: 'rect', ratio: 1.33 }
        }));
        const total = data.pagination?.total || data.total || list.length;
        const pagecount = Math.ceil(total / 20) || 1;
        return JSON.stringify({
            page: page,
            pagecount: pagecount,
            limit: 20,
            total: total,
            land: 1,
            ratio: 1.33,
            list: list
        });
    } catch (e) {
        console.error("search error", e.message);
        return JSON.stringify({ list: [], page: pg, pagecount: 0, land: 1, ratio: 1.33 });
    }
}

async function play(flag, id, flags) {
    try {
        let playUrl = text(id);
        if (!playUrl.startsWith('http')) playUrl = HOST + (playUrl.startsWith('/') ? '' : '/' + playUrl);
        if (/\.(m3u8|mp4|flv|m4s)(\?.*)?$/i.test(playUrl)) {
            return JSON.stringify({ parse: 0, url: playUrl, header: DEFAULT_HEADERS });
        }
        const respText = await request(playUrl);
        const m3u8Match = respText.match(/"url":"([^"]+\.m3u8)"/) || respText.match(/"src":"([^"]+\.m3u8)"/);
        if (m3u8Match) {
            return JSON.stringify({
                parse: 0,
                url: m3u8Match[1].replace(/\\/g, ''),
                header: DEFAULT_HEADERS
            });
        }
        return JSON.stringify({ parse: 1, url: playUrl, header: DEFAULT_HEADERS });
    } catch (e) {
        console.error("play error", e.message);
        return JSON.stringify({ parse: 0, url: id, header: DEFAULT_HEADERS });
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