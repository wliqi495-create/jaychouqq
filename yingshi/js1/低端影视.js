/*
 * @File     : 低端影视 DS 源
 * @Author   : Operit
 * @Date     : 2026-04-24
 * @Site     : https://ddys.icu
 * @Comments : 首页 myui/shoutu 主题 + 内页 stui/首图2 主题
 *             蓝光线路=m3u8加密直链，网盘线路=分享链接跳转
@header({
  searchable: 2,
  filterable: 0,
  quickSearch: 0,
  title: '低端影视[DS]',
  '类型': '影视',
  lang: 'ds'
})
*/
var rule = {
    类型: '影视',
    title: '低端影视[DS]',
    host: 'https://ddys.icu',
    homeUrl: '/',
    url: '/category/fyclass-fypage.html',
    searchUrl: '/search/-------------.html?wd=**',
    searchable: 2,
    quickSearch: 0,
    filterable: 0,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    timeout: 10000,
    class_name: '电影&电视剧&纪录片&动漫&综艺',
    class_url: '1&2&3&4&5',
    play_parse: true,
    lazy: async function () {
        let {input} = this;
        let html = await request(input);
        let jsonStr = html.match(/player_aaaa\s*=\s*({.+?});/);
        if (!jsonStr) {
            return {url: input, parse: 0};
        }
        try {
            let data = JSON.parse(jsonStr[1]);
            let playUrl = data.url || '';
            if (!playUrl) {
                return {url: input, parse: 0};
            }
            // 网盘链接：返回原始播放页，用户自行跳转网盘
            if (playUrl.includes('pan.quark.cn') || playUrl.includes('pan.baidu.com') || playUrl.includes('drive.uc.cn') || playUrl.includes('www.uc.cn')) {
                return {url: input, parse: 0};
            }
            // 蓝光加密m3u8直链：引擎自动解密播放
            return {
                url: playUrl,
                parse: 0,
                header: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            };
        } catch (e) {
            return {url: input, parse: 0};
        }
    },
    limit: 6,
    double: true,
    // 首页 myui 主题
    推荐: '.myui-vodbox-content;.info .title&&Text;.myui-vodlist__thumb img&&src;.info .remarks&&Text;a&&href',
    // 分类页 stui/首图2 主题
    一级: '.stui-vodlist>li;.stui-vodlist__detail .title&&Text;.stui-vodlist__thumb&&data-original;.pic-text&&Text;.stui-vodlist__thumb&&href',
    // 搜索页复用一级选择器
    搜索: '.stui-vodlist>li;.stui-vodlist__detail .title&&Text;.stui-vodlist__thumb&&data-original;.pic-text&&Text;.stui-vodlist__thumb&&href',
    // 详情页 stui 主题
    二级: async function () {
        let {input, pdfa, pdfh, pd, cheerio} = this;
        let html = await request(input);
        let VOD = {};
        let $ = cheerio.load(html);
        VOD.vod_name = $('.stui-content__detail .title').text().trim();
        VOD.vod_pic = $('.stui-content__thumb img').attr('data-original') || $('.stui-content__thumb img').attr('src') || '';
        if (VOD.vod_pic && !VOD.vod_pic.startsWith('http')) {
            VOD.vod_pic = this.host + VOD.vod_pic;
        }
        let $dataItems = $('.stui-content__detail .data');
        $dataItems.each(function () {
            let text = $(this).text().trim();
            if (text.startsWith('导演：')) {
                VOD.vod_director = text.replace('导演：', '').trim();
            } else if (text.startsWith('主演：')) {
                VOD.vod_actor = text.replace('主演：', '').trim();
            } else if (text.startsWith('类型：')) {
                VOD.type_name = text.replace('类型：', '').trim();
            } else if (text.startsWith('地区：')) {
                VOD.vod_area = text.replace('地区：', '').trim();
            } else if (text.startsWith('语言：')) {
                VOD.vod_lang = text.replace('语言：', '').trim();
            } else if (text.startsWith('年份：')) {
                let m = text.match(/(\d{4})/);
                if (m) VOD.vod_year = m[1];
            } else if (text.startsWith('更新时间：')) {
                VOD.vod_time = text.replace('更新时间：', '').trim();
            }
            let scoreMatch = text.match(/([\d.]+)\s*分/);
            if (scoreMatch) VOD.vod_score = scoreMatch[1];
        });
        VOD.vod_content = $('.stui-content__detail .desc.hidden-xs .detail-content').text().trim().replace(/\s+/g, ' ');
        let lines = [];
        let playUrls = [];
        let $tabs = $('.nav-tabs li a');
        $tabs.each(function (idx) {
            let name = $(this).text().trim();
            if (name) lines.push(name);
        });
        let $panes = $('.tab-content .tab-pane');
        $panes.each(function (idx) {
            if (idx < lines.length) {
                let episodes = [];
                $(this).find('.stui-content__playlist li a').each(function () {
                    let epName = $(this).text().trim();
                    let epLink = $(this).attr('href');
                    if (epName && epLink) episodes.push(epName + '$' + epLink);
                });
                if (episodes.length > 0) playUrls.push(episodes.join('#'));
            }
        });
        VOD.vod_play_from = lines.join('$$$');
        VOD.vod_play_url = playUrls.join('$$$');
        return VOD;
    },
}