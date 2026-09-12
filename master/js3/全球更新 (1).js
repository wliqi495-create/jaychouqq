/*
@header({
  searchable: 1,
  filterable: 1,
  quickSearch: 1,
  title: '全球更新',
  lang: 'cat',
})
*/

// 全球追更 - peekpili JS 源版（优化版：国内平台精准分类）
const TMDB_API_KEY = "填自己tmdb密钥";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";
const DATA_SOURCES = {
  tmdbImage: "https://proxy.api.030101.xyz/https://image.tmdb.org/t/p/w500",
  tmdbApis: [
    "https://proxy.api.030101.xyz/https://api.themoviedb.org/3",
    "https://proxy.api.030101.xyz/https://api.tmdb.org/3"
  ]
};

const log = {
  info: (msg) => { try { print("[INFO] " + msg); } catch (e) {} },
  warn: (msg) => { try { print("[WARN] " + msg); } catch (e) {} },
  error: (msg) => { try { print("[ERROR] " + msg); } catch (e) {} }
};

// HTTP 封装
async function httpGet(url, params) {
  let query = "";
  if (params && Object.keys(params).length > 0) {
    const qs = Object.keys(params)
      .map(k => encodeURIComponent(k) + "=" + encodeURIComponent(params[k]))
      .join("&");
    query = url.indexOf("?") > -1 ? "&" + qs : "?" + qs;
  }
  const u = url + query;
  const r = await req(u, { headers: { "User-Agent": UA } });
  const raw = r.content || r.body || r;
  return JSON.parse(typeof raw === 'string' ? raw : JSON.stringify(raw));
}

async function fetchTmdb(endpoint, params) {
  let lastError;
  for (let i = 0; i < DATA_SOURCES.tmdbApis.length; i++) {
    const baseUrl = DATA_SOURCES.tmdbApis[i];
    try {
      const url = baseUrl + endpoint;
      const allParams = Object.assign({ api_key: TMDB_API_KEY }, params || {});
      const json = await httpGet(url, allParams);
      return json;
    } catch (e) {
      lastError = e;
      log.warn("[TMDB] " + baseUrl + " 访问异常: " + e);
    }
  }
  throw lastError || new Error("TMDB 全部域名访问失败");
}

function getToday() {
  const d = new Date();
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return y + "-" + m + "-" + day;
}

// 仅保留国内平台
const PLATFORM_CONFIG = [
  { id: "tencent",  name: "腾讯视频",      network: "2007" },
  { id: "youku",    name: "优酷",          network: "1419" },
  { id: "iqiyi",    name: "爱奇艺",        network: "1330" },
  { id: "bilibili", name: "哔哩哔哩",      network: "1605" },
  { id: "mgtv",     name: "芒果TV",        network: "1631" }
];

const SUB_FILTERS = {
  "sort": {
    "key": "sort",
    "name": "🔥 动态追踪",
    "value": [
      { "n": "📅 追更模式", "v": "next_episode" },
      { "n": "📆 今日播出", "v": "daily_airing" },
      { "n": "🆕 最新上线", "v": "first_air_date.desc" },
      { "n": "⭐ 综合热度", "v": "popularity.desc" }
    ]
  },
  "type": {
    "key": "type",
    "name": "📺 内容类型",
    "value": [
      { "n": "🎥 电视剧集", "v": "tv" },
      { "n": "🎬 电影作品", "v": "movie" },
      { "n": "🌸 动漫动画", "v": "anime" },
      { "n": "🎤 综艺节目", "v": "variety" }
    ]
  }
};

function generateClassAndFilters() {
  const classList = PLATFORM_CONFIG.map(p => ({ type_id: p.id, type_name: p.name }));
  const filters = {};
  PLATFORM_CONFIG.forEach(p => {
    filters[p.id] = [SUB_FILTERS.sort, SUB_FILTERS.type];
  });
  return { class: classList, filters };
}

// ===================== JS 源标准接口 =====================
async function init(cfg) {}

async function home(filter) {
  const { class: classList, filters } = generateClassAndFilters();
  return JSON.stringify({
    class: classList,
    filters: filters
  });
}

// ===================== category：精准分类 =====================
async function category(tid, pg, filter, extend) {
  const page = parseInt(pg || "1");
  const platform = PLATFORM_CONFIG.find(p => p.id === tid);
  if (!platform) {
    return JSON.stringify({ page, pagecount: 1, limit: 20, total: 0, list: [] });
  }

  let sort = "popularity.desc";
  let type = "tv";

  try {
    if (extend) {
      if (extend.sort) sort = extend.sort;
      if (extend.type) type = extend.type;
    } else if (filter) {
      if (filter.sort) sort = filter.sort;
      if (filter.type) type = filter.type;
    }
  } catch (e) {}

  const today = getToday();
  const isMovie = (type === "movie");
  let endpoint = isMovie ? "/discover/movie" : "/discover/tv";

  // 处理不支持的排序参数
  let sortParam = sort;
  if (sort === "next_episode") sortParam = "popularity.desc";  // 追更模式降级为热度
  if (sort === "daily_airing") sortParam = "popularity.desc";  // 今日播出用日期筛选，排序用热度

  let queryParams = {
    with_networks: platform.network,
    language: "zh-CN",
    page: page,
    sort_by: sortParam,
    "vote_count.gte": 2
  };

  // 类型精准过滤
  if (type === "tv") {
    // 电视剧集：排除动画、综艺
    queryParams.without_genres = "16,10764,10767";
  } else if (type === "anime") {
    queryParams.with_genres = "16";
  } else if (type === "variety") {
    queryParams.with_genres = "10764|10767";
  }
  // 电影无需额外处理

  // 今日播出日期范围
  if (sort === "daily_airing") {
    queryParams["air_date.gte"] = today;
    queryParams["air_date.lte"] = today;
  }

  let items = [];
  try {
    const res = await fetchTmdb(endpoint, queryParams);
    items = (res && res.results) || [];
  } catch (e) {
    log.error("基础列表请求失败: " + e);
    return JSON.stringify({ page, pagecount: 1, limit: 20, total: 0, list: [] });
  }

  // 只用列表字段，零额外请求
  const list = items.map(item => {
    const title = item.name || item.title || "";
    const poster = item.poster_path ? DATA_SOURCES.tmdbImage + item.poster_path : "";
    const rating = item.vote_average ? item.vote_average.toFixed(1) : "0.0";
    const year = (item.first_air_date || item.release_date || "").slice(0, 4);
    
    return {
      vod_id: (isMovie ? "movie_" : "tv_") + item.id,
      vod_name: title,
      vod_pic: poster,
      vod_remarks: `⭐${rating}${year ? " | " + year : ""}`
    };
  });

  return JSON.stringify({
    page,
    pagecount: 100,
    limit: 20,
    total: 2000,
    list
  });
}

// ===================== detail：点击海报时才请求详情 =====================
async function detail(vodId) {
  const parts = vodId.split("_");
  if (parts.length !== 2) return JSON.stringify({ list: [] });

  const [type, id] = parts;
  const isMovie = (type === "movie");

  try {
    const endpoint = isMovie ? `/movie/${id}` : `/tv/${id}`;
    const data = await fetchTmdb(endpoint, {
      language: "zh-CN",
      append_to_response: "credits,alternative_titles"
    });

    let name = data.name || data.title || "";
    const alt = data.alternative_titles;
    if (alt && alt.titles) {
      const cnTitle = alt.titles.find(t => t.iso_3166_1 === "CN");
      if (cnTitle && cnTitle.title) name = cnTitle.title;
    }

    const pic = data.poster_path ? DATA_SOURCES.tmdbImage + data.poster_path : "";
    const year = (data.release_date || data.first_air_date || "").slice(0, 4);
    const area = (data.production_countries || []).map(c => c.name).join(", ");
    const status = isMovie ? "电影" : (data.status === "Ended" ? "已完结" : "连载中");
    const actors = (data.credits && data.credits.cast)
      ? data.credits.cast.slice(0, 8).map(c => c.name).join(", ") : "";
    const directors = (data.credits && data.credits.crew)
      ? data.credits.crew.filter(c => c.job === "Director").slice(0, 3).map(c => c.name).join(", ") : "";
    const content = data.overview || "暂无剧情简介";

    let remarks = status;
    if (!isMovie && data.next_episode_to_air) {
      const ep = data.next_episode_to_air;
      const air = ep.air_date ? ep.air_date : "待定";
      remarks = `🕒 下一集 ${air} S${String(ep.season_number).padStart(2,"0")}E${String(ep.episode_number).padStart(2,"0")}`;
    }

    return JSON.stringify({
      list: [{
        vod_id: vodId,
        vod_name: name,
        vod_pic: pic,
        type_name: isMovie ? "电影" : "电视剧",
        vod_year: year,
        vod_area: area,
        vod_remarks: remarks,
        vod_actor: actors,
        vod_director: directors,
        vod_content: content,
        vod_play_from: "默认源",
        vod_play_url: `播放$${id}`
      }]
    });
  } catch (e) {
    log.error("详情请求失败: " + e);
    return JSON.stringify({ list: [] });
  }
}

// ===================== search：按需搜索 =====================
async function search(wd, quick, pg) {
  const page = parseInt(pg || "1");
  try {
    const res = await fetchTmdb("/search/multi", { query: wd, page: page, language: "zh-CN" });
    const items = res.results || [];
    const list = items
      .filter(i => i.media_type === "movie" || i.media_type === "tv")
      .map(i => ({
        vod_id: (i.media_type === "movie" ? "movie_" : "tv_") + i.id,
        vod_name: i.title || i.name || wd,
        vod_pic: i.poster_path ? DATA_SOURCES.tmdbImage + i.poster_path : "",
        vod_remarks: i.media_type === "movie" ? "电影" : "剧集"
      }));
    return JSON.stringify({
      list,
      page,
      pagecount: res.total_pages || 1,
      total: res.total_results || 0
    });
  } catch (e) {
    log.error("搜索请求失败: " + e);
    return JSON.stringify({ list: [], page: 1, pagecount: 0, total: 0 });
  }
}

async function play(flag, id, flags) {
  return JSON.stringify({
    parse: 1,
    url: id
  });
}

export default {
  init,
  home,
  category,
  detail,
  search,
  play
};