import { Crypto, _ } from 'assets://js/lib/cat.js';

let siteKey = '';
let siteType = 0;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';

const CLASSES = [
    { type_id: '📺电影台', type_name: '电影台' },
    { type_id: '📺体育台', type_name: '体育台' },
    { type_id: '📺港台', type_name: '港台' },
    { type_id: '📺直播台🔞', type_name: '🔞+直播台' },
    { type_id: '📺午夜剧场🔞(挂梯)', type_name: '🔞午夜剧场' },
    { type_id: '🔞港台三级', type_name: '🔞港台三级' },
    { type_id: '🔞其他影片', type_name: '🔞其他影片' },
    { type_id: '🔞美国成人版', type_name: '🔞美国成人版' }
];

const CHANNELS = {
    '📺电影台': [
        { name: 'CCTV6电影', url: 'http://107.150.60.122/live/cctv6hd.m3u8' },
        { name: 'NOW爆谷台', url: 'http://173.208.234.146/live/nowbg.m3u8' },
        { name: 'NOW星影台', url: 'http://173.208.234.146/live/nowxy.m3u8' },
        { name: '美亚电影HD', url: 'http://173.208.234.146/live/mymovie.m3u8' },
        { name: '龙华电影*线路1', url: 'https://cdn.qd.je/163189/lhdy' },
        { name: '龙华电影*线路2', url: 'http://iptv.4666888.xyz/iptv2A.php?id=45' },
        { name: '靖天电影', url: 'http://iptv.4666888.xyz/iptv2A.php?id=56' },
        { name: '東森电影', url: 'http://iptv.4666888.xyz/iptv2A.php?id=48' }
    ],
    '📺体育台': [
        { name: 'CCTV5体育*线路1', url: 'http://173.208.212.130:8181/1080p/cctv5.m3u8' },
        { name: 'CCTV5体育*线路2', url: 'https://php.jdshipin.com:2096/TVOD/iptv.php?id=cctv5' },
        { name: 'CCTV5+体育赛事', url: 'http://107.150.60.122/live/cctv5p.m3u8' },
        { name: 'CCTV16奥林匹克*线路1', url: 'http://207.56.13.146:81/cdnlive/cctv16.m3u8' },
        { name: 'CCTV16奥林匹克*线路2', url: 'https://php.jdshipin.com:2096/TVOD/iptv.php?id=cctv16' }
    ],
    '📺港台': [
        { name: '翡翠台*线路1', url: 'http://183.62.8.58:50085/tsfile/live/0017_1.m3u8?key=txiptv&playlive=1&authid=0' },
        { name: '翡翠台*线路2(挂梯)', url: 'https://cdn.qd.je/163189.php?id=fct' },
        { name: '翡翠台4K(挂梯)', url: 'https://cdn3.indevs.in/stream/tvb/fct4k/' }
    ],
    '📺直播台🔞': [
        { name: '俄罗斯极限电影台', url: 'http://ef90a6cd.rossteleccom.net/iptv/2TBC4G2WWDG6RSUSN5SXSQEC/14158/index.m3u8' },
        { name: '惊艳台*线路1', url: 'http://15.204.105.50:25461/live/G2s9zK2n9m/xDtwVfWM8T/85.ts' },
        { name: '惊艳台*线路2', url: 'http://15.204.105.50:25461/live/G2s9zK2n9m/xDtwVfWM8T/87.ts' },
        { name: '潘多啦完美', url: 'http://15.204.105.50:25461/live/G2s9zK2n9m/xDtwVfWM8T/86.ts' },
        { name: '香蕉台HD', url: 'http://15.204.105.50:25461/live/G2s9zK2n9m/xDtwVfWM8T/117.ts' },
        { name: '松视1', url: 'http://15.204.105.50:25461/live/G2s9zK2n9m/xDtwVfWM8T/88.ts' },
        { name: '松视2', url: 'http://15.204.105.50:25461/live/G2s9zK2n9m/xDtwVfWM8T/89.ts' },
        { name: '松视3', url: 'http://15.204.105.50:25461/live/G2s9zK2n9m/xDtwVfWM8T/90.ts' },
        { name: '奧視', url: 'http://125.227.210.55:1022/VideoInput/play.ts' },
        { name: '奧視2', url: 'http://125.227.210.55:3031/VideoInput/play.ts' }
    ],
    '📺午夜剧场🔞(挂梯)': [
        { name: '极限电影台', url: 'http://x315601.serv00.net/cr.php?url=http://lc.aacalive.com:26789/i/ghjnvq5o/8c855fdf/index.m3u8' },
        { name: '🌲松视1️⃣台', url: 'http://x315601.serv00.net/cr.php?url=http://lc.aacalive.com:26789/i/ghjnvq5o/8c85giea/index.m3u8' },
        { name: '🌲松视2️⃣台', url: 'http://x315601.serv00.net/cr.php?url=http://lc.aacalive.com:26789/i/ghjnvq5o/8c85fsaf/index.m3u8' },
        { name: '🍌香焦台HD', url: 'http://x315601.serv00.net/cr.php?url=http://lc.aacalive.com:26789/i/ghjnvq5o/mdfdc123/index.m3u8' },
        { name: '潘多啦完美', url: 'http://x315601.serv00.net/cr.php?url=http://lc.aacalive.com:26789/i/ghjnvq5o/8c855d75/index.m3u8' },
        { name: 'HAPPY', url: 'http://x315601.serv00.net/cr.php?url=http://lc.aacalive.com:26789/i/ghjnvq5o/mdfdc125/index.m3u8' },
        { name: '🌈🅴彩虹E', url: 'http://x315601.serv00.net/cr.php?url=http://lc.aacalive.com:26789/i/ghjnvq5o/8c855daa/index.m3u8' },
        { name: '驚艷台HD', url: 'http://x315601.serv00.net/cr.php?url=http://lc.aacalive.com:26789/i/ghjnvq5o/sajdxxzc/index.m3u8' },
        { name: '高清LIVE', url: 'http://x315601.serv00.net/cr.php?url=http://lc.aacalive.com:26789/i/ghjnvq5o/asdm3134/index.m3u8' },
        { name: '中字➊', url: 'http://x315601.serv00.net/cr.php?url=http://lc.aacalive.com:26789/i/ghjnvq5o/8jainsbq/index.m3u8' },
        { name: '中字➋', url: 'http://x315601.serv00.net/cr.php?url=http://lc.aacalive.com:26789/i/ghjnvq5o/v19a2133/index.m3u8' },
        { name: '中字➌', url: 'http://x315601.serv00.net/cr.php?url=http://lc.aacalive.com:26789/i/ghjnvq5o/56ffe9b8/index.m3u8' },
        { name: '中字➍', url: 'http://x315601.serv00.net/cr.php?url=http://lc.aacalive.com:26789/i/ghjnvq5o/2a8cba45/index.m3u8' },
        { name: '中字➎', url: 'http://x315601.serv00.net/cr.php?url=http://lc.aacalive.com:26789/i/ghjnvq5o/48a8dcb9/index.m3u8' },
        { name: '中字➏', url: 'http://x315601.serv00.net/cr.php?url=http://lc.aacalive.com:26789/i/ghjnvq5o/e8f7e463/index.m3u8' },
        { name: '高清无码1', url: 'http://x315601.serv00.net/cr.php?url=http://lc.aacalive.com:26789/i/ghjnvq5o/846a1ghm/index.m3u8' },
        { name: '高清无码2', url: 'http://x315601.serv00.net/cr.php?url=http://lc.aacalive.com:26789/i/ghjnvq5o/1bf4a301/index.m3u8' },
        { name: '高清无码3', url: 'http://x315601.serv00.net/cr.php?url=http://lc.aacalive.com:26789/i/ghjnvq5o/ahun18hg/index.m3u8' },
        { name: '高清无码4', url: 'http://x315601.serv00.net/cr.php?url=http://lc.aacalive.com:26789/i/ghjnvq5o/84a15gbc/index.m3u8' },
        { name: '高清无码5', url: 'http://x315601.serv00.net/cr.php?url=http://lc.aacalive.com:26789/i/ghjnvq5o/952a3vvv/index.m3u8' },
        { name: '高清无码6', url: 'http://x315601.serv00.net/cr.php?url=http://lc.aacalive.com:26789/i/ghjnvq5o/984fa1vb/index.m3u8' },
        { name: '高清无码7', url: 'http://x315601.serv00.net/cr.php?url=http://lc.aacalive.com:26789/i/ghjnvq5o/456oinav/index.m3u8' }
    ],
    '🔞港台三级': [
        { name: '1色降2之血玫瑰', url: 'https://vip1.lz-cdn1.com/20220331/733_58b741b7/index.m3u8' },
        { name: '2色降2之萬里驅魔', url: 'https://m3u8.cdn202511.com/videos/202411/21/673e5ba03276de039d31a162/7cd5f8/index.m3u8' },
        { name: '3倩女幽魂(关梯)', url: 'https://jkunnzyx.com/20250423/nU0wWqCw/2000kb/hls/index.m3u8' },
        { name: '4艳降勾魂(关梯)', url: 'https://jkunnzyx.com/20250422/QZeJpxSo/2000kb/hls/index.m3u8' },
        { name: '5唐朝禁宫秘史(关梯)', url: 'https://jkunnzyx.com/20250422/IzZnh5aN/2000kb/hls/index.m3u8' },
        { name: '6唐朝豪放女(关梯)', url: 'https://jkunnzyx.com/20250422/ACOOZ77D/2000kb/hls/index.m3u8?t=1759862410098' },
        { name: '7禁春(关梯)', url: 'https://jkunnzyx.com/20250420/C6pNQeJa/2000kb/hls/index.m3u8' },
        { name: '8聊斋画皮', url: 'https://vip1.lz-cdn1.com/20220602/7244_b84ad9e5/1200k/hls/mixed.m3u8' },
        { name: '9惊变(关梯)', url: 'https://jkunnzyx.com/20250216/DcmNwFCD/2000kb/hls/index.m3u8' },
        { name: '10玉蒲团之偷情宝鉴', url: 'https://sex8sex811.com/20250726/gyeUh9IH/3000kb/hls/index.m3u8' },
        { name: '11鸭王', url: 'https://vip1.lz-cdn.com/20220917/33110_558f97e4/1200k/hls/mixed.m3u8' },
        { name: '12鸭王2', url: 'https://sex8sex811.com/20250720/ZVJOiFu6/3000kb/hls/index.m3u8' },
        { name: '13玉蒲团之玉女心经', url: 'https://vip.lzcdn2.com/20220525/7634_7f4228f1/1200k/hls/mixed.m3u8' },
        { name: '14聊斋艳谭之玉女聊斋', url: 'https://v8.rstu6.com/202310/10/9PN2VB66wu1/video/index.m3u8' },
        { name: '15聊斋艳谭之月宫宝盒', url: 'https://vip1.lz-cdn1.com/20220602/7246_8dec3f14/1200k/hls/mixed.m3u8' },
        { name: '16聊斋婴宁', url: 'https://vip1.lz-cdn1.com/20220602/7243_6ac4f584/1200k/hls/mixed.m3u8' },
        { name: '17聊斋荷花三娘子', url: 'https://vip1.lz-cdn1.com/20220602/7247_71485294/1200k/hls/mixed.m3u8' },
        { name: '18金瓶梅', url: 'https://vip1.lz-cdn1.com/20220516/5775_36eacadc/1200k/hls/mixed.m3u8' },
        { name: '19金瓶梅2', url: 'https://vip1.lz-cdn1.com/20220516/5774_3b77c66d/1200k/hls/mixed.m3u8' },
        { name: '20.3D肉蒲团之极乐宝鉴', url: 'https://vip1.lz-cdn.com/20220917/33091_abc5295d/1200k/hls/mixed.m3u8' },
        { name: '21血恋', url: 'https://m.892539.xyz/play.php?site_id=12&source_id=136514' },
        { name: '22血恋2', url: 'https://1.mysqldata3202s4l.com/20220906/vTtXOZiJ/index.m3u8' },
        { name: '23鸭之一族', url: 'https://vip.lz15uu.com/20221016/425_d50261a1/index.m3u8' },
        { name: '24五月樱唇', url: 'https://vostrely.com/20230510/TmmcwJpA/index.m3u8?t=1764471414752' },
        { name: '25青楼十二房', url: 'https://yzzy.play-cdn7.com/20220701/2057_5582dfdc/index.m3u8?t=1764471518907' },
        { name: '26现代情欲篇之换妻档案', url: 'https://v8.gghijk.com/yyv8/202310/16/4j17Meq1LR1/video/index.m3u8?t=1788707639357' },
        { name: '27舞男情未了', url: 'https://v.huosucdn.com/20251012/4HbI8O9k/index.m3u8' },
        { name: '28桃色香居', url: 'https://yzzy.play-cdn14.com/20230728/30714_4c69114e/index.m3u8?t=1764472133794' },
        { name: '29花街狂奔', url: 'https://svip.high23-playback.com/20240730/25025_60d99e11/index.m3u8?t=1764472224721' },
        { name: '30三度诱惑', url: 'https://yzzy.play-cdn8.com/20220705/1308_6ed1e7c5/index.m3u8?t=1764472324424' },
        { name: '31三夫', url: 'https://play.subokk.com/play/hls/QeZwkB5a/index.m3u8' },
        { name: '32不文女学堂', url: 'https://v1.1bbffvip.com/20240714/r8cPwT4f/index.m3u8?t=1764489799259' },
        { name: '33挡不住的风情', url: 'https://yzzy.play-cdn7.com/20220629/1259_f08bbff3/index.m3u8?t=1764490077323' },
        { name: '34爱的精灵(李丽珍)', url: 'https://s1.bfllvip.com/video/aidejingling/HD%E4%B8%AD%E5%AD%97/index.m3u8?t=1764490232892' },
        { name: '35酱爆泡沫天国', url: 'https://play.subokk.com/play/mepgDM2d/index.m3u8' },
        { name: '36蜜桃成熟时(关梯)', url: 'https://play.phimgood.com/20250829/25929_0283ed0e/index.m3u8' },
        { name: '37蜜桃成熟时2同居关系', url: 'https://vostrely.com/20230509/IpkC7qSA/index.m3u8?t=1764490590670' },
        { name: '38蜜桃成熟时3蜜桃仙子', url: 'https://ckzy3.com/20211215/7uRpDfxa/index.m3u8?t=1788707149536' },
        { name: '39蜜桃成熟时33D', url: 'https://play.subokk.com/play/NbW4Q7Ed/index.m3u8' },
        { name: '40兽性诱惑之赤裸性游戏', url: 'https://yzzy.play-cdn6.com/20220805/8742_21203fa9/index.m3u8?t=1764490892225' }
    ],
    '🔞其他影片': [
        { name: '星國版冠希玩遍新馬女網紅火爆不雅視頻精華剪輯版720P高清無水印', url: 'https://vip6.3sybf.com/20210923/KH9uuTtd/index.m3u8' },
        { name: '星國版冠希玩遍新馬女網紅不雅視頻瘋傳 美妝達人Bellywel篇', url: 'https://vip6.3sybf.com/20210923/ihnWEH8C/index.m3u8' }
    ],
    '🔞美国成人版': [
        { name: '美国禁忌1*线路1', url: 'https://hd.ijycnd.com/play/PdRgX4Ye/index.m3u8' },
        { name: '美国禁忌1*线路2', url: 'https://vidcdn2.eroticmv.com/dat1/taboo1980/taboo1980.m3u8' },
        { name: '美国禁忌2*线路1关梯', url: 'https://vip.lz15uu.com/20221208/680_c768016f/index.m3u8' },
        { name: '美国禁忌2*线路2', url: 'https://vidcdn2.eroticmv.com/dat1/taboo21982/Taboo21982.m3u8' },
        { name: '美国禁忌3*线路1', url: 'https://vip.lz15uu.com/20220922/223_778caaa1/index.m3u8' },
        { name: '美国禁忌3*线路2', url: 'https://vidcdn2.eroticmv.com/dat1/taboo31984/taboo31984.m3u8' },
        { name: '美国禁忌4', url: 'https://vidcdn2.eroticmv.com/dat1/taboo4theyoungergeneration1985/taboo4theyoungergeneration1985.m3u8' },
        { name: '美国式禁忌1残酷的开始', url: 'https://vidcdn2.eroticmv.com/dat1/tabooamericanstyle11985/tabooamericanstyle11985.m3u8' },
        { name: '美国式禁忌2愈演愈烈', url: 'https://play.subokk.com/play/kaz105Ye/index.m3u8?t=1765006650479' },
        { name: '美国式禁忌3当上演员', url: 'https://play.subokk.com/play/QdJOLA2e/index.m3u8' },
        { name: '美国式禁忌4大结局', url: 'https://vidcdn2.eroticmv.com/dat1/tabooamericanstyle41985/tabooamericanstyle41985.m3u8' },
        { name: '人猿泰山', url: 'https://jkunnzyx.com/20240109/iBdxl9Kq/index.m3u8?t=1765007467920' },
        { name: '白雪公主', url: 'https://play.maoyanplay.top/20250805/1h39wTmQ/index.m3u8' },
        { name: '阿凡达成人版', url: 'https://play.maoyanplay.top/20250805/PHhmtY3z/index.m3u8?t=1765007830271' },
        { name: '灰姑娘成人版', url: 'https://bf.jisuziyuanbf.com/play/yb8JvLWe/index.m3u8' }
    ]
};

function parseId(vodId) {
    const raw = String(vodId || '');
    const i = raw.lastIndexOf('_');
    if (i < 0) return { tid: raw, idx: 0 };
    return { tid: raw.slice(0, i), idx: parseInt(raw.slice(i + 1), 10) || 0 };
}

function card(tid, idx, ch) {
    return {
        vod_id: tid + '_' + idx,
        vod_name: ch.name,
        vod_pic: '',
        vod_remarks: tid,
        style: { type: 'rect', ratio: 1.33 }
    };
}

async function init(cfg) {
    try {
        siteKey = cfg.skey;
        siteType = cfg.stype;
    } catch (e) {
        console.error('init error', e.message);
    }
}

async function home(filter) {
    try {
        const classes = CLASSES.map(c => ({
            type_id: c.type_id,
            type_name: c.type_name,
            land: 1,
            ratio: 1.33
        }));
        return JSON.stringify({ class: classes, filters: {} });
    } catch (e) {
        console.error('home error', e.message);
        return JSON.stringify({ class: [], filters: {} });
    }
}

async function homeVod() {
    try {
        const list = [];
        for (const c of CLASSES.slice(0, 3)) {
            const group = CHANNELS[c.type_id] || [];
            group.forEach((ch, idx) => list.push(card(c.type_id, idx, ch)));
        }
        return JSON.stringify({ list: list.slice(0, 20) });
    } catch (e) {
        console.error('homeVod error', e.message);
        return JSON.stringify({ list: [] });
    }
}

async function category(tid, pg, filter, ext) {
    pg = Number(pg) || 1;
    try {
        const group = CHANNELS[tid] || [];
        const list = group.map((ch, idx) => card(tid, idx, ch));
        return JSON.stringify({
            list,
            page: 1,
            pagecount: 1,
            limit: list.length,
            total: list.length
        });
    } catch (e) {
        console.error('category error', e.message);
        return JSON.stringify({ list: [], page: pg, pagecount: 0 });
    }
}

async function search(key, quick, pg) {
    pg = Number(pg) || 1;
    try {
        const kw = String(key || '').toLowerCase();
        const list = [];
        for (const tid of Object.keys(CHANNELS)) {
            const group = CHANNELS[tid] || [];
            group.forEach((ch, idx) => {
                if (String(ch.name).toLowerCase().includes(kw)) {
                    list.push(card(tid, idx, ch));
                }
            });
        }
        return JSON.stringify({
            list,
            page: 1,
            pagecount: 1,
            land: 1,
            ratio: 1.33
        });
    } catch (e) {
        console.error('search error', e.message);
        return JSON.stringify({ list: [], page: pg, pagecount: 0, land: 1, ratio: 1.33 });
    }
}

async function detail(vodId) {
    try {
        const { tid, idx } = parseId(vodId);
        const group = CHANNELS[tid] || [];
        if (idx < 0 || idx >= group.length) return JSON.stringify({ list: [] });
        const ch = group[idx];
        const vod = {
            vod_id: vodId,
            vod_name: ch.name,
            vod_pic: '',
            vod_remarks: tid,
            vod_content: ch.name,
            vod_play_from: '直播线路',
            vod_play_url: ch.name + '$' + ch.url
        };
        return JSON.stringify({ list: [vod] });
    } catch (e) {
        console.error('detail error', e.message);
        return JSON.stringify({ list: [] });
    }
}

async function play(flag, playId, flags) {
    try {
        return JSON.stringify({
            parse: 0,
            url: playId,
            header: { 'User-Agent': UA }
        });
    } catch (e) {
        console.error('play error', e.message);
        return JSON.stringify({ parse: 0, url: playId || '', header: { 'User-Agent': UA } });
    }
}

export function __jsEvalReturn() {
    return {
        init,
        home,
        homeVod,
        category,
        detail,
        search,
        play
    };
}
