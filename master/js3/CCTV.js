import { Crypto, _ } from 'assets://js/lib/cat.js';
let siteKey = '';
let siteType = 0;

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";
const DEFAULT_HEADERS = {
    "User-Agent": UA,
    "Host": "tv.cctv.com",
    "Referer": "https://tv.cctv.com/"
};

// 完整筛选配置，复刻py config
const CONFIG_FILTER = {
    "电视剧": [
        {
            "key": "datafl-sc",
            "name": "类型",
            "value": [
                { "n": "全部", "v": "" },
                { "n": "谍战", "v": "谍战" },
                { "n": "悬疑", "v": "悬疑" },
                { "n": "刑侦", "v": "刑侦" },
                { "n": "历史", "v": "历史" },
                { "n": "古装", "v": "古装" },
                { "n": "武侠", "v": "武侠" },
                { "n": "军旅", "v": "军旅" },
                { "n": "战争", "v": "战争" },
                { "n": "喜剧", "v": "喜剧" },
                { "n": "青春", "v": "青春" },
                { "n": "言情", "v": "言情" },
                { "n": "偶像", "v": "偶像" },
                { "n": "家庭", "v": "家庭" },
                { "n": "年代", "v": "年代" },
                { "n": "革命", "v": "革命" },
                { "n": "农村", "v": "农村" },
                { "n": "都市", "v": "都市" },
                { "n": "其他", "v": "其他" }
            ]
        },
        {
            "key": "datanf-year",
            "name": "年份",
            "value": [
                { "n": "全部", "v": "" },
                { "n": "2023", "v": "2023" },
                { "n": "2022", "v": "2022" },
                { "n": "2021", "v": "2021" },
                { "n": "2020", "v": "2020" },
                { "n": "2019", "v": "2019" },
                { "n": "2018", "v": "2018" },
                { "n": "2017", "v": "2017" },
                { "n": "2016", "v": "2016" },
                { "n": "2015", "v": "2015" },
                { "n": "2014", "v": "2014" },
                { "n": "2013", "v": "2013" },
                { "n": "2012", "v": "2012" },
                { "n": "2011", "v": "2011" },
                { "n": "2010", "v": "2010" },
                { "n": "2009", "v": "2009" },
                { "n": "2008", "v": "2008" },
                { "n": "2007", "v": "2007" },
                { "n": "2006", "v": "2006" },
                { "n": "2005", "v": "2005" },
                { "n": "2004", "v": "2004" },
                { "n": "2003", "v": "2003" },
                { "n": "2002", "v": "2002" },
                { "n": "2001", "v": "2001" },
                { "n": "2000", "v": "2000" },
                { "n": "1999", "v": "1999" },
                { "n": "1998", "v": "1998" },
                { "n": "1997", "v": "1997" }
            ]
        },
        {
            "key": "dataszm-letter",
            "name": "字母",
            "value": [
                { "n": "全部", "v": "" },
                { "n": "A", "v": "A" },
                { "n": "C", "v": "C" },
                { "n": "E", "v": "E" },
                { "n": "F", "v": "F" },
                { "n": "G", "v": "G" },
                { "n": "H", "v": "H" },
                { "n": "I", "v": "I" },
                { "n": "J", "v": "J" },
                { "n": "K", "v": "K" },
                { "n": "L", "v": "L" },
                { "n": "M", "v": "M" },
                { "n": "N", "v": "N" },
                { "n": "O", "v": "O" },
                { "n": "P", "v": "P" },
                { "n": "Q", "v": "Q" },
                { "n": "R", "v": "R" },
                { "n": "S", "v": "S" },
                { "n": "T", "v": "T" },
                { "n": "U", "v": "U" },
                { "n": "V", "v": "V" },
                { "n": "W", "v": "W" },
                { "n": "X", "v": "X" },
                { "n": "Y", "v": "Y" },
                { "n": "Z", "v": "Z" },
                { "n": "0‑9", "v": "0‑9" }
            ]
        }
    ],
    "动画片": [
        {
            "key": "datafl‑sc",
            "name": "类型",
            "value": [
                { "n": "全部", "v": "" },
                { "n": "亲子", "v": "亲子" },
                { "n": "搞笑", "v": "搞笑" },
                { "n": "冒险", "v": "冒险" },
                { "n": "动作", "v": "动作" },
                { "n": "宠物", "v": "宠物" },
                { "n": "体育", "v": "体育" },
                { "n": "益智", "v": "益智" },
                { "n": "历史", "v": "历史" },
                { "n": "教育", "v": "教育" },
                { "n": "校园", "v": "校园" },
                { "n": "言情", "v": "言情" },
                { "n": "武侠", "v": "武侠" },
                { "n": "经典", "v": "经典" },
                { "n": "未来", "v": "未来" },
                { "n": "古代", "v": "古代" },
                { "n": "神话", "v": "神话" },
                { "n": "真人", "v": "真人" },
                { "n": "励志", "v": "励志" },
                { "n": "热血", "v": "热血" },
                { "n": "奇幻", "v": "奇幻" },
                { "n": "童话", "v": "童话" },
                { "n": "剧情", "v": "剧情" },
                { "n": "夺宝", "v": "夺宝" },
                { "n": "其他", "v": "其他" }
            ]
        },
        {
            "key": "datadq‑area",
            "name": "地区",
            "value": [
                { "n": "全部", "v": "" },
                { "n": "中国大陆", "v": "中国大陆" },
                { "n": "美国", "v": "美国" },
                { "n": "欧洲", "v": "欧洲" }
            ]
        },
        {
            "key": "dataszm‑letter",
            "name": "字母",
            "value": [
                { "n": "全部", "v": "" },
                { "n": "A", "v": "A" },
                { "n": "C", "v": "C" },
                { "n": "E", "v": "E" },
                { "n": "F", "v": "F" },
                { "n": "G", "v": "G" },
                { "n": "H", "v": "H" },
                { "n": "I", "v": "I" },
                { "n": "J", "v": "J" },
                { "n": "K", "v": "K" },
                { "n": "L", "v": "L" },
                { "n": "M", "v": "M" },
                { "n": "N", "v": "N" },
                { "n": "O", "v": "O" },
                { "n": "P", "v": "P" },
                { "n": "Q", "v": "Q" },
                { "n": "R", "v": "R" },
                { "n": "S", "v": "S" },
                { "n": "T", "v": "T" },
                { "n": "U", "v": "U" },
                { "n": "V", "v": "V" },
                { "n": "W", "v": "W" },
                { "n": "X", "v": "X" },
                { "n": "Y", "v": "Y" },
                { "n": "Z", "v": "Z" },
                { "n": "0‑9", "v": "0‑9" }
            ]
        }
    ],
    "纪录片": [
        {
            "key": "datapd‑channel",
            "name": "频道",
            "value": [
                { "n": "全部", "v": "" },
                { "n": "CCTV‑1 综合", "v": "CCTV‑1综合" },
                { "n": "CCTV‑2 财经", "v": "CCTV‑2财经" },
                { "n": "CCTV‑3 综艺", "v": "CCTV‑3综艺" },
                { "n": "CCTV‑4 中文国际", "v": "CCTV‑4中文国际(亚)" },
                { "n": "CCTV‑5 体育", "v": "CCTV‑5体育" },
                { "n": "CCTV‑6 电影", "v": "CCTV‑6电影" },
                { "n": "CCTV‑7 国防军事", "v": "CCTV‑7军事农业" },
                { "n": "CCTV‑8 电视剧", "v": "CCTV‑8电视剧" },
                { "n": "CCTV‑9 纪录", "v": "CCTV‑9纪录" },
                { "n": "CCTV‑10 科教", "v": "CCTV‑10科教" },
                { "n": "CCTV‑11 戏曲", "v": "CCTV‑11戏曲" },
                { "n": "CCTV‑12 社会与法", "v": "CCTV‑12社会与法" },
                { "n": "CCTV‑13 新闻", "v": "CCTV‑13新闻" },
                { "n": "CCTV‑14 少儿", "v": "CCTV‑14少儿" },
                { "n": "CCTV‑15 音乐", "v": "CCTV‑15音乐" },
                { "n": "CCTV‑17 农业农村", "v": "CCTV‑17农业农村高清" }
            ]
        },
        {
            "key": "datafl‑sc",
            "name": "类型",
            "value": [
                { "n": "全部", "v": "" },
                { "n": "人文历史", "v": "人文历史" },
                { "n": "人物", "v": "人物" },
                { "n": "军事", "v": "军事" },
                { "n": "探索", "v": "探索" },
                { "n": "社会", "v": "社会" },
                { "n": "时政", "v": "时政" },
                { "n": "经济", "v": "经济" },
                { "n": "科技", "v": "科技" }
            ]
        },
        {
            "key": "datanf‑year",
            "name": "年份",
            "value": [
                { "n": "全部", "v": "" },
                { "n": "2023", "v": "2023" },
                { "n": "2022", "v": "2022" },
                { "n": "2021", "v": "2021" },
                { "n": "2020", "v": "2020" },
                { "n": "2019", "v": "2019" },
                { "n": "2018", "v": "2018" },
                { "n": "2017", "v": "2017" },
                { "n": "2016", "v": "2016" },
                { "n": "2015", "v": "2015" },
                { "n": "2014", "v": "2014" },
                { "n": "2013", "v": "2013" },
                { "n": "2012", "v": "2012" },
                { "n": "2011", "v": "2011" },
                { "n": "2010", "v": "2010" },
                { "n": "2009", "v": "2009" },
                { "n": "2008", "v": "2008" }
            ]
        },
        {
            "key": "dataszm‑letter",
            "name": "字母",
            "value": [
                { "n": "全部", "v": "" },
                { "n": "A", "v": "A" },
                { "n": "C", "v": "C" },
                { "n": "E", "v": "E" },
                { "n": "F", "v": "F" },
                { "n": "G", "v": "G" },
                { "n": "H", "v": "H" },
                { "n": "I", "v": "I" },
                { "n": "J", "v": "J" },
                { "n": "K", "v": "K" },
                { "n": "L", "v": "L" },
                { "n": "M", "v": "M" },
                { "n": "N", "v": "N" },
                { "n": "O", "v": "O" },
                { "n": "P", "v": "P" },
                { "n": "Q", "v": "Q" },
                { "n": "R", "v": "R" },
                { "n": "S", "v": "S" },
                { "n": "T", "v": "T" },
                { "n": "U", "v": "U" },
                { "n": "V", "v": "V" },
                { "n": "W", "v": "W" },
                { "n": "X", "v": "X" },
                { "n": "Y", "v": "Y" },
                { "n": "Z", "v": "Z" },
                { "n": "0‑9", "v": "0‑9" }
            ]
        }
    ],
    "特别节目": [
        {
            "key": "datapd‑channel",
            "name": "频道",
            "value": [
                { "n": "全部", "v": "" },
                { "n": "CCTV‑1 综合", "v": "CCTV‑1综合" },
                { "n": "CCTV‑2 财经", "v": "CCTV‑2财经" },
                { "n": "CCTV‑3 综艺", "v": "CCTV‑3综艺" },
                { "n": "CCTV‑4 中文国际", "v": "CCTV‑4中文国际(亚)" },
                { "n": "CCTV‑5 体育", "v": "CCTV‑5体育" },
                { "n": "CCTV‑6 电影", "v": "CCTV‑6电影" },
                { "n": "CCTV‑7 国防军事", "v": "CCTV‑7军事农业" },
                { "n": "CCTV‑8 电视剧", "v": "CCTV‑8电视剧" },
                { "n": "CCTV‑9 纪录", "v": "CCTV‑9纪录" },
                { "n": "CCTV‑10 科教", "v": "CCTV‑10科教" },
                { "n": "CCTV‑11 戏曲", "v": "CCTV‑11戏曲" },
                { "n": "CCTV‑12 社会与法", "v": "CCTV‑12社会与法" },
                { "n": "CCTV‑13 新闻", "v": "CCTV‑13新闻" },
                { "n": "CCTV‑14 少儿", "v": "CCTV‑14少儿" },
                { "n": "CCTV‑15 音乐", "v": "CCTV‑15音乐" },
                { "n": "CCTV‑17 农业农村", "v": "CCTV‑17农业农村高清" }
            ]
        },
        {
            "key": "datafl‑sc",
            "name": "类型",
            "value": [
                { "n": "全部", "v": "" },
                { "n": "全部", "v": "全部" },
                { "n": "新闻", "v": "新闻" },
                { "n": "经济", "v": "经济" },
                { "n": "综艺", "v": "综艺" },
                { "n": "体育", "v": "体育" },
                { "n": "军事", "v": "军事" },
                { "n": "影视", "v": "影视" },
                { "n": "科教", "v": "科教" },
                { "n": "戏曲", "v": "戏曲" },
                { "n": "青少", "v": "青少" },
                { "n": "音乐", "v": "音乐" },
                { "n": "社会", "v": "社会" },
                { "n": "公益", "v": "公益" },
                { "n": "其他", "v": "其他" }
            ]
        },
        {
            "key": "dataszm‑letter",
            "name": "字母",
            "value": [
                { "n": "全部", "v": "" },
                { "n": "A", "v": "A" },
                { "n": "C", "v": "C" },
                { "n": "E", "v": "E" },
                { "n": "F", "v": "F" },
                { "n": "G", "v": "G" },
                { "n": "H", "v": "H" },
                { "n": "I", "v": "I" },
                { "n": "J", "v": "J" },
                { "n": "K", "v": "K" },
                { "n": "L", "v": "L" },
                { "n": "M", "v": "M" },
                { "n": "N", "v": "N" },
                { "n": "O", "v": "O" },
                { "n": "P", "v": "P" },
                { "n": "Q", "v": "Q" },
                { "n": "R", "v": "R" },
                { "n": "S", "v": "S" },
                { "n": "T", "v": "T" },
                { "n": "U", "v": "U" },
                { "n": "V", "v": "V" },
                { "n": "W", "v": "W" },
                { "n": "X", "v": "X" },
                { "n": "Y", "v": "Y" },
                { "n": "Z", "v": "Z" },
                { "n": "0‑9", "v": "0‑9" }
            ]
        }
    ],
    "栏目大全": [
        {
            "key": "cid",
            "name": "频道",
            "value": [
                { "n": "全部", "v": "" },
                { "n": "CCTV‑1综合", "v": "EPGC1386744804340101" },
                { "n": "CCTV‑2财经", "v": "EPGC1386744804340102" },
                { "n": "CCTV‑3综艺", "v": "EPGC1386744804340103" },
                { "n": "CCTV‑4中文国际", "v": "EPGC1386744804340104" },
                { "n": "CCTV‑5体育", "v": "EPGC1386744804340107" },
                { "n": "CCTV‑6电影", "v": "EPGC1386744804340108" },
                { "n": "CCTV‑7国防军事", "v": "EPGC1386744804340109" },
                { "n": "CCTV‑8电视剧", "v": "EPGC1386744804340110" },
                { "n": "CCTV‑9纪录", "v": "EPGC1386744804340112" },
                { "n": "CCTV‑10科教", "v": "EPGC1386744804340113" },
                { "n": "CCTV‑11戏曲", "v": "EPGC1386744804340114" },
                { "n": "CCTV‑12社会与法", "v": "EPGC1386744804340115" },
                { "n": "CCTV‑13新闻", "v": "EPGC1386744804340116" },
                { "n": "CCTV‑14少儿", "v": "EPGC1386744804340117" },
                { "n": "CCTV‑15音乐", "v": "EPGC1386744804340118" },
                { "n": "CCTV‑16奥林匹克", "v": "EPGC1634630207058998" },
                { "n": "CCTV‑17农业农村", "v": "EPGC1563932742616872" },
                { "n": "CCTV‑5+体育赛事", "v": "EPGC1468294755566101" }
            ]
        },
        {
            "key": "fc",
            "name": "分类",
            "value": [
                { "n": "全部", "v": "" },
                { "n": "新闻", "v": "新闻" },
                { "n": "体育", "v": "体育" },
                { "n": "综艺", "v": "综艺" },
                { "n": "健康", "v": "健康" },
                { "n": "生活", "v": "生活" },
                { "n": "科教", "v": "科教" },
                { "n": "经济", "v": "经济" },
                { "n": "农业", "v": "农业" },
                { "n": "法治", "v": "法治" },
                { "n": "军事", "v": "军事" },
                { "n": "少儿", "v": "少儿" },
                { "n": "动画", "v": "动画" },
                { "n": "纪实", "v": "纪实" },
                { "n": "戏曲", "v": "戏曲" },
                { "n": "音乐", "v": "音乐" },
                { "n": "影视", "v": "影视" }
            ]
        },
        {
            "key": "fl",
            "name": "字母",
            "value": [
                { "n": "全部", "v": "" },
                { "n": "A", "v": "A" },
                { "n": "B", "v": "B" },
                { "n": "C", "v": "C" },
                { "n": "D", "v": "D" },
                { "n": "E", "v": "E" },
                { "n": "F", "v": "F" },
                { "n": "G", "v": "G" },
                { "n": "H", "v": "H" },
                { "n": "I", "v": "I" },
                { "n": "J", "v": "J" },
                { "n": "K", "v": "K" },
                { "n": "L", "v": "L" },
                { "n": "M", "v": "M" },
                { "n": "N", "v": "N" },
                { "n": "O", "v": "O" },
                { "n": "P", "v": "P" },
                { "n": "Q", "v": "Q" },
                { "n": "R", "v": "R" },
                { "n": "S", "v": "S" },
                { "n": "T", "v": "T" },
                { "n": "U", "v": "U" },
                { "n": "V", "v": "V" },
                { "n": "W", "v": "W" },
                { "n": "X", "v": "X" },
                { "n": "Y", "v": "Y" },
                { "n": "Z", "v": "Z" }
            ]
        },
        {
            "key": "year",
            "name": "年份",
            "value": [
                { "n": "全部", "v": "" },
                { "n": "2022", "v": "2022" },
                { "n": "2021", "v": "2021" },
                { "n": "2020", "v": "2020" },
                { "n": "2019", "v": "2019" },
                { "n": "2018", "v": "2018" },
                { "n": "2017", "v": "2017" },
                { "n": "2016", "v": "2016" },
                { "n": "2015", "v": "2015" },
                { "n": "2014", "v": "2014" },
                { "n": "2013", "v": "2013" },
                { "n": "2012", "v": "2012" },
                { "n": "2011", "v": "2011" },
                { "n": "2010", "v": "2010" },
                { "n": "2009", "v": "2009" },
                { "n": "2008", "v": "2008" },
                { "n": "2007", "v": "2007" },
                { "n": "2006", "v": "2006" },
                { "n": "2005", "v": "2005" },
                { "n": "2004", "v": "2004" },
                { "n": "2003", "v": "2003" },
                { "n": "2002", "v": "2002" },
                { "n": "2001", "v": "2001" },
                { "n": "2000", "v": "2000" }
            ]
        },
        {
            "key": "month",
            "name": "月份",
            "value": [
                { "n": "全部", "v": "" },
                { "n": "12", "v": "12" },
                { "n": "11", "v": "11" },
                { "n": "10", "v": "10" },
                { "n": "09", "v": "09" },
                { "n": "08", "v": "08" },
                { "n": "07", "v": "07" },
                { "n": "06", "v": "06" },
                { "n": "05", "v": "05" },
                { "n": "04", "v": "04" },
                { "n": "03", "v": "03" },
                { "n": "02", "v": "02" },
                { "n": "01", "v": "01" }
            ]
        }
    ]
};

const DEFAULT_CLASSES = [
    { type_id: "栏目大全", type_name: "栏目大全", land: 1, ratio: 1.33 },
    { type_id: "电视剧", type_name: "电视剧", land: 1, ratio: 1.33 },
    { type_id: "动画片", type_name: "动画片", land: 1, ratio: 1.33 },
    { type_id: "纪录片", type_name: "纪录片", land: 1, ratio: 1.33 },
    { type_id: "特别节目", type_name: "特别节目", land: 1, ratio: 1.33 }
];

let extendObj = { classes: [...DEFAULT_CLASSES], filter: CONFIG_FILTER };

// ===================== 工具函数（原样复制123ttv.js） =====================
async function request(url, optHeaders = {}) {
    try {
        const headers = Object.assign({}, DEFAULT_HEADERS, optHeaders);
        const res = await req(url, {
            method: "GET",
            headers: headers,
            timeout: 15000
        });
        return res?.content ?? "";
    } catch (e) {
        console.error("request error:", url, e?.message);
        return "";
    }
}

function b64EncodeUtf8(str) {
    return Crypto.enc.Base64.stringify(Crypto.enc.Utf8.parse(str || ""));
}

function b64DecodeUtf8(b64) {
    try {
        return Crypto.enc.Utf8.stringify(Crypto.enc.Base64.parse(b64 || ""));
    } catch (e) {
        return "";
    }
}

function safeJson(str) {
    try {
        if (!str) return null;
        return JSON.parse(str);
    } catch (e) {
        return null;
    }
}

function fixPicUrl(url) {
    if (!url) return '';
    url = url.trim();
    if (url.startsWith('http')) return url;
    if (url.startsWith('//')) return `https:${url}`;
    return `https://${url}`;
}

// ===================== 业务辅助 =====================
/** 移除html标签 */
function removeHtml(txt) {
    if (!txt) return "";
    txt = txt.replace(/<[^>]+>/g, "");
    txt = txt.replace(/&nbsp;/g, " ");
    return txt.trim();
}

/** 解析列表，普通专辑接口 */
function parseVideoList(jsonList, tid) {
    const list = [];
    if (!Array.isArray(jsonList)) return list;
    for (const vod of jsonList) {
        const url = vod.url || "";
        const title = vod.title || "";
        const img = vod.image || "";
        const id = vod.id || "";
        const brief = vod.brief || "";
        const year = vod.year || "";
        const actors = vod.actors || "";
        if (!url) continue;
        // 复合vod_id tid###title###url###img###id###year###actors###brief
        const vodId = `${tid}###${title}###${url}###${img}###${id}###${year}###${actors}###${brief}`;
        list.push({
            vod_id: vodId,
            vod_name: title,
            vod_pic: fixPicUrl(img),
            vod_remarks: ""
        });
    }
    return list;
}

/** 解析栏目大全jsonp返回，裁剪cb=ko(...) */
function parseColumnJsonp(rawText) {
    const start = rawText.indexOf('(');
    const end = rawText.lastIndexOf(')');
    if (start < 0 || end <= start) return null;
    const inner = rawText.slice(start + 1, end);
    return safeJson(inner);
}

/** 解析栏目大全docs数组 */
function parseColumnList(jsonObj, tid) {
    const list = [];
    const data = jsonObj?.response;
    if (!data || !Array.isArray(data.docs)) return list;
    for (const vod of data.docs) {
        const id = vod.lastVIDE?.videoSharedCode || "";
        const title = vod.column_name || "";
        const url = vod.column_website || "";
        const img = vod.column_logo || "";
        const year = vod.column_playdate || "";
        const brief = vod.column_brief || "";
        if (!url) continue;
        const vodId = `${tid}###${title}###${url}###${img}###${id}###${year}######${brief}`;
        list.push({
            vod_id: vodId,
            vod_name: title,
            vod_pic: fixPicUrl(img),
            vod_remarks: ""
        });
    }
    return list;
}

/** 解析搜索接口返回 */
function parseSearchList(jsonObj) {
    const list = [];
    const jsonList = jsonObj?.list;
    if (!Array.isArray(jsonList)) return list;
    for (const vod of jsonList) {
        const url = vod.urllink || "";
        const title = removeHtml(vod.title || "");
        const img = vod.imglink || "";
        const id = vod.id || "";
        const brief = vod.channel || "";
        const year = vod.uploadtime || "";
        if (!url) continue;
        const vodId = `搜索###${title}###${url}###${img}###${id}###${year}######${brief}`;
        list.push({
            vod_id: vodId,
            vod_name: title,
            vod_pic: fixPicUrl(img),
            vod_remarks: year || ""
        });
    }
    return list;
}

/** 组装集数组 name$guid */
function buildEpisodeList(jsonList) {
    const eps = [];
    if (!Array.isArray(jsonList)) return eps;
    for (const item of jsonList) {
        const g = item.guid || "";
        const t = item.title || "";
        if (!g) continue;
        eps.push(`${t}$${g}`);
    }
    return eps;
}

// ===================== CAT标准接口 =====================
async function init(cfg) {
    try {
        siteKey = cfg.skey;
        siteType = cfg.stype;
        extendObj = { classes: [...DEFAULT_CLASSES], filter: CONFIG_FILTER };
    } catch (e) {
        console.error("init error", e.message);
        extendObj = { classes: [...DEFAULT_CLASSES], filter: CONFIG_FILTER };
    }
}

function home(filter) {
    try {
        return JSON.stringify({
            class: extendObj.classes || DEFAULT_CLASSES,
            filters: extendObj.filter || CONFIG_FILTER
        });
    } catch (e) {
        return JSON.stringify({ class: DEFAULT_CLASSES, filters: {} });
    }
}

async function homeVod() {
    // py homeVideoContent返回空
    return JSON.stringify({ list: [] });
}

async function category(tid, pg, filter, ext) {
    pg = Number(pg) || 1;
    try {
        ext = typeof ext === "string" ? safeJson(ext) : ext || {};
        let url = "";
        if (tid === "动画片") {
            const area = ext["datadq‑area"] ?? "";
            const letter = ext["dataszm‑letter"] ?? "";
            const datafl = ext["datafl‑sc"] ?? "";
            url = `https://api.cntv.cn/list/getVideoAlbumList?channelid=CHAL1460955899450127&area=${encodeURIComponent(area)}&sc=${encodeURIComponent(datafl)}&fc=${encodeURIComponent(tid)}&letter=${encodeURIComponent(letter)}&p=${pg}&n=24&serviceId=tvcctv&topv=1&t=json`;
        } else if (tid === "纪录片") {
            const channel = ext["datapd‑channel"] ?? "";
            const datafl = ext["datafl‑sc"] ?? "";
            const year = ext["datanf‑year"] ?? "";
            const letter = ext["dataszm‑letter"] ?? "";
            url = `https://api.cntv.cn/list/getVideoAlbumList?channelid=CHAL1460955924871139&fc=${encodeURIComponent(tid)}&channel=${encodeURIComponent(channel)}&sc=${encodeURIComponent(datafl)}&year=${encodeURIComponent(year)}&letter=${encodeURIComponent(letter)}&p=${pg}&n=24&serviceId=tvcctv&topv=1&t=json`;
        } else if (tid === "电视剧") {
            const datafl = ext["datafl‑sc"] ?? "";
            const year = ext["datanf‑year"] ?? "";
            const letter = ext["dataszm‑letter"] ?? "";
            url = `https://api.cntv.cn/list/getVideoAlbumList?channelid=CHAL1460955853485115&area=&sc=${encodeURIComponent(datafl)}&fc=${encodeURIComponent(tid)}&year=${encodeURIComponent(year)}&letter=${encodeURIComponent(letter)}&p=${pg}&n=24&serviceId=tvcctv&topv=1&t=json`;
        } else if (tid === "特别节目") {
            const channel = ext["datapd‑channel"] ?? "";
            const datafl = ext["datafl‑sc"] ?? "";
            const letter = ext["dataszm‑letter"] ?? "";
            url = `https://api.cntv.cn/list/getVideoAlbumList?channelid=CHAL1460955953877151&channel=${encodeURIComponent(channel)}&sc=${encodeURIComponent(datafl)}&fc=${encodeURIComponent(tid)}&bigday=&letter=${encodeURIComponent(letter)}&p=${pg}&n=24&serviceId=tvcctv&topv=1&t=json`;
        } else if (tid === "栏目大全") {
            const cid = ext["cid"] ?? "";
            const fc = ext["fc"] ?? "";
            const fl = ext["fl"] ?? "";
            url = `https://api.cntv.cn/lanmu/columnSearch?&fl=${encodeURIComponent(fl)}&fc=${encodeURIComponent(fc)}&cid=${encodeURIComponent(cid)}&p=${pg}&n=20&serviceId=tvcctv&t=json&cb=ko`;
        } else {
            return JSON.stringify({ list: [], page: pg, pagecount: 0, limit: 90, total: 0 });
        }
        const respText = await request(url);
        let list = [];
        if (tid === "栏目大全") {
            const jsonObj = parseColumnJsonp(respText);
            list = parseColumnList(jsonObj, tid);
        } else {
            const jsonObj = safeJson(respText);
            const jsonList = jsonObj?.data?.list || [];
            list = parseVideoList(jsonList, tid);
        }
        const pagecount = list.length >= 20 ? 9999 : pg;
        return JSON.stringify({
            list,
            page: pg,
            pagecount: pagecount,
            limit: 90,
            total: 999999
        });
    } catch (e) {
        console.error("category error", e.message);
        return JSON.stringify({ list: [], page: pg, pagecount: 0, limit: 90, total: 0 });
    }
}

async function detail(vodId) {
    try {
        const parts = String(vodId).split('###');
        if (parts.length < 8) return JSON.stringify({ list: [] });
        const tid = parts[0];
        const title = parts[1];
        const lastVideo = parts[2];
        const logo = parts[3];
        const id = parts[4];
        const vod_year = parts[5];
        const actors = parts[6];
        const brief = parts[7];
        let fromId = "CCTV";
        let videoList = [];
        if (tid === "栏目大全") {
            const infoUrl = `https://api.cntv.cn/video/videoinfoByGuid?guid=${encodeURIComponent(id)}&serviceId=tvcctv`;
            const infoTxt = await request(infoUrl);
            const infoJson = safeJson(infoTxt);
            const topicId = infoJson?.ctid || "";
            const listUrl = `https://api.cntv.cn/NewVideo/getVideoListByColumn?id=${encodeURIComponent(topicId)}&d=&p=1&n=100&sort=desc&mode=0&serviceId=tvcctv&t=json`;
            const listTxt = await request(listUrl);
            const listJson = safeJson(listTxt);
            videoList = buildEpisodeList(listJson?.data?.list || []);
        } else if (tid === "搜索") {
            fromId = "中央台";
            videoList = [`${title}$${lastVideo}`];
        } else {
            const listUrl = `https://api.cntv.cn/NewVideo/getVideoListByAlbumIdNew?id=${encodeURIComponent(id)}&serviceId=tvcctv&p=1&n=100&mode=0&pub=1`;
            const listTxt = await request(listUrl);
            const listJson = safeJson(listTxt);
            videoList = buildEpisodeList(listJson?.data?.list || []);
        }
        if (videoList.length === 0) {
            return JSON.stringify({ list: [] });
        }
        const vod = {
            vod_id: vodId,
            vod_name: title,
            vod_pic: fixPicUrl(logo),
            type_name: tid,
            vod_year: vod_year,
            vod_area: "",
            vod_remarks: "",
            vod_actor: actors,
            vod_director: "",
            vod_content: brief,
            vod_play_from: fromId,
            vod_play_url: videoList.join("#")
        };
        return JSON.stringify({ list: [vod] });
    } catch (e) {
        console.error("detail error", e.message);
        return JSON.stringify({ list: [] });
    }
}

async function search(key, quick, pg) {
    pg = Number(pg) || 1;
    try {
        const kw = encodeURIComponent(String(key || "").trim());
        const url = `https://search.cctv.com/ifsearch.php?page=${pg}&qtext=${kw}&sort=relevance&pageSize=20&type=video&vtime=-1&datepid=1&channel=&pageflag=0&qtext_str=${kw}`;
        const respText = await request(url);
        const jsonObj = safeJson(respText);
        const list = parseSearchList(jsonObj);
        return JSON.stringify({
            list,
            page: pg,
            pagecount: 999,
            limit: 20,
            total: 99999,
            land: 1,
            ratio: 1.33
        });
    } catch (e) {
        console.error("search error", e.message);
        return JSON.stringify({ list: [], page: pg, pagecount: 0, land: 1, ratio: 1.33 });
    }
}

async function play(flag, id, flags) {
    try {
        const guid = b64DecodeUtf8
