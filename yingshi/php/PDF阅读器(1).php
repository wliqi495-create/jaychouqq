<?php
// PDF阅读器.php - 全屏沉浸版：12静态主题 + 护眼主题 + 12动态主题 + 3D悬浮书架 + 酷炫加载动画
header("Content-Type: text/html; charset=utf-8");
$baseDir = 'PDF';

if (!is_dir($baseDir)) { 
    mkdir($baseDir); 
    echo "已自动创建 PDF 目录，请放入PDF/EPUB/TXT"; 
    exit; 
}

function scanDirectory($path) {
    $result = [];
    if (!is_dir($path)) return $result;
    $handle = opendir($path);
    if ($handle) {
        while (false !== ($entry = readdir($handle))) {
            if ($entry != '.' && $entry != '..') {
                if ($entry == '.epub_cache' || $entry == '.txt_cache') continue;
                if (strpos($entry, '.') === 0) continue;
                $result[] = $path . '/' . $entry;
            }
        }
        closedir($handle);
    }
    natsort($result);
    return $result;
}

function scanImages($path) {
    $images = [];
    $extensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    if (!is_dir($path)) return $images;
    $handle = opendir($path);
    if ($handle) {
        while (false !== ($entry = readdir($handle))) {
            if ($entry != '.' && $entry != '..') {
                $ext = strtolower(pathinfo($entry, PATHINFO_EXTENSION));
                if (in_array($ext, $extensions)) $images[] = $path . '/' . $entry;
            }
        }
        closedir($handle);
    }
    natsort($images);
    return array_values($images);
}

function parseTxtFile($txtPath, $book, $chapter, $baseDir) {
    $cacheDir = $baseDir . '/.txt_cache/' . $book . '/' . md5($chapter);
    $cacheFile = $cacheDir . '/chapters.json';
    if (file_exists($cacheFile)) {
        $data = json_decode(file_get_contents($cacheFile), true);
        if ($data && isset($data['chapters'])) return $data;
    }
    $content = file_get_contents($txtPath);
    $encoding = mb_detect_encoding($content, ['UTF-8', 'GBK', 'GB2312', 'BIG5'], true);
    if (!$encoding) $encoding = 'UTF-8';
    $content = mb_convert_encoding($content, 'UTF-8', $encoding);
    $patterns = [
        '/第[零〇一二三四五六七八九十百千万\d]+章[\s]*[^\n]*/u',
        '/第[零〇一二三四五六七八九十百千万\d]+节[\s]*[^\n]*/u',
        '/第[零〇一二三四五六七八九十百千万\d]+卷[\s]*[^\n]*/u',
        '/(?:Chapter|CHAPTER|Ch\.?)\s*\d+[.:\s]*[^\n]*/i',
        '/\[\d+\][\s]*[^\n]*/',
        '/(?:一|二|三|四|五|六|七|八|九|十)、[\s]*[^\n]*/u',
    ];
    $lines = preg_split('/\r\n|\r|\n/', $content);
    $chapters = [];
    $currentChapter = ['title' => '序章', 'content' => ''];
    $foundFirstChapter = false;
    foreach ($lines as $line) {
        $line = rtrim($line);
        $isChapter = false; $chapterTitle = '';
        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $line, $matches)) {
                $chapterTitle = trim($matches[0]);
                $isChapter = true;
                break;
            }
        }
        if ($isChapter && $chapterTitle) {
            if ($foundFirstChapter && $currentChapter['content'] !== '') $chapters[] = $currentChapter;
            $currentChapter = ['title' => $chapterTitle, 'content' => ''];
            $foundFirstChapter = true;
        } else {
            if ($line !== '' || $currentChapter['content'] !== '') $currentChapter['content'] .= $line . "\n";
        }
    }
    if ($currentChapter['content'] !== '') $chapters[] = $currentChapter;
    if (empty($chapters)) $chapters = [['title' => basename($chapter, '.txt'), 'content' => $content]];
    foreach ($chapters as &$chap) {
        $chap['content'] = preg_replace('/\n\s*\n/', "</p><p>", $chap['content']);
        $chap['content'] = "<p>" . str_replace("\n", "<br>", $chap['content']) . "</p>";
        $chap['content'] = preg_replace('/<p>\s*<\/p>/', '', $chap['content']);
    }
    if (!is_dir($cacheDir)) mkdir($cacheDir, 0777, true);
    $result = ['type' => 'txt', 'chapters' => $chapters, 'totalChapters' => count($chapters)];
    file_put_contents($cacheFile, json_encode($result, JSON_UNESCAPED_UNICODE));
    return $result;
}

function parseEpub($epubFilePath, $book, $chapter, $baseDir) {
    $cacheDir = $baseDir . '/.epub_cache/' . $book . '/' . md5($chapter);
    $cacheTypeFile = $cacheDir . '/type.json';
    if (file_exists($cacheTypeFile)) {
        $cached = json_decode(file_get_contents($cacheTypeFile), true);
        if ($cached && isset($cached['type'])) {
            if (($cached['type'] == 'comic' || $cached['type'] == 'ebook') && isset($cached['data'])) return $cached;
            if ($cached['type'] == 'comic' && isset($cached['images'])) return $cached;
            if ($cached['type'] == 'ebook' && isset($cached['htmlContents'])) return $cached;
        }
    }
    if (!class_exists('ZipArchive')) return ['error' => '请启用ZipArchive扩展'];
    $zip = new ZipArchive();
    if ($zip->open($epubFilePath) !== true) return ['error' => '无法打开EPUB文件'];
    $container = $zip->getFromName('META-INF/container.xml');
    if (!$container) { $zip->close(); return ['error' => '无效的EPUB文件']; }
    $rootFile = '';
    if (preg_match('/full-path="([^"]+)"/', $container, $matches)) $rootFile = $matches[1];
    if (!$rootFile) { $zip->close(); return ['error' => '无法解析EPUB结构']; }
    $opfContent = $zip->getFromName($rootFile);
    if (!$opfContent) { $zip->close(); return ['error' => '无法解析OPF文件']; }
    $opfDir = dirname($rootFile);
    if ($opfDir == '.') $opfDir = '';
    else $opfDir .= '/';
    $manifest = [];
    preg_match_all('/<item[^>]*id="([^"]*)"[^>]*href="([^"]*)"[^>]*>/i', $opfContent, $items);
    foreach ($items[1] as $i => $id) $manifest[$id] = $opfDir . $items[2][$i];
    $spineOrder = [];
    preg_match_all('/<itemref[^>]*idref="([^"]+)"/i', $opfContent, $spineMatches);
    if (!empty($spineMatches[1])) $spineOrder = $spineMatches[1];
    $allImages = []; $htmlContents = []; $cssContent = '';
    preg_match_all('/<item[^>]*href="([^"]+\.css)"[^>]*media-type="text\/css"[^>]*>/i', $opfContent, $cssMatches);
    foreach ($cssMatches[1] as $cssPath) {
        $fullPath = $opfDir . $cssPath;
        $cssData = $zip->getFromName($fullPath);
        if ($cssData !== false) $cssContent .= $cssData . "\n";
    }
    foreach ($spineOrder as $idref) {
        if (!isset($manifest[$idref])) continue;
        $filePath = $manifest[$idref];
        $content = $zip->getFromName($filePath);
        if ($content === false) continue;
        preg_match_all('/<img[^>]*src=["\']([^"\']+)["\']/i', $content, $imgMatches);
        $pageImages = [];
        foreach ($imgMatches[1] as $src) {
            $imgPath = dirname($filePath) . '/' . $src;
            $imgPath = preg_replace('#/\./#', '/', $imgPath);
            while (strpos($imgPath, '../') !== false) $imgPath = preg_replace('#[^/]+/\.\./#', '', $imgPath, 1);
            if (!in_array($imgPath, $allImages)) { $allImages[] = $imgPath; $pageImages[] = $imgPath; }
        }
        $title = '';
        if (preg_match('/<title[^>]*>([^<]+)<\/title>/i', $content, $titleMatch)) $title = trim($titleMatch[1]);
        if (!$title) {
            if (preg_match('/<h1[^>]*>([^<]+)<\/h1>/i', $content, $h1Match)) $title = trim($h1Match[1]);
            else $title = '第 ' . (count($htmlContents) + 1) . ' 章';
        }
        if (preg_match('/<body[^>]*>([\s\S]*?)<\/body>/i', $content, $bodyMatch)) $bodyContent = $bodyMatch[1];
        else $bodyContent = $content;
        $htmlContents[] = ['title' => $title, 'content' => $bodyContent, 'images' => $pageImages, 'index' => count($htmlContents)];
    }
    $totalItems = count($spineOrder);
    $totalImages = count($allImages);
    $isComic = false;
    if ($totalImages == 0) $isComic = false;
    else if ($totalItems == 0) $isComic = true;
    else {
        $totalTextLength = 0; $pagesWithLittleText = 0; $pagesWithManyImages = 0;
        foreach ($htmlContents as $chapter) {
            $plainText = strip_tags($chapter['content']);
            $textLength = mb_strlen($plainText);
            $totalTextLength += $textLength;
            $imageCount = count($chapter['images']);
            if ($textLength < 300) $pagesWithLittleText++;
            if ($imageCount > 2) $pagesWithManyImages++;
        }
        $avgTextLength = $totalTextLength / max($totalItems, 1);
        $littleTextRatio = $pagesWithLittleText / max($totalItems, 1);
        $manyImagesRatio = $pagesWithManyImages / max($totalItems, 1);
        if ($avgTextLength < 500 || $littleTextRatio > 0.3 || $manyImagesRatio > 0.3) $isComic = true;
    }
    if (!is_dir($cacheDir)) mkdir($cacheDir, 0777, true);
    if ($isComic) {
        $cachedImages = []; $orderedImages = [];
        foreach ($htmlContents as $chapter) {
            foreach ($chapter['images'] as $imgPath) {
                if (!in_array($imgPath, $orderedImages)) $orderedImages[] = $imgPath;
            }
        }
        if (empty($orderedImages)) {
            preg_match_all('/<item[^>]*href="([^"]+\.(jpg|jpeg|png|webp|gif))"[^>]*>/i', $opfContent, $imgMatches);
            foreach ($imgMatches[1] as $imgPath) {
                $fullPath = $opfDir . $imgPath;
                if (!in_array($fullPath, $orderedImages)) $orderedImages[] = $fullPath;
            }
        }
        foreach ($orderedImages as $idx => $relativePath) {
            $ext = strtolower(pathinfo($relativePath, PATHINFO_EXTENSION));
            if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif'])) $ext = 'jpg';
            $cacheFile = $cacheDir . '/' . sprintf('%04d', $idx+1) . '.' . $ext;
            if (file_exists($cacheFile) && filesize($cacheFile) > 100) { $cachedImages[] = $cacheFile; continue; }
            $imageData = $zip->getFromName($relativePath);
            if ($imageData === false) $imageData = $zip->getFromName(urldecode($relativePath));
            if ($imageData !== false && strlen($imageData) > 100) {
                file_put_contents($cacheFile, $imageData);
                $cachedImages[] = $cacheFile;
            } else {
                $cachedImages[] = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="400"%3E%3Crect width="300" height="400" fill="%23333"/%3E%3Ctext x="150" y="200" fill="%23fff" text-anchor="middle"%3E图片缺失%3C/text%3E%3C/svg%3E';
            }
        }
        $result = ['type' => 'comic', 'images' => $cachedImages, 'totalPages' => count($cachedImages)];
    } else {
        $imagesDir = $cacheDir . '/images/';
        if (!is_dir($imagesDir)) mkdir($imagesDir, 0777, true);
        $imageUrlMap = [];
        foreach ($allImages as $relativePath) {
            $originalFilename = basename($relativePath);
            $ext = strtolower(pathinfo($originalFilename, PATHINFO_EXTENSION));
            if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif'])) $ext = 'jpg';
            $cacheFilename = md5($relativePath) . '_' . preg_replace('/[^a-zA-Z0-9_\-\.]/', '_', $originalFilename);
            $cacheFile = $imagesDir . $cacheFilename;
            if (!file_exists($cacheFile)) {
                $imageData = $zip->getFromName($relativePath);
                if ($imageData === false) $imageData = $zip->getFromName(urldecode($relativePath));
                if ($imageData !== false) file_put_contents($cacheFile, $imageData);
            }
            if (file_exists($cacheFile)) {
                $imageUrlMap[$originalFilename] = $cacheFile;
                $nameNoExt = pathinfo($originalFilename, PATHINFO_FILENAME);
                $imageUrlMap[$nameNoExt] = $cacheFile;
            }
        }
        foreach ($htmlContents as &$chapter) {
            $chapter['content'] = preg_replace_callback('/src=["\']([^"\']+)["\']/i', function($matches) use ($imageUrlMap) {
                $src = $matches[1];
                if (strpos($src, 'http://') === 0 || strpos($src, 'https://') === 0 || strpos($src, 'data:') === 0) return $matches[0];
                if (strpos($src, '.epub_cache/') !== false) return $matches[0];
                $filename = basename(urldecode($src));
                if (isset($imageUrlMap[$filename])) return 'src="' . $imageUrlMap[$filename] . '"';
                $name = pathinfo($filename, PATHINFO_FILENAME);
                if (isset($imageUrlMap[$name])) return 'src="' . $imageUrlMap[$name] . '"';
                return $matches[0];
            }, $chapter['content']);
            $chapter['content'] = preg_replace_callback('/url\([\'"]?([^\'"\)]+)[\'"]?\)/i', function($matches) use ($imageUrlMap) {
                $url = $matches[1];
                $filename = basename(urldecode($url));
                if (isset($imageUrlMap[$filename])) return 'url("' . $imageUrlMap[$filename] . '")';
                return $matches[0];
            }, $chapter['content']);
        }
        $result = ['type' => 'ebook', 'htmlContents' => $htmlContents, 'cssContent' => $cssContent, 'totalChapters' => count($htmlContents)];
    }
    $zip->close();
    file_put_contents($cacheTypeFile, json_encode($result, JSON_UNESCAPED_UNICODE));
    return $result;
}

$book = isset($_GET['book']) ? $_GET['book'] : '';
$chapter = isset($_GET['chapter']) ? $_GET['chapter'] : '';
$isChapterPage = ($book && $chapter);
$isPdf = $chapter && (stripos($chapter, '.pdf') !== false);
$isEpub = $chapter && (stripos($chapter, '.epub') !== false);
$isTxt = $chapter && (stripos($chapter, '.txt') !== false);

if ($book && $chapter) {
    $encodedBook = rawurlencode($book);
    $encodedChapter = rawurlencode($chapter);
    $fileUrl = "$baseDir/$encodedBook/$encodedChapter";
}

$images = [];
$epubData = null;
$txtData = null;
$epubError = null;

if ($isTxt && $isChapterPage && $book && $chapter) {
    $txtPath = $baseDir . '/' . $book . '/' . $chapter;
    if (file_exists($txtPath)) $txtData = parseTxtFile($txtPath, $book, $chapter, $baseDir);
    else $epubError = 'TXT文件不存在';
} elseif ($isEpub && $isChapterPage && $book && $chapter) {
    $epubPath = $baseDir . '/' . $book . '/' . $chapter;
    if (file_exists($epubPath)) {
        $result = parseEpub($epubPath, $book, $chapter, $baseDir);
        if (isset($result['error'])) $epubError = $result['error'];
        else { $epubData = $result; if ($epubData['type'] == 'comic') $images = $epubData['images']; }
    } else $epubError = 'EPUB文件不存在';
} elseif (!$isPdf && $isChapterPage && $book && $chapter) {
    $localPath = $baseDir . '/' . $book . '/' . $chapter;
    $images = scanImages($localPath);
}

$currentFile = 'PDF阅读器.php';
?>
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js"></script>
<script>pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';</script>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; min-height: 100vh; transition: all 0.3s ease; }

.floating-buttons, .speed-panel, .theme-selector, .font-controls {
    transition: opacity 0.2s ease, transform 0.2s ease, background 0.3s ease, border-color 0.3s ease, color 0.3s ease;
    opacity: 0;
    transform: translateX(20px);
    pointer-events: none;
}
.floating-buttons.visible, .speed-panel.visible, .theme-selector.visible, .font-controls.visible {
    opacity: 1;
    transform: translateX(0);
    pointer-events: auto;
}

.global-progress-container {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 1003;
    padding: 8px 16px 16px 16px;
    border-top: 1px solid rgba(255,255,255,0.2);
    transition: transform 0.3s ease, background 0.3s ease, border-color 0.3s ease;
    transform: translateY(0);
    backdrop-filter: blur(20px);
}
.global-progress-container.hide {
    transform: translateY(100%);
}
.progress-range-area {
    position: relative;
    width: 100%;
    height: 44px;
    display: flex;
    align-items: center;
    cursor: pointer;
}
.progress-slider-global {
    -webkit-appearance: none;
    width: 100%;
    height: 6px;
    background: rgba(255,255,255,0.25);
    border-radius: 3px;
    outline: none;
    cursor: pointer;
    transition: background 0.3s ease;
}
.progress-slider-global::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #ff9800;
    cursor: pointer;
    box-shadow: 0 0 8px rgba(255,152,0,0.8);
    border: 2px solid #fff;
    transition: transform 0.1s, background 0.3s ease, box-shadow 0.3s ease;
}
.progress-slider-global::-webkit-slider-thumb:hover { transform: scale(1.2); }
.progress-info {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    padding: 4px 0 2px;
    color: rgba(255,255,255,0.85);
    transition: color 0.3s ease;
}

.chapter-tooltip {
    position: fixed;
    background: rgba(0,0,0,0.95);
    backdrop-filter: blur(16px);
    color: #ff9800;
    padding: 10px 20px;
    border-radius: 40px;
    font-size: 13px;
    font-weight: bold;
    white-space: nowrap;
    pointer-events: none;
    box-shadow: 0 6px 20px rgba(0,0,0,0.4);
    z-index: 10007;
    border: 1px solid rgba(255,152,0,0.6);
    transition: all 0.2s ease;
    font-family: monospace;
    letter-spacing: 0.5px;
    bottom: 280px;
    right: 12px;
    left: auto;
}

.page-turn-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeInOutFull 0.5s ease-out forwards;
    perspective: 2000px;
    backdrop-filter: blur(4px);
    transition: background 0.3s ease;
}
.page-turn-overlay .book-container {
    position: relative;
    width: 70%;
    max-width: 500px;
    height: 70%;
    max-height: 500px;
    transform-style: preserve-3d;
    animation: bookFlipFull 0.5s ease-in-out forwards;
}
.page-turn-overlay .book-left, .page-turn-overlay .book-right {
    position: absolute;
    width: 50%;
    height: 100%;
    backdrop-filter: blur(12px);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 80px;
    box-shadow: 0 0 40px rgba(0,0,0,0.4);
    transition: background 0.3s ease, border 0.3s ease, color 0.3s ease;
}
.page-turn-overlay .book-left {
    left: 0;
    transform-origin: right center;
    border-radius: 16px 0 0 16px;
}
.page-turn-overlay .book-right {
    right: 0;
    transform-origin: left center;
    border-radius: 0 16px 16px 0;
}
.page-turn-overlay .message {
    position: absolute;
    bottom: 20%;
    left: 50%;
    transform: translateX(-50%);
    padding: 12px 28px;
    border-radius: 50px;
    font-size: 18px;
    font-weight: 500;
    white-space: nowrap;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    backdrop-filter: blur(8px);
    letter-spacing: 2px;
    transition: background 0.3s ease, color 0.3s ease, border 0.3s ease;
}
@keyframes fadeInOutFull {
    0% { opacity: 0; backdrop-filter: blur(0px); }
    15% { opacity: 1; backdrop-filter: blur(4px); }
    85% { opacity: 1; backdrop-filter: blur(4px); }
    100% { opacity: 0; backdrop-filter: blur(0px); visibility: hidden; }
}
@keyframes bookFlipFull {
    0% { transform: scale(0.9) rotateY(0deg); opacity: 0.5; }
    30% { transform: scale(1.05) rotateY(-15deg); opacity: 1; }
    70% { transform: scale(1.05) rotateY(-5deg); opacity: 1; }
    100% { transform: scale(1) rotateY(0deg); opacity: 1; }
}

.speed-panel {
    position: fixed;
    right: 80px;
    bottom: 105px;
    backdrop-filter: blur(12px);
    padding: 12px 16px;
    border-radius: 30px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    z-index: 10001;
    min-width: 170px;
    border: 1px solid rgba(255,255,255,0.2);
    transition: background 0.3s ease, border-color 0.3s ease, color 0.3s ease;
}
.speed-label {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    gap: 12px;
    transition: color 0.3s ease;
}
.speed-value {
    background: rgba(255,255,255,0.2);
    padding: 2px 8px;
    border-radius: 20px;
    font-family: monospace;
    font-size: 13px;
    transition: background 0.3s ease, color 0.3s ease;
}
.speed-slider {
    width: 100%;
    height: 4px;
    -webkit-appearance: none;
    background: rgba(255,255,255,0.3);
    border-radius: 2px;
    outline: none;
    transition: background 0.3s ease;
}
.speed-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #ff9800;
    cursor: pointer;
    transition: background 0.3s ease, box-shadow 0.3s ease;
}
.speed-presets {
    display: flex;
    justify-content: space-between;
    gap: 6px;
    margin-top: 4px;
}
.speed-preset {
    flex: 1;
    text-align: center;
    font-size: 10px;
    cursor: pointer;
    padding: 2px 4px;
    border-radius: 12px;
    transition: all 0.1s, background 0.3s ease, color 0.3s ease;
}
.speed-preset.active { color: #ff9800; background: rgba(255,152,0,0.2); }
.auto-chapter-line {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    padding-top: 8px;
    border-top: 1px solid rgba(255,255,255,0.2);
    transition: border-color 0.3s ease, color 0.3s ease;
}
.auto-chapter-line input { width: 36px; height: 20px; cursor: pointer; accent-color: #ff9800; transition: accent-color 0.3s ease; }

.font-controls { 
    position: fixed; right: 12px; bottom: 230px; backdrop-filter: blur(10px); padding: 8px 12px; border-radius: 30px; display: flex; gap: 12px; z-index: 10001; transition: background 0.3s ease, border-color 0.3s ease;
}
.font-controls button { background: none; border: none; font-size: 18px; padding: 4px 8px; cursor: pointer; transition: color 0.3s ease; }

.theme-selector { 
    position: fixed; 
    right: 12px;
    bottom: 290px;
    backdrop-filter: blur(12px); 
    padding: 12px; 
    border-radius: 20px; 
    display: flex; 
    flex-wrap: wrap; 
    gap: 8px; 
    z-index: 10001; 
    max-width: 340px; 
    width: max-content; 
    transition: background 0.3s ease, border-color 0.3s ease;
}

.floating-buttons { position: fixed; right: 12px; bottom: 100px; display: flex; flex-direction: column; gap: 12px; z-index: 10000; }
.floating-btn { width: 52px; height: 52px; backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; cursor: pointer; transition: all 0.2s, background 0.3s ease, border-color 0.3s ease, color 0.3s ease, box-shadow 0.3s ease; }
.floating-btn.bookmark-btn { background: linear-gradient(135deg, #ff9800, #ff5722); }
.floating-btn.active { background: #ff9800; }

.bookmark-panel {
    position: fixed;
    right: 12px;
    bottom: 220px;
    backdrop-filter: blur(20px);
    border-radius: 20px;
    width: 320px;
    max-height: 450px;
    overflow-y: auto;
    display: none;
    z-index: 10002;
    transition: background 0.3s ease, border-color 0.3s ease;
}
.bookmark-panel.show { display: block; }
.bookmark-header { padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,0.15); font-weight: 600; display: flex; justify-content: space-between; transition: border-color 0.3s ease, color 0.3s ease; }
.bookmark-header span:last-child { cursor: pointer; font-size: 22px; }
.bookmark-list { padding: 10px; }
.bookmark-item { background: rgba(255,255,255,0.1); margin: 8px 0; padding: 12px; border-radius: 14px; cursor: pointer; transition: background 0.3s ease; }
.bookmark-item:hover { background: rgba(255,255,255,0.2); }
.bookmark-item .title { font-weight: 600; color: #ffb347; font-size: 14px; transition: color 0.3s ease; }
.bookmark-item .info { font-size: 11px; color: rgba(255,255,255,0.6); margin-top: 5px; transition: color 0.3s ease; }
.bookmark-item .delete { float: right; color: #ff6b6b; font-size: 16px; cursor: pointer; }
.empty-bookmark { color: rgba(255,255,255,0.5); text-align: center; padding: 30px; font-size: 13px; transition: color 0.3s ease; }

.theme-dot { width: 36px; height: 36px; border-radius: 12px; cursor: pointer; border: 2px solid rgba(255,255,255,0.5); transition: all 0.1s, border-color 0.3s ease, box-shadow 0.3s ease; box-sizing: border-box; }
.theme-dot.active { border-color: #ff9800; transform: scale(1.05); box-shadow: 0 0 8px rgba(255,152,0,0.5); }

.top-bar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 1000;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    transition: background 0.3s ease, border-bottom 0.3s ease;
}
.top-bar-left { display: flex; align-items: center; gap: 12px; flex: 1; overflow: hidden; }
.back-btn { width: 36px; height: 36px; border-radius: 50%; cursor: pointer; font-size: 20px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.15); border: none; transition: background 0.3s ease, color 0.3s ease; }
.top-bar .nav-links { font-size: 14px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; transition: color 0.3s ease; }
.top-bar a { text-decoration: none; transition: color 0.3s ease; }
.top-bar button { padding: 8px 18px; border-radius: 30px; cursor: pointer; font-size: 14px; margin-left: 8px; background: rgba(255,255,255,0.15); border: none; transition: background 0.3s ease, color 0.3s ease, border-color 0.3s ease; }
.top-bar button.bookmark { background: rgba(255, 152, 0, 0.8); color: white; }
.content { margin-top: 70px; padding: 16px; position: relative; z-index: 1; margin-bottom: 70px; }
.ebook-chapter { border-radius: 24px; padding: 30px 24px; margin: 20px auto; max-width: 800px; transition: all 0.2s ease, background 0.3s ease, color 0.3s ease, border 0.3s ease, box-shadow 0.3s ease; }
.ebook-chapter p { margin-bottom: 1em; line-height: 1.8; }
.ebook-chapter .chapter-title { font-size: 1.8em; text-align: center; margin-bottom: 1em; padding-bottom: 0.3em; transition: color 0.3s ease, border-bottom-color 0.3s ease; }
.ebook-nav { display: flex; justify-content: space-between; gap: 12px; margin: 20px auto; max-width: 800px; }
.ebook-nav button { border: none; padding: 12px 24px; border-radius: 40px; cursor: pointer; font-size: 16px; flex: 1; background: linear-gradient(135deg, #667eea, #764ba2); color: white; transition: background 0.3s ease, opacity 0.3s ease; }
.ebook-nav button:disabled { opacity: 0.5; cursor: not-allowed; }
.chapter-indicator { text-align: center; margin: 10px auto; font-size: 14px; transition: color 0.3s ease; }
.toast { position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.8); backdrop-filter: blur(20px); color: white; padding: 10px 20px; border-radius: 50px; font-size: 14px; z-index: 2000; pointer-events: none; white-space: nowrap; transition: background 0.3s ease, color 0.3s ease, border 0.3s ease; }

/* ==================== 3D悬浮书架 - 增强玻璃立体效果（已去除左侧光影扫光特效） ==================== */
.shelf-grid { 
    display: grid; 
    grid-template-columns: repeat(2, 1fr); 
    gap: 28px; 
    padding: 24px; 
    perspective: 1800px; 
    perspective-origin: center 40px;
}
@media (max-width: 480px) { 
    .shelf-grid { grid-template-columns: repeat(2, 1fr); gap: 18px; padding: 16px; } 
}

.shelf-item {
    position: relative;
    background: rgba(255, 255, 255, 0.18);
    backdrop-filter: blur(18px) saturate(180%);
    -webkit-backdrop-filter: blur(18px) saturate(180%);
    border-radius: 32px;
    padding: 28px 12px 24px;
    text-align: center;
    text-decoration: none;
    color: white;
    transition: all 0.5s cubic-bezier(0.2, 0.9, 0.4, 1.2);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    overflow: visible;
    /* 强化立体玻璃阴影：外部深色阴影 + 内部高光描边 */
    box-shadow: 0 20px 35px -12px rgba(0, 0, 0, 0.4),
                0 0 0 1px rgba(255, 255, 255, 0.35) inset,
                0 1px 0 rgba(255, 255, 255, 0.25) inset,
                0 -1px 0 rgba(0, 0, 0, 0.05) inset;
    transform-style: preserve-3d;
    transform: translateZ(0) rotateX(0deg) rotateY(0deg);
    opacity: 0;
    animation: fadeInUpGlide 0.6s cubic-bezier(0.2, 0.9, 0.3, 1.1) forwards;
    border: 1px solid rgba(255,255,240,0.4);
}
/* 入场动画延迟 */
.shelf-item:nth-child(1) { animation-delay: 0.03s; } .shelf-item:nth-child(2) { animation-delay: 0.08s; } 
.shelf-item:nth-child(3) { animation-delay: 0.13s; } .shelf-item:nth-child(4) { animation-delay: 0.18s; } 
.shelf-item:nth-child(5) { animation-delay: 0.23s; } .shelf-item:nth-child(6) { animation-delay: 0.28s; } 
.shelf-item:nth-child(7) { animation-delay: 0.33s; } .shelf-item:nth-child(8) { animation-delay: 0.38s; } 
.shelf-item:nth-child(9) { animation-delay: 0.43s; } .shelf-item:nth-child(10){ animation-delay: 0.48s; }
.shelf-item:nth-child(11){ animation-delay: 0.53s; } .shelf-item:nth-child(12){ animation-delay: 0.58s; }

@keyframes fadeInUpGlide {
    0% { opacity: 0; transform: translateY(40px) rotateX(-6deg) translateZ(-20px); }
    100% { opacity: 1; transform: translateY(0) rotateX(0deg) translateZ(0); }
}

/* 悬停3D悬浮效果 - 无扫光特效 */
.shelf-item:hover {
    transform: translateY(-16px) translateZ(28px) rotateX(5deg) rotateY(-2deg) scale(1.02);
    background: rgba(255, 255, 255, 0.28);
    border-color: rgba(255, 255, 255, 0.7);
    box-shadow: 0 35px 45px -18px rgba(0, 0, 0, 0.6),
                0 0 0 2px rgba(255, 255, 255, 0.5) inset,
                0 0 25px rgba(255, 255, 255, 0.2);
}
.shelf-item .emoji {
    font-size: 52px;
    display: block;
    margin-bottom: 14px;
    transition: all 0.4s cubic-bezier(0.2, 0.9, 0.4, 1.1);
    transform-style: preserve-3d;
    filter: drop-shadow(0 8px 12px rgba(0, 0, 0, 0.3));
}
.shelf-item:hover .emoji {
    transform: scale(1.15) rotateY(12deg) rotateX(6deg) translateZ(12px);
    filter: drop-shadow(0 15px 20px rgba(0, 0, 0, 0.4));
}
.shelf-item div:last-child {
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 0.5px;
    transition: all 0.3s ease;
    position: relative;
    z-index: 2;
    text-shadow: 0 1px 2px rgba(0,0,0,0.2);
}
.shelf-item:hover div:last-child {
    letter-spacing: 1.2px;
    text-shadow: 0 0 12px rgba(255,255,255,0.6);
    transform: translateZ(10px);
}
/* 顶部高光渐变（保留，增加玻璃质感） */
.shelf-item::after {
    content: '';
    position: absolute;
    top: 0;
    left: 5%;
    width: 90%;
    height: 35%;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0) 100%);
    border-radius: 32px 32px 0 0;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.3s ease;
}
.shelf-item:hover::after {
    opacity: 1;
}
/* 注意：原本的 .shelf-item::before 左侧扫光特效已完全移除 */

.book-chapter-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 16px; padding: 16px; }
.book-chapter-item { position: relative; background: rgba(255,255,255,0.12); backdrop-filter: blur(12px); border-radius: 18px; border: 1px solid rgba(255,255,255,0.3); text-align: center; transition: all 0.3s; cursor: pointer; transform-style: preserve-3d; box-shadow: 0 6px 15px rgba(0,0,0,0.15); opacity: 0; animation: fadeInUp 0.4s ease forwards; }
.book-chapter-item:nth-child(1) { animation-delay: 0.03s; } .book-chapter-item:nth-child(2) { animation-delay: 0.06s; } 
.book-chapter-item:hover { transform: translateY(-6px) translateZ(10px) scale(1.01); background: rgba(255,255,255,0.22); border-color: rgba(255,255,255,0.55); }
.book-chapter-item a { text-decoration: none; display: block; padding: 16px 12px; font-weight: 500; color: inherit; }
@keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }

.page-transition { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(12px); z-index: 10000; display: flex; flex-direction: column; align-items: center; justify-content: center; opacity: 0; visibility: hidden; transition: opacity 0.4s ease, visibility 0.4s ease, background 0.3s ease; }
.page-transition.active { opacity: 1; visibility: visible; }
.page-transition .book-loader { position: relative; width: 80px; height: 100px; perspective: 1000px; margin-bottom: 30px; }
.page-transition .book-page { position: absolute; width: 100%; height: 100%; background: linear-gradient(135deg, #ff9800, #ff5722); border-radius: 4px 8px 8px 4px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); transform-origin: left center; animation: bookFlip 1.2s ease-in-out infinite; transition: background 0.3s ease; }
.page-transition .book-page:nth-child(1) { animation-delay: 0s; background: linear-gradient(135deg, #ff9800, #f57c00); }
.page-transition .book-page:nth-child(2) { animation-delay: 0.15s; background: linear-gradient(135deg, #ffb74d, #ff9800); }
.page-transition .book-page:nth-child(3) { animation-delay: 0.3s; background: linear-gradient(135deg, #ffcc80, #ffb74d); }
.page-transition .book-page:nth-child(4) { animation-delay: 0.45s; background: linear-gradient(135deg, #ffe0b2, #ffcc80); }
@keyframes bookFlip { 0% { transform: rotateY(0deg); opacity: 1; } 50% { transform: rotateY(-90deg); opacity: 0.5; } 100% { transform: rotateY(-180deg); opacity: 0; } }
.page-transition .loading-text { color: white; font-size: 18px; letter-spacing: 4px; font-weight: 300; margin-top: 20px; animation: textPulse 1s ease-in-out infinite; transition: color 0.3s ease; }
@keyframes textPulse { 0%, 100% { opacity: 0.5; letter-spacing: 4px; } 50% { opacity: 1; letter-spacing: 8px; text-shadow: 0 0 10px #ff9800; } }
.page-transition .loading-dots { display: flex; gap: 8px; margin-top: 15px; }
.page-transition .loading-dots span { width: 10px; height: 10px; background: #ff9800; border-radius: 50%; animation: dotBounce 0.6s ease-in-out infinite; transition: background 0.3s ease; }
@keyframes dotBounce { 0%, 100% { transform: translateY(0); opacity: 0.5; } 50% { transform: translateY(-10px); opacity: 1; } }
.ripple { position: absolute; border-radius: 50%; background: rgba(255, 255, 255, 0.5); transform: scale(0); animation: rippleAnim 0.6s linear forwards; pointer-events: none; }
@keyframes rippleAnim { to { transform: scale(4); opacity: 0; } }
.page-title { font-size: 26px; font-weight: 600; color: white; padding: 16px; margin: 0; text-shadow: 1px 1px 2px rgba(0,0,0,0.3); transition: color 0.3s ease, text-shadow 0.3s ease; }
.progress-bar { position: fixed; top: 60px; left: 0; width: 100%; height: 2px; background: rgba(255,255,255,0.2); z-index: 1002; transition: background 0.3s ease; }
.progress-fill { width: 0%; height: 100%; background: #ff9800; transition: width 0.3s, background 0.3s ease; }

/* ==================== 12款静态主题 ==================== */
body.theme-deep-space { background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%); }
body.theme-deep-space .top-bar { background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(20px); }
body.theme-deep-space .top-bar, body.theme-deep-space .top-bar a, body.theme-deep-space .top-bar button { color: #fff; }
body.theme-deep-space .ebook-chapter { background: rgba(30, 30, 50, 0.95); color: #e0e0e0; }
body.theme-deep-space .ebook-chapter .chapter-title { color: #9b59b6; }
body.theme-deep-space .speed-panel, body.theme-deep-space .font-controls, body.theme-deep-space .theme-selector, body.theme-deep-space .bookmark-panel { background: rgba(15, 12, 41, 0.95); color: #e0e0e0; }
body.theme-deep-space .floating-btn { background: rgba(15, 12, 41, 0.9); color: #fff; }
body.theme-deep-space .global-progress-container { background: rgba(15, 12, 41, 0.92); }
body.theme-deep-space .page-turn-overlay { background: rgba(15, 12, 41, 0.92) !important; }
body.theme-deep-space .page-turn-overlay .book-left,
body.theme-deep-space .page-turn-overlay .book-right { background: rgba(48, 43, 99, 0.95) !important; border: 2px solid rgba(155, 89, 182, 0.6) !important; color: #bb86fc !important; }
body.theme-deep-space .page-turn-overlay .message { background: rgba(48, 43, 99, 0.95) !important; color: #bb86fc !important; border: 1px solid rgba(155, 89, 182, 0.5) !important; }
body.theme-deep-space .chapter-tooltip { background: rgba(15, 12, 41, 0.95) !important; border-color: #9b59b6 !important; color: #bb86fc !important; }
body.theme-deep-space .shelf-item { background: rgba(15, 12, 41, 0.6) !important; border-color: rgba(155, 89, 182, 0.4) !important; }
body.theme-deep-space .shelf-item:hover { background: rgba(48, 43, 99, 0.8) !important; border-color: #9b59b6 !important; }

body.theme-ocean { background: linear-gradient(135deg, #1a2980 0%, #26d0ce 100%); }
body.theme-ocean .top-bar { background: rgba(0, 40, 60, 0.85); }
body.theme-ocean .top-bar, body.theme-ocean .top-bar a, body.theme-ocean .top-bar button { color: #e0f7fa; }
body.theme-ocean .ebook-chapter { background: rgba(255, 255, 255, 0.95); color: #2c3e50; }
body.theme-ocean .ebook-chapter .chapter-title { color: #1a2980; }
body.theme-ocean .speed-panel, body.theme-ocean .font-controls, body.theme-ocean .theme-selector, body.theme-ocean .bookmark-panel { background: rgba(26, 41, 128, 0.95); color: #e0f7fa; }
body.theme-ocean .floating-btn { background: rgba(38, 208, 206, 0.85); color: #e0f7fa; }
body.theme-ocean .global-progress-container { background: rgba(26, 41, 128, 0.92); }
body.theme-ocean .page-turn-overlay { background: rgba(26, 41, 128, 0.92) !important; }
body.theme-ocean .page-turn-overlay .book-left,
body.theme-ocean .page-turn-overlay .book-right { background: rgba(38, 208, 206, 0.9) !important; border: 2px solid rgba(255,255,255,0.4) !important; color: #e0f7fa !important; }
body.theme-ocean .page-turn-overlay .message { background: rgba(26, 41, 128, 0.95) !important; color: #e0f7fa !important; border: 1px solid rgba(255,255,255,0.3) !important; }
body.theme-ocean .chapter-tooltip { background: rgba(26, 41, 128, 0.95) !important; border-color: #26d0ce !important; color: #e0f7fa !important; }

body.theme-cherry { background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%); }
body.theme-cherry .top-bar { background: rgba(219, 112, 147, 0.85); }
body.theme-cherry .top-bar, body.theme-cherry .top-bar a, body.theme-cherry .top-bar button { color: #5a2e3e; }
body.theme-cherry .ebook-chapter { background: rgba(255, 245, 245, 0.95); color: #5a3a3a; }
body.theme-cherry .ebook-chapter .chapter-title { color: #db7093; }
body.theme-cherry .speed-panel, body.theme-cherry .font-controls, body.theme-cherry .theme-selector, body.theme-cherry .bookmark-panel { background: rgba(255, 245, 245, 0.95); color: #5a2e3e; }
body.theme-cherry .floating-btn { background: rgba(219, 112, 147, 0.85); color: #5a2e3e; }
body.theme-cherry .global-progress-container { background: rgba(255, 245, 245, 0.92); }
body.theme-cherry .page-turn-overlay { background: rgba(255, 154, 158, 0.92) !important; }
body.theme-cherry .page-turn-overlay .book-left,
body.theme-cherry .page-turn-overlay .book-right { background: rgba(254, 207, 239, 0.95) !important; border: 2px solid rgba(219, 112, 147, 0.6) !important; color: #5a2e3e !important; }
body.theme-cherry .page-turn-overlay .message { background: rgba(219, 112, 147, 0.95) !important; color: #5a2e3e !important; border: 1px solid rgba(219, 112, 147, 0.4) !important; }
body.theme-cherry .chapter-tooltip { background: rgba(219, 112, 147, 0.95) !important; border-color: #ff9a9e !important; color: #5a2e3e !important; }

body.theme-night { background: #0a0a0a; }
body.theme-night .top-bar { background: rgba(10, 10, 10, 0.95); }
body.theme-night .top-bar, body.theme-night .top-bar a, body.theme-night .top-bar button { color: #aaa; }
body.theme-night .ebook-chapter { background: #1a1a1a; color: #b0b0b0; border: 1px solid #333; }
body.theme-night .ebook-chapter .chapter-title { color: #888; }
body.theme-night .speed-panel, body.theme-night .font-controls, body.theme-night .theme-selector, body.theme-night .bookmark-panel { background: rgba(10, 10, 10, 0.95); color: #aaa; }
body.theme-night .floating-btn { background: rgba(30, 30, 30, 0.95); color: #aaa; }
body.theme-night .global-progress-container { background: rgba(10, 10, 10, 0.92); }
body.theme-night .page-turn-overlay { background: rgba(10, 10, 10, 0.95) !important; }
body.theme-night .page-turn-overlay .book-left,
body.theme-night .page-turn-overlay .book-right { background: rgba(30, 30, 30, 0.98) !important; border: 2px solid #555 !important; color: #aaa !important; }
body.theme-night .page-turn-overlay .message { background: rgba(30, 30, 30, 0.98) !important; color: #aaa !important; border: 1px solid #555 !important; }
body.theme-night .chapter-tooltip { background: rgba(30, 30, 30, 0.98) !important; border-color: #666 !important; color: #ccc !important; }

body.theme-forest { background: linear-gradient(135deg, #134e5e 0%, #71b280 100%); }
body.theme-forest .top-bar { background: rgba(20, 60, 40, 0.85); }
body.theme-forest .top-bar, body.theme-forest .top-bar a, body.theme-forest .top-bar button { color: #e8f5e9; }
body.theme-forest .ebook-chapter { background: rgba(255, 255, 245, 0.95); color: #2d5a3b; }
body.theme-forest .ebook-chapter .chapter-title { color: #2e7d32; }
body.theme-forest .speed-panel, body.theme-forest .font-controls, body.theme-forest .theme-selector, body.theme-forest .bookmark-panel { background: rgba(19, 78, 94, 0.95); color: #e8f5e9; }
body.theme-forest .floating-btn { background: rgba(113, 178, 128, 0.85); color: #e8f5e9; }
body.theme-forest .global-progress-container { background: rgba(19, 78, 94, 0.92); }
body.theme-forest .page-turn-overlay { background: rgba(19, 78, 94, 0.92) !important; }
body.theme-forest .page-turn-overlay .book-left,
body.theme-forest .page-turn-overlay .book-right { background: rgba(113, 178, 128, 0.9) !important; border: 2px solid rgba(255,255,255,0.4) !important; color: #e8f5e9 !important; }
body.theme-forest .page-turn-overlay .message { background: rgba(19, 78, 94, 0.95) !important; color: #e8f5e9 !important; border: 1px solid rgba(255,255,255,0.3) !important; }
body.theme-forest .chapter-tooltip { background: rgba(19, 78, 94, 0.95) !important; border-color: #71b280 !important; color: #e8f5e9 !important; }

body.theme-sunset { background: linear-gradient(135deg, #ff7e5f 0%, #feb47b 100%); }
body.theme-sunset .top-bar { background: rgba(180, 70, 40, 0.85); }
body.theme-sunset .top-bar, body.theme-sunset .top-bar a, body.theme-sunset .top-bar button { color: #fff3e0; }
body.theme-sunset .ebook-chapter { background: rgba(255, 248, 240, 0.96); color: #6b3e1f; }
body.theme-sunset .ebook-chapter .chapter-title { color: #d84315; }
body.theme-sunset .speed-panel, body.theme-sunset .font-controls, body.theme-sunset .theme-selector, body.theme-sunset .bookmark-panel { background: rgba(255, 126, 95, 0.95); color: #fff3e0; }
body.theme-sunset .floating-btn { background: rgba(254, 180, 123, 0.85); color: #fff3e0; }
body.theme-sunset .global-progress-container { background: rgba(255, 126, 95, 0.92); }
body.theme-sunset .page-turn-overlay { background: rgba(255, 126, 95, 0.92) !important; }
body.theme-sunset .page-turn-overlay .book-left,
body.theme-sunset .page-turn-overlay .book-right { background: rgba(254, 180, 123, 0.95) !important; border: 2px solid rgba(255,255,255,0.4) !important; color: #fff3e0 !important; }
body.theme-sunset .page-turn-overlay .message { background: rgba(255, 126, 95, 0.95) !important; color: #fff3e0 !important; border: 1px solid rgba(255,255,255,0.3) !important; }
body.theme-sunset .chapter-tooltip { background: rgba(180, 70, 40, 0.95) !important; border-color: #feb47b !important; color: #fff3e0 !important; }

body.theme-lavender { background: linear-gradient(135deg, #8e9ecc 0%, #e0bbff 100%); }
body.theme-lavender .top-bar { background: rgba(100, 80, 140, 0.85); }
body.theme-lavender .top-bar, body.theme-lavender .top-bar a, body.theme-lavender .top-bar button { color: #f3e5f5; }
body.theme-lavender .ebook-chapter { background: rgba(245, 235, 255, 0.96); color: #4a3a6e; }
body.theme-lavender .ebook-chapter .chapter-title { color: #7b1fa2; }
body.theme-lavender .speed-panel, body.theme-lavender .font-controls, body.theme-lavender .theme-selector, body.theme-lavender .bookmark-panel { background: rgba(142, 158, 204, 0.95); color: #4a3a6e; }
body.theme-lavender .floating-btn { background: rgba(224, 187, 255, 0.85); color: #4a3a6e; }
body.theme-lavender .global-progress-container { background: rgba(142, 158, 204, 0.92); }
body.theme-lavender .page-turn-overlay { background: rgba(142, 158, 204, 0.92) !important; }
body.theme-lavender .page-turn-overlay .book-left,
body.theme-lavender .page-turn-overlay .book-right { background: rgba(224, 187, 255, 0.95) !important; border: 2px solid rgba(100, 80, 140, 0.6) !important; color: #4a3a6e !important; }
body.theme-lavender .page-turn-overlay .message { background: rgba(142, 158, 204, 0.95) !important; color: #f3e5f5 !important; border: 1px solid rgba(100, 80, 140, 0.4) !important; }
body.theme-lavender .chapter-tooltip { background: rgba(100, 80, 140, 0.95) !important; border-color: #e0bbff !important; color: #f3e5f5 !important; }

body.theme-blueberry { background: linear-gradient(135deg, #2c3e66 0%, #4a69bd 100%); }
body.theme-blueberry .top-bar { background: rgba(30, 50, 80, 0.85); }
body.theme-blueberry .top-bar, body.theme-blueberry .top-bar a, body.theme-blueberry .top-bar button { color: #dfe6e9; }
body.theme-blueberry .ebook-chapter { background: rgba(240, 245, 255, 0.96); color: #2c3e66; }
body.theme-blueberry .ebook-chapter .chapter-title { color: #3b82f6; }
body.theme-blueberry .speed-panel, body.theme-blueberry .font-controls, body.theme-blueberry .theme-selector, body.theme-blueberry .bookmark-panel { background: rgba(44, 62, 102, 0.95); color: #dfe6e9; }
body.theme-blueberry .floating-btn { background: rgba(74, 105, 189, 0.85); color: #dfe6e9; }
body.theme-blueberry .global-progress-container { background: rgba(44, 62, 102, 0.92); }
body.theme-blueberry .page-turn-overlay { background: rgba(44, 62, 102, 0.92) !important; }
body.theme-blueberry .page-turn-overlay .book-left,
body.theme-blueberry .page-turn-overlay .book-right { background: rgba(74, 105, 189, 0.9) !important; border: 2px solid rgba(255,255,255,0.3) !important; color: #dfe6e9 !important; }
body.theme-blueberry .page-turn-overlay .message { background: rgba(44, 62, 102, 0.95) !important; color: #dfe6e9 !important; border: 1px solid rgba(255,255,255,0.3) !important; }
body.theme-blueberry .chapter-tooltip { background: rgba(44, 62, 102, 0.95) !important; border-color: #4a69bd !important; color: #dfe6e9 !important; }

body.theme-amber { background: linear-gradient(135deg, #ffb347 0%, #ffcc33 100%); }
body.theme-amber .top-bar { background: rgba(160, 90, 30, 0.85); }
body.theme-amber .top-bar, body.theme-amber .top-bar a, body.theme-amber .top-bar button { color: #3e2723; }
body.theme-amber .ebook-chapter { background: rgba(255, 250, 230, 0.96); color: #5d4037; }
body.theme-amber .ebook-chapter .chapter-title { color: #f57c00; }
body.theme-amber .speed-panel, body.theme-amber .font-controls, body.theme-amber .theme-selector, body.theme-amber .bookmark-panel { background: rgba(255, 179, 71, 0.95); color: #3e2723; }
body.theme-amber .floating-btn { background: rgba(255, 204, 51, 0.85); color: #3e2723; }
body.theme-amber .global-progress-container { background: rgba(255, 179, 71, 0.92); }
body.theme-amber .page-turn-overlay { background: rgba(255, 179, 71, 0.92) !important; }
body.theme-amber .page-turn-overlay .book-left,
body.theme-amber .page-turn-overlay .book-right { background: rgba(255, 204, 51, 0.95) !important; border: 2px solid rgba(160, 90, 30, 0.6) !important; color: #3e2723 !important; }
body.theme-amber .page-turn-overlay .message { background: rgba(255, 179, 71, 0.95) !important; color: #3e2723 !important; border: 1px solid rgba(160, 90, 30, 0.4) !important; }
body.theme-amber .chapter-tooltip { background: rgba(160, 90, 30, 0.95) !important; border-color: #ffcc33 !important; color: #fff8e1 !important; }

body.theme-coral { background: linear-gradient(135deg, #ff6b6b 0%, #ffb8b8 100%); }
body.theme-coral .top-bar { background: rgba(200, 80, 80, 0.85); }
body.theme-coral .top-bar, body.theme-coral .top-bar a, body.theme-coral .top-bar button { color: #fff; }
body.theme-coral .ebook-chapter { background: rgba(255, 240, 240, 0.95); color: #5a3a3a; }
body.theme-coral .ebook-chapter .chapter-title { color: #ff6b6b; }
body.theme-coral .speed-panel, body.theme-coral .font-controls, body.theme-coral .theme-selector, body.theme-coral .bookmark-panel { background: rgba(200, 80, 80, 0.95); color: #fff; }
body.theme-coral .floating-btn { background: rgba(200, 80, 80, 0.9); color: #fff; }
body.theme-coral .global-progress-container { background: rgba(200, 80, 80, 0.92); }
body.theme-coral .page-turn-overlay { background: rgba(200, 80, 80, 0.92) !important; }
body.theme-coral .page-turn-overlay .book-left,
body.theme-coral .page-turn-overlay .book-right { background: rgba(255, 184, 184, 0.95) !important; border: 2px solid rgba(200, 80, 80, 0.6) !important; color: #fff !important; }
body.theme-coral .page-turn-overlay .message { background: rgba(200, 80, 80, 0.95) !important; color: #fff !important; border: 1px solid rgba(200, 80, 80, 0.4) !important; }
body.theme-coral .chapter-tooltip { background: rgba(200, 80, 80, 0.95) !important; border-color: #ffb8b8 !important; color: #fff !important; }

body.theme-mint { background: linear-gradient(135deg, #a8e6cf 0%, #80deea 100%); }
body.theme-mint .top-bar { background: rgba(60, 120, 100, 0.85); }
body.theme-mint .top-bar, body.theme-mint .top-bar a, body.theme-mint .top-bar button { color: #2d5a3b; }
body.theme-mint .ebook-chapter { background: rgba(255, 255, 250, 0.95); color: #2d5a3b; }
body.theme-mint .ebook-chapter .chapter-title { color: #2ecc71; }
body.theme-mint .speed-panel, body.theme-mint .font-controls, body.theme-mint .theme-selector, body.theme-mint .bookmark-panel { background: rgba(60, 120, 100, 0.95); color: #fff; }
body.theme-mint .floating-btn { background: rgba(60, 120, 100, 0.9); color: #fff; }
body.theme-mint .global-progress-container { background: rgba(60, 120, 100, 0.92); }
body.theme-mint .page-turn-overlay { background: rgba(60, 120, 100, 0.92) !important; }
body.theme-mint .page-turn-overlay .book-left,
body.theme-mint .page-turn-overlay .book-right { background: rgba(168, 230, 207, 0.9) !important; border: 2px solid rgba(60, 120, 100, 0.6) !important; color: #2d5a3b !important; }
body.theme-mint .page-turn-overlay .message { background: rgba(60, 120, 100, 0.95) !important; color: #fff !important; border: 1px solid rgba(60, 120, 100, 0.4) !important; }
body.theme-mint .chapter-tooltip { background: rgba(60, 120, 100, 0.95) !important; border-color: #80deea !important; color: #fff !important; }

body.theme-rosegold { background: linear-gradient(135deg, #e8b4b8 0%, #ffd9e2 100%); }
body.theme-rosegold .top-bar { background: rgba(160, 100, 110, 0.85); }
body.theme-rosegold .top-bar, body.theme-rosegold .top-bar a, body.theme-rosegold .top-bar button { color: #5a3a3e; }
body.theme-rosegold .ebook-chapter { background: rgba(255, 248, 250, 0.95); color: #5a3a3e; }
body.theme-rosegold .ebook-chapter .chapter-title { color: #e8b4b8; }
body.theme-rosegold .speed-panel, body.theme-rosegold .font-controls, body.theme-rosegold .theme-selector, body.theme-rosegold .bookmark-panel { background: rgba(160, 100, 110, 0.95); color: #fff; }
body.theme-rosegold .floating-btn { background: rgba(160, 100, 110, 0.9); color: #fff; }
body.theme-rosegold .global-progress-container { background: rgba(160, 100, 110, 0.92); }
body.theme-rosegold .page-turn-overlay { background: rgba(160, 100, 110, 0.92) !important; }
body.theme-rosegold .page-turn-overlay .book-left,
body.theme-rosegold .page-turn-overlay .book-right { background: rgba(255, 217, 226, 0.95) !important; border: 2px solid rgba(160, 100, 110, 0.6) !important; color: #5a3a3e !important; }
body.theme-rosegold .page-turn-overlay .message { background: rgba(160, 100, 110, 0.95) !important; color: #fff !important; border: 1px solid rgba(160, 100, 110, 0.4) !important; }
body.theme-rosegold .chapter-tooltip { background: rgba(160, 100, 110, 0.95) !important; border-color: #ffd9e2 !important; color: #fff5f5 !important; }

/* ==================== 护眼主题 ==================== */
body.theme-eyecare { background: #c7edcc !important; color: #2d2d2d !important; }
body.theme-eyecare .top-bar { background: rgba(199, 237, 204, 0.92) !important; backdrop-filter: blur(20px) !important; border-bottom: 1px solid rgba(100, 100, 80, 0.2) !important; }
body.theme-eyecare .top-bar, body.theme-eyecare .top-bar a, body.theme-eyecare .top-bar button { color: #2d2d2d !important; }
body.theme-eyecare .ebook-chapter { background: rgba(215, 245, 210, 0.95) !important; color: #2d2d2d !important; box-shadow: 0 8px 32px rgba(0,0,0,0.08) !important; }
body.theme-eyecare .ebook-chapter .chapter-title { color: #5a6b3a !important; border-bottom-color: #a0b880 !important; }
body.theme-eyecare .speed-panel, body.theme-eyecare .font-controls, body.theme-eyecare .theme-selector, body.theme-eyecare .bookmark-panel { background: rgba(215, 245, 210, 0.95) !important; color: #2d2d2d !important; border: 1px solid rgba(100, 100, 80, 0.2) !important; }
body.theme-eyecare .floating-btn { background: rgba(199, 237, 204, 0.9) !important; color: #2d2d2d !important; border: 1px solid rgba(100, 100, 80, 0.3) !important; }
body.theme-eyecare .global-progress-container { background: rgba(199, 237, 204, 0.92) !important; }
body.theme-eyecare .shelf-item { background: rgba(215, 245, 210, 0.8) !important; color: #2d2d2d !important; }
body.theme-eyecare .shelf-item:hover { background: rgba(199, 237, 204, 0.9) !important; }
body.theme-eyecare .progress-slider-global::-webkit-slider-thumb { background: #8b9a6e !important; }
body.theme-eyecare .page-turn-overlay { background: rgba(199, 237, 204, 0.92) !important; }
body.theme-eyecare .page-turn-overlay .book-left,
body.theme-eyecare .page-turn-overlay .book-right { background: rgba(215, 245, 210, 0.95) !important; border: 2px solid rgba(139, 154, 110, 0.5) !important; color: #2d2d2d !important; }
body.theme-eyecare .page-turn-overlay .message { background: rgba(215, 245, 210, 0.95) !important; color: #2d2d2d !important; border: 1px solid rgba(139, 154, 110, 0.4) !important; }
body.theme-eyecare .chapter-tooltip { background: rgba(215, 245, 210, 0.98) !important; border-color: #8b9a6e !important; color: #2d2d2d !important; }

/* ==================== 12款动态主题 ==================== */
/* 1. 极光幻彩 */
body.theme-aurora-dynamic { background: linear-gradient(270deg, #1a0b2e, #2d1b69, #1a4d8c, #0f5c6b); background-size: 400% 400%; animation: auroraFlow 12s ease infinite; color: #f0f0f0 !important; }
@keyframes auroraFlow { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
body.theme-aurora-dynamic .top-bar { background: rgba(0, 0, 0, 0.5) !important; backdrop-filter: blur(20px) !important; border-bottom: 1px solid rgba(124, 255, 208, 0.3) !important; }
body.theme-aurora-dynamic .top-bar, body.theme-aurora-dynamic .top-bar a, body.theme-aurora-dynamic .top-bar button { color: #7cffd0 !important; text-shadow: 0 0 5px rgba(124,255,208,0.3); }
body.theme-aurora-dynamic .back-btn { background: rgba(124, 255, 208, 0.15) !important; }
body.theme-aurora-dynamic .page-title { color: #7cffd0 !important; text-shadow: 0 0 10px rgba(124,255,208,0.4); }
body.theme-aurora-dynamic .ebook-chapter { background: rgba(0, 0, 0, 0.4) !important; backdrop-filter: blur(10px) !important; border: 1px solid rgba(124, 255, 208, 0.2) !important; }
body.theme-aurora-dynamic .ebook-chapter .chapter-title { color: #7cffd0 !important; border-bottom-color: rgba(124, 255, 208, 0.3) !important; }
body.theme-aurora-dynamic .floating-btn, body.theme-aurora-dynamic .speed-panel, body.theme-aurora-dynamic .font-controls, body.theme-aurora-dynamic .theme-selector, body.theme-aurora-dynamic .bookmark-panel { background: rgba(0, 0, 0, 0.5) !important; border: 1px solid rgba(124, 255, 208, 0.3) !important; color: #7cffd0 !important; }
body.theme-aurora-dynamic .floating-btn { background: rgba(0, 0, 0, 0.4) !important; color: #7cffd0 !important; border: 1px solid rgba(124, 255, 208, 0.4) !important; }
body.theme-aurora-dynamic .floating-btn.bookmark-btn { background: rgba(124, 255, 208, 0.2) !important; border: 1px solid #7cffd0 !important; }
body.theme-aurora-dynamic .floating-btn.bookmark-btn.active { background: #7cffd0 !important; color: #1a0b2e !important; }
body.theme-aurora-dynamic .speed-slider::-webkit-slider-thumb { background: #7cffd0 !important; }
body.theme-aurora-dynamic .progress-slider-global::-webkit-slider-thumb { background: #7cffd0 !important; box-shadow: 0 0 8px rgba(124,255,208,0.8) !important; }
body.theme-aurora-dynamic .progress-fill { background: #7cffd0 !important; }
body.theme-aurora-dynamic .speed-preset.active { color: #7cffd0 !important; background: rgba(124, 255, 208, 0.2) !important; }
body.theme-aurora-dynamic .auto-chapter-line { border-top-color: rgba(124, 255, 208, 0.2) !important; }
body.theme-aurora-dynamic .auto-chapter-line input { accent-color: #7cffd0 !important; }
body.theme-aurora-dynamic .global-progress-container { background: rgba(0, 0, 0, 0.5) !important; border-top: 1px solid rgba(124, 255, 208, 0.3) !important; }
body.theme-aurora-dynamic .progress-info { color: rgba(124, 255, 208, 0.8) !important; }
body.theme-aurora-dynamic .shelf-item { background: rgba(124, 255, 208, 0.1) !important; border-color: rgba(124, 255, 208, 0.3) !important; color: #7cffd0 !important; }
body.theme-aurora-dynamic .shelf-item:hover { background: rgba(124, 255, 208, 0.2) !important; border-color: rgba(124, 255, 208, 0.6) !important; }
body.theme-aurora-dynamic .book-chapter-item { background: rgba(124, 255, 208, 0.1) !important; border-color: rgba(124, 255, 208, 0.2) !important; }
body.theme-aurora-dynamic .book-chapter-item a { color: #7cffd0 !important; }
body.theme-aurora-dynamic .book-chapter-item:hover { background: rgba(124, 255, 208, 0.2) !important; }
body.theme-aurora-dynamic .bookmark-item .title { color: #7cffd0 !important; }
body.theme-aurora-dynamic .bookmark-header { border-bottom-color: rgba(124, 255, 208, 0.2) !important; }
body.theme-aurora-dynamic .chapter-tooltip { background: rgba(0, 0, 0, 0.75) !important; border-color: #7cffd0 !important; color: #7cffd0 !important; box-shadow: 0 0 15px rgba(124,255,208,0.3) !important; }
body.theme-aurora-dynamic .page-turn-overlay { background: rgba(0, 0, 0, 0.6) !important; }
body.theme-aurora-dynamic .page-turn-overlay .book-left,
body.theme-aurora-dynamic .page-turn-overlay .book-right { background: rgba(0, 0, 0, 0.5) !important; border: 2px solid rgba(124, 255, 208, 0.4) !important; color: #7cffd0 !important; }
body.theme-aurora-dynamic .page-turn-overlay .message { background: rgba(0, 0, 0, 0.7) !important; color: #7cffd0 !important; border: 1px solid rgba(124, 255, 208, 0.5) !important; }
body.theme-aurora-dynamic .page-transition { background: rgba(0, 0, 0, 0.6) !important; }
body.theme-aurora-dynamic .page-transition .book-page { background: linear-gradient(135deg, #7cffd0, #2d1b69) !important; }
body.theme-aurora-dynamic .page-transition .loading-text { color: #7cffd0 !important; }
body.theme-aurora-dynamic .page-transition .loading-dots span { background: #7cffd0 !important; }
body.theme-aurora-dynamic .top-bar button.bookmark { background: rgba(124, 255, 208, 0.2) !important; border: 1px solid #7cffd0 !important; color: #7cffd0 !important; }
body.theme-aurora-dynamic .toast { background: rgba(0, 0, 0, 0.8) !important; color: #7cffd0 !important; border: 1px solid rgba(124, 255, 208, 0.3) !important; }

/* 2. 霓虹脉冲 */
body.theme-neon-dynamic { background: #0a0a0a !important; animation: neonBgPulse 2s ease-in-out infinite; color: #fff !important; }
@keyframes neonBgPulse { 0% { background: #0a0a0a; } 30% { background: #0d1a1a; } 100% { background: #0a0a0a; } }
body.theme-neon-dynamic .top-bar { background: rgba(0, 0, 0, 0.7) !important; border-bottom: 1px solid rgba(0, 255, 255, 0.4) !important; animation: neonBorderFlash 1.5s ease-in-out infinite !important; }
@keyframes neonBorderFlash { 0% { border-bottom-color: rgba(0, 255, 255, 0.2); } 50% { border-bottom-color: rgba(0, 255, 255, 0.8); } 100% { border-bottom-color: rgba(0, 255, 255, 0.2); } }
body.theme-neon-dynamic .top-bar, body.theme-neon-dynamic .top-bar a, body.theme-neon-dynamic .top-bar button { color: #0ff !important; text-shadow: 0 0 5px rgba(0,255,255,0.5); }
body.theme-neon-dynamic .back-btn { background: rgba(0, 255, 255, 0.1) !important; }
body.theme-neon-dynamic .page-title { color: #0ff !important; text-shadow: 0 0 10px rgba(0,255,255,0.5); animation: neonTitlePulse 1.5s ease-in-out infinite; }
@keyframes neonTitlePulse { 0% { text-shadow: 0 0 5px rgba(0,255,255,0.3); } 50% { text-shadow: 0 0 20px rgba(0,255,255,0.8); } 100% { text-shadow: 0 0 5px rgba(0,255,255,0.3); } }
body.theme-neon-dynamic .ebook-chapter { background: rgba(0, 0, 0, 0.7) !important; border: 1px solid rgba(0, 255, 255, 0.2) !important; animation: neonBoxGlow 2s ease-in-out infinite !important; }
@keyframes neonBoxGlow { 0% { box-shadow: 0 0 5px rgba(0, 255, 255, 0.1); } 50% { box-shadow: 0 0 25px rgba(0, 255, 255, 0.4); } 100% { box-shadow: 0 0 5px rgba(0, 255, 255, 0.1); } }
body.theme-neon-dynamic .ebook-chapter .chapter-title { color: #0ff !important; border-bottom-color: rgba(0, 255, 255, 0.3) !important; }
body.theme-neon-dynamic .floating-btn, body.theme-neon-dynamic .speed-panel, body.theme-neon-dynamic .font-controls, body.theme-neon-dynamic .theme-selector, body.theme-neon-dynamic .bookmark-panel { background: rgba(0, 0, 0, 0.7) !important; color: #0ff !important; border: 1px solid rgba(0, 255, 255, 0.3) !important; animation: neonPanelGlow 1.5s ease-in-out infinite !important; }
@keyframes neonPanelGlow { 0% { border-color: rgba(0, 255, 255, 0.2); } 50% { border-color: rgba(0, 255, 255, 0.6); } 100% { border-color: rgba(0, 255, 255, 0.2); } }
body.theme-neon-dynamic .floating-btn { background: rgba(0, 0, 0, 0.6) !important; color: #0ff !important; border: 1px solid #0ff !important; animation: neonBtnPulse 1.5s ease-in-out infinite !important; }
@keyframes neonBtnPulse { 0% { box-shadow: 0 0 5px rgba(0, 255, 255, 0.3); } 50% { box-shadow: 0 0 15px rgba(0, 255, 255, 0.8); } 100% { box-shadow: 0 0 5px rgba(0, 255, 255, 0.3); } }
body.theme-neon-dynamic .floating-btn.bookmark-btn { background: rgba(0, 255, 255, 0.15) !important; }
body.theme-neon-dynamic .floating-btn.bookmark-btn.active { background: #0ff !important; color: #0a0a0a !important; }
body.theme-neon-dynamic .speed-slider::-webkit-slider-thumb { background: #0ff !important; }
body.theme-neon-dynamic .progress-slider-global::-webkit-slider-thumb { background: #0ff !important; box-shadow: 0 0 8px rgba(0,255,255,0.8) !important; }
body.theme-neon-dynamic .progress-fill { background: #0ff !important; animation: neonFillPulse 1.5s ease-in-out infinite; }
@keyframes neonFillPulse { 0% { opacity: 0.7; } 50% { opacity: 1; } 100% { opacity: 0.7; } }
body.theme-neon-dynamic .speed-preset.active { color: #0ff !important; background: rgba(0, 255, 255, 0.2) !important; }
body.theme-neon-dynamic .auto-chapter-line { border-top-color: rgba(0, 255, 255, 0.2) !important; }
body.theme-neon-dynamic .auto-chapter-line input { accent-color: #0ff !important; }
body.theme-neon-dynamic .global-progress-container { background: rgba(0, 0, 0, 0.7) !important; border-top: 1px solid rgba(0, 255, 255, 0.3) !important; }
body.theme-neon-dynamic .progress-info { color: rgba(0, 255, 255, 0.8) !important; }
body.theme-neon-dynamic .shelf-item { background: rgba(0, 255, 255, 0.08) !important; border-color: rgba(0, 255, 255, 0.3) !important; color: #0ff !important; }
body.theme-neon-dynamic .shelf-item:hover { background: rgba(0, 255, 255, 0.18) !important; border-color: #0ff !important; box-shadow: 0 0 20px rgba(0,255,255,0.3) !important; }
body.theme-neon-dynamic .book-chapter-item { background: rgba(0, 255, 255, 0.08) !important; border-color: rgba(0, 255, 255, 0.2) !important; }
body.theme-neon-dynamic .book-chapter-item a { color: #0ff !important; }
body.theme-neon-dynamic .book-chapter-item:hover { background: rgba(0, 255, 255, 0.18) !important; box-shadow: 0 0 15px rgba(0,255,255,0.2) !important; }
body.theme-neon-dynamic .bookmark-item .title { color: #0ff !important; }
body.theme-neon-dynamic .bookmark-header { border-bottom-color: rgba(0, 255, 255, 0.2) !important; }
body.theme-neon-dynamic .chapter-tooltip { background: rgba(0, 0, 0, 0.9) !important; border-color: #0ff !important; color: #0ff !important; box-shadow: 0 0 15px rgba(0,255,255,0.4) !important; text-shadow: 0 0 3px #0ff !important; }
body.theme-neon-dynamic .page-turn-overlay { background: rgba(0, 0, 0, 0.8) !important; }
body.theme-neon-dynamic .page-turn-overlay .book-left,
body.theme-neon-dynamic .page-turn-overlay .book-right { background: rgba(0, 0, 0, 0.7) !important; border: 2px solid #0ff !important; color: #0ff !important; }
body.theme-neon-dynamic .page-turn-overlay .message { background: rgba(0, 0, 0, 0.9) !important; color: #0ff !important; border: 1px solid #0ff !important; }
body.theme-neon-dynamic .page-transition { background: rgba(0, 0, 0, 0.7) !important; }
body.theme-neon-dynamic .page-transition .book-page { background: linear-gradient(135deg, #0ff, #0a0a0a) !important; }
body.theme-neon-dynamic .page-transition .loading-text { color: #0ff !important; text-shadow: 0 0 10px rgba(0,255,255,0.5); }
body.theme-neon-dynamic .page-transition .loading-dots span { background: #0ff !important; }
body.theme-neon-dynamic .top-bar button.bookmark { background: rgba(0, 255, 255, 0.15) !important; border: 1px solid #0ff !important; color: #0ff !important; animation: neonBtnPulse 1.5s ease-in-out infinite !important; }
body.theme-neon-dynamic .toast { background: rgba(0, 0, 0, 0.85) !important; color: #0ff !important; border: 1px solid #0ff !important; }

/* 3. 暮色晚霞 */
body.theme-sunset-dynamic { background: linear-gradient(270deg, #1a0a2e, #5c2a4a, #c45c3a, #e8a04a); background-size: 400% 400%; animation: sunsetFlow 15s ease infinite; color: #f5e6d3 !important; }
@keyframes sunsetFlow { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
body.theme-sunset-dynamic .top-bar { background: rgba(0, 0, 0, 0.4) !important; border-bottom: 1px solid rgba(255, 184, 107, 0.3) !important; }
body.theme-sunset-dynamic .top-bar, body.theme-sunset-dynamic .top-bar a, body.theme-sunset-dynamic .top-bar button { color: #ffb86b !important; }
body.theme-sunset-dynamic .back-btn { background: rgba(255, 184, 107, 0.15) !important; }
body.theme-sunset-dynamic .page-title { color: #ffb86b !important; text-shadow: 0 0 8px rgba(255,184,107,0.3); }
body.theme-sunset-dynamic .ebook-chapter { background: rgba(0, 0, 0, 0.4) !important; backdrop-filter: blur(10px) !important; border: 1px solid rgba(255, 184, 107, 0.2) !important; }
body.theme-sunset-dynamic .ebook-chapter .chapter-title { color: #ffb86b !important; border-bottom-color: rgba(255, 184, 107, 0.3) !important; }
body.theme-sunset-dynamic .floating-btn, body.theme-sunset-dynamic .speed-panel, body.theme-sunset-dynamic .font-controls, body.theme-sunset-dynamic .theme-selector, body.theme-sunset-dynamic .bookmark-panel { background: rgba(0, 0, 0, 0.45) !important; border: 1px solid rgba(255, 184, 107, 0.3) !important; color: #ffb86b !important; }
body.theme-sunset-dynamic .floating-btn { background: rgba(0, 0, 0, 0.35) !important; color: #ffb86b !important; border: 1px solid rgba(255, 184, 107, 0.4) !important; }
body.theme-sunset-dynamic .floating-btn.bookmark-btn { background: rgba(255, 184, 107, 0.15) !important; border: 1px solid #ffb86b !important; }
body.theme-sunset-dynamic .floating-btn.bookmark-btn.active { background: #ffb86b !important; color: #1a0a2e !important; }
body.theme-sunset-dynamic .speed-slider::-webkit-slider-thumb { background: #ffb86b !important; }
body.theme-sunset-dynamic .progress-slider-global::-webkit-slider-thumb { background: #ffb86b !important; box-shadow: 0 0 8px rgba(255,184,107,0.8) !important; }
body.theme-sunset-dynamic .progress-fill { background: linear-gradient(90deg, #ffb86b, #ff6b6b) !important; }
body.theme-sunset-dynamic .speed-preset.active { color: #ffb86b !important; background: rgba(255, 184, 107, 0.2) !important; }
body.theme-sunset-dynamic .auto-chapter-line { border-top-color: rgba(255, 184, 107, 0.2) !important; }
body.theme-sunset-dynamic .auto-chapter-line input { accent-color: #ffb86b !important; }
body.theme-sunset-dynamic .global-progress-container { background: rgba(0, 0, 0, 0.45) !important; border-top: 1px solid rgba(255, 184, 107, 0.3) !important; }
body.theme-sunset-dynamic .progress-info { color: rgba(255, 184, 107, 0.85) !important; }
body.theme-sunset-dynamic .shelf-item { background: rgba(255, 184, 107, 0.1) !important; border-color: rgba(255, 184, 107, 0.3) !important; color: #ffb86b !important; }
body.theme-sunset-dynamic .shelf-item:hover { background: rgba(255, 184, 107, 0.2) !important; border-color: rgba(255, 184, 107, 0.6) !important; }
body.theme-sunset-dynamic .book-chapter-item { background: rgba(255, 184, 107, 0.1) !important; border-color: rgba(255, 184, 107, 0.2) !important; }
body.theme-sunset-dynamic .book-chapter-item a { color: #ffb86b !important; }
body.theme-sunset-dynamic .book-chapter-item:hover { background: rgba(255, 184, 107, 0.2) !important; }
body.theme-sunset-dynamic .bookmark-item .title { color: #ffb86b !important; }
body.theme-sunset-dynamic .bookmark-header { border-bottom-color: rgba(255, 184, 107, 0.2) !important; }
body.theme-sunset-dynamic .chapter-tooltip { background: rgba(30, 20, 30, 0.85) !important; border-color: #ffb86b !important; color: #ffb86b !important; box-shadow: 0 6px 20px rgba(0,0,0,0.3) !important; }
body.theme-sunset-dynamic .page-turn-overlay { background: rgba(0, 0, 0, 0.5) !important; }
body.theme-sunset-dynamic .page-turn-overlay .book-left,
body.theme-sunset-dynamic .page-turn-overlay .book-right { background: rgba(30, 20, 30, 0.6) !important; border: 2px solid rgba(255, 184, 107, 0.4) !important; color: #ffb86b !important; }
body.theme-sunset-dynamic .page-turn-overlay .message { background: rgba(30, 20, 30, 0.8) !important; color: #ffb86b !important; border: 1px solid rgba(255, 184, 107, 0.5) !important; }
body.theme-sunset-dynamic .page-transition { background: rgba(0, 0, 0, 0.5) !important; }
body.theme-sunset-dynamic .page-transition .book-page { background: linear-gradient(135deg, #ffb86b, #c45c3a) !important; }
body.theme-sunset-dynamic .page-transition .loading-text { color: #ffb86b !important; }
body.theme-sunset-dynamic .page-transition .loading-dots span { background: #ffb86b !important; }
body.theme-sunset-dynamic .top-bar button.bookmark { background: rgba(255, 184, 107, 0.2) !important; border: 1px solid #ffb86b !important; color: #ffb86b !important; }
body.theme-sunset-dynamic .toast { background: rgba(0, 0, 0, 0.7) !important; color: #ffb86b !important; border: 1px solid rgba(255, 184, 107, 0.4) !important; }

/* 4. 深海波动 */
body.theme-wave-dynamic { background: linear-gradient(135deg, #0b2b44, #0d3b5e, #0a2a40, #0d3b5e, #0b2b44); background-size: 300% 300%; animation: waveMoveEnhanced 6s ease infinite; color: #c8e7f5 !important; }
@keyframes waveMoveEnhanced { 0% { background-position: 0% 0%; } 25% { background-position: 100% 50%; } 50% { background-position: 50% 100%; } 75% { background-position: 0% 50%; } 100% { background-position: 0% 0%; } }
body.theme-wave-dynamic .top-bar { background: rgba(0, 20, 30, 0.6) !important; border-bottom: 1px solid rgba(91, 192, 255, 0.3) !important; }
body.theme-wave-dynamic .top-bar, body.theme-wave-dynamic .top-bar a, body.theme-wave-dynamic .top-bar button { color: #5bc0ff !important; }
body.theme-wave-dynamic .back-btn { background: rgba(91, 192, 255, 0.15) !important; }
body.theme-wave-dynamic .page-title { color: #5bc0ff !important; text-shadow: 0 0 8px rgba(91,192,255,0.3); }
body.theme-wave-dynamic .ebook-chapter { background: rgba(0, 20, 30, 0.5) !important; backdrop-filter: blur(10px) !important; border: 1px solid rgba(91, 192, 255, 0.2) !important; }
body.theme-wave-dynamic .ebook-chapter .chapter-title { color: #5bc0ff !important; border-bottom-color: rgba(91, 192, 255, 0.3) !important; }
body.theme-wave-dynamic .floating-btn, body.theme-wave-dynamic .speed-panel, body.theme-wave-dynamic .font-controls, body.theme-wave-dynamic .theme-selector, body.theme-wave-dynamic .bookmark-panel { background: rgba(0, 20, 30, 0.65) !important; border: 1px solid rgba(91, 192, 255, 0.3) !important; color: #5bc0ff !important; }
body.theme-wave-dynamic .floating-btn { background: rgba(0, 20, 30, 0.5) !important; color: #5bc0ff !important; border: 1px solid rgba(91, 192, 255, 0.4) !important; animation: waveBtnFloat 3s ease-in-out infinite !important; }
@keyframes waveBtnFloat { 0% { transform: translateY(0px); } 50% { transform: translateY(-3px); } 100% { transform: translateY(0px); } }
body.theme-wave-dynamic .floating-btn.bookmark-btn { background: rgba(91, 192, 255, 0.15) !important; }
body.theme-wave-dynamic .floating-btn.bookmark-btn.active { background: #5bc0ff !important; color: #0b2b44 !important; }
body.theme-wave-dynamic .speed-slider::-webkit-slider-thumb { background: #5bc0ff !important; }
body.theme-wave-dynamic .progress-slider-global::-webkit-slider-thumb { background: #5bc0ff !important; box-shadow: 0 0 8px rgba(91,192,255,0.8) !important; }
body.theme-wave-dynamic .progress-fill { background: linear-gradient(90deg, #5bc0ff, #2d9cdb) !important; }
body.theme-wave-dynamic .speed-preset.active { color: #5bc0ff !important; background: rgba(91, 192, 255, 0.2) !important; }
body.theme-wave-dynamic .auto-chapter-line { border-top-color: rgba(91, 192, 255, 0.2) !important; }
body.theme-wave-dynamic .auto-chapter-line input { accent-color: #5bc0ff !important; }
body.theme-wave-dynamic .global-progress-container { background: rgba(0, 20, 30, 0.65) !important; border-top: 1px solid rgba(91, 192, 255, 0.3) !important; }
body.theme-wave-dynamic .progress-info { color: rgba(91, 192, 255, 0.85) !important; }
body.theme-wave-dynamic .shelf-item { background: rgba(91, 192, 255, 0.1) !important; border-color: rgba(91, 192, 255, 0.3) !important; color: #5bc0ff !important; }
body.theme-wave-dynamic .shelf-item:hover { background: rgba(91, 192, 255, 0.2) !important; border-color: rgba(91, 192, 255, 0.6) !important; }
body.theme-wave-dynamic .book-chapter-item { background: rgba(91, 192, 255, 0.1) !important; border-color: rgba(91, 192, 255, 0.2) !important; }
body.theme-wave-dynamic .book-chapter-item a { color: #5bc0ff !important; }
body.theme-wave-dynamic .book-chapter-item:hover { background: rgba(91, 192, 255, 0.2) !important; }
body.theme-wave-dynamic .bookmark-item .title { color: #5bc0ff !important; }
body.theme-wave-dynamic .bookmark-header { border-bottom-color: rgba(91, 192, 255, 0.2) !important; }
body.theme-wave-dynamic .chapter-tooltip { background: rgba(0, 20, 30, 0.9) !important; border-color: #5bc0ff !important; color: #5bc0ff !important; box-shadow: 0 6px 20px rgba(0,0,0,0.3) !important; }
body.theme-wave-dynamic .page-turn-overlay { background: rgba(10, 40, 60, 0.7) !important; }
body.theme-wave-dynamic .page-turn-overlay .book-left,
body.theme-wave-dynamic .page-turn-overlay .book-right { background: rgba(10, 40, 60, 0.6) !important; border: 2px solid rgba(91, 192, 255, 0.4) !important; color: #5bc0ff !important; }
body.theme-wave-dynamic .page-turn-overlay .message { background: rgba(10, 40, 60, 0.8) !important; color: #5bc0ff !important; border: 1px solid rgba(91, 192, 255, 0.5) !important; }
body.theme-wave-dynamic .page-transition { background: rgba(0, 20, 30, 0.7) !important; }
body.theme-wave-dynamic .page-transition .book-page { background: linear-gradient(135deg, #5bc0ff, #0d3b5e) !important; }
body.theme-wave-dynamic .page-transition .loading-text { color: #5bc0ff !important; }
body.theme-wave-dynamic .page-transition .loading-dots span { background: #5bc0ff !important; }
body.theme-wave-dynamic .top-bar button.bookmark { background: rgba(91, 192, 255, 0.2) !important; border: 1px solid #5bc0ff !important; color: #5bc0ff !important; }
body.theme-wave-dynamic .toast { background: rgba(0, 20, 30, 0.85) !important; color: #5bc0ff !important; border: 1px solid rgba(91, 192, 255, 0.4) !important; }

/* 5. 火焰之心 */
body.theme-fire-dynamic { background: linear-gradient(180deg, #4a0a0a, #8b2a1a, #d45a2a); background-size: 100% 200%; animation: firePulse 2s ease infinite alternate; color: #ffe0c0 !important; }
@keyframes firePulse { 0% { background-position: 0% 0%; } 100% { background-position: 0% 100%; } }
body.theme-fire-dynamic .top-bar { background: rgba(60, 10, 10, 0.6) !important; border-bottom: 1px solid rgba(255, 140, 66, 0.4) !important; }
body.theme-fire-dynamic .top-bar, body.theme-fire-dynamic .top-bar a, body.theme-fire-dynamic .top-bar button { color: #ff8c42 !important; }
body.theme-fire-dynamic .back-btn { background: rgba(255, 140, 66, 0.15) !important; }
body.theme-fire-dynamic .page-title { color: #ff8c42 !important; text-shadow: 0 0 8px rgba(255,140,66,0.4); }
body.theme-fire-dynamic .ebook-chapter { background: rgba(60, 10, 10, 0.5) !important; backdrop-filter: blur(10px) !important; border: 1px solid rgba(255, 140, 66, 0.3) !important; }
body.theme-fire-dynamic .ebook-chapter .chapter-title { color: #ff8c42 !important; border-bottom-color: rgba(255, 140, 66, 0.4) !important; }
body.theme-fire-dynamic .floating-btn, body.theme-fire-dynamic .speed-panel, body.theme-fire-dynamic .font-controls, body.theme-fire-dynamic .theme-selector, body.theme-fire-dynamic .bookmark-panel { background: rgba(60, 10, 10, 0.7) !important; border: 1px solid rgba(255, 140, 66, 0.4) !important; color: #ff8c42 !important; }
body.theme-fire-dynamic .floating-btn { background: rgba(60, 10, 10, 0.6) !important; color: #ff8c42 !important; border: 1px solid rgba(255, 140, 66, 0.5) !important; }
body.theme-fire-dynamic .floating-btn.bookmark-btn { background: rgba(255, 140, 66, 0.2) !important; }
body.theme-fire-dynamic .floating-btn.bookmark-btn.active { background: #ff8c42 !important; color: #4a0a0a !important; }
body.theme-fire-dynamic .speed-slider::-webkit-slider-thumb { background: #ff8c42 !important; }
body.theme-fire-dynamic .progress-slider-global::-webkit-slider-thumb { background: #ff8c42 !important; box-shadow: 0 0 8px rgba(255,140,66,0.8) !important; }
body.theme-fire-dynamic .progress-fill { background: linear-gradient(90deg, #ff8c42, #ff5722) !important; }
body.theme-fire-dynamic .speed-preset.active { color: #ff8c42 !important; background: rgba(255, 140, 66, 0.2) !important; }
body.theme-fire-dynamic .auto-chapter-line { border-top-color: rgba(255, 140, 66, 0.3) !important; }
body.theme-fire-dynamic .auto-chapter-line input { accent-color: #ff8c42 !important; }
body.theme-fire-dynamic .global-progress-container { background: rgba(60, 10, 10, 0.7) !important; border-top: 1px solid rgba(255, 140, 66, 0.4) !important; }
body.theme-fire-dynamic .progress-info { color: rgba(255, 140, 66, 0.85) !important; }
body.theme-fire-dynamic .shelf-item { background: rgba(255, 140, 66, 0.1) !important; border-color: rgba(255, 140, 66, 0.3) !important; color: #ff8c42 !important; }
body.theme-fire-dynamic .shelf-item:hover { background: rgba(255, 140, 66, 0.2) !important; border-color: rgba(255, 140, 66, 0.6) !important; }
body.theme-fire-dynamic .book-chapter-item { background: rgba(255, 140, 66, 0.1) !important; border-color: rgba(255, 140, 66, 0.2) !important; }
body.theme-fire-dynamic .book-chapter-item a { color: #ff8c42 !important; }
body.theme-fire-dynamic .book-chapter-item:hover { background: rgba(255, 140, 66, 0.2) !important; }
body.theme-fire-dynamic .bookmark-item .title { color: #ff8c42 !important; }
body.theme-fire-dynamic .bookmark-header { border-bottom-color: rgba(255, 140, 66, 0.3) !important; }
body.theme-fire-dynamic .chapter-tooltip { background: rgba(60, 10, 10, 0.92) !important; border-color: #ff8c42 !important; color: #ff8c42 !important; box-shadow: 0 6px 20px rgba(0,0,0,0.3) !important; }
body.theme-fire-dynamic .page-turn-overlay { background: rgba(60, 10, 10, 0.7) !important; }
body.theme-fire-dynamic .page-turn-overlay .book-left,
body.theme-fire-dynamic .page-turn-overlay .book-right { background: rgba(60, 10, 10, 0.6) !important; border: 2px solid rgba(255, 140, 66, 0.4) !important; color: #ff8c42 !important; }
body.theme-fire-dynamic .page-turn-overlay .message { background: rgba(60, 10, 10, 0.8) !important; color: #ff8c42 !important; border: 1px solid rgba(255, 140, 66, 0.5) !important; }
body.theme-fire-dynamic .page-transition { background: rgba(60, 10, 10, 0.7) !important; }
body.theme-fire-dynamic .page-transition .book-page { background: linear-gradient(135deg, #ff8c42, #d45a2a) !important; }
body.theme-fire-dynamic .page-transition .loading-text { color: #ff8c42 !important; }
body.theme-fire-dynamic .page-transition .loading-dots span { background: #ff8c42 !important; }
body.theme-fire-dynamic .top-bar button.bookmark { background: rgba(255, 140, 66, 0.2) !important; border: 1px solid #ff8c42 !important; color: #ff8c42 !important; }
body.theme-fire-dynamic .toast { background: rgba(60, 10, 10, 0.9) !important; color: #ff8c42 !important; border: 1px solid rgba(255, 140, 66, 0.4) !important; }

/* 6. 樱花飘舞 */
body.theme-sakura-dynamic { background: linear-gradient(135deg, #ffeef8 0%, #ffd9e8 50%, #ffb7c5 100%); background-size: 200% 200%; animation: sakuraFlow 8s ease infinite; color: #6b3e4a !important; }
@keyframes sakuraFlow { 0% { background-position: 0% 0%; } 50% { background-position: 100% 100%; } 100% { background-position: 0% 0%; } }
body.theme-sakura-dynamic .top-bar { background: rgba(255, 240, 245, 0.85) !important; backdrop-filter: blur(20px) !important; border-bottom: 1px solid rgba(255, 160, 180, 0.4) !important; }
body.theme-sakura-dynamic .top-bar, body.theme-sakura-dynamic .top-bar a, body.theme-sakura-dynamic .top-bar button { color: #b83b5e !important; }
body.theme-sakura-dynamic .back-btn { background: rgba(184, 59, 94, 0.12) !important; }
body.theme-sakura-dynamic .page-title { color: #b83b5e !important; text-shadow: 0 0 8px rgba(184,59,94,0.2); }
body.theme-sakura-dynamic .ebook-chapter { background: rgba(255, 255, 255, 0.7) !important; backdrop-filter: blur(10px) !important; border: 1px solid rgba(255, 160, 180, 0.3) !important; color: #6b3e4a !important; }
body.theme-sakura-dynamic .ebook-chapter .chapter-title { color: #e86f8f !important; border-bottom-color: rgba(232, 111, 143, 0.3) !important; }
body.theme-sakura-dynamic .floating-btn, body.theme-sakura-dynamic .speed-panel, body.theme-sakura-dynamic .font-controls, body.theme-sakura-dynamic .theme-selector, body.theme-sakura-dynamic .bookmark-panel { background: rgba(255, 240, 245, 0.9) !important; border: 1px solid rgba(232, 111, 143, 0.3) !important; color: #b83b5e !important; }
body.theme-sakura-dynamic .floating-btn { background: rgba(255, 240, 245, 0.85) !important; color: #e86f8f !important; border: 1px solid rgba(232, 111, 143, 0.4) !important; }
body.theme-sakura-dynamic .floating-btn.bookmark-btn { background: rgba(232, 111, 143, 0.2) !important; border: 1px solid #e86f8f !important; }
body.theme-sakura-dynamic .speed-slider::-webkit-slider-thumb { background: #e86f8f !important; }
body.theme-sakura-dynamic .progress-slider-global::-webkit-slider-thumb { background: #e86f8f !important; box-shadow: 0 0 8px rgba(232,111,143,0.6) !important; }
body.theme-sakura-dynamic .progress-fill { background: linear-gradient(90deg, #e86f8f, #b83b5e) !important; }
body.theme-sakura-dynamic .speed-preset.active { color: #e86f8f !important; background: rgba(232, 111, 143, 0.15) !important; }
body.theme-sakura-dynamic .global-progress-container { background: rgba(255, 240, 245, 0.9) !important; border-top: 1px solid rgba(232, 111, 143, 0.3) !important; }
body.theme-sakura-dynamic .shelf-item { background: rgba(232, 111, 143, 0.1) !important; border-color: rgba(232, 111, 143, 0.3) !important; color: #b83b5e !important; }
body.theme-sakura-dynamic .shelf-item:hover { background: rgba(232, 111, 143, 0.2) !important; }
body.theme-sakura-dynamic .book-chapter-item { background: rgba(232, 111, 143, 0.1) !important; }
body.theme-sakura-dynamic .book-chapter-item a { color: #b83b5e !important; }
body.theme-sakura-dynamic .chapter-tooltip { background: rgba(255, 240, 245, 0.95) !important; border-color: #e86f8f !important; color: #b83b5e !important; }
body.theme-sakura-dynamic .page-turn-overlay { background: rgba(255, 240, 245, 0.85) !important; }
body.theme-sakura-dynamic .page-turn-overlay .book-left,
body.theme-sakura-dynamic .page-turn-overlay .book-right { background: rgba(255, 245, 250, 0.9) !important; border: 2px solid rgba(232, 111, 143, 0.5) !important; color: #e86f8f !important; }
body.theme-sakura-dynamic .page-turn-overlay .message { background: rgba(255, 240, 245, 0.95) !important; color: #b83b5e !important; border: 1px solid #e86f8f !important; }
body.theme-sakura-dynamic .page-transition .book-page { background: linear-gradient(135deg, #e86f8f, #b83b5e) !important; }
body.theme-sakura-dynamic .page-transition .loading-text { color: #e86f8f !important; }
body.theme-sakura-dynamic .toast { background: rgba(255, 240, 245, 0.95) !important; color: #b83b5e !important; border: 1px solid #e86f8f !important; }

/* 7. 薄荷冰霜 */
body.theme-mintfrost-dynamic { background: linear-gradient(135deg, #c8e8e9 0%, #a8d8ea 50%, #88c8e8 100%); background-size: 200% 200%; animation: mintFlow 6s ease infinite; color: #2c5a5a !important; }
@keyframes mintFlow { 0% { background-position: 0% 0%; } 100% { background-position: 100% 100%; } }
body.theme-mintfrost-dynamic .top-bar { background: rgba(200, 232, 233, 0.85) !important; border-bottom: 1px solid rgba(100, 180, 200, 0.4) !important; }
body.theme-mintfrost-dynamic .top-bar, body.theme-mintfrost-dynamic .top-bar a, body.theme-mintfrost-dynamic .top-bar button { color: #2a7a7a !important; }
body.theme-mintfrost-dynamic .ebook-chapter { background: rgba(255, 255, 250, 0.75) !important; backdrop-filter: blur(10px) !important; border: 1px solid rgba(100, 180, 200, 0.3) !important; color: #2c5a5a !important; }
body.theme-mintfrost-dynamic .ebook-chapter .chapter-title { color: #3a9a9a !important; }
body.theme-mintfrost-dynamic .floating-btn, body.theme-mintfrost-dynamic .speed-panel, body.theme-mintfrost-dynamic .font-controls, body.theme-mintfrost-dynamic .theme-selector, body.theme-mintfrost-dynamic .bookmark-panel { background: rgba(200, 232, 233, 0.9) !important; border: 1px solid rgba(100, 180, 200, 0.3) !important; color: #2a7a7a !important; }
body.theme-mintfrost-dynamic .floating-btn { background: rgba(200, 232, 233, 0.85) !important; color: #3a9a9a !important; }
body.theme-mintfrost-dynamic .progress-slider-global::-webkit-slider-thumb { background: #3a9a9a !important; }
body.theme-mintfrost-dynamic .progress-fill { background: linear-gradient(90deg, #3a9a9a, #2a7a7a) !important; }
body.theme-mintfrost-dynamic .chapter-tooltip { background: rgba(200, 232, 233, 0.95) !important; border-color: #3a9a9a !important; color: #2a7a7a !important; }
body.theme-mintfrost-dynamic .page-turn-overlay { background: rgba(200, 232, 233, 0.85) !important; }
body.theme-mintfrost-dynamic .page-turn-overlay .book-left,
body.theme-mintfrost-dynamic .page-turn-overlay .book-right { background: rgba(220, 245, 245, 0.9) !important; border: 2px solid rgba(58, 154, 154, 0.5) !important; color: #3a9a9a !important; }
body.theme-mintfrost-dynamic .page-turn-overlay .message { background: rgba(200, 232, 233, 0.95) !important; color: #2a7a7a !important; border: 1px solid #3a9a9a !important; }
body.theme-mintfrost-dynamic .toast { background: rgba(200, 232, 233, 0.95) !important; color: #2a7a7a !important; border: 1px solid #3a9a9a !important; }
body.theme-mintfrost-dynamic .shelf-item { background: rgba(100, 180, 200, 0.15) !important; color: #2a7a7a !important; }
body.theme-mintfrost-dynamic .page-transition .book-page { background: linear-gradient(135deg, #3a9a9a, #2a7a7a) !important; }

/* 8. 薰衣草庄园 */
body.theme-lavenderfield-dynamic { background: linear-gradient(145deg, #d8cce8 0%, #b9a8d4 50%, #9b88c2 100%); background-size: 200% 200%; animation: lavenderFlow 10s ease infinite; color: #3a2a5a !important; }
@keyframes lavenderFlow { 0% { background-position: 0% 0%; } 50% { background-position: 100% 100%; } 100% { background-position: 0% 0%; } }
body.theme-lavenderfield-dynamic .top-bar { background: rgba(216, 204, 232, 0.85) !important; border-bottom: 1px solid rgba(155, 136, 194, 0.4) !important; }
body.theme-lavenderfield-dynamic .top-bar, body.theme-lavenderfield-dynamic .top-bar a, body.theme-lavenderfield-dynamic .top-bar button { color: #5a4a8a !important; }
body.theme-lavenderfield-dynamic .ebook-chapter { background: rgba(255, 250, 255, 0.75) !important; backdrop-filter: blur(10px) !important; color: #3a2a5a !important; }
body.theme-lavenderfield-dynamic .ebook-chapter .chapter-title { color: #8b6bbf !important; }
body.theme-lavenderfield-dynamic .floating-btn, body.theme-lavenderfield-dynamic .speed-panel, body.theme-lavenderfield-dynamic .font-controls, body.theme-lavenderfield-dynamic .theme-selector, body.theme-lavenderfield-dynamic .bookmark-panel { background: rgba(216, 204, 232, 0.9) !important; border: 1px solid rgba(155, 136, 194, 0.3) !important; color: #5a4a8a !important; }
body.theme-lavenderfield-dynamic .progress-slider-global::-webkit-slider-thumb { background: #8b6bbf !important; }
body.theme-lavenderfield-dynamic .chapter-tooltip { background: rgba(216, 204, 232, 0.95) !important; border-color: #8b6bbf !important; color: #5a4a8a !important; }
body.theme-lavenderfield-dynamic .page-turn-overlay { background: rgba(216, 204, 232, 0.85) !important; }
body.theme-lavenderfield-dynamic .page-turn-overlay .book-left,
body.theme-lavenderfield-dynamic .page-turn-overlay .book-right { background: rgba(230, 220, 245, 0.9) !important; border: 2px solid rgba(139, 107, 191, 0.5) !important; color: #8b6bbf !important; }
body.theme-lavenderfield-dynamic .page-turn-overlay .message { background: rgba(216, 204, 232, 0.95) !important; color: #5a4a8a !important; border: 1px solid #8b6bbf !important; }
body.theme-lavenderfield-dynamic .toast { background: rgba(216, 204, 232, 0.95) !important; color: #5a4a8a !important; border: 1px solid #8b6bbf !important; }
body.theme-lavenderfield-dynamic .page-transition .book-page { background: linear-gradient(135deg, #8b6bbf, #6b4a9f) !important; }
body.theme-lavenderfield-dynamic .shelf-item { background: rgba(139, 107, 191, 0.15) !important; color: #5a4a8a !important; }

/* 9. 金色麦田 */
body.theme-golden-dynamic { background: linear-gradient(135deg, #f5e6b8 0%, #e8d498 50%, #d4b86a 100%); background-size: 200% 200%; animation: goldenFlow 8s ease infinite; color: #5a4a2a !important; }
@keyframes goldenFlow { 0% { background-position: 0% 0%; } 100% { background-position: 100% 100%; } }
body.theme-golden-dynamic .top-bar { background: rgba(245, 230, 184, 0.85) !important; border-bottom: 1px solid rgba(212, 184, 106, 0.4) !important; }
body.theme-golden-dynamic .top-bar, body.theme-golden-dynamic .top-bar a, body.theme-golden-dynamic .top-bar button { color: #8a6a2a !important; }
body.theme-golden-dynamic .ebook-chapter { background: rgba(255, 255, 240, 0.8) !important; backdrop-filter: blur(10px) !important; color: #5a4a2a !important; }
body.theme-golden-dynamic .ebook-chapter .chapter-title { color: #c4a030 !important; }
body.theme-golden-dynamic .floating-btn, body.theme-golden-dynamic .speed-panel, body.theme-golden-dynamic .font-controls, body.theme-golden-dynamic .theme-selector, body.theme-golden-dynamic .bookmark-panel { background: rgba(245, 230, 184, 0.9) !important; border: 1px solid rgba(212, 184, 106, 0.3) !important; color: #8a6a2a !important; }
body.theme-golden-dynamic .progress-slider-global::-webkit-slider-thumb { background: #d4a030 !important; }
body.theme-golden-dynamic .chapter-tooltip { background: rgba(245, 230, 184, 0.95) !important; border-color: #d4a030 !important; color: #8a6a2a !important; }
body.theme-golden-dynamic .page-turn-overlay { background: rgba(245, 230, 184, 0.85) !important; }
body.theme-golden-dynamic .page-turn-overlay .book-left,
body.theme-golden-dynamic .page-turn-overlay .book-right { background: rgba(255, 250, 220, 0.9) !important; border: 2px solid rgba(212, 160, 48, 0.5) !important; color: #d4a030 !important; }
body.theme-golden-dynamic .page-turn-overlay .message { background: rgba(245, 230, 184, 0.95) !important; color: #8a6a2a !important; border: 1px solid #d4a030 !important; }
body.theme-golden-dynamic .toast { background: rgba(245, 230, 184, 0.95) !important; color: #8a6a2a !important; border: 1px solid #d4a030 !important; }
body.theme-golden-dynamic .page-transition .book-page { background: linear-gradient(135deg, #d4a030, #b08020) !important; }

/* 10. 珊瑚海洋 */
body.theme-coralreef-dynamic { background: linear-gradient(125deg, #ffaa88 0%, #ff8866 50%, #ff6644 100%); background-size: 200% 200%; animation: coralFlow 7s ease infinite; color: #4a2a1a !important; }
@keyframes coralFlow { 0% { background-position: 0% 0%; } 50% { background-position: 100% 100%; } 100% { background-position: 0% 0%; } }
body.theme-coralreef-dynamic .top-bar { background: rgba(255, 170, 136, 0.85) !important; border-bottom: 1px solid rgba(255, 100, 70, 0.4) !important; }
body.theme-coralreef-dynamic .top-bar, body.theme-coralreef-dynamic .top-bar a, body.theme-coralreef-dynamic .top-bar button { color: #8a3010 !important; }
body.theme-coralreef-dynamic .ebook-chapter { background: rgba(255, 250, 245, 0.8) !important; color: #4a2a1a !important; }
body.theme-coralreef-dynamic .ebook-chapter .chapter-title { color: #ff6644 !important; }
body.theme-coralreef-dynamic .floating-btn, body.theme-coralreef-dynamic .speed-panel, body.theme-coralreef-dynamic .font-controls, body.theme-coralreef-dynamic .theme-selector, body.theme-coralreef-dynamic .bookmark-panel { background: rgba(255, 170, 136, 0.9) !important; color: #8a3010 !important; }
body.theme-coralreef-dynamic .progress-slider-global::-webkit-slider-thumb { background: #ff6644 !important; }
body.theme-coralreef-dynamic .chapter-tooltip { background: rgba(255, 170, 136, 0.95) !important; border-color: #ff6644 !important; color: #8a3010 !important; }
body.theme-coralreef-dynamic .page-turn-overlay { background: rgba(255, 170, 136, 0.85) !important; }
body.theme-coralreef-dynamic .page-turn-overlay .book-left,
body.theme-coralreef-dynamic .page-turn-overlay .book-right { background: rgba(255, 200, 180, 0.9) !important; border: 2px solid rgba(255, 102, 68, 0.5) !important; color: #ff6644 !important; }
body.theme-coralreef-dynamic .page-turn-overlay .message { background: rgba(255, 170, 136, 0.95) !important; color: #8a3010 !important; border: 1px solid #ff6644 !important; }
body.theme-coralreef-dynamic .toast { background: rgba(255, 170, 136, 0.95) !important; color: #8a3010 !important; border: 1px solid #ff6644 !important; }
body.theme-coralreef-dynamic .page-transition .book-page { background: linear-gradient(135deg, #ff8866, #ff6644) !important; }

/* 11. 星空银河 */
body.theme-galaxy-dynamic { background: radial-gradient(ellipse at center, #0a0a2a 0%, #1a1a4a 50%, #2a2a5a 100%); background-size: 200% 200%; animation: galaxyTwinkle 15s ease infinite; color: #c8d0ff !important; }
@keyframes galaxyTwinkle { 0% { background-size: 100% 100%; opacity: 1; } 50% { background-size: 120% 120%; opacity: 0.95; } 100% { background-size: 100% 100%; opacity: 1; } }
body.theme-galaxy-dynamic .top-bar { background: rgba(10, 10, 42, 0.85) !important; border-bottom: 1px solid rgba(200, 200, 255, 0.3) !important; }
body.theme-galaxy-dynamic .top-bar, body.theme-galaxy-dynamic .top-bar a, body.theme-galaxy-dynamic .top-bar button { color: #aaacff !important; }
body.theme-galaxy-dynamic .ebook-chapter { background: rgba(30, 30, 70, 0.8) !important; backdrop-filter: blur(10px) !important; border: 1px solid rgba(170, 172, 255, 0.2) !important; color: #c8d0ff !important; }
body.theme-galaxy-dynamic .ebook-chapter .chapter-title { color: #aaacff !important; }
body.theme-galaxy-dynamic .floating-btn, body.theme-galaxy-dynamic .speed-panel, body.theme-galaxy-dynamic .font-controls, body.theme-galaxy-dynamic .theme-selector, body.theme-galaxy-dynamic .bookmark-panel { background: rgba(10, 10, 42, 0.9) !important; border: 1px solid rgba(170, 172, 255, 0.3) !important; color: #aaacff !important; }
body.theme-galaxy-dynamic .progress-slider-global::-webkit-slider-thumb { background: #aaacff !important; }
body.theme-galaxy-dynamic .chapter-tooltip { background: rgba(10, 10, 42, 0.95) !important; border-color: #aaacff !important; color: #aaacff !important; }
body.theme-galaxy-dynamic .page-turn-overlay { background: rgba(10, 10, 42, 0.85) !important; }
body.theme-galaxy-dynamic .page-turn-overlay .book-left,
body.theme-galaxy-dynamic .page-turn-overlay .book-right { background: rgba(30, 30, 70, 0.9) !important; border: 2px solid rgba(170, 172, 255, 0.5) !important; color: #aaacff !important; }
body.theme-galaxy-dynamic .page-turn-overlay .message { background: rgba(10, 10, 42, 0.95) !important; color: #aaacff !important; border: 1px solid #aaacff !important; }
body.theme-galaxy-dynamic .toast { background: rgba(10, 10, 42, 0.95) !important; color: #aaacff !important; border: 1px solid #aaacff !important; }
body.theme-galaxy-dynamic .page-transition .book-page { background: linear-gradient(135deg, #aaacff, #6a6acf) !important; }
body.theme-galaxy-dynamic .shelf-item { background: rgba(170, 172, 255, 0.1) !important; color: #aaacff !important; }

/* 12. 玫瑰花园 */
body.theme-rosegarden-dynamic { background: linear-gradient(145deg, #f5c8d8 0%, #e8a8c0 50%, #d888a8 100%); background-size: 200% 200%; animation: roseFlow 9s ease infinite; color: #5a2a3a !important; }
@keyframes roseFlow { 0% { background-position: 0% 0%; } 50% { background-position: 100% 100%; } 100% { background-position: 0% 0%; } }
body.theme-rosegarden-dynamic .top-bar { background: rgba(245, 200, 216, 0.85) !important; border-bottom: 1px solid rgba(216, 136, 168, 0.4) !important; }
body.theme-rosegarden-dynamic .top-bar, body.theme-rosegarden-dynamic .top-bar a, body.theme-rosegarden-dynamic .top-bar button { color: #a03050 !important; }
body.theme-rosegarden-dynamic .ebook-chapter { background: rgba(255, 245, 250, 0.8) !important; color: #5a2a3a !important; }
body.theme-rosegarden-dynamic .ebook-chapter .chapter-title { color: #d888a8 !important; }
body.theme-rosegarden-dynamic .floating-btn, body.theme-rosegarden-dynamic .speed-panel, body.theme-rosegarden-dynamic .font-controls, body.theme-rosegarden-dynamic .theme-selector, body.theme-rosegarden-dynamic .bookmark-panel { background: rgba(245, 200, 216, 0.9) !important; border: 1px solid rgba(216, 136, 168, 0.3) !important; color: #a03050 !important; }
body.theme-rosegarden-dynamic .progress-slider-global::-webkit-slider-thumb { background: #d888a8 !important; }
body.theme-rosegarden-dynamic .chapter-tooltip { background: rgba(245, 200, 216, 0.95) !important; border-color: #d888a8 !important; color: #a03050 !important; }
body.theme-rosegarden-dynamic .page-turn-overlay { background: rgba(245, 200, 216, 0.85) !important; }
body.theme-rosegarden-dynamic .page-turn-overlay .book-left,
body.theme-rosegarden-dynamic .page-turn-overlay .book-right { background: rgba(255, 230, 240, 0.9) !important; border: 2px solid rgba(216, 136, 168, 0.5) !important; color: #d888a8 !important; }
body.theme-rosegarden-dynamic .page-turn-overlay .message { background: rgba(245, 200, 216, 0.95) !important; color: #a03050 !important; border: 1px solid #d888a8 !important; }
body.theme-rosegarden-dynamic .toast { background: rgba(245, 200, 216, 0.95) !important; color: #a03050 !important; border: 1px solid #d888a8 !important; }
body.theme-rosegarden-dynamic .page-transition .book-page { background: linear-gradient(135deg, #d888a8, #c06888) !important; }

/* 主题色块样式 */
.theme-dot[data-theme="deep-space"] { background: linear-gradient(135deg, #0f0c29, #302b63); }
.theme-dot[data-theme="ocean"] { background: linear-gradient(135deg, #1a2980, #26d0ce); }
.theme-dot[data-theme="cherry"] { background: linear-gradient(135deg, #ff9a9e, #fecfef); }
.theme-dot[data-theme="night"] { background: #1a1a1a; }
.theme-dot[data-theme="forest"] { background: linear-gradient(135deg, #134e5e, #71b280); }
.theme-dot[data-theme="sunset"] { background: linear-gradient(135deg, #ff7e5f, #feb47b); }
.theme-dot[data-theme="lavender"] { background: linear-gradient(135deg, #8e9ecc, #e0bbff); }
.theme-dot[data-theme="blueberry"] { background: linear-gradient(135deg, #2c3e66, #4a69bd); }
.theme-dot[data-theme="amber"] { background: linear-gradient(135deg, #ffb347, #ffcc33); }
.theme-dot[data-theme="coral"] { background: linear-gradient(135deg, #ff6b6b, #ffb8b8); }
.theme-dot[data-theme="mint"] { background: linear-gradient(135deg, #a8e6cf, #80deea); }
.theme-dot[data-theme="rosegold"] { background: linear-gradient(135deg, #e8b4b8, #ffd9e2); }
.theme-dot[data-theme="eyecare"] { background: #c7edcc; border: 2px solid #8b9a6e; }
.theme-dot[data-theme="aurora-dynamic"] { background: linear-gradient(270deg, #1a0b2e, #2d1b69, #1a4d8c, #0f5c6b); animation: none; }
.theme-dot[data-theme="neon-dynamic"] { background: #0a0a0a; border: 2px solid #0ff; box-shadow: 0 0 5px #0ff; }
.theme-dot[data-theme="sunset-dynamic"] { background: linear-gradient(135deg, #5c2a4a, #e8a04a); }
.theme-dot[data-theme="wave-dynamic"] { background: linear-gradient(135deg, #0b2b44, #0d3b5e); }
.theme-dot[data-theme="fire-dynamic"] { background: linear-gradient(180deg, #4a0a0a, #d45a2a); }
.theme-dot[data-theme="sakura-dynamic"] { background: linear-gradient(135deg, #ffeef8, #ffb7c5); }
.theme-dot[data-theme="mintfrost-dynamic"] { background: linear-gradient(135deg, #c8e8e9, #88c8e8); }
.theme-dot[data-theme="lavenderfield-dynamic"] { background: linear-gradient(145deg, #d8cce8, #9b88c2); }
.theme-dot[data-theme="golden-dynamic"] { background: linear-gradient(135deg, #f5e6b8, #d4b86a); }
.theme-dot[data-theme="coralreef-dynamic"] { background: linear-gradient(125deg, #ffaa88, #ff6644); }
.theme-dot[data-theme="galaxy-dynamic"] { background: radial-gradient(ellipse at center, #0a0a2a, #2a2a5a); }
.theme-dot[data-theme="rosegarden-dynamic"] { background: linear-gradient(145deg, #f5c8d8, #d888a8); }
</style>
</head>
<body class="theme-deep-space">

<div class="floating-buttons" id="floatingButtons">
    <div class="floating-btn bookmark-btn" id="bookmarkFloatBtn">📋</div>
    <div class="floating-btn scroll-down" id="scrollToggleBtn">▼</div>
    <div class="floating-btn" id="themeFloatBtn">🎨</div>
</div>

<div class="speed-panel" id="speedPanel">
    <div class="speed-label"><span>⚡ 滚动速度</span><span class="speed-value" id="speedValue">6 px/帧</span></div>
    <input type="range" class="speed-slider" id="speedSlider" min="1" max="30" value="6" step="1">
    <div class="speed-presets">
        <div class="speed-preset" data-speed="3">🐢 慢</div>
        <div class="speed-preset" data-speed="6">⚡ 中</div>
        <div class="speed-preset" data-speed="10">🚀 快</div>
        <div class="speed-preset" data-speed="18">💨 极快</div>
    </div>
    <div class="auto-chapter-line"><span>📖 自动翻章</span><input type="checkbox" id="autoChapterCheckbox" checked></div>
</div>

<div class="font-controls" id="fontControls">
    <button id="fontMinus">A-</button>
    <button id="fontPlus">A+</button>
</div>
<div class="theme-selector" id="themeSelector">
    <!-- 12静态主题 -->
    <div class="theme-dot" data-theme="deep-space" title="深邃星空"></div>
    <div class="theme-dot" data-theme="ocean" title="深海宁静"></div>
    <div class="theme-dot" data-theme="cherry" title="樱花"></div>
    <div class="theme-dot" data-theme="night" title="黑夜模式"></div>
    <div class="theme-dot" data-theme="forest" title="森林绿意"></div>
    <div class="theme-dot" data-theme="sunset" title="日落橙"></div>
    <div class="theme-dot" data-theme="lavender" title="薰衣草"></div>
    <div class="theme-dot" data-theme="blueberry" title="蓝莓"></div>
    <div class="theme-dot" data-theme="amber" title="琥珀"></div>
    <div class="theme-dot" data-theme="coral" title="珊瑚粉"></div>
    <div class="theme-dot" data-theme="mint" title="薄荷绿"></div>
    <div class="theme-dot" data-theme="rosegold" title="玫瑰金"></div>
    <div class="theme-dot" data-theme="eyecare" title="护眼模式"></div>
    <div style="width:100%; height:1px; background:rgba(255,255,255,0.2); margin:5px 0;"></div>
    <!-- 12动态主题 -->
    <div class="theme-dot" data-theme="aurora-dynamic" title="极光幻彩（动态）"></div>
    <div class="theme-dot" data-theme="neon-dynamic" title="霓虹脉冲（动态）"></div>
    <div class="theme-dot" data-theme="sunset-dynamic" title="暮色晚霞（动态）"></div>
    <div class="theme-dot" data-theme="wave-dynamic" title="深海波动（动态）"></div>
    <div class="theme-dot" data-theme="fire-dynamic" title="火焰之心（动态）"></div>
    <div class="theme-dot" data-theme="sakura-dynamic" title="樱花飘舞（动态）"></div>
    <div class="theme-dot" data-theme="mintfrost-dynamic" title="薄荷冰霜（动态）"></div>
    <div class="theme-dot" data-theme="lavenderfield-dynamic" title="薰衣草庄园（动态）"></div>
    <div class="theme-dot" data-theme="golden-dynamic" title="金色麦田（动态）"></div>
    <div class="theme-dot" data-theme="coralreef-dynamic" title="珊瑚海洋（动态）"></div>
    <div class="theme-dot" data-theme="galaxy-dynamic" title="星空银河（动态）"></div>
    <div class="theme-dot" data-theme="rosegarden-dynamic" title="玫瑰花园（动态）"></div>
</div>
<div class="bookmark-panel" id="bookmarkPanel">
    <div class="bookmark-header"><span>📖 我的书签</span><span id="closePanelBtn">✕</span></div>
    <div class="bookmark-list" id="bookmarkList"><div class="empty-bookmark">📭 暂无书签<br>点击 ⭐ 添加</div></div>
</div>

<div id="globalProgressPlaceholder"></div>

<!-- 页面切换转场动画 -->
<div id="pageTransition" class="page-transition">
    <div class="book-loader">
        <div class="book-page"></div>
        <div class="book-page"></div>
        <div class="book-page"></div>
        <div class="book-page"></div>
    </div>
    <div class="loading-text">加载中</div>
    <div class="loading-dots">
        <span></span>
        <span></span>
        <span></span>
    </div>
</div>

<script>
// ==================== 主题适配的 Toast 提示框 ====================
function showToast(msg) {
    let t = document.querySelector('.toast');
    if (!t) { 
        t = document.createElement('div'); 
        t.className = 'toast'; 
        document.body.appendChild(t); 
    }
    t.textContent = msg;
    t.style.display = 'block';
    
    const bodyClass = document.body.className;
    if (bodyClass.includes('aurora')) {
        t.style.background = 'rgba(0, 0, 0, 0.8)'; t.style.color = '#7cffd0'; t.style.border = '1px solid rgba(124, 255, 208, 0.3)';
    } else if (bodyClass.includes('neon')) {
        t.style.background = 'rgba(0, 0, 0, 0.85)'; t.style.color = '#0ff'; t.style.border = '1px solid #0ff';
    } else if (bodyClass.includes('sunset-dynamic')) {
        t.style.background = 'rgba(0, 0, 0, 0.7)'; t.style.color = '#ffb86b'; t.style.border = '1px solid rgba(255, 184, 107, 0.4)';
    } else if (bodyClass.includes('wave')) {
        t.style.background = 'rgba(0, 20, 30, 0.85)'; t.style.color = '#5bc0ff'; t.style.border = '1px solid rgba(91, 192, 255, 0.4)';
    } else if (bodyClass.includes('fire')) {
        t.style.background = 'rgba(60, 10, 10, 0.9)'; t.style.color = '#ff8c42'; t.style.border = '1px solid rgba(255, 140, 66, 0.4)';
    } else if (bodyClass.includes('sakura')) {
        t.style.background = 'rgba(255, 240, 245, 0.95)'; t.style.color = '#b83b5e'; t.style.border = '1px solid #e86f8f';
    } else if (bodyClass.includes('mintfrost')) {
        t.style.background = 'rgba(200, 232, 233, 0.95)'; t.style.color = '#2a7a7a'; t.style.border = '1px solid #3a9a9a';
    } else if (bodyClass.includes('lavenderfield')) {
        t.style.background = 'rgba(216, 204, 232, 0.95)'; t.style.color = '#5a4a8a'; t.style.border = '1px solid #8b6bbf';
    } else if (bodyClass.includes('golden')) {
        t.style.background = 'rgba(245, 230, 184, 0.95)'; t.style.color = '#8a6a2a'; t.style.border = '1px solid #d4a030';
    } else if (bodyClass.includes('coralreef')) {
        t.style.background = 'rgba(255, 170, 136, 0.95)'; t.style.color = '#8a3010'; t.style.border = '1px solid #ff6644';
    } else if (bodyClass.includes('galaxy')) {
        t.style.background = 'rgba(10, 10, 42, 0.95)'; t.style.color = '#aaacff'; t.style.border = '1px solid #aaacff';
    } else if (bodyClass.includes('rosegarden')) {
        t.style.background = 'rgba(245, 200, 216, 0.95)'; t.style.color = '#a03050'; t.style.border = '1px solid #d888a8';
    } else if (bodyClass.includes('eyecare')) {
        t.style.background = 'rgba(199, 237, 204, 0.95)'; t.style.color = '#2d2d2d'; t.style.border = '1px solid rgba(139, 154, 110, 0.4)';
    } else {
        t.style.background = 'rgba(0,0,0,0.85)'; t.style.color = '#fff'; t.style.border = 'none';
    }
    setTimeout(() => t.style.display = 'none', 1500);
}
window.showToast = showToast;

const floatingBtns = document.getElementById('floatingButtons');
const speedPanel = document.getElementById('speedPanel');
const fontControls = document.getElementById('fontControls');
const themeSelector = document.getElementById('themeSelector');
const bookmarkPanel = document.getElementById('bookmarkPanel');

let hideTimer = null;
let globalProgressBar = null;

function showControls() {
    floatingBtns.classList.add('visible');
    speedPanel.classList.add('visible');
    if (globalProgressBar) globalProgressBar.classList.remove('hide');
    resetHideTimer();
}

function hideControls() {
    floatingBtns.classList.remove('visible');
    speedPanel.classList.remove('visible');
    fontControls.classList.remove('visible');
    themeSelector.classList.remove('visible');
    if (globalProgressBar) globalProgressBar.classList.add('hide');
}

function resetHideTimer() {
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
        if (!bookmarkPanel.classList.contains('show') && !themeSelector.classList.contains('visible') && !fontControls.classList.contains('visible') && !speedPanel.classList.contains('visible')) {
            hideControls();
        } else {
            resetHideTimer();
        }
    }, 5000);
}

let lastTap = 0;
document.body.addEventListener('click', (e) => {
    const now = Date.now();
    const timeDiff = now - lastTap;
    const isControlElement = e.target.closest('.floating-btn') || e.target.closest('.bookmark-panel') || 
                             e.target.closest('.theme-selector') || e.target.closest('.font-controls') ||
                             e.target.closest('.speed-panel') || e.target.closest('.global-progress-container');
    if (!isControlElement && timeDiff < 300 && timeDiff > 0) {
        e.preventDefault();
        if (floatingBtns.classList.contains('visible')) {
            hideControls();
            if (hideTimer) clearTimeout(hideTimer);
        } else {
            showControls();
        }
    }
    lastTap = now;
});

const bookmarkFloatBtn = document.getElementById('bookmarkFloatBtn');
const closePanelBtn = document.getElementById('closePanelBtn');
if (bookmarkFloatBtn) {
    bookmarkFloatBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        bookmarkPanel.classList.toggle('show');
        if (bookmarkPanel.classList.contains('show')) {
            showControls();
            if (hideTimer) clearTimeout(hideTimer);
        } else {
            resetHideTimer();
        }
    });
}
if (closePanelBtn) {
    closePanelBtn.addEventListener('click', () => {
        bookmarkPanel.classList.remove('show');
        resetHideTimer();
    });
}

const themeFloatBtn = document.getElementById('themeFloatBtn');
if (themeFloatBtn) {
    themeFloatBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (themeSelector.classList.contains('visible')) {
            themeSelector.classList.remove('visible');
        } else {
            themeSelector.classList.add('visible');
            resetHideTimer();
        }
    });
}

function updateAllThemeStyles() {
    const bodyClass = document.body.className;
    const scrollBtn = document.getElementById('scrollToggleBtn');
    const bookmarkBtn = document.getElementById('bookmarkFloatBtn');
    const topBarBookmarkBtn = document.querySelector('.top-bar button.bookmark');
    
    if (bodyClass.includes('aurora')) {
        if (scrollBtn) scrollBtn.style.color = '#7cffd0';
        if (bookmarkBtn) { bookmarkBtn.style.background = 'rgba(124, 255, 208, 0.2)'; bookmarkBtn.style.border = '1px solid #7cffd0'; bookmarkBtn.style.color = '#7cffd0'; }
    } else if (bodyClass.includes('neon')) {
        if (scrollBtn) scrollBtn.style.color = '#0ff';
        if (bookmarkBtn) { bookmarkBtn.style.background = 'rgba(0, 255, 255, 0.15)'; bookmarkBtn.style.border = '1px solid #0ff'; bookmarkBtn.style.color = '#0ff'; }
    } else if (bodyClass.includes('sunset-dynamic')) {
        if (scrollBtn) scrollBtn.style.color = '#ffb86b';
        if (bookmarkBtn) { bookmarkBtn.style.background = 'rgba(255, 184, 107, 0.2)'; bookmarkBtn.style.border = '1px solid #ffb86b'; bookmarkBtn.style.color = '#ffb86b'; }
    } else if (bodyClass.includes('wave')) {
        if (scrollBtn) scrollBtn.style.color = '#5bc0ff';
        if (bookmarkBtn) { bookmarkBtn.style.background = 'rgba(91, 192, 255, 0.2)'; bookmarkBtn.style.border = '1px solid #5bc0ff'; bookmarkBtn.style.color = '#5bc0ff'; }
    } else if (bodyClass.includes('fire')) {
        if (scrollBtn) scrollBtn.style.color = '#ff8c42';
        if (bookmarkBtn) { bookmarkBtn.style.background = 'rgba(255, 140, 66, 0.2)'; bookmarkBtn.style.border = '1px solid #ff8c42'; bookmarkBtn.style.color = '#ff8c42'; }
    } else if (bodyClass.includes('sakura')) {
        if (scrollBtn) scrollBtn.style.color = '#e86f8f';
        if (bookmarkBtn) { bookmarkBtn.style.background = 'rgba(232, 111, 143, 0.2)'; bookmarkBtn.style.border = '1px solid #e86f8f'; bookmarkBtn.style.color = '#b83b5e'; }
    } else if (bodyClass.includes('mintfrost')) {
        if (scrollBtn) scrollBtn.style.color = '#3a9a9a';
        if (bookmarkBtn) { bookmarkBtn.style.background = 'rgba(58, 154, 154, 0.2)'; bookmarkBtn.style.border = '1px solid #3a9a9a'; bookmarkBtn.style.color = '#2a7a7a'; }
    } else if (bodyClass.includes('lavenderfield')) {
        if (scrollBtn) scrollBtn.style.color = '#8b6bbf';
        if (bookmarkBtn) { bookmarkBtn.style.background = 'rgba(139, 107, 191, 0.2)'; bookmarkBtn.style.border = '1px solid #8b6bbf'; bookmarkBtn.style.color = '#5a4a8a'; }
    } else if (bodyClass.includes('golden')) {
        if (scrollBtn) scrollBtn.style.color = '#d4a030';
        if (bookmarkBtn) { bookmarkBtn.style.background = 'rgba(212, 160, 48, 0.2)'; bookmarkBtn.style.border = '1px solid #d4a030'; bookmarkBtn.style.color = '#8a6a2a'; }
    } else if (bodyClass.includes('coralreef')) {
        if (scrollBtn) scrollBtn.style.color = '#ff6644';
        if (bookmarkBtn) { bookmarkBtn.style.background = 'rgba(255, 102, 68, 0.2)'; bookmarkBtn.style.border = '1px solid #ff6644'; bookmarkBtn.style.color = '#8a3010'; }
    } else if (bodyClass.includes('galaxy')) {
        if (scrollBtn) scrollBtn.style.color = '#aaacff';
        if (bookmarkBtn) { bookmarkBtn.style.background = 'rgba(170, 172, 255, 0.2)'; bookmarkBtn.style.border = '1px solid #aaacff'; bookmarkBtn.style.color = '#aaacff'; }
    } else if (bodyClass.includes('rosegarden')) {
        if (scrollBtn) scrollBtn.style.color = '#d888a8';
        if (bookmarkBtn) { bookmarkBtn.style.background = 'rgba(216, 136, 168, 0.2)'; bookmarkBtn.style.border = '1px solid #d888a8'; bookmarkBtn.style.color = '#a03050'; }
    } else if (bodyClass.includes('eyecare')) {
        if (bookmarkBtn) { bookmarkBtn.style.background = 'rgba(139, 154, 110, 0.2)'; bookmarkBtn.style.border = '1px solid #8b9a6e'; bookmarkBtn.style.color = '#2d2d2d'; }
    } else {
        if (scrollBtn) scrollBtn.style.color = '';
        if (bookmarkBtn) { bookmarkBtn.style.background = ''; bookmarkBtn.style.border = ''; bookmarkBtn.style.color = ''; }
    }
    if (topBarBookmarkBtn) {
        if (bodyClass.includes('aurora')) { topBarBookmarkBtn.style.background = 'rgba(124, 255, 208, 0.2)'; topBarBookmarkBtn.style.border = '1px solid #7cffd0'; topBarBookmarkBtn.style.color = '#7cffd0'; }
        else if (bodyClass.includes('neon')) { topBarBookmarkBtn.style.background = 'rgba(0, 255, 255, 0.2)'; topBarBookmarkBtn.style.border = '1px solid #0ff'; topBarBookmarkBtn.style.color = '#0ff'; }
        else if (bodyClass.includes('eyecare')) { topBarBookmarkBtn.style.background = '#8b9a6e'; topBarBookmarkBtn.style.border = 'none'; topBarBookmarkBtn.style.color = '#2d2d2d'; }
        else { topBarBookmarkBtn.style.background = ''; topBarBookmarkBtn.style.border = ''; topBarBookmarkBtn.style.color = ''; }
    }
}

const THEMES = [
    'deep-space', 'ocean', 'cherry', 'night', 'forest', 'sunset',
    'lavender', 'blueberry', 'amber', 'coral', 'mint', 'rosegold',
    'eyecare', 
    'aurora-dynamic', 'neon-dynamic', 'sunset-dynamic', 'wave-dynamic', 'fire-dynamic',
    'sakura-dynamic', 'mintfrost-dynamic', 'lavenderfield-dynamic', 'golden-dynamic',
    'coralreef-dynamic', 'galaxy-dynamic', 'rosegarden-dynamic'
];
function setTheme(themeName) {
    document.body.className = 'theme-' + themeName;
    localStorage.setItem('reader_theme', themeName);
    document.querySelectorAll('.theme-dot').forEach(dot => {
        if (dot.dataset.theme === themeName) dot.classList.add('active');
        else dot.classList.remove('active');
    });
    if (window.updateAllTooltipColors) window.updateAllTooltipColors();
    updateAllThemeStyles();
    setTimeout(() => { if (typeof updateGlobalProgress === 'function') updateGlobalProgress(); }, 50);
}
const savedTheme = localStorage.getItem('reader_theme');
if (savedTheme && THEMES.includes(savedTheme)) setTheme(savedTheme);
else setTheme('deep-space');

document.querySelectorAll('.theme-dot').forEach(dot => {
    dot.addEventListener('click', (e) => {
        e.stopPropagation();
        setTheme(dot.dataset.theme);
        themeSelector.classList.remove('visible');
        showToast('🎨 主题已切换');
        resetHideTimer();
    });
});

// 滚动速度相关逻辑
const scrollBtn = document.getElementById('scrollToggleBtn');
if (scrollBtn) {
    scrollBtn.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (fontControls.classList.contains('visible')) fontControls.classList.remove('visible');
        else fontControls.classList.add('visible');
        resetHideTimer();
    });
}

const speedSlider = document.getElementById('speedSlider');
const speedValue = document.getElementById('speedValue');
const speedPresets = document.querySelectorAll('.speed-preset');
let currentSpeed = 6;
let autoScrollInterval = null;
let isAutoScrolling = false;
const savedSpeed = localStorage.getItem('scroll_speed');
if (savedSpeed) {
    currentSpeed = parseInt(savedSpeed);
    if (speedSlider) speedSlider.value = currentSpeed;
    if (speedValue) speedValue.innerText = currentSpeed + ' px/帧';
    speedPresets.forEach(preset => {
        if (parseInt(preset.dataset.speed) === currentSpeed) preset.classList.add('active');
        else preset.classList.remove('active');
    });
}
function updateSpeed(newSpeed) {
    currentSpeed = Math.min(30, Math.max(1, newSpeed));
    if (speedSlider) speedSlider.value = currentSpeed;
    if (speedValue) speedValue.innerText = currentSpeed + ' px/帧';
    localStorage.setItem('scroll_speed', currentSpeed);
    speedPresets.forEach(preset => {
        if (parseInt(preset.dataset.speed) === currentSpeed) preset.classList.add('active');
        else preset.classList.remove('active');
    });
    if (isAutoScrolling) { stopAutoScroll(); startAutoScroll(); }
}
if (speedSlider) {
    speedSlider.oninput = (e) => { updateSpeed(parseInt(e.target.value)); showToast(`⚡ 速度 ${currentSpeed} px/帧`); resetHideTimer(); };
}
speedPresets.forEach(preset => {
    preset.onclick = () => { updateSpeed(parseInt(preset.dataset.speed)); showToast(`⚡ ${preset.innerText} ${currentSpeed} px/帧`); resetHideTimer(); };
});
function startAutoScroll() {
    if (autoScrollInterval) clearInterval(autoScrollInterval);
    autoScrollInterval = setInterval(() => window.scrollBy(0, currentSpeed), 25);
    isAutoScrolling = true;
    if (scrollBtn) { scrollBtn.classList.add('active'); scrollBtn.innerHTML = "⏸"; }
    showToast(`▶ 滚动中 (${currentSpeed}px/帧)`);
}
function stopAutoScroll() {
    if (autoScrollInterval) { clearInterval(autoScrollInterval); autoScrollInterval = null; }
    isAutoScrolling = false;
    if (scrollBtn) { scrollBtn.classList.remove('active'); scrollBtn.innerHTML = "▼"; }
    showToast('⏹ 已停止');
}
if (scrollBtn) {
    scrollBtn.onclick = (e) => { e.stopPropagation(); if (isAutoScrolling) stopAutoScroll(); else startAutoScroll(); resetHideTimer(); };
}

// 书签功能
const STORAGE_KEY = "bookmarks_v6";
function getBookmarks(){
    try{ return JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]'); }catch(e){ return []; }
}
function saveBookmarks(list){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    refreshBookmarkList();
}
function refreshBookmarkList(){
    let list = getBookmarks();
    let container = document.getElementById('bookmarkList');
    if(!container) return;
    if(list.length===0){
        container.innerHTML='<div class="empty-bookmark">📭 暂无书签<br>点击 ⭐ 添加</div>';
        return;
    }
    list.sort((a,b)=>b.time-a.time);
    let html='';
    for(let b of list){
        let pageLabel = b.type==='txt'?'第'+b.page+'章':(b.type==='ebook'?'第'+b.page+'章':'第'+b.page+'页');
        html+=`<div class="bookmark-item" data-book="${escapeHtml(b.book)}" data-chapter="${escapeHtml(b.chapter)}" data-page="${b.page}">
            <span class="delete" data-book="${escapeHtml(b.book)}" data-chapter="${escapeHtml(b.chapter)}">🗑</span>
            <div class="title">📖 ${escapeHtml(b.book.length>18?b.book.substring(0,18)+'...':b.book)}</div>
            <div class="info">📄 ${escapeHtml(b.chapterName||b.chapter.substring(0,25))} &nbsp;|&nbsp; 📍 ${pageLabel}</div>
        </div>`;
    }
    container.innerHTML=html;
    document.querySelectorAll('#bookmarkList .bookmark-item').forEach(item=>{
        let book=item.getAttribute('data-book'), chapter=item.getAttribute('data-chapter'), page=parseInt(item.getAttribute('data-page'))||1;
        item.onclick=(e)=>{ if(e.target.classList.contains('delete')) return; jumpToBookmark(book,chapter,page); };
        let db=item.querySelector('.delete');
        if(db) db.onclick=(e)=>{ e.stopPropagation(); removeBookmark(db.getAttribute('data-book'), db.getAttribute('data-chapter')); };
    });
}
function removeBookmark(book,chapter){
    let list=getBookmarks();
    list=list.filter(b=>!(b.book===book&&b.chapter===chapter));
    saveBookmarks(list);
    showToast('🗑 删除书签');
}
function escapeHtml(s){ return (s||'').replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m])); }
let CURRENT_BOOK = '', CURRENT_CHAPTER = '';
function jumpToBookmark(book,chapter,page){
    if(book===CURRENT_BOOK&&chapter===CURRENT_CHAPTER){
        if (typeof jumpToPage === 'function') jumpToPage(page);
        else if (typeof renderChapter === 'function') renderChapter(Math.min(Math.max(1,page), (typeof chapters !== 'undefined' ? chapters.length : 1))-1);
    }else{
        sessionStorage.setItem('jump_target', JSON.stringify({book,chapter,page}));
        location.href = '<?php echo $currentFile; ?>?book='+encodeURIComponent(book)+'&chapter='+encodeURIComponent(chapter);
    }
}

// 自动翻章功能
let autoChapterEnabled = true;
let isTurningPage = false;
let turnTimer = null;
let lastScrollTop = 0;
let scrollDirection = 'down';
const autoChapterCheckbox = document.getElementById('autoChapterCheckbox');

function getThemeColorsForAnimation() {
    const bodyClass = document.body.className;
    let overlayBg = 'rgba(15, 12, 41, 0.92)', leftBg = 'rgba(48, 43, 99, 0.95)', rightBg = 'rgba(48, 43, 99, 0.95)';
    let leftBorder = '2px solid rgba(155, 89, 182, 0.6)', rightBorder = '2px solid rgba(155, 89, 182, 0.6)';
    let msgBg = 'rgba(48, 43, 99, 0.95)', msgColor = '#bb86fc', msgBorder = '1px solid rgba(155, 89, 182, 0.5)';
    
    if (bodyClass.includes('aurora')) {
        overlayBg = 'rgba(0, 0, 0, 0.6)'; leftBg = rightBg = 'rgba(0, 0, 0, 0.5)';
        leftBorder = rightBorder = '2px solid rgba(124, 255, 208, 0.4)';
        msgBg = 'rgba(0, 0, 0, 0.7)'; msgColor = '#7cffd0'; msgBorder = '1px solid rgba(124, 255, 208, 0.5)';
    } else if (bodyClass.includes('neon')) {
        overlayBg = 'rgba(0, 0, 0, 0.8)'; leftBg = rightBg = 'rgba(0, 0, 0, 0.7)';
        leftBorder = rightBorder = '2px solid #0ff'; msgBg = 'rgba(0, 0, 0, 0.9)'; msgColor = '#0ff'; msgBorder = '1px solid #0ff';
    } else if (bodyClass.includes('sunset-dynamic')) {
        overlayBg = 'rgba(0, 0, 0, 0.5)'; leftBg = rightBg = 'rgba(30, 20, 30, 0.6)';
        leftBorder = rightBorder = '2px solid rgba(255, 184, 107, 0.4)'; msgBg = 'rgba(30, 20, 30, 0.8)'; msgColor = '#ffb86b'; msgBorder = '1px solid rgba(255, 184, 107, 0.5)';
    } else if (bodyClass.includes('wave')) {
        overlayBg = 'rgba(10, 40, 60, 0.7)'; leftBg = rightBg = 'rgba(10, 40, 60, 0.6)';
        leftBorder = rightBorder = '2px solid rgba(91, 192, 255, 0.4)'; msgBg = 'rgba(10, 40, 60, 0.8)'; msgColor = '#5bc0ff'; msgBorder = '1px solid rgba(91, 192, 255, 0.5)';
    } else if (bodyClass.includes('fire')) {
        overlayBg = 'rgba(60, 10, 10, 0.7)'; leftBg = rightBg = 'rgba(60, 10, 10, 0.6)';
        leftBorder = rightBorder = '2px solid rgba(255, 140, 66, 0.4)'; msgBg = 'rgba(60, 10, 10, 0.8)'; msgColor = '#ff8c42'; msgBorder = '1px solid rgba(255, 140, 66, 0.5)';
    } else if (bodyClass.includes('sakura')) {
        overlayBg = 'rgba(255, 240, 245, 0.85)'; leftBg = rightBg = 'rgba(255, 245, 250, 0.9)';
        leftBorder = rightBorder = '2px solid rgba(232, 111, 143, 0.5)'; msgBg = 'rgba(255, 240, 245, 0.95)'; msgColor = '#b83b5e'; msgBorder = '1px solid #e86f8f';
    } else if (bodyClass.includes('mintfrost')) {
        overlayBg = 'rgba(200, 232, 233, 0.85)'; leftBg = rightBg = 'rgba(220, 245, 245, 0.9)';
        leftBorder = rightBorder = '2px solid rgba(58, 154, 154, 0.5)'; msgBg = 'rgba(200, 232, 233, 0.95)'; msgColor = '#2a7a7a'; msgBorder = '1px solid #3a9a9a';
    } else if (bodyClass.includes('lavenderfield')) {
        overlayBg = 'rgba(216, 204, 232, 0.85)'; leftBg = rightBg = 'rgba(230, 220, 245, 0.9)';
        leftBorder = rightBorder = '2px solid rgba(139, 107, 191, 0.5)'; msgBg = 'rgba(216, 204, 232, 0.95)'; msgColor = '#5a4a8a'; msgBorder = '1px solid #8b6bbf';
    } else if (bodyClass.includes('golden')) {
        overlayBg = 'rgba(245, 230, 184, 0.85)'; leftBg = rightBg = 'rgba(255, 250, 220, 0.9)';
        leftBorder = rightBorder = '2px solid rgba(212, 160, 48, 0.5)'; msgBg = 'rgba(245, 230, 184, 0.95)'; msgColor = '#8a6a2a'; msgBorder = '1px solid #d4a030';
    } else if (bodyClass.includes('coralreef')) {
        overlayBg = 'rgba(255, 170, 136, 0.85)'; leftBg = rightBg = 'rgba(255, 200, 180, 0.9)';
        leftBorder = rightBorder = '2px solid rgba(255, 102, 68, 0.5)'; msgBg = 'rgba(255, 170, 136, 0.95)'; msgColor = '#8a3010'; msgBorder = '1px solid #ff6644';
    } else if (bodyClass.includes('galaxy')) {
        overlayBg = 'rgba(10, 10, 42, 0.85)'; leftBg = rightBg = 'rgba(30, 30, 70, 0.9)';
        leftBorder = rightBorder = '2px solid rgba(170, 172, 255, 0.5)'; msgBg = 'rgba(10, 10, 42, 0.95)'; msgColor = '#aaacff'; msgBorder = '1px solid #aaacff';
    } else if (bodyClass.includes('rosegarden')) {
        overlayBg = 'rgba(245, 200, 216, 0.85)'; leftBg = rightBg = 'rgba(255, 230, 240, 0.9)';
        leftBorder = rightBorder = '2px solid rgba(216, 136, 168, 0.5)'; msgBg = 'rgba(245, 200, 216, 0.95)'; msgColor = '#a03050'; msgBorder = '1px solid #d888a8';
    } else if (bodyClass.includes('eyecare')) {
        overlayBg = 'rgba(199, 237, 204, 0.92)'; leftBg = rightBg = 'rgba(215, 245, 210, 0.95)';
        leftBorder = rightBorder = '2px solid rgba(139, 154, 110, 0.5)'; msgBg = 'rgba(215, 245, 210, 0.95)'; msgColor = '#2d2d2d'; msgBorder = '1px solid rgba(139, 154, 110, 0.4)';
    }
    return { overlayBg, leftBg, rightBg, leftBorder, rightBorder, msgBg, msgColor, msgBorder };
}

function showBookTurnAnimation(callback) {
    if (isTurningPage) { if (callback) callback(); return; }
    isTurningPage = true;
    const colors = getThemeColorsForAnimation();
    let overlay = document.createElement('div');
    overlay.className = 'page-turn-overlay';
    overlay.style.background = colors.overlayBg;
    overlay.innerHTML = `<div class="book-container"><div class="book-left">📖</div><div class="book-right">📖</div><div class="message">✨ 正在翻开新篇章 ✨</div></div>`;
    const bookLeft = overlay.querySelector('.book-left'), bookRight = overlay.querySelector('.book-right'), message = overlay.querySelector('.message');
    if (bookLeft) { bookLeft.style.background = colors.leftBg; bookLeft.style.border = colors.leftBorder; bookLeft.style.color = colors.msgColor; }
    if (bookRight) { bookRight.style.background = colors.rightBg; bookRight.style.border = colors.rightBorder; bookRight.style.color = colors.msgColor; }
    if (message) { message.style.background = colors.msgBg; message.style.color = colors.msgColor; message.style.border = colors.msgBorder; }
    document.body.appendChild(overlay);
    setTimeout(() => { if (callback) callback(); setTimeout(() => { if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay); isTurningPage = false; }, 150); }, 450);
}

if (localStorage.getItem('autoChapterEnabled') !== null) {
    autoChapterEnabled = localStorage.getItem('autoChapterEnabled') === 'true';
    if (autoChapterCheckbox) autoChapterCheckbox.checked = autoChapterEnabled;
} else { autoChapterEnabled = true; if (autoChapterCheckbox) autoChapterCheckbox.checked = true; }
if (autoChapterCheckbox) {
    autoChapterCheckbox.onchange = function(e) {
        autoChapterEnabled = this.checked;
        localStorage.setItem('autoChapterEnabled', autoChapterEnabled);
        showToast(autoChapterEnabled ? '✅ 自动翻章已开启' : '⏹ 自动翻章已关闭');
        resetHideTimer();
    };
}

let scrollTimer = null;
function checkScrollBottom() {
    if (!autoChapterEnabled || isTurningPage) return;
    let totalHeight = document.body.scrollHeight, windowHeight = window.innerHeight, scrollTop = window.scrollY;
    if (scrollTop > lastScrollTop) scrollDirection = 'down';
    else if (scrollTop < lastScrollTop) { scrollDirection = 'up'; if (turnTimer) { clearTimeout(turnTimer); turnTimer = null; } }
    lastScrollTop = scrollTop;
    let isAtBottom = (scrollTop + windowHeight + 15) >= totalHeight;
    if (isAtBottom && scrollDirection === 'down' && !turnTimer) {
        let nextBtn = document.getElementById('nextChapterBtn');
        if (nextBtn && !nextBtn.disabled) {
            showToast('📖 3秒后自动翻到下一章...');
            turnTimer = setTimeout(() => {
                if (!autoChapterEnabled || isTurningPage) { turnTimer = null; return; }
                if ((window.scrollY + windowHeight + 15) >= document.body.scrollHeight) {
                    showBookTurnAnimation(() => { if (nextBtn) nextBtn.click(); });
                }
                turnTimer = null;
            }, 3000);
        }
    }
}
window.addEventListener('scroll', function() { if (scrollTimer) clearTimeout(scrollTimer); scrollTimer = setTimeout(checkScrollBottom, 100); });
function onChapterChange() { if (turnTimer) { clearTimeout(turnTimer); turnTimer = null; } isTurningPage = false; lastScrollTop = 0; scrollDirection = 'down'; window.scrollTo(0, 0); if (typeof updateGlobalProgress === 'function') updateGlobalProgress(); }

// 页面转场动画
const pageTransition = {
    element: document.getElementById('pageTransition'),
    show() { if (!this.element) return; this.element.classList.add('active'); if (this.timeout) clearTimeout(this.timeout); this.timeout = setTimeout(() => { if (this.element) this.element.classList.remove('active'); }, 3000); },
    hide() { if (!this.element) return; this.element.classList.remove('active'); if (this.timeout) clearTimeout(this.timeout); }
};
function rippleHandler(e) {
    const ripple = document.createElement('span'); ripple.classList.add('ripple');
    const rect = this.getBoundingClientRect(); const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2, y = e.clientY - rect.top - size / 2;
    ripple.style.width = ripple.style.height = size + 'px'; ripple.style.left = x + 'px'; ripple.style.top = y + 'px';
    this.style.position = 'relative'; this.style.overflow = 'hidden'; this.appendChild(ripple);
    setTimeout(() => ripple.remove(), 500);
    if (this.tagName === 'A' && this.getAttribute('href') && !this.hasAttribute('data-no-transition')) {
        e.preventDefault(); const targetUrl = this.getAttribute('href');
        if (targetUrl && targetUrl !== '#') { pageTransition.show(); setTimeout(() => { window.location.href = targetUrl; }, 280); }
    }
}
function enhanceBookCards() { document.querySelectorAll('.shelf-item, .book-chapter-item a').forEach(card => { card.removeEventListener('click', rippleHandler); card.addEventListener('click', rippleHandler); }); }
function initPageLoadAnimation() { pageTransition.hide(); enhanceBookCards(); }
document.addEventListener('DOMContentLoaded', () => { initPageLoadAnimation(); enhanceBookCards(); updateAllThemeStyles(); });
window.addEventListener('pageshow', () => { pageTransition.hide(); });
window.addEventListener('beforeunload', () => { pageTransition.hide(); });

// 全局进度条
let globalChapters = [], globalTotalChapters = 0, globalCurrentIndex = 0, lastChapterIndex = -1, tooltipHideTimer = null;
function getThemeTooltipColors() {
    const bodyClass = document.body.className;
    if (bodyClass.includes('aurora')) return { bgColor: 'rgba(0, 0, 0, 0.75)', textColor: '#7cffd0', borderColor: '#7cffd0' };
    if (bodyClass.includes('neon')) return { bgColor: 'rgba(0, 0, 0, 0.9)', textColor: '#0ff', borderColor: '#0ff' };
    if (bodyClass.includes('sunset-dynamic')) return { bgColor: 'rgba(30, 20, 30, 0.85)', textColor: '#ffb86b', borderColor: '#ffb86b' };
    if (bodyClass.includes('wave')) return { bgColor: 'rgba(0, 20, 30, 0.9)', textColor: '#5bc0ff', borderColor: '#5bc0ff' };
    if (bodyClass.includes('fire')) return { bgColor: 'rgba(60, 10, 10, 0.92)', textColor: '#ff8c42', borderColor: '#ff8c42' };
    if (bodyClass.includes('sakura')) return { bgColor: 'rgba(255, 240, 245, 0.95)', textColor: '#b83b5e', borderColor: '#e86f8f' };
    if (bodyClass.includes('mintfrost')) return { bgColor: 'rgba(200, 232, 233, 0.95)', textColor: '#2a7a7a', borderColor: '#3a9a9a' };
    if (bodyClass.includes('lavenderfield')) return { bgColor: 'rgba(216, 204, 232, 0.95)', textColor: '#5a4a8a', borderColor: '#8b6bbf' };
    if (bodyClass.includes('golden')) return { bgColor: 'rgba(245, 230, 184, 0.95)', textColor: '#8a6a2a', borderColor: '#d4a030' };
    if (bodyClass.includes('coralreef')) return { bgColor: 'rgba(255, 170, 136, 0.95)', textColor: '#8a3010', borderColor: '#ff6644' };
    if (bodyClass.includes('galaxy')) return { bgColor: 'rgba(10, 10, 42, 0.95)', textColor: '#aaacff', borderColor: '#aaacff' };
    if (bodyClass.includes('rosegarden')) return { bgColor: 'rgba(245, 200, 216, 0.95)', textColor: '#a03050', borderColor: '#d888a8' };
    if (bodyClass.includes('eyecare')) return { bgColor: 'rgba(215, 245, 210, 0.98)', textColor: '#2d2d2d', borderColor: '#8b9a6e' };
    return { bgColor: 'rgba(0,0,0,0.95)', textColor: '#ff9800', borderColor: 'rgba(255,152,0,0.6)' };
}
function updateTooltipStyle(tooltip) { if (!tooltip) return; const c = getThemeTooltipColors(); tooltip.style.backgroundColor = c.bgColor; tooltip.style.color = c.textColor; tooltip.style.border = `1px solid ${c.borderColor}`; }
window.updateAllTooltipColors = function() { const tooltip = document.getElementById('chapterTooltip'); if (tooltip) updateTooltipStyle(tooltip); updateAllThemeStyles(); };
function showChapterTooltip(chapterIndex, chapterTitle) {
    let tooltip = document.getElementById('chapterTooltip');
    if (!tooltip) return;
    if (tooltipHideTimer) clearTimeout(tooltipHideTimer);
    let displayText = `📖 第 ${chapterIndex+1} 章 · ${chapterTitle.substring(0, 32)}${chapterTitle.length > 32 ? '...' : ''}`;
    tooltip.textContent = displayText;
    updateTooltipStyle(tooltip);
    tooltip.style.display = 'block';
    tooltipHideTimer = setTimeout(() => { if (tooltip) tooltip.style.display = 'none'; }, 2000);
}
function createGlobalProgressBar(total, currentIdx, chaptersList) {
    let container = document.getElementById('globalProgressPlaceholder');
    if (!container) return;
    container.innerHTML = `<div class="global-progress-container" id="globalProgressBar"><div class="progress-range-area"><input type="range" class="progress-slider-global" id="globalProgressSlider" min="0" max="${total-1}" value="${currentIdx}" step="1"><div class="chapter-tooltip" id="chapterTooltip" style="display: none;">📖 ${escapeHtml(chaptersList[currentIdx]?.title || '章节')}</div></div><div class="progress-info"><div class="progress-label"><span>📖 第 ${currentIdx+1} / ${total} 章</span></div><div>${escapeHtml(chaptersList[currentIdx]?.title || '')}</div></div></div>`;
    globalProgressBar = document.getElementById('globalProgressBar');
    let slider = document.getElementById('globalProgressSlider');
    if (slider) {
        slider.addEventListener('input', (e) => { let idx = parseInt(e.target.value); if (idx !== lastChapterIndex) { lastChapterIndex = idx; showChapterTooltip(idx, chaptersList[idx]?.title || '章节'); } });
        slider.addEventListener('change', (e) => { let idx = parseInt(e.target.value); if (typeof renderChapter === 'function') { renderChapter(idx); showToast(`📖 跳转到第 ${idx+1} 章`); } resetHideTimer(); });
    }
    if (globalProgressBar) globalProgressBar.classList.add('hide');
}
function updateGlobalProgress() {
    let container = document.getElementById('globalProgressBar');
    if (!container) return;
    let slider = document.getElementById('globalProgressSlider');
    let infoLabel = container.querySelector('.progress-label span');
    let infoTitle = container.querySelector('.progress-info > div:last-child');
    if (slider && globalTotalChapters > 0) {
        slider.value = globalCurrentIndex;
        if (infoLabel) infoLabel.innerText = `📖 第 ${globalCurrentIndex+1} / ${globalTotalChapters} 章`;
        if (infoTitle && globalChapters[globalCurrentIndex]) infoTitle.innerText = globalChapters[globalCurrentIndex].title || '';
        lastChapterIndex = globalCurrentIndex;
    }
}
window.updateGlobalProgress = updateGlobalProgress;
window.updateAllTooltipColors = updateAllTooltipColors;
window.updateAllThemeStyles = updateAllThemeStyles;
</script>

<?php if ($isChapterPage && $isPdf): ?>
<!-- PDF阅读页 -->
<div class="top-bar">
    <div class="top-bar-left">
        <button class="back-btn" id="backBtn">←</button>
        <div class="nav-links"><a href="<?php echo $currentFile; ?>">🏠 书架</a> / <a href="<?php echo $currentFile; ?>?book=<?php echo rawurlencode($book); ?>"><?php echo htmlspecialchars(mb_substr($book, 0, 12)); ?></a></div>
    </div>
    <div><button id="addBookmarkBtn" class="bookmark">⭐ 加书签</button></div>
</div>
<div class="progress-bar"><div class="progress-fill" id="progressFill"></div></div>
<div class="content" id="reader"><div class="loading-msg" id="loadingMsg">⏳ 正在加载 PDF...<br><?php echo htmlspecialchars($chapter); ?></div></div>
<script>
CURRENT_BOOK = "<?php echo addslashes($book); ?>";
CURRENT_CHAPTER = "<?php echo addslashes($chapter); ?>";
const CHAPTER_NAME = "<?php echo addslashes($chapter); ?>";
const PDF_URL = "<?php echo $fileUrl; ?>";
const BASE_FILE = "<?php echo $currentFile; ?>";

let pdfDoc=null,totalPages=0,renderedPages=new Set(),targetPage=null,scale=1.5;
document.getElementById('backBtn').onclick=()=>{if(document.referrer&&document.referrer.includes(window.location.host))history.back();else location.href=BASE_FILE;};
function getCurrentPage(){let cs=document.querySelectorAll('.canvas-container');for(let i=0;i<cs.length;i++){let r=cs[i].getBoundingClientRect();if(r.top<=150&&r.bottom>=100){let p=parseInt(cs[i].getAttribute('data-page'));if(!isNaN(p))return p;}}return 1;}
function addBookmark(){let p=getCurrentPage(),l=getBookmarks(),i=l.findIndex(b=>b.book===CURRENT_BOOK&&b.chapter===CURRENT_CHAPTER),n={book:CURRENT_BOOK,chapter:CURRENT_CHAPTER,chapterName:CHAPTER_NAME.length>35?CHAPTER_NAME.substring(0,32)+'...':CHAPTER_NAME,page:p,time:Date.now()};if(i>=0)l[i]=n;else l.push(n);saveBookmarks(l);showToast('✅ 第 '+p+' 页');}
function jumpToPage(p){p=Math.min(Math.max(1,p),totalPages);let t=document.querySelector(`.canvas-container[data-page="${p}"]`);if(t){t.scrollIntoView({behavior:'smooth',block:'start'});showToast('✨ 第 '+p+' 页');}else{showToast('📖 加载中...');(async()=>{let s=Math.max(1,p-3),e=Math.min(totalPages,p+3);for(let i=s;i<=e;i++)if(!renderedPages.has(i))await renderPage(i);setTimeout(()=>{let c=document.querySelector(`.canvas-container[data-page="${p}"]`);if(c){c.scrollIntoView({behavior:'smooth',block:'start'});showToast('✨ 第 '+p+' 页');}},300);})();}}
window.jumpToBookmark = function(book,chapter,p){if(book===CURRENT_BOOK&&chapter===CURRENT_CHAPTER)jumpToPage(p);else{sessionStorage.setItem('jump_target',JSON.stringify({book,chapter,page:p}));location.href=BASE_FILE+'?book='+encodeURIComponent(book)+'&chapter='+encodeURIComponent(chapter);}};
async function renderPage(n){if(!pdfDoc||renderedPages.has(n))return;renderedPages.add(n);let div=document.createElement('div');div.className='canvas-container';div.setAttribute('data-page',n);let p=document.createElement('div');p.className='loading-placeholder';p.innerText=`⏳ 第 ${n} 页...`;div.appendChild(p);let ins=false,ex=document.querySelectorAll('.canvas-container');for(let i=0;i<ex.length;i++){let ep=parseInt(ex[i].getAttribute('data-page'));if(ep>n){ex[i].before(div);ins=true;break;}}if(!ins)document.getElementById('reader').appendChild(div);try{let page=await pdfDoc.getPage(n),vp=page.getViewport({scale:scale}),cv=document.createElement('canvas');cv.width=vp.width;cv.height=vp.height;cv.style.width='100%';cv.style.height='auto';await page.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise;div.innerHTML='';div.appendChild(cv);let pf=document.getElementById('progressFill');if(pf)pf.style.width=(renderedPages.size/totalPages)*100+'%';}catch(e){p.innerText=`❌ 第 ${n} 页失败`;}}
let st;function onScrollLoad(){if(st)clearTimeout(st);st=setTimeout(()=>{if(!pdfDoc)return;let cs=document.querySelectorAll('.canvas-container'),need=new Set();cs.forEach(c=>{let r=c.getBoundingClientRect();if(r.top-600<window.innerHeight&&r.bottom+600>0){let p=parseInt(c.getAttribute('data-page'));if(!isNaN(p))need.add(p);}});let toRender=[];need.forEach(p=>{for(let i=-2;i<=2;i++){let np=p+i;if(np>=1&&np<=totalPages&&!renderedPages.has(np))toRender.push(np);}});toRender.sort((a,b)=>a-b).forEach(p=>renderPage(p));},200);}
async function loadPDF(){try{let lm=document.getElementById('loadingMsg');lm.style.display='block';pdfDoc=await pdfjsLib.getDocument(PDF_URL).promise;totalPages=pdfDoc.numPages;lm.innerText=`📄 共 ${totalPages} 页，加载中...`;let jump=sessionStorage.getItem('jump_target');if(jump){sessionStorage.removeItem('jump_target');try{let t=JSON.parse(jump);if(t.book===CURRENT_BOOK&&t.chapter===CURRENT_CHAPTER&&t.page)targetPage=t.page;}catch(e){}}else{let bks=getBookmarks(),ex=bks.find(b=>b.book===CURRENT_BOOK&&b.chapter===CURRENT_CHAPTER);if(ex&&ex.page)targetPage=ex.page;}for(let i=1;i<=Math.min(5,totalPages);i++)await renderPage(i);lm.style.display='none';if(targetPage){let s=Math.max(1,targetPage-2),e=Math.min(totalPages,targetPage+2);for(let i=s;i<=e;i++)if(!renderedPages.has(i))await renderPage(i);setTimeout(()=>{let c=document.querySelector(`.canvas-container[data-page="${targetPage}"]`);if(c){c.scrollIntoView({behavior:'smooth',block:'start'});showToast('📖 第 '+targetPage+' 页');}targetPage=null;},500);}window.addEventListener('scroll',onScrollLoad);}catch(e){document.getElementById('loadingMsg').innerHTML=`❌ 加载失败<br>${e.message}`;}}
document.getElementById('addBookmarkBtn').onclick=addBookmark;
loadPDF(); refreshBookmarkList();
updateAllThemeStyles();
</script>

<?php elseif ($isChapterPage && $isTxt && $txtData): ?>
<!-- TXT小说阅读页 -->
<div class="top-bar"><div class="top-bar-left"><button class="back-btn" id="backBtn">←</button><div class="nav-links"><a href="<?php echo $currentFile; ?>">🏠 书架</a> / <a href="<?php echo $currentFile; ?>?book=<?php echo rawurlencode($book); ?>"><?php echo htmlspecialchars(mb_substr($book, 0, 12)); ?></a></div></div><div><button id="addBookmarkBtn" class="bookmark">⭐ 加书签</button></div></div>
<div class="content" id="reader"><div id="txtContent"></div><div class="ebook-nav"><button id="prevChapterBtn" disabled>◀ 上一章</button><button id="nextChapterBtn" disabled>下一章 ▶</button></div><div class="chapter-indicator" id="chapterIndicator"></div></div>
<script>
CURRENT_BOOK = "<?php echo addslashes($book); ?>";
CURRENT_CHAPTER = "<?php echo addslashes($chapter); ?>";
const CHAPTER_NAME = "<?php echo addslashes($chapter); ?>";
const BASE_FILE = "<?php echo $currentFile; ?>";
const TXT_DATA = <?php echo json_encode($txtData); ?>;
let curIdx=0,chapters=TXT_DATA.chapters||[],fontSize=18;
globalChapters = chapters;
globalTotalChapters = chapters.length;
globalCurrentIndex = 0;
function applyStyles(){let s=document.getElementById('txt-style');if(!s){s=document.createElement('style');s.id='txt-style';document.head.appendChild(s);}s.textContent=`.ebook-chapter{font-size:${fontSize}px}.ebook-chapter p{margin-bottom:1em;text-indent:2em}`;}
function renderChapter(i){if(!chapters||i<0||i>=chapters.length)return;onChapterChange();curIdx=i;globalCurrentIndex=i;document.getElementById('txtContent').innerHTML=`<div class="ebook-chapter"><div class="chapter-title">${escapeHtml(chapters[i].title)}</div>${chapters[i].content}</div>`;document.getElementById('prevChapterBtn').disabled=(i<=0);document.getElementById('nextChapterBtn').disabled=(i>=chapters.length-1);document.getElementById('chapterIndicator').innerText=`第 ${i+1}/${chapters.length} 章 · ${chapters[i].title}`;saveProgress(i);if(typeof updateGlobalProgress==='function')updateGlobalProgress();}
function saveProgress(i){let l=getBookmarks(),idx=l.findIndex(b=>b.book===CURRENT_BOOK&&b.chapter===CURRENT_CHAPTER),n={book:CURRENT_BOOK,chapter:CURRENT_CHAPTER,chapterName:CHAPTER_NAME.length>35?CHAPTER_NAME.substring(0,32)+'...':CHAPTER_NAME,page:i+1,time:Date.now(),type:'txt'};if(idx>=0)l[idx]=n;else l.push(n);saveBookmarks(l);}
window.jumpToBookmark = function(book,chapter,page){if(book===CURRENT_BOOK&&chapter===CURRENT_CHAPTER){renderChapter(Math.min(Math.max(1,page),chapters.length)-1);showToast('✨ 第 '+page+' 章');}else{sessionStorage.setItem('jump_target',JSON.stringify({book,chapter,page,type:'txt'}));location.href=BASE_FILE+'?book='+encodeURIComponent(book)+'&chapter='+encodeURIComponent(chapter);}};
function addBookmark(){let n=curIdx+1,l=getBookmarks(),i=l.findIndex(b=>b.book===CURRENT_BOOK&&b.chapter===CURRENT_CHAPTER),ni={book:CURRENT_BOOK,chapter:CURRENT_CHAPTER,chapterName:CHAPTER_NAME.length>35?CHAPTER_NAME.substring(0,32)+'...':CHAPTER_NAME,page:n,time:Date.now(),type:'txt'};if(i>=0)l[i]=ni;else l.push(ni);saveBookmarks(l);showToast('✅ 第 '+n+' 章');}
document.getElementById('fontPlus').onclick=()=>{fontSize=Math.min(fontSize+2,32);applyStyles();renderChapter(curIdx);showToast(`字体 ${fontSize}px`);resetHideTimer();};
document.getElementById('fontMinus').onclick=()=>{fontSize=Math.max(fontSize-2,12);applyStyles();renderChapter(curIdx);showToast(`字体 ${fontSize}px`);resetHideTimer();};
document.getElementById('backBtn').onclick=()=>{if(document.referrer&&document.referrer.includes(window.location.host))history.back();else location.href=BASE_FILE;};
document.getElementById('prevChapterBtn').onclick=()=>{if(curIdx>0)renderChapter(curIdx-1);resetHideTimer();};
document.getElementById('nextChapterBtn').onclick=()=>{if(curIdx<chapters.length-1)renderChapter(curIdx+1);resetHideTimer();};
document.getElementById('addBookmarkBtn').onclick=addBookmark;
applyStyles();if(chapters.length>0){let saved=0,jump=sessionStorage.getItem('jump_target');if(jump){sessionStorage.removeItem('jump_target');try{let t=JSON.parse(jump);if(t.book===CURRENT_BOOK&&t.chapter===CURRENT_CHAPTER&&t.page)saved=Math.min(Math.max(1,t.page),chapters.length)-1;}catch(e){}}else{let bks=getBookmarks(),ex=bks.find(b=>b.book===CURRENT_BOOK&&b.chapter===CURRENT_CHAPTER);if(ex&&ex.page)saved=Math.min(Math.max(1,ex.page),chapters.length)-1;}renderChapter(saved);}
refreshBookmarkList();
createGlobalProgressBar(globalTotalChapters, globalCurrentIndex, globalChapters);
updateAllThemeStyles();
</script>

<?php elseif ($isChapterPage && $isEpub && $epubData): ?>
<!-- EPUB阅读页 -->
<div class="top-bar"><div class="top-bar-left"><button class="back-btn" id="backBtn">←</button><div class="nav-links"><a href="<?php echo $currentFile; ?>">🏠 书架</a> / <a href="<?php echo $currentFile; ?>?book=<?php echo rawurlencode($book); ?>"><?php echo htmlspecialchars(mb_substr($book, 0, 12)); ?></a></div></div><div><button id="addBookmarkBtn" class="bookmark">⭐ 加书签</button></div></div>
<div class="content" id="reader">
<?php if ($epubData['type'] == 'comic'): ?>
    <?php $comicImages = $epubData['images']; ?>
    <div id="comicViewer">
    <?php foreach($comicImages as $idx => $imgPath): ?>
    <div class="canvas-container" data-page="<?php echo $idx+1; ?>" style="margin-bottom: 20px;">
        <img src="<?php echo $imgPath; ?>" loading="lazy" style="max-width:100%; height:auto; border-radius:8px; display:block; margin:0 auto;" 
             onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22400%22%3E%3Crect width=%22300%22 height=%22400%22 fill=%22%23333%22/%3E%3Ctext x=%22150%22 y=%22200%22 fill=%22%23fff%22 text-anchor=%22middle%22%3E图片加载失败%3C/text%3E%3C/svg%3E';">
        <div class="comic-page-info" style="text-align:center; padding:8px; font-size:12px; color:rgba(255,255,255,0.6);">第 <?php echo $idx+1; ?> / <?php echo count($comicImages); ?> 页</div>
    </div>
    <?php endforeach; ?>
    </div>
    <script>
    CURRENT_BOOK = "<?php echo addslashes($book); ?>";
    CURRENT_CHAPTER = "<?php echo addslashes($chapter); ?>";
    const CHAPTER_NAME = "<?php echo addslashes($chapter); ?>";
    const BASE_FILE = "<?php echo $currentFile; ?>";
    const TOTAL_PAGES = <?php echo count($comicImages); ?>;
    globalChapters = [{title: CHAPTER_NAME}];
    globalTotalChapters = 1;
    globalCurrentIndex = 0;
    function getCurrentPage(){let cs=document.querySelectorAll('.canvas-container'),bestPage=1,bestDistance=Infinity,viewportHeight=window.innerHeight;for(let i=0;i<cs.length;i++){let rect=cs[i].getBoundingClientRect(),center=rect.top+rect.height/2,distance=Math.abs(center-viewportHeight/2);if(distance<bestDistance){bestDistance=distance;bestPage=i+1;}}return bestPage;}
    function updateGlobalProgressForComic(){let c=document.getElementById('globalProgressBar');if(!c)return;let s=document.getElementById('globalProgressSlider'),l=c.querySelector('.progress-label span'),t=c.querySelector('.progress-info > div:last-child');if(s&&TOTAL_PAGES>0){let p=getCurrentPage();s.value=p;if(l)l.innerText=`📖 第 ${p} / ${TOTAL_PAGES} 页`;if(t)t.innerText=`第 ${p} 页 / 共 ${TOTAL_PAGES} 页`;}}
    window.updateGlobalProgress = updateGlobalProgressForComic;
    function saveComicProgress(page) {
        let list = getBookmarks();
        let idx = list.findIndex(b => b.book === CURRENT_BOOK && b.chapter === CURRENT_CHAPTER);
        let bookmark = {
            book: CURRENT_BOOK,
            chapter: CURRENT_CHAPTER,
            chapterName: CHAPTER_NAME.length > 35 ? CHAPTER_NAME.substring(0,32)+'...' : CHAPTER_NAME,
            page: page,
            time: Date.now(),
            type: 'comic'
        };
        if (idx >= 0) list[idx] = bookmark;
        else list.push(bookmark);
        saveBookmarks(list);
    }
    function addBookmark(){let p=getCurrentPage();saveComicProgress(p);showToast('✅ 第 '+p+' 页');}
    function jumpToPage(p){p=Math.min(Math.max(1,p),TOTAL_PAGES);let t=document.querySelector(`.canvas-container[data-page="${p}"]`);if(t){t.scrollIntoView({behavior:'smooth',block:'start'});showToast('✨ 第 '+p+' 页');saveComicProgress(p);setTimeout(()=>{if(typeof updateGlobalProgress==='function')updateGlobalProgress();},300);}else{showToast('📖 页面加载中...');}}
    window.jumpToBookmark = function(book,chapter,page){if(book===CURRENT_BOOK&&chapter===CURRENT_CHAPTER)jumpToPage(page);else{sessionStorage.setItem('jump_target',JSON.stringify({book,chapter,page,type:'comic'}));location.href=BASE_FILE+'?book='+encodeURIComponent(book)+'&chapter='+encodeURIComponent(chapter);}};
    document.getElementById('backBtn').onclick=()=>{if(document.referrer&&document.referrer.includes(window.location.host))history.back();else location.href=BASE_FILE;};
    document.getElementById('addBookmarkBtn').onclick=addBookmark;
    document.getElementById('fontControls').style.display='none';
    refreshBookmarkList();
    function createComicProgressBar(){let c=document.getElementById('globalProgressPlaceholder');if(!c)return;c.innerHTML=`<div class="global-progress-container" id="globalProgressBar"><div class="progress-range-area"><input type="range" class="progress-slider-global" id="globalProgressSlider" min="1" max="${TOTAL_PAGES}" value="1" step="1"><div class="chapter-tooltip" id="chapterTooltip" style="display: none;">📖 第 1 / ${TOTAL_PAGES} 页</div></div><div class="progress-info"><div class="progress-label"><span>📖 第 1 / ${TOTAL_PAGES} 页</span></div><div>第 1 页 / 共 ${TOTAL_PAGES} 页</div></div></div>`;globalProgressBar=document.getElementById('globalProgressBar');let s=document.getElementById('globalProgressSlider'),tip=document.getElementById('chapterTooltip'),tipTimer=null;function st(page){if(tipTimer)clearTimeout(tipTimer);tip.textContent=`📖 第 ${page} / ${TOTAL_PAGES} 页`;tip.style.display='block';tipTimer=setTimeout(()=>{tip.style.display='none';},2000);}if(s){s.addEventListener('input',(e)=>{let p=parseInt(e.target.value),l=c.querySelector('.progress-label span'),t=c.querySelector('.progress-info > div:last-child');if(l)l.innerText=`📖 第 ${p} / ${TOTAL_PAGES} 页`;if(t)t.innerText=`第 ${p} 页 / 共 ${TOTAL_PAGES} 页`;st(p);});s.addEventListener('change',(e)=>{jumpToPage(parseInt(e.target.value));resetHideTimer();});}if(globalProgressBar)globalProgressBar.classList.add('hide');let stt=null;window.addEventListener('scroll',function(){if(stt)clearTimeout(stt);stt=setTimeout(()=>{if(typeof updateGlobalProgress==='function')updateGlobalProgress();let p=getCurrentPage();saveComicProgress(p);},200);});}
    createComicProgressBar();
    let jumpTarget=sessionStorage.getItem('jump_target');if(jumpTarget){sessionStorage.removeItem('jump_target');try{let t=JSON.parse(jumpTarget);if(t.book===CURRENT_BOOK&&t.chapter===CURRENT_CHAPTER&&t.page)setTimeout(()=>jumpToPage(t.page),500);}catch(e){}} else {
        let bookmarks = getBookmarks();
        let lastProgress = bookmarks.find(b => b.book === CURRENT_BOOK && b.chapter === CURRENT_CHAPTER);
        if(lastProgress && lastProgress.page) setTimeout(()=>jumpToPage(lastProgress.page), 500);
    }
    setTimeout(()=>{if(typeof updateGlobalProgress==='function')updateGlobalProgress();},500);
    updateAllThemeStyles();
    </script>
<?php else: ?>
    <div id="epubContent"></div>
    <div class="ebook-nav"><button id="prevChapterBtn" disabled>◀ 上一章</button><button id="nextChapterBtn" disabled>下一章 ▶</button></div>
    <div class="chapter-indicator" id="chapterIndicator"></div>
    <script>
    CURRENT_BOOK = "<?php echo addslashes($book); ?>";
    CURRENT_CHAPTER = "<?php echo addslashes($chapter); ?>";
    const CHAPTER_NAME = "<?php echo addslashes($chapter); ?>";
    const BASE_FILE = "<?php echo $currentFile; ?>";
    const EPUB_DATA = <?php echo json_encode($epubData); ?>;
    let curIdx=0,chapters=EPUB_DATA.htmlContents||[],css=EPUB_DATA.cssContent||'',fontSize=18;
    globalChapters = chapters; globalTotalChapters = chapters.length; globalCurrentIndex = 0;
    function applyStyles(){let s=document.getElementById('epub-style');if(!s){s=document.createElement('style');s.id='epub-style';document.head.appendChild(s);}s.textContent=`.ebook-chapter{font-size:${fontSize}px}.ebook-chapter img{max-width:100%;height:auto;display:block;margin:1em auto;border-radius:12px}.ebook-chapter p{margin-bottom:1em}${css}`;}
    function renderChapter(i){if(!chapters||i<0||i>=chapters.length)return;onChapterChange();curIdx=i;globalCurrentIndex=i;let c=chapters[i];document.getElementById('epubContent').innerHTML=`<div class="ebook-chapter"><div class="chapter-title">${escapeHtml(c.title)}</div>${c.content}</div>`;document.getElementById('prevChapterBtn').disabled=(i<=0);document.getElementById('nextChapterBtn').disabled=(i>=chapters.length-1);document.getElementById('chapterIndicator').innerText=`第 ${i+1}/${chapters.length} 章 · ${c.title}`;saveProgress(i);if(typeof updateGlobalProgress==='function')updateGlobalProgress();}
    function saveProgress(i){let l=getBookmarks(),idx=l.findIndex(b=>b.book===CURRENT_BOOK&&b.chapter===CURRENT_CHAPTER),n={book:CURRENT_BOOK,chapter:CURRENT_CHAPTER,chapterName:CHAPTER_NAME.length>35?CHAPTER_NAME.substring(0,32)+'...':CHAPTER_NAME,page:i+1,time:Date.now(),type:'ebook'};if(idx>=0)l[idx]=n;else l.push(n);saveBookmarks(l);}
    window.jumpToBookmark = function(book,chapter,page){if(book===CURRENT_BOOK&&chapter===CURRENT_CHAPTER){renderChapter(Math.min(Math.max(1,page),chapters.length)-1);showToast('✨ 第 '+page+' 章');}else{sessionStorage.setItem('jump_target',JSON.stringify({book,chapter,page,type:'ebook'}));location.href=BASE_FILE+'?book='+encodeURIComponent(book)+'&chapter='+encodeURIComponent(chapter);}};
    function addBookmark(){let n=curIdx+1,l=getBookmarks(),i=l.findIndex(b=>b.book===CURRENT_BOOK&&b.chapter===CURRENT_CHAPTER),ni={book:CURRENT_BOOK,chapter:CURRENT_CHAPTER,chapterName:CHAPTER_NAME.length>35?CHAPTER_NAME.substring(0,32)+'...':CHAPTER_NAME,page:n,time:Date.now(),type:'ebook'};if(i>=0)l[i]=ni;else l.push(ni);saveBookmarks(l);showToast('✅ 第 '+n+' 章');}
    document.getElementById('fontPlus').onclick=()=>{fontSize=Math.min(fontSize+2,32);applyStyles();renderChapter(curIdx);showToast(`字体 ${fontSize}px`);resetHideTimer();};
    document.getElementById('fontMinus').onclick=()=>{fontSize=Math.max(fontSize-2,12);applyStyles();renderChapter(curIdx);showToast(`字体 ${fontSize}px`);resetHideTimer();};
    document.getElementById('backBtn').onclick=()=>{if(document.referrer&&document.referrer.includes(window.location.host))history.back();else location.href=BASE_FILE;};
    document.getElementById('prevChapterBtn').onclick=()=>{if(curIdx>0)renderChapter(curIdx-1);resetHideTimer();};
    document.getElementById('nextChapterBtn').onclick=()=>{if(curIdx<chapters.length-1)renderChapter(curIdx+1);resetHideTimer();};
    document.getElementById('addBookmarkBtn').onclick=addBookmark;
    applyStyles();if(chapters.length>0){let saved=0,jump=sessionStorage.getItem('jump_target');if(jump){sessionStorage.removeItem('jump_target');try{let t=JSON.parse(jump);if(t.book===CURRENT_BOOK&&t.chapter===CURRENT_CHAPTER&&t.page)saved=Math.min(Math.max(1,t.page),chapters.length)-1;}catch(e){}}else{let bks=getBookmarks(),ex=bks.find(b=>b.book===CURRENT_BOOK&&b.chapter===CURRENT_CHAPTER);if(ex&&ex.page)saved=Math.min(Math.max(1,ex.page),chapters.length)-1;}renderChapter(saved);}
    refreshBookmarkList();
    createGlobalProgressBar(globalTotalChapters, globalCurrentIndex, globalChapters);
    updateAllThemeStyles();
    </script>
<?php endif; ?>
</div>

<?php elseif ($book): ?>
<!-- 书籍章节列表页 -->
<div class="content">
    <div class="top-bar" style="position:relative; margin-top:-70px; margin-bottom:20px;">
        <div class="top-bar-left"><button class="back-btn" id="backBtn">←</button><div class="nav-links"><a href="<?php echo $currentFile; ?>">🏠 书架</a></div></div>
    </div>
    <h2 class="page-title">📖 <?php echo htmlspecialchars($book); ?></h2>
    <div class="shelf-grid">
        <?php 
        $files = scanDirectory($baseDir . '/' . $book); 
        if ($files) { 
            foreach ($files as $f) { 
                $name = basename($f); 
                $url = $currentFile . "?book=" . rawurlencode($book) . "&chapter=" . rawurlencode($name); 
                if (stripos($name, '.txt') !== false) $icon = '📖'; 
                elseif (stripos($name, '.epub') !== false) $icon = '📘'; 
                else $icon = (stripos($name, '.pdf') !== false ? '📕' : '📁'); 
                echo '<a href="' . $url . '" class="shelf-item"><div class="emoji">' . $icon . '</div><div>' . htmlspecialchars($name) . '</div></a>';
            } 
        } else { 
            echo '<div style="grid-column:1/-1; text-align:center; padding:50px; color:rgba(255,255,255,0.6);">📭 没有章节</div>'; 
        } 
        ?>
    </div>
</div>
<script>
CURRENT_BOOK = "<?php echo addslashes($book); ?>";
refreshBookmarkList();
document.getElementById('backBtn').onclick=()=>{if(document.referrer?.includes(window.location.host))history.back();else location.href='<?php echo $currentFile; ?>';};
updateAllThemeStyles();
</script>

<?php else: ?>
<!-- 书架首页 -->
<div class="content">
    <h1 class="page-title">📚 我的书架</h1>
    <div class="shelf-grid">
        <?php 
        $books = scanDirectory($baseDir); 
        if ($books) { 
            foreach ($books as $b) { 
                if (is_dir($b)) { 
                    $name = basename($b); 
                    echo '<a href="' . $currentFile . '?book=' . rawurlencode($name) . '" class="shelf-item"><div class="emoji">📖</div><div>' . htmlspecialchars($name) . '</div></a>';
                } 
            } 
        } else { 
            echo '<div style="grid-column:1/-1; text-align:center; padding:50px; color:rgba(255,255,255,0.6);">📭 请在 PDF 文件夹里放入书籍文件夹</div>'; 
        } 
        ?>
    </div>
</div>
<script>
refreshBookmarkList();
updateAllThemeStyles();
</script>
<?php endif; ?>

</body>
</html>