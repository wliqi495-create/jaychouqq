/*
@header({
  searchable: 2,
  filterable: 0,
  quickSearch: 0,
  title: '小蜜蜂影院',
  类型: '影视',
  lang: 'ds'
})
*/

var rule = {
     title: '小蜜蜂影院',
     host: 'https://www.xmfyy.com',
     homeUrl: '/',
     url: '/index.php/vod/show/id/fyclass/page/fypage.html',
     searchUrl: '/index.php/vod/search/wd/**/page/fypage.html',
     searchable: 2,
     quickSearch: 0,
     filterable: 0,
     timeout: 10000,
     double: false,
     headers: {
         'User-Agent': MOBILE_UA,
         'Referer': 'https://www.xmfyy.com/'
     },
     // 分类ID映射（手动定义，不使用模板）
     class_name: '连续剧(全部)&国产剧&港台剧&日韩剧&欧美剧&纪录片&其他剧&电影(全部)&动作片&喜剧片&爱情片&科幻片&恐怖片&剧情片&战争片&悬疑片&动漫&动漫&番剧&动画片&综艺',
     class_url: '2&13&14&15&16&38&37&1&6&7&8&9&10&11&12&21&4&28&39&19&3',
    
    // 首页推荐规则
    推荐: '.hl-vod-list&&.hl-list-item;a&&title;.hl-item-thumb&&data-original;.hl-item-sub&&Text;a&&href',
    
    // 一级分类列表规则
    一级: '.hl-vod-list&&.hl-list-item;a&&title;.hl-item-thumb&&data-original;.hl-item-sub&&Text;a&&href',
    
    // 搜索结果规则
    搜索: '.search-result-list&&.search-result-item;.result-title&&Text;.result-pic&&data-original;.result-info&&Text;.result-title&&href',
    
    // 二级详情页解析
    二级: async function () {
        let { input, pdfh, pd, pdfa } = this;
        let html = await request(input);
        
        // 影片名称
        let vod_name = pdfh(html, '.vod-info&&h1&&Text') || pdfh(html, 'h1&&Text');
        
        // 封面图片
        let vod_pic = pd(html, '.vod-poster&&img&&src');
        
        // 提取影片信息
        let vod_status = '';
        let vod_actor = '';
        let vod_director = '';
        let vod_year = '';
        let vod_area = '';
        let vod_type = '';
        let vod_remarks = '';
        let vod_lang = '';
        let vod_update = '';
        
        // 从信息栏提取数据
        let infoElements = pdfa(html, '.vod-info&&p');
        infoElements.forEach(it => {
            let txt = pdfh(it, 'body&&Text').trim();
            if (txt.includes('状态：')) vod_status = txt.replace('状态：', '').trim();
            if (txt.includes('主演：')) vod_actor = txt.replace('主演：', '').trim();
            if (txt.includes('导演：')) vod_director = txt.replace('导演：', '').trim();
            if (txt.includes('年份：')) vod_year = txt.replace('年份：', '').trim();
            if (txt.includes('地区：')) vod_area = txt.replace('地区：', '').trim();
            if (txt.includes('类型：')) vod_type = txt.replace('类型：', '').trim();
            if (txt.includes('备注：')) vod_remarks = txt.replace('备注：', '').trim();
            if (txt.includes('语言：')) vod_lang = txt.replace('语言：', '').trim();
            if (txt.includes('更新：')) vod_update = txt.replace('更新：', '').trim();
        });
        
        // 如果没有提取到类型，使用默认值
        if (!vod_type || vod_type === '') {
            vod_type = '影视';
        }
        
        // 剧情简介
        let vod_content = pdfh(html, '.vod-content&&Text').trim();
        
        // 提取播放列表 - 新结构：支持多线路
        let playFroms = [];
        let playUrlsMap = {};
        
        // 提取所有播放线路名称
        let sourceElements = pdfa(html, '.hl-plays-from&&.hl-tabs-btn');
        sourceElements.forEach((source, idx) => {
            let sourceName = pdfh(source, 'body&&Text').replace(/^\s*&nbsp;\s*/, '').trim();
            if (sourceName) {
                playFroms.push(sourceName);
                playUrlsMap[sourceName] = [];
                
                // 提取对应线路的播放列表
                // 使用更简单的方法：直接使用:eq()选择器，但确保它能工作
                let playListSelector = `.hl-tabs-box:eq(${idx}) .hl-plays-list li a`;
                let playListElements = pdfa(html, playListSelector);
                
                // 如果:eq()选择器没有提取到，尝试备用方法
                if (playListElements.length === 0) {
                    // 备用方法：先获取所有.hl-tabs-box，然后手动处理
                    let allTabsBoxes = pdfa(html, `.hl-tabs-box`);
                    if (idx < allTabsBoxes.length) {
                        playListSelector = `.hl-plays-list li a`;
                        playListElements = pdfa(allTabsBoxes[idx], playListSelector);
                    }
                }
                
                playListElements.forEach(it => {
                    let n = pdfh(it, 'body&&Text').trim();
                    let u = pd(it, 'a&&href') || pd(it, 'href');
                    if (n && u) {
                        // 过滤"展开全部"按钮
                        if (n.includes('展开全部')) {
                            return;
                        }
                        // 如果链接不是完整URL，补全主机
                        if (u && !u.startsWith('http')) {
                            u = rule.host + u;
                        }
                        playUrlsMap[sourceName].push(n + '$' + u);
                    }
                });
            }
        });
        
        // 格式化输出
        let vod_play_from = playFroms.join('$$$');
        let vod_play_url = playFroms.map(source => playUrlsMap[source].join('#')).join('$$$');
        
        return {
            vod_id: input,
            vod_name,
            vod_pic,
            type_name: vod_type,
            vod_year,
            vod_area,
            vod_remarks: vod_remarks || vod_status,
            vod_actor,
            vod_director,
            vod_content,
            vod_play_from: vod_play_from,
            vod_play_url: vod_play_url
        };
    },
    
    play_parse: true,
    lazy: async function () {
        let { input } = this;
        return {
            parse: 1,
            url: input,
            header: {
                'User-Agent': rule.headers['User-Agent'],
                'Referer': input
            }
        };
    }
};