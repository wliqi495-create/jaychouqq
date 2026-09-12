// @name 韩小圈
// @author 梦
// @description 影视站：支持首页、分类、详情、搜索与播放
// @dependencies cheerio
// @version 1.0.3
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/采集/韩小圈.js

const OmniBox = require("omnibox_sdk");
const runner = require("spider_runner");

const BASE_URL = "https://hanxiaoquan.hanju.workers.dev";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36";
const LIST_CACHE_TTL = Number(process.env.HXQ_LIST_CACHE_TTL || 900);
const DETAIL_CACHE_TTL = Number(process.env.HXQ_DETAIL_CACHE_TTL || 1800);
const SEARCH_CACHE_TTL = Number(process.env.HXQ_SEARCH_CACHE_TTL || 600);
const SEARCH_PAGE_SIZE = 20;
const SEARCH_PREFETCH_PAGES = Math.min(5, Math.max(1, Number(process.env.HXQ_SEARCH_PREFETCH_PAGES || 3) || 3));

const CATEGORY_CONFIG = [
  { id: "0", name: "韩剧" },
  { id: "1", name: "韩影" },
  { id: "2", name: "日韩综" },
  { id: "3", name: "日韩漫" },
  { id: "100", name: "热门" },
];

module.exports = { home, category, detail, search, play };
runner.run(module.exports);

async function requestApi(path, body, options = {}) {
  const url = `${BASE_URL}${path}`;
  await OmniBox.log("info", `[韩小圈][request] POST ${url} ${JSON.stringify(body || {})}`);
  const res = await OmniBox.request(url, {
    method: "POST",
    headers: {
      "User-Agent": UA,
      "Content-Type": "application/json",
      "Accept": "application/json, text/plain, */*",
      "Origin": BASE_URL,
      "Referer": `${BASE_URL}/`,
      ...(options.headers || {}),
    },
    body: JSON.stringify(body || {}),
    timeout: options.timeout || 30000,
  });
  const statusCode = Number(res?.statusCode || 0);
  if (!res || statusCode !== 200) {
    throw new Error(`HTTP ${res?.statusCode || "unknown"} @ ${url}`);
  }
  const text = String(res.body || "");
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(`JSON parse failed @ ${url}: ${err?.message || err}`);
  }
}

async function getCachedJson(cacheKey, ttl, producer) {
  try {
    const cached = await OmniBox.getCache(cacheKey);
    if (cached) return JSON.parse(String(cached));
  } catch (_) {}
  const value = await producer();
  try {
    await OmniBox.setCache(cacheKey, JSON.stringify(value || {}), ttl);
  } catch (_) {}
  return value;
}

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function absoluteUrl(url) {
  try {
    return new URL(String(url || ""), BASE_URL).toString();
  } catch (_) {
    return String(url || "");
  }
}

function categoryNameById(categoryId) {
  return CATEGORY_CONFIG.find((item) => item.id === String(categoryId))?.name || "韩小圈";
}

function buildListItem(item) {
  return {
    vod_id: String(item?.vod_id || ""),
    vod_name: normalizeText(item?.vod_name || ""),
    vod_pic: absoluteUrl(item?.vod_pic || ""),
    vod_remarks: normalizeText(item?.vod_remarks || item?.vod_class || ""),
    vod_year: normalizeText(item?.vod_year || ""),
    vod_director: normalizeText(item?.vod_director || ""),
    vod_actor: normalizeText(item?.vod_actor || ""),
    vod_content: normalizeText(item?.vod_content || ""),
  };
}

function normalizeSearchKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[·•・\-—_:：,，.。'"“”‘’!?！？()（）\[\]【】《》<>]/g, "");
}

function buildSearchTokens(keyword) {
  const base = normalizeSearchKey(keyword);
  if (!base) return [];
  const tokens = new Set([base]);
  const cleaned = base.replace(/线上看|線上看|全集|韩剧|韓劇|韩国|韓國|电视剧|電視劇|连续剧|連續劇|电影|電影|动漫|動漫|动画|動畫|综艺|綜藝|中字|字幕|高清|hd/g, "");
  if (cleaned) tokens.add(cleaned);
  const noYear = cleaned.replace(/(19|20)\d{2}/g, "");
  if (noYear) tokens.add(noYear);
  const noSeason = cleaned.replace(/第?\d+[季部集]$/g, "").replace(/\d+$/g, "");
  if (noSeason) tokens.add(noSeason);
  return [...tokens].filter(Boolean).sort((a, b) => b.length - a.length);
}

function longestCommonSubsequenceLength(a, b) {
  const left = String(a || "");
  const right = String(b || "");
  if (!left || !right) return 0;
  const previous = new Array(right.length + 1).fill(0);
  const current = new Array(right.length + 1).fill(0);
  for (let i = 1; i <= left.length; i += 1) {
    for (let j = 1; j <= right.length; j += 1) {
      current[j] = left[i - 1] === right[j - 1]
        ? previous[j - 1] + 1
        : Math.max(previous[j], current[j - 1]);
    }
    for (let j = 0; j <= right.length; j += 1) {
      previous[j] = current[j];
      current[j] = 0;
    }
  }
  return previous[right.length];
}

function scoreTitleToken(title, token) {
  if (!title || !token) return 0;
  if (title === token) return 10000 + token.length;
  if (title.startsWith(token)) return 8500 + token.length * 10 - title.length;
  const index = title.indexOf(token);
  if (index >= 0) return 7000 + token.length * 10 - index;

  if (token.length < 3) return 0;
  const lcs = longestCommonSubsequenceLength(title, token);
  const coverage = lcs / token.length;
  const minCoverage = token.length <= 4 ? 0.75 : 0.68;
  if (coverage < minCoverage) return 0;
  return 4500 + Math.round(coverage * 1000) - Math.min(title.length, 100);
}

function scoreContainsToken(value, token, baseScore) {
  if (!value || !token) return 0;
  if (value === token) return baseScore + token.length;
  const index = value.indexOf(token);
  if (index < 0) return 0;
  return baseScore - Math.min(index, 300);
}

function scoreSearchItem(item, keyword) {
  const tokens = buildSearchTokens(keyword);
  const name = normalizeSearchKey(item?.vod_name || "");
  const remarks = normalizeSearchKey(item?.vod_remarks || "");
  const actor = normalizeSearchKey(item?.vod_actor || "");
  const director = normalizeSearchKey(item?.vod_director || "");
  const content = normalizeSearchKey(item?.vod_content || "");
  if (!tokens.length) return 0;

  let score = 0;
  for (const token of tokens) {
    score = Math.max(score, scoreTitleToken(name, token));
    score = Math.max(score, scoreContainsToken(remarks, token, 2600));
    score = Math.max(score, scoreContainsToken(actor, token, 2200));
    score = Math.max(score, scoreContainsToken(director, token, 2000));
    if (token.length >= 3) {
      score = Math.max(score, scoreContainsToken(content, token, 700));
    }
  }
  return score;
}

function dedupeListItems(list) {
  const seen = new Set();
  const result = [];
  for (const item of list) {
    const key = item.vod_id || `${item.vod_name}|${item.vod_pic}`;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

function refineSearchList(list, keyword) {
  return list
    .map((item, index) => ({ item, index, score: scoreSearchItem(item, keyword) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      const scoreDiff = b.score - a.score;
      if (scoreDiff !== 0) return scoreDiff;
      const nameDiff = a.item.vod_name.localeCompare(b.item.vod_name, "zh-CN");
      return nameDiff || a.index - b.index;
    })
    .map((entry) => entry.item);
}

async function fetchSearchPage(keyword, page) {
  const pg = Math.max(1, Number(page || 1) || 1);
  const producer = () => requestApi("/api/search", { keyword, page: pg }, { timeout: 60000 });
  try {
    return await getCachedJson(`hxq:search:${keyword}:${pg}`, SEARCH_CACHE_TTL, producer);
  } catch (firstErr) {
    await OmniBox.log("info", `[韩小圈][search] page=${pg} first try failed, retry once: ${firstErr?.message || firstErr}`);
    return producer();
  }
}

async function collectSearchPages(keyword, page) {
  const targetPage = Math.max(1, Number(page || 1) || 1);
  const endPage = targetPage + SEARCH_PREFETCH_PAGES - 1;
  const raw = [];
  let hasMore = false;
  let fetchedPages = 0;

  for (let currentPage = 1; currentPage <= endPage; currentPage += 1) {
    const data = await fetchSearchPage(keyword, currentPage);
    const items = Array.isArray(data?.data) ? data.data : [];
    raw.push(...items);
    fetchedPages = currentPage;
    hasMore = items.length >= SEARCH_PAGE_SIZE;
    if (!hasMore) break;
  }

  return { raw, hasMore, fetchedPages };
}

function buildVodFromDetail(vod) {
  const playUrls = Array.isArray(vod?.vod_play_url) ? vod.vod_play_url : [];
  const episodes = playUrls
    .map((ep) => ({
      name: normalizeText(ep?.t || ep?.name || ""),
      playId: String(ep?.u || ep?.url || ""),
    }))
    .filter((ep) => ep.name && ep.playId);

  return {
    vod_id: String(vod?.vod_id || ""),
    vod_name: normalizeText(vod?.vod_name || ""),
    vod_pic: absoluteUrl(vod?.vod_pic || ""),
    vod_remarks: normalizeText(vod?.vod_remarks || vod?.vod_class || ""),
    vod_content: normalizeText(vod?.vod_content || ""),
    vod_year: normalizeText(vod?.vod_year || ""),
    vod_director: normalizeText(vod?.vod_director || ""),
    vod_actor: normalizeText(vod?.vod_actor || ""),
    vod_area: "韩国",
    vod_play_sources: episodes.length
      ? [{ name: "默认线路", episodes }]
      : [],
  };
}

async function home() {
  try {
    const data = await getCachedJson("hxq:home:hot:1", LIST_CACHE_TTL, () =>
      requestApi("/api/list", { c_id: "100", page: "1" }),
    );
    const list = Array.isArray(data?.data) ? data.data.slice(0, 20).map(buildListItem) : [];
    await OmniBox.log("info", `[韩小圈][home] list=${list.length}`);
    return {
      class: CATEGORY_CONFIG.map((item) => ({ type_id: item.id, type_name: item.name })),
      filters: {},
      list,
    };
  } catch (err) {
    await OmniBox.log("error", `[韩小圈][home] ${err?.message || err}`);
    return {
      class: CATEGORY_CONFIG.map((item) => ({ type_id: item.id, type_name: item.name })),
      filters: {},
      list: [],
    };
  }
}

async function category(params) {
  const tid = String(params?.categoryId || "0");
  const pg = String(Math.max(1, Number(params?.page || 1)));
  try {
    const data = await getCachedJson(`hxq:list:${tid}:${pg}`, LIST_CACHE_TTL, () =>
      requestApi("/api/list", { c_id: tid, page: pg }),
    );
    const raw = Array.isArray(data?.data) ? data.data : [];
    const list = raw.map(buildListItem).filter((item) => item.vod_id && item.vod_name);
    const hasMore = raw.length >= 20;
    await OmniBox.log("info", `[韩小圈][category] tid=${tid} pg=${pg} list=${list.length}`);
    return {
      page: Number(pg),
      pagecount: hasMore ? Number(pg) + 1 : Number(pg),
      limit: 20,
      total: hasMore ? Number(pg) * 20 + 1 : (Number(pg) - 1) * 20 + list.length,
      list,
    };
  } catch (err) {
    await OmniBox.log("error", `[韩小圈][category] tid=${tid} pg=${pg} ${err?.message || err}`);
    return {
      page: Number(pg),
      pagecount: Number(pg),
      limit: 20,
      total: 0,
      list: [],
    };
  }
}

async function detail(params) {
  const vodId = String(
    params?.videoId
    || params?.id
    || params?.vod_id
    || params?.categoryId
    || "",
  ).trim();
  if (!vodId) {
    await OmniBox.log("info", `[韩小圈][detail] missing id params=${JSON.stringify(params || {})}`);
    return { list: [] };
  }
  try {
    const data = await getCachedJson(`hxq:detail:${vodId}`, DETAIL_CACHE_TTL, () =>
      requestApi("/api/detail", { b_id: vodId }),
    );
    const vod = data?.data ? buildVodFromDetail(data.data) : null;
    await OmniBox.log("info", `[韩小圈][detail] id=${vodId} episodes=${vod?.vod_play_sources?.[0]?.episodes?.length || 0}`);
    return { list: vod ? [vod] : [] };
  } catch (err) {
    await OmniBox.log("error", `[韩小圈][detail] id=${vodId} ${err?.message || err}`);
    return { list: [] };
  }
}

async function search(params) {
  const keyword = normalizeText(params?.keyword || params?.wd || "");
  const pg = Math.max(1, Number(params?.page || 1) || 1);
  if (!keyword) {
    return { page: 1, pagecount: 1, limit: 20, total: 0, list: [] };
  }

  try {
    const { raw, hasMore, fetchedPages } = await collectSearchPages(keyword, pg);
    const allList = dedupeListItems(
      raw
        .map(buildListItem)
        .filter((item) => item.vod_id && item.vod_name),
    );
    const refinedList = refineSearchList(allList, keyword);
    const start = (pg - 1) * SEARCH_PAGE_SIZE;
    const list = refinedList.slice(start, start + SEARCH_PAGE_SIZE);
    const knownPageCount = Math.max(1, Math.ceil(refinedList.length / SEARCH_PAGE_SIZE));
    const pagecount = refinedList.length > 0
      ? (hasMore ? Math.max(pg + 1, knownPageCount) : Math.max(pg, knownPageCount))
      : pg;
    const total = refinedList.length + (hasMore && refinedList.length > 0 ? 1 : 0);
    await OmniBox.log("info", `[韩小圈][search] keyword=${keyword} pg=${pg} raw=${raw.length} refined=${refinedList.length} list=${list.length} pages=${fetchedPages} top=${list.slice(0, 5).map((item) => item.vod_name).join(" | ")}`);
    return {
      page: pg,
      pagecount,
      limit: SEARCH_PAGE_SIZE,
      total,
      list,
    };
  } catch (err) {
    await OmniBox.log("error", `[韩小圈][search] keyword=${keyword} pg=${pg} ${err?.message || err}`);
    return {
      page: pg,
      pagecount: pg,
      limit: SEARCH_PAGE_SIZE,
      total: 0,
      list: [],
    };
  }
}

async function play(params) {
  const playId = String(params?.id || params?.playId || params?.url || "").trim();
  if (!playId) {
    return { urls: [] };
  }
  await OmniBox.log("info", `[韩小圈][play] ${playId}`);
  return {
    parse: 0,
    header: {
      "User-Agent": UA,
      Referer: `${BASE_URL}/`,
      Origin: BASE_URL,
    },
    urls: [{ name: "播放", url: playId }],
  };
}
