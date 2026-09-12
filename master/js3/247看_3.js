const host = 'https://247kan.com';
const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'sec-ch-ua': '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'Referer': host
};

// 数字ID到中文分类名的映射
const categoryNameMap = {
    '1': '电影',
    '2': '连续剧',
    '3': '综艺',
    '4': '动漫',
    '5': '短剧',
    '6': '纪录片'
};

function fixUrl(path) {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return host + (path.startsWith('/') ? '' : '/' + path);
}

async function init(cfg) { return JSON.stringify({}); }

async function home(filter) {
    try {
        const classes = [
            { type_id: '1', type_name: '电影' },
            { type_id: '2', type_name: '连续剧' },
            { type_id: '3', type_name: '综艺' },
            { type_id: '4', type_name: '动漫' },
            { type_id: '5', type_name: '短剧' },
            { type_id: '6', type_name: '纪录片' }
        ];
        return JSON.stringify({ class: classes });
    } catch (e) { return JSON.stringify({ class: [] }); }
}

async function homeVod() {
    try {
        const r = await req(host + '/api/home', { headers });
        const json = JSON.parse(r.content);
        const data = json.data || {};
        const videos = data.featured || data.latest || [];
        const list = videos.map(item => ({
            vod_id: String(item.vod_id),
            vod_name: item.vod_name || '',
            vod_pic: fixUrl(item.vod_pic),
            vod_remarks: item.vod_remarks || ''
        }));
        return JSON.stringify({ list });
    } catch (e) { return JSON.stringify({ list: [] }); }
}

async function category(tid, pg, filter, extend = {}) {
    try {
        const page = parseInt(pg) || 1;
        const categoryName = categoryNameMap[tid] || '电影';
        
        if (page === 1) {
            // 第一页：使用 /api/home 中的分类数据，保证准确
            const r = await req(host + '/api/home', { headers });
            const json = JSON.parse(r.content);
            const data = json.data || {};
            const categories = data.categories || [];
            let videos = [];
            for (let cat of categories) {
                if (String(cat.type_id) === String(tid)) {
                    videos = cat.videos || [];
                    break;
                }
            }
            if (videos.length === 0) videos = data.featured || data.latest || [];
            const list = videos.map(item => ({
                vod_id: String(item.vod_id),
                vod_name: item.vod_name || '',
                vod_pic: fixUrl(item.vod_pic),
                vod_remarks: item.vod_remarks || ''
            }));
            // 为了允许下拉尝试，第一页返回 pagecount=2 或更大
            return JSON.stringify({ page: 1, pagecount: 2, limit: list.length, total: list.length, list });
        } else {
            // 翻页：利用搜索接口，以分类名作为搜索词，实现分页
            const searchUrl = `${host}/api/videos?search=${encodeURIComponent(categoryName)}&page=${page}&limit=20`;
            const r = await req(searchUrl, { headers });
            const json = JSON.parse(r.content);
            const data = json.data || {};
            const videos = data.videos || [];
            const list = videos.map(item => ({
                vod_id: String(item.vod_id),
                vod_name: item.vod_name || '',
                vod_pic: fixUrl(item.vod_pic),
                vod_remarks: item.vod_remarks || ''
            }));
            const total = data.pagination?.total || data.total || 0;
            const pagecount = Math.ceil(total / 20) || 1;
            return JSON.stringify({ page, pagecount, limit: list.length, total, list });
        }
    } catch (e) {
        return JSON.stringify({ page: pg || 1, pagecount: 0, list: [] });
    }
}

async function detail(id) {
    try {
        let detailId = String(id).match(/(\d+)/)?.[0] || id;
        const url = `${host}/api/videos/${detailId}`;
        const r = await req(url, { headers });
        const json = JSON.parse(r.content);
        const data = json.data || {};

        let playFrom = [];
        let playUrl = [];

        if (data.episodes && Array.isArray(data.episodes)) {
            const routeMap = new Map();
            data.episodes.forEach(ep => {
                const route = ep.route || '默认线路';
                if (!routeMap.has(route)) routeMap.set(route, []);
                routeMap.get(route).push({
                    name: ep.name || `第${ep.episode}集`,
                    url: ep.url
                });
            });

            playFrom = Array.from(routeMap.keys());
            playUrl = playFrom.map(route => {
                const episodes = routeMap.get(route);
                episodes.sort((a, b) => {
                    const aNum = parseInt(a.name.match(/(\d+)/)?.[1] || '0');
                    const bNum = parseInt(b.name.match(/(\d+)/)?.[1] || '0');
                    return aNum - bNum;
                });
                return episodes.map(ep => `${ep.name}$${ep.url}`).join('#');
            });
        }

        if (playFrom.length === 0) {
            playFrom = data.vod_play_from ? data.vod_play_from.split('$$$') : ['默认线路'];
            playUrl = data.vod_play_url ? [data.vod_play_url] : [''];
        }

        const vodInfo = {
            vod_id: String(data.vod_id || detailId),
            vod_name: data.vod_name || '',
            vod_pic: fixUrl(data.vod_pic),
            vod_content: data.vod_content || '',
            vod_actor: data.vod_actor || '',
            vod_director: data.vod_director || '',
            vod_year: data.vod_year || '',
            vod_area: data.vod_area || '',
            vod_remarks: data.vod_remarks || '',
            type_name: data.type_name || '',
            vod_play_from: playFrom.join('$$$'),
            vod_play_url: playUrl.join('$$$')
        };
        return JSON.stringify({ list: [vodInfo] });
    } catch (e) { return JSON.stringify({ list: [] }); }
}

async function search(wd, quick, pg = 1) {
    try {
        const page = parseInt(pg) || 1;
        const url = `${host}/api/videos?page=${page}&limit=20&search=${encodeURIComponent(wd)}`;
        const r = await req(url, { headers });
        const json = JSON.parse(r.content);
        const data = json.data || {};
        const videos = data.videos || [];
        const list = videos.map(item => ({
            vod_id: String(item.vod_id),
            vod_name: item.vod_name || '',
            vod_pic: fixUrl(item.vod_pic),
            vod_remarks: item.vod_remarks || ''
        }));
        const total = data.pagination?.total || data.total || list.length;
        const pagecount = Math.ceil(total / 20) || 1;
        return JSON.stringify({ page, pagecount, list });
    } catch (e) { return JSON.stringify({ page: pg, list: [] }); }
}

async function play(flag, id, flags) {
    try {
        let playUrl = id;
        if (!playUrl.startsWith('http')) playUrl = host + (playUrl.startsWith('/') ? '' : '/' + playUrl);
        if (/\.(m3u8|mp4|flv|m4s)(\?.*)?$/i.test(playUrl)) {
            return JSON.stringify({ parse: 0, url: playUrl, header: headers });
        }
        const r = await req(playUrl, { headers });
        const m3u8Match = r.content.match(/"url":"([^"]+\.m3u8)"/) || r.content.match(/"src":"([^"]+\.m3u8)"/);
        if (m3u8Match) {
            return JSON.stringify({ parse: 0, url: m3u8Match[1].replace(/\\/g, ''), header: headers });
        }
        return JSON.stringify({ parse: 1, url: playUrl, header: headers });
    } catch (e) { return JSON.stringify({ parse: 0, url: id }); }
}

export default { init, home, homeVod, category, detail, search, play };