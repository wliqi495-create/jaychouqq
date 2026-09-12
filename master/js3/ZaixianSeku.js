import { Crypto, _ } from 'assets://js/lib/cat.js';

let siteKey = '';
let siteType = 0;

const HOST = 'https://dottaia.lol';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const HEADERS = { 'User-Agent': UA, Referer: HOST + '/' };

function safeJson(s) {
    try { return s ? JSON.parse(s) : null; } catch (e) { return null; }
}

function b64utf8(b64) {
    try {
        return Crypto.enc.Utf8.stringify(Crypto.enc.Base64.parse(String(b64 || '').replace(/\s/g, '')));
    } catch (e) { return ''; }
}

async function request(url, extra) {
    try {
        const res = await req(url, { method: 'GET', headers: Object.assign({}, HEADERS, extra || {}), timeout: 20000 });
        return res && res.content ? res.content : '';
    } catch (e) {
        return '';
    }
}

function abs(u) {
    if (!u) return '';
    if (u.indexOf('http') === 0) return u;
    if (u.indexOf('//') === 0) return 'https:' + u;
    return HOST + (u.charAt(0) === '/' ? u : '/' + u);
}

function parseList(html) {
    const list = [];
    const seen = {};
    const cards = String(html || '').split(/class="[^"]*movie-card/);
    for (let i = 1; i < cards.length; i++) {
        const piece = cards[i];
        const hm = piece.match(/href="([^"]*\/cn\/movie\/[^"]+)"/);
        if (!hm) continue;
        const vid = hm[1].split('/movie/').pop().replace(/\/$/, '');
        if (!vid || seen[vid]) continue;
        seen[vid] = 1;
        const img = piece.match(/data-src="([^"]+)"/) || piece.match(/<img[^>]+src="([^"]+)"/);
        let name = '';
        const h5 = piece.match(/data-full-title="([^"]+)"/);
        if (h5) name = h5[1];
        if (!name) {
            const t = piece.match(/<h5[^>]*>([\s\S]*?)<\/h5>/);
            if (t) name = t[1].replace(/<[^>]+>/g, '').trim();
        }
        if (!name) {
            const t2 = piece.match(/title="([^"]+)"/);
            if (t2) name = t2[1];
        }
        list.push({
            vod_id: vid,
            vod_name: name || vid,
            vod_pic: abs(img ? img[1] : ''),
            vod_remarks: '',
            style: { type: 'rect', ratio: 1.33 }
        });
    }
    if (!list.length) {
        const re = /href="https?:\/\/[^"]+\/cn\/movie\/([^"]+)"/g;
        let m;
        while ((m = re.exec(html))) {
            if (seen[m[1]]) continue;
            seen[m[1]] = 1;
            list.push({ vod_id: m[1], vod_name: m[1], vod_pic: '', vod_remarks: '', style: { type: 'rect', ratio: 1.33 } });
        }
    }
    return list;
}

function parseTags(html) {
    const classes = [];
    const seen = {};
    const re = /href="([^"]*\/cn\/tag\/([^"]+))"[^>]*>([\s\S]*?)<\/a>/g;
    let m;
    while ((m = re.exec(html))) {
        const name = String(m[3] || '').replace(/<[^>]+>/g, '').trim();
        const tid = m[2];
        if (!name || !tid || seen[name]) continue;
        seen[name] = 1;
        classes.push({ type_id: tid, type_name: name, land: 1, ratio: 1.33 });
    }
    return classes;
}

async function init(cfg) {
    try { siteKey = cfg.skey; siteType = cfg.stype; } catch (e) {}
}

async function home(filter) {
    const html = await request(HOST + '/cn');
    return JSON.stringify({ class: parseTags(html), filters: {} });
}

async function homeVod() {
    const html = await request(HOST + '/cn');
    return JSON.stringify({ list: parseList(html).slice(0, 24) });
}

async function category(tid, pg, filter, ext) {
    pg = Number(pg) || 1;
    let url = HOST + '/cn/tag/' + tid;
    if (pg > 1) url += '?page=' + pg;
    const html = await request(url);
    const list = parseList(html);
    return JSON.stringify({ list: list, page: pg, pagecount: list.length >= 12 ? 99 : pg, limit: 24, total: 999 });
}

async function search(key, quick, pg) {
    pg = Number(pg) || 1;
    let url = HOST + '/cn/search?q=' + encodeURIComponent(key);
    if (pg > 1) url += '&page=' + pg;
    const html = await request(url);
    return JSON.stringify({ list: parseList(html), page: pg, pagecount: 99, land: 1, ratio: 1.33 });
}

async function detail(vodId) {
    const vid = String(vodId || '').split('|')[0];
    const html = await request(HOST + '/cn/movie/' + vid);
    let name = '';
    const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    if (h1) name = h1[1].replace(/<[^>]+>/g, '').trim();
    if (!name) {
        const t = html.match(/<title>([\s\S]*?)<\/title>/i);
        if (t) name = t[1].split('-')[0].trim();
    }
    let pic = '';
    const ld = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
    if (ld) {
        const d = safeJson(ld[1]) || {};
        pic = d.thumbnailUrl || '';
    }
    if (!pic) {
        const im = html.match(/uk-cover[^>]+src="([^"]+)"/) || html.match(/src="([^"]+)"[^>]*uk-cover/);
        if (im) pic = im[1];
    }
    const froms = [];
    const urls = [];
    const skip = { no: 1, English: 1, '简体中文': 1, '繁體中文': 1, '720P': 1 };
    const optRe = /<option[^>]*value="([^"]*)"[^>]*>([\s\S]*?)<\/option>/gi;
    let om;
    while ((om = optRe.exec(html))) {
        const val = om[1];
        const txt = om[2].replace(/<[^>]+>/g, '').trim();
        if (!val || skip[val] || skip[txt]) continue;
        froms.push(txt || val);
        urls.push('高清$' + vid + '|' + val);
    }
    if (!froms.length) {
        froms.push('默认');
        urls.push('高清$' + vid);
    }
    return JSON.stringify({
        list: [{
            vod_id: vid,
            vod_name: name || vid,
            vod_pic: abs(pic),
            vod_play_from: froms.join('$$$'),
            vod_play_url: urls.join('$$$')
        }]
    });
}

async function play(flag, playId, flags) {
    const parts = String(playId || '').split('|');
    const vid = parts[0];
    const page = HOST + '/cn/movie/' + vid;
    const header = { 'User-Agent': UA, Referer: page };
    try {
        const html = await request(page, { Referer: page });
        const m3 = html.match(/https?:\/\/[^\s"'\\]+\.m3u8[^\s"'\\]*/);
        if (m3) {
            return JSON.stringify({ parse: 0, url: m3[0].replace(/\\\//g, '/'), header: header });
        }
        const pa = html.match(/player_aaaa\s*=\s*(\{[\s\S]*?\})/);
        if (pa) {
            const j = safeJson(pa[1]) || {};
            let v = j.url || '';
            if (v && !/\.m3u8|\.mp4|https?:\/\//i.test(v) && v.length > 20) {
                v = b64utf8(v) || v;
            }
            const p = /\.m3u8|\.mp4/i.test(v) ? 0 : 1;
            return JSON.stringify({ parse: p, url: v, header: header });
        }
    } catch (e) {}
    return JSON.stringify({ parse: 1, url: page, header: header });
}

export function __jsEvalReturn() {
    return { init, home, homeVod, category, detail, search, play };
}
