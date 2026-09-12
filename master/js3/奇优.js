import { Crypto, _, cheerio } from 'assets://js/lib/cat.js';
let siteKey = '';
let siteType = 0;

const HOST = "http://www.qiyoudy4.com";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const DEFAULT_HEADERS = {
    "User-Agent": UA
};

const ignoreClassName = ['首页', '妹子', '伦理'];

async function request(url, optHeaders = {}, body) {
    try {
        const headers = Object.assign({}, DEFAULT_HEADERS, optHeaders);
        const res = await req(url, {
            method: body ? "POST" : "GET",
            headers: headers,
            timeout: 15000,
            data: body
        });
        return res?.content ?? "";
    } catch (e) {
        console.error("request error:", url, e?.message);
        return "";
    }
}

function safeJson(str) {
    try {
        if (!str) return null;
        return JSON.parse(str);
    } catch (e) {
        return null;
    }
}

function isIgnoreClassName(className) {
    for (let item of ignoreClassName) {
        if (className.indexOf(item) !== -1) return true;
    }
    return false;
}

async function init(cfg) {
    try {
        siteKey = cfg.skey;
        siteType = cfg.stype;
    } catch (e) {
        console.error("init error", e.message);
    }
}

async function home(filter) {
    try {
        const html = await request(HOST);
        const $ = cheerio.load(html);
        const classes = [];
        $('.stui-header__menu li a').each((idx, el) => {
            const name = $(el).text().trim();
            if (isIgnoreClassName(name)) return;
            const href = $(el).attr('href') || '';
            const m = href.match(/list\/(\d+)\.html/);
            if (m) {
                classes.push({
                    type_id: m[1],
                    type_name: name,
                    land: 1,
                    ratio: 1.33
                });
            }
        });
        return JSON.stringify({ class: classes, filters: {} });
    } catch (e) {
        console.error("home error", e.message);
        return JSON.stringify({ class: [], filters: {} });
    }
}

async function homeVod() {
    return JSON.stringify({ list: [] });
}

async function category(tid, pg, filter, ext) {
    pg = Number(pg) || 1;
    try {
        const url = `${HOST}/list/${tid}_${pg}.html`;
        const html = await request(url);
        const $ = cheerio.load(html);
        const list = [];
        $('.stui-vodlist__box').each((idx, el) => {
            const a = $(el).find('a');
            const vod_id = a.attr('href') || '';
            const vod_name = a.attr('title') || '';
            const vod_pic = a.attr('data-original') || '';
            const vod_remarks = $(el).find('span.pic-text').text().trim();
            list.push({
                vod_id: vod_id,
                vod_name: vod_name,
                vod_pic: vod_pic,
                vod_remarks: vod_remarks,
                style: { type: 'rect', ratio: 1.33 }
            });
        });
        return JSON.stringify({
            list: list,
            page: pg,
            pagecount: pg + 1,
            limit: 30,
            total: 9999
        });
    } catch (e) {
        console.error("category error", e.message);
        return JSON.stringify({ list: [], page: pg, pagecount: 0 });
    }
}

async function detail(vodId) {
    try {
        const url = HOST + vodId;
        const html = await request(url);
        const $ = cheerio.load(html);

        const vod_content = $('meta[property=og:description]').attr('content') || '';
        const vod_pic = $('.stui-vodlist__thumb img').attr('data-original') || '';
        const vod_name = $('.stui-vodlist__thumb').attr('title') || '';
        const vod_director = $('meta[property=og:video:director]').attr('content') || '';
        const vod_actor = $('meta[property=og:video:actor]').attr('content') || '';
        const vod_area = $('meta[property=og:area]').attr('content') || '';

        const playFromArr = [];
        const playUrlArr = [];
        $('.stui-content__playlist').each((index, el) => {
            if (index === 0) return;
            let epsStr = "";
            $(el).find('li a').each((_, aEl) => {
                const epName = $(aEl).text().trim();
                const epHref = $(aEl).attr('href') || '';
                epsStr += `${epName}$${epHref}#`;
            });
            playFromArr.push(`线路${index}`);
            playUrlArr.push(epsStr);
        });

        const vodObj = {
            vod_id: vodId,
            vod_name: vod_name,
            vod_pic: vod_pic,
            vod_year: "",
            vod_area: vod_area,
            vod_actor: vod_actor,
            vod_director: vod_director,
            vod_content: vod_content,
            vod_play_from: playFromArr.join("$$$"),
            vod_play_url: playUrlArr.join("$$$")
        };
        return JSON.stringify({ list: [vodObj] });
    } catch (e) {
        console.error("detail error", e.message);
        return JSON.stringify({ list: [] });
    }
}

async function play(flag, playId, flags) {
    try {
        const url = HOST + playId;
        const html = await request(url);
        const $ = cheerio.load(html);
        const iframeSrc = $('iframe').attr('src') || '';
        if (!iframeSrc) {
            return JSON.stringify({ parse: 1, url: playId, header: { "User-Agent": UA } });
        }
        const iframeHtml = await request(iframeSrc);
        const $$ = cheerio.load(iframeHtml);
        let realUrl = "";
        $$('script').each((_, scEl) => {
            const scText = $$(scEl).text();
            if (scText.includes('DPlayer')) {
                const m = scText.match(/vid="(.*?)";/);
                if (m) realUrl = m[1];
            }
        });
        if (!realUrl) {
            return JSON.stringify({ parse: 1, url: iframeSrc, header: { "User-Agent": UA, "Referer": HOST } });
        }
        return JSON.stringify({
            parse: 0,
            url: realUrl,
            header: { "User-Agent": UA, "Referer": HOST }
        });
    } catch (e) {
        console.error("play error", e.message);
        return JSON.stringify({ parse: 1, url: playId, header: { "User-Agent": UA } });
    }
}

async function search(key, quick, pg) {
    pg = Number(pg) || 1;
    try {
        const postBody = `searchword=${encodeURIComponent(key)}`;
        const html = await request(`${HOST}/search.php`, { "Content-Type": "application/x-www-form-urlencoded" }, postBody);
        const $ = cheerio.load(html);
        const list = [];
        $('.stui-vodlist__media > li').each((_, el) => {
            const a = $(el).find('a');
            const vod_id = a.attr('href') || '';
            const vod_name = a.attr('title') || '';
            const vod_pic = a.attr('data-original') || '';
            const vod_remarks = $(el).find('span.pic-text').text().trim();
            list.push({
                vod_id: vod_id,
                vod_name: vod_name,
                vod_pic: vod_pic,
                vod_remarks: vod_remarks,
                style: { type: 'rect', ratio: 1.33 }
            });
        });
        return JSON.stringify({
            list: list,
            page: pg,
            pagecount: pg + 1,
            limit: 30,
            total: 9999,
            land: 1,
            ratio: 1.33
        });
    } catch (e) {
        console.error("search error", e.message);
        return JSON.stringify({ list: [], page: pg, pagecount: 0, land: 1, ratio: 1.33 });
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