/*
@header({
  searchable: 1,
  filterable: 1,
  quickSearch: 1,
  title: '聚合音乐[听]',
  lang: 'cat'
})
*/

let siteName = '聚合音乐', siteKey = '', siteType = 0;

const platformList = [
    { name: '网易云音乐', id: 'wangyi' },
    { name: '听海音乐', id: 'tinghai' },
    { name: '米兔音乐', id: 'mitu' }
];

const QUALITY_MAP = [
    ["超高", "hrMusic"], ["无损", "sqMusic"], ["极高", "hMusic"],
    ["较高", "mMusic"], ["标准", "lMusic"]
];

const rule = {
    wangyi: {
        host: 'https://music.163.com',
        playApi: 'http://oiapi.net/api/Music_163',
        searchApi: 'http://mc.alger.fun/api/cloudsearch',
        toplist: '/api/toplist',
        hotPlaylist: '/api/playlist/list',
        topArtists: '/api/artist/top',
        personalized: '/api/personalized/playlist',
        artistDetail: '/api/artist/',
        playlistDetail: '/api/playlist/detail',
        songDetail: '/api/song/detail',
        songLyric: '/api/song/lyric',
        referer: 'https://music.163.com/'
    },
    tinghai: {
        host: 'http://wapi.kuwo.cn',
        tagPlaylist: '/api/pc/classify/playlist/getTagPlayList',
        playlistInfo: '/api/www/playlist/playListInfo',
        songUrl: 'https://nmobi.kuwo.cn/mobi.s',
        lyricApi: 'https://kuwo.cn/openapi/v1/www/lyric/getlyric',
        searchApi: 'https://search.kuwo.cn/r.s',
        picApi: 'http://artistpicserver.kuwo.cn/pic.web',
        referer: 'https://kuwo.cn/'
    },
    mitu: {
        host: 'https://www.qqmp3.vip',
        songsApi: '/api/songs.php',
        kwApi: '/api/kw.php',
        referer: 'https://www.qqmp3.vip/'
    }
};

const baseHeaders = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1'
};

const filterOptions = {
    wangyi: [{ key: "area", name: "分类", value: [{ "n": "推荐歌单", "v": "recommend" }, { "n": "排行榜", "v": "toplist" }, { "n": "热门歌单", "v": "hot" }, { "n": "热门歌手", "v": "artist" }] }],
    tinghai: [{ key: "area", name: "分类", value: [{ "n": "专区", "v": "12" }, { "n": "主题", "v": "2189" }, { "n": "心情", "v": "146" }, { "n": "场景", "v": "376" }, { "n": "年代", "v": "637" }, { "n": "曲风流派", "v": "393" }, { "n": "语言", "v": "37" }] }],
    mitu: [{ key: "area", name: "分类", value: [{ "n": "热门", "v": "hot" }, { "n": "新歌", "v": "new" }, { "n": "随机", "v": "rand" }] }]
};

const ruleFilterDef = {
    wangyi: { area: 'recommend' },
    tinghai: { area: '12' },
    mitu: { area: 'hot' }
};

function init(cfg) {
    siteName = cfg.skey?.split('_')[1] || cfg.skey || '聚合音乐';
    siteKey = cfg.skey;
    siteType = cfg.stype;
}

function safeJSONParse(str, defaultValue = {}) {
    if (!str || typeof str === 'object') return str || defaultValue;
    try {
        return JSON.parse(str);
    } catch {
        return defaultValue;
    }
}

async function request(url, options = {}, retries = 2, platform = null) {
    let headers = { ...baseHeaders };
    if (platform && rule[platform] && rule[platform].referer) {
        headers['Referer'] = rule[platform].referer;
    }
    if (options.headers) {
        headers = { ...headers, ...options.headers };
    }
    
    let reqHeaders = { ...headers };
    let postType = reqHeaders['Content-Type']?.includes('json') ? 'json' :
        reqHeaders['Content-Type']?.includes('form') ? 'form' : '';
    
    for (let i = 0; i < retries; i++) {
        try {
            const response = await req(url, {
                method: options.method || 'GET',
                headers: reqHeaders,
                data: options.data,
                postType: postType,
                timeout: options.timeout || 10000
            });
            const content = response?.content || response?.data || response;
            if (content && content.length > 50) return content;
            if (i < retries - 1) await sleep(0.5);
            return content;
        } catch (e) {
            if (i === retries - 1) return '';
            await sleep(0.5);
        }
    }
    return '';
}

function sleep(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

function hd(img) {
    if (!img) return '';
    return img.replace('/120/', '/4000/').replace('/500/', '/2160/').replace('/150/', '/1000/').replace('/300/', '/1500/');
}

function getPicUrl(pic, size = '500y500') {
    if (!pic) return '';
    return pic + '?param=' + size;
}

function getSongPic(song, defaultPic, size = '300y300') {
    let pic = song.al?.picUrl || song.album?.picUrl || defaultPic;
    if (pic) {
        pic = pic.replace('?param=500y500', '?param=' + size);
        pic = pic.replace('?param=300y300', '?param=' + size);
    }
    return pic || '';
}

function buildWangyiPlayData(tracks, defaultPic) {
    let songPicArr = tracks.map(s => getSongPic(s, defaultPic, '300y300'));
    const playPic = songPicArr.join('#');
    
    const playUrl = QUALITY_MAP.map(q => 
        tracks.map(s => {
            let songPic = getSongPic(s, defaultPic, '300y300');
            let artistName = s.ar?.map(a => a.name).join('/') || s.artists?.map(a => a.name).join('/') || '';
            let displayName = artistName ? `${s.name} - ${artistName}` : s.name;
            return `${displayName}$${s.id}|${q[1]}&&${songPic}`;
        }).join('#')
    ).join('$$$');
    
    const playFrom = QUALITY_MAP.map(q => q[0]).join('$$$');
    
    return { playFrom, playUrl, playPic };
}

function formatNumber(num) {
    if (!num) return '0';
    if (num >= 10000) return (num / 10000).toFixed(1) + '万';
    return num.toString();
}

function getPlatList() {
    return platformList;
}

async function getWangyiList(type, page, extend) {
    const limit = 20;
    const offset = (page - 1) * limit;
    let videos = [];
    
    try {
        let url = '';
        let rawData = [];
        
        switch (type) {
            case 'recommend':
                url = `${rule.wangyi.host}${rule.wangyi.personalized}?limit=${page * limit}`;
                break;
            case 'toplist':
                url = `${rule.wangyi.host}${rule.wangyi.toplist}`;
                break;
            case 'hot':
                const cat = extend?.cat || '全部';
                url = `${rule.wangyi.host}${rule.wangyi.hotPlaylist}?cat=${encodeURIComponent(cat)}&limit=${limit}&offset=${offset}&order=hot`;
                break;
            case 'artist':
                url = `${rule.wangyi.host}${rule.wangyi.topArtists}?limit=${limit}&offset=${offset}`;
                break;
            default:
                return [];
        }
        
        const html = await request(url, {}, 2, 'wangyi');
        const json = safeJSONParse(html);
        
        if (type === 'recommend') {
            rawData = json.result || [];
            if (page > 1) rawData = rawData.slice(offset);
            videos = rawData.map(it => ({
                vod_id: `wangyi@playlist@${it.id}`,
                vod_name: it.name,
                vod_pic: getPicUrl(it.picUrl, '300y300'),
                vod_remarks: `网易云 | 🎧${formatNumber(it.playCount || 0)}`,
                vod_content: ''
            }));
        } else if (type === 'toplist') {
            rawData = json.list || [];
            videos = rawData.slice(offset, offset + limit).map(it => ({
                vod_id: `wangyi@toplist@${it.id}`,
                vod_name: it.name,
                vod_pic: getPicUrl(it.coverImgUrl || it.picUrl, '300y300'),
                vod_remarks: `网易云 | ${it.updateFrequency || `${it.trackCount || 0}首歌曲`}`,
                vod_content: ''
            }));
        } else if (type === 'artist') {
            rawData = json.artists || [];
            videos = rawData.map(it => ({
                vod_id: `wangyi@artist@${it.id}`,
                vod_name: it.name,
                vod_pic: getPicUrl(it.img1v1Url || it.picUrl, '300y300'),
                vod_remarks: `网易云 | ${it.albumSize || 0}张专辑`,
                vod_content: ''
            }));
        } else {
            rawData = json.playlists || [];
            videos = rawData.map(it => ({
                vod_id: `wangyi@playlist@${it.id}`,
                vod_name: it.name,
                vod_pic: getPicUrl(it.coverImgUrl, '300y300'),
                vod_remarks: `网易云 | ${it.playCount ? formatNumber(it.playCount) : ''}`,
                vod_content: ''
            }));
        }
    } catch (e) {}
    return videos;
}

async function getTinghaiList(categoryId, page) {
    let videos = [];
    try {
        const url = `${rule.tinghai.host}${rule.tinghai.tagPlaylist}?pn=${page}&rn=30&id=${categoryId}`;
        const html = await request(url, {}, 2, 'tinghai');
        const json = safeJSONParse(html);
        const data = json.data?.data || [];
        videos = data.map(item => ({
            vod_id: `tinghai@${categoryId}@${item.id || item.pid}`,
            vod_name: item.name || item.title || '未命名歌单',
            vod_pic: hd(item.img || item.pic || item.cover || ''),
            vod_remarks: `听海音乐 | ${item.listencnt ? formatNumber(item.listencnt) : ''}`,
            vod_content: item.info || item.userName || ''
        }));
    } catch (e) {}
    return videos;
}

async function getMituList(type, page) {
    let apiPath = '';
    if (type === 'hot') apiPath = 'api/songs.php';
    else if (type === 'new') apiPath = 'api/songs.php?type=new';
    else apiPath = 'api/songs.php?type=rand';
    
    const url = `${rule.mitu.host}/${apiPath}`;
    let videos = [];
    
    try {
        const html = await request(url, {}, 2, 'mitu');
        const json = safeJSONParse(html);
        if (json.code === 200 && Array.isArray(json.data)) {
            videos = json.data.map(item => {
                const vodData = { id: item.rid, name: item.name, pic: item.pic, artist: item.artist, downurl: item.downurl || [] };
                const vodId = `mitu@${type}@${encodeURIComponent(JSON.stringify(vodData))}`;
                return {
                    vod_id: vodId,
                    vod_name: `${item.name} - ${item.artist}`,
                    vod_pic: item.pic || '',
                    vod_remarks: `米兔音乐 | ${type === 'hot' ? '热门' : (type === 'new' ? '新歌' : '随机')}`,
                    vod_content: `歌手：${item.artist}`
                };
            });
        }
    } catch (e) {}
    return videos;
}

async function getWangyiDetail(type, id) {
    let vod = {};
    try {
        let url = '';
        let data = {};
        let tracks = [];
        
        if (type === 'artist') {
            url = `${rule.wangyi.host}${rule.wangyi.artistDetail}${id}`;
            const html = await request(url, {}, 2, 'wangyi');
            const json = safeJSONParse(html);
            data = json.artist || {};
            tracks = json.hotSongs || [];
            const defaultPic = getPicUrl(data.picUrl || data.img1v1Url, '500y500');
            const { playFrom, playUrl, playPic } = buildWangyiPlayData(tracks, defaultPic);
            vod = {
                vod_id: `wangyi@artist@${id}`,
                vod_name: data.name || '未知歌手',
                vod_pic: defaultPic,
                vod_content: data.briefDesc || data.name,
                vod_remarks: `共${tracks.length}首`,
                vod_play_from: playFrom,
                vod_play_url: playUrl,
                vod_play_pic: playPic,
                vod_play_pic_ratio: 1.0
            };
        } else {
            url = `${rule.wangyi.host}${rule.wangyi.playlistDetail}?id=${id}`;
            const html = await request(url, {}, 2, 'wangyi');
            const json = safeJSONParse(html);
            const playlist = json.result || json.playlist || {};
            data = playlist;
            tracks = playlist.tracks || [];
            const defaultPic = getPicUrl(data.coverImgUrl || data.picUrl, '500y500');
            const { playFrom, playUrl, playPic } = buildWangyiPlayData(tracks, defaultPic);
            vod = {
                vod_id: `wangyi@playlist@${id}`,
                vod_name: data.name || '未知歌单',
                vod_pic: defaultPic,
                vod_content: '【天神IY】'+data.description || data.name,
                vod_remarks: `${formatNumber(data.playCount || 0)} | 共${tracks.length}首`,
                vod_play_from: playFrom,
                vod_play_url: playUrl,
                vod_play_pic: playPic,
                vod_play_pic_ratio: 1.0
            };
        }
    } catch (e) {}
    return vod;
}

async function getTinghaiDetail(id) {
    let vod = {};
    try {
        const limit = 100;
        let baseUrl = `${rule.tinghai.host}${rule.tinghai.playlistInfo}?pid=${id}&rn=${limit}&httpsStatus=1&pn=`;
        let html = await request(baseUrl + '1', {}, 2, 'tinghai');
        let json = safeJSONParse(html);
        let data = json.data || {};
        let songs = data.musicList || data.musiclist || [];
        let total = parseInt(data.total || 0);
        
        if (total > limit) {
            let tasks = [];
            for (let p = 2; p <= Math.min(Math.ceil(total / limit), 5); p++) {
                tasks.push(request(baseUrl + p, {}, 2, 'tinghai'));
            }
            let results = await Promise.all(tasks);
            results.forEach(r => {
                let d = safeJSONParse(r).data || {};
                songs = songs.concat(d.musicList || d.musiclist || []);
            });
        }
        
        let playArr = [];
        let songPicArr = [];
        songs.forEach(it => {
            let rid = (it.rid || it.musicrid || '').toString().replace('MUSIC_', '');
            let song = (it.name || '').replace(/&nbsp;/g, ' ');
            let artist = (it.artist || '').replace(/&nbsp;/g, ' ');
            let albumpic = hd(it.albumpic || it.pic);
            let displayName = artist ? `${song} [${artist}]` : song;
            if (rid) {
                playArr.push(`${displayName}$${rid}&&${albumpic}&&${albumpic}`);
                songPicArr.push(albumpic);
            }
        });
        
        vod = {
            vod_id: id,
            vod_name: data.name || '听海歌单',
            vod_pic: hd(data.img || data.img500),
            vod_content: '【天神IY】'+data.info || '',
            vod_remarks: `共${songs.length}首`,
            vod_play_from: "听海音乐",
            vod_play_url: playArr.join('#'),
            vod_play_pic: songPicArr.join('#'),
            vod_play_pic_ratio: 1.0
        };
    } catch (e) {}
    return vod;
}

async function getMituDetail(encodedData) {
    let vod = {};
    try {
        const songData = safeJSONParse(encodedData);
        const { id: rid, name, pic, artist, downurl } = songData;
        let playUrl = '';
        let rawLrc = '暂无歌词';
        const res = await request(`${rule.mitu.host}${rule.mitu.kwApi}?rid=${rid}&type=json&level=exhigh&lrc=true`, {}, 2, 'mitu');
        const data = safeJSONParse(res);
        if (data.code === 200 && data.data) {
            playUrl = data.data.url || '';
            rawLrc = data.data.lrc || '暂无歌词';
        }
        const displayLrc = rawLrc === '暂无歌词' ? rawLrc : rawLrc.replace(/\[\d{2}:\d{2}\.\d{2}\]/g, '\n');
        let playFrom = [];
        let playUrls = [];
        if (playUrl) {
            playFrom.push('在线播放');
            playUrls.push(`第1集$${JSON.stringify({ url: playUrl, lrc: rawLrc, cover: pic })}`);
        }
        if (downurl && downurl.length) {
            playFrom.push('网盘下载');
            const downUrls = downurl.map(item => { const [n, u] = item.split('$$'); return `${n}$push://${u}`; }).join('#');
            playUrls.push(downUrls);
        }
        vod = {
            vod_id: rid,
            vod_name: name,
            vod_pic: pic,
            vod_content:'【天神IY】'+ displayLrc,
            vod_actor: artist,
            vod_play_from: playFrom.join('$$$'),
            vod_play_url: playUrls.join('$$$')
        };
    } catch (e) {}
    return vod;
}

async function playWangyi(id) {
    try {
        const [musicId, qualityType] = id.split('|');
        const playApi = `${rule.wangyi.playApi}&id=${musicId}`;
        const playJson = safeJSONParse(await request(playApi, {}, 2, 'wangyi'));
        let songUrl = '';
        if (playJson && playJson.code === 0 && playJson.data && playJson.data.length > 0) {
            songUrl = playJson.data[0].url || '';
        }
        const lyricApi = `${rule.wangyi.host}${rule.wangyi.songLyric}?id=${musicId}&lv=1&kv=1&tv=-1`;
        const lyricJson = safeJSONParse(await request(lyricApi, {}, 2, 'wangyi'));
        let lyric = lyricJson.lrc?.lyric || '';
        if (lyricJson.tlyric?.lyric) lyric = lyric + '\n\n【翻译】\n' + lyricJson.tlyric.lyric;
        const infoApi = `${rule.wangyi.host}${rule.wangyi.songDetail}?ids=[${musicId}]`;
        const infoJson = safeJSONParse(await request(infoApi, {}, 2, 'wangyi'));
        let cover = '';
        if (infoJson.songs && infoJson.songs[0]) {
            const song = infoJson.songs[0];
            if (song.album && song.album.picUrl) cover = song.album.picUrl + '?param=500y500';
            else if (song.al && song.al.picUrl) cover = song.al.picUrl + '?param=500y500';
        }
        return JSON.stringify({ parse: 0, url: songUrl, header: baseHeaders, lrc: lyric, cover: cover, pic: cover, height: 720 });
    } catch (e) {
        return JSON.stringify({ parse: 0, url: id });
    }
}

async function getTinghaiSongUrl(rid, br) {
    const url = `${rule.tinghai.songUrl}?f=web&user=0&source=kwplayer_ar_4.4.2.7_B_nuoweida_vh.apk&type=convert_url_with_sign&rid=${rid}&format=flac&br=${br}`;
    const html = await request(url, {}, 2, 'tinghai');
    const json = safeJSONParse(html);
    return json?.data?.url?.trim() || '';
}

async function getTinghaiLyric(rid) {
    for (let i = 0; i < 20; i++) {
        try {
            const url = `${rule.tinghai.lyricApi}?musicId=${rid}`;
            const html = await request(url, {}, 2, 'tinghai');
            if (html) {
                const json = safeJSONParse(html);
                if (json.code === 200 && json.data && json.data.lrclist && json.data.lrclist.length > 0) {
                    const lrclist = json.data.lrclist;
                    const lyric = lrclist.map(item => {
                        const time = parseFloat(item.time) || 0;
                        const min = Math.floor(time / 60).toString().padStart(2, '0');
                        const sec = Math.floor(time % 60).toString().padStart(2, '0');
                        const ms = Math.floor((time % 1) * 100).toString().padStart(2, '0');
                        return `[${min}:${sec}.${ms}]${item.lineLyric || ''}`;
                    }).join('\n');
                    return lyric;
                }
            }
        } catch (e) {}
        if (i < 19) await sleep(0.01);
    }
    return '暂无歌词';
}

async function playTinghai(id) {
    try {
        const parts = id.split('&&');
        const firstPart = parts[0] || '';
        const firstParts = firstPart.split('$');
        const songId = firstParts.length > 1 ? firstParts[1] : firstParts[0];
        const albumPic = hd(parts[1]);
        let url = await getTinghaiSongUrl(songId, '320kmp3');
        if (!url) url = await getTinghaiSongUrl(songId, '128kmp3');
        let lrc = await getTinghaiLyric(songId);
        let picUrl = albumPic;
        if (!picUrl) {
            try {
                let picRes = await request(`${rule.tinghai.picApi}?type=rid_pic&pictype=url&size=500&rid=${songId}`, {}, 2, 'tinghai');
                picUrl = picRes.trim().replace('/500/', '/2160/');
            } catch (e) {}
        }
        const result = { parse: 0, url: url || '', header: baseHeaders, height: 720 };
        if (picUrl) { result.pic = picUrl; result.cover = picUrl; }
        if (lrc && lrc !== '暂无歌词') result.lrc = lrc;
        return JSON.stringify(result);
    } catch (e) {
        return JSON.stringify({ parse: 0, url: id });
    }
}

async function playMitu(id) {
    try {
        const playData = safeJSONParse(id);
        let subt;
        if (playData.lrc && playData.lrc !== '暂无歌词') {
            subt = 'data:text/plain;charset=utf-8,' + encodeURIComponent(playData.lrc);
        }
        return JSON.stringify({
            parse: 0,
            url: playData.url,
            header: { ...baseHeaders, 'Referer': rule.mitu.referer },
            lrc: playData.lrc,
            subt,
            cover: playData.cover,
            pic: playData.cover,
            height: 720
        });
    } catch (e) {
        return JSON.stringify({ parse: 0, url: id });
    }
}

async function searchWangyi(wd) {
    const results = [];
    const searchTypes = [
        { type: 1, prefix: 'wangyi@song@', remark: '歌曲', key: 'songs' },
        { type: 10, prefix: 'wangyi@album@', remark: '专辑', key: 'albums' },
        { type: 1000, prefix: 'wangyi@playlist@', remark: '歌单', key: 'playlists' },
        { type: 100, prefix: 'wangyi@artist@', remark: '歌手', key: 'artists' }
    ];
    try {
        for (const st of searchTypes) {
            const url = `${rule.wangyi.searchApi}?keywords=${encodeURIComponent(wd)}&type=${st.type}`;
            const res = await request(url, {}, 2, 'wangyi');
            const json = safeJSONParse(res);
            if (json.result?.[st.key]) {
                for (const item of json.result[st.key]) {
                    const result = { vod_id: `${st.prefix}${item.id}`, vod_name: item.name, vod_remarks: st.remark, vod_pic: '' };
                    if (st.type === 1) {
                        if (item.ar) result.vod_name += ' - ' + item.ar.map(a => a.name).join('/');
                        if (item.al?.picUrl) result.vod_pic = getPicUrl(item.al.picUrl, '300y300');
                    } else if (st.type === 10) {
                        if (item.artist) result.vod_name += ' - ' + item.artist.name;
                        if (item.picUrl) result.vod_pic = getPicUrl(item.picUrl, '300y300');
                    } else if (st.type === 1000) {
                        if (item.coverImgUrl) result.vod_pic = getPicUrl(item.coverImgUrl, '300y300');
                        result.vod_remarks += ` | ${formatNumber(item.playCount || 0)}`;
                    } else if (st.type === 100) {
                        const picUrl = item.picUrl || item.img1v1Url;
                        if (picUrl) result.vod_pic = getPicUrl(picUrl, '300y300');
                    }
                    results.push(result);
                }
            }
        }
    } catch (e) {}
    return results;
}

async function searchTinghai(wd, page) {
    const results = [];
    const offset = (page - 1) * 30;
    const url = `${rule.tinghai.searchApi}?client=kt&all=${encodeURIComponent(wd)}&pn=${offset}&rn=30&vipver=1&ft=music&encoding=utf8&rformat=json&mobi=1`;
    try {
        let html = '';
        let retry = 0;
        while (!html && retry < 3) {
            html = await request(url, {}, 2, 'tinghai');
            if (!html) await sleep(0.1);
            retry++;
        }
        if (html) {
            const json = safeJSONParse(html.replace(/'/g, '"'));
            if (json.abslist) {
                json.abslist.forEach(it => {
                    const rid = it.DC_TARGETID || it.MUSICRID?.replace('MUSIC_', '') || '';
                    const pic = it.web_albumpic_short ? `http://img1.kuwo.cn/star/albumcover/${it.web_albumpic_short}` : (it.hts_MVPIC || '');
                    results.push({
                        vod_id: `tinghai@song@${rid}`,
                        vod_name: `${it.SONGNAME || it.NAME || '未知歌曲'} - ${it.ARTIST || '未知歌手'}`,
                        vod_pic: hd(pic),
                        vod_remarks: it.ALBUM || '听海音乐',
                    });
                });
            }
        }
    } catch (e) {}
    return results;
}

async function searchMitu(wd) {
    const results = [];
    const url = `${rule.mitu.host}/api/songs.php?type=search&keyword=${encodeURIComponent(wd)}`;
    try {
        const html = await request(url, {}, 2, 'mitu');
        const json = safeJSONParse(html);
        if (json.code === 200 && Array.isArray(json.data)) {
            json.data.forEach(item => {
                const vodData = { id: item.rid, name: item.name, pic: item.pic, artist: item.artist, downurl: item.downurl || [] };
                results.push({
                    vod_id: `mitu@song@${encodeURIComponent(JSON.stringify(vodData))}`,
                    vod_name: `${item.name} - ${item.artist}`,
                    vod_pic: item.pic || '',
                    vod_remarks: '米兔音乐'
                });
            });
        }
    } catch (e) {}
    return results;
}

async function cfs(siteId, wd, pg) {
    const page = pg || 1;
    let results = [];
    if (siteId === 'wangyi') results = await searchWangyi(wd);
    else if (siteId === 'tinghai') results = await searchTinghai(wd, page);
    else if (siteId === 'mitu') results = await searchMitu(wd);
    return JSON.stringify({ list: results, page: page, pagecount: page + 1, limit: results.length, total: results.length * (page + 1) });
}

async function home(filter) {
    const platForms = getPlatList();
    const classes = platForms.map(item => ({ type_name: item.name, type_id: item.id }));
    const filters = {};
    platForms.forEach(item => { if (filterOptions[item.id]) filters[item.id] = filterOptions[item.id]; });
    return JSON.stringify({ class: classes, filters: filters });
}

async function homeVod() {
    const platForms = getPlatList();
    const randomPlat = platForms[Math.floor(Math.random() * platForms.length)];
    const randomArea = ruleFilterDef[randomPlat.id]?.area || '';
    const categoryResult = await category(randomPlat.id, 1, { area: randomArea }, {});
    const categoryList = safeJSONParse(categoryResult).list || [];
    return JSON.stringify({ list: categoryList.slice(0, 20) });
}

async function category(tid, pg, filter, extend) {
    const page = pg || 1;
    extend = extend || {};
    const platformItem = platformList.find(p => p.id === tid);
    if (!platformItem) return JSON.stringify({ list: [], page, pagecount: 1, limit: 0, total: 0 });
    const searchKeyword = extend?.custom;
    if (searchKeyword) return await cfs(tid, searchKeyword, pg);
    const area = filter?.area || extend?.area || ruleFilterDef[tid]?.area || '';
    const videos = [];
    switch (tid) {
        case 'wangyi': videos.push(...await getWangyiList(area, page, extend)); break;
        case 'tinghai': videos.push(...await getTinghaiList(area, page)); break;
        case 'mitu': videos.push(...await getMituList(area, page)); break;
    }
    return JSON.stringify({ list: videos, page: page, pagecount: page + 1, limit: videos.length, total: videos.length * (page + 1) });
}

async function detail(id) {
    const parts = id.split('@');
    const platform = parts[0];
    const type = parts[1];
    const did = decodeURIComponent(parts.slice(2).join('@'));
    let vod = {};
    switch (platform) {
        case 'wangyi': vod = await getWangyiDetail(type, did); break;
        case 'tinghai': vod = await getTinghaiDetail(did); break;
        case 'mitu': vod = await getMituDetail(did); break;
    }
    return JSON.stringify({ list: [vod] });
}

async function play(flag, id, flags) {
    if (flag.includes('网易云') || flag.includes('超高') || flag.includes('无损') || flag.includes('极高') || flag.includes('较高') || flag.includes('标准')) {
        return await playWangyi(id);
    }
    if (flag.includes('听海')) return await playTinghai(id);
    if (flag.includes('网盘下载')) return JSON.stringify({ parse: 0, url: id });
    if (flag.includes('在线播放')) return await playMitu(id);
    return JSON.stringify({ parse: 0, url: id });
}

async function search(wd, quick, pg) {
    const videos = [];
    const page = pg || 1;
    const searchPromises = [cfs('wangyi', wd, page), cfs('tinghai', wd, page), cfs('mitu', wd, page)];
    const searchResults = await Promise.all(searchPromises);
    searchResults.forEach(result => { videos.push(...safeJSONParse(result).list || []); });
    const filteredResults = videos.filter(item => (item.vod_name || '').toLowerCase().includes(wd.toLowerCase()));
    return JSON.stringify({ list: filteredResults, page: page, pagecount: page + 1, limit: filteredResults.length, total: filteredResults.length * (page + 1) });
}

export function __jsEvalReturn() {
    return { init, home, homeVod, category, detail, play, search, cfs };
}