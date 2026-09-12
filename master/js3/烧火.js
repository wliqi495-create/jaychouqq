import { Crypto, _ } from 'assets://js/lib/cat.js';
let siteKey = '';
let siteType = 0;
const HOST = "https://saohuo.tv";
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const DEFAULT_HEADERS = {
    "User-Agent": UA,
    "Referer": `${HOST}/`,
    "Accept-Language": "zh-CN,zh;q=0.9"
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
        if (!str) return null;
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
        {type_id:"1",type_name:"电影",land:1,ratio:1.33},
        {type_id:"2",type_name:"电视剧",land:1,ratio:1.33},
        {type_id:"20",type_name:"大陆剧",land:1,ratio:1.33},
        {type_id:"21",type_name:"TVB",land:1,ratio:1.33},
        {type_id:"22",type_name:"韩剧",land:1,ratio:1.33},
        {type_id:"23",type_name:"美剧",land:1,ratio:1.33},
        {type_id:"24",type_name:"日剧",land:1,ratio:1.33},
        {type_id:"25",type_name:"英剧",land:1,ratio:1.33},
        {type_id:"26",type_name:"台剧",land:1,ratio:1.33},
        {type_id:"27",type_name:"其它剧",land:1,ratio:1.33},
        {type_id:"6",type_name:"喜剧",land:1,ratio:1.33},
        {type_id:"7",type_name:"爱情",land:1,ratio:1.33},
        {type_id:"8",type_name:"恐怖",land:1,ratio:1.33},
        {type_id:"9",type_name:"动作",land:1,ratio:1.33},
        {type_id:"10",type_name:"科幻",land:1,ratio:1.33},
        {type_id:"11",type_name:"战争",land:1,ratio:1.33},
        {type_id:"12",type_name:"犯罪",land:1,ratio:1.33},
        {type_id:"13",type_name:"动画",land:1,ratio:1.33},
        {type_id:"14",type_name:"奇幻",land:1,ratio:1.33},
        {type_id:"15",type_name:"剧情",land:1,ratio:1.33},
        {type_id:"16",type_name:"冒险",land:1,ratio:1.33},
        {type_id:"17",type_name:"悬疑",land:1,ratio:1.33},
        {type_id:"18",type_name:"惊悚",land:1,ratio:1.33},
        {type_id:"19",type_name:"其它",land:1,ratio:1.33}
    ];
    return JSON.stringify({ class: classes, filters: {} });
}

async function homeVod() {
    // 首页推荐，取第一分类第一页数据做首页轮播
    const html = await request(`${HOST}/list/1-1.html`);
    const list = [];
    const $ = _(html);
    $(".v_list .v_img").each((i, el) => {
        if(i >= 20) return;
        const a = $(el).find("a").first();
        list.push({
            vod_id: a.attr("href") || "",
            vod_name: a.attr("title") || "",
            vod_pic: $(el).find("img").attr("data-original") || "",
            vod_remarks: $(el).find(".v_note").text() || "",
            style: { type: 'rect', ratio:1.33 }
        })
    })
    return JSON.stringify({ list });
}

async function category(tid, pg, filter, ext) {
    pg = Number(pg) || 1;
    try {
        const html = await request(`${HOST}/list/${tid}-${pg}.html`);
        const list = [];
        const $ = _(html);
        $(".v_list .v_img").each((i, el) => {
            const a = $(el).find("a").first();
            list.push({
                vod_id: a.attr("href") || "",
                vod_name: a.attr("title") || "",
                vod_pic: $(el).find("img").attr("data-original") || "",
                vod_remarks: $(el).find(".v_note").text() || "",
                style: { type: 'rect', ratio:1.33 }
            })
        })
        return JSON.stringify({
            list,
            page: pg,
            pagecount: pg + 1,
            limit: 20,
            total: 9999
        });
    } catch (e) {
        console.error("category error", e.message);
        return JSON.stringify({ list:[], page:pg, pagecount:0 });
    }
}

async function search(key, quick, pg) {
    pg = Number(pg) || 1;
    try {
        const html = await request(`${HOST}/s----------.html?wd=${encodeURIComponent(key)}`);
        const list = [];
        const $ = _(html);
        $(".v_list .v_img").each((i, el) => {
            const a = $(el).find("a").first();
            list.push({
                vod_id: a.attr("href") || "",
                vod_name: a.attr("title") || "",
                vod_pic: $(el).find("img").attr("data-original") || "",
                vod_remarks: $(el).find(".v_note").text() || "",
                style: { type: 'rect', ratio:1.33 }
            })
        })
        return JSON.stringify({ list, page:pg, pagecount:pg+1 });
    } catch (e) {
        console.error("search error", e.message);
        return JSON.stringify({ list:[], page:pg, pagecount:0 });
    }
}

async function detail(vodId) {
    try {
        const detailUrl = vodId.startsWith("http") ? vodId : HOST + vodId;
        const html = await request(detailUrl);
        const $ = _(html);
        const playArr = [];
        // 提取播放列表集数，li里面a标签，原规则play.list:"li.current a"
        $("ul.play-list li a").each((i, el) => {
            const epName = $(el).text().trim();
            const epHref = $(el).attr("href");
            if(epHref) playArr.push(`${epName}$${epHref}`);
        });
        // 倒序和原type2配置reverse:true保持一致
        playArr.reverse();

        const vod_name = $("h1").text().trim();
        const vod_content = $(".v_info_box p").text().trim();
        const vod = {
            vod_id: vodId,
            vod_name,
            vod_pic: "",
            vod_remarks: "",
            vod_year: "",
            vod_area: "",
            vod_actor: "",
            vod_director: "",
            vod_content,
            vod_play_from: "骚火",
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
        let purl = playId.startsWith("http") ? playId : HOST + playId;
        // parse:1 交给内置网页解析器解析页面内视频
        return JSON.stringify({
            parse: 1,
            url: purl,
            header: {
                "User-Agent": UA,
                "Referer": HOST + "/"
            }
        });
    } catch (e) {
        console.error("play error", e.message);
        return JSON.stringify({ parse:1, url:playId, header:{User‑Agent:UA} });
    }
}

export function __jsEvalReturn() {
    return { init, home, homeVod, category, detail, search, play };
}