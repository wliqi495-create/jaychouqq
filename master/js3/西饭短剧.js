/**
 * 西饭短剧 - Node.js 适配版
 */

const HOST = 'https://xifan-api-cn.youlishipin.com';
const LIMIT = 30;

const headers = {
    'User-Agent': 'okhttp/3.12.11',
};

async function init(cfg) {}

async function home() {
    const url = `${HOST}/xifan/drama/portalPage?reqType=duanjuCategory&version=2001001&androidVersionCode=28`;
    const r = await req(url, { headers });
    const data = JSON.parse(r.content).result.elements[0].contents;
    
    let classes = [];
    let filters = {};

    data.forEach((it) => {
        const categoryItemVo = it.categoryItemVo || {};
        const typeName = categoryItemVo.oppoCategory;
        const typeId = categoryItemVo.categoryId;
        const subCategories = categoryItemVo.subCategories || [];

        // 提取主分类
        if (it.type && it.type.includes("duanjuCategory")) {
            classes.push({
                type_name: typeName,
                type_id: `${typeId}@${typeName}`,
            });
        }

        // 提取筛选条件
        if (subCategories.length > 0) {
            filters[`${typeId}@${typeName}`] = [{
                key: "categoryId",
                name: "分类",
                value: subCategories.map(sub => ({
                    n: sub.oppoCategory,
                    v: `${sub.categoryId}@${sub.oppoCategory}`
                }))
            }];
        }
    });

    return JSON.stringify({ class: classes, filters: filters });
}

async function homeVod() {
    // 默认展示第一个分类内容
    return await category('1001@剧场', '1');
}

async function category(tid, pg, filter, extend = {}) {
    let page = (parseInt(pg) - 1) * LIMIT;
    let [typeId, typeName] = tid.split('@');
    
    // 如果有筛选条件，覆盖 ID 和 Name
    if (extend.categoryId) {
        [typeId, typeName] = extend.categoryId.split('@');
    }

    let current_timestamp = Math.floor(Date.now() / 1000);
    // 使用固定的 session 保持与原脚本一致
    const session = "eyJpbmZvIjp7InVpZCI6IiIsInJ0IjoiMTc0MDY1ODI5NCIsInVuIjoiT1BHXzFlZGQ5OTZhNjQ3ZTQ1MjU4Nzc1MTE2YzFkNzViN2QwIiwiZnQiOiIxNzQwNjU4Mjk0In19";
    const feedssession = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1dHlwIjowLCJidWlkIjoxNjMzOTY4MTI2MTQ4NjQxNTM2LCJhdWQiOiJkcmFtYSIsInZlciI6MiwicmF0IjoxNzQwNjU4Mjk0LCJ1bm0iOiJPUEdfMWVkZDk5NmE2NDdlNDUyNTg3NzUxMTZjMWQ3NWI3ZDAiLCJpZCI6IjNiMzViZmYzYWE0OTgxNDQxNDBlZjI5N2JkMDY5NGNhIiwiZXhwIjoxNzQxMjYzMDk0LCJkYyI6Imd6cXkifQ.JS3QY6ER0P2cQSxAE_OGKSMIWNAMsYUZ3mJTnEpf-Rc";

    let url = `${HOST}/xifan/drama/portalPage?reqType=aggregationPage&offset=${page}&categoryId=${typeId}&quickEngineVersion=-1&scene=&categoryNames=${encodeURIComponent(typeName)}&categoryVersion=1&density=1.5&pageID=page_theater&version=2001001&androidVersionCode=28&requestId=${current_timestamp}aa498144140ef297&appId=drama&teenMode=false&userBaseMode=false&session=${session}&feedssession=${feedssession}`;

    const r = await req(url, { headers });
    const resultElements = JSON.parse(r.content).result.elements;
    
    let list = [];
    resultElements.forEach((soup) => {
        if (soup.contents) {
            soup.contents.forEach((vod) => {
                let dj = vod.duanjuVo;
                if (dj) {
                    list.push({
                        vod_id: `${dj.duanjuId}#${dj.source}`,
                        vod_name: dj.title,
                        vod_pic: dj.coverImageUrl,
                        vod_remarks: dj.total + '集'
                    });
                }
            });
        }
    });

    return JSON.stringify({
        page: parseInt(pg),
        list: list
    });
}

async function detail(id) {
    let [duanjuId, source] = id.split("#");
    const session = "eyJpbmZvIjp7InVpZCI6IiIsInJ0IjoiMTc0MDY1ODI5NCIsInVuIjoiT1BHXzFlZGQ5OTZhNjQ3ZTQ1MjU4Nzc1MTE2YzFkNzViN2QwIiwiZnQiOiIxNzQwNjU4Mjk0In19";
    const feedssession = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1dHlwIjowLCJidWlkIjoxNjMzOTY4MTI2MTQ4NjQxNTM2LCJhdWQiOiJkcmFtYSIsInZlciI6MiwicmF0IjoxNzQwNjU4Mjk0LCJ1bm0iOiJPUEdfMWVkZDk5NmE2NDdlNDUyNTg3NzUxMTZjMWQ3NWI3ZDAiLCJpZCI6IjNiMzViZmYzYWE0OTgxNDQxNDBlZjI5N2JkMDY5NGNhIiwiZXhwIjoxNzQxMjYzMDk0LCJkYyI6Imd6cXkifQ.JS3QY6ER0P2cQSxAE_OGKSMIWNAMsYUZ3mJTnEpf-Rc";
    
    let url = `${HOST}/xifan/drama/getDuanjuInfo?duanjuId=${duanjuId}&source=${source}&openFrom=homescreen&type=&pageID=page_inner_flow&density=1.5&version=2001001&androidVersionCode=28&requestId=1740658944980aa498144140ef297&appId=drama&teenMode=false&userBaseMode=false&session=${session}&feedssession=${feedssession}`;

    const r = await req(url, { headers });
    const data = JSON.parse(r.content).result;

    const vod = {
        vod_id: id,
        vod_name: data.title,
        vod_pic: data.coverImageUrl,
        vod_content: data.desc || '暂无简介',
        vod_remarks: data.updateStatus === 'over' ? `${data.total}集 已完结` : `更新至${data.total}集`,
        vod_play_from: '西饭短剧',
    };

    let playUrls = data.episodeList.map((ep) => {
        return `${ep.index}$${ep.playUrl}`;
    });

    vod.vod_play_url = playUrls.join("#");

    return JSON.stringify({ list: [vod] });
}

async function search(wd, quick, pg = 1) {
    let current_timestamp = Math.floor(Date.now() / 1000);
    const session = "eyJpbmZvIjp7InVpZCI6IiIsInJ0IjoiMTc0MDY2ODk4NiIsInVuIjoiT1BHX2U5ODQ4NTgzZmM4ZjQzZTJhZjc5ZTcxNjRmZTE5Y2JjIiwiZnQiOiIxNzQwNjY4OTg2In19";
    const feedssession = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1dHlwIjowLCJidWlkIjoxNjM0MDU3ODE4OTgxNDk5OTA0LCJhdWQiOiJkcmFtYSIsInZlciI6MiwicmF0IjoxNzQwNjY4OTg2LCJ1bm0iOiJPUEdfZTk4NDg1ODNmYzhmNDNlMmFmNzllNzE2NGZlMTljYmMiLCJpZCI6ImVhZGE1NmEyZWEzYTE0YmMwMzE3ZDc2ZmVjODJjNzc3IiwiZXhwIjoxNzQxMjczNzg2LCJkYyI6ImJqaHQifQ.IwuI0gK077RF4G10JRxgxx4GCG502vR8Z0W9EV4kd-c";

    let url = `${HOST}/xifan/search/getSearchList?keyword=${encodeURIComponent(wd)}&pageIndex=${pg}&version=2001001&androidVersionCode=28&requestId=${current_timestamp}ea3a14bc0317d76f&appId=drama&teenMode=false&userBaseMode=false&session=${session}&feedssession=${feedssession}`;

    const r = await req(url, { headers });
    const elements = JSON.parse(r.content).result.elements;
    
    let list = [];
    elements.forEach((soup) => {
        if (soup.contents) {
            soup.contents.forEach((vod) => {
                let dj = vod.duanjuVo;
                if (dj) {
                    list.push({
                        vod_id: `${dj.duanjuId}#${dj.source}`,
                        vod_name: dj.title.replace(/<[^>]+>/g, ""),
                        vod_pic: dj.coverImageUrl,
                        vod_remarks: dj.total + '集'
                    });
                }
            });
        }
    });

    return JSON.stringify({ list: list });
}

async function play(flag, id, flags) {
    return JSON.stringify({
        parse: 0,
        url: id
    });
}

export default { init, home, homeVod, category, detail, search, play };
