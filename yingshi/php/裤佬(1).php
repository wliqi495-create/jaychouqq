<?php
error_reporting(0);
require_once __DIR__ . '/lib/spider.php';

class Spider extends BaseSpider {
    private const SOURCES = [
       's1' => ['name' => '🔞滴滴', 'api' => 'https://api.ddapi.cc/api.php/provide/vod'],
's2' => ['name' => '🔞鸡坤', 'api' => 'https://jkunzyapi.com/api.php/provide/vod'],
's3' => ['name' => '🔞TG资源', 'api' => 'https://tgzyz.pp.ua/api.php/provide/vod'],
's4' => ['name' => '🔞越南', 'api' => 'https://vnzyz.com/api.php/provide/vod'],
's5' => ['name' => '🔞奥斯卡', 'api' => 'https://aosikazy4.com/api.php/provide/vod'],
's6' => ['name' => '🔞X细胞', 'api' => 'https://www.xxibaozyw.com/api.php/provide/vod'],
's7' => ['name' => '🔞大奶子', 'api' => 'https://apidanaizi.com/api.php/provide/vod'],
's8' => ['name' => '🔞精品X', 'api' => 'https://www.jingpinx.com/api.php/provide/vod'],
's9' => ['name' => '🔞老色p', 'api' => 'https://apilsbzy1.com/api.php/provide/vod'],
's10' => ['name' => '🔞番号', 'api' => 'http://fhapi9.com/api.php/provide/vod'],
's11' => ['name' => '🔞黄色仓库', 'api' => 'https://hsckzy888.com/api.php/provide/vod/from/hsckm3u8/at/json'],
's12' => ['name' => '🔞百花', 'api' => 'https://bhziyuan.com/api.php/provide/vod/'],
's13' => ['name' => '🔞辣椒', 'api' => 'https://apilj.com/api.php/provide/vod'],
's14' => ['name' => '🔞155', 'api' => 'https://155api.com/api.php/provide/vod'],
's15' => ['name' => '🔞杏吧', 'api' => 'https://xingba111.com/api.php/provide/vod/'],
's16' => ['name' => '🔞玉兔', 'api' => 'https://apiyutu.com/api.php/provide/vod'],
's17' => ['name' => '🔞AIvin', 'api' => 'http://lbapiby.com/api.php/provide/vod/at/json'],
's18' => ['name' => '🔞乐播', 'api' => 'https://lbapi9.com/api.php/provide/vod'],
's19' => ['name' => '🔞奶香香', 'api' => 'https://naixxzy.com/api.php/provide/vod'],
's20' => ['name' => '🔞森林', 'api' => 'https://slapibf.com/api.php/provide/vod'],
's21' => ['name' => '🔞番茄', 'api' => 'https://fqzy.me//api.php/provide/vod/'],
's22' => ['name' => '🔞鲨鱼', 'api' => 'https://shayuapi.com/api.php/provide/vod'],
's23' => ['name' => '🔞91麻豆', 'api' => 'http://91md.me/api.php/provide/vod'],
's24' => ['name' => '🔞CK百货', 'api' => 'https://ckbh1.xyz/api.php/provide/vod/'],
's25' => ['name' => '🔞桃花', 'api' => 'https://thzy1.me/api.php/provide/vod/'],
's26' => ['name' => '🔞豆豆', 'api' => 'https://doudouzy.com/api.php/provide/vod/'],
's27' => ['name' => '🔞色猫', 'api' => 'https://api.maozyapi.com/inc/apijson_vod.php'],
's28' => ['name' => '🔞黑料X', 'api' => 'https://www.heiliaozyapi.com/api.php/provide/vod/'],
's29' => ['name' => '🔞香蕉', 'api' => 'https://www.xiangjiaozyw.com/api.php/provide/vod/'],
's30' => ['name' => '🔞百万', 'api' => 'https://api.bwzyz.com/api.php/provide/vod/at/json'],
's31' => ['name' => '🔞souav', 'api' => 'https://api.souavzy.vip/api.php/provide/vod'],
's32' => ['name' => '🔞淫水机', 'api' => 'https://www.xrbsp.com/api/json.php'],
's33' => ['name' => '🔞白嫖', 'api' => 'https://www.kxgav.com/api/json.php'],
's34' => ['name' => '🔞美少女', 'api' => 'https://www.msnii.com/api/json.php'],
's35' => ['name' => '🔞色南国', 'api' => 'https://api.sexnguon.com/api.php/provide/vod'],
's36' => ['name' => '🔞香奶儿', 'api' => 'https://www.gdlsp.com/api/json.php'],
's37' => ['name' => '🔞黄AV', 'api' => 'https://www.pgxdy.com/api/json.php'],
's38' => ['name' => '🇹极速', 'api' => 'https://jszyapi.com/api.php/provide/vod'],
's39' => ['name' => '📺红牛3', 'api' => 'https://www.hongniuzy3.com/api.php/provide/vod'],
's40' => ['name' => '🌊海洋', 'api' => 'http://www.seacms.org/api.php/provide/vod']

    ];

    public function getName() { return "影视+专属全网聚合"; }
    public function init($extend = "") {}

    private function buildUrl($url, $query) {
        return strpos($url, '?') !== false ? $url . '&' . $query : $url . '?' . $query;
    }

    private function setCurlOpts($ch, $url, $timeout = 10) {
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_ENCODING, '');
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
        curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');
    }

    private function cleanItem($item, $sourceKey, $sourceName, $isDetail = false) {
        if (!$isDetail) {
            $item['vod_id'] = $sourceKey . '@@' . $item['vod_id'];
        }
        $item['vod_remarks'] = $sourceName . " | " . ($item['vod_remarks'] ?? '');

        if (!empty($item['vod_play_from'])) {
            $froms = explode('$$$', $item['vod_play_from']);
            foreach ($froms as &$f) {
                $f = $sourceName . '-' . $f; 
            }
            $item['vod_play_from'] = implode('$$$', $froms);
        }

        unset($item['vod_down_from']);
        unset($item['vod_down_url']);
        return $item;
    }

    public function homeContent($filter = []) {
        $classes = [];
        $filters = [];
        $mh = curl_multi_init();
        $ch_list = [];
        
        foreach (self::SOURCES as $key => $source) {
            $classes[] = ['type_id' => $key, 'type_name' => $source['name']];
            $ch = curl_init();
            $this->setCurlOpts($ch, $this->buildUrl($source['api'], "ac=list"), 4);
            curl_multi_add_handle($mh, $ch);
            $ch_list[$key] = $ch;
        }

        $active = null;
        do { $mrc = curl_multi_exec($mh, $active); } while ($mrc == CURLM_CALL_MULTI_PERFORM);
        while ($active && $mrc == CURLM_OK) {
            if (curl_multi_select($mh) != -1) {
                do { $mrc = curl_multi_exec($mh, $active); } while ($mrc == CURLM_CALL_MULTI_PERFORM);
            }
        }

        foreach ($ch_list as $key => $ch) {
            $response = curl_multi_getcontent($ch);
            curl_multi_remove_handle($mh, $ch);
            curl_close($ch);
            
            $res = json_decode($response, true);
            $filterValues = [['n' => '全部(最新)', 'v' => '']];
            
            if (isset($res['class'])) {
                foreach ($res['class'] as $c) {
                    $filterValues[] = ['n' => $c['type_name'], 'v' => $c['type_id']];
                }
            }
            $filters[$key] = [['key' => 'cateId', 'name' => '分类', 'value' => $filterValues]];
        }
        curl_multi_close($mh);
        return ['class' => $classes, 'filters' => $filters, 'list' => []];
    }

    public function categoryContent($tid, $pg = 1, $filter = [], $extend = []) {
        if (!isset(self::SOURCES[$tid])) return ['list' => []];
        $source = self::SOURCES[$tid];
        if (!is_array($extend)) $extend = [];
        $realTid = isset($extend['cateId']) ? $extend['cateId'] : '';
        
        $query = "ac=detail&pg={$pg}";
        if ($realTid !== '') $query .= "&t={$realTid}";
        
        $ch = curl_init();
        $this->setCurlOpts($ch, $this->buildUrl($source['api'], $query), 10);
        $html = curl_exec($ch);
        curl_close($ch);
        
        $res = json_decode($html, true);
        $list = [];
        if (isset($res['list'])) {
            foreach ($res['list'] as $item) {
                $list[] = $this->cleanItem($item, $tid, $source['name'], false);
            }
        }
        return ['list' => $list, 'page' => $res['page'] ?? $pg, 'pagecount' => $res['pagecount'] ?? 0, 'limit' => $res['limit'] ?? 20, 'total' => $res['total'] ?? 0];
    }

    public function detailContent($ids) {
        $id = is_array($ids) ? $ids[0] : $ids;
        if (strpos($id, '@@') === false) return ['list' => []];
        
        list($sourceKey, $realId) = explode('@@', $id);
        if (!isset(self::SOURCES[$sourceKey])) return ['list' => []];

        $source = self::SOURCES[$sourceKey];
        $ch = curl_init();
        $this->setCurlOpts($ch, $this->buildUrl($source['api'], "ac=detail&ids={$realId}"), 10);
        $html = curl_exec($ch);
        curl_close($ch);

        $res = json_decode($html, true);
        $list = [];
        if (isset($res['list'])) {
            foreach ($res['list'] as $item) {
                $cleaned = $this->cleanItem($item, $sourceKey, $source['name'], true);
                $cleaned['vod_id'] = $id;
                $list[] = $cleaned;
            }
        }
        return ['list' => $list];
    }

    public function searchContent($key, $quick = false, $pg = 1) {
        $keyword = urlencode($key);
        $list = [];
        $maxPageCount = 0;
        
        $mh = curl_multi_init();
        $ch_list = [];
        foreach (self::SOURCES as $sourceKey => $source) {
            $ch = curl_init();
            $this->setCurlOpts($ch, $this->buildUrl($source['api'], "ac=detail&wd={$keyword}&pg={$pg}"), 6);
            curl_multi_add_handle($mh, $ch);
            $ch_list[$sourceKey] = $ch;
        }

        $active = null;
        do { $mrc = curl_multi_exec($mh, $active); } while ($mrc == CURLM_CALL_MULTI_PERFORM);
        while ($active && $mrc == CURLM_OK) {
            if (curl_multi_select($mh) != -1) {
                do { $mrc = curl_multi_exec($mh, $active); } while ($mrc == CURLM_CALL_MULTI_PERFORM);
            }
        }

        foreach ($ch_list as $sourceKey => $ch) {
            $response = curl_multi_getcontent($ch);
            curl_multi_remove_handle($mh, $ch);
            curl_close($ch);
            
            $source = self::SOURCES[$sourceKey];
            $res = json_decode($response, true);
            if (isset($res['list'])) {
                foreach ($res['list'] as $item) {
                    $list[] = $this->cleanItem($item, $sourceKey, $source['name'], false);
                }
                if (isset($res['pagecount']) && $res['pagecount'] > $maxPageCount) {
                    $maxPageCount = $res['pagecount'];
                }
            }
        }
        curl_multi_close($mh);
        return ['list' => $list, 'page' => $pg, 'pagecount' => $maxPageCount ?: $pg, 'limit' => 40, 'total' => 9999];
    }

    public function playerContent($flag, $id, $vipFlags = []) {
        return [
            "parse" => 0, 
            "url" => $id,
            "header" => [
                "User-Agent" => "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
            ]
        ];
    }
}

(new Spider())->run();
