//编写代码时，使用变量名称ucCookie、quarkCookie，编写完成后务必屏蔽掉，否则会报错（app会自动调用设置中的cookie）。
//const ucCookie='在设置中登录uc网盘';
//const quarkCookie='在设置中登录夸克网盘';
//代码中未分析阿里云盘，如有能力请自行完善
async function toast(msg, seconds = 2) {
    await sendMessage('toast', JSON.stringify({ msg: msg, seconds: seconds }));
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
/*
参数说明：
fullText: 完整的文本内容。
leftText: 左边文本，用于定位中间内容的起始位置。
rightText: 右边文本，用于定位中间内容的结束位置。
startPos: 起始查找位置，默认为 0，表示从文本的第一个字符开始查找。
includeLeft: 是否在结果中包含左边文本，默认为 false。
includeRight: 是否在结果中包含右边文本，默认为 false。
*/
function 文本_取中间(fullText, leftText, rightText, startPos = 0, includeLeft = false, includeRight = false) {
  // 查找左边文本的位置
  const leftPos = fullText.indexOf(leftText, startPos);
  if (leftPos === -1) {
    return null; // 如果没有找到左边文本，返回 null
  }
  // 计算右边文本的起始查找位置
  const rightStartPos = leftPos + leftText.length;
  // 查找右边文本的位置
  const rightPos = fullText.indexOf(rightText, rightStartPos);
  if (rightPos === -1) {
    return null; // 如果没有找到右边文本，返回 null
  }
  // 计算中间文本的起始和结束位置
  let start = leftPos + (includeLeft ? 0 : leftText.length);
  let end = rightPos + (includeRight ? rightText.length : 0);
  // 取出中间的文本
  const result = fullText.substring(start, end);
  return result;
}

/*
// 示例用法
const fullText = '1=2=3=4';
const keyword = '=';
const leftText = 文本_取左边(fullText, keyword);
console.log(leftText); // 输出: 1
*/
function 文本_取左边(fullText, keyword) {
  // 查找关键字的位置
  const keywordPos = fullText.indexOf(keyword);
  if (keywordPos === -1) {
    return null; // 如果没有找到关键字，返回 null
  }
  // 取出关键字左边的文本
  const leftText = fullText.substring(0, keywordPos);
  return leftText;
}

/*
// 示例用法
const fullText = '1=2=3=4';
const keyword = '=';
const rightText = 文本_取右边(fullText, keyword);
console.log(rightText); // 输出: 2=3=4
*/
function 文本_取右边(fullText, keyword) {
  // 查找关键字的位置
  const keywordPos = fullText.indexOf(keyword);
  if (keywordPos === -1) {
    return null; // 如果没有找到关键字，返回 null
  }
  // 取出关键字右边的文本
  const rightText = fullText.substring(keywordPos + keyword.length);
  return rightText;
}




function 移除html代码(text) {
  // 使用正则表达式删除所有的 HTML 标签
  const noHtml = text.replace(/<[^>]+>/g, '');
  // 使用正则表达式删除所有的换行符和空白字符
  const noNewlines = noHtml.replace(/\s+/g, '');
  // 删除文本前后的空格
  const trimmedText = noNewlines.trim();
  // 使用正则表达式删除所有的反斜杠和正斜杠
  const noSlashes = trimmedText.replace(/[\\/]/g, '');
  // 使用正则表达式删除所有的 HTML 实体
  const noEntities = noSlashes.replace(/&[^;]+;/g, ' ');
  return noEntities;
}

/*
// 示例用法
const fullText = 'Hello,World,Hello,World';
const separator = ',';
const ignoreCase = false;
const splitResult = 分割文本(fullText, separator, ignoreCase);
console.log(splitResult); // 输出: [ 'Hello', 'World', 'Hello', 'World' ]
*/
function 分割文本(fullText, separator, ignoreCase = false) {
  // 如果忽略大小写，将分割文本内容转换为小写
  if (ignoreCase) {
    separator = separator.toLowerCase();
  }
  // 使用分割文本内容分割完整文本
  const splitArray = fullText.split(separator);
  // 如果忽略大小写，需要重新组合分割结果
  if (ignoreCase) {
    let result = [];
    let currentPart = '';
    for (let i = 0; i < fullText.length; i++) {
      currentPart += fullText[i];
      if (currentPart.toLowerCase().endsWith(separator)) {
        result.push(currentPart.slice(0, -separator.length));
        currentPart = '';
      }
    }
    if (currentPart) {
      result.push(currentPart);
    }
    return result;
  }
  return splitArray;
}


/*
// 示例用法
const fullText = '<a href="http://www.baidu1.com"><a href="http://www.baidu2.com"><a href="http://www.baidu3.com">';
const leftText = 'href="';
const rightText = '"';
const includeLeft = false;
const includeRight = false;
const extractedTexts = 文本_取中间_批量(fullText, leftText, rightText, includeLeft, includeRight);
console.log(extractedTexts); // 输出: [http://www.baidu1.com, http://www.baidu2.com, http://www.baidu3.com]
*/

function 文本_取中间_批量(fullText, leftText, rightText, includeLeft = false, includeRight = false) {
  const results = [];
  let startPos = 0;
  while (true) {
    // 查找左边文本的位置
    const leftPos = fullText.indexOf(leftText, startPos);
    if (leftPos === -1) {
      break; // 如果没有找到左边文本，结束循环
    }
    // 计算右边文本的起始查找位置
    const rightStartPos = leftPos + leftText.length;
    // 查找右边文本的位置
    const rightPos = fullText.indexOf(rightText, rightStartPos);
    if (rightPos === -1) {
      break; // 如果没有找到右边文本，结束循环
    }
    // 计算中间文本的起始和结束位置
    let start = leftPos + (includeLeft ? 0 : leftText.length);
    let end = rightPos + (includeRight ? rightText.length : 0);
    // 取出中间的文本
    const result = fullText.substring(start, end);
    results.push(result);
    // 更新起始查找位置，继续查找下一个匹配项
    startPos = rightPos + rightText.length;
  }
  return results;
}



/*
// 示例用法
const fullText = 'Hello, World!';
const searchText = 'world';
const ignoreCase = true;
const position = 寻找文本(fullText, searchText, ignoreCase);
console.log(position); // 输出: 7 没找到返回-1
*/
function 寻找文本(fullText, searchText, ignoreCase = false) {
  // 如果忽略大小写，将完整文本和寻找文本都转换为小写
  if (ignoreCase) {
    fullText = fullText.toLowerCase();
    searchText = searchText.toLowerCase();
  }
  // 查找寻找文本的位置
  const position = fullText.indexOf(searchText);
  return position;
}

/*
// 示例用法
const fullText = 'Hello, World! Hello, World!';
const searchText = 'world';
const ignoreCase = true;
const position = 倒找文本(fullText, searchText, ignoreCase);
console.log(position); // 输出: 19
*/
function 倒找文本(fullText, searchText, ignoreCase = false) {
  // 如果忽略大小写，将完整文本和寻找文本都转换为小写
  if (ignoreCase) {
    fullText = fullText.toLowerCase();
    searchText = searchText.toLowerCase();
  }
  // 从最后一个位置开始往前查找寻找文本的位置
  const position = fullText.lastIndexOf(searchText);
  return position;
}




function extractShareId(url) {
  // 使用正则表达式匹配 "s/" 和 "/" 之间的字符串
  const regex = /\/s\/([a-f0-9]+)/;
  const match = url.match(regex);

  if (match && match[1]) {
    return match[1];
  } else {
    return null; // 如果没有匹配到，返回 null 或其他你认为合适的值
  }
}

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



//调试脚本时用访问网页2，调试完毕后改回访问网页
async function 访问网页2(url, method, postParams, cookie, headers, timeout = 15000, setCookieCallback) {
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
    const fetchPromise = fetch(url, requestOptions);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timed out')), timeout);
    });
    try {
      // 发送请求并等待响应
      const response = await Promise.race([fetchPromise, timeoutPromise]);
      // 获取响应内容
      const responseText = await response.text();
      // 返回结果
      return responseText;
    } catch (error) {
      throw error;
    }
  }


//playerContent('%7B%22fid_list%22%3A%5B%22ffd5fb1ba04e48bcbcb4e28fe449bbb3%22%5D%2C%22fid_token_list%22%3A%5B%22d84fe7f65cb8ae991beb66104222e653%22%5D%2C%22fid_size%22%3A5627266634%2C%22to_pdir_fid%22%3A%22%E6%9A%82%E5%AE%9A%22%2C%22pwd_id%22%3A%226dc9cce602e4%22%2C%22isQuark%22%3Atrue%2C%22stoken%22%3A%22DTPUGX1BRFxmEHFdRaFDBGEvq%2FfiI5T0rHSYL0CyH7E%3D%22%2C%22pdir_fid%22%3A%220%22%2C%22scene%22%3A%22link%22%7D')
 // .then(data => console.log(data))
 // .catch(error => console.error('Error:', error));


 async function playerContent(vod_id) {
     try {
       // Step 1: URL decode vod_id to get JSON text
       const decodedVodId = decodeURIComponent(vod_id);
       const vodData = JSON.parse(decodedVodId);
       const isQuark = vodData.isQuark;
       // Step 2: Find tBox folder and replace to_pdir_fid
       let page = 1;
       let tBoxFid = null;
       let getUrl = "";
       let createUrl = "";
       let fileUrl = "";
       let playUrl = "";
       let deleteUrl = "";
       let origin = "";
       let cookie = "";
       let tBoxFileUrl = "";
       if (isQuark) {
         getUrl = `https://drive-pc.quark.cn/1/clouddrive/file/sort?pr=ucpro&fr=pc&uc_param_str=&pdir_fid=0&_page=${page}&_size=100&_fetch_total=false&_fetch_sub_dirs=1&_sort=&__dt=1604987&__t=${Date.now()}`;
         createUrl = `https://drive-pc.quark.cn/1/clouddrive/file?pr=ucpro&fr=pc&uc_param_str=`;
         fileUrl = `https://pc-api.uc.cn/1/clouddrive/file/sort?pr=UCBrowser&fr=pc&pdir_fid=${vodData.to_pdir_fid}&_page=1&_size=50&_fetch_total=1&_fetch_sub_dirs=0&_sort=file_type:asc,updated_at:desc`;
         playUrl = `https://drive-pc.quark.cn/1/clouddrive/file/v2/play?pr=ucpro&fr=pc&uc_param_str=`;
         deleteUrl = `https://drive-pc.quark.cn/1/clouddrive/file/delete?pr=ucpro&fr=pc&uc_param_str=`;
         origin = `https://pan.quark.cn`;
         cookie = quarkCookie;
       } else {
         getUrl = `https://pc-api.uc.cn/1/clouddrive/file/sort?pr=UCBrowser&fr=pc&pdir_fid=0&_page=${page}&_size=50&_fetch_total=1&_fetch_sub_dirs=0&_sort=file_type:asc,updated_at:desc`;
         createUrl = `https://pc-api.uc.cn/1/clouddrive/file?pr=UCBrowser&fr=pc`;
         fileUrl = `https://pc-api.uc.cn/1/clouddrive/file/sort?pr=UCBrowser&fr=pc&pdir_fid=${vodData.to_pdir_fid}&_page=1&_size=50&_fetch_total=1&_fetch_sub_dirs=0&_sort=file_type:asc,updated_at:desc`;
         playUrl = `https://pc-api.uc.cn/1/clouddrive/file/v2/play?pr=UCBrowser&fr=pc`;
         deleteUrl = `https://pc-api.uc.cn/1/clouddrive/file/delete?pr=UCBrowser&fr=pc`;
         origin = `https://drive.uc.cn`;
         cookie = ucCookie;
       }
       //await toast('正在查找tBox文件夹',2);
       while (true) {
         const getResponse = await 访问网页(getUrl, 0, null, cookie);
         const getData = JSON.parse(getResponse);
         if (getData.status !== 200 || getData.code !== 0) {
           throw new Error(`Failed to get file list: ${getData.message}`);
         }
         const tBoxFolder = getData.data.list.find(
           (file) => file.file_type === 0 && file.file_name === "tBox"
         );
         if (tBoxFolder) {
           tBoxFid = tBoxFolder.fid;
           break;
         }
         // If the list size is less than 100, break the loop
         if (getData.data.list.length < 100) {
           break;
         }
         page++;
       }
       if (tBoxFid) {
         vodData.to_pdir_fid = tBoxFid;
         await toast("正在获取影片文件信息", 2);
         if (isQuark) {
           tBoxFileUrl = `https://drive-pc.quark.cn/1/clouddrive/file/sort?pr=ucpro&fr=pc&uc_param_str=&pdir_fid=${tBoxFid}&_page=1&_size=50&_fetch_total=1&_fetch_sub_dirs=0&_sort=file_type:asc,updated_at:desc`;
         } else {
           tBoxFileUrl = `https://pc-api.uc.cn/1/clouddrive/file/sort?pr=UCBrowser&fr=pc&uc_param_str=&pdir_fid=${tBoxFid}&_page=1&_size=50&_fetch_total=1&_fetch_sub_dirs=0&_sort=file_type:asc,updated_at:desc`;
         }
         // 带 cookie 用 get 方式访问指定的 URL 并取出 list 里的 fid
         const tBoxFileResponse = await 访问网页(tBoxFileUrl, 0, null, cookie);
         const tBoxFileData = JSON.parse(tBoxFileResponse);
         if (tBoxFileData.status !== 200 || tBoxFileData.code !== 0) {
           throw new Error(
             `Failed to get tBox file list: ${tBoxFileData.message}`
           );
         }
         const fids = tBoxFileData.data.list.map((file) => file.fid);
         if (fids.length > 0) {
           // 带 cookie 用 post 方式删除这些 fid
           const deleteParams = JSON.stringify({
             action_type: 2,
             filelist: fids,
             exclude_fids: [],
           });
           const deleteResponse = await 访问网页(
             deleteUrl,
             1,
             deleteParams,
             cookie,
             "Content-Type: application/json;charset=UTF-8"
           );
         }
       } else {
         // Step 3: Create tBox folder if not found
         const createParams = JSON.stringify({
           pdir_fid: "0",
           file_name: "tBox",
           dir_path: "",
           dir_init_lock: false,
         });
         const createResponse = await 访问网页(
           createUrl,
           1,
           createParams,
           cookie,
           isQuark
             ? "Content-Type: application/json\nOrigin: https://pan.quark.cn\nReferer: https://pan.quark.cn/"
             : "Content-Type: application/json\nOrigin: https://drive.uc.cn\nReferer: https://drive.uc.cn/"
         );
         const createData = JSON.parse(createResponse);
         if (createData.status !== 200 || createData.code !== 0) {
           throw new Error(
             `Failed to create tBox folder: ${createData.message}`
           );
         }
         vodData.to_pdir_fid = createData.data.fid;
       }
       let retryCount = 0;
       let videoLinks = null;
       let saveAsTopFid = null;
       await toast("正在转存影片到网盘...", 2);
       while (retryCount < 5 && !videoLinks) {
         // Step 4: Post the final vodData
         const saveUrl = isQuark
           ? `https://drive-pc.quark.cn/1/clouddrive/share/sharepage/save?pr=ucpro&fr=pc&uc_param_str=&__dt=2460776&__t=${Date.now()}`
           : `https://pc-api.uc.cn/1/clouddrive/share/sharepage/save?pr=UCBrowser&fr=pc`;
         const saveParams = JSON.stringify(vodData);
         const saveResponse = await 访问网页(
           saveUrl,
           1,
           saveParams,
           cookie,
           isQuark
             ? "Content-Type: application/json\nOrigin: https://pan.quark.cn\nReferer: https://pan.quark.cn/"
             : "Content-Type: application/json\nOrigin: https://drive.uc.cn\nReferer: https://drive.uc.cn/"
         );
         const saveData = JSON.parse(saveResponse);
         if (saveData.status !== 200 || saveData.code !== 0) {
           throw new Error(`Failed to save vodData: ${saveData.message}`);
         }
         // Step 5: Check task status
         const taskId = saveData.data.task_id;

         let retryIndex = 0;
         let isTaskFinished = false;
         saveAsTopFid = null;

         while (retryIndex < 15 && !isTaskFinished) {
           const taskUrl = isQuark
             ? `https://drive-pc.quark.cn/1/clouddrive/task?pr=ucpro&fr=pc&uc_param_str=&task_id=${taskId}&retry_index=${retryIndex}&__dt=337800&__t=${Date.now()}`
             : `https://pc-api.uc.cn/1/clouddrive/task?pr=UCBrowser&fr=pc&uc_param_str=&task_id=${taskId}&retry_index=${retryIndex}&__dt=337800&__t=${Date.now()}`;
           const taskResponse = await 访问网页(
             taskUrl,
             0,
             "",
             cookie,
             isQuark
               ? "Origin: https://pan.quark.cn\nReferer: https://pan.quark.cn/"
               : "Content-Type: application/json\nOrigin: https://drive.uc.cn\nReferer: https://drive.uc.cn/"
           );
           const taskData = JSON.parse(taskResponse);

           if (taskData.status === 400 && taskData.code === 32003) {
             const fileResponse = await 访问网页(
               fileUrl,
               0,
               "",
               cookie,
               isQuark
                 ? "Content-Type: application/json\nOrigin: https://pan.quark.cn\nReferer: https://pan.quark.cn/"
                 : "Content-Type: application/json\nOrigin: https://drive.uc.cn\nReferer: https://drive.uc.cn/"
             );
             const fileData = JSON.parse(fileResponse);
             const fileList = fileData.data.list;
             const targetFile = fileList.find(
               (file) => file.size === vodData.fid_size
             );
             if (targetFile) {
               isTaskFinished = true;
               saveAsTopFid = targetFile.fid;
             }
           } else if (taskData.status !== 200 || taskData.code !== 0) {
             throw new Error(`Failed to get task status: ${taskData.message}`);
           } else if (taskData.data.finished_at) {
             isTaskFinished = true;
             saveAsTopFid = taskData.data.save_as.save_as_top_fids[0];
           }

           retryIndex++;
           await new Promise((resolve) => setTimeout(resolve, 500));
         }

         if (!isTaskFinished) {
           throw new Error("Task did not finish within the expected time.");
         }

         // Step 6: Get video playback links with retry mechanism
         await toast("正在获取影片播放链接...", 2);
         let retryCountForPlay = 0;
         let mySetCookie = null;




 const fetchPlayResponse = async (url, params, headers) => {
  return await 访问网页(url, 1, params, cookie, headers, 15000, (setCookie) => {
    mySetCookie = setCookie;
  });
};

const mergeCookies = (newCookies) => {
  const mergedCookies = [
    ...new Set([
      ...newCookies,
      ...cookie.split(";").map((item) => item.trim()),
    ]),
  ].join("; ");
  return mergedCookies;
};

const handlePlayResponse = (playResponse) => {
  let playData = JSON.parse(playResponse);
  if (playData.status !== 200 || playData.code !== 0) {
    if (playData.message.includes("文件已删除") || playData.message.includes("file not found")) {
      return null;
    }
    throw new Error(`Failed to get video playback links: ${playData.message}`);
  }
  return playData;
};

if (isQuark) {
  while (retryCountForPlay < 5 && !videoLinks) {
    try {
      let playParams = JSON.stringify({
        fid: saveAsTopFid,
        resolutions: "normal,low,high,super,2k,4k",
        supports: "fmp4,m3u8",
      });
      let playResponse = await fetchPlayResponse(
        playUrl,
        playParams,
        `Referer: ${origin}`
      );
      let playData = handlePlayResponse(playResponse);
      if (!playData) break;

      videoLinks = playData.data.video_list
        .map((video) => {
          const url = video.video_info && video.video_info.url ? video.video_info.url : null;
          if (url) {
            return {
              url: url,
              resolution: video.resolution,
              member_right: video.member_right,
              width: video.video_info.width,
              height: video.video_info.height,
            };
          }
        })
        .filter((video) => video !== undefined);

      if (mySetCookie) {
        const newCookies = mySetCookie
          .split(",")
          .map((item) => item.split(";")[0].trim())
          .filter((item) => item !== undefined);
        cookie = mergeCookies(newCookies);
      }
    } catch (error) {
      retryCountForPlay++;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
} else {
  let playParams = JSON.stringify({ fids: [saveAsTopFid] });
  let playResponse = await fetchPlayResponse(
    "https://pc-api.uc.cn/1/clouddrive/file/download?pr=UCBrowser&fr=pc",
    playParams,
    `Content-Type: application/json;charset=UTF-8\nReferer: ${origin}`
  );
  let playData = handlePlayResponse(playResponse);
  if (!playData) return null;

  let downloadUrl = playData.data[0].download_url;
  if (downloadUrl) {
    videoLinks = [{ url: downloadUrl }];

    if (mySetCookie) {
      const newCookies = mySetCookie
        .split(",")
        .map((item) => item.split(";")[0].trim())
        .filter((item) => item !== undefined);
      cookie = mergeCookies(newCookies);
    }
  }
}







         if (!videoLinks) {
           retryCount++;
           if (retryCount < 5) {
             //console.log("文件已删除，重新执行 Step 4 + Step 5  "+retryCount.toString());
             await new Promise((resolve) => setTimeout(resolve, 5000));
           } else {
             throw new Error(
               "Failed to get video playback links after 3 attempts."
             );
           }
         }
       }

       // Step 7: Delete the file
       const deleteParams = JSON.stringify({
         action_type: 2,
         filelist: [saveAsTopFid],
         exclude_fids: [],
       });
       const deleteResponse = await 访问网页(
         deleteUrl,
         1,
         deleteParams,
         cookie,
         isQuark
           ? "Content-Type: application/json\nOrigin: https://pan.quark.cn\nReferer: https://pan.quark.cn/"
           : "Content-Type: application/json\nOrigin: https://drive.uc.cn\nReferer: https://drive.uc.cn/"
       );
       const deleteData = JSON.parse(deleteResponse);
       if (deleteData.status !== 200 || deleteData.code !== 0) {
         throw new Error(`Failed to delete file: ${deleteData.message}`);
       }



       //return {
       //    saveAsTopFid: saveAsTopFid,
       //     videoLinks: videoLinks
       //};
       await toast("影片链接获取完毕,尝试播放...", 2);
       const result = {
         parse: 1,
         header: `Cookie: ${cookie}\nOrigin: ${origin}\nReferer: ${origin}`,
         playUrl: "",
         url: "",
       };
       if (videoLinks.length > 0) {
         result.url = videoLinks[0].url;
       }
       console.log(JSON.stringify(result));
       return JSON.stringify(result);
     } catch (error) {
       //console.error(error);
       const result = {
         parse: 1,
         header: "",
         playUrl: "",
         url: "",
         message: `获取链接失败: ${error}`,
       };
       return JSON.stringify(result);
     }
   }



// 获取uc、夸克网盘视频文件列表
async function fetchVideoFiles(url) {
  try {
    const pwd_id = extractShareId(url);
    const isQuark = url.includes(".uc.cn")
      ? false
      : true;
    // Step 1: Send POST request to get stoken
    const postUrl = url.includes(".uc.cn")
      ? "https://pc-api.uc.cn/1/clouddrive/share/sharepage/v2/detail?pr=UCBrowser&fr=pc"
      : "https://drive-h.quark.cn/1/clouddrive/share/sharepage/token?pr=ucpro&fr=pc&uc_param_str=&__dt=300&__t=" + Date.now();
    const postParams = url.includes(".uc.cn")
      ? JSON.stringify({ pwd_id: pwd_id, passcode: "", force: 0, page: 1, size: 50, fetch_banner: 1, fetch_share: 1, fetch_total: 1, sort: "file_type:asc,file_name:asc", banner_platform: "other", web_platform: "mac", fetch_error_background: 1 })
      : JSON.stringify({ pwd_id: pwd_id, passcode: "" });
    const postResponse = await 访问网页(postUrl, 1, postParams, null, "Content-Type: application/json;charset=UTF-8");
    if (postResponse.includes("好友已取消了分享")) {
      return '该网盘已取消了分享$1';
    }
    const postData = JSON.parse(postResponse);
    if (postData.status !== 200 || postData.code !== 0) {
      throw new Error(`Failed to get stoken: ${postData.message}`);
    }
    const stoken = url.includes(".uc.cn")
      ? postData.data.token_info.stoken
      : postData.data.stoken;

    // Step 2: Fetch files from a given pdir_fid
    async function fetchFiles(pdir_fid) {
      let page = 1;
      let allFiles = [];
      while (true) {
        const getUrl = url.includes(".uc.cn")
          ? `https://pc-api.uc.cn/1/clouddrive/share/sharepage/detail?pr=UCBrowser&fr=pc&pwd_id=${pwd_id}&stoken=${encodeURIComponent(stoken)}&pdir_fid=${pdir_fid}&force=0&_page=${page}&_size=50&_fetch_banner=0&_fetch_share=0&_fetch_total=1&_sort=file_type:asc,file_name:asc`
          : `https://drive-h.quark.cn/1/clouddrive/share/sharepage/detail?pr=ucpro&fr=pc&uc_param_str=&pwd_id=${pwd_id}&stoken=${encodeURIComponent(stoken)}&pdir_fid=${pdir_fid}&force=0&_page=${page}&_size=50&_fetch_banner=1&_fetch_share=1&_fetch_total=1&_sort=file_type:asc,updated_at:desc&__dt=494&__t=${Date.now()}`;

        const getResponse = await 访问网页(getUrl, 0);
        const getData = JSON.parse(getResponse);
        if (getData.status !== 200 || getData.code !== 0) {
          throw new Error(`Failed to get file list: ${getData.message}`);
        }
        allFiles = allFiles.concat(getData.data.list);
        // If the list size is less than 50, break the loop
        if (getData.data.list.length < 50) {
          break;
        }
        page++;
      }

      return allFiles;
    }

    // Step 3: Recursively fetch all video files
    async function fetchAllVideos(pdir_fid) {
      const files = await fetchFiles(pdir_fid);
      const videos = [];
      for (const file of files) {
        if (file.obj_category && file.obj_category.startsWith("video")) {
          videos.push({
            file_name: file.file_name,
            size: file.size,
            fid: file.fid,
            pdir_fid: file.pdir_fid,
            share_fid_token: file.share_fid_token
          });
        } else if (file.file_type === 0) {
          // If it's a folder, recursively fetch videos from this folder
          const folderVideos = await fetchAllVideos(file.fid);
          videos.push(...folderVideos);
        }
      }
      return videos;
    }

    // Step 4: Sort videos by file name
    function sortVideos(videos) {
      return videos.sort((a, b) => {
        const extractNumbers = (fileName) => {
          const regex = /(\d+)/g;
          const matches = fileName.match(regex);
          return matches ? matches.map(Number) : [];
        };

        const numsA = extractNumbers(a.file_name);
        const numsB = extractNumbers(b.file_name);

        for (let i = 0; i < Math.max(numsA.length, numsB.length); i++) {
          const numA = numsA[i] || 0;
          const numB = numsB[i] || 0;

          if (numA !== numB) {
            return numA - numB;
          }
        }

        return 0;
      });
    }

    // Step 5: Format file size
    function formatFileSize(size) {
      const mb = size / (1024 * 1024);
      if (mb < 1024) {
        return `${mb.toFixed(2)} M`;
      } else {
        const gb = mb / 1024;
        return `${gb.toFixed(2)} G`;
      }
    }

    // Step 6: Append formatted file size to file name
    function appendFileSize(videos) {
      return videos.map(video => {
        const formattedSize = formatFileSize(video.size);
        return {
          ...video,
          file_name: `${video.file_name} [${formattedSize}]`
        };
      });
    }

    // Step 7: Format the result as specified
    function formatResult(videos, pwd_id, stoken) {
      return videos.map(video => {
        const result = {
          fid_list: [video.fid],
          fid_token_list: [video.share_fid_token],
          fid_size: video.size,
          to_pdir_fid: "暂定",
          pwd_id: pwd_id,
          isQuark: isQuark,
          stoken: stoken,
          pdir_fid: "0",
          scene: "link"
        };
        //return `${video.file_name}#${JSON.stringify(result)}`;
        return `${video.file_name}$${encodeURIComponent(JSON.stringify(result))}`;
      }).join('#');
    }

    // Start fetching from the root directory (pdir_fid=0)
    const allVideos = await fetchAllVideos(0);
    const sortedVideos = sortVideos(allVideos);
    const videosWithSize = appendFileSize(sortedVideos);
    const formattedResult = formatResult(videosWithSize, pwd_id, stoken);
    return formattedResult;

  } catch (error) {
    console.error(error);
    return null;
  }
}



async function homeContent() {
  try {
    const url = `https://tv.yydsys.top/`;
    const html2 = await 访问网页(url);
    const html = 文本_取中间(html2, "最新影片</h2>", "</html>");
    // 使用正则表达式匹配所有的电影项
    const itemRegex = /<div class="module-item">[\s\S]*?<div class="module-item-text">([\s\S]*?)<\/div>[\s\S]*?<\/div>/g;
    const items = html.match(itemRegex) || [];

    // 使用 Set 去重
    const uniqueItems = new Set();
    const filteredItems = items.filter(item => {
      const vod_link = item.match(/<a href="([^"]+)"/)?.[1] || '';
      if (!uniqueItems.has(vod_link)) {
        uniqueItems.add(vod_link);
        return true;
      }
      return false;
    });
    const list = filteredItems.map((item) => {
      const vod_name = item.match(/title="([^"]+)"/)?.[1].trim() || '';
      const vod_pic = item.match(/data-src="([^"]+)"/)?.[1] || '';
      const vod_link = item.match(/<a href="([^"]+)"/)?.[1] || '';
      const vod_remarks = item.match(/<div class="module-item-text">(.*?)<\/div>/)?.[1].trim() || '';
      return {
        vod_id: vod_link,
        vod_name: vod_name,
        vod_remarks: vod_remarks,
        vod_pic: vod_pic
      };
    });

    // 定义分类数据
    const classData = [
      { "type_id": 1,  "type_name": "多多电影" },
      { "type_id": 2,  "type_name": "多多剧集" },
      { "type_id": 5,  "type_name": "短剧" },
      { "type_id": 4,  "type_name": "动漫" },
      { "type_id": 3, "type_name": "综艺" },
      { "type_id": 20, "type_name": "纪录" }
    ];

    // 定义分类数据
    const filterData = {
      "1": [
        {
          "key": "class",
          "name": "剧情",
          "value": [
            { "n": "全部", "v": "" },
            { "n": "动作", "v": "动作" },
            { "n": "喜剧", "v": "喜剧" },
            { "n": "爱情", "v": "爱情" },
            { "n": "科幻", "v": "科幻" },
            { "n": "恐怖", "v": "恐怖" },
            { "n": "剧情", "v": "剧情" },
            { "n": "战争", "v": "战争" },
            { "n": "警匪", "v": "警匪" },
            { "n": "古装", "v": "古装" },
            { "n": "奇幻", "v": "奇幻" },
            { "n": "犯罪", "v": "犯罪" },
            { "n": "武侠", "v": "武侠" },
            { "n": "冒险", "v": "冒险" },
            { "n": "枪战", "v": "枪战" },
            { "n": "悬疑", "v": "悬疑" },
            { "n": "惊悚", "v": "惊悚" },
            { "n": "历史", "v": "历史" }
          ]
        },
        {
          "key": "area",
          "name": "地区",
          "value": [
            { "n": "全部", "v": "" },
            { "n": "大陆", "v": "大陆" },
            { "n": "香港", "v": "香港" },
            { "n": "台湾", "v": "台湾" },
            { "n": "美国", "v": "美国" },
            { "n": "韩国", "v": "韩国" },
            { "n": "英国", "v": "英国" },
            { "n": "日本", "v": "日本" },
            { "n": "泰国", "v": "泰国" },
            { "n": "印度", "v": "印度" },
            { "n": "法国", "v": "法国" },
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
            { "n": "2010", "v": "2010" }
          ]
        },
        {
          "key": "by",
          "name": "排序",
          "value": [
            { "n": "时间", "v": "" },
            { "n": "人气", "v": "hits" },
            { "n": "评分", "v": "score" }
          ]
        }
      ],
      "2": [
        {
          "key": "class",
          "name": "剧情",
          "value": [
            { "n": "全部", "v": "" },
            { "n": "古装", "v": "古装" },
            { "n": "战争", "v": "战争" },
            { "n": "青春偶像", "v": "青春偶像" },
            { "n": "喜剧", "v": "喜剧" },
            { "n": "家庭", "v": "家庭" },
            { "n": "犯罪", "v": "犯罪" },
            { "n": "动作", "v": "动作" },
            { "n": "奇幻", "v": "奇幻" },
            { "n": "剧情", "v": "剧情" },
            { "n": "历史", "v": "历史" },
            { "n": "经典", "v": "经典" },
            { "n": "乡村", "v": "乡村" },
            { "n": "情景", "v": "情景" },
            { "n": "商战", "v": "商战" },
            { "n": "网剧", "v": "网剧" },
            { "n": "其他", "v": "其他" }
          ]
        },
        {
          "key": "area",
          "name": "地区",
          "value": [
            { "n": "全部", "v": "" },
            { "n": "中国大陆", "v": "中国大陆" },
            { "n": "大陆", "v": "大陆" },
            { "n": "内地", "v": "内地" },
            { "n": "韩国", "v": "韩国" },
            { "n": "香港", "v": "香港" },
            { "n": "台湾", "v": "台湾" },
            { "n": "日本", "v": "日本" },
            { "n": "美国", "v": "美国" },
            { "n": "泰国", "v": "泰国" },
            { "n": "英国", "v": "英国" },
            { "n": "新加坡", "v": "新加坡" },
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
            { "n": "2010", "v": "2010" }
          ]
        },
        {
          "key": "by",
          "name": "排序",
          "value": [
            { "n": "时间", "v": "" },
            { "n": "人气", "v": "hits" },
            { "n": "评分", "v": "score" }
          ]
        }
      ],
      "3": [
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
            { "n": "2010", "v": "2010" }
          ]
        },
        {
          "key": "by",
          "name": "排序",
          "value": [
            { "n": "时间", "v": "" },
            { "n": "人气", "v": "hits" },
            { "n": "评分", "v": "score" }
          ]
        }
      ],
      "4": [
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
            { "n": "2010", "v": "2010" }
          ]
        },
        {
          "key": "by",
          "name": "排序",
          "value": [
            { "n": "时间", "v": "" },
            { "n": "人气", "v": "hits" },
            { "n": "评分", "v": "score" }
          ]
        }
      ],
      "20": [
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
            { "n": "2010", "v": "2010" }
          ]
        },
        {
          "key": "by",
          "name": "排序",
          "value": [
            { "n": "时间", "v": "" },
            { "n": "人气", "v": "hits" },
            { "n": "评分", "v": "score" }
          ]
        }
      ],
      "21": [
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
            { "n": "2010", "v": "2010" }
          ]
        },
        {
          "key": "by",
          "name": "排序",
          "value": [
            { "n": "时间", "v": "" },
            { "n": "人气", "v": "hits" },
            { "n": "评分", "v": "score" }
          ]
        }
      ],
      "22": [
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
            { "n": "2010", "v": "2010" }
          ]
        },
        {
          "key": "by",
          "name": "排序",
          "value": [
            { "n": "时间", "v": "" },
            { "n": "人气", "v": "hits" },
            { "n": "评分", "v": "score" }
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
        const url = `https://tv.yydsys.top/index.php/vod/search.html?wd=${encodedKeyword}`;
        const html = await 访问网页(url);
        const items = 文本_取中间_批量(html,'<div class="module-search-item">','<div class="video-info-footer">');
        const list = items.map((item) => {
            const vod_name = 文本_取中间( 文本_取中间(item,'<a class="video-serial"','/a>'),'title="','"') || '';
            const vod_pic = 文本_取中间(item,'data-src="','"') || '';
            const vod_id = 文本_取中间( 文本_取中间(item,'<a class="video-serial"','/a>'),'href="','"') || '';
            const vod_remarks = 文本_取中间( 文本_取中间(item,'<a class="video-serial"','/a>'),'">','<') || '';
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
//    console.log(data);
//});

async function test() {
    return "hello world";
}
//homeContent()
//  .then(data => console.log(data))
//  .catch(error => console.error('Error:', error));

//获取影视分类列表
async function categoryContent(tid, pg = 1, extend) {
  try {
    // 解析 extend 参数
    let extendObj = extend ? JSON.parse(extend) : null;
    let url = `https://tv.yydsys.top/index.php/vod/show/area/{area}/class/{class}/by/{by}/id/${tid}/year/{year}/page/${pg}.html`;
    // 替换 URL 中的占位符
    if (extendObj) {
      for (const [key, value] of Object.entries(extendObj)) {
          if(value){
        const placeholder = `{${key}}`;
        const encodedValue = encodeURIComponent(value || ''); // 对 value 进行 URL 编码
      // 如果 value 不为空，替换占位符
      url = url.replace(new RegExp(placeholder, 'g'), encodedValue); 
          }
      }
    }
    // 删除剩余的 {} 包围的占位符
    url = url.replace(/\/[a-zA-Z]+\/\{[a-zA-Z]+\}/g, '');
    console.log(url);
    const html = await 访问网页(url);
    // 使用正则表达式匹配所有的电影项
    const itemRegex = /<div class="module-item">[\s\S]*?<div class="module-item-text">([\s\S]*?)<\/div>[\s\S]*?<\/div>/g;
    const items = html.match(itemRegex) || [];
    const list = items.map((item) => {
      console.log(item);
      const vod_name = item.match(/title="([^"]+)"/)?.[1].trim() || '';
      const vod_pic = item.match(/data-src="([^"]+)"/)?.[1] || '';
      const vod_link = item.match(/<a href="([^"]+)"/)?.[1] || '';
      const vod_remarks = item.match(/<div class="module-item-text">(.*?)<\/div>/)?.[1].trim() || '';
      return {
        vod_id: vod_link,
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
//categoryContent('2',2)
//  .then(data => console.log(data))
//  .catch(error => console.error('Error:', error));

//获取影视详情信息
async function detailContent(ids) {
  const url = `https://tv.yydsys.top${ids}`;
  try {
    //console.log(url);
    const html = await 访问网页(url);
    // 使用正则表达式提取信息
    const vod_id = ids;
    const vod_name = html.match(/<h1 class="page-title">(.*?)<\/h1>/)[1] || '未知片名';
        //console.log(vod_name);
    const vod_year = 文本_取中间(文本_取中间(html, '年代：</span>', '/a>'), '_blank">', '<') || '';
    //console.log(vod_year);
    const vod_director = 移除html代码(html.match(/<div class="video-info-items"><span class="video-info-itemtitle">导演：<\/span>([\s\S]*?)<\/div>/)[1].trim()) || '未知';
     //console.log(vod_director);
    const vod_actor = 移除html代码(html.match(/<div class="video-info-items"><span class="video-info-itemtitle">主演：<\/span>([\s\S]*?)<\/div>/)[1].trim()) || '未知';
    //console.log(vod_actor);
    const vod_pic = html.match(/<img class="lazyload" data-src="(.*?)"/)[1] || '';
    //console.log(vod_pic);
    let vod_remarks='';
    if(html.indexOf('备注：</span>') !== -1){
    vod_remarks = 文本_取中间(文本_取中间(html, '备注：</span>', '/div>'), 'info-item">', '<') || '';
    }else if(html.indexOf('集数：</span>') !== -1){
        vod_remarks = 文本_取中间(文本_取中间(html, '集数：</span>', '/div>'), 'info-item">', '<') || '';
    }
     //console.log(vod_remarks);
    const vod_content = 移除html代码(文本_取中间(html, '<p class="sqjj_a" style="display: none;">', '<span class="sq_jj red">')) || '暂无剧情';
    //console.log(vod_content);
    const cloudLinks = html.match(/<a class="btn-pc btn-down" href="(.*?)"/g).map(link => link.replace(/<a class="btn-pc btn-down" href="/, '').replace(/" title=".*?">/g, '')) || [];
    //console.log(cloudLinks);
    // 初始化 vod_play_from 和 vod_play_url
    let vod_play_from = [];
    let vod_play_url = [];
    // 记录云盘名称的使用次数
    const cloudNameCount = {};
for (let i = 0; i < cloudLinks.length; i++) {
  const link = cloudLinks[i];
  if (link.includes('uc.cn') || link.includes('quark.cn')) {
    const result = await fetchVideoFiles(link); // 所有播放链接对应 vod_play_url
    
    if (result) { // 检查 result 是否为空
      const baseCloudName = link.includes('uc.cn') ? 'UC网盘' : '夸克网盘'; // 对应 vod_play_from

      // 检查云盘名称是否已经使用过
      if (cloudNameCount[baseCloudName] === undefined) {
        cloudNameCount[baseCloudName] = 1;
        vod_play_from.push(baseCloudName);
      } else {
        cloudNameCount[baseCloudName]++;
        vod_play_from.push(`${baseCloudName}${cloudNameCount[baseCloudName]}`);
      }

      vod_play_url.push(result);
    }
  }
}
    // 将提取的信息组织成一个对象
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
        vod_remarks: vod_remarks,
        vod_year: vod_year,
        vod_content: vod_content,
        vod_play_from: vod_play_from.join('$$$'),
        vod_play_url: vod_play_url.join('$$$')
      }]
    };

    // 处理 vod_play_from 和 vod_play_url
    const playFromList = movieDetails.list[0].vod_play_from.split('$$$');
    const playUrlList = movieDetails.list[0].vod_play_url.split('$$$');

    const filteredPlayFromList = [];
    const filteredPlayUrlList = [];

    for (let i = 0; i < playUrlList.length; i++) {
      if (!playUrlList[i].includes('该网盘已取消了分享')) {
        filteredPlayFromList.push(playFromList[i]);
        filteredPlayUrlList.push(playUrlList[i]);
      }
    }

    movieDetails.list[0].vod_play_from = filteredPlayFromList.join('$$$');
    movieDetails.list[0].vod_play_url = filteredPlayUrlList.join('$$$');

    // 返回 JSON 字符串
    console.log(JSON.stringify(movieDetails));
    return JSON.stringify(movieDetails);
  } catch (error) {
    console.error('Error fetching movie details:', error);
    return JSON.stringify({ code: 0, msg: "获取数据失败", error: error.message });
  }
}

//detailContent('/voddetail/85273.html')
 // .then(data => console.log(data))
//  .catch(error => console.error('Error:', error));




