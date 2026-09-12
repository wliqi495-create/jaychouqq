import { Crypto, _ } from 'assets://js/lib/cat.js';

let siteKey = '';
let siteType = 0;

const HOST = 'https://koreanpornmovie.com';
const UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.71 Safari/537.36';
const HEADERS = { 'User-Agent': UA, Referer: HOST + '/' };

function b64utf8(b64) {
    try {
        return Crypto.enc.Utf8.stringify(Crypto.enc.Base64.parse(String(b64 || '').replace(/\s/g, '')));
    } catch (e) {
        return '';
    }
}

async function request(url) {
    try {
        const res = await req(url, { method: 'GET', headers: HEADERS, timeout: 20000 });
        return res && res.content ? res.content : '';
    } catch (e) {
        return '';
    }
}

function abs(u, base) {
    if (!u) return '';
    u = String(u).trim();
    if (u.indexOf('http') === 0) return u;
    if (u.indexOf('//') === 0) return 'https:' + u;
    const b = (base || HOST).replace(/\/$/, '');
    return b + (u.charAt(0) === '/' ? u : '/' + u);
}

function clean(s) {
    return String(s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function parseList(html) {
    const list = [];
    const seen = {};
    const blocks = String(html || '').split(/<article[^>]*thumb-block/i);
    for (let i = 1; i < blocks.length; i++) {
        const piece = blocks[i];
        const hrefM = piece.match(/href="([^"]+)"/i);
        if (!hrefM) continue;
        const link = hrefM[1];
        let vid = link.replace(/\/+$/, '').split('/').pop();
        if (!vid || seen[vid]) continue;
        seen[vid] = 1;
        const img = piece.match(/class="video-main-thumb"[^>]*src="([^"]+)"/i) || piece.match(/<img[^>]+src="([^"]+)"/i);
        const titleM = piece.match(/entry-header[\s\S]{0,200}?<span[^>]*>([\s\S]*?)<\/span>/i) || piece.match(/<span[^>]*>([\s\S]*?)<\/span>/i);
        const durM = piece.match(/class="duration"[^>]*>([\s\S]*?)</i);
        list.push({
            vod_id: vid,
            vod_name: titleM ? clean(titleM[1]) : vid,
            vod_pic: img ? img[1] : '',
            vod_remarks: durM ? clean(durM[1]) : '',
            style: { type: 'rect', ratio: 1.78 }
        });
    }
    return list;
}

function getPlayUrl(html, pageUrl) {
    let m = html.match(/<meta\s+itemprop="contentURL"\s+content="([^"]+)"/i);
    if (m) return abs(m[1], pageUrl);
    m = html.match(/<iframe[^>]+src="[^"]*\?q=([^"]+)"/i);
    if (m) {
        const dec = b64utf8(m[1]);
        const mp4 = dec.match(/src="([^"]+\.mp4)"/i) || dec.match(/https?:\/\/[^"'\s]+\.mp4/i);
        if (mp4) return abs(mp4[1] || mp4[0], pageUrl);
    }
    const all = html.match(/https?:\/\/[^\s"']+\.mp4/gi) || [];
    for (let i = 0; i < all.length; i++) {
        if (all[i].indexOf('koreanporn.stream') >= 0) return all[i];
    }
    if (all.length) return all[0];
    const js = html.match(/(?:file|src|videoSrc)\s*:\s*["']([^"']+\.mp4)["']/i);
    if (js) return abs(js[1], pageUrl);
    return '';
}

async function init(cfg) {
    try { siteKey = cfg.skey; siteType = cfg.stype; } catch (e) {}
}

async function home(filter) {
    return JSON.stringify({
        class: [
            { type_id: 'latest', type_name: '最新视频', land: 1, ratio: 1.78 },
            { type_id: 'longest', type_name: '最长的视频', land: 1, ratio: 1.78 },
            { type_id: 'random', type_name: '随机视频', land: 1, ratio: 1.78 }
        ],
        filters: {}
    });
}

async function homeVod() {
    const html = await request(HOST + '/');
    return JSON.stringify({ list: parseList(html).slice(0, 24) });
}

async function category(tid, pg, filter, ext) {
    pg = Number(pg) || 1;
    let url = HOST + '/';
    if (tid === 'longest') url = HOST + '/?filter=longest';
    else if (tid === 'random') url = HOST + '/?filter=random';
    if (pg > 1) {
        url = url.indexOf('?') >= 0
            ? url.replace(/\?/, 'page/' + pg + '/?')
            : url + 'page/' + pg + '/';
    }
    const html = await request(url);
    const list = parseList(html);
    return JSON.stringify({ list: list, page: pg, pagecount: 9999, limit: 90, total: 999999 });
}

async function search(key, quick, pg) {
    const url = HOST + '/?s=' + encodeURIComponent(key);
    const html = await request(url);
    return JSON.stringify({ list: parseList(html), page: 1, pagecount: 1, land: 1, ratio: 1.78 });
}

async function detail(vodId) {
    const tid = String(vodId || '').replace(/^\/+|\/+$/g, '');
    const url = HOST + '/' + tid + '/';
    const html = await request(url);
    const title = clean(first(html, /<h1[^>]*class="entry-title"[^>]*>([\s\S]*?)<\/h1>/i)) || tid;
    const pic = first(html, /property="og:image"[^>]+content="([^"]+)"/i);
    const actors = [];
    const ar = /id="video-actors"[\s\S]{0,800}?<a[^>]*>([\s\S]*?)<\/a>/gi;
    let am;
    const block = html.match(/id="video-actors"[\s\S]{0,1500}/);
    if (block) {
        const re = /<a[^>]*>([\s\S]*?)<\/a>/gi;
        while ((am = re.exec(block[0]))) actors.push(clean(am[1]));
    }
    const content = clean(first(html, /class="video-description"[\s\S]{0,400}?<p[^>]*>([\s\S]*?)<\/p>/i));
    const remarks = clean(first(html, /class="duration"[^>]*>([\s\S]*?)</i));
    const play = getPlayUrl(html, url);
    return JSON.stringify({
        list: [{
            vod_id: tid,
            vod_name: title,
            vod_pic: pic || '',
            vod_area: '韩国',
            vod_actor: actors.join(' / '),
            vod_content: content,
            vod_remarks: remarks,
            vod_play_from: '韩国色情电影',
            vod_play_url: play ? ('播放$' + play) : ''
        }]
    });
}

function first(text, re) {
    const m = String(text || '').match(re);
    return m ? m[1] : '';
}

async function play(flag, playId, flags) {
    return JSON.stringify({
        parse: 0,
        playUrl: '',
        url: playId,
        header: { 'User-Agent': UA, Referer: HOST + '/' }
    });
}

export function __jsEvalReturn() {
    return { init, home, homeVod, category, detail, search, play };
}
