import { Crypto, _ } from 'assets://js/lib/cat.js';

let siteKey = '';
let siteType = 0;

const API_BASE = 'https://jdforrepam.com/api';
const SOURCE_BASE = 'https://catembylegacy.fastcdn.dpdns.org';
const SOURCE_ORIGIN = SOURCE_BASE + '/';
const SIGNATURE_TOKEN = 'lpw6vgqzsp';
const SIGNATURE_SALT =
    '71cf27bb3c0bcdf207b64abecddc970098c7421ee7203b9cdae54478478a199e7' +
    'd5a6e1a57691123c1a931c057842fb73ba3b3c83bcd69c17ccf174081e3d8aa';

const UA =
    'Mozilla/5.0 (Linux; Android 10; TV) AppleWebKit/537.36 Chrome/120.0 Safari/537.36';

const DEFAULT_HEADERS = {
    'User-Agent': UA,
    Accept: 'application/json',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    Referer: SOURCE_ORIGIN
};

const CATEGORY_SPECS = [
    { type_id: 'censored', type_name: '有码', content_type: '0' },
    { type_id: 'uncensored', type_name: '无码', content_type: '1' },
    { type_id: 'western', type_name: '欧美', content_type: '2' },
    { type_id: 'fc2', type_name: 'FC2', content_type: '3' }
];

const TYPE_BY_CATEGORY = {};
CATEGORY_SPECS.forEach(c => {
    TYPE_BY_CATEGORY[c.type_id] = c.content_type;
});

const SORTS = [
    { n: '热度', v: 'watched_count' },
    { n: '最新', v: 'release' },
    { n: '评分', v: 'score' },
    { n: '想看', v: 'want_watch_count' },
    { n: '磁链', v: 'magnets_count' }
];

const PLAY_PREFIX = 'catemby-play:';
const DEFAULT_PIC = SOURCE_BASE + '/favicon.ico';

const _cache = {};
const LIST_CACHE_TTL = 120;
const DETAIL_CACHE_TTL = 21600;

function cacheGet(key) {
    const item = _cache[key];
    if (!item) return null;
    if (item.expire < Date.now()) {
        delete _cache[key];
        return null;
    }
    return item.value;
}

function cacheSet(key, value, ttl) {
    if (ttl <= 0) return;
    _cache[key] = { value, expire: Date.now() + ttl * 1000 };
}

async function request(url, optHeaders = {}) {
    try {
        const headers = Object.assign({}, DEFAULT_HEADERS, optHeaders);
        const res = await req(url, { method: 'GET', headers, timeout: 20000 });
        return res?.content ?? '';
    } catch (e) {
        console.error('request error:', url, e?.message);
        return '';
    }
}

function safeJson(str) {
    try {
        if (!str) return null;
        if (typeof str === 'object') return str;
        return JSON.parse(str);
    } catch (e) {
        return null;
    }
}

function cleanText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
}

function numberVal(value) {
    const n = parseFloat(value);
    return isNaN(n) ? 0 : n;
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

function signature() {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const digest = Crypto.MD5(timestamp + SIGNATURE_SALT).toString();
    return timestamp + '.' + SIGNATURE_TOKEN + '.' + digest;
}

function pickMovies(data) {
    if (!data || typeof data !== 'object') return [];
    if (Array.isArray(data.movies)) return data.movies;
    if (Array.isArray(data.list)) return data.list;
    if (Array.isArray(data.items)) return data.items;
    if (data.data && Array.isArray(data.data.movies)) return data.data.movies;
    return [];
}

async function apiGet(path, params = {}, ttl = 0) {
    const cacheKey = path + '?' + JSON.stringify(params);
    if (ttl > 0) {
        const cached = cacheGet(cacheKey);
        if (cached !== null) return cached;
    }

    const qs = Object.keys(params)
        .filter(k => params[k] !== undefined && params[k] !== null && params[k] !== '')
        .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(String(params[k])))
        .join('&');

    const url = API_BASE + path + (qs ? '?' + qs : '');
    const headers = {
        Accept: 'application/json',
        jdsignature: signature(),
        Origin: SOURCE_ORIGIN,
        Referer: SOURCE_ORIGIN
    };

    const resp = await request(url, headers);
    const body = safeJson(resp) || {};
    let data = body;
    if (body && typeof body === 'object' && body.data && typeof body.data === 'object') {
        data = body.data;
    }
    if (data && ttl > 0) cacheSet(cacheKey, data, ttl);
    return data || {};
}


function codeCandidates(code) {
    const raw = cleanText(code);
    const out = [];
    const push = v => { if (v && !out.includes(v)) out.push(v); };
    push(raw);
    push(raw.toUpperCase());
    push(raw.toLowerCase());
    const compact = raw.replace(/\s+/g, '');
    push(compact);
    const dashed = compact.replace(/([A-Za-z]+)(\d+)/, '$1-$2');
    push(dashed);
    push(dashed.toUpperCase());
    return out;
}

function normalizeVariant(item, index) {
    if (!item || typeof item !== 'object') return null;
    const url = cleanText(item.url || item.play_url || item.src || item.m3u8);
    if (!url || !/^https?:\/\//i.test(url)) return null;
    const height = numberVal(item.height || item.quality || item.resolution);
    let transport = cleanText(item.transport);
    if (!transport) transport = /\.m3u8/i.test(url) ? 'hls' : 'progressive';
    return {
        url,
        height,
        transport,
        page_url: cleanText(item.page_url || item.referer || ''),
        index
    };
}

async function resolveVariants(code) {
    const headers = {
        Accept: 'application/json',
        Referer: SOURCE_ORIGIN,
        Origin: SOURCE_ORIGIN,
        'User-Agent': UA
    };
    for (const candidate of codeCandidates(code)) {
        const url = SOURCE_BASE + '/api/v/resolve?code=' + encodeURIComponent(candidate) + '&lang=zh';
        const resp = await request(url, headers);
        const body = safeJson(resp) || {};
        let raw = body.variants;
        if (!raw && body.data && typeof body.data === 'object') raw = body.data.variants;
        if (!raw && body.result && typeof body.result === 'object') raw = body.result.variants;
        const variants = [];
        (Array.isArray(raw) ? raw : []).forEach((item, i) => {
            const n = normalizeVariant(item, i);
            if (n) variants.push(n);
        });
        if (variants.length) return variants;
    }
    return [];
}

function pickVariant(variants, mode) {
    if (!variants.length) return {};
    if (mode === 'speed') {
        const prog = variants.filter(v => v.transport === 'progressive');
        return (prog[0] || variants[0]);
    }
    let best = variants[0];
    for (const v of variants) {
        if (numberVal(v.height) > numberVal(best.height)) best = v;
    }
    return best;
}

function packPlayId(payload) {
    try {
        const raw = JSON.stringify(payload || {});
        return (
            PLAY_PREFIX +
            Crypto.enc.Base64.stringify(Crypto.enc.Utf8.parse(raw))
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '')
        );
    } catch (e) {
        return '';
    }
}

function unpackPlayId(value) {
    const text = String(value || '').trim();
    if (!text.startsWith(PLAY_PREFIX)) return {};
    let token = text.slice(PLAY_PREFIX.length);
    token += '='.repeat((4 - (token.length % 4)) % 4);
    token = token.replace(/-/g, '+').replace(/_/g, '/');
    try {
        const json = Crypto.enc.Utf8.stringify(Crypto.enc.Base64.parse(token));
        return safeJson(json) || {};
    } catch (e) {
        return {};
    }
}

function extractBtih(value) {
    const text = String(value || '');
    const m = text.match(/btih:([A-F0-9]{40}|[A-Z2-7]{32})/i);
    if (m) return m[1].toUpperCase();
    if (/^(?:[A-F0-9]{40}|[A-Z2-7]{32})$/i.test(text.trim())) return text.trim().toUpperCase();
    return '';
}

function normalizeMagnet(value) {
    const btih = extractBtih(value);
    return btih ? 'magnet:?xt=urn:btih:' + btih : '';
}

function durationText(value) {
    const n = numberVal(value);
    return n > 0 ? Math.round(n) + '分钟' : '';
}

function formatSize(sizeMb) {
    const n = numberVal(sizeMb);
    if (n <= 0) return '';
    if (n >= 1024) return (n / 1024).toFixed(2) + 'GB';
    return Math.round(n) + 'MB';
}

function movieCard(raw) {
    const movieId = cleanText(raw.id || raw.movie_id);
    const number = cleanText(raw.number || raw.number_letter || movieId);
    const title = cleanText(raw.title || raw.origin_title || number);
    const remarks = [];
    const magnets = Math.floor(numberVal(raw.magnets_count));
    if (magnets) remarks.push('磁力' + magnets);
    if (raw.has_cnsub || numberVal(raw.play_subtitle) > 0) remarks.push('中字');
    if (raw.can_play) remarks.push('可播');
    const score = numberVal(raw.score);
    if (score) remarks.push(score.toFixed(1) + '分');
    const dur = durationText(raw.duration);
    if (dur && remarks.length === 0) remarks.push(dur);

    let pic = raw.thumb_url || raw.cover_url || '';
    if (!pic && Array.isArray(raw.preview_images) && raw.preview_images.length) {
        const p = raw.preview_images[0];
        pic = (p && (p.large_url || p.thumb_url || p.url)) || '';
    }
    if (!pic) pic = DEFAULT_PIC;

    return {
        vod_id: movieId,
        vod_name: (number + ' ' + title).trim(),
        vod_pic: pic,
        vod_remarks: remarks.join(' · ') || dur,
        style: { type: 'rect', ratio: 0.7 }
    };
}

function pageResult(rawMovies, page, expectedLimit) {
    const items = [];
    const seen = new Set();
    const list = Array.isArray(rawMovies) ? rawMovies : [];
    for (const raw of list) {
        if (!raw || typeof raw !== 'object') continue;
        const mid = cleanText(raw.id || raw.movie_id || raw.number);
        if (!mid || seen.has(mid)) continue;
        seen.add(mid);
        items.push(movieCard(raw));
    }
    const pagecount = list.length >= expectedLimit ? page + 1 : page;
    return {
        list: items,
        page,
        pagecount,
        limit: expectedLimit,
        total: pagecount * expectedLimit
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
        const classes = CATEGORY_SPECS.map(c => ({
            type_id: c.type_id,
            type_name: c.type_name,
            land: 1,
            ratio: 0.7
        }));
        const filters = {};
        for (const c of CATEGORY_SPECS) {
            filters[c.type_id] = [{ key: 'sort', name: '排序', value: SORTS }];
        }
        return JSON.stringify({ class: classes, filters });
    } catch (e) {
        console.error('home error', e.message);
        return JSON.stringify({ class: [], filters: {} });
    }
}

async function homeVod() {
    try {
        const data = await apiGet(
            '/v1/movies/tags',
            {
                filter_by: '0:t:::::',
                sort_by: 'watched_count',
                order_by: 'desc',
                page: 1,
                limit: 24
            },
            LIST_CACHE_TTL
        );
        const result = pageResult(pickMovies(data), 1, 24);
        return JSON.stringify({ list: result.list.slice(0, 20) });
    } catch (e) {
        console.error('homeVod error', e.message);
        return JSON.stringify({ list: [] });
    }
}

async function category(tid, pg, filter, ext) {
    pg = Number(pg) || 1;
    try {
        const contentType = TYPE_BY_CATEGORY[String(tid)];
        if (contentType === undefined) {
            return JSON.stringify({ list: [], page: pg, pagecount: pg, limit: 24, total: 0 });
        }
        const extend = parseExt(ext);
        const sortBy = extend.sort ? String(extend.sort) : 'watched_count';
        const tagId = extend.tag ? String(extend.tag).trim() : '';
        const filterBy = tagId ? contentType + ':t:' + tagId + '::::' : contentType + ':t:::::';

        const data = await apiGet(
            '/v1/movies/tags',
            {
                filter_by: filterBy,
                sort_by: sortBy,
                order_by: 'desc',
                page: pg,
                limit: 24
            },
            LIST_CACHE_TTL
        );
        return JSON.stringify(pageResult(pickMovies(data), pg, 24));
    } catch (e) {
        console.error('category error', e.message);
        return JSON.stringify({ list: [], page: pg, pagecount: 0, limit: 24, total: 0 });
    }
}

async function search(key, quick, pg) {
    pg = Number(pg) || 1;
    const keyword = cleanText(key);
    if (!keyword) {
        return JSON.stringify({ list: [], page: pg, pagecount: 0, land: 1, ratio: 0.7 });
    }
    try {
        const data = await apiGet(
            '/v2/search',
            { q: keyword, page: pg, type: 'movie', limit: 24 },
            LIST_CACHE_TTL
        );
        const result = pageResult(pickMovies(data), pg, 24);
        result.land = 1;
        result.ratio = 0.7;
        return JSON.stringify(result);
    } catch (e) {
        console.error('search error', e.message);
        return JSON.stringify({ list: [], page: pg, pagecount: 0, land: 1, ratio: 0.7 });
    }
}

async function detail(vodId) {
    try {
        const movieId = String(vodId || '').trim();
        if (!movieId) return JSON.stringify({ list: [] });

        const detailData = await apiGet('/v4/movies/' + encodeURIComponent(movieId), {}, DETAIL_CACHE_TTL);
        const movie = detailData.movie || {};
        if (!movie || !movie.id) {
            return JSON.stringify({
                list: [{
                    vod_id: movieId,
                    vod_name: '详情读取失败',
                    vod_pic: DEFAULT_PIC,
                    vod_content: '源站未返回有效详情',
                    vod_play_from: '错误',
                    vod_play_url: ''
                }]
            });
        }

        const number = cleanText(movie.number || movie.number_letter || movieId);
        const title = cleanText(movie.title || movie.origin_title || number);
        const displayTitle = (number + ' ' + title).trim();

        let pic = movie.cover_url || movie.thumb_url || '';
        if (!pic && Array.isArray(movie.preview_images) && movie.preview_images.length) {
            const p = movie.preview_images[0];
            pic = (p && (p.large_url || p.thumb_url || p.url)) || '';
        }
        if (!pic) pic = DEFAULT_PIC;

        let magnets = [];
        try {
            const magnetData = await apiGet(
                '/v1/movies/' + encodeURIComponent(movieId) + '/magnets',
                {},
                DETAIL_CACHE_TTL
            );
            magnets = Array.isArray(magnetData.magnets) ? magnetData.magnets : [];
        } catch (e) {}

        const playFromList = [];
        const playUrlList = [];

        if (number) {
            playFromList.push('智能线路');
            playUrlList.push(
                '画质自动$' +
                    packPlayId({ kind: 'auto', code: number, mode: 'quality', declared_duration: movie.duration }) +
                    '#极速自动$' +
                    packPlayId({ kind: 'auto', code: number, mode: 'speed', declared_duration: movie.duration })
            );
        }

        const magnetItems = [];
        for (const item of magnets.slice(0, 30)) {
            const magnet = normalizeMagnet(item.hash || item.magnet);
            if (!magnet) continue;
            const size = formatSize(item.size);
            const labelParts = [];
            if (item.name) labelParts.push(cleanText(item.name).slice(0, 40));
            if (size) labelParts.push(size);
            if (item.has_subtitle || item.cnsub) labelParts.push('中字');
            const label = labelParts.join(' · ') || '磁力';
            magnetItems.push(label + '$' + packPlayId({ kind: 'magnet', magnet, title: label }));
        }
        if (magnetItems.length) {
            playFromList.push('磁力完整版');
            playUrlList.push(magnetItems.join('#'));
        }

        if (!playFromList.length) {
            playFromList.push('资源状态');
            playUrlList.push(
                '暂无资源 · 搜索 ' +
                    number +
                    '$' +
                    packPlayId({
                        kind: 'error',
                        message: '源站当前没有直连或磁力资源，请搜索番号 ' + number
                    })
            );
        }

        const contentParts = [];
        if (movie.duration) contentParts.push('时长: ' + durationText(movie.duration));
        if (movie.score) contentParts.push('评分: ' + numberVal(movie.score).toFixed(1));
        if (movie.release_date) contentParts.push('发行: ' + cleanText(movie.release_date));
        if (movie.maker) contentParts.push('片商: ' + cleanText(movie.maker));
        if (Array.isArray(movie.actors) && movie.actors.length) {
            contentParts.push(
                '女优: ' + movie.actors.map(a => cleanText(a.name || a)).filter(Boolean).join(', ')
            );
        }
        if (movie.description) contentParts.push(cleanText(movie.description));

        return JSON.stringify({
            list: [{
                vod_id: movieId,
                vod_name: displayTitle,
                vod_pic: pic,
                vod_remarks: durationText(movie.duration),
                vod_content: contentParts.join('\n'),
                vod_play_from: playFromList.join('$$$'),
                vod_play_url: playUrlList.join('$$$')
            }]
        });
    } catch (e) {
        console.error('detail error', e.message);
        return JSON.stringify({ list: [] });
    }
}

async function play(flag, playId, flags) {
    try {
        const payload = unpackPlayId(playId);
        if (!payload || !payload.kind) {
            if (playId && /^https?:\/\//.test(String(playId))) {
                return JSON.stringify({
                    parse: 0,
                    url: playId,
                    header: { 'User-Agent': UA, Referer: SOURCE_ORIGIN }
                });
            }
            return JSON.stringify({ parse: 0, url: '', header: {}, msg: '无法识别播放 ID' });
        }

        if (payload.kind === 'magnet') {
            const magnet = normalizeMagnet(payload.magnet);
            return JSON.stringify({ parse: 0, url: magnet, header: {} });
        }
        if (payload.kind === 'error') {
            return JSON.stringify({ parse: 0, url: '', header: {}, msg: payload.message || '暂无资源' });
        }

        if (payload.kind === 'auto' || payload.kind === 'variant') {
            const code = cleanText(payload.code);
            if (!code) return JSON.stringify({ parse: 0, url: '', header: {}, msg: '缺少番号' });

            const variants = await resolveVariants(code);
            if (!variants.length) {
                return JSON.stringify({ parse: 0, url: '', header: {}, msg: '解析器未返回播放地址' });
            }
            const selected = pickVariant(variants, payload.mode);
            const playUrl = selected.url || '';
            if (!playUrl) {
                return JSON.stringify({ parse: 0, url: '', header: {}, msg: '直连解析失败，请改用磁力' });
            }
            const referer = selected.page_url || SOURCE_ORIGIN;
            const isHls = selected.transport === 'hls' || /\.m3u8/i.test(playUrl);
            return JSON.stringify({
                parse: 0,
                url: playUrl,
                type: isHls ? 'm3u8' : 'mp4',
                header: {
                    'User-Agent': UA,
                    Referer: referer,
                    Origin: SOURCE_ORIGIN
                }
            });
        }

        return JSON.stringify({ parse: 0, url: '', header: {}, msg: '不支持的播放方式' });
    } catch (e) {
        console.error('play error', e.message);
        return JSON.stringify({ parse: 0, url: '', header: { 'User-Agent': UA }, msg: String(e.message || e) });
    }
}

export function __jsEvalReturn() {
    return { init, home, homeVod, category, detail, search, play };
}
