import { Crypto, _ } from 'assets://js/lib/cat.js';

let siteKey = '';
let siteType = 0;

const HOSTS = ['https://jable.sbs', 'https://jable.tv'];
let HOST = HOSTS[0];
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36';
const HEADERS = {
    'User-Agent': UA,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
};

const STATIC_CATS = [
    ['categories/chinese-subtitle', '中文字幕'],
    ['categories/roleplay', '角色剧情'],
    ['categories/uniform', '制服诱惑'],
    ['categories/pantyhose', '丝袜美腿'],
    ['categories/bdsm', '主奴调教'],
    ['categories/sex-only', '直接开啪'],
    ['categories/insult', '凌辱快感'],
    ['categories/pov', '男友视角'],
    ['categories/groupsex', '多P群交'],
    ['categories/lesbian', '女同欢愉'],
    ['categories/uncensored', '无码解放'],
    ['categories/private-cam', '盗摄偷拍']
];

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

function first(text, re) {
    const m = String(text || '').match(re);
    return m ? String(m[1]).trim() : '';
}

function abs(u) {
    if (!u) return '';
    if (u.indexOf('http') === 0) return u;
    if (u.indexOf('//') === 0) return 'https:' + u;
    return HOST.replace(/\/$/, '') + (u.charAt(0) === '/' ? u : '/' + u);
}

function isGate(html) {
    return html && html.indexOf('继续访问') >= 0 && (html.indexOf('/enter') >= 0 || html.indexOf('continue-button') >= 0);
}

async function request(url) {
    const parsed = String(url || '');
    const pathQ = parsed.replace(/^https?:\/\/[^/]+/, '');
    const cands = [parsed];
    HOSTS.forEach(h => {
        const c = h.replace(/\/$/, '') + pathQ;
        if (cands.indexOf(c) < 0) cands.push(c);
    });
    for (let i = 0; i < cands.length; i++) {
        try {
            const res = await req(cands[i], { method: 'GET', headers: HEADERS, timeout: 15000 });
            const html = res && res.content ? res.content : '';
            if (html) {
                HOST = cands[i].replace(/^(https?:\/\/[^/]+).*/, '$1');
                return html;
            }
        } catch (e) {}
    }
    return '';
}

function pageUrl(path, page) {
    path = String(path || 'latest-updates').replace(/^\/+|\/+$/g, '') || 'latest-updates';
    if (page > 1) return HOST + '/' + path + '/' + page + '/';
    return HOST + '/' + path + '/';
}

function pageCount(html) {
    let nums = [];
    const re = /\/(?:latest-updates|hot|new-release|categories\/[^/"']+|tags\/[^/"']+)\/(\d+)\//g;
    let m;
    while ((m = re.exec(html))) nums.push(Number(m[1]));
    if (!nums.length) {
        const re2 = /[?&]page=(\d+)/g;
        while ((m = re2.exec(html))) nums.push(Number(m[1]));
    }
    return nums.length ? Math.max.apply(null, nums) : 1;
}

function parseList(html) {
    const list = [];
    const seen = {};
    const cards = String(html || '').split(/class="[^"]*\bcol-6\b[^"]*\bcol-sm-4\b/);
    for (let i = 1; i < cards.length; i++) {
        const card = cards[i];
        const links = card.match(/href="([^"]*\/videos\/[^"]+)"/gi) || [];
        let href = '';
        if (links.length) {
            const last = links[links.length - 1].match(/href="([^"]+)"/i);
            href = last ? last[1] : '';
        }
        const title = first(card, /<h6[^>]*class="[^"]*title[^"]*"[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i);
        let pic = first(card, /(?:data-src|data-original|src)="([^"]+)"/i);
        const duration = first(card, /absolute-bottom-right[^>]*>[\s\S]*?(\d+:\d+(?::\d+)?)/);
        if (!href || !title) continue;
        const url = abs(href);
        if (seen[url]) continue;
        seen[url] = 1;
        if (pic && pic.indexOf('placeholder') >= 0) pic = first(card, /data-src="([^"]+)"/) || pic;
        list.push({
            vod_id: url,
            vod_name: clean(title),
            vod_pic: abs(pic),
            vod_remarks: duration,
            style: { type: 'rect', ratio: 1.4 }
        });
    }
    if (!list.length) {
        const re = /href="([^"]*\/videos\/[^"]+)"/gi;
        let m;
        while ((m = re.exec(html))) {
            const url = abs(m[1]);
            if (seen[url] || /\/videos\/?$/.test(url)) continue;
            seen[url] = 1;
            const slug = url.replace(/\/$/, '').split('/').pop();
            list.push({ vod_id: url, vod_name: slug, vod_pic: '', vod_remarks: '', style: { type: 'rect', ratio: 1.4 } });
        }
    }
    return list;
}

async function categoriesFolder() {
    const list = [];
    const html = await request(HOST + '/categories/');
    if (html && !isGate(html)) {
        const re = /<a[^>]*href="(?:https?:\/\/jable\.(?:sbs|tv))?(\/categories\/([^"]+))"[^>]*>([\s\S]*?)<\/a>/gi;
        let m;
        const seen = {};
        while ((m = re.exec(html))) {
            const catPath = String(m[1]).replace(/^\/+|\/+$/g, '');
            if (seen[catPath]) continue;
            seen[catPath] = 1;
            const block = m[3];
            let pic = first(block, /<img[^>]*src="([^"]+)"/i);
            let name = '';
            const center = first(block, /absolute-center[^>]*>([\s\S]*?)<\/div>/i);
            if (center) name = clean(center.replace(/<small[\s\S]*?<\/small>/gi, ''));
            if (!name) name = clean(block);
            if (!name) continue;
            list.push({
                vod_id: catPath,
                vod_name: name,
                vod_pic: abs(pic),
                vod_remarks: '主题',
                vod_tag: 'folder',
                style: { type: 'rect', ratio: 1.4 }
            });
        }
    }
    if (!list.some(x => String(x.vod_id).indexOf('categories/') === 0)) {
        STATIC_CATS.forEach(c => {
            list.push({
                vod_id: c[0],
                vod_name: c[1],
                vod_pic: '',
                vod_remarks: '主题',
                vod_tag: 'folder',
                style: { type: 'rect', ratio: 1.4 }
            });
        });
    }
    const tagsHtml = await request(HOST + '/latest-updates/');
    if (tagsHtml && !isGate(tagsHtml)) {
        const seen = {};
        const re = /href="(?:https?:\/\/jable\.(?:sbs|tv))?(\/tags\/[^"]+)"[^>]*>([^<]+)<\/a>/gi;
        let m;
        while ((m = re.exec(tagsHtml))) {
            const tagPath = String(m[1]).replace(/^\/+|\/+$/g, '');
            const tagName = clean(m[2]);
            if (seen[tagPath] || !tagName) continue;
            seen[tagPath] = 1;
            list.push({
                vod_id: tagPath,
                vod_name: tagName,
                vod_pic: '',
                vod_remarks: '标签',
                vod_tag: 'folder',
                style: { type: 'rect', ratio: 1 }
            });
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
            { type_id: 'latest-updates', type_name: '最近更新', land: 1, ratio: 1.4 },
            { type_id: 'hot', type_name: '热门影片', land: 1, ratio: 1.4 },
            { type_id: 'categories/chinese-subtitle', type_name: '中文字幕', land: 1, ratio: 1.4 },
            { type_id: 'new-release', type_name: '全新上市', land: 1, ratio: 1.4 },
            { type_id: 'categories', type_name: '主题&标签', land: 1, ratio: 1.4 }
        ],
        filters: {}
    });
}

async function homeVod() {
    const html = await request(HOST + '/latest-updates/');
    return JSON.stringify({ list: parseList(html).slice(0, 24) });
}

async function category(tid, pg, filter, ext) {
    pg = Number(pg) || 1;
    const path = String(tid || 'latest-updates').replace(/^\/+|\/+$/g, '');
    if (path === 'categories') {
        const list = await categoriesFolder();
        return JSON.stringify({ list: list, page: 1, pagecount: 1, limit: 200, total: list.length });
    }
    const html = await request(pageUrl(path, pg));
    if (!html || isGate(html)) {
        return JSON.stringify({ list: [], page: pg, pagecount: 0 });
    }
    const list = parseList(html);
    const pc = pageCount(html);
    return JSON.stringify({ list: list, page: pg, pagecount: pc || (list.length >= 12 ? pg + 1 : pg), limit: 24, total: 9999 });
}

async function search(key, quick, pg) {
    pg = Number(pg) || 1;
    let url = HOST + '/search/?q=' + encodeURIComponent(key);
    if (pg > 1) url += '&page=' + pg;
    const html = await request(url);
    const list = parseList(html);
    return JSON.stringify({ list: list, page: pg, pagecount: pageCount(html) || 1, land: 1, ratio: 1.4 });
}

async function detail(vodId) {
    const url = abs(String(vodId || ''));
    const page = await request(url);
    if (!page || isGate(page)) return JSON.stringify({ list: [] });
    let title = first(page, /video-info[^>]*>[\s\S]*?<h4[^>]*>([\s\S]*?)<\/h4>/i);
    title = clean(title) || clean(first(page, /property="og:title"[^>]+content="([^"]+)/i));
    title = title || clean(first(page, /<title[^>]*>([\s\S]*?)<\/title>/i));
    let pic = first(page, /property="og:image"[^>]+content="([^"]+)/i) || first(page, /<video[^>]+poster="([^"]+)/i);
    const actors = [];
    const ar = /class="[^"]*model[^"]*"[^>]*>[\s\S]*?(?:title|data-original-title)="([^"]+)/gi;
    let am;
    while ((am = ar.exec(page))) {
        const n = clean(am[1]);
        if (n && actors.indexOf(n) < 0) actors.push(n);
    }
    const publish = first(page, /上市于\s*([^<]+)/);
    const quality = first(page, /header-right[^>]*>[\s\S]*?<h6[^>]*>([\s\S]*?)<\/h6>/);
    return JSON.stringify({
        list: [{
            vod_id: url,
            vod_name: title || url.replace(/\/$/, '').split('/').pop(),
            vod_pic: abs(pic),
            vod_year: clean(publish),
            vod_area: '日本',
            vod_remarks: clean(quality),
            vod_actor: actors.join(','),
            vod_content: title || '',
            vod_play_from: 'JableTV',
            vod_play_url: '正片$' + url
        }]
    });
}

async function play(flag, playId, flags) {
    const header = { 'User-Agent': UA, Referer: HOST + '/' };
    const value = String(playId || '');
    if (/\.m3u8|\.mp4/i.test(value) && value.indexOf('/videos/') < 0) {
        return JSON.stringify({ parse: 0, url: value, header: header });
    }
    const url = abs(value);
    const page = await request(url);
    let m3u8 = first(page, /var\s+hlsUrl\s*=\s*["']([^"']+\.m3u8[^"']*)["']/);
    if (!m3u8) m3u8 = first(page, /["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/);
    if (m3u8) return JSON.stringify({ parse: 0, url: m3u8, header: { 'User-Agent': UA, Referer: url } });
    return JSON.stringify({ parse: 1, url: value, header: header });
}

export function __jsEvalReturn() {
    return { init, home, homeVod, category, detail, search, play };
}
