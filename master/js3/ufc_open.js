import { Crypto, load, _, jinja2 } from './lib/cat.js';

let key = 'ufc';
let HOST = 'https://www.hula8.net';
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
    let classes = [{"type_id":"mma","type_name":"MMA赛事"},{"type_id":"boji","type_name":"站立搏击"},{"type_id":"thai-fight.html","type_name":"泰拳"},{"type_id":"quanji","type_name":"拳击"},{"type_id":"bare-knuckle-fighting-championship.html","type_name":"裸拳"},{"type_id":"other","type_name":"其他"}];
    let filterObj = {
		"mma":[{"key":"cateId","name":"类型","value":[{"n":"全部","v":"mma"},{"n":"UFC终极","v":"ufc-fighting-championship.html"},{"n":"UFC格斗之夜","v":"ufc-fight-night.html"},{"n":"BELLATOR格斗","v":"bellator-fighting-championship.html"},{"n":"PFL格斗","v":"professional-fighters-league.html"},{"n":"LFA格斗","v":"legacy-fighting-alliancelfa.html"},{"n":"ONE冠军赛","v":"one-fc"},{"n":"ONE周五之夜","v":"one-fc/one-friday-fights"},{"n":"JCK战觉城","v":"jck.html"},{"n":"武林笼中对","v":"wllzd.html"},{"n":"KSW波兰格斗","v":"konfrontacja-sztuk-walki.html"},{"n":"Eagle小鹰赛事","v":"eagle-fighting-championship.html"},{"n":"ACA俄罗斯赛事","v":"absolute-championship-akhmat.html"}]}],
        "boji":[{"key":"cateId","name":"类型","value":[{"n":"全部","v":"boji"},{"n":"K-1 JAPAN GROUP","v":"k-1.html"},{"n":"Krush赛事","v":"krush.html"},{"n":"RISE踢拳赛","v":"rise.html"},{"n":"武林风","v":"wlf2004.html"},{"n":"昆仑决","v":"kunlunjue"},{"n":"荣耀格斗赛","v":"glory.html"}]}],
        "thai-fight":[{"key":"cateId","name":"类型","value":[{"n":"全部","v":"thai-fight"},{"n":"泰之战","v":"thai-fight-king-of-muay-thai.html"},{"n":"THAI-FIGHT-LEAGUE","v":"thai-fight-league"}]}],
        "quanji":[{"key":"cateId","name":"类型","value":[{"n":"全部","v":"quanji"},{"n":"DAZN BOXING","v":"dazn-boxing.html"},{"n":"PBC BOXING","v":"pbc-boxing.html"},{"n":"TOP RANK BOXING","v":"top-rank-boxing.html"},{"n":"MATCHROOM BOXING","v":"dazn-matchroom-boxing.html"}]}],
        "bare-knuckle-fighting-championship.html":[{"key":"cateId","name":"类型","value":[{"n":"全部","v":"bare-knuckle-fighting-championship.html"},{"n":"裸拳Hardcore FC","v":"hardcore-fighting-championship.html"},{"n":"裸拳TOP DOG FC","v":"top-dog-fighting-championship.html"},{"n":"BYB裸拳","v":"tag/byb"}]}],
        "other":[{"key":"cateId","name":"类型","value":[{"n":"全部","v":"other"}]}]
	};

    return JSON.stringify({
        class: classes,
        filters: filterObj,
    });
}

async function homeVod() {}

async function category(tid, pg, filter, extend) {
    if (pg <= 0) pg = 1;
    const link = HOST + '/' + (extend.cateId || tid) + '/page/' + pg;//https://www.hula8.net/mma/page/5/#
    const html = await request(link);
    const $ = load(html);
    const items = $('section.picture-area div.picture-box');
    let videos = _.map(items, (item) => {
        const it = $(item).find('a:first')[0];
        const k = $(item).find('img:first')[0];
        const remarks = $($(item).find('div.module-item-note')[0]).text().trim();
        return {
            vod_id: it.attribs.href.replace(/.*?\/article\/(.*).html/g, '$1'),
            vod_name: k.attribs.alt,
            vod_pic: k.attribs['data-original'],
            vod_remarks: remarks || '',
        };
    });
    const hasMore = $('p.site-title > a:contains(武享吧)').length > 0;
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
    const html = await request(HOST + '/article/' + id + '.html');
    let pl = JSON.parse(html.match(/var bevideo_vids_.*?=(.*?);/)[1]);
    let vod = {
        vod_id: id,
        vod_name: '',
        vod_type: '',
        vod_actor: '',
        vod_director: '',
        vod_pic: '',
        vod_remarks: '',
        vod_content: '',
    };
    
    let playlist = _.map(pl.m3u8dplayer, function(item) {
				return item.pre + "$" + item.video;
			}).join('#');
	   vod.vod_play_from = "多多";
       vod.vod_play_url = playlist;
    return JSON.stringify({
        list: [vod],
    });
}
async function play(flag, id, flags) {
   return JSON.stringify({
        parse: 0,
        url: id,
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