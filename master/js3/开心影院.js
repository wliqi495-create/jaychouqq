// 从fongmi/ok壳子内置目录加载cheerio 或者本地自备
import cheerio from 'assets://js/lib/cheerio.min.js';
// import cheerio from '../lib/cheerio.min.js';

const sites = [
    'https://www.kxyy1.cc',
    'https://www.kxyy2.cc',
    'https://www.kxyy3.cc',
    'https://www.kxyy4.cc',
    'https://www.kxyy5.cc',
    'https://www.kxyy6.cc',
    'https://www.kxyy7.cc',
    'https://www.kxyy8.cc',
    'https://www.kxyy9.cc',
]

function safeJsonParse(json) {
    try {
        return typeof json === "string" ? JSON.parse(json) : json;
    } catch (e) {
        return json;
    }
}
async function myFetch(url, options = {}) {
    let res = null;
    try {
        res = await req(url, {
            method: options?.method || "get",
            ...options
        })
        return safeJsonParse(res?.content)
    } catch (err) {
        mylog("myfetch err ", err)
        return res?.content
    }
}

const OrderByFilter = {
    "key": "orderby",
    "name": "排序",
    "value": [
        { "n": "默认排序", "v": "" },
        { "n": "更新时间", "v": "time" },
        { "n": "近期热门", "v": "hits_week" },
        { "n": "豆瓣评分", "v": "douban_score" }
    ]
}
function getFilter() {
    return {
        "1": [
            {
                "key": "type",
                "name": "类别",
                "value": [
                    { "n": "默认类别", "v": "" },
                    { "n": "科幻", "v": "科幻" },
                    { "n": "剧情", "v": "剧情" },
                    { "n": "惊悚", "v": "惊悚" },
                    { "n": "爱情", "v": "爱情" },
                    { "n": "古装", "v": "古装" },
                    { "n": "动作", "v": "动作" },
                    { "n": "悬疑", "v": "悬疑" },
                    { "n": "犯罪", "v": "犯罪" },
                    { "n": "谍战", "v": "谍战" },
                    { "n": "历史", "v": "历史" },
                    { "n": "喜剧", "v": "喜剧" },
                    { "n": "奇幻", "v": "奇幻" },
                    { "n": "家庭", "v": "家庭" },
                    { "n": "青春", "v": "青春" },
                    { "n": "冒险", "v": "冒险" },
                    { "n": "纪录", "v": "纪录" },
                    { "n": "动画", "v": "动画" },
                    { "n": "人物", "v": "人物" },
                    { "n": "文化", "v": "文化" },
                    { "n": "其他", "v": "其他" }
                ]
            }, OrderByFilter
        ],
        "2": [
            {
                "key": "type",
                "name": "类型",
                "value": [
                    { "n": "不限", "v": "" },
                    { "n": "爱情", "v": "爱情" },
                    { "n": "古装", "v": "古装" },
                    { "n": "悬疑", "v": "悬疑" },
                    { "n": "都市", "v": "都市" },
                    { "n": "喜剧", "v": "喜剧" },
                    { "n": "战争", "v": "战争" },
                    { "n": "剧情", "v": "剧情" },
                    { "n": "青春", "v": "青春" },
                    { "n": "历史", "v": "历史" },
                    { "n": "网剧", "v": "网剧" },
                    { "n": "奇幻", "v": "奇幻" },
                    { "n": "冒险", "v": "冒险" },
                    { "n": "励志", "v": "励志" },
                    { "n": "犯罪", "v": "犯罪" },
                    { "n": "商战", "v": "商战" },
                    { "n": "恐怖", "v": "恐怖" },
                    { "n": "穿越", "v": "穿越" },
                    { "n": "农村", "v": "农村" },
                    { "n": "人物", "v": "人物" },
                    { "n": "商业", "v": "商业" },
                    { "n": "生活", "v": "生活" },
                    { "n": "其他", "v": "其他" }
                ]
            }, OrderByFilter
        ],
        "4": [
            {
                "key": "type",
                "name": "类型",
                "value": [
                    { "n": "不限", "v": "" },
                    { "n": "少年", "v": "少年" },
                    { "n": "热血", "v": "热血" },
                    { "n": "科幻", "v": "科幻" },
                    { "n": "冒险", "v": "冒险" },
                    { "n": "动画", "v": "动画" },
                    { "n": "爱情", "v": "爱情" },
                    { "n": "奇幻", "v": "奇幻" },
                    { "n": "武侠", "v": "武侠" },
                    { "n": "悬疑", "v": "悬疑" },
                    { "n": "惊悚", "v": "惊悚" },
                    { "n": "剧情", "v": "剧情" },
                    { "n": "音乐", "v": "音乐" },
                    { "n": "恐怖", "v": "恐怖" },
                    { "n": "喜剧", "v": "喜剧" },
                    { "n": "儿童", "v": "儿童" }
                ]
            }, OrderByFilter
        ],
        "3": [
            {
                "key": "type",
                "name": "类型",
                "value": [
                    { "n": "不限", "v": "" },
                    { "n": "真人秀", "v": "真人秀" },
                    { "n": "脱口秀", "v": "脱口秀" },
                    { "n": "喜剧", "v": "喜剧" },
                    { "n": "音乐", "v": "音乐" },
                    { "n": "爱情", "v": "爱情" },
                    { "n": "家庭", "v": "家庭" },
                    { "n": "歌舞", "v": "歌舞" }
                ]
            }, OrderByFilter
        ],
        "26": [OrderByFilter],
        "24": [OrderByFilter],
    }
}

function mylog() {
    const TAG = "开心影院js";
    console.log(TAG, ...arguments)
}
const baseUrl = sites[5];
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";
async function init(ext) { }
async function homeVod() {
}
async function _parseVodList(url) {
    try {
        const html = await myFetch(url)
        const $ = cheerio.load(html)
        const list = []
        // 遍历列表中的每一项
        $('.row.row-cards > div').each((index, el) => {
            const $el = $(el);
            let vod_id = $el.find('a.cover2').attr('href') || ''
            // 提取图片地址
            let vod_pic = $el.find('img').attr('src') || ''

            let vod_name = $el.find('.card-title').text().trim() || ''

            let vod_remarks = $el.find('.badge').text().trim() || ''

            let vod_year = $el.find('.card-body p.text-muted').text().trim() || '';

            const vod = {
                vod_id,
                vod_pic,
                vod_name,
                vod_remarks,
                vod_year
            }
            if (vod_name) {
                list.push(vod)
            }
        })
        return JSON.stringify({ list })
    } catch (error) {
        return JSON.stringify({ msg: error.message })
    }
}

async function home(isUseFilter) {
    return JSON.stringify({
        class: [
            { id: "1", name: "电影", },
            { id: "2", name: "剧集", },
            { id: "4", name: "动漫", },
            { id: "3", name: "综艺", },
            { id: "26", name: "短剧", },
            { id: "24", name: "纪录片", },

        ],
        filters: getFilter()
    })
}
async function category(tid, pg, filter, ext) {
    // 
    let by = ext?.orderby || 'hits_week'
    let type = ext?.type || filter?.type || ''
    let page = pg || 1
    // vodshow/1--hits_week-剧情-----2---.html
    const url = baseUrl + `/vodshow/${tid}--${by}-${type}-----${page}---.html`
    mylog('category url', url)
    return await _parseVodList(url)

}
async function detail(tid) {
    const url = baseUrl + tid
    mylog('detail url', url)
    return await _parseDetailVod(url)

}

async function _parseDetailVod(url) {
    try {
        const html = await myFetch(url)
        const $ = cheerio.load(html)

        const vod = {
            vod_name: '',
            vod_pic: '',
            vod_remarks: '',
            type_name: '',
            vod_director: '',
            vod_actor: '',
            vod_year: '',
            vod_area: '',
            vod_content: '',
            vod_play_from: '',
            vod_play_url: ''
        }

        // 1. 提取基本信息
        _parseDetailBaseInfo($, vod);

        // 2. 提取线路和剧集（vod_play_from 和 vod_play_url）
        _parseDetailPlayList($, vod);

        // 3. 满足壳子要求的标准格式返回
        return JSON.stringify({ list: [vod] });

    } catch (error) {
        mylog('detail parse error', error)
        return JSON.stringify({ msg: error.message })
    }
}

/**
 * 提取详情基本信息
 */
function _parseDetailBaseInfo($, vod) {
    vod.vod_name = $('h1.d-none.d-md-block').text().trim() || $('h2.d-sm-block.d-md-none').text().trim();
    vod.vod_pic = $('.col-md-auto.col-5.cover-lg-max-25 img').attr('src') || '';
    vod.vod_remarks = $('.text-orange').first().text().trim() || '';

    // 字段数据解析 (根据提供的 HTML 结构提取 p 标签中的强标签和文本)
    $('.col.mb-2 p').each((index, el) => {
        const $p = $(el);
        const strongText = $p.find('strong').text().replace('：', '').trim();

        if (strongText === '导演') {
            const directors = [];
            $p.find('a').each((i, a) => {
                directors.push($(a).text().trim());
            });
            vod.vod_director = directors.join(',');
        } else if (strongText === '主演') {
            const actors = [];
            $p.find('a').each((i, a) => {
                actors.push($(a).text().trim());
            });
            vod.vod_actor = actors.join(',');
        } else if (strongText === '类型') {
            vod.type_name = $p.find('a').text().trim();
        } else if (strongText === '制片国家/地区') {
            let areaText = $p.text().replace('制片国家/地区：', '').trim();
            vod.vod_area = areaText.replace(/[\[\]]/g, '');
        } else if (strongText === '首播' || strongText === '上映时间') {
            let releaseDate = $p.text().replace(strongText + '：', '').trim();
            const match = releaseDate.match(/\d{4}/);
            if (match) {
                vod.vod_year = match[0];
            }
        }
    });

    // 剧情简介
    vod.vod_content = $('#synopsis').text().trim().replace(/\s+/g, ' ') || '';
}

/**
 * 提取详情线路和剧集（vod_play_from 和 vod_play_url）
 */
function _parseDetailPlayList($, vod) {
    const playFromArr = [];
    const playUrlArr = [];

    // 1. 优先解析标签页多线路结构（基于当前提供的选项卡 HTML）
    const tabNavItems = $('.nav.nav-tabs li.nav-item');
    if (tabNavItems.length > 0) {
        tabNavItems.each((index, li) => {
            const $a = $(li).find('a');
            const hrefId = $a.attr('href'); // 例如 "#tabs-home-3"
            // 提取线路名称（去掉后面的 badge 数量文本）
            const fromName = $a.clone().children().remove().end().text().trim() || `线路${index + 1}`;
            playFromArr.push(fromName);

            const episodes = [];
            if (hrefId) {
                // 在对应内容面板中查找所有的剧集链接按钮
                $(`${hrefId} a.btn`).each((i, btn) => {
                    const $btn = $(btn);
                    const name = $btn.text().trim();
                    const href = $btn.attr('href');
                    if (name && href) {
                        episodes.push(`${name}$${href}`);
                    }
                });
            }
            playUrlArr.push(episodes.join('#'));
        });
    }

    // 2. 兼容旧版 ul.playlist 结构
    if (playFromArr.length === 0) {
        $('ul.playlist').each((index, ul) => {
            const fromName = $(ul).siblings('h4').text().trim() || `线路${index + 1}`;
            playFromArr.push(fromName);

            const episodes = [];
            $(ul).find('li').each((i, li) => {
                const val = $(li).find('input').attr('value');
                if (val && val.includes('$')) {
                    episodes.push(val);
                }
            });
            playUrlArr.push(episodes.join('#'));
        });
    }

    // 3. 兜底通用解析
    if (playFromArr.length === 0) {
        playFromArr.push('默认线路');
        const episodes = [];
        $('.play-list a, .anthology-list-play a').each((i, a) => {
            const name = $(a).text().trim();
            const href = $(a).attr('href');
            if (name && href) {
                episodes.push(`${name}$${href}`);
            }
        });
        playUrlArr.push(episodes.join('#'));
    }

    vod.vod_play_from = playFromArr.join('$$$');
    vod.vod_play_url = playUrlArr.join('$$$');
}
async function search(keyword, quick, pg) {

}
async function play(flag, id, vipFlags) {
    return await _parsePlay(id)
}
function isDirectVideoUrl(url) {
    return url.startsWith('http') && (url.includes('.mp4') || url.includes('.m3u8'));
}

async function _parsePlay(id) {
    let playPageUrl = baseUrl + id
    mylog('playPageUrl', playPageUrl)
    try {
        const html = await myFetch(playPageUrl);

        // 直接用正则匹配出 "url": "..." 里的内容
        const urlMatch = html.match(/"url"\s*:\s*"([^"]+)"/);

        if (urlMatch && urlMatch[1]) {
            let  videoUrl = urlMatch[1]; // 直接拿到加密串

            mylog('videoUrl before fix', videoUrl);
            videoUrl = fixUrl(videoUrl); // 解码

            mylog('videoUrl after fix', videoUrl);
            if (isDirectVideoUrl(videoUrl)) {
                mylog('videoUrl is direct video url', videoUrl);
                return JSON.stringify({
                    parse: 0,
                    url: videoUrl
                });
            }

            let get_signed_url = `${baseUrl}/static/player/nby.php?get_signed_url=1&url=${videoUrl}`;
            mylog('get_signed_url', get_signed_url);
            let get_signed_url_res =  await myFetch(get_signed_url);
            mylog('get_signed_url_res', get_signed_url_res);
            const signed_url = get_signed_url_res?.signed_url;
            if (!signed_url) {
                throw new Error("未能获取到签名播放地址");
            }

            let getjmurl = `${baseUrl}/static/player/nby.php` + signed_url;

            let jmurl = (await myFetch(getjmurl))?.jmurl;

            if(!jmurl){
                throw new Error("未能获取到解密后的播放地址");
            }
            jmurl = fixUrl(jmurl);

            mylog('jmurl', jmurl);
            return JSON.stringify({
                parse: 0,
                url: jmurl
            });
        } else {
            throw new Error("未能匹配到player_data的url字段");
        }
    }
    catch (error) {
        mylog('play parse error', error)
        // 统一返回失败格式
        return JSON.stringify({
            parse: 0,
            url: "",
            msg: error.message
        });
    }
}
function fixUrl(url) {
  if (typeof url !== 'string') return '';
  try {
    // 核心：用 JSON.parse 处理 JS 字符串字面量转义（\/ → /, \uXXXX → 中文）
    return JSON.parse(`"${url}"`); // 自动转换 \/ 和 \uXXXX
  } catch {
    return url; // 解析失败时返回原值
  }
}

export default { init, home, homeVod, category, detail, play, search }