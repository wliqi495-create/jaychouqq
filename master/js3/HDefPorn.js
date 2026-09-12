import { Crypto, _ } from 'assets://js/lib/cat.js';

let siteKey = '';
let siteType = 0;

let HOST = 'https://hdefporn.com';
const UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function headers() {
    return {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8',
        Referer: HOST + '/',
        Origin: HOST
    };
}

const CLASSES = [
    { type_id: 'latest', type_name: '最新' },
    { type_id: 'teen', type_name: 'Teen' },
    { type_id: 'babe', type_name: 'Babe' },
    { type_id: 'hardcore', type_name: 'Hardcore' },
    { type_id: 'blowjob', type_name: 'Blowjob' },
    { type_id: 'anal', type_name: 'Anal' },
    { type_id: 'milf', type_name: 'Milf' },
    { type_id: 'lesbian', type_name: 'Lesbian' },
    { type_id: 'amateur', type_name: 'Amateur' },
    { type_id: 'pov', type_name: 'POV' },
    { type_id: 'creampie', type_name: 'Creampie' },
    { type_id: 'blonde', type_name: 'Blonde' },
    { type_id: 'brunette', type_name: 'Brunette' },
    { type_id: 'big-boobs', type_name: 'Big Boobs' },
    { type_id: 'threesome', type_name: 'Threesome' },
    { type_id: 'interracial', type_name: 'Interracial' }
];

async function request(url) {
    try {
        const res = await req(url, { method: 'GET', headers: headers(), timeout: 15000 });
        return res && res.content ? res.content : '';
    } catch (e) {
        console.error('request error', url, e && e.message);
        return '';
    }
}

function fixUrl(u) {
    if (!u) return '';
    u = String(u).trim();
    if (u.indexOf('//') === 0) return 'https:' + u;
    if (u.indexOf('http') === 0) return u;
    if (u.charAt(0) === '/') return HOST + u;
    return HOST + '/' + u;
}

function clean(s) {
    return String(s || '')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function isVideo(url) {
    const s = String(url || '').toLowerCase();
    return /\.m3u8|\.mp4|\.flv|\.ts/.test(s);
}

function parseList(html) {
    const list = [];
    const seen = {};
    const re = /<div\s+class="pic-wrap"[^>]*data-vid="(\d+)"[\s\S]*?<a\s+href="(\/i\/\d+\/[^"]+)"[^>]*class="pic"[\s\S]*?<img[^>]*(?:data-src|src)="([^"]+)"[^>]*alt="([^"]*)"/gi;
    let m;
    while ((m = re.exec(html))) {
        const vid = m[1];
        if (seen[vid]) continue;
        seen[vid] = 1;
        let pic = fixUrl(m[3]);
        if (!pic || pic.indexOf('bg-212x120') >= 0) pic = fixUrl('/media/video_thumbs/' + vid + '.jpg');
        list.push({
            vod_id: vid,
            vod_name: clean(m[4]) || ('Video ' + vid),
            vod_pic: pic,
            vod_remarks: '',
            style: { type: 'rect', ratio: 1.78 }
        });
    }
    if (!list.length) {
        const re2 = /data-vid="(\d+)"[\s\S]{0,400}?href="(\/i\/\d+\/[^"]+)"/gi;
        while ((m = re2.exec(html))) {
            const vid = m[1];
            if (seen[vid]) continue;
            seen[vid] = 1;
            const tm = html.match(new RegExp('data-vid="' + vid + '"[\\s\\S]{0,500}?alt="([^"]*)"'));
            list.push({
                vod_id: vid,
                vod_name: tm ? clean(tm[1]) : ('Video ' + vid),
                vod_pic: fixUrl('/media/video_thumbs/' + vid + '.jpg'),
                vod_remarks: '',
                style: { type: 'rect', ratio: 1.78 }
            });
        }
    }
    return list;
}

function extractPlay(html) {
    let m = html.match(/src:\s*["'](https?:\/\/[^"']+master\.m3u8[^"']*)["']/i);
    if (m) return m[1];
    m = html.match(/(https?:\/\/[^"'\s]+\/hls\/[^"'\s]+master\.m3u8)/i);
    if (m) return m[1];
    m = html.match(/src:\s*["'](https?:\/\/[^"']+\.mp4[^"']*)["']/i);
    if (m) return m[1];
    m = html.match(/(https?:\/\/[^"'\s]+\/mp4\/[^"'\s]+\.mp4)/i);
    if (m) return m[1];
    m = html.match(/(https?:\/\/hd\d*\.tubecdn\.net\/[^"'\s]+)/i);
    if (m) return m[1];
    m = html.match(/<source[^>]+src=["']([^"']+)["']/i);
    if (m) return m[1];
    return '';
}

async function fetchDetailHtml(vid) {
    const id = String(vid || '');
    const cands = [];
    if (/^https?:\/\//.test(id) || id.indexOf('/i/') === 0) cands.push(fixUrl(id));
    else {
        cands.push(HOST + '/i/' + id);
        cands.push(HOST + '/i/' + id + '/video');
    }
    for (let i = 0; i < cands.length; i++) {
        const html = await request(cands[i]);
        if (html && (html.indexOf('video-js') >= 0 || html.indexOf('video1') >= 0 || html.indexOf('tubecdn') >= 0 || html.indexOf('pic-wrap') < 0 && html.indexOf('<title>') >= 0)) {
            if (html.indexOf('video-js') >= 0 || html.indexOf('tubecdn') >= 0 || extractPlay(html)) return html;
        }
        if (html && i === cands.length - 1) return html;
    }
    return '';
}

async function init(cfg) {
    try {
        siteKey = cfg.skey;
        siteType = cfg.stype;
        const ext = (cfg && (cfg.ext || cfg.extend)) || '';
        if (ext && String(ext).indexOf('http') === 0) {
            HOST = String(ext).replace(/\/$/, '');
        }
    } catch (e) {}
}

async function home(filter) {
    return JSON.stringify({
        class: CLASSES.map(c => ({ type_id: c.type_id, type_name: c.type_name, land: 1, ratio: 1.78 })),
        filters: {}
    });
}

async function homeVod() {
    const html = await request(HOST + '/');
    return JSON.stringify({ list: parseList(html).slice(0, 24) });
}

async function category(tid, pg, filter, ext) {
    pg = Number(pg) || 1;
    let url;
    if (!tid || tid === 'latest') {
        url = pg <= 1 ? HOST + '/' : HOST + '/page/' + pg;
    } else {
        url = pg <= 1 ? HOST + '/category/' + tid : HOST + '/category/' + tid + '/' + pg;
    }
    let html = await request(url);
    if ((!html || html.indexOf('pic-wrap') < 0) && (!tid || tid === 'latest') && pg > 1) {
        html = await request(HOST + '/');
    }
    const list = parseList(html);
    let pagecount = list.length >= 12 ? pg + 1 : pg;
    if (tid && tid !== 'latest') {
        const pages = [];
        const re = new RegExp('/category/' + tid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '/(\\d+)', 'g');
        let m;
        while ((m = re.exec(html))) pages.push(Number(m[1]));
        if (pages.length) pagecount = Math.max.apply(null, pages);
    }
    return JSON.stringify({
        list: list,
        page: pg,
        pagecount: pagecount || 999,
        limit: 24,
        total: 99999
    });
}

async function search(key, quick, pg) {
    pg = Number(pg) || 1;
    const slug = String(key || '')
        .toLowerCase()
        .replace(/[^a-z0-9\-]+/g, '-')
        .replace(/^-+|-+$/g, '');
    let list = [];
    if (slug) {
        const html = await request(HOST + '/category/' + slug);
        if (html && html.indexOf('pic-wrap') >= 0) list = parseList(html);
    }
    return JSON.stringify({ list: list, page: 1, pagecount: 1, land: 1, ratio: 1.78 });
}

async function detail(vodId) {
    const vid = String(vodId || '');
    const html = await fetchDetailHtml(vid);
    if (!html) return JSON.stringify({ list: [] });
    let title = firstTitle(html) || ('Video ' + vid);
    let picM = html.match(/og:image["']?\s+content=["']([^"']+)/i) || html.match(/twitter:image[^>]+content=["']([^"']+)/i);
    const pic = fixUrl(picM ? picM[1] : '/media/video_thumbs/' + vid.replace(/[^\d].*/, '') + '.jpg');
    const play = extractPlay(html);
    const idNum = (vid.match(/\d+/) || [vid])[0];
    return JSON.stringify({
        list: [{
            vod_id: vid,
            vod_name: title,
            vod_pic: pic,
            vod_content: '',
            vod_play_from: 'HDefPorn',
            vod_play_url: play ? ('正片$' + play) : ('正片$' + HOST + '/i/' + idNum)
        }]
    });
}

function firstTitle(html) {
    const t = html.match(/<title>([^<]+)<\/title>/i);
    if (!t) return '';
    return clean(t[1].replace(/\s*-\s*HD Porn.*/i, '').replace(/\s*-\s*HDef Porn.*/i, ''));
}

async function play(flag, playId, flags) {
    const header = headers();
    try {
        if (isVideo(playId) && String(playId).indexOf('/i/') < 0) {
            return JSON.stringify({ parse: 0, url: playId, header: header });
        }
        const html = /^https?:\/\//.test(playId)
            ? await request(playId)
            : await request(HOST + '/i/' + playId);
        const play = extractPlay(html || '');
        if (play) return JSON.stringify({ parse: 0, url: play, header: header });
        return JSON.stringify({ parse: 0, url: playId, header: header });
    } catch (e) {
        return JSON.stringify({ parse: 0, url: playId, header: header });
    }
}

export function __jsEvalReturn() {
    return { init, home, homeVod, category, detail, search, play };
}
