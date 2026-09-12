import { Crypto, _ } from 'assets://js/lib/cat.js';
let siteKey = '';
let siteType = 0;
const HOST = "https://libvio.mov";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
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
        { type_id: "1", type_name: "电影", land: 1, ratio: 1.33 },
        { type_id: "2", type_name: "剧集", land: 1, ratio: 1.33 },
        { type_id: "3", type_name: "综艺", land: 1, ratio: 1.33 },
        { type_id: "4", type_name: "动漫", land: 1, ratio: 1.33 }
    ];
    return JSON.stringify({ class: classes, filters: {} });
}

async function homeVod() {
    const html = await request(`${HOST}/type/1-1.html`);
    const $ = _(html);
    const list = [];
    $('ul li').each((_, element) => {
        const $item = $(element);
        const $detailLink = $item.find('a[href*="/detail/"]').first();
        if ($detailLink.length === 0) return;
        const href = $detailLink.attr('href');
        const idMatch = href.match(/\/detail\/(\d+)\.html/);
        if (!idMatch) return;
        const vod_id = idMatch[1];
        const $titleElement = $item.find('h4.title a').first();
        const vod_name = $titleElement.text().trim() || "";
        const $thumbLink = $item.find('a.stui-vodlist__thumb').first();
        let vod_pic = "";
        if ($thumbLink.length) {
            let picUrl = $thumbLink.attr('data-original') || "";
            vod_pic = picUrl.startsWith('//') ? 'https:' + picUrl : picUrl;
        }
        let vod_remarks = "";
        const $picText = $item.find('.pic-text').first();
        if ($picText.length) vod_remarks = $picText.text().trim();
        const $picTag = $item.find('.pic-tag').first();
        if ($picTag.length) {
            const score = $picTag.text().trim();
            if (score && score !== '0.0') {
                vod_remarks = vod_remarks ? vod_remarks + " " + score : score;
            }
        }
        if (vod_id && vod_name) {
            list.push({
                vod_id,
                vod_name,
                vod_pic,
                vod_remarks,
                style: { type: 'rect', ratio: 1.33 }
            })
        }
    })
    return JSON.stringify({ list: list.slice(0,20) });
}

async function category(tid, pg, filter, ext) {
    pg = Number(pg) || 1;
    try {
        const url = `${HOST}/type/${tid}-${pg}.html`;
        const html = await request(url);
        const $ = _(html);
        const list = [];
        $('ul li').each((_, element) => {
            const $item = $(element);
            const $detailLink = $item.find('a[href*="/detail/"]').first();
            if ($detailLink.length === 0) return;
            const href = $detailLink.attr('href');
            const idMatch = href.match(/\/detail\/(\d+)\.html/);
            if (!idMatch) return;
            const vod_id = idMatch[1];
            const $titleElement = $item.find('h4.title a').first();
            const vod_name = $titleElement.text().trim() || "";
            const $thumbLink = $item.find('a.stui-vodlist__thumb').first();
            let vod_pic = "";
            if ($thumbLink.length) {
                let picUrl = $thumbLink.attr('data-original') || "";
                vod_pic = picUrl.startsWith('//') ? 'https:' + picUrl : picUrl;
            }
            let vod_remarks = "";
            const $picText = $item.find('.pic-text').first();
            if ($picText.length) vod_remarks = $picText.text().trim();
            const $picTag = $item.find('.pic-tag').first();
            if ($picTag.length) {
                const score = $picTag.text().trim();
                if (score && score !== '0.0') {
                    vod_remarks = vod_remarks ? vod_remarks + " " + score : score;
                }
            }
            if (vod_id && vod_name) {
                list.push({
                    vod_id,
                    vod_name,
                    vod_pic,
                    vod_remarks,
                    style: { type: 'rect', ratio: 1.33 }
                })
            }
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
        return JSON.stringify({ list: [], page: pg, pagecount: 0 });
    }
}

async function search(key, quick, pg) {
    pg = Number(pg) || 1;
    try {
        const searchKey = encodeURIComponent(key);
        const url = `${HOST}/search/${searchKey}----------${pg}---.html`;
        const html = await request(url);
        const $ = _(html);
        const list = [];
        $('ul li').each((_, element) => {
            const $item = $(element);
            const $detailLink = $item.find('a[href*="/detail/"]').first();
            if ($detailLink.length === 0) return;
            const href = $detailLink.attr('href');
            const idMatch = href.match(/\/detail\/(\d+)\.html/);
            if (!idMatch) return;
            const vod_id = idMatch[1];
            const $titleElement = $item.find('h4.title a').first();
            const vod_name = $titleElement.text().trim() || "";
            const $thumbLink = $item.find('a.stui-vodlist__thumb').first();
            let vod_pic = "";
            if ($thumbLink.length) {
                let picUrl = $thumbLink.attr('data-original') || "";
                vod_pic = picUrl.startsWith('//') ? 'https:' + picUrl : picUrl;
            }
            let vod_remarks = "";
            const $picText = $item.find('.pic-text').first();
            if ($picText.length) vod_remarks = $picText.text().trim();
            const $picTag = $item.find('.pic-tag').first();
            if ($picTag.length) {
                const score = $picTag.text().trim();
                if (score && score !== '0.0') {
                    vod_remarks = vod_remarks ? vod_remarks + " " + score : score;
                }
            }
            if (vod_id && vod_name) {
                list.push({
                    vod_id,
                    vod_name,
                    vod_pic,
                    vod_remarks,
                    style: { type: 'rect', ratio: 1.33 }
                })
            }
        })
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
        const url = `${HOST}/detail/${vodId}.html`;
        const html = await request(url);
        const $ = _(html);
        const playFromList = [];
        const playUrlList = [];

        $('.stui-vodlist__head').each((_, element) => {
            const $vodHead = $(element);
            const $heading = $vodHead.find('h3').first();
            if ($heading.length === 0) return;
            let playFromName = $heading.text().trim();
            const isUnplayableRoute = playFromName.includes('HD5') || playFromName.includes('下载') || playFromName.includes('UC') || playFromName.includes('夸克');
            if (isUnplayableRoute) playFromName = `❌ ${playFromName}`;
            const $playlist = $vodHead.find('.stui-content__playlist');
            if ($playlist.length === 0) return;
            const episodeUrls = [];
            $playlist.find('li a[href*="/play/"]').each((_, linkElement) => {
                const $link = $(linkElement);
                const epName = $link.text().trim();
                const epHref = $link.attr('href');
                if (epHref && epName) {
                    episodeUrls.push(`${epName}$${epHref}`);
                }
            })
            if (episodeUrls.length > 0) {
                playFromList.push(playFromName);
                playUrlList.push(episodeUrls.join('#'));
            }
        })

        if (playFromList.length === 0) {
            const playUrls = [];
            $('ul li a[href*="/play/"]').each((_, element) => {
                const $link = $(element);
                const epName = $link.text().trim();
                const epHref = $link.attr('href');
                if (epHref && epName) {
                    playUrls.push(`${epName}$${epHref}`);
                }
            })
            if (playUrls.length > 0) {
                playFromList.push("默认播放");
                playUrlList.push(playUrls.join('#'));
            }
        }

        let vod_actor = "", vod_director = "";
        $('p.data').each((_, el)=>{
            const text = $(el).text();
            const match = text.match(/主演：([^\/]+).*导演：(.+)/);
            if(match){
                vod_actor = match[1].trim();
                vod_director = match[2].trim();
            }
        })

        let vod_pic = "";
        const $mainImg = $('.stui-content__thumb img').first();
        if ($mainImg.length) {
            let picUrl = $mainImg.attr('data-original') || $mainImg.attr('src') || "";
            if(!picUrl.includes('load.png')){
                if(picUrl.startsWith('//')) vod_pic = 'https:' + picUrl;
                else if(picUrl.startsWith('/')) vod_pic = HOST + picUrl;
                else vod_pic = picUrl;
            }
        }

        let vod_content = "";
        const $content = $('.desc.detail .detail-content').first();
        if($content.length) vod_content = $content.text().trim();
        else {
            const $sketch = $('.desc.detail .detail-sketch').first();
            if($sketch.length) vod_content = $sketch.text().trim();
        }

        const vod = {
            vod_id: vodId,
            vod_name: $('h1.title').text().trim() || "",
            vod_pic,
            vod_remarks: "",
            vod_year: "",
            vod_area: "",
            vod_actor,
            vod_director,
            vod_content,
            vod_play_from: playFromList.join('$$$'),
            vod_play_url: playUrlList.join('$$$')
        };
        return JSON.stringify({ list: [vod] });
    } catch (e) {
        console.error("detail error", e.message);
        return JSON.stringify({ list: [] });
    }
}

async function play(flag, playId, flags) {
    try {
        let purl = playId.startsWith("http") ? playId : (HOST + playId);
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
        return JSON.stringify({ parse: 1, url: playId, header: { "User-Agent": UA } });
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