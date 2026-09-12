/**
 * 凤凰FM - 详情页修复版
 * 修复点：根据日志将 data.data.programList 修改为 data.data.list
 */

var HOST = 'https://s.fm.renbenai.com';
var UA = 'okhttp/3.12.11';

async function init(cfg) { return ""; }

async function home() {
    var url = HOST + '/fm/read/fmd/static/categoryTvGet_100.html';
    try {
        var r = await req(url, { headers: { 'User-Agent': UA } });
        var data = typeof r.content === 'string' ? JSON.parse(r.content) : r.content;
        var classes = [];
        if (data && data.data && data.data.list) {
            data.data.list.forEach(function(group) {
                var contents = group.channelContent || [];
                contents.forEach(function(item) {
                    classes.push({
                        type_id: item.nodeName,
                        type_name: item.nodeName
                    });
                });
            });
        }
        return JSON.stringify({ class: classes });
    } catch (e) {
        return JSON.stringify({ class: [{type_id:'头条',type_name:'头条'}] });
    }
}

async function homeVod() { return JSON.stringify({ list: [] }); }

async function category(tid, pg, filter, extend) {
    return await search(tid, false, pg);
}

async function detail(id) {
    // 详情接口
    var url = HOST + '/fm/read/fmd/android/getProgramAudioList_620.html?pid=' + id;
    try {
        var r = await req(url, { headers: { 'User-Agent': UA } });
        var res = typeof r.content === 'string' ? JSON.parse(r.content) : r.content;
        
        // --- 核心修正点 ---
        // 根据日志 Body: {"code":"0","data":{"list":[{"title":"口蜜腹剑"...}]}}
        // 数据其实在 data.data.list 里面
        var items = (res.data && res.data.list) ? res.data.list : [];
        
        if (items.length === 0) return JSON.stringify({ list: [] });
        
        var playUrls = items.map(function(item) {
            // 凤凰的音频地址通常在 audiolist 数组里，或者直接在 filePath
            var audioUrl = "";
            if (item.audiolist && item.audiolist.length > 0) {
                audioUrl = item.audiolist[0].filePath;
            } else if (item.filePath) {
                audioUrl = item.filePath;
            }
            return (item.title || "播放").replace(/\$|#/g, ' ') + '$' + audioUrl;
        });

        return JSON.stringify({
            list: [{
                vod_id: id.toString(),
                vod_name: items[0].title || "详情",
                vod_pic: items[0].img || "",
                vod_play_from: '凤凰FM',
                vod_play_url: playUrls.join('#')
            }]
        });
    } catch (e) { 
        return JSON.stringify({ list: [] }); 
    }
}

async function search(wd, quick, pg) {
    var p = pg || 1;
    var url = HOST + '/fm/read/fmd/public/search_720.html?keyWord=' + encodeURIComponent(wd) + '&pageNum=' + p + '&searchType=1';
    try {
        var r = await req(url, { headers: { 'User-Agent': UA } });
        var data = typeof r.content === 'string' ? JSON.parse(r.content) : r.content;
        var items = (data.data && (data.data.resource || data.data.program)) ? (data.data.resource || data.data.program) : [];
        var list = items.map(function(item) {
            return {
                vod_id: (item.programId || item.id).toString(),
                vod_name: item.title || item.programName,
                vod_pic: item.img194_194 || item.img,
                vod_remarks: item.listenNumShow || item.updateSection
            };
        });
        return JSON.stringify({ page: parseInt(p), list: list });
    } catch (e) { return JSON.stringify({ list: [] }); }
}

async function play(flag, id, flags) {
    return JSON.stringify({ parse: 0, url: id, header: { 'User-Agent': UA } });
}

export default { home, homeVod, category, detail, search, play };
