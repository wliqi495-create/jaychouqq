import { Crypto, _ } from 'assets://js/lib/cat.js';
let siteKey = '';
let siteType = 0;

const HOST = "https://www.wasu.cn";
const API_UPS = "https://ups.5g.wasu.tv/rmp-user-suggest/1000101/hzhs/searchServlet";
const API_MCSP = "https://mcspapp.5g.wasu.tv/bvradio_app/hzhs/newsServlet";
const API_PLAY = "https://mcspapp.5g.wasu.tv/thirdApiFile/file/getPlayUrl";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0";
const HEADER_COMMON = {
    "User‑Agent": UA,
    "Referer": HOST,
    "Origin": HOST,
    "Accept": "*/*",
    "Accept‑Language": "zh‑CN,zh;q=0.9",
    "Cache‑Control": "no‑cache",
    "Pragma": "no‑cache",
    "sec‑ch‑ua": '"Microsoft Edge";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
    "sec‑ch‑ua‑mobile": "?0",
    "sec‑ch‑ua‑platform": '"Windows"',
    "sec‑fetch‑dest": "empty",
    "sec‑fetch‑mode": "cors",
    "sec‑fetch‑site": "cross‑site"
};

// ============ 工具函数（完全复用动画巴士模板） ============
async function request(url, optHeaders = {}, postBody) {
    try {
        const headers = Object.assign({}, HEADER_COMMON, optHeaders);
        const res = await req(url, {
            method: postBody ? "POST" : "GET",
            headers: headers,
            timeout: 15000,
            data: postBody
        });
        return res;
    } catch (e) {
        console.error("request error:", url, e?.message);
        return null;
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

function htmlClean(text) {
    if (!text) return "";
    text = text.replace(/<[^>]+>/g, '');
    text = text.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
    text = text.replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    text = text.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    text = text.replace(/\s+/g, ' ');
    return text.trim();
}

function reSearch(text, regStr, idx = 1, def = "") {
    const reg = new RegExp(regStr, "s");
    const m = reg.exec(text);
    return m ? (m[idx] || def).trim() : def;
}

function absUrl(url) {
    if (!url) return "";
    if (url.startsWith("//")) return "https:" + url;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return HOST + "/" + url.replace(/^\//, "");
}

// ============ 华数签名业务逻辑（翻译Python） ============

/** 从首页抓js路径 */
async function fetchIndexJsPath() {
    const resObj = await request(HOST);
    if (!resObj) return "";
    const html = resObj.content || "";
    const jsPath = reSearch(html, /src="(\/[\d\.]+\/assets\/js\/index‑[\w\.-]+\.js)"/);
    return jsPath;
}

/** 下载js文件，提取secret_b64密钥 */
async function getCurrentAppKey() {
    const jsPath = await fetchIndexJsPath();
    if (!jsPath) return "";
    const jsUrl = absUrl(jsPath);
    const resObj = await request(jsUrl);
    if (!resObj) return "";
    const jsText = resObj.content || "";
    // const xxx="aaa",yyy="bbb",zzz="targetSecret"; 提取第2个字符串，对应py extract_target_key
    const match = reSearch(jsText, /const \w+="([^"]+)",\w+="([^"]+)",\w+="([^"]+)";/);
    return match || "";
}

/** hmac‑sha256 + base64签名，对应generate_x_sign */
function generateXSign(secretB64, dataStr = "{}") {
    const secretBytes = Crypto.enc.Base64.parse(secretB64);
    const hmacBuf = Crypto.HmacSHA256(dataStr, secretBytes);
    const xsign = Crypto.enc.Base64.stringify(hmacBuf);
    return xsign;
}

/** 获取接口请求headers，带x‑sign */
function buildApiHeaders(xSign) {
    return Object.assign({}, HEADER_COMMON, {
        "accept": "application/json, text/plain, */*",
        "launchchannel": "web_channel",
        "siteid": "1000101",
        "x‑sign": xSign
    });
}

// ============ home 首页分类&筛选配置（原样复制py homeContent） ============
const HOME_CLASS = [
    { "type_id": "961", "type_name": "电影", land:1, ratio:1.33 },
    { "type_id": "962", "type_name": "剧集", land:1, ratio:1.33 },
    { "type_id": "963", "type_name": "少儿", land:1, ratio:1.33 },
    { "type_id": "965", "type_name": "栏目", land:1, ratio:1.33 },
    { "type_id": "966", "type_name": "新闻", land:1, ratio:1.33 }
];

const HOME_FILTERS = {
    "961": [
        {
            "key": "地区",
            "name": "地区",
            "value": [
                { "n": "全部", "v": "" },
                { "n": "内地", "v": "内地" },
                { "n": "港台", "v": "港台" },
                { "n": "欧美", "v": "欧美" },
                { "n": "日韩", "v": "日韩" },
                { "n": "泰国", "v": "泰国" },
                { "n": "其他", "v": "其他" }
            ]
        },
        {
            "key": "类型",
            "name": "类型",
            "value": [
                { "n": "全部", "v": "" },
                { "n": "动作", "v": "动作" },
                { "n": "科幻", "v": "科幻" },
                { "n": "惊悚", "v": "惊悚" },
                { "n": "冒险", "v": "冒险" },
                { "n": "剧情", "v": "剧情" },
                { "n": "励志", "v": "励志" },
                { "n": "爱情", "v": "爱情" },
                { "n": "喜剧", "v": "喜剧" },
                { "n": "家庭", "v": "家庭" },
                { "n": "历史", "v": "历史" },
                { "n": "魔幻", "v": "魔幻" },
                { "n": "恐怖", "v": "恐怖" },
                { "n": "战争", "v": "战争" },
                { "n": "武侠", "v": "武侠" }
            ]
        },
        {
            "key": "年代",
            "name": "年代",
            "value": [
                { "n": "全部", "v": "" },
                { "n": "2025", "v": "2025" },
                { "n": "2024", "v": "2024" },
                { "n": "2023", "v": "2023" },
                { "n": "2022", "v": "2022" },
                { "n": "2021", "v": "2021" },
                { "n": "2020", "v": "2020" },
                { "n": "2019", "v": "2019" },
                { "n": "2018", "v": "2018" },
                { "n": "2017", "v": "2017" },
                { "n": "2016", "v": "2016" },
                { "n": "2015", "v": "2015" },
                { "n": "2014", "v": "2014" },
                { "n": "2013", "v": "2013" },
                { "n": "2012", "v": "2012" },
                { "n": "2011", "v": "2011" },
                { "n": "2010", "v": "2010" }
            ]
        }
    ],
    "962": [
        {
            "key": "地区",
            "name": "地区",
            "value": [
                { "n": "全部", "v": "" },
                { "n": "内地", "v": "内地" },
                { "n": "港台", "v": "港台" },
                { "n": "日韩", "v": "日韩" },
                { "n": "欧美", "v": "欧美" },
                { "n": "泰国", "v": "泰国" },
                { "n": "其他", "v": "其他" }
            ]
        },
        {
            "key": "类型",
            "name": "类型",
            "value": [
                { "n": "全部", "v": "" },
                { "n": "都市", "v": "都市" },
                { "n": "爱情", "v": "爱情" },
                { "n": "战争", "v": "战争" },
                { "n": "家庭", "v": "家庭" },
                { "n": "悬疑", "v": "悬疑" },
                { "n": "古装", "v": "古装" },
                { "n": "短剧", "v": "短剧" },
                { "n": "谍战", "v": "谍战" },
                { "n": "喜剧", "v": "喜剧" },
                { "n": "农村", "v": "农村" },
                { "n": "刑侦", "v": "刑侦" },
                { "n": "武侠", "v": "武侠" },
                { "n": "历史", "v": "历史" }
            ]
        },
        {
            "key": "年代",
            "name": "年代",
            "value": [
                { "n": "全部", "v": "" },
                { "n": "2025", "v": "2025" },
                { "n": "2024", "v": "2024" },
                { "n": "2023", "v": "2023" },
                { "n": "2022", "v": "2022" },
                { "n": "2021", "v": "2021" },
                { "n": "2020", "v": "2020" },
                { "n": "2019", "v": "2019" },
                { "n": "2018", "v": "2018" },
                { "n": "2017", "v": "2017" },
                { "n": "2016", "v": "2016" },
                { "n": "2015", "v": "2015" },
                { "n": "2014", "v": "2014" },
                { "n": "2013", "v": "2013" },
                { "n": "2012", "v": "2012" },
                { "n": "2011", "v": "2011" },
                { "n": "2010", "v": "2010" }
            ]
        }
    ],
    "963": [
        {
            "key": "地区",
            "name": "地区",
            "value": [
                { "n": "全部", "v": "" },
                { "n": "内地", "v": "内地" },
                { "n": "日韩", "v": "日韩" },
                { "n": "欧美", "v": "欧美" },
                { "n": "港台", "v": "港台" },
                { "n": "其他", "v": "其他" }
            ]
        },
        {
            "key": "类型",
            "name": "类型",
            "value": [
                { "n": "全部", "v": "" },
                { "n": "动作", "v": "动作" },
                { "n": "冒险", "v": "冒险" },
                { "n": "益智", "v": "益智" },
                { "n": "亲子", "v": "亲子" },
                { "n": "热血", "v": "热血" },
                { "n": "剧情", "v": "剧情" },
                { "n": "魔幻", "v": "魔幻" },
                { "n": "励志", "v": "励志" },
                { "n": "机战", "v": "机战" },
                { "n": "搞笑", "v": "搞笑" },
                { "n": "科幻", "v": "科幻" },
                { "n": "治愈", "v": "治愈" },
                { "n": "儿歌", "v": "儿歌" },
                { "n": "教育", "v": "教育" },
                { "n": "校园", "v": "校园" },
                { "n": "童话", "v": "童话" },
                { "n": "推理", "v": "推理" },
                { "n": "怀旧", "v": "怀旧" },
                { "n": "宠物", "v": "宠物" },
                { "n": "舞蹈", "v": "舞蹈" }
            ]
        },
        {
            "key": "年代",
            "name": "年代",
            "value": [
                { "n": "全部", "v": "" },
                { "n": "2025", "v": "2025" },
                { "n": "2024", "v": "2024" },
                { "n": "2023", "v": "2023" },
                { "n": "2022", "v": "2022" },
                { "n": "2021", "v": "2021" },
                { "n": "2020", "v": "2020" },
                { "n": "2019", "v": "2019" },
                { "n": "2018", "v": "2018" },
                { "n": "2017", "v": "2017" },
                { "n": "2016", "v": "2016" },
                { "n": "2015", "v": "2015" },
                { "n": "2014", "v": "2014" },
                { "n": "2013", "v": "2013" },
                { "n": "2012", "v": "2012" },
                { "n": "2011", "v": "2011" },
                { "n": "2010", "v": "2010" }
            ]
        }
    ],
    "965": [
        {
            "key": "地区",
            "name": "地区",
            "value": [
                { "n": "全部", "v": "" },
                { "n": "内地", "v": "内地" },
                { "n": "欧美", "v": "欧美" }
            ]
        },
        {
            "key": "类型",
            "name": "类型",
            "value": [
                { "n": "全部", "v": "" },
                { "n": "文化", "v": "文化" },
                { "n": "纪实", "v": "纪实" },
                { "n": "访谈", "v": "访谈" },
                { "n": "历史", "v": "历史" },
                { "n": "美食", "v": "美食" },
                { "n": "旅游", "v": "旅游" },
                { "n": "时尚", "v": "时尚" },
                { "n": "情感", "v": "情感" },
                { "n": "生活", "v": "生活" },
                { "n": "真人秀", "v": "真人秀" }
            ]
        },
        {
            "key": "年代",
            "name": "年代",
            "value": [
                { "n": "全部", "v": "" },
                { "n": "2025", "v": "2025" },
                { "n": "2024", "v": "2024" },
                { "n": "2023", "v": "2023" },
                { "n": "2022", "v": "2022" },
                { "n": "2021", "v": "2021" },
                { "n": "2020", "v": "2020" },
                { "n": "2019", "v": "2019" },
                { "n": "2018", "v": "2018" },
                { "n": "2017", "v": "2017" },
                { "n": "2016", "v": "2016" },
                { "n": "2015", "v": "2015" },
                { "n": "2014", "v": "2014" },
                { "n": "2013", "v": "2013" },
                { "n": "2012", "v": "2012" },
                { "n": "2011", "v": "2011" },
                { "n": "2010", "v": "2010" }
            ]
        }
    ],
    "966": [
        {
            "key": "类型",
            "name": "类型",
            "value": [
                { "n": "全部", "v": "" },
                { "n": "国内视野", "v": "国内视野" },
                { "n": "国际纵览", "v": "国际纵览" },
                { "n": "军事话题", "v": "军事话题" },
                { "n": "社会百态", "v": "社会百态" },
                { "n": "央视频", "v": "央视频" }
            ]
        }
    ]
};

// ============ CAT标准接口函数 ============
async function init(cfg) {
    try {
        siteKey = cfg.skey;
        siteType = cfg.stype;
    } catch (e) {
        console.error("init error", e.message);
    }
}

async function home(filter) {
    try {
        return JSON.stringify({
            class: HOME_CLASS,
            filters: HOME_FILTERS
        });
    } catch (e) {
        console.error("home error", e.message);
        return JSON.stringify({ class: [], filters: {} });
    }
}

async function homeVod() {
    // py homeVideoContent 返回空，首页无推荐
    return JSON.stringify({ list: [] });
}

async function category(tid, pg, filter, ext) {
    pg = Number(pg) || 1;
    try {
        // 获取动态密钥
        const secretB64 = await getCurrentAppKey();
        if (!secretB64) throw new Error("获取secretB64失败");
        const xSign = generateXSign(secretB64, "{}");
        const headers = buildApiHeaders(xSign);

        // 提取筛选条件 ext：年代、地区、类型
        const NdType = ext?.年代 ?? "";
        const DqType = ext?.地区 ?? "";
        const LxType = ext?.类型 ?? "";

        const params = {
            functionName: "getNewsSearchedByCondition",
            nodeId: tid,
            nodeTag: LxType,
            yearTag: NdType,
            countryTag: DqType,
            orderType: "0",
            pageSize: "40",
            page: String(pg),
            keyword: "",
            siteId: "1000101"
        };
        const urlObj = new URL(API_UPS);
        Object.entries(params).forEach((
