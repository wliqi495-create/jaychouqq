/*
@header({
  searchable: 1,
  filterable: 1,
  quickSearch: 1,
  title: '听了么[听]',
  lang: 'cat'
})
*/

function home() {
    return JSON.stringify({
        'class': [
            {'type_id': 'hot', 'type_name': '热门歌单'},
            {'type_id': 'new', 'type_name': '新歌推荐'}
        ]
    });
}

async function homeVod() {
    let url = 'http://wapi.kuwo.cn/api/pc/classify/playlist/getRcmPlayList?loginUid=0&loginSid=0&appUid=76039576&rn=30&order=hot&pn=1';
    let res = JSON.parse((await req(url)).content);
    let data = res.data?.data || res.data || [];
    let d = data.map(it => ({
        vod_name: it.name || it.title || '未命名歌单',
        vod_id: (it.id || it.pid || '').toString(),
        vod_pic: it.img || it.pic || it.cover || 'https://p1.music.126.net/SUeqMM8HOIpHv9Nhl9qt9w==/109951165647004069.jpg',
        vod_remarks: it.info || it.uname || it.userName || '',
        type_name: 'hot'
    }));
    return JSON.stringify({list: d});
}

async function category(tid, pg) {
    let api = `http://wapi.kuwo.cn/api/pc/classify/playlist/getRcmPlayList?loginUid=0&loginSid=0&appUid=76039576&rn=30&order=${tid}&pn=${pg}&_=${Date.now()}`;
    let res = JSON.parse((await req(api)).content);
    let data = res.data?.data || res.data || [];
    let arr = data.map(it => ({
        vod_name: it.name || it.title || '未命名歌单',
        vod_id: (it.id || it.pid || '').toString(),
        vod_pic: it.img || it.pic || it.cover || 'https://p1.music.126.net/SUeqMM8HOIpHv9Nhl9qt9w==/109951165647004069.jpg',
        vod_remarks: it.info || it.uname || it.userName || '',
        type_name: tid
    }));
    return JSON.stringify({list: arr, page: +pg, pagecount: 999, limit: 30, total: 999});
}

async function detail(vod_url) {
    let api = `http://nplserver.kuwo.cn/pl.svc?op=getlistinfo&pid=${vod_url.trim()}&pn=0&rn=200&encode=utf8&keyset=pl2012&identity=kuwo&pcmp4=1&vipver=MUSIC_9.1.1.2_BCS2&newver=1`;
    console.log(`✅[api]: ${api}`);
    let d = JSON.parse((await req(api)).content);
    console.log(`✅[d的结果: ]${JSON.stringify(d, null, 4)}`);
    let list = d.musiclist || [];

    let playArr = [];
    let artistPicArr = [];

    list.forEach(it => {
        let rid = (it.id || '').toString();
        let song = (it.name || it.SONGNAME || it.displaysongname || '').toString();
        let artist = (it.artist || it.ARTIST || it.FARTIST || it.displayartistname || '').toString();
        let albumpic = it.albumpic || '';
        let artistPic = it.artistPic || '';
        let displayName = artist ? `${song} [${artist}]` : song;

        if (rid) {
            playArr.push(`${displayName}$${rid}&&${albumpic}&&${artistPic}`);
            artistPicArr.push(artistPic);
        }
    });

    return JSON.stringify({
        list: [{
            vod_id: vod_url,
            vod_name: d.name || d.title || '酷我歌单',
            vod_pic: d.pic || d.img,
            vod_content: d.info || d.desc || '',
            vod_play_from: '酷我歌单',
            vod_play_pic: artistPicArr.join('#'),
            vod_play_pic_ratio: 1.5,
            vod_play_url: playArr.join('#')
        }]
    });
}

async function play(flag, id) {
    // 解析格式：显示名称$歌曲ID&&专辑图片&&歌手图片
    let parts = id.split('&&');

    // 第一部分可能包含显示名称$歌曲ID
    let firstPart = parts[0] || '';
    let firstParts = firstPart.split('$');
    let songId = firstParts.length > 1 ? firstParts[1] : firstParts[0];

    let albumPic = parts[1] || '';
    let artistPic = parts[2] || '';

    // 优先使用专辑图片，没有则使用歌手图片
    let picUrl = albumPic || artistPic;

    if (/\.(m3u8|mp4|m4a|mp3|aac)(\?|$)/i.test(songId)) {
        return JSON.stringify({
            parse: 0,
            jx: 0,
            url: songId,
            pic: picUrl
        });
    }

    async function getUrl(rid, br) {
        let api = `http://nmobi.kuwo.cn/mobi.s?f=web&user=0&source=kwplayerhd_ar_4.3.0.8_tianbao_T1A_qirui.apk&type=convert_url_with_sign&rid=${rid}&br=${br}`;
        let j = JSON.parse((await req(api)).content);
        return j?.data?.url?.trim() || '';
    }

    let url = await getUrl(songId, '320kmp3') || await getUrl(songId, '128kmp3');
    let lrc = await getLyric(songId);

    return JSON.stringify({
        parse: 0,
        jx: 0,
        url: url,
        pic: picUrl,
        cover: albumPic,
        lrc: lrc
    });
}

async function getLyric(rid) {
    let url = `http://m.kuwo.cn/newh5/singles/songinfoandlrc?musicId=${rid}`;
    let res = (await req(url)).content;
    let json = JSON.parse(res);
    let lrclist = json?.data?.lrclist;
    if (!lrclist) return '';

    return lrclist.map(item => {
        let time = +item.time;
        let min = Math.floor(time / 60).toString().padStart(2, '0');
        let sec = Math.floor(time % 60).toString().padStart(2, '0');
        let ms = Math.floor((time % 1) * 100).toString().padStart(2, '0');
        return `[${min}:${sec}.${ms}]${item.lineLyric}`;
    }).join('\n');
}

async function search(wd, quick) {
    let searchUrl = `https://search.kuwo.cn/r.s?client=kt&all=${encodeURIComponent(wd)}&pn=0&rn=20&vipver=1&ft=music&encoding=utf8&rformat=json&mobi=1`;

    let res = (await req(searchUrl)).content;
    let json = JSON.parse(res);
    let d = [];

    if (json.abslist) {
        json.abslist.forEach(it => {
            if (it.MUSICRID) {
                let musicId = it.MUSICRID.replace('MUSIC_', '');
                let picUrl = it.hts_MVPIC || '';

                d.push({
                    vod_name: (it.NAME || '未知歌曲') + (it.ARTIST ? ' - ' + it.ARTIST : ''),
                    vod_id: musicId,
                    vod_pic: picUrl,
                    vod_remarks: '酷我音乐',
                    type_name: 'search'
                });
            }
        });
    }

    return JSON.stringify({list: d});
}

export function __jsEvalReturn() {
    return {home, homeVod, category, detail, play, search};
}