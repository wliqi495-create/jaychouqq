import { Crypto, _ } from 'assets://js/lib/cat.js';
let siteKey = '';
let siteType = 0;

// 内置配置
const HOST = "https://emby.bangumi.ca";
const Token = "8b0b16aae7e8403cb3d19969b82c3902";
const Users = "80e861cbff1343bfa0bedcea78895b91";

let host = "";
let tokenVal = "";
let usersId = "";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";
const DEFAULT_HEADERS = {
    "User-Agent": UA,
    "Referer": `${HOST}/`,
    "Accept-Language": "zh-CN,zh;q=0.9"
};

async function request(url, optHeaders = {}) {
    try {
        const headers = Object.assign({}, DEFAULT_HEADERS, optHeaders);
        const res = await req(url, {
            method: "GET",
            headers: headers,
            timeout: 20000
        });
        return res?.content ?? "";
    } catch (e) {
        console.error("request error:", url, e?.message);
        return "";
    }
}

async function post(url, bodyData, optHeaders = {}) {
    try {
        const headers = Object.assign({}, DEFAULT_HEADERS, optHeaders);
        const res = await req(url, {
            method: "POST",
            headers: headers,
            data: bodyData,
            timeout: 20000
        });
        return res?.content ?? "";
    } catch (e) {
        console.error("post error:", url, e?.message);
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

/**组装请求头，自动携带X‑Emby‑Token */
function getEmbyHeaders() {
    return Object.assign({}, DEFAULT_HEADERS, {
        "X-Emby-Token": tokenVal
    });
}

/**解析emby列表数据 */
function extractVideos(jsonData) {
    if (!jsonData || !Array.isArray(jsonData.Items)) return [];
    return jsonData.Items.map(it => {
        let pic = "";
        if (it.ImageTags?.Primary) {
            pic = `${host}/emby/Items/${it.Id}/Images/Primary?maxWidth=400&tag=${it.ImageTags.Primary}&quality=90`;
        }
        return {
            vod_id: it.Id,
            vod_name: String(it.Name || "").trim(),
            vod_pic: pic,
            vod_remarks: it.ProductionYear ? String(it.ProductionYear) : "",
            style: { type: 'rect', ratio: 1.33 }
        };
    });
}

async function init(cfg) {
    try {
        siteKey = cfg.skey;
        siteType = cfg.stype;
        const ext = cfg.ext || {};
        host = ext.host ? String(ext.host).trim() : HOST;
        tokenVal = ext.Token ? String(ext.Token).trim() : Token;
        usersId = ext.Users ? String(ext.Users).trim() : Users;
    } catch (e) {
        console.error("init error", e.message);
    }
}

async function home(filter) {
    try {
        return JSON.stringify({ class: [], filters: {} });
    } catch (e) {
        console.error("home error", e.message);
        return JSON.stringify({ class: [], filters: {} });
    }
}

async function homeVod() {
    try {
        const url = `${host}/emby/Users/${usersId}/Views?X-Emby-Client=Emby+Web&X-Emby-Device-Name=Android+WebView+Android&X-Emby-Device-Id=ea27caf7-9a51-4209-b1a5-374bf30c2ffd&X-Emby-Client-Version=4.9.0.31&X-Emby-Language=zh-cn`;
        const resp = await request(url, getEmbyHeaders());
        const jsonData = safeJson(resp);
        const list = extractVideos(jsonData);
        return JSON.stringify({ list: list });
    } catch (e) {
        console.error("homeVod error", e.message);
        return JSON.stringify({ list: [] });
    }
}

async function category(tid, pg, filter, ext) {
    pg = Number(pg) || 1;
    try {
        const startIndex = (pg - 1) * 30;
        const url = `${host}/emby/Users/${usersId}/Items?SortBy=DateLastContentAdded%2CSortName&SortOrder=Descending&IncludeItemTypes=Movie%2CSeries&Recursive=true&Fields=BasicSyncInfo%2CCanDelete%2CContainer%2CPrimaryImageAspectRatio%2CProductionYear%2CCommunityRating%2CStatus%2CCriticRating%2CEndDate%2CPath&StartIndex=${startIndex}&ParentId=${tid}&EnableImageTypes=Primary%2CBackdrop%2CThumb%2CBanner&ImageTypeLimit=1&Limit=30&EnableUserData=true&X-Emby-Language=zh-cn`;
        const resp = await request(url, getEmbyHeaders());
        const jsonData = safeJson(resp);
        const list = extractVideos(jsonData);
        const total = jsonData?.TotalRecordCount || 0;
        let pagecount = pg;
        if (pg * 30 < total) {
            pagecount = pg + 1;
        }
        return JSON.stringify({
            list: list,
            page: pg,
            pagecount: pagecount,
            limit: 30,
            total: total
        });
    } catch (e) {
        console.error("category error", e.message);
        return JSON.stringify({ list: [], page: pg, pagecount: 0, limit: 0, total: 0 });
    }
}

async function detail(vodId) {
    try {
        const url = `${host}/emby/Users/${usersId}/Items/${vodId}?X-Emby-Language=zh-cn`;
        const resp = await request(url, getEmbyHeaders());
        const info = safeJson(resp);
        if (!info) throw new Error("detail api empty");

        let pic = "";
        if (info.ImageTags?.Primary) {
            pic = `${host}/emby/Items/${vodId}/Images/Primary?maxWidth=400&tag=${info.ImageTags.Primary}&quality=90`;
        }

        const vod = {
            vod_id: vodId,
            vod_name: String(info.Name || "").trim(),
            vod_pic: pic,
            vod_year: info.ProductionYear ? String(info.ProductionYear) : "",
            vod_area: "",
            vod_remarks: "",
            vod_actor: "",
            vod_director: "",
            type_name: info.Genres ? info.Genres.join(" / ") : "",
            vod_content: info.Overview ? String(info.Overview).replace(/\xa0/g, ' ').trim() : "暂无简介",
            vod_play_from: "EMBY",
            vod_play_url: ""
        };
        let playUrl = "";

        if (!info.IsFolder) {
            playUrl = `${String(info.Name || "").trim()}$${info.Id}`;
        } else {
            if (info.Type === "Series") {
                const seasonsUrl = `${host}/emby/Shows/${vodId}/Seasons?UserId=${usersId}&Fields=BasicSyncInfo%2CCanDelete%2CContainer%2CPrimaryImageAspectRatio%2CProductionYear%2CCommunityRating&EnableImages=true&EnableUserData=true&X-Emby-Language=zh-cn`;
                const sResp = await request(seasonsUrl, getEmbyHeaders());
                const seasons = safeJson(sResp);
                if (seasons && Array.isArray(seasons.Items)) {
                    for (const season of seasons.Items) {
                        const epUrl = `${host}/emby/Shows/${vodId}/Episodes?SeasonId=${season.Id}&Fields=BasicSyncInfo%2CCanDelete%2CContainer%2CPrimaryImageAspectRatio%2CProductionYear%2CCommunityRating&EnableImages=true&EnableUserData=true&Limit=1000&X-Emby-Language=zh-cn`;
                        const eResp = await request(epUrl, getEmbyHeaders());
                        const episodes = safeJson(eResp);
                        if (episodes && Array.isArray(episodes.Items)) {
                            for (const ep of episodes.Items) {
                                const sName = String(season.Name || "").replace('#', '-').replace('$', '|').trim();
                                const eName = String(ep.Name || "").trim();
                                if (playUrl !== "") playUrl += "#";
                                playUrl += `${sName}|${eName}$${ep.Id}`;
                            }
                        }
                    }
                }
            } else {
                const itemsUrl = `${host}/emby/Users/${usersId}/Items?ParentId=${vodId}&Fields=BasicSyncInfo%2CCanDelete%2CContainer%2CPrimaryImageAspectRatio%2CProductionYear%2CCommunityRating%2CCriticRating&ImageTypeLimit=1&StartIndex=0&EnableUserData=true&X-Emby-Language=zh-cn`;
                const iResp = await request(itemsUrl, getEmbyHeaders());
                const itemsJson = safeJson(iResp);
                if (itemsJson && Array.isArray(itemsJson.Items)) {
                    for (const item of itemsJson.Items) {
                        const iName = String(item.Name || "").replace('#', '-').replace('$', '|').trim();
                        if (playUrl !== "") playUrl += "#";
                        playUrl += `${iName}$${item.Id}`;
                    }
                }
            }
        }
        vod.vod_play_url = playUrl;
        return JSON.stringify({ list: [vod] });
    } catch (e) {
        console.error("detail error", e.message);
        return JSON.stringify({ list: [] });
    }
}

async function play(flag, playId, flags) {
    try {
        const playbackUrl = `${host}/emby/Items/${playId}/PlaybackInfo?UserId=${usersId}&IsPlayback=false&AutoOpenLiveStream=false&StartTimeTicks=0&MaxStreamingBitrate=7000000`;
        const postBody = JSON.stringify({
            "DeviceProfile": {
                "DirectPlayProfiles": [{"Container": "mp4,m4v,mkv,hls,webm", "Type": "Video"}],
                "TranscodingProfiles": [{"Container": "ts", "Type": "Video", "Protocol": "hls"}]
            }
        });
        const postHeaders = Object.assign({}, getEmbyHeaders(), { "Content-Type": "application/json" });
        const resp = await post(playbackUrl, postBody, postHeaders);
        const jsonData = safeJson(resp);
        if (!jsonData || !jsonData.MediaSources || !Array.isArray(jsonData.MediaSources) || jsonData.MediaSources.length <= 0) {
            return JSON.stringify({
                parse: 1,
                url: playbackUrl,
                header: getEmbyHeaders()
            });
        }
        const mediaSource = jsonData.MediaSources[0];
        let outUrl = "";
        if (mediaSource.DirectStreamUrl) {
            outUrl = host + mediaSource.DirectStreamUrl;
        } else if (mediaSource.Protocol === "Http") {
            outUrl = mediaSource.Path;
        }
        return JSON.stringify({
            parse: 0,
            url: outUrl,
            header: getEmbyHeaders()
        });
    } catch (e) {
        console.error("play error", e.message);
        return JSON.stringify({ parse: 1, url: "", header: {} });
    }
}

async function search(key, quick, pg) {
    pg = Number(pg) || 1;
    try {
        const kw = encodeURIComponent(key);
        const url = `${host}/emby/Users/${usersId}/Items?SortBy=SortName&SortOrder=Ascending&Fields=BasicSyncInfo%2CCanDelete%2CContainer%2CPrimaryImageAspectRatio%2CProductionYear%2CStatus%2CEndDate&StartIndex=0&EnableImageTypes=Primary%2CBackdrop%2CThumb&ImageTypeLimit=1&Recursive=true&SearchTerm=${kw}&GroupProgramsBySeries=true&Limit=50&X-Emby-Language=zh-cn`;
        const resp = await request(url, getEmbyHeaders());
        const jsonData = safeJson(resp);
        const list = extractVideos(jsonData);
        return JSON.stringify({
            list: list,
            page: pg,
            pagecount: 1,
            land: 1,
            ratio: 1.33
        });
    } catch (e) {
        console.error("search error", e.message);
        return JSON.stringify({ list: [], page: pg, pagecount: 0, land: 1, ratio: 1.33 });
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