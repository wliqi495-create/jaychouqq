/**
 * OK影视 / CatVodSpider JS版 - 片库网爬虫（性能优化版）
 */

const HOST = "https://4k01.pianku.online";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const parseAPiUrl = "https://svip.qlplayer.cyou/?url=";

const HEADERS = {
    "User-Agent": UA,
};

// 预编译高频使用的正则，提升运行效率并节省内存开销
const VOD_ITEM_REG = /<div class="vod-item">[\s\S]*?<a href="\/voddetail\/(\d+)\.html" title="(.*?)"[\s\S]*?<img src="(.*?)"[\s\S]*?<span class="remarks">(.*?)<\/span>/g;
const CLEAN_TAG_REG = /<[^>]+>/g;
const DIRECT_URL_REG = /\.(m3u8|mp4)/i;

function buildUrl(path) {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    return HOST + (path.startsWith("/") ? "" : "/") + path;
}

function mylog(...args) {
    console.log(`[片库网]`, ...args);
}

function getVodList(html) {
    if (!html) return [];
    const list = [];
    VOD_ITEM_REG.lastIndex = 0; // 重置正则索引
    let match;

    while ((match = VOD_ITEM_REG.exec(html)) !== null) {
        list.push({
            vod_id: match[1],
            vod_name: match[2],
            vod_pic: buildUrl(match[3]),
            vod_remarks: match[4].trim()
        });
    }
    mylog(`共提取到 ${list.length} 条数据`);
    return list;
}

async function init(cfg) {
    mylog("Spider Init Done");
}

async function home(filter) {
    mylog(`开始加载首页，filter=${filter}`);
    try {
        const classes = [
            { "type_id": "20", "type_name": "电影" },
            { "type_id": "37", "type_name": "剧集" },
            { "type_id": "43", "type_name": "动漫" },
            { "type_id": "45", "type_name": "综艺" }
        ];

        const filters = {
            "20": [{
                "key": "tid",
                "name": "分类",
                "value": [
                    { "n": "全部", "v": "20" },
                    { "n": "动作片", "v": "21" }, { "n": "喜剧片", "v": "22" },
                    { "n": "爱情片", "v": "23" }, { "n": "科幻片", "v": "24" },
                    { "n": "恐怖片", "v": "25" }, { "n": "剧情片", "v": "26" },
                    { "n": "战争片", "v": "27" }, { "n": "惊悚片", "v": "28" },
                    { "n": "犯罪片", "v": "29" }, { "n": "冒险篇", "v": "30" },
                    { "n": "动画片", "v": "31" }, { "n": "悬疑片", "v": "32" },
                    { "n": "武侠片", "v": "33" }, { "n": "奇幻片", "v": "34" },
                    { "n": "纪录片", "v": "35" }, { "n": "其他片", "v": "36" }
                ]
            }]
        };

        const res = await req(HOST, { headers: HEADERS });
        const vodList = getVodList(res.content);

        return JSON.stringify({
            class: classes,
            filters: filter ? filters : {},
            list: vodList
        });
    } catch (e) {
        mylog(e.message);
        return JSON.stringify({ class: [], list: [] });
    }
}

async function homeVod() {
    mylog("获取首页推荐视频");
    try {
        const res = await req(HOST, { headers: HEADERS });
        const vodList = getVodList(res.content);
        return JSON.stringify({ list: vodList });
    } catch (e) {
        mylog(e.message);
        return JSON.stringify({ list: [] });
    }
}

async function category(tid, pg, filter, extend) {
    let realTid = (extend && extend.tid) ? extend.tid : tid;
    const page = pg || "1";
    const url = page === "1" ? `${HOST}/vodtype/${realTid}.html` : `${HOST}/vodtype/${realTid}-${page}.html`;

    mylog(`请求分类 URL: ${url}`);
    try {
        const res = await req(url, { headers: HEADERS });
        const html = res.content;
        const vodList = getVodList(html);

        let pagecount = parseInt(page) + 1;
        let total = 0;
        const pageMatch = html.match(/尾页.*?href=".*?-(\d+)\.html"/);
        if (pageMatch) {
            pagecount = parseInt(pageMatch[1]);
            total = pagecount * 24;
        }

        return JSON.stringify({
            list: vodList,
            page: parseInt(page),
            pagecount: pagecount,
            limit: 24,
            total: total
        });
    } catch (e) {
        mylog(e.message);
        return JSON.stringify({ list: [], page: 1, pagecount: 1, limit: 24, total: 0 });
    }
}

async function detail(id) {
    const url = `${HOST}/voddetail/${id}.html`;
    mylog(`获取详情页 URL: ${url}`);

    try {
        const res = await req(url, { headers: HEADERS });
        const html = res.content || "";

        const getMatch = (re) => {
            const m = html.match(re);
            return m ? m[1].trim() : "";
        };

        const title = getMatch(/<h1[^>]*class="detail-title"[^>]*>(.*?)(?:<span|<\/h1>)/s);
        let pic = getMatch(/class="detail-poster"[^>]*>[\s\S]*?<img src="(.*?)"/);
        if (pic) pic = buildUrl(pic);

        const remarks = getMatch(/class="detail-remarks"[^>]*>(.*?)<\/span>/);
        const content = getMatch(/class="detail-desc"[^>]*>[\s\S]*?<p>(.*?)<\/p>/);

        // 提取演员元数据
        let director = "", actor = "", area = "", year = "";
        const metaRegex = /<(?:span|p|div)[^>]*>(导演|主演|地区|年份)[：:](.*?)(?:<\/span>|<\/p>|<\/div>)/g;
        let metaMatch;
        while ((metaMatch = metaRegex.exec(html)) !== null) {
            const key = metaMatch[1];
            const val = metaMatch[2].replace(CLEAN_TAG_REG, "").trim();
            if (key === "导演") director = val;
            else if (key === "主演") actor = val;
            else if (key === "地区") area = val;
            else if (key === "年份") year = val;
        }

        // 提取播放线路
        const playFromList = [];
        const tabRegex = /class="source-tab-item[^"]*"[^>]*>(.*?)<\/span>/g;
        let tabMatch;
        while ((tabMatch = tabRegex.exec(html)) !== null) {
            let from = tabMatch[1].trim();
            if (from.includes("自营4K60帧") || from.includes("自营4k60帧")) {
                from = `⚡${from}(注意直连)`;
            }
            playFromList.push(from);
        }

        // 优化剧集面板提取：采用分割（split）避免正则跨大段 HTML 回溯
        const playUrlList = [];
        const panes = html.split('class="source-pane');
        
        for (let i = 1; i < panes.length; i++) {
            const paneHtml = panes[i].split("</div>")[0] || panes[i];
            const episodes = [];
            const epRegex = /href="(\/vodplay\/[^"]+)"[^>]*>(.*?)<\/a>/g;
            let epMatch;

            while ((epMatch = epRegex.exec(paneHtml)) !== null) {
                const epName = epMatch[2].replace(CLEAN_TAG_REG, "").strip ? epMatch[2].replace(CLEAN_TAG_REG, "").strip() : epMatch[2].replace(CLEAN_TAG_REG, "").trim();
                const epUrl = buildUrl(epMatch[1]);
                episodes.push(`${epName}$${epUrl}`);
            }
            if (episodes.length > 0) {
                playUrlList.push(episodes.join("#"));
            }
        }

        // 补充默认线路名
        if (playFromList.length === 0 && playUrlList.length > 0) {
            playUrlList.forEach((_, i) => playFromList.push(`线路 ${i + 1}`));
        }

        const vod = {
            vod_id: id,
            vod_name: title,
            vod_pic: pic,
            vod_type_name: "",
            vod_year: year,
            vod_area: area,
            vod_remarks: remarks,
            vod_actor: actor,
            vod_director: director,
            vod_content: content,
            vod_play_from: playFromList.join("$$$"),
            vod_play_url: playUrlList.join("$$$")
        };

        mylog(`成功解析视频详情: ${title}`);
        return JSON.stringify({ list: [vod] });
    } catch (e) {
        mylog(e.message);
        return JSON.stringify({ list: [] });
    }
}

async function search(key, quick, pg) {
    const encodedKey = encodeURIComponent(key);
    const url = `${HOST}/vodsearch/-------------.html?wd=${encodedKey}`;
    mylog(`开始搜索关键词: ${key} -> URL: ${url}`);

    try {
        const res = await req(url, { headers: HEADERS });
        const vodList = getVodList(res.content);
        return JSON.stringify({
            list: vodList,
            page: 1,
            pagecount: 1
        });
    } catch (e) {
        mylog(e.message);
        return JSON.stringify({ list: [] });
    }
}

function formatUrl(url) {
    if (!url) return "";
    return url.replace(/\\/g, "").replace(/^(https?:\/)((?!\/))/i, "$1/");
}

function extractConfig(html) {
    const apiTokenMatch = html.match(/apiToken\s*:\s*["']([^"']+)["']/);
    return {
        apiToken: apiTokenMatch ? apiTokenMatch[1] : null
    };
}

// 修复判定逻辑 Bug
function isDirectVideoUrl(url) {
    return DIRECT_URL_REG.test(url);
}

async function parseVideoUrl(url) {
    try {
        const resoleUrl = parseAPiUrl + url;
        mylog("解析地址", resoleUrl);

        const html1 = (await req(resoleUrl)).content || "";
        const { apiToken } = extractConfig(html1);

        if (!apiToken) return "";

        const parseTokenUrl = `https://svip.qlplayer.cyou/api/resolve.php?token=${encodeURIComponent(apiToken)}`;
        mylog("parseTokenUrl", parseTokenUrl);

        const res = await req(parseTokenUrl);
        const data = JSON.parse(res.content);

        mylog("data", data);
        const finalUrl = formatUrl(data.url);
        mylog("finalUrl", finalUrl);
        return finalUrl;
    } catch (e) {
        mylog("视频解析失败:", e.message);
        return "";
    }
}

async function play(flag, id, flags) {
    const playUrl = buildUrl(id);
    mylog(`开始获取播放地址: ${playUrl}`);
    try {
        const res = await req(playUrl, { headers: HEADERS });
        const html = res.content || "";

        const match = html.match(/player_aaaa\s*=\s*(\{[\s\S]*?\})/);

        if (match && match[1]) {
            const playerData = JSON.parse(match[1]);
            const targetUrl = playerData.url || "";

            if (isDirectVideoUrl(targetUrl)) {
                mylog("是直连，", targetUrl);
                return JSON.stringify({ parse: 0, url: targetUrl });
            }

            const finalPlayUrl = await parseVideoUrl(targetUrl);
            return JSON.stringify({ parse: 0, url: finalPlayUrl });
        } else {
            mylog("未在网页 HTML 中找到 player_aaaa 匹配项");
        }
    } catch (e) {
        mylog(`网络请求失败: ${e.message}`);
    }

    return JSON.stringify({ parse: 0, url: "" });
}

export default {
    init,
    home,
    homeVod,
    category,
    detail,
    search,
    play
};