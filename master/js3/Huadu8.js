import { Crypto, _ } from 'assets://js/lib/cat.js';

let siteKey = '';
let siteType = 0;

const XURL = 'https://hd28.huadutx.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0';
const PLAY_UA = 'Linux; Android 12; Pixel 3 XL) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.101 Mobile Safari/537.36';

const DEFAULT_HEADERS = {
    'User-Agent': UA,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    Referer: XURL + '/'
};

async function request(url, optHeaders) {
    try {
        const headers = Object.assign({}, DEFAULT_HEADERS, optHeaders || {});
        const res = await req(url, { method: 'GET', headers: headers, timeout: 20000 });
        return (res && res.content) ? res.content : '';
    } catch (e) {
        console.error('request error:', url, e && e.message);
        return '';
    }
}

function absUrl(u) {
    if (!u) return '';
    u = String(u).replace(/\\/g, '').trim();
    if (u.indexOf('http') === 0) return u;
    if (u.indexOf('//') === 0) return 'https:' + u;
    if (u.charAt(0) === '/') return XURL + u;
    return XURL + '/' + u;
}

function strip(s) {
    return String(s || '')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
}

function mid(text, start, end) {
    const a = String(text || '').indexOf(start);
    if (a < 0) return '';
    const b = text.indexOf(end, a + start.length);
    if (b < 0) return '';
    return text.substring(a + start.length, b).replace(/\\/g, '');
}

function b64utf8(b64) {
    try {
        return Crypto.enc.Utf8.stringify(Crypto.enc.Base64.parse(String(b64 || '').replace(/\s/g, '')));
    } catch (e) {
        return '';
    }
}

function parseVideos(html) {
    const list = [];
    const seen = {};
    const blocks = String(html || '').match(/<li[\s\S]*?<\/li>/gi) || [];
    for (let i = 0; i < blocks.length; i++) {
        const piece = blocks[i];
        if (piece.indexOf('stui-vodlist__thumb') < 0 && piece.indexOf('voddetail') < 0) continue;
        const hm = piece.match(/<h4[^>]*class="[^"]*title[^"]*"[^>]*>[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
        const hrefM = piece.match(/href="([^"]*voddetail[^"]+)"/i);
        const href = hm ? hm[1] : (hrefM ? hrefM[1] : '');
        let name = hm ? strip(hm[2]) : '';
        if (!name) {
            const t = piece.match(/title="([^"]+)"/);
            if (t) name = strip(t[1]);
        }
        if (!href || !name) continue;
        if (/广告/.test(name)) continue;
        if (seen[href]) continue;
        seen[href] = 1;
        const picM = piece.match(/data-original="([^"]+)"/i) || piece.match(/<img[^>]+src="([^"]+)"/i);
        const remarkM = piece.match(/class="[^"]*pic-text[^"]*"[^>]*>([\s\S]*?)<\//i);
        let remark = remarkM ? strip(remarkM[1]) : '';
        if (remark === '广告' || remark === '广告点赞') continue;
        list.push({
            vod_id: href,
            vod_name: name,
            vod_pic: absUrl(picM ? picM[1] : ''),
            vod_remarks: remark,
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
    try {
        const html = await request(XURL + '/');
        const classes = [];
        const skip = { '首页': 1, '发布页': 1, '免费VPN下载': 1 };
        const menuM = html.match(/<ul[^>]*stui-header__menu[\s\S]*?<\/ul>/i);
        const menu = menuM ? menuM[0] : html;
        const reA = /<a[^>]+href="([^"]*vodtype\/\d+[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
        let m;
        const seen = {};
        while ((m = reA.exec(menu))) {
            const name = strip(m[2]);
            if (!name || skip[name]) continue;
            const fenge = m[1].split('.html')[0];
            const tid = fenge.replace('vodtype', 'vodshow') + '-----------.html';
            if (seen[tid]) continue;
            seen[tid] = 1;
            classes.push({ type_id: tid, type_name: name, land: 1, ratio: 1.33 });
        }
        return JSON.stringify({ class: classes, filters: {} });
    } catch (e) {
        return JSON.stringify({ class: [], filters: {} });
    }
}

async function homeVod() {
    try {
        const html = await request(XURL + '/');
        return JSON.stringify({ list: parseVideos(html).slice(0, 24) });
    } catch (e) {
        return JSON.stringify({ list: [] });
    }
}

async function category(tid, pg, filter, ext) {
    pg = Number(pg) || 1;
    try {
        const cid = String(tid || '');
        const fenge = cid.split('---.html')[0];
        const url = XURL + fenge + String(pg) + '---.html';
        const html = await request(url);
        return JSON.stringify({ list: parseVideos(html), page: pg, pagecount: 9999, limit: 90, total: 999999 });
    } catch (e) {
        return JSON.stringify({ list: [], page: pg, pagecount: 0 });
    }
}

async function search(key, quick, pg) {
    pg = Number(pg) || 1;
    try {
        const url = XURL + '/vodsearch/-------------.html?wd=' + encodeURIComponent(key);
        const html = await request(url);
        return JSON.stringify({ list: parseVideos(html), page: pg, pagecount: 9999, land: 1, ratio: 1.33 });
    } catch (e) {
        return JSON.stringify({ list: [], page: pg, pagecount: 0, land: 1, ratio: 1.33 });
    }
}

async function detail(vodId) {
    try {
        let did = String(vodId || '');
        if (did.indexOf('http') < 0) did = absUrl(did);
        const res = await request(did);
        if (!res) return JSON.stringify({ list: [] });

        let playHref = mid(res, 'class="btn btn-primary" href="', '"');
        if (!playHref) {
            const m = res.match(/href="([^"]*\/vodplay\/[^"]+)"/i);
            if (m) playHref = m[1];
        }
        if (playHref && playHref.indexOf('http') < 0) playHref = absUrl(playHref);

        const h1 = res.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
        const pic = res.match(/data-original="([^"]+)"/i);

        return JSON.stringify({
            list: [{
                vod_id: did,
                vod_name: h1 ? strip(h1[1]) : did,
                vod_pic: absUrl(pic ? pic[1] : ''),
                vod_play_from: '花都专线',
                vod_play_url: playHref ? ('播放$' + playHref) : ''
            }]
        });
    } catch (e) {
        return JSON.stringify({ list: [] });
    }
}

async function play(flag, playId, flags) {
    try {
        const page = absUrl(playId);
        const res = await request(page);
        let raw = mid(res, '"","url":"', '"');
        if (!raw) raw = mid(res, '"url":"', '"');
        raw = String(raw || '').replace(/\\/g, '');
        let url = raw;
        const dec = b64utf8(raw);
        if (dec) {
            try { url = decodeURIComponent(dec); } catch (e) { url = dec; }
        }
        url = String(url || '').replace(/\\/g, '');
        if (!(url.indexOf('http') === 0 || /\.m3u8|\.mp4/i.test(url))) {
            const d = res.match(/(https?:\/\/[^"']+\.(?:m3u8|mp4)[^"']*)/i);
            if (d) url = d[1];
        }
        return JSON.stringify({
            parse: 0,
            playUrl: '',
            url: url,
            header: { 'User-Agent': PLAY_UA, Referer: XURL + '/' }
        });
    } catch (e) {
        return JSON.stringify({ parse: 0, url: '', header: { 'User-Agent': PLAY_UA } });
    }
}

export function __jsEvalReturn() {
    return { init, home, homeVod, category, detail, search, play };
}
