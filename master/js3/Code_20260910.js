/*
title: '爱看机器人【对齐py原版】', author: 'v6.4.1 复刻py逻辑'
ext配置示例
"ext": {
    "host": "https://www.ikanbot.com/",
    "timeout":8000,
    "debug":false,
    "tabsSet":"",
    "tabsDeal":""
}
*/
const MOBILE_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const DefHeader = { 'User‑Agent': MOBILE_UA };
let HOST = '';
let DEBUG = false;
const KParams = {
    headers: { 'User‑Agent': MOBILE_UA },
    timeout: 8000,
    tabsSet: '',
    tabsDeal: ''
};
const LINE_NAME_MAP = {
    "dyttm3u8":"天堂","360zy":"360","iqym3u8":"爱奇艺","mtm3u8":"茅台","subm3u8":"速播",
    "nnm3u8":"牛牛","okm3u8":"欧克","tym3u8":"TY","yym3u8":"歪歪","bfzym3u8":"暴风",
    "1080zyk":"优质","kuaikan":"快看","lzm3u8":"量子","ffm3u8":"非凡","snm3u8":"索尼",
    "qhm3u8":"奇虎","hym3u8":"虎牙","haiwaikan":"海外看","gsm3u8":"光速","zuidam3u8":"最大",
    "bjm3u8":"八戒","wolong":"卧龙","xlm3u8":"新浪","yhm3u8":"樱花","tkm3u8":"天空",
    "jsm3u8":"极速","wjm3u8":"无尽","sdm3u8":"闪电","kcm3u8":"快车","jinyingm3u8":"金鹰",
    "fsm3u8":"飞速","tpm3u8":"淘片","lem3u8":"鱼乐","dbm3u8":"百度","tomm3u8":"番茄",
    "ukm3u8":"优酷","ikm3u8":"爱坤","hnzym3u8":"红牛资源","hnm3u8":"红牛","68zy_m3u8":"六八",
    "kdm3u8":"酷点","bdxm3u8":"北斗星","hhm3u8":"豪华","kbm3u8":"快播","mzm3u8":"MZ"
};

async function init(cfg) {
    try {
        HOST = (cfg.ext?.host?.trim() || 'https://www.ikanbot.com/').replace(/\/+$/, '');
        KParams.headers.Referer = HOST;
        DEBUG = !!cfg.ext?.debug;
        const t = parseInt(cfg.ext?.timeout, 10);
        if (t > 0) KParams.timeout = t;
        KParams.tabsSet = cfg.ext?.tabsSet?.trim() || '';
        KParams.tabsDeal = cfg.ext?.tabsDeal?.trim() || '';
        dbgLog(`[init] host=${HOST} debug=${DEBUG}`);
    } catch (e) {
        console.error('init异常', e.message);
    }
}
function dbgLog(...args) {
    if (DEBUG) console.log(...args);
}

async function home(filter) {
    try {
        const kclassName = '电影$movie&剧集$tv&榜单$billboard';
        const classes = kclassName.split('&').map(it => {
            const [cName, cId] = it.split('$');
            return { type_name: cName, type_id: cId };
        });
        const filters = {
            "movie": [
                {"key": "class","name": "剧情","value": [{"n": "热门","v": "热门"}, {"n": "最新","v": "最新"}, {"n": "经典","v": "经典"}, {"n": "豆瓣高分","v": "豆瓣高分"}, {"n": "冷门佳片","v": "冷门佳片"}, {"n": "华语","v": "华语"}, {"n": "欧美","v": "欧美"}, {"n": "韩国","v": "韩国"}, {"n": "日本","v": "日本"}, {"n": "动作","v": "动作"}, {"n": "喜剧","v": "喜剧"}, {"n": "爱情","v": "爱情"}, {"n": "科幻","v": "科幻"}, {"n": "悬疑","v": "悬疑"}, {"n": "恐怖","v": "恐怖"}, {"n": "成长","v": "成长"}, {"n": "豆瓣top250","v": "豆瓣top250"}]}
            ],
            "tv": [
                {"key": "class","name": "剧情","value": [{"n": "热门","v": "热门"}, {"n": "美剧","v": "美剧"}, {"n": "英剧","v": "英剧"}, {"n": "韩剧","v": "韩剧"}, {"n": "日剧","v": "日剧"}, {"n": "国产剧","v": "国产剧"}, {"n": "港剧","v": "港剧"}, {"n": "日本动画","v": "日本动画"}, {"n": "综艺","v": "综艺"}, {"n": "纪录片","v": "纪录片"}]}
            ]
        };
        return JSON.stringify({ class: classes, filters: filters });
    } catch (e) {
        console.error('home异常', e);
        return JSON.stringify({ class: [], filters: {} });
    }
}

async function homeVod() {
    try {
        const html = await request(HOST);
        const list = parseVodList(html, false);
        return JSON.stringify({ list });
    } catch (e) {
        console.error('homeVod异常', e);
        return JSON.stringify({ list: [] });
    }
}

async function category(tid, pg, filter, extend) {
    try {
        pg = Math.max(1, Number(pg) || 1);
        const fl = extend || {};
        const suffix = pg > 1 ? `-p-${pg}` : '';
        let cateUrl;
        if(tid === 'billboard'){
            cateUrl = `${HOST}/billboard.html`;
        }else{
            cateUrl = `${HOST}/hot/index‑${tid}‑${fl.class||'热门'}${suffix}.html`;
        }
        const html = await request(cateUrl);
        const list = parseVodList(html, false);
        const hasMore = html.includes('下一页');
        const pagecount = hasMore ? pg + 1 : pg;
        return JSON.stringify({
            list,
            page: pg,
            pagecount,
            limit: list.length,
            total:0
        });
    } catch (e) {
        console.error('category异常',e);
        return JSON.stringify({ list:[],page:1,pagecount:0,limit:30,total:0 });
    }
}

async function search(wd, quick, pg) {
    try {
        pg = Math.max(1, Number(pg)||1);
        const suffix = pg>1 ? `&p=${pg}` : '';
        const searchUrl = `${HOST}/search?q=${encodeURIComponent(wd)}${suffix}`;
        const html = await request(searchUrl);
        const list = parseVodList(html, true);
        const hasMore = html.includes('下一页');
        const pagecount = hasMore ? pg+1 : pg;
        return JSON.stringify({
            list,
            page:pg,
            pagecount,
            limit:30,
            total:0
        });
    } catch (e) {
        console.error('search异常',e);
        return JSON.stringify({ list:[],page:1,pagecount:0,limit:30,total:0 });
    }
}

function parseVodList(html, isSearch) {
    const out = [];
    if(!html) return out;
    let items;
    if(isSearch){
        items = cutStrAll(html,'media">','</h5>',false);
    }else{
        items = cutStrAll(html,'<a','</a>',false).filter(s=>s.includes('alt='));
    }
    for(const it of items){
        const name = isSearch ? cutStrOne(it,'title‑text">','<','') : cutStrOne(it,'alt="','"','');
        let imgRaw = cutStrOne(it,'data‑src="','"','');
        if(!imgRaw) imgRaw = cutStrOne(it,'src="','"','');
        let pic = imgRaw || '';
        const remark = isSearch ? cutStrOne(it,'[',']','') : '';
        const href = cutStrOne(it,'href="','"','');
        if(!href || !name) continue;
        out.push({
            vod_id:`${href}@${name}@${pic}@${remark}`,
            vod_name:name,
            vod_pic:pic,
            vod_remarks:remark,
            style:{type:'rect',ratio:1.33}
        });
    }
    return out;
}

async function detail(ids) {
    try {
        const [vid, vodName, vodPic, vodRemarks] = ids.split('@');
        const detailUrl = vid.startsWith('http') ? vid : `${HOST}${vid}`;
        dbgLog(`[detail]详情页:${detailUrl}`);
        const html = await request(detailUrl);
        if(!html) throw new Error('详情页返回空');

        // === 完全复刻Python extract正则 ===
        const currentId = regexMatch(html, /id="current_id"\s+value="([^"]+)"/);
        const eToken = regexMatch(html, /id="e_token"\s+value="([^"]+)"/);
        const mtype = regexMatch(html, /id="mtype"\s+value="([^"]+)"/) || "1";
        dbgLog(`[detail] currentId=${currentId} eToken=${eToken} mtype=${mtype}`);

        // === 1:1复刻Python gen_token算法 ===
        function genToken(current_id, e_token){
            if(!current_id || !e_token || !/^\d+$/.test(current_id)) return '';
            const last4 = current_id.slice(-4);
            let tk = e_token;
            const parts = [];
            for(const ch of last4){
                const mod = Number(ch) % 3 + 1;
                const part = tk.substring(mod, mod + 8);
                parts.push(part);
                tk = tk.substring(mod + 8);
            }
            return parts.join('');
        }
        const token = genToken(currentId, eToken);
        dbgLog(`[detail]计算token=${token}`);

        let rawLineList = [];
        if(currentId && token){
            const apiUrl = `${HOST}/api/getResN?videoId=${currentId}&mtype=${mtype}&token=${token}`;
            dbgLog(`[detail]请求线路api:${apiUrl}`);
            const apiText = await request(apiUrl);
            dbgLog(`[detail]api原始返回:${apiText.substring(0,800)}`);
            const apiJson = safeJson(apiText);
            if(apiJson?.state === 1){
                const sourceList = apiJson?.data?.list ?? [];
                for(const src of sourceList){
                    const siteId = src.siteId || '';
                    const resDataRaw = src.resData || '[]';
                    let episodes;
                    try{
                        episodes = JSON.parse(resDataRaw);
                    }catch{
                        episodes = [];
                    }
                    if(!Array.isArray(episodes) || episodes.length === 0) continue;
                    const epList = [];
                    // 【重点修复】复刻Python：完整循环全部episodes，不再只取[0]，解决多集丢失！
                    for(const ep of episodes){
                        const flag = ep.flag || `线路${siteId}`;
                        let epUrl = ep.url || '';
                        let epName, playUrl;
                        if(epUrl.includes('$')){
                            [epName, playUrl] = epUrl.split('$',1);
                        }else{
                            epName = epUrl.substring(0,30);
                            playUrl = epUrl;
                        }
                        if(playUrl){
                            epList.push(`${epName}$${playUrl}`);
                        }
                    }
                    if(epList.length > 0){
                        const showName = LINE_NAME_MAP[flag] || flag;
                        rawLineList.push({ name: showName, url: epList.join('#') });
                    }
                }
            }
        }
        dbgLog(`[detail]过滤后有效线路数=${rawLineList.length}`);

        let workList = rawLineList.map(x=>({type_name:x.name,type_value:x.url}));
        if(KParams.tabsSet) workList = tabSetFilter(workList, KParams.tabsSet);
        if(KParams.tabsDeal) workList = tabDealProcess(workList, KParams.tabsDeal);
        workList = workList.filter(p=>!!p.type_value);

        const playFromArr = workList.map(p=>p.type_name);
        const playUrlArr = workList.map(p=>p.type_value);

        const vod = {
            vod_id: ids,
            vod_name: vodName||'',
            vod_pic: vodPic||'',
            vod_remarks: vodRemarks||'',
            type_name:'',
            vod_year:'',
            vod_area:'',
            vod_lang:'',
            vod_director:'',
            vod_actor:'',
            vod_content: cutStrOne(html,'description" content="','">',vodName),
            vod_play_from: playFromArr.join('$$$'),
            vod_play_url: playUrlArr.join('$$$')
        };
        return JSON.stringify({list:[vod]});
    }catch(e){
        console.error('detail整体异常',e.message);
    }
    return JSON.stringify({list:[]});
}

async function play(flag, url) {
    try {
        const playHeader = { ...DefHeader, Referer: HOST };
        const regMedia = /\.(m3u8|mp4|mkv|mov|flv|m4v|ts)(\?|#|$)/i;
        const isMedia = regMedia.test(url);
        dbgLog(`[play] url=${url} isMedia=${isMedia}`);
        return JSON.stringify({
            jx:0,
            parse: isMedia ? 0 : 1,
            url:url,
            header: playHeader
        });
    }catch(e){
        console.error('play异常',e.message);
    }
    return JSON.stringify({jx:0,parse:0,url:'',header:DefHeader});
}

// =========工具函数=========
function safeJson(str){
    try{ if(!str) return null; return JSON.parse(str); }catch{ return null; }
}
// 复刻Python extract() 正则捕获
function regexMatch(text, regex){
    const m = text.match(regex);
    return m ? m[1] : '';
}
function cutStrOne(source, pre, suf, def){
    if(!source) return def;
    const esc = s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const reg = new RegExp(esc(pre)+'([\\s\\S]*?)'+esc(suf));
    const m = source.match(reg);
    if(!m) return def;
    return htmlTrim(m[1]);
}
function cutStrAll(source, pre, suf, clean=true){
    if(!source) return [];
    const esc = s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const reg = new RegExp(esc(pre)+'([\\s\\S]*?)'+esc(suf),'g');
    const res = [];
    let match;
    while((match = reg.exec(source))!==null){
        res.push(clean ? htmlTrim(match[1]) : match[1]);
    }
    return res;
}
function htmlTrim(s){
    return String(s).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
}

function tabSetFilter(list, setStr){
    if(!setStr || !list.length) return list;
    const names = setStr.split('&');
    const res = names.map(n=>list.find(it=>it.type_name===n)).filter(Boolean);
    return res.length ? res : list;
}

function tabDealProcess(arr, dealStr){
    let tmp = [...arr];
    const [delStr, sortStr, renameStr] = dealStr.split('@');
    if(delStr){
        const dels = new Set(delStr.split('&'));
        const filtered = tmp.filter(it=>!dels.has(it.type_name));
        //修复：全部被删除，保留原始数组，不强制取第一条
        if(filtered.length>0) tmp = filtered;
    }
    if(sortStr){
        const [pri,rev] = sortStr.split('#',2);
        const priList = pri.split('>').filter(Boolean);
        const revList = (rev||'').split('<').filter(Boolean);
        const weightMap = new Map();
        priList.forEach((n,i)=>weightMap.set(n,{w:1,i}));
        revList.forEach((n,i)=>{ if(!weightMap.has(n)) weightMap.set(n,{w:3,i}); });
        tmp.forEach((it,i)=>{ if(!weightMap.has(it.type_name)) weightMap.set(it.type_name,{w:2,i}); });
        tmp.sort((a,b)=>{
            const ma = weightMap.get(a.type_name)||{w:2,i:0};
            const mb = weightMap.get(b.type_name)||{w:2,i:0};
            if(ma.w !== mb.w) return ma.w‑mb.w;
            return ma.w===3 ? mb.i‑ma.i : ma.i‑mb.i;
        });
    }
    if(renameStr){
        const rnMap = {};
        renameStr.split('&').forEach(p=>{
            const [k,v] = p.split('>>');
            if(k&&v) rnMap[k.trim()] = v.trim();
        });
        tmp = tmp.map(it=>({...it, type_name: rnMap[it.type_name]||it.type_name}));
    }
    return tmp;
}

async function request(reqUrl, options={}){
    try{
        const optObj = {
            headers:KParams.headers,
            timeout:KParams.timeout,
            ...options
        };
        if(['GET','HEAD'].includes((optObj.method||'GET').toUpperCase())){
            delete optObj.body;
        }
        const res = await req(reqUrl,optObj);
        return res?.content??'';
    }catch(e){
        console.error('request失败',reqUrl,e.message);
        return '';
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
        search,
        proxy: null
    };
}