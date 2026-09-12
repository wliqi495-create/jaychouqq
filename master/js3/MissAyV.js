import { Crypto, _ } from 'assets://js/lib/cat.js';

let siteKey = '';
let siteType = 0;

const HOST = 'https://missav123.com';
const LANG = 'cn';
const UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

const DEFAULT_HEADERS = {
    'User-Agent': UA,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.5',
    Referer: HOST + '/'
};

const CLASSES = [
    { type_id: 'new', type_name: '最新' },
    { type_id: 'release', type_name: '发行' },
    { type_id: 'uncensored-leak', type_name: '无码流出' },
    { type_id: 'chinese-subtitle', type_name: '中文字幕' },
    { type_id: 'monthly-hot', type_name: '本月热门' },
    { type_id: 'weekly-hot', type_name: '本周热门' },
    { type_id: 'daily-hot', type_name: '今日热门' },
    { type_id: 'actresses', type_name: '女优' },
    { type_id: 'makers', type_name: '厂商' }
];

async function request(url) {
    try {
        const res = await req(url, { method: 'GET', headers: DEFAULT_HEADERS, timeout: 20000 });
        return (res && res.content) ? res.content : '';
    } catch (e) {
        console.error('request error', url, e && e.message);
        return '';
    }
}

function buildURL(path, page) {
    let u = HOST + '/' + LANG + '/' + String(path || 'new').replace(/^\//, '');
    if (page && Number(page) > 1) u += '?page=' + page;
    return u;
}

function parseVideoList(html) {
    const list = [];
    const seen = {};
    const re = /href="https:\/\/missav123\.com(?:\/dm\d+)?\/cn\/([^"?#]+)\"/g;
    let m;
    while ((m = re.exec(html))) {
        const slug = m[1];
        if (!slug || /^(genres|actresses|actors|makers|directors|labels|dm\d+|page)/.test(slug)) continue;
        if (slug.indexOf('/') >= 0) continue;
        if (seen[slug]) continue;
        seen[slug] = 1;
        const slice = html.slice(Math.max(0, m.index - 200), m.index + 600);
        const img = slice.match(/src="(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i);
        const titleM = slice.match(/alt="([^"]+)"/) || slice.match(/>([^<]{4,80})<\/a>/);
        list.push({
            vod_id: slug,
            vod_name: titleM ? titleM[1].trim() : slug,
            vod_pic: img ? img[1] : '',
            vod_remarks: '',
            style: { type: 'rect', ratio: 1.33 }
        });
    }
    return list;
}

async function init(cfg) {
    try {
        siteKey = cfg.skey;
        siteType = cfg.stype;
    } catch (e) {}
}

async function home(filter) {
    const classes = CLASSES.map(c => ({ type_id: c.type_id, type_name: c.type_name, land: 1, ratio: 1.33 }));
    return JSON.stringify({ class: classes, filters: {} });
}

async function homeVod() {
    const html = await request(buildURL('new', 1));
    return JSON.stringify({ list: parseVideoList(html).slice(0, 20) });
}

async function category(tid, pg, filter, ext) {
    pg = Number(pg) || 1;
    const html = await request(buildURL(tid, pg));
    const list = parseVideoList(html);
    if (/^(actresses|makers|actors|directors|labels)$/.test(String(tid))) {
        const items = [];
        const re = new RegExp('href="https://missav123\\.com(?:/dm\\d+)?/cn/' + tid + '/([^"]+)"[^>]*class="text-nord13[^"]*"[^>]*>([^<]+)', 'g');
        let m;
        while ((m = re.exec(html))) {
            items.push({
                vod_id: tid + '/' + m[1],
                vod_name: m[2].trim(),
                vod_pic: '',
                vod_tag: 'folder',
                vod_remarks: tid,
                style: { type: 'rect', ratio: 1.33 }
            });
        }
        if (items.length) {
            return JSON.stringify({ list: items, page: pg, pagecount: items.length >= 12 ? pg + 1 : pg, limit: 12, total: 9999 });
        }
    }
    return JSON.stringify({
        list: list,
        page: pg,
        pagecount: list.length >= 12 ? pg + 1 : pg,
        limit: 12,
        total: 9999
    });
}

async function search(key, quick, pg) {
    pg = Number(pg) || 1;
    let url = HOST + '/' + LANG + '/search/' + encodeURIComponent(key);
    if (pg > 1) url += '?page=' + pg;
    const html = await request(url);
    const list = parseVideoList(html);
    return JSON.stringify({
        list: list,
        page: pg,
        pagecount: list.length >= 12 ? pg + 1 : pg,
        limit: 12,
        land: 1,
        ratio: 1.33
    });
}

async function detail(vodId) {
    const slug = String(vodId || '').replace(/^\/+/, '');
    const html = await request(HOST + '/' + LANG + '/' + slug);
    const titleM = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/property="og:title"\s+content="([^"]+)"/i);
    const picM = html.match(/property="og:image"\s+content="([^"]+)"/i);
    let playUrl = '';
    const src = html.match(/https?:\/\/[^"'\\\s]+\.m3u8[^"'\\\s]*/);
    if (src) playUrl = src[0];
    const uuid = html.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    if (!playUrl && uuid) playUrl = 'https://surrit.com/' + uuid[0] + '/playlist.m3u8';
    return JSON.stringify({
        list: [{
            vod_id: slug,
            vod_name: titleM ? String(titleM[1]).replace(/<[^>]+>/g, '').trim() : slug,
            vod_pic: picM ? picM[1] : '',
            vod_content: slug,
            vod_play_from: 'MissAV',
            vod_play_url: playUrl ? ('播放$' + playUrl) : ('播放$' + slug)
        }]
    });
}

async function play(flag, playId, flags) {
    let url = String(playId || '');
    if (!/^https?:\/\//.test(url) && !/\.m3u8|\.mp4/i.test(url)) {
        const html = await request(HOST + '/' + LANG + '/' + url);
        const src = html.match(/https?:\/\/[^"'\\\s]+\.m3u8[^"'\\\s]*/);
        if (src) url = src[0];
        else {
            const uuid = html.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
            if (uuid) url = 'https://surrit.com/' + uuid[0] + '/playlist.m3u8';
        }
    }
    return JSON.stringify({
        parse: 0,
        url: url,
        header: { 'User-Agent': UA, Referer: HOST + '/' }
    });
}

export function __jsEvalReturn() {
    return { init, home, homeVod, category, detail, search, play };
}
