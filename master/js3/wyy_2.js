/*
@header({
  searchable: 1,
  filterable: 1,
  quickSearch: 1,
  title: '网易云音乐',
  more: {
    sourceTag: "音乐,歌单,专辑,歌手",
    errorPlayNext: true
  },
  '类型': '音乐',
  logo: 'https://s1.music.126.net/style/favicon.ico?v20180823',
  lang: 'cat'
})
*/

// ==================== URL配置集中管理 ====================
let rule = {
    host: 'https://music.163.com',
    toplist: '/api/toplist',
    hotPlaylist: '/api/playlist/list',
    topArtists: '/api/artist/top',
    personalized: '/api/personalized/playlist',
    artistDetail: '/api/artist/',
    playlistDetail: '/api/playlist/detail',
    songDetail: '/api/song/detail',
    songLyric: '/api/song/lyric',
    playUrl: 'http://oiapi.net/api/Music_163',
    search: 'http://mc.alger.fun/api/cloudsearch'
};

let siteName = '网易云音乐';
let host = rule.host;
let siteKey = '';
let siteType = 0;
let headers = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1'
};

// 带重试的请求函数，直接返回content
async function request(url, options, retries = 2) {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await req(url, options);
            const content = res.content || res;
            
            // 检查是否有有效数据（内容不为空且长度大于100）
            if (content && content.length > 100) {
                return content;
            }
            
            // 数据太少，重试
            if (i < retries - 1) {
                await new Promise(r => setTimeout(r, 500));
                continue;
            }
            return content;
        } catch (e) {
            if (i === retries - 1) throw e;
            await new Promise(r => setTimeout(r, 500));
        }
    }
}

async function init(cfg) {
    console.log('网易云音乐初始化完成');
}

function home(filter) {
    const classes = [
        { type_id: "recommend_playlist", type_name: "推荐歌单" },
        { type_id: "toplist", type_name: "排行榜" },
        { type_id: "hot_playlist", type_name: "热门歌单" },
        { type_id: "top_artists", type_name: "热门歌手" }
    ];
    
    return JSON.stringify({ class: classes, filters: {} });
}

async function homeVod(params) {
    return await getPersonalized(1);
}

async function category(tid, pg, filter, extend) {
    let limit = 20;
    let offset = (pg - 1) * limit;
    let url, dataKey;
    
    if (tid === 'recommend_playlist') {
        return await getPersonalized(pg);
    }
    
    if (tid === 'toplist') {
        url = `${host}${rule.toplist}`;
        dataKey = 'list';
    } else if (tid === 'hot_playlist') {
        const cat = extend.cat || '全部';
        url = `${host}${rule.hotPlaylist}?cat=${encodeURIComponent(cat)}&limit=${limit}&offset=${offset}&order=hot`;
        dataKey = 'playlists';
    } else if (tid === 'top_artists') {
        url = `${host}${rule.topArtists}?limit=${limit}&offset=${offset}`;
        dataKey = 'artists';
    }
    
    const json = JSON.parse(await request(url, { headers }));
    const rawList = json[dataKey] || [];
    
    let list = [];
    if (tid === 'toplist') {
        list = rawList.slice(offset, offset + limit).map(it => ({
            vod_name: it.name,
            vod_pic: (it.coverImgUrl || it.picUrl || '') + '?param=300y300',
            vod_remarks: it.updateFrequency || `${it.trackCount || 0}首歌曲`,
            vod_id: `toplist_${it.id}`
        }));
    } else if (tid === 'hot_playlist') {
        list = rawList.map(it => ({
            vod_name: it.name,
            vod_pic: (it.coverImgUrl || '') + '?param=300y300',
            vod_remarks: it.playCount ? (it.playCount > 10000 ? (it.playCount / 10000).toFixed(1) + '万' : it.playCount) : '',
            vod_id: `playlist_${it.id}`
        }));
    } else if (tid === 'top_artists') {
        list = rawList.map(it => ({
            vod_name: it.name,
            vod_pic: (it.img1v1Url || it.picUrl || '') + '?param=300y300',
            vod_remarks: `${it.albumSize || 0}张专辑`,
            vod_id: `artist_${it.id}`
        }));
    }
    
    return JSON.stringify({ list: list, page: +pg, limit: limit });
}

async function getPersonalized(pg) {
    let limit = 20;
    let offset = (pg - 1) * limit;
    const url = `${host}${rule.personalized}?limit=${pg * limit}`;
    const json = JSON.parse(await request(url, { headers }));
    let rawList = json.result || [];
    
    if (pg > 1) {
        rawList = rawList.slice(offset);
    }
    
    let list = rawList.map(it => ({
        vod_name: it.name,
        vod_pic: (it.picUrl || '') + '?param=300y300',
        vod_remarks: it.playCount ? '🎧' + (it.playCount > 10000 ? (it.playCount / 10000).toFixed(1) + '万' : it.playCount) : '',
        vod_id: `playlist_${it.id}`
    }));

    return JSON.stringify({ list: list, page: +pg, limit: limit });
}

async function detail(id) {
    const did = id.toString();
    const realId = did.split('_')[1];
    
    let vod_name, vod_pic, vod_content, tracks;
    
    if (did.startsWith('artist_')) {
        const url = `${host}${rule.artistDetail}${realId}`;
        const json = JSON.parse(await request(url, { headers }));
        
        vod_name = json.artist.name;
        vod_pic = (json.artist.picUrl || json.artist.cover || '') + '?param=500y500';
        vod_content = json.artist.briefDesc || json.artist.name;
        tracks = json.hotSongs || [];
        
    } else {
        const url = `${host}${rule.playlistDetail}?id=${realId}`;
        const json = JSON.parse(await request(url, { headers }));
        const playlist = json.result || json.playlist;
        
        vod_name = playlist.name;
        vod_pic = (playlist.coverImgUrl || playlist.picUrl || '') + '?param=500y500';
        vod_content = playlist.description || playlist.name;
        tracks = playlist.tracks || [];
    }
    
    // 构建播放数据
    let playArr = [];
    let songPicArr = [];
    
    tracks.forEach(s => {
        let songName = s.name;
        let artist = (s.artists || s.ar || []).map(a => a.name).join('/');
        let displayName = artist ? `${songName} - ${artist}` : songName;
        let songPic = (s.al?.picUrl || s.album?.picUrl || vod_pic).replace('?param=500y500', '?param=300y300');
        
        playArr.push(`${displayName}$${s.id}|lMusic&&${songPic}`);
        songPicArr.push(songPic);
    });
    
    // 音质映射（从高到低排序）
    const qualityMap = [
        ["超高", "hrMusic"],
        ["无损", "sqMusic"],
        ["极高", "hMusic"],
        ["较高", "mMusic"],
        ["标准", "lMusic"]
    ];

    const playFrom = qualityMap.map(q => q[0]).join('$$$');
    const playUrl = qualityMap.map(q => 
        tracks.map(s => `${s.name}$${s.id}|${q[1]}&&${vod_pic}`).join('#')
    ).join('$$$');
    const playPic = songPicArr.join('#');
    
    return JSON.stringify({
        list: [{
            vod_id: did,
            vod_name: vod_name,
            vod_pic: vod_pic,
            vod_content: vod_content,
            vod_play_from: playFrom,
            vod_play_url: playUrl,
            vod_play_pic: playPic,
            vod_play_pic_ratio: 1.0
        }]
    });
}

async function play(flag, id, flags) {
    const [musicId, qualityType] = id.split('|');
    
    const playApi = `${rule.playUrl}&id=${musicId}`;
    const playJson = JSON.parse(await request(playApi, { headers }));
    
    let songUrl = '';
    if (playJson && playJson.code === 0 && playJson.data && playJson.data.length > 0) {
        songUrl = playJson.data[0].url || '';
    }
    
    const lyricApi = `${host}${rule.songLyric}?id=${musicId}&lv=1&kv=1&tv=-1`;
    
    const lyricJson = JSON.parse(await request(lyricApi, { headers }));
    let lyric = lyricJson.lrc?.lyric || '';
    if (lyricJson.tlyric?.lyric) {
        lyric = lyric + '\n\n【翻译】\n' + lyricJson.tlyric.lyric;
    }
    
    const infoApi = `${host}${rule.songDetail}?ids=[${musicId}]`;
    const infoJson = JSON.parse(await request(infoApi, { headers }));
    
    // 获取封面
    let cover = '';
    if (infoJson.songs && infoJson.songs[0]) {
        const song = infoJson.songs[0];
        if (song.album && song.album.picUrl) {
            cover = song.album.picUrl + '?param=500y500';
        } else if (song.al && song.al.picUrl) {
            cover = song.al.picUrl + '?param=500y500';
        }
    }
    
    return JSON.stringify({
        parse: 0,
        url: songUrl,
        header: headers,
        lrc: lyric,
        cover: cover,
        pic: cover,
        height: 720
    });
}

async function search(wd, quick) {
    const searchTypes = [
        { type: 1, prefix: 'song_', remark: '歌曲', key: 'songs' },
        { type: 10, prefix: 'album_', remark: '专辑', key: 'albums' },
        { type: 1000, prefix: 'playlist_', remark: '歌单', key: 'playlists' },
        { type: 100, prefix: 'artist_', remark: '歌手', key: 'artists' }
    ];
    
    let allResults = [];
    
    for (const st of searchTypes) {
        const url = `${rule.search}?keywords=${encodeURIComponent(wd)}&type=${st.type}`;
        const json = JSON.parse(await request(url, { headers }));
        
        if (json.result?.[st.key]) {
            for (const item of json.result[st.key]) {
                const result = { 
                    vod_name: item.name, 
                    vod_remarks: st.remark, 
                    vod_id: st.prefix + item.id, 
                    vod_pic: '' 
                };
                
                if (st.type === 1) {
                    if (item.ar) result.vod_name += ' - ' + item.ar.map(a => a.name).join('/');
                    if (item.al?.picUrl) result.vod_pic = item.al.picUrl + '?param=300y300';
                } else if (st.type === 10) {
                    if (item.artist) result.vod_name += ' - ' + item.artist.name;
                    if (item.picUrl) result.vod_pic = item.picUrl + '?param=300y300';
                } else if (st.type === 1000) {
                    if (item.coverImgUrl) result.vod_pic = item.coverImgUrl + '?param=300y300';
                } else if (st.type === 100) {
                    const picUrl = item.picUrl || item.img1v1Url;
                    if (picUrl) result.vod_pic = picUrl + '?param=300y300';
                }
                
                allResults.push(result);
            }
        }
    }
    
    return JSON.stringify({ list: allResults });
}

export function __jsEvalReturn() {
    return {
        init: init,
        home: home,
        homeVod: homeVod,
        category: category,
        detail: detail,
        play: play,
        search: search
    }
}