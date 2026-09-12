import { Crypto, _ } from 'assets://js/lib/cat.js';

let siteKey = '';
let siteType = 0;

const HOSTS = [
    'https://hd28.huadutx.com',
    'https://rb.huaduys.org',
    'https://huaduys.com',
    'https://www.huaduys.vip',
    'https://a.huaduys.com',
    'https://b.huaduys.me'
];

const UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0';
const PLAY_UA =
    'Mozilla/5.0 (Linux; Android 12; Pixel 3 XL) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.101 Mobile Safari/537.36';

let HOST = HOSTS[0];

function defaultHeaders() {
    return {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.5',
        Referer: HOST + '/'
    };
}

async function request(url, optHeaders = {}) {
    try {
        const headers = Object.assign({}, defaultHeaders(), optHeaders);
        const res = await req(url, { method: 'GET', headers, timeout: 20000 });
        return normalizeHtml(res?.content ?? '');
    } catch (e) {
        console.error('request error:', url, e?.message);
        return '';
    }
}

function normalizeHtml(raw) {
    if (!raw) return '';
    let s = String(raw);
    if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);
    s = s.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => {
        try { return String.fromCharCode(parseInt(h, 16)); } catch (e) { return _; }
    });
    return unescapeHtml(s);
}

function fixUrl(u) {
    if (!u) return '';
    u = String(u).replace(/\\/g, '').trim();
    if (u.startsWith('http://') || u.startsWith('https://')) return u;
    if (u.startsWith('//')) return 'https:' + u;
    if (u.startsWith('/')) return HOST.replace(/\/$/, '') + u;
    return HOST.replace(/\/$/, '') + '/' + u;
}

function unescapeHtml(s) {
    return String(s || '')
        .replace(/&amp;/g, '&')
        .replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
        .replace(/&#39;/g, "'");
}

function cleanName(s) {
    return unescapeHtml(String(s || ''))
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function looksChinese(s) {
    return /[\u4e00-\u9fff]/.test(s || '');
}

function b64DecodeUtf8(b64) {
    try {
        const t = String(b64 || '').replace(/\s/g, '').replace(/-/g, '+').replace(/_/g, '/');
        if (!t || t.length < 8) return '';
        return Crypto.enc.Utf8.stringify(Crypto.enc.Base64.parse(t));
    } catch (e) {
        return '';
    }
}

function looksUrl(s) {
    return /^https?:\/\//i.test(s) || /^\/\//.test(s) || /\.m3u8|\.mp4/i.test(s);
}

function looksBase64(s) {
    const t = String(s || '').replace(/\s/g, '');
    if (t.length < 16 || t.length % 4 === 1) return false;
    if (looksUrl(t)) return false;
    return /^[A-Za-z0-9+/_\-]+=*$/.test(t);
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
    const blocks = html.match(/<li[\s\S]*?<\/li>/gi) || [];
    const source = blocks.length ? blocks : [html];

    for (const piece of source) {
        if (!/voddetail|stui-vodlist__thumb|data-original/.test(piece)) continue;
        const hrefM =
            piece.match(/href="([^"]*\/voddetail\/[^"]+)"/i) ||
            piece.match(/href="([^"]*voddetail[^"]+\.html)"/i);
        if (!hrefM) continue;
        const href = hrefM[1].split('?')[0];
        if (seen.has(href)) continue;

        let name = '';
        const n1 = piece.match(/<h4[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i);
        const n2 = piece.match(/title="([^"]+)"/i);
        const n3 = piece.match(/alt="([^"]+)"/i);
        if (n1) name = cleanName(n1[1]);
        if (!name && n2) name = cleanName(n2[1]);
        if (!name && n3) name = cleanName(n3[1]);
        if (!name || /广告|点赞|VPN|发布页/.test(name)) continue;

        const picM =
            piece.match(/data-original="([^"]+)"/i) ||
            piece.match(/data-src="([^"]+)"/i) ||
            piece.match(/<img[^>]+src="([^"]+)"/i);
        const remarkM =
            piece.match(/class="[^"]*pic-text[^"]*"[^>]*>([\s\S]*?)<\//i) ||
            piece.match(/class="[^"]*text-bg[^"]*"[^>]*>([\s\S]*?)<\//i);
        let remarks = remarkM ? cleanName(remarkM[1]) : '';
        if (/广告/.test(remarks)) continue;

        seen.add(href);
        list.push({
            vod_id: href,
            vod_name: name,
            vod_pic: fixUrl(picM ? picM[1] : ''),
            vod_remarks: remarks,
            style: { type: 'rect', ratio: 1.33 }
        });
    }
    return list;
}

function parseClasses(html) {
    const classes = [];
    const skip = ['首页', '发布页', '免费VPN', 'APP', '下载', 'VPN'];
    const re = /<a[^>]+href="([^"]*vodtype\/\d+[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    let m;
    const seen = new Set();
    while ((m = re.exec(html)) !== null) {
        const name = cleanName(m[2]);
        if (!name || skip.some(s => name.includes(s))) continue;
        if (!looksChinese(name) && !/^[A-Za-z0-9]{2,12}$/.test(name)) continue;
        const num = (m[1].match(/vodtype\/(\d+)/) || [])[1];
        if (!num) continue;
        const tid = '/vodshow/' + num + '-----------.html';
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
        await pickHost();
        const html = await request(HOST + '/');
        let classes = parseClasses(html);
        if (!classes.length) {
            classes = [
                { type_id: '/vodshow/1-----------.html', type_name: '电影', land: 1, ratio: 1.33 },
                { type_id: '/vodshow/2-----------.html', type_name: '剧集', land: 1, ratio: 1.33 },
                { type_id: '/vodshow/20-----------.html', type_name: '伦理', land: 1, ratio: 1.33 },
                { type_id: '/vodshow/21-----------.html', type_name: '国产', land: 1, ratio: 1.33 }
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
        return JSON.stringify({ list: parseVideos(html).slice(0, 24) });
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
            path = path.split('---.html')[0] + String(pg) + '---.html';
        } else if (/vodshow\/\d+/.test(path)) {
            const num = path.match(/vodshow\/(\d+)/)[1];
            path = '/vodshow/' + num + '--------' + pg + '---.html';
        } else {
            path = '/vodshow/' + path + '--------' + pg + '---.html';
        }
        const html = await request(fixUrl(path));
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
            HOST + '/index.php/vod/search.html?wd=' + encodeURIComponent(key)
        ];
        let list = [];
        for (const u of urls) {
            list = parseVideos(await request(u));
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
        let id = String(vodId || '');
        if (!/voddetail|vodplay/.test(id) && /^\d+$/.test(id)) id = '/voddetail/' + id + '.html';
        const url = fixUrl(id);
        const html = await request(url);
        if (!html) return JSON.stringify({ list: [] });

        const nameM = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
        const vod_name = nameM ? cleanName(nameM[1]) : cleanName(id);

        const picM = html.match(/data-original="([^"]+)"/i) || html.match(/class="[^"]*picture[^"]*"[\s\S]{0,240}src="([^"]+)"/i);
        const yearM = html.match(/日期：[\s\S]{0,120}<\/strong>\s*([^<]+)/);
        const areaM = html.match(/时长：[\s\S]{0,120}<\/strong>\s*([^<]+)/);
        const dirM = html.match(/分类：[\s\S]{0,200}>([^<]+)<\/a>/);
        const actM = html.match(/演员：[\s\S]{0,300}>([^<]+)<\/a>/);

        const tabs = [];
        const tabRe = /<(?:a|li|h3|span)[^>]*class="[^"]*(?:dropdown-toggle|play-tab|title)[^"]*"[^>]*>([\s\S]*?)<\//gi;
        let tm;
        while ((tm = tabRe.exec(html)) !== null) {
            const t = cleanName(tm[1]);
            if (t && t.length < 16 && !/首页|登录|注册|收藏/.test(t) && !tabs.includes(t)) tabs.push(t);
        }

        const groups = {};
        const order = [];
        const epRe = /<a[^>]+href="([^"]*\/vodplay\/(\d+)-(\d+)-(\d+)\.html)"[^>]*>([\s\S]*?)<\/a>/gi;
        let em;
        while ((em = epRe.exec(html)) !== null) {
            const href = em[1];
            const sid = em[3];
            const epName = cleanName(em[5]) || ('第' + em[4] + '集');
            if (/复制|报错|下载/.test(epName)) continue;
            if (!groups[sid]) {
                groups[sid] = [];
                order.push(sid);
            }
            groups[sid].push(epName + '$' + href);
        }

        const playFrom = [];
        const playUrl = [];
        if (order.length) {
            order.forEach((sid, i) => {
                playFrom.push(tabs[i] || ('线路' + sid));
                playUrl.push(groups[sid].join('#'));
            });
        } else {
            const btn = html.match(/class="btn btn-primary"[^>]*href="([^"]+)"/i)
                || html.match(/href="([^"]*\/vodplay\/[^"]+)"/i);
            if (btn) {
                playFrom.push('花都专线');
                playUrl.push('播放$' + btn[1]);
            }
        }

        return JSON.stringify({
            list: [{
                vod_id: id,
                vod_name,
                vod_pic: fixUrl(picM ? picM[1] : ''),
                vod_year: yearM ? cleanName(yearM[1]) : '',
                vod_area: areaM ? cleanName(areaM[1]) : '',
                vod_director: dirM ? cleanName(dirM[1]) : '',
                vod_actor: actM ? cleanName(actM[1]) : '',
                vod_content: vod_name,
                vod_play_from: playFrom.join('$$$'),
                vod_play_url: playUrl.join('$$$')
            }]
        });
    } catch (e) {
        console.error('detail error', e.message);
        return JSON.stringify({ list: [] });
    }
}

function mid(text, a, b) {
    const s = String(text || '');
    const i = s.indexOf(a);
    if (i < 0) return '';
    const j = s.indexOf(b, i + a.length);
    if (j < 0) return '';
    return s.substring(i + a.length, j).replace(/\\/g, '');
}

function urlDecode(s) {
    let out = String(s || '');
    for (let i = 0; i < 3; i++) {
        try {
            const n = decodeURIComponent(out.replace(/\+/g, '%20'));
            if (n === out) break;
            out = n;
        } catch (e) { break; }
    }
    return out;
}

function resolveMediaUrl(raw) {
    let url = String(raw || '').trim();
    if (!url) return '';
    url = url.replace(/\\u0026/g, '&').replace(/\\"/g, '"').replace(/\\/g, '');
    if (looksUrl(url)) return url.indexOf('//') === 0 ? 'https:' + url : url;
    try {
        const u1 = unescape(url);
        if (looksUrl(u1)) return u1;
        url = u1;
    } catch (e) {}
    let dec = b64DecodeUtf8(url);
    if (dec) {
        dec = urlDecode(String(dec).replace(/\\/g, ''));
        if (looksUrl(dec)) return dec.indexOf('//') === 0 ? 'https:' + dec : dec;
        try {
            const u2 = unescape(dec);
            if (looksUrl(u2)) return u2;
            url = u2;
        } catch (e) { url = dec; }
    }
    url = urlDecode(url);
    if (looksUrl(url)) return url.indexOf('//') === 0 ? 'https:' + url : url;
    return url;
}

function extractRawPlayUrl(html) {
    if (!html) return '';
    let raw = mid(html, '"","url":"', '"');
    if (!raw) raw = mid(html, 'player_aaaa','</script>');
    if (raw && raw.charAt(0) === '=') {
        const u = raw.match(/"url"\s*:\s*"([^"]+)"/);
        if (u) return u[1];
    }
    if (!raw || raw.length < 8) {
        const m = html.match(/"url"\s*:\s*"([^"]+)"/);
        if (m) raw = m[1];
    }
    if (!raw) {
        const d = html.match(/(https?:\/\/[^"'\s<>]+?\.(?:m3u8|mp4)[^"'\s<>]*)/i);
        if (d) raw = d[1];
    }
    return raw;
}

async function play(flag, playId, flags) {
    const header = {
        'User-Agent': PLAY_UA,
        Referer: HOST + '/',
        Origin: HOST,
        Accept: '*/*'
    };
    try {
        if (looksUrl(playId) && /\.m3u8|\.mp4/i.test(String(playId)) && String(playId).indexOf('/vodplay/') < 0) {
            return JSON.stringify({ parse: 0, jx: 0, url: playId, header: header });
        }
        const pageUrl = fixUrl(playId);
        const html = await request(pageUrl);
        const raw = extractRawPlayUrl(html);
        let url = resolveMediaUrl(raw);
        if (!looksUrl(url) && html) {
            const d = html.match(/(https?:\/\/[^"'\s<>]+?\.(?:m3u8|mp4)[^"'\s<>]*)/i);
            if (d) url = d[1].replace(/\\/g, '');
        }
        if (looksUrl(url) && /\/vodplay\//.test(url)) {
            const html2 = await request(url);
            url = resolveMediaUrl(extractRawPlayUrl(html2));
        }
        if (looksUrl(url)) {
            if (url.indexOf('//') === 0) url = 'https:' + url;
            return JSON.stringify({ parse: 0, jx: 0, url: url, header: header });
        }
        return JSON.stringify({ parse: 0, url: '', header: header, msg: '未解析到播放地址' });
    } catch (e) {
        console.error('play error', e.message);
        return JSON.stringify({ parse: 0, url: '', header: header, msg: String(e.message || e) });
    }
}

export function __jsEvalReturn() {
    return { init, home, homeVod, category, detail, search, play };
}
