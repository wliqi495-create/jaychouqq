// 从壳子内置路径导入cheerio
import cheerio from 'assets://js/lib/cheerio.min.js';

let sites = ['https://www.cd-zj.com', 'https://maihaolian.com', "https://zzztool.com"];
const TAG = "枫叶4K";
let baseUrl = sites[0];
const Headers = {
    "user-agent": 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/150.0.0.0 Mobile',
    "Referer": baseUrl + "/",
    "Cookie": "verify_success=1"
};

const mylog = (...args) => console.log(TAG, ...args);

// 1. 统一错误响应处理工具
const backError = (err, type = 'list') => {
    const msg = err?.message || err || `${TAG}未知异常`;
    mylog("错误捕获 ->", msg);

    if (type === 'play') {
        // 播放失败：直接返回 parse: 0 和 msg 提示
        return JSON.stringify({ parse: 0, msg });
    } else if (type === 'home') {
        // 首页报错：返回 msg 和空 class 数组
        return JSON.stringify({ msg, class: [] });
    } else {
        // 详情、分类、搜索报错：带上 msg 并保留空 list，防止 APP 报空指针
        return JSON.stringify({ msg, list: [], pagecount: 1 });
    }
};

// 2. 动态生成过滤器
const makeOptions = (arr) => [{ n: "全部", v: "" }, ...arr.map(x => ({ n: String(x), v: String(x) }))];
const getYearFilter = () => {
    const y = new Date().getFullYear();
    return { key: "year", name: "年份", value: makeOptions(Array.from({ length: 23 }, (_, i) => y - i)) };
};
const getLetterFilter = () => ({
    key: "letter", name: "字母",
    value: makeOptions([...Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)), "0-9"])
});

const OtherFilters = [
    { key: "area", name: "地区", value: makeOptions(["大陆", "香港", "台湾", "美国", "韩国", "日本", "泰国", "新加坡", "马来西亚", "印度", "英国", "法国", "加拿大", "西班牙", "俄罗斯", "其它"]) },
    getYearFilter(),
    { key: "lang", name: "语言", value: makeOptions(["国语", "英语", "粤语", "闽南语", "韩语", "日语", "其它"]) },
    getLetterFilter()
];

const myFilters = {
    "1": [{ key: "type", name: "类型", value: [{ n: "全部", v: "1" }, { n: "动作片", v: "6" }, { n: "喜剧片", v: "7" }, { n: "恐怖片", v: "8" }, { n: "科幻片", v: "9" }, { n: "爱情片", v: "10" }, { n: "剧情片", v: "11" }] },
    { key: "class", name: "剧情", value: makeOptions(["喜剧", "爱情", "恐怖", "动作", "科幻", "剧情", "战争", "警匪", "犯罪", "动画", "奇幻", "武侠", "冒险", "枪战", "悬疑", "惊悚", "经典", "青春", "文艺", "微电影", "古装", "历史", "运动", "农村", "儿童", "网络电影"]) }, ...OtherFilters],
    "2": [{ key: "type", name: "类型", value: [{ n: "全部", v: "2" }, { n: "国产剧", v: "13" }, { n: "日韩剧", v: "15" }, { n: "海外剧", v: "16" }] },
    { key: "class", name: "剧情", value: makeOptions(["古装", "战争", "青春偶像", "喜剧", "家庭", "犯罪", "动作", "奇幻", "剧情", "历史", "经典", "乡村", "情景", "商战", "网剧", "其他"]) }, ...OtherFilters],
    "3": [{ key: "type", name: "类型", value: [{ n: "全部", v: "3" }, { n: "大陆综艺", v: "21" }, { n: "日韩综艺", v: "22" }] },
    { key: "class", name: "剧情", value: makeOptions(["选秀", "情感", "访谈", "播报", "旅游", "音乐", "美食", "纪实", "曲艺", "生活", "游戏互动", "财经", "求职"]) }, ...OtherFilters],
    "4": [{ key: "type", name: "类型", value: [{ n: "全部", v: "4" }, { n: "国产动漫", v: "25" }, { n: "日韩动漫", v: "26" }] },
    { key: "class", name: "剧情", value: makeOptions(["情感", "科幻", "热血", "推理", "搞笑", "冒险", "萝莉", "校园", "动作", "机战", "运动", "战争", "少年", "少女", "社会", "原创", "亲子", "益智", "励志", "其他"]) }, ...OtherFilters],
    "5": [getYearFilter(), getLetterFilter()]
};

async function init(ext) {

    mylog("ext", ext)
    const fyck = ext.fyck || '../枫叶ck.txt'
    Headers.Cookie = await req(fyck)?.content

    mylog("Headers", Headers)


    if (ext.sites && Array.isArray(ext.sites) && ext.sites.length > 0) {

        sites = ext.sites
        // 默认的网站序号
        let sitesIndex = +ext.sitesIndex || 0
        if (sitesIndex < 0 || sitesIndex >= sites.length) {
            sitesIndex = 0
        }
        baseUrl = sites[sitesIndex]
        mylog("配置的sites:", sites)
        mylog("sitesIndex:", sitesIndex)
        mylog("baseUrl:", baseUrl)
    }
}

async function home() {
    try {
        return JSON.stringify({
            class: [
                { type_id: "4", type_name: "动漫" }, { type_id: "/label/qq", type_name: "腾讯VIP精选" },
                { type_id: "/label/bli", type_name: "B站VIP精选" }, { type_id: "/label/youku", type_name: "优酷VIP精选" },
                { type_id: "2", type_name: "电视剧" }, { type_id: "1", type_name: "电影" },
                { type_id: "3", type_name: "综艺" }, { type_id: "5", type_name: "热门短剧" }
            ],
            filters: myFilters
        });
    } catch (err) {
        return backError(err, 'home');
    }
}

async function homeVod() {
    return await category("", 1, false, {});
}

async function category(tid, pg = 1, filter, extend = {}) {
    try {
        const isLabel = tid.startsWith("/label");
        const type = extend.type || tid;
        const typePrefix = (baseUrl.includes('www.cd-zj.com') || baseUrl.includes('maihaolian.com')) ? "cupfox-list" : "list";

        let url = isLabel ? `${baseUrl}${tid}/page/${pg}.html`
            : type === "" ? baseUrl
                : `${baseUrl}/${typePrefix}/${type}-${extend.area || ''}--${extend.class || ''}-${extend.lang || ''}-${extend.letter || ''}-${extend.orderBy || ''}--${pg}---${extend.year || ''}.html`;

        mylog("category url ", url);
        const res = await req(url, {
            headers: Headers
        });
        if (!res?.content) throw new Error("获取分类列表响应为空");

        return await parseList(res.content, url.includes('zzztool'), isLabel);
    } catch (err) {
        return backError(err, 'category');
    }
}

// 通用列表 DOM 解析逻辑
async function parseList(html, isZzz, isLabel = false, isSearch = false) {
    const $ = cheerio.load(html);
    const list = [];
    const selector = isZzz ? ".module-item" : ".public-list-bj";

    if (html.includes("系统安全验证")) {
        mylog(html)
        mylog("需要验证，请重新获取ck")
        throw new Error('需要验证，请重新获取ck')
    }
    $(selector).each((_, el) => {
        const $el = $(el);
        const vod_id = isZzz ? ((isLabel || isSearch) ? $('.module-card-item-poster').attr("href") : $el.attr("href")) : $el.find("a.public-list-exp").attr("href");
        const vod_name = isZzz ? (isLabel ? $el.find('.module-card-item-title strong').text() : $el.attr("title")) : $el.find("a.public-list-exp").attr("title") || $(".thumb-content a").text().trim();
        const vod_pic = $el.find(isZzz ? ".module-item-pic img" : ".public-list-exp img").attr("data-src");
        const vod_remarks = $el.find(isZzz ? ".module-item-note" : ".ft2").text().trim();

        const text4k = $el.find(isZzz ? '.module-item-version-left' : '.public-list-exp .public-prt-g').text().trim();
        const updateTime = $el.find(isZzz ? '.module-item-version-right' : '.public-list-exp .public-prt').eq(isZzz ? 0 : 1).text().trim();
        const vod_year = `${text4k ? `「${text4k}」` : ''} ${updateTime}`.trim();

        list.push({ vod_id, vod_name: vod_name?.trim(), vod_pic, vod_remarks, vod_year });
    });

    const pagecount = isZzz
        ? ($('.module-footer .page-next')?.last()?.attr('href')?.match(/\d+/g)?.[1] || 1)
        : ($('.page-tip').text().match(/\d+\/(\d+)页/)?.[1] || 1);

    return JSON.stringify({ list, pagecount });
}

// 线路与剧集拼接辅助
function buildVodPlayData(lines, playlists, shouldReverse = true) {
    const processedPlaylists = playlists.map(eps => (shouldReverse ? [...eps].reverse() : eps).join('#'));
    return {
        vod_play_from: lines.filter(Boolean).join('$$$'),
        vod_play_url: processedPlaylists.join('$$$')
    };
}

async function detail(vid) {
    try {
        const url = baseUrl + vid;
        const res = await req(url);
        if (!res?.content) throw new Error("获取详情页失败");

        const $ = cheerio.load(res.content);
        const isZzz = url.includes('zzztool');

        if (isZzz) {
            let director = '', actor = '', remarks = '';
            $('.module-info-item').each((_, el) => {
                const title = $(el).find('.module-info-item-title').text();
                const content = $(el).find('.module-info-item-content').text().trim();
                if (title.includes('导演')) director = content;
                else if (title.includes('主演')) actor = content;
                else if ((title.includes('集数') || title.includes('更新') || title.includes('状态')) && !remarks) remarks = content;
            });

            const { vod_play_from, vod_play_url } = extractPlayInfo($, '.mx-anthology-tab', '.mx-anthology-tab-label', '.mx-anthology-panel', '.mx-anthology-item a');
            return JSON.stringify({
                list: [{
                    vod_name: $('.module-info-heading h1').text().trim(),
                    vod_pic: $(".module-item-pic img").attr("data-src"),
                    vod_remarks: remarks,
                    vod_play_from, vod_play_url,
                    vod_year: ($('.module-item-version-right').text().trim() || remarks),
                    vod_director: director, vod_actor: actor,
                    vod_content: $('.module-info-introduction-content p').text().trim()
                }]
            });
        } else {
            const lines = [], playlists = [], nameCounts = {};
            $('.swiper-slide').each((_, el) => {
                const rawName = $(el).clone().find('i, span').remove().end().text().trim();
                if (rawName) {
                    nameCounts[rawName] = (nameCounts[rawName] || 0) + 1;
                    lines.push(nameCounts[rawName] > 1 ? `${rawName}-${nameCounts[rawName]}` : rawName);
                }
            });
            $('.anthology-list-box').each((_, poolEl) => {
                const episodes = [];
                $(poolEl).find('a').each((_, epEl) => {
                    const name = $(epEl).text().trim(), href = $(epEl).attr('href') || '';
                    if (name && href) episodes.push(`${name}$${href}`);
                });
                playlists.push(episodes);
            });

            // 优雅提取：克隆节点并剥离 <strong>，解决裸文本节点丢包问题
            const $actorBox = $('.detail-info .slide-info:contains("演员")').clone();
            $actorBox.find('strong').remove();
            const vod_actor = $actorBox.text().replace(/\s+/g, '').trim();

            const $remarkBox = $('.detail-info .slide-info:contains("连载")').clone();
            $remarkBox.find('strong').remove();
            const vod_remarks = $remarkBox.text().replace(/\s+/g, '').trim();

            const { vod_play_from, vod_play_url } = buildVodPlayData(lines, playlists, true);
            return JSON.stringify({
                list: [{
                    vod_id: vid,
                    vod_name: $('.slide-info-title').text().trim(),
                    vod_pic: $('.detail-pic img').attr("data-src") || '',
                    vod_actor: vod_actor,
                    vod_remarks: vod_remarks,
                    vod_content: $('#height_limit').text().trim(),
                    vod_play_from,
                    vod_play_url
                }]
            });
        }
    } catch (err) {
        return backError(err, 'detail');
    }
}

function extractPlayInfo($, tabSel, labelSel, panelSel, itemSel) {
    const lines = [], playlists = [], nameCounts = {};
    $(tabSel).each((_, el) => {
        const rawName = $(el).find(labelSel).text().trim();
        if (rawName) {
            nameCounts[rawName] = (nameCounts[rawName] || 0) + 1;
            lines.push(`${rawName}-${nameCounts[rawName]}`);
        }
    });
    $(panelSel).each((_, panelEl) => {
        const episodes = [];
        $(panelEl).find(itemSel).each((_, aEl) => {
            const epTitle = $(aEl).text().trim(), epHref = $(aEl).attr('href') || '';
            if (epTitle && epHref) episodes.push(`${epTitle}$${epHref}`);
        });
        playlists.push(episodes);
    });
    return buildVodPlayData(lines, playlists, true);
}

async function search(wd, quick, page = 1) {
    if (page >= 2) return JSON.stringify({ list: [], pagecount: 1 });
    try {
        const searchPrefex = baseUrl.includes('zzz') ? "search" : "cupfox-search";
        const searchUrl = `${baseUrl}/${searchPrefex}/-------------.html?wd=${wd}`
        mylog("searchUrl", searchUrl)
        const res = await req(searchUrl,{headers:Headers}).content
        if (!res) throw new Error("搜索请求未返回数据");

        const iszzz = baseUrl.includes('zzz');
        return await parseList(res, iszzz, false, true);
    } catch (err) {
        return backError(err, 'search');
    }
}

const parseMap = {
    'JD': "https://fgsrg.hzqingshan.com",
    'co': "https://zzrs.mfdyvip.com",
    'knmb': "https://zzrs.mfdyvip.com",
    'YYNB': "https://zzrs.mfdyvip.com"
};

async function parsePLayUrl(url) {
    try {
        const lineKey = url.split(/[-_]/)?.[0];
        const parseApiUrl = parseMap[lineKey];
        if (!parseApiUrl) throw new Error(`未找到匹配的解析接口 [${lineKey}]`);

        const htmlRes = await req(`${parseApiUrl}/player/?url=${url}`, { headers: Headers });
        if (!htmlRes?.content) throw new Error("获取解析播放器页面失败");

        const token = cheerio.load(htmlRes.content)('#player-data').attr('data-te');
        if (!token) throw new Error("未寻找到 token 数据");

        const playDataRes = await req(`${parseApiUrl}/player/mplayer.php`, {
            method: 'POST', postType: 'form',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
            data: { url, token }
        });

        if (!playDataRes?.content) throw new Error("二次解析接口请求失败");

        let parsePlayUrl = JSON.parse(playDataRes.content).url;
        if (!parsePlayUrl) throw new Error("二次解析未获取到 URL");

        return parsePlayUrl.startsWith('/playproxy.php') ? parseApiUrl + parsePlayUrl : parsePlayUrl;
    } catch (err) {
        mylog("parsePLayUrl 内部错误:", err.message);
        return "";
    }
}

async function play(flag, id) {
    try {
        const detailUrl = `${baseUrl}${id}`;
        mylog('detailUrl', detailUrl);

        const res = await req(detailUrl);
        if (!res?.content) throw new Error("详情页网络请求失败");

        const match = res.content.match(/var\s+player_aaaa[\s\S]*?"url"\s*:\s*"([^"]+)"/);
        const url = match ? match[1].replace(/\\/g, '') : '';

        if (!url) throw new Error("页面中未匹配到视频 URL 变量");

        // 直链 (m3u8 / mp4) 直接播放
        if (url.startsWith('http') && (url.includes("m3u") || url.includes('.mp4'))) {
            mylog("直链播放", url);
            return JSON.stringify({ parse: 0, url });
        }

        // 走二次解析接口
        const playUrl = await parsePLayUrl(url);
        if (!playUrl) throw new Error("线路解析失败，请尝试切换播放线路");

        return JSON.stringify({ parse: 0, url: playUrl });
    } catch (err) {
        // 捕获播放全部异常，按规范直接返回：{"parse":0, "msg":"err.message"}
        return backError(err, 'play');
    }
}

export default { init, home, homeVod, category, detail, search, play };
