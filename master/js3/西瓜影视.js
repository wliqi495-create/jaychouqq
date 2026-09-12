
const sites = ["https://www.xiguazx.cc", 'https://www.bzzdyy.com',];
const HOST = sites[0];
const PARSE_API = ['https://hls.xiguadh.com', 'https://svip.qlplayer.cyou'][0];
const HEADERS = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" };

const buildUrl = p => !p ? "" : (p.startsWith("http") ? p : HOST + (p.startsWith("/") ? "" : "/") + p);
const mylog = (...args) => console.log(`[西瓜影视]`, ...args);
const errRes = (msg, extra = {}) => JSON.stringify({ list: [], msg, ...extra });

const VOD_ITEM_REG = /<a class="stui-vodlist__thumb[^"]*" href="[^"]*\/id\/(\d+)\.html" title="([^"]+)" data-original="([^"]+)"[\s\S]*?<span class="pic-text text-right"><b>([^<]+)<\/b><\/span>/g;

function _getVodList(html) {
    if (!html) return [];
    const list = [];
    VOD_ITEM_REG.lastIndex = 0;
    for (const m of html.matchAll(VOD_ITEM_REG)) {
        list.push({ vod_id: m[1], vod_name: m[2], vod_pic: buildUrl(m[3]), vod_remarks: m[4].trim() });
    }
    return list;
}

async function init(cfg) { }

const orderFilter = { "key": "orderby", "name": "排序", "value": [{ "n": "默认排序", "v": "" }, { "n": "人气", "v": "hits" }, { "n": "时间", "v": "time" }, { "n": "评分", "v": "score" }] };
const myFilters = {
    "20": [{ "key": "tid", "name": "分类", "value": [{ "n": "全部", "v": "20" }, { "n": "动作片", "v": "21" }, { "n": "喜剧片", "v": "22" }, { "n": "爱情片", "v": "23" }, { "n": "科幻片", "v": "24" }, { "n": "恐怖片", "v": "25" }, { "n": "剧情片", "v": "26" }, { "n": "战争片", "v": "27" }, { "n": "惊悚片", "v": "28" }, { "n": "犯罪片", "v": "29" }, { "n": "冒险篇", "v": "30" }, { "n": "动画片", "v": "31" }, { "n": "悬疑片", "v": "32" }, { "n": "武侠片", "v": "33" }, { "n": "奇幻片", "v": "34" }, { "n": "纪录片", "v": "35" }, { "n": "其他片", "v": "36" }] }, orderFilter],
    "37": [{ "key": "tid", "name": "分类", "value": [{ "n": "全部", "v": "37" }, { "n": "国产剧", "v": "38" }, { "n": "港台剧", "v": "39" }, { "n": "欧美剧", "v": "40" }, { "n": "日韩剧", "v": "41" }] }, orderFilter],
    "43": [orderFilter], "45": [orderFilter],
    "47": [{ "key": "tid", "name": "分类", "value": [{ "n": "全部", "v": "47" }, { "n": "番剧", "v": "48" }, { "n": "国创", "v": "49" }, { "n": "电影", "v": "50" }, { "n": "电视剧", "v": "51" }] }, orderFilter]
};

async function home(filter) {
    try {
        await req(HOST, { headers: HEADERS });
        return JSON.stringify({
            class: [{ "type_id": "43", "type_name": "动漫" }, { "type_id": "37", "type_name": "剧集" }, { "type_id": "47", "type_name": "B站" }, { "type_id": "20", "type_name": "电影" }, { "type_id": "45", "type_name": "综艺" }],
            filters: filter ? myFilters : {}
        });
    } catch (e) { return errRes(e.message, { class: [] }); }
}

async function homeVod() {
    try {
        const res = await req(HOST, { headers: HEADERS });
        return JSON.stringify({ list: _getVodList(res.content) });
    } catch (e) { return errRes(e.message); }
}

async function category(tid, pg, filter, extend) {
    const page = pg || "1";
    const url = `${HOST}/index.php/vod/show/by/${extend.orderby || "hits"}/id/${extend.tid || tid}/page/${page}.html`;
    try {
        const res = await req(url, { headers: HEADERS });
        const html = res.content;
        const pageMatch = html.match(/href=".*page\/(\d+)\.html".*尾页/);
        return JSON.stringify({ list: _getVodList(html), pagecount: pageMatch ? parseInt(pageMatch[1]) : parseInt(page) + 1 });
    } catch (e) { return errRes(e.message); }
}

function _parsePlayData(html) {
    const playFromList = [], playUrlList = [];
    for (const m of html.matchAll(/<a href="#playlist\d+"[^>]*>([\s\S]*?)<\/a>/g)) {
        playFromList.push(m[1].trim());
    }

    const tabContentMatch = /<div class="tab-content[^"]*">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/.exec(html) ||
        /<div class="tab-content[\s\S]*?<\/div>\s*<\/div>/.exec(html);
    const targetHtml = tabContentMatch ? tabContentMatch[1] : html;

    for (const section of targetHtml.split('id="playlist').slice(1)) {
        const episodes = [];
        for (const li of section.matchAll(/<a href="([^"]+)">([^<]+)<\/a>/g)) {
            const href = li[1].trim();
            if (href && !href.startsWith("mailto:")) {
                episodes.push(`${li[2].trim()}$${href}`);
            }
        }
        if (episodes.length) playUrlList.push(episodes);
    }
    return { playFromList, playUrlList };
}

function _parseVodInfo(html) {
    const getVal = (reg, idx = 1, src = html) => (reg.exec(src) || [])[idx]?.trim() || "";
    const dataText = getVal(/<p class="data hidden-xs">类型：(.*?)<\/p>/);

    const parseNames = (htmlFragment) => {
        const names = [];
        for (const m of (htmlFragment || "").matchAll(/>([^<]+)<\/a>/g)) {
            if (m[1].trim()) names.push(m[1].trim());
        }
        return names.join(",");
    };

    return {
        vod_name: getVal(/<h1 class="title">([^<]+)<\/h1>/),
        vod_pic: getVal(/data-original="([^"]+)"/),
        vod_type_name: getVal(/^(.*?)\s*\/\s*地区：/, 1, dataText),
        vod_year: getVal(/年份：(\d+)/, 1, dataText),
        vod_area: getVal(/\/\s*地区：(.*?)\s*\/\s*年份：/, 1, dataText),
        vod_remarks: getVal(/状态：<span[^>]*>([^<]+)<\/span>/),
        vod_director: parseNames(getVal(/导演：([\s\S]*?)<\/p>/)),
        vod_actor: parseNames(getVal(/主演：([\s\S]*?)<\/p>/)),
        vod_content: getVal(/<span class="detail-content"[^>]*>([\s\S]*?)<\/span>/) || getVal(/<span class="detail-sketch">([\s\S]*?)<\/span>/)
    };
}

async function detail(id) {
    try {
        const res = await req(`${HOST}/index.php/vod/detail/id/${id}.html`, { headers: HEADERS });
        const html = res.content || "";
        const { playFromList, playUrlList } = _parsePlayData(html);

        return JSON.stringify({
            list: [{
                vod_id: id,
                ..._parseVodInfo(html),
                vod_play_from: playFromList.join("$$$"),
                vod_play_url: playUrlList.map(e => e.join("#")).join("$$$")
            }]
        });
    } catch (e) { return errRes(e.message); }
}

async function search(key) {
    try {
        const res = await req(`${HOST}/index.php/vod/search.html`, { method: "POST", headers: HEADERS, data: { wd: encodeURIComponent(key) } });
        return JSON.stringify({ list: _getVodList(res.content), pagecount: 1 });
    } catch (e) { return errRes(e.message); }
}

const formatUrl = u => u ? u.replace(/\\/g, "").replace(/^(https?:\/)((?!\/))/i, "$1/") : "";

async function play(flag, id) {
    try {
        const res = await req(buildUrl(id), { headers: HEADERS });
        const match = (res.content || "").match(/player_aaaa\s*=\s*(\{[\s\S]*?\})/);
        if (match) {
            let targetUrl = formatUrl(JSON.parse(match[1]).url);
            if (targetUrl.startsWith("http") && (targetUrl.includes(".mp4") || targetUrl.includes(".m3u8"))) {
                return JSON.stringify({ parse: 0, url: targetUrl,header:HEADERS });
            }
            const html1 = (await req(PARSE_API + '?url=' + targetUrl)).content || "";
            const token = (html1.match(/apiToken\s*:\s*["']([^"']+)["']/) || [])[1];
            if (token) {
                let res2 = await req(`${PARSE_API}/api/resolve.php?token=${encodeURIComponent(token)}`).content;
                res2 = JSON.parse(res2);
                mylog("解析结果:", res2);
                if (res2.code ==404 ) {
                    return JSON.stringify({msg:'无法解析视频，请尝试换一个播放源解析！'});
                }
                return JSON.stringify({ parse: 0, url: formatUrl(res2.url), header: HEADERS });
            }
        }
    } catch (e) { mylog("播放异常:", e.message); }
    return JSON.stringify({ parse: 0, url: "", header: HEADERS });
}

export default { init, home, homeVod, category, detail, search, play };