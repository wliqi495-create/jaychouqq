import { Crypto, _ } from 'assets://js/lib/cat.js';

let siteKey = '';
let siteType = 0;

const SITE_URL = 'https://www.9g88x.com/';
const DATA_API = 'https://data.7wzx9.com/forward';
const CDN_API = 'https://data.7wzx9.com/getDataInit';
const UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const HEADERS = {
    'Content-Type': 'application/json',
    'User-Agent': UA,
    Origin: SITE_URL.replace(/\/$/, ''),
    Referer: SITE_URL,
    Accept: 'application/json, text/plain, */*'
};

let cdnMap = null;
let categories = null;

function safeJson(s) {
    try {
        if (!s) return null;
        if (typeof s === 'object') return s;
        return JSON.parse(s);
    } catch (e) {
        return null;
    }
}

async function postJson(url, body) {
    try {
        const res = await req(url, {
            method: 'POST',
            headers: HEADERS,
            data: JSON.stringify(body || {}),
            timeout: 20000
        });
        return safeJson(res && res.content ? res.content : '') || {};
    } catch (e) {
        console.error('post error', url, e && e.message);
        return {};
    }
}

async function loadCdn() {
    if (cdnMap) return cdnMap;
    const js = await postJson(CDN_API, { name: 'John', age: 31, city: 'New York' });
    cdnMap = ((js.data || {}).macVodLinkMap) || {};
    return cdnMap;
}

function picUrl(pic, sid) {
    if (!pic) return '';
    if (String(pic).indexOf('http') === 0) return pic;
    const server = (cdnMap || {})[String(sid)] || {};
    const prefix = server.PIC_LINK_1 || '';
    return prefix ? prefix + pic : pic;
}

function playUrl(url, sid) {
    if (!url) return '';
    if (String(url).indexOf('http') === 0) return url;
    const server = (cdnMap || {})[String(sid)] || {};
    const prefix = server.LINK_1 || '';
    return prefix ? prefix + url : url;
}

function card(item) {
    const sid = item.vod_server_id || '';
    const pic = item.vod_pic || item.art_pic || '';
    return {
        vod_id: String(item.id || ''),
        vod_name: item.vod_name || item.art_name || '',
        vod_pic: picUrl(pic, sid),
        vod_remarks: item.vod_class || item.art_class || '',
        style: { type: 'rect', ratio: 1.33 }
    };
}

async function loadCats() {
    if (categories) return categories;
    const js = await postJson(DATA_API, { command: 'WEB_GET_ALL', languageType: 'CN', content: '' });
    const raw = ((js.data || {}).resultList) || [];
    categories = [];
    raw.forEach(cat => {
        const tList = cat.t_list || [];
        if (!tList.length) return;
        categories.push({
            type_id: String(cat.type_id || ''),
            type_name: cat.t_Name || '',
            type_mid: String(cat.type_Mid || '1'),
            t_type: cat.t_type || ''
        });
    });
    return categories;
}

async function getDetail(id, mid) {
    const js = await postJson(DATA_API, {
        command: 'WEB_GET_INFO_DETAIL',
        languageType: 'CN',
        content: '',
        id: String(id),
        type_Mid: String(mid || '1')
    });
    return ((js.data || {}).result) || {};
}

async function detectDetail(id) {
    let d = await getDetail(id, '1');
    if (d && (d.vod_name || d.vod_url)) return { mid: '1', detail: d };
    d = await getDetail(id, '2');
    if (d && (d.art_name || d.art_url || d.art_pic)) return { mid: '2', detail: d };
    return { mid: '1', detail: d || {} };
}

async function init(cfg) {
    try {
        siteKey = cfg.skey;
        siteType = cfg.stype;
        await loadCdn();
        await loadCats();
    } catch (e) {}
}

async function home(filter) {
    try {
        await loadCdn();
        const js = await postJson(DATA_API, { command: 'WEB_GET_ALL', languageType: 'CN', content: '' });
        const raw = ((js.data || {}).resultList) || [];
        const classes = [];
        categories = [];
        raw.forEach(cat => {
            const tList = cat.t_list || [];
            if (!tList.length) return;
            const item = {
                type_id: String(cat.type_id || ''),
                type_name: cat.t_Name || '',
                type_mid: String(cat.type_Mid || '1'),
                t_type: cat.t_type || ''
            };
            categories.push(item);
            classes.push({ type_id: item.type_id, type_name: item.type_name, land: 1, ratio: 1.33 });
        });
        return JSON.stringify({ class: classes, filters: {} });
    } catch (e) {
        return JSON.stringify({ class: [], filters: {} });
    }
}

async function homeVod() {
    try {
        await loadCdn();
        const js = await postJson(DATA_API, { command: 'WEB_GET_ALL', languageType: 'CN', content: '' });
        const raw = ((js.data || {}).resultList) || [];
        const list = [];
        raw.forEach(cat => {
            if (cat.t_type !== 'M_VOIDE') return;
            (cat.t_list || []).forEach(v => list.push(card(v)));
        });
        return JSON.stringify({ list: list.slice(0, 30) });
    } catch (e) {
        return JSON.stringify({ list: [] });
    }
}

async function category(tid, pg, filter, ext) {
    pg = Number(pg) || 1;
    try {
        await loadCdn();
        const cats = await loadCats();
        let mid = '1';
        for (let i = 0; i < cats.length; i++) {
            if (cats[i].type_id === String(tid)) {
                mid = cats[i].type_mid || '1';
                break;
            }
        }
        const js = await postJson(DATA_API, {
            command: 'WEB_GET_INFO',
            pageNumber: pg,
            RecordsPage: 30,
            typeId: String(tid),
            typeMid: mid,
            languageType: 'CN',
            content: ''
        });
        const data = js.data || {};
        const list = (data.resultList || []).map(card);
        return JSON.stringify({
            list: list,
            page: pg,
            pagecount: Number(data.pageAllNumber) || pg + 1,
            limit: 30,
            total: Number(data.count) || 99999
        });
    } catch (e) {
        return JSON.stringify({ list: [], page: pg, pagecount: 0 });
    }
}

async function search(key, quick, pg) {
    pg = Number(pg) || 1;
    try {
        await loadCdn();
        const js = await postJson(DATA_API, {
            command: 'WEB_GET_INFO',
            pageNumber: pg,
            RecordsPage: 30,
            typeId: '0',
            typeMid: '1',
            languageType: 'CN',
            content: key,
            type: '1'
        });
        const data = js.data || {};
        const list = (data.resultList || []).map(card);
        return JSON.stringify({
            list: list,
            page: pg,
            pagecount: Number(data.pageAllNumber) || 1,
            land: 1,
            ratio: 1.33
        });
    } catch (e) {
        return JSON.stringify({ list: [], page: pg, pagecount: 0, land: 1, ratio: 1.33 });
    }
}

async function detail(vodId) {
    try {
        await loadCdn();
        const found = await detectDetail(vodId);
        const d = found.detail || {};
        if (found.mid === '1') {
            const sid = d.vod_server_id || '';
            const url = playUrl(d.vod_url || '', sid);
            return JSON.stringify({
                list: [{
                    vod_id: String(vodId),
                    vod_name: d.vod_name || '',
                    vod_pic: picUrl(d.vod_pic || '', sid),
                    vod_year: d.vod_year || '',
                    vod_area: d.vod_area || '',
                    vod_remarks: d.vod_remarks || '',
                    vod_actor: d.vod_actor || '',
                    vod_director: d.vod_director || '',
                    vod_content: d.vod_content || d.typeName || '',
                    vod_play_from: '9g88x',
                    vod_play_url: url ? ('正片$' + url) : ''
                }]
            });
        }
        const artUrl = d.art_url || '';
        const imgs = [];
        const re = /<img[^>]+src="([^"]+)"/gi;
        let m;
        while ((m = re.exec(artUrl))) imgs.push(m[1]);
        const play = imgs.map((u, i) => '图片' + (i + 1) + '$' + u).join('#');
        return JSON.stringify({
            list: [{
                vod_id: String(vodId),
                vod_name: d.art_name || '',
                vod_pic: d.art_pic || '',
                vod_content: d.art_class || '',
                vod_play_from: play ? '9g88x' : '',
                vod_play_url: play
            }]
        });
    } catch (e) {
        return JSON.stringify({ list: [] });
    }
}

async function play(flag, playId, flags) {
    const header = { 'User-Agent': UA, Referer: SITE_URL };
    let url = String(playId || '');
    try {
        if (url.indexOf('http') !== 0) {
            await loadCdn();
            const found = await detectDetail(url);
            const d = found.detail || {};
            if (found.mid === '1') url = playUrl(d.vod_url || '', d.vod_server_id || '');
            else url = d.art_pic || url;
        }
        return JSON.stringify({ parse: 0, playUrl: '', url: url, header: header });
    } catch (e) {
        return JSON.stringify({ parse: 0, url: playId, header: header });
    }
}

export function __jsEvalReturn() {
    return { init, home, homeVod, category, detail, search, play };
}
