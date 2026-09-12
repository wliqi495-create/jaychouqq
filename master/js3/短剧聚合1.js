import { Crypto, _ } from 'assets://js/lib/cat.js';
let siteKey = '';
let siteType = 0;
let extendObj = {};

const aggConfig = {
    keys: 'd3dGiJc651gSQ8w1',
    charMap: {
        '+': 'P', '/': 'X', '0': 'M', '1': 'U', '2': 'l', '3': 'E', '4': 'r', '5': 'Y', '6': 'W', '7': 'b', '8': 'd', '9': 'J',
        'A': '9', 'B': 's', 'C': 'a', 'D': 'I', 'E': '0', 'F': 'o', 'G': 'y', 'H': '_', 'I': 'H', 'J': 'G', 'K': 'i', 'L': 't',
        'M': 'g', 'N': 'N', 'O': 'A', 'P': '8', 'Q': 'F', 'R': 'k', 'S': '3', 'T': 'h', 'U': 'f', 'V': 'R', 'W': 'q', 'X': 'C',
        'Y': '4', 'Z': 'p', 'a': 'm', 'b': 'B', 'c': 'O', 'd': 'u', 'e': 'c', 'f': '6', 'g': 'K', 'h': 'x', 'i': '5', 'j': 'T',
        'k': '-', 'l': '2', 'm': 'z', 'n': 'S', 'o': 'Z', 'p': '1', 'q': 'V', 'r': 'v', 's': 'j', 't': 'Q', 'u': '7', 'v': 'D',
        'w': 'w', 'x': 'n', 'y': 'L', 'z': 'e'
    },
    headers: {
        niuniu: {
            'Cache-Control': 'no-cache',
            'Content-Type': 'application/json;charset=UTF-8',
            'User-Agent': 'okhttp/4.12.0'
        },
        default: {
            'User-Agent': 'okhttp/3.12.11',
            'content-type': 'application/json; charset=utf-8'
        }
    },
    platform: {
        百度: {
            host: 'https://api.jkyai.top',
            url1: '/API/bddjss.php?name=fyclass&page=fypage',
            url2: '/API/bddjss.php?id=fyid',
            search: '/API/bddjss.php?name=**&page=fypage'
        },
        甜圈: {
            host: 'https://mov.cenguigui.cn',
            url1: '/duanju/api.php?classname',
            url2: '/duanju/api.php?book_id',
            search: '/duanju/api.php?name'
        },
        锦鲤: {
            host: 'https://api.jinlidj.com',
            search: '/api/search',
            url2: '/api/detail'
        },
        番茄: {
            host: 'https://reading.snssdk.com',
            url1: '/reading/bookapi/bookmall/cell/change/v',
            url2: 'https://fqgo.52dns.cc/catalog',
            search: 'https://fqgo.52dns.cc/search'
        },
        星芽: {
            host: 'https://app.whjzjx.cn',
            url1: '/cloud/v2/theater/home_page?theater_class_id',
            url2: '/v2/theater_parent/detail',
            search: '/v3/search',
            loginUrl: 'https://u.shytkjgs.com/user/v1/account/login'
        },
        西饭: {
            host: 'https://xifan-api-cn.youlishipin.com',
            url1: '/xifan/drama/portalPage',
            url2: '/xifan/drama/getDuanjuInfo',
            search: '/xifan/search/getSearchList'
        },
        软鸭: {
            host: 'https://api.xingzhige.com',
            url1: '/API/playlet',
            search: '/API/playlet'
        },
        七猫: {
            host: 'https://api-store.qmplaylet.com',
            url1: '/api/v1/playlet/index',
            url2: 'https://api-read.qmplaylet.com/player/api/v1/playlet/info',
            search: '/api/v1/playlet/search'
        },
        牛牛: {
            host: 'https://new.tianjinzhitongdaohe.com',
            url1: '/api/v1/app/screen/screenMovie',
            url2: '/api/v1/app/play/movieDetails',
            search: '/api/v1/app/search/searchMovie'
        },
        围观: {
            host: 'https://api.drama.9ddm.com',
            url1: '/drama/home/shortVideoTags',
            url2: '/drama/home/shortVideoDetail',
            search: '/drama/home/search'
        },
        碎片: {
            host: 'https://free-api.bighotwind.cc',
            url1: '/papaya/papaya-api/theater/tags',
            url2: '/papaya/papaya-api/videos/info',
            search: '/papaya/papaya-api/videos/page'
        }
    },
    platformList: [
        { name: '七猫短剧', id: '七猫' },
        { name: '软鸭短剧', id: '软鸭' },
        { name: '西饭短剧', id: '西饭' },
        { name: '甜圈短剧', id: '甜圈' }
    ],
    search: { limit: 30, timeout: 6000 }
};

const filter_def = {
    百度: { area: '逆袭' },
    甜圈: { area: '逆袭' },
    锦鲤: { area: '' },
    番茄: { area: 'videoseries_hot' },
    星芽: { area: '1' },
    西饭: { area: '68@都市' },
    软鸭: { area: '战神' },
    七猫: { area: '0' },
    牛牛: { area: '现言' },
    围观: { area: '' },
    碎片: { area: '' }
};

const customFilters = {
    "百度": [{
        key: "area",
        name: "题材",
        init: "逆袭",
        value: [
            { name: "逆袭", value: "逆袭" }, { name: "战神", value: "战神" }, { name: "都市", value: "都市" },
            { name: "穿越", value: "穿越" }, { name: "重生", value: "重生" }, { name: "古装", value: "古装" },
            { name: "言情", value: "言情" }, { name: "虐恋", value: "虐恋" }, { name: "甜宠", value: "甜宠" },
            { name: "神医", value: "神医" }, { name: "萌宝", value: "萌宝" }
        ]
    }],
    "甜圈": [{
        key: "area",
        name: "分类",
        init: "逆袭",
        value: [
            { name: "逆袭", value: "逆袭" },
            { name: "霸总", value: "霸总" },
            { name: "现代言情", value: "现代言情" },
            { name: "打脸虐渣", value: "打脸虐渣" },
            { name: "豪门恩怨", value: "豪门恩怨" },
            { name: "神豪", value: "神豪" },
            { name: "马甲", value: "马甲" },
            { name: "都市日常", value: "都市日常" },
            { name: "战神归来", value: "战神归来" },
            { name: "小人物", value: "小人物" },
            { name: "女性成长", value: "女性成长" },
            { name: "大女主", value: "大女主" },
            { name: "穿越", value: "穿越" },
            { name: "都市修仙", value: "都市修仙" },
            { name: "强者回归", value: "强者回归" },
            { name: "亲情", value: "亲情" },
            { name: "古装", value: "古装" },
            { name: "重生", value: "重生" },
            { name: "闪婚", value: "闪婚" },
            { name: "赘婿逆袭", value: "赘婿逆袭" },
            { name: "虐恋", value: "虐恋" },
            { name: "追妻", value: "追妻" },
            { name: "天下无敌", value: "天下无敌" },
            { name: "家庭伦理", value: "家庭伦理" },
            { name: "萌宝", value: "萌宝" },
            { name: "古风权谋", value: "古风权谋" },
            { name: "职场", value: "职场" },
            { name: "奇幻脑洞", value: "奇幻脑洞" },
            { name: "异能", value: "异能" },
            { name: "无敌神医", value: "无敌神医" },
            { name: "古风言情", value: "古风言情" },
            { name: "传承觉醒", value: "传承觉醒" },
            { name: "现言甜宠", value: "现言甜宠" },
            { name: "奇幻爱情", value: "奇幻爱情" },
            { name: "乡村", value: "乡村" },
            { name: "历史古代", value: "历史古代" },
            { name: "王妃", value: "王妃" },
            { name: "高手下山", value: "高手下山" },
            { name: "娱乐圈", value: "娱乐圈" },
            { name: "强强联合", value: "强强联合" },
            { name: "破镜重圆", value: "破镜重圆" },
            { name: "暗恋成真", value: "暗恋成真" },
            { name: "民国", value: "民国" },
            { name: "欢喜冤家", value: "欢喜冤家" },
            { name: "系统", value: "系统" },
            { name: "真假千金", value: "真假千金" },
            { name: "龙王", value: "龙王" },
            { name: "校园", value: "校园" },
            { name: "穿书", value: "穿书" },
            { name: "女帝", value: "女帝" },
            { name: "团宠", value: "团宠" },
            { name: "年代爱情", value: "年代爱情" },
            { name: "玄幻仙侠", value: "玄幻仙侠" },
            { name: "青梅竹马", value: "青梅竹马" },
            { name: "悬疑推理", value: "悬疑推理" },
            { name: "皇后", value: "皇后" },
            { name: "替身", value: "替身" },
            { name: "大叔", value: "大叔" },
            { name: "喜剧", value: "喜剧" },
            { name: "剧情", value: "剧情" }
        ]
    }],
    "锦鲤": [{
        key: "area",
        name: "分类",
        init: "",
        value: [
            { name: "全部", value: "" }, { name: "推荐", value: "1" }, { name: "霸总", value: "2" },
            { name: "战神", value: "3" }, { name: "神医", value: "4" }, { name: "虐恋", value: "5" },
            { name: "萌宝", value: "6" }, { name: "逆袭", value: "7" }, { name: "穿越", value: "8" },
            { name: "古装", value: "9" }, { name: "重生", value: "10" }
        ]
    }],
    "番茄": [{
        key: "area",
        name: "分类",
        init: "videoseries_hot",
        value: [
            { name: "热剧", value: "videoseries_hot" },
            { name: "新剧", value: "firstonlinetime_new" },
            { name: "逆袭", value: "cate_739" },
            { name: "总裁", value: "cate_29" },
            { name: "现言", value: "cate_3" },
            { name: "打脸", value: "cate_1051" },
            { name: "马甲", value: "cate_266" },
            { name: "豪门", value: "cate_1053" },
            { name: "都市", value: "cate_261" },
            { name: "神豪", value: "cate_20" }
        ]
    }],
    "星芽": [{
        key: "area",
        name: "频道",
        init: "1",
        value: [
            { name: "推荐", value: "1" }, { name: "男频", value: "2" }, { name: "女频", value: "3" }
        ]
    }],
    "西饭": [{
        key: "area",
        name: "分类",
        init: "68@都市",
        value: [
            { name: "都市", value: "68@都市" },
            { name: "青春", value: "68@青春" },
            { name: "现代言情", value: "81@现代言情" },
            { name: "豪门", value: "81@豪门" },
            { name: "大女主", value: "80@大女主" },
            { name: "逆袭", value: "79@逆袭" },
            { name: "打脸虐渣", value: "79@打脸虐渣" },
            { name: "穿越", value: "81@穿越" },
            { name: "推荐", value: "68@推荐" },
            { name: "情节", value: "79@情节" },
            { name: "角色", value: "80@角色" },
            { name: "主题", value: "81@主题" },
            { name: "集数", value: "82@集数" }
        ]
    }],
    "软鸭": [{
        key: "area",
        name: "题材",
        init: "战神",
        value: [
            { name: "战神", value: "战神" },
            { name: "逆袭", value: "逆袭" },
            { name: "人物", value: "人物" },
            { name: "都市", value: "都市" },
            { name: "擦边", value: "擦边" },
            { name: "人妖", value: "人妖" },
            { name: "闪婚", value: "闪婚" },
            { name: "古装", value: "古装" },
            { name: "霸总", value: "霸总" },
            { name: "强者", value: "强者" },
            { name: "玄幻", value: "玄幻" },
            { name: "神豪", value: "神豪" },
            { name: "现代", value: "现代" },
            { name: "爱情", value: "爱情" },
            { name: "虐渣", value: "虐渣" },
            { name: "总裁", value: "总裁" },
            { name: "无敌", value: "无敌" },
            { name: "奇幻", value: "奇幻" }
        ]
    }],
    "七猫": [{
        key: "area",
        name: "分类",
        init: "0",
        value: [
            { name: "全部", value: "0" }, { name: "都市", value: "1" }, { name: "言情", value: "2" },
            { name: "战神", value: "3" }, { name: "逆袭", value: "4" }, { name: "重生", value: "5" },
            { name: "穿越", value: "6" }, { name: "古装", value: "7" }
        ]
    }],
    "牛牛": [{
        key: "area",
        name: "分类",
        init: "现言",
        value: [
            { name: "现言", value: "现言" }, { name: "古言", value: "古言" }, { name: "战神", value: "战神" },
            { name: "逆袭", value: "逆袭" }, { name: "萌宝", value: "萌宝" }, { name: "神医", value: "神医" },
            { name: "其它", value: "其它" }
        ]
    }],
    "围观": [{
        key: "area",
        name: "分类",
        init: "",
        value: [
            { name: "全部", value: "" }
        ]
    }],
    "碎片": [{
        key: "area",
        name: "分类",
        init: "",
        value: [
            { name: "全部", value: "" }
        ]
    }]
};

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const DEFAULT_HEADERS = { "User-Agent": UA };

async function request(url, optHeaders = {}, body) {
    try {
        const headers = Object.assign({}, DEFAULT_HEADERS, optHeaders || {});
        const res = await req(url, {
            method: body ? "POST" : "GET",
            headers: headers,
            timeout: 12000,
            data: body
        });
        return res?.content ?? "";
    } catch (e) {
        console.error("request error:", url, e?.message);
        return "";
    }
}

function b64EncodeUtf8(str) {
    return Crypto.enc.Base64.stringify(Crypto.enc.Utf8.parse(str || ""));
}

function b64DecodeUtf8(b64) {
    try {
        return Crypto.enc.Utf8.stringify(Crypto.enc.Base64.parse(b64 || ""));
    } catch (e) {
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

function text(v) {
    return String(v == null ? "" : v).trim();
}

function md5Stub() { return ""; }
function guidStub() { return ""; }

async function init(cfg) {
    try {
        siteKey = cfg.skey;
        siteType = cfg.stype;
        const classes = aggConfig.platformList.map(item => {
            return {
                type_id: item.id,
                type_name: item.name,
                land: 1,
                ratio: 1.33
            };
        });
        extendObj = { classes, filter: customFilters };
    } catch (e) {
        console.error("init error", e.message);
        extendObj = { classes: [], filter: {} };
    }
}

function home(filter) {
    try {
        return JSON.stringify({
            class: extendObj.classes || [],
            filters: extendObj.filter || customFilters
        });
    } catch (e) {
        return JSON.stringify({ class: [], filters: customFilters });
    }
}

async function homeVod() {
    return JSON.stringify({ list: [] });
}

async function category(tid, pg, filter, ext) {
    pg = Number(pg) || 1;
    try {
        const area = ext?.area || (filter_def[tid]?.area || "");
        const plat = aggConfig.platform[tid];
        if (!plat) return JSON.stringify({ list: [], page: pg, pagecount: 0 });

        let list = [];
        if(tid === "百度"){
            const url = plat.host + plat.url1.replace('fyclass', encodeURIComponent(area)).replace('fypage', String(pg));
            const resp = await request(url, aggConfig.headers.default);
            const json = safeJson(resp);
            if(json && json.code === 0 && Array.isArray(json.data)){
                for(const it of json.data){
                    list.push({
                        vod_id: b64EncodeUtf8(JSON.stringify({plat:"百度",id:it.id})),
                        vod_name: text(it.title),
                        vod_pic: text(it.cover),
                        vod_remarks: "更新至"+text(it.totalChapterNum)+"集",
                        style:{type:"rect",ratio:1.33}
                    });
                }
            }
        }
        else if(tid === "甜圈"){
            const offset = (pg-1)*13;
            const url = `${plat.host}${plat.url1}=${encodeURIComponent(area)}&offset=${offset}`;
            const resp = await request(url, aggConfig.headers.default);
            const json = safeJson(resp);
            if(json && Array.isArray(json.data)){
                for(const it of json.data){
                    list.push({
                        vod_id: b64EncodeUtf8(JSON.stringify({plat:"甜圈",id:it.book_id})),
                        vod_name: text(it.title),
                        vod_pic: text(it.cover),
                        vod_remarks: text(it.episode_cnt)+"集 ⭐"+text(it.score),
                        style:{type:"rect",ratio:1.33}
                    });
                }
            }
        }
        else if(tid === "锦鲤"){
            const body = JSON.stringify({page:pg,limit:24,type_id:area,year:"",keyword:""});
            const resp = await request(plat.host+plat.search, aggConfig.headers.default, body);
            const json = safeJson(resp);
            if(json && json.code===0 && json.data && Array.isArray(json.data.list)){
                for(const it of json.data.list){
                    list.push({
                        vod_id: b64EncodeUtf8(JSON.stringify({plat:"锦鲤",id:it.vod_id})),
                        vod_name: text(it.vod_name),
                        vod_pic: text(it.vod_pic),
                        vod_remarks: text(it.vod_total)+"集",
                        style:{type:"rect",ratio:1.33}
                    });
                }
            }
        }
        else if(tid === "软鸭"){
            const url = `${plat.host}${plat.url1}/?keyword=${encodeURIComponent(area)}&page=${pg}`;
            const resp = await request(url, aggConfig.headers.default);
            const json = safeJson(resp);
            if(json && Array.isArray(json.data)){
                for(const it of json.data){
                    const payload = JSON.stringify({plat:"软鸭",id:it.book_id,title:it.title,cover:it.cover,author:it.author,type:it.type,desc:it.desc});
                    list.push({
                        vod_id: b64EncodeUtf8(payload),
                        vod_name: text(it.title),
                        vod_pic: text(it.cover),
                        vod_remarks: text(it.type),
                        style:{type:"rect",ratio:1.33}
                    });
                }
            }
        }
        const pagecount = list.length>0 ? pg+1 : pg;
        return JSON.stringify({
            list,
            page:pg,
            pagecount:pagecount,
            limit:20,
            total:9999
        });
    } catch (e) {
        console.error("category error",e.message);
        return JSON.stringify({ list:[], page:pg, pagecount:0 });
    }
}

async function search(key, quick, pg) {
    pg = Number(pg)||1;
    try {
        let list = [];
        {
            const url = aggConfig.platform.百度.host + aggConfig.platform.百度.search.replace('**',encodeURIComponent(key)).replace('fypage',String(pg));
            const resp = await request(url, aggConfig.headers.default);
            const json = safeJson(resp);
            if(json && json.code===0 && Array.isArray(json.data)){
                for(const it of json.data){
                    list.push({
                        vod_id: b64EncodeUtf8(JSON.stringify({plat:"百度",id:it.id})),
                        vod_name: text(it.title),
                        vod_pic: text(it.cover),
                        vod_remarks:"百度短剧",
                        style:{type:"rect",ratio:1.33}
                    });
                }
            }
        }
        {
            const url = `${aggConfig.platform.甜圈.host}${aggConfig.platform.甜圈.search}=${encodeURIComponent(key)}&offset=${pg}`;
            const resp = await request(url, aggConfig.headers.default);
            const json = safeJson(resp);
            if(json && Array.isArray(json.data)){
                for(const it of json.data){
                    list.push({
                        vod_id: b64EncodeUtf8(JSON.stringify({plat:"甜圈",id:it.book_id})),
                        vod_name: text(it.title),
                        vod_pic: text(it.cover),
                        vod_remarks:"甜圈短剧",
                        style:{type:"rect",ratio:1.33}
                    });
                }
            }
        }
        {
            const body = JSON.stringify({page:pg,limit:30,type_id:"",year:"",keyword:key});
            const resp = await request(aggConfig.platform.锦鲤.host+aggConfig.platform.锦鲤.search, aggConfig.headers.default, body);
            const json = safeJson(resp);
            if(json && json.code===0 && json.data && Array.isArray(json.data.list)){
                for(const it of json.data.list){
                    list.push({
                        vod_id: b64EncodeUtf8(JSON.stringify({plat:"锦鲤",id:it.vod_id})),
                        vod_name: text(it.vod_name),
                        vod_pic: text(it.vod_pic),
                        vod_remarks:"锦鲤短剧",
                        style:{type:"rect",ratio:1.33}
                    });
                }
            }
        }
        {
            const url = `${aggConfig.platform.软鸭.host}${aggConfig.platform.软鸭.search}/?keyword=${encodeURIComponent(key)}&page=${pg}`;
            const resp = await request(url, aggConfig.headers.default);
            const json = safeJson(resp);
            if(json && Array.isArray(json.data)){
                for(const it of json.data){
                    const payload = JSON.stringify({plat:"软鸭",id:it.book_id,title:it.title,cover:it.cover,author:it.author,type:it.type,desc:it.desc});
                    list.push({
                        vod_id: b64EncodeUtf8(payload),
                        vod_name: text(it.title),
                        vod_pic: text(it.cover),
                        vod_remarks:"软鸭短剧",
                        style:{type:"rect",ratio:1.33}
                    });
                }
            }
        }
        const pagecount = list.length>0 ? pg+1 : pg;
        return JSON.stringify({
            list,
            page:pg,
            pagecount:pagecount,
            land:1,
            ratio:1.33
        });
    } catch(e){
        console.error("search error",e.message);
        return JSON.stringify({ list:[], page:pg, pagecount:0, land:1, ratio:1.33 });
    }
}

async function detail(vodIdB64) {
    try {
        const raw = b64DecodeUtf8(vodIdB64);
        const meta = safeJson(raw);
        if(!meta || !meta.plat) return JSON.stringify({ list:[] });
        const platKey = meta.plat;
        const plat = aggConfig.platform[platKey];
        let vod = {
            vod_id: vodIdB64,
            vod_name:"",
            vod_pic:"",
            vod_year:"",
            vod_area:"",
            vod_remarks:"",
            vod_actor:"",
            vod_director:"",
            vod_content:"",
            vod_play_from:platKey,
            vod_play_url:""
        };
        let playList = [];

        if(platKey === "百度"){
            const url = plat.host + plat.url2.replace('fyid', meta.id);
            const resp = await request(url, aggConfig.headers.default);
            const json = safeJson(resp);
            if(json && json.code===0 && json.data){
                vod.vod_name = text(json.title);
                vod.vod_pic = text(json.data[0]?.cover);
                for(const ep of json.data){
                    const epName = text(ep.title||`第${playList.length+1}集`);
                    const payLoad = b64EncodeUtf8(JSON.stringify({plat:"百度",vid:ep.video_id}));
                    playList.push(`${epName}$${payLoad}`);
                }
            }
        }
        else if(platKey === "甜圈"){
            const url = `${plat.host}${plat.url2}=${encodeURIComponent(meta.id)}`;
            const resp = await request(url, aggConfig.headers.default);
            const json = safeJson(resp);
            if(json && json.code===0 && json.data){
                vod.vod_name = text(json.book_name);
                vod.vod_pic = text(json.book_pic);
                vod.vod_content = text(json.desc);
                vod.vod_actor = text(json.author);
                vod.vod_remarks = text(json.duration);
                for(const ep of json.data){
                    const epName = text(ep.title||`第${playList.length+1}集`);
                    const payLoad = b64EncodeUtf8(JSON.stringify({plat:"甜圈",vid:ep.video_id}));
                    playList.push(`${epName}$${payLoad}`);
                }
            }
        }
        else if(platKey === "锦鲤"){
            const url = `${plat.host}${plat.url2}/${encodeURIComponent(meta.id)}`;
            const resp = await request(url, aggConfig.headers.default);
            const json = safeJson(resp);
            if(json && json.code===0 && json.data){
                vod.vod_name = text(json.data.vod_name);
                vod.vod_pic = text(json.data.vod_pic);
                vod.vod_content = text(json.data.vod_blurb);
                vod.vod_remarks = text(json.data.vod_remarks);
                const playerObj = json.data.player||{};
                for(const k of Object.keys(playerObj)){
                    const epName = text(k||`第${playList.length+1}集`);
                    const payLoad = b64EncodeUtf8(JSON.stringify({plat:"锦鲤",vid:playerObj[k]}));
                    playList.push(`${epName}$${payLoad}`);
                }
            }
        }
        else if(platKey === "软鸭"){
            const url = `${plat.host}${plat.url1}/?book_id=${encodeURIComponent(meta.id)}`;
            const resp = await request(url, aggConfig.headers.default);
            const json = safeJson(resp);
            if(json && json.code===0 && json.data && Array.isArray(json.data.video_list)){
                vod.vod_name = text(meta.title);
                vod.vod_pic = text(meta.cover);
                vod.vod_actor = text(meta.author);
                vod.vod_remarks = text(meta.type);
                vod.vod_content = text(meta.desc);
                for(const ep of json.data.video_list){
                    const epName = text(ep.title||`第${playList.length+1}集`);
                    const payLoad = b64EncodeUtf8(JSON.stringify({plat:"软鸭",vid:ep.video_id}));
                    playList.push(`${epName}$${payLoad}`);
                }
            }
        }
        vod.vod_play_url = playList.join("#");
        return JSON.stringify({ list:[vod] });
    } catch (e) {
        console.error("detail error",e.message);
        return JSON.stringify({ list:[] });
    }
}

async function play(flag, idB64, flags) {
    try {
        const raw = b64DecodeUtf8(idB64||"");
        const meta = safeJson(raw);
        if(!meta || !meta.plat){
            return JSON.stringify({ parse:1, url:"", header:{"User-Agent":UA} });
        }
        let playUrl = "";
        if(meta.plat === "百度"){
            const url = `https://api.jkyai.top/API/bddjss.php?video_id=${encodeURIComponent(meta.vid)}`;
            const resp = await request(url, aggConfig.headers.default);
            const json = safeJson(resp);
            if(json && json.code===0 && json.data && Array.isArray(json.data.qualities)){
                const q = json.data.qualities[0];
                playUrl = q.download_url||"";
            }
        }
        else if(meta.plat === "甜圈"){
            return JSON.stringify({
                parse:1,
                url:`https://mov.cenguigui.cn/duanju/api.php?video_id=${encodeURIComponent(meta.vid)}&type=mp4`,
                header:{"User-Agent":UA,"Referer":"https://mov.cenguigui.cn/"}
            });
        }
        else if(meta.plat === "锦鲤"){
            const targetUrl = meta.vid.indexOf('auto=1')>=0 ? meta.vid : (meta.vid+"&auto=1");
            const resp = await request(targetUrl, { ...aggConfig.headers.default, Referer:"https://www.jinlidj.com/" });
            const html = resp;
            let m = html.match(/https?:\/\/[^'"\s]+\.(m3u8|mp4)(\?[^'"\s]*)?/i);
            if(m) playUrl = m[0];
        }
        else if(meta.plat === "软鸭"){
            const url = `${aggConfig.platform.软鸭.host}/API/playlet/?video_id=${encodeURIComponent(meta.vid)}&quality=1080p`;
            const resp = await request(url, aggConfig.headers.default);
            const json = safeJson(resp);
            if(json && json.code===0 && json.data && json.data.video){
                playUrl = json.data.video.url||"";
            }
        }

        if(playUrl){
            return JSON.stringify({
                parse:0,
                url:playUrl,
                header:{ "User-Agent":UA }
            });
        }else{
            return JSON.stringify({
                parse:1,
                url:"",
                header:{ "User-Agent":UA }
            });
        }
    } catch(e){
        console.error("play error",e.message);
        return JSON.stringify({ parse:1, url:"", header:{"User-Agent":UA} });
    }
}

export function __jsEvalReturn() {
    return {
        init,
        home,
        homeVod,
        category,
        detail,
        play,
        search
    };
}