/**
 * JAVMenu 爬虫 (WebView/Dom 架构版)
 * 移植参考：低端影视(ddys.run)模板
 * 修改：DeepSeek
 * 版本：2.2
 * 修复：列表项目重复显示的问题 (修复选择器逻辑)
 */

function javMenuSpider() {
    const baseUrl = 'https://javmenu.com';
    
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
        'Referer': baseUrl + '/',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
    };

    /**
     * 图片提取函数
     */
    const getPicture = (element) => {
        const imgs = element.querySelectorAll('img');
        const filterKeywords = ['button_logo', 'no_preview', 'loading.gif', 'loading.png', 'website_building'];
        
        for (let i = 0; i < imgs.length; i++) {
            const img = imgs[i];
            let pic = img.getAttribute('data-src') || img.getAttribute('src');
            
            if (pic) {
                let isFiltered = false;
                for (let k of filterKeywords) {
                    if (pic.includes(k)) {
                        isFiltered = true;
                        break;
                    }
                }
                
                if (!isFiltered) {
                    pic = pic.trim();
                    if (pic.startsWith('//')) return 'https:' + pic;
                    if (pic.startsWith('/') && !pic.startsWith('http')) return baseUrl + pic;
                    return pic;
                }
            }
        }
        return '';
    };

    /**
     * 提取视频列表数据 (修复重复问题的核心部分)
     */
    const extractVideos = (document) => {
        // 1. 优先只找 .video-list-item
        let items = document.querySelectorAll('.video-list-item');
        
        // 2. 如果页面结构变了没找到，再退而求其次找 .card，防止同时选中造成重复
        if (items.length === 0) {
            items = document.querySelectorAll('.card');
        }

        // 使用 Set 防止 ID 重复 (双重保险)
        const seenIds = new Set();

        return Array.from(items).map(item => {
            const a = item.querySelector('a');
            if (!a) return null;

            let link = a.getAttribute('href');
            if (!link || !link.includes('/zh/')) return null;

            if (!link.startsWith('http')) {
                link = baseUrl + (link.startsWith('/') ? '' : '/') + link;
            }

            // 如果已经添加过这个 ID，跳过 (防止重复)
            if (seenIds.has(link)) return null;
            seenIds.add(link);

            const titleEl = item.querySelector('.card-title') || item.querySelector('img');
            let name = titleEl ? (titleEl.textContent || titleEl.getAttribute('alt') || '') : '';
            name = name.split(' - ')[0].trim();

            const pic = getPicture(item);

            const remarks = item.querySelector('.text-muted')?.textContent?.trim() || 
                            item.querySelector('.badge')?.textContent?.trim() || '';

            return {
                vod_id: link,
                vod_name: name,
                vod_pic: pic,
                vod_remarks: remarks
            };
        }).filter(v => v !== null);
    };

    return {
        async init(cfg) {
            return {
                webview: {
                    debug: true,
                    returnType: 'dom',
                    timeout: 30,
                    blockImages: true,
                    enableJavaScript: true,
                    header: headers
                }
            };
        },

        async homeContent(filter) {
            return {
                class: [
                    { "type_name": "有码在线", "type_id": "/zh/censored/online" },
                    { "type_name": "无码在线", "type_id": "/zh/uncensored/online" },
                    { "type_name": "欧美在线", "type_id": "/zh/western/online" },
                    { "type_name": "FC2在线", "type_id": "/zh/fc2/online" },
                    { "type_name": "成人动画", "type_id": "/zh/hanime/online" },
                    { "type_name": "国产在线", "type_id": "/zh/chinese/online" },
                    { "type_name": "有码作品", "type_id": "/zh/censored" },
                    { "type_name": "无码作品", "type_id": "/zh/uncensored" },
                    { "type_name": "欧美作品", "type_id": "/zh/western" },
                    { "type_name": "FC2作品", "type_id": "/zh/fc2" }
                ]
            };
        },

        async homeVideoContent() {
            const url = baseUrl + '/zh';
            const document = await Java.wvOpen(url);
            const videos = extractVideos(document);
            return { list: videos };
        },

        async categoryContent(tid, pg, filter, extend) {
            const page = pg || 1;
            let url = tid.startsWith('http') ? tid : baseUrl + tid;
            if (page > 1) url += `?page=${page}`;
            
            const document = await Java.wvOpen(url);
            const videos = extractVideos(document);

            return { 
                code: 1, 
                msg: "数据列表", 
                list: videos, 
                page: parseInt(page), 
                pagecount: 999, 
                limit: videos.length, 
                total: 999 * videos.length 
            };
        },

        async detailContent(ids) {
            const url = ids[0];
            const document = await Java.wvOpen(url);

            let title = document.querySelector('h1')?.textContent?.trim();
            if (!title) title = document.querySelector('title')?.textContent?.split(' - ')[0]?.trim();

            let pic = '';
            const card = document.querySelector('.card');
            if (card) {
                pic = getPicture(card);
            } else {
                pic = getPicture(document);
            }

            const content = document.querySelector('.card-text')?.textContent?.trim() || '';
            const yearMatch = (document.querySelector('.text-muted')?.textContent || '').match(/(\d{4})-\d{2}-\d{2}/);
            const vod_year = yearMatch ? yearMatch[1] : '';

            const actors = [];
            document.querySelectorAll('a[href*="/actor/"]').forEach(a => {
                const name = a.textContent.trim();
                if(name && !actors.includes(name)) actors.push(name);
            });
            const vod_actor = actors.join(',');

            const tags = [];
            document.querySelectorAll('.badge').forEach(b => {
                const t = b.textContent.trim();
                if(t) tags.push(t);
            });
            const type_name = tags.length > 0 ? tags[0] : '日本';
            const vod_remarks = tags.join(' ');

            const episodes = [];
            const seen = new Set();
            let count = 1;

            document.querySelectorAll('source, video').forEach(el => {
                const src = el.getAttribute('src');
                if (src && !seen.has(src) && src.startsWith('http')) {
                    const label = src.includes('.m3u8') ? 'HLS' : 'MP4';
                    episodes.push(`线路${count++}[${label}]$${src}`);
                    seen.add(src);
                }
            });

            const scripts = document.querySelectorAll('script');
            const m3u8Regex = /(https?:\/\/[^\s"\'<>]+\.m3u8[^\s"\'<>]*)/g;

            scripts.forEach(script => {
                const text = script.textContent;
                if (!text) return;
                
                let match;
                while ((match = m3u8Regex.exec(text)) !== null) {
                    const u = match[1];
                    if (u && !seen.has(u)) {
                        episodes.push(`线路${count++}[M3U8]$${u}`);
                        seen.add(u);
                    }
                }
            });

            if (episodes.length === 0) {
                episodes.push(`网页嗅探$${url}`);
            }

            return {
                code: 1,
                msg: "数据列表",
                page: 1,
                pagecount: 1,
                limit: 1,
                total: 1,
                list: [{
                    vod_id: url,
                    vod_name: title,
                    vod_pic: pic,
                    vod_type: type_name,
                    vod_year: vod_year,
                    vod_area: '日本',
                    vod_remarks: vod_remarks,
                    vod_actor: vod_actor,
                    vod_director: '',
                    vod_content: content,
                    vod_play_from: 'JAV在线',
                    vod_play_url: episodes.join('#')
                }]
            };
        },

        async searchContent(key, quick, pg) {
            const page = pg || 1;
            const url = `${baseUrl}/zh/search?wd=${encodeURIComponent(key)}&page=${page}`;
            const document = await Java.wvOpen(url);
            const videos = extractVideos(document);
            return { list: videos };
        },

        async playerContent(flag, id, vipFlags) {
            if (id.includes('.m3u8') || id.includes('.mp4')) {
                return { url: id, parse: 0, header: headers };
            } else {
                return { url: id, parse: 1, header: headers };
            }
        },

        async action(actionStr) {
            return { list: [] };
        }
    };
}

const spider = javMenuSpider();
spider;
