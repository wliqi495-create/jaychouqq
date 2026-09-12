const webSite = 'http://www.ychy.org';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.95 Safari/537.36';

//console.log('运行脚本');
//homeContent();
//categoryContent("52",1,null);
//detailContent("/book/16748.html");
//playerContent("/play/16748-0-2.html");
//searchContent("完美世界");

//获取首页分类
async function homeContent() {
  let backData = new RepVideo();
  let webUrl = webSite;
  try {
    backData.class = [
      { "type_id": 52, "type_name": "网络玄幻" },
      { "type_id": 45, "type_name": "盗墓探险" },
      { "type_id": 15, "type_name": "历史文学" },
      { "type_id": 16, "type_name": "人物传记" },
      { "type_id": 4, "type_name": "儿童读物" },
      { "type_id": 17, "type_name": "恐怖悬疑" },
      { "type_id": 13, "type_name": "都市言情" },
      { "type_id": 81, "type_name": "职场商战" },
      { "type_id": 12, "type_name": "传统武侠" },
      { "type_id": 7, "type_name": "相声戏曲" },
      { "type_id": 32, "type_name": "百家讲坛" },
      { "type_id": 3, "type_name": "评书" },
      { "type_id": 18, "type_name": "广播剧" },
      { "type_id": 41, "type_name": "有声文学" }
    ];
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
    let listUrl = `${webSite}/list/${tid}-${pg}.html`;
    let pro = await req(listUrl, {
      headers: {
        'User-Agent': UA,
      },
    });
    let proData = await pro.data();
    //console.log(proData);
    let gb2312Bytes = hexStringToByteArray(proData);
    let decodedData = iconv.decode(gb2312Bytes, 'GB2312');
    const $ = cheerio.load(decodedData);
    let books = [];
    $(".bx_channel_test").each((index, element) => {
      const $item = $(element);
      let vodPic = $item.find(".item2 a img").attr("src");
      let vodUrl = $item.find(".item2 a").attr("href");
      let vodName = $item.find(".bx_channel_testname").text().trim();
      let remarks = $item.find(".item2-txt").text().trim();
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
    await toast("读取分类失败："+backData.msg, 5);
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
    let proData = await pro.data();
    let gb2312Bytes = hexStringToByteArray(proData);
    let decodedData = iconv.decode(gb2312Bytes, 'GB2312');
    const $ = cheerio.load(decodedData);
    let vod_content = $("#BookIntro").text().trim();
    let vod_pic = $(".content_right img").attr("src");
    let vod_name = $(".content_title").text().trim();
    let vod_year = "";
    let vod_director = 文本_取中间(decodedData, '作者：', '</a>');
    if (vod_director) {
      vod_director = 移除html代码(vod_director);
    }
    let vod_actor = 文本_取中间(decodedData,'播音：','</a>');
    if (vod_actor) {
      vod_actor = 移除html代码(vod_actor);
    }
    let vod_area = "";
    let vod_remarks = 文本_取中间(decodedData,'状态:','&nbsp');
    let vod_play_from = "播放列表";

const result = [];
$('div.playlist ul li a').each((index, element) => {
  const title = $(element).attr('title'); 
  const href = $(element).attr('href');  
  result.push(`${title}$${href}`);  
});
let vod_play_url = result.join('#');
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
  console.log(JSON.stringify(backData));
  return JSON.stringify(backData);
}



//解析获取播放地址
async function playerContent(vod_id) {
  const backData = new RepVideoPlayUrl();
  const headers = {'User-Agent': UA,'Referer': webSite};
  try {
    console.log(webSite+vod_id);
    let pro = await req(webSite + vod_id, {
      headers: {
        "User-Agent": UA,
      },
    });
    let proData = await pro.data();
    let gb2312Bytes = hexStringToByteArray(proData);
    let decodedData = iconv.decode(gb2312Bytes, 'GB2312');
    const u = 文本_取中间(decodedData, 'var u =', '</script>');
    const [uData, ujishu, xm] = u.match(/\d+|[a-zA-Z]+/g);
    const m_id = u.match(/getVideoHit\('(\d+)'\)/)[1];
    console.log(`uData=${uData}&utype=${xm}&ujishu=${ujishu}&m_id=${m_id}`);
    console.log(webSite+'/inc/ys_wdmcsoft_key.asp');
    let pro2 = await req(webSite+'/inc/ys_wdmcsoft_key.asp', {
      method: 'POST',
      headers: {
        "X-Requested-With": 'XMLHttpRequest',
        "User-Agent": UA,
        "Origin": webSite,
        "Referer": webSite + vod_id,
        "Content-Type": 'application/x-www-form-urlencoded; charset=UTF-8',
      }, 
      body: `uData=${uData}&utype=${xm}&ujishu=${ujishu}&m_id=${m_id}`
    });
    let jsonData = await pro2.json();
    backData.url = jsonData.m_url;
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
  let listUrl ="http://m.ychy.org/search.asp?searchword=" +encodeGBK(keyword);
  try {
    let pro = await req(listUrl, {
      headers: {
        "User-Agent": UA,
      },
    });
    let proData = await pro.data();
    let gb2312Bytes = hexStringToByteArray(proData);
    let decodedData = iconv.decode(gb2312Bytes, 'GB2312');
    //console.log(decodedData);
    const $ = cheerio.load(decodedData);
    let books = [];
    $(".bookbox").each((index, element) => {
      const $item = $(element);
      let vodPic = $item.find(".bookimg img").attr("orgsrc");
      let vodUrl = '/book/'+$item.attr('bookid')+'.html';
      let vodName = $item.find(".bookname").text().trim();
      let remarks = $item.find(".update").text().trim();
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
