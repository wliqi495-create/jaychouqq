/*
 * @File     : PPnix.js
 * @Author   : AI
 * @Date     : 2026-04-24
 * @Comments : PPnix 影视源 https://www.ppnix.com/cn/
@header({
  searchable: 1,
  filterable: 1,
  quickSearch: 0,
  title: 'PPnix',
  类型: '影视',
  lang: 'ds',
})
*/

var rule = {
    类型: '影视',
    title: 'PPnix',
    host: 'https://www.ppnix.com',
    homeUrl: '/cn/',
    url: '/cn/fyclass/',
    searchUrl: '/cn/search/**--.html',
    searchable: 1,
    quickSearch: 0,
    filterable: 1,
    headers: {
        'User-Agent': 'PC_UA',
    },
    timeout: 5000,
    class_name: '电影&电视剧',
    class_url: 'movie&tv',
    play_parse: true,
    limit: 20,
    double: false,

    // 首页推荐：聚合正在上映的电影和电视剧
    推荐: async function () {
        let { input, pdfa, pdfh, pd, HOST } = this;
        let html = await request(input);
        let results = [];
        let seen = new Set();
        
        // 聚合所有 .lists-content 下的列表
        let blocks = pdfa(html, '.lists-content ul');
        for (let block of blocks) {
            let items = pdfa(block, 'li');
            for (let item of items) {
                let title = pdfh(item, 'h2 a&&Text');
                let pic = pdfh(item, 'img&&src');
                let url = pd(item, 'a&&href', HOST);
                let remarks = pdfh(item, '.rate&&Text') || '';
                if (title && url && !seen.has(url)) {
                    seen.add(url);
                    results.push({
                        vod_name: title,
                        vod_pic: pic || '',
                        vod_remarks: remarks,
                        vod_id: url,
                    });
                }
            }
        }
        return setHomeResult(results);
    },

    // 一级分类列表：处理分页
    一级: async function () {
        let { input, pdfa, pdfh, pd, HOST, MY_PAGE } = this;
        let html = await request(input);
        let items = pdfa(html, '.lists-content ul li');
        let results = [];
        for (let item of items) {
            let title = pdfh(item, 'h2 a&&Text') || pdfh(item, 'h2 a&&title');
            let pic = pdfh(item, 'img&&src');
            let url = pd(item, 'a.thumbnail&&href', HOST) || pd(item, 'h2 a&&href', HOST);
            let remarks = pdfh(item, '.rate&&Text') || '';
            let yearEl = pdfh(item, '.countrie span&&Text') || '';
            if (yearEl) remarks = yearEl + (remarks ? ' / ' + remarks : '');
            if (title && url) {
                results.push({
                    vod_name: title,
                    vod_pic: pic || '',
                    vod_remarks: remarks,
                    vod_id: url,
                });
            }
        }
        
        // 分页处理：首页无后缀，后续页为 ---{n}-.html
        let nextPage = parseInt(MY_PAGE) + 1;
        let pageSuffix = '';
        if (nextPage > 1) {
            pageSuffix = '---' + (nextPage - 1) + '-.html';
        }
        let currentBase = input.replace(/---.*?\.html$/, '').replace(/\.html$/, '');
        if (!currentBase.endsWith('/')) currentBase += '/';
        let nextUrl = currentBase + pageSuffix;
        
        return {
            list: results,
            page: parseInt(MY_PAGE),
            pagecount: 9999,
            limit: results.length,
            total: 9999,
            next: nextUrl,
        };
    },

    // 二级详情：解析元数据和剧集列表
    二级: async function () {
        let { input, pdfa, pdfh, pd, HOST } = this;
        let html = await request(input);
        
        // 提取元数据
        let title = pdfh(html, '.product-title&&Text');
        if (title) {
            title = title.replace(/\s*\(\d{4}\).*$/, '').trim();
        }
        let pic = pdfh(html, '.product-header img.thumb&&src');
        let director = pdfh(html, '.product-excerpt:contains(导演) span&&Text') || '';
        let actors = pdfh(html, '.product-excerpt:contains(主演) span&&Text') || '';
        let typeName = pdfh(html, '.product-excerpt:contains(类型) span&&Text') || '';
        let area = pdfh(html, '.product-excerpt:contains(国家) span&&Text') || '';
        let alias = pdfh(html, '.product-excerpt:contains(又名) span&&Text') || '';
        let desc = pdfh(html, '.product-excerpt:contains(简介) span&&Text') || '';
        
        // 提取年份
        let year = '';
        let yr = title ? title.match(/\((\d{4})\)/) : null;
        if (!yr) {
            let fullTitle = pdfh(html, '.product-title&&Text');
            if (fullTitle) yr = fullTitle.match(/\((\d{4})\)/);
        }
        if (yr) year = yr[1];
        
        // 提取 m3u8 数组和 infoid
        let scriptMatch = html.match(/infoid=(\d+)/);
        let infoid = scriptMatch ? scriptMatch[1] : '';
        
        let m3u8Match = html.match(/m3u8=\[(.*?)\]/);
        let episodes = [];
        if (m3u8Match) {
            let arrStr = m3u8Match[1];
            let epMatches = arrStr.match(/'([^']*)'/g);
            if (epMatches) {
                episodes = epMatches.map(s => s.replace(/'/g, ''));
            }
        }
        
        // 构建播放列表：直接嵌入完整 m3u8 URL
        let vod_play_from = 'PPnix';
        let m3u8Base = HOST + '/info/m3u8/' + infoid + '/';
        let vod_play_url = episodes.map(ep => ep + '$' + m3u8Base + encodeURIComponent(ep) + '.m3u8').join('#');
        
        // 构建描述
        let descParts = [];
        if (alias) descParts.push('又名：' + alias);
        if (year) descParts.push('年份：' + year);
        if (area) descParts.push('地区：' + area);
        if (actors) descParts.push('演员：' + actors);
        if (director) descParts.push('导演：' + director);
        let descStr = descParts.join('；');
        
        return {
            vod_id: input,
            vod_name: title || '',
            vod_pic: pic || '',
            type_name: typeName || '',
            vod_year: year || '',
            vod_area: area || '',
            vod_actors: actors || '',
            vod_director: director || '',
            vod_content: desc || '',
            vod_remarks: descStr || '',
            vod_play_from: vod_play_from,
            vod_play_url: vod_play_url,
        };
    },

    // 搜索
    搜索: async function () {
        let { input, pdfa, pdfh, pd, HOST } = this;
        let html = await request(input);
        let items = pdfa(html, '.lists-content ul li');
        let results = [];
        for (let item of items) {
            let title = pdfh(item, 'h2 a&&Text') || pdfh(item, 'h2 a&&title');
            let pic = pdfh(item, 'img&&src');
            let url = pd(item, 'a.thumbnail&&href', HOST) || pd(item, 'h2 a&&href', HOST);
            let remarks = pdfh(item, '.rate&&Text') || '';
            if (title && url) {
                results.push({
                    vod_name: title,
                    vod_pic: pic || '',
                    vod_remarks: remarks,
                    vod_id: url,
                });
            }
        }
        return results;
    },

    // 免嗅懒人解析：vod_play_url 已包含完整 m3u8 地址
    lazy: async function () {
        let { input } = this;
        // input 是从 vod_play_url 传入的 m3u8 URL
        if (input.includes('/info/m3u8/')) {
            return {
                url: input,
                parse: 0,
                header: {
                    'User-Agent': 'PC_UA',
                    'Referer': 'https://www.ppnix.com/',
                },
            };
        }
        // 兜底：如果是 detail 页 URL，重新解析
        let html = await request(input);
        let idMatch = html.match(/infoid=(\d+)/);
        let infoid = idMatch ? idMatch[1] : '';
        let m3u8Match = html.match(/m3u8=\[(.*?)\]/);
        let param = '1080P';
        if (m3u8Match) {
            let m = m3u8Match[1].match(/'([^']*)'/);
            if (m) param = m[1];
        }
        let m3u8Url = 'https://www.ppnix.com/info/m3u8/' + infoid + '/' + param + '.m3u8';
        return {
            url: m3u8Url,
            parse: 0,
            header: {
                'User-Agent': 'PC_UA',
                'Referer': 'https://www.ppnix.com/',
            },
        };
    },
};
