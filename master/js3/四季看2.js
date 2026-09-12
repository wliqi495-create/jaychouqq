import { Crypto, _ } from 'assets://js/lib/cat.js';
let siteKey = '';
let siteType = 0;

const TV_COVER = "https://p2.ssl.qhimgs1.com/bdr/460__/t045d2cbb68401612b2.png";
//稳定公开占位封面，解决卡片裂图
const DEF_COVER = "https://picsum.photos/id/237/200/280";

//在线直播源
const ONLINE_LIVE_SOURCES = [
    {
        "id": "migu_live",
        "name": "📺 咪咕直播",
        "url": "https://gh-proxy.org/https://raw.githubusercontent.com/develop202/migu_video/refs/heads/main/interface.txt",
        "cover": TV_COVER,
        "remarks": "央视/卫视直播",
        "type": "m3u",
        "playerType": 2,
        "ua": "com.android.chrome/3.7.0 (Linux;Android 15)",
        "referer": "https://www.miguvideo.com/"
    },
    {
        "id": "gongdian_live",
        "name": "🏛️ 宫殿直播",
        "url": "https://gongdian.top/tv/iptv",
        "cover": TV_COVER,
        "remarks": "宫殿直播源",
        "type": "m3u",
        "playerType": 2,
        "ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "referer": "https://gongdian.top/"
    },
    {
        "id": "simple_live",
        "name": "✨ 简单直播",
        "url": "http://gh-proxy.org/raw.githubusercontent.com/Supprise0901/TVBox_live/main/live.txt",
        "cover": TV_COVER,
        "remarks": "简单直播源",
        "type": "txt",
        "ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    },
    {
        "id": "Kimentanm",
        "name": "💎 Kimentanm",
        "url": "https://gh.llkk.cc/https://raw.githubusercontent.com/Kimentanm/aptv/master/m3u/iptv.m3u",
        "cover": TV_COVER,
        "remarks": "Kimentanm",
        "type": "m3u",
        "ua": "AptvPlayer-UA"
    },
    {
        "id": "游魂",
        "name": "💎 游魂",
        "url": "https://www.iyouhun.com/tv/zb",
        "cover": TV_COVER,
        "remarks": "简单直播源",
        "type": "txt",
        "ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    },
    {
        "id": "rihou",
        "name": "💎 日后",
        "url": "http://rihou.cc:555/gggg.nzk",
        "cover": TV_COVER,
        "remarks": "rihou",
        "type": "txt",
        "ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    },
    {
        "id": "综合直播",
        "name": "✨ 综合直播",
        "url": "https://ds65.tv1288.xyz",
        "cover": TV_COVER,
        "remarks": "综合直播",
        "type": "m3u",
        "ua": "bingcha/1.1 (mianfeifenxiang)"
    },
    {
        "id": "suxuang",
        "name": "✨ suxuang",
        "url": "https://gh-proxy.org/https://raw.githubusercontent.com/suxuang/myIPTV/main/ipv4.m3u",
        "cover": TV_COVER,
        "remarks": "suxuang",
        "type": "m3u",
        "ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    },
    {
        "id": "kulao_tv",
        "name": "👖 裤佬TV直播",
        "url": "https://gh-proxy.org/https://raw.githubusercontent.com/Jsnzkpg/Jsnzkpg/Jsnzkpg/Jsnzkpg1.m3u",
        "cover": TV_COVER,
        "remarks": "裤佬TV直播源",
        "type": "m3u",
        "playerType": 2,
        "ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
];

//短视频api
const SHORT_VIDEO_APIS = [
    {"name": "🎬 小姐姐1", "url": "http://av.npcq.cn/pc.php"},
    {"name": "🎬 小姐姐2", "url": "https://diskgirl.com/get/get2.php"},
    {"name": "🎬 小姐姐3", "url": "https://www.xiaolufx.net/suiji/video.php?_t="},
    {"name": "🎬 小姐姐4", "url": "https://www.cunshao.com/666666/api/web.php"},
    {"name": "🎬 小姐姐5", "url": "http://api.yujn.cn/api/zzxjj.php"},
    {"name": "🎬 小姐姐6", "url": "https://www.cunshao.com/666666/api/pc.php"},
    {"name": "🎬 高质量小姐姐", "url": "http://api.tinise.cn/api/xjjsp"},
    {"name": "🎬 抖音小姐姐", "url": "http://api.qemao.com/api/douyin/"},
    {"name": "🎬 完美身材", "url": "http://api.yujn.cn/api/wmsc.php?type=video"},
    {"name": "🎬 快手变装", "url": "http://api.yujn.cn/api/ksbianzhuang.php?type=video"},
    {"name": "🎬 抖音变装", "url": "http://api.yujn.cn/api/bianzhuang.php?"},
    {"name": "🤍 白丝视频", "url": "http://api.yujn.cn/api/baisis.php?type=video"},
    {"name": "👗 美女穿搭", "url": "http://api.yujn.cn/api/chuanda.php?type=video"},
    {"name": "🎲 随机小姐姐", "url": "http://api.yujn.cn/api/xjj.php?type=video"},
    {"name": "🖤 黑丝视频", "url": "http://api.yujn.cn/api/heisis.php?type=video"},
    {"name": "🎓 女大学生", "url": "https://api.yujn.cn/api/nvda.php?type=video"},
    {"name": "👁️ 抖音瞳瞳", "url": "https://api.yujn.cn/api/tongtong.php?type=video"},
    {"name": "💃 丝滑舞蹈", "url": "http://api.yujn.cn/api/shwd.php?type=video"},
    {"name": "🏮 古风类", "url": "http://api.yujn.cn/api/hanfu.php?type=video"},
    {"name": "🎧 慢摇系列", "url": "http://api.yujn.cn/api/manyao.php?type=video"},
    {"name": "👙 吊带系列", "url": "http://api.yujn.cn/api/diaodai.php?type=video"},
    {"name": "🌸 清纯系列", "url": "http://api.yujn.cn/api/qingchun.php?type=video"},
    {"name": "🎮 COS系列", "url": "http://api.yujn.cn/api/COS.php?type=video"},
    {"name": "🎀 萝莉系列", "url": "http://api.yujn.cn/api/luoli.php?type=video"},
    {"name": "🍬 甜妹系列", "url": "http://api.yujn.cn/api/tianmei.php?type=video"},
];

//画廊图片api
const GALLERY_APIS = [
    {"name": "🎨 图源B", "url": "https://api.uumnet.com/api/mn2.php", "type": "random"},
    {"name": "🎨 图源C", "url": "https://api.uumnet.com/api/mn3.php", "type": "random"},
    {"name": "🎨 图源D", "url": "https://api.uumnet.com/api/mn4.php", "type": "random"},
    {"name": "🎨 图源E", "url": "https://api.uumnet.com/api/mn5.php", "type": "random"},
    {"name": "🎨 图源F", "url": "https://api.uumnet.com/api/mn6.php", "type": "random"},
    {"name": "🎨 图源G", "url": "https://api.uumnet.com/api/mn7.php", "type": "random"},
    {"name": "🎨 图源H", "url": "https://api.uumnet.com/api/mn8.php", "type": "random"},
    {"name": "🎨 图源I", "url": "https://api.uumnet.com/api/mn9.php", "type": "random"},
    {"name": "🎨 图源J", "url": "https://api.uumnet.com/api/mn10.php", "type": "random"},
    {"name": "🎨 图源k", "url": "http://api.lbbb.cc/api/heisi?r={time}", "type": "random"},
    {"name": "🎨 图源l", "url": "https://pic.ltywl.top/mn/pe.php?r={time}", "type": "random"},
    {"name": "🎨 图源m", "url": "https://api.6045833.xyz/meinv?r={time}", "type": "random"},
    {"name": "🎨 图源n", "url": "https://pic.ltywl.top/mn/api.php?r={time}", "type": "random"},
    {"name": "👗 丝袜美女", "url": "https://api.6045833.xyz/wsmeinv", "type": "random"},
    {"name": "🎀美女图片", "url": "http://ryapi.sbs/API/beauty.php", "type": "random"},
    {"name": "🌸 唯美图片", "url": "https://api-v2.cenguigui.cn/api/meizi/", "type": "random"},
    {"name": "🖼️ 漫画图库", "url": "https://pic.ltywl.top/mn/pe.php", "type": "random"},
    {"name": "🤍 白丝系列", "url": "http://api.lbbb.cc/api/baisi", "type": "random"},
    {"name": "🖤 黑丝系列", "url": "http://api.lbbb.cc/api/heisi", "type": "random"},
    {"name": "🎇桌面壁纸", "url": "https://api.xunjinlu.fun/api/img/index.php", "type": "random"},
    {"name": "🎊二次元", "url": "https://api.suyanw.cn/api/comic3.php", "type": "random"},
    {"name": "🌁简单壁纸", "url": "https://apis.uctb.cn/api/Moments", "type": "random"},
    {"name": "🦺东篱随机壁纸", "url": "https://tu.ltyuanfang.cn/api/fengjing.php", "type": "random"},
    {"name": "🌁多多壁纸", "url": "https://yydsys.top/bg.php", "type": "random"},
    {"name": "🌅必应每日一图", "url": "https://bing.img.run/rand.php", "type": "random"},
];

//移除本地资源分类，只保留直播、短视频、画廊
const CLASS_CFG = [
    {type_id:"live",type_name:"📺电视直播",land:1,ratio:1.33},
    {type_id:"short",type_name:"🎬短视频",land:1,ratio:1.33},
    {type_id:"gallery",type_name:"🖼️画廊图片",land:1,ratio:1.33}
];

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const DEFAULT_HEADERS = {"User-Agent":UA,"Accept-Language":"zh-CN,zh;q=0.9"};

async function request(url,optHeaders={},body){
    try{
        const headers=Object.assign({},DEFAULT_HEADERS,optHeaders||{});
        const res=await req(url,{
            method:body?"POST":"GET",
            headers:headers,
            timeout:12000,
            data:body
        });
        return res?.content??"";
    }catch(e){
        console.error("request error:",url,e?.message);
        return "";
    }
}

function b64EncodeUtf8(str){
    return Crypto.enc.Base64.stringify(Crypto.enc.Utf8.parse(str||""));
}
function b64DecodeUtf8(b64){
    try{
        return Crypto.enc.Utf8.stringify(Crypto.enc.Base64.parse(b64||""));
    }catch(e){return "";}
}
function safeJson(str){
    try{
        if(!str) return null;
        return JSON.parse(str);
    }catch(e){return null;}
}
function text(v){
    return String(v==null?"":v).trim();
}

// 校验http链接
function isHttpUrl(s){
    return /^https?:\/\//i.test(text(s));
}

//替换时间占位符
function fillTimeUrl(u){
    return text(u).replace(/\{time\}/g,String(Date.now()));
}

//解析m3u/txt直播文本
function parseLiveText(rawText){
    const out=[];
    const lines=rawText.split(/\r?\n/);
    let curName="";
    for(let line of lines){
        let l=text(line);
        if(!l) continue;
        if(l.startsWith("#EXTINF")){
            const m=l.match(/,(.+)$/);
            curName=m?text(m[1]):"直播";
        }else if(isHttpUrl(l)){
            out.push(`${curName||"频道"}$${l}`);
            curName="";
        }else if(l.includes(",")){
            const sp=l.split(",");
            const n=text(sp[0]);
            const u=text(sp[1]);
            if(isHttpUrl(u)) out.push(`${n}$${u}`);
        }
    }
    return out;
}

async function init(cfg){
    try{
        siteKey=cfg.skey;
        siteType=cfg.stype;
    }catch(e){
        console.error("init error",e.message);
    }
}

function home(filter){
    try{
        return JSON.stringify({class:CLASS_CFG,filters:{}});
    }catch(e){
        console.error("home error",e.message);
        return JSON.stringify({class:[],filters:{}});
    }
}

async function homeVod(){
    return await category("short",1,null,{});
}

async function category(tid,pg,filter,ext){
    pg=Number(pg)||1;
    try{
        const list=[];
        if(tid==="live"){
            for(const item of ONLINE_LIVE_SOURCES){
                list.push({
                    vod_id:b64EncodeUtf8(JSON.stringify(item)),
                    vod_name:text(item.name),
                    vod_pic:text(item.cover||DEF_COVER),
                    vod_remarks:text(item.remarks),
                    style:{type:'rect',ratio:1.33}
                });
            }
        }else if(tid==="short"){
            for(const item of SHORT_VIDEO_APIS){
                list.push({
                    vod_id:b64EncodeUtf8(JSON.stringify({...item,"mediaType":"video"})),
                    vod_name:text(item.name),
                    vod_pic:DEF_COVER,
                    vod_remarks:"点击获取随机视频",
                    style:{type:'rect',ratio:1.33}
                });
            }
        }else if(tid==="gallery"){
            for(const item of GALLERY_APIS){
                list.push({
                    vod_id:b64EncodeUtf8(JSON.stringify({...item,"mediaType":"pic"})),
                    vod_name:text(item.name),
                    vod_pic:DEF_COVER,
                    vod_remarks:"随机图片源",
                    style:{type:'rect',ratio:1.33}
                });
            }
        }
        return JSON.stringify({
            list:list,
            page:pg,
            pagecount:99,
            limit:50,
            total:list.length
        });
    }catch(e){
        console.error("category error",e.message);
        return JSON.stringify({list:[],page:pg,pagecount:0});
    }
}

async function detail(vodIdRaw){
    try{
        let obj=safeJson(b64DecodeUtf8(vodIdRaw));
        if(!obj) return JSON.stringify({list:[]});

        //直播源解析
        if(obj.type==="m3u"||obj.type==="txt"){
            const apiUrl=fillTimeUrl(obj.url);
            const raw=await request(apiUrl,{Referer:obj.referer||""});
            const playItems=parseLiveText(raw);
            if(playItems.length===0){
                playItems.push(`直播$${apiUrl}`);
            }
            const vod={
                vod_id:vodIdRaw,
                vod_name:text(obj.name),
                vod_pic:text(obj.cover||DEF_COVER),
                vod_year:"",vod_area:"",vod_actor:"",vod_director:"",
                vod_content:text(obj.remarks||""),
                vod_play_from:"直播",
                vod_play_url:playItems.join("#")
            };
            return JSON.stringify({list:[vod]});
        }

        //短视频/图集
        const mediaType=obj.mediaType||"video";
        const playIdObj={
            mediaType:mediaType,
            apiUrl:fillTimeUrl(obj.url)
        };
        const playId=b64EncodeUtf8(JSON.stringify(playIdObj));
        const playFromName=(mediaType==="pic")?"图片":"视频";
        const vod={
            vod_id:vodIdRaw,
            vod_name:text(obj.name),
            vod_pic:DEF_COVER,
            vod_year:"",vod_area:"",vod_actor:"",vod_director:"",
            vod_content:text(obj.remarks||""),
            vod_play_from:playFromName,
            vod_play_url:`${obj.name}$${playId}`
        };
        return JSON.stringify({list:[vod]});
    }catch(e){
        console.error("detail error",e.message);
        return JSON.stringify({list:[]});
    }
}

async function play(flag,id,flags){
    try{
        const sp=id.split("$");
        const b64Str=sp[1];
        const playObj=safeJson(b64DecodeUtf8(b64Str));
        if(!playObj) throw new Error("playObj decode fail");

        const {mediaType,apiUrl}=playObj;
        const respText=await request(apiUrl);

        let realResourceUrl="";
        const jsonData=safeJson(respText);
        if(jsonData){
            realResourceUrl=text(jsonData.url||jsonData.video||jsonData.data||jsonData.msg||"");
        }
        //JSON解析失败，正则抓取http资源链接
        if(!isHttpUrl(realResourceUrl)){
            const m=respText.match(/https?:\/\/[^"'<> \n]+?(?=["' <\n])/g);
            if(m&&m.length>0){
                for(let candidate of m){
                    if(isHttpUrl(candidate)){
                        realResourceUrl=text(candidate);
                        break;
                    }
                }
            }
        }

        //图片：使用CAT pics://预览协议
        if(mediaType==="pic"){
            if(isHttpUrl(realResourceUrl)){
                return JSON.stringify({
                    parse:0,
                    url:`pics://${realResourceUrl}`,
                    header:DEFAULT_HEADERS
                });
            }else{
                return JSON.stringify({parse:1,url:"",header:DEFAULT_HEADERS});
            }
        }else{
            //视频
            if(isHttpUrl(realResourceUrl)){
                return JSON.stringify({
                    parse:0,
                    url:realResourceUrl,
                    header:DEFAULT_HEADERS
                });
            }else{
                return JSON.stringify({parse:1,url:"",header:DEFAULT_HEADERS});
            }
        }
    }catch(e){
        console.error("play error",e.message);
        return JSON.stringify({parse:1,url:"",header:{} });
    }
}

async function search(key,quick,pg){
    pg=Number(pg)||1;
    try{
        return JSON.stringify({
            list:[],
            page:pg,
            pagecount:0,
            land:1,
            ratio:1.33
        });
    }catch(e){
        console.error("search error",e.message);
        return JSON.stringify({list:[],page:pg,pagecount:0,land:1,ratio:1.33});
    }
}

export function __jsEvalReturn(){
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