const host = 'https://fktv.me';

// 辅助函数：生成指向 server.js 的代理 URL
function getProxyUrl(imgUrl) {
    if (!imgUrl) return "";
    // 注意：这里的 spider 参数必须与文件名一致
    return `http://127.0.0.1:10000?spider=凡客tv&proxy=1&url=${base64Encode(encodeURIComponent(imgUrl))}`;
}

function generateCookie() {
    const t = "ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz102345678";
    let n = "";
    for (let i = 0; i < 32; i++) n += t.charAt(Math.floor(Math.random() * t.length));
    return `_did=${n}`;
}

function imgDecrypt(data) {
    // 凡客加密图片的固定 Key
    const lkey = CryptoJS.enc.Utf8.parse("525202f9149e0616");
    const b64data = Buffer.from(data).toString('base64');
    const decrypted = CryptoJS.AES.decrypt(b64data, lkey, {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7,
    });
    return decrypted.toString(CryptoJS.enc.Base64);
}

async function home() {
    return {
        class: [
            { type_id: '1', type_name: '电影' }, { type_id: '2', type_name: '电视剧' },
            { type_id: '4', type_name: '动漫' }, { type_id: '3', type_name: '综艺' },
            { type_id: '8', type_name: '短剧' }, { type_id: '6', type_name: '纪录片' }
        ]
    };
}

async function category(tid, pg, filter, extend) {
    const url = `${host}/channel?page=${pg || 1}&cat_id=${tid}&order=new&page_size=32`;
    const res = await req(url);
    const data = pdfa(res.content, '.video-wrap .list-wrap .item-wrap');
    const d = data.map(it => ({
        vod_name: pdfh(it, '.meta-wrap a&&Text'),
        vod_pic: getProxyUrl(pdfh(it, '.normal-wrap .bg-cover&&data-src')),
        vod_remarks: pdfh(it, '.meta-wrap .category&&Text'),
        vod_id: pdfh(it, '.meta-wrap a&&href')
    }));
    return { page: parseInt(pg || 1), list: d };
}

async function detail(id) {
    const vodId = Array.isArray(id) ? id[0] : id;
    const res = await req(`${host}${vodId}`);
    const html = res.content;
    const vod = {
        vod_id: vodId,
        vod_name: pdfh(html, '.tab-body h1.title&&Text'),
        vod_pic: getProxyUrl(pdfh(html, '.info-more .meta-wrap .thumb&&data-src')),
        vod_content: pdfh(html, '.info-more .desc&&Text'),
        vod_remarks: pdfh(html, '.info-more .meta-wrap .mb-2&&Text'),
        type_name: pdfh(html, '.info-more .meta-wrap .tag-list a&&Text')
    };

    let playFroms = [], playUrls = [];
    const playList = pdfa(html, '.line-header .item-wrap');
    const indexList = pdfa(html, '.line-list .anthology-list .inner-wrap .item-wrap');

    playList.forEach((it) => {
        const line = pdfh(it, 'div&&data-line');
        playFroms.push(pdfh(it, 'div&&Text'));
        const urls = indexList.map(idx => `${pdfh(idx, 'span.number&&Text')}$${line}-${vodId}-${pdfh(idx, 'div&&data-id')}`);
        playUrls.push(urls.join('#'));
    });

    vod.vod_play_from = playFroms.join('$$$');
    vod.vod_play_url = playUrls.join('$$$');
    return { list: [vod] };
}

async function search(wd, quick, pg) {
    const url = `${host}/channel?page=${pg || 1}&keywords=${encodeURIComponent(wd)}&page_size=32&order=new`;
    const res = await req(url);
    const data = pdfa(res.content, '.video-wrap .list-wrap .item-wrap');
    const d = data.map(it => ({
        vod_name: pdfh(it, '.meta-wrap a&&Text'),
        vod_pic: getProxyUrl(pdfh(it, '.normal-wrap .bg-cover&&data-src')),
        vod_remarks: pdfh(it, '.meta-wrap .category&&Text'),
        vod_id: pdfh(it, '.meta-wrap a&&href')
    }));
    return { list: d };
}

async function play(flag, id, flags) {
    const [vod_from, vod_id, vod_url] = id.split("-");
    const detailUrl = `${host}${vod_id}`;
    const res = await req(detailUrl, {
        method: 'POST',
        headers: { "Content-Type": 'application/x-www-form-urlencoded; charset=UTF-8', "Referer": detailUrl, "Cookie": generateCookie() },
        body: `link_id=${vod_url}&is_switch=1`
    });
    try {
        const response = JSON.parse(res.content);
        const item = response.data.play_links.find(i => i.id === vod_from);
        return { parse: 0, url: `${host}${item.m3u8_url}` };
    } catch (e) {
        return { parse: 1, url: detailUrl };
    }
}

// 代理执行函数：处理图片解密
async function proxy_rule(q) {
    const url = decodeURIComponent(base64Decode(q.url));
    try {
        const response = await axios.get(url, { 
            responseType: 'arraybuffer',
            headers: { "Referer": host }
        });
        const base64 = imgDecrypt(response.data);
        return [200, 'image/png', `data:image/png;base64,${base64}`, null, 1];
    } catch (e) {
        return [404, 'text/plain', '', null, 0];
    }
}

module.exports = {
    home, homeVod: async () => ({ list: [] }),
    category, detail, search, play, proxy_rule
};
