var rule = {
    title: 'xvideos',
    host: 'https://www.xvideos.com/',
    url: 'fyclass&sort=relevance&quality=hd&p=fypage',
    searchUrl: '?k=**&p=fypage',
    searchable: 1,
    quickSearch: 1,    
    filterable: 1,
    class_name: '1&2&3&4&5&6&7&8&4K', //静态分类名称拼接
    class_url: '?k=粉嫩美穴&?k=极品丝袜&?k=粉嫩白虎&?k=极品美女&?k=chinese&?k=台湾美女&?k=传媒&?k=高清无码内射&?k=亚洲4k', //静态分类标识拼接
    limit: 999,
    double: true,
    //sniffer: 1,
    一级: $js.toString(() => {
        let d = [];
        let aaa=fetch(input, {onlyHeaders:true});
        console.log("jdhdh====="+aaa)
        let html=request(input)
        let htmm=jsp.pdfa(html,'.cust-nb-cols&&.thumb-block')
        htmm.forEach(it => {
            let id1 = HOST+jsp.pdfh(it,'.thumb&&a&&href')
            let title1 = jsp.pdfh(it,'.title&&Text')
            let titlel = title1.replace(/https?:\/\/\S+/gi, '');
            let pic1 = jsp.pdfh(it,'img&&data-src')
            let qx1 = jsp.pdfh(it,'.video-hd-mark&&Text')
            d.push({
                url: id1,
                title: titlel,
                img: pic1,
                desc: qx1,
            })
        });
        setResult(d)
    }),
    二级: $js.toString(() => {
        let urls = [];       
        let html=request(input);
        let dd=jsp.pdfa(html, '#video-player-bg&&script:eq(-3)').toString();
        // console.log("djiewdneiin==="+dd)
        const d = [];
        const regex = /setVideoUrlLow\('([^']+)'\);|setVideoUrlHigh\('([^']+)'\);|setVideoHLS\('([^']+)'\);/g;
        let match;
        while ((match = regex.exec(dd)) !== null) {
        if (match[1]) d.push(`标清$${match[1]}`);
        if (match[2]) d.push(`高清$${match[2]}`);
        if (match[3]) d.push(`超清$${match[3]}`);
        }
        // console.log("djiewdneiin==="+d.toString())
        VOD = {
            vod_play_from: 'XSP',
            vod_play_url: d.join('#')
        }
    }),
    搜索: '.cust-nb-cols .thumb-block;.title a&&title;img&&data-src;.video-hd-mark&&Text;.title a&&href',
}