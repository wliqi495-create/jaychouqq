var rule = {
    类型: '影视',
    title: 'PPnix',
    host: 'https://www.ppnix.com',
    url: '/cn/fyclass/fypage.html',
    filter_url: '/cn/fyclass/fypage.html',
    searchUrl: '/cn/search.php?searchword=**',
    searchable: 2,
    quickSearch: 0,
    filterable: 1,
    headers: {
        'Referer': 'https://www.ppnix.com/',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.162 Mobile Safari/537.36'
    },
    class_parse: '.nav-list li;a&&Text;a&&href;.*/cn/(.*)/1\\.html',
    home_content: '.row .col-md-6;li;*;*;*;*',
    category_url: '.row .col-md-6;li;*;*;*;*',
    detailUrl: '/cn/fyid.html',
    二级: {
        title: '.col-md-8 h1&&Text',
        img: '.col-md-4 img&&src',
        desc: '.col-md-8 p:nth-child(3)&&Text;.col-md-8 p:nth-child(4)&&Text;.col-md-8 p:nth-child(5)&&Text;.col-md-8 p:nth-child(6)&&Text;.col-md-8 p:nth-child(7)&&Text',
        content: '.col-md-8 p:nth-child(9)&&Text',
        tabs: '.panel-heading',
        tab_text: '.panel-title&&Text',
        lists: '.panel-body li',
        list_text: 'a&&Text',
        list_url: 'a&&href'
    },
    搜索: 'json:list;name;pic;;id',
    lazy: function () {
        let { input } = this;
        let id = input.match(/\/(movie|tv)\/(\d+)\.html/)[2];
        let isTv = input.includes('/tv/');
        let playUrl = isTv ? `/info/m3u8/${id}/1.m3u8` : `/info/m3u8/${id}/1080P.m3u8`;
        return { parse: 0, url: this.host + playUrl };
    }
};
