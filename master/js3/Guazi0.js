import { Crypto, _ } from 'assets://js/lib/cat.js';

let siteKey = '';
let siteType = 0;

const HOSTS = [
    'https://apinew.uozvr.com',
    'https://api.w32z7vtd.com',
    'https://api.6a7nnf7.com',
    'https://api.umygrx3.com',
    'https://api.rmedphk.com'
];
let hostIndex = 0;
let HOST = HOSTS[0];

const AES_KEY = 'OITxa5OqAYjhswxx';
const AES_IV = 'rCMNwZASNBKZ8mXV';
const DEVICE_OLD_KEY = 'aLFBMWpxBrIDAD1Si/KVvm41';

const PUB_N = BigInt('0xd4339fbfcbcb0fb1691dd7f4504bae17db9f44530c455c51391e503ae4caabc673ecd09aa8491a23483cb9421c2f44e95a0fa4f04501ca318d8e019e929d079426c0a14c414847da94930aecdff31550cc63b2fe894ba39efe3b9c9722464e05660e1079e4469f5ec0f44906158ff4175ecc51e9ec11e44da42f9db20000f8c9');
const PUB_E = BigInt(65537);
const PRI_N = BigInt('0x7ba84aad62e2d734268d34f5a336c4e1074578918dc6e6f195de86ac51b18a6c5f32c301e81a49869713a2e02acb0005a6988a7ad50105b5f062c614d7036beb8f175663e608c0b2e2b63cbdd9621676cc523d3ce8353a67efe85c1756537fdbd46d0337713dc142d14b070a653df08ff702235bec0a6de08f64794aa900f58d');
const PRI_D = BigInt('0x0247fb80b1574ff305570b881087bd200d9b497b1deb726d387f8f6a74635b135eba3800bc006824d47aa7418d688b4a8f653700c7172abccd7f74fa03716bb73912a71657d1669555ebf1585f073719a359d778d757153eed436c9a87fa1db5d731faf44c48625dd6dff99396c377dc00bd87480db94c020fb088a299e4a71d');

let deviceId = '';
let deviceKey = '';
let token = '';
let tokenId = '';
let registered = false;

function parseExt(ext) {
    if (!ext) return {};
    if (typeof ext === 'object') return ext;
    try { return JSON.parse(ext); } catch (e) { return {}; }
}

function safeJson(s) {
    try {
        if (!s) return null;
        if (typeof s === 'object') return s;
        return JSON.parse(s);
    } catch (e) { return null; }
}

function md5u(s) {
    return Crypto.MD5(s).toString().toUpperCase();
}

function aesEnc(text, key, iv) {
    const k = Crypto.enc.Utf8.parse(key);
    const i = Crypto.enc.Utf8.parse(iv);
    const enc = Crypto.AES.encrypt(text, k, { iv: i, mode: Crypto.mode.CBC, padding: Crypto.pad.Pkcs7 });
    return enc.ciphertext.toString(Crypto.enc.Hex).toUpperCase();
}

function aesDec(hex, key, iv) {
    const k = Crypto.enc.Utf8.parse(key);
    const i = Crypto.enc.Utf8.parse(iv);
    const cp = Crypto.lib.CipherParams.create({ ciphertext: Crypto.enc.Hex.parse(hex) });
    const dec = Crypto.AES.decrypt(cp, k, { iv: i, mode: Crypto.mode.CBC, padding: Crypto.pad.Pkcs7 });
    return Crypto.enc.Utf8.stringify(dec);
}

function bytesToBig(bytes) {
    let n = 0n;
    for (let i = 0; i < bytes.length; i++) n = (n << 8n) + BigInt(bytes[i]);
    return n;
}

function bigToBytes(n, len) {
    const out = new Array(len).fill(0);
    let x = n;
    for (let i = len - 1; i >= 0 && x > 0n; i--) {
        out[i] = Number(x & 0xffn);
        x >>= 8n;
    }
    return out;
}

function modPow(b, e, m) {
    let r = 1n;
    b %= m;
    while (e > 0n) {
        if (e & 1n) r = (r * b) % m;
        b = (b * b) % m;
        e >>= 1n;
    }
    return r;
}

function pkcs1Pad(msgBytes, klen) {
    const ps = klen - msgBytes.length - 3;
    if (ps < 8) throw new Error('rsa msg too long');
    const out = [0x00, 0x02];
    for (let i = 0; i < ps; i++) {
        let r = 1 + Math.floor(Math.random() * 255);
        out.push(r);
    }
    out.push(0x00);
    for (let i = 0; i < msgBytes.length; i++) out.push(msgBytes[i]);
    return out;
}

function utf8Bytes(s) {
    const t = unescape(encodeURIComponent(s));
    const a = [];
    for (let i = 0; i < t.length; i++) a.push(t.charCodeAt(i) & 0xff);
    return a;
}

function bytesUtf8(a) {
    let t = '';
    for (let i = 0; i < a.length; i++) t += String.fromCharCode(a[i]);
    try { return decodeURIComponent(escape(t)); } catch (e) { return t; }
}

function rsaEncrypt(text) {
    const msg = utf8Bytes(text);
    const klen = 128;
    const em = pkcs1Pad(msg, klen);
    const c = modPow(bytesToBig(em), PUB_E, PUB_N);
    const cb = bigToBytes(c, klen);
    let bin = '';
    for (let i = 0; i < cb.length; i++) bin += String.fromCharCode(cb[i]);
    return btoa(bin);
}

function rsaDecrypt(b64) {
    let bin = atob(b64);
    const bytes = [];
    for (let i = 0; i < bin.length; i++) bytes.push(bin.charCodeAt(i) & 0xff);
    const m = modPow(bytesToBig(bytes), PRI_D, PRI_N);
    const em = bigToBytes(m, 128);
    let i = 0;
    if (em[0] === 0x00) i = 1;
    if (em[i] !== 0x02) return '';
    i++;
    while (i < em.length && em[i] !== 0x00) i++;
    i++;
    return bytesUtf8(em.slice(i));
}

function formBody(obj) {
    return Object.keys(obj).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(obj[k] == null ? '' : obj[k])).join('&');
}

function headers() {
    return {
        'User-Agent': 'Lavf/57.83.100',
        code: 'GZ0369',
        deviceId: deviceId,
        lang: 'zh_cn',
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/x-www-form-urlencoded',
        Version: '2604028',
        PackageName: 'com.ae06aebdbb.y286327f5a.ofe849883320260517',
        Ver: '3.0.3.2',
        'api-ver': '3.0.3.2',
        Referer: HOST
    };
}

function randHex(n) {
    const c = '0123456789ABCDEF';
    let s = '';
    for (let i = 0; i < n; i++) s += c.charAt(Math.floor(Math.random() * 16));
    return s;
}

async function postHost(path, bodyObj) {
    const url = HOST + path;
    const res = await req(url, {
        method: 'POST',
        headers: headers(),
        data: formBody(bodyObj),
        timeout: 12000
    });
    return safeJson(res && res.content ? res.content : '');
}

async function sendEnc(data, path, isAuth) {
    if (!isAuth) await ensureToken();
    const jsonParams = JSON.stringify(data || {});
    const requestKey = aesEnc(jsonParams, AES_KEY, AES_IV);
    const keys = rsaEncrypt(JSON.stringify({ iv: AES_IV, key: AES_KEY }));
    const t = String(Math.floor(Date.now() / 1000));
    const signStr = 'token_id=,token=' + token + ',phone_type=1,request_key=' + requestKey + ',app_id=1,time=' + t + ',keys=' + keys + '*&zvdvdvddbfikkkumtmdwqppp?|4Y!s!2br';
    const signature = md5u(signStr);
    const body = {
        token: token,
        token_id: '',
        phone_type: '1',
        time: t,
        phone_model: 'xiaomi-25031',
        keys: keys,
        request_key: requestKey,
        signature: signature,
        app_id: '1',
        ad_version: '1'
    };
    const resp = await postHost(path, body);
    if (!resp || !resp.data) return null;
    const encKeys = resp.data.keys || '';
    const encData = resp.data.response_key || '';
    const keyJson = rsaDecrypt(encKeys);
    const ki = safeJson(keyJson) || {};
    const dec = aesDec(encData, ki.key || AES_KEY, ki.iv || AES_IV);
    return safeJson(dec);
}

async function getData(data, path) {
    for (let a = 0; a < 3; a++) {
        for (let i = 0; i < HOSTS.length; i++) {
            HOST = HOSTS[hostIndex];
            try {
                const r = await sendEnc(data, path, false);
                if (r) return r;
            } catch (e) {}
            hostIndex = (hostIndex + 1) % HOSTS.length;
        }
        try { await ensureToken(); } catch (e) {}
        hostIndex = 0;
    }
    return null;
}

async function authReq(path, params) {
    for (let i = 0; i < HOSTS.length; i++) {
        HOST = HOSTS[hostIndex];
        try {
            const r = await sendEnc(params, path, true);
            if (r && r.token) return r;
        } catch (e) {}
        hostIndex = (hostIndex + 1) % HOSTS.length;
    }
    return null;
}

function applyAuth(result) {
    if (!result || !result.token) throw new Error('no token');
    token = result.token;
    if (result.app_user_id) tokenId = result.app_user_id;
}

async function signUp() {
    const r = await authReq('/App/Authentication/Device/signUp', {
        new_key: deviceKey,
        old_key: DEVICE_OLD_KEY,
        phone_type: 1,
        code: ''
    });
    applyAuth(r);
    registered = true;
}

async function refreshToken() {
    const r = await authReq('/App/Authentication/Authenticator/refresh', {});
    applyAuth(r);
}

async function ensureToken() {
    if (token) return;
    if (!registered) await signUp();
    await refreshToken();
}

function areaYearSort() {
    return [
        { key: 'area', name: '地区', value: ['全部|0', '大陆|大陆', '香港|香港', '台湾|台湾', '美国|美国', '韩国|韩国', '日本|日本', '英国|英国', '法国|法国', '泰国|泰国', '印度|印度', '其他|其他'].map(s => ({ n: s.split('|')[0], v: s.split('|')[1] })) },
        { key: 'year', name: '年份', value: ['全部|0', '2026|2026', '2025|2025', '2024|2024', '2023|2023', '2022|2022', '2021|2021', '2020|2020', '2019|2019', '2018|2018', '2017|2017', '2016|2016', '2015|2015', '2014|2014', '2013|2013', '2012|2012', '2011|2011', '2010|2010', '更早|2004'].map(s => ({ n: s.split('|')[0], v: s.split('|')[1] })) },
        { key: 'sort', name: '排序', value: [{ n: '最新', v: 'd_id' }, { n: '最热', v: 'd_hits' }, { n: '推荐', v: 'd_score' }] }
    ];
}

async function init(cfg) {
    try {
        siteKey = cfg.skey;
        siteType = cfg.stype;
        deviceId = String(864150060000000 + Math.floor(Math.random() * 9999));
        deviceKey = randHex(40);
        token = '';
        await ensureToken();
    } catch (e) {}
}

async function home(filter) {
    const classes = [
        { type_id: '1', type_name: '电影', land: 1, ratio: 0.75 },
        { type_id: '2', type_name: '电视剧', land: 1, ratio: 0.75 },
        { type_id: '4', type_name: '动漫', land: 1, ratio: 0.75 },
        { type_id: '3', type_name: '综艺', land: 1, ratio: 0.75 },
        { type_id: '64', type_name: '短剧', land: 1, ratio: 0.75 }
    ];
    const filters = {};
    classes.forEach(c => { filters[c.type_id] = areaYearSort(); });
    return JSON.stringify({ class: classes, filters: filters });
}

async function homeVod() {
    return JSON.stringify({ list: [] });
}

function card(item) {
    const cont = item.vod_continu || 0;
    return {
        vod_id: String(item.vod_id || '') + '/' + cont,
        vod_name: item.vod_name || '',
        vod_pic: item.vod_pic || '',
        vod_remarks: cont == 0 ? '电影' : ('更新至' + cont + '集'),
        style: { type: 'rect', ratio: 0.75 }
    };
}

async function category(tid, pg, filter, ext) {
    pg = Number(pg) || 1;
    const e = parseExt(ext);
    const body = {
        area: e.area || '0',
        year: e.year || '0',
        pageSize: '30',
        sort: e.sort || 'd_id',
        page: String(pg),
        tid: String(tid)
    };
    const data = await getData(body, '/App/IndexList/indexList');
    const list = ((data && data.list) || []).map(card);
    return JSON.stringify({ list: list, page: pg, pagecount: 9999, limit: 30, total: 999999 });
}

async function search(key, quick, pg) {
    pg = Number(pg) || 1;
    const data = await getData({ keywords: key, order_val: '1', page: String(pg) }, '/App/Index/findMoreVod');
    const list = ((data && data.list) || []).map(card);
    return JSON.stringify({ list: list, page: pg, pagecount: 9999, land: 1, ratio: 0.75 });
}

async function detail(vodId) {
    const id = String(vodId || '').split('/')[0];
    const t = String(Math.floor(Date.now() / 1000));
    const qdata = await getData({ token_id: tokenId, vod_id: id, mobile_time: t, token: token }, '/App/IndexPlay/playInfo');
    const jdata = await getData({ vurl_cloud_id: '2', vod_d_id: id }, '/App/Resource/Vurl/show');
    if (!qdata || !qdata.vodInfo) return JSON.stringify({ list: [] });
    const vod = qdata.vodInfo;
    const playList = [];
    const rows = (jdata && jdata.list) || [];
    rows.forEach((item, index) => {
        if (!item.play) return;
        const n = [];
        const p = [];
        Object.keys(item.play).forEach(k => {
            const val = item.play[k];
            if (val && val.param) {
                n.push(k);
                p.push(val.param);
            }
        });
        if (p.length) {
            const name = rows.length !== 1 ? String(index + 1) : (vod.vod_name || '');
            playList.push(name + '$' + p[p.length - 1] + '||' + n.join('@'));
        }
    });
    return JSON.stringify({
        list: [{
            vod_id: id,
            vod_name: vod.vod_name || '',
            vod_pic: vod.vod_pic || '',
            vod_year: vod.vod_year || '',
            vod_area: vod.vod_area || '',
            vod_actor: vod.vod_actor || '',
            vod_director: vod.vod_director || '',
            vod_content: (vod.vod_use_content || '').trim(),
            vod_play_from: '瓜子影视',
            vod_play_url: playList.join('#')
        }]
    });
}

async function play(flag, playId, flags) {
    try {
        const parts = String(playId || '').split('||');
        if (parts.length < 2) return JSON.stringify({ parse: 0, url: '' });
        const params = {};
        parts[0].split('&').forEach(pair => {
            const i = pair.indexOf('=');
            if (i > 0) params[pair.slice(0, i)] = pair.slice(i + 1);
        });
        const resolutions = (parts[1] || '').split('@').filter(Boolean);
        resolutions.sort((a, b) => (Number(b) || 0) - (Number(a) || 0));
        if (resolutions[0]) params.resolution = resolutions[0];
        const data = await getData(params, '/App/Resource/VurlDetail/showOne');
        const url = data && data.url ? data.url : '';
        return JSON.stringify({
            parse: 0,
            playUrl: '',
            url: url,
            header: { 'User-Agent': 'Lavf/57.83.100', Referer: 'http://WJiZxLXA2.com/' }
        });
    } catch (e) {
        return JSON.stringify({ parse: 0, url: '' });
    }
}

export function __jsEvalReturn() {
    return { init, home, homeVod, category, detail, search, play };
}
