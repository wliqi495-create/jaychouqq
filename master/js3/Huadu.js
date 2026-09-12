import { Crypto, _ } from 'assets://js/lib/cat.js';

let siteKey = '';
let siteType = 0;

const HOSTS = [
    'https://hd28.huadutx.com',
    'https://rb.huaduys.org',
    'https://huaduys.com',
    'https://www.huaduys.vip',
    'https://a.huaduys.com'
];

const UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0';
const PLAY_UA =
    'Linux; Android 12; Pixel 3 XL) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.101 Mobile Safari/537.36';

let HOST = HOSTS[0];

function defaultHeaders() {
    return {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        Referer: HOST + '/'
    };
}

async function request(url, optHeaders = {}) {
    try {
        const headers = Object.assign({}, defaultHeaders(), optHeaders);
        const res = await req(url, { method: 'GET', headers, timeout: 20000 });
        return res?.content ?? '';
    } catch (e) {
        console.error('request error:', url, e?.message);
        return '';
    }
}

function fixUrl(u) {
    if (!u) return '';
    u = u.replace(/\\/g, '').trim();
    if (u.startsWith('http')) return u;
    if (u.startsWith('//')) return 'https:' + u;
    if (u.startsWith('/')) return HOST + u;
    return HOST + '/' + u;
}

function unescapeHtml(s) {
    return String(s || '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
}

function b64DecodeUtf8(b64) {
    try {
        return Crypto.enc.Utf8.stringify(Crypto.enc.Base64.parse(String(b64 || '').replace(/\s/g, '')));
    } catch (e) {
        return '';
    }
}

async function pickHost() {
    for (const h of HOSTS) {
        const html = await request(h + '/', { Referer: h + '/' });
        if (html && (html.includes('stui-vodlist') || html.includes('vodtype') || html.includes('vodshow'))) {
            HOST = h;
            return h;
        }
    }
    HOST = HOSTS[0];
    return HOST;
}

function parseVideos(html) {
    const list = [];
    if (!html) return list;
    const seen = new Set();
    const blockRe = /<li[\s\S]*?stui-vodlist__thumb[\s\S]*?<\/li>/gi;
    let block;
    const blocks = html.match(blockRe) || [];
    const source = blocks.length ? blocks : [html];

    for (const piece of source) {
        const a = piece.match(/<h4[^>]*class="[^"]*title[^"]*"[^>]*>[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
        const hrefA = piece.match(/href="(\/voddetail\/[^"]+)"/i) || piece.match(/href="([^"]*voddetail[^"]+)"/i);
        const nameA = piece.match(/title="([^"]+)"/);
        const href = (a && a[1]) || (hrefA && hrefA[1]) || '';
        let name = '';
        if (a) name = a[2].replace(/<[^>]+>/g, '').trim();
        if (!name && nameA) name = nameA[1].trim();
        if (!href || !name) continue;
        if (name.includes('广告')) continue;
        const id = href.split('?')[0];
        if (seen.has(id)) continue;
        seen.add(id);

        const picM =
            piece.match(/data-original="([^"]+)"/i) ||
            piece.match(/data-src="([^"]+)"/i) ||
            piece.match(/<img[^>]+src="([^"]+)"/i);
        const remarkM = piece.match(/class="[^"]*pic-text[^"]*"[^>]*>([^<]+)/i) ||
            piece.match(/stui-vodlist__thumb[^>]*>([\s\S]*?)<\/a>/i);
        let remarks = '';
        if (remarkM) remarks = remarkM[1].replace(/<[^>]+>/g, '').trim();
        if (remarks.includes('广告')) continue;

        list.push({
            vod_id: id,
            vod_name: unescapeHtml(name),
            vod_pic: fixUrl(picM ? picM[1] : ''),
            vod_remarks: remarks,
            style: { type: 'rect', ratio: 1.33 }
        });
    }
    return list;
}

function parseClasses(html) {
    const classes = [];
    const skip = ['首页', '发布页', '免费VPN下载', 'APP', 'APP下载'];
    const re = /<li[^>]*>[\s\S]*?<a[^>]+href="([^"]*vodtype\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let m;
    const seen = new Set();
    while ((m = re.exec(html)) !== null) {
        const name = m[2].replace(/<[^>]+>/g, '').trim();
        if (!name || skip.some(s => name.includes(s))) continue;
        let href = m[1];
        const idPart = href.replace(/\.html.*$/, '');
        let tid = idPart.replace('vodtype', 'vodshow') + '-----------.html';
        if (seen.has(tid)) continue;
        seen.add(tid);
        classes.push({ type_id: tid, type_name: name, land: 1, ratio: 1.33 });
    }
    return classes;
}

async function init(cfg) {
    try {
        siteKey = cfg.skey;
        siteType = cfg.stype;
        await pickHost();
    } catch (e) {
        console.error('init error', e.message);
    }
}

async function home(filter) {
    try {
        if (!HOST) await pickHost();
        const html = await request(HOST + '/');
        let classes = parseClasses(html);
        if (!classes.length) {
            classes = [
                { type_id: '/vodshow/1-----------.html', type_name: '电影', land: 1, ratio: 1.33 },
                { type_id: '/vodshow/2-----------.html', type_name: '剧集', land: 1, ratio: 1.33 },
                { type_id: '/vodshow/3-----------.html', type_name: '综艺', land: 1, ratio: 1.33 },
                { type_id: '/vodshow/4-----------.html', type_name: '动漫', land: 1, ratio: 1.33 }
            ];
        }
        return JSON.stringify({ class: classes, filters: {} });
    } catch (e) {
        console.error('home error', e.message);
        return JSON.stringify({ class: [], filters: {} });
    }
}

async function homeVod() {
    try {
        const html = await request(HOST + '/');
        const list = parseVideos(html);
        return JSON.stringify({ list: list.slice(0, 24) });
    } catch (e) {
        console.error('homeVod error', e.message);
        return JSON.stringify({ list: [] });
    }
}

async function category(tid, pg, filter, ext) {
    pg = Number(pg) || 1;
    try {
        let path = String(tid || '');
        if (path.includes('---.html')) {
            const parts = path.split('---.html');
            path = parts[0] + String(pg) + '---.html';
        } else if (path.includes('vodshow/')) {
            path = path.replace(/--------\d*---/, '--------' + pg + '---');
            if (!path.endsWith('.html')) path += '.html';
        } else {
            path = '/vodshow/' + path + '--------' + pg + '---.html';
        }
        const url = fixUrl(path);
        const html = await request(url);
        const list = parseVideos(html);
        return JSON.stringify({
            list,
            page: pg,
            pagecount: list.length >= 12 ? pg + 1 : pg,
            limit: 90,
            total: 999999
        });
    } catch (e) {
        console.error('category error', e.message);
        return JSON.stringify({ list: [], page: pg, pagecount: 0 });
    }
}

async function search(key, quick, pg) {
    pg = Number(pg) || 1;
    try {
        const urls = [
            HOST + '/vodsearch/-------------.html?wd=' + encodeURIComponent(key),
            HOST + '/index.php/vod/search.html?wd=' + encodeURIComponent(key) + '&page=' + pg
        ];
        let list = [];
        for (const u of urls) {
            const html = await request(u);
            list = parseVideos(html);
            if (list.length) break;
        }
        return JSON.stringify({
            list,
            page: pg,
            pagecount: list.length >= 12 ? pg + 1 : 1,
            land: 1,
            ratio: 1.33
        });
    } catch (e) {
        console.error('search error', e.message);
        return JSON.stringify({ list: [], page: pg, pagecount: 0, land: 1, ratio: 1.33 });
    }
}

async function detail(vodId) {
    try {
        const url = fixUrl(vodId);
        const html = unescapeHtml(await request(url));
        if (!html) return JSON.stringify({ list: [] });

        const nameM = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
        const vod_name = nameM ? nameM[1].replace(/<[^>]+>/g, '').trim() : String(vodId);

        const picM = html.match(/data-original="([^"]+)"/i) || html.match(/class="[^"]*pic[^"]*"[\s\S]{0,200}src="([^"]+)"/i);
        const vod_pic = fixUrl(picM ? picM[1] : '');

        const yearM = html.match(/日期：[\s\S]{0,80}<\/strong>([^<]+)/);
        const areaM = html.match(/时长：[\s\S]{0,80}<\/strong>([^<]+)/);
        const dirM = html.match(/分类：[\s\S]{0,200}>([^<]+)<\/a>/);
        const actM = html.match(/演员：[\s\S]{0,300}>([^<]+)<\/a>/);

        const playFrom = [];
        const playUrl = [];

        const tabRe = /class="[^"]*(?:play-tab|dropdown-toggle|stui-vodlist__head)[^"]*"[^>]*>([\s\S]*?)<\/(?:a|h3|span|li)>/gi;
        const tabs = [];
        let tm;
        while ((tm = tabRe.exec(html)) !== null) {
            const t = tm[1].replace(/<[^>]+>/g, '').trim();
            if (t && t.length < 20 && !tabs.includes(t)) tabs.push(t);
        }

        const eps = [];
        const epRe = /<a[^>]+href="([^"]*\/vodplay\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
        let em;
        while ((em = epRe.exec(html)) !== null) {
            const epName = em[2].replace(/<[^>]+>/g, '').trim() || '播放';
            if (/复制|报错|下载/.test(epName)) continue;
            eps.push(epName + '$' + em[1]);
        }

        const btn = html.match(/class="btn btn-primary"[^>]*href="([^"]+)"/i);
        if (!eps.length && btn) {
            eps.push('播放$' + btn[1]);
        }

        if (eps.length) {
            playFrom.push(tabs[0] || '花都专线');
            playUrl.push(eps.join('#'));
        }

        const vod = {
            vod_id: vodId,
            vod_name,
            vod_pic,
            vod_year: yearM ? yearM[1].trim() : '',
            vod_area: areaM ? areaM[1].trim() : '',
            vod_director: dirM ? dirM[1].trim() : '',
            vod_actor: actM ? actM[1].trim() : '',
            vod_content: vod_name,
            vod_play_from: playFrom.join('$$$'),
            vod_play_url: playUrl.join('$$$')
        };
        return JSON.stringify({ list: [vod] });
    } catch (e) {
        console.error('detail error', e.message);
        return JSON.stringify({ list: [] });
    }
}

function decodePlayPayload(raw) {
    if (!raw) return '';
    let url = String(raw).replace(/\\/g, '');
    try {
        const decoded = b64DecodeUtf8(url);
        if (decoded) url = decoded;
    } catch (e) {}
    try {
        url = decodeURIComponent(url);
    } catch (e) {}
    try {
        url = decodeURIComponent(url);
    } catch (e) {}
    return url;
}

async function play(flag, playId, flags) {
    try {
        const pageUrl = fixUrl(playId);
        const html = await request(pageUrl);
        if (!html) {
            return JSON.stringify({
                parse: 1,
                url: pageUrl,
                header: { 'User-Agent': PLAY_UA, Referer: HOST + '/' }
            });
        }

        let enc = '';
        const m1 = html.match(/"","url"\s*:\s*"([^"]+)"/);
        const m2 = html.match(/"url"\s*:\s*"([^"]+)"/);
        const m3 = html.match(/player_aaaa\s*=\s*(\{[\s\S]*?\})\s*;?\s*<\/script>/);
        if (m1) enc = m1[1];
        else if (m3) {
            try {
                const j = JSON.parse(m3[1]);
                enc = j.url || '';
                if (j.encrypt === 1 || j.encrypt === '1') {
                    try { enc = unescape(enc); } catch (e) {}
                } else if (j.encrypt === 2 || j.encrypt === '2') {
                    enc = decodePlayPayload(enc);
                }
            } catch (e) {}
        } else if (m2) enc = m2[1];

        let url = decodePlayPayload(enc);
        if (!url || (!/^https?:\/\//.test(url) && !/\.m3u8|\.mp4/i.test(url))) {
            const direct = html.match(/(https?:\/\/[^"']+\.(?:m3u8|mp4)[^"']*)/i);
            if (direct) url = direct[1].replace(/\\/g, '');
        }

        if (url && (/^https?:\/\//.test(url) || /\.m3u8|\.mp4/i.test(url))) {
            return JSON.stringify({
                parse: 0,
                url,
                header: { 'User-Agent': PLAY_UA, Referer: HOST + '/' }
            });
        }

        return JSON.stringify({
            parse: 1,
            url: pageUrl,
            header: { 'User-Agent': UA, Referer: HOST + '/' }
        });
    } catch (e) {
        console.error('play error', e.message);
        return JSON.stringify({ parse: 1, url: playId, header: { 'User-Agent': UA } });
    }
}

export function __jsEvalReturn() {
    return { init, home, homeVod, category, detail, search, play };
}
