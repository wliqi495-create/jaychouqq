import { Crypto, _ } from 'assets://js/lib/cat.js';

let siteKey = '';
let siteType = 0;

const HOST = 'https://masex.tv';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const DEFAULT_HEADERS = {
    'User-Agent': UA,
    'Referer': HOST + '/zh-CN',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9'
};

const SORT_OPTS = [
    { n: '最近更新', v: 'latest' },
    { n: '发布日期', v: 'release' },
    { n: '今天最多观看', v: 'view_day' },
    { n: '本周最多观看', v: 'view_week' },
    { n: '本月最多观看', v: 'view_month' },
    { n: '最多观看', v: 'view_count' },
    { n: '最受欢迎', v: 'favorite' }
];
const DURATION_OPTS = [
    { n: '全部时长', v: '' },
    { n: '45分钟以内', v: 'lt-45' },
    { n: '45-90分钟', v: '45-90' },
    { n: '90-120分钟', v: '90-120' },
    { n: '120分钟以上', v: 'gt-122' }
];
const FILTER_OPTS = [
    { n: '全部', v: '' },
    { n: '单体作品', v: 'single' },
    { n: '中文字幕', v: 'chinese_sub' },
    { n: '可下载', v: 'download' }
];
const TAG_GROUPS = ['类别', '主题', '行为', '体型', '服装', '角色'];
const ACTOR_HEIGHT_OPTS = [{ n: '全部身高', v: '' }].concat(
    ['130-134', '135-139', '140-144', '145-149', '150-154', '155-159', '160-164', '165-169', '170-174', '175-179', '180-184', '185-189', '190-194']
        .map(v => ({ n: v + ' cm', v: v }))
);
const ACTOR_CUP_OPTS = [{ n: '全部胸围', v: '' }].concat(
    'ABCDEFGHIJKLMNOPQZ'.split('').map(v => ({ n: v + ' 杯', v: v }))
);
const ACTOR_AGE_OPTS = [
    { n: '全部年龄', v: '' },
    { n: '< 20 岁', v: '0-19' },
    { n: '20-24 岁', v: '20-24' },
    { n: '25-29 岁', v: '25-29' },
    { n: '30-34 岁', v: '30-34' },
    { n: '35-39 岁', v: '35-39' },
    { n: '40-44 岁', v: '40-44' },
    { n: '45-49 岁', v: '45-49' },
    { n: '50-54 岁', v: '50-54' },
    { n: '> 60 岁', v: '60-99' }
];
const ACTOR_SORT_OPTS = [
    { n: '视频数量', v: 'count' },
    { n: '姓名', v: 'name' },
    { n: '最多观看', v: 'view' },
    { n: '最受欢迎', v: 'favorite' }
];

async function request(url, optHeaders = {}) {
    try {
        const headers = Object.assign({}, DEFAULT_HEADERS, optHeaders);
        const res = await req(url, {
            method: 'GET',
            headers: headers,
            timeout: 15000
        });
        return res?.content ?? '';
    } catch (e) {
        console.error('request error:', url, e?.message);
        return '';
    }
}

function normPic(pic) {
    if (pic && pic.startsWith('http://')) {
        return 'https://' + pic.slice(7);
    }
    return pic || '';
}

function buildUrl(path, pg, extend) {
    const q = [];
    const ext = extend || {};
    for (const k of ['sort', 'duration', 'filter', 'height', 'cup', 'age']) {
        const v = ext[k];
        if (v) q.push(k + '=' + encodeURIComponent(String(v)));
    }
    if (pg && pg > 1) q.push('page=' + pg);
    return HOST + path + (q.length ? '?' + q.join('&') : '');
}

function emptyResult(pg) {
    pg = pg || 1;
    return JSON.stringify({ list: [], page: pg, pagecount: pg, limit: 30, total: 0 });
}

function buildFilters() {
    const f = [
        { key: 'sort', name: '排序', value: SORT_OPTS },
        { key: 'duration', name: '时长', value: DURATION_OPTS },
        { key: 'filter', name: '筛选', value: FILTER_OPTS }
    ];
    const tagCls = [{ n: '全部', v: '' }].concat(TAG_GROUPS.map(g => ({ n: g, v: g })));
    const actorF = [
        { key: 'height', name: '身高', value: ACTOR_HEIGHT_OPTS },
        { key: 'cup', name: '胸围', value: ACTOR_CUP_OPTS },
        { key: 'age', name: '年龄', value: ACTOR_AGE_OPTS },
        { key: 'sort', name: '排序', value: ACTOR_SORT_OPTS }
    ];
    return {
        latest: f,
        'tag/531': f,
        'tag/268': f,
        tags: [{ key: 'cls', name: '分类', value: tagCls }],
        'actor/all': actorF
    };
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
        const classes = [
            { type_id: 'latest', type_name: '最近更新', land: 1, ratio: 1.33 },
            { type_id: 'tag/531', type_name: '中文', land: 1, ratio: 1.33 },
            { type_id: 'tag/268', type_name: 'VR', land: 1, ratio: 1.33 },
            { type_id: 'tags', type_name: '类型', land: 1, ratio: 1.33 },
            { type_id: 'maker', type_name: '系列', land: 1, ratio: 1.33 },
            { type_id: 'maker/all', type_name: '片商', land: 1, ratio: 1.33 },
            { type_id: 'actor/all', type_name: '女优', land: 1, ratio: 1.33 }
        ];
        return JSON.stringify({ class: classes, filters: buildFilters() });
    } catch (e) {
        console.error('home error', e.message);
        return JSON.stringify({ class: [], filters: {} });
    }
}

async function homeVod() {
    try {
        const html = await request(HOST + '/zh-CN');
        if (!html) return JSON.stringify({ list: [] });

        const $ = cheerio.load(html);
        const videos = [];
        const seen = new Set();
        const areas = ['最近更新', '热门推荐', 'VR', '片商'];

        $('div.sec, div[class*="sec"]').each((_, sec) => {
            const $sec = $(sec);
            const title = $sec.find('span.sec-title, span[class*="sec-title"]').first().text().trim();
            if (!areas.includes(title)) return;

            $sec.find('a.card, a[class*="card"]').each((_, a) => {
                const $a = $(a);
                let name = $a.find('div.card-title, div[class*="card-title"]').first().text().trim();
                if (!name) name = $a.find('img').attr('alt') || '';
                const pic = $a.find('img').attr('src') || '';
                const href = $a.attr('href') || '';
                if (!name || !href || seen.has(href)) return;
                seen.add(href);
                videos.push({
                    vod_id: href,
                    vod_name: name,
                    vod_pic: normPic(pic),
                    vod_remarks: title,
                    style: { type: 'rect', ratio: 1.33 }
                });
            });
        });

        return JSON.stringify({ list: videos.slice(0, 30) });
    } catch (e) {
        console.error('homeVod error', e.message);
        return JSON.stringify({ list: [] });
    }
}

async function category(tid, pg, filter, ext) {
    pg = Number(pg) || 1;
    tid = String(tid || '');
    let extend = {};
    if (ext && typeof ext === 'object') {
        extend = ext;
    } else if (typeof ext === 'string' && ext.trim()) {
        try { extend = JSON.parse(ext); } catch (e) { extend = {}; }
    }

    try {
        if (tid === 'tags') {
            return await tagList(extend);
        }
        if (tid === 'maker') {
            return await seriesList(pg);
        }
        if (tid === 'maker/all') {
            return await makerList(pg, extend);
        }
        if (tid === 'actor/all') {
            return await actorList(pg, extend);
        }

        const path = tid.startsWith('/') ? tid : ('/zh-CN/' + tid);
        return await videoList(path, pg, extend);
    } catch (e) {
        console.error('category error', e.message);
        return emptyResult(pg);
    }
}

async function tagList(extend) {
    const group = (extend || {}).cls || '';
    try {
        const html = await request(HOST + '/zh-CN/tags');
        if (!html) return emptyResult(1);
        const $ = cheerio.load(html);
        const out = [];

        $('div.sec, div[class*="sec"]').each((_, sec) => {
            const $sec = $(sec);
            const title = $sec.find('span.tag-sec-title, span[class*="tag-sec-title"]').first().text().trim();
            if (!TAG_GROUPS.includes(title)) return;
            if (group && title !== group) return;

            $sec.find('a.tag-grid-item, a[class*="tag-grid-item"]').each((_, a) => {
                const $a = $(a);
                const name = $a.find('span.tag-grid-name, span[class*="tag-grid-name"]').first().text().trim();
                const href = $a.attr('href') || '';
                const m = href.match(/\/tag\/(\d+)/);
                if (!name || !m) return;
                out.push({
                    vod_id: 'tag/' + m[1],
                    vod_name: name,
                    vod_pic: '',
                    vod_tag: 'folder',
                    vod_remarks: title,
                    style: { type: 'rect', ratio: 1.33 }
                });
            });
        });

        return JSON.stringify({
            list: out,
            page: 1,
            pagecount: 1,
            limit: out.length,
            total: out.length
        });
    } catch (e) {
        console.error('tagList error', e.message);
        return emptyResult(1);
    }
}

async function seriesList(pg) {
    const url = HOST + '/zh-CN/maker' + (pg > 1 ? '?page=' + pg : '');
    try {
        const html = await request(url);
        if (!html) return emptyResult(pg);
        const $ = cheerio.load(html);
        const out = [];
        const seen = new Set();

        $('a.series-card, a[class*="series-card"]').each((_, a) => {
            const $a = $(a);
            const href = $a.attr('href') || '';
            const name = $a.find('div.series-card-name, div[class*="series-card-name"]').first().text().trim();
            const style = $a.find('div.series-card-img, div[class*="series-card-img"]').attr('style') || '';
            const mStyle = style.match(/url\('([^']+)'\)/);
            const pic = mStyle ? mStyle[1] : '';
            const sid = href.match(/\/series\/(\d+)/);
            if (!name || !sid || seen.has(href)) return;
            seen.add(href);
            out.push({
                vod_id: 'series/' + sid[1],
                vod_name: name,
                vod_pic: normPic(pic),
                vod_tag: 'folder',
                vod_remarks: '系列',
                style: { type: 'rect', ratio: 1.33 }
            });
        });

        return JSON.stringify({
            list: out,
            page: pg,
            pagecount: 999,
            limit: 30,
            total: 999
        });
    } catch (e) {
        console.error('seriesList error', e.message);
        return emptyResult(pg);
    }
}

async function makerList(pg, extend) {
    const url = buildUrl('/zh-CN/maker/all', pg, extend);
    try {
        const html = await request(url);
        if (!html) return emptyResult(pg);
        const $ = cheerio.load(html);
        const out = [];
        const seen = new Set();

        $('a.maker-grid-link, a[class*="maker-grid-link"]').each((_, a) => {
            const $a = $(a);
            const href = $a.attr('href') || '';
            if (!href.includes('/maker/')) return;
            const name = $a.find('div.maker-grid-name, div[class*="maker-grid-name"]').first().text().trim();
            const pic = $a.find('img.maker-circle-img, img[class*="maker-circle-img"]').attr('src') || '';
            const mid = href.match(/\/maker\/(\d+)/);
            if (!name || !mid || seen.has(href)) return;
            seen.add(href);
            out.push({
                vod_id: 'maker/' + mid[1],
                vod_name: name,
                vod_pic: normPic(pic),
                vod_tag: 'folder',
                vod_remarks: '片商',
                style: { type: 'rect', ratio: 1.33 }
            });
        });

        return JSON.stringify({
            list: out,
            page: pg,
            pagecount: 999,
            limit: 30,
            total: 999
        });
    } catch (e) {
        console.error('makerList error', e.message);
        return emptyResult(pg);
    }
}

async function actorList(pg, extend) {
    const url = buildUrl('/zh-CN/actor/all', pg, extend);
    try {
        const html = await request(url);
        if (!html) return emptyResult(pg);
        const $ = cheerio.load(html);
        const out = [];
        const seen = new Set();

        $('a.maker-grid-link, a[class*="maker-grid-link"]').each((_, a) => {
            const $a = $(a);
            const href = $a.attr('href') || '';
            if (!href.includes('/actor/')) return;
            const name = $a.find('div.maker-grid-name, div[class*="maker-grid-name"]').first().text().trim();
            const pic = $a.find('img.maker-circle-img, img[class*="maker-circle-img"]').attr('src') || '';
            const count = $a.find('div.maker-grid-count, div[class*="maker-grid-count"]').first().text().trim();
            const aid = href.match(/\/actor\/(\d+)/);
            if (!name || !aid || seen.has(href)) return;
            seen.add(href);
            out.push({
                vod_id: 'actor/' + aid[1],
                vod_name: name,
                vod_pic: normPic(pic),
                vod_tag: 'folder',
                vod_remarks: count || '女优',
                style: { type: 'rect', ratio: 1.33 }
            });
        });

        return JSON.stringify({
            list: out,
            page: pg,
            pagecount: 999,
            limit: 30,
            total: 999
        });
    } catch (e) {
        console.error('actorList error', e.message);
        return emptyResult(pg);
    }
}

async function videoList(path, pg, extend) {
    const url = buildUrl(path, pg, extend);
    try {
        const html = await request(url);
        if (!html) return emptyResult(pg);
        const $ = cheerio.load(html);
        const videos = [];
        const seen = new Set();

        $('a.card, a[class*="card"]').each((_, a) => {
            const $a = $(a);
            let name = $a.find('div.card-title, div[class*="card-title"]').first().text().trim();
            if (!name) name = $a.find('img').attr('alt') || '';
            const pic = $a.find('img').attr('src') || '';
            const href = $a.attr('href') || '';
            if (!name || !href || seen.has(href)) return;
            seen.add(href);
            videos.push({
                vod_id: href,
                vod_name: name,
                vod_pic: normPic(pic),
                vod_remarks: '',
                style: { type: 'rect', ratio: 1.33 }
            });
        });

        return JSON.stringify({
            list: videos,
            page: pg,
            pagecount: 999,
            limit: 30,
            total: 999
        });
    } catch (e) {
        console.error('videoList error', e.message);
        return emptyResult(pg);
    }
}

async function search(key, quick, pg) {
    pg = Number(pg) || 1;
    try {
        const url = HOST + '/zh-CN/search?q=' + encodeURIComponent(key);
        const html = await request(url);
        if (!html) {
            return JSON.stringify({ list: [], page: 1, pagecount: 0, land: 1, ratio: 1.33 });
        }
        const $ = cheerio.load(html);
        const videos = [];
        const seen = new Set();

        $('a.card, a[class*="card"]').each((i, a) => {
            if (i >= 30) return false;
            const $a = $(a);
            let name = $a.find('div.card-title, div[class*="card-title"]').first().text().trim();
            if (!name) name = $a.find('img').attr('alt') || '';
            const pic = $a.find('img').attr('src') || '';
            const href = $a.attr('href') || '';
            if (!name || !href || seen.has(href)) return;
            seen.add(href);
            videos.push({
                vod_id: href,
                vod_name: name,
                vod_pic: normPic(pic),
                vod_remarks: '',
                style: { type: 'rect', ratio: 1.33 }
            });
        });

        return JSON.stringify({
            list: videos,
            page: 1,
            pagecount: 1,
            land: 1,
            ratio: 1.33
        });
    } catch (e) {
        console.error('search error', e.message);
        return JSON.stringify({ list: [], page: 1, pagecount: 0, land: 1, ratio: 1.33 });
    }
}

async function detail(vodId) {
    try {
        const url = String(vodId).startsWith('http') ? vodId : (HOST + vodId);
        const html = await request(url);
        if (!html) return JSON.stringify({ list: [] });

        const $ = cheerio.load(html);

        let title = $('h1.vd-title, h1[class*="vd-title"]').first().text().trim();
        if (!title) title = $('h1').first().text().trim();

        const pic = $('video.vd-player, video[class*="vd-player"]').attr('poster') || '';

        const meta = {};
        $('div.vd-meta-row, div[class*="vd-meta-row"]').each((_, row) => {
            const $row = $(row);
            const label = $row.find('span.vd-meta-label, span[class*="vd-meta-label"]').first().text().trim();
            const val = $row.find('[class*="vd-meta-val"]').first().text().trim().replace(/\s+/g, ' ');
            if (label && val) meta[label] = val;
        });
        const content = Object.keys(meta).map(k => k + ': ' + meta[k]).join('  ');

        const vid = $('video.vd-player, video[class*="vd-player"]').attr('data-video-id') || '';
        let trailer = $('video.vd-player, video[class*="vd-player"]').attr('data-trailer-url') || '';
        trailer = trailer.trim();
        if (!trailer && vid) {
            trailer = HOST + '/trailer/' + vid;
        }

        const vod = {
            vod_id: vodId,
            vod_name: title,
            vod_pic: normPic(pic),
            vod_content: content,
            vod_play_from: '官方试看',
            vod_play_url: trailer ? ('第1集$' + trailer) : ''
        };

        return JSON.stringify({ list: [vod] });
    } catch (e) {
        console.error('detail error', e.message);
        return JSON.stringify({ list: [] });
    }
}

async function play(flag, playId, flags) {
    try {
        const header = Object.assign({}, DEFAULT_HEADERS);

        // 已是直链
        if (playId.includes('/trailer/') || playId.endsWith('.m3u8') || playId.endsWith('.mp4')) {
            return JSON.stringify({
                parse: 0,
                url: playId,
                header: header
            });
        }

        const target = playId.startsWith('http') ? playId : (HOST + playId);
        const html = await request(target);
        if (!html) {
            return JSON.stringify({ parse: 0, url: playId, header: header });
        }

        let playUrl = '';
        const patterns = [
            /(https?:\/\/[^"']+\.m3u8[^"']*)/,
            /(https?:\/\/[^"']+\.mp4[^"']*)/,
            /src\s*=\s*["']([^"']+)["']/
        ];
        for (const pat of patterns) {
            const m = html.match(pat);
            if (m) {
                playUrl = m[1];
                break;
            }
        }
        if (!playUrl) playUrl = playId;
        if (playUrl && !playUrl.startsWith('http')) {
            if (playUrl.startsWith('/')) {
                playUrl = HOST + playUrl;
            } else {
                playUrl = 'https:' + playUrl;
            }
        }

        return JSON.stringify({
            parse: 0,
            url: playUrl,
            header: header
        });
    } catch (e) {
        console.error('play error', e.message);
        return JSON.stringify({
            parse: 0,
            url: playId || '',
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
