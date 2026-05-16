// @name 360影视
// @author 梦
// @description 360影视 OmniBox 源；解析接口通过全局环境变量 PARSE_APIS 配置，按顺序循环尝试
// @version 1.0.2
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/解析/movie360.js

const OmniBox = require("omnibox_sdk");
const runner = require("spider_runner");

module.exports = { home, category, detail, search, play };
runner.run(module.exports);

const UA = "Mozilla/5.0 (Linux; Android 10; MI 8 Build/QKQ1.190828.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/83.0.4103.101 Mobile Safari/537.36 bsl/1.0;webank/h5face;webank/2.0";
const REFERER = "https://www.360kan.com";
const DETAIL_API = "https://api.web.360kan.com/v1/detail";

// ===== 配置区域开始 =====
// 线路显示优先级：未列出的站点自动排在后面。
const SITE_PRIORITY = ["qq", "imgo", "qiyi", "youku", "leshi", "cntv", "douyin", "bilibili1", "xigua", "sohu"];

// 全局解析接口环境变量名：支持换行 / 逗号 / 分号 / 竖线分隔多个地址。
// 支持两种写法：
// 1. 纯接口地址： https://jx.example.com/?url=
// 2. 自定义名称： 摸鱼@http://zhuimi.moyu666666.top/moyu/zhuimi?token=xxx&url=
const PARSE_API_ENV = "PARSE_APIS";

// 默认解析源：当未配置 PARSE_APIS 时，按以下顺序补足并循环尝试。
const DEFAULT_PARSE_APIS = [
  "https://jx.m3u8.tv/jiexi/?url=",
  "https://yparse.ik9.cc/index.php?url=",
  "https://im1907.top/?jx=",
  "https://jx.xymp4.cc/?url=",
  "https://jx.xmflv.com/?url=",
  "https://www.pouyun.com/?url=",
  "https://jx.playerjy.com/?url=",
];
// ===== 配置区域结束 =====

function parseApiList() {
  const parseEntry = (item, idx) => {
    const at = item.indexOf("@");
    if (at > 0) {
      const name = item.slice(0, at).trim();
      const url = item.slice(at + 1).trim();
      return { name: name || `线路${idx + 1}`, url };
    }
    return { name: `线路${idx + 1}`, url: item };
  };

  const configured = String(process.env[PARSE_API_ENV] || "")
    .split(/[\n,;|]/)
    .map(s => s.trim())
    .filter(Boolean)
    .map((item, idx) => parseEntry(item, idx + 1))
    .filter(item => item.url);

  const merged = [];
  const seen = new Set();

  for (const item of configured) {
    if (seen.has(item.url)) continue;
    seen.add(item.url);
    merged.push(item);
  }

  for (let i = 0; i < DEFAULT_PARSE_APIS.length; i++) {
    const item = parseEntry(DEFAULT_PARSE_APIS[i], merged.length + 1);
    if (seen.has(item.url)) continue;
    seen.add(item.url);
    merged.push(item);
  }

  return merged.map((item, idx) => ({
    name: item.name || `线路${idx + 1}`,
    url: item.url,
  }));
}

function sortSites(sites = []) {
  return [...sites].sort((a, b) => {
    let ia = SITE_PRIORITY.indexOf(a);
    let ib = SITE_PRIORITY.indexOf(b);
    if (ia === -1) ia = 999;
    if (ib === -1) ib = 999;
    return ia - ib;
  });
}

function normalizePic(url) {
  const pic = String(url || "").trim();
  if (!pic) return "";
  if (/^https?:\/\//i.test(pic)) return pic;
  if (pic.startsWith("//")) return `https:${pic}`;
  return pic;
}

function getSiteKeyByUrl(url) {
  try {
    const host = new URL(url).hostname;
    if (host.includes("qq.com")) return "qq";
    if (host.includes("mgtv.com")) return "imgo";
    if (host.includes("youku.com")) return "youku";
    if (host.includes("iqiyi.com")) return "qiyi";
    if (host.includes("douyin.com")) return "douyin";
    if (host.includes("ixigua.com")) return "xigua";
    if (host.includes("bilibili.com")) return "bilibili1";
    if (host.includes("sohu.com")) return "sohu";
    if (host.includes("cctv.com")) return "cntv";
    if (host.includes("le.com")) return "leshi";
  } catch {}
  return "";
}

async function requestJson(url, params = {}, extraHeaders = {}) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ""))
  ).toString();
  const fullUrl = qs ? `${url}?${qs}` : url;
  await OmniBox.log("info", `[movie360][request] ${fullUrl}`);
  const res = await OmniBox.request(fullUrl, {
    method: "GET",
    headers: {
      "user-agent": UA,
      referer: REFERER,
      ...extraHeaders,
    },
    timeout: 15000,
  });
  if (!res || Number(res.statusCode) !== 200) {
    throw new Error(`HTTP ${res?.statusCode || "unknown"} @ ${fullUrl}`);
  }
  const data = JSON.parse(res.body || "{}");
  if (data.errno !== undefined && Number(data.errno) !== 0) {
    throw new Error(data.msg || `errno=${data.errno}`);
  }
  return data;
}

async function getCached(key, ttlSeconds, producer) {
  try {
    const cached = await OmniBox.getCache(key);
    if (cached) return JSON.parse(cached);
  } catch {}
  const value = await producer();
  try {
    await OmniBox.setCache(key, JSON.stringify(value), ttlSeconds);
  } catch {}
  return value;
}

function makeVodId(cat, id) {
  return `${cat}_${id}`;
}

function splitVodId(vodId) {
  const [cat, id] = String(vodId || "").split("_", 2);
  return { cat, id };
}

async function home(params, context) {
  try {
    const ret = await getCached("movie360:home", 3600, () =>
      requestJson("https://api.web.360kan.com/v1/rank", { cat: 1, size: 8 })
    );
    const list = [];
    for (const v of ret.data || []) {
      list.push({
        vod_id: makeVodId(v.cat, v.ent_id),
        vod_name: String(v.title || ""),
        vod_pic: normalizePic(v.cover),
        vod_remarks: String(v.upinfo || ""),
        vod_content: String(v.description || ""),
      });
    }
    return {
      class: [
        { type_id: "2", type_name: "电视剧" },
        { type_id: "1", type_name: "电影" },
        { type_id: "4", type_name: "动漫" },
        { type_id: "3", type_name: "综艺" },
      ],
      list,
    };
  } catch (e) {
    await OmniBox.log("error", `[movie360][home] ${e.message}`);
    return { class: [], list: [] };
  }
}

async function category(params, context) {
  try {
    const page = Number(params.page || 1) || 1;
    const categoryId = String(params.categoryId || params.type_id || params.id || "1");
    const size = 21;
    const ret = await getCached(`movie360:category:${categoryId}:${page}`, 1800, () =>
      requestJson("https://api.web.360kan.com/v1/filter/list", { catid: categoryId, size, pageno: page })
    );
    const data = ret.data || {};
    const list = [];
    for (const v of data.movies || []) {
      list.push({
        vod_id: makeVodId(categoryId, v.id),
        vod_name: String(v.title || ""),
        vod_pic: normalizePic(v.cdncover || v.cover || ""),
        vod_remarks: String(v.doubanscore || v.comment || ""),
      });
    }
    const total = Number(data.total || 0);
    return {
      page,
      pagecount: Math.ceil(total / size) || page,
      total,
      list,
    };
  } catch (e) {
    await OmniBox.log("error", `[movie360][category] ${e.message}`);
    return { page: 1, pagecount: 0, total: 0, list: [] };
  }
}

async function fetchEpisodesBySite(baseParams, site, totalEp) {
  let episodes = [];
  try {
    const siteRet = await requestJson(DETAIL_API, { ...baseParams, site, start: 1, end: 50 });
    episodes = siteRet.data?.allepidetail?.[site] || [];
  } catch (e) {
    await OmniBox.log("warn", `[movie360][detail] 获取站点 ${site} 首批分集失败: ${e.message}`);
  }

  if (episodes.length < totalEp && totalEp > 50) {
    const pageSize = 50;
    for (let page = 1; page < Math.ceil(totalEp / pageSize); page++) {
      const start = page * pageSize + 1;
      let end = start + pageSize - 1;
      if (end > totalEp) end = totalEp;
      try {
        const nextRet = await requestJson(DETAIL_API, { ...baseParams, site, start, end });
        const more = nextRet.data?.allepidetail?.[site] || [];
        episodes = episodes.concat(more);
      } catch (e) {
        await OmniBox.log("warn", `[movie360][detail] 站点 ${site} 分页 ${start}-${end} 失败: ${e.message}`);
      }
    }
  }
  return episodes;
}

async function detail(params, context) {
  try {
    const videoId = String(params.videoId || params.id || params.vod_id || "").trim();
    if (!videoId) return { list: [] };
    const { cat, id } = splitVodId(videoId);
    const ret = await getCached(`movie360:detail:${videoId}`, 1800, () => requestJson(DETAIL_API, { cat, id }));
    const data = ret.data || {};

    const vod = {
      vod_id: videoId,
      vod_name: String(data.title || ""),
      vod_pic: normalizePic(data.cdncover || data.cover || ""),
      type_name: data.moviecategory ? String(data.moviecategory.slice(-1)[0] || "") : "",
      vod_year: String(data.pubdate || ""),
      vod_area: Array.isArray(data.area) ? data.area.join(" / ") : String(data.area || ""),
      vod_remarks: String(data.doubanscore || ""),
      vod_actor: Array.isArray(data.actor) ? data.actor.join(" / ") : String(data.actor || ""),
      vod_director: Array.isArray(data.director) ? data.director.join(" / ") : String(data.director || ""),
      vod_content: String(data.description || ""),
      vod_play_sources: [],
    };

    const smartEpisodes = {};
    const sites = sortSites(data.playlink_sites || Object.keys(data.playlinksdetail || {}));

    for (const site of sites) {
      let episodes = data.allepidetail?.[site] || [];
      const totalEp = Number(data.allupinfo?.[site] || 0);

      if (episodes.length === 0 && totalEp > 0) {
        episodes = await fetchEpisodesBySite({ cat, id }, site, totalEp);
      }

      const lineEpisodes = [];
      if (episodes.length > 0) {
        for (const ep of episodes) {
          const playNum = String(ep.playlink_num || "").trim();
          const playUrl = String(ep.url || "").trim();
          if (!playNum || !playUrl) continue;
          lineEpisodes.push({ name: playNum, playId: playUrl });
          if (!smartEpisodes[playNum]) smartEpisodes[playNum] = [];
          if (!smartEpisodes[playNum].includes(playUrl)) smartEpisodes[playNum].push(playUrl);
        }
      }

      if (lineEpisodes.length === 0 && data.playlinksdetail?.[site]?.default_url) {
        const directUrl = String(data.playlinksdetail[site].default_url || "").trim();
        if (directUrl) {
          lineEpisodes.push({ name: "正片", playId: directUrl });
          if (!smartEpisodes["1"]) smartEpisodes["1"] = [];
          if (!smartEpisodes["1"].includes(directUrl)) smartEpisodes["1"].push(directUrl);
        }
      }

      if (lineEpisodes.length > 0) {
        const parseApis = parseApiList();
        for (const parser of parseApis) {
          const parserEpisodes = lineEpisodes.map((ep) => ({
            name: ep.name,
            playId: JSON.stringify({ targetUrl: ep.playId, parserUrl: parser.url, parserName: parser.name, site }),
          }));
          vod.vod_play_sources.push({ name: `${site}-${parser.name}`, episodes: parserEpisodes });
        }
      }
    }

    const smartKeys = Object.keys(smartEpisodes).sort((a, b) => parseFloat(a) - parseFloat(b));
    if (smartKeys.length > 0) {
      const episodes = smartKeys.map((k) => ({ name: k, playId: smartEpisodes[k].join("|||") }));
      vod.vod_play_sources.unshift({ name: "智能线路", episodes });
    }

    await OmniBox.log("info", `[movie360][detail] id=${videoId}, sourceCount=${vod.vod_play_sources.length}`);
    return { list: [vod] };
  } catch (e) {
    await OmniBox.log("error", `[movie360][detail] ${e.message}`);
    return { list: [] };
  }
}

async function search(params, context) {
  try {
    const keyword = String(params.keyword || params.key || params.wd || "").trim();
    if (!keyword) return { page: 1, pagecount: 0, total: 0, list: [] };
    const ret = await requestJson("https://api.so.360kan.com/index", { kw: keyword });
    const list = [];
    const rows = ret.data?.longData?.rows || [];
    for (const row of rows) {
      list.push({
        vod_id: makeVodId(row.cat_id, row.en_id),
        vod_name: String(row.titleTxt || ""),
        vod_pic: normalizePic(row.cover || ""),
        vod_remarks: String(row.coverInfo?.txt || ""),
        vod_year: String(row.year || ""),
      });
    }
    return { page: 1, pagecount: 1, total: list.length, list };
  } catch (e) {
    await OmniBox.log("error", `[movie360][search] ${e.message}`);
    return { page: 1, pagecount: 0, total: 0, list: [] };
  }
}

function isDirectMediaUrl(url) {
  return /\.(m3u8|mp4|rmvb|avi|wmv|flv|mkv|webm|mov|m3u)(?!\w)/i.test(String(url || ""));
}

async function tryParseApi(api, targetUrl, flag) {
  const params = { flag, url: targetUrl };
  const useQueryMode = /[?&](url|jx)=$/.test(api) || /[?&](url|jx)=/i.test(api);
  const fullUrl = useQueryMode ? `${api}${encodeURIComponent(targetUrl)}` : api;

  await OmniBox.log("info", `[movie360][request] ${useQueryMode ? fullUrl : `${api}?flag=${encodeURIComponent(flag || '')}&url=${encodeURIComponent(targetUrl)}`}`);
  const res = await OmniBox.request(fullUrl, {
    method: "GET",
    headers: {
      "user-agent": UA,
      referer: REFERER,
    },
    timeout: 15000,
  });
  if (!res || Number(res.statusCode) !== 200) {
    throw new Error(`HTTP ${res?.statusCode || "unknown"} @ ${fullUrl}`);
  }

  let json = null;
  const body = String(res.body || "").trim();
  const contentType = String(res.headers?.["content-type"] || res.headers?.["Content-Type"] || "").toLowerCase();
  const looksJson = contentType.includes("application/json") || /^[\[{]/.test(body);

  if (!useQueryMode) {
    try {
      const ret = await requestJson(api, params, { referer: REFERER });
      json = ret;
    } catch {
      json = null;
    }
  } else if (looksJson) {
    try {
      json = JSON.parse(body || "{}");
    } catch {
      json = null;
    }
  }

  if (json && json.url && (json.parse === 0 || json.jx === 0 || isDirectMediaUrl(json.url))) {
    const result = {
      parse: 0,
      flag: flag || "play",
      url: json.url,
      urls: [{ name: "播放", url: json.url }],
    };
    if (json.header || json.headers) {
      result.header = json.header || json.headers;
      result.headers = json.header || json.headers;
    }
    return result;
  }

  if (!json) {
    try {
      await OmniBox.log("info", `[movie360][play] 非 JSON 解析页，开始嗅探: ${fullUrl}`);
      const sniffed = await OmniBox.sniffVideo(fullUrl, { Referer: REFERER, "User-Agent": UA });
      if (sniffed && sniffed.url) {
        return {
          parse: 0,
          flag: flag || "play",
          url: sniffed.url,
          urls: [{ name: "播放", url: sniffed.url }],
          header: sniffed.headers || {},
          headers: sniffed.headers || {},
        };
      }
    } catch (e) {
      await OmniBox.log("warn", `[movie360][play] 嗅探失败 url=${fullUrl}, message=${e.message}`);
    }
  }

  return {
    parse: 1,
    flag: flag || "play",
    url: targetUrl,
    urls: [{ name: "播放页", url: targetUrl }],
    header: {},
    headers: {},
  };
}

async function resolvePlay(targetUrl, flag, parserEntry) {
  if (!targetUrl) return { parse: 0, urls: [], flag: flag || "play", header: {} };
  if (isDirectMediaUrl(targetUrl)) {
    return {
      parse: 0,
      flag: flag || "play",
      url: targetUrl,
      urls: [{ name: "播放", url: targetUrl }],
      header: {},
      headers: {},
    };
  }

  const apis = parserEntry ? [parserEntry] : parseApiList();
  await OmniBox.log("info", `[movie360][play] 解析源数量=${apis.length}, 来源=${parserEntry ? 'PLAY_ID_BIND' : (process.env[PARSE_API_ENV] ? PARSE_API_ENV : 'DEFAULT_PARSE_APIS')}`);
  for (const api of apis) {
    try {
      await OmniBox.log("info", `[movie360][play] 尝试解析 api=${api.url}, flag=${flag}, url=${targetUrl}`);
      const parsed = await tryParseApi(api.url, targetUrl, flag);
      if (parsed?.url) return parsed;
    } catch (e) {
      await OmniBox.log("warn", `[movie360][play] 解析失败 api=${api.url}, message=${e.message}`);
    }
  }

  return {
    parse: 1,
    flag: flag || "play",
    url: targetUrl,
    urls: [{ name: "播放页", url: targetUrl }],
    header: {},
    headers: {},
  };
}

async function play(params, context) {
  try {
    const flag = String(params.flag || "").trim();
    const playId = String(params.playId || params.play_id || "").trim();
    if (!playId) return { parse: 0, urls: [], flag, header: {} };

    if (flag === "智能线路" && playId.includes("|||")) {
      for (const candidate of playId.split("|||").map(s => s.trim()).filter(Boolean)) {
        const siteKey = getSiteKeyByUrl(candidate);
        await OmniBox.log("info", `[movie360][play] 智能线路尝试 site=${siteKey || 'unknown'}, url=${candidate}`);
        const res = await resolvePlay(candidate, flag);
        if (res?.url || (Array.isArray(res?.urls) && res.urls.length)) return res;
      }
      return { parse: 1, flag, url: playId.split("|||")[0], urls: [{ name: "播放页", url: playId.split("|||")[0] }] };
    }

    if (playId.startsWith("{")) {
      const payload = JSON.parse(playId);
      if (payload?.targetUrl) {
        return await resolvePlay(payload.targetUrl, flag, payload.parserUrl ? { name: payload.parserName || '线路', url: payload.parserUrl } : null);
      }
    }

    return await resolvePlay(playId, flag);
  } catch (e) {
    await OmniBox.log("error", `[movie360][play] ${e.message}`);
    return { parse: 0, urls: [], flag: String(params.flag || "") };
  }
}
