/*
@header({
  searchable: 1,
  filterable: 1,
  quickSearch: 1,
  title: '瓜子',
  lang: 'cat'
})
*/
import { Crypto as CryptoJS } from "assets://js/lib/cat.js"
let siteName = "瓜子",
  siteKey = "",
  siteType = 0
let host = "https://api.w32z7vtd.com"
let token =
  "1be86e8e18a9fa18b2b8d5432699dad0.ac008ed650fd087bfbecf2fda9d82e9835253ef24843e6b18fcd128b10763497bcf9d53e959f5377cde038c20ccf9d17f604c9b8bb6e61041def86729b2fc7408bd241e23c213ac57f0226ee656e2bb0a583ae0e4f3bf6c6ab6c490c9a6f0d8cdfd366aacf5d83193671a8f77cd1af1ff2e9145de92ec43ec87cf4bdc563f6e919fe32861b0e93b118ec37d8035fbb3c.59dd05c5d9a8ae726528783128218f15fe6f2c0c8145eddab112b374fcfe3d79"
const headers = {
  "Cache-Control": "no-cache",
  Version: "2406025",
  PackageName: "com.uf076bf0c246.qe439f0d5e.m8aaf56b725a.ifeb647346f",
  Ver: "1.9.2",
  Referer: host,
  "Content-Type": "application/x-www-form-urlencoded",
  "User-Agent": "okhttp/3.12.0",
}

const private_key = `-----BEGIN PRIVATE KEY-----
MIICdgIBADANBgkqhkiG9w0BAQEFAASCAmAwggJcAgEAAoGAe6hKrWLi1zQmjTT1
ozbE4QdFeJGNxubxld6GrFGximxfMsMB6BpJhpcTouAqywAFppiKetUBBbXwYsYU
1wNr648XVmPmCMCy4rY8vdliFnbMUj086DU6Z+/oXBdWU3/b1G0DN3E9wULRSwcK
ZT3wj/cCI1vsCm3gj2R5SqkA9Y0CAwEAAQKBgAJH+4CxV0/zBVcLiBCHvSANm0l7
HetybTh/j2p0Y1sTXro4ALwAaCTUeqdBjWiLSo9lNwDHFyq8zX90+gNxa7c5EqcW
V9FmlVXr8VhfBzcZo1nXeNdXFT7tQ2yah/odtdcx+vRMSGJd1t/5k5bDd9wAvYdI
DblMAg+wiKKZ5KcdAkEA1cCakEN4NexkF5tHPRrR6XOY/XHfkqXxEhMqmNbB9U34
saTJnLWIHC8IXys6Qmzz30TtzCjuOqKRRy+FMM4TdwJBAJQZFPjsGC+RqcG5UvVM
iMPhnwe/bXEehShK86yJK/g/UiKrO87h3aEu5gcJqBygTq3BBBoH2md3pr/W+hUM
WBsCQQChfhTIrdDinKi6lRxrdBnn0Ohjg2cwuqK5zzU9p/N+S9x7Ck8wUI53DKm8
jUJE8WAG7WLj/oCOWEh+ic6NIwTdAkEAj0X8nhx6AXsgCYRql1klbqtVmL8+95KZ
K7PnLWG/IfjQUy3pPGoSaZ7fdquG8bq8oyf5+dzjE/oTXcByS+6XRQJAP/5ciy1b
L3NhUhsaOVy55MHXnPjdcTX0FaLi+ybXZIfIQ2P4rb19mVq1feMbCXhz+L1rG8oa
t5lYKfpe8k83ZA==
-----END PRIVATE KEY-----`

let cache = {}
let cache_timeout = 300000 // 5分钟

async function init(cfg) {
  siteName = cfg.skey?.split("_")[1] || cfg.skey || "瓜子"
  siteKey = cfg.skey
  siteType = cfg.stype
}

function aes_encrypt(text, k, i) {
  if (typeof aesX === "function") {
    try {
      const res = aesX("CBC", true, text, false, k, i, false)
      if (res) return res.toUpperCase()
    } catch (e) {
      console.error("aesX failed:", e)
    }
  }
  const key = CryptoJS.enc.Utf8.parse(k)
  const iv = CryptoJS.enc.Utf8.parse(i)
  const encrypted = CryptoJS.AES.encrypt(text, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  })
  return encrypted.ciphertext.toString(CryptoJS.enc.Hex).toUpperCase()
}

function aes_decrypt(text, k, i) {
  if (typeof aesX === "function") {
    try {
      const res = aesX("CBC", false, text, false, k, i, false)
      if (res) return res
    } catch (e) {
      console.error("aesX failed:", e)
    }
  }
  const key = CryptoJS.enc.Utf8.parse(k)
  const iv = CryptoJS.enc.Utf8.parse(i)
  const encryptedHexStr = CryptoJS.enc.Hex.parse(text)
  const srcs = CryptoJS.lib.CipherParams.create({ ciphertext: encryptedHexStr })
  const decrypt = CryptoJS.AES.decrypt(srcs, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  })
  return decrypt.toString(CryptoJS.enc.Utf8)
}

function rsa_decrypt(encrypted_data) {
  if (typeof rsaX === "function") {
    try {
      return rsaX(
        "PKCS1Padding",
        false,
        false,
        encrypted_data,
        true,
        private_key,
        false,
      )
    } catch (e) {
      console.error("rsaX failed:", e)
    }
  }
  try {
    if (typeof rsa !== "undefined" && rsa.decrypt) {
      return rsa.decrypt(encrypted_data, private_key, 0) // try drpy rsa util
    } else if (typeof JSEncrypt !== "undefined") {
      const encrypt = new JSEncrypt()
      encrypt.setPrivateKey(private_key)
      return encrypt.decrypt(encrypted_data)
    } else if (typeof RSA !== "undefined" && RSA.decrypt) {
      return RSA.decrypt(encrypted_data, private_key, true)
    } else {
      console.error("No RSA decryption method found in JS environment")
      return ""
    }
  } catch (e) {
    console.error("RSA解密失败:", e)
    return ""
  }
}

function md5(text) {
  if (typeof md5X === "function") {
    return md5X(text)
  }
  return CryptoJS.MD5(text).toString()
}

async function request(url, options = {}) {
  const reqHeaders = { ...headers, ...options.headers }
  try {
    const response = await req(url, {
      method: options.method || "GET",
      headers: reqHeaders,
      data: options.data,
      postType: "form",
      timeout: options.timeout || 10000,
    })
    return response?.content || response?.data || response
  } catch (e) {
    return null
  }
}

async function get_data(data, path, use_cache = true) {
  try {
    const dataStr = JSON.stringify(data)
    const cache_key = path + "_" + md5(dataStr)
    const current_time = new Date().getTime()

    if (use_cache && cache[cache_key]) {
      if (current_time - cache[cache_key].timestamp < cache_timeout) {
        return cache[cache_key].data
      }
    }

    const request_key = aes_encrypt(
      dataStr,
      "mvXBSW7ekreItNsT",
      "2U3IrJL8szAKp0Fj",
    )
    if (!request_key) return null

    const t = Math.floor(new Date().getTime() / 1000).toString()
    const keys =
      "Qmxi5ciWXbQzkr7o+SUNiUuQxQEf8/AVyUWY4T/BGhcXBIUz4nOyHBGf9A4KbM0iKF3yp9M7WAY0rrs5PzdTAOB45plcS2zZ0wUibcXuGJ29VVGRWKGwE9zu2vLwhfgjTaaDpXo4rby+7GxXTktzJmxvneOUdYeHi+PZsThlvPI="
    const sign_str = `token_id=,token=${token},phone_type=1,request_key=${request_key},app_id=1,time=${t},keys=${keys}*&zvdvdvddbfikkkumtmdwqppp?|4Y!s!2br`
    const signature = md5(sign_str)

    const body = {
      token: token,
      token_id: "",
      phone_type: "1",
      time: t,
      phone_model: "xiaomi-22021211rc",
      keys: keys,
      request_key: request_key,
      signature: signature,
      app_id: "1",
      ad_version: "1",
    }

    const url = host + path
    const html = await request(url, {
      method: "POST",
      data: body,
    })

    if (!html) return null

    let response_data
    try {
      response_data = JSON.parse(html)
    } catch (e) {
      return null
    }

    if (!response_data.data) return null

    const bodyki_json = rsa_decrypt(response_data.data.keys)
    if (!bodyki_json) {
      console.error("RSA解密失败")
      return null
    }

    let bodyki
    try {
      bodyki = JSON.parse(bodyki_json)
    } catch (e) {
      return null
    }

    const decrypted_data = aes_decrypt(
      response_data.data.response_key,
      bodyki.key,
      bodyki.iv,
    )
    if (!decrypted_data) return null

    const result = JSON.parse(decrypted_data)

    if (use_cache) {
      cache[cache_key] = {
        data: result,
        timestamp: new Date().getTime(),
      }
    }

    return result
  } catch (e) {
    console.error("获取数据失败: ", e)
    return null
  }
}

async function home(filter) {
  const classes = [
    { type_name: "电影", type_id: "1" },
    { type_name: "电视剧", type_id: "2" },
    { type_name: "动漫", type_id: "4" },
    { type_name: "综艺", type_id: "3" },
    { type_name: "短剧", type_id: "64" },
  ]

  let filtersObj = {}
  const filtersArray = [
    {
      key: "area",
      name: "地区",
      value: [
        { n: "全部", v: "0" },
        { n: "大陆", v: "大陆" },
        { n: "香港", v: "香港" },
        { n: "台湾", v: "台湾" },
        { n: "美国", v: "美国" },
        { n: "韩国", v: "韩国" },
        { n: "日本", v: "日本" },
        { n: "英国", v: "英国" },
        { n: "法国", v: "法国" },
        { n: "泰国", v: "泰国" },
        { n: "印度", v: "印度" },
        { n: "其他", v: "其他" },
      ],
    },
    {
      key: "year",
      name: "年份",
      value: [
        { n: "全部", v: "0" },
        { n: "2025", v: "2025" },
        { n: "2024", v: "2024" },
        { n: "2023", v: "2023" },
        { n: "2022", v: "2022" },
        { n: "2021", v: "2021" },
        { n: "2020", v: "2020" },
        { n: "2019", v: "2019" },
        { n: "2018", v: "2018" },
        { n: "2017", v: "2017" },
        { n: "2016", v: "2016" },
        { n: "2015", v: "2015" },
        { n: "2014", v: "2014" },
        { n: "2013", v: "2013" },
        { n: "2012", v: "2012" },
        { n: "更早", v: "2004" },
      ],
    },
    {
      key: "sort",
      name: "排序",
      value: [
        { n: "最新", v: "d_id" },
        { n: "最热", v: "d_hits" },
        { n: "推荐", v: "d_score" },
      ],
    },
  ]

  classes.forEach((cate) => {
    filtersObj[cate.type_id] = filtersArray
  })

  return JSON.stringify({ class: classes, filters: filtersObj })
}

async function homeVod() {
  return JSON.stringify({ list: [] })
}

async function category(tid, pg, filter, extend) {
  let videos = []
  try {
    let extendParams = extend || {}
    const body = {
      area: extendParams.area || "0",
      year: extendParams.year || "0",
      pageSize: "30",
      sort: extendParams.sort || "d_id",
      page: pg.toString(),
      tid: tid.toString(),
    }

    const data = await get_data(body, "/App/IndexList/indexList")

    if (data && data.list) {
      data.list.forEach((item) => {
        const vod_continu = item.vod_continu || 0
        const remarks = vod_continu === 0 ? "电影" : `更新至${vod_continu}集`

        videos.push({
          vod_id: `${item.vod_id || ""}/${vod_continu}`,
          vod_name: item.vod_name || "",
          vod_pic: item.vod_pic || "",
          vod_remarks: remarks,
        })
      })
    }
  } catch (e) {
    console.error("获取分类内容失败:", e)
  }

  return JSON.stringify({
    list: videos,
    page: parseInt(pg),
    pagecount: 9999,
    limit: 30,
    total: 999999,
  })
}

async function detail(id) {
  try {
    const vod_id = id.split("/")[0]
    const t = Math.floor(new Date().getTime() / 1000).toString()

    const body1 = {
      token_id: "1649412",
      vod_id: vod_id,
      mobile_time: t,
      token: token,
    }

    const body2 = {
      vurl_cloud_id: "2",
      vod_d_id: vod_id,
    }

    const [qdata, jdata] = await Promise.all([
      get_data(body1, "/App/IndexPlay/playInfo"),
      get_data(body2, "/App/Resource/Vurl/show"),
    ])

    if (!qdata || !qdata.vodInfo) {
      return JSON.stringify({ list: [] })
    }

    const vod = qdata.vodInfo
    const video_detail = {
      vod_id: vod_id,
      vod_name: vod.vod_name || "",
      vod_pic: vod.vod_pic || "",
      vod_year: vod.vod_year || "",
      vod_area: vod.vod_area || "",
      vod_actor: vod.vod_actor || "",
      vod_director: vod.vod_director || "",
      vod_content: (vod.vod_use_content || "").trim(),
      vod_play_from: "慕城",
    }

    let play_list = []
    if (jdata && jdata.list) {
      jdata.list.forEach((item, index) => {
        if (item.play) {
          let n = []
          let p = []
          for (let key in item.play) {
            const value = item.play[key]
            if (value && value.param) {
              n.push(key)
              p.push(value.param)
            }
          }
          if (p.length > 0) {
            let play_name = (index + 1).toString()
            if (jdata.list.length === 1) {
              play_name = vod.vod_name || ""
            }
            const play_url = `${p[p.length - 1]}||${n.join("@")}`
            play_list.push(`${play_name}$${play_url}`)
          }
        }
      })
    }

    video_detail.vod_play_url = play_list.join("#")
    return JSON.stringify({ list: [video_detail] })
  } catch (e) {
    console.error("获取详情失败:", e)
    return JSON.stringify({ list: [] })
  }
}

async function search(wd, quick, pg) {
  let videos = []
  try {
    const body = {
      keywords: wd,
      order_val: "1",
      page: (pg || 1).toString(),
    }

    const data = await get_data(body, "/App/Index/findMoreVod", false)

    if (data && data.list) {
      data.list.forEach((item) => {
        const vod_continu = item.vod_continu || 0
        const remarks = vod_continu === 0 ? "电影" : `更新至${vod_continu}集`

        videos.push({
          vod_id: `${item.vod_id || ""}/${vod_continu}`,
          vod_name: item.vod_name || "",
          vod_pic: item.vod_pic || "",
          vod_remarks: remarks,
        })
      })
    }
  } catch (e) {
    console.error("搜索失败:", e)
  }

  return JSON.stringify({
    list: videos,
    page: parseInt(pg || 1),
    pagecount: 9999,
    limit: 30,
    total: 999999,
  })
}

async function play(flag, id, flags) {
  try {
    const parts = id.split("||")
    if (parts.length < 2) {
      return JSON.stringify({ parse: 0, playUrl: "", url: "" })
    }

    const param_str = parts[0]
    let resolutions = parts.length > 1 ? parts[1].split("@") : []

    let params = {}
    param_str.split("&").forEach((pair) => {
      if (pair.includes("=")) {
        const [key, value] = pair.split("=")
        params[key] = value
      }
    })

    if (resolutions.length > 0) {
      resolutions.sort((a, b) => {
        const numA = parseInt(a)
        const numB = parseInt(b)
        if (!isNaN(numA) && !isNaN(numB)) return numB - numA
        return 0
      })

      params["resolution"] = resolutions[0]
      const data = await get_data(
        params,
        "/App/Resource/VurlDetail/showOne",
        false,
      )

      if (data && data.url) {
        return JSON.stringify({
          parse: 0,
          url: data.url,
          header: {
            "User-Agent": "Lavf/57.83.100",
          },
        })
      }
    }
    return JSON.stringify({ parse: 0, playUrl: "", url: "" })
  } catch (e) {
    console.error("播放解析失败:", e)
    return JSON.stringify({ parse: 0, playUrl: "", url: "" })
  }
}

export function __jsEvalReturn() {
  return { init, home, homeVod, category, detail, play, search }
}
