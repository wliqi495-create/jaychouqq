var rule = {
    title: 'porn',
    host: 'https://cn.pornhub.com/',
    url: '/channels/fyclass/videos?page=fypage',
    searchUrl: '/video/search?search=**',
    searchable: 1,
    quickSearch: 1,
    class_name: '国产&JAHD①&JAHD②&麻豆', //静态分类名称拼接
    class_url: 'av-jiali&javhd&jav-hub&asiam', //静态分类标识拼接
    limit: 999,
    headers: { 'User-Agent': PC_UA, 'Referer': '' },
    double: true,
    一级: $js.toString(() => {
        let d = [];
        let html = request(input)
        let htmm = jsp.pdfa(html, '.container ul .pcVideoListItem')
        htmm.forEach(it => {
            let id1 = HOST + jsp.pdfh(it, 'a&&href')
            let title1 = jsp.pdfh(it, 'img&&alt')
            let pic1 = jsp.pdfh(it, 'img&&src')
            let qx1 = jsp.pdfh(it, '.views&&Text')
            d.push({
                url: id1,
                title: title1,
                img: pic1,
                desc: qx1,
            })
        });
        setResult(d)
    }),
    二级: $js.toString(() => {
        let urls = [];
        let html = request(input);
        let s = jsp.pdfh(html, '.container&&script:eq(4)&&Html');

        function jjj(s) {
            const start = s.indexOf('"mediaDefinitions":') + '"mediaDefinitions":'.length;
            const firstBracketIndex = s.indexOf('[', start);
            let count = 1;
            let end = firstBracketIndex;

            for (let i = firstBracketIndex + 1; i < s.length; i++) {
                if (s[i] === '[') count++;
                else if (s[i] === ']') count--;
                if (count === 0) {
                    end = i + 1;
                    break;
                }
            }
            if (end > firstBracketIndex) {
                const jsonStr = s.substring(firstBracketIndex, end);
                return JSON.parse(jsonStr);

            }
        }
        jjj(s).forEach(it => {
            urls.push(it.height + '$' + it.videoUrl);
        })

        VOD = {
            vod_play_from: 'XSP',
            vod_play_url: urls.join('#')
        }
    }),
    搜索: '*',
}