import { Crypto, _ } from 'assets://js/lib/cat.js';

let siteKey = '';
let siteType = 0;

const HOST = 'https://h4ivs.sm431.vip';
const VIDEO_HOST = 'https://38.je:38';
const IMAGE_HOST = 'https://38.je:36';
const UA =
    'Mozilla/5.0 (Linux; Android 13; 22127RK46C Build/TKQ1.220905.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/104.0.5112.97 Mobile Safari/537.36';

const DEFAULT_HEADERS = {
    'User-Agent': UA,
    Referer: HOST,
    'Accept-Language': 'zh-CN,zh;q=0.9'
};

const titleCache = {};

async function request(url, optHeaders) {
    try {
        const headers = Object.assign({}, DEFAULT_HEADERS, optHeaders || {});
        const res = await req(url, { method: 'GET', headers: headers, timeout: 15000 });
        return (res && res.content) ? res.content : '';
    } catch (e) {
        console.error('request error:', url, e && e.message);
        return '';
    }
}

function xor128(text) {
    if (!text) return '';
    try {
        let out = '';
        for (let i = 0; i < text.length; i++) {
            out += String.fromCharCode(128 ^ text.charCodeAt(i));
        }
        return out;
    } catch (e) {
        return text;
    }
}

function fromJs(js) {
    const m = String(js || '').match(/document\.write\(l\('([^']+)'\)\)/);
    return m ? xor128(m[1]) : '';
}

function imgUrl(url) {
    if (!url) return '';
    if (url.indexOf('//') === 0) url = 'https:' + url;
    else if (url.charAt(0) === '/') url = IMAGE_HOST + url;
    return url;
}

function parseList(html) {
    const list = [];
    const seen = {};
    const ids = [];
    const re = /\/vid\/(\d+)/g;
    let m;
    while ((m = re.exec(html))) {
        if (seen[m[1]]) continue;
        seen[m[1]] = 1;
        ids.push({ id: m[1], index: m.index });
    }
    for (let i = 0; i < ids.length; i++) {
        const vid = ids[i].id;
        const start = Math.max(0, ids[i].index - 400);
        const end = Math.min(html.length, ids[i].index + 800);
        const slice = html.slice(start, end);
        let title = '';
        const jsM = slice.match(/document\.write\(l\('([^']+)'\)\)/);
        if (jsM) title = xor128(jsM[1]);
        if (!title) {
            const pM = slice.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
            if (pM) title = String(pM[1]).replace(/<[^>]+>/g, '').trim();
        }
        if (!title) {
            for (const attr of ['data-title', 'data-name', 'title', 'alt']) {
                const am = slice.match(new RegExp(attr + '="([^"]+)"'));
                if (am && xor128(am[1]).length > 3) {
                    title = xor128(am[1]);
                    break;
                }
            }
        }
        title = title || '视频' + vid;
        titleCache[vid] = title;
        let pic = '';
        const imgM = slice.match(/data-src="([^"]+)"/i) || slice.match(/<img[^>]+src="([^"]+)"/i);
        if (imgM) pic = imgM[1];
        if (!pic) pic = IMAGE_HOST + '/' + vid + '.jpg';
        list.push({
            vod_id: vid,
            vod_name: title,
            vod_pic: imgUrl(pic),
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
    return JSON.stringify({
        class: [
            { type_id: '1', type_name: '国产', land: 1, ratio: 1.33 },
            { type_id: '2', type_name: '日本', land: 1, ratio: 1.33 },
            { type_id: '3', type_name: '韩国', land: 1, ratio: 1.33 },
            { type_id: '4', type_name: '欧美', land: 1, ratio: 1.33 },
            { type_id: '5', type_name: '三级', land: 1, ratio: 1.33 },
            { type_id: '6', type_name: '动漫', land: 1, ratio: 1.33 }
        ],
        filters: {}
    });
}

async function homeVod() {
    try {
        const html = await request(HOST);
        return JSON.stringify({ list: parseList(html).slice(0, 24) });
    } catch (e) {
        return JSON.stringify({ list: [] });
    }
}

async function category(tid, pg, filter, ext) {
    pg = Number(pg) || 1;
    try {
        let url;
        if (String(tid) === '0') {
            url = pg === 1 ? HOST : HOST + '/page/' + pg + '.html';
        } else {
            url = pg === 1 ? HOST + '/list/' + tid + '.html' : HOST + '/list/' + tid + '/' + pg + '.html';
        }
        const html = await request(url);
        const list = parseList(html);
        return JSON.stringify({
            list: list,
            page: pg,
            pagecount: list.length >= 12 ? pg + 1 : pg,
            limit: 30,
            total: 99999
        });
    } catch (e) {
        return JSON.stringify({ list: [], page: pg, pagecount: 0 });
    }
}

async function search(key, quick, pg) {
    pg = Number(pg) || 1;
    try {
        let url = HOST + '/so.html?wd=' + encodeURIComponent(key);
        if (pg > 1) url += '&page=' + pg;
        const html = await request(url);
        const list = parseList(html);
        return JSON.stringify({ list: list, page: pg, pagecount: list.length >= 12 ? pg + 1 : 1, land: 1, ratio: 1.33 });
    } catch (e) {
        return JSON.stringify({ list: [], page: pg, pagecount: 0, land: 1, ratio: 1.33 });
    }
}

async function detail(vodId) {
    try {
        const vid = String(vodId || '').split('@@')[0].replace(/\.html$/, '');
        const html = await request(HOST + '/vid/' + vid + '.html');
        let title = titleCache[vid] || '';
        if (!title) {
            const t = html.match(/<title>([\s\S]*?)<\/title>/i);
            if (t) title = t[1].replace(/\s*[-_|].{0,20}$/, '').trim();
        }
        if (!title) {
            const h = html.match(/<(?:h1|h2)[^>]*>([\s\S]*?)<\//i);
            if (h) title = h[1].replace(/<[^>]+>/g, '').trim();
        }
        title = title || ('视频' + vid);
        let pic = '';
        const og = html.match(/property="og:image"\s+content="([^"]+)"/i);
        if (og) pic = og[1];
        if (!pic) pic = IMAGE_HOST + '/' + vid + '.jpg';
        return JSON.stringify({
            list: [{
                vod_id: vid,
                vod_name: title,
                vod_pic: imgUrl(pic),
                vod_content: title,
                vod_play_from: '神秘线路',
                vod_play_url: '全集$' + vid
            }]
        });
    } catch (e) {
        return JSON.stringify({ list: [] });
    }
}

async function play(flag, playId, flags) {
    const vid = String(playId || '').split('@@')[0];
    return JSON.stringify({
        parse: 0,
        url: VIDEO_HOST + '/' + vid + '/hls/index.m3u8',
        header: {
            'User-Agent': UA,
            Referer: HOST + '/'
        }
    });
}

export function __jsEvalReturn() {
    return { init, home, homeVod, category, detail, search, play };
}
