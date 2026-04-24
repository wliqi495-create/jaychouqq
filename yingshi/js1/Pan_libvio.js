//@name:[盘] LibVio
//@version:4
//@webSite:https://libvio.mov/
//@order:A04
//@codeID:
//@env:
//@isAV:0
//@deprecated:0

const appConfig = {
  _webSite: 'https://libvio.mov',
  /**
   * 网站主页，uz 调用每个函数前都会进行赋值操作
   * 如果不想被改变 请自定义一个变量
   */
  get webSite() {
    return this._webSite
  },
  set webSite(value) {
    this._webSite = value
  },

  _uzTag: '',
  /**
   * 扩展标识，初次加载时，uz 会自动赋值，请勿修改
   * 用于读取环境变量
   */
  get uzTag() {
    return this._uzTag
  },
  set uzTag(value) {
    this._uzTag = value
  },
}

/** 统一 UA */
function getUA() {
  return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

/** 统一请求头 */
function getHeaders() {
  return {
    Referer: appConfig.webSite,
    'User-Agent': getUA(),
  }
}

/**
 * 异步获取分类列表的方法。
 * @param {UZArgs} args
 * @returns {@Promise<JSON.stringify(new RepVideoClassList())>}
 */
async function getClassList(args) {
  var backData = new RepVideoClassList()
  try {
    backData.data = [
      { type_id: '1', type_name: '电影', hasSubclass: false },
      { type_id: '2', type_name: '剧集', hasSubclass: false },
      { type_id: '3', type_name: '综艺', hasSubclass: false },
      { type_id: '4', type_name: '动漫', hasSubclass: false },
    ]
  } catch (error) {
    backData.error = error.toString()
  }
  return JSON.stringify(backData)
}

/**
 * 获取二级分类列表筛选列表的方法。
 * @param {UZArgs} args
 * @returns {@Promise<JSON.stringify(new RepVideoSubclassList())>}
 */
async function getSubclassList(args) {
  var backData = new RepVideoSubclassList()
  try {
  } catch (error) {
    backData.error = error.toString()
  }
  return JSON.stringify(backData)
}

/**
 * 获取分类视频列表
 * @param {UZArgs} args
 * @returns {@Promise<JSON.stringify(new RepVideoList())>}
 */
async function getVideoList(args) {
  var backData = new RepVideoList()
  try {
    const url = `${appConfig.webSite}/type/${args.url}-${args.page || 1}.html`

    const response = await req(url)
    const $ = cheerio.load(response.data)

    $('.stui-vodlist li').each((_, element) => {
      const video = new VideoDetail()

      const $link = $(element).find('a').first()
      // 提取视频ID
      video.vod_id = ($link.attr('href')).match(/\/detail\/(\d+)\.html/i)?.[1]
      // 视频名称
      video.vod_name = $link.attr('title')
      // 封面图片 
      video.vod_pic = $link.attr('data-original')
      // 状态信息 
      video.vod_remarks = $link.find('.pic-text').first().text()
      // 评分信息
      const scores = $link.find('.pic-tag').first().text()
      if (scores !== '0.0') {
        video.topRightRemarks = '豆瓣 ' + scores
        video.vod_douban_score = '豆瓣 ' + scores
      }

      backData.data.push(video)
    })
  } catch (error) {
    backData.error = error.toString()
  }
  return JSON.stringify(backData)
}

/**
 * 获取二级分类视频列表 或 筛选视频列表
 * @param {UZSubclassVideoListArgs} args
 * @returns {@Promise<JSON.stringify(new RepVideoList())>}
 */
async function getSubclassVideoList(args) {
  var backData = new RepVideoList()
  try {
  } catch (error) {
    backData.error = error.toString()
  }
  return JSON.stringify(backData)
}

/**
 * 获取视频详情
 * @param {UZArgs} args
 * @returns {@Promise<JSON.stringify(new RepVideoDetail())>}
 */
async function getVideoDetail(args) {
  var backData = new RepVideoDetail()
  try {
    const url = `${appConfig.webSite}/detail/${args.url}.html`

    const response = await req(url)
    const $ = cheerio.load(response.data)

    const video = new VideoDetail()
    // 提取视频ID
    video.vod_id = args.url
    // 视频名称
    vodName = $('h1.title').text()
    if (vodName) {
      video.vod_name = vodName
    } else {
      throw new Error('请刷新重试')
    }

    // 封面图片 
    video.vod_pic = $('img.lazyload').attr('data-original') || $('img.lazyload').attr('src')
    // 视频简介
    video.vod_content = $('.detail-content').text()


    const playFromList = []
    const playUrlList = []
    const panUrls = []

    $('.playlist-panel').each((_, panel) => {
      const $panel = $(panel)
      // 获取普通播放线路名字
      const rawName = $panel.find('.panel-head h3').first().text()

      // 获取普通播放线路：ul li a
      const episodes = []
      $panel.find('ul li a').each((__, a) => {
        const epName = $(a).text()
        const href = $(a).attr('href')
        if (epName && href) episodes.push(`${epName}$${href}`)
      })

      if (episodes.length > 0) {
        playFromList.push(rawName)
        playUrlList.push(episodes.join('#'))
      }

      // 获取网盘线路：a.netdisk-item
      $panel.find('a.netdisk-item').each((__, a) => {
        const href = $(a).attr('href')
        if (href) panUrls.push(href)
      })
    })

    video.panUrls = Array.from(new Set(panUrls))
    video.vod_play_from = playFromList.join('$$$')
    video.vod_play_url = playUrlList.join('$$$')
    backData.data = video
  } catch (error) {
    backData.error = error.toString()
  }
  return JSON.stringify(backData)
}

/**
 * 获取视频的播放地址
 * @param {UZArgs} args
 * @returns {@Promise<JSON.stringify(new RepVideoPlayUrl())>}
 */
async function getVideoPlayUrl(args) {
  var backData = new RepVideoPlayUrl()
  try {
    // let webSite = appConfig.webSite
    // const inputUrl = (args.url).trim()
    const fullUrl = appConfig.webSite.replace(/\/$/, '') + args.url
    const fromName = ((args.from || args.flag) + '').toUpperCase()
    const headers = getHeaders()

    // 仅对BD5线路进行特殊处理
    if (fromName.includes('BD5')) {
      const response = await req(fullUrl, { headers })
      const $ = cheerio.load(response.data)

      // 提取并解析player_aaaa
      const scriptContent = $('.stui-player__video script').first().html()
      const match = scriptContent.match(/player_aaaa\s*=\s*(\{[^}]+\})/i)

      let player = JSON.parse(match[1].trim())

      const proxyUrl = `${appConfig.webSite}/vid/plyr/vr2.php?url=${encodeURIComponent(player.url)}&next=${encodeURIComponent(player.link_next)}&id=${encodeURIComponent(player.id)}&nid=${encodeURIComponent(player.nid)}`
      const proxyResp = await req(proxyUrl, { headers })

      let finalUrl = player.url
      for (const name of ['urls', 'url', 'vid']) {
        const m = (proxyResp.data).match(new RegExp(`(?:var|let|const)\\s+${name}\\s*=\\s*["']([^"']+)["']`, 'i'))
        if (m?.[1]) {
          finalUrl = m[1].replace(/\\\//g, '/').replace(/\\\\/g, '\\')
          break
        }
      }

      backData.url = finalUrl
      backData.headers = headers
    } else {
      // 其他线路使用嗅探
      backData.sniffer = {
        url: fullUrl,
        ua: getUA(),
        timeOut: 15,
        retry: 2
      }
      backData.headers = getHeaders()
    }
  } catch (error) {
    backData.error = error.toString()
  }
  return JSON.stringify(backData)
}

/**
 * 搜索视频
 * @param {UZArgs} args
 * @returns {@Promise<JSON.stringify(new RepVideoList())>}
 */
async function searchVideo(args) {
  var backData = new RepVideoList()
  try {
    const url = `${appConfig.webSite}/search/${encodeURIComponent(args.searchWord)}----------${args.page || 1}---.html`

    const response = await req(url)
    const $ = cheerio.load(response.data)

    $('.stui-vodlist li').each((_, element) => {
      const video = new VideoDetail()

      const $link = $(element).find('a').first()
      // 提取视频ID
      video.vod_id = ($link.attr('href')).match(/\/detail\/(\d+)\.html/i)?.[1]
      // 视频名称
      video.vod_name = $link.attr('title')
      // 封面图片 
      video.vod_pic = $link.attr('data-original')
      // 状态信息 
      video.vod_remarks = $link.find('.pic-text').first().text()
      // 评分信息
      const scores = $link.find('.pic-tag').first().text()
      if (scores !== '0.0') {
        video.topRightRemarks = '豆瓣 ' + scores
        video.vod_douban_score = '豆瓣 ' + scores
      }

      backData.data.push(video)
    })
  } catch (error) {
    backData.error = error.toString()
  }
  return JSON.stringify(backData)
}