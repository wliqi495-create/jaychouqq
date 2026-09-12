// 无搜索功能
import { _ } from './lib/cat.js';
let key = '视聚场';
let HOST = 'http://api.cntv.cn';
let siteKey = '';
let siteType = 0;
const MOBILE_UA = 'Mozilla/5.0 (Linux; Android 11; M2007J3SC Build/RKQ1.200826.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/77.0.3865.120 MQQBrowser/6.2 TBS/045714 Mobile Safari/537.36';

async function request(reqUrl, agentSp) {
    let res = await req(reqUrl, {
        method: 'get',
        headers: {
            'User-Agent': agentSp || MOBILE_UA,
        },
    });
    return res.content
}

async function init(cfg) {
    siteKey = cfg.skey;
    siteType = cfg.stype
}

async function home(filter) {
    const classes = [ 
        
         { type_id: "TOPC1451559129520755", type_name: "新闻直播间" },
         { type_id: "TOPC1451539894330405", type_name: "中国新闻" },	
         	  
         { type_id: "TOPC1451558496100826", type_name: "朝闻天下" },          	 
         { type_id: "TOPC1451528971114112", type_name: "新闻联播" }, 	 
        { type_id: "TOPC1451528792881669", type_name: "晚间新闻" }, 
        { type_id: "TOPC1451558779639282", type_name: "午夜新闻" },         	 
        
        { type_id: "TOPC1451559097947700", type_name: "新闻30分" },
        { type_id: "TOPC1451558428005729", type_name: "24小时" }, 	
        { type_id: "TOPC1451559066181661", type_name: "新闻1+1" },        
        
        { type_id: "TOPC1451540328102649", type_name: "海峡两岸" }, 
        { type_id: "TOPC1451540389082713", type_name: "今日关注" },	
        { type_id: "TOPC1451540448405749", type_name: "今日亚洲" },
        { type_id: "TOPC1571034705435323", type_name: "今日环球" }, 
        	
        { type_id: "TOPC1451558819463311", type_name: "新闻调查" }, 	
        { type_id: "TOPC1451527941788652", type_name: "军事报道" }, 	
        { type_id: "TOPC1451533782742171", type_name: "经济信息联播" },			
        { type_id: "TOPC1451550970356385", type_name: "体坛快讯" }, 
        
        { type_id: "TOPC1451558976694518", type_name: "焦点访谈" },    
        { type_id: "TOPC1451558532019883", type_name: "东方时空" },          
        { type_id: "TOPC1451559180488841", type_name: "新闻周刊" },
        { type_id: "TOPC1451543462858283", type_name: "一线" }
        ];
    const filterObj = {};
    return JSON.stringify({
        class: _.map(classes, (cls) => {
            cls.land = 1;
            cls.ratio = 1.78;
            return cls;
        }),
        filters: filterObj,
    })
}

async function homeVod() {
    const data = JSON.parse(await request(HOST + '/NewVideo/getVideoListByColumn?id=TOPC1451558856402351&n=10&sort=desc&p=1&mode=0&serviceId=tvcctv'));
    let videos = _.map(data.data.list, (it) => {
        return {
            vod_id: it.guid,
            vod_name: it.title,
            vod_pic: it.image,
            vod_remarks: it.time || '',
        }
    });
    return JSON.stringify({
        list: videos,
    })
}

async function category(tid, pg, filter, extend) {
    if (pg <= 0 || typeof pg == 'undefined') pg = 1;
    const data = JSON.parse(await request(HOST + '/NewVideo/getVideoListByColumn?id=' + tid + '&n=10&sort=desc&p=' + pg + '&mode=0&serviceId=tvcctv'));
    let videos = _.map(data.data.list, (it) => {
        return {
            vod_id: it.guid,
            vod_name: it.title,
            vod_pic: it.image,
            vod_remarks: it.time || '',
        }
    });
    const pgChk = JSON.parse(await request(HOST + '/NewVideo/getVideoListByColumn?id=' + tid + '&n=10&sort=desc&p=' + (parseInt(pg) + 1) + '&mode=0&serviceId=tvcctv')).data.list;
    const pgCount = pgChk.length > 0 ? parseInt(pg) + 1 : parseInt(pg);
    return JSON.stringify({
        page: parseInt(pg),
        pagecount: parseInt(pgCount),
        limit: 10,
        total: parseInt(data.total),
        list: videos,
    })
}

async function detail(id) {
    const vod = {
        vod_id: id,
        vod_remarks: '',
    };
    const playlist = ['点击播放' + '$' + 'https://hls.cntv.myhwcdn.cn/asp/hls/2000/0303000a/3/default/' + id + '/2000.m3u8'];
    vod.vod_play_from = key;
    vod.vod_play_url = playlist.join('#');
    return JSON.stringify({
        list: [vod],
    });
}

async function play(flag, id, flags) {
    // console.debug('视聚场 id =====>' + id); // js_debug.log
    return JSON.stringify({
        parse: 0,
        url: id,
    })
}

async function search(wd, quick, pg) {
    return '{}'
}

export function __jsEvalReturn() {
    return {
        init: init,
        home: home,
        homeVod: homeVod,
        category: category,
        detail: detail,
        play: play,
        search: search,
    }
}