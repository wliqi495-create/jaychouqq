import { Crypto, load, _ } from 'assets://js/lib/cat.js';

let siteKey = '';
let siteType = 0;

const HOST = 'https://www.59v.net';
const UA =
    'Mozilla/5.0 (Linux; Android 14; M2102J2SC Build/UKQ1.240624.001) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36';
const DEFAULT_HEADERS = {
    'User-Agent': UA,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    Referer: HOST + '/'
};

const CLASSES = [
    { type_id: '1', type_name: '电影' },
    { type_id: '2', type_name: '剧集' },
    { type_id: '3', type_name: '综艺' },
    { type_id: '4', type_name: '动漫' }
];

const FILTERS = {
    '1': [{
        key: 'sub',
        name: '类型',
        value: [
            { n: '全部', v: '' },
            { n: '动作片', v: '6' },
            { n: '喜剧片', v: '7' },
            { n: '爱情片', v: '8' },
            { n: '科幻片', v: '9' },
            { n: '恐怖片', v: '10' },
            { n: '剧情片', v: '11' },
            { n: '战争片', v: '12' },
            { n: '动漫电影', v: '26' }
        ]
    }],
    '2': [{
        key: 'sub',
        name: '类型',
        value: [
            { n: '全部', v: '' },
            { n: '国产剧', v: '13' },
            { n: '港台剧', v: '14' },
            { n: '韩国剧', v: '15' },
            { n: '欧美剧', v: '16' },
            { n: '日本剧', v: '17' },
            { n: '泰国剧', v: '27' }
        ]
    }],
    '3': [{
        key: 'sub',
        name: '类型',
        value: [
            { n: '全部', v: '' },
            { n: '国内综艺', v: '18' },
            { n: '港台综艺', v: '19' },
            { n: '日韩综艺', v: '20' },
            { n: '欧美综艺', v: '21' }
        ]
    }],
    '4': [{
        key: 'sub',
        name: '类型',
        value: [
            { n: '全部', v: '' },
            { n: '国产动漫', v: '22' },
            { n: '欧美动漫', v: '23' },
            { n: '日韩动漫', v: '24' },
            { n: '港台动漫', v: '25' }
        ]
    }]
};

async function request(url, optHeaders = {}) {
    try {
        const headers = Object.assign({}, DEFAULT_HEADERS, optHeaders);
        const res = await req(url, {
            method: 'GET',
            headers,
            timeout: 15000
        });
        return res?.content ?? '';
    } catch (e) {
        console.error('request error:', url, e?.message);
        return '';
    }
}

function fixUrl(url) {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('//')) return 'https:' + url;
    if (url.startsWith('/')) return HOST + url;
    return HOST + '/' + url;
}

function safeJson(str) {
    try {
        if (!str) return null;
        return JSON.parse(str);
    } catch (e) {
        return null;
    }
}

function parseExt(ext) {
    if (!ext) return {};
    if (typeof ext === 'object') return ext;
    if (typeof ext === 'string') {
        try {
            return JSON.parse(ext);
        } catch (e) {
            return {};
        }
    }
    return {};
}

function pushItem(map, href, title, pic, remarks) {
    if (!href || !href.includes('/voddetail/')) return;
    const id = href.split('?')[0];
    if (map.has(id)) {
        const old = map.get(id);
        if (!old.vod_pic && pic) old.vod_pic = fixUrl(pic);
        if (!old.vod_remarks && remarks) old.vod_remarks = remarks.trim();
        return;
    }
    map.set(id, {
        vod_id: id,
        vod_name: (title || '').trim(),
        vod_pic: fixUrl(pic || ''),
        vod_remarks: (remarks || '').trim(),
        style: { type: 'rect', ratio: 1.33 }
    });
}

function extractListItems(html) {
    const map = new Map();
    if (!html) return [];

    const reA = /<a[^>]+href="(\/voddetail\/[^"]+)"[^>]*(?:title="([^"]*)")?[^>]*>/gi;
    let m;
    while ((m = reA.exec(html)) !== null) {
        pushItem(map, m[1], m[2] || '', '', '');
    }

    const reImg = /href="(\/voddetail\/[^"]+)"[\s\S]{0,500}?(?:data-original|data-src|src)="([^"]+)"/gi;
    while ((m = reImg.exec(html)) !== null) {
        const exist = map.get(m[1].split('?')[0]);
        if (exist && !exist.vod_pic) exist.vod_pic = fixUrl(m[2]);
        else if (!exist) pushItem(map, m[1], '', m[2], '');
    }

    const reAlt = /href="(\/voddetail\/[^"]+)"[\s\S]{0,500}?alt="([^"]+)"/gi;
    while ((m = reAlt.exec(html)) !== null) {
        const exist = map.get(m[1].split('?')[0]);
        if (exist && !exist.vod_name) exist.vod_name = m[2].trim();
        else if (!exist) pushItem(map, m[1], m[2], '', '');
    }

    const reNote = /href="(\/voddetail\/[^"]+)"[\s\S]{0,600}?class="module-item-note"[^>]*>([^<]+)/gi;
    while ((m = reNote.exec(html)) !== null) {
        const exist = map.get(m[1].split('?')[0]);
        if (exist && !exist.vod_remarks) exist.vod_remarks = m[2].trim();
    }

    try {
        if (typeof load === 'function') {
            const $ = load(html);
            $('.module-item, .module-poster-item, .module-card-item').each((_, el) => {
                const $el = $(el);
                let href = $el.attr('href') || '';
                if (!href.includes('/voddetail/')) {
                    href = $el.find('a[href*="/voddetail/"]').first().attr('href') || href;
                }
                const title =
                    $el.attr('title') ||
                    $el.find('.module-poster-item-title').text() ||
                    $el.find('.module-card-item-title strong').text() ||
                    $el.find('.module-card-item-title a').text() ||
                    $el.find('a').attr('title') ||
                    $el.find('img').attr('alt') ||
                    '';
                const $img = $el.find('img').first();
                const pic = $img.attr('data-original') || $img.attr('data-src') || $img.attr('src') || '';
                const remarks = $el.find('.module-item-note').first().text() || '';
                if (href && title) pushItem(map, href, title, pic, remarks);
            });
        }
    } catch (e) {}

    return Array.from(map.values()).filter(v => v.vod_name);
}

async function fetchList(urls) {
    for (const url of urls) {
        const html = await request(url);
        if (!html) continue;
        const list = extractListItems(html);
        if (list.length) return list;
    }
    return [];
}

async function init(cfg) {
    try {
        siteKey = cfg.skey;
        siteType = cfg.stype;
    } catch (e) {
        console.error('init error', e.message);
    }
}

async function home(filter) {
    try {
        const classes = CLASSES.map(c => ({
            type_id: c.type_id,
            type_name: c.type_name,
            land: 1,
            ratio: 1.33
        }));
        return JSON.stringify({ class: classes, filters: FILTERS });
    } catch (e) {
        console.error('home error', e.message);
        return JSON.stringify({ class: [], filters: {} });
    }
}

async function homeVod() {
    try {
        const list = await fetchList([HOST + '/', HOST]);
        return JSON.stringify({ list: list.slice(0, 20) });
    } catch (e) {
        console.error('homeVod error', e.message);
        return JSON.stringify({ list: [] });
    }
}

async function category(tid, pg, filter, ext) {
    pg = Number(pg) || 1;
    try {
        const extend = parseExt(ext);
        const sub = extend.sub ? String(extend.sub) : '';
        const cid = sub || String(tid);
        const pageSlot = String(pg);
        const urls = [
            `${HOST}/vodshow/${cid}--------${pageSlot}---/`,
            `${HOST}/vodshow/${cid}--------${pageSlot}---.html`,
            `${HOST}/vodtype/${cid}-${pageSlot}/`,
            `${HOST}/vodtype/${cid}-${pageSlot}.html`,
            `${HOST}/vodtype/${cid}/`,
            `${HOST}/vodtype/${cid}.html`,
            `${HOST}/vodshow/${cid}-----------/`,
            `${HOST}/vodshow/${cid}-----------.html`
        ];
        const list = await fetchList(urls);
        return JSON.stringify({
            list,
            page: pg,
            pagecount: list.length >= 12 ? pg + 1 : pg,
            limit: 40,
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
        const encoded = encodeURIComponent(key);
        const urls = [
            pg === 1
                ? `${HOST}/vodsearch/${encoded}-------------/`
                : `${HOST}/vodsearch/${encoded}----------${pg}---/`,
            pg === 1
                ? `${HOST}/vodsearch/${encoded}-------------.html`
                : `${HOST}/vodsearch/${encoded}----------${pg}---.html`,
            `${HOST}/index.php/vod/search.html?wd=${encoded}&page=${pg}`
        ];
        const list = await fetchList(urls);
        return JSON.stringify({
            list,
            page: pg,
            pagecount: list.length >= 12 ? pg + 1 : pg,
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
        const html = await request(url);
        if (!html) return JSON.stringify({ list: [] });

        const vod = {
            vod_id: vodId,
            vod_name: '未知',
            vod_pic: '',
            vod_content: '',
            vod_director: '',
            vod_actor: '',
            vod_year: '',
            vod_remarks: '',
            vod_play_from: '',
            vod_play_url: ''
        };

        const h1 = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
        if (h1) vod.vod_name = h1[1].trim();

        const picM = html.match(/class="module-info-poster"[\s\S]{0,400}?(?:data-original|src)="([^"]+)"/i);
        if (picM) vod.vod_pic = fixUrl(picM[1]);

        const intro = html.match(/module-info-introduction-content[\s\S]{0,80}<p[^>]*>([\s\S]*?)<\/p>/i);
        if (intro) vod.vod_content = intro[1].replace(/<[^>]+>/g, '').trim();

        const playSources = [];
        const tabRe = /class="[^"]*tab-item[^"]*"[^>]*>[\s\S]*?<span>([^<]+)<\/span>/gi;
        let tm;
        while ((tm = tabRe.exec(html)) !== null) {
            const name = tm[1].trim();
            if (name && !playSources.includes(name)) playSources.push(name);
        }

        const playLists = [];
        const listRe = /class="module-play-list-content[^"]*"[\s\S]*?<\/div>/gi;
        let lm;
        while ((lm = listRe.exec(html)) !== null) {
            const block = lm[0];
            const eps = [];
            const aRe = /<a[^>]+href="([^"]+)"[^>]*class="[^"]*module-play-list-link[^"]*"[^>]*>[\s\S]*?<span>([^<]+)<\/span>/gi;
            let am;
            while ((am = aRe.exec(block)) !== null) {
                eps.push(am[2].trim() + '$' + am[1]);
            }
            if (!eps.length) {
                const aRe2 = /<a[^>]+href="(\/vodplay\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
                while ((am = aRe2.exec(block)) !== null) {
                    const name = am[2].replace(/<[^>]+>/g, '').trim();
                    if (name) eps.push(name + '$' + am[1]);
                }
            }
            if (eps.length) playLists.push(eps.join('#'));
        }

        if (!playLists.length) {
            const eps = [];
            const aRe = /href="(\/vodplay\/[^"]+)"[^>]*>[\s\S]{0,80}?<span>([^<]+)<\/span>/gi;
            let am;
            while ((am = aRe.exec(html)) !== null) {
                eps.push(am[2].trim() + '$' + am[1]);
            }
            if (eps.length) playLists.push(eps.join('#'));
        }

        if (playSources.length && playLists.length) {
            const n = Math.min(playSources.length, playLists.length);
            vod.vod_play_from = playSources.slice(0, n).join('$$$');
            vod.vod_play_url = playLists.slice(0, n).join('$$$');
        } else if (playLists.length) {
            vod.vod_play_from = '默认';
            vod.vod_play_url = playLists.join('$$$');
        }

        return JSON.stringify({ list: [vod] });
    } catch (e) {
        console.error('detail error', e.message);
        return JSON.stringify({ list: [] });
    }
}

async function play(flag, playId, flags) {
    try {
        const url = fixUrl(playId);
        const html = await request(url);
        if (!html) {
            return JSON.stringify({
                parse: 1,
                url,
                header: { 'User-Agent': UA, Referer: HOST + '/' }
            });
        }

        let playerData = null;
        const m1 = html.match(/var\s+player_aaaa\s*=\s*(\{[\s\S]*?\});/);
        const m2 = html.match(/player_aaaa\s*=\s*(\{[\s\S]*?\})\s*<\/script>/);
        const raw = (m1 && m1[1]) || (m2 && m2[1]);
        if (raw) playerData = safeJson(raw);

        if (playerData && playerData.url) {
            let realUrl = String(playerData.url);
            if (playerData.encrypt === 1 || playerData.encrypt === '1') {
                try {
                    realUrl = unescape(realUrl);
                } catch (e) {}
            } else if (playerData.encrypt === 2 || playerData.encrypt === '2') {
                try {
                    realUrl = unescape(Crypto.enc.Utf8.stringify(Crypto.enc.Base64.parse(realUrl)));
                } catch (e) {}
            }
            if (/\.m3u8|\.mp4/i.test(realUrl) || realUrl.startsWith('http')) {
                return JSON.stringify({
                    parse: /\.m3u8|\.mp4/i.test(realUrl) ? 0 : 1,
                    url: realUrl,
                    header: { 'User-Agent': UA, Referer: HOST + '/' }
                });
            }
        }

        return JSON.stringify({
            parse: 1,
            url,
            header: { 'User-Agent': UA, Referer: HOST + '/' }
        });
    } catch (e) {
        console.error('play error', e.message);
        return JSON.stringify({
            parse: 1,
            url: playId,
            header: { 'User-Agent': UA }
        });
    }
}

export function __jsEvalReturn() {
    return {
        init,
        home,
        homeVod,
        category,
        detail,
        search,
        play
    };
}
