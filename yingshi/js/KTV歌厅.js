globalThis.post2 = function (_url, _data) {
    // let data = buildUrl(_url,_data).split('?')[1];
    // return post(_url,{body:encodeURIComponent(data),headers:rule.headers});
    return post(_url, {data: _data, headers: rule.headers});
}
var rule = {
    类型: '听歌',//影视|听书|漫画|小说
    title: 'KTV歌厅[听]',
    // host: 'https://vpsdn.leuse.top',
    host: 'https://api.cloudflare.com',
    root: 'https://api.cloudflare.com/client/v4/accounts/1ecc4a947c5a518427141f4a68c86ea1/d1/database/4f1385ab-f952-404a-870a-e4cfef4bd9fd/query',
    mktvUrl: 'http://txysong.mysoto.cc/songs/',
    url: '/searchmv?table=fyclass&pg=fypage#fyfilter',
    searchUrl: '/searchmv?keywords=**&pg=fypage',
    pic: 'https://api.paugram.com/wallpaper/?source=sina&category=us',
    searchable: 2,
    quickSearch: 0,
    filterable: 1,
    filter: 'H4sIAAAAAAAAA52STU/CMBjHv0vPHATfuerFkwePhgOHSRZhmIEmhJBgBLIIBEgI0/BqAgFEwgYRDbjwZWzpvoUr2tGlXOTW/p+n7a+/Ng4iohQQZOC9jINrIQa8QBYCYlgCLiD5Q4I1hzUN5mbWXJTEqDW3Rnf+4K2wWiKRhnTPfOiRmFQTrvhq4CY7kGq7az5n7NjzF6PPESxodrxLu6sGbFdAwkcKvzxXYTm0plnqc6gMtqZZlj84FNiZcBzLeQoWFcLhc4FIWAowgoJ+xg4eDXEvuebx/BMIqwVrC56parAxxTKbfTbeozLVDhvv027VgHmVrRzQU7M6Gx/SW4/bbHxEYdLT73nFjo/p9v03VHcc7N6hQBPNkdufIa9B7ctRojfG00cKyzx+NHYjOB+/kd368dH7PX7J8a6LCizrnGuUTCK1y7mGqQUa5njX9T4sGZxopJXYbioaKw1UHfOiKzU4y3Ci8eLVHDxtsKy2UL55enZxcr5BtaHjbmb1gxM/8si9TOYDAAA=',
    filter_url: '{{fl}}',
    headers: {
        'User-Agent': 'MOBILE_UA',
        'Content-Type': 'application/json',
        'Authorization': 'Bearer LueNrycW-6jks7xBjPqX9mjFq2A2M5Kul6Ig3D8z',
    },
    timeout: 5000,
    class_name: '歌手&曲库',
    class_url: 'singer&song',
    一级: $js.toString(() => {
        let d = [];
        // let _url = input.split('#')[0];
        let _url = rule.root;
        let params = [];
        let sql = '';
        let size = 20;
        let pg = MY_PAGE;
        if (MY_CATE === 'singer') {
            sql = 'select name, id from singer where 1=1';
            if (MY_FL.region) {
                params.push(MY_FL.region);
                sql += ' and region_id = ?';
                // _url += '&where=region_id&keywords=' + MY_FL.region + '&size=21';
            } else if (MY_FL.form) {
                params.push(MY_FL.form);
                sql += ' and form_id = ?';
                // _url += '&where=form_id&keywords=' + MY_FL.form + '&size=21';
            }
            sql += ` order by id limit ${(pg - 1) * size},${size};`;
            let html = post2(_url, {params: params, sql: sql});
            let json = JSON.parse(html);
            d = json.result[0].results.map(item => {
                let pic = rule.mktvUrl + item.id + '.jpg';
                return {
                    vod_id: item.name + '@@' + item.name + '@@' + pic,
                    vod_name: item.name,
                    vod_pic: pic,
                    vod_remarks: '',
                }
            });
        } else if (MY_CATE === 'song') {
            sql = 'select number, name from song where 1=1';
            if (MY_FL.lan) {
                params.push(MY_FL.lan);
                sql += ' and language_id = ?';
                // _url += '&where=language_id&keywords=' + MY_FL.lan + '&size=21';
            } else if (MY_FL.type) {
                params.push(MY_FL.type);
                sql += ' and type_id = ?';
                // _url += '&where=type_id&keywords=' + MY_FL.type + '&size=21';
            }
            sql += ` order by number limit ${(pg - 1) * size},${size};`;
            let html = post2(_url, {params: params, sql: sql});
            let json = JSON.parse(html);
            d = json.result[0].results.map(item => {
                return {
                    vod_id: rule.mktvUrl + item.number + '.mkv' + '@@' + item.name + '@@' + '',
                    vod_name: item.name,
                    vod_pic: rule.pic,
                    vod_remarks: '',
                }
            });
        }
        VODS = d;
    }),
    二级: $js.toString(() => {
        let _url = rule.root;
        let id = orId.split('@@')[0];
        let name = orId.split('@@')[1];
        if (id.endsWith('.mkv')) {
            VOD = {
                vod_name: name,
                vod_play_from: '分享者在线',
                vod_content: '分享者在线',
            }
        } else {
            VOD = {
                vod_name: id,
                vod_play_from: '分享者在线',
                vod_content: '分享者在线',
            }
        }
        if (id.endsWith('.mkv')) {
            VOD.vod_play_url = '嗅探播放$' + id;
        } else {
            let params = [id];
            let sql = 'select number,name from song where singer_names = ? order by number limit 0,999';
            let html = post2(_url, {params: params, sql: sql});
            let json = JSON.parse(html);
            let data = json.result[0].results;

            VOD.vod_play_url = (data.map(item => {
                return item.name + '$' + rule.mktvUrl + item.number + '.mkv';
            })).join('#');
        }
    }),
    搜索: $js.toString(() => {
        let _url = rule.root;
        let wd = KEY;
        let sql = "select number,name from song where name like '%" + wd + "%' or singer_names like '%" + wd + "%'";
        let d = [];
        let html = post2(_url, {sql: sql});
        let json = JSON.parse(html);
        d = json.result[0].results.map(item => {
            return {
                vod_id: rule.mktvUrl + item.number + '.mkv' + '@@' + item.name + '@@' + '',
                vod_name: item.name,
                vod_pic: rule.pic,
                vod_remarks: item.singer_names,
            }
        });
        VODS = d;
    }),
    play_parse: true,
    lazy: $js.toString(() => {
        input = {parse: 0, url: input};
    }),
}