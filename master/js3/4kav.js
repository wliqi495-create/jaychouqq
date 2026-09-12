import { Crypto, _ } from 'assets://js/lib/cat.js';
let siteKey = '';
let siteType = 0;
const HOST = "https://4k-av.com";
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1";
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
    const html = await request(HOST);
    const $ = _(html);
    const classes = [];
    classes.push({ type_id: HOST, type_name: "最新", land: 1, ratio: 1.33 });
    $('#cate_list li a').each((_, el) => {
        const name = $(el).text().trim();
        const href = $(el).attr('href') || "";
        // 过滤忽略分类
        if(name.includes("首页") || name.includes("AV")) return;
        const tid = HOST + href;
        classes.push({ type_id: tid, type_name: name, land: 1, ratio: 1.33 });
    })
    return JSON.stringify({ class: classes, filters: {} });
}

async function homeVod() {
    const html = await request(HOST);
    const $ = _(html);
    const list = [];
    $('#MainContent_newestlist .virow .NTMitem').each((_, el) => {
        const vodName = $(el).find('.title h2').text().trim();
        const vodPic = $(el).find('.poster img').attr('src') || "";
        const vodUrl = $(el).find('.title a').attr('href') || "";
        if(vodUrl && vodName){
            list.push({
                vod_id: HOST + vodUrl,
                vod_name: vodName,
                vod_pic: vodPic,
                vod_remarks: "",
                style: { type: 'rect', ratio: 1.33 }
            })
        }
    })
    return JSON.stringify({ list: list.slice(0,20) });
}

async function category(tid, pg, filter, ext) {
    pg = Number(pg) || 1;
    try {
        // 获取总页数
        const firstHtml = await request(tid);
        const $first = _(firstHtml);
        let pageText = $first('#MainContent_header_nav .page-number').text().trim();
        let maxPage = 1;
        if(pageText.includes('/')){
            maxPage = parseInt(pageText.split('/')[1]) || 1;
        }
        // tv/movie/home 倒序页码
        let realPage;
        if(tid.includes('/tv')){
            realPage = maxPage - pg + 1;
        }else if(tid.includes('/movie')){
            realPage = maxPage - pg + 1;
        }else{
            realPage = maxPage - pg + 1;
        }
        if(realPage < 1) realPage = 1;
        const listUrl = tid + `page-${realPage}.html`;
        const html = await request(listUrl);
        const $ = _(html);
        const list = [];
        $('#MainContent_newestlist .virow .NTMitem').each((_, el) => {
            const vodName = $(el).find('.title h2').text().trim();
            const vodPic = $(el).find('.poster img').attr('src') || "";
            const vodUrl = $(el).find('.title a').attr('href') || "";
            if(vodUrl && vodName){
                list.push({
                    vod_id: HOST + vodUrl,
                    vod_name: vodName,
                    vod_pic: vodPic,
                    vod_remarks: "",
                    style: { type: 'rect', ratio: 1.33 }
                })
            }
        })
        return JSON.stringify({
            list,
            page: pg,
            pagecount: pg + 1,
            limit:20,
            total:9999
        })
    } catch (e) {
        console.error("category error", e.message);
        return JSON.stringify({ list:[], page:pg, pagecount:0 })
    }
}

async function search(key, quick, pg) {
    pg = Number(pg) ||1;
    try {
        const url = `${HOST}/s?q=${encodeURIComponent(key)}`;
        const html = await request(url);
        const $ = _(html);
        const list = [];
        $('#MainContent_newestlist .virow .NTMitem').each((_, el) => {
            const vodName = $(el).find('.title h2').text().trim();
            const vodPic = $(el).find('.poster img').attr('src') || "";
            const vodUrl = $(el).find('.title a').attr('href') || "";
            if(vodUrl && vodName){
                list.push({
                    vod_id: HOST + vodUrl,
                    vod_name: vodName,
                    vod_pic: vodPic,
                    vod_remarks: "",
                    style: { type: 'rect', ratio: 1.33 }
                })
            }
        })
        return JSON.stringify({
            list,
            page: pg,
            pagecount: pg +1
        })
    } catch (e) {
        console.error("search error", e.message);
        return JSON.stringify({ list:[], page:pg, pagecount:0 })
    }
}

async function detail(vodId) {
    try {
        const html = await request(vodId);
        const $ = _(html);
        let vod_content = $('.cnline').text().trim() || '';
        let vod_pic = $('#MainContent_poster img').attr('src') || '';
        let vod_name = $('#MainContent_titleh12 div').text().split('/')[0].replace(/第.*集/,'').trim() || '';
        const playArr = [];
        const isTV = $('#rtlist li').length >0;
        if(isTV){
            $('#rtlist li').each((_,el)=>{
                const name = $(el).find('span').text().trim();
                let epUrl = $(el).find('img').attr('src') || '';
                epUrl = epUrl.replace('screenshot.jpg','');
                playArr.push(`${name}$${epUrl}`);
            })
        }else{
            playArr.push(`播放$${vodId}`);
        }
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
            vod_play_from: "4k‑av",
            vod_play_url: playArr.join("#")
        };
        return JSON.stringify({ list:[vod] });
    } catch (e) {
        console.error("detail error", e.message);
        return JSON.stringify({ list:[] });
    }
}

async function play(flag, playId, flags) {
    try {
        // 两种情况：一是直接视频源url，二是详情页url需要解析source
        let purl = playId.replace('www.','');
        const html = await request(purl);
        const $ = _(html);
        let realUrl = $('#MainContent_videowindow video source').attr('src') || "";
        if(realUrl){
            return JSON.stringify({
                parse:0,
                url: realUrl,
                header:{
                    "User‑Agent":UA,
                    "Referer":HOST+"/"
                }
            })
        }else{
            return JSON.stringify({
                parse:1,
                url: purl,
                header:{
                    "User‑Agent":UA,
                    "Referer":HOST+"/"
                }
            })
        }
    } catch (e) {
        console.error("play error", e.message);
        return JSON.stringify({ parse:1, url:playId, header:{ "User‑Agent":UA } });
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