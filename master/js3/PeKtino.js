import { Crypto, _ } from 'assets://js/lib/cat.js';

let siteKey = '';
let siteType = 0;

const HOST = 'https://pektino.com';
const LANG = 'zh-CN';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const DEFAULT_HEADERS = {
    'User-Agent': UA,
    'Referer': HOST + '/',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9'
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

function extractVideos(html) {
    const videos = [];
    if (!html) return videos;

    // 方式1：正则匹配卡片
    let pattern = /<div class="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden mb-4">(.*?)<\/div>\s*<div class="m-2">/gs;
    let items = html.match(pattern) || [];
    if (items.length === 0) {
        pattern = /<div class="bg-white[^"]*rounded-lg[^"]*shadow-md[^"]*overflow-hidden mb-4">(.*?)<\/div>\s*<div class="m-2">/gs;
        items = html.match(pattern) || [];
    }

    if (items.length > 0) {
        for (const item of items) {
            try {
                const linkMatch = item.match(/href="(\/zh-CN\/movie\/[^"]+)"/);
                if (!linkMatch) continue;
                const link = linkMatch[1];

                const imgMatch = item.match(/<img[^>]*src="([^"]+)"[^>]*>/);
                const pic = imgMatch ? fixUrl(imgMatch[1]) : '';

                const durationMatch = item.match(/<div class="absolute bottom-2 right-2 bg-black\/60 text-white text-xs px-2 py-1 rounded-lg">([^<]+)<\/div>/);
                const duration = durationMatch ? durationMatch[1].trim() : '';

                const viewsMatch = item.match(/<img src="\/icons\/eye-black\.svg"[^>]*>([^<]+)<\/span>/);
                const views = viewsMatch ? viewsMatch[1].trim() : '';

                const favMatch = item.match(/<img src="\/icons\/heart-black\.svg"[^>]*><span[^>]*>([^<]+)<\/span>/);
                const fav = favMatch ? favMatch[1].trim() : '';

                const titleMatch = item.match(/alt="([^"]+)"/);
                let title = titleMatch ? titleMatch[1] : link.split('/').pop();

                const vidMatch = link.match(/\/movie\/([^/]+)/);
                const vid = vidMatch ? vidMatch[1] : link;

                const remarks = [];
                if (duration) remarks.push('⏱' + duration);
                if (views) remarks.push('👁' + views);
                if (fav) remarks.push('❤' + fav);

                videos.push({
                    vod_id: vid,
                    vod_name: title,
                    vod_pic: pic,
                    vod_remarks: remarks.join(' | '),
                    style: { type: 'rect', ratio: 1.33 }
                });
            } catch (e) {
                continue;
            }
        }
    }

    // 方式2：解析 __NEXT_DATA__
    if (videos.length === 0) {
        const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
        if (nextDataMatch) {
            try {
                const data = safeJson(nextDataMatch[1]);
                function findItems(obj) {
                    if (!obj) return null;
                    if (typeof obj === 'object' && !Array.isArray(obj)) {
                        if (obj.props && obj.props.pageProps && obj.props.pageProps.initialItems) {
                            return obj.props.pageProps.initialItems;
                        }
                        for (const key of Object.keys(obj)) {
                            const result = findItems(obj[key]);
                            if (result) return result;
                        }
                    } else if (Array.isArray(obj)) {
                        for (const item of obj) {
                            const result = findItems(item);
                            if (result) return result;
                        }
                    }
                    return null;
                }
                const items2 = findItems(data);
                if (Array.isArray(items2)) {
                    for (const item of items2) {
                        const vid = item.url_cd || '';
                        if (!vid) continue;
                        const title = item.anime_title || vid;
                        let pic = item.thumbnail || '';
                        pic = fixUrl(pic);
                        let duration = '';
                        if (item.time) {
                            const m = Math.floor(item.time / 60);
                            const s = item.time % 60;
                            duration = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
                        }
                        const views = item.pv || '';
                        const fav = item.favorite || '';
                        const remarks = [];
                        if (duration) remarks.push('⏱' + duration);
                        if (views) remarks.push('👁' + views);
                        if (fav) remarks.push('❤' + fav);
                        videos.push({
                            vod_id: vid,
                            vod_name: title,
                            vod_pic: pic,
                            vod_remarks: remarks.join(' | '),
                            style: { type: 'rect', ratio: 1.33 }
                        });
                    }
                }
            } catch (e) {
                console.error('parse __NEXT_DATA__ error', e.message);
            }
        }
    }

    return videos;
}

function getPageCount(html) {
    const pageLinks = html.match(/<a[^>]*href="[^"]*page=(\d+)"[^>]*>/g) || [];
    let maxPage = 1;
    for (const link of pageLinks) {
        const m = link.match(/page=(\d+)/);
        if (m) {
            const p = parseInt(m[1], 10);
            if (p > maxPage) maxPage = p;
        }
    }
    const lastMatch = html.match(/href="[^"]*page=(\d+)"[^>]*>最后/);
    if (lastMatch) {
        const p = parseInt(lastMatch[1], 10);
        if (p > maxPage) maxPage = p;
    }
    return maxPage;
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
        const classes = [
            { type_id: 'all', type_name: '全部', land: 1, ratio: 1.33 }
        ];
        // 筛选器：时间范围 + 排序
        const filters = {
            all: [
                {
                    key: 'time_range',
                    name: '时间分类',
                    value: [
                        { n: '每日', v: 'daily' },
                        { n: '每周', v: 'weekly' },
                        { n: '每月', v: 'monthly' },
                        { n: '所有时间', v: 'all' }
                    ]
                },
                {
                    key: 'sort',
                    name: '排序方式',
                    value: [
                        { n: '按点赞', v: 'favorite' },
                        { n: '按观看数', v: 'pv' },
                        { n: '按时长', v: 'time' },
                        { n: '最近添加', v: 'created' }
                    ]
                }
            ]
        };
        return JSON.stringify({ class: classes, filters: filters });
    } catch (e) {
        console.error('home error', e.message);
        return JSON.stringify({ class: [], filters: {} });
    }
}

async function homeVod() {
    try {
        // 默认：所有时间 + 按点赞
        const url = `${HOST}/${LANG}/all?sort=favorite`;
        const html = await request(url);
        const list = extractVideos(html);
        return JSON.stringify({ list: list.slice(0, 20) });
    } catch (e) {
        console.error('homeVod error', e.message);
        return JSON.stringify({ list: [] });
    }
}

async function category(tid, pg, filter, ext) {
    pg = Number(pg) || 1;
    try {
        // 从 ext 获取筛选参数
        let timeRange = 'all';
        let sort = 'favorite';
        if (ext && typeof ext === 'object') {
            if (ext.time_range) timeRange = ext.time_range;
            if (ext.sort) sort = ext.sort;
        }

        let url;
        if (timeRange === 'daily') {
            url = `${HOST}/${LANG}/`;
        } else if (timeRange === 'weekly') {
            url = `${HOST}/${LANG}/weekly`;
        } else if (timeRange === 'monthly') {
            url = `${HOST}/${LANG}/monthly`;
        } else {
            url = `${HOST}/${LANG}/all`;
        }

        const params = [];
        if (sort) params.push('sort=' + encodeURIComponent(sort));
        if (pg > 1) params.push('page=' + pg);
        if (params.length > 0) url += '?' + params.join('&');

        const html = await request(url);
        if (!html) {
            return JSON.stringify({ list: [], page: pg, pagecount: 1, limit: 20, total: 0 });
        }

        const list = extractVideos(html);
        let pagecount = getPageCount(html);
        if (pagecount < pg) pagecount = pg;

        return JSON.stringify({
            list: list,
            page: pg,
            pagecount: pagecount,
            limit: 20,
            total: pagecount * 20
        });
    } catch (e) {
        console.error('category error', e.message);
        return JSON.stringify({ list: [], page: pg, pagecount: 0 });
    }
}

async function search(key, quick, pg) {
    pg = Number(pg) || 1;
    try {
        const encKey = encodeURIComponent(key);
        let url = `${HOST}/${LANG}/search?q=${encKey}&page=${pg}`;
        let html = await request(url);
        if (!html) {
            url = `${HOST}/${LANG}/category/${encKey}?page=${pg}`;
            html = await request(url);
        }
        if (!html) {
            return JSON.stringify({ list: [], page: pg, pagecount: 1, land: 1, ratio: 1.33 });
        }

        const list = extractVideos(html);
        let pagecount = getPageCount(html);
        if (pagecount < pg) pagecount = pg;

        return JSON.stringify({
            list: list,
            page: pg,
            pagecount: pagecount,
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
        let url;
        if (vodId.startsWith('http')) {
            url = vodId;
        } else if (vodId.startsWith('/')) {
            url = fixUrl(vodId);
        } else {
            url = `${HOST}/${LANG}/movie/${vodId}`;
        }

        const html = await request(url);
        if (!html) return JSON.stringify({ list: [] });

        let title = '';
        let titleMatch = html.match(/<h1[^>]*>(.*?)<\/h1>/);
        if (titleMatch) title = titleMatch[1].replace(/<[^>]+>/g, '').trim();
        if (!title) {
            titleMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/);
            if (titleMatch) title = titleMatch[1];
        }
        if (!title) title = vodId;

        let pic = '';
        let picMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/);
        if (picMatch) pic = picMatch[1];
        if (!pic) {
            picMatch = html.match(/<img[^>]*src="([^"]+)"[^>]*class="[^"]*object-cover[^"]*"/);
            if (picMatch) pic = picMatch[1];
        }
        pic = fixUrl(pic);

        let playUrl = '';

        // 从 __NEXT_DATA__ 提取 video.twimg.com 地址
        const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
        if (nextDataMatch) {
            try {
                const data = safeJson(nextDataMatch[1]);
                function findVideoUrl(obj) {
                    if (!obj) return null;
                    if (typeof obj === 'object' && !Array.isArray(obj)) {
                        for (const key of Object.keys(obj)) {
                            const value = obj[key];
                            if (key === 'url' && typeof value === 'string' && value.includes('video.twimg.com')) {
                                return value;
                            }
                            const result = findVideoUrl(value);
                            if (result) return result;
                        }
                    } else if (Array.isArray(obj)) {
                        for (const item of obj) {
                            const result = findVideoUrl(item);
                            if (result) return result;
                        }
                    }
                    return null;
                }
                playUrl = findVideoUrl(data) || '';
            } catch (e) {}
        }

        // 备用：直接正则找 mp4
        if (!playUrl) {
            const mp4Match = html.match(/(https:\/\/video\.twimg\.com\/[^\s"']+\.mp4[^\s"']*)/);
            if (mp4Match) playUrl = mp4Match[1];
        }

        // 再备用：video 标签
        if (!playUrl) {
            const videoMatch = html.match(/<video[^>]*src="([^"]+)"/);
            if (videoMatch) playUrl = videoMatch[1];
        }

        let playFrom = 'PeKtino';
        let playList = '';
        if (playUrl) {
            playList = '播放$' + playUrl;
        } else {
            playList = '网页播放$' + url;
        }

        const vod = {
            vod_id: vodId,
            vod_name: title,
            vod_pic: pic,
            vod_content: '',
            vod_play_from: playFrom,
            vod_play_url: playList
        };

        return JSON.stringify({ list: [vod] });
    } catch (e) {
        console.error('detail error', e.message);
        return JSON.stringify({ list: [] });
    }
}

async function play(flag, playId, flags) {
    try {
        if (!playId) {
            return JSON.stringify({ parse: 0, url: '', header: {} });
        }

        // 已经是完整视频地址
        if (playId.startsWith('http://') || playId.startsWith('https://')) {
            if (playId.includes('.mp4') || playId.includes('.m3u8')) {
                const headers = {
                    'User-Agent': UA,
                    'Accept': 'video/mp4,video/webm,video/*;q=0.8,*/*;q=0.5',
                    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                    'Connection': 'keep-alive'
                };
                if (playId.includes('video.twimg.com')) {
                    headers['Referer'] = 'https://x.com/';
                    headers['Origin'] = 'https://x.com';
                } else {
                    headers['Referer'] = HOST + '/';
                    headers['Origin'] = HOST;
                }
                return JSON.stringify({
                    parse: 0,
                    url: playId,
                    header: headers
                });
            }

            // 可能是详情页链接，尝试再提取一次
            const html = await request(playId);
            if (html) {
                const mp4Match = html.match(/(https:\/\/video\.twimg\.com\/[^\s"']+\.mp4[^\s"']*)/);
                if (mp4Match) {
                    return JSON.stringify({
                        parse: 0,
                        url: mp4Match[1],
                        header: {
                            'User-Agent': UA,
                            'Referer': 'https://x.com/',
                            'Origin': 'https://x.com',
                            'Accept': 'video/mp4,video/webm,video/*;q=0.8,*/*;q=0.5'
                        }
                    });
                }
            }
            // 兜底嗅探
            return JSON.stringify({
                parse: 1,
                url: playId,
                header: { 'Referer': HOST + '/' }
            });
        }

        // 相对路径
        const fullUrl = fixUrl(playId);
        return JSON.stringify({
            parse: 0,
            url: fullUrl,
            header: {
                'User-Agent': UA,
                'Referer': HOST + '/',
                'Origin': HOST
            }
        });
    } catch (e) {
        console.error('play error', e.message);
        return JSON.stringify({ parse: 0, url: playId || '', header: { 'User-Agent': UA } });
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
