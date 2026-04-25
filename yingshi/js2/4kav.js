/*
@header({
  searchable: 1,
  filterable: 1,
  quickSearch: 1,
  title: '4kkav',
  '类型': '影视',
  lang: 'ds'
})
*/

var rule = {
    title: '4kkav',
    host: 'https://zh.xhamster.com',
    // url:'/4k/2',
    url: '/categories/fyfilter',
    searchUrl: '/search/**?quality=2160p&page=fypage',
    searchable: 1,
    quickSearch: 1,
    filterable: 1,
    filter_url: 'fyclass/4k{{fl.排序}}/fypage',
    filter: 'H4sIAAAAAAAAA+3WsUrDQBzH8T1PUW42iJv4KtLhb/onPc3dldylpZSCg6CTBQcndzcVxKXg22iJb2EawZK0Vw/i+MsU7i7/L4TPcLOoVz0iGUrNlsVJ77ReWD+z37f6yAVPq22xur37XC7EQXNTk2L/7piyojl7d2Mzrp71cPnx/tqatZm5PnJ4xtaJrQPz7W/+CK3uX/aHNE/+JfW2KB9vvq7bv6hVU8a6eCyr5qBzsny+Kp+WYcnEKMXa7aw2VvpRc73/M1uc04gACZA6Qzo6jqdMeWyyASz5QrAUZMlKndLI5EwalnwhWAqyRFZCkT8ERUGK8sLCERx1duRITnDfhqTukhKTZZzCkTcER2GOCmWHxsGRLwRHQY5MnpJVYOQLgVHYBYkZt2xvCIj2I4rm31EjolIfGQAA',
    class_name: '4k&国产&日本&18&新加坡&亚洲&俄罗斯&中国台湾&大学生&射液&高潮&青少年', //静态分类名称拼接/categories/chinese/4k/2
    class_url: '4k&chinese&japanese&18-year-old&singaporean&asian&russian&taiwanese&college&cumshot&orgasm&teen', //静态分类标识拼接
    limit: 999,
    headers: { 'User-Agent': PC_UA },
    double: true,
    一级: $js.toString(() => {
        let d = [];
        function processUrl(url) {
            if (MY_CATE === '4k') {
                if (MY_PAGE === 1) {
                    return HOST + '/4k?formatFrozen=1';
                } else {
                    return HOST + '/' + MY_CATE + '/' + MY_PAGE;
                }
            } else {
                if (MY_PAGE == 1) {
                    return url.substring(0, url.length - 2)
                } else {
                    return url;
                }
            }
        }
        let html = request(processUrl(input))
        let htmm = jsp.pdfh(html, '#initials-script&&Html')
        let jss = htmm.slice(16, -1);
        let str = JSON.parse(jss.replace(/<div[^>]*>.*?<\/div>/gi, '')
            .replace(/<span[^>]*>.*?<\/span>/gi, ''));
        // console.log("dgdgeudgwe====" + JSON.stringify(str))
        function data(myclass) {
            if (myclass === '4k') {
                let dtat = str.pagesIndexFormatComponent.trendingVideoListProps.videoThumbProps;
                return dtat
            } else {
                let dtat= str.pagesCategoryComponent.trendingVideoListProps.videoThumbProps;
                return dtat 
                // let dtat=str.searchResult.videoThumbProps;
            }
        }
        data(MY_CATE).forEach(it => {
            d.push({
                url: it.pageURL,
                title: it.title,
                img: it.thumbURL,
            })
        });
        setResult(d)
    }),
    二级: $js.toString(() => {
        let urls = [];
        let html = request(input)
        let htmm = jsp.pdfh(html, '#initials-script&&Html')
        let jss = htmm.slice(16, -1);
        let str = JSON.parse(jss.replace(/<div[^>]*>.*?<\/div>/gi, '')
            .replace(/<span[^>]*>.*?<\/span>/gi, ''));
        let data = str.xplayerSettings.sources.standard.h264;
        data.forEach(it => {
            if (it.quality === 'auto') {
                if (it.fallback) {
                    urls.push("4k①" + '$' + it.url);
                    urls.push("4k②" + '$' + it.fallback);
                } else {
                    urls.push("4k" + '$' + it.url);
                }
            } else {
                urls.push(it.quality + '$' + it.url);
            }
        });

        VOD = {
            vod_play_from: 'XSP',
            vod_play_url: urls.join('#')
        }
    }),
    搜索: $js.toString(() => {
        let d = [];
        let html = request(input)
        let htmm = jsp.pdfh(html, '#initials-script&&Html')
        let jss = htmm.slice(16, -1);
        let str = JSON.parse(jss.replace(/<div[^>]*>.*?<\/div>/gi, '')
            .replace(/<span[^>]*>.*?<\/span>/gi, ''));
        // console.log("dgdgeudgwe===="+JSON.parse(str))
        let dtat = str.searchResult.videoThumbProps;
        dtat.forEach(it => {
            d.push({
                url: it.pageURL,
                title: it.title,
                img: it.thumbURL,
            })
        });
        setResult(d)
    }),
}