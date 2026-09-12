import { Crypto, load, _, jinja2 } from './lib/cat.js';

let key = 'vsdj';
let url = 'https://www.ytshengde.com';
let siteKey = '';
let siteType = 0;

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1';

async function request(reqUrl, agentSp) {
    let res = await req(reqUrl, {
        method: 'get',
        headers: {
            'User-Agent': agentSp || UA,
            'Referer': url
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
    let classes = [{"type_id":5,"type_name":"短剧"}];
    let filterObj = {
		"5":[{"key":"letter","name":"字母","value":[{"n":"全部","v":""},{"n":"A","v":"A"},{"n":"B","v":"B"},{"n":"C","v":"C"},{"n":"D","v":"D"},{"n":"E","v":"E"},{"n":"F","v":"F"},{"n":"G","v":"G"},{"n":"H","v":"H"},{"n":"I","v":"I"},{"n":"J","v":"J"},{"n":"K","v":"K"},{"n":"L","v":"L"},{"n":"M","v":"M"},{"n":"N","v":"N"},{"n":"O","v":"O"},{"n":"P","v":"P"},{"n":"Q","v":"Q"},{"n":"R","v":"R"},{"n":"S","v":"S"},{"n":"T","v":"T"},{"n":"U","v":"U"},{"n":"V","v":"V"},{"n":"W","v":"W"},{"n":"X","v":"X"},{"n":"Y","v":"Y"},{"n":"Z","v":"Z"}]},{"key":"by","name":"排序","value":[{"n":"时间","v":"time"},{"n":"人气","v":"hits"},{"n":"评分","v":"score"}]}]
	};

    return JSON.stringify({
        class: classes,
        filters: filterObj,
    });
}

async function homeVod() {}

async function category(tid, pg, filter, extend) {
    if (pg <= 0) pg = 1;

    const link = url + '/sanyisw/' + tid + '--' + (extend.by || 'time') + '---' + (extend.letter || '') + '---' + pg + '---' + '.html';//https://m.duanju5.com/vodshow/nixi--排序---剧情---翻页---.html
    const html = await request(link);
    const $ = load(html);
    const items = $('ul.myui-vodlist > li');
    let videos = _.map(items, (item) => {
        const it = $(item).find('a:first')[0];
        const remarks = $($(item).find('span.pic-text text-right')[0]).text().trim();
        return {
            vod_id: it.attribs.href.replace(/.*?\/sanyidt\/(.*).html/g, '$1'),
            vod_name: it.attribs.title,
            vod_pic: url + it.attribs['data-original'],
            vod_remarks: remarks || '',
        };
    });
    const hasMore = $('ul.myui-page > li > a:contains(下一页)').length > 0;
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
    const html = await request(url + '/sanyidt/' + id + '.html');
    const $ = load(html);
    let vod = {
        vod_id: id,
        vod_name: $('h1:first').text().trim(),
        vod_type: $('.myui-content__detail p:first a').text(),
        vod_actor: $('.myui-content__detail p:nth-child(5)').text().replace('主演：',''),
        vod_director: $('.myui-content__detail p:nth-child(6)').text().replace('导演：',''),
        vod_pic: $('div.myui-content__thumb img:first').attr('data-original'),
        vod_remarks :$('#rating:first span').text().replace(/\s{2,}/g, ' '),
        vod_content: $('span.data').text().trim(),
    };
    const playlist = _.map($('ul.myui-content__list > li > a'), (it) => {
        return it.children[0].data + '$' + it.attribs.href.replace(/\/sanyipy\/(.*).html/g, '$1');
    });
    vod.vod_play_from = "多多线路";
    vod.vod_play_url = playlist.join('#');
    return JSON.stringify({
        list: [vod],
    });
}
async function play(flag, id, flags) {
    const link = url + '/sanyipy/' + id +'.html';
    const html = await request(link);
    const $ = load(html);
    const js = JSON.parse($('script:contains(player_)').html().replace('var player_aaaa=',''));
    const Url = js.url;
    const from = js.from;
    var paurl = await request(url +'/static/player/' + from + '.js');
    paurl = paurl.match(/ src="(.*?)'/)[1];
    var purl = paurl + Url + '&code=' + from;
    var playUrl = await request(purl);
    playUrl = playUrl.match(/ url = '(.*?)'/)[1];
    return JSON.stringify({
        parse: 0,
        url: playUrl,
    });
}

async function search(wd, quick) {
    let data = JSON.parse(await request(url + '/index.php/ajax/suggest?mid=1&wd=' + wd)).list;
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