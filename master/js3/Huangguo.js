import { Crypto, _ } from 'assets://js/lib/cat.js';

let siteKey = '';
let siteType = 0;

const PRIMARY = 'https://huangguoai.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
let HOST = PRIMARY;
const PAGE_SIZE = 24;

function randHost() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let s = '';
    const n = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
    return 'https://' + s + '.ediayikma.cc';
}

function headers() {
    return {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        Referer: HOST + '/'
    };
}

function safeJson(s) {
    try { return s ? JSON.parse(s) : null; } catch (e) { return null; }
}

function parseExt(ext) {
    if (!ext) return {};
    if (typeof ext === 'object') return ext;
    try { return JSON.parse(ext); } catch (e) { return {}; }
}

function clean(s) {
    return String(s || '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

async function request(url) {
    try {
        const res = await req(url, { method: 'GET', headers: headers(), timeout: 15000 });
        return res && res.content ? res.content : '';
    } catch (e) {
        return '';
    }
}

async function getPath(path) {
    if (String(path).indexOf('http') === 0) return request(path);
    let html = await request(HOST + path);
    if (html && html.length > 200) return html;
    for (let i = 0; i < 3; i++) {
        const h = randHost();
        html = await request(h + path);
        if (html && (html.indexOf('黄果') >= 0 || html.length > 2000 || html.indexOf('hg-drama-card') >= 0)) {
            HOST = h;
            return html;
        }
    }
    return html || '';
}

function parseList(html, mode) {
    mode = mode || 'drama';
    const list = [];
    const seen = {};
    if (mode === 'topic') {
        const re = /<a[^>]*class="[^"]*hg-topic-card[^"]*"[^>]*href="([^"]+)"[\s\S]{0,800}?/gi;
        let m;
        const blocks = String(html || '').split(/class="[^"]*hg-topic-card/);
        for (let i = 1; i < blocks.length; i++) {
            const b = blocks[i];
            const href = (b.match(/href="([^"]+)"/) || [])[1] || '';
            const slug = href.replace(/\/+$/, '').split('/').pop();
            const title = clean((b.match(/hg-topic-card__title[^>]*>([\s\S]*?)</) || b.match(/<h2[^>]*>([\s\S]*?)</) || [])[1]);
            const pic = (b.match(/data-src="([^"]+)"/) || b.match(/src="([^"]+)"/) || [])[1] || '';
            const remark = clean((b.match(/hg-topic-card__meta[^>]*>([\s\S]*?)</) || [])[1]);
            if (!title) continue;
            list.push({ vod_id: 'dir_topic_' + slug, vod_name: title, vod_pic: pic, vod_remarks: remark, vod_tag: 'folder', style: { type: 'rect', ratio: 0.75 } });
        }
        return list;
    }
    if (mode === 'rank') {
        const blocks = String(html || '').split(/class="[^"]*hg-rank-item/);
        for (let i = 1; i < blocks.length; i++) {
            const b = blocks[i];
            const hm = b.match(/\/detail\/(\d+)/);
            if (!hm || seen[hm[1]]) continue;
            seen[hm[1]] = 1;
            const title = clean((b.match(/data-track-title="([^"]+)"/) || b.match(/alt="([^"]+)"/) || b.match(/hg-rank-item__title[^>]*>([\s\S]*?)</) || [])[1]);
            const pic = (b.match(/data-src="([^"]+)"/) || b.match(/src="([^"]+)"/) || [])[1] || '';
            const heat = clean((b.match(/hg-rank-item__heat-value[^>]*>([\s\S]*?)</) || [])[1]);
            if (!title) continue;
            list.push({ vod_id: hm[1], vod_name: title, vod_pic: pic, vod_remarks: heat ? ('🔥' + heat) : '', style: { type: 'rect', ratio: 0.75 } });
        }
        return list;
    }
    if (mode === 'post') {
        const blocks = String(html || '').split(/class="[^"]*hg-post-card/);
        for (let i = 1; i < blocks.length; i++) {
            const b = blocks[i];
            const href = (b.match(/href="([^"]+)"/) || [])[1] || '';
            if (!href) continue;
            const title = clean((b.match(/<h3[^>]*>([\s\S]*?)<\/h3>/) || [])[1]);
            const pic = (b.match(/data-src="([^"]+)"/) || b.match(/src="([^"]+)"/) || [])[1] || '';
            list.push({
                vod_id: href.indexOf('http') === 0 ? href : HOST + href,
                vod_name: title || '吃瓜',
                vod_pic: pic,
                vod_remarks: '吃瓜',
                style: { type: 'rect', ratio: 1.33 }
            });
        }
        return list;
    }
    const blocks = String(html || '').split(/class="[^"]*hg-drama-card/);
    for (let i = 1; i < blocks.length; i++) {
        const b = blocks[i];
        const hm = b.match(/href="(\/detail\/(\d+)\/?)"/) || b.match(/\/detail\/(\d+)/);
        const vid = hm ? (hm[2] || hm[1]) : '';
        if (!vid || seen[vid]) continue;
        seen[vid] = 1;
        const pic = (b.match(/data-src="([^"]+)"/) || b.match(/<img[^>]*src="([^"]+)"/) || [])[1] || '';
        let title = clean((b.match(/hg-drama-card__title[\s\S]{0,120}?<a[^>]*>([\s\S]*?)<\/a>/) || [])[1]);
        if (!title) title = clean((b.match(/alt="([^"]+)"/) || b.match(/data-track-title="([^"]+)"/) || [])[1]);
        const parts = [];
        const sc = b.match(/hg-drama-card__score[^>]*>([\s\S]*?)</);
        const ep = b.match(/hg-drama-card__episode[^>]*>([\s\S]*?)</);
        if (sc) parts.push(clean(sc[1]));
        if (ep) parts.push(clean(ep[1]));
        if (!title) continue;
        list.push({
            vod_id: vid,
            vod_name: title,
            vod_pic: pic,
            vod_remarks: parts.join(' ') || '在线观看',
            style: { type: 'rect', ratio: 0.75 }
        });
    }
    return list;
}

function apiItem(it) {
    if (!it) return null;
    const id = String(it.id || it.drama_id || it.video_id || '');
    if (!id) return null;
    return {
        vod_id: id,
        vod_name: it.title || it.name || '',
        vod_pic: it.cover || it.pic || it.thumb || '',
        vod_remarks: it.remark || it.episode || it.score || '',
        style: { type: 'rect', ratio: 0.75 }
    };
}

async function init(cfg) {
    try { siteKey = cfg.skey; siteType = cfg.stype; } catch (e) {}
}

async function home(filter) {
    return JSON.stringify({
        class: [
            { type_id: 'recommend', type_name: '精选推荐', land: 1, ratio: 0.75 },
            { type_id: 'newest', type_name: '最近上新', land: 1, ratio: 0.75 },
            { type_id: 'ai-duanju', type_name: 'AI成人短剧', land: 1, ratio: 0.75 },
            { type_id: 'ai-manju', type_name: 'AI成人漫剧', land: 1, ratio: 0.75 },
            { type_id: 'ai-huanlian', type_name: 'AI换脸', land: 1, ratio: 0.75 },
            { type_id: 'ai-mogai', type_name: 'AI魔改', land: 1, ratio: 0.75 },
            { type_id: 'topic', type_name: '专题', land: 1, ratio: 0.75 },
            { type_id: 'ranks', type_name: '排行榜', land: 1, ratio: 0.75 },
            { type_id: 'chigua', type_name: '黄果吃瓜', land: 1, ratio: 1.33 },
            { type_id: 'author', type_name: '黄果官方', land: 1, ratio: 0.75 }
        ],
        filters: {
            ranks: [{ key: '类型', name: '类型', value: [{ n: '热播榜', v: 'hot' }, { n: '推荐榜', v: 'recommend' }, { n: '潜力榜', v: 'potential' }] }],
            chigua: [{ key: '类型', name: '类型', value: [{ n: '全部', v: 'page' }, { n: '热门吃瓜', v: 'remen' }, { n: 'AI原创', v: 'yuanchuang' }] }],
            author: [{ key: '类型', name: '类型', value: [{ n: '黄果官方', v: '156291' }, { n: '黄果ai大师', v: '156305' }] }]
        }
    });
}

async function homeVod() {
    let html = await getPath('/recommend/1/');
    if (!html) html = await getPath('/');
    return JSON.stringify({ list: parseList(html).slice(0, 24) });
}

async function category(tid, pg, filter, ext) {
    pg = Number(pg) || 1;
    const e = parseExt(ext);
    const cid = String(tid || '').replace(/^\/+|\/+$/g, '');
    const rc = e['类型'] || cid;
    let list = [];
    let pagecount = 9999;
    if (cid.indexOf('dir_topic_') === 0) {
        const slug = cid.replace('dir_topic_', '');
        list = parseList(await getPath('/topics/' + slug + '/?page=' + pg));
    } else if (['ai-duanju', 'ai-manju', 'ai-huanlian', 'ai-mogai'].indexOf(cid) >= 0) {
        const text = await getPath('/api/videos/category/' + encodeURIComponent(cid) + '?sort=hot&page=' + pg + '&size=' + PAGE_SIZE);
        const js = safeJson(text);
        if (js && js.data) {
            list = (js.data.items || []).map(apiItem).filter(Boolean);
            pagecount = Number((js.data.pagination || {}).pages) || pagecount;
        }
        if (!list.length) {
            const path = pg <= 1 ? '/' + cid + '/' : '/' + cid + '/' + pg + '/';
            list = parseList(await getPath(path));
        }
    } else if (cid === 'recommend') {
        list = parseList(await getPath('/recommend/' + pg + '/'));
    } else if (cid === 'newest') {
        list = parseList(await getPath('/newest/' + pg + '/'));
    } else if (cid === 'topic') {
        list = parseList(await getPath('/topics/'), 'topic');
        pagecount = 1;
    } else if (cid === 'ranks') {
        const rtype = ['hot', 'recommend', 'potential'].indexOf(rc) >= 0 ? rc : 'hot';
        list = parseList(await getPath('/ranks/' + rtype + '/'), 'rank');
        pagecount = 1;
    } else if (cid === 'chigua') {
        const ctype = ['page', 'remen', 'yuanchuang'].indexOf(rc) >= 0 ? rc : 'page';
        list = parseList(await getPath('/chigua/' + ctype + '/' + pg + '/'), 'post');
    } else if (cid === 'author') {
        const aid = /^\d+$/.test(String(rc)) ? rc : '156291';
        list = parseList(await getPath('/author/' + aid + '/video/' + pg + '/'));
    } else {
        const path = pg <= 1 ? '/' + cid + '/' : '/' + cid + '/' + pg + '/';
        list = parseList(await getPath(path));
    }
    return JSON.stringify({ list: list, page: pg, pagecount: pagecount, limit: PAGE_SIZE, total: 99999 });
}

async function search(key, quick, pg) {
    pg = Number(pg) || 1;
    const html = await getPath('/search/?q=' + encodeURIComponent(key) + (pg > 1 ? '&page=' + pg : ''));
    return JSON.stringify({ list: parseList(html, 'search'), page: pg, pagecount: 99, land: 1, ratio: 0.75 });
}

function collectEps(html) {
    const eps = [];
    const seen = {};
    const re = /href="(\/video\/[^"]+)"/gi;
    let m;
    while ((m = re.exec(html || ''))) {
        const path = m[1];
        if (seen[path]) continue;
        seen[path] = 1;
        const nm = path.match(/(?:ep-?|episode-?|p|play-?)(\d+)/i);
        const label = nm ? String(nm[1]).padStart(2, '0') : String(Object.keys(seen).length).padStart(2, '0');
        eps.push([label, path]);
    }
    eps.sort((a, b) => {
        const na = Number((a[1].match(/(\d+)/) || [0, 0])[1]);
        const nb = Number((b[1].match(/(\d+)/) || [0, 0])[1]);
        return na - nb;
    });
    return eps;
}

async function detail(vodId) {
    const id = String(vodId || '');
    if (id.indexOf('chigua') >= 0 || id.indexOf('/post') >= 0 || /https?:/.test(id) && id.indexOf('/detail/') < 0) {
        const url = id.indexOf('http') === 0 ? id : HOST + (id.charAt(0) === '/' ? id : '/' + id);
        const html = await request(url);
        const title = clean((html.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '').split('|')[0];
        const players = [];
        const re = /post-video-player[^>]*data-player-key="([^"]*)"[^>]*data-src="([^"]*)"/gi;
        let m;
        while ((m = re.exec(html))) players.push(m[1] + '$' + m[2].replace(/&amp;/g, '&'));
        if (!players.length) {
            const re2 = /data-src="(https?:\/\/[^"]+\.m3u8[^"]*)"/gi;
            while ((m = re2.exec(html))) players.push('线路' + (players.length + 1) + '$' + m[1]);
        }
        return JSON.stringify({
            list: [{
                vod_id: url,
                vod_name: title || '吃瓜',
                vod_play_from: '黄果吃瓜',
                vod_play_url: players.join('#') || ('正片$' + url)
            }]
        });
    }
    const did = id.replace(/^\/+|\/+$/g, '');
    const html = await getPath('/detail/' + did + '/');
    const title = clean((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || html.match(/<title>([\s\S]*?)<\/title>/) || [])[1]).split('|')[0];
    const pic = (html.match(/property="og:image"[^>]+content="([^"]+)"/) || html.match(/data-src="([^"]+)"/) || [])[1] || '';
    const desc = clean((html.match(/hg-detail__desc[^>]*>([\s\S]*?)<\/div>/) || [])[1]);
    let eps = collectEps(html);
    if (!eps.length) {
        const vhtml = await getPath('/video/' + did + '/');
        eps = collectEps(vhtml);
    }
    if (!eps.length) eps = [['01', '/video/' + did + '/']];
    return JSON.stringify({
        list: [{
            vod_id: did,
            vod_name: title || did,
            vod_pic: pic,
            vod_content: desc,
            vod_play_from: '正片',
            vod_play_url: eps.map(x => x[0] + '$' + x[1]).join('#')
        }]
    });
}

function normPlay(u) {
    if (!u) return '';
    u = String(u).replace(/\\u0026/g, '&').replace(/&amp;/g, '&').trim();
    if (u.indexOf('//') === 0) u = 'https:' + u;
    return u;
}

function isDirect(u) {
    u = String(u || '');
    return /\.m3u8|\.mp4|\.flv|auth_key|playlist\.m3u8|\/m3u8\//i.test(u);
}

async function play(flag, playId, flags) {
    const header = { 'User-Agent': UA, Referer: HOST + '/' };
    let key = String(playId || '').trim();
    if (!key) return JSON.stringify({ parse: 0, url: '', header: header });
    const d = normPlay(key);
    if (d.indexOf('http') === 0 && isDirect(d)) {
        return JSON.stringify({ parse: 0, url: d, header: header });
    }
    if (flag === '黄果吃瓜' && d.indexOf('http') === 0) {
        return JSON.stringify({ parse: 0, url: d, header: header });
    }
    if (/^\d+$/.test(key)) key = '/video/' + key + '/';
    else if (key.indexOf('/') !== 0 && key.indexOf('http') !== 0) key = '/' + key;
    const html = await getPath(key);
    if (!html) {
        return JSON.stringify({ parse: 1, url: HOST + key, header: header });
    }
    const sm = html.match(/<script id="videoInitialData" type="application\/json">([\s\S]*?)<\/script>/);
    if (sm) {
        let data = safeJson(sm[1]);
        if (!data) {
            const raw = sm[1];
            for (let end = raw.length; end > raw.length - 2000 && end > 10; end -= 20) {
                data = safeJson(raw.slice(0, end));
                if (data) break;
            }
        }
        if (data) {
            let url = '';
            ['videoSrc', 'videoUrl', 'playUrl', 'src', 'url', 'video_src', 'play_url'].forEach(k => {
                if (!url && typeof data[k] === 'string') url = data[k];
            });
            if (!url) {
                const eps = data.epPlaySrcs || data.episodes || data.playSrcs || data.ep_play_srcs || data.playSources;
                if (eps && typeof eps === 'object') {
                    const ep = data.ep || data.episode || data.currentEp;
                    if (ep != null && eps[String(ep)]) url = eps[String(ep)];
                    else {
                        const vals = Object.keys(eps).map(k => eps[k]);
                        url = vals.filter(Boolean)[0] || '';
                    }
                }
            }
            url = normPlay(url);
            if (url.indexOf('http') === 0) return JSON.stringify({ parse: 0, url: url, header: header });
        }
    }
    let m = html.match(/hg-play__slide[^"]*is-active[^"]*"[^>]*data-play-src="([^"]+)"/);
    if (!m) m = html.match(/data-play-src="(https?:\/\/[^"]+)"/);
    if (m) {
        const url = normPlay(m[1]);
        if (url.indexOf('http') === 0) return JSON.stringify({ parse: 0, url: url, header: header });
    }
    return JSON.stringify({ parse: 1, url: HOST + key, header: header });
}

export function __jsEvalReturn() {
    return { init, home, homeVod, category, detail, search, play };
}
