import { Crypto, _ } from 'assets://js/lib/cat.js';

let siteKey = '';
let siteType = 0;

const HOST = 'https://www.59v.net';
const UA = 'Mozilla/5.0 (Linux; Android 14; M2102J2SC Build/UKQ1.240624.001) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36';
const DEFAULT_HEADERS = {
    'User-Agent': UA,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'Referer': HOST + '/'
};

const CLASSES = [
    { type_id: '1', type_name: '电影' },
    { type_id: '2', type_name: '剧集' },
    { type_id: '3', type_name: '综艺' },
    { type_id: '4', type_name: '动漫' }
];

const FILTERS = {
    '1': [{
        key: 'sub',
        name: '类型',
        value: [
            { n: '全部', v: '' },
            { n: '动作片', v: '6' },
            { n: '喜剧片', v: '7' },
            { n: '爱情片', v: '8' },
            { n: '科幻片', v: '9' },
            { n: '恐怖片', v: '10' },
            { n: '剧情片', v: '11' },
            { n: '战争片', v: '12' },
            { n: '动漫电影', v: '26' }
        ]
    }],
    '2': [{
        key: 'sub',
        name: '类型',
        value: [
            { n: '全部', v: '' },
            { n: '国产剧', v: '13' },
            { n: '港台剧', v: '14' },
            { n: '韩国剧', v: '15' },
            { n: '欧美剧', v: '16' },
            { n: '日本剧', v: '17' },
            { n: '泰国剧', v: '27' }
        ]
    }],
    '3': [{
        key: 'sub',
        name: '类型',
        value: [
            { n: '全部', v: '' },
            { n: '国内综艺', v: '18' },
            { n: '港台综艺', v: '19' },
            { n: '日韩综艺', v: '20' },
            { n: '欧美综艺', v: '21' }
        ]
    }],
    '4': [{
        key: 'sub',
        name: '类型',
        value: [
            { n: '全部', v: '' },
            { n: '国产动漫', v: '22' },
            { n: '欧美动漫', v: '23' },
            { n: '日韩动漫', v: '24' },
            { n: '港台动漫', v: '25' }
        ]
    }]
};

async function request(url, optHeaders = {}) {
    try {
        const headers = Object.assign({}, DEFAULT_HEADERS, optHeaders);
        const res = await req(url, {
            method: 'GET',
            headers: headers,
            timeout: 15000
        });
        return res?.content ?? '';
    } catch (e) {
        console.error('request error:', url, e?.message);
        return '';
    }
}

function fixUrl(url) {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('//')) return 'https:' + url;
    if (url.startsWith('/')) return HOST + url;
    return HOST + '/' + url;
}

function safeJson(str) {
    try {
        if (!str) return null;
        return JSON.parse(str);
    } catch (e) {
        return null;
    }
}

function extractListItems(html) {
    const list = [];
    if (!html) return list;

    const $ = cheerio.load(html);

    // 首页 / 分类列表
    $('.module-item').each((_, el) => {
        const $item = $(el);
        let $a = $item.is('a') ? $item : $item.find('a').first();
        if (!$a.length) return;

        const href = $a.attr('href') || '';
        if (!href.startsWith('/voddetail/')) return;

        let title = $a.attr('title') || '';
        if (!title) {
            const $t = $a.find('.module-poster-item-title').first();
            if ($t.length) title = $t.text().trim();
        }

        const $img = $a.find('img').first();
        let pic = '';
        if ($img.length) {
            pic = $img.attr('data-original') || $img.attr('src') || '';
        }

        const $note = $a.find('.module-item-note').first();
        const remarks = $note.length ? $note.text().trim() : '';

        if (href && title) {
            list.push({
                vod_id: href,
                vod_name: title,
                vod_pic: fixUrl(pic),
                vod_remarks: remarks,
                style: { type: 'rect', ratio: 1.33 }
            });
        }
    });

    // 搜索结果（卡片样式）
    if (list.length === 0) {
        $('.module-card-item').each((_, el) => {
            const $item = $(el);
            let $a =
                $item.find('.module-card-item-poster').first() ||
                $item.find('.module-card-item-title a').first() ||
                $item.find('a').first();
            if (!$a.length) return;

            const href = $a.attr('href') || '';
            if (!href.startsWith('/voddetail/')) return;

            let title = '';
            const $titleStrong = $item.find('.module-card-item-title strong').first();
            const $titleA = $item.find('.module-card-item-title a').first();
            if ($titleStrong.length) title = $titleStrong.text().trim();
            else if ($titleA.length) title = $titleA.text().trim();

            const $img = $item.find('img').first();
            let pic = '';
            if ($img.length) {
                pic = $img.attr('data-original') || $img.attr('src') || '';
                if (!title) title = $img.attr('alt') || '';
            }

            const $note = $item.find('.module-item-note').first();
            const remarks = $note.length ? $note.text().trim() : '';

            if (href && title) {
                list.push({
                    vod_id: href,
                    vod_name: title,
                    vod_pic: fixUrl(pic),
                    vod_remarks: remarks,
                    style: { type: 'rect', ratio: 1.33 }
                });
            }
        });
    }

    return list;
}

async function init(cfg) {
    try {
        siteKey = cfg.skey;
        siteType = cfg.stype;
    } catch (e) {
        console.error('init error', e.message);
    }
}

async function home(filter) {
    try {
        const classes = CLASSES.map(c => ({
            type_id: c.type_id,
            type_name: c.type_name,
            land: 1,
            ratio: 1.33
        }));
        return JSON.stringify({ class: classes, filters: FILTERS });
    } catch (e) {
        console.error('home error', e.message);
        return JSON.stringify({ class: [], filters: {} });
    }
}

async function homeVod() {
    try {
        const html = await request(HOST);
        const list = extractListItems(html);
        return JSON.stringify({ list: list.slice(0, 20) });
    } catch (e) {
        console.error('homeVod error', e.message);
        return JSON.stringify({ list: [] });
    }
}

async function category(tid, pg, filter, ext) {
    pg = Number(pg) || 1;
    try {
        let sub = '';
        if (ext && typeof ext === 'object' && ext.sub) {
            sub = String(ext.sub);
        }
        const cid = sub || tid;
        const url = `${HOST}/vodshow/${cid}--------${pg}---/`;
        const html = await request(url);
        const list = extractListItems(html);

        return JSON.stringify({
            list: list,
            page: pg,
            pagecount: list.length >= 20 ? pg + 1 : pg,
            limit: 40,
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
        const encoded = encodeURIComponent(key);
        let url;
        if (pg === 1) {
            url = `${HOST}/vodsearch/${encoded}-------------/`;
        } else {
            url = `${HOST}/vodsearch/${encoded}----------${pg}---/`;
        }
        const html = await request(url);
        const list = extractListItems(html);

        return JSON.stringify({
            list: list,
            page: pg,
            pagecount: list.length >= 20 ? pg + 1 : pg,
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
        const url = fixUrl(vodId);
        const html = await request(url);
        if (!html) return JSON.stringify({ list: [] });

        const $ = cheerio.load(html);

        const vod = {
            vod_id: vodId,
            vod_name: '未知',
            vod_pic: '',
            vod_content: '',
            vod_director: '',
            vod_actor: '',
            vod_year: '',
            vod_remarks: '',
            vod_play_from: '',
            vod_play_url: ''
        };

        // 标题
        let $h1 = $('.module-info-heading h1').first();
        if (!$h1.length) $h1 = $('.page-title').first();
        if ($h1.length) vod.vod_name = $h1.text().trim();

        // 封面
        let $img = $('.module-info-poster img').first();
        if (!$img.length) $img = $('.module-item-pic img').first();
        if ($img.length) {
            const pic = $img.attr('data-original') || $img.attr('src') || '';
            vod.vod_pic = fixUrl(pic);
        }

        // 简介
        const $intro = $('.module-info-introduction-content p').first();
        if ($intro.length) vod.vod_content = $intro.text().trim();

        // 导演 / 主演 / 上映 / 备注
        $('.module-info-item').each((_, el) => {
            const text = $(el).text();
            if (text.includes('导演：')) {
                vod.vod_director = text.replace('导演：', '').trim();
            } else if (text.includes('主演：')) {
                vod.vod_actor = text.replace('主演：', '').trim();
            } else if (text.includes('上映：')) {
                vod.vod_year = text.replace('上映：', '').trim();
            } else if (text.includes('备注：')) {
                vod.vod_remarks = text.replace('备注：', '').trim();
            }
        });

        // 播放线路名称
        const playSources = [];
        let $tabs = $('.module-tab-items-box .tab-item');
        if (!$tabs.length) $tabs = $('.module-tab-item.tab-item');
        $tabs.each((_, tab) => {
            const $tab = $(tab);
            let name = '';
            const $span = $tab.find('span').first();
            if ($span.length) {
                name = $span.text().trim();
            } else {
                name = $tab.text().replace(/\d+$/, '').trim();
            }
            if (name && !playSources.includes(name)) {
                playSources.push(name);
            }
        });

        // 播放列表
        const playLists = [];
        $('.module-play-list-content').each((_, listDiv) => {
            const eps = [];
            $(listDiv).find('a.module-play-list-link').each((_, link) => {
                const $link = $(link);
                const $span = $link.find('span').first();
                const epName = $span.length ? $span.text().trim() : $link.text().trim();
                const epUrl = $link.attr('href') || '';
                if (epUrl) {
                    eps.push(epName + '$' + epUrl);
                }
            });
            if (eps.length) {
                playLists.push(eps.join('#'));
            }
        });

        if (playSources.length && playLists.length) {
            const n = Math.min(playSources.length, playLists.length);
            vod.vod_play_from = playSources.slice(0, n).join('$$$');
            vod.vod_play_url = playLists.slice(0, n).join('$$$');
        }

        return JSON.stringify({ list: [vod] });
    } catch (e) {
        console.error('detail error', e.message);
        return JSON.stringify({ list: [] });
    }
}

async function play(flag, playId, flags) {
    try {
        const url = fixUrl(playId);
        const html = await request(url);
        if (!html) {
            return JSON.stringify({
                parse: 1,
                url: url,
                header: { 'User-Agent': UA, 'Referer': HOST + '/' }
            });
        }

        // 提取 player_aaaa
        const match = html.match(/var\s+player_aaaa\s*=\s*({.+?})<\/script>/s);
        if (match) {
            const playerData = safeJson(match[1]);
            if (playerData && playerData.url) {
                const realUrl = playerData.url;
                if (realUrl.endsWith('.m3u8') || realUrl.endsWith('.mp4')) {
                    return JSON.stringify({
                        parse: 0,
                        url: realUrl,
                        header: {
                            'User-Agent': UA,
                            'Referer': HOST + '/'
                        }
                    });
                }
            }
        }

        // 兜底嗅探
        return JSON.stringify({
            parse: 1,
            url: url,
            header: {
                'User-Agent': UA,
                'Referer': HOST + '/'
            }
        });
    } catch (e) {
        console.error('play error', e.message);
        return JSON.stringify({
            parse: 1,
            url: playId,
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
