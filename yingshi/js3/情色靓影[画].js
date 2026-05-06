let host = 'https://www.cool18.com/bbs2';

const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
    'Referer': host,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
};

let DEBUG = true;
function dlog(...args) {
    try { if (DEBUG) console.log('[COOL18_PIC]', ...args); } catch (e) {}
}

async function init(cfg) {
    try {
        const ext = cfg?.ext;
        if (typeof ext === 'string' && /^https?:\/\//.test(ext)) {
            host = ext.replace(/\/+$/, '');
            headers.Referer = host;
        }
        if (typeof cfg?.debug === 'boolean') DEBUG = cfg.debug;
    } catch (e) {}
}

function toAbs(url = '') {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith('//')) return 'https:' + url;
    return host + (url.startsWith('/') ? '' : '/') + url;
}

function stripHtml(s = '') {
    return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

// ====================== 列表解析（恢复宽松匹配 + 过滤） ======================
function parseListByRegex(html) {
    const list = [];
    const seen = new Set();

    // 1. 恢复最稳健的匹配模式：只抓取链接和标题内容
    const reg = /<a\s+href=["']([^"']*?act=threadview&tid=\d+[^"']*?)["'][^>]*>([\s\S]*?)<\/a>/gi;
    
    let m;
    while ((m = reg.exec(html)) !== null) {
        let link = m[1].replace(/&amp;/g, '&');
        let rawTitle = m[2];
        let name = stripHtml(rawTitle);

        // 2. 过滤：如果是 HTML 模式，检查标题是否包含 (0 bytes) 或 “点“赞””
        if (rawTitle.includes('（0 bytes）') || name.includes('点“赞”') || name.includes('(无内容)')) {
            continue;
        }

        name = name.replace(/-\s*a_yong_cn|-\s*作者.*|（\d+\s*bytes）|\(\d+\s*reads\)/gi, '')
                   .replace(/\s{2,}/g, ' ')
                   .trim();

        if (!link || !name || name.length < 6) continue;

        const vod_id = toAbs(link);
        if (seen.has(vod_id)) continue;
        seen.add(vod_id);

        list.push({
            vod_id,
            vod_name: name,
            vod_pic: '',
            style: {"type": "list"},
            vod_remarks: ''
        });
    }

    dlog(`列表解析完成，共提取到 ${list.length} 条有效帖子`);
    return list;
}

// ====================== 动态加载更多（严格过滤 size: 0） ======================
async function loadMorePosts(lastTid) {
    try {
        if (!lastTid) return [];
        
        const url = `${host}/index.php?app=forum&act=ajax&mtid=${lastTid}&aifilter=0`;
        dlog(`[动态加载] 请求 mtid=${lastTid}`);

        const res = await req(url, {
            headers: {
                ...headers,
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json, text/javascript, */*; q=0.01'
            }
        });

        if (!res.content) return [];

        let json = typeof res.content === 'string' ? JSON.parse(res.content) : res.content;
        if (!Array.isArray(json)) return [];

        return json
            .filter(item => {
                // 过滤：size 为 "0" 的帖子直接舍弃
                const size = parseInt(item.size || "0");
                return size > 0;
            })
            .map(item => {
                const link = `index.php?app=forum&act=threadview&tid=${item.tid}`;
                return {
                    vod_id: toAbs(link),
                    vod_name: stripHtml(item.subject || '').trim(),
                    vod_pic: '',
                    vod_remarks: item.dateline || ''
                };
            });
    } catch (e) {
        dlog('[动态加载] 失败', String(e));
        return [];
    }
}

async function home(filter) {
    return JSON.stringify({
        class: [{ type_id: 'all', type_name: '全部帖子' }]
    });
}

async function homeVod() {
    try {
        const cleanUrl = `${host}/index.php`;
        let allList = [];
        const res = await req(cleanUrl, { headers });
        const html = res.content || '';

        if (html) {
            allList = parseListByRegex(html);
        }

        // 尝试自动加载下一页以填充首屏
        if (allList.length > 0) {
            const lastItem = allList[allList.length - 1];
            const match = lastItem.vod_id.match(/tid=(\d+)/);
            if (match) {
                const more = await loadMorePosts(match[1]);
                allList = allList.concat(more);
            }
        }

        const idSet = new Set();
        const unique = allList.filter(item => {
            if (idSet.has(item.vod_id)) return false;
            idSet.add(item.vod_id);
            return true;
        });

        return JSON.stringify({ list: unique });
    } catch (e) {
        return JSON.stringify({ list: [] });
    }
}

async function category(tid, pg, filter, extend) {
    if (tid === 'all') {
        // 当 pg > 1 时，影视壳通常希望看到新数据
        return homeVod(); 
    }
    return JSON.stringify({ page: 1, list: [] });
}

async function search(wd, quick, pg) {
    try {
        const url = `${host}/index.php?action=search&act=threadsearch&app=forum&keywords=${encodeURIComponent(wd)}`;
        const res = await req(url, { headers });
        const list = parseListByRegex(res.content || '');
        return JSON.stringify({ page: 1, list });
    } catch (e) {
        return JSON.stringify({ page: 1, list: [] });
    }
}

function parseDetailByRegex(html, id) {
    let vod_name = stripHtml((html.match(/<title>([^<|]+)/i) || [,''])[1]);
    vod_name = vod_name.replace(/ - 情色靓影.*/i, '').trim() || '未知标题';

    const eps = [];
    const seenImg = new Set();
    const patterns = [
        /data-original=["']([^"']+?\.(?:jpg|jpeg|png|gif|webp))["']/gi,
        /data-src=["']([^"']+?\.(?:jpg|jpeg|png|gif|webp))["']/gi,
        /src=["']([^"']+?\.(?:jpg|jpeg|png|gif|webp))["']/gi
    ];

    for (const reg of patterns) {
        let m;
        while ((m = reg.exec(html)) !== null) {
            let imgUrl = toAbs(m[1].trim());
            if (seenImg.has(imgUrl) || imgUrl.includes('avatar') || imgUrl.includes('logo') || imgUrl.length < 20) continue;
            seenImg.add(imgUrl);
//            eps.push(`图${eps.length + 1}$${imgUrl}`);
            eps.push(`${imgUrl}`);
        }
    }

    return {
        vod_id: id,
        vod_name,
        vod_pic: eps.length ? eps[0].split('$')[1] : '',
        vod_remarks: eps.length + 'P',
        vod_content: stripHtml(html).substring(0, 300),
        type_name: '图集',
        vod_play_from: 'Cool18',
        vod_play_url: "pics://" + eps.join('&&')
    };
}

async function detail(id) {
    try {
        const res = await req(toAbs(id), { headers });
        const vod = parseDetailByRegex(res.content || '', id);
        return JSON.stringify({ list: [vod] });
    } catch (e) {
        return JSON.stringify({ list: [] });
    }
}

async function play(flag, id, flags) {
    return JSON.stringify({ parse: 0, url: id, header: {} });
}

export function __jsEvalReturn() {
    return {
        init,
        home,
        homeVod,
        category,
        search,
        detail,
        play
    };
}
