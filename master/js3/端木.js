const host = 'http://154.219.117.219:8080';
const headers = {
    'User-Agent': 'okhttp/3.10.0',
    'Connection': 'Keep-Alive',
    'Accept-Encoding': 'gzip'
};

// 全局播放器配置缓存
let playerCache = {};

// 过滤词库
const tares = ['倫理', '倫理', '情色', '伦理', '贺利', '理论']; 

async function init(cfg) {}

/**
 * 将原始数组转换为影视列表
 */
function arr2vods(arr) {
    let videos = [];
    if (!Array.isArray(arr)) return videos;

    for (let i of arr) {
        let tag2 = i.vTest2;
        let type_name = tag2 ? `${i.vClass},${tag2}` : i.vClass;

        // 过滤敏感内容
        let vTag = i.vTag || "";
        let vTest1 = i.vTest1 || "";
        if (tares.some(k => vTag.includes(k) || vTest1.includes(k) || type_name.includes(k))) continue;

        // 解析备注信息
        let remake = "";
        try {
            let vRemake = JSON.parse(i.vRemake || "[]");
            vRemake.forEach(j => { if (j.remake) remake = j.remake; });
        } catch (e) {}

        // 详情信息打包进 ID 以减少请求
        let detail = {
            vod_pic: i.vPic,
            vod_remarks: remake,
            vod_year: i.vYear,
            vod_area: i.vArea,
            vod_actor: i.vActor,
            vod_director: i.vWriter,
            vod_content: i.vContent,
            type_name: type_name
        };

        videos.push({
            vod_id: (i.vDetailId || i.id) + "@" + JSON.stringify(detail),
            vod_name: i.vName,
            vod_pic: i.vPic,
            vod_remarks: remake,
            vod_content: i.vBlurb || i.vContent
        });
    }
    return videos;
}

async function home(filter) {
    // 固定分类列表
    const classes = [
        { type_id: 1, type_name: '电影' },
        { type_id: 2, type_name: '电视剧' },
        { type_id: 4, type_name: '动漫' },
        { type_id: 3, type_name: '综艺' },
        { type_id: 22, type_name: '纪录片' },
        { type_id: 24, type_name: '少儿' },
        { type_id: 26, type_name: '短剧' }
    ];
    return JSON.stringify({ class: classes });
}

async function homeVod() {
    const r = await req(`${host}/dev_webvip/v4/app/homeListNew?type=0`, { headers });
    const json = JSON.parse(r.content);
    let videos = [];
    // 遍历首页数据块
    (json.data || []).forEach(i => {
        if (i.dataInfoList) {
            videos = videos.concat(arr2vods(i.dataInfoList));
        }
    });
    return JSON.stringify({ list: videos });
}

async function category(tid, pg, filter, extend = {}) {
    const url = `${host}/dev_webvip/v2/app/getVideoList?pageSize=12&currentPage=${pg}&type=${tid}`;
    const r = await req(url, { headers });
    const json = JSON.parse(r.content);
    return JSON.stringify({
        list: arr2vods(json.data.list),
        pagecount: json.data.pages,
        page: pg
    });
}

async function detail(id) {
    // 分离 ID 和预存的详情 JSON
    let parts = id.split('@');
    let vid = parts[0];
    let details = JSON.parse(parts[1] || "{}");

    const r = await req(`${host}/dev_webvip/v1/typeNameList/totalList?vDetailId=${vid}`, { headers });
    const data = JSON.parse(r.content).data;

    // 缓存播放源配置（解析接口等）
    data.vipTypeUrlNames.forEach(i => {
        playerCache[i.vUrlType] = {
            typeUrlName: i.typeUrlName,
            jxApi: i.jxApi,
            ua: i.ua
        };
    });

    let playFrom = [];
    let playUrl = [];
    
    // 聚合播放线路
    let urls = data.videoUrlLists.map(i => {
        let name = playerCache[i.vUrlType] ? playerCache[i.vUrlType].typeUrlName : "默认";
        if (!playFrom.includes(name)) playFrom.push(name);
        return `${i.vTitle}$${i.vUrlType}@${i.vUrl || i.gfUrl || ""}`;
    });

    return JSON.stringify({
        list: [{
            vod_id: vid,
            vod_name: details.vod_name || "",
            ...details,
            vod_play_from: playFrom.join("$$$"),
            vod_play_url: urls.join("#")
        }]
    });
}

async function search(wd, quick, pg = 1) {
    // 搜索使用 POST 请求
    const r = await post(`${host}/dev_webvip/v2/app/getVideoListType`, {
        body: `name=${encodeURIComponent(wd)}`,
        headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    const json = JSON.parse(r.content);
    return JSON.stringify({ list: arr2vods(json.data), page: pg });
}

async function play(flag, id, flags) {
    let parts = id.split('@');
    let vUrlTypeKey = parts[0];
    let rawUrl = parts[1];
    
    let config = playerCache[vUrlTypeKey] || {};
    let url = "";
    let playUa = "Lavf/58.12.100";
    let jx = 0;

    // 处理解析接口
    if (config.jxApi && typeof config.jxApi === 'string') {
        try {
            const r = await req(`${config.jxApi}${rawUrl}`, { headers });
            const res = JSON.parse(r.content);
            if (res.url && res.url.startsWith('http') && res.url !== rawUrl) {
                url = res.url;
            }
            if (res.UA) playUa = res.UA;
        } catch (e) {}
    }

    // 处理 User-Agent 覆盖
    if (config.ua && typeof config.ua === 'string') {
        playUa = config.ua.replace('User-Agent=>', '');
    }

    // 兜底逻辑
    if (!url) {
        if (rawUrl.startsWith('http')) {
            url = rawUrl;
            jx = 0;
        } else if (/(?:www\.iqiyi|v\.qq|v\.youku|www\.mgtv|www\.bilibili)\.com/.test(rawUrl)) {
            url = rawUrl;
            jx = 1; // 需要嗅探
        }
    }

    return JSON.stringify({
        jx: jx,
        parse: 0,
        url: url,
        header: { 'User-Agent': playUa }
    });
}

export default { init, home, homeVod, category, detail, search, play };
