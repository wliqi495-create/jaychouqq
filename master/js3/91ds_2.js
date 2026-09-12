/*
@header({
  searchable: 1,
  filterable: 1,
  quickSearch: 1,
  title: '91电视[直]',
  lang: 'cat',
})
*/


import { Crypto as CryptoJS } from 'assets://js/lib/cat.js';

let host = 'http://sj.91kds.cn';
let UA = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
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
        let ext = cfg.ext;
        
        // 判断ext不为空（存在且有属性）
        if (ext && typeof ext === 'object' && Object.keys(ext).length) {
            host = ext.host || ext.hosturl || ext.url || ext.site;
        }
    } 
    console.log(`host: ${host}`);
}


async function home(filter) {
    const classes = [
        { type_id: "央视", type_name: "央视" },
        { type_id: "卫视", type_name: "卫视" },
        { type_id: "高清", type_name: "高清" },
        { type_id: "4K", type_name: "4K" },
        { type_id: "影视", type_name: "影视" },
        { type_id: "体育", type_name: "体育" },
        { type_id: "动漫", type_name: "动漫" },
        { type_id: "财经", type_name: "财经" },
        { type_id: "综艺", type_name: "综艺" },
        { type_id: "教育", type_name: "教育" },
        { type_id: "新闻", type_name: "新闻" },
        { type_id: "纪录", type_name: "纪录" },
        { type_id: "国际", type_name: "国际" },
        { type_id: "网络", type_name: "网络" },
        { type_id: "购物", type_name: "购物" },
        { type_id: "虎牙", type_name: "虎牙" },
        { type_id: "安徽", type_name: "安徽" },
        { type_id: "北京", type_name: "北京" },
        { type_id: "重庆", type_name: "重庆" },
        { type_id: "福建", type_name: "福建" },
        { type_id: "甘肃", type_name: "甘肃" },
        { type_id: "湖北", type_name: "湖北" },
        { type_id: "湖南", type_name: "湖南" },
        { type_id: "吉林", type_name: "吉林" },
        { type_id: "江苏", type_name: "江苏" },
        { type_id: "江西", type_name: "江西" },
        { type_id: "辽宁", type_name: "辽宁" },
        { type_id: "内蒙古", type_name: "内蒙古" },
        { type_id: "宁夏", type_name: "宁夏" },
        { type_id: "青海", type_name: "青海" },
        { type_id: "山东", type_name: "山东" },
        { type_id: "山西", type_name: "山西" },
        { type_id: "陕西", type_name: "陕西" },
        { type_id: "上海", type_name: "上海" },
        { type_id: "贵州", type_name: "贵州" },
        { type_id: "海南", type_name: "海南" },
        { type_id: "河北", type_name: "河北" },
        { type_id: "河南", type_name: "河南" },
        { type_id: "黑龙江", type_name: "黑龙江" },
        { type_id: "天津", type_name: "天津" },
        { type_id: "新疆", type_name: "新疆" },
        { type_id: "西藏", type_name: "西藏" },
        { type_id: "云南", type_name: "云南" },
        { type_id: "浙江", type_name: "浙江" },
        { type_id: "广西", type_name: "广西" },
        { type_id: "广东", type_name: "广东" },
        { type_id: "四川", type_name: "四川" }
    ];
    
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
        const url = `${host}/api/get_channel.php?id=${tid}`;
        const html = await request(url);
        
        if (!html || !html.includes('ename')) {
            return JSON.stringify({
                list: [],
                page: 1,
                pagecount: 1,
                limit: 20,
                total: 0
            });
        }
        
        const list = JSON.parse(html);
        const nwtime = Math.floor(Date.now() / 1000);
        
        const videos = list.map(item => {
            const enamee = item.ename;
            const srcKey = enamee + "com.jiaoxiang.fangnaleahkajfkahlajjaflfakhfakfbuyaozaigaolefuquqikangbuzhu2.3.4fu:ck:92:92:ff" + nwtime + "20240918";
            const sign = CryptoJS.MD5(srcKey).toString();
            const detailUrl = `http://sjapi1.91kds.cn/api/get_source.php?ename=${enamee}&app=com.jiaoxiang.fangnale&version=2.3.4&mac=fu:ck:92:92:ff&nwtime=${nwtime}&sign=${sign}&ev=20240918`;
            
            return {
                vod_id: detailUrl + '@' + item.name,
                vod_name: item.name,
                vod_pic: item.icon,
                vod_remarks: '直播'
            };
        });
        
        return JSON.stringify({
            list: videos,
            page: 1,
            pagecount: 1,
            limit: 20,
            total: videos.length
        });
        
    } catch (e) {
        return JSON.stringify({
            list: [],
            page: 1,
            pagecount: 1,
            limit: 20,
            total: 0
        });
    }
}

async function detail(id) {
    try {
        const [purl, vod_name] = id.split('@');
        const html = await request(purl);
        const data = JSON.parse(html);
        
        const vod = {
            vod_id: purl,
            vod_name: vod_name || data.name || data.title || "直播频道",
            vod_pic: data.icon || "",
            vod_content: data.desc || "暂无简介",
            vod_remarks: "直播"
        };
        
        let list = data.liveSource || [];
        let names = data.liveSourceName || [];
        let playFrom = [];
        let playUrl = [];
        let seen = new Set();
        let lineCounter = 1;
        
        list.forEach((item, j) => {
            let rawInput = item;
            let inputUrl = rawInput.replace(/^kdsvod:\/\//, '');
            let urlName = names[j] || '线路' + lineCounter;
            
            if (inputUrl.includes('pwd=jsdecode') && inputUrl.includes('id=')) {
                let parts = inputUrl.split('?');
                let baseUrl = parts[0];
                let queryStr = parts[1] || '';
                let queryObj = {};
                queryStr.split('&').forEach(kv => {
                    let t = kv.split('=');
                    if (t[0]) queryObj[t[0]] = decodeURIComponent(t[1] || '');
                });
                
                let id = queryObj['id'];
                let bt = queryObj['bt'] || null;
                let coreKey = (bt || '') + '_' + id;
                
                if (seen.has(coreKey)) return;
                seen.add(coreKey);
                
                let params = {
                    app: 'com.jiaoxiang.fangnale',
                    version: '2.3.4',
                    mac: 'fu:ck:92:92:ff',
                    utk: '',
                    nwtime: Math.floor(Date.now() / 1000),
                    ev: '20250113'
                };
                
                let appendStr = 'ahkajfkahlajjaflfakhfakfbuyaozaigaolefuquqikangbuzhu';
                let signStr = id;
                Object.keys(params).forEach(key => {
                    if (key === 'tmk') return;
                    if (key === 'app') signStr += params[key] + appendStr;
                    else signStr += params[key];
                });
                
                params.sign = CryptoJS.MD5(signStr).toString();
                let finalQuery = [];
                if (bt !== null) finalQuery.push('bt=' + bt);
                finalQuery.push('id=' + id);
                Object.keys(params).forEach(k => {
                    finalQuery.push(k + '=' + encodeURIComponent(params[k]));
                });
                
                let finalUrl = baseUrl + '?' + finalQuery.join('&');
                let lineName = '线路' + lineCounter;
                playFrom.push(lineName);
                playUrl.push(urlName + '$' + finalUrl);
                lineCounter++;
                
            } else {
                let videoUrl;
                if (inputUrl.startsWith('htmlplay://')) {
                    videoUrl = inputUrl.replace('htmlplay://', '').split('#')[0];
                } else {
                    videoUrl = inputUrl;
                }
                
                let urlKey = videoUrl.split('?')[0];
                if (seen.has(urlKey)) return;
                seen.add(urlKey);
                
                let referer = '';
                if (inputUrl.includes('@@referer=')) {
                    let tmp = inputUrl.split('@@referer=');
                    videoUrl = tmp[0];
                    referer = tmp[1] || '';
                }
                
                let lineName = '线路' + lineCounter;
                
                if (referer) {
                    let playObj = JSON.stringify({
                        url: videoUrl,
                        header: {
                            Referer: referer
                        }
                    });
                    playFrom.push(lineName);
                    playUrl.push(urlName + '$' + playObj);
                } else {
                    playFrom.push(lineName);
                    playUrl.push(urlName + '$' + videoUrl);
                }
                lineCounter++;
            }
        });
        
        vod.vod_play_from = playFrom.join('$$$');
        vod.vod_play_url = playUrl.join('$$$');
        
        return JSON.stringify({ list: [vod] });
        
    } catch (e) {
        return JSON.stringify({ list: [] });
    }
}

async function play(flag, id, flags) {
    
        return JSON.stringify({
            parse: 0,
            url: id,
            header: {}
        });
}

async function search(wd, quick, pg = "1") {
    try {
        const nwtime = Math.floor(Date.now() / 1000);
        const srcKey = "4954af3c86d8bc0b766afee71503d860" + nwtime + "f8dd806a73202456eb6e782c1c4aecfc";
        const sign = CryptoJS.MD5(srcKey).toString();
        
        const searchUrl = `${host}/api/get_search.php?id=${encodeURIComponent(wd)}`;
        const html = await request(searchUrl);
        
        if (!html || !html.includes('ename')) {
            return JSON.stringify({
                list: [],
                page: parseInt(pg),
                pagecount: 0,
                limit: 20,
                total: 0
            });
        }
        
        const list = JSON.parse(html);
        const videos = list.map(item => ({
            vod_id: `${host}/api/get_source.php?ename=${item.ename}@${item.name}`,
            vod_name: item.name,
            vod_pic: item.icon,
            vod_remarks: item.path || ''
        }));
        
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

export function __jsEvalReturn() {
  return {
    init: init,
    home: home,
    homeVod: homeVod,
    category: category,
    detail: detail,
    play: play,
    search: search
  };
}