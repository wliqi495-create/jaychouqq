/*
* @File     : yyff
* @Author   : user
* @Date     : 2026-04-30
* @Comments : yyff 影视网站爬虫源
*/

var rule = {
    // 影视|漫画|小说
    类型: '影视',
    // 源标题
    title: 'yyff影视',
    // 源主域名，可以自动处理后续链接的相对路径
    host: 'https://yyff.540734621.xyz',
    // 源主页链接，作为推荐的this.input
    homeUrl: '/',
    // 源一级列表链接 (fyclass=分类, fypage=页码)
    url: '/list/fyclass-fypage.html', 
    // 源搜索链接 (**=关键词, fypage=页码)
    searchUrl: '/search?wd=**&page=fypage',
    // 允许搜索(1)、允许快搜(1)、允许筛选(1)
    searchable: 1, 
    quickSearch: 0, 
    filterable: 1, 
    // 源默认请求头、调用await request如果参数二不填会自动添加
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://yyff.540734621.xyz/',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
    },
    // 接口访问超时时间
    timeout: 10000,
    // 静态分类名称
    class_name: '电影&电视剧&综艺&动漫&短剧',
    // 静态分类id
    class_url: '1&2&3&4&5',
    // 是否需要调用免嗅lazy函数 (服务器解析播放)
    play_parse: true,
    // 首页推荐显示数量
    limit: 12,
    // 是否双层列表定位,默认false
    double: false,
    
    // 推荐列表解析: 列表;标题;图片;描述;链接
    推荐: '.movie-list .item;a&&title;img&&src;.desc&&Text;a&&href',
    // 一级列表解析: 列表;标题;图片;描述;链接
    一级: '.movie-list .item;a&&title;img&&data-src||src;.year&&Text;a&&href',
    // 二级详情解析 (字典模式)
    二级: {
        "title": "h1&&Text",
        "img": ".cover img&&src",
        "desc": ".info .year&&Text|.info .area&&Text|.info .actor&&Text|.info .director&&Text",
        "content": ".intro&&Text",
        "tabs": ".play-tabs .tab",
        "lists": ".play-list ul li",
        "list_text": "a&&Text",
        "list_url": "a&&href"
    },
    // 搜索结果解析: 列表;标题;图片;描述;链接
    搜索: '.search-result .item;a&&title;img&&src;.desc&&Text;a&&href',
    
    // 自定义免嗅函数 (play_parse: true 时调用)
    lazy: async function () {
        let {input} = this;
        try {
            let html = await request(input, {headers: this.headers});
            // 尝试提取播放链接
            let match = html.match(/player.*?src\s*[=:]\s*["']([^"']+)["']/i);
            if (match) {
                return {
                    url: match[1].startsWith('http') ? match[1] : this.host + match[1],
                    parse: 1,
                    header: this.headers
                };
            }
            // 尝试提取m3u8链接
            match = html.match(/["']([^"']+\.m3u8[^"']*)["']/i);
            if (match) {
                return {
                    url: match[1].startsWith('http') ? match[1] : this.host + match[1],
                    parse: 0,
                    header: this.headers
                };
            }
            // 默认返回原URL进行解析
            return {
                url: input,
                parse: 1,
                header: this.headers
            };
        } catch (e) {
            return {
                url: input,
                parse: 1,
                header: this.headers
            };
        }
    }
}
