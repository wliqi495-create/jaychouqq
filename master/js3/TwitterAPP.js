import { Crypto, _ } from 'assets://js/lib/cat.js';

let siteKey = '';
let siteType = 0;

// 动态域名后缀池
const HS = ['wcyfhknomg', 'pdcqllfomw', 'alxhzjvean', 'bqeaaxzplt', 'hfbtpixjso'];
const UA =
    'Mozilla/5.0 (Linux; Android 11; M2012K10C Build/RP1A.200720.011; wv) ' +
    'AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/87.0.4280.141 ' +
    'Mobile Safari/537.36;SuiRui/twitter/ver=1.4.4';

// AES 密钥（与原版一致）
const AES_KEY_B64 = 'SmhiR2NpT2lKSVV6STFOaQ==';

let did = '';
let token = '';
let phost = '';
let host = '';
const apiCache = {};

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

function aesDecrypt(word) {
    try {
        if (!word) return {};
        const key = Crypto.enc.Base64.parse(AES_KEY_B64);
        const iv = key;
        const decrypted = Crypto.AES.decrypt(word, key, {
            iv: iv,
            mode: Crypto.mode.CBC,
            padding: Crypto.pad.Pkcs7
        });
        const str = decrypted.toString(Crypto.enc.Utf8);
        return JSON.parse(str);
    } catch (e) {
        console.error('aes decrypt error', e.message);
        return {};
    }
}

async function request(url, optHeaders = {}, method = 'GET', body = null) {
    try {
        const headers = Object.assign(
            {
                'User-Agent': UA,
                'Accept': 'application/json'
            },
            optHeaders
        );
        const opts = {
            method: method,
            headers: headers,
            timeout: 12000
        };
        if (body && method === 'POST') {
            opts.body = typeof body === 'string' ? body : JSON.stringify(body);
            headers['Content-Type'] = 'application/json';
        }
        const res = await req(url, opts);
        return res?.content ?? '';
    } catch (e) {
        console.error('request error:', url, e?.message);
        return '';
    }
}

function headers() {
    const { sign, t } = getSign();
    return {
        'User-Agent': UA,
        'deviceid': getDid(),
        't': t,
        's': sign,
        'aut': token || ''
    };
}

async function tryLine(domain) {
    try {
        const { sign, t } = getSign();
        const h = {
            'User-Agent': UA,
            'Accept': 'application/json',
            'deviceid': getDid(),
            't': t,
            's': sign
        };
        const data = {
            deviceId: getDid(),
            tt: 'U',
            code: '##X-4m6Goo4zzPi1hF##',
            chCode: 'tt09'
        };
        const resp = await request(domain + '/api/user/traveler', h, 'POST', data);
        const j = safeJson(resp);
        if (j && j.data && j.data.token && j.data.imgDomain) {
            return {
                ok: true,
                token: j.data.token,
                imgDomain: j.data.imgDomain,
                domain: domain
            };
        }
    } catch (e) {}
    return { ok: false };
}

async function getToken() {
    // 依次尝试域名池
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

function safeJson(str) {
    try {
        if (!str) return null;
        return JSON.parse(str);
    } catch (e) {
        return null;
    }
}

async function apiGet(path) {
    if (!host) {
        const ok = await getToken();
        if (!ok) return {};
    }
    const url = path.startsWith('http') ? path : host + path;
    const cacheKey = 'GET:' + url;
    if (apiCache[cacheKey]) return apiCache[cacheKey];

    try {
        const resp = await request(url, headers());
        const j = safeJson(resp);
        if (!j) return {};
        let data = j;
        if (j.encData) {
            data = aesDecrypt(j.encData);
        }
        if (Object.keys(apiCache).length > 80) {
            for (const k of Object.keys(apiCache)) delete apiCache[k];
        }
        apiCache[cacheKey] = data;
        return data;
    } catch (e) {
        return {};
    }
}

function dtim(seconds) {
    try {
        seconds = parseInt(seconds || 0, 10);
        const hours = Math.floor(seconds / 3600);
        const remaining = seconds % 3600;
        const minutes = Math.floor(remaining / 60);
        const secs = remaining % 60;
        if (hours > 0) {
            return (
                String(hours).padStart(2, '0') +
                ':' +
                String(minutes).padStart(2, '0') +
                ':' +
                String(secs).padStart(2, '0')
            );
        }
        return String(minutes).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
    } catch (e) {
        return '';
    }
}

function proxyPic(u) {
    if (!u) return '';
    // 简单返回完整图片地址（不走本地代理）
    if (String(u).startsWith('http')) return u;
    return (phost || '') + u;
}

function items(arr, clicked) {
    const res = [];
    if (!Array.isArray(arr)) return res;
    for (const k of arr) {
        let cover = k.coverImg || [];
        let pic = '';
        if (Array.isArray(cover) && cover.length) pic = cover[0];
        else if (typeof cover === 'string') pic = cover;

        const vid = String(k.videoId || '');
        const uid = String(k.userId || '');
        const nick = String(k.nickName || '');
        if (!vid) continue;

        let id =
            vid +
            '?' +
            uid +
            '?' +
            encodeURIComponent(nick) +
            '?' +
            encodeURIComponent(k.title || nick || vid);
        if (clicked) id += 'click';

        res.push({
            vod_id: id,
            vod_name: k.title || nick || vid,
            vod_pic: proxyPic(pic),
            vod_remarks: dtim(k.playTime),
            style: { type: 'rect', ratio: 1.33 }
        });
    }
    return res;
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
        const data = await apiGet('/api/video/classifyList');
        const classes = [{ type_name: '精选', type_id: 'jx', land: 1, ratio: 1.33 }];
        const list = (data && data.data) || [];
        for (const k of list) {
            const tid = String(k.classifyId || '');
            const name = k.classifyTitle || '';
            if (tid && name) {
                classes.push({ type_name: name, type_id: tid, land: 1, ratio: 1.33 });
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
        const filters = {};
        for (const c of classes) {
            if (c.type_id === 'jx') {
                filters['jx'] = [
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
                ];
            } else {
                filters[c.type_id] = sort;
            }
        }

        return JSON.stringify({ class: classes, filters: filters });
    } catch (e) {
        console.error('home error', e.message);
        return JSON.stringify({ class: [], filters: {} });
    }
}

async function homeVod() {
    try {
        // 精选日榜
        const path = '/api/video/getRankVideos?pageSize=20&page=1&type=1';
        const data = await apiGet(path);
        let arr = [];
        if (data && Array.isArray(data.data)) arr = data.data;
        else if (data && Array.isArray(data.videoList)) arr = data.videoList;
        const list = items(arr, false);
        return JSON.stringify({ list: list.slice(0, 20) });
    } catch (e) {
        console.error('homeVod error', e.message);
        return JSON.stringify({ list: [] });
    }
}

async function category(tid, pg, filter, ext) {
    pg = String(pg || '1');
    try {
        let fl = '1';
        let type = '1';
        if (ext && typeof ext === 'object') {
            if (ext.fl) fl = String(ext.fl);
            if (ext.type) type = String(ext.type);
        }

        let path =
            '/api/video/queryVideoByClassifyId?pageSize=20&page=' +
            pg +
            '&classifyId=' +
            tid +
            '&sortType=' +
            fl;

        if (String(tid).includes('click')) {
            path =
                '/api/video/queryPersonVideoByType?pageSize=20&page=' +
                pg +
                '&userId=' +
                String(tid).replace('click', '');
        }
        if (tid === 'jx') {
            path =
                '/api/video/getRankVideos?pageSize=20&page=' +
                pg +
                '&type=' +
                type;
        }

        const data = await apiGet(path);
        let arr = [];
        if (data && Array.isArray(data.data)) arr = data.data;
        else if (data && Array.isArray(data.videoList)) arr = data.videoList;

        const list = items(arr, String(tid).includes('click'));
        return JSON.stringify({
            list: list,
            page: Number(pg),
            pagecount: 9999,
            limit: 20,
            total: 999999
        });
    } catch (e) {
        console.error('category error', e.message);
        return JSON.stringify({ list: [], page: Number(pg), pagecount: 0 });
    }
}

async function search(key, quick, pg) {
    pg = String(pg || '1');
    try {
        const path =
            '/api/search/keyWord?pageSize=20&page=' +
            pg +
            '&searchWord=' +
            encodeURIComponent(key) +
            '&searchType=1';
        const data = await apiGet(path);
        const list = items((data && data.videoList) || [], false);
        return JSON.stringify({
            list: list,
            page: Number(pg),
            pagecount: 9999,
            land: 1,
            ratio: 1.33
        });
    } catch (e) {
        console.error('search error', e.message);
        return JSON.stringify({ list: [], page: Number(pg), pagecount: 0, land: 1, ratio: 1.33 });
    }
}

async function detail(vodId) {
    try {
        let raw = String(vodId || '');
        if (!raw.includes('?') && raw.toLowerCase().includes('%3f')) {
            raw = decodeURIComponent(raw);
        }
        let click = false;
        if (raw.endsWith('click')) {
            click = true;
            raw = raw.slice(0, -5);
        }
        const pp = raw.split('?', 4);
        const vid = pp[0] || raw;
        const uid = pp[1] || '';
        const nick = pp[2] ? decodeURIComponent(pp[2]) : '推特APP';
        const title = pp[3] ? decodeURIComponent(pp[3]) : '';
        const name = (title || nick || '推特APP').replace(/\$/g, '＄');

        let director = nick;
        // 简化：不生成复杂 a 标签

        const vod = {
            vod_id: raw,
            vod_name: name,
            vod_pic: '',
            vod_director: director,
            vod_content: name,
            vod_play_from: '酷鱼专线',
            vod_play_url: name + '$' + vid
        };
        return JSON.stringify({ list: [vod] });
    } catch (e) {
        console.error('detail error', e.message);
        return JSON.stringify({ list: [] });
    }
}

async function play(flag, playId, flags) {
    try {
        const vid = String(playId);
        if (!host) {
            await getToken();
        }
        const url = host + '/api/video/can/watch?videoId=' + encodeURIComponent(vid);
        const resp = await request(url, headers());
        const j = safeJson(resp);
        let data = j || {};
        if (j && j.encData) {
            data = aesDecrypt(j.encData);
        }

        let playUrl = '';
        const ak = data.authKey || '';
        const vu = data.videoUrl || '';
        if (ak && vu) {
            playUrl =
                host +
                '/api/m3u8/decode/authPath?auth_key=' +
                encodeURIComponent(ak) +
                '&path=' +
                encodeURIComponent(vu);
        }
        if (!playUrl) {
            playUrl = data.playPath || '';
        }

        return JSON.stringify({
            parse: 0,
            url: playUrl,
            header: headers()
        });
    } catch (e) {
        console.error('play error', e.message);
        return JSON.stringify({
            parse: 0,
            url: '',
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
