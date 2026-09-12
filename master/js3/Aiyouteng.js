import { Crypto, _ } from 'assets://js/lib/cat.js';

let siteKey = '';
let siteType = 0;

const HOST = 'http://cj.tianwe.cn';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36';
const HEADERS = { 'User-Agent': UA };

const CATEGORY = {
    '1': ['qq', '腾讯视频'],
    '2': ['qiyi', '爱奇艺'],
    '3': ['youku', '优酷视频'],
    '4': ['mgtv', '芒果TV'],
    '5': ['bilibili', 'B站']
};

const PARSE_API = 'https://jx.kptv.us/?url=';
const PARSE_SITES = [
    'https://jx.xmflv.com/?url=',
    'https://jx.playerjy.com/?url=',
    'https://jx.2s0.cn/?url=',
    'https://jx.m3u8.tv/jiexi/?url=',
    'https://www.daga.cc/vip1/?url=',
    'https://jx.xmflv.cc/?url='
];

let customJx = '';

function safeJson(s) {
    try { return s ? JSON.parse(s) : null; } catch (e) { return null; }
}

function parseExt(ext) {
    if (!ext) return {};
    if (typeof ext === 'object') return ext;
    try { return JSON.parse(ext); } catch (e) { return {}; }
}

async function request(url) {
    try {
        const res = await req(url, { method: 'GET', headers: HEADERS, timeout: 15000 });
        return res && res.content ? res.content : '';
    } catch (e) {
        return '';
    }
}

function toKey(tid) {
    const s = String(tid || '').trim();
    if (CATEGORY[s]) return CATEGORY[s][0];
    return s || 'qq';
}

function typeFilter() {
    return {
        key: 'class',
        name: '类型',
        value: [
            { n: '全部', v: '' },
            { n: '电视剧', v: '2' },
            { n: '电影', v: '1' },
            { n: '动漫', v: '4' },
            { n: '综艺', v: '3' },
            { n: '少儿', v: '5' },
            { n: '纪录片', v: '6' },
            { n: '短剧', v: '7' }
        ]
    };
}

function yearFilter() {
    return {
        key: 'year',
        name: '年份',
        value: [
            { n: '全部', v: '' },
            { n: '2026', v: '2026' },
            { n: '2025', v: '2025' },
            { n: '2024', v: '2024' },
            { n: '2023', v: '2023' },
            { n: '2022', v: '2022' }
        ]
    };
}

async function init(cfg) {
    try {
        siteKey = cfg.skey;
        siteType = cfg.stype;
        const ext = cfg.ext || cfg.extend || '';
        if (ext) {
            const s = String(ext).trim();
            try {
                const d = JSON.parse(s);
                if (d && (d.parse || d.jx)) customJx = String(d.parse || d.jx);
            } catch (e) {
                if (s.indexOf('url=') >= 0 || s.indexOf('?') >= 0) customJx = s;
            }
        }
    } catch (e) {}
}

async function home(filter) {
    const classes = Object.keys(CATEGORY).map(id => ({
        type_id: id,
        type_name: CATEGORY[id][1],
        land: 1,
        ratio: 1.33
    }));
    const filters = {};
    classes.forEach(c => { filters[c.type_id] = [typeFilter(), yearFilter()]; });
    return JSON.stringify({ class: classes, filters: filters });
}

async function homeVod() {
    return JSON.stringify({ list: [] });
}

async function category(tid, pg, filter, ext) {
    pg = Number(pg) || 1;
    const e = parseExt(ext);
    const key = toKey(tid);
    const t = e.class || '2';
    let url = HOST + '/api.php/provide/vod/?from=' + key + '&ac=detail&limit=24&pg=' + pg + '&t=' + t;
    if (e.year) url += '&year=' + encodeURIComponent(e.year);
    const data = safeJson(await request(url)) || {};
    const list = (data.list || []).map(v => ({
        vod_id: String(v.vod_id || ''),
        vod_name: v.vod_name || '',
        vod_pic: v.vod_pic || '',
        vod_remarks: v.vod_remarks || '',
        style: { type: 'rect', ratio: 1.33 }
    }));
    const pc = Number(data.pagecount) || 1;
    return JSON.stringify({ list: list, page: pg, pagecount: pc, limit: 24, total: pc * 24 });
}

async function search(key, quick, pg) {
    pg = Number(pg) || 1;
    const url = HOST + '/api.php/provide/vod/?ac=detail&wd=' + encodeURIComponent(key) + '&pg=' + pg;
    const data = safeJson(await request(url)) || {};
    const list = (data.list || []).filter(v => v.vod_id).map(v => ({
        vod_id: String(v.vod_id || ''),
        vod_name: v.vod_name || v.name || '',
        vod_pic: v.vod_pic || v.pic || '',
        vod_remarks: v.vod_remarks || '',
        style: { type: 'rect', ratio: 1.33 }
    }));
    return JSON.stringify({
        list: list,
        page: pg,
        pagecount: Number(data.pagecount) || 1,
        land: 1,
        ratio: 1.33
    });
}

async function detail(vodId) {
    let vid = String(vodId || '');
    if (vid.indexOf('$') >= 0) vid = vid.split('$').pop().trim();
    const url = HOST + '/api.php/provide/vod/?ac=detail&ids=' + encodeURIComponent(vid);
    const data = safeJson(await request(url)) || {};
    const item = (data.list || [])[0];
    if (!item) return JSON.stringify({ list: [] });
    return JSON.stringify({
        list: [{
            vod_id: String(item.vod_id || vid),
            vod_name: item.vod_name || '',
            vod_pic: item.vod_pic || '',
            vod_remarks: item.vod_remarks || '',
            vod_year: item.vod_year || '',
            vod_area: item.vod_area || '',
            vod_content: item.vod_content || '',
            vod_play_from: item.vod_play_from || '',
            vod_play_url: item.vod_play_url || ''
        }]
    });
}

function isDirect(u) {
    const s = String(u || '');
    return /m3u8?|\.mp4/i.test(s);
}

function formatUrl(u) {
    if (!u) return '';
    return String(u).replace(/\\/g, '').replace(/^(https?:\/)(?!\/)/i, '$1/');
}

async function parseKptv(videoUrl) {
    try {
        const text1 = await request(PARSE_API + videoUrl);
        const m = text1.match(/apiToken\s*:\s*["']([^"']+)["']/);
        if (!m) return '';
        const host = PARSE_API.split('//')[1].split('/')[0];
        const text2 = await request('https://' + host + '/api/resolve.php?token=' + encodeURIComponent(m[1]));
        const data = safeJson(text2) || {};
        return formatUrl(data.url);
    } catch (e) {
        return '';
    }
}

async function play(flag, playId, flags) {
    const header = { 'User-Agent': UA };
    try {
        if (isDirect(playId)) {
            return JSON.stringify({ parse: 0, url: playId, header: header, playUrl: '' });
        }
        if (customJx) {
            return JSON.stringify({ parse: 1, url: customJx + playId, header: header, playUrl: '' });
        }
        const direct = await parseKptv(playId);
        if (direct) {
            return JSON.stringify({ parse: 0, url: direct, header: header, playUrl: '' });
        }
        const web = PARSE_SITES[0] + playId;
        return JSON.stringify({ parse: 1, url: web, header: header, playUrl: '' });
    } catch (e) {
        return JSON.stringify({ parse: 1, url: playId, header: header, playUrl: '' });
    }
}

export function __jsEvalReturn() {
    return { init, home, homeVod, category, detail, search, play };
}
