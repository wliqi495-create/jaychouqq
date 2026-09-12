import { Crypto, _ } from 'assets://js/lib/cat.js';
let siteKey = '';
let siteType = 0;
const HOST = "https://eacg1.com";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";
const DEFAULT_HEADERS = {
    "User-Agent": UA,
    "Referer": `${HOST}/`
};

async function request(url, optHeaders = {}) {
    try {
        const headers = Object.assign({}, DEFAULT_HEADERS, optHeaders);
        const res = await req(url, {
            method: "GET",
            headers: headers,
            timeout: 20000
        });
        return res?.content ?? "";
    } catch (e) {
        console.error("request error:", url, e?.message);
        return "";
    }
}

function safeJson(str) {
    try {
        if (!str || typeof str !== "string") return null;
        return JSON.parse(str);
    } catch (e) {
        return null;
    }
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
    const classes = [
        { type_id: "21", type_name: "日漫", land: 1, ratio: 1.33 },
        { type_id: "20", type_name: "国语动漫", land: 1, ratio: 1.33 },
        { type_id: "24", type_name: "剧场版", land: 1, ratio: 1.33 }
    ];
    return JSON.stringify({ class: classes, filters: {} });
}

async function homeVod() {
    const html = await request(`${HOST}/vodshow/21----------1---.html`);
    const $ = _(html);
    const list = [];
    $('.stui-vodlist__item').each((_, el) => {
        const a = $(el).find('.stui-vodlist__thumb').first();
        const href = a.attr('href') || '';
        const title = a.attr('title') || '';
        let pic = a.attr('data‑original') || a.attr('src') || '';
        if (pic.startsWith('//')) pic = 'https:' + pic;
        const remark = $(el).find('.pic‑text').text().trim() || '';
        if (href && title) {
            list.push({
                vod_id: href,
                vod_name: title,
                vod_pic: pic,
                vod_remarks: remark,
                style: { type: 'rect', ratio: 1.33 }
            });
        }
    });
    return JSON.stringify({ list: list.slice(0, 20) });
}

async function category(tid, pg, filter, ext) {
    pg = Number(pg) || 1;
    try {
        let url;
        if (tid === "24") {
            url = `${HOST}/vodclassification/24‑${pg}.html`;
        } else {
            url = `${HOST}/vodshow/${tid}----------${pg}---.html`;
        }
        const html = await request(url);
        const $ = _(html);
        const list = [];
        $('.stui‑vodlist__item').each((_, el) => {
            const a = $(el).find('.stui‑vodlist__thumb').first();
            const href = a.attr('href') || '';
            const title = a.attr('title') || '';
            let pic = a.attr('data‑original') || a.attr('src') || '';
            if (pic.startsWith('//')) pic = 'https:' + pic;
            const remark = $(el).find('.pic‑text').text().trim() || '';
            if (href && title) {
                list.push({
                    vod_id: href,
                    vod_name: title,
                    vod_pic: pic,
                    vod_remarks: remark,
                    style: { type: 'rect', ratio: 1.33 }
                });
            }
        });
        return JSON.stringify({
            list,
            page: pg,
            pagecount: pg + 1,
            limit: 20,
            total: 9999
        });
    } catch (e) {
        console.error("category error", e.message);
        return JSON.stringify({ list: [], page: pg, pagecount: 0 });
    }
}

async function search(key, quick, pg) {
    pg = Number(pg) || 1;
    try {
        const url = `${HOST}/vodsearch/${encodeURIComponent(key)}----------${pg}---.html`;
        const html = await request(url);
        const $ = _(html);
        const list = [];
        $('.stui‑vodlist__item').each((_, el) => {
            const a = $(el).find('.stui‑vodlist__thumb').first();
            const href = a.attr('href') || '';
            const title = a.attr('title') || '';
            let pic = a.attr('data‑original') || a.attr('src') || '';
            if (pic.startsWith('//')) pic = 'https:' + pic;
            const remark = $(el).find('.pic‑text').text().trim() || '';
            if (href && title) {
                list.push({
                    vod_id: href,
                    vod_name: title,
                    vod_pic: pic,
                    vod_remarks: remark,
                    style: { type: 'rect', ratio: 1.33 }
                });
            }
        });
        return JSON.stringify({
            list,
            page: pg,
            pagecount: pg + 1
        });
    } catch (e) {
        console.error("search error", e.message);
        return JSON.stringify({ list: [], page: pg, pagecount: 0 });
    }
}

async function detail(vodId) {
    try {
        let detailUrl = vodId.startsWith("http") ? vodId : HOST + vodId;
        const html = await request(detailUrl);
        const $ = _(html);
        const playArr = [];
        $('.stui‑content__playlist li a').each((_, el) => {
            const name = $(el).text().trim();
            const purl = $(el).attr('href') || '';
            if (purl) {
                playArr.push(`${name}$${purl}`);
            }
        });
        const vod_name = $('h1.title').text().trim() || "";
        let vod_pic = $('.stui‑content__thumb img').attr('data‑original') || $('.stui‑content__thumb img').attr('src') || '';
        if (vod_pic.startsWith('//')) vod_pic = 'https:' + vod_pic;
        const vod_content = $('.desc.detail').text().trim() || "";
        const vod = {
            vod_id: vodId,
            vod_name,
            vod_pic,
            vod_remarks: "",
            vod_year: "",
            vod_area: "",
            vod_actor: "",
            vod_director: "",
            vod_content,
            vod_play_from: "E‑ACG2",
            vod_play_url: playArr.join("#")
        };
        return JSON.stringify({ list: [vod] });
    } catch (e) {
        console.error("detail error", e.message);
        return JSON.stringify({ list: [] });
    }
}

async function play(flag, playId, flags) {
    try {
        let purl = playId.startsWith("http") ? playId : HOST + playId;
        return JSON.stringify({
            parse: 1,
            url: purl,
            header: {
                "User‑Agent": UA,
                "Referer": HOST + "/"
            }
        });
    } catch (e) {
        console.error("play error", e.message);
        return JSON.stringify({ parse: 1, url: playId, header: { "User‑Agent": UA } });
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