import { Crypto, _ } from 'assets://js/lib/cat.js';

let siteKey = '';
let siteType = 0;

const API = 'https://spiderscloudcn2.51111666.com';
const UA = 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.87 Safari/537.36';

const DEFAULT_HEADERS = {
    'User-Agent': UA,
    'Content-Type': 'application/json',
    Accept: 'application/json, text/plain, */*'
};

let linkMap = null;

async function postJson(path, body) {
    try {
        const res = await req(API + path, {
            method: 'POST',
            headers: DEFAULT_HEADERS,
            data: JSON.stringify(body || {}),
            timeout: 20000
        });
        const text = (res && res.content) ? res.content : '';
        try { return JSON.parse(text); } catch (e) { return {}; }
    } catch (e) {
        console.error('post error', path, e && e.message);
        return {};
    }
}

function cleanName(name) {
    let s = String(name || '').replace(/yy8ycom/g, '');
    s = s.replace(/(.*?)-(.*?)-\d+\s+/, '');
    return s.trim() || String(name || '');
}

function card(item) {
    const id = item.id;
    const sid = item.vod_server_id;
    return {
        vod_id: String(id) + '#' + String(sid == null ? '' : sid),
        vod_name: cleanName(item.vod_name),
        vod_pic: item.vod_pic || '',
        vod_remarks: item.vod_remarks || '',
        style: { type: 'rect', ratio: 1.33 }
    };
}

async function loadLinkMap() {
    if (linkMap) return linkMap;
    const js = await postJson('/getDataInit', { name: 'John', age: 31, city: 'New York' });
    linkMap = ((js.data || {}).macVodLinkMap) || {};
    return linkMap;
}

async function init(cfg) {
    try {
        siteKey = cfg.skey;
        siteType = cfg.stype;
        await loadLinkMap();
    } catch (e) {
        console.error('init error', e.message);
    }
}

async function home(filter) {
    try {
        const js = await postJson('/getDataInit', { name: 'John', age: 31, city: 'New York' });
        const menu = ((js.data || {}).menu0ListMap) || [];
        const classes = [];
        const allow = { '传媒': 1, '视频': 1, '电影': 1 };
        for (const item of menu) {
            if (!allow[item.typeName]) continue;
            const list2 = item.menu2List || [];
            for (const sub of list2) {
                if (!sub.typeId2) continue;
                classes.push({
                    type_id: String(sub.typeId2),
                    type_name: sub.typeName2 || String(sub.typeId2),
                    land: 1,
                    ratio: 1.33
                });
            }
        }
        linkMap = ((js.data || {}).macVodLinkMap) || linkMap;
        return JSON.stringify({ class: classes, filters: {} });
    } catch (e) {
        console.error('home error', e.message);
        return JSON.stringify({ class: [], filters: {} });
    }
}

async function fetchList(typeId, page, content) {
    const js = await postJson('/forward', {
        command: 'WEB_GET_INFO',
        pageNumber: Number(page) || 1,
        RecordsPage: 20,
        typeId: String(typeId || '0'),
        typeMid: '1',
        languageType: 'CN',
        content: content || '',
        type: content ? '1' : undefined
    });
    const rows = (((js.data || {}).resultList) || []);
    return rows.map(card);
}

async function homeVod() {
    try {
        const list = await fetchList('24', 1, '');
        return JSON.stringify({ list: list.slice(0, 20) });
    } catch (e) {
        return JSON.stringify({ list: [] });
    }
}

async function category(tid, pg, filter, ext) {
    pg = Number(pg) || 1;
    try {
        const list = await fetchList(tid, pg, '');
        return JSON.stringify({
            list: list,
            page: pg,
            pagecount: 9999,
            limit: 20,
            total: 999999
        });
    } catch (e) {
        return JSON.stringify({ list: [], page: pg, pagecount: 0 });
    }
}

async function search(key, quick, pg) {
    pg = Number(pg) || 1;
    try {
        const list = await fetchList('0', pg, key);
        return JSON.stringify({ list: list, page: pg, pagecount: 9999, land: 1, ratio: 1.33 });
    } catch (e) {
        return JSON.stringify({ list: [], page: pg, pagecount: 0, land: 1, ratio: 1.33 });
    }
}

async function detail(vodId) {
    try {
        const parts = String(vodId || '').split('#');
        const cid = parts[0];
        const svid = parts[1] || '';
        const js = await postJson('/forward', {
            command: 'WEB_GET_INFO_DETAIL',
            type_Mid: '1',
            id: cid,
            languageType: 'CN'
        });
        const row = ((js.data || {}).result) || {};
        const map = await loadLinkMap();
        let purl = row.vod_url || '';
        if (svid && map[svid] && map[svid].LINK_2) {
            purl = String(map[svid].LINK_2) + String(row.vod_url || '');
        }
        return JSON.stringify({
            list: [{
                vod_id: vodId,
                vod_name: cleanName(row.vod_name),
                vod_pic: row.vod_pic || '',
                vod_content: row.vod_content || '',
                vod_play_from: '直链播放',
                vod_play_url: '播放$' + purl
            }]
        });
    } catch (e) {
        console.error('detail error', e.message);
        return JSON.stringify({ list: [] });
    }
}

async function play(flag, playId, flags) {
    return JSON.stringify({
        parse: 0,
        playUrl: '',
        url: playId,
        header: { 'User-Agent': UA }
    });
}

export function __jsEvalReturn() {
    return { init, home, homeVod, category, detail, search, play };
}
