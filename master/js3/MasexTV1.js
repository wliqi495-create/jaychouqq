import { Crypto, load, _ } from 'assets://js/lib/cat.js';

let siteKey = '';
let siteType = 0;

const HOST = 'https://masex.tv';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const DEFAULT_HEADERS = {
    'User-Agent': UA,
    Referer: HOST + '/zh-CN',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
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
        .map(v => ({ n: v + ' cm', v }))
);
const ACTOR_CUP_OPTS = [{ n: '全部胸围', v: '' }].concat(
    'ABCDEFGHIJKLMNOPQZ'.split('').map(v => ({ n: v + ' 杯', v }))
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
        const res = await req(url, { method: 'GET', headers, timeout: 15000 });
        return res?.content ?? '';
    } catch (e) {
        console.error('request error:', url, e?.message);
        return '';
    }
}

function normPic(pic) {
    if (!pic) return '';
    if (pic.startsWith('http://')) return 'https://' + pic.slice(7);
    if (pic.startsWith('//')) return 'https:' + pic;
    if (pic.startsWith('/')) return HOST + pic;
    return pic;
}

function parseExt(ext) {
    if (!ext) return {};
    if (typeof ext === 'object') return ext;
    if (typeof ext === 'string' && ext.trim()) {
        try { return JSON.parse(ext); } catch (e) { return {}; }
    }
    return {};
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

function extractVideoCards(html) {
    const list = [];
    const seen = new Set();
    if (!html) return list;
    const re = /<a[^>]+href="([^"]*\/video\/\d+[^"]*)"[^>]*class="[^"]*card[^"]*"[^>]*>[\s\S]{0,900}?(?:src="([^"]+)")?[\s\S]{0,400}?(?:alt="([^"]*)"|class="[^"]*card-title[^"]*"[^>]*>([\s\S]*?)<\/div>)/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
        const href = m[1];
        if (seen.has(href)) continue;
        seen.add(href);
        const pic = m[2] || '';
        let name = (m[4] || m[3] || '').replace(/<[^>]+>/g, '').trim();
        if (!name) continue;
        list.push({
            vod_id: href,
            vod_name: name,
            vod_pic: normPic(pic),
            vod_remarks: '',
            style: { type: 'rect', ratio: 1.33 }
        });
    }
    if (!list.length) {
        const re2 = /href="([^"]*\/video\/\d+[^"]*)"[\s\S]{0,500}?alt="([^"]+)"/gi;
        while ((m = re2.exec(html)) !== null) {
            if (seen.has(m[1])) continue;
            seen.add(m[1]);
            list.push({
                vod_id: m[1],
                vod_name: m[2],
                vod_pic: '',
                vod_remarks: '',
                style: { type: 'rect', ratio: 1.33 }
            });
        }
    }
    return list;
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
        const list = extractVideoCards(html);
        return JSON.stringify({ list: list.slice(0, 30) });
    } catch (e) {
        console.error('homeVod error', e.message);
        return JSON.stringify({ list: [] });
    }
}

async function category(tid, pg, filter, ext) {
    pg = Number(pg) || 1;
    tid = String(tid || '');
    const extend = parseExt(ext);
    try {
        if (tid === 'tags') return await tagList(extend);
        if (tid === 'maker') return await seriesList(pg);
        if (tid === 'maker/all') return await makerList(pg, extend);
        if (tid === 'actor/all') return await actorList(pg, extend);
        const path = tid.startsWith('/') ? tid : ('/zh-CN/' + tid.replace(/^zh-CN\//, ''));
        return await videoList(path, pg, extend);
    } catch (e) {
        console.error('category error', e.message);
        return emptyResult(pg);
    }
}

async function tagList(extend) {
    const group = (extend || {}).cls || '';
    const html = await request(HOST + '/zh-CN/tags');
    if (!html) return emptyResult(1);
    const out = [];
    const re = /href="([^"]*\/tag\/(\d+)[^"]*)"[\s\S]{0,300}?tag-grid-name[^>]*>([^<]+)/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
        out.push({
            vod_id: 'tag/' + m[2],
            vod_name: m[3].trim(),
            vod_pic: '',
            vod_tag: 'folder',
            vod_remarks: group || '类型',
            style: { type: 'rect', ratio: 1.33 }
        });
    }
    return JSON.stringify({ list: out, page: 1, pagecount: 1, limit: out.length || 30, total: out.length });
}

async function seriesList(pg) {
    const url = HOST + '/zh-CN/maker' + (pg > 1 ? '?page=' + pg : '');
    const html = await request(url);
    if (!html) return emptyResult(pg);
    const out = [];
    const seen = new Set();
    const re = /href="([^"]*\/series\/(\d+)[^"]*)"[\s\S]{0,400}?(?:url\('([^']+)'\)|src="([^"]+)")[\s\S]{0,300}?series-card-name[^>]*>([^<]+)/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
        if (seen.has(m[2])) continue;
        seen.add(m[2]);
        out.push({
            vod_id: 'series/' + m[2],
            vod_name: m[5].trim(),
            vod_pic: normPic(m[3] || m[4] || ''),
            vod_tag: 'folder',
            vod_remarks: '系列',
            style: { type: 'rect', ratio: 1.33 }
        });
    }
    return JSON.stringify({ list: out, page: pg, pagecount: 999, limit: 30, total: 999 });
}

async function makerList(pg, extend) {
    const html = await request(buildUrl('/zh-CN/maker/all', pg, extend));
    if (!html) return emptyResult(pg);
    const out = [];
    const seen = new Set();
    const re = /href="([^"]*\/maker\/(\d+)[^"]*)"[\s\S]{0,400}?(?:src="([^"]+)")?[\s\S]{0,200}?maker-grid-name[^>]*>([^<]+)/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
        if (seen.has(m[2])) continue;
        seen.add(m[2]);
        out.push({
            vod_id: 'maker/' + m[2],
            vod_name: m[4].trim(),
            vod_pic: normPic(m[3] || ''),
            vod_tag: 'folder',
            vod_remarks: '片商',
            style: { type: 'rect', ratio: 1.33 }
        });
    }
    return JSON.stringify({ list: out, page: pg, pagecount: 999, limit: 30, total: 999 });
}

async function actorList(pg, extend) {
    const html = await request(buildUrl('/zh-CN/actor/all', pg, extend));
    if (!html) return emptyResult(pg);
    const out = [];
    const seen = new Set();
    const re = /href="([^"]*\/actor\/(\d+)[^"]*)"[\s\S]{0,500}?(?:src="([^"]+)")?[\s\S]{0,250}?maker-grid-name[^>]*>([^<]+)/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
        if (seen.has(m[2])) continue;
        seen.add(m[2]);
        out.push({
            vod_id: 'actor/' + m[2],
            vod_name: m[4].trim(),
            vod_pic: normPic(m[3] || ''),
            vod_tag: 'folder',
            vod_remarks: '女优',
            style: { type: 'rect', ratio: 1.33 }
        });
    }
    return JSON.stringify({ list: out, page: pg, pagecount: 999, limit: 30, total: 999 });
}

async function videoList(path, pg, extend) {
    const html = await request(buildUrl(path, pg, extend));
    if (!html) return emptyResult(pg);
    const videos = extractVideoCards(html);
    return JSON.stringify({
        list: videos,
        page: pg,
        pagecount: videos.length >= 20 ? pg + 1 : pg,
        limit: 30,
        total: 999
    });
}

async function search(key, quick, pg) {
    pg = Number(pg) || 1;
    try {
        const url = HOST + '/zh-CN/search?q=' + encodeURIComponent(key) + (pg > 1 ? '&page=' + pg : '');
        const html = await request(url);
        const videos = extractVideoCards(html);
        return JSON.stringify({
            list: videos,
            page: pg,
            pagecount: videos.length >= 20 ? pg + 1 : pg,
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
        let url = String(vodId || '');
        if (!url.startsWith('http')) {
            if (!url.startsWith('/')) url = '/' + url;
            if (!url.includes('/zh-CN') && url.startsWith('/video/')) url = '/zh-CN' + url;
            url = HOST + url;
        }
        const html = await request(url);
        if (!html) return JSON.stringify({ list: [] });

        let title = '';
        const h1 = html.match(/<(?:h1)[^>]*class="[^"]*vd-title[^"]*"[^>]*>([^<]+)/i) || html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
        if (h1) title = h1[1].trim();

        const poster = html.match(/<(?:video)[^>]*(?:poster|data-poster)="([^"]+)"/i);
        const pic = poster ? poster[1] : '';

        const vidM = html.match(/data-video-id="([^"]+)"/i);
        const vid = vidM ? vidM[1] : '';
        let trailer = '';
        const tM = html.match(/data-trailer-url="([^"]+)"/i);
        if (tM) trailer = tM[1].trim();
        if (!trailer && vid) trailer = HOST + '/trailer/' + vid;

        const vod = {
            vod_id: vodId,
            vod_name: title || String(vodId),
            vod_pic: normPic(pic),
            vod_content: title,
            vod_play_from: '官方试看',
            vod_play_url: trailer ? ('试看$' + trailer) : ''
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
        if (/\/trailer\/|\.m3u8|\.mp4/i.test(playId)) {
            return JSON.stringify({ parse: 0, url: playId, header });
        }
        const target = playId.startsWith('http') ? playId : (HOST + playId);
        const html = await request(target);
        let playUrl = playId;
        const m = html && html.match(/(https?:\/\/[^"']+\.(?:m3u8|mp4)[^"']*)/i);
        if (m) playUrl = m[1];
        if (playUrl && !playUrl.startsWith('http')) {
            playUrl = playUrl.startsWith('/') ? HOST + playUrl : 'https:' + playUrl;
        }
        return JSON.stringify({ parse: 0, url: playUrl, header });
    } catch (e) {
        console.error('play error', e.message);
        return JSON.stringify({ parse: 0, url: playId || '', header: { 'User-Agent': UA } });
    }
}

export function __jsEvalReturn() {
    return { init, home, homeVod, category, detail, search, play };
}
