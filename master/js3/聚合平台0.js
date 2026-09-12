import { Crypto, _ } from 'assets://js/lib/cat.js';
let siteKey = '';
let siteType = 0;
let extendObj = {};

// 源配置，完全复刻py里sources
const SOURCES = {
    's1': { 'name': '🎬香蕉', 'api': 'https://www.xiangjiaozyw.com/api.php/provide/vod/' },
    's2': { 'name': '💧番茄', 'api': 'http://fhapi9.com/api.php/provide/vod/' },
    's3': { 'name': '🧸嘿嘿', 'api': 'https://api.heiapi.cc/api.php/provide/vod/' },
    's4': { 'name': '📺鲨鱼', 'api': 'https://shayuzy5.com/api.php/provide/vod/' },
    's5': { 'name': '🔥麻花', 'api': 'https://19q.cc/api.php/provide/vod/' },
    's6': { 'name': '📺搜AV', 'api': 'https://souavzy.net/api.php/provide/vod/' },
    's7': { 'name': '📺精品', 'api': 'https://www.jingpinx.com/api.php/provide/vod/' },
    's8': { 'name': '⚡极品', 'api': 'https://jipinvip1.com/api.php/provide/vod/' },
    's9': { 'name': '📺美少女', 'api': 'https://www.msnii.com/api/json.php' },
    's10': { 'name': '📺饮水机', 'api': 'https://www.xrbsp.com/api/json.php' },
    's11': { 'name': '📺香奶儿', 'api': 'https://www.gdlsp.com/api/json.php' },
    's12': { 'name': '🐯白嫖', 'api': 'https://www.kxgav.com/api/json.php' },
    's13': { 'name': '📺小师妹', 'api': 'https://www.afasu.com/api/json.php' },
    's14': { 'name': '📺潢AV', 'api': 'https://www.pgxdy.com/api/json.php' },
    's15': { 'name': '📺杏吧', 'api': 'https://api.xgbbk8.com/api.php/provide/vod/' },
    's16': { 'name': '📺CK资源', 'api': 'https://ckzy.me/api.php/provide/vod' },
    's17': { 'name': '📺越南', 'api': 'https://vnzyz.com/api.php/provide/vod '},
    's18': { 'name': '📺15', 'api': 'https://155api.com/api.php/provide/vod/' },
    's19': { 'name': '📺91AV', 'api': 'https://91av.cyou/api.php/provide/vod/' },
    's20': { 'name': '🌕红楼', 'api': 'https://www.hlzy.store/api.php/provide/vod/' },
    's21': { 'name': '📺小鸡', 'api': 'https://api.xiaojizy.live/provide/vod/' },
    's22': { 'name': '📺大奶', 'api': 'https://apidanaizi.com/api.php/provide/vod/' },
    's23': { 'name': '📺豆豆', 'api': 'https://api.douapi.cc/api.php/provide/vod/' },
    's24': { 'name': '📺黑料', 'api': 'https://heiliaozyapi.com/api.php/provide/vod/' },
    's25': { 'name': '🌸仓库', 'api': 'https://hsckzy888.com/api.php/provide/vod/' },
    's26': { 'name': '🐮玉兔', 'api': 'https://apiyutu.com/api.php/provide/vod' },
    's27': { 'name': '☁️精东', 'api': 'http://chujia.cc/api.php/provide/vod/' },
    's28': { 'name': '🏎奶香', 'api': '"https://naixxzy.com/api.php/provide/vod' },
    's29': { 'name': '🦅乐播', 'api': 'https://lbapi9.com/api.php/provide/vod' },
    's30': { 'name': '⚡JKUN', 'api': 'https://jkunzyapi.com/api.php/provide/vod' },
    's31': { 'name': '👑桃花', 'api': 'https://thzy1.me/api.php/provide/vod/' },
    's32': { 'name': '🍃百花', 'api': 'https://bhziyuan.com/api.php/provide/vod/' },
    's33': { 'name': '🐾老色', 'api': 'https://apilsbzy1.com/api.php/provide/vod/' },
    's34': { 'name': '🐾辣椒', 'api': 'https://apilj.com/api.php/provide/vod' },
    's35': { 'name': '🐾javbus', 'api': 'https://javbus.sbs/api.php/provide/vod/' },
    's36': { 'name': '🐾奥斯卡', 'api': 'https://aosikazy8.com/api.php/provide/vod' },
    's37': { 'name': '🐾火速', 'api': 'https://api.huosuapi.cc/api.php/provide/vod/' },
    's38': { 'name': '🐾聚合2', 'api': 'http://150.109.94.44:1112/api.php/provide/vod/' },
    's39': { 'name': '🐾CK百货', 'api': 'https://ckbh1.xyz/api.php/provide/vod/' },
    's40': { 'name': '🐾番茄', 'api': 'https://fqzy.me/api.php/provide/vod/' },
    's41': { 'name': '🐾森林', 'api': 'https://slapibf.com/api.php/provide/vod/' },
    's42': { 'name': '🐾大地', 'api': 'https://dadiapi.com/feifei2/' },
    's43': { 'name': '🐾色猫', 'api': 'https://caiji.semaozy.net/inc/apijson_vod.php' },
    's44': { 'name': '🐾滴滴', 'api': 'https://api.ddapi.cc/api.php/provide/vod/' },
    's45': { 'name': '🐾91', 'api': 'https://91md.me/api.php/provide/vod/' },
    's46': { 'name': '🐾细胞', 'api': 'https://www.xxibaozyw.com/api.php/provide/vod/' },
    's47': { 'name': '📺湿园', 'api': 'https://xxavs.com/api.php/provide/vod' }
};

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const DEFAULT_HEADERS = { "User-Agent": UA };

async function request(url, optHeaders = {}, body) {
    try {
        const headers = Object.assign({}, DEFAULT_HEADERS, optHeaders || {});
        const res = await req(url, {
            method: body ? "POST" : "GET",
            headers: headers,
            timeout: 8000,
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

function fixPicUrl(url) {
    url = text(url);
    if (!url) return "";
    if (url.startsWith("//")) return "https:" + url;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return "";
}

// 复刻py clean_item
function cleanItem(item, sourceKey, sourceName, isDetail = false) {
    const o = Object.assign({}, item);
    if (!isDetail) {
        o.vod_id = `${sourceKey}@@${text(o.vod_id)}`;
    }
    const rem = text(o.vod_remarks || "");
    o.vod_remarks = `${sourceName} | ${rem}`;
    if (o.vod_play_from) {
        const arr = text(o.vod_play_from).split("$$$");
        const newArr = arr.map(x => `${sourceName}-${x}`);
        o.vod_play_from = newArr.join("$$$");
    }
    delete o.vod_down_from;
    delete o.vod_down_url;
    return o;
}

async function loadSourceFilter(sourceKey, sourceApi) {
    const url = `${sourceApi}?ac=list`;
    const html = await request(url);
    const data = safeJson(html) || {};
    const vals = [{ n: "全部(最新)", v: "" }];
    if (Array.isArray(data.class)) {
        for (const c of data.class) {
            vals.push({ n: text(c.type_name), v: text(c.type_id) });
        }
    }
    return { sourceKey, vals };
}

async function init(cfg) {
    try {
        siteKey = cfg.skey;
        siteType = cfg.stype;
        const classes = [];
        const filters = {};
        // 构建分类列表 + 串行拉取每个源的分类筛选
        for (const [sKey, sObj] of Object.entries(SOURCES)) {
            classes.push({
                type_id: sKey,
                type_name: sObj.name,
                land: 1,
                ratio: 1.33
            });
            const fr = await loadSourceFilter(sKey, sObj.api);
            filters[fr.sourceKey] = [{
                key: "cateId",
                name: "分类",
                value: fr.vals
            }];
        }
        extendObj = { classes, filter: filters };
    } catch (e) {
        console.error("init error", e.message);
        extendObj = { classes: [], filter: {} };
    }
}

function home(filter) {
    try {
        return JSON.stringify({
            class: extendObj.classes || [],
            filters: extendObj.filter || {}
        });
    } catch (e) {
        return JSON.stringify({ class: [], filters: {} });
    }
}

async function homeVod() {
    // 原py homeContent list为空
    return JSON.stringify({ list: [] });
}

async function category(tid, pg, filter, ext) {
    pg = Number(pg) || 1;
    try {
        const sourceObj = SOURCES[tid];
        if (!sourceObj) return JSON.stringify({ list: [], page: pg, pagecount: 0 });
        const cateId = ext?.cateId ? text(ext.cateId) : "";
        let url = `${sourceObj.api}?ac=detail&pg=${pg}`;
        if (cateId) url += `&t=${cateId}`;
        const html = await request(url);
        const data = safeJson(html) || {};
        const rawList = Array.isArray(data.list) ? data.list : [];
        const outList = [];
        for (const it of rawList) {
            const cleaned = cleanItem(it, tid, sourceObj.name, false);
            cleaned.vod_pic = fixPicUrl(cleaned.vod_pic);
            cleaned.style = { type: 'rect', ratio: 1.33 };
            outList.push(cleaned);
        }
        return JSON.stringify({
            list: outList,
            page: Number(data.page || pg),
            pagecount: Number(data.pagecount || 1),
            limit: Number(data.limit || 20),
            total: Number(data.total || outList.length)
        });
    } catch (e) {
        console.error("category error", e.message);
        return JSON.stringify({ list: [], page: pg, pagecount: 0 });
    }
}

async function searchOne(sourceKey, sourceObj, keyword, pg) {
    const url = `${sourceObj.api}?ac=detail&wd=${encodeURIComponent(keyword)}&pg=${pg}`;
    const html = await request(url);
    const data = safeJson(html) || {};
    const rawList = Array.isArray(data.list) ? data.list : [];
    const out = [];
    for (const it of rawList) {
        const cleaned = cleanItem(it, sourceKey, sourceObj.name, false);
        cleaned.vod_pic = fixPicUrl(cleaned.vod_pic);
        cleaned.style = { type: 'rect', ratio: 1.33 };
        out.push(cleaned);
    }
    return { list: out, pagecount: Number(data.pagecount || 1) };
}

async function search(key, quick, pg) {
    pg = Number(pg) || 1;
    try {
        let resultList = [];
        let maxPage = 1;
        // 串行遍历所有源模拟py线程池
        for (const [sKey, sObj] of Object.entries(SOURCES)) {
            try {
                const res = await searchOne(sKey, sObj, key, pg);
                resultList.push(...res.list);
                if (res.pagecount > maxPage) maxPage = res.pagecount;
            } catch (err) {
                console.error("search skip source", sKey, err.message);
            }
        }
        return JSON.stringify({
            list: resultList,
            page: pg,
            pagecount: maxPage,
            limit: 40,
            total: 9999,
            land: 1,
            ratio: 1.33
        });
    } catch (e) {
        console.error("search error", e.message);
        return JSON.stringify({ list: [], page: pg, pagecount: 0, land: 1, ratio: 1.33 });
    }
}

async function detail(vodIdRaw) {
    try {
        if (!vodIdRaw.includes("@@")) return JSON.stringify({ list: [] });
        const [sourceKey, realVodId] = vodIdRaw.split("@@", 2);
        const sourceObj = SOURCES[sourceKey];
        if (!sourceObj) return JSON.stringify({ list: [] });
        const url = `${sourceObj.api}?ac=detail&ids=${encodeURIComponent(realVodId)}`;
        const html = await request(url);
        const data = safeJson(html) || {};
        const rawList = Array.isArray(data.list) ? data.list : [];
        const outList = [];
        for (const it of rawList) {
            const cleaned = cleanItem(it, sourceKey, sourceObj.name, true);
            cleaned.vod_id = vodIdRaw;
            cleaned.vod_pic = fixPicUrl(cleaned.vod_pic);
            outList.push(cleaned);
        }
        return JSON.stringify({ list: outList });
    } catch (e) {
        console.error("detail error", e.message);
        return JSON.stringify({ list: [] });
    }
}

async function play(flag, id, flags) {
    // py里playerContent直接透传id，CAT中透传原始播放串，失败parse=1
    try {
        return JSON.stringify({
            parse: 0,
            url: id,
            header: { "User-Agent": UA }
        });
    } catch (e) {
        console.error("play error", e.message);
        return JSON.stringify({ parse: 1, url: id, header: { "User-Agent": UA } });
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