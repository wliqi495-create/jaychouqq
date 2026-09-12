// caiji.js DrPy工作任务模式 修复中文+[]特殊URL
var rule = {};
let siteKey, siteType, UAC, baseUrl, categories, init, getHeader, getString, home, homeVod, category, detail, play, search;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36";

/**
 * URL特殊字符修复：处理路径中中文、[]、()等保留字符，保护query查询参数不重复编码
 * @param {string} rawUrl 原始url
 * @returns {string} 处理后可直接请求的url
 */
function fixUrlSpecialChar(rawUrl) {
    if (!rawUrl) return rawUrl;
    try {
        const urlObj = new URL(rawUrl);
        return urlObj.href;
    } catch (e) {
        let qIndex = rawUrl.indexOf("?");
        let pathStr = rawUrl;
        let queryStr = "";
        if (qIndex > -1) {
            pathStr = rawUrl.substring(0, qIndex);
            queryStr = rawUrl.substring(qIndex);
        }
        const temp = new URL(pathStr, "http://127.0.0.1");
        return temp.href.replace("http://127.0.0.1", "") + queryStr;
    }
}

function getHeader() {
    return {
        "User-Agent": UAC || UA
    };
}

/**
 * http请求统一入口，自动预处理url特殊字符
 * @param {string} url
 * @returns {string} 响应文本
 */
function getString(url) {
    url = fixUrlSpecialChar(url);
    const res = req(url, {
        headers: getHeader()
    });
    return res.content || "";
}

function isEmpty(str) {
    if (!str || str === null || str === "undefined") return true;
    return str.length === 0;
}

function include(str, key) {
    if (isEmpty(str)) return false;
    return str.indexOf(key) > -1;
}

// 首页分类
home = function () {
    const html = getString(baseUrl);
    const jsonStr = pdfh(html, "json:$");
    const data = JSON.parse(jsonStr);
    const classesArr = [];
    const classes = data.classes || [];
    for (let i = 0; i < classes.length; i++) {
        classesArr.push({
            type_id: classes[i].id,
            type_name: classes[i].name
        });
    }
    return JSON.stringify({
        class: classesArr
    });
};

// 首页推荐
homeVod = function () {
    const html = getString(baseUrl + `/videos?ac=videolist&t=`);
    const jsonStr = pdfh(html, "json:$");
    const data = JSON.parse(jsonStr);
    const list = data.list || [];
    const arr = [];
    for (let i = 0; i < list.length; i++) {
        arr.push({
            vod_id: list[i].id,
            vod_name: list[i].name,
            vod_pic: list[i].pic,
            vod_remarks: list[i].remarks || ""
        });
    }
    return JSON.stringify({ list: arr });
};

// 分类列表
category = function (tid, pg, filter, extend) {
    const url = baseUrl + `/videos?ac=videolist&ids=${tid}&pg=${pg}`;
    const html = getString(url);
    const jsonStr = pdfh(html, "json:$");
    const data = JSON.parse(jsonStr);
    const list = data.list || [];
    const arr = [];
    for (let i = 0; i < list.length; i++) {
        arr.push({
            vod_id: list[i].id,
            vod_name: list[i].name,
            vod_pic: list[i].pic,
            vod_remarks: list[i].remarks || ""
        });
    }
    return JSON.stringify({
        page: pg,
        pagecount: parseInt(data.pagecount || 999),
        limit: 20,
        total: parseInt(data.total || 999),
        list: arr
    });
};

// 详情页
detail = function (vod_id) {
    const url = baseUrl + `/videos?ac=detail&wd=${vod_id}`;
    const html = getString(url);
    const jsonStr = pdfh(html, "json:$");
    const data = JSON.parse(jsonStr);
    const info = (data.list && data.list[0]) || {};
    const vod = {
        vod_id: info.id,
        vod_name: info.name,
        vod_pic: info.pic,
        vod_year: info.year || "",
        vod_area: info.area || "",
        vod_actor: info.actor || "",
        vod_director: info.director || "",
        vod_content: info.content || "",
        vod_play_from: info.vod_play_from || "",
        vod_play_url: info.vod_play_url || ""
    };
    return JSON.stringify({ list: [vod] });
};

// 播放解析
play = function (flag, id) {
    return JSON.stringify({
        parse: 1,
        url: id,
        jx: 0
    });
};

// 搜索
search = function (wd, quick, pg) {
    const url = baseUrl + `/videos?ac=videolist&wd=${wd}&pg=${pg}`;
    const html = getString(url);
    const jsonStr = pdfh(html, "json:$");
    const data = JSON.parse(jsonStr);
    const list = data.list || [];
    const arr = [];
    for (let i = 0; i < list.length; i++) {
        arr.push({
            vod_id: list[i].id,
            vod_name: list[i].name,
            vod_pic: list[i].pic,
            vod_remarks: list[i].remarks || ""
        });
    }
    return JSON.stringify({
        page: pg,
        pagecount: parseInt(data.pagecount || 10),
        limit: 20,
        total: parseInt(data.total || 100),
        list: arr
    });
};

// DrPy初始化入口（工作任务模式必填）
init = function (ext) {
    rule = ext;
    siteKey = rule.siteKey;
    siteType = rule.siteType;
    baseUrl = rule.baseUrl;
    UAC = rule.UA || UA;
};