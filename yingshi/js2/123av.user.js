// ==UserScript==
// @name         123av
// @namespace    gmspider
// @version      2024.12.03
// @description  123av GMSpider
// @author       Luomo
// @match        https://*.123av.com/*
// @match        https://123av.com/*
// @require      https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.slim.min.js
// @grant        unsafeWindow
// ==/UserScript==
console.log(JSON.stringify(GM_info));
(function () {
    const GMSpiderArgs = {};
    if (typeof GmSpiderInject !== 'undefined') {
        let args = JSON.parse(GmSpiderInject.GetSpiderArgs());
        GMSpiderArgs.fName = args.shift();
        GMSpiderArgs.fArgs = args;
    } else {
        GMSpiderArgs.fName = "homeContent";
        GMSpiderArgs.fArgs = ["tags"];
    }
    Object.freeze(GMSpiderArgs);
    const GmSpider = (function () {
        const filter = {
            key: "filter",
            name: "过滤",
            value: [{
                n: "全部",
                v: ""
            }, {
                n: "单个女演员",
                v: "&filter=single_actress"
            }]
        };
        const filterWithoutSort = [
            filter
        ];
        const defaultFilter = [
            filter,
            {
                key: "sort",
                name: "排序方式",
                value: [
                    {
                        n: "最近更新",
                        v: "&sort=recent_update"
                    },
                    {
                        n: "发布时间",
                        v: "&sort=release_date"
                    },
                    {
                        n: "动态",
                        v: "&sort=trending"
                    },
                    {
                        n: "今日最好",
                        v: "&sort=most_viewed_today"
                    },
                    {
                        n: "本周最好",
                        v: "&sort=most_viewed_week"
                    },
                    {
                        n: "本月最好",
                        v: "&sort=most_viewed_month"
                    },
                    {
                        n: "观看次数最多",
                        v: "&sort=most_viewed"
                    },
                    {
                        n: "最喜欢",
                        v: "&sort=most_favourited"
                    }
                ]
            }];

        function pageList(select) {
            let itemList = [];
            $(select).each(function (i) {
                if ($(this).find("a").attr("href") != "javascript:void(0);") {
                    itemList.push({
                        vod_id: $(this).find("a").attr("href").split("/zh/").at(-1),
                        vod_name: $(this).find(".detail a").text(),
                        vod_pic: $(this).find("img").data("src"),
                        vod_year: $(this).find(".duration").text()
                    })
                }
            });
            return itemList;
        }

        function formatDetail(detail, ...keys) {
            let format = "";
            for (let key of keys) {
                format += key in detail ? (Array.isArray(detail[key]) ? detail[key].join(" ") : detail[key]) : "";
            }
            return format;
        }


        return {
            homeContent: function () {
                let result = {
                    class: [
                        {type_id: "recent-update", type_name: "最近更新"},
                        {type_id: "trending", type_name: "热门"},
                        {type_id: "new-release", type_name: "全新上市"},
                        {type_id: "censored", type_name: "有码"},
                        {type_id: "uncensored", type_name: "无码"},
                        {type_id: "tags", type_name: "厂牌"},
                        {type_id: "genres", type_name: "类型"}
                    ],
                    filters: {
                        "recent-update": filterWithoutSort,
                        "trending": defaultFilter,
                        "new-release": filterWithoutSort,
                        "censored": defaultFilter,
                        "uncensored": defaultFilter,
                        "tags": defaultFilter,
                        "genres": defaultFilter
                    },
                    list: []
                };
                result.class.map(item => {
                    $("#nav a").each(function () {
                        if ($(this).attr("href").endsWith(item.type_id)) {
                            item.type_id = $(this).attr("href")
                            return false
                        }
                    });
                })
                let itemList = pageList(".box-item-list .box-item:not(.splide__slide)");
                result.list = itemList.filter((item, index) => {
                    return itemList.findIndex(i => i.vod_id === item.vod_id) === index
                });
                return result;
            },
            categoryContent: function (tid, pg, filter, extend) {
                console.log(tid, pg, filter, JSON.stringify(extend));
                let result = {
                    list: [],
                    page: pg,
                    pagecount: 0
                };
                if (tid === "tags") {
                    $("#nav ul li a").each(function () {
                        let tagHref = $(this).attr("href");
                        if (tagHref.includes("tags") && !tagHref.includes("http")) {
                            tagHref = tagHref.split("/");
                            result.list.push({
                                vod_id: tagHref.at(-2) + "/" + tagHref.at(-1),
                                vod_name: $(this).text().trim(),
                                vod_tag: "folder",
                                style: {
                                    "type": "rect",
                                    "ratio": 2
                                }
                            })
                        }
                    });
                    result.pagecount = 1;
                } else if (tid === "genres") {
                    $("#page-list .bl-item").each(function () {
                        result.list.push({
                            vod_id: $(this).find("a").attr("href"),
                            vod_name: $(this).find(".name").text(),
                            vod_remarks: $(this).find(".text-muted").text(),
                            vod_tag: "folder",
                            style: {
                                "type": "rect",
                                "ratio": 1
                            }
                        })
                    });
                    result.pagecount = 1;
                } else {
                    result.list = pageList("#page-list .box-item-list .box-item");
                    result.pagecount = Math.ceil(parseInt($("#page-list .section-title .text-muted").text().replace(",", "")) / 12);
                }
                return result;
            },
            detailContent: function (ids) {
                let detail = {};
                $("#details .detail-item div").each(function (item) {
                    const key = $(this).find("span:first").text().replace(":", "");
                    if ($(this).find("span:eq(1) a").length === 0) {
                        detail[key] = $(this).find("span:eq(1)").text().trim();
                    } else {
                        detail[key] = [];
                        $(this).find("span:eq(1) a").each(function () {
                            const id = $(this).attr("href");
                            const name = $(this).text();
                            detail[key].push(`[a=cr:{"id":"${id}","name":"${name}"}/]${name}[/a]`);
                        })
                    }
                });
                const vod = {
                    vod_id: ids[0],
                    vod_name: $(".favourite:first").data("code"),
                    vod_pic: $("#player").data("poster"),
                    vod_year: formatDetail(detail, "发布日期"),
                    vod_remarks: formatDetail(detail, "类型"),
                    vod_director: formatDetail(detail, "制作者", "标签"),
                    vod_actor: formatDetail(detail, "演员"),
                    vod_content: $(".justify-content-between.align-items-start h1").text().trim(),
                    vod_play_data: [{
                        from: "123AV",
                        media: [{
                            name: "720P",
                            type: "webview",
                            ext: {
                                replace: {
                                    vod_id: ids[0]
                                }
                            }
                        }]
                    }]
                };
                return {list: [vod]};
            },
            playerContent: function (flag, id, vipFlags) {
                return {
                    type: "match"
                };
            },
            searchContent: function (key, quick, pg) {
                const result = {
                    list: [],
                    page: pg,
                    pagecount: 0
                };
                result.list = pageList("#page-list .box-item-list .box-item");
                result.pagecount = Math.ceil(parseInt($("#page-list .section-title .text-muted").text().replace(",", "")) / 12);
                return result;
            }
        };
    })();
    $(document).ready(function () {
        let result = "";
        if ($("#cf-wrapper").length > 0) {
            console.log("源站不可用:" + $('title').text());
            GM_toastLong("源站不可用:" + $('title').text());
        } else if ($("#body .btn-primary").text() === "Click here to continue") {
            window.location = $("#body .btn-primary").attr("href");
        } else {
            result = GmSpider[GMSpiderArgs.fName](...GMSpiderArgs.fArgs);
        }
        console.log(JSON.stringify(result));
        if (typeof GmSpiderInject !== 'undefined') {
            GmSpiderInject.SetSpiderResult(JSON.stringify(result));
        }
    });
})();