var rule = {
    类型:'影视',
    title:'全民追剧',
    desc:'不告诉你',
    host:'https://jenzg.cn',
    url: '/index.php/vod/showfyfilter.html[/index.php/vod/showfyclass.html]',
    searchUrl: '/index.php/vod/search/page/fypage/wd/**.html',
    searchable:1,quickSearch:1,double:false,timeout:5000,play_parse:true,filterable:1,invalid:true,
    class_name:'电影&电视剧&综艺&动漫&短剧',
    class_url:'/id/61&/id/79&/id/88&/id/93&/id/99',
    filter_url:'{{fl.area}}{{fl.class}}{{fl.cateId}}/page/fypage{{fl.year}}',
    filter_def:{'/id/61':{cateId:'/id/61'},'/id/79':{cateId:'/id/79'},'/id/88':{cateId:'/id/88'},'/id/93':{cateId:'/id/93'},'/id/99':{cateId:'/id/99'}},
    预处理: async () => {return []},
    推荐: async function (tid, pg, filter, extend) {
        let homeFn = rule.一级.bind(this);
        return await homeFn();
    },
    一级: async function (tid, pg, filter, extend) {
        let {input, pdfa, pdfh, pd} = this;
        let html = await request(input);
        let d = [];
        let data = pdfa(html, '.module-items .module-item');
        data.forEach((it) => {
            d.push({
                title: pdfh(it, 'a&&title'),
                pic_url: pd(it, 'img&&data-src'),
                desc: pdfh(it, '.module-item-text&&Text'),
                url: pd(it, 'a&&href'),
            })
        });
        return setResult(d)
    },
    二级: async function (ids) {
        let {input, pdfa, pdfh, pd} = this;
        let html = await request(input);
        let VOD = {};
        VOD.vod_name = pdfh(html, 'h1&&Text');//名称
        VOD.vod_actor = pdfh(html, '.video-info-items:eq(1)&&Text');//演员
        VOD.vod_director = pdfh(html, '.video-info-items:eq(0)&&Text');//导演
        VOD.vod_remarks = pdfh(html, '');//备注
        VOD.vod_status = pdfh(html, '');//状态
        VOD.vod_content = pdfh(html, '.video-info-content&&Text');//简介
        let playlist = pdfa(html, '.module-list');
        let tabs = pdfa(html, '.module-tab&&.module-tab-item.tab-item');
        let playmap = {};
        tabs.map((item, i) => {
            const form = pdfh(item, 'span&&Text');
            const list = playlist[i];
            const a = pdfa(list, 'body&&a:not(:contains(排序))');
            a.map((it) => {
                let title = pdfh(it, 'a&&Text');
                let urls = pd(it, 'a&&href', input);
                if (!playmap.hasOwnProperty(form)) {
                    playmap[form] = [];
                }
                playmap[form].push(title + "$" + urls);
            });
        });
        VOD.vod_play_from = Object.keys(playmap).join('$$$');
        const urls = Object.values(playmap);
        const playUrls = urls.map((urllist) => {
            return urllist.join("#");
        });
        VOD.vod_play_url = playUrls.join('$$$');
        return VOD;
    },
    搜索: async function (wd, quick, pg) {
        let {input, pdfa, pdfh, pd} = this;
        let html = await request(input);
        let d = [];
        let data = pdfa(html, '.module-items .module-search-item');
        data.forEach((it) => {
            d.push({
                title: pdfh(it, 'a&&title'),
                pic_url: pd(it, 'img&&data-src'),
                desc: pdfh(it, '.video-serial&&Text'),
                url: pd(it, 'a&&href'),
                content: pdfh(it, '.video-info-aux&&Text'),
            })
        });
        return setResult(d);
    },
    lazy: async function (flag, id, flags) {
        let {input, pdfa, pdfh, pd} = this;
        let html = await request(input);
        html = JSON.parse(html.match(/r player_.*?=(.*?)</)[1]);
        let url = html.url;
        if (html.encrypt == "1") {
            url = unescape(url)
            return {parse: 0, url: url}
        } else if (html.encrypt == "2") {
            url = unescape(base64Decode(url))
            return {parse: 0, url: url}
        }
        if (/m3u8|mp4/.test(url)) {
            input = url
            return {parse: 0, url: input}
        } else {
            return {parse: 0, url: input}
        }
    },
    filter: {"/id/61":[{"key":"class","name":"剧情","value":[{"n":"全部类型","v":""},{"n":"喜剧","v":"/class/喜剧"},{"n":"动作","v":"/class/动作"},{"n":"怪兽","v":"/class/怪兽"},{"n":"战争","v":"/class/战争"},{"n":"爱情","v":"/class/爱情"},{"n":"悬疑","v":"/class/悬疑"},{"n":"武侠","v":"/class/武侠"},{"n":"奇幻","v":"/class/奇幻"},{"n":"科幻","v":"/class/科幻"},{"n":"冒险","v":"/class/冒险"},{"n":"警匪","v":"/class/警匪"},{"n":"动画","v":"/class/动画"},{"n":"惊悚","v":"/class/惊悚"},{"n":"犯罪","v":"/class/犯罪"},{"n":"恐怖","v":"/class/恐怖"},{"n":"剧情","v":"/class/剧情"},{"n":"历史","v":"/class/历史"},{"n":"纪录片","v":"/class/纪录片"},{"n":"传记","v":"/class/传记"},{"n":"歌舞","v":"/class/歌舞"},{"n":"短片","v":"/class/短片"},{"n":"其他","v":"/class/其他"}]},{"key":"area","name":"地区","value":[{"n":"全部地区","v":""},{"n":"内地","v":"/area/内地"},{"n":"中国香港","v":"/area/中国香港"},{"n":"中国台湾","v":"/area/中国台湾"},{"n":"美国","v":"/area/美国"},{"n":"日本","v":"/area/日本"},{"n":"韩国","v":"/area/韩国"},{"n":"泰国","v":"/area/泰国"},{"n":"印度","v":"/area/印度"},{"n":"英国","v":"/area/英国"},{"n":"法国","v":"/area/法国"},{"n":"德国","v":"/area/德国"},{"n":"加拿大","v":"/area/加拿大"},{"n":"西班牙","v":"/area/西班牙"},{"n":"意大利","v":"/area/意大利"},{"n":"澳大利亚","v":"/area/澳大利亚"},{"n":"其它","v":"/area/其它"}]},{"key":"year","name":"年代","value":[{"n":"全部年代","v":""},{"n":"2025","v":"/year/2025"},{"n":"2024","v":"/year/2024"},{"n":"2023","v":"/year/2023"},{"n":"2022","v":"/year/2022"},{"n":"2021","v":"/year/2021"},{"n":"2020","v":"/year/2020"},{"n":"2019","v":"/year/2019"},{"n":"2018","v":"/year/2018"},{"n":"2017","v":"/year/2017"},{"n":"2016","v":"/year/2016"},{"n":"2015","v":"/year/2015"},{"n":"2014","v":"/year/2014"},{"n":"2013","v":"/year/2013"},{"n":"2012","v":"/year/2012"},{"n":"2011","v":"/year/2011"},{"n":"2010","v":"/year/2010"},{"n":"2009","v":"/year/2009"},{"n":"2008","v":"/year/2008"},{"n":"2007","v":"/year/2007"},{"n":"2006","v":"/year/2006"},{"n":"2005","v":"/year/2005"},{"n":"2004","v":"/year/2004"}]},{"key":"by","name":"排序","value":[{"n":"时间","v":"/by/time"},{"n":"人气","v":"/by/hits"},{"n":"评分","v":"/by/score"}]}],
        "/id/79":[{"key":"class","name":"类型","value":[{"n":"全部类型","v":""},{"n":"青春","v":"/class/青春"},{"n":"古装","v":"/class/古装"},{"n":"爱情","v":"/class/爱情"},{"n":"都市","v":"/class/都市"},{"n":"喜剧","v":"/class/喜剧"},{"n":"战争","v":"/class/战争"},{"n":"军旅","v":"/class/军旅"},{"n":"谍战","v":"/class/谍战"},{"n":"偶像","v":"/class/偶像"},{"n":"警匪","v":"/class/警匪"},{"n":"冒险","v":"/class/冒险"},{"n":"穿越","v":"/class/穿越"},{"n":"仙侠","v":"/class/仙侠"},{"n":"武侠","v":"/class/武侠"},{"n":"悬疑","v":"/class/悬疑"},{"n":"罪案","v":"/class/罪案"},{"n":"家庭","v":"/class/家庭"},{"n":"历史","v":"/class/历史"},{"n":"年代","v":"/class/年代"},{"n":"农村","v":"/class/农村"},{"n":"其他","v":"/class/其他"}]},{"key":"area","name":"地区","value":[{"n":"全部地区","v":""},{"n":"内地","v":"/area/内地"},{"n":"中国香港","v":"/area/中国香港"},{"n":"中国台湾","v":"/area/中国台湾"},{"n":"美国","v":"/area/美国"},{"n":"日本","v":"/area/日本"},{"n":"韩国","v":"/area/韩国"},{"n":"泰国","v":"/area/泰国"},{"n":"印度","v":"/area/印度"},{"n":"英国","v":"/area/英国"},{"n":"法国","v":"/area/法国"},{"n":"德国","v":"/area/德国"},{"n":"加拿大","v":"/area/加拿大"},{"n":"西班牙","v":"/area/西班牙"},{"n":"意大利","v":"/area/意大利"},{"n":"澳大利亚","v":"/area/澳大利亚"},{"n":"其它","v":"/area/其它"}]},{"key":"year","name":"年代","value":[{"n":"全部年代","v":""},{"n":"2025","v":"/year/2025"},{"n":"2024","v":"/year/2024"},{"n":"2023","v":"/year/2023"},{"n":"2022","v":"/year/2022"},{"n":"2021","v":"/year/2021"},{"n":"2020","v":"/year/2020"},{"n":"2019","v":"/year/2019"},{"n":"2018","v":"/year/2018"},{"n":"2017","v":"/year/2017"},{"n":"2016","v":"/year/2016"},{"n":"2015","v":"/year/2015"},{"n":"2014","v":"/year/2014"},{"n":"2013","v":"/year/2013"},{"n":"2012","v":"/year/2012"},{"n":"2011","v":"/year/2011"},{"n":"2010","v":"/year/2010"},{"n":"2009","v":"/year/2009"},{"n":"2008","v":"/year/2008"},{"n":"2007","v":"/year/2007"},{"n":"2006","v":"/year/2006"},{"n":"2005","v":"/year/2005"},{"n":"2004","v":"/year/2004"}]},{"key":"by","name":"排序","value":[{"n":"时间","v":"/by/time"},{"n":"人气","v":"/by/hits"},{"n":"评分","v":"/by/score"}]}],
        "/id/88":[{"key":"class","name":"类型","value":[{"n":"全部类型","v":""},{"n":"偶像","v":"/class/偶像"},{"n":"舞蹈","v":"/class/舞蹈"},{"n":"音乐","v":"/class/音乐"},{"n":"情感","v":"/class/情感"},{"n":"喜剧","v":"/class/喜剧"},{"n":"体育","v":"/class/体育"},{"n":"游戏","v":"/class/游戏"},{"n":"相声","v":"/class/相声"},{"n":"婚恋","v":"/class/婚恋"},{"n":"时尚","v":"/class/时尚"},{"n":"晚会","v":"/class/晚会"},{"n":"明星","v":"/class/明星"},{"n":"访谈","v":"/class/访谈"},{"n":"亲子","v":"/class/亲子"},{"n":"生活","v":"/class/生活"},{"n":"文化","v":"/class/文化"},{"n":"美食","v":"/class/美食"},{"n":"旅游","v":"/class/旅游"},{"n":"益智","v":"/class/益智"},{"n":"其他","v":"/class/其他"}]},{"key":"area","name":"地区","value":[{"n":"全部地区","v":""},{"n":"内地","v":"/area/内地"},{"n":"港台","v":"/area/港台"},{"n":"日韩","v":"/area/日韩"},{"n":"欧美","v":"/area/欧美"}]},{"key":"year","name":"年代","value":[{"n":"全部年代","v":""},{"n":"2025","v":"/year/2025"},{"n":"2024","v":"/year/2024"},{"n":"2023","v":"/year/2023"},{"n":"2022","v":"/year/2022"},{"n":"2021","v":"/year/2021"},{"n":"2020","v":"/year/2020"},{"n":"2019","v":"/year/2019"},{"n":"2018","v":"/year/2018"},{"n":"2017","v":"/year/2017"},{"n":"2016","v":"/year/2016"},{"n":"2015","v":"/year/2015"},{"n":"2014","v":"/year/2014"},{"n":"2013","v":"/year/2013"},{"n":"2012","v":"/year/2012"},{"n":"2011","v":"/year/2011"},{"n":"2010","v":"/year/2010"},{"n":"2009","v":"/year/2009"},{"n":"2008","v":"/year/2008"},{"n":"2007","v":"/year/2007"},{"n":"2006","v":"/year/2006"},{"n":"2005","v":"/year/2005"},{"n":"2004","v":"/year/2004"}]},{"key":"by","name":"排序","value":[{"n":"时间","v":"/by/time"},{"n":"人气","v":"/by/hits"},{"n":"评分","v":"/by/score"}]}],    "/id/93":[{"key":"class","name":"类型","value":[{"n":"全部类型","v":""},{"n":"玄幻","v":"/class/玄幻"},{"n":"科幻","v":"/class/科幻"},{"n":"武侠","v":"/class/武侠"},{"n":"冒险","v":"/class/冒险"},{"n":"战斗","v":"/class/战斗"},{"n":"搞笑","v":"/class/搞笑"},{"n":"恋爱","v":"/class/恋爱"},{"n":"魔幻","v":"/class/魔幻"},{"n":"竞技","v":"/class/竞技"},{"n":"悬疑","v":"/class/悬疑"},{"n":"日常","v":"/class/日常"},{"n":"校园","v":"/class/校园"},{"n":"真人","v":"/class/真人"},{"n":"推理","v":"/class/推理"},{"n":"历史","v":"/class/历史"},{"n":"经典","v":"/class/经典"},{"n":"其他","v":"/class/其他"}]},{"key":"area","name":"地区","value":[{"n":"全部地区","v":""},{"n":"国产","v":"/area/国产"},{"n":"日本","v":"/area/日本"},{"n":"欧美","v":"/area/欧美"},{"n":"其他","v":"/area/其他"}]},{"key":"year","name":"年代","value":[{"n":"全部年代","v":""},{"n":"2025","v":"/year/2025"},{"n":"2024","v":"/year/2024"},{"n":"2023","v":"/year/2023"},{"n":"2022","v":"/year/2022"},{"n":"2021","v":"/year/2021"},{"n":"2020","v":"/year/2020"},{"n":"2019","v":"/year/2019"},{"n":"2018","v":"/year/2018"},{"n":"2017","v":"/year/2017"},{"n":"2016","v":"/year/2016"},{"n":"2015","v":"/year/2015"},{"n":"2014","v":"/year/2014"},{"n":"2013","v":"/year/2013"},{"n":"2012","v":"/year/2012"},{"n":"2011","v":"/year/2011"},{"n":"2010","v":"/year/2010"},{"n":"2009","v":"/year/2009"},{"n":"2008","v":"/year/2008"},{"n":"2007","v":"/year/2007"},{"n":"2006","v":"/year/2006"},{"n":"2005","v":"/year/2005"},{"n":"2004","v":"/year/2004"}]},{"key":"by","name":"排序","value":[{"n":"时间","v":"/by/time"},{"n":"人气","v":"/by/hits"},{"n":"评分","v":"/by/score"}]}],
        "/id/99":[{"key":"class","name":"类型","value":[{"n":"全部类型","v":""},{"n":"青春","v":"/class/青春"},{"n":"古装","v":"/class/古装"},{"n":"爱情","v":"/class/爱情"},{"n":"都市","v":"/class/都市"},{"n":"喜剧","v":"/class/喜剧"},{"n":"战争","v":"/class/战争"},{"n":"军旅","v":"/class/军旅"},{"n":"谍战","v":"/class/谍战"},{"n":"偶像","v":"/class/偶像"},{"n":"警匪","v":"/class/警匪"},{"n":"冒险","v":"/class/冒险"},{"n":"穿越","v":"/class/穿越"},{"n":"仙侠","v":"/class/仙侠"},{"n":"武侠","v":"/class/武侠"},{"n":"悬疑","v":"/class/悬疑"},{"n":"罪案","v":"/class/罪案"},{"n":"家庭","v":"/class/家庭"},{"n":"历史","v":"/class/历史"},{"n":"年代","v":"/class/年代"},{"n":"农村","v":"/class/农村"},{"n":"其他","v":"/class/其他"}]},{"key":"year","name":"年代","value":[{"n":"全部年代","v":""},{"n":"2025","v":"/year/2025"},{"n":"2024","v":"/year/2024"},{"n":"2023","v":"/year/2023"},{"n":"2022","v":"/year/2022"},{"n":"2021","v":"/year/2021"},{"n":"2020","v":"/year/2020"},{"n":"2019","v":"/year/2019"},{"n":"2018","v":"/year/2018"},{"n":"2017","v":"/year/2017"},{"n":"2016","v":"/year/2016"},{"n":"2015","v":"/year/2015"},{"n":"2014","v":"/year/2014"},{"n":"2013","v":"/year/2013"},{"n":"2012","v":"/year/2012"},{"n":"2011","v":"/year/2011"},{"n":"2010","v":"/year/2010"},{"n":"2009","v":"/year/2009"},{"n":"2008","v":"/year/2008"},{"n":"2007","v":"/year/2007"},{"n":"2006","v":"/year/2006"},{"n":"2005","v":"/year/2005"},{"n":"2004","v":"/year/2004"}]},{"key":"by","name":"排序","value":[{"n":"时间","v":"/by/time"},{"n":"人气","v":"/by/hits"},{"n":"评分","v":"/by/score"}]}],
    }
}
