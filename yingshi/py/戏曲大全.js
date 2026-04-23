var rule = {
    title: '一曲肝肠断',
    host: 'https://fly.daoran.tv',
    url: '/API_ROP/search/album/screen',
    headers: {
        'User-Agent': 'okhttp/3.12.10',
        'Connection': 'Keep-Alive',
        'Accept-Encoding': 'gzip',
        'md5': 'SkvyrWqK9QHTdCT12Rhxunjx+WwMTe9y4KwgeASFDhbYabRSPskR0Q==',
        'Content-Type': 'application/json; charset=UTF-8',
        'Cookie': 'JSESSIONID=41ABA76E6D45A44D6419B3F26A0851ED'
    },
    class_name: '豫剧&黄梅戏&越剧&京剧&评剧&曲剧&坠子&秦腔&河北梆子&潮剧&粤剧&沪剧&二夹弦&昆曲&河南琴书&淮剧&单弦&西秦戏&婺剧&上党梆子&白字戏&河南大鼓书&越调&滇剧&太康道情&民族音乐&扬剧&其他&曲艺晚会&二人台&北路梆子&彩调&乐腔&老年大学&吕剧&天津时调&戏曲&柳琴戏&京韵大鼓&皮影戏&湘剧&四平调&琼剧&锡剧&评书&绍剧&京东大鼓&庐剧&话剧&西河大鼓&莆仙戏&花鼓戏&川剧&相声&宛梆&晋中秧歌&采茶戏&蒲剧&汉剧&闽剧&晋剧&北京琴书&山歌剧&吉剧&正字戏&赣剧&麦田乡韾&楚剧&大平调&保定老调',
    class_url: 'yuju&hmx&yueju&jingju&pingju&quju&hnzz&qinq&hbbz&chaoju&gddx&huju&ejx&kunqu&hnqs&huaiju&danxian&xqx&wuju&SDBZ&bzx&hndgs&yued&dianju&tkdq&MZYY&yangju&other&else&ERT&blbz&caidiao&lq&WK&lvjv&tjsd&xq&liuqx&jydg&pyx&xj&spd&qiongju&xiju&pingshu&shaojv&jddg&luju&huaju&xhdg&huagx&chuanju&xiang&wb&jzyg&caichaxi&pujv&hj&minju&jinju&bjqs&sgj&jiju&zzx&gj&chuju&dpd&bdld',
    play_parse: true,
    lazy: $js.toString(() => {
        let code = input.split('?')[1];
        let data = JSON.stringify({
            "item": "o3",
            "mask": 0,
            "nodeCode": "001000",
            "project": "lyhxcx",
            "px": 2,
            "resCode": code,
            "userId": "d4b29595b6fe764e09078a0dad7352ff"
        });
        let html = post('https://fly.daoran.tv/API_ROP/play/get/playurl', {headers: rule.headers, body: data});
        log(html)
        let url = JSON.parse(html).playUrls.hd;
        input = {url: url, parse: 0}

    }),
    一级: $js.toString(() => {
        let d = [];
        let tid = MY_CATE
        let pg = MY_PAGE
        let data = JSON.stringify({
            "cur": pg,
            "free": 0,//0 全部，1 免费，2，会员
            "orderby": "hot",
            "pageSize": 3000,
            "resType": 1,
            "sect": tid,
            "tagId": 0,
            "userId": "d4b29595b6fe764e09078a0dad7352ff",
            "channel": "oppo",
            "item": "y9",
            "nodeCode": "001000",
            "project": "lyhxcx"
        });
        let html = post(input, {headers: rule.headers, body: data});
        log(html)
        let list = JSON.parse(html).pb.dataList;
        list.forEach(it => {
            let id = 'https://zheshiyitaiojialianjie.com?' + it.code
            d.push({
                url: id,
                title: it.name,
                img: 'https://img0.baidu.com/it/u=4079405848,3806507810&fm=253&fmt=auto&app=138&f=JPEG?w=500&h=750',
                desc: it.des,
            })
        })
        setResult(d);
    }),
    二级: $js.toString(() => {
        let urls = [];
        let code = input.split('?')[1];
        let data = JSON.stringify({
            "albumCode": code,
            "cur": 1,
            "pageSize": 100,
            "userId": "d4b29595b6fe764e09078a0dad7352ff",
            "channel": "oppo",
            "item": "y9",
            "nodeCode": "001000",
            "project": "lyhxcx"
        });
        let html = post('https://fly.daoran.tv/API_ROP/album/res/list', {headers: rule.headers, body: data});
        log(html)
        let list = JSON.parse(html).pb.dataList;
        list.forEach(it => {
            urls.push(it.name + '$' + 'https://zheshiyitaiojialianjie.com?' + it.code);
        })
        VOD = {
            vod_pic: 'https://img0.baidu.com/it/u=4079405848,3806507810&fm=253&fmt=auto&app=138&f=JPEG?w=500&h=750',
            vod_play_from: '球球啦',
            vod_play_url: urls.join('#')
        };
    }),

    搜索: $js.toString(() => {
        let d = []
        let pg = MY_PAGE
        let key = KEY
        let data = JSON.stringify({
            "cur": 1,
            "free": 0,
            "keyword": key,
            "nodeCode": "001000",
            "orderby": "hot",
            "pageSize": 200,
            "project": "lyhxcx",
            "px": 2,
            "sect": [],
            "userId": "d4b29595b6fe764e09078a0dad7352ff"
        });
        let html = post(input, {headers: rule.headers, body: data});
        log(html)
        let list = JSON.parse(html).pb.dataList;
        list.forEach(it => {
            let id = 'https://zheshiyitaiojialianjie.com?' + it.code
            d.push({
                url: id,
                title: it.name,
                img: 'https://img0.baidu.com/it/u=4079405848,3806507810&fm=253&fmt=auto&app=138&f=JPEG?w=500&h=750',
                desc: it.des,
            })
        })
        setResult(d);
    }),
    double: false, // 推荐内容是否双层定
    searchUrl: '/API_ROP/search/album/list',
}