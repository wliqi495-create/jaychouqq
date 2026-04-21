var rule = {
author: '小可乐/v6.1.1',
title: '电影港',
类型: '影视',
host: 'https://www.dyg123.net',
headers: {'User-Agent': MOBILE_UA},
编码: 'utf-8',
timeout: 5000,

homeUrl: '/',
url: '/e/action/ListInfo.php?fyfilter',
filter_url: 'classid={{fl.cateId or "fyclass"}}&page=(fypage-1)&line=30&tempid=1&orderby={{fl.by or "newstime"}}',
searchUrl: '/e/search/index.php',
detailUrl: '',

limit: 9,
double: false,
class_name: '电影&剧集&综艺&动画&短剧',
class_url: '1&20&31&30&32',

推荐: '*',
一级: $js.toString(() => {
    let resHtml = fetch(input);
    VODS = rule.getVodList(resHtml);
}),
搜索: $js.toString(() => {
    VODS = [];
    let fbody = `keyboard=${KEY}&submit=搜索&show=title&tempid=1`;
    let resHtml = fetch(input, {
            headers: {
                ...rule.headers,
                "Content-Type": "application/x-www-form-urlencoded; charset=utf-8"
            },
            method: 'POST',
            body: fbody
    });
    let fvods = rule.getVodList(resHtml);
    VODS.push(...fvods);
    let flagNum = rule.cutStr(resHtml, 'searchid=', '"', '');
    if (flagNum) {
        let sUrl = `${HOST}/e/search/result/index.php?page=1&searchid=${flagNum}`;
        resHtml = fetch(sUrl);
        fvods = rule.getVodList(resHtml);
        VODS.push(...fvods);
    }
}),

二级: $js.toString(() => {
    let [id, kname, kpic, kremarks] = input.split('@');
    let resHtml = fetch(id);
    let kdetail = pdfh(resHtml, '.ct-l').split('<strong>')[0].replace(/[\u3000\s]+/g, '');
    let [ktabs, kurls] = [[], []];
    let xz_tabs = pdfa(resHtml, 'strong:has(span)').map((it,idx) => rule.cutStr(it, '【', '】', `磁力线${idx+1}`));
    ktabs.push(...xz_tabs);
    let zx_tabs = pdfa(resHtml, '#tab81').map((it,idx) => pdfh(it, 'body&&Text'));
    ktabs.push(...zx_tabs);
    let xz_urls = pdfa(resHtml, 'tbody').map(item => {
        let xz_url = pdfa(item, 'a').map(it => { return pdfh(it, 'body&&Text') + '$' + pdfh(it, 'a&&href') });
        return xz_url.join('#')
    });
    kurls.push(...xz_urls);
    let zx_urls = pdfa(resHtml, '.videourl').map(item => {
        let zx_url = pdfa(item, 'a').map(it => { return pdfh(it, 'body&&Text') + '$' + pd(it, 'a&&href', HOST) });
        return zx_url.join('#')
    });
    kurls.push(...zx_urls);
    VOD = {
        vod_id: id,
        vod_name: kname,
        vod_pic: kpic,
        type_name: rule.cutStr(kdetail, '◎类别', '◎', '类型'),
        vod_remarks: rule.cutStr(kdetail, '◎集数', '◎', '状态'),
        vod_year: rule.cutStr(kdetail, '◎年代', '◎', '1000'),
        vod_area: rule.cutStr(kdetail, '◎产地', '◎', '地区'),
        vod_lang: rule.cutStr(kdetail, '◎语言', '◎', '语言'),
        vod_director: rule.cutStr(kdetail, '◎导演', '◎', '导演'),
        vod_actor: rule.cutStr(kdetail, '◎演员', '</p>', '') || rule.cutStr(kdetail, '◎主演', '</p>', '主演'),
        vod_content: rule.cutStr(kdetail, '◎简介£>', '</p>', '') || kname,
        vod_play_from: ktabs.join('$$$'),
        vod_play_url: kurls.join('$$$')
    };
}),

play_parse: true,
lazy: $js.toString(() => {
    let kp = 0, kurl = '';
    if (/^magnet/.test(input)) {
        kurl = input;
    } else {
        let resHtml = fetch(input);
        let jurl = rule.cutStr(resHtml, "a:'", "'", '');
        if (/m3u8|mp4|mkv/.test(jurl)) {
            kurl = jurl;
        } else {
            jurl = rule.cutStr(resHtml, '<iframe£src="', '"', '');
            resHtml = fetch(jurl);
            kurl = getHome(jurl) + rule.cutStr(resHtml, 'url = "', '"', '');
            if (!/m3u8|mp4|mkv/.test(kurl)) {
                kurl = input;
                kp = 1;
            }
        }
    }
    input = { jx: 0, parse: kp, url: kurl, header: rule.headers };
}),

getVodList: function(khtml) {
    try {
        if (!khtml) {throw new Error('源码为空');}  
        let kvods = [];
        let listArr = pdfa(khtml, '.m1');
        for (let it of listArr) {
            let kname = rule.cutStr(it, 'alt="', '"', '名称');
            let kpic = rule.cutStr(it, 'data-original="', '"', '图片');
            let kremarks = rule.cutStr(it, 'other">', '</p>', '状态');
            kvods.push({
                vod_name: kname,
                vod_pic: kpic,
                vod_remarks: kremarks,
                vod_id: `${rule.cutStr(it, 'href="', '"', 'Id')}@${kname}@${kpic}@${kremarks}`
            });
        }
        return kvods;
    } catch (e) {
        console.error(`生成视频列表失败：`, e.message);
        return [];
    }
},

cutStr: function(str, prefix = '', suffix = '', defaultVal = 'cutFaile', clean = true, i = 1, all = false) {
    try {
        if (!str || typeof str !== 'string') {throw new Error('被截取对象需为非空字符串');}
        const cleanStr = cs => String(cs).replace(/<[^>]*?>/g, ' ').replace(/(&nbsp;|\u00A0|\s)+/g, ' ').trim().replace(/\s+/g, ' ');
        const esc = s => String(s).replace(/[.*+?${}()|[\]\\/^]/g, '\\$&');
        let pre = esc(prefix).replace(/£/g, '[^]*?');
        let end = esc(suffix);
        let regex = new RegExp(`${pre ? pre : '^'}([^]*?)${end ? end : '$'}`, 'g');
        let matchArr = [...str.matchAll(regex)];
        if (matchArr.length === 0) {return all ? [defaultVal] : defaultVal}
        if (all) {
            return matchArr.map(it => {
                const val = it[1] ?? defaultVal;
                return clean && val !== defaultVal ? cleanStr(val) : val;
            });
        }     
        i = parseInt(i, 10);
        if (isNaN(i) || i < 1) {throw new Error('序号需为大于0的整数');}
        i = i - 1;
        if (i >= matchArr.length) {throw new Error('序号越界');}
        let result = matchArr[i][1] ?? defaultVal;
        return clean && result !== defaultVal ? cleanStr(result) : result;
    } catch (e) {
        console.error(`字符串截取失败：`, e.message);
        return all ? ['cutErr'] : 'cutErr';
    }
},

filter: 'H4sIAAAAAAAAA6vmUgACJUMlq2gwCwSqlbJTK5WslJITS1I9U5R0lPISc1OB/Ocbdz+d1w3klyXmlAIFoquV8oDCT1tXvGxeARIGcgyVanWgwl0rnuyd87yzHSpjhJCZNudp53KEjDFc5nnHxmfNrQgZE4TM8olPd+5GyJgiTOtcjqLHDC7zrHHCs4ZpCBlzhEzHjCe7OhEyhgip57tWPd07FUnKQqk2tlYHI3CSKhEB86xv0tNd/RgB82xOw7NpG6Dm5KWWF5dkApXDLHqya9ezDVOgsvl5yTmZydkgq8A2xUIsVDIyoFbEAE2Ch9jsvcBAg4kjYuzZ9KUv569EkkJEzLM1y5/v60OSMhnIUDHGmlzpZDfWGKGT3UYDYDdXLQAMhqvHJAQAAA=='
}