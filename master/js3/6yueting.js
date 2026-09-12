const webSite = 'http://www.6yueting.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.95 Safari/537.36';

//console.log('运行脚本');
//homeContent();
//categoryContent("0",1,null);
//detailContent("/list/802f1082");
//playerContent("http://www.6yueting.com/play/24673fb2ad/1");
//searchContent("完美世界");

//获取首页分类
async function homeContent() {
  let backData = new RepVideo();
  let webUrl = webSite;
  try {
    let pro2 = await req(webUrl + "/ys/t0", {
      headers: {
        "User-Agent": UA,
      },
    });
    let proData2 = await pro2.text();
    const $2 = cheerio.load(proData2);
    let allClass = [];
    allClass.push({ type_id: "0", type_name: "全部分类" });
    $2(".category-list li").each((index, element) => {
      const $li = $2(element);
      const categoryId = $li.attr("data-type"); // 获取分类ID
      const categoryName = $li.find("a").text().trim(); // 获取分类名称
      // 将分类ID和分类名称存入数组
      let videoClass = new VideoClass();
      videoClass.type_id = categoryId;
      videoClass.type_name = categoryName;
      allClass.push(videoClass);
    });

    let pro = await req(webUrl, {
      headers: {
        "User-Agent": UA,
      },
    });
    let proData = await pro.text();
    const $ = cheerio.load(proData);
    let videos = [];
    $(".album-item").each((index, element) => {
      const $item = $(element);
      let vodPic = $item.find(".book-item-img img").attr("src");
      let vodUrl = $item.find(".book-item-name a").attr("href");
      let vodName = $item.find(".book-item-name a").text().trim();
      let remarks = $item.find(".book-item-status").text().replace('状态：', '').trim();
      let videoDet = new VideoList();
      videoDet.vod_id = vodUrl;
      videoDet.vod_pic = vodPic;
      videoDet.vod_name = vodName;
      videoDet.vod_remarks = remarks;
      videos.push(videoDet);
    });
    backData.list = videos;
    backData.class = allClass;
  } catch (error) {
    backData.msg = error.statusText;
  }
  console.log(JSON.stringify(backData));
  return JSON.stringify(backData);
}
//获取影视列表
async function categoryContent(tid, pg = 1, extend) {
  let backData = new RepVideo();
  try {
    let listUrl = `${webSite}/ys/t${tid}/o1/p${pg}`;
    let pro = await req(listUrl, {
      headers: {
        'User-Agent': UA,
      },
    });
    let proData = await pro.text();
    const $ = cheerio.load(proData);
    let books = [];
    $(".album-item").each((index, element) => {
      const $item = $(element);
      let vodPic = $item.find(".book-item-img img").attr("src");
      let vodUrl = $item.find(".book-item-name a").attr("href");
      let vodName = $item.find(".book-item-name a").text().trim();
      let remarks = $item.find(".book-item-status").text().replace('状态：', '').trim();
      let videoDet = new VideoList();
      videoDet.vod_id = vodUrl;
      videoDet.vod_pic = vodPic;
      videoDet.vod_name = vodName;
      videoDet.vod_remarks = remarks;
      books.push(videoDet);
    });
    backData.list = books;
  } catch (error) {
    console.error('Error in fetchData:', error);
    backData.msg = error.message || error.statusText || 'Unknown error';
  }
  console.log(JSON.stringify(backData));
  return JSON.stringify(backData);
}


//获取影视详情信息
async function detailContent(ids) {
  let backData = new RepVideo();
  let webUrl = webSite + ids;
  try {
    //await toast("正在获取详情页面...", 2);
    let pro = await req(webUrl, {
      headers: {
        "User-Agent": UA,
      },
    });
    let proData = await pro.text();
    const $ = cheerio.load(proData);
    let vod_content = $(".detail-text").text().replace(/\n/g, "").trim();
    let vod_pic = $(".book-item-img img").attr("src");
    let vod_name = $(".bread-book").text().trim();
    let vod_year = "";
    let vod_director = $(".book-item-info .author").text().trim();
    let vod_actor = $(".book-item-info .g-user").text().trim();
    let vod_area = "";
    let vod_remarks = $(".status-serial.status-end").text().trim() || $(".status-serial").text().trim();
    //如果vod_remarks为空
    //if (vod_remarks == "") {
    //  vod_remarks = $(".status-serial").text().trim();
    //}
    let vod_play_from = "播放列表";
    let vod_play_url = "";
    console.log(vod_remarks);
    const totalEpisodes = vod_remarks.split("|")[1].match(/\d+/)[0]; // 提取右边的数字
    // 生成指定格式的文本
    const baseUrl = webUrl.replace("list", "play").trim(); 
    for (let i = 1; i <= totalEpisodes; i++) {
      vod_play_url += `第${i}集$${baseUrl}/${i}`;
      if (i < totalEpisodes) {
        vod_play_url += "#";
      }
    }
    let detModel = new VideoDetail();
    let videos = [];
    detModel.vod_remarks = vod_remarks;
    detModel.vod_year = vod_year;
    detModel.vod_director = vod_director;
    detModel.vod_actor = vod_actor;
    detModel.vod_area = vod_area;
    detModel.vod_content = vod_content;
    detModel.vod_pic = vod_pic;
    detModel.vod_name = vod_name;
    detModel.vod_play_from = vod_play_from;
    detModel.vod_play_url = vod_play_url;
    detModel.vod_id = ids;
    videos.push(detModel);
    backData.list = videos;
  } catch (error) {
    console.error("Error in fetchData:", error);
    backData.msg = error.statusText;
  }
  //await toast(JSON.stringify(backData),5);
  //console.log(JSON.stringify(backData));
  return JSON.stringify(backData);
}



//解析获取播放地址
async function playerContent(vod_id) {
  const backData = new RepVideoPlayUrl();
  const headers = {'User-Agent': UA,'Referer': webSite+'/audio-iframe.php?come=100'};
  try {
    let pro = await req(webSite+'/audio-iframe.php?come=100', {
      headers: {
        "User-Agent": UA,
      },
    });
    let proData = await pro.text();
    const $ = cheerio.load(proData);
    const lalalala = $('.audio-iframe').attr('data-info').substring(0,5);
    const timestamp=(new Date).getTime();
    const U = lalalala + "FSKVKSKFKS";
    const code = vod_id.split('/')[4]; 
    const no = vod_id.split('/')[5]; 
    const sign=Crypto.MD5(timestamp + code + no + U).toString();
    let pro2 = await req(webSite+'/web/index/video_new?code='+code+'&no='+no+'&type=0&timestamp='+timestamp+'&sign='+sign, {
      headers: {
        "User-Agent": UA,
      },
    });
    let jsonData = await pro2.json();
    backData.url = jsonData.data.videoUrl;

  } catch (error) {
    console.error("Error in fetchData:", error);
    backData.msg = error.message || "Unknown error";
  }
    backData.playUrl = '';
    backData.parse = 1;
    backData.header = headersToString(headers);
    console.log(JSON.stringify(backData));
    return JSON.stringify(backData);
}



async function searchContent(keyword) {
  let backData = new RepVideo();
  let listUrl =
    webSite +
    "/search/index/search?content=" +
    encodeURIComponent(keyword) +
    "&type=1&pageNum=1&pageSize=20";

  try {
    let pro = await req(listUrl, {
      headers: {
        "User-Agent": UA,
      },
    });

    let proData = await pro.json();
    let books = [];
    proData.data.content.forEach((item) => {
      let vodPic = 'http://img.6yueting.com:20001/' + item.coverUrlLocal;
      let vodUrl = "/list/" + item.code;
      let vodName = item.name.replace(/<\/?span[^>]*>/g, "");
      let state = item.state === 2 ? "完结" : "更新到";
      let trackTotalCount = item.trackTotalCount || 0;
      let remarks = `${state} | ${trackTotalCount}集`;
      let videoDet = new VideoList();
      videoDet.vod_id = vodUrl;
      videoDet.vod_pic = vodPic;
      videoDet.vod_name = vodName;
      videoDet.vod_remarks = remarks;
      books.push(videoDet);
    });
    backData.list = books;
  } catch (error) {
    console.error("Error in fetchData:", error);
    backData.msg = error.message || "Unknown error";
  }
  console.log(JSON.stringify(backData));
  return JSON.stringify(backData);
}


