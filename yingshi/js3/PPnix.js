// @name PPnix
// @author 梦
// @description 刮削：暂不支持，弹幕：暂不支持，分类筛选：支持，播放链：兼容 TVBox，优先返回已重写的内联 m3u8 以规避代理链路问题
// @dependencies: axios, cheerio
// @version 1.7.3
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/采集/PPnix.js

const OmniBox = require("omnibox_sdk");
const cheerio = require("cheerio");
const axios = require("axios");
const runner = require("spider_runner");
const { execFile } = require("child_process");
const { promisify } = require("util");

const BASE_URL = process.env.PPNIX_HOST || "https://www.ppnix.com";
const BASE_PATH = process.env.PPNIX_LANG_PATH || "/cn";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36";

const CATEGORIES = [
  { type_id: "movie", type_name: "电影" },
  { type_id: "tv", type_name: "电视剧" },
];

function normalizeBasePath(path = "") {
  const p = String(path || "").trim();
  if (!p) return "/cn";
  return p.startsWith("/") ? p.replace(/\/+$/, "") : `/${p.replace(/\/+$/, "")}`;
}

const LANG_PATH = normalizeBasePath(BASE_PATH);

const PPNIX_SEGMENT_HOST = process.env.PPNIX_SEGMENT_HOST || "https://1.ppnix.com";
const PPNIX_REWRITE_M3U8 = process.env.PPNIX_REWRITE_M3U8 === "1";
const PPNIX_CF_COOKIE = process.env.PPNIX_CF_COOKIE || process.env.PPNIX_COOKIE || "";
const PPNIX_CF_AUTO = process.env.PPNIX_CF_AUTO !== "0";
const PPNIX_CF_CACHE_KEY = process.env.PPNIX_CF_CACHE_KEY || "ppnix:cf_clearance";
const PPNIX_CF_MAX_AGE_SECONDS = parseInt(process.env.PPNIX_CF_MAX_AGE_SECONDS || "21600", 10) || 21600;
const PPNIX_CF_TIMEOUT_MS = parseInt(process.env.PPNIX_CF_TIMEOUT_MS || "45000", 10) || 45000;
// FlareSolverr 服务地址，优先读取站点专用变量，其次回退通用 FLARESOLVERR_URL。
// 项目地址：https://github.com/FlareSolverr/FlareSolverr
const PPNIX_FLARESOLVERR_URL = process.env.PPNIX_FLARESOLVERR_URL || process.env.FLARESOLVERR_URL || "http://192.168.50.50:8191/v1";
// FlareSolverr 会话名，用于复用已过验证的浏览器会话。
const PPNIX_FLARESOLVERR_SESSION = process.env.PPNIX_FLARESOLVERR_SESSION || "";
// FlareSolverr 单次请求最大等待时间（毫秒），默认沿用 CF 自动处理超时配置。
const PPNIX_FLARESOLVERR_TIMEOUT_MS = parseInt(process.env.PPNIX_FLARESOLVERR_TIMEOUT_MS || String(PPNIX_CF_TIMEOUT_MS), 10) || PPNIX_CF_TIMEOUT_MS;
const PPNIX_ENABLE_SUBTITLES = process.env.PPNIX_ENABLE_SUBTITLES === "1";
const execFileAsync = promisify(execFile);

const SORT_MAP = {
  time: "newstime",
  hits: "onclick",
  score: "rating",
  newstime: "newstime",
  onclick: "onclick",
  rating: "rating",
};

function joinUrl(path = "") {
  const raw = String(path || "").trim();
  if (!raw) return `${BASE_URL}${LANG_PATH}/`;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/")) return `${BASE_URL}${raw}`;
  return `${BASE_URL}/${raw}`;
}

function buildCookieHeader(cookie = "") {
  const value = text(cookie);
  return value ? { Cookie: value } : {};
}

function toCookieString(cookieMap = {}) {
  return Object.entries(cookieMap || {})
    .map(([k, v]) => [text(k), text(v)])
    .filter(([k, v]) => k && v)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

function cookiesArrayToString(cookies = []) {
  return (Array.isArray(cookies) ? cookies : [])
    .map((item) => ({ name: text(item?.name || ""), value: text(item?.value || "") }))
    .filter((item) => item.name && item.value)
    .map((item) => `${item.name}=${item.value}`)
    .join("; ");
}

async function getCachedCfCookie() {
  if (text(PPNIX_CF_COOKIE)) return text(PPNIX_CF_COOKIE);
  try {
    const cached = await OmniBox.getCache(PPNIX_CF_CACHE_KEY);
    return text(cached || "");
  } catch (error) {
    OmniBox.log("warn", `[cf] 读取缓存失败: ${error.message}`);
    return "";
  }
}

async function setCachedCfCookie(cookie) {
  const value = text(cookie);
  if (!value || text(PPNIX_CF_COOKIE)) return;
  try {
    await OmniBox.setCache(PPNIX_CF_CACHE_KEY, value, PPNIX_CF_MAX_AGE_SECONDS);
  } catch (error) {
    OmniBox.log("warn", `[cf] 写入缓存失败: ${error.message}`);
  }
}

async function fetchCfClearanceWithFlareSolverr(targetUrl = `${BASE_URL}${LANG_PATH}/`) {
  const endpoint = text(PPNIX_FLARESOLVERR_URL);
  if (!endpoint) {
    throw new Error("未配置 FlareSolverr 地址");
  }

  const payload = {
    cmd: "request.get",
    url: targetUrl,
    maxTimeout: PPNIX_FLARESOLVERR_TIMEOUT_MS,
  };
  if (text(PPNIX_FLARESOLVERR_SESSION)) {
    payload.session = text(PPNIX_FLARESOLVERR_SESSION);
  }

  const res = await axios.post(endpoint, payload, {
    timeout: PPNIX_FLARESOLVERR_TIMEOUT_MS + 5000,
    headers: {
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
    },
    validateStatus: () => true,
  });

  if (res.status !== 200 || !res.data || res.data.status !== "ok") {
    throw new Error(`FlareSolverr HTTP ${res.status}`);
  }

  const solution = res.data.solution || {};
  const cookies = Array.isArray(solution.cookies) ? solution.cookies : [];
  const cookie = cookiesArrayToString(cookies);
  const cf = cookies.find((item) => text(item?.name) === "cf_clearance" && /ppnix\.com$/i.test(text(item?.domain || "ppnix.com")));

  if (!cf?.value) {
    throw new Error(`FlareSolverr 未返回 cf_clearance，message=${text(res.data.message || "") || "unknown"}`);
  }

  OmniBox.log("info", `[cf] FlareSolverr 已返回 cookies=${cookies.length}, ua=${text(solution.userAgent || "")}`);
  return cookie;
}

async function fetchCfClearanceWithBrowser() {
  const script = String.raw`
const { execFile } = require("child_process");
const { promisify } = require("util");
const http = require("http");
const execFileAsync = promisify(execFile);
const BASE_URL = process.env.PPNIX_BASE_URL;
const USER_AGENT = process.env.PPNIX_USER_AGENT;
const timeoutMs = Number(process.env.PPNIX_CF_TIMEOUT_MS || 45000);

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = "";
      res.on("data", (c) => { data += c; });
      res.on("end", () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on("error", reject);
  });
}

async function waitForDebugger(port, deadline) {
  while (Date.now() < deadline) {
    try {
      const info = await getJson("http://127.0.0.1:" + port + "/json/version");
      if (info && info.webSocketDebuggerUrl) return info;
    } catch (_) {}
    await delay(500);
  }
  throw new Error("等待 Chromium 调试端口超时");
}

async function readCookies(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let seq = 0;
  const pending = new Map();
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  };
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  const send = (method, params = {}) => new Promise((resolve) => {
    const id = ++seq;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });
  const res = await send("Storage.getCookies", {});
  ws.close();
  return (res.result && res.result.cookies) || [];
}

(async () => {
  const port = 9223 + Math.floor(Math.random() * 200);
  const userDataDir = await execFileAsync("mktemp", ["-d", "/tmp/ppnix-cf-XXXXXX"]);
  const profileDir = String(userDataDir.stdout || "").trim();
  const chrome = ["/snap/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/chromium"];
  const bin = chrome.find(Boolean);
  if (!bin) throw new Error("未找到 Chromium");

  const child = execFile(bin, [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--user-data-dir=" + profileDir,
    "--remote-debugging-port=" + port,
    "--user-agent=" + USER_AGENT,
    BASE_URL + "/cn/"
  ], { stdio: "ignore" });

  try {
    const deadline = Date.now() + timeoutMs;
    const version = await waitForDebugger(port, deadline);
    while (Date.now() < deadline) {
      const cookies = await readCookies(version.webSocketDebuggerUrl);
      const hit = cookies.find((c) => c && c.name === "cf_clearance" && String(c.domain || "").includes("ppnix.com"));
      if (hit && hit.value) {
        process.stdout.write("cf_clearance=" + hit.value);
        return;
      }
      await delay(1200);
    }
    throw new Error("未在时限内获取到 cf_clearance");
  } finally {
    try { child.kill("SIGKILL"); } catch (_) {}
  }
})().catch((error) => {
  console.error(error && error.message ? error.message : String(error));
  process.exit(1);
});`;

  const { stdout, stderr } = await execFileAsync("node", ["-e", script], {
    timeout: PPNIX_CF_TIMEOUT_MS,
    env: {
      ...process.env,
      PPNIX_BASE_URL: BASE_URL,
      PPNIX_USER_AGENT: USER_AGENT,
      PPNIX_CF_TIMEOUT_MS: String(PPNIX_CF_TIMEOUT_MS),
    },
    maxBuffer: 1024 * 1024,
  });

  const cookie = text(stdout || "");
  if (!/^cf_clearance=/.test(cookie)) {
    throw new Error(text(stderr || "未获取到 cf_clearance"));
  }
  return cookie;
}

async function ensureCfCookie(forceRefresh = false, targetUrl = `${BASE_URL}${LANG_PATH}/`) {
  if (text(PPNIX_CF_COOKIE)) return text(PPNIX_CF_COOKIE);
  if (!forceRefresh) {
    const cached = await getCachedCfCookie();
    if (cached) return cached;
  }
  if (!PPNIX_CF_AUTO) return "";

  let cookie = "";
  try {
    OmniBox.log("info", `[cf] 开始通过 FlareSolverr 自动获取 cf_clearance`);
    cookie = await fetchCfClearanceWithFlareSolverr(targetUrl);
  } catch (error) {
    OmniBox.log("warn", `[cf] FlareSolverr 获取失败，回退 headless Chromium: ${error.message}`);
    cookie = await fetchCfClearanceWithBrowser();
  }

  if (cookie) {
    await setCachedCfCookie(cookie);
    OmniBox.log("info", `[cf] 已自动获取 cf_clearance，长度=${cookie.length}`);
  }
  return cookie;
}

async function requestPage(path) {
  const url = joinUrl(path);
  OmniBox.log("info", `[request] ${url}`);
  let cookie = await getCachedCfCookie();
  let res = await axios.get(url, {
    timeout: 20000,
    headers: {
      "User-Agent": USER_AGENT,
      "Referer": `${BASE_URL}${LANG_PATH}/`,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      ...buildCookieHeader(cookie),
    },
    validateStatus: () => true,
  });

  if ((res.status === 403 || res.status === 503) && PPNIX_CF_AUTO) {
    cookie = await ensureCfCookie(!cookie, url);
    res = await axios.get(url, {
      timeout: 20000,
      headers: {
        "User-Agent": USER_AGENT,
        "Referer": `${BASE_URL}${LANG_PATH}/`,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        ...buildCookieHeader(cookie),
      },
      validateStatus: () => true,
    });
  }

  if (res.status !== 200 || !res.data) {
    throw new Error(`HTTP ${res.status}`);
  }

  return {
    url,
    html: typeof res.data === "string" ? res.data : String(res.data || ""),
  };
}

function text(v) {
  return String(v == null ? "" : v).trim();
}

function fixImage(url) {
  const u = text(url);
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith("//")) return `https:${u}`;
  if (u.startsWith("/")) return `${BASE_URL}${u}`;
  return `${BASE_URL}/${u}`;
}

function stripTags(s = "") {
  return text(String(s || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " "));
}

function decodeHtmlEntity(str = "") {
  return text(str)
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function mapListItems($, scope, typeId = "") {
  const list = [];
  const seen = new Set();
  $(scope).each((_, el) => {
    const $el = $(el);
    const $a = $el.find("a.thumbnail, h2 a, a").first();
    const href = $a.attr("href") || $el.find("h2 a").attr("href") || "";
    const vodId = text(href);
    if (!vodId || seen.has(vodId)) return;
    seen.add(vodId);

    const vodName = text($el.find("img.thumb").attr("alt") || $el.find("h2 a").text() || $a.text());
    const vodPic = fixImage($el.find("img.thumb").attr("src") || $el.find("img.thumb").attr("data-src") || "");
    const vodRemarks = text($el.find("footer .rate").text() || $el.find("footer").text());

    if (!vodName) return;

    list.push({
      vod_id: vodId,
      vod_name: vodName,
      vod_pic: vodPic,
      type_id: typeId,
      type_name: typeId === "movie" ? "电影" : typeId === "tv" ? "电视剧" : "",
      vod_remarks: vodRemarks,
    });
  });
  return list;
}

function parseM3u8List(html = "") {
  const infoId = (html.match(/infoid\s*=\s*(\d+)/) || [])[1] || "";
  const m = html.match(/m3u8\s*=\s*\[(.*?)\]/s);
  if (!m) return { infoId, items: [] };
  const items = [];
  const re = /'([^']*)'|"([^"]*)"/g;
  let mm;
  while ((mm = re.exec(m[1])) !== null) {
    const value = text(mm[1] || mm[2] || "");
    if (value) items.push(value);
  }
  return { infoId, items };
}

function buildPlayId(meta) {
  const infoId = text(meta.infoId || "");
  const param = encodeURIComponent(text(meta.param || ""));
  const referer = encodeURIComponent(text(meta.referer || ""));
  const name = encodeURIComponent(text(meta.name || ""));
  const episodeName = encodeURIComponent(text(meta.episodeName || ""));
  return `${infoId}|${param}|${referer}|${name}|${episodeName}`;
}

function parsePlayId(playId) {
  const parts = String(playId || "").split("|");
  return {
    infoId: text(parts[0] || ""),
    param: decodeURIComponent(parts[1] || ""),
    referer: decodeURIComponent(parts[2] || ""),
    name: decodeURIComponent(parts[3] || ""),
    episodeName: decodeURIComponent(parts[4] || ""),
  };
}

async function fetchText(url, headers = {}) {
  let cookie = await getCachedCfCookie();
  let res = await axios.get(url, {
    timeout: 20000,
    headers: {
      "User-Agent": USER_AGENT,
      ...headers,
      ...buildCookieHeader(cookie),
    },
    validateStatus: () => true,
  });
  if ((res.status === 403 || res.status === 503) && PPNIX_CF_AUTO) {
    cookie = await ensureCfCookie(!cookie, url);
    res = await axios.get(url, {
      timeout: 20000,
      headers: {
        "User-Agent": USER_AGENT,
        ...headers,
        ...buildCookieHeader(cookie),
      },
      validateStatus: () => true,
    });
  }
  if (res.status !== 200) {
    throw new Error(`HTTP ${res.status}`);
  }
  return typeof res.data === "string" ? res.data : String(res.data || "");
}

function rewritePpnixM3u8(m3u8Text, referer) {
  const keyUrl = `${BASE_URL}/info/m3u8/key`;
  return String(m3u8Text || "")
    .replace(/URI="\.\.\/key"/g, `URI="${keyUrl}"`)
    .replace(/https:\/\/ipfs\.ppnix\.com\/ipfs\//g, `${PPNIX_SEGMENT_HOST}/ipfs/`);
}

function buildSubtitleSelector(infoId, param, langs = ["cn", "tw", "en"]) {
  const items = [];
  for (const lang of langs) {
    const code = text(lang);
    if (!code) continue;
    items.push({
      name: code,
      url: `${BASE_URL}/info/subtitle/${infoId}/${encodeURIComponent(param)}/${code}.srt`,
    });
  }
  return items;
}

function uniqValues(values = []) {
  return [...new Set(values.map((v) => text(v)).filter(Boolean))];
}

function normalizeCategoryFilters(raw = {}) {
  const filters = raw && typeof raw === "object" ? raw : {};
  return {
    class: text(filters.class || filters.type || filters.cate || ""),
    area: text(filters.area || ""),
    year: text(filters.year || ""),
    by: text(filters.by || filters.sort || "newstime") || "newstime",
  };
}

function buildFilterPath(categoryId, page = 1, rawFilters = {}) {
  const filters = normalizeCategoryFilters(rawFilters);
  const genre = filters.class;
  const area = filters.area;
  const year = filters.year;
  const sort = SORT_MAP[filters.by] || "newstime";
  const pagePart = page <= 1 ? "" : `${page - 1}`;
  return `${LANG_PATH}/${categoryId}/${genre}-${area}-${year}-${pagePart}-${sort}.html`;
}

function extractFilterValues($, root, currentText = "") {
  const values = [];
  $(root).find("a").each((_, el) => {
    const name = text($(el).text());
    if (!name || name === currentText) return;
    values.push(name);
  });
  return uniqValues(values);
}

function buildCategoryFilters($) {
  const groups = [];
  const dls = $(".lists-content.filter dl");
  if (!dls.length) return groups;

  const typeValues = extractFilterValues($, dls.eq(0), "全部");
  if (typeValues.length) {
    groups.push({
      key: "class",
      name: "类型",
      init: "",
      value: [{ name: "全部", value: "" }, ...typeValues.map((v) => ({ name: v, value: v }))],
    });
  }

  const areaValues = extractFilterValues($, dls.eq(1), "全部");
  if (areaValues.length) {
    groups.push({
      key: "area",
      name: "地区",
      init: "",
      value: [{ name: "全部", value: "" }, ...areaValues.map((v) => ({ name: v, value: v }))],
    });
  }

  const yearValues = extractFilterValues($, dls.eq(2), "全部");
  if (yearValues.length) {
    groups.push({
      key: "year",
      name: "年份",
      init: "",
      value: [{ name: "全部", value: "" }, ...yearValues.map((v) => ({ name: v, value: v }))],
    });
  }

  groups.push({
    key: "by",
    name: "排序",
    init: "newstime",
    value: [
      { name: "按时间", value: "newstime" },
      { name: "按人气", value: "onclick" },
      { name: "按评分", value: "rating" },
    ],
  });

  return groups;
}

function buildM3u8DataUrl(m3u8Text) {
  return `data:application/vnd.apple.mpegurl;base64,${Buffer.from(String(m3u8Text || ""), "utf8").toString("base64")}`;
}

function rewritePpnixM3u8LikeWeb(m3u8Text) {
  const keyUrl = `${BASE_URL}/info/m3u8/key`;
  return String(m3u8Text || "")
    .replace(/URI="\.\.\/key"/g, `URI="${keyUrl}"`);
}

function rewritePpnixM3u8ForTvbox(m3u8Text) {
  const keyUrl = `${BASE_URL}/info/m3u8/key`;
  return String(m3u8Text || "")
    .replace(/URI="\.\.\/key"/g, `URI="${keyUrl}"`)
    .replace(/https:\/\/ipfs\.ppnix\.com\/ipfs\//g, `${PPNIX_SEGMENT_HOST}/ipfs/`);
}

async function home(params, context) {
  try {
    const [homePage, moviePage, tvPage] = await Promise.all([
      requestPage(`${LANG_PATH}/`),
      requestPage(buildFilterPath("movie", 1, {})),
      requestPage(buildFilterPath("tv", 1, {})),
    ]);

    const $home = cheerio.load(homePage.html);
    const $movie = cheerio.load(moviePage.html);
    const $tv = cheerio.load(tvPage.html);

    const blocks = $home(".lists-content ul");
    const movieList = blocks.eq(0).length ? mapListItems($home, blocks.eq(0).find("li"), "movie") : [];
    const tvList = blocks.eq(1).length ? mapListItems($home, blocks.eq(1).find("li"), "tv") : [];
    const list = [...movieList, ...tvList].slice(0, 30);

    const filters = {
      movie: buildCategoryFilters($movie),
      tv: buildCategoryFilters($tv),
    };

    OmniBox.log("info", `[home] 分类=${CATEGORIES.length}, 推荐=${list.length}, movieFilters=${filters.movie?.length || 0}, tvFilters=${filters.tv?.length || 0}`);
    return {
      class: CATEGORIES,
      filters,
      list,
    };
  } catch (error) {
    OmniBox.log("error", `[home] 失败: ${error.message}`);
    return { class: CATEGORIES, filters: {}, list: [] };
  }
}

async function category(params, context) {
  try {
    const categoryId = text(params.categoryId || params.type_id || "movie");
    const page = parseInt(params.page || "1", 10) || 1;
    const rawFilters = params.filters || params.extend || {};
    const path = buildFilterPath(categoryId, page, rawFilters);
    const { html } = await requestPage(path);
    const $ = cheerio.load(html);

    const list = mapListItems($, ".lists-content > ul > li, .lists .lists-content ul li", categoryId)
      .filter((item) => item.vod_id.includes(`/${categoryId}/`));

    let pagecount = page;
    const pagerHtml = $(".pagination, .pages, .pagenavi").html() || "";
    const matches = [...pagerHtml.matchAll(/---(\d+)-\.html/g)].map((m) => Number(m[1]) + 1);
    if (matches.length > 0) {
      pagecount = Math.max(page, ...matches);
    }

    const categoryFilters = buildCategoryFilters($);
    OmniBox.log("info", `[category] categoryId=${categoryId}, page=${page}, path=${path}, list=${list.length}, pagecount=${pagecount}`);
    return {
      list,
      page,
      pagecount,
      total: list.length,
      filters: categoryFilters.length ? { [categoryId]: categoryFilters } : {},
    };
  } catch (error) {
    OmniBox.log("error", `[category] 失败: ${error.message}`);
    return { list: [], page: 1, pagecount: 0, total: 0, filters: {} };
  }
}

async function detail(params, context) {
  try {
    const videoId = text(params.videoId || "");
    if (!videoId) return { list: [] };

    const { html, url } = await requestPage(videoId);
    const $ = cheerio.load(html);

    const titleRaw = text($("h1.product-title").text());
    const vodName = titleRaw.replace(/\s*\([^)]*\)\s*$/, "").trim() || text($("title").text()).replace(/\s*\([^)]*\).*/, "");
    const vodPic = fixImage($("header.product-header img.thumb").attr("src") || "");
    const vodContent = text($(".product-excerpt").filter((_, el) => $(el).text().includes("简介：")).text()).replace(/^简介：/, "").trim();
    const vodDirector = text($(".product-excerpt").filter((_, el) => $(el).text().includes("导演：")).find("span").text());
    const vodActor = text($(".product-excerpt").filter((_, el) => $(el).text().includes("主演：")).find("span").text()).replace(/\s*\/\s*/g, ",");
    const vodYear = ((titleRaw.match(/\((\d{4})\)/) || [])[1]) || "";

    const { infoId, items } = parseM3u8List(html);
    const episodes = items.map((item, idx) => ({
      name: item,
      playId: buildPlayId({
        infoId: infoId || ((videoId.match(/(\d+)\.html/) || [])[1] || ""),
        param: item,
        referer: url,
        name: vodName,
        episodeName: item,
        subtitleBase: `${BASE_URL}/info/subtitle/${infoId || ((videoId.match(/(\d+)\.html/) || [])[1] || "")}/${item}`,
      }),
    }));

    const vod = {
      vod_id: videoId,
      vod_name: vodName,
      vod_pic: vodPic,
      vod_year: vodYear,
      vod_director: vodDirector,
      vod_actor: vodActor,
      vod_content: vodContent,
      vod_play_sources: episodes.length ? [{ name: "PPnix", episodes }] : undefined,
    };

    OmniBox.log("info", `[detail] infoId=${infoId}, episodes=${episodes.length}`);
    return { list: [vod] };
  } catch (error) {
    OmniBox.log("error", `[detail] 失败: ${error.message}`);
    return { list: [] };
  }
}

async function search(params, context) {
  try {
    const keyword = text(params.keyword || params.wd || "");
    const page = parseInt(params.page || "1", 10) || 1;
    if (!keyword) return { list: [], page: 1, pagecount: 0, total: 0 };

    const encoded = encodeURIComponent(keyword);
    const sortSuffix = page <= 1 ? "" : `-page-${page}`;
    const path = `${LANG_PATH}/search/${encoded}--.html${sortSuffix}`;
    const { html } = await requestPage(path);
    const $ = cheerio.load(html);

    const list = mapListItems($, ".lists-content > ul > li, .lists .lists-content ul li")
      .filter((item) => /\/(movie|tv)\/\d+\.html/.test(item.vod_id));

    OmniBox.log("info", `[search] keyword=${keyword}, page=${page}, list=${list.length}`);
    return {
      list,
      page,
      pagecount: page,
      total: list.length,
    };
  } catch (error) {
    OmniBox.log("error", `[search] 失败: ${error.message}`);
    return { list: [], page: 1, pagecount: 0, total: 0 };
  }
}

async function play(params, context) {
  try {
    const meta = parsePlayId(params.playId || "");
    const infoId = text(meta.infoId || "");
    const param = text(meta.param || "");
    if (!infoId || !param) {
      throw new Error("playId 参数不完整");
    }

    const referer = text(meta.referer || `${BASE_URL}${LANG_PATH}/`);
    const from = text(context?.from || "") || "unknown";
    const shouldUseLeanHeader = from === "tvbox";
    const cfCookie = shouldUseLeanHeader ? "" : await ensureCfCookie(false, referer);
    const header = shouldUseLeanHeader ? {} : {
      Referer: referer,
      Origin: BASE_URL,
      "User-Agent": USER_AGENT,
      ...buildCookieHeader(cfCookie),
    };

    const sourceUrl = `${BASE_URL}/info/m3u8/${infoId}/${encodeURIComponent(param)}.m3u8`;
    const episodeName = text(meta.episodeName || param || "播放");
    const subtitles = PPNIX_ENABLE_SUBTITLES ? buildSubtitleSelector(infoId, param) : [];

    if (from === "tvbox") {
      try {
        const rawM3u8 = await fetchText(sourceUrl, {});
        const rewritten = rewritePpnixM3u8ForTvbox(rawM3u8);
        const finalUrl = buildM3u8DataUrl(rewritten);
        OmniBox.log("info", `[play] 返回 tvbox 专用内联 m3u8: infoId=${infoId}, param=${param}, from=${from}, leanHeader=${shouldUseLeanHeader ? "yes" : "no"}, cookie=${cfCookie ? "yes" : "no"}, subtitles=${subtitles.length}`);
        return {
          urls: [{ name: episodeName, url: finalUrl }],
          flag: "PPnix",
          header,
          parse: 0,
          danmaku: [],
          subtitles,
        };
      } catch (error) {
        OmniBox.log("warn", `[play] tvbox 内联 m3u8 失败，回退原始地址: ${error.message}`);
      }
    }

    if (PPNIX_REWRITE_M3U8) {
      try {
        const rawM3u8 = await fetchText(sourceUrl, header);
        const rewritten = rewritePpnixM3u8LikeWeb(rawM3u8);
        const finalUrl = buildM3u8DataUrl(rewritten);
        OmniBox.log("info", `[play] 返回重写 data-url: infoId=${infoId}, param=${param}, from=${from}, leanHeader=${shouldUseLeanHeader ? "yes" : "no"}, cookie=${cfCookie ? "yes" : "no"}, subtitles=${subtitles.length}`);
        return {
          urls: [{ name: episodeName, url: finalUrl }],
          flag: "PPnix",
          header,
          parse: 0,
          danmaku: [],
          subtitles,
        };
      } catch (error) {
        OmniBox.log("warn", `[play] 官网链路重写失败，回退原始地址: ${error.message}`);
      }
    }

    OmniBox.log("info", `[play] 返回原始 m3u8: infoId=${infoId}, param=${param}, from=${from}, leanHeader=${shouldUseLeanHeader ? "yes" : "no"}, cookie=${cfCookie ? "yes" : "no"}, subtitles=${subtitles.length}`);
    return {
      urls: [{ name: episodeName, url: sourceUrl }],
      flag: "PPnix",
      header,
      parse: 0,
      danmaku: [],
      subtitles,
    };
  } catch (error) {
    OmniBox.log("error", `[play] 失败: ${error.message}`);
    return { urls: [], flag: "PPnix", header: {}, parse: 1, danmaku: [] };
  }
}

module.exports = { home, category, detail, search, play };
runner.run(module.exports);
