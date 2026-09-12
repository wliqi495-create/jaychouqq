/*
title: "多多影视(移植py逻辑)", author:"js移植版"
ext配置示例
"ext": {
    "host":"",
    "debug":false
}
*/
import { Crypto, _ } from "assets://js/lib/cat.js";
// 和python保持一致配置
const HOST_POOL = [
    "https://323433ssdfd.top",
    "https://duoduosdf12223234334.top",
    "https://xds2435u23422342342u.top",
    "https://dduotv01.top"
];
let currentHost = HOST_POOL[0];
const F = "WF-2c064bc5b3400788f31b848849bc3a60f835423ba2dfe69d7ea93974c216e4f2";
const SK = "WEB-50a8e9c84a1dc05669a692ded99a2dac46527229e607a7be15db88dbc59059d1";
const ID = "com.web.player";
const W = "ddtvf65f3a83d6d9ad6f";
const XC = "8f3d2a1c7b6e5d4c9a0b1f2e3d4c5b6a";
const WEB_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36";
let DEBUG = false;

async function init(cfg) {
    try {
        DEBUG = !!cfg.ext?.debug;
        const userHost = cfg.ext?.host?.trim();
        if(userHost && userHost.startsWith("http")){
            currentHost = userHost.replace(/\/+$/,"");
        }
        dbgLog(`[init] currentHost=${currentHost}`);
    }catch(e){
        console.error("init err",e.message);
    }
}
function dbgLog(...args){
    if(DEBUG) console.log(...args);
}

// protobuf varint 变长编码，复刻python _vint
function _vint(n){
    const out = [];
    while(true){
        let b = n & 0x7F;
        n = n >> 7;
        if(n > 0){
            out.push(b | 0x80);
        }else{
            out.push(b);
            break;
        }
    }
    return new Uint8Array(out);
}

// 复刻python _pb：构造protobuf二进制包用于解码接口post
function _pb(urlStr, vf, ts){
    const sigRaw = `finger=${F}&id=${ID}&nonce=${"0".repeat(32)}&sk=${SK}&time=${ts}&v=1`;
    const sig = Crypto.SHA256(sigRaw).toString().toUpperCase();
    const enc = (s)=>new TextEncoder().encode(s);
    const parts = [];
    // 0a url
    parts.push(0x0a);
    parts.push(..._vint(urlStr.length));
    parts.push(...enc(urlStr));
    //12 vf
    parts.push(0x12);
    parts.push(..._vint(vf.length));
    parts.push(...enc(vf));
    //18 ts
    parts.push(0x18);
    parts.push(..._vint(ts));
    //22 nonce(32 zero)
    parts.push(0x22);
    parts.push(..._vint(32));
    parts.push(...enc("0".repeat(32)));
    //2a sig
    parts.push(0x2a);
    parts.push(..._vint(64));
    parts.push(...enc(sig));
    //32 app id
    parts.push(0x32);
    parts.push(..._vint(14));
    parts.push(...enc("com.web.player"));
    //38=1
    parts.push(0x38);
    parts.push(0x01);
    return new Uint8Array(parts);
}

// 复刻python _parse_pb 解析返回protobuf二进制
function _parse_pb(buf){
    const fields = {};
    let i = 0;
    const arr = new Uint8Array(buf);
    while(i < arr.length){
        const tag = arr[i++];
        const f = tag >> 3;
        const w = tag & 7;
        if(w === 0){
            let v = 0;
            let s = 0;
            while(true){
                const x = arr[i++];
                v |= (x & 0x7F) << s;
                if(!(x & 0x80)) break;
                s +=7;
            }
            fields[f] = v;
        }else if(w ===2){
            let ln =0;
            let s2=0;
            while(true){
                const x = arr[i++];
                ln |= (x &0x7F) << s2;
                if(!(x &0x80)) break;
                s2 +=7;
            }
            const sub = arr.subarray(i,i+ln);
            fields[f] = new TextDecoder().decode(sub);
            i += ln;
        }else if(w ===5){
            i +=4;
        }
    }
    return fields;
}

// 多host轮询请求，复刻python _fetch
async function fetchWeb(path, params=null, isProtobufBody=false, binBody=null){
    const tryHostList = [currentHost].concat(HOST_POOL.filter(h=>h!==currentHost));
    for(const host of tryHostList){
        try{
            let url = host + path;
            const headers = {
                "User‑Agent":WEB_UA,
                "web‑sign":W,
                "X‑Client":XC,
                "Accept":"application/json"
            };
            let opt = {headers,timeout:8000};
            if(isProtobufBody){
                opt.method = "POST";
                opt.buffer = 1;
                opt.headers["Content‑Type"] = "application/x‑protobuf";
                opt.headers["Accept"] = "application/x‑protobuf";
                opt.body = binBody;
            }else{
                opt.method = "GET";
                if(params && Object.keys(params).length>0){
                    const sp = new URLSearchParams();
                    for(let k in params) sp.append(k,params[k]);
                    url += (url.includes("?")?"&":"?") + sp.toString();
                }
            }
            const res = await req(url,opt);
            if(res){
                currentHost = host;
                if(isProtobufBody){
                    return res.content;
                }else{
                    return safeJson(res?.content??"");
                }
            }
        }catch(e){
            dbgLog(`fetch host ${host} fail`,e.message);
        }
    }
    return isProtobufBody ? null : {};
}

async function home(filter){
    try{
        const json = await fetchWeb("/api.php/web/index/home");
        const data = json?.data || {};
        const cats = (data.categories||[]).map(c=>({
            type_id:String(c.type_id),
            type_name:c.type_name||""
        }));
        const videos = [];
        for(const cat of (data.categories||[])){
            for(const v of (cat.videos||[])){
                videos.push(normVod(v));
            }
        }
        return JSON.stringify({class:cats,list:videos});
    }catch(e){
        console.error("home err",e);
        return JSON.stringify({class:[],list:[]});
    }
}

async function homeVod(){
    try{
        const json = await fetchWeb("/api.php/web/index/home");
        const data = json?.data || {};
        const videos = [];
        for(const cat of (data.categories||[])){
            for(const v of (cat.videos||[])){
                videos.push(normVod(v));
            }
        }
        return JSON.stringify({list:videos});
    }catch(e){
        console.error("homeVod err",e);
        return JSON.stringify({list:[]});
    }
}

async function category(tid,pg,filter,extend){
    try{
        pg = Math.max(1,Number(pg)||1);
        const params = {
            type_name:String(tid),
            page:pg,
            sort:"hits"
        };
        const json = await fetchWeb("/api.php/web/filter/vod",params);
        const list = (json.data||[]).map(v=>normVod(v));
        return JSON.stringify({
            list,
            page:pg,
            pagecount:9999,
            limit:18,
            total:9999
        });
    }catch(e){
        console.error("category err",e);
        return JSON.stringify({list:[],page:1,pagecount:0,limit:18,total:0});
    }
}

async function search(wd,quick,pg){
    try{
        pg = Math.max(1,Number(pg)||1);
        const params = {
            wd:wd,
            page:pg,
            limit:15
        };
        const json = await fetchWeb("/api.php/web/search/index",params);
        const list = (json.data||[]).map(v=>normVod(v));
        return JSON.stringify({
            list,
            page:pg,
            pagecount:9999,
            limit:15,
            total:9999
        });
    }catch(e){
        console.error("search err",e);
        return JSON.stringify({list:[],page:1,pagecount:0,limit:15,total:0});
    }
}

async function detail(id){
    try{
        const params = {vod_id:String(id)};
        const json = await fetchWeb("/api.php/web/vod/get_detail",params);
        const arr = json?.data || [];
        const d = Array.isArray(arr) ? arr[0] : arr;
        if(!d) throw new Error("detail data empty");
        const vod = {
            vod_id:String(d.vod_id),
            vod_name:d.vod_name||"",
            vod_pic:d.vod_pic||"",
            vod_remarks:d.vod_remarks||"",
            vod_year:d.vod_year||"",
            vod_area:d.vod_area||"",
            vod_actor:d.vod_actor||"",
            vod_director:d.vod_director||"",
            vod_content:d.vod_content||"",
            vod_play_from:d.vod_play_from||"",
            vod_play_url:d.vod_play_url||"",
            type_name:d.vod_class||""
        };
        return JSON.stringify({list:[vod]});
    }catch(e){
        console.error("detail err",e);
        return JSON.stringify({list:[]});
    }
}

async function play(flag,id,flags){
    try{
        // 复刻python playerContent protobuf解码逻辑
        const ts = Math.floor(Date.now()/1000);
        const bin = _pb(id,flag,ts);
        const binResp = await fetchWeb("/api.php/web/decode/url",null,true,bin);
        let realUrl = "";
        if(binResp){
            const retObj = _parse_pb(binResp);
            dbgLog("[play] protobuf parse result",retObj);
            if(retObj[1] === 1 && retObj[3]){
                realUrl = retObj[3];
            }
        }
        if(!realUrl){
            realUrl = id;
        }
        let jx = 0;
        if(/(www\.iqiyi|v\.qq|v\.youku|www\.mgtv|www\.bilibili)\.com/.test(realUrl)){
            jx =1;
        }
        return JSON.stringify({
            jx:jx,
            parse:0,
            url:realUrl,
            header:{
                "User‑Agent":WEB_UA,
                "Referer":currentHost
            }
        });
    }catch(e){
        console.error("play err",e.message);
    }
    return JSON.stringify({jx:0,parse:0,url:"",header:{}});
}

// 工具
function normVod(i){
    return {
        vod_id:String(i.vod_id||""),
        vod_name:i.vod_name||"",
        vod_pic:i.vod_pic||"",
        vod_remarks:i.vod_remarks||""
    };
}

function safeJson(str){
    try{
        if(!str) return null;
        return JSON.parse(str);
    }catch{
        return {};
    }
}

export function __jsEvalReturn() {
    return {
        init,
        home,
        homeVod,
        category,
        search,
        detail,
        play,
        proxy:null
    };
}