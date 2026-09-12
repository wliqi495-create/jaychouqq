// caiji.js 整合drpy2核心工具 | 适配荐片[优]接口 http://192.129.140.23:5757/api/荐片[优]?pwd=dzyyds
// 剔除drpy2测试demo、版本更新日志；保留请求、url工具、解析器、编码、base64、gzip、pdfh/pdfa/pdf解析逻辑

// ===================== 常量定义 start =====================
const MOBILE_UA = "Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36";
const PC_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.54 Safari/537.36";
const UA = "Mozilla/5.0";
const UC_UA = "Mozilla/5.0 (Linux; U; Android 9; zh-CN; MI 9 Build/PKQ1.181121.001) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/57.0.2987.108 UCBrowser/12.5.5.1035 Mobile Safari/537.36";
const IOS_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1";

const DOM_CHECK_ATTR = /(url|src|href|-original|-src|-play|-url|style)$/;
const SPECIAL_URL = /^(ftp|magnet|thunder|ws):/;
const NOADD_INDEX = /:eq|:lt|:gt|:first|:last|^body$|^#/;
const URLJOIN_ATTR = /(url|src|href|-original|-src|-play|-url|style)$|^(data-|url-|src-)/;
const SELECT_REGEX = /:eq|:lt|:gt|#/g;
const SELECT_REGEX_A = /:eq|:lt|:gt/g;

let fetch_params;
let rule_fetch_params;
let MY_URL = "";
let VODS = [];
let VOD = {};
let TABS = [];
let LISTS = [];
// ===================== 常量定义 end =====================

// ===================== base64兼容实现 start =====================
function window_b64() {
    let b64map = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let base64DecodeChars = new Array(-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 62, -1, -1, -1, 63, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, -1, -1, -1, -1, -1, -1, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, -1, -1, -1, -1, -1, -1, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, -1, -1, -1, -1, -1);
    function btoa(str) {
        var out, i, len;
        var c1, c2, c3;
        len = str.length;
        i = 0;
        out = "";
        while (i < len) {
            c1 = str.charCodeAt(i++) & 255;
            if (i == len) {
                out += b64map.charAt(c1 >> 2);
                out += b64map.charAt((c1 & 3) << 4);
                out += "==";
                break
            }
            c2 = str.charCodeAt(i++);
            if (i == len) {
                out += b64map.charAt(c1 >> 2);
                out += b64map.charAt((c1 & 3) << 4 | (c2 & 240) >> 4);
                out += b64map.charAt((c2 & 15) << 2);
                out += "=";
                break
            }
            c3 = str.charCodeAt(i++);
            out += b64map.charAt(c1 >> 2);
            out += b64map.charAt((c1 & 3) << 4 | (c2 & 240) >> 4);
            out += b64map.charAt((c2 & 15) << 2 | (c3 & 192) >> 6);
            out += b64map.charAt(c3 & 63)
        }
        return out
    }
    function atob(str) {
        var c1, c2, c3, c4;
        var i, len, out;
        len = str.length;
        i = 0;
        out = "";
        while (i < len) {
            do {
                c1 = base64DecodeChars[str.charCodeAt(i++) & 255]
            } while (i < len && c1 == -1);
            if (c1 == -1) break;
            do {
                c2 = base64DecodeChars[str.charCodeAt(i++) & 255]
            } while (i < len && c2 == -1);
            if (c2 == -1) break;
            out += String.fromCharCode(c1 << 2 | (c2 & 48) >> 4);
            do {
                c3 = base64DecodeChars[str.charCodeAt(i++) & 255];
                if (c3 == 61) return out;
                c3 = base64DecodeChars[c3]
            } while (i < len && c3 == -1);
            if (c3 == -1) break;
            out += String.fromCharCode((c2 & 15) << 4 | (c3 & 60) >> 2);
            do {
                c4 = base64DecodeChars[str.charCodeAt(i++) & 255];
                if (c4 == 61) return out;
                c4 = base64DecodeChars[c4]
            } while (i < len && c4 == -1);
            if (c4 == -1) break;
            out += String.fromCharCode((c3 & 3) << 6 | c4)
        }
        return out
    }
    return {atob,btoa}
}
if (typeof atob !== "function" || typeof btoa !== "function") {
    var {atob,btoa} = window_b64()
}
// ===================== base64兼容实现 end =====================

// ===================== 工具函数 start =====================
function keysToLowerCase(obj) {
    return Object.keys(obj).reduce((result, key) => {
        const newKey = key.toLowerCase();
        result[newKey] = obj[key];
        return result
    }, {})
}

function getQuery(url) {
    try {
        if (url.indexOf("?") > -1) {
            url = url.slice(url.indexOf("?") + 1)
        }
        let arr = url.split("#")[0].split("&");
        const resObj = {};
        arr.forEach(item => {
            let arr1 = item.split("=");
            let key = arr1[0];
            let value = arr1.slice(1).join("=");
            resObj[key] = value
        });
        return resObj
    } catch (err) {
        return {}
    }
}

function parseQueryString(query) {
    const params = {};
    query.split("&").forEach(function(part) {
        const regex = /^(.*?)=(.*)/;
        const match = part.match(regex);
        if (match) {
            const key = decodeURIComponent(match[1]);
            const value = decodeURIComponent(match[2]);
            params[key] = value
        }
    });
    return params
}

function buildQueryString(params) {
    const queryArray = [];
    for (const key in params) {
        if (params.hasOwnProperty(key)) {
            let value = params[key];
            if (value === undefined || value === null) value = "";
            else value = value.toString();
            const encodedKey = encodeURIComponent(key);
            const encodedValue = encodeURIComponent(value);
            queryArray.push(encodedKey + "=" + encodedValue)
        }
    }
    return queryArray.join("&")
}

function buildUrl(url, obj) {
    obj = obj || {};
    if (url.indexOf("?") < 0) url += "?";
    let param_list = [];
    let keys = Object.keys(obj);
    keys.forEach(it => param_list.push(it + "=" + obj[it]));
    let prs = param_list.join("&");
    if (keys.length > 0 && !url.endsWith("?")) url += "&";
    url += prs;
    return url
}

function getHome(url) {
    if (!url) return "";
    let tmp = url.split("//");
    url = tmp[0] + "//" + tmp[1].split("/")[0];
    try { url = decodeURIComponent(url) }catch(e){}
    return url
}

/** urljoin 路径拼接，修复含中文/[]特殊字符 */
function urljoin(fromPath, nowPath) {
    fromPath = fromPath || "";
    nowPath = nowPath || "";
    return new URL(nowPath, fromPath).href;
}
var urljoin2 = urljoin;

function dealJson(html) {
    try {
        html = html.trim();
        if (!(html.startsWith("{") && html.endsWith("}") || html.startsWith("[") && html.endsWith("]"))) {
            html = "{" + html.match(/.*?\{(.*)\}/m)[1] + "}"
        }
    } catch (e) {}
    try { html = JSON.parse(html) } catch (e) {}
    return html
}

function deepCopy(_obj) {
    return JSON.parse(JSON.stringify(_obj))
}

function urlencode(str) {
    str = (str + "").toString();
    return encodeURIComponent(str).replace(/!/g, "%21").replace(/'/g, "%27").replace(/\(/g, "%28").replace(/\)/g, "%29").replace(/\*/g, "%2A").replace(/%20/g, "+")
}

// 修复【荐片[优]】这类包含中文、[] 的url编码
function safeEncodeUrl(rawUrl) {
    try {
        const u = new URL(rawUrl);
        return u.href;
    }catch(e){
        // 手动编码path部分
        let sp = rawUrl.split("?");
        let pathPart = sp[0];
        let queryPart = sp.length>1 ? sp[1] : "";
        pathPart = encodeURI(pathPart);
        return queryPart ? `${pathPart}?${queryPart}` : pathPart;
    }
}
// ===================== 工具函数 end =====================

// ===================== 请求封装 request/post  start =====================
var print = console.log;
var log = console.log;

function request(url, obj, ocr_flag) {
    ocr_flag = ocr_flag || false;
    // 修复 荐片[优] 特殊字符url
    url = safeEncodeUrl(url);

    if (typeof obj === "undefined" || !obj || obj === {}) {
        if (!fetch_params || !fetch_params.headers) {
            let headers = {"User-Agent": MOBILE_UA};
            if (rule && rule.headers) Object.assign(headers, rule.headers);
            if (!fetch_params) fetch_params = {};
            fetch_params.headers = headers
        }
        if (!fetch_params.headers.Referer) fetch_params.headers.Referer = getHome(url);
        obj = fetch_params
    } else {
        let headers = obj.headers || {};
        let keys = Object.keys(headers).map(it => it.toLowerCase());
        if (!keys.includes("user-agent")) {
            headers["User-Agent"] = MOBILE_UA;
            if (typeof fetch_params === "object" && fetch_params && fetch_params.headers) {
                let fetch_headers = keysToLowerCase(fetch_params.headers);
                if (fetch_headers["user-agent"]) headers["User-Agent"] = fetch_headers["user-agent"]
            }
        }
        if (!keys.includes("referer")) headers["Referer"] = getHome(url);
        obj.headers = headers
    }

    if (rule && rule.encoding && rule.encoding !== "utf-8" && !ocr_flag) {
        if (!obj.headers.hasOwnProperty("Content-Type") && !obj.headers.hasOwnProperty("content-type")) {
            obj.headers["Content-Type"] = "text/html; charset=" + rule.encoding
        }
    }
    if (typeof obj.body != "undefined" && obj.body && typeof obj.body === "string") {
        if (!obj.headers.hasOwnProperty("Content-Type") && !obj.headers.hasOwnProperty("content-type")) {
            obj.headers["Content-Type"] = "application/x-www-form-urlencoded; charset=utf-8"
        }
    } else if (typeof obj.body != "undefined" && obj.body && typeof obj.body === "object") {
        obj.data = obj.body;
        delete obj.body
    }
    if (!url) return obj.withHeaders ? "{}" : "";
    if (obj.toBase64) { obj.buffer = 2; delete obj.toBase64 }
    if (obj.redirect === false) obj.redirect = 0;

    // 模拟drpy底层req，实际环境替换为平台底层req
    console.log("request>>", url, JSON.stringify(obj));
    // ------------【注意】在drpy环境下这里直接使用底层req，浏览器/node需要替换http请求实现 ------------
    let res = req(url, obj);
    // ----------------------------------------------------------------------------------------
    let html = res.content || "";
    if (obj.withHeaders) {
        let htmlWithHeaders = res.headers;
        htmlWithHeaders.body = html;
        return JSON.stringify(htmlWithHeaders)
    } else {
        return html
    }
}

function post(url, obj) {
    obj = obj || {};
    obj.method = "POST";
    return request(url, obj)
}
// ===================== 请求封装 end =====================

// ===================== 解析器pdfh/pdfa/pd 简化版（依赖cheerio jp，drpy内置） start =====================
const defaultParser = {
    pdfh: pdfh,
    pdfa: pdfa,
    pd: pd
};

function pdfh2(html, parse) {
    let html2 = html;
    try {
        if (typeof html !== "string") html2 = html.rr(html.ele).toString()
    } catch (e) { print(`html对象转文本发生了错误:${e.message}`) }
    let result = defaultParser.pdfh(html2, parse);
    let option = parse.includes("&&") ? parse.split("&&").slice(-1)[0] : parse.split(" ").slice(-1)[0];
    if (/style/.test(option.toLowerCase()) && /url\(/.test(result)) {
        try {
            result = result.match(/url\((.*?)\)/)[1];
            result = result.replace(/^['|"](.*)['|"]$/, "$1")
        } catch (e) {}
    }
    return result
}
function pdfa2(html, parse) {
    let html2 = html;
    try {
        if (typeof html !== "string") html2 = html.rr(html.ele).toString()
    } catch (e) { print(`html对象转文本发生了错误:${e.message}`) }
    return defaultParser.pdfa(html2, parse)
}
function pd2(html, parse, uri) {
    let ret = pdfh2(html, parse);
    if (typeof uri === "undefined" || !uri) uri = "";
    if (DOM_CHECK_ATTR.test(parse) && !SPECIAL_URL.test(ret)) {
        if (/http/.test(ret)) ret = ret.slice(ret.indexOf("http"));
        else ret = urljoin(MY_URL, ret)
    }
    return ret
}

const parseTags = {
    jsp: {pdfh:pdfh2,pdfa:pdfa2,pd:pd2},
    json: {
        pdfh(html, parse) {
            if (!parse || !parse.trim()) return "";
            if (typeof html === "string") html = JSON.parse(html);
            parse = parse.trim();
            if (!parse.startsWith("$.")) parse = "$." + parse;
            parse = parse.split("||");
            for (let ps of parse) {
                let ret = cheerio.jp(ps, html);
                if (Array.isArray(ret)) ret = ret[0] || "";
                else ret = ret || "";
                if (ret && typeof ret !== "string") ret = ret.toString();
                if (ret) return ret
            }
            return ""
        },
        pdfa(html, parse) {
            if (!parse || !parse.trim()) return [];
            if (typeof html === "string") html = JSON.parse(html);
            parse = parse.trim();
            if (!parse.startsWith("$.")) parse = "$." + parse;
            let ret = cheerio.jp(parse, html);
            if (Array.isArray(ret) && Array.isArray(ret[0]) && ret.length === 1) return ret[0] || [];
            return ret || []
        },
        pd(html, parse) {
            let ret = parseTags.json.pdfh(html, parse);
            if (ret) return urljoin(MY_URL, ret);
            return ret
        }
    },
    jq: {pdfh:defaultParser.pdfh,pdfa:defaultParser.pdfa,pd:defaultParser.pd},
    getParse(p0) {
        if (p0.startsWith("jsp:")) return this.jsp;
        else if (p0.startsWith("json:")) return this.json;
        else if (p0.startsWith("jq:")) return this.jq;
        else return this.jq
    }
};
const jsp = parseTags.jsp;
const jq = parseTags.jq;
// ===================== 解析器 end =====================

// ===================== 采集业务函数（原caiji.js业务，适配荐片接口） =====================
/**
 * 采集入口：适配 http://192.129.140.23:5757/api/荐片[优]?pwd=dzyyds
 * @param {string} rawApiUrl 原始接口链接，包含中文和[]特殊符号
 */
function caiji(rawApiUrl) {
    log("原始待采集链接：", rawApiUrl);
    // 自动修复url中中文、[]等非法字符
    const fixUrl = safeEncodeUrl(rawApiUrl);
    log("编码修复后url：", fixUrl);

    let respText = request(fixUrl);
    if (!respText) {
        log("采集失败，接口返回空");
        return {code:-1,msg:"接口返回空",data:null}
    }
    let jsonData;
    try {
        jsonData = JSON.parse(respText);
    }catch(err){
        log("接口不是标准JSON", respText.substring(0,300));
        return {code:-2,msg:"JSON解析失败",raw:respText}
    }
    // 这里根据荐片接口实际返回结构处理，可自行修改字段映射
    let list = [];
    if(Array.isArray(jsonData.data)){
        list = jsonData.data.map(item=>{
            return {
                vod_id: item.id || item.vod_id,
                vod_name: item.name || item.vod_name,
                vod_pic: item.pic || item.vod_pic,
                vod_remarks: item.remarks || item.update || "",
                vod_play_url: item.play_url || ""
            }
        })
    }
    return {
        code:0,
        msg:"ok",
        total:list.length,
        list:list
    }
}

// 测试调用示例
// const testApi = "http://192.129.140.23:5757/api/荐片[优]?pwd=dzyyds";
// let res = caiji(testApi);
// console.log(JSON.stringify(res,null,2));

// ===================== 导出给drpy环境 =====================
export default {
    caiji,
    safeEncodeUrl,
    urljoin,
    getQuery,
    buildQueryString,
    request,
    post,
    parseTags
}