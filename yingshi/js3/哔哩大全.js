// @name 哔哩大全
// @author 
// @description 弹幕：支持
// @dependencies: axios
// @version 1.1.0
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/综合/哔哩大全.js

/**
 * 哔哩大全 - OmniBox 爬虫脚本（模板化版本）
 */
const axios = require("axios");
const OmniBox = require("omnibox_sdk");

// ==================== 配置区域 ====================
const BILI_COOKIE = process.env.BILI_COOKIE || "";
const DANMU_API = process.env.DANMU_API || "";

const BILI_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Referer: "https://www.bilibili.com",
  ...(BILI_COOKIE ? { Cookie: BILI_COOKIE } : {}),
};

const isLoggedIn = () => Boolean(BILI_COOKIE && BILI_COOKIE.includes("SESSDATA="));

const CLASSES = [
  { type_id: "沙雕仙逆", type_name: "傻屌仙逆" },
  { type_id: "沙雕动画", type_name: "沙雕动画" },
  { type_id: "纪录片超清", type_name: "纪录片" },
  { type_id: "演唱会超清", type_name: "演唱会" },
  { type_id: "音乐超清", type_name: "流行音乐" },
  { type_id: "美食超清", type_name: "美食" },
  { type_id: "食谱", type_name: "食谱" },
  { type_id: "体育超清", type_name: "体育" },
  { type_id: "球星", type_name: "球星" },
  { type_id: "中小学教育", type_name: "教育" },
  { type_id: "幼儿教育", type_name: "幼儿教育" },
  { type_id: "旅游", type_name: "旅游" },
  { type_id: "风景4K", type_name: "风景" },
  { type_id: "说案", type_name: "说案" },
  { type_id: "知名UP主", type_name: "知名UP主" },
  { type_id: "探索发现超清", type_name: "探索发现" },
  { type_id: "鬼畜", type_name: "鬼畜" },
  { type_id: "搞笑超清", type_name: "搞笑" },
  { type_id: "儿童超清", type_name: "儿童" },
  { type_id: "动物世界超清", type_name: "动物世界" },
  { type_id: "相声小品超清", type_name: "相声小品" },
  { type_id: "戏曲", type_name: "戏曲" },
  { type_id: "解说", type_name: "解说" },
  { type_id: "演讲", type_name: "演讲" },
  { type_id: "小姐姐超清", type_name: "小姐姐" },
  { type_id: "荒野求生超清", type_name: "荒野求生" },
  { type_id: "健身", type_name: "健身" },
  { type_id: "帕梅拉", type_name: "帕梅拉" },
  { type_id: "太极拳", type_name: "太极拳" },
  { type_id: "广场舞", type_name: "广场舞" },
  { type_id: "舞蹈", type_name: "舞蹈" },
  { type_id: "音乐", type_name: "音乐" },
  { type_id: "歌曲", type_name: "歌曲" },
  { type_id: "MV4K", type_name: "MV" },
  { type_id: "舞曲超清", type_name: "舞曲" },
  { type_id: "4K", type_name: "4K" },
  { type_id: "电影", type_name: "电影" },
  { type_id: "电视剧", type_name: "电视剧" },
  { type_id: "白噪音超清", type_name: "白噪音" },
  { type_id: "考公考证", type_name: "考公考证" },
  { type_id: "平面设计教学", type_name: "平面设计教学" },
  { type_id: "软件教程", type_name: "软件教程" },
  { type_id: "Windows", type_name: "Windows" },
];

const QUALITY_NAME_MAP = {
  127: "8K 超高清",
  126: "杜比视界",
  125: "HDR 真彩色",
  120: "4K 超清",
  116: "1080P60 高帧率",
  112: "1080P+ 高码率",
  80: "1080P 高清",
  74: "720P60 高帧率",
  64: "720P 高清",
  32: "480P 清晰",
  16: "360P 流畅",
};

function logInfo(msg) {
  OmniBox.log("info", `[BILI-ALL] ${msg}`);
}

function logError(msg, err) {
  OmniBox.log("error", `[BILI-ALL] ${msg}: ${err?.message || err}`);
}

function fixCover(url) {
  if (!url) return "";
  if (url.startsWith("//")) return `https:${url}`;
  return url;
}

function formatDuration(seconds) {
  const sec = parseInt(seconds, 10) || 0;
  if (sec <= 0) return "00:00";
  const minutes = Math.floor(sec / 60);
  const secs = sec % 60;
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function formatSearchDuration(duration) {
  if (!duration || typeof duration !== "string") return "00:00";
  const parts = duration.split(":");
  return parts.length === 2 ? duration : "00:00";
}

function preprocessTitle(title) {
  if (!title) return "";
  return String(title)
    .replace(/4[kK]|[xX]26[45]|720[pP]|1080[pP]|2160[pP]|1280x720|1920x1080/g, " ")
    .replace(/[hH]\.?26[45]/g, " ")
    .replace(/BluRay|WEB-DL|HDR|REMUX/gi, " ")
    .replace(/\.mp4|\.mkv|\.avi|\.flv/gi, " ")
    .trim();
}

function chineseToArabic(cn) {
  const map = {
    零: 0,
    一: 1,
    二: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
    十: 10,
  };
  if (!Number.isNaN(Number(cn))) return parseInt(cn, 10);
  if (cn.length === 1) return map[cn] ?? cn;
  if (cn.length === 2) {
    if (cn[0] === "十") return 10 + (map[cn[1]] || 0);
    if (cn[1] === "十") return (map[cn[0]] || 0) * 10;
  }
  if (cn.length === 3) return (map[cn[0]] || 0) * 10 + (map[cn[2]] || 0);
  return cn;
}

function extractEpisode(title) {
  if (!title) return "";
  const processed = preprocessTitle(title);

  const seMatch = processed.match(/[Ss](?:\d{1,2})?[-._\s]*[Ee](\d{1,3})/i);
  if (seMatch) return seMatch[1];

  const cnMatch = processed.match(/第\s*([零一二三四五六七八九十0-9]+)\s*[集话章节回期]/);
  if (cnMatch) return String(chineseToArabic(cnMatch[1]));

  const epMatch = processed.match(/\b(?:EP|E)[-._\s]*(\d{1,3})\b/i);
  if (epMatch) return epMatch[1];

  const bracketMatch = processed.match(/[\[\(【（](\d{1,3})[\]\)】）]/);
  if (bracketMatch && !["720", "1080", "480"].includes(bracketMatch[1])) {
    return bracketMatch[1];
  }

  return "";
}

function buildFileNameForDanmu(vodName, episodeTitle) {
  if (!vodName) return "";
  if (!episodeTitle || episodeTitle === "正片" || episodeTitle === "播放") return vodName;

  const digits = extractEpisode(episodeTitle);
  if (!digits) return vodName;

  const epNum = parseInt(digits, 10);
  if (!epNum || epNum <= 0) return vodName;
  return epNum < 10 ? `${vodName} S01E0${epNum}` : `${vodName} S01E${epNum}`;
}

function inferFileNameFromURL(url) {
  try {
    const urlObj = new URL(url);
    let base = urlObj.pathname.split("/").pop() || "";
    const dotIndex = base.lastIndexOf(".");
    if (dotIndex > 0) base = base.substring(0, dotIndex);
    base = base.replace(/[_-]/g, " ").replace(/\./g, " ").trim();
    return base || url;
  } catch {
    return url;
  }
}

async function matchDanmu(fileName, cid) {
  // 优先沿用原有 B 站弹幕逻辑
  if (cid) {
    return [{ name: "B站弹幕", url: `https://api.bilibili.com/x/v1/dm/list.so?oid=${cid}` }];
  }

  // 可选：如果配置 DANMU_API，兼容 4KVM 风格匹配
  if (!DANMU_API || !fileName) return [];

  try {
    const matchUrl = `${DANMU_API}/api/v2/match`;
    const response = await OmniBox.request(matchUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": BILI_HEADERS["User-Agent"],
      },
      body: JSON.stringify({ fileName }),
    });

    if (response.statusCode !== 200) return [];

    const matchData = JSON.parse(response.body || "{}");
    if (!matchData.isMatched || !Array.isArray(matchData.matches) || matchData.matches.length === 0) {
      return [];
    }

    const firstMatch = matchData.matches[0];
    const episodeId = firstMatch.episodeId;
    if (!episodeId) return [];

    const animeTitle = firstMatch.animeTitle || "";
    const episodeTitle = firstMatch.episodeTitle || "";
    const name = animeTitle && episodeTitle ? `${animeTitle} - ${episodeTitle}` : animeTitle || episodeTitle || "弹幕";

    return [{ name, url: `${DANMU_API}/api/v2/comment/${episodeId}?format=xml` }];
  } catch (error) {
    logError("匹配弹幕失败", error);
    return [];
  }
}

async function home(params) {
  try {
    const url = "https://api.bilibili.com/x/web-interface/popular?ps=20&pn=1";
    const { data } = await axios.get(url, { headers: BILI_HEADERS });

    const list = (data?.data?.list || []).map((item) => ({
      vod_id: String(item.aid || ""),
      vod_name: String(item.title || "").replace(/<[^>]*>/g, ""),
      vod_pic: fixCover(item.pic),
      vod_remarks: formatDuration(item.duration),
    }));

    return {
      class: CLASSES,
      list,
    };
  } catch (error) {
    logError("首页获取失败", error);
    return { class: CLASSES, list: [] };
  }
}

async function category(params) {
  const keyword = params.categoryId || "";
  const page = Math.max(1, parseInt(params.page, 10) || 1);
  if (!keyword) {
    return { page: 1, pagecount: 0, total: 0, list: [] };
  }

  try {
    const { data } = await axios.get("https://api.bilibili.com/x/web-interface/search/type", {
      headers: BILI_HEADERS,
      params: {
        search_type: "video",
        keyword,
        page,
      },
    });

    const list = (data?.data?.result || [])
      .filter((item) => item.type === "video")
      .map((item) => ({
        vod_id: String(item.aid || ""),
        vod_name: String(item.title || "").replace(/<[^>]*>/g, ""),
        vod_pic: fixCover(item.pic),
        vod_remarks: formatSearchDuration(item.duration),
      }));

    return {
      page,
      pagecount: data?.data?.numPages || 1,
      total: data?.data?.numResults || list.length,
      list,
    };
  } catch (error) {
    logError("分类获取失败", error);
    return { page, pagecount: 0, total: 0, list: [] };
  }
}

async function search(params) {
  return category({
    categoryId: params.keyword || params.wd || "",
    page: params.page,
  });
}

async function detail(params) {
  const videoId = params.videoId;
  if (!videoId) return { list: [] };

  try {
    const { data } = await axios.get(`https://api.bilibili.com/x/web-interface/view?aid=${videoId}`, {
      headers: BILI_HEADERS,
    });

    const video = data?.data;
    if (!video) return { list: [] };

    const episodes = (video.pages || []).map((p, i) => {
      const part = p.part || `第${i + 1}集`;
      return {
        name: part,
        playId: `${videoId}_${p.cid}|${video.title || ""}|${part}`,
      };
    });

    return {
      list: [
        {
          vod_id: String(videoId),
          vod_name: String(video.title || "").replace(/<[^>]*>/g, ""),
          vod_pic: fixCover(video.pic),
          vod_content: String(video.desc || ""),
          vod_play_sources: [
            {
              name: "B站视频",
              episodes,
            },
          ],
        },
      ],
    };
  } catch (error) {
    logError("详情获取失败", error);
    return { list: [] };
  }
}

async function play(params) {
  let playId = params.playId || "";
  const flag = params.flag || "";

  if (!playId) {
    return { urls: [], parse: 1, header: {}, flag };
  }

  let vodName = "";
  let episodeName = "";

  if (playId.includes("|")) {
    const parts = playId.split("|");
    playId = parts[0] || "";
    vodName = parts[1] || "";
    episodeName = parts[2] || "";
  }

  const idParts = playId.split("_");
  if (idParts.length < 2) {
    return {
      urls: [{ name: "播放", url: playId }],
      parse: /\.(m3u8|mp4|flv)$/i.test(playId) ? 0 : 1,
      header: {},
      flag,
    };
  }

  const avid = idParts[0];
  const cid = idParts[1];
  const loggedIn = isLoggedIn();

  const qualityList = loggedIn
    ? [127, 126, 125, 120, 116, 112, 80, 74, 64, 32, 16]
    : [80, 64, 32, 16];

  const headers = {
    ...BILI_HEADERS,
    Referer: `https://www.bilibili.com/video/av${avid}`,
    Origin: "https://www.bilibili.com",
  };

  const qualitySet = new Set();
  const availableQualities = [];

  for (const qn of qualityList) {
    const useDash = qn > 116;
    try {
      const { data } = await axios.get("https://api.bilibili.com/x/player/playurl", {
        headers,
        params: {
          avid,
          cid,
          qn,
          fnval: useDash ? 4048 : 1,
          fourk: qn >= 120 ? 1 : 0,
          ...(!loggedIn ? { try_look: 1 } : {}),
        },
      });

      if (data?.code !== 0 || !data?.data) continue;

      const payload = data.data;
      const actualQn = payload.quality || qn;
      if (qualitySet.has(actualQn)) continue;
      qualitySet.add(actualQn);

      if (payload.dash?.video?.length) {
        const bestVideo = [...payload.dash.video].sort((a, b) => {
          if ((b.id || 0) !== (a.id || 0)) return (b.id || 0) - (a.id || 0);
          if ((b.bandwidth || 0) !== (a.bandwidth || 0)) return (b.bandwidth || 0) - (a.bandwidth || 0);
          return (b.width || 0) - (a.width || 0);
        })[0];

        const bestAudio = [...(payload.dash.audio || [])].sort((a, b) => (b.bandwidth || 0) - (a.bandwidth || 0))[0];

        if (bestVideo) {
          availableQualities.push({
            name: QUALITY_NAME_MAP[actualQn] || `DASH ${bestVideo.width || "?"}p`,
            url: bestVideo.base_url || bestVideo.baseUrl,
            qn: actualQn,
            audioUrl: bestAudio?.base_url || bestAudio?.baseUrl || "",
          });
        }
      } else if (payload.durl?.[0]?.url) {
        availableQualities.push({
          name: QUALITY_NAME_MAP[actualQn] || `画质${actualQn}`,
          url: payload.durl[0].url,
          qn: actualQn,
          audioUrl: "",
        });
      }
    } catch {
      // 忽略单个画质异常，继续尝试其他画质
    }
  }

  if (availableQualities.length === 0) {
    return {
      urls: [{ name: "播放", url: playId }],
      parse: 1,
      header: headers,
      flag,
    };
  }

  availableQualities.sort((a, b) => b.qn - a.qn);

  const urls = availableQualities.map((q) => ({
    name: q.name,
    url: q.url,
  }));

  const response = {
    urls,
    parse: 0,
    header: {
      "User-Agent": headers["User-Agent"],
      Referer: headers.Referer,
      Origin: headers.Origin,
    },
    flag,
  };

  // 兼容保留：如果是 DASH，带上最佳音轨供支持方使用
  if (availableQualities[0]?.audioUrl) {
    response.extra = { audio: availableQualities[0].audioUrl };
  }

  // 弹幕：优先 B 站原有逻辑；无 cid 时回退 4KVM 风格匹配
  let fileName = buildFileNameForDanmu(vodName || params.vodName || "", episodeName || params.episodeName || "");
  if (!fileName && urls[0]?.url) {
    fileName = inferFileNameFromURL(urls[0].url);
  }
  const danmaku = await matchDanmu(fileName, cid);
  if (danmaku.length > 0) {
    response.danmaku = danmaku;
  }

  return response;
}

module.exports = {
  home,
  category,
  search,
  detail,
  play,
};

const runner = require("spider_runner");
runner.run(module.exports);
