/**
 * 低端影视 - 适配 server.js 最终修正版
 */

const baseUrl = 'https://www.ddys.run';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function init(cfg) { return ""; }

/**
 * 首页分类 - 还原数字 ID
 */
async function home() {
    return {
        class: [
            { type_id: "1", type_name: "电影" },
            { type_id: "2", type_name: "电视剧" },
            { type_id: "4", type_name: "动漫" },
            { type_id: "3", type_name: "纪录片" }
        ],
        filters: {}
    };
}

async function homeVod() { return { list: [] }; }

/**
 * 分类列表 - 严格 8 横杠对齐日志成功记录
 */
async function category(tid, pg, filter, extend) {
    // 严格按照你日志成功的记录：tid 后面跟 8 个横杠，pg 后面跟 3 个横杠
    // 格式：/list/1--------1---.html
    const url = `${baseUrl}/list/${tid}--------${pg}---.html`;
    
    const response = await req(url, {
        headers: { 
            'User-Agent': UA,
            'Referer': baseUrl + '/'
        }
    });

    const html = response.content;
    if (!html) return { list: [] };

    // 尝试解析列表：兼容 stui 模板和新版文章模板
    const cards = pdfa(html, '.stui-vodlist__box, .post-box, article, .m-item');
    
    const list = cards.map(item => {
        let vId = pdfh(item, 'a&&href');
        if (vId && !vId.startsWith('http')) vId = baseUrl + vId;

        // 图片修复：依次尝试 data-original, data-src, src
        let pic = pdfh(item, 'img&&data-original') || 
                  pdfh(item, '.stui-vodlist__thumb&&data-original') || 
                  pdfh(item, 'img&&data-src') || 
                  pdfh(item, 'img&&src');

        // 标题修复
        let name = pdfh(item, 'h2&&Text') || 
                   pdfh(item, '.title&&Text') || 
                   pdfh(item, 'a&&title') || 
                   pdfh(item, 'img&&alt');

        return {
            vod_name: name ? name.trim() : "未知",
            vod_pic: pic,
            vod_remarks: pdfh(item, '.pic-text&&Text') || pdfh(item, '.post-date&&Text') || "",
            vod_id: vId
        };
    }).filter(it => it.vod_id && it.vod_id.includes('http'));

    return {
        page: parseInt(pg),
        pagecount: list.length >= 10 ? (parseInt(pg) + 1) : parseInt(pg),
        limit: 20,
        total: 999,
        list: list
    };
}

/**
 * 详情页
 */
async function detail(id) {
    const vodId = Array.isArray(id) ? id[0] : id;
    const response = await req(vodId, { headers: { 'User-Agent': UA, 'Referer': baseUrl + '/' } });
    const html = response.content;
    
    const title = pdfh(html, 'h1&&Text') || pdfh(html, '.post-title&&Text');
    const pic = pdfh(html, '.post-content img&&src') || pdfh(html, '.stui-content__thumb img&&src');
    
    const items = pdfa(html, '.post-content a[href*="/v/"], .stui-content__playlist li a');
    const episodes = items.map(it => {
        const name = pdfh(it, 'a&&Text');
        let href = pdfh(it, 'a&&href');
        if (href && !href.startsWith('http')) href = baseUrl + href;
        return `${name.trim()}$${href}`;
    });

    return {
        list: [{
            vod_id: vodId,
            vod_name: title ? title.trim() : "未知",
            vod_pic: pic,
            vod_play_from: '低端影视',
            vod_play_url: episodes.length > 0 ? episodes.join('#') : `立即播放$${vodId}`,
            vod_content: pdfh(html, '.post-content p&&Text') || ""
        }]
    };
}

/**
 * 搜索
 */
async function search(wd, quick, pg) {
    const url = `${baseUrl}/?s=${encodeURIComponent(wd)}`;
    const response = await req(url, { headers: { 'User-Agent': UA } });
    const html = response.content;
    const list = pdfa(html, '.post-box, article').map(item => {
        let vId = pdfh(item, 'a&&href');
        if (vId && !vId.startsWith('http')) vId = baseUrl + vId;
        return {
            vod_name: pdfh(item, 'h2&&Text') || pdfh(item, 'a&&title'),
            vod_pic: pdfh(item, 'img&&src'),
            vod_id: vId
        };
    });
    return { list: list };
}

/**
 * 播放
 */
async function play(flag, id, flags) {
    return {
        parse: 1,
        url: id,
        header: { 'User-Agent': UA, 'Referer': baseUrl + '/' }
    };
}

export default { init, home, homeVod, category, detail, search, play };
