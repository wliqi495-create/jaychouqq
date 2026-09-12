import cheerio from 'assets://js/lib/cheerio.min.js';

const appConfig = {
    siteName: "4k影视",
    siteUrl: "https://www.4kvm.top"
};
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function init(ext) {
    console.log("初始化爬虫:", appConfig.siteName);
}

const classList = [
    { type_id: "1", type_name: "电影" },
    { type_id: "2", type_name: "电视剧" },
    { type_id: "3", type_name: "动漫" }
];

function getAreaFilter() {
    return {
        "key": "area", "name": "地区", "value": [
            { "n": "全部", "v": "" },
            { "n": "美国", "v": "5" },
            { "n": "中国", "v": "7" },
            { "n": "日本", "v": "11" },
            { "n": "韩国", "v": "12" },
            { "n": "中国香港", "v": "14" },
            { "n": "中国台湾", "v": "21" },
            { "n": "英国", "v": "30" },
            { "n": "法国", "v": "6" },
            { "n": "德国", "v": "18" },
            { "n": "俄罗斯", "v": "16" },
            { "n": "泰国", "v": "33" },
            { "n": "印度", "v": "34" },
            { "n": "中国大陆", "v": "52" },
            { "n": "其他", "v": "78" }
        ]
    };
}

function getYearFilter() {
    return {
        "key": "year", "name": "年份", "value": [
            { "n": "全部", "v": "" },
            { "n": "2026", "v": "1" },
            { "n": "2025", "v": "3" },
            { "n": "2024", "v": "4" },
            { "n": "2023", "v": "56" },
            { "n": "2022", "v": "13" },
            { "n": "2021", "v": "2" },
            { "n": "2020", "v": "6" },
            { "n": "2019", "v": "8" },
            { "n": "2018", "v": "9" },
            { "n": "2017", "v": "12" }
        ]
    };
}

function getLangFilter() {
    return {
        "key": "lang", "name": "语言", "value": [
            { "n": "全部", "v": "" },
            { "n": "国语", "v": "" },
            { "n": "粤语", "v": "" },
            { "n": "英语", "v": "" },
            { "n": "日语", "v": "" },
            { "n": "韩语", "v": "" },
            { "n": "其他", "v": "" }
        ]
    };
}

function getTypeFilter() {
    return {
        "key": "type", "name": "类型", "value": [
            { "n": "全部", "v": "" },
            { "n": "剧情", "v": "1" },
            { "n": "悬疑", "v": "2" },
            { "n": "恐怖", "v": "3" },
            { "n": "惊悚", "v": "4" },
            { "n": "喜剧", "v": "5" },
            { "n": "爱情", "v": "6" },
            { "n": "犯罪", "v": "9" },
            { "n": "动作", "v": "10" },
            { "n": "动画", "v": "11" },
            { "n": "奇幻", "v": "12" },
            { "n": "音乐", "v": "13" },
            { "n": "科幻", "v": "14" },
            { "n": "历史", "v": "15" },
            { "n": "战争", "v": "16" },
            { "n": "冒险", "v": "18" },
            { "n": "家庭", "v": "19" },
            { "n": "纪录", "v": "20" }
        ]
    };
}

const commonFilters = [getTypeFilter(), getAreaFilter(), getYearFilter(), getLangFilter()];

const myFilters = {};
classList.forEach(item => {
    myFilters[item.type_id] = commonFilters;
});

function fixImageUrl(u) {
    if (!u) return '';
    if (u.startsWith('http')) {
        return u.replace(/&amp;/g, '&');
    }
    if (u.startsWith('//')) return 'https:' + u;
    if (u.startsWith('/')) return appConfig.siteUrl + u;
    return u;
}

function fixUrl(u) {
    if (!u) return '';
    if (u.startsWith('http')) return u;
    if (u.startsWith('//')) return 'https:' + u;
    if (u.startsWith('/')) return appConfig.siteUrl + u;
    return u;
}

function parseListHtml(html) {
    const $ = cheerio.load(html);
    let list = [];
    let vodIds = {};

    $('.movie-card').each(function() {
        let card = $(this);
        let id = card.attr('data-vod-id') || '';
        let link = card.find('a[href^="/play/"]').first();
        if (!id) {
            let href = link.attr('href') || '';
            id = href.replace('/play/', '').replace('/', '');
        }

        let vod_name = card.find('h3').first().text().trim() || card.find('img').first().attr('alt') || '';
        let imgEl = card.find('img').first();
        let vod_pic = imgEl.attr('data-src') || imgEl.attr('src') || '';
        vod_pic = fixImageUrl(vod_pic);

        if (vod_name && id && !vodIds[id]) {
            vodIds[id] = true;
            list.push({ vod_id: id, vod_name, vod_pic, vod_remarks: '' });
        }
    });

    if (list.length === 0) {
        $('a[href^="/play/"]').each(function() {
            let link = $(this);
            let href = link.attr('href') || '';
            let id = href.replace('/play/', '').replace('/', '');
            if (!id || vodIds[id]) return;

            let imgEl = link.find('img').first();
            let vod_name = link.find('h3').first().text().trim() || imgEl.attr('alt') || '';
            let vod_pic = imgEl.attr('data-src') || imgEl.attr('src') || '';
            vod_pic = fixImageUrl(vod_pic);

            if (vod_name && id) {
                vodIds[id] = true;
                list.push({ vod_id: id, vod_name, vod_pic, vod_remarks: '' });
            }
        });
    }

    let pagecount = 1;
    $('a[href*="page="]').each(function() {
        let href = $(this).attr('href') || '';
        let m = href.match(/page=(\d+)/);
        if (m) {
            let p = parseInt(m[1]);
            if (p > pagecount) pagecount = p;
        }
    });

    return { list, pagecount };
}

async function home(filter) {
    let list = [];
    try {
        const html = (await req(appConfig.siteUrl + '/movie', {
            method: "GET",
            headers: {
                "User-Agent": UA,
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
            }
        })).content;
        const result = parseListHtml(html);
        list = result.list;
    } catch (e) {
        console.error("首页推荐获取失败:", e.message);
    }

    return JSON.stringify({
        class: classList,
        filters: myFilters,
        list: list.slice(0, 30)
    });
}

function buildCategoryUrl(tid, pg, extend) {
    extend = extend || {};
    let url = '/filter?page=' + (pg || 1);
    if (tid && tid !== '0') url += '&classify=' + tid;
    if (extend.type) url += '&types=' + extend.type;
    if (extend.area) url += '&areas=' + extend.area;
    if (extend.year) url += '&years=' + extend.year;
    if (extend.sort) url += '&sort_by=' + extend.sort + '&order=desc';
    return appConfig.siteUrl + url;
}

async function category(tid, pg, filter, extend) {
    pg = pg || 1;
    extend = extend || {};

    let url = buildCategoryUrl(tid, pg, extend);

    try {
        const html = (await req(url, {
            method: "GET",
            headers: {
                "User-Agent": UA,
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Referer": appConfig.siteUrl
            }
        })).content;
        const result = parseListHtml(html);
        return JSON.stringify(result);
    } catch (e) {
        console.error("分类列表获取失败:", e.message);
        return JSON.stringify({ list: [], pagecount: 0 });
    }
}

async function search(wd, quick, page) {
    page = page || 1;
    try {
        let url = `${appConfig.siteUrl}/search?q=${encodeURIComponent(wd)}&page=${page}`;

        const html = (await req(url, {
            method: "GET",
            headers: {
                "User-Agent": UA,
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Referer": appConfig.siteUrl
            }
        })).content;
        const result = parseListHtml(html);
        return JSON.stringify(result);
    } catch (e) {
        console.error("搜索失败:", e.message);
        return JSON.stringify({ list: [], pagecount: 0 });
    }
}

function extractUserlink(html) {
    let userlink = '';
    let m = html.match(/userlink\s*:\s*['"]([^'"]+)['"]/);
    if (m) userlink = m[1];
    if (!userlink) {
        m = html.match(/window\.myuserlink\s*=\s*['"]([^'"]+)['"]/);
        if (m) userlink = m[1];
    }
    return userlink;
}

function extractVodid(html) {
    let vodid = '';
    let m = html.match(/var\s+vodid\s*=\s*['"]([^'"]+)['"]/);
    if (m) vodid = m[1];
    if (!vodid) {
        m = html.match(/const\s+vodId\s*=\s*['"]([^'"]+)['"]/);
        if (m) vodid = m[1];
    }
    return vodid;
}

async function detail(id) {
    try {
        const html = (await req(appConfig.siteUrl + '/play/' + id, {
            method: "GET",
            headers: {
                "User-Agent": UA,
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Referer": appConfig.siteUrl
            }
        })).content;
        const $ = cheerio.load(html);

        let vod_name = $('title').text().split(' - ')[0].trim();
        let vod_director = '';
        let vod_actor = '';
        let vod_year = '';
        let vod_area = '';
        let vod_class = '';
        let vod_content = '';
        let vod_pic = $('meta[property="og:image"]').attr('content') || '';
        vod_pic = fixImageUrl(vod_pic);
        let vod_remarks = '';

        $('.col-span-1.text-gray-500').each(function() {
            let label = $(this).text().trim();
            let val = $(this).next('.col-span-2.text-gray-300').text().trim();
            if (label === '导演') vod_director = val;
            if (label === '主演') vod_actor = val;
            if (label === '年份') vod_year = val;
            if (label === '类型') vod_class = val;
            if (label === '地区') vod_area = val;
            if (label === '上映') vod_remarks = val;
        });

        let descEl = $('meta[name="description"]');
        if (descEl.length > 0) {
            vod_content = descEl.attr('content') || '';
        }

        if (!vod_year) {
            let yearMatch = vod_remarks.match(/(\d{4})/);
            if (yearMatch) vod_year = yearMatch[1];
        }

        if (!vod_pic) {
            let imgEl = $('img[alt="' + vod_name + '"]').first();
            if (imgEl.length === 0) {
                imgEl = $('img').first();
            }
            vod_pic = imgEl.attr('data-src') || imgEl.attr('src') || '';
            vod_pic = fixImageUrl(vod_pic);
        }

        let userlink = extractUserlink(html);
        let vodid = extractVodid(html);

        let lines = [];
        let playlists = [];
        const qualityConfigs = [
            { name: '蓝光', quality: '2160' },
            { name: '1080P', quality: '1080' }
        ];

        let lineNames = [];
        let lineMatches = html.match(/lineName:\s*['"]([^'"]+)['"]/g);
        if (lineMatches) {
            for (let i = 0; i < lineMatches.length; i++) {
                let m = lineMatches[i].match(/lineName:\s*['"]([^'"]+)['"]/);
                if (m && lineNames.indexOf(m[1]) === -1) {
                    lineNames.push(m[1]);
                }
            }
        }

        if (lineNames.length === 0) {
            let dataLines = [];
            $('[data-line]').each(function() {
                let line = $(this).attr('data-line');
                if (dataLines.indexOf(line) === -1) dataLines.push(line);
            });
            dataLines.sort(function(a, b) { return parseInt(a) - parseInt(b); });
            for (let j = 0; j < dataLines.length; j++) {
                lineNames.push('线路' + (j + 1));
            }
        }

        if (lineNames.length === 0) {
            lineNames = ['默认线路'];
        }

        for (let li = 0; li < lineNames.length; li++) {
            let lineNum = li + 1;
            let episodes = [];

            $('a[data-line="' + lineNum + '"]').each(function() {
                let epName = $(this).text().trim() || '';
                let epHref = $(this).attr('href') || '';
                let epDataid = $(this).attr('dataid') || '';

                if (!epName) {
                    epName = '播放';
                }

                if (epHref) {
                    let epId = epHref.replace('/play/', '').replace('/', '');
                    let playId = epId + '|' + (epDataid || '') + '|' + userlink + '|' + vodid;
                    episodes.push({ name: epName, href: playId });
                }
            });

            if (episodes.length === 0) {
                let allLinks = $('a[href^="/play/"]');
                for (let i = 0; i < allLinks.length; i++) {
                    let link = $(allLinks[i]);
                    let href = link.attr('href') || '';
                    let name = link.text().trim() || '播放';
                    let epId = href.replace('/play/', '').replace('/', '');
                    if (epId && episodes.filter(function(e) { return e.href.split('|')[0] === epId; }).length === 0) {
                        let playId = epId + '||' + userlink + '|' + vodid;
                        episodes.push({ name: name, href: playId });
                    }
                }
            }

            if (episodes.length > 0) {
                episodes.sort(function(a, b) {
                    let numMatchA = a.name.match(/第(\d+)集/);
                    let numMatchB = b.name.match(/第(\d+)集/);
                    let numA = numMatchA ? parseInt(numMatchA[1]) : 0;
                    let numB = numMatchB ? parseInt(numMatchB[1]) : 0;
                    if (numA > 0 && numB > 0) {
                        return numA - numB;
                    }
                    return 0;
                });

                for (let q = 0; q < qualityConfigs.length; q++) {
                    let qConfig = qualityConfigs[q];
                    let lineName = lineNames.length > 1 
                        ? lineNames[li] + '-' + qConfig.name 
                        : qConfig.name;
                    let lineEpisodes = episodes.map(ep => `${ep.name}$${ep.href}|${qConfig.quality}`);
                    lines.push(lineName);
                    playlists.push(lineEpisodes);
                }
            }
        }

        if (lines.length === 0) {
            for (let q = 0; q < qualityConfigs.length; q++) {
                let qConfig = qualityConfigs[q];
                let playId = id + '||' + userlink + '|' + vodid + '|' + qConfig.quality;
                lines.push(qConfig.name);
                playlists.push([`播放$${playId}`]);
            }
        }

        const { vod_play_from, vod_play_url } = buildVodPlayData(lines, playlists);

        return JSON.stringify({
            list: [{
                vod_id: id,
                vod_name,
                vod_pic,
                vod_actor,
                vod_director,
                vod_remarks,
                vod_year,
                vod_area,
                vod_content,
                vod_class,
                vod_play_from,
                vod_play_url
            }]
        });
    } catch (error) {
        console.error(`解析详情页异常 [ID: ${id}]:`, error);
        return JSON.stringify({ list: [] });
    }
}

function buildVodPlayData(lines, playlists) {
    const processedPlaylists = playlists.map(eps => eps.join('#'));
    return {
        vod_play_from: lines.filter(Boolean).join('$$$'),
        vod_play_url: processedPlaylists.join('$$$')
    };
}

function extractWasmConfig(html) {
    const result = { jsUrl: '', bgUrl: '' };
    const cfgMatch = html.match(/id="wasm-cfg"[^>]*data-js="([^"]+)"[^>]*data-bg="([^"]+)"/);
    if (cfgMatch) {
        result.jsUrl = cfgMatch[1];
        result.bgUrl = cfgMatch[2];
    } else {
        const jsMatch = html.match(/data-js="([^"]*nbmovie_wasm[^"]*)"/);
        const bgMatch = html.match(/data-bg="([^"]*nbmovie_wasm_bg[^"]*)"/);
        if (jsMatch) result.jsUrl = jsMatch[1];
        if (bgMatch) result.bgUrl = bgMatch[1];
    }
    if (result.jsUrl && result.jsUrl.startsWith('/')) {
        result.jsUrl = appConfig.siteUrl + result.jsUrl;
    }
    if (result.bgUrl && result.bgUrl.startsWith('/')) {
        result.bgUrl = appConfig.siteUrl + result.bgUrl;
    }
    return result;
}

let wasmModuleCache = null;

async function loadWasmModule(wasmJsUrl, wasmBgUrl) {
    if (wasmModuleCache) return wasmModuleCache;

    try {
        if (typeof WebAssembly === 'undefined') {
            console.warn("当前环境不支持WebAssembly");
            return null;
        }

        const wasmBgResp = await req(wasmBgUrl, {
            headers: { "User-Agent": UA },
            responseType: 'arraybuffer'
        });

        let wasmBgData = wasmBgResp.content || wasmBgResp;
        if (typeof wasmBgData === 'string') {
            const buf = new ArrayBuffer(wasmBgData.length);
            const view = new Uint8Array(buf);
            for (let i = 0; i < wasmBgData.length; i++) {
                view[i] = wasmBgData.charCodeAt(i) & 0xff;
            }
            wasmBgData = buf;
        }

        const wasmHeap = new Array(1024);
        const wasmHeapFree = [];
        let WASM_VECTOR_LEN = 0;
        let wasmMemory = null;
        let wasmExports = null;

        function addHeapObject(obj) {
            if (wasmHeapFree.length > 0) {
                const idx = wasmHeapFree.pop();
                wasmHeap[idx] = obj;
                return idx;
            }
            wasmHeap.push(obj);
            return wasmHeap.length - 1;
        }

        function getStringFromWasm(ptr, len) {
            const mem = new Uint8Array(wasmMemory.buffer);
            let str = '';
            for (let i = ptr; i < ptr + len; i++) {
                str += String.fromCharCode(mem[i]);
            }
            return str;
        }

        function passStringToWasm(s) {
            const malloc = wasmExports.__wbindgen_export || wasmExports.__wbindgen_malloc;
            const ptr = malloc(s.length, 1) >>> 0;
            const mem = new Uint8Array(wasmMemory.buffer);
            for (let i = 0; i < s.length; i++) {
                mem[ptr + i] = s.charCodeAt(i);
            }
            WASM_VECTOR_LEN = s.length;
            return ptr;
        }

        const importObj = {
            "./nbmovie_wasm_bg.js": {
                __wbindgen_is_undefined: function(arg) {
                    return arg === undefined ? 1 : 0;
                },
                __wbindgen_throw: function(ptr, len) {
                    throw new Error("WASM error");
                },
                __wbg_content_4373268a6f34e443: function(arg0, arg1) {
                    const obj = wasmHeap[arg1];
                    const ret = obj ? obj.content || '' : '';
                    const ptr = passStringToWasm(ret);
                    const len = WASM_VECTOR_LEN;
                    const mem = new Int32Array(wasmMemory.buffer);
                    mem[arg0 / 4 + 1] = len;
                    mem[arg0 / 4 + 0] = ptr;
                },
                __wbg_document_c0320cd4183c6d9b: function(arg0) {
                    const obj = wasmHeap[arg0];
                    const ret = obj ? obj.document : null;
                    return ret ? addHeapObject(ret) : 0;
                },
                __wbg_getElementById_d1f25d287b19a833: function(arg0, arg1, arg2) {
                    const obj = wasmHeap[arg0];
                    const id = getStringFromWasm(arg1, arg2);
                    const ret = obj ? obj.getElementById(id) : null;
                    return ret ? addHeapObject(ret) : 0;
                },
                __wbg_instanceof_HtmlMetaElement_07f78901e9785572: function(arg0) {
                    return 0;
                },
                __wbg_instanceof_Window_23e677d2c6843922: function(arg0) {
                    return 1;
                },
                __wbg_now_16f0c993d5dd6c27: function() {
                    return Date.now();
                },
                __wbg_static_accessor_GLOBAL_8adb955bd33fac2f: function() {
                    return 0;
                },
                __wbg_static_accessor_GLOBAL_THIS_ad356e0db91c7913: function() {
                    return addHeapObject(typeof globalThis !== 'undefined' ? globalThis : {});
                },
                __wbg_static_accessor_SELF_f207c857566db248: function() {
                    return 0;
                },
                __wbg_static_accessor_WINDOW_bb9f1ba69d61b386: function() {
                    return addHeapObject(typeof window !== 'undefined' ? window : {});
                },
                __wbindgen_object_clone_ref: function(arg0) {
                    const obj = wasmHeap[arg0];
                    return addHeapObject(obj);
                },
                __wbindgen_object_drop_ref: function(arg0) {
                    wasmHeap[arg0] = undefined;
                    wasmHeapFree.push(arg0);
                }
            }
        };

        const wasmModule = await WebAssembly.compile(wasmBgData);
        const instance = await WebAssembly.instantiate(wasmModule, importObj);
        wasmExports = instance.exports;
        wasmMemory = wasmExports.memory;

        function build_play_url(dataid, secret_key, quality, play_key) {
            const retptr = wasmExports.__wbindgen_add_to_stack_pointer(-16);
            const p0 = passStringToWasm(dataid);
            const len0 = WASM_VECTOR_LEN;
            const p1 = passStringToWasm(secret_key);
            const len1 = WASM_VECTOR_LEN;
            const p2 = passStringToWasm(quality);
            const len2 = WASM_VECTOR_LEN;
            const p3 = passStringToWasm(play_key);
            const len3 = WASM_VECTOR_LEN;

            wasmExports.build_play_url(retptr, p0, len0, p1, len1, p2, len2, p3, len3);

            const mem = new Int32Array(wasmMemory.buffer);
            const r0 = mem[retptr / 4 + 0];
            const r1 = mem[retptr / 4 + 1];
            const result = getStringFromWasm(r0, r1);

            wasmExports.__wbindgen_add_to_stack_pointer(16);

            if (wasmExports.__wbindgen_export3) {
                wasmExports.__wbindgen_export3(r0, r1, 1);
            }

            return result;
        }

        wasmModuleCache = { build_play_url };
        return wasmModuleCache;
    } catch (e) {
        console.error("加载WASM模块失败:", e.message);
        return null;
    }
}

async function fetchPlayApi(wasmExports, dataid, secret_key, quality, play_key) {
    const apiPath = wasmExports.build_play_url(dataid, secret_key, quality, play_key);
    if (!apiPath) return null;

    const apiUrl = apiPath.startsWith('http') ? apiPath : appConfig.siteUrl + apiPath;

    const resp = await req(apiUrl, {
        headers: {
            "User-Agent": UA,
            "Referer": appConfig.siteUrl + '/play/' + secret_key,
            "Accept": "application/json, text/plain, */*"
        }
    });

    const respText = resp.content || resp;
    let respData;
    try {
        respData = JSON.parse(respText);
    } catch (e) {
        console.error("播放API响应解析失败:", respText.substring(0, 200));
        return null;
    }

    if (respData.code === 200 && respData.data) {
        return respData.data;
    }

    console.error("播放API返回错误:", respData.message || respText.substring(0, 200));
    return null;
}

function pickBestQualityUrl(qualityUrls) {
    if (!qualityUrls || qualityUrls.length === 0) return null;

    const validUrls = qualityUrls.filter(q => q.url && q.url !== "1" && q.url !== "");
    if (validUrls.length === 0) return null;

    validUrls.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
    return validUrls[0].url;
}

async function getPlayUrlByWasm(dataid, secret_key, play_key, wasmJsUrl, wasmBgUrl, preferredQuality) {
    try {
        if (typeof WebAssembly === 'undefined') {
            console.warn("当前环境不支持WebAssembly");
            return null;
        }

        const wasmExports = await loadWasmModule(wasmJsUrl, wasmBgUrl);
        if (!wasmExports || !wasmExports.build_play_url) {
            console.error("WASM模块未正确加载");
            return null;
        }

        let qualities = ['2160', '1080', '720', '0'];
        if (preferredQuality && qualities.indexOf(preferredQuality) === -1) {
            qualities.unshift(preferredQuality);
        } else if (preferredQuality) {
            qualities = [preferredQuality];
        }

        for (let i = 0; i < qualities.length; i++) {
            const quality = qualities[i];
            const data = await fetchPlayApi(wasmExports, dataid, secret_key, quality, play_key);
            if (!data) continue;

            if (data.quality_urls && data.quality_urls.length > 0) {
                const bestUrl = pickBestQualityUrl(data.quality_urls);
                if (bestUrl) return bestUrl;

                const lockedQuality = data.quality_urls.find(q => q.url === "1" && !q.isvip);
                if (lockedQuality) {
                    const lockedData = await fetchPlayApi(wasmExports, dataid, secret_key, lockedQuality.bitrate.toString(), play_key);
                    if (lockedData && lockedData.quality_urls && lockedData.quality_urls.length > 0) {
                        const lockedUrl = pickBestQualityUrl(lockedData.quality_urls);
                        if (lockedUrl) return lockedUrl;
                    }
                }
            }

            if (data.url && data.url !== "1" && data.url !== "") {
                return data.url;
            }
        }

        console.error("所有画质尝试均失败");
        return null;
    } catch (e) {
        console.error("WASM获取播放地址失败:", e.message);
        return null;
    }
}

function extractAllDataids(html) {
    const results = [];
    const regex = /dataid="(\d+)"[^>]*data-line="(\d+)"[^>]*data-episode="(\d+)"/g;
    let match;
    while ((match = regex.exec(html)) !== null) {
        results.push({
            dataid: match[1],
            line: parseInt(match[2]),
            episode: parseInt(match[3])
        });
    }
    if (results.length === 0) {
        const simpleRegex = /dataid="(\d+)"/g;
        let m;
        let idx = 0;
        while ((m = simpleRegex.exec(html)) !== null) {
            results.push({
                dataid: m[1],
                line: 1,
                episode: ++idx
            });
        }
    }
    return results;
}

async function play(flag, id, flags) {
    try {
        if (id.startsWith("http")) {
            return JSON.stringify({
                parse: 0,
                Header: { "User-Agent": UA, "Referer": appConfig.siteUrl },
                url: id
            });
        }

        let parts = id.split('|');
        let realId = (parts[0] || id).replace(/^\//, '');
        let dataId = parts[1] || '';
        let userlink = parts[2] || '';
        let vodid = parts[3] || '';
        let quality = parts[4] || '';

        const html = (await req(`${appConfig.siteUrl}/play/${realId}`, {
            method: "GET",
            headers: {
                "User-Agent": UA,
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Referer": appConfig.siteUrl
            }
        })).content;

        if (!userlink) userlink = extractUserlink(html);
        if (!vodid) vodid = extractVodid(html);
        if (!dataId) {
            let dataidMatch = html.match(/dataid="(\d+)"/);
            if (dataidMatch) dataId = dataidMatch[1];
        }

        const wasmConfig = extractWasmConfig(html);

        if (dataId && realId && userlink && wasmConfig.jsUrl && wasmConfig.bgUrl) {
            const playUrl = await getPlayUrlByWasm(dataId, realId, userlink, wasmConfig.jsUrl, wasmConfig.bgUrl, quality);
            if (playUrl) {
                return JSON.stringify({
                    parse: 0,
                    Header: { "User-Agent": UA, "Referer": appConfig.siteUrl },
                    url: playUrl
                });
            }
        }

        return JSON.stringify({
            parse: 1,
            Header: { "User-Agent": UA, "Referer": appConfig.siteUrl },
            url: appConfig.siteUrl + '/play/' + realId
        });
    } catch (e) {
        console.error("播放失败:", e);
        return JSON.stringify({ parse: 1, url: appConfig.siteUrl });
    }
}

export default {
    init,
    home,
    category,
    detail,
    search,
    play
};
