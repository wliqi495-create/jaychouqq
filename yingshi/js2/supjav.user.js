// ==UserScript==
// @name         Supjav
// @namespace    gmspider
// @version      2025.11.12
// @description  Supjav GMSpider
// @author       Luomo
// @match        https://supjav.com/*
// @require      https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.slim.min.js
// @grant        GM_cookie
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
        GMSpiderArgs.fArgs = ["tag"];
    }
    Object.freeze(GMSpiderArgs);
    const GmSpider = (function () {
        function listVideos() {
            let itemList = [];
            $(".post").each(function () {
                const url = new URL($(this).find(".img").attr("href"));
                itemList.push({
                    vod_id: url.pathname.split('/').at(2),
                    vod_name: $(this).find(".img").attr("title"),
                    vod_pic: formatImgUrl($(this).find("img").data("original")),
                    vod_remarks: $(this).find(".date").text(),
                    vod_year: $(this).find(".meta").children().remove().end().text()
                })
            });
            return itemList;
        }

        let cf_clearance = null;

        function formatImgUrl(url) {
            if (cf_clearance === null) {
                GM_cookie.list({name: "cf_clearance"}, function (cookies, error) {
                    if (!error && cookies.length > 0) {
                        cf_clearance = cookies[0].value;
                        localStorage.setItem("cf_clearance", cf_clearance);
                    } else {
                        let cache_cf_clearance = localStorage.getItem("cf_clearance");
                        if (typeof cache_cf_clearance !== "undefined" && cache_cf_clearance !== null && cache_cf_clearance.length > 0) {
                            cf_clearance = cache_cf_clearance;
                        }
                    }
                });
            }
            if (cf_clearance !== null) {
                url = url + "@User-Agent=" + window.navigator.userAgent + "@Cookie=cf_clearance=" + cf_clearance;
            }
            return url;
        }

        return {
            homeContent: function (filter) {
                const defaultFilter = [{
                    key: "sort",
                    name: "排序",
                    value: [
                        {
                            n: "观看数",
                            v: "views"
                        },
                        {
                            n: "更新时间",
                            v: ""
                        }
                    ]
                }];
                let result = {
                    class: [
                        {type_id: "popular", type_name: "热门"},
                        {type_id: "category/censored-jav", type_name: "有码"},
                        {type_id: "category/uncensored-jav", type_name: "无码"},
                        {type_id: "category/amateur", type_name: "素人"},
                        {type_id: "category/chinese-subtitles", type_name: "中文字幕"},
                        {type_id: "category/reducing-mosaic", type_name: "无码破解"},
                        {type_id: "category/english-subtitles", type_name: "英文字幕"},
                        {type_id: "tag", type_name: "类别"},
                    ],
                    filters: {
                        popular: [{
                            key: "sort",
                            name: "时间",
                            value: [
                                {
                                    n: "本月热门",
                                    v: "month"
                                },
                                {
                                    n: "本周热门",
                                    v: "week"
                                },
                                {
                                    n: "今日热门",
                                    v: ""
                                }
                            ]
                        }]
                    },
                    list: []
                };
                result.class.forEach((item) => {
                    if (typeof result.filters[item.type_id] === "undefined") {
                        result.filters[item.type_id] = defaultFilter;
                    }
                })
                result.list = listVideos()
                return result;
            },
            categoryContent: function (tid, pg, filter, extend) {
                let result = {
                    list: [],
                    pagecount: 1
                };
                if (tid === "tag") {
                    $(".categorys .child").each(function () {
                        const url = new URL($(this).find("a").attr("href")).pathname.split('/');
                        const text = $(this).text().trim().split("(")
                        result.list.push({
                            vod_id: url[2] + "/" + url[3],
                            vod_name: text[0],
                            vod_remarks: parseInt(text[1]) + " 部影片",
                            vod_tag: "folder",
                            style: {
                                "type": "rect",
                                "ratio": 1
                            }
                        })
                    });
                    result.pagecount = $(".pagination li").not(".next-page").last().text().trim();
                } else {
                    if ($(".pagination li").length > 0) {
                        result.pagecount = $(".pagination li").not(".next-page").last().text().trim();
                    }
                    result.list = listVideos();
                }
                return result;
            },
            detailContent: function (ids) {
                $("#vserver").click();
                let vodActor = [], tags = [];
                $(".post-meta .cats a").each(function () {
                    const id = new URL($(this).attr("href")).pathname.replace("/zh/", "");
                    const name = $(this).text().trim();
                    vodActor.unshift(`[a=cr:{"id":"${id}","name":"${name}"}/]${name}[/a]`);
                });
                $(".post-meta .tags a").each(function () {
                    const id = new URL($(this).attr("href")).pathname.replace("/zh/", "");
                    const name = $(this).text().trim();
                    tags.push(`[a=cr:{"id":"${id}","name":"${name}"}/]#${name}[/a]`);
                });
                let vodContent = $(".post-meta .img").attr("alt").trim();
                let vodName = vodContent.replace("[无码破解]", '');
                let match = vodName.match(/^[\w|-]+/g);
                if (match) {
                    if (match[0].includes("-")) {
                        vodName = match[0];
                    } else {
                        match = vodContent.match(/^[\w]+\s[\w]+/g);
                        if (match) {
                            vodName = match[0].replace(" ", "-");
                        }
                    }
                }
                let vodPlayData = [];
                let btnServers;
                if ($(".video-wrap .cd-server").length > 0) {
                    btnServers = $(".video-wrap .cd-server:first .btn-server");
                } else {
                    btnServers = $(".video-wrap .btn-server");

                }
                btnServers.each(function (i) {
                    vodPlayData.push({
                        from: $(this).text().trim(),
                        media: [{
                            name: vodName,
                            type: "webview",
                            ext: {
                                replace: {
                                    pathname: ids[0],
                                    link: i
                                }
                            }
                        }]
                    });
                })
                const result = {
                    list: [{
                        vod_id: ids[0],
                        vod_name: vodName,
                        vod_pic: formatImgUrl($(".post-meta .img").attr("src")),
                        vod_actor: vodActor.join(" "),
                        vod_remarks: tags.join(" "),
                        vod_content: vodContent,
                        vod_play_data: vodPlayData
                    }]
                };
                return result
            },
            playerContent: function (flag, id, vipFlags) {
                const link = window.location.hash.split("#").at(1);
                document.querySelectorAll(`.video-wrap .btn-server`)[link].dispatchEvent(new Event("click"));
                return {
                    type: "match"
                };
            },
            searchContent: function (key, quick, pg) {
                const result = {
                    list: [],
                    pagecount: 1
                };
                result.list = listVideos();
                if ($(".pagination li").length > 0) {
                    result.pagecount = $(".pagination li").not(".next-page").last().text().trim();
                }
                return result;
            }
        };
    })();
    $(document).ready(function () {
        if ($(".loading-verifying").length > 0) {
            GmSpiderInject.ShowWebview();
        }
    });
    $(unsafeWindow).on("load", function () {
        const result = GmSpider[GMSpiderArgs.fName](...GMSpiderArgs.fArgs);
        console.log(result);
        if (typeof GmSpiderInject !== 'undefined') {
            GmSpiderInject.HideWebview();
            GmSpiderInject.SetSpiderResult(JSON.stringify(result));
        }
    });
})();

