/**
 * @File     : a123tv.js
 * @Author   : AI Assistant
 * @Date     : 2026-04-29
 * @Comments : A123TV 爬虫源 - 自定义CMS
@header({
  searchable: 2,
  filterable: 0,
  quickSearch: 0,
  title: 'A123TV',
  类型: '影视',
  lang: 'ds',
})
*/

var rule = {
    类型: '影视',
    title: 'A123TV',
    host: 'https://a123tv.com',
    homeUrl: '/',
    url: '/t/fyclass/pfypage.html[/t/fyclass.html]',
    searchUrl: '/s/**.html',
    searchable: 2,
    quickSearch: 0,
    filterable: 1,
    headers: {
        'User-Agent': 'MOBILE_UA',
    },
    timeout: 5000,
    play_parse: true,
    limit: 24,
    double: false,

    class_name: '电影&连续剧&综艺&动漫&福利',
    class_url: '10&11&12&13&15',
    class_parse: async function () {
        let { input } = this;
        let html = await request(input);
        let result = [];
        let filters = {};
        let sections = html.match(/<div class="w4-meta"[^>]*>[\s\S]*?<\/div>/g);
        if (sections) {
            sections.forEach(function(sec) {
                let h3Match = sec.match(/<h3>([^<]+)<\/h3>/);
                if (h3Match) {
                    let mainName = h3Match[1].trim();
                    let mainId = '';
                    let links = sec.match(/<a[^>]*href="\/t\/(\d+)\.html"[^>]*>([^<]+)<\/a>/g);
                    if (links && links.length > 0) {
                        let firstHref = links[0].match(/href="\/t\/(\d+)\.html"/);
                        if (firstHref) mainId = firstHref[1];
                        let subItems = [];
                        links.forEach(function(link) {
                            let hm = link.match(/href="\/t\/(\d+)\.html"/);
                            let tm = link.match(/>([^<]+)</);
                            if (hm && tm) subItems.push({ n: tm[1], v: hm[1] });
                        });
                        if (mainId && subItems.length > 0) {
                            result.push({ type_id: mainId, type_name: mainName });
                            filters[mainId] = { key: '子分类', name: '子分类', value: subItems };
                        }
                    }
                }
            });
        }
        return { class: result, filters: filters };
    },
    推荐: '.w4-item-wrap;.w4-item-info .t&&Text;.w4-item-cover img&&data-src;.w4-item-info .i&&Text;.w4-item&&href',

    一级: '.w4-item-wrap;.w4-item-info .t&&Text;.w4-item-cover img&&data-src;.w4-item-info .i&&Text;.w4-item&&href',

    搜索: '.w4-item-wrap;.w4-item-info .t&&Text;.w4-item-cover img&&data-src;.w4-item-info .i&&Text;.w4-item&&href',

    二级: async function () {
        let { input } = this;
        let html = await request(input);
        let vod_name = pdfh(html, 'meta[property="og:title"]&&content');
        if (!vod_name) vod_name = pdfh(html, 'h1&&Text');
        let vod_pic = pdfh(html, 'meta[property="og:image"]&&content');
        let vod_desc = pdfh(html, 'meta[property="og:description"]&&content');
        let vod_year = '', vod_area = '', vod_actor = '', vod_director = '', vod_content = '';
        if (vod_desc) {
            let m = vod_desc.match(/地区：([^。]+)/);
            if (m) vod_area = m[1].trim();
            m = vod_desc.match(/演员：([^。]+)/);
            if (m) vod_actor = m[1].trim();
            m = vod_desc.match(/导演：([^。]+)/);
            if (m) vod_director = m[1].trim();
            m = vod_desc.match(/剧情：(.+)/);
            if (m) vod_content = m[1].trim();
        }
        let ppMatch = html.match(/var pp=(\{[\s\S]*?\});/);
        let vod_play_from = '', vod_play_url = '';
        if (ppMatch) {
            try {
                let pp = JSON.parse(ppMatch[1]);
                if (pp.la && pp.la.length > 0) {
                    let fromArr = [], urlArr = [];
                    pp.la.forEach(function(item) {
                        let lineId = item[0], lineName = item[1], epCount = item[2];
                        fromArr.push(lineName);
                        if (epCount <= 1) {
                            urlArr.push(lineId + 'z0$' + input.replace('.html', '/' + lineId + 'z0.html'));
                        } else {
                            let epParts = [];
                            for (let i = 0; i < epCount; i++) {
                                epParts.push('第' + (i+1) + '集$' + input.replace('.html', '/' + lineId + 'z' + i + '.html'));
                            }
                            urlArr.push(epParts.join('#'));
                        }
                    });
                    vod_play_from = fromArr.join('$$$');
                    vod_play_url = urlArr.join('$$$');
                }
            } catch(e) {}
        }
        return {
            vod_name: vod_name || '', vod_pic: vod_pic || '',
            vod_year: vod_year, vod_area: vod_area,
            vod_actor: vod_actor, vod_director: vod_director,
            vod_content: vod_content,
            vod_play_from: vod_play_from, vod_play_url: vod_play_url
        };
    },

    lazy: async function () {
        let { input } = this;
        let html = await request(input);
        let ppMatch = html.match(/var pp=(\{[\s\S]*?\});/);
        if (ppMatch) {
            try {
                let pp = JSON.parse(ppMatch[1]);
                if (pp.la && pp.la.length > 0) {
                    let playUrl = pp.la[0][4];
                    if (playUrl && playUrl.startsWith('http')) {
                        return { url: playUrl, parse: 0, header: { 'Referer': 'https://a123tv.com/' } };
                    }
                }
            } catch(e) {}
        }
        let directUrl = pdfh(html, '#awp1&&data-src');
        if (directUrl && directUrl.startsWith('http')) {
            return { url: directUrl, parse: 0, header: { 'Referer': 'https://a123tv.com/' } };
        }
        return { parse: 1, url: input };
    }
};