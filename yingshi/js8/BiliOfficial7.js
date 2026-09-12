import { Crypto, _ } from 'assets://js/lib/cat.js';

let siteKey = '';
let siteType = 0;

const HOST = 'https://api.bilibili.com';
const WEB = 'https://www.bilibili.com';
const UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

const HEADERS = {
    'User-Agent': UA,
    Referer: WEB + '/',
    Origin: WEB,
    Accept: 'application/json, text/plain, */*'
};

const CLASSES = [
    { type_id: '0', type_name: '综合' },
    { type_id: '1', type_name: '动画' },
    { type_id: '13', type_name: '番剧' },
    { type_id: '167', type_name: '国创' },
    { type_id: '3', type_name: '音乐' },
    { type_id: '129', type_name: '舞蹈' },
    { type_id: '4', type_name: '游戏' },
    { type_id: '36', type_name: '知识' },
    { type_id: '188', type_name: '科技' },
    { type_id: '160', type_name: '生活' },
    { type_id: '211', type_name: '美食' },
    { type_id: '217', type_name: '动物' },
    { type_id: '119', type_name: '鬼畜' },
    { type_id: '155', type_name: '时尚' },
    { type_id: '5', type_name: '娱乐' },
    { type_id: '181', type_name: '影视' }
];

function safeJson(s) {
    try {
        if (!s) return null;
        if (typeof s === 'object') return s;
        return JSON.parse(s);
    } catch (e) {
        return null;
    }
}

async function request(url) {
    try {
        const res = await req(url, { method: 'GET', headers: HEADERS, timeout: 20000 });
        return res && res.content ? res.content : '';
    } catch (e) {
        return '';
    }
}

function card(v) {
    v = v || {};
    const bvid = v.bvid || '';
    const aid = v.aid || v.id || '';
    const pic = String(v.pic || v.cover || '').replace(/^\/\//, 'https://');
    const title = String(v.title || '').replace(/<[^>]+>/g, '');
    return {
        vod_id: bvid || String(aid),
        vod_name: title,
        vod_pic: pic,
        vod_remarks: (v.owner && v.owner.name) || v.author || v.duration || '',
        style: { type: 'rect', ratio: 1.5 }
    };
}

function playHeader() {
    return {
        'User-Agent': UA,
        Referer: WEB + '/',
        Origin: WEB
    };
}

function pickDurl(js) {
    const data = (js && js.data) || (js && js.result) || {};
    const durl = data.durl || [];
    if (durl.length && (durl[0].url || durl[0].backup_url)) {
        return durl[0].url || (durl[0].backup_url && durl[0].backup_url[0]) || '';
    }
    const dash = data.dash || {};
    const v = (dash.video || [])[0];
    if (v) return v.baseUrl || v.base_url || '';
    return '';
}

async function fetchPlay(bid, cid, qn, fnval) {
    const idq = /^BV/i.test(bid) ? 'bvid=' + encodeURIComponent(bid) : 'avid=' + encodeURIComponent(bid);
    const url =
        HOST +
        '/x/player/playurl?' +
        idq +
        '&cid=' +
        encodeURIComponent(cid) +
        '&qn=' +
        qn +
        '&fnval=' +
        fnval +
        '&fnver=0&fourk=1&platform=html5';
    return safeJson(await request(url)) || {};
}

async function init(cfg) {
    try {
        siteKey = cfg.skey;
        siteType = cfg.stype;
    } catch (e) {}
}

async function home(filter) {
    return JSON.stringify({
        class: CLASSES.map(function (c) {
            return { type_id: c.type_id, type_name: c.type_name, land: 1, ratio: 1.5 };
        }),
        filters: {}
    });
}

async function homeVod() {
    const js = safeJson(await request(HOST + '/x/web-interface/popular?ps=20&pn=1')) || {};
    const list = ((js.data || {}).list || []).map(card);
    return JSON.stringify({ list: list });
}

async function category(tid, pg, filter, ext) {
    pg = Number(pg) || 1;
    let url;
    if (String(tid) === '0') {
        url = HOST + '/x/web-interface/popular?ps=20&pn=' + pg;
    } else {
        url = HOST + '/x/web-interface/newlist?rid=' + encodeURIComponent(tid) + '&type=0&ps=20&pn=' + pg;
    }
    const js = safeJson(await request(url)) || {};
    const data = js.data || {};
    const arr = data.list || data.archives || [];
    return JSON.stringify({
        list: arr.map(card),
        page: pg,
        pagecount: pg + 1,
        limit: 20,
        total: data.page && data.page.count ? data.page.count : 99999
    });
}

async function search(key, quick, pg) {
    pg = Number(pg) || 1;
    const url =
        HOST +
        '/x/web-interface/search/type?search_type=video&page=' +
        pg +
        '&page_size=20&keyword=' +
        encodeURIComponent(key);
    const js = safeJson(await request(url)) || {};
    const result = (js.data && js.data.result) || [];
    return JSON.stringify({
        list: result.map(card),
        page: pg,
        pagecount: (js.data && js.data.numPages) || (result.length >= 20 ? pg + 1 : pg),
        limit: 20,
        land: 1,
        ratio: 1.5
    });
}

async function detail(vodId) {
    const id = String(vodId || '').split('|')[0];
    const q = /^BV/i.test(id) ? 'bvid=' + encodeURIComponent(id) : 'aid=' + encodeURIComponent(id);
    const js = safeJson(await request(HOST + '/x/web-interface/view?' + q)) || {};
    const d = js.data || {};
    const pages = d.pages && d.pages.length ? d.pages : [{ cid: d.cid, part: d.title || '播放' }];
    const bid = d.bvid || id;
    const play = pages
        .map(function (p, i) {
            const name = String(p.part || 'P' + (i + 1)).replace(/\$/g, '_').replace(/#/g, '-');
            const cid = p.cid || d.cid || '';
            if (!cid) return '';
            return name + '$' + bid + '|' + cid;
        })
        .filter(Boolean);
    if (!play.length && d.cid) play.push('播放$' + bid + '|' + d.cid);
    return JSON.stringify({
        list: [
            {
                vod_id: bid,
                vod_name: d.title || id,
                vod_pic: String(d.pic || '').replace(/^\/\//, 'https://'),
                vod_remarks: d.tname || '',
                vod_year: d.pubdate ? new Date(d.pubdate * 1000).getFullYear() + '' : '',
                vod_content: d.desc || '',
                vod_actor: (d.owner && d.owner.name) || '',
                vod_play_from: 'Bilibili',
                vod_play_url: play.join('#')
            }
        ]
    });
}

async function play(flag, playId, flags) {
    const header = playHeader();
    try {
        const parts = String(playId || '').split('|');
        const bid = parts[0];
        let cid = parts[1] || '';
        if (!cid) {
            const q = /^BV/i.test(bid) ? 'bvid=' + encodeURIComponent(bid) : 'aid=' + encodeURIComponent(bid);
            const info = safeJson(await request(HOST + '/x/web-interface/view?' + q)) || {};
            cid = String((info.data || {}).cid || '');
        }
        if (!cid) {
            return JSON.stringify({ parse: 1, url: WEB + '/video/' + bid, header: header });
        }
        const tries = [
            [16, 1],
            [32, 1],
            [64, 1],
            [16, 16]
        ];
        for (let i = 0; i < tries.length; i++) {
            const js = await fetchPlay(bid, cid, tries[i][0], tries[i][1]);
            const playUrl = pickDurl(js);
            if (playUrl) {
                return JSON.stringify({ parse: 0, url: playUrl, header: header });
            }
        }
        return JSON.stringify({ parse: 1, url: WEB + '/video/' + bid, header: header });
    } catch (e) {
        return JSON.stringify({ parse: 1, url: String(playId || ''), header: header });
    }
}

export function __jsEvalReturn() {
    return { init, home, homeVod, category, detail, search, play };
}
