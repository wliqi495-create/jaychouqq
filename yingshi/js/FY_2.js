import { load, _ } from 'assets://js/lib/cat.js';

let HOST = 'https://www.budaichuchen.net';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const DefaultHeader = {
    'User-Agent': UA,
    'Referer': HOST + '/',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
};

async function request(url, options = {}) {
    try {
        const optObj = {
            headers: options.headers || DefaultHeader,
            timeout: 10000,
            method: options.method || 'GET',
            data: options.data || ''
        };
        const res = await req(url, optObj);
        return res?.content ?? '';
    } catch (e) {
        return '';
    }
}

function parseHtml(html) {
    return load(html);
}

async function init(cfg) {
    if (cfg.ext && typeof cfg.ext === 'string') {
        HOST = cfg.ext;
    }
}

async function home(filter) {
    const classes = [
        { type_id: '1', type_name: '电影' },
        { type_id: '2', type_name: '电视剧' },
        { type_id: '3', type_name: '综艺' },
        { type_id: '4', type_name: '动漫' },
        { type_id: '5', type_name: '短剧' }
    ];
    return JSON.stringify({ class: classes });
}

async function homeVod() {
    const html = await request(HOST);
    if (!html) return JSON.stringify({ list: [] });
    const $ = parseHtml(html);
    let videos = [];
    $('.public-list-box').each((_, el) => {
        const a = $(el).find('.public-list-exp');
        const href = a.attr('href') || '';
        if (href.includes('/detail/')) {
            videos.push({
                vod_id: href.match(/detail\/(.*?)\.html/)[1],
                vod_name: a.attr('title'),
                vod_pic: a.find('img').attr('data-src') || a.find('img').attr('src'),
                vod_remarks: $(el).find('.public-list-prb').text().trim()
            });
        }
    });
    return JSON.stringify({ list: videos });
}

async function category(tid, pg, filter, extend) {
    const area = extend.area || '';
    const by = extend.by || 'time';
    const clazz = extend.class || '';
    const year = extend.year || '';
    const lang = extend.lang || '';
    const letter = extend.letter || '';
    const url = `${HOST}/cupfox-list/${tid}-${area}-${by}-${clazz}-${lang}-${letter}---${pg}---${year}.html`;
    const html = await request(url);
    if (!html) return JSON.stringify({ list: [] });
    const $ = parseHtml(html);
    let videos = [];
    $('.public-list-box').each((_, el) => {
        const a = $(el).find('.public-list-exp');
        const href = a.attr('href') || '';
        if (href.includes('/detail/')) {
            videos.push({
                vod_id: href.match(/detail\/(.*?)\.html/)[1],
                vod_name: a.attr('title'),
                vod_pic: $(el).find('img').attr('data-src') || $(el).find('img').attr('src'),
                vod_remarks: $(el).find('.public-list-prb').text().trim()
            });
        }
    });
    return JSON.stringify({ page: parseInt(pg), list: videos });
}

async function detail(id) {
    const url = `${HOST}/detail/${id}.html`;
    const html = await request(url);
    if (!html) return "{}";
    const $ = parseHtml(html);
    const vod = {
        vod_id: id,
        vod_name: $('.slide-info-title').text().trim(),
        vod_pic: $('.detail-pic img').attr('data-src') || $('.detail-pic img').attr('src'),
        vod_content: $('#height_limit').text().trim(),
        vod_play_from: [],
        vod_play_url: []
    };
    $('.anthology-tab a').each((_, el) => {
        const name = $(el).text().trim().replace(/\s/g, '').replace(/\(\d+\)/, '');
        if (name) vod.vod_play_from.push(name);
    });
    $('.anthology-list-box').each((_, el) => {
        let items = [];
        $(el).find('ul li a').each((_, a) => {
            const name = $(a).text().trim();
            const href = $(a).attr('href');
            if (href) {
                const playMatch = href.match(/play\/(.*?)\.html/);
                if (playMatch) items.push(`${name}$${playMatch[1]}`);
            }
        });
        items.reverse(); 
        vod.vod_play_url.push(items.join('#'));
    });
    vod.vod_play_from = vod.vod_play_from.join('$$$');
    vod.vod_play_url = vod.vod_play_url.join('$$$');
    return JSON.stringify({ list: [vod] });
}

async function search(wd, quick) {
    const url = `${HOST}/cupfox-search/${encodeURIComponent(wd)}----------1---.html`;
    const html = await request(url);
    if (!html) return JSON.stringify({ list: [] });
    const $ = parseHtml(html);
    let videos = [];
    $('.search-box').each((_, el) => {
        const a = $(el).find('.public-list-exp');
        const href = a.attr('href') || '';
        if (href.includes('/detail/')) {
            videos.push({
                vod_id: href.match(/detail\/(.*?)\.html/)[1],
                vod_name: $(el).find('.thumb-txt a').text().trim(),
                vod_pic: a.find('img').attr('data-src') || a.find('img').attr('src'),
                vod_remarks: a.find('.public-list-prb').text().trim()
            });
        }
    });
    return JSON.stringify({ list: videos });
}

async function play(flag, id, flags) {
    try {
        const url = `${HOST}/play/${id}.html`;
        const html = await request(url);
        if (!html) return JSON.stringify({ parse: 0, url: '' });

        const match = html.match(/var\s+player_aaaa\s*=\s*(\{.*?\});/);
        if (!match) return JSON.stringify({ parse: 1, url: url });

        const config = JSON.parse(match[1]);
        const rawUrl = config.url || '';
        const from = config.from || '';

        if (rawUrl.startsWith('http')) {
            const isDirect = rawUrl.includes('.m3u8') || rawUrl.includes('.mp4');
            return JSON.stringify({
                parse: isDirect ? 0 : 1,
                url: rawUrl,
                header: DefaultHeader
            });
        }

        if (from === 'JD4K' || from === 'JD' || rawUrl.startsWith('JD-')) {
            const jxUrl = 'https://fgsrg.hzqingshan.com/player/?url=' + rawUrl;
            return JSON.stringify({
                parse: 1,
                url: jxUrl,
                header: DefaultHeader
            });
        }

        return JSON.stringify({
            parse: 1,
            url: rawUrl || url,
            header: DefaultHeader
        });
    } catch (e) {
        return JSON.stringify({ parse: 1, url: url });
    }
}

export function __jsEvalReturn() {
    return {
        init: init,
        home: home,
        homeVod: homeVod,
        category: category,
        detail: detail,
        play: play,
        search: search
    };
}