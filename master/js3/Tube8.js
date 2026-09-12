import { Crypto, _ } from 'assets://js/lib/cat.js';

let siteKey = '';
let siteType = 0;

const HOST = 'https://www.tube8.com';
const UA =
    'Mozilla/5.0 (Linux; Android 10; SM-G960F Build/QP1A.190711.020; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/133.0.6943.98 Mobile Safari/537.36';

const HEADERS = {
    'User-Agent': UA,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    Referer: HOST + '/'
};

const CAT_MAP = {
    amateur: '业余自拍', anal: '肛交', asian: '亚裔', bigdick: '大屌',
    blowjob: '口交', creampie: '内射', ebony: '黑人', fetish: '恋物',
    gay: '同性', hardcore: '硬核', hentai: '动漫', latina: '拉丁',
    lesbian: '女同', mature: '熟女', milf: '人妻', public: '公共场所',
    teens: '少女(18+)', threesome: '3P/多P', 'vr-porn': 'VR视频',
    'big-tits': '巨乳', blonde: '金发', facial: '颜射', gangbang: '群交',
    handjob: '手淫', massage: '按摩', masturbation: '自慰', pov: '第一人称',
    roleplay: '角色扮演', squirt: '潮吹', stockings: '丝袜', student: '学生',
    babe: '美女', bbw: '肥满', brunette: '黑发', bukkake: '颜射派对',
    cartoon: '卡通', casting: '试镜', compilation: '合集', cosplay: 'Cosplay',
    couple: '情侣', cumshot: '射精', 'double-penetration': '双洞',
    euro: '欧洲', funny: '搞笑', 'group-sex': '群交', homemade: '自制',
    indian: '印度', interracial: '跨种族', japanese: '日本', outdoor: '户外',
    reality: '真人秀', redhead: '红发', school: '学校', 'step-fantasy': '继亲幻想',
    striptease: '脱衣舞', toys: '玩具', vintage: '经典', webcam: '网络摄像头',
    china: '中国', korean: '韩国', thai: '泰国', filipina: '菲律宾',
    vietnamese: '越南', taiwanese: '台湾', 'hong-kong': '香港',
    russian: '俄罗斯', german: '德国', french: '法国', british: '英国',
    american: '美国', italian: '意大利', brazilian: '巴西', czech: '捷克'
};

function safeJson(s) {
    try { return s ? JSON.parse(s) : null; } catch (e) { return null; }
}

function parseExt(ext) {
    if (!ext) return {};
    if (typeof ext === 'object') return ext;
    try { return JSON.parse(ext); } catch (e) { return {}; }
}

async function request(url) {
    try {
        const res = await req(url, { method: 'GET', headers: HEADERS, timeout: 20000 });
        return res && res.content ? res.content : '';
    } catch (e) {
        return '';
    }
}

function fixUrl(u) {
    if (!u) return '';
    u = String(u).trim();
    if (u.indexOf('http') === 0) return u;
    if (u.indexOf('//') === 0) return 'https:' + u;
    return HOST + (u.charAt(0) === '/' ? u : '/' + u);
}

function clean(s) {
    return String(s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function folder(href, name, pic, ratio) {
    return {
        vod_id: 'folder_' + href,
        vod_name: clean(name),
        vod_pic: pic || '',
        vod_tag: 'folder',
        style: { type: 'rect', ratio: ratio || 1.33 }
    };
}

function parseVideos(html) {
    const list = [];
    const seen = {};
    const blocks = String(html || '').split(/class="[^"]*(?:video-box|videoblock)[^"]*"/i);
    for (let i = 1; i < blocks.length; i++) {
        const piece = blocks[i];
        const hm = piece.match(/href="([^"]*porn-video[^"]+)"/i);
        if (!hm) continue;
        const href = fixUrl(hm[1]);
        if (seen[href]) continue;
        seen[href] = 1;
        const title =
            clean(first(piece, /class="[^"]*video-title-text[^"]*"[^>]*>([\s\S]*?)</i)) ||
            first(piece, /title="([^"]+)"/) ||
            first(piece, /alt="([^"]+)"/);
        const pic = first(piece, /data-src="([^"]+)"/) || first(piece, /<img[^>]+src="([^"]+)"/i);
        const dur = clean(first(piece, /class="[^"]*video-duration[^"]*"[^>]*>([\s\S]*?)</i));
        list.push({
            vod_id: href,
            vod_name: title || href,
            vod_pic: pic || '',
            vod_remarks: dur,
            style: { type: 'rect', ratio: 1.77 }
        });
    }
    return list;
}

function first(text, re) {
    const m = String(text || '').match(re);
    return m ? m[1] : '';
}

function sortFilter() {
    return {
        key: 'sort',
        name: '排序',
        value: [
            { n: '最新', v: '' },
            { n: '最热', v: '/most-viewed' },
            { n: '评分', v: '/best' },
            { n: '最长', v: '/longest' }
        ]
    };
}

async function init(cfg) {
    try { siteKey = cfg.skey; siteType = cfg.stype; } catch (e) {}
}

async function home(filter) {
    const classes = [
        { type_id: '/newest', type_name: '最新视频', land: 1, ratio: 1.77 },
        { type_id: '/categories', type_name: '类别大全', land: 1, ratio: 1.33 },
        { type_id: '/channels', type_name: '全部频道', land: 1, ratio: 1 },
        { type_id: '/pornstars', type_name: '全部明星', land: 1, ratio: 0.75 }
    ];
    const filters = {};
    classes.forEach(c => { filters[c.type_id] = [sortFilter()]; });
    return JSON.stringify({ class: classes, filters: filters });
}

async function homeVod() {
    const html = await request(HOST + '/newest');
    return JSON.stringify({ list: parseVideos(html).slice(0, 24) });
}

async function category(tid, pg, filter, ext) {
    pg = Number(pg) || 1;
    const e = parseExt(ext);
    let list = [];
    if (tid === '/categories') {
        const html = await request(HOST + '/categories.html');
        const re = /href="([^"]*\/cat\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
        let m;
        const seen = {};
        while ((m = re.exec(html))) {
            const href = m[1];
            if (!href || href.indexOf('porn-video') >= 0) continue;
            if (seen[href]) continue;
            seen[href] = 1;
            const key = href.replace(/\/+$/, '').split('/').pop();
            const raw = clean(m[2]).replace(/Category/g, '');
            list.push(folder(href, CAT_MAP[key] || raw, '', 1.33));
        }
    } else if (tid === '/channels') {
        const url = pg !== 1 ? HOST + '/channels/page/' + pg + '/' : HOST + '/channels';
        const html = await request(url);
        const re = /href="([^"]*\/channel\/[^"]+)"/gi;
        let m;
        const seen = {};
        while ((m = re.exec(html))) {
            const href = m[1];
            if (!href || href.indexOf('porn-video') >= 0 || seen[href]) continue;
            seen[href] = 1;
            const slice = html.slice(Math.max(0, m.index - 80), m.index + 500);
            const name = first(slice, /class="[^"]*channel-name[^"]*"[^>]*>([\s\S]*?)</i) || first(slice, /class="[^"]*title[^"]*"[^>]*>([\s\S]*?)</i);
            const pic = first(slice, /(?:data-src|src)="([^"]+)"/i);
            list.push(folder(href, clean(name) || href, pic, 1));
        }
    } else if (tid === '/pornstars') {
        const url = pg !== 1 ? HOST + '/pornstars/page/' + pg + '/' : HOST + '/pornstars';
        const html = await request(url);
        const re = /href="([^"]*\/pornstar\/[^"]+)"/gi;
        let m;
        const seen = {};
        while ((m = re.exec(html))) {
            const href = m[1];
            if (!href || href.indexOf('porn-video') >= 0 || seen[href]) continue;
            seen[href] = 1;
            const slice = html.slice(Math.max(0, m.index - 80), m.index + 500);
            const name = first(slice, /class="[^"]*pornstar-name[^"]*"[^>]*>([\s\S]*?)</i);
            const pic = first(slice, /(?:data-src|src)="([^"]+)"/i);
            list.push(folder(href, clean(name) || href, pic, 0.75));
        }
    } else {
        let real = String(tid || '').replace(/^folder_/, '').replace(/\/+$/, '');
        const sort = e.sort || '';
        if (sort && real.indexOf(sort) < 0) real += sort;
        const full = fixUrl(real);
        const entity = full.indexOf('/pornstar/') >= 0 || full.indexOf('/channel/') >= 0;
        let url;
        if (pg === 1) url = real;
        else if (entity) url = real + '/?page=' + pg;
        else url = real + '/page/' + pg + '/';
        const html = await request(fixUrl(url));
        list = parseVideos(html);
    }
    return JSON.stringify({ list: list, page: pg, pagecount: 9999, limit: 20, total: 999999 });
}

async function search(key, quick, pg) {
    pg = Number(pg) || 1;
    const url = HOST + '/searches.html?q=' + encodeURIComponent(key) + '&page=' + pg;
    const html = await request(url);
    return JSON.stringify({ list: parseVideos(html), page: pg, pagecount: 9999, land: 1, ratio: 1.77 });
}

async function detail(vodId) {
    const pageUrl = fixUrl(String(vodId || '').replace(/^folder_/, ''));
    const html = await request(pageUrl);
    if (!html) return JSON.stringify({ list: [] });
    if (/has been flagged|Disabled Video|Removed Video|Inactive Video/i.test(html)) {
        return JSON.stringify({ list: [{ vod_name: '视频已删除', vod_play_url: '' }] });
    }
    const title = first(html, /property="og:title"[^>]+content="([^"]+)"/) || 'Unknown';
    const cover = first(html, /property="og:image"[^>]+content="([^"]+)"/);
    const urls = [];
    const m = html.match(/"format":"mp4",[\s\S]{0,200}?"videoUrl":"([^"]+)"/);
    if (m) {
        const jsonUrl = m[1].replace(/\\\//g, '/');
        const js = safeJson(await request(jsonUrl)) || [];
        const qMap = { '4K': 2160, '2160': 2160, '1440': 1440, '1080': 1080, '720': 720, '480': 480, '240': 240 };
        const items = [];
        (Array.isArray(js) ? js : []).forEach(elem => {
            let quality = String((elem && elem.quality) || 'SD').toUpperCase();
            if (!/P$/.test(quality) && quality !== '4K') quality += 'P';
            let qv = 0;
            Object.keys(qMap).forEach(k => { if (quality.indexOf(k) >= 0) qv = qMap[k]; });
            if (elem && elem.videoUrl) items.push({ q: quality, v: qv, url: elem.videoUrl });
        });
        items.sort((a, b) => b.v - a.v);
        items.forEach(i => urls.push(i.q + '$' + i.url));
    }
    if (!urls.length) {
        const d = html.match(/https?:\/\/[^"']+\.mp4[^"']*/i);
        if (d) urls.push('播放$' + d[0]);
    }
    return JSON.stringify({
        list: [{
            vod_id: pageUrl,
            vod_name: title,
            vod_pic: cover || '',
            vod_play_from: 'Tube8',
            vod_play_url: urls.join('#')
        }]
    });
}

async function play(flag, playId, flags) {
    return JSON.stringify({
        parse: 0,
        url: playId,
        header: { 'User-Agent': UA, Referer: HOST + '/' }
    });
}

export function __jsEvalReturn() {
    return { init, home, homeVod, category, detail, search, play };
}
