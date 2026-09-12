import { Crypto, _ } from 'assets://js/lib/cat.js';

let siteKey = '';
let siteType = 0;

const HS = ['wcyfhknomg', 'pdcqllfomw', 'alxhzjvean', 'bqeaaxzplt', 'hfbtpixjso'];
const UA =
    'Mozilla/5.0 (Linux; Android 11; M2012K10C Build/RP1A.200720.011; wv) ' +
    'AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/87.0.4280.141 ' +
    'Mobile Safari/537.36;SuiRui/twitter/ver=1.4.4';
const AES_KEY_B64 = 'SmhiR2NpT2lKSVV6STFOaQ==';

let did = '';
let token = '';
let phost = '';
let host = '';

function md5(text) {
    return Crypto.MD5(String(text)).toString();
}

function randomString(len) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let s = '';
    for (let i = 0; i < len; i++) {
        s += chars[Math.floor(Math.random() * chars.length)];
    }
    return s;
}

function getDid() {
    if (did) return did;
    did = md5(String(Date.now()) + String(Math.floor(Math.random() * 9000 + 1000)));
    return did;
}

function getSign() {
    const t = String(Date.now());
    return { sign: md5(t), t: t };
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

function aesDecrypt(word) {
    try {
        if (!word) return {};
        if (typeof word === 'object') return word;
        const raw = String(word).replace(/['"]/g, '').trim();
        const key = Crypto.enc.Base64.parse(AES_KEY_B64);
        let decrypted;
        try {
            decrypted = Crypto.AES.decrypt(raw, key, {
                iv: key,
                mode: Crypto.mode.CBC,
                padding: Crypto.pad.Pkcs7
            });
        } catch (e) {
            const cipherParams = Crypto.lib.CipherParams.create({
                ciphertext: Crypto.enc.Base64.parse(raw)
            });
            decrypted = Crypto.AES.decrypt(cipherParams, key, {
                iv: key,
                mode: Crypto.mode.CBC,
                padding: Crypto.pad.Pkcs7
            });
        }
        const str = decrypted.toString(Crypto.enc.Utf8);
        if (!str) return {};
        return JSON.parse(str);
    } catch (e) {
        console.error('aes decrypt error', e.message);
        return {};
    }
}

async function request(url, optHeaders = {}, method = 'GET', body = null) {
    try {
        const headers = Object.assign(
            { 'User-Agent': UA, Accept: 'application/json' },
            optHeaders
        );
        const opts = { method, headers, timeout: 15000 };
        if (body && method === 'POST') {
            const payload = typeof body === 'string' ? body : JSON.stringify(body);
            opts.data = payload;
            opts.body = payload;
            headers['Content-Type'] = 'application/json';
        }
        const res = await req(url, opts);
        if (res && typeof res === 'object') {
            if (res.content) return res.content;
            if (res.data) {
                return typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
            }
        }
        return typeof res === 'string' ? res : '';
    } catch (e) {
        console.error('request error:', url, e?.message);
        return '';
    }
}

function headers() {
    const { sign, t } = getSign();
    return {
        'User-Agent': UA,
        Accept: 'application/json',
        deviceid: getDid(),
        t,
        s: sign,
        aut: token || ''
    };
}

async function tryLine(domain) {
    try {
        const { sign, t } = getSign();
        const h = {
            'User-Agent': UA,
            Accept: 'application/json',
            deviceid: getDid(),
            t,
            s: sign
        };
        const body = {
            deviceId: getDid(),
            tt: 'U',
            code: '##X-4m6Goo4zzPi1hF##',
            chCode: 'tt09'
        };
        const resp = await request(domain + '/api/user/traveler', h, 'POST', body);
        const j = safeJson(resp);
        const data1 = (j && j.data) || {};
        if (data1.token && data1.imgDomain) {
            return {
                ok: true,
                token: data1.token,
                imgDomain: data1.imgDomain,
                domain
            };
        }
    } catch (e) {}
    return { ok: false };
}

async function getToken() {
    for (let i = 0; i < HS.length; i++) {
        const rand = randomString(Math.floor(Math.random() * 6) + 5);
        const domain = `https://${rand}.${HS[i]}.work`;
        const r = await tryLine(domain);
        if (r.ok) {
            token = r.token;
            phost = r.imgDomain;
            host = r.domain;
            return true;
        }
    }
    return false;
}

async function ensureHost() {
    if (host && token) return true;
    return await getToken();
}

function dtim(seconds) {
    try {
        seconds = parseInt(seconds, 10);
        const hours = Math.floor(seconds / 3600);
        const remaining = seconds % 3600;
        const minutes = Math.floor(remaining / 60);
        const secs = remaining % 60;
        const mm = String(minutes).padStart(2, '0');
        const ss = String(secs).padStart(2, '0');
        if (hours > 0) {
            return String(hours).padStart(2, '0') + ':' + mm + ':' + ss;
        }
        return mm + ':' + ss;
    } catch (e) {
        return '666';
    }
}

function picUrl(cover) {
    if (!cover) return '';
    if (String(cover).startsWith('http')) return cover;
    return (phost || '') + cover;
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

async function apiEnc(path) {
    const ok = await ensureHost();
    if (!ok) return {};
    const url = path.startsWith('http') ? path : host + path;
    const resp = await request(url, headers());
    const j = safeJson(resp);
    if (!j) return {};
    if (j.encData) return aesDecrypt(j.encData);
    return j;
}

function unwrapWatch(data) {
    if (!data || typeof data !== 'object') return {};
    if (data.data && typeof data.data === 'object') {
        return Object.assign({}, data, data.data);
    }
    return data;
}

function buildPlayUrl(data) {
    data = unwrapWatch(data);
    const ak = data.authKey || data.auth_key || '';
    const vu = data.videoUrl || data.video_url || data.path || '';
    const playPath = data.playPath || data.play_path || data.url || '';

    if (ak && vu && host) {
        return (
            host +
            '/api/m3u8/decode/authPath?auth_key=' +
            encodeURIComponent(ak) +
            '&path=' +
            encodeURIComponent(vu)
        );
    }
    if (playPath) {
        if (playPath.startsWith('http')) return playPath;
        if (playPath.startsWith('/')) return host + playPath;
        return host + '/' + playPath;
    }
    if (vu) {
        if (String(vu).startsWith('http')) return vu;
        if (String(vu).startsWith('/')) return host + vu;
        return host + '/' + vu;
    }
    return '';
}

async function init(cfg) {
    try {
        siteKey = cfg.skey;
        siteType = cfg.stype;
        getDid();
        await getToken();
    } catch (e) {
        console.error('init error', e.message);
    }
}

async function home(filter) {
    try {
        const data1 = await apiEnc('/api/video/classifyList');
        const classes = [{ type_name: '精选', type_id: 'jx', land: 1, ratio: 1.33 }];
        const arr = (data1 && data1.data) || [];
        for (const k of arr) {
            if (k.classifyId && k.classifyTitle) {
                classes.push({
                    type_name: k.classifyTitle,
                    type_id: String(k.classifyId),
                    land: 1,
                    ratio: 1.33
                });
            }
        }

        const sort = [
            {
                key: 'fl',
                name: '分类',
                value: [
                    { n: '最近更新', v: '1' },
                    { n: '最多播放', v: '2' },
                    { n: '好评榜', v: '3' }
                ]
            }
        ];
        const filters = {
            '1': sort,
            '2': sort,
            '3': sort,
            '4': sort,
            '5': sort,
            '6': sort,
            '7': sort,
            jx: [
                {
                    key: 'type',
                    name: '精选',
                    value: [
                        { n: '日榜', v: '1' },
                        { n: '周榜', v: '2' },
                        { n: '月榜', v: '3' },
                        { n: '总榜', v: '4' }
                    ]
                }
            ]
        };

        for (const c of classes) {
            if (c.type_id !== 'jx' && !filters[c.type_id]) {
                filters[c.type_id] = sort;
            }
        }

        return JSON.stringify({ class: classes, filters });
    } catch (e) {
        console.error('home error', e.message);
        return JSON.stringify({ class: [], filters: {} });
    }
}

async function homeVod() {
    try {
        const data1 = await apiEnc('/api/video/getRankVideos?pageSize=20&page=1&type=1');
        const arr = (data1 && data1.data) || [];
        const list = [];
        for (const k of arr) {
            const cover = Array.isArray(k.coverImg) ? k.coverImg[0] : k.coverImg || '';
            list.push({
                vod_id: `${k.videoId}?${k.userId}?${encodeURIComponent(k.nickName || '')}`,
                vod_name: k.title || '',
                vod_pic: picUrl(cover),
                vod_remarks: dtim(k.playTime),
                style: { type: 'rect', ratio: 1.33 }
            });
        }
        return JSON.stringify({ list: list.slice(0, 20) });
    } catch (e) {
        console.error('homeVod error', e.message);
        return JSON.stringify({ list: [] });
    }
}

async function category(tid, pg, filter, ext) {
    pg = Number(pg) || 1;
    const extend = parseExt(ext);
    try {
        let path = `/api/video/queryVideoByClassifyId?pageSize=20&page=${pg}&classifyId=${tid}&sortType=${extend.fl || '1'}`;
        if (String(tid).includes('click')) {
            path = `/api/video/queryPersonVideoByType?pageSize=20&page=${pg}&userId=${String(tid).replace('click', '')}`;
        }
        if (tid === 'jx') {
            path = `/api/video/getRankVideos?pageSize=20&page=${pg}&type=${extend.type || '1'}`;
        }

        const data1 = await apiEnc(path);
        const arr = (data1 && data1.data) || [];
        const list = [];
        for (const k of arr) {
            let id = `${k.videoId}?${k.userId}?${encodeURIComponent(k.nickName || '')}`;
            if (String(tid).includes('click')) id += 'click';
            const cover = Array.isArray(k.coverImg) ? k.coverImg[0] : k.coverImg || '';
            list.push({
                vod_id: id,
                vod_name: k.title || '',
                vod_pic: picUrl(cover),
                vod_remarks: dtim(k.playTime),
                style: { type: 'rect', ratio: 1.33 }
            });
        }

        return JSON.stringify({
            list,
            page: pg,
            pagecount: 9999,
            limit: 90,
            total: 999999
        });
    } catch (e) {
        console.error('category error', e.message);
        return JSON.stringify({ list: [], page: pg, pagecount: 0 });
    }
}

async function search(key, quick, pg) {
    pg = Number(pg) || 1;
    try {
        const path = `/api/search/keyWord?pageSize=20&page=${pg}&searchWord=${encodeURIComponent(key)}&searchType=1`;
        const data1 = await apiEnc(path);
        const arr = (data1 && data1.videoList) || [];
        const list = [];
        for (const k of arr) {
            const cover = Array.isArray(k.coverImg) ? k.coverImg[0] : k.coverImg || '';
            list.push({
                vod_id: `${k.videoId}?${k.userId}?${encodeURIComponent(k.nickName || '')}`,
                vod_name: k.title || '',
                vod_pic: picUrl(cover),
                vod_remarks: dtim(k.playTime),
                style: { type: 'rect', ratio: 1.33 }
            });
        }
        return JSON.stringify({
            list,
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
        const raw = String(vodId || '');
        const vid = raw.replace(/click$/i, '').split('?');
        const videoId = vid[0] || '';
        let nickName = vid[2] || '推特';
        try {
            nickName = decodeURIComponent(nickName);
        } catch (e) {}

        const data1 = await apiEnc('/api/video/can/watch?videoId=' + encodeURIComponent(videoId));
        const playUrl = buildPlayUrl(data1);

        const vod = {
            vod_id: raw,
            vod_name: nickName,
            vod_pic: '',
            vod_director: nickName,
            vod_content: nickName,
            vod_play_from: '推特',
            vod_play_url: nickName + '$' + (playUrl || videoId)
        };

        return JSON.stringify({ list: [vod] });
    } catch (e) {
        console.error('detail error', e.message);
        return JSON.stringify({ list: [] });
    }
}

async function play(flag, playId, flags) {
    try {
        await ensureHost();
        let url = String(playId || '');

        // 已是完整播放地址
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return JSON.stringify({
                parse: 0,
                url,
                header: headers()
            });
        }

        // 传入的是 videoId，再请求一次 watch
        const videoId = url.split('?')[0];
        const data1 = await apiEnc('/api/video/can/watch?videoId=' + encodeURIComponent(videoId));
        url = buildPlayUrl(data1);

        if (!url) {
            return JSON.stringify({
                parse: 0,
                url: '',
                header: headers(),
                msg: '未获取到播放地址'
            });
        }

        return JSON.stringify({
            parse: 0,
            url,
            header: headers()
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
