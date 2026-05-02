// ==UserScript==
// @name         NETFLAV
// @namespace    gmspider
// @version      2025.10.25
// @description  NETFLAV GMSpider
// @author       Luomo
// @match        https://netflav.com/*
// @require      https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.slim.min.js
// @grant        unsafeWindow
// ==/UserScript==
console.log(JSON.stringify(GM_info));
if (typeof unsafeWindow.gmSpiderRunning === "undefined") {
    unsafeWindow.gmSpiderRunning = true;
    (function () {
        const GMSpiderArgs = {};
        if (typeof GmSpiderInject !== 'undefined') {
            let args = JSON.parse(GmSpiderInject.GetSpiderArgs());
            GMSpiderArgs.fName = args.shift();
            GMSpiderArgs.fArgs = args;
        } else {
            GMSpiderArgs.fName = "homeContent";
            GMSpiderArgs.fArgs = [];
        }
        Object.freeze(GMSpiderArgs);
        let _gotHookFunction = function () {
            console.log("_gotHookFunction hook failed");
        };
        let itemCount = 0;
        let gotItems = [];
        Object.defineProperty(Object.prototype, 'componentDidMount', {
            configurable: true,
            get: function () {
                let item = this?.props?.item;
                if (typeof item?.videoId !== "undefined") {
                    gotItems.push(item);
                    if (gotItems.length === itemCount) {
                        _gotHookFunction(gotItems);
                    }
                }
                return true;
            },
            set: function (value) {
                return true;
            },
        });

        const GmSpider = (function () {
            function getVideos(key, result) {
                const formatData = JSON.parse($("#__NEXT_DATA__").html());
                let vods = [];
                formatData.props.initialState[key].docs?.forEach(function (media) {
                    vods.push({
                        vod_id: media.videoId,
                        vod_name: media.title,
                        vod_pic: media.preview.length > 0 ? media.preview : media.preview_hp,
                        vod_remarks: "👁️" + media.views,
                    })
                });
                if (typeof result == "object") {
                    result.list = vods;
                    result.pagecount = formatData.props.initialState[key].pages;
                }
                return vods;
            }

            return {
                homeContent: function (filter) {
                    let result = {
                        class: [
                            {type_id: "trending?", type_name: "最受欢迎"},
                            {type_id: "browse?", type_name: "年度精选"},
                            {type_id: "chinese-sub?", type_name: "中文字幕"},
                            {type_id: "all?genre=國產AV", type_name: "国产AV"},
                            {type_id: "censored?", type_name: "有码影片"},
                            {type_id: "uncensored?", type_name: "无码影片"},
                            {type_id: "genre?", type_name: "类别"}],
                        filters: {
                            "trending?": [{
                                key: "range", name: "时间", value: [{
                                    n: "全部", v: ""
                                }, {
                                    n: "本月", v: "&range=month&value=1"
                                }, {
                                    n: "上个月", v: "&range=month&value=2"
                                }, {
                                    n: "2个月前", v: "&range=month&value=3"
                                }, {
                                    n: "3个月前", v: "&range=month&value=4"
                                }, {
                                    n: "4个月前", v: "&range=month&value=5"
                                }, {
                                    n: "5个月前", v: "&range=month&value=6"
                                }]
                            }]
                        }, list: []
                    };
                    result.list = getVideos("trending");
                    return result;
                }, categoryContent: function (tid, pg, filter, extend) {
                    console.log(tid, pg, filter, extend);
                    let result = {
                        list: [], pagecount: 1
                    };
                    if (tid === "genre?") {
                        $(".genre_item_container .genre_item").each(function () {
                            result.list.push({
                                vod_id: $(this).attr("href").substring(1),
                                vod_name: $(this).find("div").text(),
                                vod_tag: "folder",
                                style: {
                                    "type": "rect", "ratio": 1
                                }
                            })
                        })
                    } else if (tid === "browse?") {
                        result.list.push(
                            {
                                vod_id: "2024?", vod_name: "2024年度精选", vod_remarks: "年度精选", vod_tag: "folder"
                            }, {
                                vod_id: "2023?", vod_name: "2023年度精选", vod_remarks: "年度精选", vod_tag: "folder"
                            }, {
                                vod_id: "2022?", vod_name: "2022年度精选", vod_remarks: "年度精选", vod_tag: "folder"
                            }, {
                                vod_id: "2021?", vod_name: "2021年度精选", vod_remarks: "年度精选", vod_tag: "folder"
                            }, {
                                vod_id: "2020?", vod_name: "2020年度精选", vod_remarks: "年度精选", vod_tag: "folder"
                            }, {
                                vod_id: "2019?", vod_name: "2019年度精选", vod_remarks: "年度精选", vod_tag: "folder"
                            });
                        const formatData = JSON.parse($("#__NEXT_DATA__").html());
                        formatData.props.initialState.randomShareList.docs.forEach(function (share) {
                            result.list.push({
                                vod_id: `share?c=${share.shareCode}`,
                                vod_name: share.shareCode,
                                vod_remarks: "片单",
                                vod_pic: share.srcs[0],
                                vod_tag: "folder"
                            })
                        });
                    } else {
                        const formatData = JSON.parse($("#__NEXT_DATA__").html());
                        const key = tid.split("?").at(0).split("-").at(0);
                        if ($.isNumeric(key)) {
                            $(".playlist_grid_full a").each(function () {
                                result.list.push({
                                    vod_id: $(this).attr("href").substring(1),
                                    vod_name: $(this).find(".playlist_head div").eq(1).text().trim(),
                                    vod_remarks: "片单",
                                    vod_pic: $(this).find("img").eq(1).attr("src"),
                                    vod_tag: "folder"
                                })
                            });
                            console.log(gotItems.length, $(".video_grid_container .grid_0_cell").length);
                            if (gotItems.length === $(".video_grid_container .grid_0_cell").length) {
                                gotItems.forEach(function (media) {
                                    result.list.push({
                                        vod_id: media.videoId,
                                        vod_name: media.title,
                                        vod_pic: media.preview.length > 0 ? media.preview : media.preview_hp,
                                        vod_remarks: media.duration,
                                    })
                                })
                            } else {
                                return new Promise(function (resolve) {
                                    _gotHookFunction = resolve;
                                    itemCount = $(".video_grid_container .grid_0_cell").length;
                                }).then((items) => {
                                    items.forEach(function (media) {
                                        result.list.push({
                                            vod_id: media.videoId,
                                            vod_name: media.title,
                                            vod_pic: media.preview.length > 0 ? media.preview : media.preview_hp,
                                            vod_remarks: media.duration,
                                        })
                                    })
                                    return result
                                });
                            }
                        } else {
                            getVideos(key, result);
                        }
                    }
                    return result;
                },
                detailContent: function (ids) {
                    const formatData = JSON.parse($("#__NEXT_DATA__").html());
                    const video = formatData.props.initialState.video.data;
                    let vodActor = [], tags = [];
                    video?.actors.forEach(function (actor) {
                        if (actor.startsWith("zh:")) {
                            const actress = actor.substring(3);
                            vodActor.push(`[a=cr:{"id":"all?actress=${actress}","name":"${actress}"}/]${actress}[/a]`);
                        }
                    })
                    video?.tags.forEach(function (tag) {
                        if (tag.startsWith("zh:")) {
                            const genre = tag.substring(3);
                            tags.push(`[a=cr:{"id":"all?genre=${genre}","name":"${genre}"}/]${genre}[/a]`);
                        }
                    })
                    let vodPlayData = [];
                    video?.srcs.forEach(function (src, index) {
                        vodPlayData.push({
                            from: `播放源${index + 1}`,
                            media: [{
                                name: video?.category ?? video.code,
                                type: "webview",
                                ext: {
                                    replace: {
                                        vod_id: video.videoId,
                                        src: index + 1
                                    }
                                }
                            }]
                        })
                    })
                    return {
                        vod_id: video.videoId,
                        vod_name: video.code,
                        vod_pic: video.preview_hp,
                        vod_year: (video.videoDate && typeof video.videoDate.substring === 'function') ? video.videoDate.substring(0, 10) : '',
                        vod_remarks: tags.join(" "),
                        vod_actor: vodActor.join(" "),
                        vod_content: video.description,
                        vod_play_data: vodPlayData
                    };
                },
                playerContent: function (flag, id, vipFlags) {
                    let link = window.location.hash.split("#").at(1);
                    document.querySelector(`.videoiframe_source_container .videoiframe_source_tag:nth-child(${link})`).dispatchEvent(new Event("click"));
                    return {
                        type: "match"
                    };
                },
                searchContent: function (key, quick, pg) {
                    const result = {
                        list: [], pagecount: 1
                    };
                    getVideos("search", result);
                    return result;
                }
            };
        })();
        $(document).ready(async function () {
            let result = await GmSpider[GMSpiderArgs.fName](...GMSpiderArgs.fArgs);
            console.log(result);
            if (typeof GmSpiderInject !== 'undefined') {
                GmSpiderInject.SetSpiderResult(JSON.stringify(result));
            }
        });
    })();
} else {
    console.log("gmSpider run again");
}
