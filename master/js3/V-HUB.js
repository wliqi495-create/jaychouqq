import { Crypto, _ } from 'assets://js/lib/cat.js';

let siteKey = '';
let siteType = 0;

const HOST = 'https://newxvideos.pages.dev';
const API_URL = HOST + '/api';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const DEFAULT_HEADERS = {
    'User-Agent': UA,
    'Referer': HOST + '/',
    'Origin': HOST,
    'Accept': 'application/json, text/plain, */*'
};

// 分类列表（与原 Python 保持一致）
const CATEGORIES = [
    { type_id: 'Arab-159', type_name: '阿拉伯' },
    { type_id: 'Mature-38', type_name: '成熟' },
    { type_id: 'Cuckold-237', type_name: '出轨背叛' },
    { type_id: 'Femdom-235', type_name: '调教' },
    { type_id: 'Anal-12', type_name: '肛交' },
    { type_id: 'Brunette-25', type_name: '褐发' },
    { type_id: 'Black_Woman-30', type_name: '黑人' },
    { type_id: 'Redhead-31', type_name: '红发' },
    { type_id: 'Fucked_Up_Family-81', type_name: '家庭乱搞' },
    { type_id: 'Blonde-20', type_name: '金发' },
    { type_id: 'Big_Cock-34', type_name: '巨屌' },
    { type_id: 'Big_Tits-23', type_name: '巨乳' },
    { type_id: 'Big_Ass-24', type_name: '巨臀' },
    { type_id: 'Blowjob-15', type_name: '口交' },
    { type_id: 'Latina-16', type_name: '拉丁裔' },
    { type_id: 'Milf-19', type_name: '辣妈' },
    { type_id: 'Gapes-167', type_name: '裂开' },
    { type_id: 'Ass-14', type_name: '美臀' },
    { type_id: 'Lesbian-26', type_name: '女同' },
    { type_id: 'bbw-51', type_name: '胖女' },
    { type_id: 'Squirting-56', type_name: '喷出' },
    { type_id: 'Fisting-165', type_name: '拳交' },
    { type_id: 'Gangbang-69', type_name: '群交' },
    { type_id: 'Teen-13', type_name: '少女' },
    { type_id: 'Cumshot-18', type_name: '射颜' },
    { type_id: 'Cam_Porn-58', type_name: '摄像头' },
    { type_id: 'Bi_Sexual-62', type_name: '双性恋' },
    { type_id: 'Stockings-28', type_name: '丝袜' },
    { type_id: 'Oiled-22', type_name: '涂油' },
    { type_id: 'Lingerie-83', type_name: '性感内衣' },
    { type_id: 'Asian_Woman-32', type_name: '亚洲' },
    { type_id: 'Amateur-65', type_name: '业余' },
    { type_id: 'Interracial-27', type_name: '异族' },
    { type_id: 'Indian-89', type_name: '印度' },
    { type_id: 'Creampie-40', type_name: '中出' },
    { type_id: 'Solo_and_Masturbation-33', type_name: '自慰' },
    { type_id: 'AI-239', type_name: 'AI' },
    { type_id: 'ASMR-229', type_name: 'ASMR' }
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

function safeJson(str) {
    try {
        if (!str) return null;
        return JSON.parse(str);
    } catch (e) {
        return null;
    }
}

function formatTimeCn(timeStr) {
    if (!timeStr) return '';
    let m = timeStr.trim().match(/^(\d+)\s*min\s*$/i);
    if (m) return m[1] + '分钟';
    m = timeStr.trim().match(/^(\d+)\s*h(?:our)?s?\s*(\d+)?\s*min\s*$/i);
    if (m) {
        const h = m[1];
        const mi = m[2];
        if (mi) return h + '小时' + mi + '分钟';
        return h + '小时';
    }
    return timeStr;
}

function extractXvid(url) {
    if (!url) return '';
    try {
        const qs = url.split('?')[1] || '';
        const params = qs.split('&');
        for (const p of params) {
            const [k, v] = p.split('=');
            if (k === 'xvid') return decodeURIComponent(v || '');
        }
    } catch (e) {}
    return '';
}

function buildVodList(rawData) {
    const videos = [];
    if (!Array.isArray(rawData)) return videos;

    for (const item of rawData) {
        let title = item.title || '';
        let cleanTitle = title.replace(/^AVOTC资源网[—-]+\s*/, '').trim();
        if (!cleanTitle) cleanTitle = title;

        const url = item.url || '';
        let vodId = extractXvid(url);
        if (!vodId) vodId = String(item.videoid || '');

        videos.push({
            vod_id: vodId,
            vod_name: cleanTitle,
            vod_pic: item.img || '',
            vod_remarks: formatTimeCn(item.time || ''),
            style: { type: 'rect', ratio: 1.33 }
        });
    }
    return videos;
}

async function apiGet(params) {
    try {
        const qs = Object.keys(params)
            .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
            .join('&');
        const fullUrl = API_URL + '?' + qs;
        const resp = await request(fullUrl);
        const data = safeJson(resp);
        if (Array.isArray(data)) return data;
        if (data && typeof data === 'object' && Array.isArray(data.data)) return data.data;
        return [];
    } catch (e) {
        console.error('apiGet error:', e?.message);
        return [];
    }
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
        const classes = CATEGORIES.map(c => ({
            type_id: c.type_id,
            type_name: c.type_name,
            land: 1,
            ratio: 1.33
        }));
        return JSON.stringify({ class: classes, filters: {} });
    } catch (e) {
        console.error('home error', e.message);
        return JSON.stringify({ class: [], filters: {} });
    }
}

async function homeVod() {
    try {
        const raw = await apiGet({ play: 'list', page: 1 });
        const list = buildVodList(raw);
        return JSON.stringify({ list: list.slice(0, 20) });
    } catch (e) {
        console.error('homeVod error', e.message);
        return JSON.stringify({ list: [] });
    }
}

async function category(tid, pg, filter, ext) {
    pg = Number(pg) || 1;
    try {
        const raw = await apiGet({ play: 'class', c: tid, page: pg });
        const list = buildVodList(raw);
        return JSON.stringify({
            list: list,
            page: pg,
            pagecount: 9999,
            limit: 90,
            total: 9999
        });
    } catch (e) {
        console.error('category error', e.message);
        return JSON.stringify({ list: [], page: pg, pagecount: 0 });
    }
}

async function search(key, quick, pg) {
    pg = Number(pg) || 1;
    try {
        const raw = await apiGet({ play: 'k', k: key, page: pg });
        const list = buildVodList(raw);
        return JSON.stringify({
            list: list,
            page: pg,
            pagecount: 9999,
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
        const qs = 'xvid=' + encodeURIComponent(vodId);
        const fullUrl = API_URL + '?' + qs;
        const resp = await request(fullUrl);
        const data = safeJson(resp);

        const vod = {
            vod_id: vodId,
            vod_name: '视频详情',
            vod_pic: '',
            vod_remarks: '',
            vod_content: '',
            vod_play_from: 'newxvideos',
            vod_play_url: ''
        };

        if (!data) {
            return JSON.stringify({ list: [vod] });
        }

        let item = data;
        if (data.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
            item = data.data;
        }

        const playUrls = [];

        // 兼容 dict 或 list
        const items = Array.isArray(data) ? data : [item];

        for (const it of items) {
            const hls = it.hls || it.m3u8 || '';
            const high = it.hight || it.high || it.hd || '';
            const low = it.low || it.sd || '';

            if (hls) playUrls.push('高清HLS$' + hls);
            if (high) playUrls.push('高清MP4$' + high);
            if (low) playUrls.push('低清MP4$' + low);

            if (vod.vod_name === '视频详情') {
                let title = it.title || '';
                if (title) {
                    const clean = title.replace(/^AVOTC资源网[—-]+\s*/, '').trim();
                    if (clean) vod.vod_name = clean;
                }
                if (it.img) vod.vod_pic = it.img;
                if (it.time) vod.vod_remarks = formatTimeCn(it.time);
            }
        }

        if (playUrls.length > 0) {
            vod.vod_play_url = playUrls.join('#');
        }

        return JSON.stringify({ list: [vod] });
    } catch (e) {
        console.error('detail error', e.message);
        return JSON.stringify({ list: [] });
    }
}

async function play(flag, playId, flags) {
    try {
        // 播放地址已是完整 http 链接，直接返回
        if (playId && (playId.startsWith('http://') || playId.startsWith('https://'))) {
            return JSON.stringify({
                parse: 0,
                url: playId,
                header: {
                    'User-Agent': UA,
                    'Referer': HOST + '/'
                }
            });
        }
        return JSON.stringify({
            parse: 0,
            url: playId || '',
            header: { 'User-Agent': UA }
        });
    } catch (e) {
        console.error('play error', e.message);
        return JSON.stringify({ parse: 0, url: playId || '', header: { 'User-Agent': UA } });
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
