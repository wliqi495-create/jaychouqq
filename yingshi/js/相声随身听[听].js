/*
@header({
  searchable: 2,
  filterable: 1,
  quickSearch: 0,
  title: '相声随身听[听]',
  lang: 'dr2'
})
*/

var rule = {
    title: '相声随身听[听]',
    host: 'https://www.xsmp3.com',
    // url:'/fyclass/fypage.html',
    url: '/fyfilter/fypage.html',
    filterable: 1,//是否启用分类筛选,
    filter_url: '{{fl.cateId}}',
    filter: 'H4sIAAAAAAAAA6WSX07CQBDG77LPcAFu4BkMD0grBAqRgJaFkKhEwBiLmKAkREFBgjEYhAdlxZ6m22Vv4RSQjtI++Taz+8s3/74iiSkxEtotkqRKSYhEIzl1RyEBko6kVMh5rSLePiE/imiH6hJMO89nQ1keOs+QOAqlwOpDlkfcfBdswi+bvN5ziaCS3IYsZizGAwTRjIfSvGvfVOUDQ1xBz26D9p2xqJ8gSkt4qJlXEFjsFXF5RfPo7atpsYY17yAwTnWPsu0ZgLLaQGCUepQWxoUwnuzpIwJ1uucJwsT2/S0GdegxXAoHiEKz/zyYo/BTdLmMhuibYmLK43OXCCbybmcvLT4di/YH740dpXYFcbF9V2wydVYxq/uglB7gaSW7lqzjJ5txjwIWkLO+NR/4sIU4YkcdYHn31IdNxXNo+LUZ/m4cHLHa+BrcmOGXx8AO2GMbI/BaCwLef15z4IagRnPL+5W+AQWWaeVyAwAA',
    filter_def: {
        gdg: {cateId: 'gdg'},
        dys: {cateId: 'dys'},
        xsxsl: {cateId: 'xsxsl'},
        qqs: {cateId: 'qqs'},
        msl: {cateId: 'msl'},
        hbl: {cateId: 'hbl'},
        lbr: {cateId: 'lbr'},
        mj: {cateId: 'mj'},
        hyw: {cateId: 'hyw'},
        ssj: {cateId: 'ssj'},
        jk: {cateId: 'jk'},
        mzm: {cateId: 'mzm'},
        yzh: {cateId: 'yzh'},
        swm: {cateId: 'swm'}
    },
    searchUrl: '/so/**_fypage.html',
    searchable: 2,
    quickSearch: 0,
    headers: {
        'User-Agent': 'MOBILE_UA'
    },
    hikerListCol: 'text_1',
    // 分类列表样式
    hikerClassListCol: 'text_1',
    timeout: 5000,
    class_parse: '.list-navi&&li;a&&Text;a&&href;/(\\w+).html',
    play_parse: true,
    lazy: 'js:input={jx:0,url:input,parse:0}',
    limit: 6,
    推荐: '*',
    一级: '#post_list_box&&li;h2&&Text;img&&src;.f_r&&span:eq(3)&&Text;a&&href',
    二级: {
        title: 'h1&&Text;.view&&Text',
        img: 'img&&src',
        desc: '.view&&Text;;;.lmname&&Text;.author&&Text',
        content: '.jAsrPyf4&&p:eq(1)&&Text',
        // tabs:'js:TABS=["相声随身听"]',
        lists: 'js:var VideoListJson;VideoListJson=eval(html.split("audio: ")[1].split("}\)")[0]);let list1=[];VideoListJson.forEach(function(it){list1.push(it.name.strip()+"$https:"+it.url)});LISTS=[list1];',
    },
    搜索: '*',
}
