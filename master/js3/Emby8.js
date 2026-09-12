import { Crypto, _ } from 'assets://js/lib/cat.js';

let siteKey = '';
let siteType = 0;

let HOST = 'https://emby.bangumi.ca';
let TOKEN = '8b0b16aae7e8403cb3d19969b82c3902';
let USER = '80e861cbff1343bfa0bedcea78895b91';
const DEVICE_ID = 'ea27caf7-9a51-4209-b1a5-374bf30c2ffd';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

function headers() {
    return {
        'User-Agent': UA,
        Referer: HOST + '/',
        'Accept-Language': 'zh-CN,zh;q=0.9'
    };
}

function embyQs() {
    return 'X-Emby-Client=Emby+Web&X-Emby-Device-Name=Android+WebView+Android&X-Emby-Device-Id=' +
        DEVICE_ID + '&X-Emby-Client-Version=4.9.0.31&X-Emby-Token=' + TOKEN + '&X-Emby-Language=zh-cn';
}

function safeJson(s) {
    try {
        if (!s) return null;
        if (typeof s === 'object') return s;
        return JSON.parse(s);
    } catch (e) {
        return null;
    }
}

async function getJson(url, opt) {
    try {
        const res = await req(url, Object.assign({ method: 'GET', headers: headers(), timeout: 20000 }, opt || {}));
        return safeJson(res && res.content ? res.content : '');
    } catch (e) {
        return null;
    }
}

function poster(it) {
    if (!it || !it.Id) return '';
    const tag = (it.ImageTags && it.ImageTags.Primary) || '';
    if (!tag) return '';
    return HOST + '/emby/Items/' + it.Id + '/Images/Primary?maxWidth=400&tag=' + tag + '&quality=90';
}

function extractVideos(json) {
    if (!json || !json.Items) return [];
    return json.Items.map(it => ({
        vod_id: it.Id,
        vod_name: it.Name || '',
        vod_pic: poster(it),
        vod_remarks: it.ProductionYear ? String(it.ProductionYear) : '',
        style: { type: 'rect', ratio: 0.75 }
    }));
}

function parseExtHost(ext) {
    if (!ext) return;
    let s = String(ext).trim();
    try {
        const d = JSON.parse(s);
        if (d.host) HOST = String(d.host).replace(/\/$/, '');
        if (d.token || d.apiKey || d.Token) TOKEN = String(d.token || d.apiKey || d.Token);
        if (d.user || d.Users || d.userId) USER = String(d.user || d.Users || d.userId);
        return;
    } catch (e) {}
    if (s.indexOf('http') === 0) HOST = s.replace(/\/$/, '');
}

async function init(cfg) {
    try {
        siteKey = cfg.skey;
        siteType = cfg.stype;
        parseExtHost(cfg.ext || cfg.extend || '');
    } catch (e) {}
}

async function home(filter) {
    try {
        const json = await getJson(HOST + '/emby/Users/' + USER + '/Views?' + embyQs());
        const classList = ((json && json.Items) || [])
            .filter(it => {
                const n = it.Name || '';
                return n.indexOf('播放列表') < 0 && n.indexOf('相机') < 0;
            })
            .map(it => ({ type_id: it.Id, type_name: it.Name, land: 1, ratio: 0.75 }));
        return JSON.stringify({ class: classList, filters: {} });
    } catch (e) {
        return JSON.stringify({ class: [], filters: {} });
    }
}

async function homeVod() {
    try {
        const json = await getJson(HOST + '/emby/Users/' + USER + '/Views?' + embyQs());
        return JSON.stringify({ list: extractVideos(json).slice(0, 20) });
    } catch (e) {
        return JSON.stringify({ list: [] });
    }
}

async function category(tid, pg, filter, ext) {
    pg = Number(pg) || 1;
    const start = (pg - 1) * 30;
    const url = HOST + '/emby/Users/' + USER + '/Items?SortBy=DateLastContentAdded%2CSortName&SortOrder=Descending&IncludeItemTypes=Movie%2CSeries&Recursive=true&Fields=BasicSyncInfo%2CCanDelete%2CContainer%2CPrimaryImageAspectRatio%2CProductionYear%2CCommunityRating%2CStatus%2CCriticRating%2CEndDate%2CPath&StartIndex=' +
        start + '&ParentId=' + tid + '&EnableImageTypes=Primary%2CBackdrop%2CThumb%2CBanner&ImageTypeLimit=1&Limit=30&EnableUserData=true&X-Emby-Token=' + TOKEN;
    const json = await getJson(url);
    const list = extractVideos(json);
    const total = (json && json.TotalRecordCount) || 0;
    const pagecount = pg * 30 < total ? pg + 1 : pg;
    return JSON.stringify({ list: list, page: pg, pagecount: pagecount, limit: 30, total: total });
}

async function search(key, quick, pg) {
    const url = HOST + '/emby/Users/' + USER + '/Items?SortBy=SortName&SortOrder=Ascending&Fields=BasicSyncInfo%2CCanDelete%2CContainer%2CPrimaryImageAspectRatio%2CProductionYear%2CStatus%2CEndDate&StartIndex=0&EnableImageTypes=Primary%2CBackdrop%2CThumb&ImageTypeLimit=1&Recursive=true&SearchTerm=' +
        encodeURIComponent(key) + '&GroupProgramsBySeries=true&Limit=50&X-Emby-Token=' + TOKEN;
    const json = await getJson(url);
    return JSON.stringify({ list: extractVideos(json), page: 1, pagecount: 1, land: 1, ratio: 0.75 });
}

async function detail(vodId) {
    const info = await getJson(HOST + '/emby/Users/' + USER + '/Items/' + vodId + '?X-Emby-Token=' + TOKEN);
    if (!info) return JSON.stringify({ list: [] });
    let playUrl = '';
    if (!info.IsFolder) {
        playUrl = String(info.Name || '').trim() + '$' + info.Id;
    } else if (info.Type === 'Series') {
        const seasons = await getJson(HOST + '/emby/Shows/' + vodId + '/Seasons?UserId=' + USER +
            '&Fields=BasicSyncInfo%2CCanDelete%2CContainer%2CPrimaryImageAspectRatio%2CProductionYear%2CCommunityRating&EnableImages=true&EnableUserData=true&X-Emby-Token=' + TOKEN);
        const items = (seasons && seasons.Items) || [];
        const parts = [];
        for (let i = 0; i < items.length; i++) {
            const season = items[i];
            const eps = await getJson(HOST + '/emby/Shows/' + vodId + '/Episodes?SeasonId=' + season.Id +
                '&Fields=BasicSyncInfo%2CCanDelete%2CCommunityRating%2CPrimaryImageAspectRatio%2CProductionYear%2COverview&UserId=' + USER + '&Limit=1000&X-Emby-Token=' + TOKEN);
            ((eps && eps.Items) || []).forEach(ep => {
                const sn = String(season.Name || '').replace(/#/g, '-').replace(/\$/g, '|').trim();
                parts.push(sn + '|' + String(ep.Name || '').trim() + '$' + ep.Id);
            });
        }
        playUrl = parts.join('#');
    } else {
        const items = await getJson(HOST + '/emby/Users/' + USER + '/Items?ParentId=' + vodId +
            '&Fields=BasicSyncInfo%2CCanDelete%2CContainer%2CPrimaryImageAspectRatio%2CProductionYear%2CCommunityRating%2CCriticRating&ImageTypeLimit=1&StartIndex=0&EnableUserData=true&X-Emby-Token=' + TOKEN);
        playUrl = ((items && items.Items) || []).map(it =>
            String(it.Name || '').replace(/#/g, '-').replace(/\$/g, '|').trim() + '$' + it.Id
        ).join('#');
    }
    return JSON.stringify({
        list: [{
            vod_id: vodId,
            vod_name: info.Name || '',
            vod_pic: poster(info),
            vod_content: info.Overview ? String(info.Overview).replace(/\xa0/g, ' ').replace(/\n\n/g, '\n').trim() : '暂无简介',
            vod_year: info.ProductionYear ? String(info.ProductionYear) : '',
            vod_play_from: 'EMBY',
            vod_play_url: playUrl
        }]
    });
}

async function play(flag, playId, flags) {
    const h = headers();
    const playbackUrl = HOST + '/emby/Items/' + playId + '/PlaybackInfo?UserId=' + USER +
        '&IsPlayback=false&AutoOpenLiveStream=false&StartTimeTicks=0&MaxStreamingBitrate=7000000&X-Emby-Token=' + TOKEN;
    try {
        const res = await req(playbackUrl, {
            method: 'POST',
            headers: Object.assign({}, h, { 'Content-Type': 'application/json' }),
            data: JSON.stringify({
                DeviceProfile: {
                    DirectPlayProfiles: [{ Container: 'mp4,m4v,mkv,hls,webm', Type: 'Video' }],
                    TranscodingProfiles: [{ Container: 'ts', Type: 'Video', Protocol: 'hls' }]
                }
            }),
            timeout: 20000
        });
        const json = safeJson(res && res.content ? res.content : '');
        const media = json && json.MediaSources && json.MediaSources[0];
        if (media && media.DirectStreamUrl) {
            return JSON.stringify({ parse: 0, url: HOST + media.DirectStreamUrl, header: h });
        }
        if (media && media.Protocol === 'Http' && media.Path) {
            return JSON.stringify({ parse: 0, url: media.Path, header: h });
        }
        return JSON.stringify({ parse: 1, url: playbackUrl, header: h });
    } catch (e) {
        return JSON.stringify({ parse: 1, url: playbackUrl, header: h });
    }
}

export function __jsEvalReturn() {
    return { init, home, homeVod, category, detail, search, play };
}
