import { Crypto, load, _, jinja2 } from './lib/cat.js';

let key = 'zjm';
let HOST = 'https://www.zhuijumi.cc';
let siteKey = '';
let siteType = 0;

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1';

async function request(reqUrl, agentSp) {
    let res = await req(reqUrl, {
        method: 'get',
        headers: {
            'User-Agent': agentSp || UA,
            'Referer': HOST
        },
    });
    return res.content;
}

// cfg = {skey: siteKey, ext: extend}
async function init(cfg) {
    siteKey = cfg.skey;
    siteType = cfg.stype;
}

async function home(filter) {
    let classes = [{"type_id":"dongzuo","type_name":"电影"},{"type_id":"guochan","type_name":"追剧"},{"type_id":"daluzongyi","type_name":"综艺"},{"type_id":"guochandongman","type_name":"动漫"}];
    let filterObj = {
		"guochan":[{"key":"cateId","name":"类型","value":[{"n":"全部","v":"guochan"},{"n":"韩剧","v":"hanju"},{"n":"日剧","v":"riju"},{"n":"欧美剧","v":"oumei"},{"n":"港台剧","v":"xianggang"},{"n":"海外剧","v":"haiwaiju"}]}],
		"dongzuo":[{"key":"cateId","name":"类型","value":[{"n":"全部","v":"dongzuo"},{"n":"纪录片","v":"jilu"},{"n":"喜剧片","v":"xiju"},{"n":"爱情片","v":"aiqing"},{"n":"科幻片","v":"kehuan"},{"n":"恐怖片","v":"kongbu"},{"n":"剧情片","v":"juqing"},{"n":"战争片","v":"zhanzheng"},{"n":"犯罪片","v":"fanzui"},{"n":"悬疑片","v":"xuanyi"},{"n":"灾难片","v":"zainan"},{"n":"奇幻片","v":"qihuan"},{"n":"动画片","v":"donghua"}]}],
		"daluzongyi":[{"key":"cateId","name":"类型","value":[{"n":"全部","v":"daluzongyi"},{"n":"港台综艺","v":"gangtaizongyi"},{"n":"日韩综艺","v":"rihanzongyi"},{"n":"欧美综艺","v":"oumeizongyi"}]}],
		"guochandongman":[{"key":"cateId","name":"类型","value":[{"n":"全部","v":"guochandongman"},{"n":"日本动漫","v":"ribendongman"},{"n":"欧美动漫","v":"oumeidongman"}]}]
	};

    return JSON.stringify({
        class: classes,
        filters: filterObj,
    });
}

async function homeVod() {}

async function category(tid, pg, filter, extend) {
    if (pg <= 0) pg = 1;
    const link = HOST + '/mp4type/' + (extend.cateId || tid) + '-' + pg + '.html';//https://www.zhuijumi.cc/mp4type/guochan-2.html
    const html = await request(link);
    const $ = load(html);
    const items = $('ul.fed-list-info > li');
    let videos = _.map(items, (item) => {
        const it = $(item).find('a:first')[0];
        const k = $(item).find('a')[1];
        const remarks = $($(item).find('span.fed-list-remarks')[0]).text().trim();
        return {
            vod_id: it.attribs.href.replace(/.*?\/mp4\/(.*).html/g, '$1'),
            vod_name: k.children[0].data,
            vod_pic: HOST + it.attribs['data-original'],
            vod_remarks: remarks || '',
        };
    });
    const hasMore = $('div.fed-page-info > a:contains(下一页)').length > 0;
    const pgCount = hasMore ? parseInt(pg) + 1 : parseInt(pg);
    return JSON.stringify({
        page: parseInt(pg),
        pagecount: pgCount,
        limit: 24,
        total: 24 * pgCount,
        list: videos,
    });
}

async function detail(id) {
    var html = await request( HOST + '/mp4/' + id + '.html');
    var $ = load(html);
    var vod = {
        vod_id: id,
        vod_name: $('h1:first').text().trim(),
        vod_type: $('.stui-content__detail p:first a').text(),
        vod_actor: $('.stui-content__detail p:nth-child(3)').text().replace('主演：',''),
        vod_pic: $('.stui-content__thumb img:first').attr('data-original'),
        vod_remarks : $('.stui-content__detail p:nth-child(5)').text() || '',
        vod_content: $('span.detail-content').text().trim(),
    };
    var playMap = {};
    var tabs = $('div.fed-tabs-foot > ul >li >a');
    var playlists = $('ul.fed-tabs-btm');
    _.each(tabs, (tab, i) => {
        var from = tab.children[0].data;
        var list = playlists[i];
        list = $(list).find('a');
        _.each(list, (it) => {
            var title = it.children[0].data;
            var playUrl = it.attribs.href.replace(/\/mp4play\/(.*).html/g, '$1');
            if (title.length == 0) title = it.children[0].data.trim();
            if (!playMap.hasOwnProperty(from)) {
                playMap[from] = [];
            }
            playMap[from].push( title + '$' + playUrl);
        });
    });
    vod.vod_play_from = _.keys(playMap).join('$$$');
    var urls = _.values(playMap);
    var vod_play_url = _.map(urls, (urlist) => {
        return urlist.join('#');
    });
    vod.vod_play_url = vod_play_url.join('$$$');
    return JSON.stringify({
        list: [vod],
    });
}
async function play(flag, id, flags) {
    const link = HOST + '/mp4play/' + id + '.html';
    const html = await request(link);
    const $ = load(html);
    const js = JSON.parse($('script:contains(player_)').html().replace('var player_aaaa=',''));
    const playUrl = js.url;
    return JSON.stringify({
        parse: 0,
        url: playUrl,
    });
}

async function search(wd, quick) {
    let data = JSON.parse(await request(HOST + '/index.php/ajax/suggest?mid=1&wd=' + wd)).list;
    let videos = [];
    for (const vod of data) {
        videos.push({
            vod_id: vod.id,
            vod_name: vod.name,
            vod_pic: vod.pic,
            vod_remarks: '',
        });
    }
    return JSON.stringify({
        list: videos,
    });
}

export function __jsEvalReturn() {
    return {
        init: init,
        home: home,
        homeVod: homeVod,
        category: category,
        detail: detail,
        play: play,
        search: search,
    };
}