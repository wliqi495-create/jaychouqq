import { Crypto, _ } from 'assets://js/lib/cat.js';
let siteKey = '';
let siteType = 0;

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.54 Safari/537.36";
const DEFAULT_HEADERS = {
    "User-Agent": UA,
    "Referer": "https://www.cctv.com/",
    "Origin": "https://www.cctv.com"
};

// 栏目分类字典，复刻py cateManual
const cateManual = {
    "中华情": "TOPC1451541564922207",
    "回声嘹亮": "TOPC1451535575561597",
    "你好生活第三季": "TOPC1627961377879898",
    "我的艺术清单": "TOPC1582272259917160",
    "黄金100秒": "TOPC1451468496522494",
    "非常6+1": "TOPC1451467940101208",
    "向幸福出发": "TOPC1451984638791216",
    "幸福账单": "TOPC1451984801613379",
    "中国文艺报道": "TOPC1601348042760302",
    "舞蹈世界": "TOPC1451547605511387",
    "艺览天下": "TOPC1451984851125433",
    "天天把歌唱": "TOPC1451535663610626",
    "金牌喜剧班": "TOPC1611826337610628",
    "环球综艺秀": "TOPC1571300682556971",
    "挑战不可能第五季": "TOPC1579169060379297",
    "我们有一套": "TOPC1451527089955940",
    "为了你": "TOPC1451527001597710",
    "朗读者第一季": "TOPC1487120479377477",
    "挑战不可能第二季": "TOPC1474277421637816",
    "精彩一刻": "TOPC1451464786232149",
    "挑战不可能之加油中国": "TOPC1547519813971570",
    "挑战不可能第一季": "TOPC1452063816677656",
    "机智过人第三季": "TOPC1564019920570762",
    "经典咏流传第二季": "TOPC1547521714115947",
    "挑战不可能第三季": "TOPC1509500865106312",
    "经典咏流传第一季": "TOPC1513676755770201",
    "欢乐中国人第二季": "TOPC1516784350726581",
    "故事里的中国第一季": "TOPC1569729252342702",
    "你好生活第二季": "TOPC1604397385056621",
    "喜上加喜": "TOPC1590026042145705",
    "走在回家的路上": "TOPC1577697653272281",
    "综艺盛典": "TOPC1451985071887935",
    "艺术人生": "TOPC1451984891490556",
    "全家好拍档": "TOPC1474275463547690",
    "大魔术师": "TOPC1451984047073332",
    "欢乐一家亲": "TOPC1451984214170587",
    "开心辞典": "TOPC1451984378754815",
    "综艺星天地": "TOPC1451985188986150",
    "激情广场": "TOPC1451984341218765",
    "笑星大联盟": "TOPC1451984731428297",
    "天天乐": "TOPC1451984447718918",
    "欢乐英雄": "TOPC1451984242834620",
    "欢乐中国行": "TOPC1451984301286720",
    "我爱满堂彩": "TOPC1451538709371329",
    "综艺头条": "TOPC1569226855085860",
    "中华情": "TOPC1451541564922207",
    "魔法奇迹": "TOPC1451542029126607"
};

// 构建class数组
const CATEGORIES = [];
for(const name in cateManual){
    CATEGORIES.push({
        type_id: cateManual[name],
        type_name: name,
        land:1,
        ratio:1.33
    });
}

// 模板工具函数（复制自儿歌大全.js）
async function request(url, optHeaders = {}) {
    try {
        const headers = Object.assign({}, DEFAULT_HEADERS, optHeaders);
        const res = await req(url, {
            method: "GET",
            headers: headers,
            timeout: 15000
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

function fixPicUrl(url) {
    if (!url) return '';
    url = url.trim();
    if (url.startsWith('http')) return url;
    if (url.startsWith('//')) return `https:${url}`;
    // 修复cntv相对图片路径
    return `https:${url}`;
}

let extendObj = { classes: [...CATEGORIES], filter: {} };

async function init(cfg) {
    try {
        siteKey = cfg.skey;
        siteType = cfg.stype;
        extendObj = { classes: [...CATEGORIES], filter: {} };
    } catch (e) {
        console.error("init error", e.message);
        extendObj = { classes: [...CATEGORIES], filter: {} };
    }
}

function home(filter) {
    try {
        return JSON.stringify({
            class: extendObj.classes || CATEGORIES,
            filters: extendObj.filter || {}
        });
    } catch (e) {
        return JSON.stringify({ class: CATEGORIES, filters: {} });
    }
}

async function homeVod() {
    return JSON.stringify({ list: [] });
}

async function category(tid, pg, filter, ext) {
    pg = Number(pg) || 1;
    try {
        let url;
        if(tid.startsWith('TOPC')){
            url = `https://api.cntv.cn/NewVideo/getVideoListByColumn?id=${tid}&p=${pg}&n=20&sort=desc&mode=0&serviceId=tvcctv&t=json`;
        }else{
            url = `https://api.cntv.cn/NewVideo/getVideoListByAlbumIdNew?id=${tid}&p=${pg}&n=20&sort=desc&mode=0&serviceId=tvcctv&t=json`;
        }
        const respText = await request(url);
        const data = safeJson(respText);
        const vodList = data?.data?.list || [];
        const list = [];
        for(const vod of vodList){
            const guid = vod.guid || "";
            const title = vod.title || "";
            const img = fixPicUrl(vod.image || "");
            list.push({
                vod_id: `${guid}###${img}`,
                vod_name: title,
                vod_pic: img,
                vod_remarks: "",
                style: { type:'rect', ratio:1.33 }
            });
        }
        return JSON.stringify({
            list,
            page: pg,
            pagecount:9999,
            limit:90,
            total:999999
        });
    } catch (e) {
        console.error("category error",e.message);
        return JSON.stringify({ list:[], page:pg, pagecount:0, limit:90, total:0 });
    }
}

async function detail(vodId) {
    try {
        const parts = String(vodId).split('###');
        const guid = parts[0] || "";
        const poster = parts[1] || "";
        if(!guid){
            return JSON.stringify({ list:[] });
        }
        const url = `https://vdn.apps.cntv.cn/api/getHttpVideoInfo.do?pid=${guid}`;
        const respText = await request(url);
        const jo = safeJson(respText);
        if(!jo){
            return JSON.stringify({ list:[] });
        }
        const title = (jo.title || "").trim();
        const hlsUrl = jo.hls_url || "";
        const vod = {
            vod_id: vodId,
            vod_name: title,
            vod_pic: poster,
            type_name:"",
            vod_year:"",
            vod_area:"",
            vod_remarks:"",
            vod_actor:"",
            vod_director:"",
            vod_content:"",
            vod_play_from:"CCTV",
            vod_play_url: `${title}$${b64EncodeUtf8(hlsUrl)}`
        };
        return JSON.stringify({ list:[vod] });
    } catch (e) {
        console.error("detail error",e.message);
        return JSON.stringify({ list:[] });
    }
}

// ==========【修复后的搜索函数】==========
async function search(key, quick, pg) {
    pg = Number(pg) || 1;
    try {
        const kw = String(key || "").trim();
        if (!kw) {
            return JSON.stringify({ list:[], page:pg, pagecount:0, land:1, ratio:1.33 });
        }
        // cntv官方搜索接口 q关键词 p页码 n每页数量
        const encQ = encodeURIComponent(kw);
        const url = `https://api.cntv.cn/NewVideo/searchVideo?serviceId=tvcctv&q=${encQ}&p=${pg}&n=20`;
        const respText = await request(url);
        const data = safeJson(respText);
        const vodList = data?.data?.list || [];
        const list = [];
        for(const vod of vodList){
            const guid = vod.guid || "";
            const title = vod.title || "";
            const img = fixPicUrl(vod.image || "");
            list.push({
                vod_id: `${guid}###${img}`,
                vod_name: title,
                vod_pic: img,
                vod_remarks: "",
                style: { type:'rect', ratio:1.33 }
            });
        }
        return JSON.stringify({
            list,
            page: pg,
            pagecount: 999,
            limit:20,
            total: 99999,
            land: 1,
            ratio: 1.33
        });
    } catch (e) {
        console.error("search error",e.message);
        return JSON.stringify({ list:[], page:pg, pagecount:0, land:1, ratio:1.33 });
    }
}

async function play(flag, id, flags) {
    try {
        let raw = b64DecodeUtf8(id||"");
        if(!raw){
            return JSON.stringify({ parse:1, url:"", header:DEFAULT_HEADERS });
        }
        let finalUrl = raw;
        if(raw.includes('.m3u8')){
            const match = raw.match(/^(https?:\/\/[^\/]+)\//);
            if(match){
                const prefix = match[1];
                const segArr = raw.split('/');
                if(segArr.length>=4){
                    segArr[3] = '2000';
                    segArr[segArr.length-1] = '2000.m3u8';
                    const tryHd = prefix + '/' + segArr.join('/');
                    finalUrl = tryHd;
                }
            }
        }
        return JSON.stringify({
            parse:0,
            url:finalUrl,
            header:DEFAULT_HEADERS
        });
    } catch (e) {
        console.error("play error",e.message);
        return JSON.stringify({ parse:1, url:"", header:DEFAULT_HEADERS });
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
