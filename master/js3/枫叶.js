// 从壳子内置路径导入cheerio
import cheerio from 'assets://js/lib/cheerio.min.js';

const TAG = "枫叶4K";
let baseUrl = 'https://www.cd-zj.com';


const mylog = (...args) => console.log(TAG, ...args);

// 1. 统一错误响应处理工具
const backError = (err, type = 'list') => {
    const msg = err?.message || err || `${TAG}未知异常`;
    mylog("错误捕获 ->", msg);

    if (type === 'play') {
        return JSON.stringify({ parse: 0, msg });
    } else if (type === 'home') {
        return JSON.stringify({ msg, class: [] });
    } else {
        return JSON.stringify({ msg, list: [], pagecount: 1 });
    }
};


function myjsonParse(target) {
    return typeof target === 'string' ? JSON.parse(target) : target || {}
}
const Headers = {
    "user-agent": 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/150.0.0.0 Mobile',
    "Referer": baseUrl + "/",
    "Cookie": ""
};
async function myFetch(url, options = {}, needJsonParse = true) {
    try {
        let res = await req(url, {
            method: options?.method || "get",
            headers: Headers,
            ...options
        })
        return needJsonParse ? myjsonParse(res?.content) : res?.content
    } catch (err) {
        mylog("myfetch err ", err)
    }
}
async function init(ext) { }

async function home() {
    try {
        return JSON.stringify({
            class: [
                { type_id: "4", type_name: "动漫" },
                { type_id: "2", type_name: "电视剧" },
                { type_id: "1", type_name: "电影" },
                { type_id: "/label/qq", type_name: "腾讯" },
                { type_id: "/label/bli", type_name: "B站" },
                { type_id: "/label/youku", type_name: "优酷" },
                { type_id: "3", type_name: "综艺" },
                { type_id: "5", type_name: "热门短剧" }
            ]
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
        let page = parseInt(pg) || 1;


        // 1. 处理 VIP 精选等 HTML 页面分类
        if (!tid || tid?.startsWith("/label")) {
            const url = !tid ? baseUrl : `${baseUrl}${tid}/page/${page}.html`;
            mylog("label category url:", url);
            const res = await req(url, { headers: Headers });
            if (!res?.content) throw new Error("获取精选分类失败");
            return await parseList(res.content);
        }


        let params = [
            `mid=1`,
            `tid=${tid}`,
            `page=${page}`,
            `limit=20`,

        ];

        const apiUrl = `${baseUrl}/index.php/ajax/data?${params.join('&')}`;
        mylog("ajax category url ->", apiUrl);

        const data = await myFetch(apiUrl)
        if (!data) throw new Error("API 请求无响应");


        let list = [];
        if (Array.isArray(data?.list)) {
            list = data.list.map(it => {
                let vod_id = it.vod_id ? `/detail/${it.vod_id}.html` : '';
                if (!vod_id && it.detail_link) {
                    const match = it.detail_link.match(/\/detail\/(\d+)\.html/);
                    if (match) vod_id = `/detail/${match[1]}.html`;
                }
                return {
                    vod_id: vod_id,
                    vod_name: (it.vod_name || '').trim(),
                    vod_pic: fixPic(it.vod_pic || ''),
                    vod_remarks: (it.vod_remarks || '').trim(),
                    vod_year: (it.vod_year || '').trim()
                };
            }).filter(it => it.vod_id);
        }

        const pagecount = parseInt(data?.pagecount) || 1;
        const total = parseInt(data?.total) || list.length;

        return JSON.stringify({
            list,
            page: page,
            pagecount: pagecount,
            limit: 20,
            total: total
        });
    } catch (err) {
        return backError(err, 'category');
    }
}


async function search(wd, quick, page = 1) {
    if (parseInt(page) >= 2) {
        return JSON.stringify({ list: [] });
    }

    try {
        const cleanWd = decodeURIComponent(wd);
        const searchUrl = `${baseUrl}/index.php/ajax/suggest?mid=1&wd=${encodeURIComponent(cleanWd)}&limit=30`;
        mylog("ajax searchUrl:", searchUrl);

        const data = await myFetch(searchUrl)
        if (!data) throw new Error("搜索请求未返回数据");

        let list = [];

        if (Array.isArray(data?.list)) {
            list = data.list.map(it => ({
                vod_id: `/detail/${it.id}.html`,
                vod_name: (it.name || '').trim(),
                vod_pic: fixPic(it.pic || ''),
                vod_remarks: (it.remarks || '').trim()
            })).filter(it => it.vod_id);
        }
        list = list.reverse()

        return JSON.stringify({
            list,
            page: 1,
        });
    } catch (err) {
        return backError(err, 'search');
    }
}

// 图片防盗链/相对路径修补
function fixPic(u) {
    if (!u) return '';
    if (u.startsWith('//')) return 'https:' + u;
    return u.replace(/&amp;/g, '&');
}

// DOM 解析逻辑（用于标签/精选分类页面）
async function parseList(html) {
    const $ = cheerio.load(html);
    const list = [];

    $(".public-list-bj").each((_, el) => {
        const $el = $(el);
        const vod_id = $el.find("a.public-list-exp").attr("href");
        const vod_name = $el.find("a.public-list-exp").attr("title") || $(".thumb-content a").text().trim();
        const vod_pic = fixPic($el.find(".public-list-exp img").attr("data-src") || '');
        const vod_remarks = $el.find(".ft2").text().trim();

        const text4k = $el.find('.public-list-exp .public-prt-g').text().trim();
        const updateTime = $el.find('.public-list-exp .public-prt').eq(1).text().trim();
        const vod_year = `${text4k ? `「${text4k}」` : ''} ${updateTime}`.trim();

        list.push({ vod_id, vod_name: vod_name?.trim(), vod_pic, vod_remarks, vod_year });
    });

    const pagecount = parseInt($('.page-tip').text().match(/\d+\/(\d+)页/)?.[1]) || 1;

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

        // 1. 播放列表解析 logic
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

        // 辅助函数：快速提取包含特定关键词的标签文本
        const getInfoText = (key) => {
            const $box = $(`.detail-info .slide-info:contains("${key}")`).clone();
            $box.find('strong').remove(); // 移除 "导演："、"主演：" 等前缀标签
            return $box.text().replace(/\s+/g, ' ').trim();
        };

        // 2. 提取各项详细数据
        const vod_name = $('.slide-info-title').text().trim();
        
        // 封面图（优先取 data-src，没有则取 src）
        const imgAttr = $('.detail-pic img').attr("data-src") || $('.detail-pic img').attr("src") || '';
        const vod_pic = fixPic(imgAttr);

        // 导演
        const vod_director = getInfoText("导演");

        // 主演/演员（匹配 HTML 中的 "主演"）
        const vod_actor = getInfoText("主演");

        // 连载 / 备注（优先提取 "连载"，若无则提取 "更新"）
        let vod_remarks = getInfoText("连载");
        if (!vod_remarks) {
            vod_remarks = getInfoText("更新");
        }

        // 年份（从没有包含 strong 标签的 slide-info 中提取纯日期/年份）
     

        // 剧情简介
        const vod_content = $('#height_limit').text().trim() || $('.detail-info .slide-info-p').text().trim();

        // 3. 构建播放数据
        const { vod_play_from, vod_play_url } = buildVodPlayData(lines, playlists, true);

        return JSON.stringify({
            list: [{
                vod_id: vid,
                vod_name: vod_name,
                vod_pic: vod_pic,
                vod_director: vod_director,
                vod_actor: vod_actor,
                vod_remarks: vod_remarks,
                vod_content: vod_content,
                vod_play_from,
                vod_play_url
            }]
        });
    } catch (err) {
        return backError(err, 'detail');
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
        const parseApiUrl = parseMap[lineKey] || parseList["JD"];
        if (!parseApiUrl) throw new Error(`未找到匹配的解析接口[${lineKey}]`);

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

        if (url.startsWith('http') && (url.includes("m3u") || url.includes('.mp4'))) {
            mylog("直链播放", url);
            return JSON.stringify({ parse: 0, url });
        }

        const playUrl = await parsePLayUrl(url);
        if (!playUrl) throw new Error("线路解析失败，请尝试切换播放线路");

        return JSON.stringify({ parse: 0, url: playUrl });
    } catch (err) {
        return backError(err, 'play');
    }
}

export default { init, home, homeVod, category, detail, search, play };