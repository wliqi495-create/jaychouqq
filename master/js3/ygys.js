/*
@header({
  searchable: 1,
  filterable: 1,
  quickSearch: 1,
  title: '月光影视',
  lang: 'cat'
})
*/

var HOST;
const MOBILE_UA = 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36';
const DefHeader = {'User-Agent': MOBILE_UA};
const KParams = {
    headers: {'User-Agent': MOBILE_UA},
    timeout: 5000
};

async function init(cfg) {
    try {
        let host = cfg.ext?.host?.trim() || 'https://www.dzwhs.com';
        HOST = host.replace(/\/$/, '');
        KParams.headers['Referer'] = HOST;
        let parseTimeout = parseInt(cfg.ext?.timeout?.trim(), 10);
        KParams.timeout = parseTimeout > 0 ? parseTimeout : 5000;
        KParams.resHtml = await request(HOST);
    } catch (e) {
        console.error('初始化参数失败：', e.message);
    }
}

async function home(filter) {
    try {
        let resHtml = KParams.resHtml;
        let classes = pdfa(resHtml, '.type-slide&&a').slice(1).map(it => {
            let cName = _pdfh(it, 'Text', '分类名');
            let cId = _pdfh(it, 'a&&href').match(/(\d+)/)?.[1] ?? '分类值';
            return {type_name: cName, type_id: cId};
        });
        let filters = {
            "1": [
                {
                    "key": "cateId",
                    "name": "类型",
                    "value": [{"n": "全部", "v": "全部"}, {"n": "动作片", "v": "6"}, {
                        "n": "喜剧片",
                        "v": "7"
                    }, {"n": "爱情片", "v": "8"}, {"n": "科幻片", "v": "9"}, {"n": "恐怖片", "v": "10"}, {
                        "n": "剧情片",
                        "v": "11"
                    }, {"n": "战争片", "v": "12"}, {"n": "纪录片", "v": "13"}, {
                        "n": "悬疑片",
                        "v": "14"
                    }, {"n": "犯罪片", "v": "15"}, {"n": "奇幻片", "v": "16"}, {
                        "n": "动画片",
                        "v": "31"
                    }, {"n": "预告片", "v": "32"}]
                }
            ],
            "2": [
                {
                    "key": "cateId",
                    "name": "类型",
                    "value": [{"n": "全部", "v": "全部"}, {"n": "国产剧", "v": "17"}, {
                        "n": "港台剧",
                        "v": "18"
                    }, {"n": "日韩剧", "v": "20"}, {"n": "欧美剧", "v": "21"}, {"n": "海外剧", "v": "22"}]
                }
            ],
            "3": [
                {
                    "key": "cateId",
                    "name": "类型",
                    "value": [{"n": "全部", "v": "全部"}, {"n": "大陆综艺", "v": "23"}, {
                        "n": "日韩综艺",
                        "v": "24"
                    }, {"n": "欧美综艺", "v": "25"}, {"n": "港台综艺", "v": "26"}]
                }
            ],
            "4": [
                {
                    "key": "cateId",
                    "name": "类型",
                    "value": [{"n": "全部", "v": "全部"}, {"n": "国产动漫", "v": "27"}, {
                        "n": "日韩动漫",
                        "v": "28"
                    }, {"n": "欧美动漫", "v": "29"}, {"n": "其他动漫", "v": "30"}]
                }
            ]
        };
        return JSON.stringify({class: classes, filters: filters});
    } catch (e) {
        console.error('获取分类失败：', e.message);
        return JSON.stringify({class: [], filters: {}});
    }
}

async function homeVod() {
    try {
        let resHtml = KParams.resHtml;
        let VODS = getVodList(resHtml);
        return JSON.stringify({list: VODS});
    } catch (e) {
        console.error('推荐页获取失败：', e.message);
        return JSON.stringify({list: []});
    }
}

async function category(tid, pg, filter, extend) {
    try {
        pg = parseInt(pg, 10);
        pg = pg > 0 ? pg : 1;
        let cateUrl = `${HOST}/zwhstp/${extend?.cateId ?? tid}-${pg}.html`;
        let resHtml = await request(cateUrl);
        let VODS = getVodList(resHtml);
        let pagecount = 999;
        return JSON.stringify({list: VODS, page: pg, pagecount: pagecount, limit: 30, total: 30 * pagecount});
    } catch (e) {
        console.error('类别页获取失败：', e.message);
        return JSON.stringify({list: [], page: 1, pagecount: 0, limit: 30, total: 0});
    }
}

async function search(wd, quick, pg) {
    try {
        pg = parseInt(pg, 10);
        pg = pg > 0 ? pg : 1;
        let searchUrl = `${HOST}/zwhstp/id.html?wd=${wd}&page=${pg}`;
        let resHtml = await request(searchUrl);
        let VODS = getVodList(resHtml);
        return JSON.stringify({list: VODS, page: pg, pagecount: 10, limit: 30, total: 300});
    } catch (e) {
        console.error('搜索页获取失败：', e.message);
        return JSON.stringify({list: [], page: 1, pagecount: 0, limit: 30, total: 0});
    }
}

function getVodList(khtml) {
    try {
        let kvods = [];
        let listArr = pdfa(khtml, '.lazyload');
        listArr.forEach(it => {
            kvods.push({
                vod_name: _pdfh(it, 'a&&title', '名称'),
                vod_pic: _pdfh(it, 'a&&data-original', '图片'),
                vod_remarks: _pdfh(it, '.text-right&&Text', '状态'),
                vod_id: _pdfh(it, 'a&&href'),
            });
        });
        return kvods;
    } catch (e) {
        console.error(`生成视频列表失败：`, e.message);
        return [];
    }
}

async function detail(ids) {
    try {
        let detailUrl = !/^http/.test(ids) ? `${HOST}${ids}` : ids;
        let resHtml = await request(detailUrl);
        let intros = pdfh(resHtml, '.stui-content');
        let ktabs = pdfa(resHtml, '.bottom-line:has(span)').map((it, idx) => _pdfh(it, 'h3&&Text', `线-${idx + 1}`));
        let kurls = pdfa(resHtml, '.stui-content__playlist').map(item => {
            let kurl = pdfa(item, 'a').map(it => {
                return _pdfh(it, 'Text', 'noEpi') + '$' + _pdfh(it, 'a&&href', 'noUrl');
            });
            return kurl.join('#');
        });
        let VOD = {
            vod_id: detailUrl,
            vod_name: _pdfh(intros, 'h1&&Text', '名称'),
            vod_pic: _pdfh(intros, 'img&&data-original', '图片'),
            type_name: cutStr(intros, '类型：', '<span', '类型'),
            vod_remarks: _pdfh(intros, '.text-right&&Text', '状态'),
            vod_year: cutStr(intros, '年份：', '</p>', '1000'),
            vod_area: cutStr(intros, '地区：', '<span', '地区'),
            vod_lang: '语言',
            vod_director: cutStr(intros, '导演：', '</p>', '导演'),
            vod_actor: cutStr(intros, '主演：', '</p>', '主演'),
            vod_content: _pdfh(intros, '.detail-content&&Text', '简介'),
            vod_play_from: ktabs.join('$$$'),
            vod_play_url: kurls.join('$$$')
        };
        return JSON.stringify({list: [VOD]});
    } catch (e) {
        console.error('详情页获取失败：', e.message);
        return JSON.stringify({list: []});
    }
}

async function play(flag, ids, flags) {
    try {
        let playUrl = !/^http/.test(ids) ? `${HOST}${ids}` : ids;
        let kp = 0;
        let resHtml = await request(playUrl);
        let kcode = safeParseJSON(resHtml.match(/var player_.*?=([^]*?)</)?.[1] ?? '');
        let kurl = kcode?.url ?? '';
        if (!/m3u8|mp4|mkv/.test(kurl)) {
            kp = 1;
            kurl = playUrl;
        }
        return JSON.stringify({jx: 0, parse: kp, url: kurl, header: DefHeader});
    } catch (e) {
        console.error('播放失败：', e.message);
        return JSON.stringify({jx: 0, parse: 0, url: '', header: {}});
    }
}

function _pdfh(dom, selector, defaultValue = '') {
    if (typeof dom !== 'string' || typeof selector !== 'string' || !dom.trim() || !selector.trim()) {
        return defaultValue;
    }
    return (pdfh(dom, selector) || '').replace(/\s+/g, ' ').trim() || defaultValue;
}

function cutStr(str, prefix = '', suffix = '', defaultVal = 'cutFaile', clean = true, i = 1, all = false) {
    try {
        if (typeof str !== 'string' || !str) {
            throw new Error('被截取对象需为非空字符串');
        }
        const cleanStr = cs => String(cs).replace(/<[^>]*?>/g, ' ').replace(/(&nbsp;|\u00A0|\s)+/g, ' ').trim().replace(/\s+/g, ' ');
        const esc = s => String(s).replace(/[.*+?${}()|[\]\\/^]/g, '\\$&');
        let pre = esc(prefix).replace(/£/g, '[^]*?'), end = esc(suffix);
        let regex = new RegExp(`${pre ? pre : '^'}([^]*?)${end ? end : '$'}`, 'g');
        let matchIterator = str.matchAll(regex);
        if (all) {
            let matchArr = [...matchIterator];
            return matchArr.length ? matchArr.map(it => {
                const val = it[1] ?? defaultVal;
                return clean && val !== defaultVal ? cleanStr(val) : val;
            }) : [defaultVal];
        }
        i = parseInt(i, 10);
        if (isNaN(i) || i < 1) {
            throw new Error('序号必须为正整数');
        }
        let tgIdx = i - 1, matchIdx = 0;
        for (const match of matchIterator) {
            if (matchIdx++ === tgIdx) {
                const result = match[1] ?? defaultVal;
                return clean && result !== defaultVal ? cleanStr(result) : result;
            }
        }
        return defaultVal;
    } catch (e) {
        console.error(`字符串截取失败：`, e.message);
        return all ? ['cutErr'] : 'cutErr';
    }
}

function safeParseJSON(jStr) {
    try {
        return JSON.parse(jStr);
    } catch (e) {
        return null;
    }
}

async function request(reqUrl, options = {}) {
    try {
        if (typeof reqUrl !== 'string' || !reqUrl.trim()) {
            throw new Error('reqUrl需为字符串且非空');
        }
        if (typeof options !== 'object' || Array.isArray(options) || !options) {
            throw new Error('options类型需为非null对象');
        }
        options.method = options.method?.toLowerCase() || 'get';
        if (['get', 'head'].includes(options.method)) {
            delete options.data;
            delete options.postType;
        } else {
            options.data = options.data ?? '';
            options.postType = options.postType?.toLowerCase() || 'form';
        }
        let {headers, timeout, charset, toBase64 = false, ...restOpts} = options;
        const optObj = {
            headers: (typeof headers === 'object' && !Array.isArray(headers) && headers) ? headers : KParams.headers,
            timeout: parseInt(timeout, 10) > 0 ? parseInt(timeout, 10) : KParams.timeout,
            buffer: toBase64 ? 2 : 0,
            ...restOpts
        };
        const res = await req(reqUrl, optObj);
        if (options.withHeaders) {
            const resHeaders = typeof res.headers === 'object' && !Array.isArray(res.headers) && res.headers ? res.headers : {};
            const resWithHeaders = {...resHeaders, body: res?.content ?? ''};
            return JSON.stringify(resWithHeaders);
        }
        return res?.content ?? '';
    } catch (e) {
        console.error(`${reqUrl}→请求失败：`, e.message);
        return options?.withHeaders ? JSON.stringify({body: ''}) : '';
    }
}

export function __jsEvalReturn() {
    return {
        init: init,
        home: home,
        homeVod: homeVod,
        category: category,
        search: search,
        detail: detail,
        play: play,
        proxy: null
    };
}