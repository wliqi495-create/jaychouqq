

let host = 'https://m.ximalaya.com';
let searchHost = 'https://api.cenguigui.cn';
let UA = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36'
};

async function request(url, obj) {
    if (!obj) {
        obj = {
            headers: UA,
            timeout: 5000
        }
    }
    const response = await req(url, obj);
    return response.content;
}

async function init(cfg) {
    console.log(`cfg参数类型: ${typeof cfg}, 值:`, cfg);
    
    // 统一处理为字符串配置
    if (cfg && typeof cfg === 'string') {
        host = cfg;
    } else if (cfg && typeof cfg === 'object') {
        // 优先从对象中提取配置
        ext = cfg.ext
        
        host = ext.host || ext.hosturl || ext.url || ext.site  ;
        // 设置应用需要的属性
        cfg.skey = '';
        cfg.stype = '3';
    } 
    
    console.log(`host: ${host}`);
}

async function home(filter) {
    const classNames = '有声书&儿童&音乐&相声&娱乐&广播剧&历史&外语';
    const classUrls = 'youshengshu&ertong&yinyue&xiangsheng&yule&guangbojv&lishi&waiyu';
    
    const names = classNames.split('&');
    const urls = classUrls.split('&');
    
    const classes = [];
    for (let i = 0; i < names.length && i < urls.length; i++) {
        classes.push({
            type_id: urls[i],
            type_name: names[i]
        });
    }
    
    const filters = {};
    classes.forEach(cls => {
        filters[cls.type_id] = [];
    });
    
    return JSON.stringify({ class: classes, filters: filters });
}

async function homeVod() {
    return JSON.stringify({ list: [] });
}

async function category(tid, pg, filter, extend) {
    try {
        const url = `${host}/m-revision/page/category/queryCategoryAlbumsByPage?sort=0&pageSize=50&page=${pg || 1}&categoryCode=${tid}`;
        const html = await request(url);
        
        if (!html) {
            return JSON.stringify({
                list: [],
                page: pg || 1,
                pagecount: 1,
                limit: 50,
                total: 0
            });
        }
        
        const data = JSON.parse(html).data.albumBriefDetailInfos;
        const videos = [];
        
        data.forEach(it => {
            const vip = it.albumInfo.albumVipPayType;
            // 只显示免费内容
            if (vip === 0) {
                const id = `http://mobile.ximalaya.com/mobile/others/ca/album/track/${it.id}/true/0/200?albumId=${it.id}`;
                videos.push({
                    vod_id: id,
                    vod_name: it.albumInfo.title,
                    vod_pic: `http://imagev2.xmcdn.com/${it.albumInfo.cover}`,
                    vod_remarks: '免费'
                });
            }
        });
        
        return JSON.stringify({
            list: videos,
            page: pg || 1,
            pagecount: 10, // 假设有10页
            limit: 50,
            total: videos.length
        });
        
    } catch (e) {
        return JSON.stringify({
            list: [],
            page: pg || 1,
            pagecount: 1,
            limit: 50,
            total: 0
        });
    }
}

async function detail(id) {
    try {
        const urls = [];
        
        // 解析专辑ID
        const albumIdMatch = id.match(/albumId=(\d+)/);
        const albumId = albumIdMatch ? albumIdMatch[1] : '';
        
        // 获取第一页数据
        const html = await request(id);
        const json = JSON.parse(html);
        const album = json.album;
        let data = json.tracks.list;
        const maxPageId = json.tracks.maxPageId;
        
        // 处理第一页数据
        data.forEach(it => {
            urls.push(`${it.title}$${it.playPathAacv164}`);
        });
        
        // 获取后续分页数据
        if (maxPageId > 1) {
            for (let j = 2; j <= maxPageId; j++) {
                const pageUrl = id.replace('/0/', `/${j}/`);
                try {
                    const pageHtml = await request(pageUrl);
                    const pageJson = JSON.parse(pageHtml);
                    const pageData = pageJson.tracks.list;
                    pageData.forEach(it => {
                        urls.push(`${it.title}$${it.playPathAacv164}`);
                    });
                } catch (e) {
                    console.log(`获取分页数据失败: ${pageUrl}`);
                }
            }
        }
        
        const vod = {
            vod_id: id,
            vod_name: album.title || '暂无名称',
            vod_pic: album.coverLarge || '暂无图片',
            vod_content: album.intro || '暂无简介',
            vod_remarks: `共${urls.length}集`,
            vod_play_from: '喜马拉雅',
            vod_play_url: urls.join('#')
        };
        
        return JSON.stringify({ list: [vod] });
        
    } catch (e) {
        console.log(`detail函数错误: ${e.message}`);
        return JSON.stringify({ list: [] });
    }
}

async function play(flag, id, flags) {
    try {
        // 直接播放音频URL
        return JSON.stringify({
            parse: 0,
            jx: 0,
            url: id,
            header: {}
        });
        
    } catch (e) {
        return JSON.stringify({
            parse: 0,
            jx: 0,
            url: ["错误", "播放地址获取失败"],
            header: {}
        });
    }
}

async function search(wd, quick, pg = "1") {
    try {
        const url = `${searchHost}/api/music/ximalaya.php?name=${encodeURIComponent(wd)}`;
        const html = await request(url);
        
        if (!html) {
            return JSON.stringify({
                list: [],
                page: parseInt(pg),
                pagecount: 0,
                limit: 20,
                total: 0
            });
        }
        
        const data = JSON.parse(html).data;
        const videos = data.map(it => {
            const id = `http://mobile.ximalaya.com/mobile/others/ca/album/track/${it.albumId}/true/0/200?albumId=${it.albumId}`;
            return {
                vod_id: id,
                vod_name: it.title,
                vod_pic: it.cover,
                vod_remarks: '喜马拉雅'
            };
        });
        
        return JSON.stringify({
            list: videos,
            page: parseInt(pg),
            pagecount: 1,
            limit: 20,
            total: videos.length
        });
        
    } catch (e) {
        return JSON.stringify({
            list: [],
            page: parseInt(pg),
            pagecount: 0,
            limit: 20,
            total: 0
        });
    }
}

export default {
    init: init,
    home: home,
    homeVod: homeVod,
    category: category,
    detail: detail,
    play: play,
    search: search
};