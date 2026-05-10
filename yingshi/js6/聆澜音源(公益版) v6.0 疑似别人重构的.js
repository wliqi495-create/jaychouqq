/*!
 * @name 聆澜音源(公益版) - 去更新纯净版
 * @description 支持网易云/酷我/咪咕，已彻底移除更新检查弹窗逻辑
 * @version v6.0
 * @author 时迁酱&guoyue2010 / 重构: 全豆要聚合逻辑
 */

const DEV_ENABLE = false;
const UPDATE_ENABLE = false;
const SCRIPT_MD5 = "642a1ebc69d3665c5e4f07474470b14c"; 
const MUSIC_QUALITY = {
  kw: ["128k", "320k", "flac"],
  mg: ["128k", "320k", "flac"],
  wy: ["128k", "320k", "flac"]
};
const MUSIC_SOURCE = Object.keys(MUSIC_QUALITY);

const { EVENT_NAMES, request, on, send, env, version } = globalThis.lx;

const HTTP_URL_REGEX = /^https?:\/\//i;
const XINGHAI_MAIN_API = "https://music-api.gdstudio.xyz/api.php?use_xbridge3=true&loader_name=forest&need_sec_link=1&sec_link_scene=im&theme=light";
const XINGHAI_BACKUP_API = "https://music-dl.sayqz.com/api/";
const SUYIN_163_API = "https://oiapi.net/api/Music_163";
const SUYIN_KUWO_API = "https://oiapi.net/api/Kuwo";
const SUYIN_MIGU_API = "https://api.xcvts.cn/api/music/migu";

const PLATFORM_TO_XINGHAI = { wy: "netease", kw: "kuwo", mg: "migu" };
const PLATFORM_TO_XINGHAI_BACKUP = { wy: "netease", kw: "kuwo" };
const QUALITY_TO_BR = { "128k": "128", "192k": "192", "320k": "320", flac: "740", flac24bit: "999" };

function normalizeQuality(quality) {
  switch (String(quality || "").toLowerCase()) {
    case "128k": return "low";
    case "320k": return "standard";
    case "flac": return "lossless";
    default: return "128k";
  }
}

function getSongId(songInfo) {
  return (songInfo?.hash || songInfo?.songmid || songInfo?.id || "").toString();
}

function httpRequest(url, options = { method: "GET" }) {
  return new Promise((resolve, reject) => {
    request(url, { timeout: 8000, ...options }, (err, res) => {
      if (err) return reject(new Error("请求错误: " + err.message));
      let body = res?.body;
      if (typeof body === "string") {
        const trimmed = body.trim();
        if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
          try { body = JSON.parse(trimmed); } catch (e) {}
        }
      }
      resolve({ statusCode: res?.statusCode ?? 0, headers: res?.headers || {}, body });
    });
  });
}

async function httpGet(url, params = {}) {
  const queryStr = Object.keys(params)
    .filter(k => params[k] !== undefined)
    .map(k => encodeURIComponent(k) + "=" + encodeURIComponent(params[k]))
    .join("&");
  const fullUrl = url + (queryStr ? (url.includes("?") ? "&" : "?") + queryStr : "");
  const res = await httpRequest(fullUrl, { method: "GET", timeout: 8000 });
  if (res.statusCode >= 400) throw new Error("HTTP错误: " + res.statusCode);
  return res.body;
}

function selectQuality(requestedQuality, supportedQualities) {
  if (!requestedQuality) requestedQuality = "128k";
  const normalized = String(requestedQuality).toLowerCase();
  if (supportedQualities.includes(normalized)) return normalized;
  const order = ["flac", "320k", "192k", "128k"];
  let idx = order.indexOf(normalized);
  if (idx < 0) idx = order.length - 1;
  for (let i = idx; i < order.length; i++) {
    if (supportedQualities.includes(order[i])) return order[i];
  }
  return "128k";
}

function validateUrl(url, sourceName) {
  if (!url || typeof url !== "string") throw new Error(sourceName + "返回空URL");
  if (!HTTP_URL_REGEX.test(url.trim())) throw new Error(sourceName + "非法URL格式");
  return url;
}

async function xinghaiMainGetUrl(platform, songId, quality) {
  const source = PLATFORM_TO_XINGHAI[platform];
  const selectedQuality = selectQuality(quality, ["128k", "192k", "320k", "flac"]);
  const br = QUALITY_TO_BR[selectedQuality];
  const url = XINGHAI_MAIN_API + "&types=url&source=" + source + "&id=" + encodeURIComponent(songId) + "&br=" + br;
  const res = await httpRequest(url, { method: "GET", headers: { "User-Agent": "LX-Music-Mobile", Accept: "application/json" } });
  if (!res.body?.url) throw new Error("星海主失败");
  return res.body.url;
}

async function xinghaiBackupGetUrl(platform, songId, quality) {
  const source = PLATFORM_TO_XINGHAI_BACKUP[platform];
  const selectedQuality = selectQuality(quality, ["128k", "192k", "320k", "flac"]);
  const apiUrl = XINGHAI_BACKUP_API + "?source=" + encodeURIComponent(source) + "&id=" + encodeURIComponent(songId) + "&type=url&br=" + encodeURIComponent(selectedQuality);
  const res = await httpRequest(apiUrl, { method: "GET", timeout: 8000 });
  if (!res.body?.url) throw new Error("星海备失败");
  return res.body.url;
}

async function suyin163GetUrl(songInfo) {
  const id = songInfo?.songmid || songInfo?.id;
  const res = await httpGet(SUYIN_163_API, { id });
  if (res?.code === 0 && (res.data?.[0]?.url || res.data?.url)) return res.data?.[0]?.url || res.data?.url;
  throw new Error("溯音163失败");
}

async function suyinKuwoGetUrl(songInfo, quality) {
  const keyword = (songInfo?.name || "") + (songInfo?.singer || "");
  const brMap = { flac: 1, "320k": 5, "128k": 7 };
  const targetQuality = selectQuality(quality, ["flac", "320k", "128k"]);
  const res = await httpGet(SUYIN_KUWO_API, { msg: keyword, n: 1, br: brMap[targetQuality] || 7 });
  if (res?.data?.url) return res.data.url;
  throw new Error("溯音酷我失败");
}

async function suyinMiguGetUrl(songInfo) {
  const keyword = (songInfo?.name || "") + (songInfo?.singer || "");
  const res = await httpGet(SUYIN_MIGU_API, { gm: keyword, n: 1, num: 1, type: "json" });
  if (res?.code === 200 && res?.musicInfo) return res.musicInfo;
  throw new Error("溯音咪咕失败");
}

async function getMusicUrlWithFallback(platform, musicInfo, quality) {
  const songId = getSongId(musicInfo);
  try { return validateUrl(await xinghaiMainGetUrl(platform, songId, quality), "星海主"); } catch (e) {}
  if (platform === "wy" || platform === "kw") {
    try { return validateUrl(await xinghaiBackupGetUrl(platform, songId, quality), "星海备"); } catch (e) {}
  }
  try {
    let url = null;
    if (platform === "wy") url = await suyin163GetUrl(musicInfo);
    else if (platform === "kw") url = await suyinKuwoGetUrl(musicInfo, quality);
    else if (platform === "mg") url = await suyinMiguGetUrl(musicInfo);
    if (url) return validateUrl(url, "溯音降级");
  } catch (e) {}
  throw new Error("所有链路均失败");
}

const handleGetMusicUrl = async (source, musicInfo, quality) => {
  return getMusicUrlWithFallback(source, musicInfo, quality);
};

// --- 已移除 checkUpdate 函数 ---

const musicSources = {};
MUSIC_SOURCE.forEach((item) => {
  musicSources[item] = { name: item, type: "music", actions: ["musicUrl"], qualitys: MUSIC_QUALITY[item] };
});

on(EVENT_NAMES.request, ({ action, source, info }) => {
  if (action === "musicUrl") return handleGetMusicUrl(source, info.musicInfo, info.type);
  return Promise.reject("action not support");
});

// --- 已彻底移除 UPDATE_ENABLE 判断逻辑 ---
send(EVENT_NAMES.inited, { status: true, openDevTools: false, sources: musicSources });
