import req from '../../util/req.js';
import { load } from 'cheerio';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0';
const SITE = 'https://rou.video';

async function request(reqUrl) {
  const resp = await req.get(reqUrl, {
    headers: {
      'User-Agent': UA,
    },
  });
  return resp.data;
}

async function home(_inReq, _outResp) {
  let classes = [
    { type_id: 'https://rou.video/v', type_name: '全部' },
    { type_id: 'https://rou.video/t/國產AV', type_name: '國產' },
    { type_id: 'https://rou.video/t/探花', type_name: '探花' },
    { type_id: 'https://rou.video/t/自拍流出', type_name: '自拍' },
    { type_id: 'https://rou.video/t/OnlyFans', type_name: 'OnlyFans' },
    { type_id: 'https://rou.video/t/日本', type_name: '日本' },
  ];
  return {
    class: classes,
  };
}

async function category(inReq, _outResp) {
  const tid = inReq.body.id;
  const pg = inReq.body.page;
  // const extend = inReq.body.filters;
  let page = pg || 1;
  if (page == 0) page = 1;

  let reqUrl = tid;
  if (page > 1) {
    reqUrl += `?order=createdAt&page=${page}`;
  }

  const html = await request(reqUrl);
  const $ = load(html);
  let videos = [];
  $('.grid.grid-cols-2.mb-6 > div').each((_, element) => {
    if ($(element).find('.relative').length == 0) return;
    const href = $(element).find('.relative a').attr('href');
    const vodName = $(element).find('img:last').attr('alt');
    const vodPic = $(element).find('img').attr('src');
    const subTitle = $(element).find('.relative a > div:eq(1)').text();
    const hdinfo = $(element).find('.relative a > div:first').text();
    videos.push({
      vod_id: SITE + href,
      vod_name: vodName,
      vod_pic: vodPic,
      vod_remarks: subTitle || hdinfo,
    });
  });

  return {
    page: page,
    pagecount: videos.length < 12 ? page : page + 1,
    list: videos,
    // filter logic placeholder
    filter: [],
  };
}

async function detail(inReq, _outResp) {
  const id = inReq.body.id;
  // 获取播放链接
  const html = await request(id, {
    headers: {
      'User-Agent': UA,
    },
  });

  let playUrl = null;
  const evMatch = html.match(/"ev"\s*:\s*(\{[\s\S]*?"d"\s*:\s*"[^"]+"\s*,\s*"k"\s*:\s*\d+[\s\S]*?\})/);
  if (evMatch) {
    try {
      const ev = JSON.parse(evMatch[1]);
      const decoded = Buffer.from(ev.d, 'base64');
      const bytes = decoded.map((b) => (b - ev.k + 256) % 256);
      const evData = JSON.parse(Buffer.from(bytes).toString('utf8'));
      playUrl = evData.videoUrl || null;
    } catch (_) {
      playUrl = null;
    }
  }
  let vod = {
    vod_id: id,
    vod_name: '',
    vod_pic: '',
    vod_play_from: '肉视频',
    vod_play_url: '播放$' + playUrl,
  };

  return {
    list: [vod],
  };
}

async function play(inReq, _outResp) {
  const flag = inReq.body.flag;
  const id = inReq.body.id;
  // 将 .jpg 替换为 .m3u8
  const playUrl = id.replace('.jpg', '.m3u8');

  return {
    parse: 0,
    url: playUrl,
    header: {
      'User-Agent': UA,
    },
  };
}

async function search(inReq, _outResp) {
  const pg = inReq.body.page;
  const wd = inReq.body.wd;
  let page = pg || 1;
  if (page == 0) page = 1;
  const text = encodeURIComponent(wd);
  const html = await request(`${SITE}/search?q=${text}&t=&page=${page}`);
  const $ = load(html);
  let videos = [];
  $('.grid.grid-cols-2.mb-6 > div').each((_, element) => {
    if ($(element).find('.relative').length == 0) return;
    const href = $(element).find('.relative a').attr('href');
    const vodName = $(element).find('img:last').attr('alt');
    const vodPic = $(element).find('img').attr('src');
    const subTitle = $(element).find('.relative a > div:eq(1)').text();
    const hdinfo = $(element).find('.relative a > div:first').text();
    videos.push({
      vod_id: SITE + href,
      vod_name: vodName,
      vod_pic: vodPic,
      vod_remarks: subTitle || hdinfo,
    });
  });
  return {
    page: page,
    pagecount: videos.length < 12 ? page : page + 1,
    list: videos,
  };
}

export default {
  meta: {
    key: 'rou',
    name: '肉视频',
    type: 3,
  },
  api: async (fastify) => {
    fastify.post('/init', async () => ({}));
    fastify.post('/home', home);
    fastify.post('/category', category);
    fastify.post('/detail', detail);
    fastify.post('/play', play);
    fastify.post('/search', search);
  },
};
