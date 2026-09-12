import { load } from 'assets://js/lib/cat.js';

let HOST = 'https://hqvod.com';
let siteKey = '', siteType = '', sourceKey = '', ext = '';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9'
};

async function request(url, ref, retry = 1) {
    const headers = { ...HEADERS };
    if (ref) headers['Referer'] = ref;
    try {
        const res = await req(url, { method: 'get', headers, timeout: 5000 });
        return res;
    } catch (e) {
        if (retry > 0) return await request(url, ref, retry - 1);
        return { content: '' };
    }
}

function joinUrl(url) {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('//')) return 'https:' + url;
    if (url.startsWith('/')) return HOST + url;
    return HOST + '/' + url;
}

// 解析列表页（首页/分类/搜索共用）
function parseVodList(html) {
    const $ = load(html);
    const list = [];

    $('.public-list-box.public-pic-b').each(function() {
        const box = $(this);
        const exp = box.find('.public-list-exp').first();
        const href = exp.attr('href') || '';
        if (!href || href === '/') return;

        const name = exp.attr('title') ||
                     box.find('.public-list-button .time-title').first().attr('title') ||
                     box.find('.public-list-button .time-title').first().text().trim();
        if (!name) return;

        let pic = exp.find('img').attr('data-src') || exp.find('img').attr('src') || '';
        let remarks = box.find('.public-list-prb').text().trim();

        list.push({ vod_id: href, vod_name: name, vod_pic: joinUrl(pic), vod_remarks: remarks });
    });

    const map = {};
    return list.filter(function(it) {
        if (!it.vod_id || map[it.vod_id]) return false;
        map[it.vod_id] = 1;
        return true;
    });
}

function init(cfg) {
    siteKey = cfg.skey;
    siteType = cfg.stype;
    sourceKey = cfg.sourceKey;
    ext = cfg.ext || '';
    if (ext && ext.startsWith('http')) HOST = ext.replace(/\/$/, '');
}

async function home(filter) {
    const classes = [
        { type_id: '1', type_name: '电影' },
        { type_id: '2', type_name: '电视剧' },
        { type_id: '3', type_name: '动漫' },
        { type_id: '4', type_name: '综艺' }
    ];
    return JSON.stringify({ class: classes });
}

async function homeVod() {
    try {
        const res = await request(HOST + '/');
        return JSON.stringify({ list: parseVodList(res.content || '') });
    } catch (e) {
        return JSON.stringify({ list: [] });
    }
}

async function category(tid, pg) {
    pg = parseInt(pg) || 1;
    const url = HOST + '/fenlei/' + tid + '-' + pg + '.html';
    try {
        const res = await request(url, HOST + '/');
        const html = res.content || '';
        const list = parseVodList(html);
        const $ = load(html);
        const nextHref = '/fenlei/' + tid + '-' + (pg + 1) + '.html';
        const hasNext = $('.pages a[href="' + nextHref + '"]').length > 0;
        return JSON.stringify({
            page: pg,
            pagecount: hasNext ? pg + 1 : pg,
            limit: 40,
            total: hasNext ? 999 : list.length,
            list: list
        });
    } catch (e) {
        return JSON.stringify({ page: pg, pagecount: 0, limit: 40, total: 0, list: [] });
    }
}

async function detail(id) {
    try {
        const url = joinUrl(id);
        const res = await request(url, HOST + '/');
        const html = res.content || '';
        if (!html) return JSON.stringify({ list: [] });
        const $ = load(html);

        // 标题
        const vod_name = $('.this-desc-title').first().text().trim() ||
                         $('h1').first().text().trim() || '';

        // 封面：优先取背景大图，其次取详情缩略图
        let vod_pic = '';
        const bgStyle = $('.this-pic-bj').first().attr('style') || '';
        const bgMatch = bgStyle.match(/url\(["']?([^"')]+)["']?\)/);
        if (bgMatch) vod_pic = joinUrl(bgMatch[1]);
        if (!vod_pic) {
            vod_pic = joinUrl($('.role-card img').attr('data-src') || $('.role-card img').attr('src') || '');
        }

        // 简介
        let vod_content = $('.this-desc .text').first().text().trim() || '';
        if (!vod_content) {
            vod_content = $('.info-parameter li').filter(function() {
                return $(this).find('em').text().includes('简介');
            }).first().text().replace(/^简介[：:]/, '').trim();
        }
        vod_content = vod_content.replace(/^描述[：:]/, '').trim();

        // 线路与剧集：anthology-tab 与 anthology-list-box 按索引一一对应
        const playFrom = [];
        const playUrl = [];

        const tabs = $('.anthology-tab .swiper-wrapper a');
        const boxes = $('.anthology-list .anthology-list-box');

        tabs.each(function(index) {
            const lineName = $(this).clone().children().remove().end().text().trim();
            if (!lineName) return;

            const box = boxes.eq(index);
            if (!box.length) return;

            const links = [];
            box.find('.anthology-list-play li a').each(function() {
                const title = $(this).text().trim();
                const href = $(this).attr('href');
                if (href && title) {
                    links.push(title + '$' + href);
                }
            });

            if (links.length) {
                playFrom.push(lineName);
                playUrl.push(links.join('#'));
            }
        });

        return JSON.stringify({
            list: [{
                vod_id: id,
                vod_name: vod_name,
                vod_pic: vod_pic,
                vod_content: vod_content,
                vod_play_from: playFrom.join('$$$'),
                vod_play_url: playUrl.join('$$$')
            }]
        });
    } catch (e) {
        return JSON.stringify({ list: [] });
    }
}

async function search(wd, quick, pg) {
    pg = parseInt(pg) || 1;
    const url = HOST + '/sousuo/-------------.html?wd=' + encodeURIComponent(wd) + '&page=' + pg;
    try {
        const res = await request(url, HOST + '/');
        const html = res.content || '';
        const list = parseVodList(html);
        const $ = load(html);
        const hasNext = $('.pages a[href*="page=' + (pg + 1) + '"]').length > 0;
        return JSON.stringify({
            page: pg,
            pagecount: hasNext ? pg + 1 : pg,
            limit: 40,
            total: hasNext ? 999 : list.length,
            list: list
        });
    } catch (e) {
        return JSON.stringify({ page: pg, pagecount: 0, limit: 40, total: 0, list: [] });
    }
}

async function play(flag, id, flags) {
    try {
        const url = joinUrl(id);
        const res = await request(url, HOST + '/');
        const html = res.content || '';

        // 提取 maccms 的 player_aaaa
        const match = html.match(/var\s+player_aaaa\s*=\s*({.+?});/);
        if (match) {
            try {
                const player = JSON.parse(match[1]);
                if (player.url) {
                    // 明文直链
                    if (player.url.startsWith('http') && (/\.(m3u8|mp4|flv|mkv|ts)/i.test(player.url) || player.url.includes('?url='))) {
                        return JSON.stringify({
                            parse: 0,
                            url: player.url,
                            header: { 'User-Agent': HEADERS['User-Agent'], 'Referer': url }
                        });
                    }
                    // encrypt 1 = base64
                    if (player.encrypt === 1) {
                        try {
                            const decoded = atob(player.url);
                            return JSON.stringify({
                                parse: 0,
                                url: decoded,
                                header: { 'User-Agent': HEADERS['User-Agent'], 'Referer': url }
                            });
                        } catch (e) {}
                    }
                    // encrypt 2 = escape
                    if (player.encrypt === 2) {
                        try {
                            const decoded = decodeURIComponent(player.url);
                            return JSON.stringify({
                                parse: 0,
                                url: decoded,
                                header: { 'User-Agent': HEADERS['User-Agent'], 'Referer': url }
                            });
                        } catch (e) {}
                    }
                }
            } catch (err) {}
        }

        // 兜底：交给壳子 WebView 解析播放页
        return JSON.stringify({
            parse: 1,
            url: url,
            header: { 'User-Agent': HEADERS['User-Agent'], 'Referer': HOST + '/' }
        });
    } catch (e) {
        return JSON.stringify({ parse: 1, url: id });
    }
}

export function __jsEvalReturn() {
    return { init, home, homeVod, category, detail, search, play };
}