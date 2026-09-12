/*
title: '爱看机器人', author: '小可乐/v6.1.4-CF修复'
说明：可以不写ext，也可以写ext，ext支持的参数和格式参数如下
"ext": {
    "host": "xxxx", //站点网址
    "timeout": 6000,  //请求超时，单位毫秒
    "tabsSet": "线路2&线路1"  //指定线路和顺序
    "tabsDeal": "量子&非凡@天堂>360#极速<新浪@优质>>优质无广&暴风>>暴风无广"
}
v6.1.4 修复要点（实测定位）：
  1. Cloudflare 挑战绕过：页面请求 UA 改用 Googlebot，实测可直接拿到 /play/ 详情页真实 HTML
  2. 图片：旧代理 img-p.ikanbot.com/proxy 已 404 死链，直接使用 data-src 的 doubanio 原图（实测 200）
  3. 修复 vod_id 被写成纯数字 kid 导致二次进详情丢失 name/pic/remarks 的严重 bug
  4. 空播放线路不再填 'noUrl'，直接过滤
  5. play() 使用浏览器 UA + Referer，避免 m3u8 防盗链 403；判空 + 忽略大小写
  6. 搜索关键词 encodeURIComponent
  7. current_id/e_token 为空时不请求 API
*/

// 页面请求用 Googlebot UA 绕过 Cloudflare JS 挑战
const BOT_UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
// 播放/图片请求用正常浏览器 UA，避免被视频源 CDN 拒绝
const MOBILE_UA = 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36';
const DefHeader = {'User-Agent': MOBILE_UA};
var HOST;
var KParams = {
    headers: {'User-Agent': BOT_UA},
    timeout: 8000,
};

async function init(cfg) {
    try {
        HOST = (cfg.ext?.host?.trim() || 'https://www.ikanbot.com/').replace(/\/$/, '');
        KParams.headers['Referer'] = HOST;
        let parseTimeout = parseInt(cfg.ext?.timeout?.trim(), 10);
        if (parseTimeout > 0) {KParams.timeout = parseTimeout;}
        KParams.tabsSet = cfg.ext?.tabsSet?.trim() || '';
        KParams.tabsDeal = cfg.ext?.tabsDeal?.trim() || '';
    } catch (e) {
        console.error('初始化参数失败：', e.message);
    }
}

async function home(filter) {
    try {
        let kclassName = '电影$movie&剧集$tv&榜单$billboard';
        let classes = kclassName.split('&').map(it => {
            let [cName, cId] = it.split('$');
            return {type_name: cName, type_id: cId};
        });
        let filters = {
            "movie": [
                {"key": "class","name": "剧情","value": [{"n": "热门","v": "热门"}, {"n": "最新","v": "最新"}, {"n": "经典","v": "经典"}, {"n": "豆瓣高分","v": "豆瓣高分"}, {"n": "冷门佳片","v": "冷门佳片"}, {"n": "华语","v": "华语"}, {"n": "欧美","v": "欧美"}, {"n": "韩国","v": "韩国"}, {"n": "日本","v": "日本"}, {"n": "动作","v": "动作"}, {"n": "喜剧","v": "喜剧"}, {"n": "爱情","v": "爱情"}, {"n": "科幻","v": "科幻"}, {"n": "悬疑","v": "悬疑"}, {"n": "恐怖","v": "恐怖"}, {"n": "成长","v": "成长"}, {"n": "豆瓣top250","v": "豆瓣top250"}]}
            ],
            "tv": [
                {"key": "class","name": "剧情","value": [{"n": "热门","v": "热门"}, {"n": "美剧","v": "美剧"}, {"n": "英剧","v": "英剧"}, {"n": "韩剧","v": "韩剧"}, {"n": "日剧","v": "日剧"}, {"n": "国产剧","v": "国产剧"}, {"n": "港剧","v": "港剧"}, {"n": "日本动画","v": "日本动画"}, {"n": "综艺","v": "综艺"}, {"n": "纪录片","v": "纪录片"}]}
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
        let resHtml = await request(HOST);
        let VODS = getVodList(resHtml);
        return JSON.stringify({list: VODS});
    } catch (e) {
        console.error('推荐页获取失败：', e.message);
        return JSON.stringify({list: []});
    }
}

async function category(tid, pg, filter, extend) {
    try {
        pg = parseInt(pg, 10), pg = pg > 0 ? pg : 1;
        let fl = extend || {};
        let suffix = pg === 1 ? '' : `-p-${pg}`;
        let cateUrl = tid === 'billboard' ? `${HOST}/billboard.html` : `${HOST}/hot/index-${tid}-${fl.class || '热门'}${suffix}.html`;
        let resHtml = await request(cateUrl);
        let VODS = getVodList(resHtml);
        let limit = VODS.length || 30;
        let hasMore = resHtml.includes('下一页');
        let pagecount = hasMore ? pg + 1 : pg;
        return JSON.stringify({list: VODS, page: pg, pagecount: pagecount, limit: limit, total: 0});
    } catch (e) {
        console.error('类别页获取失败：', e.message);
        return JSON.stringify({list: [], page: 1, pagecount: 0, limit: 30, total: 0});
    }
}

async function search(wd, quick, pg) {
    try {
        pg = parseInt(pg, 10), pg = pg > 0 ? pg : 1;
        let suffix = pg === 1 ? '' : `&p=${pg}`;
        let searchUrl = `${HOST}/search?q=${encodeURIComponent(wd)}${suffix}`;
        let resHtml = await request(searchUrl);
        let VODS = getVodList(resHtml, true);
        let hasMore = resHtml.includes('下一页');
        let pagecount = hasMore ? pg + 1 : pg;
        return JSON.stringify({list: VODS, page: pg, pagecount: pagecount, limit: 30, total: 0});
    } catch (e) {
        console.error('搜索页获取失败：', e.message);
        return JSON.stringify({list: [], page: 1, pagecount: 0, limit: 30, total: 0});
    }
}

function getVodList(khtml, sch = false) {
    try {
        if (!khtml) {throw new Error('源码为空');}
        let kvods = [];
        let listArr = sch
            ? cutStr(khtml, 'media">', '</h5>', '', false, 0, true)
            : cutStr(khtml, '<a', '/a>', '', false, 0, true).filter(flt => flt.includes('alt='));

        for (let it of listArr) {
            let kname = sch ? cutStr(it, 'title-text">', '<', '') : cutStr(it, 'alt="', '"', '');
            // fix: data-src 本身就是 doubanio 直链，旧代理 img-p.ikanbot.com/proxy 已 404，直接用原图
            let rawPic = cutStr(it, 'data-src="', '"', '');
            if (!rawPic || rawPic === 'cutErr') rawPic = cutStr(it, 'src="', '"', '');
            let kpic = (rawPic && rawPic !== 'cutErr') ? rawPic : '';
            let kremarks = sch ? cutStr(it, '[', ']', '') : '';
            let kid = cutStr(it, 'href="', '"', '');
            if (kid && kname && kname !== 'cutErr') {
                kvods.push({
                    vod_name: kname,
                    vod_pic: kpic,
                    vod_remarks: kremarks,
                    vod_id: `${kid}@${kname}@${kpic}@${kremarks}`
                });
            }
        }
        return kvods;
    } catch (e) {
        console.error(`生成视频列表失败：`, e.message);
        return [];
    }
}

async function detail(ids) {
    try {
        let parts = String(ids).split('@');
        let id = parts[0] || '';
        let kname = parts[1] || '';
        let kpic = parts[2] || '';
        let kremarks = parts[3] || '';

        let detailUrl = !/^http/.test(id) ? `${HOST}${id}` : id;
        let resHtml = await request(detailUrl);
        if (!resHtml) {throw new Error('详情页源码为空');}

        const tabName = {
            "dyttm3u8":"天堂","360zy":"360","iqym3u8":"爱奇艺","mtm3u8":"茅台","subm3u8":"速播","nnm3u8":"牛牛","okm3u8":"欧克","tym3u8":"TY",
            "yym3u8":"歪歪","bfzym3u8":"暴风","1080zyk":"优质","kuaikan":"快看","lzm3u8":"量子","ffm3u8":"非凡","snm3u8":"索尼","qhm3u8":"奇虎",
            "hym3u8":"虎牙","haiwaikan":"海外看","gsm3u8":"光速","zuidam3u8":"最大","bjm3u8":"八戒","wolong":"卧龙","xlm3u8":"新浪","yhm3u8":"樱花",
            "tkm3u8":"天空","jsm3u8":"极速","wjm3u8":"无尽","sdm3u8":"闪电","kcm3u8":"快车","jinyingm3u8":"金鹰","fsm3u8":"飞速","tpm3u8":"淘片",
            "lem3u8":"鱼乐","dbm3u8":"百度","tomm3u8":"番茄","ukm3u8":"优酷","ikm3u8":"爱坤","hnzym3u8":"红牛资源","hnm3u8":"红牛","68zy_m3u8":"六八",
            "kdm3u8":"酷点","bdxm3u8":"北斗星","hhm3u8":"豪华","kbm3u8":"快播","mzm3u8":"MZ"
        };

        // HTML 实际格式：<input type="hidden" id="current_id" value="1012121"/>
        // prefix 里的 £ 通配自动跳过 id="xxx" 到 value= 之间的属性，suffix 用普通 " 闭值
        let kid = cutStr(resHtml, 'current_id"£"', '"', '');
        let eToken = cutStr(resHtml, 'e_token"£"', '"', '');

        const getToken = (curtId, eToken) => {
            if (!curtId || !eToken || !/^\d+$/.test(curtId)) {return '';}
            let remainEToken = eToken;
            let finalToken = curtId.slice(-4).split('').map(it => {
                let startPos = (parseInt(it, 10) % 3) + 1;
                let endPos = startPos + 8;
                if (startPos >= remainEToken.length) {return '';}
                let segment = remainEToken.substring(startPos, endPos);
                remainEToken = remainEToken.substring(endPos);
                return segment;
            }).filter(Boolean).join('');
            return finalToken;
        };
        let token = getToken(kid, eToken);

        let ktabs = [];
        let kurls = [];
        if (kid && token) {
            let detailUrl2 = `${HOST}/api/getResN?videoId=${kid}&mtype=2&token=${token}`;
            let resObj = safeParseJSON(await request(detailUrl2));
            let resList = resObj?.data?.list ?? [];
            resList.forEach((item, idx) => {
                try {
                    let cleanRes = String(item.resData || '').replace(/#{2,}/g, '#');
                    let resData = safeParseJSON(cleanRes)?.[0] ?? {};
                    let u = resData?.url || '';
                    // resData.url 格式为 "正片$https://xxx.m3u8"，本身就是 TVbox 的 集名$地址 格式，直接用
                    if (!u || u === 'noUrl') return;
                    let tab = resData?.flag || `线路${idx+1}`;
                    ktabs.push(tabName[tab] || tab);
                    kurls.push(u);
                } catch (err) {
                    console.error('解析单条线路异常', err);
                }
            });
        }

        ktabs = dealSameEle(ktabs);
        if (KParams.tabsSet || KParams.tabsDeal) {
            let ktus = ktabs.map((it, idx) => { return {type_name: it, type_value: kurls[idx]}; });
            if (KParams.tabsSet) {
                ktus = ctSet(ktus, KParams.tabsSet);
            }
            if (KParams.tabsDeal) {
                let [x = '', y = '', z = ''] = KParams.tabsDeal.split('@');
                let tab_remove = ['','&'].includes(x.trim()) ? '' : x.trim();
                let tab_order = ['','#'].includes(y.trim()) ? '' : y.trim();
                let tab_rename = ['','&'].includes(z.trim()) ? '' : z.trim();
                ktus = dorDeal(ktus, tab_remove, tab_order, tab_rename);
            }
            ktabs = ktus.map(it => it.type_name);
            kurls = ktus.map(it => it.type_value);
        }

        let vod_content = cutStr(resHtml, 'description" content="', '">', kname);

        let VOD = {
            // fix: vod_id 必须保留完整 ids，否则二次进详情 split('@') 丢失 name/pic/remarks
            vod_id: ids,
            vod_name: kname,
            vod_pic: kpic,
            vod_remarks: kremarks,
            type_name: '类型',
            vod_year: '',
            vod_area: '',
            vod_lang: '',
            vod_director: '',
            vod_actor: '',
            vod_content: vod_content,
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
        let url = String(ids || '').trim();
        if (!url || url === 'noUrl') {
            return JSON.stringify({jx: 0, parse: 0, url: '', header: DefHeader});
        }
        // fix: 播放用浏览器 UA + Referer，避免视频 CDN 防盗链 403
        let playHeader = {'User-Agent': MOBILE_UA, 'Referer': HOST};
        let isMedia = /\.(m3u8|mp4|mkv|mov|flv|m4v|ts)(\?|#|$)/i.test(url);
        return JSON.stringify({jx: 0, parse: isMedia ? 0 : 1, url: url, header: playHeader});
    } catch (e) {
        console.error('播放失败：', e.message);
        return JSON.stringify({jx: 0, parse: 0, url: '', header: {}});
    }
}

function dealSameEle(arr) {
    try {
        if (!Array.isArray(arr)) { return []; }
        const countMap = new Map();
        let newArr = arr.map(item => {
            let count = countMap.get(item) || 0;
            let currentCount = count + 1;
            countMap.set(item, currentCount);
            return currentCount > 1 ? `${item}${currentCount}` : item;
        });
        return newArr;
    } catch (e) {
        return [];
    }
}

function ctSet(kArr, setStr) {
    try {
        if (!Array.isArray(kArr) || kArr.length === 0 || typeof setStr !== 'string' || !setStr) { return kArr; }
        const set_arr = [...kArr];
        const arrNames = setStr.split('&');
        const filtered_arr = arrNames.map(item => set_arr.find(it => it.type_name === item)).filter(Boolean);
        return filtered_arr.length ? filtered_arr : set_arr;
    } catch (e) {
        console.error('ctSet 执行异常：', e.message);
        return kArr;
    }
}

function dorDeal(kArr, strRemove, strOrder, strRename) {
    let dealed_arr = [...kArr];
    if (strRemove) {
        try {
            let removeArr = strRemove.split('&');
            const removeSet = new Set(removeArr);
            let filtered_arr = dealed_arr.filter(it => !removeSet.has(it.type_name));
            dealed_arr = filtered_arr.length ? filtered_arr : dealed_arr;
        } catch (e) {
            console.error('删除失败：', e.message);
        }
    }
    if (strOrder) {
        try {
            let [a = '', b = ''] = strOrder.split('#', 2);
            let arrA = a.split('>').filter(Boolean);
            let arrB = b.split('<').filter(Boolean);
            let uqArrB = arrB.filter(it => !arrA.includes(it));
            let twMap = new Map();
            arrA.forEach((item, idx) => {twMap.set(item, { weight: 1, index: idx }); });
            uqArrB.forEach((item, idx) => {twMap.set(item, { weight: 3, index: idx }); });
            dealed_arr.forEach((it, idx) => { if (!twMap.has(it.type_name)) {twMap.set(it.type_name, { weight: 2, index: idx });} });
            let ordered_arr = [...dealed_arr].sort((a, b) => {
                let { weight: ta = 2, index: idxA = 0 } = twMap.get(a.type_name) ?? {};
                let { weight: tb = 2, index: idxB = 0 } = twMap.get(b.type_name) ?? {};
                if (ta !== tb) {return ta - tb;}
                return ta === 3 ? idxB - idxA : idxA - idxB;
            });
            dealed_arr = ordered_arr;
        } catch (e) {
            console.error('排序失败：', e.message);
        }
    }
    if (strRename) {
        try {
            const objRename = strRename.split('&').reduce((obj, p) => {
                let [k = '', v = ''] = p.split('>>', 2);
                if (k + v) {obj[k] = v;}
                return obj;
            }, {});
            let renamed_arr = dealed_arr.map(it => { return { ...it, type_name: objRename[it.type_name] || it.type_name }; });
            dealed_arr = renamed_arr;
        } catch (e) {
            console.error('改名失败：', e.message);
        }
    }
    return dealed_arr;
}

function safeParseJSON(jStr) {
    try {
        if (!jStr) return null;
        return JSON.parse(jStr);
    } catch (e) {
        return null;
    }
}

function cutStr(str, prefix = '', suffix = '', defVal = '', clean = true, i = 0, all = false) {
    try {
        if (typeof str !== 'string') {throw new Error('被截取对象必须为字符串');}
        const cleanStr = cs => String(cs).replace(/<[^>]*?>/g, ' ').replace(/(&nbsp;|[\u0020\u00A0\u3000\s])+/g, ' ').trim().replace(/\s+/g, ' ');
        const esc = s => String(s).replace(/[.*+?${}()|[\]\\/^]/g, '\\$&');
        let pre = esc(prefix).replace(/£/g, '[^]*?');
        let end = esc(suffix).replace(/£/g, '[^]*?');
        const regex = new RegExp(`${pre || '^'}([^]*?)${end || '$'}`, 'g');
        const matchIter = str.matchAll(regex);
        if (all) {
            const matchArr = [...matchIter];
            return matchArr.length ? matchArr.map(ela => ela[1] !== undefined ? (clean ? (cleanStr(ela[1]) || defVal) : ela[1]) : defVal ) : [defVal];
        }
        const idx = parseInt(i, 10);
        if (isNaN(idx)) {throw new Error('序号必须为整数');}
        let tgResult, matchIdx = 0;
        if (idx >= 0) {
            for (let elt of matchIter) {
                if (matchIdx++ === idx) {tgResult = elt[1]; break;}
            }
        } else {
            const matchArr = [...matchIter];
            tgResult = matchArr.length ? matchArr[matchArr.length + idx]?.[1] : undefined;
        }
        return tgResult !== undefined ? (clean ? (cleanStr(tgResult) || defVal) : tgResult) : defVal;
    } catch (e) {
        console.error(`字符串截取错误：`, e.message);
        return all ? ['cutErr'] : 'cutErr';
    }
}

async function request(reqUrl, options = {}) {
    try {
        if (typeof reqUrl !== 'string' || !reqUrl.trim()) { throw new Error('reqUrl需为字符串且非空'); }
        if (typeof options !== 'object' || Array.isArray(options) || options === null) { throw new Error('options类型需为非null对象'); }
        options.method = options.method?.toUpperCase() || 'GET';
        if (['GET', 'HEAD'].includes(options.method)) {
            delete options.body;
            delete options.data;
            delete options.postType;
        }
        let {headers, timeout, ...restOpts} = options;
        const optObj = {
            headers: (typeof headers === 'object' && !Array.isArray(headers) && headers) ? headers : KParams.headers,
            timeout: parseInt(timeout, 10) > 0 ? parseInt(timeout, 10) : KParams.timeout,
            ...restOpts
        };
        const res = await req(reqUrl, optObj);
        if (options.withHeaders) {
            const resHeaders = typeof res.headers === 'object' && !Array.isArray(res.headers) && res.headers ? res.headers : {};
            const resWithHeaders = { ...resHeaders, body: res?.content ?? '' };
            return JSON.stringify(resWithHeaders);
        }
        return res?.content ?? '';
    } catch (e) {
        console.error(`${reqUrl}→请求失败：`, e.message);
        return options?.withHeaders ? JSON.stringify({ body: '' }) : '';
    }
}

export function __jsEvalReturn() {
    return {
        init,
        home,
        homeVod,
        category,
        search,
        detail,
        play,
        proxy: null
    };
}
