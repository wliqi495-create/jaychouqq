import { Crypto, _ } from 'assets://js/lib/cat.js';

let siteKey = '';
let siteType = 0;

const BASE = 'https://www.pandalive.co.kr';
const API = 'https://api.pandalive.co.kr';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36';

const DEVICE = { t: 'webPc', v: '1.0', ui: '0', ck: { sessKeyAsp: '' } };

function headers(extra) {
    const h = {
        'User-Agent': UA,
        Accept: 'application/json, text/plain, */*',
        Origin: BASE,
        Referer: BASE + '/',
        'x-device-info': JSON.stringify(DEVICE)
    };
    return Object.assign(h, extra || {});
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

async function httpGet(url, extra) {
    try {
        const res = await req(url, { method: 'GET', headers: headers(extra), timeout: 15000 });
        return res && res.content ? res.content : '';
    } catch (e) {
        return '';
    }
}

async function httpPost(url, body, extra) {
    try {
        const res = await req(url, {
            method: 'POST',
            headers: headers(extra),
            data: body,
            timeout: 15000
        });
        return res && res.content ? res.content : '';
    } catch (e) {
        return '';
    }
}

async function appToken() {
    await httpGet(API + '/v1/member/app_token');
}

function toVod(it) {
    const title = it.title || it.userNick || it.userId || 'LIVE';
    const pic = it.thumbUrl || it.ivsThumbnail || '';
    const userId = it.userId || '';
    const playId = it.code || userId;
    const remarks = '观众 ' + (it.user || 0) + ' | 点赞 ' + (it.likeCnt || 0);
    return {
        vod_id: playId + '|' + userId + '|' + title,
        vod_name: title,
        vod_pic: pic,
        vod_remarks: remarks,
        style: { type: 'rect', ratio: 1.33 }
    };
}

async function listLive(page, pageSize, orderBy, onlyNew) {
    pageSize = pageSize || 60;
    const offset = page ? Math.max(0, (page - 1) * pageSize) : 0;
    const form =
        'orderBy=' + encodeURIComponent(orderBy || 'user') +
        '&onlyNewBj=' + encodeURIComponent(onlyNew || 'N') +
        '&limit=' + pageSize +
        '&offset=' + offset;
    let text = await httpPost(API + '/v1/live', form, {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
    });
    let j = safeJson(text) || {};
    if (j && Array.isArray(j.list) && j.list.length) return j.list;
    text = await httpGet(API + '/v1/live');
    j = safeJson(text) || {};
    return Array.isArray(j.list) ? j.list : [];
}

function findM3u8(obj) {
    try {
        const text = JSON.stringify(obj);
        const m = text.match(/https?:\/\/[^"\\\s]+\.m3u8[^"\\\s]*/);
        return m ? m[0].replace(/\\u0026/g, '&') : '';
    } catch (e) {
        return '';
    }
}

async function livePlay(playId) {
    const body = JSON.stringify({ play_id: playId, device: 'webPc', player: 'ivs' });
    let text = await httpPost(API + '/v1/live/play', body, {
        'Content-Type': 'application/json',
        Referer: BASE + '/play/' + String(playId).split('_')[0]
    });
    let j = safeJson(text);
    if (!j || !findM3u8(j)) {
        await appToken();
        text = await httpPost(API + '/v1/live/play', body, {
            'Content-Type': 'application/json',
            Referer: BASE + '/play/' + String(playId).split('_')[0]
        });
        j = safeJson(text);
    }
    return j || {};
}

function parseExt(ext) {
    if (!ext) return {};
    if (typeof ext === 'object') return ext;
    try { return JSON.parse(ext); } catch (e) { return {}; }
}

async function init(cfg) {
    try {
        siteKey = cfg.skey;
        siteType = cfg.stype;
        await httpGet(BASE);
        await appToken();
    } catch (e) {}
}

async function home(filter) {
    const classes = [{ type_id: 'live', type_name: 'LIVE', land: 1, ratio: 1.33 }];
    const filters = {
        live: [{
            key: 'sort',
            name: '排序',
            value: [
                { n: '观看次数', v: 'user-N' },
                { n: '热门', v: 'hot-N' },
                { n: '最新', v: 'new-N' },
                { n: '新人', v: 'user-Y' }
            ]
        }]
    };
    return JSON.stringify({ class: classes, filters: filters });
}

async function homeVod() {
    try {
        const items = await listLive(1, 48, 'user', 'N');
        return JSON.stringify({ list: items.slice(0, 48).map(toVod) });
    } catch (e) {
        return JSON.stringify({ list: [] });
    }
}

async function category(tid, pg, filter, ext) {
    pg = Number(pg) || 1;
    try {
        const extend = parseExt(ext);
        let orderBy = 'user';
        let onlyNew = 'N';
        const s = extend.sort;
        if (s && String(s).indexOf('-') >= 0) {
            const ab = String(s).split('-');
            orderBy = ab[0] || 'user';
            onlyNew = ab[1] || 'N';
        }
        const items = await listLive(pg, 24, orderBy, onlyNew);
        return JSON.stringify({
            list: items.map(toVod),
            page: pg,
            pagecount: items.length >= 24 ? pg + 1 : pg,
            limit: 24,
            total: 999999
        });
    } catch (e) {
        return JSON.stringify({ list: [], page: pg, pagecount: 0 });
    }
}

async function search(key, quick, pg) {
    pg = Number(pg) || 1;
    try {
        const items = await listLive(1, 60, 'user', 'N');
        const k = String(key || '').toLowerCase();
        const list = items.filter(it => {
            const t = String(it.title || '').toLowerCase();
            const u = String(it.userId || '').toLowerCase();
            const n = String(it.userNick || '').toLowerCase();
            return t.indexOf(k) >= 0 || u.indexOf(k) >= 0 || n.indexOf(k) >= 0;
        }).map(toVod);
        return JSON.stringify({ list: list, page: 1, pagecount: 1, land: 1, ratio: 1.33 });
    } catch (e) {
        return JSON.stringify({ list: [], page: 1, pagecount: 0, land: 1, ratio: 1.33 });
    }
}

async function detail(vodId) {
    const parts = String(vodId || '').split('|');
    const playId = parts[0] || '';
    const userId = parts[1] || playId.split('_')[0];
    const title = parts[2] || userId || 'LIVE';
    return JSON.stringify({
        list: [{
            vod_id: vodId,
            vod_name: title,
            vod_pic: '',
            vod_remarks: 'PandaLive',
            vod_content: title,
            vod_play_from: 'IVS',
            vod_play_url: '直播$' + vodId
        }]
    });
}

async function play(flag, playId, flags) {
    const header = { 'User-Agent': UA, Referer: BASE + '/', Origin: BASE };
    try {
        const vid = String(playId || '').split('|')[0];
        const j = await livePlay(vid);
        const m3u8 = findM3u8(j);
        if (m3u8) return JSON.stringify({ parse: 0, playUrl: '', url: m3u8, header: header });
        return JSON.stringify({
            parse: 1,
            url: BASE + '/play/' + vid.split('_')[0],
            header: header
        });
    } catch (e) {
        return JSON.stringify({ parse: 1, url: BASE, header: header });
    }
}

export function __jsEvalReturn() {
    return { init, home, homeVod, category, detail, search, play };
}
