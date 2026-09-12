/**
    title: "歪比巴卜",
    author: "",
    logo: "https://wbbb1.com/static/images/logo.png",
    more: {
        sourceTag: "在线影视"
    }
*/
import { Crypto, load, _ } from 'assets://js/lib/cat.js';

let HOST = 'https://wbbb1.com';
let siteKey = "", siteType = "", sourceKey = "", ext = "";

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36';

async function init(cfg) {
    siteKey = cfg.skey;
    siteType = cfg.stype;
    sourceKey = cfg.sourceKey;
    ext = cfg.ext;

    if (ext && ext.startsWith('http')) {
        HOST = ext;
    }
}

async function home(filter) {
    const classes = [
        { type_id: "1", type_name: "电影" },
        { type_id: "2", type_name: "剧集" },
        { type_id: "3", type_name: "动漫" },
        { type_id: "4", type_name: "综艺" }
    ];

    const filterObj = {
        "1": [
            {
                key: "class",
                name: "类型",
                value: [
                    { n: "全部", v: "" },
                    { n: "动作", v: "动作" },
                    { n: "喜剧", v: "喜剧" },
                    { n: "爱情", v: "爱情" },
                    { n: "科幻", v: "科幻" },
                    { n: "恐怖", v: "恐怖" },
                    { n: "悬疑", v: "悬疑" },
                    { n: "犯罪", v: "犯罪" },
                    { n: "战争", v: "战争" },
                    { n: "奇幻", v: "奇幻" },
                    { n: "冒险", v: "冒险" },
                    { n: "古装", v: "古装" },
                    { n: "剧情", v: "剧情" }
                ]
            },
            {
                key: "area",
                name: "地区",
                value: [
                    { n: "全部", v: "" },
                    { n: "大陆", v: "大陆" },
                    { n: "香港", v: "香港" },
                    { n: "台湾", v: "台湾" },
                    { n: "美国", v: "美国" },
                    { n: "日本", v: "日本" },
                    { n: "韩国", v: "韩国" },
                    { n: "英国", v: "英国" },
                    { n: "法国", v: "法国" },
                    { n: "印度", v: "印度" },
                    { n: "泰国", v: "泰国" }
                ]
            },
            {
                key: "lang",
                name: "语言",
                value: [
                    { n: "全部", v: "" },
                    { n: "国语", v: "国语" },
                    { n: "粤语", v: "粤语" },
                    { n: "英语", v: "英语" },
                    { n: "日语", v: "日语" },
                    { n: "韩语", v: "韩语" }
                ]
            },
            {
                key: "year",
                name: "年份",
                value: [
                    { n: "全部", v: "" },
                    { n: "2026", v: "2026" },
                    { n: "2025", v: "2025" },
                    { n: "2024", v: "2024" },
                    { n: "2023", v: "2023" },
                    { n: "2022", v: "2022" },
                    { n: "2021", v: "2021" },
                    { n: "2020", v: "2020" },
                    { n: "2019", v: "2019" },
                    { n: "2018", v: "2018" }
                ]
            },
            {
                key: "letter",
                name: "字母",
                value: [
                    { n: "全部", v: "" },
                    { n: "A", v: "A" },
                    { n: "B", v: "B" },
                    { n: "C", v: "C" },
                    { n: "D", v: "D" },
                    { n: "E", v: "E" },
                    { n: "F", v: "F" },
                    { n: "G", v: "G" },
                    { n: "H", v: "H" },
                    { n: "I", v: "I" },
                    { n: "J", v: "J" },
                    { n: "K", v: "K" },
                    { n: "L", v: "L" },
                    { n: "M", v: "M" },
                    { n: "N", v: "N" },
                    { n: "O", v: "O" },
                    { n: "P", v: "P" },
                    { n: "Q", v: "Q" },
                    { n: "R", v: "R" },
                    { n: "S", v: "S" },
                    { n: "T", v: "T" },
                    { n: "U", v: "U" },
                    { n: "V", v: "V" },
                    { n: "W", v: "W" },
                    { n: "X", v: "X" },
                    { n: "Y", v: "Y" },
                    { n: "Z", v: "Z" },
                    { n: "0-9", v: "0-9" }
                ]
            },
            {
                key: "by",
                name: "排序",
                value: [
                    { n: "时间排序", v: "time" },
                    { n: "人气排序", v: "hits" },
                    { n: "评分排序", v: "score" }
                ]
            }
        ],

        "2": [
            {
                key: "class",
                name: "类型",
                value: [
                    { n: "全部", v: "" },
                    { n: "爱情", v: "爱情" },
                    { n: "都市", v: "都市" },
                    { n: "家庭", v: "家庭" },
                    { n: "战争", v: "战争" },
                    { n: "喜剧", v: "喜剧" },
                    { n: "古装", v: "古装" },
                    { n: "武侠", v: "武侠" },
                    { n: "悬疑", v: "悬疑" },
                    { n: "科幻", v: "科幻" },
                    { n: "惊悚", v: "惊悚" },
                    { n: "犯罪", v: "犯罪" },
                    { n: "剧情", v: "剧情" }
                ]
            },
            {
                key: "area",
                name: "地区",
                value: [
                    { n: "全部", v: "" },
                    { n: "大陆", v: "大陆" },
                    { n: "港台", v: "港台" },
                    { n: "美国", v: "美国" },
                    { n: "韩国", v: "韩国" },
                    { n: "日本", v: "日本" },
                    { n: "泰国", v: "泰国" }
                ]
            },
            {
                key: "lang",
                name: "语言",
                value: [
                    { n: "全部", v: "" },
                    { n: "国语", v: "国语" },
                    { n: "粤语", v: "粤语" },
                    { n: "英语", v: "英语" },
                    { n: "日语", v: "日语" },
                    { n: "韩语", v: "韩语" }
                ]
            },
            {
                key: "year",
                name: "年份",
                value: [
                    { n: "全部", v: "" },
                    { n: "2026", v: "2026" },
                    { n: "2025", v: "2025" },
                    { n: "2024", v: "2024" },
                    { n: "2023", v: "2023" },
                    { n: "2022", v: "2022" },
                    { n: "2021", v: "2021" },
                    { n: "2020", v: "2020" }
                ]
            },
            {
                key: "letter",
                name: "字母",
                value: [
                    { n: "全部", v: "" },
                    { n: "A", v: "A" },
                    { n: "B", v: "B" },
                    { n: "C", v: "C" },
                    { n: "D", v: "D" },
                    { n: "E", v: "E" },
                    { n: "F", v: "F" },
                    { n: "G", v: "G" },
                    { n: "H", v: "H" },
                    { n: "I", v: "I" },
                    { n: "J", v: "J" },
                    { n: "K", v: "K" },
                    { n: "L", v: "L" },
                    { n: "M", v: "M" },
                    { n: "N", v: "N" },
                    { n: "O", v: "O" },
                    { n: "P", v: "P" },
                    { n: "Q", v: "Q" },
                    { n: "R", v: "R" },
                    { n: "S", v: "S" },
                    { n: "T", v: "T" },
                    { n: "U", v: "U" },
                    { n: "V", v: "V" },
                    { n: "W", v: "W" },
                    { n: "X", v: "X" },
                    { n: "Y", v: "Y" },
                    { n: "Z", v: "Z" },
                    { n: "0-9", v: "0-9" }
                ]
            },
            {
                key: "by",
                name: "排序",
                value: [
                    { n: "时间排序", v: "time" },
                    { n: "人气排序", v: "hits" },
                    { n: "评分排序", v: "score" }
                ]
            }
        ],

        "3": [
            {
                key: "class",
                name: "类型",
                value: [
                    { n: "全部", v: "" },
                    { n: "国产动漫", v: "国产动漫" },
                    { n: "日本动漫", v: "日本动漫" },
                    { n: "欧美动漫", v: "欧美动漫" }
                ]
            },
            {
                key: "year",
                name: "年份",
                value: [
                    { n: "全部", v: "" },
                    { n: "2025", v: "2025" },
                    { n: "2024", v: "2024" },
                    { n: "2023", v: "2023" }
                ]
            },
            {
                key: "by",
                name: "排序",
                value: [
                    { n: "时间排序", v: "time" },
                    { n: "人气排序", v: "hits" },
                    { n: "评分排序", v: "score" }
                ]
            }
        ],

        "4": [
            {
                key: "class",
                name: "类型",
                value: [
                    { n: "全部", v: "" },
                    { n: "大陆综艺", v: "大陆综艺" },
                    { n: "港台综艺", v: "港台综艺" },
                    { n: "日韩综艺", v: "日韩综艺" },
                    { n: "欧美综艺", v: "欧美综艺" }
                ]
            },
            {
                key: "by",
                name: "排序",
                value: [
                    { n: "时间排序", v: "time" },
                    { n: "人气排序", v: "hits" },
                    { n: "评分排序", v: "score" }
                ]
            }
        ]
    };

    return JSON.stringify({
        class: classes,
        filters: filterObj
    });
}

async function homeVod() {
    try {
        const res = await req(HOST, {
            headers: { 'User-Agent': UA }
        });

        const $ = load(res.content);
        const list = [];

        $('.module-poster-item.module-item').each((_, item) => {
            const it = $(item);
            const href = it.attr('href');
            const vod_id = href ? href.match(/\/detail\/(\d+)\.html/)?.[1] : '';

            list.push({
                vod_id: vod_id || href,
                vod_name: it.attr('title') || '',
                vod_pic: it.find('img.lazyload').attr('data-original') || '',
                vod_remarks: it.find('.module-item-note').text().trim() || ''
            });
        });

        return JSON.stringify({ list: list });
    } catch (e) {
        return JSON.stringify({ list: [] });
    }
}

async function category(tid, pg, filter, extend) {
    if (!pg || pg <= 0) pg = 1;

    const area = extend.area || '';
    const by = extend.by || 'time';
    const cls = extend.class || '';
    const lang = extend.lang || '';
    const letter = extend.letter || '';
    const year = extend.year || '';

    const url = `${HOST}/show/${tid}-${area}-${by}-${cls}-${lang}-${letter}---${pg}---${year}.html`;

    try {
        const res = await req(url, {
            headers: { 'User-Agent': UA }
        });

        const $ = load(res.content);
        const list = [];

        $('.module-poster-item.module-item').each((_, item) => {
            const it = $(item);
            const href = it.attr('href');
            const vod_id = href ? href.match(/\/detail\/(\d+)\.html/)?.[1] : '';

            list.push({
                vod_id: vod_id || href,
                vod_name: it.attr('title') || '',
                vod_pic: it.find('img.lazyload').attr('data-original') || '',
                vod_remarks: it.find('.module-item-note').text().trim() || ''
            });
        });

        const hasNext = res.content.includes('title="下一页"') || res.content.includes('class="next"');
        const pagecount = hasNext ? pg + 1 : pg;

        return JSON.stringify({
            page: pg,
            pagecount: pagecount,
            limit: 72,
            total: list.length * (hasNext ? 2 : 1),
            list: list
        });
    } catch (e) {
        return JSON.stringify({
            page: pg,
            pagecount: pg,
            limit: 0,
            total: 0,
            list: []
        });
    }
}

async function search(wd, pg) {
    if (!pg || pg <= 0) pg = 1;

    const url = `${HOST}/search/-------------.html?wd=${encodeURIComponent(wd)}&page=${pg}`;

    try {
        const res = await req(url, {
            headers: { 'User-Agent': UA }
        });

        const $ = load(res.content);
        const list = [];

        $('.module-card-item.module-item').each((_, item) => {
            const it = $(item);
            const link = it.find('.module-card-item-poster');
            const href = link.attr('href');
            const vod_id = href ? href.match(/\/detail\/(\d+)\.html/)?.[1] : '';

            list.push({
                vod_id: vod_id || href,
                vod_name: it.find('.module-card-item-title strong').text().trim() || '',
                vod_pic: link.find('img.lazyload').attr('data-original') || '',
                vod_remarks: link.find('.module-item-note').text().trim() || ''
            });
        });

        const hasNext = list.length >= 20;
        const pagecount = hasNext ? pg + 1 : pg;

        return JSON.stringify({
            page: pg,
            pagecount: pagecount,
            total: list.length,
            list: list
        });
    } catch (e) {
        return JSON.stringify({
            page: pg,
            pagecount: pg,
            total: 0,
            list: []
        });
    }
}

async function detail(id) {
    try {
        const res = await req(id.startsWith('http') ? id : `${HOST}/detail/${id}.html`, {
            headers: { 'User-Agent': UA }
        });

        const $ = load(res.content);

        const vod_name = $('h1').first().text().trim() || '';
        const vod_pic = $('.module-info-poster img.lazyload').attr('data-original') || '';
        
        let vod_year = '';
        let vod_area = '';
        let vod_type = '';
        
        $('.module-info-tag-link a').each((_, el) => {
            const text = $(el).text().trim();
            if (/^\d{4}$/.test(text)) {
                vod_year = text;
            } else if (['大陆', '香港', '台湾', '美国', '日本', '韩国', '欧美', '港台'].includes(text)) {
                vod_area = text;
            } else if (!vod_type) {
                vod_type = text;
            }
        });

        let vod_director = '';
        let vod_actor = '';
        let vod_remarks = '';
        
        $('.module-info-item').each((_, el) => {
            const title = $(el).find('.module-info-item-title').text().trim();
            const content = $(el).find('.module-info-item-content').text().trim();
            
            if (title.includes('导演')) {
                vod_director = content.replace(/\s+/g, ' ').trim();
            } else if (title.includes('主演')) {
                vod_actor = content.replace(/\s+/g, ' ').trim();
            } else if (title.includes('备注') || title.includes('更新')) {
                vod_remarks = content;
            }
        });

        const vod_content = $('.module-info-introduction-content').text().trim() || '';

        const playFrom = [];
        const playUrls = [];

        $('.module-tab-item.tab-item').each((i, el) => {
            const from = $(el).find('span').text().trim() || `线路${i + 1}`;
            
            const urls = [];
            $('.module-play-list-content').eq(i).find('a.module-play-list-link').each((_, a) => {
                const name = $(a).text().trim();
                const href = $(a).attr('href');
                const fullUrl = href && href.startsWith('http') ? href : `${HOST}${href}`;
                if (name && fullUrl) {
                    urls.push(`${name}$${fullUrl}`);
                }
            });
            
            if (urls.length > 0) {
                playFrom.push(from);
                playUrls.push(urls.join('#'));
            }
        });

        const vod = {
            vod_id: id,
            vod_name: vod_name,
            vod_pic: vod_pic,
            vod_year: vod_year,
            vod_area: vod_area,
            vod_type: vod_type,
            vod_remarks: vod_remarks,
            vod_actor: vod_actor,
            vod_director: vod_director,
            vod_content: vod_content,
            vod_play_from: playFrom.join('$$$'),
            vod_play_url: playUrls.join('$$$')
        };

        return JSON.stringify({ list: [vod] });
    } catch (e) {
        return JSON.stringify({ list: [] });
    }
}

// MD5 哈希函数
function md5X(str) {
    return Crypto.MD5(str).toString();
}

// AES 解密函数
function aesX(mode, isEncrypt, data, isBase64, key, iv, isKeyBase64) {
    try {
        let keyWord = Crypto.enc.Utf8.parse(key);
        let ivWord = Crypto.enc.Utf8.parse(iv);
        let decrypted = Crypto.AES.decrypt(data, keyWord, {
            iv: ivWord,
            mode: Crypto.mode.CBC,
            padding: Crypto.pad.Pkcs7
        });
        return decrypted.toString(Crypto.enc.Utf8);
    } catch (e) {
        return '';
    }
}

// RC4 加密
function rc4Encrypt(data, key) {
    const keyWord = Crypto.enc.Utf8.parse(key);
    const encrypted = Crypto.RC4.encrypt(data, keyWord);
    return encrypted.toString();
}

// RC4 解密
function rc4Decrypt(base64Data, key) {
    const keyWord = Crypto.enc.Utf8.parse(key);
    const decrypted = Crypto.RC4.decrypt(base64Data, keyWord);
    return decrypted.toString(Crypto.enc.Utf8);
}

async function play(flag, id, flags) {
    try {
        // 获取播放页面
        const res = await req(id, {
            headers: {
                'User-Agent': UA,
                'Referer': HOST
            }
        });

        const html = res.content;
        
        // 提取 player_aaaa 配置
        const configMatch = html.match(/player_aaaa\s*=\s*(\{[\s\S]+?})(?=\s*;\s*|\s*<\/script>)/);
        if (!configMatch) {
            return JSON.stringify({ parse: 1, url: id });
        }

        const player_aaaa = JSON.parse(configMatch[1]);
        let videoUrl = player_aaaa.url;
        
        if (!videoUrl) {
            return JSON.stringify({ parse: 1, url: id });
        }

        // 解密 URL（如果需要）
        const encrypt = String(player_aaaa.encrypt || '0');
        if (encrypt === '1') {
            videoUrl = decodeURIComponent(videoUrl);
        } else if (encrypt === '2') {
            videoUrl = Crypto.enc.Base64.parse(videoUrl).toString(Crypto.enc.Utf8);
            videoUrl = decodeURIComponent(videoUrl);
        }

        // 如果已经是直链，直接返回
        if (videoUrl && /\.(m3u8|mp4|flv|mkv)(\?|$)/i.test(videoUrl)) {
            return JSON.stringify({
                parse: 0,
                url: videoUrl,
                header: {
                    'User-Agent': UA,
                    'Referer': HOST
                }
            });
        }

        // 准备 API 请求参数
        const hostName = 'xn--qvr2v.850088.xyz';
        const rc4Key = (md5X(videoUrl) + ' P').slice(-22);
        const rc4KeyHex = Crypto.enc.Utf8.parse(rc4Key);
        
        const currentTime = Math.floor(Date.now() / 1000);
        
        // 计算各种加密参数
        let keyValue = rc4Encrypt(md5X(videoUrl + 'stray'), rc4Key);
        let vkeyValue = rc4Encrypt(currentTime + md5X(rc4Key + 'stray'), rc4Key);
        let ckeyValue = rc4Encrypt(md5X(hostName + 'stray'), rc4Key);
        
        // 发送 API 请求获取真实地址
        const apiRes = await req(`https://${hostName}/player/api.php`, {
            method: 'POST',
            postType: 'form',
            headers: {
                'User-Agent': UA,
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'Origin': `https://${hostName}`,
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': `https://${hostName}/`
            },
            data: {
                'url': videoUrl,
                'key': keyValue,
                'vkey': vkeyValue,
                'ckey': ckeyValue
            }
        });
        
        const json = JSON.parse(apiRes.content);
        
        if (json.code === 200 || json.code === '200') {
            // 解密 AES key 和 iv
            const aesKey = rc4Decrypt(json.aes_key, rc4Key);
            const aesIv = rc4Decrypt(json.aes_iv, rc4Key);
            
            // 解密真实视频地址
            const realUrl = aesX('AES/CBC/PKCS7', false, json.url, true, aesKey, aesIv, false);
            
            if (realUrl && realUrl.startsWith('http')) {
                return JSON.stringify({
                    parse: 0,
                    url: realUrl,
                    header: {
                        'User-Agent': UA,
                        'Referer': HOST
                    }
                });
            }
        }
        
        return JSON.stringify({ parse: 1, url: videoUrl });
    } catch (e) {
        return JSON.stringify({ parse: 1, url: id });
    }
}

export function __jsEvalReturn() {
    return {
        init,
        home,
        homeVod,
        category,
        detail,
        search,
        play
    };
}