import { Crypto, _ } from 'assets://js/lib/cat.js';

let siteKey = '';
let siteType = 0;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
const HEADERS = { 'User-Agent': UA, Referer: 'https://tv.cctv.com/' };

function safeJson(s) {
    try { return s ? JSON.parse(s) : null; } catch (e) { return null; }
}

async function request(url) {
    try {
        const res = await req(url, { method: 'GET', headers: HEADERS, timeout: 20000 });
        return res && res.content ? res.content : '';
    } catch (e) {
        console.error('request', url, e && e.message);
        return '';
    }
}

function parseExt(ext) {
    if (!ext) return {};
    if (typeof ext === 'object') return ext;
    try { return JSON.parse(ext); } catch (e) { return {}; }
}

function packId(tid, title, url, img, id, year, actors, brief) {
    return [tid, title || '', url || '', img || '', id || '', year || '', actors || '', brief || ''].join('###');
}

function unpackId(s) {
    const a = String(s || '').split('###');
    return {
        tid: a[0] || '', title: a[1] || '', url: a[2] || '', img: a[3] || '',
        id: a[4] || '', year: a[5] || '', actors: a[6] || '', brief: a[7] || ''
    };
}

function letterFilter() {
    const v = [{ n: '全部', v: '' }];
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(c => v.push({ n: c, v: c }));
    v.push({ n: '0-9', v: '0-9' });
    return { key: 'dataszm-letter', name: '字母', value: v };
}

function yearFilter(from, to) {
    const v = [{ n: '全部', v: '' }];
    for (let y = from; y >= to; y--) v.push({ n: String(y), v: String(y) });
    return { key: 'datanf-year', name: '年份', value: v };
}

function buildFilters() {
    const ch = [
        ['', '全部'],
        ['CCTV-1综合', 'CCTV-1 综合'],
        ['CCTV-2财经', 'CCTV-2 财经'],
        ['CCTV-3综艺', 'CCTV-3 综艺'],
        ['CCTV-4中文国际(亚)', 'CCTV-4 中文国际'],
        ['CCTV-5体育', 'CCTV-5 体育'],
        ['CCTV-6电影', 'CCTV-6 电影'],
        ['CCTV-7军事农业', 'CCTV-7 国防军事'],
        ['CCTV-8电视剧', 'CCTV-8 电视剧'],
        ['CCTV-9纪录', 'CCTV-9 纪录'],
        ['CCTV-10科教', 'CCTV-10 科教'],
        ['CCTV-11戏曲', 'CCTV-11 戏曲'],
        ['CCTV-12社会与法', 'CCTV-12 社会与法'],
        ['CCTV-13新闻', 'CCTV-13 新闻'],
        ['CCTV-14少儿', 'CCTV-14 少儿'],
        ['CCTV-15音乐', 'CCTV-15 音乐'],
        ['CCTV-17农业农村高清', 'CCTV-17 农业农村']
    ].map(x => ({ n: x[1], v: x[0] }));
    return {
        '电视剧': [
            { key: 'datafl-sc', name: '类型', value: ['','谍战','悬疑','刑侦','历史','古装','武侠','军旅','战争','喜剧','青春','言情','偶像','家庭','年代','革命','农村','都市','其他'].map(x => ({ n: x || '全部', v: x })) },
            yearFilter(2026, 1997),
            letterFilter()
        ],
        '动画片': [
            { key: 'datafl-sc', name: '类型', value: ['','亲子','搞笑','冒险','动作','宠物','体育','益智','历史','教育','校园','言情','武侠','经典','未来','古代','神话','真人','励志','热血','奇幻','童话','剧情','夺宝','其他'].map(x => ({ n: x || '全部', v: x })) },
            { key: 'datadq-area', name: '地区', value: [{ n: '全部', v: '' }, { n: '中国大陆', v: '中国大陆' }, { n: '美国', v: '美国' }, { n: '欧洲', v: '欧洲' }] },
            letterFilter()
        ],
        '纪录片': [
            { key: 'datapd-channel', name: '频道', value: ch },
            { key: 'datafl-sc', name: '类型', value: ['','人文历史','人物','军事','探索','社会','时政','经济','科技'].map(x => ({ n: x || '全部', v: x })) },
            yearFilter(2026, 2008),
            letterFilter()
        ],
        '特别节目': [
            { key: 'datapd-channel', name: '频道', value: ch },
            { key: 'datafl-sc', name: '类型', value: ['','新闻','经济','综艺','体育','军事','影视','科教','戏曲','青少','音乐','社会','公益','其他'].map(x => ({ n: x || '全部', v: x })) },
            letterFilter()
        ],
        '栏目大全': [
            { key: 'cid', name: '频道', value: [
                { n: '全部', v: '' },
                { n: 'CCTV-1综合', v: 'EPGC1386744804340101' },
                { n: 'CCTV-2财经', v: 'EPGC1386744804340102' },
                { n: 'CCTV-3综艺', v: 'EPGC1386744804340103' },
                { n: 'CCTV-4中文国际', v: 'EPGC1386744804340104' },
                { n: 'CCTV-5体育', v: 'EPGC1386744804340107' },
                { n: 'CCTV-6电影', v: 'EPGC1386744804340108' },
                { n: 'CCTV-7国防军事', v: 'EPGC1386744804340109' },
                { n: 'CCTV-8电视剧', v: 'EPGC1386744804340110' },
                { n: 'CCTV-9纪录', v: 'EPGC1386744804340112' },
                { n: 'CCTV-10科教', v: 'EPGC1386744804340113' },
                { n: 'CCTV-11戏曲', v: 'EPGC1386744804340114' },
                { n: 'CCTV-12社会与法', v: 'EPGC1386744804340115' },
                { n: 'CCTV-13新闻', v: 'EPGC1386744804340116' },
                { n: 'CCTV-14少儿', v: 'EPGC1386744804340117' },
                { n: 'CCTV-15音乐', v: 'EPGC1386744804340118' },
                { n: 'CCTV-16奥林匹克', v: 'EPGC1634630207058998' },
                { n: 'CCTV-17农业农村', v: 'EPGC1563932742616872' },
                { n: 'CCTV-5+体育赛事', v: 'EPGC1468294755566101' }
            ]},
            { key: 'fc', name: '分类', value: ['','新闻','体育','综艺','健康','生活','科教','经济','农业','法治','军事','少儿','动画','纪实','戏曲','音乐','影视'].map(x => ({ n: x || '全部', v: x })) },
            { key: 'fl', name: '字母', value: [{ n: '全部', v: '' }].concat('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(c => ({ n: c, v: c }))) }
        ]
    };
}

function listFromAlbum(js, tid) {
    const rows = (((js || {}).data || {}).list) || [];
    return rows.filter(v => v.url).map(v => ({
        vod_id: packId(tid, v.title, v.url, v.image, v.id, v.year || '', v.actors || '', v.brief || ''),
        vod_name: v.title,
        vod_pic: v.image || '',
        vod_remarks: v.year || '',
        style: { type: 'rect', ratio: 1.33 }
    }));
}

async function init(cfg) {
    try { siteKey = cfg.skey; siteType = cfg.stype; } catch (e) {}
}

async function home(filter) {
    const classes = ['栏目大全', '电视剧', '动画片', '纪录片', '特别节目'].map(n => ({
        type_id: n, type_name: n, land: 1, ratio: 1.33
    }));
    return JSON.stringify({ class: classes, filters: buildFilters() });
}

async function homeVod() {
    return JSON.stringify({ list: [] });
}

async function category(tid, pg, filter, ext) {
    pg = Number(pg) || 1;
    const e = parseExt(ext);
    let url = '';
    let pageSize = 24;
    const fc = encodeURIComponent(tid);
    const area = encodeURIComponent(e['datadq-area'] || '');
    const letter = e['dataszm-letter'] || '';
    const sc = encodeURIComponent(e['datafl-sc'] || '');
    const year = e['datanf-year'] || '';
    const channel = encodeURIComponent(e['datapd-channel'] || '');
    if (tid === '动画片') {
        url = 'https://api.cntv.cn/list/getVideoAlbumList?channelid=CHAL1460955899450127&area=' + area + '&sc=' + sc + '&fc=' + fc + '&letter=' + letter + '&p=' + pg + '&n=24&serviceId=tvcctv&topv=1&t=json';
    } else if (tid === '纪录片') {
        url = 'https://api.cntv.cn/list/getVideoAlbumList?channelid=CHAL1460955924871139&fc=' + fc + '&channel=' + channel + '&sc=' + sc + '&year=' + year + '&letter=' + letter + '&p=' + pg + '&n=24&serviceId=tvcctv&topv=1&t=json';
    } else if (tid === '电视剧') {
        url = 'https://api.cntv.cn/list/getVideoAlbumList?channelid=CHAL1460955853485115&area=' + area + '&sc=' + sc + '&fc=' + fc + '&year=' + year + '&letter=' + letter + '&p=' + pg + '&n=24&serviceId=tvcctv&topv=1&t=json';
    } else if (tid === '特别节目') {
        url = 'https://api.cntv.cn/list/getVideoAlbumList?channelid=CHAL1460955953877151&channel=' + channel + '&sc=' + sc + '&fc=' + fc + '&bigday=&letter=' + letter + '&p=' + pg + '&n=24&serviceId=tvcctv&topv=1&t=json';
    } else if (tid === '栏目大全') {
        pageSize = 20;
        url = 'https://api.cntv.cn/lanmu/columnSearch?&fl=' + (e.fl || '') + '&fc=' + encodeURIComponent(e.fc || '') + '&cid=' + (e.cid || '') + '&p=' + pg + '&n=20&serviceId=tvcctv&t=json&cb=ko';
    } else {
        return JSON.stringify({ list: [], page: pg, pagecount: 0 });
    }
    const html = await request(url);
    let list = [];
    if (tid === '栏目大全') {
        let text = html;
        const i = text.lastIndexOf(');');
        if (text.indexOf('ko(') === 0 && i > 0) text = text.slice(3, i);
        const js = safeJson(text) || {};
        const docs = (((js.response || {}).docs) || []);
        list = docs.filter(v => v.column_website).map(v => ({
            vod_id: packId(tid, v.column_name, v.column_website, v.column_logo, ((v.lastVIDE || {}).videoSharedCode) || '', v.column_playdate || '', '', v.column_brief || ''),
            vod_name: v.column_name,
            vod_pic: v.column_logo || '',
            vod_remarks: v.column_playdate || '',
            style: { type: 'rect', ratio: 1.33 }
        }));
    } else {
        list = listFromAlbum(safeJson(html), tid);
    }
    return JSON.stringify({
        list: list,
        page: pg,
        pagecount: list.length >= pageSize ? 9999 : pg,
        limit: 90,
        total: 999999
    });
}

async function search(key, quick, pg) {
    pg = Number(pg) || 1;
    const url = 'https://search.cctv.com/ifsearch.php?page=' + pg + '&qtext=' + encodeURIComponent(key) + '&sort=relevance&pageSize=20&type=video&vtime=-1&datepid=1&channel=&pageflag=0&qtext_str=' + encodeURIComponent(key);
    const js = safeJson(await request(url)) || {};
    const rows = js.list || [];
    const list = rows.filter(v => v.urllink).map(v => ({
        vod_id: packId('搜索', String(v.title || '').replace(/<[^>]+>/g, ''), v.urllink, v.imglink, v.id, v.uploadtime || '', '', v.channel || ''),
        vod_name: String(v.title || '').replace(/<[^>]+>/g, ''),
        vod_pic: v.imglink || '',
        vod_remarks: v.uploadtime || '',
        style: { type: 'rect', ratio: 1.33 }
    }));
    return JSON.stringify({ list: list, page: pg, pagecount: list.length >= 20 ? pg + 1 : pg, land: 1, ratio: 1.33 });
}

async function detail(vodId) {
    const a = unpackId(vodId);
    let fromId = 'CCTV';
    let play = [];
    try {
        if (a.tid === '搜索') {
            fromId = '中央台';
            play = [a.title + '$' + a.url];
        } else if (a.tid === '栏目大全') {
            const info = safeJson(await request('https://api.cntv.cn/video/videoinfoByGuid?guid=' + a.id + '&serviceId=tvcctv')) || {};
            const topicId = info.ctid || '';
            const js = safeJson(await request('https://api.cntv.cn/NewVideo/getVideoListByColumn?id=' + topicId + '&d=&p=1&n=100&sort=desc&mode=0&serviceId=tvcctv&t=json')) || {};
            const rows = (((js.data || {}).list) || []);
            play = rows.filter(v => v.guid).map(v => v.title + '$' + v.guid);
        } else {
            const js = safeJson(await request('https://api.cntv.cn/NewVideo/getVideoListByAlbumIdNew?id=' + a.id + '&serviceId=tvcctv&p=1&n=100&mode=0&pub=1')) || {};
            const rows = (((js.data || {}).list) || []);
            play = rows.filter(v => v.guid).map(v => v.title + '$' + v.guid);
        }
    } catch (e) {}
    if (!play.length && a.url) {
        fromId = '央视';
        play = [a.title + '$' + a.url];
    }
    return JSON.stringify({
        list: [{
            vod_id: vodId,
            vod_name: a.title,
            vod_pic: a.img,
            vod_year: a.year,
            vod_actor: a.actors,
            vod_content: a.brief,
            vod_play_from: fromId,
            vod_play_url: play.join('#')
        }]
    });
}

function prefixHost(link) {
    const m = String(link || '').match(/https?:\/\/[a-zA-Z0-9.-]+/);
    return m ? m[0] : '';
}

async function getM3u8(guid) {
    const info = safeJson(await request('https://vdn.apps.cntv.cn/api/getHttpVideoInfo.do?pid=' + guid)) || {};
    const hls = (info.hls_url || '').trim();
    if (!hls) return '';
    const m3 = await request(hls);
    const lines = String(m3 || '').trim().split('\n').filter(l => l && l.charAt(0) !== '#');
    const last = lines[lines.length - 1] || '';
    const host = prefixHost(hls);
    let url = last.indexOf('http') === 0 ? last : (host + last);
    if (last.indexOf('/') >= 0) {
        const parts = last.split('/');
        if (parts.length > 3) {
            parts[3] = '1200';
            parts[parts.length - 1] = '1200.m3u8';
            const hd = host + parts.join('/');
            url = hd;
        }
    }
    return url;
}

async function play(flag, playId, flags) {
    const header = { 'User-Agent': UA, Referer: 'https://tv.cctv.com/' };
    try {
        let url = '';
        let parse = 0;
        if (flag === 'CCTV' && playId && playId.indexOf('http') !== 0) {
            url = await getM3u8(playId);
        } else if (/^https?:/.test(playId)) {
            const html = await request(playId);
            const g = html.match(/var\s+guid\s*=\s*"([^"]+)"/);
            if (g) url = await getM3u8(g[1]);
            else { url = playId; parse = 1; }
        } else {
            url = await getM3u8(playId);
        }
        if (!url || url.indexOf('http') !== 0) {
            url = playId;
            parse = 1;
        }
        return JSON.stringify({ parse: parse, playUrl: '', url: url, header: header });
    } catch (e) {
        return JSON.stringify({ parse: 1, url: playId, header: header });
    }
}

export function __jsEvalReturn() {
    return { init, home, homeVod, category, detail, search, play };
}
