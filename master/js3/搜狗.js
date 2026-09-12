import { Crypto, _ } from 'assets://js/lib/cat.js';
let siteKey = '';
let siteType = 0;
const HOST = "https://waptv.sogou.com";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36";
const DEFAULT_HEADERS = {
    "User-Agent": UA,
    "Accept": "*/*"
};

// ==========内置分享者解析池==========
const INNER_PARSES = [
    {
        "name": "💝分享者解析",
        "type": 0,
        "url": "https://jx.yparse.com/index.php?url=",
        "ext": {
            "header": {
                "user-agent": "Mozilla/5.0 (Linux; Android 13; V2049A Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/116.0.0.0 Mobile Safari/537.36"
            }
        }
    },
    {
        "name": "💖分享者解析1",
        "type": 1,
        "url": "http://shybot.top/v2/video/jx/?shykey=4595a71a4e7712568edcfa43949236b42fcfcb04997788ebe7984d6da2c6a51c&url=",
        "ext": {
            "flag": ["qq","腾讯","qiyi","爱奇艺","奇艺","youku","优酷","sohu","搜狐","letv","乐视","mgtv","芒果","tnmb","seven","bilibili","1905","QD4K","iyf","duanju","gzcj","GTV","GZYS","weggz","Ace"],
            "header": {"User-Agent": "okhttp/4.9.1"}
        }
    },
    {
        "name": "💖分享者解析2",
        "type": 1,
        "url": "http://mg.itufm.top/mg.php?url=",
        "ext": {
            "flag": ["qq","腾讯","qiyi","爱奇艺","奇艺","youku","优酷","sohu","搜狐","letv","乐视","mgtv","芒果","tnmb","seven","bilibili","1905","QD4K","iyf","duanju","gzcj","GTV","GZYS","weggz","Ace"],
            "header": {"User-Agent": "okhttp/4.9.1"}
        }
    },
    {
        "name": "💖分享者解析3",
        "type": 1,
        "url": "https://150.138.78.37:4399/api?key=94b07e0b2c0e8244&url="
    },
    {
        "name": "💖分享者解析4",
        "type": 1,
        "url": "http://1.94.221.189:88/algorithm.php?url="
    },
    {
        "name": "💕分享者AI1",
        "type": 1,
        "url": "https://zy.qiaoji8.com/neibu.php?url=",
        "ext": {
            "flag": ["qq","腾讯","qiyi","爱奇艺","奇艺","youku","优酷","sohu","搜狐","letv","乐视","mgtv","芒果","tnmb","seven","bilibili"],
            "header": {"User-Agent": "okhttp/4.9.1"}
        }
    },
    {
        "name": "💕分享者AI2",
        "type": 1,
        "url": "https://zy.qiaoji8.com/gouzi.php?url=",
        "ext": {
            "flag": ["qq","腾讯","qiyi","爱奇艺","奇艺","youku","优酷","sohu","搜狐","letv","乐视","mgtv","芒果","tnmb","seven","bilibili","1905","NetFilx"],
            "header": {"User-Agent": "okhttp/4.9.1"}
        }
    },
    {
        "name": "💕分享者嗅探",
        "type": 0,
        "url": "https://jx.789jiexi.net:4433/?url="
    },
    {
        "name": "💕分享者嗅探*",
        "type": 0,
        "url": "http://154.44.26.196/player/qu.php?v="
    },
    {
        "name": "💝分享者解析-",
        "type": 0,
        "url": "https://jx.2s0.cn/player/?url="
    },
    {
        "name": "💝分享者解析+",
        "type": 0,
        "url": "https://yparse.ik9.cc/index.php?url=",
        "ext": {
            "header": {
                "user-agent": "Mozilla/5.0(Linux;Android13;V2049ABuild/TP1A.220624.014;wv)AppleWebKit/537.36(KHTML,likeGecko)Version/4.0Chrome/116.0.0.0MobileSafari/537.36"
            }
        }
    }
];

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
    return `https://${url}`;
}

//分类与筛选配置，来自原sogou.js rule
const SOGOU_CLASS = [
    { type_id: "teleplay", type_name: "电视剧", land:1, ratio:1.33 },
    { type_id: "film", type_name: "电影", land:1, ratio:1.33 },
    { type_id: "cartoon", type_name: "动漫", land:1, ratio:1.33 },
    { type_id: "tvshow", type_name: "综艺", land:1, ratio:1.33 },
    { type_id: "documentary", type_name: "纪录片", land:1, ratio:1.33 }
];
const SOGOU_FILTER = {
    "teleplay": [
        {"key":"style","name":"类型","value":[{"n":"全部","v":""},{"n":"爱情","v":"爱情"},{"n":"喜剧","v":"喜剧"},{"n":"都市","v":"都市"},{"n":"悬疑","v":"悬疑"},{"n":"古装","v":"古装"},{"n":"偶像","v":"偶像"},{"n":"犯罪","v":"犯罪"},{"n":"历史","v":"历史"},{"n":"战争","v":"战争"},{"n":"武侠","v":"武侠"},{"n":"警匪","v":"警匪"},{"n":"科幻","v":"科幻"},{"n":"奇幻","v":"奇幻"},{"n":"谍战","v":"谍战"},{"n":"农村","v":"农村"},{"n":"其他","v":"其他"}]},
        {"key":"zone","name":"地区","value":[{"n":"全部","v":""},{"n":"内地","v":"内地"},{"n":"香港","v":"香港"},{"n":"台湾","v":"台湾"},{"n":"韩国","v":"韩国"},{"n":"泰国","v":"泰国"},{"n":"日本","v":"日本"},{"n":"美国","v":"美国"},{"n":"英国","v":"英国"},{"n":"新加坡","v":"新加坡"},{"n":"其他","v":"其他"}]},
        {"key":"year","name":"年代","value":[{"n":"全部","v":""},{"n":"2025","v":"2025"},{"n":"2024","v":"2024"},{"n":"2023","v":"2023"},{"n":"2022","v":"2022"},{"n":"2021","v":"2021"},{"n":"2020","v":"2020"},{"n":"2019","v":"2019"},{"n":"2018","v":"2018"},{"n":"2017","v":"2017"},{"n":"2016","v":"2016"},{"n":"2015","v":"2015"},{"n":"2014","v":"2014"},{"n":"更早","v":"更早"}]},
        {"key":"fee","name":"资源","value":[{"n":"全部","v":""},{"n":"正片","v":"正片"},{"n":"免费正片","v":"免费正片"},{"n":"付费正片","v":"付费正片"}]},
        {"key":"order","name":"排序","value":[{"n":"全部","v":""},{"n":"最新","v":"最新"},{"n":"好评","v":"好评"}]}
    ],
    "film": [
        {"key":"style","name":"类型","value":[{"n":"全部","v":""},{"n":"喜剧","v":"喜剧"},{"n":"爱情","v":"爱情"},{"n":"动作","v":"动作"},{"n":"恐怖","v":"恐怖"},{"n":"科幻","v":"科幻"},{"n":"惊悚","v":"惊悚"},{"n":"犯罪","v":"犯罪"},{"n":"奇幻","v":"奇幻"},{"n":"战争","v":"战争"},{"n":"悬疑","v":"悬疑"},{"n":"动画","v":"动画"},{"n":"文艺","v":"文艺"},{"n":"传记","v":"传记"},{"n":"歌舞","v":"歌舞"},{"n":"古装","v":"古装"},{"n":"警匪","v":"警匪"},{"n":"其他","v":"其他"}]},
        {"key":"zone","name":"地区","value":[{"n":"全部","v":""},{"n":"内地","v":"内地"},{"n":"香港","v":"香港"},{"n":"台湾","v":"台湾"},{"n":"韩国","v":"韩国"},{"n":"泰国","v":"泰国"},{"n":"日本","v":"日本"},{"n":"美国","v":"美国"},{"n":"英国","v":"英国"},{"n":"新加坡","v":"新加坡"},{"n":"其他","v":"其他"}]},
        {"key":"year","name":"年代","value":[{"n":"全部","v":""},{"n":"2025","v":"2025"},{"n":"2024","v":"2024"},{"n":"2023","v":"2023"},{"n":"2022","v":"2022"},{"n":"2021","v":"2021"},{"n":"2020","v":"2020"},{"n":"2019","v":"2019"},{"n":"2018","v":"2018"},{"n":"2017","v":"2017"},{"n":"2016","v":"2016"},{"n":"2015","v":"2015"},{"n":"2014","v":"2014"},{"n":"更早","v":"更早"}]},
        {"key":"fee","name":"资源","value":[{"n":"全部","v":""},{"n":"正片","v":"正片"},{"n":"免费正片","v":"免费正片"},{"n":"付费正片","v":"付费正片"}]},
        {"key":"order","name":"排序","value":[{"n":"全部","v":""},{"n":"最新","v":"最新"},{"n":"好评","v":"好评"}]}
    ],
    "cartoon": [
        {"key":"style","name":"类型","value":[{"n":"全部","v":""},{"n":"搞笑","v":"搞笑"},{"n":"热血","v":"热血"},{"n":"冒险","v":"冒险"},{"n":"美少女","v":"美少女"},{"n":"科幻","v":"科幻"},{"n":"校园","v":"校园"},{"n":"恋爱","v":"恋爱"},{"n":"神魔","v":"神魔"},{"n":"机战","v":"机战"},{"n":"益智","v":"益智"},{"n":"亲子","v":"亲子"},{"n":"励志","v":"励志"},{"n":"童话","v":"童话"},{"n":"青春","v":"青春"},{"n":"原创","v":"原创"},{"n":"动作","v":"动作"},{"n":"耽美","v":"耽美"},{"n":"魔幻","v":"魔幻"},{"n":"其他","v":"其他"}]},
        {"key":"zone","name":"地区","value":[{"n":"全部","v":""},{"n":"日本","v":"日本"},{"n":"欧美","v":"欧美"},{"n":"国产","v":"国产"},{"n":"其他","v":"其他"}]},
        {"key":"year","name":"年代","value":[{"n":"全部","v":""},{"n":"2025","v":"2025"},{"n":"2024","v":"2024"},{"n":"2023","v":"2023"},{"n":"2022","v":"2022"},{"n":"2021","v":"2021"},{"n":"2020","v":"2020"},{"n":"2019","v":"2019"},{"n":"2018","v":"2018"},{"n":"2017","v":"2017"},{"n":"2016","v":"2016"},{"n":"2015","v":"2015"},{"n":"2014","v":"2014"},{"n":"更早","v":"更早"}]},
        {"key":"fee","name":"资源","value":[{"n":"全部","v":""},{"n":"正片","v":"正片"},{"n":"免费正片","v":"免费正片"},{"n":"付费正片","v":"付费正片"}]},
        {"key":"order","name":"排序","value":[{"n":"全部","v":""},{"n":"最新","v":"最新"},{"n":"好评","v":"好评"}]}
    ],
    "tvshow": [
        {"key":"style","name":"类型","value":[{"n":"全部","v":""},{"n":"真人秀","v":"真人秀"},{"n":"生活","v":"生活"},{"n":"搞笑","v":"搞笑"},{"n":"访谈","v":"访谈"},{"n":"时尚","v":"时尚"},{"n":"音乐","v":"音乐"},{"n":"选秀","v":"选秀"},{"n":"美食","v":"美食"},{"n":"游戏","v":"游戏"},{"n":"纪实","v":"纪实"},{"n":"旅游","v":"旅游"},{"n":"情感","v":"情感"},{"n":"恶搞","v":"恶搞"},{"n":"吐槽","v":"吐槽"},{"n":"原创","v":"原创"},{"n":"歌舞","v":"歌舞"},{"n":"播报","v":"播报"},{"n":"曲艺","v":"曲艺"},{"n":"科教","v":"科教"},{"n":"其他","v":"其他"}]},
        {"key":"zone","name":"地区","value":[{"n":"全部","v":""},{"n":"内地","v":"内地"},{"n":"台湾","v":"台湾"},{"n":"日韩","v":"日韩"},{"n":"欧美","v":"欧美"},{"n":"其他","v":"其他"}]},
        {"key":"emcee","name":"明星","value":[{"n":"全部","v":""},{"n":"何炅","v":"何炅"},{"n":"撒贝宁","v":"撒贝宁"},{"n":"王筱磊","v":"王筱磊"},{"n":"张绍刚","v":"张绍刚"},{"n":"鲁健","v":"鲁健"},{"n":"王世林","v":"王世林"},{"n":"倪萍","v":"倪萍"},{"n":"汪涵","v":"汪涵"},{"n":"舒冬","v":"舒冬"},{"n":"齐思钧","v":"齐思钧"},{"n":"白岩松","v":"白岩松"},{"n":"曲洪禹","v":"曲洪禹"},{"n":"康辉","v":"康辉"},{"n":"章亭","v":"章亭"},{"n":"刘洪悦","v":"刘洪悦"},{"n":"尼格买提","v":"尼格买提"},{"n":"钱枫","v":"钱枫"},{"n":"刘婧","v":"刘婧"},{"n":"赵川","v":"赵川"},{"n":"谢娜","v":"谢娜"}]},
        {"key":"order","name":"排序","value":[{"n":"全部","v":""},{"n":"最新","v":"最新"},{"n":"好评","v":"好评"}]}
    ],
    "documentary": [
        {"key":"style","name":"类型","value":[{"n":"全部","v":""},{"n":"历史","v":"历史"},{"n":"自然","v":"自然"},{"n":"动物","v":"动物"},{"n":"社会","v":"社会"},{"n":"传记","v":"传记"},{"n":"人文","v":"人文"},{"n":"文化","v":"文化"},{"n":"军事","v":"军事"},{"n":"科技","v":"科技"},{"n":"人物","v":"人物"},{"n":"探索","v":"探索"},{"n":"美食","v":"美食"},{"n":"旅行","v":"旅行"},{"n":"探险","v":"探险"},{"n":"其他","v":"其他"}]},
        {"key":"zone","name":"地区","value":[{"n":"全部","v":""},{"n":"内地","v":"内地"},{"n":"香港","v":"香港"},{"n":"台湾","v":"台湾"},{"n":"韩国","v":"韩国"},{"n":"泰国","v":"泰国"},{"n":"日本","v":"日本"},{"n":"美国","v":"美国"},{"n":"英国","v":"英国"},{"n":"新加坡","v":"新加坡"},{"n":"其他","v":"其他"}]},
        {"key":"year","name":"年代","value":[{"n":"全部","v":""},{"n":"2025","v":"2025"},{"n":"2024","v":"2024"},{"n":"2023","v":"2023"},{"n":"2022","v":"2022"},{"n":"2021","v":"2021"},{"n":"2020","v":"2020"},{"n":"2019","v":"2019"},{"n":"2018","v":"2018"},{"n":"2017","v":"2017"},{"n":"2016","v":"2016"},{"n":"2015","v":"2015"},{"n":"2014","v":"2014"},{"n":"更早","v":"更早"}]},
        {"key":"fee","name":"资源","value":[{"n":"全部","v":""},{"n":"正片","v":"正片"},{"n":"免费正片","v":"免费正片"},{"n":"付费正片","v":"付费正片"}]},
        {"key":"order","name":"排序","value":[{"n":"全部","v":""},{"n":"最新","v":"最新"},{"n":"好评","v":"好评"}]}
    ]
};

let extendObj = { classes: [...SOGOU_CLASS], filter: SOGOU_FILTER };

async function init(cfg) {
    try {
        siteKey = cfg.skey;
        siteType = cfg.stype;
        extendObj = { classes: [...SOGOU_CLASS], filter: SOGOU_FILTER };
    } catch (e) {
        console.error("init error", e.message);
        extendObj = { classes: [...SOGOU_CLASS], filter: SOGOU_FILTER };
    }
}

function home(filter) {
    try {
        return JSON.stringify({ class: extendObj.classes, filters: extendObj.filter });
    } catch (e) {
        return JSON.stringify({ class: SOGOU_CLASS, filters: SOGOU_FILTER });
    }
}

async function homeVod() {
    //原rule无homeUrl，返回空列表
    return JSON.stringify({ list: [] });
}

async function category(tid, pg, filter, ext) {
    pg = Number(pg) || 1;
    try {
        const start = (pg - 1) * 15;
        let url = `${HOST}/napi/video/classlist?abtest=0&iploc=CN1304&spver=&listTab=${tid}&filter=&start=${start}&len=15&fr=filter`;
        const queryArr = [];
        if(ext.style) queryArr.push(`style=${encodeURIComponent(ext.style)}`);
        if(ext.zone) queryArr.push(`zone=${encodeURIComponent(ext.zone)}`);
        if(ext.year) queryArr.push(`year=${encodeURIComponent(ext.year)}`);
        if(ext.fee) queryArr.push(`fee=${encodeURIComponent(ext.fee)}`);
        if(ext.order) queryArr.push(`order=${encodeURIComponent(ext.order)}`);
        if(queryArr.length>0) url += "&" + queryArr.join("&");

        const resp = await request(url);
        const json = safeJson(resp);
        if(!json || !json.listData || !json.listData.results){
            return JSON.stringify({ list:[], page:pg, pagecount:0 });
        }
        const list = [];
        for(const it of json.listData.results){
            let desc1 = "";
            if(it.ipad_play_for_list){
                const finish = it.ipad_play_for_list.finish_episode;
                const cur = it.ipad_play_for_list.episode;
                if(finish) desc1 = cur === finish ? `全集${finish}` : `连载${cur}/${finish}`;
            }
            const desc2 = it.score ? `评分:${it.score}` : "";
            const desc3 = it.date ? `更至:${it.date}` : "";
            const remarks = [desc1,desc2,desc3].filter(x=>x).join(" ");
            let vurl = "https://v.sogou.com" + it.url.replace("teleplay","series").replace("cartoon","series");
            list.push({
                vod_id: vurl,
                vod_name: it.name || "",
                vod_pic: fixPicUrl(it.v_picurl),
                vod_remarks: remarks,
                style:{type:"rect",ratio:1.33}
            });
        }
        return JSON.stringify({
            list,
            page:pg,
            pagecount:99,
            limit:15,
            total:9999
        });
    } catch (e) {
        console.error("category error",e.message);
        return JSON.stringify({ list:[], page:pg, pagecount:0 });
    }
}

async function search(key, quick, pg) {
    pg = Number(pg) ||1;
    try {
        const kw = encodeURIComponent(key);
        const url = `${HOST}/film/result?ie=utf8&query=${kw}`;
        const resp = await request(url);
        let match = resp.match(/INITIAL_STATE.*?({.*?});/s);
        if(!match) return JSON.stringify({ list:[], page:pg, pagecount:0, land:1, ratio:1.33 });
        const json = safeJson(match[1]);
        if(!json || !json.result || !json.result.resultData || !json.result.resultData.searchData || !json.result.resultData.searchData.results){
            return JSON.stringify({ list:[], page:pg, pagecount:0, land:1, ratio:1.33 });
        }
        const results = json.result.resultData.searchData.results;
        const list = [];
        for(const it of results){
            if(!(it.play_info && it.play_info.play_list)) continue;
            let vurl = "https://v.sogou.com" + it.tiny_url.replace(/teleplay|cartoon/g,"series");
            list.push({
                vod_id: vurl,
                vod_name: (it.name||"").replace(/|/g,""),
                vod_pic: fixPicUrl(it.v_picurl),
                vod_remarks: (it.listCategory||[]).join(","),
                style:{type:"rect",ratio:1.33}
            });
        }
        return JSON.stringify({
            list,
            page:pg,
            pagecount:10,
            land:1,
            ratio:1.33
        });
    } catch(e){
        console.error("search error",e.message);
        return JSON.stringify({ list:[], page:pg, pagecount:0, land:1, ratio:1.33 });
    }
}

async function detail(vodId) {
    try {
        const url = vodId.startsWith("http") ? vodId : `${HOST}${vodId}`;
        const resp = await request(url);
        const match = resp.match(/INITIAL_STATE.*?({.*?});/s);
        if(!match) return JSON.stringify({ list:[] });
        const json = safeJson(match[1]);
        if(!json || !json.detail || !json.detail.itemData) return JSON.stringify({ list:[] });
        const jd = json.detail.itemData;
        const vod = {
            vod_id: vodId,
            vod_name: jd.name || "",
            vod_pic: fixPicUrl(jd.photo?.item_list?.[0] || ""),
            vod_year: "",
            vod_area: jd.zone || "",
            vod_remarks: `${jd.style||""} 评分:${jd.score||"暂无"} ${jd.update_wordstr||""}`.trim(),
            vod_actor: (jd.starring||"").replace(/;/g,"\t"),
            vod_director: (jd.director||"").replace(/;/g,"\t"),
            vod_content: jd.introduction || "",
            vod_play_from: "",
            vod_play_url: ""
        };
        const plays = jd.play?.item_list;
        if(!plays || !Array.isArray(plays) || plays.length===0){
            return JSON.stringify({ list:[vod] });
        }
        const tabs = [];
        const playUrlGroups = [];
        for(const pl of plays){
            let siteName = (pl.sitename?.[0] || pl.site || "线路").replace(".com","");
            tabs.push(siteName);
            const epItems = [];
            if(pl.info && Array.isArray(pl.info) && pl.info.length>1){
                for(const its of pl.info.slice(1)){
                    const epName = its.index || "";
                    const epUrl = its.url || "";
                    if(!epUrl) continue;
                    epItems.push(`${epName}$${b64EncodeUtf8(epUrl)}`);
                }
            }else if(pl.url){
                let epName = siteName;
                if(pl.flag_list && pl.flag_list.includes("trailer")) epName += "—预告";
                epItems.push(`${epName}$${b64EncodeUtf8(pl.url)}`);
            }
            if(epItems.length>0) playUrlGroups.push(epItems.join("#"));
        }
        if(tabs.length>0){
            vod.vod_play_from = tabs.join("$$$");
            vod.vod_play_url = playUrlGroups.join("$$$");
        }
        return JSON.stringify({ list:[vod] });
    } catch (e) {
        console.error("detail error",e.message);
        return JSON.stringify({ list:[] });
    }
}

//内部解析执行函数，只跑type=1 json解析
async function innerParse(originUrl) {
    if(!originUrl) return null;
    for(const parser of INNER_PARSES){
        if(parser.type !== 1) continue;
        try{
            const parseUrl = parser.url + encodeURIComponent(originUrl);
            const hds = Object.assign({}, DEFAULT_HEADERS, parser.ext?.header||{});
            const res = await req(parseUrl,{method:"GET",headers:hds,timeout:10000});
            const body = res?.content||"";
            if(!body) continue;
            const jo = safeJson(body);
            if(!jo) continue;
            //过滤400/403/限额/登录错误
            if(jo.code ===400 || jo.code ===403) continue;
            const real = jo.url || jo.data?.url || jo.playUrl || jo.play;
            if(real && (real.startsWith("http://") || real.startsWith("https://"))){
                return real;
            }
        }catch(err){
            console.error("parser fail",parser.name,err.message);
            continue;
        }
    }
    return null;
}

async function play(flag, id, flags) {
    try {
        const rawUrl = b64DecodeUtf8(id||"");
        if(!rawUrl){
            return JSON.stringify({ parse:1, url:"", header:{"User-Agent":UA,"Referer":HOST+"/"} });
        }
        const parseResult = await innerParse(rawUrl);
        if(parseResult){
            return JSON.stringify({
                parse:0,
                url:parseResult,
                header:{ "User-Agent":UA, "Referer":HOST }
            });
        }
        //内置解析全部失败，交给框架解析池兜底
        return JSON.stringify({
            parse:1,
            url: rawUrl,
            header:{ "User-Agent":UA, "Referer":HOST }
        });
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
        search,
        play
    };
}
//（注：内容由AI生成）
