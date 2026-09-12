import { Crypto, jinja2, _ } from 'assets://js/lib/cat.js';
let siteKey = '';
let siteType = 0;

//内置默认配置，可在源ext覆盖
const BUILT_IN = {
    host: "https://emby.bangumi.ca",
    Token: "8b0b16aae7e8403cb3d19969b82c3902",
    Users: "80e861cbff1343bfa0bedcea78895b91"
};

let host = "";
let Token = "";
let Users = "";

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function request(reqUrl, headers, buffer) {
    try {
        const res = await req(reqUrl, {
            method: 'get',
            headers: headers ? headers : { 'User-Agent': UA },
            timeout: 60000,
            buffer: buffer ? 1 : 0
        });
        return res?.content ?? '';
    } catch (e) {
        console.error('request error | url:', reqUrl, 'msg:', e?.message);
        return '';
    }
}

async function post(reqUrl, postData, headers, posttype) {
    try {
        const res = await req(reqUrl, {
            method: 'post',
            headers: headers ? headers : { 'User-Agent': UA },
            data: postData,
            timeout: 60000,
            postType: posttype
        });
        return res?.content ?? '';
    } catch (e) {
        console.error('post error | url:', reqUrl, 'msg:', e?.message);
        return '';
    }
}

/**组装标准请求头，自动带上X‑Emby‑Token */
function getHeaders() {
    return {
        'User-Agent': UA,
        "Accept-Language": "zh-CN,zh;q=0.9",
        "X-Emby-Token": Token
    };
}

function safeJson(str) {
    try {
        if (!str) return null;
        return JSON.parse(str);
    } catch (e) {
        console.error("safeJson parse error");
        return null;
    }
}

function removeTags(input) {
    return String(input || '').replace(/<[^>]*>/g, '');
}

function extractVideos(jsonData) {
    if (!jsonData || !Array.isArray(jsonData.Items)) return [];
    return jsonData.Items.map(it => {
        let pic = "";
        if (it.ImageTags?.Primary) {
            pic = `${host}/emby/Items/${it.Id}/Images/Primary?maxWidth=400&tag=${it.ImageTags.Primary}&quality=90`;
        }
        return {
            vod_id: it.Id,
            vod_name: removeTags(it.Name || ""),
            vod_pic: pic,
            vod_remarks: it.ProductionYear ? String(it.ProductionYear) : "",
            style: { type: 'rect', ratio: 1.33 }
        };
    });
}

/**初始化，工作任务模式入口 */
async function init(cfg) {
    try {
        siteKey = cfg.skey;
        siteType = cfg.stype;
        const ext = cfg.ext || {};
        host = ext.host ? String(ext.host).trim() : BUILT_IN.host;
        Token = ext.Token ? String(ext.Token).trim() : BUILT_IN.Token;
        Users = ext.Users ? String(ext.Users).trim() : BUILT_IN.Users;
    } catch (e) {
        console.error('init error msg:', e?.message);
    }
}

/**首页分类接口，工作任务模式必须存在 */
function home(filter) {
    try {
        return JSON.stringify({
            class: [],
            filters: {}
        });
    } catch (e) {
        console.error("home error msg:", e?.message);
        return JSON.stringify({ class: [], filters: {} });
    }
}

/**首页推荐列表 */
async function homeVod() {
    try {
        const url = `${host}/emby/Users/${Users}/Views?X-Emby-Client=Emby+Web&X-Emby-Device-Name=Android+WebView+Android&X-Emby-Device-Id=ea27caf7-9a51-4209-b1a5-374bf30c2ffd&X-Emby-Client-Version=4.9.0.31&X-Emby-Language=zh-cn`;
        const response = await request(url, getHeaders());
        const jsonData = safeJson(response);
        const list = extractVideos(jsonData);
        return JSON.stringify({ list });
    } catch (e) {
        console.error('homeVod error msg:', e?.message);
        return JSON.stringify({ list: [] });
    }
}

/**分类列表 tid分类id page页码 filter筛选 ext扩展参数 */
async function category(tid, page, filter, ext) {
    page = Number(page) || 1;
    if (page < 1) page = 1;
    try {
        const startIndex = (page - 1) * 30;
        const url = `${host}/emby/Users/${Users}/Items?SortBy=DateLastContentAdded%2CSortName&SortOrder=Descending&IncludeItemTypes=Movie%2CSeries&Recursive=true&Fields=BasicSyncInfo%2CCanDelete%2CContainer%2CPrimaryImageAspectRatio%2CProductionYear%2CCommunityRating%2CStatus%2CCriticRating%2CEndDate%2CPath&StartIndex=${startIndex}&ParentId=${tid}&EnableImageTypes=Primary%2CBackdrop%2CThumb%2CBanner&ImageTypeLimit=1&Limit=30&EnableUserData=true&X-Emby-Language=zh-cn`;
        const respText = await request(url, getHeaders());
        const json = safeJson(respText);
        const videos = extractVideos(json);
        const total = json?.TotalRecordCount || 0;
        let pagecount = page;
        if (page * 30 < total) {
            pagecount = page + 1;
        }
        return JSON.stringify({
            page: page,
            pagecount: pagecount,
            limit: 30,
            total: total,
            list: videos
        });
    } catch (e) {
        console.error('category error msg:', e?.message);
    }
    return JSON.stringify({ list: [], page: 1, pagecount: 0, limit: 0, total: 0 });
}

/**详情接口 ids为vod_id */
async function detail(ids) {
    try {
        const detailUrl = `${host}/emby/Users/${Users}/Items/${ids}?X-Emby-Language=zh-cn`;
        const resp = await request(detailUrl, getHeaders());
        const info = safeJson(resp);
        if (!info) throw new Error('detail api empty');

        let picUrl = "";
        if (info.ImageTags?.Primary) {
            picUrl = `${host}/emby/Items/${ids}/Images/Primary?maxWidth=400&tag=${info.ImageTags.Primary}&quality=90`;
        }

        const video = {
            vod_id: ids,
            vod_name: removeTags(info.Name || ""),
            vod_pic: picUrl,
            type_name: info.Genres ? info.Genres.join(" / ") : "",
            vod_year: info.ProductionYear ? String(info.ProductionYear) : "",
            vod_area: "",
            vod_remarks: "",
            vod_actor: "",
            vod_director: "",
            vod_content: info.Overview ? removeTags(String(info.Overview)).replace(/\xa0/g, ' ').trim() : "暂无简介"
        };

        let playFrom = "EMBY";
        let playUrl = "";

        if (!info.IsFolder) {
            //单个视频
            playUrl = `${removeTags(info.Name || "")}$${info.Id}`;
        } else {
            if (info.Type === "Series") {
                //剧集，获取季列表
                const seasonsUrl = `${host}/emby/Shows/${ids}/Seasons?UserId=${Users}&Fields=BasicSyncInfo%2CCanDelete%2CContainer%2CPrimaryImageAspectRatio%2CProductionYear%2CCommunityRating&EnableImages=true&EnableUserData=true&X-Emby-Language=zh-cn`;
                const seasonsResp = await request(seasonsUrl, getHeaders());
                const seasons = safeJson(seasonsResp);
                if (seasons && Array.isArray(seasons.Items)) {
                    for (const season of seasons.Items) {
                        const episodesUrl = `${host}/emby/Shows/${ids}/Episodes?SeasonId=${season.Id}&Fields=BasicSyncInfo%2CCanDelete%2CContainer%2CPrimaryImageAspectRatio%2CProductionYear%2CCommunityRating&EnableImages=true&EnableUserData=true&Limit=1000&X-Emby-Language=zh-cn`;
                        const episodesResp = await request(episodesUrl, getHeaders());
                        const episodes = safeJson(episodesResp);
                        if (episodes && Array.isArray(episodes.Items)) {
                            for (const episode of episodes.Items) {
                                const seasonName = removeTags(season.Name || "").replace('#', '-').replace('$', '|').trim();
                                const episodeName = removeTags(episode.Name || "").trim();
                                if (playUrl !== "") playUrl += "#";
                                playUrl += `${seasonName}|${episodeName}$${episode.Id}`;
                            }
                        }
                    }
                }
            } else {
                //普通文件夹
                const itemsUrl = `${host}/emby/Users/${Users}/Items?ParentId=${ids}&Fields=BasicSyncInfo%2CCanDelete%2CContainer%2CPrimaryImageAspectRatio%2CProductionYear%2CCommunityRating%2CCriticRating&ImageTypeLimit=1&StartIndex=0&EnableUserData=true&X-Emby-Language=zh-cn`;
                const itemsResp = await request(itemsUrl, getHeaders());
                const itemsJson = safeJson(itemsResp);
                if (itemsJson && Array.isArray(itemsJson.Items)) {
                    for (const item of itemsJson.Items) {
                        const itemName = removeTags(item.Name || "").replace('#', '-').replace('$', '|').trim();
                        if (playUrl !== "") playUrl += "#";
                        playUrl += `${itemName}$${item.Id}`;
                    }
                }
            }
        }
        video.vod_play_from = playFrom;
        video.vod_play_url = playUrl;
        return JSON.stringify({ list: [video] });
    } catch (e) {
        console.error('detail error msg:', e?.message);
    }
    return JSON.stringify({ list: [] });
}

/**播放解析 flag线路标识 id播放id flags参数（工作任务模式必须保留入参） */
async function play(flag, id, flags) {
    try {
        const playbackUrl = `${host}/emby/Items/${id}/PlaybackInfo?UserId=${Users}&IsPlayback=false&AutoOpenLiveStream=false&StartTimeTicks=0&MaxStreamingBitrate=7000000`;
        const postBody = JSON.stringify({
            "DeviceProfile": {
                "DirectPlayProfiles": [{"Container": "mp4,m4v,mkv,hls,webm", "Type": "Video"}],
                "TranscodingProfiles": [{"Container": "ts", "Type": "Video", "Protocol": "hls"}]
            }
        });
        const headers = Object.assign({}, getHeaders(), { "Content-Type": "application/json" });
        const respText = await post(playbackUrl, postBody, headers, 'json');
        const json = safeJson(respText);
        if (!json || !json.MediaSources || !Array.isArray(json.MediaSources) || json.MediaSources.length === 0) {
            return JSON.stringify({ parse: 1, url: playbackUrl, header: getHeaders() });
        }
        const mediaSource = json.MediaSources[0];
        let outUrl = "";
        if (mediaSource.DirectStreamUrl) {
            outUrl = host + mediaSource.DirectStreamUrl;
        } else if (mediaSource.Protocol === "Http") {
            outUrl = mediaSource.Path;
        }
        return JSON.stringify({ parse: 0, url: outUrl, header: getHeaders() });
    } catch (e) {
        console.error('play error msg:', e?.message);
    }
    return JSON.stringify({ parse: 1, url: "", header: {} });
}

/**搜索 key关键词 quick快速搜索 pg页码 */
async function search(key, quick, pg) {
    let page = Number(pg) || 1;
    if (page <= 0) page = 1;
    try {
        const url = `${host}/emby/Users/${Users}/Items?SortBy=SortName&SortOrder=Ascending&Fields=BasicSyncInfo%2CCanDelete%2CContainer%2CPrimaryImageAspectRatio%2CProductionYear%2CStatus%2CEndDate&StartIndex=0&EnableImageTypes=Primary%2CBackdrop%2CThumb&ImageTypeLimit=1&Recursive=true&SearchTerm=${encodeURIComponent(key)}&GroupProgramsBySeries=true&Limit=50&X-Emby-Language=zh-cn`;
        const respText = await request(url, getHeaders());
        const json = safeJson(respText);
        const videos = extractVideos(json);
        return JSON.stringify({
            page: page,
            pagecount: 1,
            land: 1,
            ratio: 1.33,
            list: videos
        });
    } catch (e) {
        console.error('search error msg:', e?.message);
    }
    return JSON.stringify({ page: 1, pagecount: 0, land: 1, ratio: 1.33, list: [] });
}

// ========= CAT工作任务模式固定导出，禁止export default =========
export function __jsEvalReturn() {
    return {
        init: init,
        home: home,
        homeVod: homeVod,
        category: category,
        detail: detail,
        search: search,
        play: play
    };
}