import { Crypto, _ } from 'assets://js/lib/cat.js';

let siteKey = '';
let siteType = 0;

const HOST = 'http://www.guangbomi.com';
const UA =
    'Mozilla/5.0 (Linux; Android 12; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36';
const HEADERS = { 'User-Agent': UA, Referer: HOST + '/' };

const FM_FILTER = [
    { n: '新闻综合', v: 'fmlist20' }, { n: '交通', v: 'fmlist58' }, { n: '音乐', v: 'fmlist57' },
    { n: '经济', v: 'fmlist56' }, { n: '生活', v: 'fmlist59' }, { n: '文艺', v: 'fmlist60' },
    { n: '都市', v: 'fmlist61' }, { n: '故事', v: 'fmlist62' }, { n: '旅游', v: 'fmlist63' },
    { n: '乡村', v: 'fmlist64' }, { n: '娱乐', v: 'fmlist65' }, { n: '戏曲', v: 'fmlist66' },
    { n: '体育', v: 'fmlist67' }, { n: '评书相声', v: 'fmlist69' }, { n: '青少科教', v: 'fmlist70' },
    { n: '网络台', v: 'fmlist113' }, { n: '汽车', v: 'fmlist134' }, { n: '其他', v: 'fmlist135' }
];

const TV_FILTER = [
    { n: '卫视台', v: 'tvlist200' }, { n: '省台', v: 'tvlist220' }, { n: '市台', v: 'tvlist221' },
    { n: '区县台', v: 'tvlist222' }, { n: '新闻综合', v: 'tvlist201' }, { n: '财经', v: 'tvlist202' },
    { n: '综艺', v: 'tvlist203' }, { n: '体育', v: 'tvlist204' }, { n: '影视', v: 'tvlist205' },
    { n: '公共', v: 'tvlist206' }, { n: '都市', v: 'tvlist207' }, { n: '少儿', v: 'tvlist208' },
    { n: '科教', v: 'tvlist209' }, { n: '记录', v: 'tvlist211' }, { n: '动漫', v: 'tvlist212' },
    { n: '生活', v: 'tvlist213' }, { n: '法制', v: 'tvlist214' }, { n: '军事', v: 'tvlist215' },
    { n: '文旅', v: 'tvlist216' }, { n: '农科', v: 'tvlist217' }, { n: '数字电视', v: 'tvlist218' }
];

function parseExt(ext) {
    if (!ext) return {};
    if (typeof ext === 'object') return ext;
    try { return JSON.parse(ext); } catch (e) { return {}; }
}

async function request(url) {
    try {
        const res = await req(url, { method: 'GET', headers: HEADERS, timeout: 10000 });
        return res && res.content ? res.content : '';
    } catch (e) {
        return '';
    }
}

function abs(u) {
    if (!u) return '';
    u = String(u).trim().replace(/&amp;/g, '&');
    if (u.indexOf('http') === 0) return u;
    if (u.indexOf('//') === 0) return 'http:' + u;
    return HOST + (u.charAt(0) === '/' ? u : '/' + u);
}

function clean(s) {
    return String(s || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function first(text, re) {
    const m = String(text || '').match(re);
    return m ? m[1] : '';
}

function parseList(html) {
    const list = [];
    const seen = {};
    const blocks = String(html || '').split(/<li[\s>]/i);
    for (let i = 1; i < blocks.length; i++) {
        const piece = blocks[i];
        const href = first(piece, /href="([^"]+)"/i);
        if (!href || href === '#' || href.indexOf('javascript') >= 0) continue;
        const name = clean(first(piece, /class="[^"]*radio-title[^"]*"[^>]*>([\s\S]*?)</i)) ||
            clean(first(piece, /class="[^"]*ax-title[^"]*"[^>]*>([\s\S]*?)</i)) ||
            clean(first(piece, /alt="([^"]+)"/i));
        if (!name) continue;
        const id = abs(href);
        if (seen[id]) continue;
        seen[id] = 1;
        const pic = first(piece, /class="[^"]*radio-icon[^"]*"[^>]*(?:src|data-src)="([^"]+)"/i) ||
            first(piece, /(?:src|data-src)="([^"]+)"/i);
        const remarks = clean(first(piece, /class="[^"]*ax-color-des[^"]*"[^>]*>([\s\S]*?)</i));
        list.push({
            vod_id: id,
            vod_name: name,
            vod_pic: abs(pic),
            vod_remarks: remarks,
            style: { type: 'rect', ratio: 1 }
        });
    }
    if (!list.length) {
        const re = /href="([^"]+\.html)"[^>]*>[\s\S]{0,200}?class="[^"]*radio-title[^"]*"[^>]*>([\s\S]*?)</gi;
        let m;
        while ((m = re.exec(html))) {
            const id = abs(m[1]);
            if (seen[id]) continue;
            seen[id] = 1;
            list.push({ vod_id: id, vod_name: clean(m[2]), vod_pic: '', vod_remarks: '', style: { type: 'rect', ratio: 1 } });
        }
    }
    return list;
}

async function init(cfg) {
    try { siteKey = cfg.skey; siteType = cfg.stype; } catch (e) {}
}

async function home(filter) {
    return JSON.stringify({
        class: [
            { type_id: 'live', type_name: '听广播', land: 1, ratio: 1 },
            { type_id: 'tv', type_name: '看电视', land: 1, ratio: 1.33 }
        ],
        filters: {
            live: [{ key: 'cateId', name: '按类型', value: FM_FILTER }],
            tv: [{ key: 'cateId', name: '按类型', value: TV_FILTER }]
        }
    });
}

async function homeVod() {
    const html = await request(HOST + '/');
    return JSON.stringify({ list: parseList(html).slice(0, 18) });
}

async function category(tid, pg, filter, ext) {
    pg = Number(pg) || 1;
    const e = parseExt(ext);
    let cate = e.cateId || (tid === 'tv' ? 'tvlist201' : 'fmlist20');
    const url = HOST + '/' + cate + '.html?page=' + pg;
    const html = await request(url);
    const list = parseList(html);
    return JSON.stringify({
        list: list,
        page: pg,
        pagecount: list.length >= 6 ? pg + 1 : pg,
        limit: 6,
        total: 9999
    });
}

async function search(key, quick, pg) {
    pg = Number(pg) || 1;
    const url = HOST + '/index.php?m=search&c=index&a=init&siteid=1&typeid=54&q=' + encodeURIComponent(key) + '&page=' + pg;
    const html = await request(url);
    const list = parseList(html);
    if (!list.length) {
        const blocks = String(html || '').split(/class="[^"]*ax-item-block/);
        for (let i = 1; i < blocks.length; i++) {
            const piece = blocks[i];
            const name = clean(first(piece, /class="[^"]*ax-title[^"]*"[^>]*>([\s\S]*?)</i));
            const href = first(piece, /href="([^"]+)"/i);
            if (!name || !href) continue;
            list.push({
                vod_id: abs(href),
                vod_name: name,
                vod_pic: '',
                vod_remarks: clean(first(piece, /ax-color-des[\s\S]{0,80}?>([\s\S]*?)</i)),
                style: { type: 'rect', ratio: 1 }
            });
        }
    }
    return JSON.stringify({ list: list, page: pg, pagecount: list.length >= 6 ? pg + 1 : 1, land: 1, ratio: 1 });
}

async function detail(vodId) {
    const url = abs(vodId);
    let html = await request(url);
    const title = clean(first(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i)) || url;
    const desc = clean(first(html, /class="[^"]*ax-des[^"]*"[^>]*>([\s\S]*?)</i));
    const content = clean(first(html, /class="[^"]*ax-ignore[^"]*"[^>]*>([\s\S]*?)</i));
    let iframe = first(html, /id="play"[\s\S]{0,400}?<iframe[^>]+src="([^"]+)"/i) ||
        first(html, /class="[^"]*playcode[^"]*"[\s\S]{0,400}?<iframe[^>]+src="([^"]+)"/i) ||
        first(html, /<iframe[^>]+src="([^"]+)"/i);
    iframe = abs(iframe);
    const urls = [];
    if (iframe) {
        const inner = await request(iframe);
        const links = [];
        const re = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
        let m;
        const body = inner || html;
        while ((m = re.exec(body))) {
            const href = m[1];
            const name = clean(m[2]);
            if (!href || href === '#' || !name) continue;
            if (/登录|注册|首页/.test(name)) continue;
            links.push(name + '$' + abs(href));
        }
        if (links.length) urls.push.apply(urls, links);
        else urls.push('信号源$' + iframe);
    }
    if (!urls.length) urls.push('信号源$' + url);
    return JSON.stringify({
        list: [{
            vod_id: url,
            vod_name: title,
            vod_pic: '',
            vod_content: content || desc,
            vod_play_from: '信号源',
            vod_play_url: urls.join('#')
        }]
    });
}

async function play(flag, playId, flags) {
    const header = { 'User-Agent': UA, Referer: HOST + '/' };
    let purl = abs(playId);
    try {
        if (!/\.m3u8|\.mp4|\.flv|m3u8\?/.test(purl)) {
            const html = await request(purl);
            let src = first(html, /class="[^"]*playcode[^"]*"[\s\S]{0,500}?<iframe[^>]+src="([^"]+)"/i) ||
                first(html, /<iframe[^>]+src="([^"]+)"/i);
            if (src) {
                src = abs(src);
                if (/tingtingfm/.test(src) && src.indexOf('http') !== 0) src = HOST + src;
                purl = src;
            }
            const m3 = html.match(/https?:\/\/[^"'\\\s]+\.m3u8[^"'\\\s]*/);
            if (m3) {
                return JSON.stringify({ parse: 0, jx: 0, url: m3[0], header: header });
            }
        }
        if (/\.m3u8|\.mp4|\.flv/.test(purl)) {
            return JSON.stringify({ parse: 0, jx: 0, url: purl, header: header });
        }
        return JSON.stringify({ parse: 1, jx: 0, url: purl, header: header });
    } catch (e) {
        return JSON.stringify({ parse: 1, url: playId, header: header });
    }
}

export function __jsEvalReturn() {
    return { init, home, homeVod, category, detail, search, play };
}
