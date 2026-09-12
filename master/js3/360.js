async function 访问网页(url, method, postParams, cookie, headers, timeout = 15000, setCookieCallback) {
    // 定义请求方法
    const methods = ['GET', 'POST', 'PUT'];
    const requestMethod = methods[method] || 'GET';
  
    // 构建请求头
    const requestHeaders = {};
    if (cookie) {
      requestHeaders['Cookie'] = cookie;
    }
    if (headers) {
      headers.split('\n').forEach(header => {
        const index = header.indexOf(':');
        if (index !== -1) {
          const key = header.substring(0, index).trim();
          const value = header.substring(index + 1).trim();
          if (key && value) {
            requestHeaders[key] = value;
          }
        }
      });
    }
    // 构建请求体（仅在 POST 或 PUT 时需要）
    let body = null;
    if (requestMethod === 'POST' || requestMethod === 'PUT') {
      if (postParams) {
        body = postParams;
      }
    }
    // 构建请求配置
    const requestOptions = {
      method: requestMethod,
      headers: requestHeaders,
      body: body,
      redirect: 'follow'
    };
    // 创建一个 Promise 用于超时控制
    const fetchPromise = newfetch(url, requestOptions);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timed out')), timeout);
    });
    try {
      // 发送请求并等待响应
      const response = await Promise.race([fetchPromise, timeoutPromise]);
      // 获取响应内容
      const responseText = await response.text();
      // 提取响应头中的 set-cookie
        const responseHeaders = JSON.parse(response.headers);
      // 解析 set-cookie 字段
      let setCookie = responseHeaders['set-cookie'];
      // 如果提供了 setCookieCallback，则调用它并传递 set-cookie
      if (setCookieCallback && setCookie) {
        setCookieCallback(setCookie);
      }
      // 返回结果
      return responseText;
    } catch (error) {
      throw error;
    }
  }

function newfetch(url, options) {
    options = options || {};
    return new Promise(async (resolve, reject) => {
        let request = await sendMessage("fetch", JSON.stringify({"url": url, "options": options}))

        const response = () => ({
            ok: ((request.status / 100) | 0) == 2, // 200-299
            statusText: request.statusText,
            status: request.status,
            url: request.responseURL,
            text: () => Promise.resolve(request.responseText),
            json: () => Promise.resolve(request.responseText).then(JSON.parse),
            blob: () => Promise.resolve(new Blob([request.response])),
            clone: response,
            headers: request.headers,
        })

        if (request.ok) resolve(response());
        else reject(response());
    });
}

async function playerContent(vod_id) {
    return vod_id;
    const result = {
      parse: 0,
      header: ``,
      playUrl: vod_id,
      url: ""
    };
    return JSON.stringify(result);
    }
    
    
    async function homeContent() {
        try {
          const baseUrl = 'https://api.web.360kan.com/v1/rank?cat=';
          const size = 9;
          const categories = [ 1,2, 3, 4, 5, 6];
          const uniqueItems = new Set();
          const list = [];
      
          for (const cat of categories) {
            const url = `${baseUrl}${cat}&size=${size}`;
            //const response = await fetch(url);
            //const data = await response.json();
            const response = await 访问网页(url);
            const data = JSON.parse(response);
            console.log(data);
            if (data.errno === 0 && data.data && data.data.length > 0) {
              data.data.forEach(item => {
                const vod_name = item.title;
                const vod_remarks = item.upinfo || '';
                const vod_pic = item.cover;
                const vod_id = `${item.cat}#${item.ent_id}`;
      
                if (!uniqueItems.has(vod_name)) {
                  uniqueItems.add(vod_name);
                  list.push({
                    vod_id: vod_id,
                    vod_name: vod_name,
                    vod_remarks: vod_remarks,
                    vod_pic: vod_pic
                  });
                }
              });
            }
          }
    
        // 定义分类数据
        const classData = [
            { "type_id": 1, "type_name": "电影" },
            { "type_id": 2, "type_name": "电视剧" },
            { "type_id": 4, "type_name": "动漫" },
            { "type_id": 3, "type_name": "综艺" }
          ];
      
          // 定义分类数据
          const filterData = {
            "2": [
              {
                "key": "cateId",
                "name": "类型",
                "value": [
                  { "n": "全部", "v": "" },
                  { "n": "言情", "v": "言情" },
                  { "n": "剧情", "v": "剧情" },
                  { "n": "伦理", "v": "伦理" },
                  { "n": "喜剧", "v": "喜剧" },
                  { "n": "悬疑", "v": "悬疑" },
                  { "n": "都市", "v": "都市" },
                  { "n": "偶像", "v": "偶像" },
                  { "n": "古装", "v": "古装" },
                  { "n": "军事", "v": "军事" },
                  { "n": "警匪", "v": "警匪" },
                  { "n": "历史", "v": "历史" },
                  { "n": "励志", "v": "励志" },
                  { "n": "神话", "v": "神话" },
                  { "n": "谍战", "v": "谍战" },
                  { "n": "青春", "v": "青春剧" },
                  { "n": "家庭", "v": "家庭剧" },
                  { "n": "动作", "v": "动作" },
                  { "n": "情景", "v": "情景" },
                  { "n": "武侠", "v": "武侠" },
                  { "n": "科幻", "v": "科幻" },
                  { "n": "其他", "v": "其他" }
                ]
              },
              {
                "key": "area",
                "name": "地区",
                "value": [
                  { "n": "全部", "v": "" },
                  { "n": "内地", "v": "大陆" },
                  { "n": "中国香港", "v": "香港" },
                  { "n": "中国台湾", "v": "台湾" },
                  { "n": "泰国", "v": "泰国" },
                  { "n": "日本", "v": "日本" },
                  { "n": "韩国", "v": "韩国" },
                  { "n": "美国", "v": "美国" },
                  { "n": "英国", "v": "英国" },
                  { "n": "新加坡", "v": "新加坡" }
                ]
              },
              {
                "key": "year",
                "name": "年份",
                "value": [
                  { "n": "全部", "v": "" },
                  { "n": "2024", "v": "2024" },
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
                  { "n": "更早", "v": "lt_year" }
                ]
              },
              {
                "key": "by",
                "name": "排序",
                "value": [
                  { "n": "最近热映", "v": "" },
                  { "n": "最近上映", "v": "ranklatest" },
                  { "n": "最近好评", "v": "rankpoint" }
                ]
              }
            ],
            "1": [
              {
                "key": "cateId",
                "name": "类型",
                "value": [
                  { "n": "全部", "v": "" },
                  { "n": "喜剧", "v": "喜剧" },
                  { "n": "爱情", "v": "爱情" },
                  { "n": "动作", "v": "动作" },
                  { "n": "恐怖", "v": "恐怖" },
                  { "n": "科幻", "v": "科幻" },
                  { "n": "剧情", "v": "剧情" },
                  { "n": "犯罪", "v": "犯罪" },
                  { "n": "奇幻", "v": "奇幻" },
                  { "n": "战争", "v": "战争" },
                  { "n": "悬疑", "v": "悬疑" },
                  { "n": "动画", "v": "动画" },
                  { "n": "文艺", "v": "文艺" },
                  { "n": "纪录", "v": "纪录" },
                  { "n": "传记", "v": "传记" },
                  { "n": "歌舞", "v": "歌舞" },
                  { "n": "古装", "v": "古装" },
                  { "n": "历史", "v": "历史" },
                  { "n": "惊悚", "v": "惊悚" },
                  { "n": "伦理", "v": "伦理" },
                  { "n": "其他", "v": "其他" }
                ]
              },
              {
                "key": "area",
                "name": "地区",
                "value": [
                  { "n": "全部", "v": "" },
                  { "n": "内地", "v": "大陆" },
                  { "n": "中国香港", "v": "香港" },
                  { "n": "中国台湾", "v": "台湾" },
                  { "n": "泰国", "v": "泰国" },
                  { "n": "美国", "v": "美国" },
                  { "n": "韩国", "v": "韩国" },
                  { "n": "日本", "v": "日本" },
                  { "n": "法国", "v": "法国" },
                  { "n": "英国", "v": "英国" },
                  { "n": "德国", "v": "德国" },
                  { "n": "印度", "v": "印度" },
                  { "n": "其他", "v": "其他" }
                ]
              },
              {
                "key": "year",
                "name": "年份",
                "value": [
                    { "n": "全部", "v": "" },
                    { "n": "2024", "v": "2024" },
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
                    { "n": "更早", "v": "lt_year" }
                ]
              },
              {
                "key": "by",
                "name": "排序",
                "value": [
                    { "n": "最近热映", "v": "" },
                    { "n": "最近上映", "v": "ranklatest" },
                    { "n": "最近好评", "v": "rankpoint" }
                ]
              }
            ],
            "3": [
              {
                "key": "cateId",
                "name": "类型",
                "value": [
                  { "n": "全部", "v": "" },
                  { "n": "脱口秀", "v": "脱口秀" },
                  { "n": "真人秀", "v": "真人秀" },
                  { "n": "搞笑", "v": "搞笑" },
                  { "n": "选秀", "v": "选秀" },
                  { "n": "八卦", "v": "八卦" },
                  { "n": "访谈", "v": "访谈" },
                  { "n": "情感", "v": "情感" },
                  { "n": "生活", "v": "生活" },
                  { "n": "晚会", "v": "晚会" },
                  { "n": "音乐", "v": "音乐" },
                  { "n": "职场", "v": "职场" },
                  { "n": "美食", "v": "美食" },
                  { "n": "时尚", "v": "时尚" },
                  { "n": "游戏", "v": "游戏" },
                  { "n": "少儿", "v": "少儿" },
                  { "n": "体育", "v": "体育" },
                  { "n": "纪实", "v": "纪实" },
                  { "n": "科教", "v": "科教" },
                  { "n": "曲艺", "v": "曲艺" },
                  { "n": "歌舞", "v": "歌舞" },
                  { "n": "财经", "v": "财经" },
                  { "n": "汽车", "v": "汽车" },
                  { "n": "播报", "v": "播报" },
                  { "n": "其他", "v": "其他" }
                ]
              }, {
                "key": "area",
                "name": "地区",
                "value": [
                  { "n": "全部", "v": "" },
                  { "n": "内地", "v": "大陆" },
                  { "n": "中国香港", "v": "香港" },
                  { "n": "中国台湾", "v": "台湾" },
                  { "n": "日本", "v": "日本" },
                  { "n": "欧美", "v": "欧美" }
                ]
              },
              {
                "key": "by",
                "name": "排序",
                "value": [
                    { "n": "最近热映", "v": "" },
                    { "n": "最近上映", "v": "ranklatest" },
                    { "n": "最近好评", "v": "rankpoint" }
                ]
              }
            ],
            "4": [
                {
                    "key": "cateId",
                    "name": "类型",
                    "value": [
                      { "n": "全部", "v": "" },
                      { "n": "热血", "v": "热血" },
                      { "n": "科幻", "v": "科幻" },
                      { "n": "美少女", "v": "美少女" },
                      { "n": "魔幻", "v": "魔幻" },
                      { "n": "经典", "v": "经典" },
                      { "n": "励志", "v": "励志" },
                      { "n": "少儿", "v": "少儿" },
                      { "n": "冒险", "v": "冒险" },
                      { "n": "搞笑", "v": "搞笑" },
                      { "n": "推理", "v": "推理" },
                      { "n": "恋爱", "v": "恋爱" },
                      { "n": "治愈", "v": "治愈" },
                      { "n": "幻想", "v": "幻想" },
                      { "n": "校园", "v": "校园" },
                      { "n": "动物", "v": "动物" },
                      { "n": "机战", "v": "机战" },
                      { "n": "亲子", "v": "亲子" },
                      { "n": "儿歌", "v": "儿歌" },
                      { "n": "运动", "v": "运动" },
                      { "n": "悬疑", "v": "悬疑" },
                      { "n": "怪物", "v": "怪物" },
                      { "n": "战争", "v": "战争" },
                      { "n": "益智", "v": "益智" },
                      { "n": "青春", "v": "青春" },
                      { "n": "童话", "v": "童话" },
                      { "n": "竞技", "v": "竞技" },
                      { "n": "动作", "v": "动作" },
                      { "n": "社会", "v": "社会" },
                      { "n": "友情", "v": "友情" },
                      { "n": "真人版", "v": "真人版" },
                      { "n": "电影版", "v": "电影版" },
                      { "n": "OVA版", "v": "OVA版" }
                    ]
                  },{
                "key": "area",
                "name": "地区",
                "value": [
                  { "n": "全部", "v": "" },
                  { "n": "内地", "v": "大陆" },
                  { "n": "日本", "v": "日本" },
                  { "n": "美国", "v": "美国" }
                ]
              },
              {
                "key": "year",
                "name": "年份",
                "value": [
                    { "n": "全部", "v": "" },
                    { "n": "2024", "v": "2024" },
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
                    { "n": "更早", "v": "lt_year" }
                ]
              },
              {
                "key": "by",
                "name": "排序",
                "value": [
                    { "n": "最近热映", "v": "" },
                    { "n": "最近上映", "v": "ranklatest" },
                    { "n": "最近好评", "v": "rankpoint" }
                ]
              }
            ]
          };
    
          return JSON.stringify({
            code: 1,
            msg: "数据列表",
            page: "1",
            limit: "20",
            list: list,
            class: classData,
            filters: filterData
          });
        } catch (error) {
          console.error('Error fetching the webpage:', error);
          return JSON.stringify({
            code: -1,
            msg: "获取数据失败",
            page: "1",
            limit: "20",
            list: []
          });
        }
      }
    
    // 定义一个函数来提取影片信息
    async function searchContent(keyword) {
        try {
            const encodedKeyword = encodeURIComponent(keyword);
            const url = `https://api.so.360kan.com/index?force_v=1&kw=${encodedKeyword}&from=&pageno=1&v_ap=1&tab=all`;
            //const response = await fetch(url);
            //const data = await response.json();
            const response = await 访问网页(url);
            const data = JSON.parse(response);
    
            if (data.code === 0 && data.data && data.data.longData && data.data.longData.rows) {
                const list = data.data.longData.rows.map((item) => {
                    const vod_name = item.titleTxt || '';
                    const vod_pic = item.cover.startsWith('//') ? `https:${item.cover}` : item.cover; // 自动加上 https:
                    const vod_id = `${item.cat_id}#${item.en_id}`;
                    const vod_remarks = item.coverInfo ? item.coverInfo.txt : '';
    
                    return {
                        vod_id: vod_id,
                        vod_name: vod_name,
                        vod_remarks: vod_remarks,
                        vod_pic: vod_pic
                    };
                });
    
                return JSON.stringify({
                    code: 1,
                    msg: "数据列表",
                    page: "1",
                    limit: "20",
                    list: list
                });
            } else {
                return JSON.stringify({
                    code: 0,
                    msg: "获取数据失败",
                    page: "1",
                    limit: "20",
                    list: []
                });
            }
        } catch (error) {
            console.error('Error fetching movie data:', error);
            return JSON.stringify({
                code: 0,
                msg: "获取数据失败",
                page: "1",
                limit: "20",
                list: []
            });
        }
    }
    // 使用示例
    //searchContent('斗罗大陆').then(data => {
     //   console.log(data);
    //});
    
    async function test() {
        return "hello world";
    }
    
    //homeContent()
    //  .then(data => console.log(data))
     // .catch(error => console.error('Error:', error));
    
    //获取影视分类列表
    async function categoryContent(tid, pg = 1, extend) {
        try {
          // 解析 extend 参数
          let extendObj = extend ? JSON.parse(extend) : null;
          let url = `https://api.web.360kan.com/v1/filter/list?catid=${tid}&rank={by}&cat={cateId}&year={year}&area={area}&act=&size=35&pageno=${pg}`;
          // 替换 URL 中的占位符
          if (extendObj) {
            for (const [key, value] of Object.entries(extendObj)) {
              const placeholder = `{${key}}`;
              const encodedValue = encodeURIComponent(value || ''); // 对 value 进行 URL 编码
              url = url.replace(new RegExp(placeholder, 'g'), encodedValue);
            }
          }
          // 删除剩余的 {} 包围的占位符
          url = url.replace(/{(.*?)}/g, '');
          const response = await 访问网页(url);
          const data = JSON.parse(response);
          if (data.errno === 0 &&  data.data && data.data.movies) {
            const movies = data.data.movies;
            const list = movies.map((movie) => {
            const vod_id = `${tid}#${movie.id}`; 
            const vod_name = movie.title || '';
            const vod_pic = movie.cdncover.startsWith('//') ? `https:${movie.cdncover}` : movie.cdncover; // 自动加上 https:
            let vod_remarks = movie.upinfo || movie.tag || ''; // 如果 upinfo 为空，从 tag 取值
                    // 处理 vod_remarks 的显示逻辑
if (movie.total) {
    if (movie.total === vod_remarks) {
        vod_remarks = `${movie.total}集全`;
    } else {
        vod_remarks = `${vod_remarks}${movie.total > vod_remarks ? `/${movie.total}` : ''}集`;
    }
}


              return {
                vod_id: vod_id,
                vod_name: vod_name,
                vod_remarks: vod_remarks,
                vod_pic: vod_pic
              };
            });
            return JSON.stringify({
              code: 1,
              msg: "数据列表",
              page: data.data.current_page,
              pagecount: Math.ceil(data.data.total / 35),
              limit: "35",
              total: data.data.total,
              list: list
            });
          } else {
            return JSON.stringify({
              code: 0,
              msg: "获取数据失败",
              page: "1",
              limit: "35",
              total: 0,
              list: []
            });
          }
        } catch (error) {
          console.error('Error fetching the webpage:', error);
          return JSON.stringify({
            code: -1,
            msg: "获取数据失败",
            page: "1",
            limit: "35",
            total: 0,
            list: []
          });
        }
      }
    
      //categoryContent('1',1)
      //.then(data => console.log(data))
     // .catch(error => console.error('Error:', error));
    
    //获取影视详情信息
    async function detailContent(ids) {
        try {
            const [catid, id] = ids.split('#');
            const url = `https://api.web.360kan.com/v1/detail?cat=${catid}&id=${id}`;
            //const response = await fetch(url);
            //const data = await response.json();
            const response = await 访问网页(url);
            const data = JSON.parse(response);
            if (data.errno === 0 && data.data) {
                const vod_id = ids;
                const vod_name = data.data.title || '未知片名';
                const vod_actor = data.data.actor.join(', ') || '未知';
                const vod_area = data.data.area.join(', ') || '未知';
                const vod_content = data.data.description || '暂无剧情';
                const vod_director = data.data.director.join(', ') || '未知';
                const vod_year = data.data.pubdate || '';
                const vod_pic = data.data.cdncover.startsWith('//') ? `https:${data.data.cdncover}` : data.data.cdncover; // 自动加上 https:
                const vod_remarks = `${data.data.upinfo}` || '';
    
                let vod_play_from = [];
                let vod_play_url = [];
    
                if (catid === '3') {
                    const playInfo = await fetchPlayInfo(catid, id, data.data.tag, data.data.playlink_sites);
                    vod_play_from = playInfo.vod_play_from;
                    vod_play_url = playInfo.vod_play_url;
                } else if (data.data.allepidetail) {
                    const allepidetail = data.data.allepidetail;
                    for (const site in allepidetail) {
                        if (allepidetail.hasOwnProperty(site)) {
                            vod_play_from.push(site);
                            const episodes = allepidetail[site];
                            const episodeUrls = episodes.map(episode => `${episode.playlink_num}$${episode.url}`).join('#');
                            vod_play_url.push(episodeUrls);
                        } 
                    }


                // 从 allupinfo 中获取剧集个数
                const allupinfo = data.data.allupinfo;
                const sites = Object.keys(allupinfo);

                for (const site of sites) {
                    if (data.data.allepidetail && data.data.allepidetail[site]) {
                        const totalEpisodes = parseInt(allupinfo[site]);
                        const episodeCountInAllepidetail = data.data.allepidetail[site].length;

                        if (totalEpisodes > episodeCountInAllepidetail) {
                            // 舍弃之前的 vod_play_from 和 vod_play_url
                            vod_play_from = [];
                            vod_play_url = [];

                            const episodes = await fetchEpisodes(catid, id, site, totalEpisodes);
                            const episodeUrls = episodes.map(episode => `${episode.playlink_num}$${episode.url}`).join('#');
                            vod_play_from.push(site);
                            vod_play_url.push(episodeUrls);
                        } else if (totalEpisodes === episodeCountInAllepidetail) {
                            // 使用之前的 vod_play_from 和 vod_play_url
                            break;
                        }
                    }
                }




            } else if (data.data.playlinksdetail) {
                const playlinksdetail = data.data.playlinksdetail;
                for (const site in playlinksdetail) {
                    if (playlinksdetail.hasOwnProperty(site)) {
                        vod_play_from.push(site);
                        vod_play_url.push('正片$' + playlinksdetail[site].default_url);
                    }
                }
            }

            const movieDetails = {
                code: 1,
                msg: "数据列表",
                page: 1,
                pagecount: 1,
                limit: "20",
                total: 1,
                list: [{
                    vod_id: vod_id,
                    vod_name: vod_name,
                    vod_pic: vod_pic,
                    vod_actor: vod_actor,
                    vod_director: vod_director,
                    vod_area: vod_area,
                    vod_year: vod_year,
                    vod_content: vod_content,
                    vod_remarks: vod_remarks,
                    vod_play_from: vod_play_from.join('$$$'),
                    vod_play_url: vod_play_url.join('$$$')
                }]
            };

            console.log(JSON.stringify(movieDetails));
            return JSON.stringify(movieDetails);
        } else {
            return JSON.stringify({ code: 0, msg: "获取数据失败" });
        }
    } catch (error) {
        console.error('Error fetching movie details:', error);
        return JSON.stringify({ code: 0, msg: "获取数据失败", error: error.message });
    }
}
    
    async function fetchPlayInfo(catid, id, tags, sites) {
    const vod_play_from = [];
    const vod_play_url = [];

    for (const site of sites) {
        let siteUrls = [];
        const years = Object.keys(tags).reverse();

        for (const year of years) {
            const url = `https://api.web.360kan.com/v1/detail?cat=${catid}&id=${id}&year=${year}&site=${site}`;
            //const response = await fetch(url);
            //const data = await response.json();
            const response = await 访问网页(url);
            const data = JSON.parse(response);
            if (data.errno === 0 && data.data && data.data.defaultepisode) {
                const episodes = data.data.defaultepisode;
                const episodeUrls = episodes.map(episode => `${episode.period} ${episode.name}$${episode.url}`).join('#');
                siteUrls.push(episodeUrls);
            }
        }

        if (siteUrls.length > 0) {
            vod_play_from.push(site);
            vod_play_url.push(siteUrls.join('#'));
        }
    }

    return { vod_play_from, vod_play_url };
}

      
      async function fetchEpisodes(catid, id, site, totalEpisodes) {
        const episodes = [];
        const maxChunkSize = 50;
        const chunks = Math.ceil(totalEpisodes / maxChunkSize);
      
        for (let i = 0; i < chunks; i++) {
          const start = i * maxChunkSize + 1;
          const end = Math.min((i + 1) * maxChunkSize, totalEpisodes);
          const url = `https://api.web.360kan.com/v1/detail?cat=${catid}&id=${id}&start=${start}&end=${end}&site=${site}`;
          //const response = await fetch(url);
          //const data = await response.json();
          const response = await 访问网页(url);
          const data = JSON.parse(response);
          if (data.errno === 0 && data.data && data.data.allepidetail && data.data.allepidetail[site]) {
            episodes.push(...data.data.allepidetail[site]);
          }
        }
        return episodes;
      }
    
    //detailContent('2#PrNpb07mTz0lOX')
    //  .then(data => console.log(data))
    //  .catch(error => console.error('Error:', error));
