
import cheerio from 'assets://js/lib/cheerio.min.js';

const baseUrl = "https://tv.time1080.xyz";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const parseAPiUrl = "https://svip.qlplayer.cyou/?url=";

const HEADERS = {
    "User-Agent": UA,
};


function mylog(...args) {
    console.log(`[拾光影视]`, ...args);
}



function safeJsonParse(json) {
    try {
        return typeof json === "string" ? JSON.parse(json) : json;
    } catch (e) {
        return null;
    }
}
async function myFetch(url, options = {}, needJsonParse = true) {
    try {
        let res = await req(url, {
            method: options?.method || "get",
            ...options
        })
        return needJsonParse ? safeJsonParse(res?.content) : res?.content
    } catch (err) {
        mylog("myfetch err ", err)
    }
}

async function init(cfg) {
    mylog("Spider Init Done");
}

async function home(filter) {

}




async function homeVod() {
    // 1. 请求 API 接口获取数据
    const res = await req('https://tv.time1080.xyz/api/proxy.php?action=home').content;

    mylog(res)

    // 兼容不同请求工具返回对象或字符串的情况
    const data = typeof res === 'string' ? JSON.parse(res) : (res.data || res);

    const vodList = [];

    // 2. 遍历 categories 下的所有分类 (动作片、动漫、喜剧片等)
    if (data && data.categories) {
        for (const catName in data.categories) {
            const items = data.categories[catName];
            if (Array.isArray(items)) {
                items.forEach(item => {
                    vodList.push({
                        vod_id: item.id ? String(item.id) : '',   // 影片ID
                        vod_name: item.name || '',               // 片名
                        vod_pic: item.pic || '',                 // 海报图
                        vod_remarks: item.remarks || '',         // 更新状态/备注
                        vod_blurb: item.content || '',           // 简介/摘要
                        vod_year: item.year || '',               // 年份
                        vod_area: item.area || '',               // 地区
                        type_name: item.type || catName          // 分类名称
                    });
                });
            }
        }
    }

    // 3. 返回符合猫影视/TVBox 规范的 JSON 结构
    return JSON.stringify({
        list: vodList
    });
}
async function category(tid, pg, filter, extend) {

}

async function detail(id) {

    try {
        const detailUrl = 'https://tv.time1080.xyz/api/proxy.php?action=detail&source=qilin&id=' + id
        mylog("detailUrl ", detailUrl)

        const responseData = await myFetch(detailUrl)
        if (!responseData) {
            return JSON.stringify({ list: [] });
        }

        let item = responseData?.details?.[0];

        if (!item) {
            return JSON.stringify({ msg: "responseData 发生错误" })
        }

        // 从 episodes 中提取播放源名称列表 (例如 "youku$$$qiyi")
        let playFrom = "";
        if (item.episodes && item.episodes.length > 0) {
            playFrom = item.episodes.map(e => e.group).join('$$$');
        } else {
            playFrom = "播放源1$$$播放源2"; // 备用名称
        }

        let vod = {
            vod_id: item.id.toString(),
            vod_name: item.name,
            vod_pic: item.pic,
            type_name: item.type,
            vod_year: item.year,
            vod_area: item.area,
            vod_lang: item.lang,
            vod_director: item.director,
            vod_actor: item.actor,
            vod_content: item.content,
            vod_remarks: item.remarks,
            vod_play_from: playFrom,       // 播放源名称，如："youku$$$qiyi"
            vod_play_url: item.play_url   // 直接复用现成的 play_url
        };

        return JSON.stringify({
            list: [vod]
        });

        return JSON.stringify({
            list: [vod]
        });

    }
    catch (e) {
        console.error("detail error: " + e.message);
        return JSON.stringify({ list: [] });
    }

}


function formatUrl(url) {
    if (!url) return "";
    return url.replace(/\\/g, "").replace(/^(https?:\/)((?!\/))/i, "$1/");
}

function extractConfig(html) {
    const apiTokenMatch = html.match(/apiToken\s*:\s*["']([^"']+)["']/);
    return {
        apiToken: apiTokenMatch ? apiTokenMatch[1] : null
    };
}

// 修复判定逻辑 Bug
function isDirectVideoUrl(url) {
    return DIRECT_URL_REG.test(url);
}

async function parseVideoUrl(htmlUrl) {
    try {
        const resoleUrl = parseAPiUrl + htmlUrl;
        mylog("解析地址", resoleUrl);

        const html1 = (await req(resoleUrl)).content || "";
        const { apiToken } = extractConfig(html1);
        if (!apiToken) return "";
        const parseTokenUrl = `https://svip.qlplayer.cyou/api/resolve.php?token=${encodeURIComponent(apiToken)}`;
        mylog("parseTokenUrl", parseTokenUrl);
        const res = await req(parseTokenUrl);
        const data = JSON.parse(res.content);
        mylog("data", data);
        const finalUrl = formatUrl(data.url);
        mylog("finalUrl", finalUrl);
        return finalUrl;
    } catch (e) {
        mylog("视频解析失败:", e.message);
        return "";
    }
}

/**
 * OK影视 search 函数
 * @param {string} kw - 搜索关键字
 * @param {boolean} quick - 是否快速搜索
 * @param {string} pg - 页码
 * @returns {string} JSON 格式的搜索结果列表
 */
async function search(kw, quick, pg) {
    try {
        const url = `https://tv.time1080.xyz/api/proxy.php?action=search&wd=${encodeURIComponent(kw)}&page=1&source=qilin,mj`


        let responseData = await myFetch(url)

        if (!responseData || !responseData.results || responseData.results.length === 0) {
            return JSON.stringify({ list: [] });
        }

        // 将源数据映射转换为 OK 影视标准的 vod 简短列表格式
        let vodList = responseData.results.map(item => {
            return {
                vod_id: item.id.toString(),      // 影片ID
                vod_name: item.name,             // 影片名称
                vod_pic: item.pic,               // 封面图
                vod_remarks: item.remarks,       // 状态/备注 (例如: 更新至150集)
                type_name: item.type             // 类型 (例如: 动漫)
            };
        });

        return JSON.stringify({
            page: parseInt(pg) || 1,
            pagecount: 1,
            limit: vodList.length,
            total: vodList.length,
            list: vodList
        });

    } catch (e) {
        console.error("search error: " + e.message);
        return JSON.stringify({ list: [] });
    }
}
async function play(flag, id, flags) {
    mylog(`开始获取播放地址: ${id}`);


    const finalUrl = await parseVideoUrl(id)
    try {
        return JSON.stringify({ parse: 0, url: finalUrl })
    } catch (e) {
        mylog(`网络请求失败: ${e.message}`);
    }

    return JSON.stringify({ parse: 0, url: "" });
}

export default {
    init,
    home,
    homeVod,
    category,
    detail,
    search,
    play
};