import { Crypto, _ } from 'assets://js/lib/cat.js';

let siteKey = '';
let siteType = 0;

const HOSTS = [
    'https://323433ssdfd.top',
    'https://duoduosdf12223234334.top',
    'https://xds2435u23422342342u.top',
    'https://dduotv01.top'
];
let HOST = HOSTS[0];

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36';
const F = 'WF-2c064bc5b3400788f31b848849bc3a60f835423ba2dfe69d7ea93974c216e4f2';
const SK = 'WEB-50a8e9c84a1dc05669a692ded99a2dac46527229e607a7be15db88dbc59059d1';
const ID = 'com.web.player';
const W = 'ddtvf65f3a83d6d9ad6f';
const XC = '8f3d2a1c7b6e5d4c9a0b1f2e3d4c5b6a';

const CATEGORIES = [
    { type_id: '1', type_name: '电影' },
    { type_id: '2', type_name: '剧集' },
    { type_id: '3', type_name: '动漫' },
    { type_id: '4', type_name: '综艺' }
];

function apiHeaders(extra) {
    return Object.assign({
        'User-Agent': UA,
        'web-sign': W,
        'X-Client': XC,
        Accept: 'application/json, text/plain, */*'
    }, extra || {});
}

function safeJson(s) {
    try {
        if (!s) return null;
        if (typeof s === 'object') return s;
        return JSON.parse(s);
    } catch (e) {
        return null;
    }
}

function utf8Bytes(str) {
    const s = unescape(encodeURIComponent(String(str || '')));
    const out = [];
    for (let i = 0; i < s.length; i++) out.push(s.charCodeAt(i) & 0xff);
    return out;
}

function bytesToBin(arr) {
    let s = '';
    for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i] & 0xff);
    return s;
}

function vint(n) {
    const out = [];
    n = n >>> 0;
    while (true) {
        let b = n & 0x7f;
        n = n >>> 7;
        if (n) out.push(b | 0x80);
        else {
            out.push(b);
            break;
        }
    }
    return out;
}

function sha256upper(s) {
    return Crypto.SHA256(s).toString(Crypto.enc.Hex).toUpperCase();
}

function buildPb(url, vf, ts) {
    const nonce = '0'.repeat(32);
    const raw = 'finger=' + F + '&id=' + ID + '&nonce=' + nonce + '&sk=' + SK + '&time=' + ts + '&v=1';
    const sig = sha256upper(raw);
    const urlB = utf8Bytes(url);
    const vfB = utf8Bytes(vf);
    const sigB = utf8Bytes(sig);
    const idB = utf8Bytes(ID);
    const nonceB = utf8Bytes(nonce);
    const out = [];
    out.push(0x0a); out.push.apply(out, vint(urlB.length)); out.push.apply(out, urlB);
    out.push(0x12); out.push.apply(out, vint(vfB.length)); out.push.apply(out, vfB);
    out.push(0x18); out.push.apply(out, vint(ts));
    out.push(0x22); out.push.apply(out, vint(32)); out.push.apply(out, nonceB);
    out.push(0x2a); out.push.apply(out, vint(64)); out.push.apply(out, sigB);
    out.push(0x32); out.push.apply(out, vint(idB.length)); out.push.apply(out, idB);
    out.push(0x38, 0x01);
    return bytesToBin(out);
}

function parsePb(bin) {
    const b = [];
    const s = String(bin || '');
    for (let i = 0; i < s.length; i++) b.push(s.charCodeAt(i) & 0xff);
    const fields = {};
    let i = 0;
    function readVarint() {
        let v = 0, sh = 0;
        while (i < b.length) {
            const x = b[i++];
            v += (x & 0x7f) * Math.pow(2, sh);
            if (!(x & 0x80)) break;
            sh += 7;
        }
        return v;
    }
    function readStr(ln) {
        let t = '';
        for (let k = 0; k < ln && i < b.length; k++) t += String.fromCharCode(b[i++]);
        try { return decodeURIComponent(escape(t)); } catch (e) { return t; }
    }
    while (i < b.length) {
        const tag = b[i++];
        const f = tag >> 3;
        const w = tag & 7;
        if (w === 0) fields[f] = readVarint();
        else if (w === 2) {
            const ln = readVarint();
            fields[f] = readStr(ln);
        } else if (w === 5) i += 4;
        else break;
    }
    return fields;
}

async function rawReq(url, opt) {
    const res = await req(url, opt);
    return res && (res.content != null) ? res.content : '';
}

async function fetchAny(path, opt) {
    const o = opt || {};
    const method = o.method || 'GET';
    const hosts = [HOST].concat(HOSTS.filter(h => h !== HOST));
    for (let i = 0; i < hosts.length; i++) {
        const host = hosts[i];
        const url = host + path;
        try {
            const res = await rawReq(url, {
                method: method,
                headers: o.headers || apiHeaders(),
                data: o.data,
                timeout: 8000
            });
            if (res) {
                HOST = host;
                return res;
            }
        } catch (e) {}
    }
    return '';
}

async function getApi(path) {
    const text = await fetchAny(path, { method: 'GET', headers: apiHeaders() });
    return safeJson(text) || {};
}

function card(v) {
    return {
        vod_id: v.vod_id,
        vod_name: v.vod_name || '',
        vod_pic: v.vod_pic || '',
        vod_remarks: v.vod_remarks || '',
        style: { type: 'rect', ratio: 0.75 }
    };
}

async function init(cfg) {
    try { siteKey = cfg.skey; siteType = cfg.stype; } catch (e) {}
}

async function home(filter) {
    try {
        const j = await getApi('/api.php/web/index/home');
        const d = j.data || {};
        const classes = [];
        (d.categories || []).forEach(c => {
            classes.push({ type_id: String(c.type_id), type_name: c.type_name, land: 1, ratio: 0.75 });
        });
        if (!classes.length) {
            CATEGORIES.forEach(c => classes.push({ type_id: c.type_id, type_name: c.type_name, land: 1, ratio: 0.75 }));
        }
        return JSON.stringify({ class: classes, filters: {} });
    } catch (e) {
        return JSON.stringify({ class: CATEGORIES, filters: {} });
    }
}

async function homeVod() {
    const j = await getApi('/api.php/web/index/home');
    const d = j.data || {};
    const list = [];
    (d.categories || []).forEach(c => {
        (c.videos || []).forEach(v => list.push(card(v)));
    });
    return JSON.stringify({ list: list.slice(0, 24) });
}

async function category(tid, pg, filter, ext) {
    pg = Number(pg) || 1;
    const name = (CATEGORIES.find(c => c.type_id === String(tid)) || { type_name: '电影' }).type_name;
    const j = await getApi('/api.php/web/filter/vod?type_name=' + encodeURIComponent(name) + '&page=' + pg + '&sort=hits');
    const data = Array.isArray(j.data) ? j.data : [];
    return JSON.stringify({
        list: data.map(card),
        page: pg,
        pagecount: 9999,
        limit: 18,
        total: 9999
    });
}

async function search(key, quick, pg) {
    pg = Number(pg) || 1;
    const j = await getApi('/api.php/web/search/index?wd=' + encodeURIComponent(key) + '&page=' + pg + '&limit=15');
    const data = Array.isArray(j.data) ? j.data : [];
    return JSON.stringify({ list: data.map(card), page: pg, pagecount: pg + 1, land: 1, ratio: 0.75 });
}

async function detail(vodId) {
    const j = await getApi('/api.php/web/vod/get_detail?vod_id=' + encodeURIComponent(vodId));
    const arr = j.data || [];
    const d = Array.isArray(arr) ? arr[0] : arr;
    if (!d) return JSON.stringify({ list: [] });
    return JSON.stringify({
        list: [{
            vod_id: d.vod_id,
            vod_name: d.vod_name || '',
            vod_pic: d.vod_pic || '',
            vod_year: d.vod_year || '',
            vod_area: d.vod_area || '',
            vod_remarks: d.vod_remarks || '',
            vod_actor: d.vod_actor || '',
            vod_director: d.vod_director || '',
            vod_content: d.vod_content || '',
            vod_play_from: d.vod_play_from || '',
            vod_play_url: d.vod_play_url || ''
        }]
    });
}

async function play(flag, playId, flags) {
    try {
        const ts = Date.now();
        const body = buildPb(playId, flag || '', ts);
        const text = await fetchAny('/api.php/web/decode/url', {
            method: 'POST',
            headers: apiHeaders({
                'Content-Type': 'application/x-protobuf',
                Accept: 'application/x-protobuf'
            }),
            data: body
        });
        const fields = parsePb(text);
        if (fields[1] === 1 && fields[3]) {
            return JSON.stringify({ parse: 0, url: fields[3] });
        }
    } catch (e) {}
    return JSON.stringify({ parse: 1, url: playId, header: { 'User-Agent': UA } });
}

export function __jsEvalReturn() {
    return { init, home, homeVod, category, detail, search, play };
}
