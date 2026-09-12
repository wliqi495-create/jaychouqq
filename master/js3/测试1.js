// 替换ES模块import为CommonJS require
const _ = require('./lib/cat.js');

let key = 'bookkan';
let url = 'https://api.bookan.com.cn';
let siteKey = '';
let siteType = 0;

async function request(reqUrl, agentSp) {
    try {
        let res = await req(reqUrl, {
            method: 'get',
        });
        // 判断返回内容
        if (!res || !res.content) return '{}';
        return res.content;
    } catch (e) {
        console.log("请求异常:", reqUrl, e.message);
        return '{}';
    }
}

// cfg = {skey: siteKey, ext: extend}
async function init(cfg) {
    siteKey = cfg.skey;
    siteType = cfg.stype;
}

async function home(filter) {
    return JSON.stringify({
        class: [
            { type_id: '1305', type_name: '少年读物' },
            { type_id: '1304', type_name: '儿童文学' },
            { type_id: '1320', type_name: '国学经典' },
            { type_id: '1306', type_name: '文艺少年' },
            { type_id: '1309', type_name: '育儿心经' },
            { type_id: '1310', type_name: '心理哲学' },
            { type_id: '1307', type_name: '青春励志' },
            { type_id: '1312', type_name: '历史小说' },
            { type_id: '1303', type_name: '故事会' },
            { type_id: '1317', type_name: '音乐戏剧' },
            { type_id: '1319', type_name: '相声评书' },
        ],
    });
}

async function category(tid, pg, filter, extend) {
    pg = pg || 1;
    if (pg == 0) pg = 1;
    let content = await request(`${url}/voice/book/list?instance_id=25304&page=${pg}&category_id=${tid}&num=24`);
    let data;
    try {
        const json = JSON.parse(content);
        data = json?.data || {};
    } catch (err) {
        data = { list: [], current_page: 1, last_page: 0, total: 0 };
    }
    const list = Array.isArray(data.list) ? data.list : [];
    let books = [];
    for (const book of list) {
        books.push({
            book_id: book.id || '',
            book_name: book.name || '未知书名',
            book_pic: book.cover || '',
            book_remarks: book?.extra?.author || '',
        });
    }
    return JSON.stringify({
        page: data.current_page || 1,
        pagecount: data.last_page || 0,
        limit: 24,
        total: data.total || 0,
        list: books,
    });
}

async function detail(id) {
    // 先拿第1页
    let allList = [];
    let page = 1;
    const num = 200;
    while (true) {
        let content = await request(`${url}/voice/album/units?album_id=${id}&page=${page}&num=${num}&order=1`);
        let json;
        try {
            json = JSON.parse(content);
        } catch (e) {
            break;
        }
        const data = json?.data || {};
        const subList = Array.isArray(data.list) ? data.list : [];
        if (subList.length === 0) break;
        allList = allList.concat(subList);
        // 判断是否还有下一页
        if (page >= data.last_page) break;
        page++;
    }

    let book = {
        book_id: id,
        type_name: '',
        book_year: '',
        book_area: '',
        book_remarks: '',
        book_actor: '',
        book_director: '',
        book_content: '',
    };
    let us = _.map(allList, function (b) {
        return formatPlayUrl(b.title || '') + '$' + (b.file || '');
    }).join('#');
    book.volumes = '书卷';
    book.urls = us;
    return JSON.stringify({
        list: [book],
    });
}

function formatPlayUrl(name) {
    return name
        .trim()
        .replace(/<|>|《|》/g, '')
        .replace(/\$|#/g, ' ')
        .trim();
}

async function proxy(segments, headers) {
    return "";
}

async function play(flag, id, flags) {
    return JSON.stringify({
        parse: 0,
        url: id,
    });
}

async function search(wd, quick, pg) {
    pg = pg || 1;
    if (pg == 0) pg = 1;
    // 关键词url编码修复中文搜索
    const keyword = encodeURIComponent(wd);
    let content = await request(`https://es.bookan.com.cn/api/v3/voice/book?instanceId=25304&keyword=${keyword}&pageNum=${pg}&limitNum=20`);
    let data;
    try {
        const json = JSON.parse(content);
        data = json?.data || {};
    } catch (err) {
        data = { list: [], current_page: 1, last_page: 0, total: 0 };
    }
    const list = Array.isArray(data.list) ? data.list : [];
    let books = [];
    for (const book of list) {
        books.push({
            book_id: book.id || '',
            book_name: book.name || '未知书名',
            book_pic: book.cover || '',
            book_remarks: book?.extra?.author || '',
        });
    }
    return JSON.stringify({
        page: data.current_page || 1,
        pagecount: data.last_page || 0,
        limit: 20,
        total: data.total || 0,
        list: books,
    });
}

// 替换ES模块export为CommonJS module.exports
module.exports = {
    init: init,
    home: home,
    category: category,
    detail: detail,
    play: play,
    search: search,
};
