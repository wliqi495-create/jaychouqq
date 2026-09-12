import { Crypto, _ } from 'assets://js/lib/cat.js';

let siteKey = '';
let siteType = 0;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';
const HEADERS = { 'User-Agent': UA, Accept: 'application/json, text/plain, */*' };
const PAGE = 30;
const PLAY_API = 'https://music.nxinxz.com/kw.php';

const QUALITY_MAP = { '128k': 'standard', '320k': 'exhigh', flac: 'lossless' };

function safeJson(s) {
    try {
        if (!s) return null;
        if (typeof s === 'object') return s;
        return JSON.parse(s);
    } catch (e) {
        return null;
    }
}

function decodeHtml(s) {
    return String(s || '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ');
}

async function getJson(url) {
    try {
        const res = await req(url, { method: 'GET', headers: HEADERS, timeout: 15000 });
        return safeJson(res && res.content ? res.content : '') || {};
    } catch (e) {
        return {};
    }
}

function artwork(short) {
    if (!short) return '';
    if (String(short).indexOf('http') === 0) return short;
    const i = String(short).indexOf('/');
    if (i < 0) return '';
    return 'https://img4.kuwo.cn/star/albumcover/1080' + String(short).slice(i);
}

function songCard(it) {
    const id = String(it.id || it.MUSICRID || '').replace(/^MUSIC_/, '');
    const name = decodeHtml(it.title || it.NAME || it.name || '');
    const artist = decodeHtml(it.artist || it.ARTIST || '');
    return {
        vod_id: id,
        vod_name: name,
        vod_pic: it.artwork || artwork(it.web_albumpic_short) || '',
        vod_remarks: artist,
        style: { type: 'rect', ratio: 1 }
    };
}

async function init(cfg) {
    try { siteKey = cfg.skey; siteType = cfg.stype; } catch (e) {}
}

async function home(filter) {
    return JSON.stringify({
        class: [
            { type_id: 'bang', type_name: '排行榜', land: 1, ratio: 1 },
            { type_id: 'rcm', type_name: '推荐歌单', land: 1, ratio: 1 },
            { type_id: 'cover', type_name: '翻唱', land: 1, ratio: 1 },
            { type_id: 'net', type_name: '网络', land: 1, ratio: 1 },
            { type_id: 'sad', type_name: '伤感', land: 1, ratio: 1 },
            { type_id: 'eu', type_name: '欧美', land: 1, ratio: 1 }
        ],
        filters: {
            bang: [],
            rcm: [],
            cover: [],
            net: [],
            sad: [],
            eu: []
        }
    });
}

async function homeVod() {
    const js = await getJson('http://kbangserver.kuwo.cn/ksong.s?from=pc&fmt=json&pn=0&rn=24&type=bang&data=content&id=16&show_copyright_off=0&pcmp4=1&isbang=1&userid=0&httpStatus=1');
    const list = (js.musiclist || []).map(s => songCard({
        id: s.id,
        title: s.name,
        artist: s.artist,
        album: s.album
    }));
    return JSON.stringify({ list: list.slice(0, 24) });
}

async function category(tid, pg, filter, ext) {
    pg = Number(pg) || 1;
    if (tid === 'bang') {
        const js = await getJson('http://wapi.kuwo.cn/api/pc/bang/list');
        const list = [];
        (js.child || []).forEach(g => {
            (g.child || []).forEach(b => {
                list.push({
                    vod_id: 'bang_' + b.sourceid,
                    vod_name: b.name,
                    vod_pic: b.pic5 || b.pic2 || b.pic || '',
                    vod_remarks: g.disname || '',
                    vod_tag: 'folder',
                    style: { type: 'rect', ratio: 1 }
                });
            });
        });
        return JSON.stringify({ list: list, page: 1, pagecount: 1, limit: 50, total: list.length });
    }
    const tagId = { rcm: '', cover: '1848', net: '621', sad: '146', eu: '35' }[tid];
    if (String(tid).indexOf('bang_') === 0) {
        const id = String(tid).slice(5);
        const js = await getJson('http://kbangserver.kuwo.cn/ksong.s?from=pc&fmt=json&pn=0&rn=80&type=bang&data=content&id=' + id + '&show_copyright_off=0&pcmp4=1&isbang=1&userid=0&httpStatus=1');
        const list = (js.musiclist || []).map(s => songCard({ id: s.id, title: s.name, artist: s.artist, album: s.album }));
        return JSON.stringify({ list: list, page: 1, pagecount: 1, limit: 80, total: list.length });
    }
    if (String(tid).indexOf('sheet_') === 0) {
        const id = String(tid).slice(6);
        const js = await getJson('http://nplserver.kuwo.cn/pl.svc?op=getlistinfo&pid=' + id + '&pn=' + (pg - 1) + '&rn=' + PAGE + '&encode=utf8&keyset=pl2012&vipver=MUSIC_9.1.1.2_BCS2&newver=1');
        const list = (js.musiclist || js.musicList || []).map(s => songCard({ id: s.id, title: s.name, artist: s.artist, album: s.album }));
        const total = Number(js.total) || list.length;
        return JSON.stringify({ list: list, page: pg, pagecount: Math.max(1, Math.ceil(total / PAGE)), limit: PAGE, total: total });
    }
    let url;
    if (tagId) {
        url = 'http://wapi.kuwo.cn/api/pc/classify/playlist/getTagPlayList?loginUid=0&loginSid=0&appUid=76039576&pn=' + (pg - 1) + '&id=' + tagId + '&rn=20';
    } else {
        url = 'https://wapi.kuwo.cn/api/pc/classify/playlist/getRcmPlayList?loginUid=0&loginSid=0&appUid=76039576&pn=' + (pg - 1) + '&rn=20&order=hot';
    }
    const js = await getJson(url);
    const data = (js.data && js.data.data) || (js.data && js.data.data) || (js.data || {}).data || js.data || [];
    const rows = Array.isArray(data) ? data : (data.data || []);
    const list = rows.map(s => ({
        vod_id: 'sheet_' + s.id,
        vod_name: s.name,
        vod_pic: s.img || '',
        vod_remarks: s.uname || '',
        vod_tag: 'folder',
        style: { type: 'rect', ratio: 1 }
    }));
    return JSON.stringify({ list: list, page: pg, pagecount: list.length >= 20 ? pg + 1 : pg, limit: 20, total: 9999 });
}

async function search(key, quick, pg) {
    pg = Number(pg) || 1;
    const url = 'http://search.kuwo.cn/r.s?client=kt&all=' + encodeURIComponent(key) +
        '&pn=' + (pg - 1) + '&rn=' + PAGE + '&uid=2574109560&ver=kwplayer_ar_8.5.4.2&vipver=1&ft=music&cluster=0&strategy=2012&encoding=utf8&rformat=json&vermerge=1&mobi=1';
    const js = await getJson(url);
    const list = (js.abslist || []).map(s => songCard({
        id: String(s.MUSICRID || '').replace(/^MUSIC_/, ''),
        title: s.NAME,
        artist: s.ARTIST,
        album: s.ALBUM,
        artwork: artwork(s.web_albumpic_short)
    }));
    const total = Number(js.TOTAL) || list.length;
    return JSON.stringify({
        list: list,
        page: pg,
        pagecount: Math.max(1, Math.ceil(total / PAGE)),
        land: 1,
        ratio: 1
    });
}

async function detail(vodId) {
    const id = String(vodId || '').replace(/^MUSIC_/, '');
    if (id.indexOf('bang_') === 0 || id.indexOf('sheet_') === 0) {
        const res = JSON.parse(await category(id, '1', false, {}));
        const play = (res.list || []).filter(x => !x.vod_tag).map(x => x.vod_name + '$' + x.vod_id);
        return JSON.stringify({
            list: [{
                vod_id: id,
                vod_name: id,
                vod_play_from: '裤佬SVIP',
                vod_play_url: play.join('#')
            }]
        });
    }
    const info = await getJson('http://m.kuwo.cn/newh5/singles/songinfoandlrc?musicId=' + encodeURIComponent(id) + '&httpStatus=1');
    const song = ((info.data || {}).songinfo) || {};
    const lrc = ((info.data || {}).lrclist) || [];
    const raw = lrc.map(x => '[' + x.time + ']' + x.lineLyric).join('\n');
    let pic = song.pic || '';
    pic = pic.replace(/starheads\/\d+/, 'starheads/800').replace(/albumcover\/\d+/, 'albumcover/800');
    const levels = ['standard', 'exhigh', 'lossless'];
    const names = ['128k', '320k', 'flac'];
    const urls = names.map((n, i) => n + '$' + id + '|' + levels[i]);
    return JSON.stringify({
        list: [{
            vod_id: id,
            vod_name: decodeHtml(song.songName || song.name || id),
            vod_pic: pic,
            vod_actor: decodeHtml(song.artist || ''),
            vod_content: raw.slice(0, 800),
            vod_play_from: '裤佬SVIP',
            vod_play_url: urls.join('#')
        }]
    });
}

async function play(flag, playId, flags) {
    const header = { 'User-Agent': UA };
    try {
        let id = String(playId || '');
        let level = 'exhigh';
        if (id.indexOf('|') >= 0) {
            const p = id.split('|');
            id = p[0];
            level = p[1] || level;
        }
        const url = PLAY_API + '?id=' + encodeURIComponent(id) + '&level=' + encodeURIComponent(level) + '&type=mp3';
        return JSON.stringify({ parse: 0, url: url, header: header });
    } catch (e) {
        return JSON.stringify({ parse: 1, url: playId, header: header });
    }
}

export function __jsEvalReturn() {
    return { init, home, homeVod, category, detail, search, play };
}
