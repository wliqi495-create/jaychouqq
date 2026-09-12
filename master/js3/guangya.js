/**
 * 光鸭网盘处理工具
 *
 * 提供光鸭网盘分享链接解析、文件下载、流媒体播放等功能。
 * 采用 OAuth2/OIDC 认证体系（access_token + refresh_token + device_id）。
 *
 * 主要功能：
 * - OAuth2 Token 自动刷新
 * - 分享链接解析和文件列表获取
 * - 文件转存到个人网盘
 * - 下载直链获取
 * - 字幕自动匹配（LCS算法）
 * - 分块流式代理
 * - 磁力链接离线下载（自动选择最大视频）
 * - 手机号验证码登录
 *
 * @module GuangyaPanHandler
 * @author drpy-node
 * @since 1.0.0
 */

import {reqs} from '../req.js';
import {ENV} from '../env.js';
import CryptoJS from "crypto-js";
import {join} from 'path';
import fs from 'fs';
import {PassThrough} from 'stream';

const HOST = 'https://api.guangyapan.com';
const ACC = 'https://account.guangyapan.com';
const WEB = 'https://www.guangyapan.com';
const CID = 'aMe-8VSlkrbQXpUR';
const UA = 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36';

/**
 * 光鸭网盘处理类
 */
class GuangyaHandler {
    constructor() {
        // shareId 格式：{数字}_{字母数字}，如 1925232622177583113_aeu-hM-tCkHBvQJN
        // 支持多域名：guangyapan.com / guangya.lol / guangyacloud.com
        this.regex = /guangya(?:pan|cloud)?\.(?:com|lol|cn)\/s\/([0-9]+_[A-Za-z0-9_-]+)/;
        this.saveDirName = 'drpy';
        this.shareTokenCache = {};
        this.saveFileIdCaches = {};
        this.urlHeadCache = {};
        this.currentUrlKey = '';
        this.cacheRoot = (process.env['NODE_PATH'] || '.') + '/guangya_cache';
        this.maxCache = 1024 * 1024 * 100;
        this.subtitleExts = ['.srt', '.ass', '.scc', '.stl', '.ttml', '.vtt'];
        this.videoExts = ['mp4', 'mkv', 'avi', 'mov', 'flv', 'wmv', 'm3u8', 'ts', 'webm'];
    }

    // ===== OAuth2 凭据动态读取 =====
    get accessToken() {
        return ENV.get('guangya_access_token');
    }

    get refreshTokenStr() {
        return ENV.get('guangya_refresh_token');
    }

    get deviceId() {
        return ENV.get('guangya_device_id');
    }

    // ===== Token 过期判断 =====
    get isTokenExpired() {
        let exp = Number(ENV.get('guangya_token_expires_at') || 0);
        if (!exp) {
            try {
                let token = this.accessToken || '';
                token = token.replace(/^Bearer\s+/i, '');
                let payload = token.split('.')[1];
                if (payload) {
                    let decoded = JSON.parse(CryptoJS.enc.Utf8.stringify(CryptoJS.enc.Base64.parse(payload.replace(/-/g, '+').replace(/_/g, '/'))));
                    exp = Number(decoded.exp || 0);
                    if (exp) ENV.set('guangya_token_expires_at', String(exp));
                }
            } catch (e) {
                return true;
            }
        }
        return Date.now() / 1000 >= (exp - 300);
    }

    // ===== 认证服务器请求头 =====
    authHeaders(extra) {
        let h = {
            'accept': '*/*',
            'content-type': 'application/json',
            'origin': WEB,
            'referer': WEB + '/',
            'user-agent': UA,
            'x-client-id': CID,
            'x-client-version': '0.0.1',
            'x-device-id': this.deviceId,
            'x-device-model': 'chrome%2F147.0.0.0',
            'x-device-name': 'PC-Chrome',
            'x-device-sign': 'wdi10.' + this.deviceId + this._rhex(32),
            'x-net-work-type': 'NONE',
            'x-os-version': 'MacIntel',
            'x-platform-version': '1',
            'x-protocol-version': '301',
            'x-provider-name': 'NONE',
            'x-sdk-version': '9.0.2'
        };
        if (extra) Object.keys(extra).forEach(k => h[k] = extra[k]);
        return h;
    }

    // ===== 业务 API 请求头 =====
    bizHeaders() {
        let h = {
            'User-Agent': UA,
            'Content-Type': 'application/json',
            'dt': '4',
            'did': this.deviceId,
            'Referer': WEB + '/',
            'Origin': WEB,
            'traceparent': this._traceparent()
        };
        let tk = this.accessToken;
        if (tk) {
            h['Authorization'] = tk.startsWith('Bearer ') ? tk : 'Bearer ' + tk;
        }
        return h;
    }

    _rhex(n) {
        let chars = '0123456789abcdef';
        let s = '';
        for (let i = 0; i < n; i++) s += chars[Math.floor(Math.random() * 16)];
        return s;
    }

    _traceparent() {
        return '00-' + this._rhex(32) + '-' + this._rhex(16) + '-01';
    }

    // ===== Token 自动刷新 =====
    async refreshToken(force) {
        if (!force && !this.isTokenExpired) return true;
        if (!this.refreshTokenStr) {
            console.log('[guangya] 无 refresh_token，无法刷新');
            return false;
        }
        try {
            const resp = await reqs.post(ACC + '/v1/auth/token', {
                client_id: CID,
                grant_type: 'refresh_token',
                refresh_token: this.refreshTokenStr
            }, {headers: this.authHeaders({'x-action': '401'})}).catch((err) => {
                console.error('[guangya] refreshToken error:', err.message);
                return err.response || {status: 500, data: {}};
            });
            let d = resp.data || {};
            if (d.token_resp) d = d.token_resp;
            if (!d.refresh_token && this.refreshTokenStr) {
                d.refresh_token = this.refreshTokenStr;
            }
            if (this._saveLoginData(d)) {
                console.log('[guangya] Token 刷新成功');
                return true;
            }
            console.log('[guangya] Token 刷新失败:', JSON.stringify(d).slice(0, 200));
            return false;
        } catch (e) {
            console.error('[guangya] refreshToken exception:', e.message);
            return false;
        }
    }

    // ===== 统一业务请求（401 自动刷新重试） =====
    async post(path, body, allowCodes) {
        await this.refreshToken(false);
        let h = this.bizHeaders();
        let resp = await reqs.post(HOST + path, body, {headers: h}).catch((err) => {
            console.error('[guangya] post error:', path, err.message);
            return err.response || {status: 500, data: {}};
        });
        let j = resp.data || {};
        if (j.code === 401 || j.status === 401 || /token|unauthor|登录|过期/i.test(String(j.msg || ''))) {
            console.log('[guangya] 收到 401，尝试刷新 Token 后重试');
            let ok = await this.refreshToken(true);
            if (ok) {
                resp = await reqs.post(HOST + path, body, {headers: this.bizHeaders()}).catch((err) => {
                    return err.response || {status: 500, data: {}};
                });
                j = resp.data || {};
            }
        }
        return j;
    }

    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    // ===== ① 正则解析分享链接 =====
    getShareData(url) {
        let matches = this.regex.exec(url);
        if (matches) {
            let shareId = matches[1];
            if (shareId.indexOf('?') > 0) shareId = shareId.split('?')[0];
            return {
                shareId: shareId,
                code: '',
                url: url
            };
        }
        return null;
    }

    // ===== ②③ 获取分享概要 + 访问令牌 =====
    async getShareToken(shareData) {
        if (this.shareTokenCache[shareData.shareId]) {
            return this.shareTokenCache[shareData.shareId];
        }

        let sum = await this.post('/nd.bizuserres.s/v1/get_share_summary', {shareId: shareData.shareId});
        if (sum.code && sum.code !== 0 && sum.msg !== 'success') {
            if (sum.code === 201 || sum.code === 202) {
                console.log('[guangya] 分享已失效:', shareData.shareId);
            }
        }

        let tok = await this.post('/nd.bizuserres.s/v1/get_share_access_token', {
            shareId: shareData.shareId,
            code: shareData.code || ''
        });
        if (tok.code === 209) {
            console.log('[guangya] 提取码错误:', shareData.shareId);
            return null;
        }

        let accessToken = tok.data && tok.data.accessToken;
        if (!accessToken) {
            console.log('[guangya] 获取分享 accessToken 失败:', JSON.stringify(tok).slice(0, 200));
            return null;
        }

        let title = (sum.data && sum.data.title) || '光鸭分享';
        this.shareTokenCache[shareData.shareId] = {accessToken, title};
        return this.shareTokenCache[shareData.shareId];
    }

    // ===== ④ 递归遍历分享文件 =====
    async getFilesByShareUrl(shareInfo) {
        const shareData = typeof shareInfo === 'string' ? this.getShareData(shareInfo) : shareInfo;
        if (!shareData) return [];

        const shareToken = await this.getShareToken(shareData);
        if (!shareToken) return [];

        const videos = [];
        const subtitles = [];
        const accessToken = shareToken.accessToken;

        const listFile = async (parentId, page) => {
            page = page || 0;
            const r = await this.post('/nd.bizuserres.s/v1/get_share_page_files_list', {
                accessToken: accessToken,
                page: page,
                pageSize: 100,
                parentId: parentId || '',
                orderBy: 0,
                sortType: 0
            });
            if (!r.data) return;
            let items = r.data.list || [];
            if (!items || items.length === 0) return;

            const subDirs = [];
            for (const item of items) {
                let isDir = item.resType === 2 || item.isDir === 1;
                let fileName = item.fileName || item.name || '';
                let fileId = String(item.fileId || item.id || '');
                let fileSize = Number(item.fileSize || 0);

                if (isDir) {
                    subDirs.push({fileId, fileName});
                } else {
                    let ext = this._getExt(fileName);
                    if (this.videoExts.includes(ext)) {
                        if (fileSize < 1024 * 1024 * 5) continue;
                        let text = /[#|'"\[\]&<>]/g;
                        item.file_name = text.test(fileName) ? fileName.replace(text, '') : fileName;
                        item.fileId = fileId;
                        videos.push(item);
                    } else if (this.subtitleExts.includes('.' + ext)) {
                        item.file_name = fileName;
                        item.fileId = fileId;
                        subtitles.push(item);
                    }
                }
            }

            for (const dir of subDirs) {
                await listFile(dir.fileId, 0);
            }
        };

        await listFile('', 0);

        if (subtitles.length > 0) {
            videos.forEach((item) => {
                let matchSubtitle = this.findBestLCS(
                    {name: item.file_name || item.fileName},
                    subtitles.map(s => ({name: s.file_name, target: s}))
                );
                if (matchSubtitle.bestMatch && matchSubtitle.bestMatch.lcs.length > 0) {
                    item.subtitle = matchSubtitle.bestMatch.target;
                }
            });
        }

        return videos;
    }

    // ===== ⑥ 获取分享下载直链 =====
    async getDownload(fileId, accessToken) {
        const r = await this.post('/nd.bizuserres.s/v1/get_share_download_url', {
            fileId: fileId,
            accessToken: accessToken
        });

        if (r.code === 207) {
            console.log('[guangya] 分享者未开启免登录下载，需先转存');
            return null;
        }
        if ([205, 206, 504].includes(r.code)) {
            console.log('[guangya] 文件需会员/APP处理，错误码:', r.code);
            return null;
        }

        let url = '';
        if (r.data) {
            url = r.data.downloadUrl || r.data.signedURL || r.data.url || '';
        }
        if (!url) {
            console.log('[guangya] 获取下载链接失败:', JSON.stringify(r).slice(0, 200));
            return null;
        }

        return [{
            name: '原画',
            url: url,
            headers: {
                'User-Agent': UA,
                'Referer': WEB + '/'
            }
        }];
    }

    // ===== ⑦⑧ 转存 + 轮询 =====
    async save(accessToken, fileIds) {
        const r = await this.post('/nd.bizuserres.s/v1/restore_share', {
            accessToken: accessToken,
            fileIds: Array.isArray(fileIds) ? fileIds : [fileIds],
            parentId: ''
        });

        if (r.code !== 0 && r.msg !== 'success') {
            console.log('[guangya] 转存失败:', r.msg || JSON.stringify(r).slice(0, 200));
            return null;
        }

        let taskId = r.data && r.data.taskId;
        if (taskId) {
            await this.waitTask(taskId);
        }
        return r.data || {};
    }

    async waitTask(taskId) {
        for (let i = 0; i < 10; i++) {
            const r = await this.post('/nd.bizuserres.s/v1/get_task_status', {taskId});
            if (r.data) {
                let s = JSON.stringify(r.data);
                if (/成功|完成|finish|success|completed|2/.test(s)) return true;
                if (/失败|fail|error|3/.test(s)) return false;
            }
            await this.delay(1000);
        }
        return true;
    }

    // ===== 个人网盘取直链 =====
    async getDownloadBySave(fileId) {
        let r = await this.post('/nd.bizuserres.s/v1/file/get_vod_download_url', {
            fileId: fileId
        });
        let url = '';
        if (r.data) {
            url = r.data.signedURL || r.data.downloadUrl || r.data.url || '';
        }
        if (!url) {
            r = await this.post('/nd.bizuserres.s/v1/get_res_download_url', {fileId});
            if (r.data) {
                url = r.data.signedURL || r.data.downloadUrl || r.data.url || '';
            }
        }
        if (!url) {
            console.log('[guangya] 个人网盘获取直链失败:', JSON.stringify(r).slice(0, 200));
            return null;
        }
        return [{
            name: '原画',
            url: url,
            headers: {
                'User-Agent': UA,
                'Referer': WEB + '/'
            }
        }];
    }

    // ===== LCS 匹配算法 =====
    lcs(str1, str2) {
        if (!str1 || !str2) {
            return {length: 0, sequence: '', offset: 0};
        }
        var sequence = '';
        var str1Length = str1.length;
        var str2Length = str2.length;
        var num = new Array(str1Length);
        var maxlen = 0;
        var lastSubsBegin = 0;
        for (var i = 0; i < str1Length; i++) {
            var subArray = new Array(str2Length);
            for (var j = 0; j < str2Length; j++) subArray[j] = 0;
            num[i] = subArray;
        }
        var thisSubsBegin = null;
        for (i = 0; i < str1Length; i++) {
            for (j = 0; j < str2Length; j++) {
                if (str1[i] !== str2[j]) {
                    num[i][j] = 0;
                } else {
                    if (i === 0 || j === 0) {
                        num[i][j] = 1;
                    } else {
                        num[i][j] = 1 + num[i - 1][j - 1];
                    }
                    if (num[i][j] > maxlen) {
                        maxlen = num[i][j];
                        thisSubsBegin = i - num[i][j] + 1;
                        if (lastSubsBegin === thisSubsBegin) {
                            sequence += str1[i];
                        } else {
                            lastSubsBegin = thisSubsBegin;
                            sequence = '';
                            sequence += str1.substr(lastSubsBegin, i + 1 - lastSubsBegin);
                        }
                    }
                }
            }
        }
        return {length: maxlen, sequence: sequence, offset: thisSubsBegin};
    }

    findBestLCS(mainItem, targetItems) {
        const results = [];
        let bestMatchIndex = 0;
        for (let i = 0; i < targetItems.length; i++) {
            const currentLCS = this.lcs(mainItem.name, targetItems[i].name);
            results.push({target: targetItems[i], lcs: currentLCS});
            if (currentLCS.length > results[bestMatchIndex].lcs.length) {
                bestMatchIndex = i;
            }
        }
        return {
            allLCS: results,
            bestMatch: results[bestMatchIndex],
            bestMatchIndex: bestMatchIndex
        };
    }

    _getExt(fileName) {
        let m = String(fileName || '').match(/\.([a-zA-Z0-9]+)$/);
        return m ? m[1].toLowerCase() : '';
    }

    // ===== Range 请求测试 =====
    async testSupport(url, headers) {
        const resp = await reqs.get(url, {
            responseType: 'stream',
            headers: headers,
        }).catch((err) => {
            console.error('[guangya] testSupport error:', err.message);
            return err.response || {status: 500, data: {}};
        });
        if (resp && (resp.status === 206 || resp.status === 200)) {
            const isAccept = resp.headers['accept-ranges'] === 'bytes';
            const contentRange = resp.headers['content-range'];
            const contentLength = parseInt(resp.headers['content-length']);
            const isSupport = isAccept || !!contentRange || contentLength === 1 || resp.status === 200;
            const length = contentRange ? parseInt(contentRange.split('/')[1]) : contentLength;
            delete resp.headers['content-range'];
            delete resp.headers['content-length'];
            if (length) resp.headers['content-length'] = length.toString();
            return [isSupport, resp.headers];
        }
        return [false, null];
    }

    // ===== 分块流式代理 =====
    async chunkStream(inReq, outResp, url, urlKey, headers, option) {
        urlKey = urlKey || CryptoJS.enc.Hex.stringify(CryptoJS.MD5(url)).toString();
        if (this.currentUrlKey !== urlKey) {
            this._delAllCache(urlKey);
            this.currentUrlKey = urlKey;
        }
        if (!this.urlHeadCache[urlKey]) {
            const [isSupport, urlHeader] = await this.testSupport(url, headers);
            if (!isSupport || !urlHeader['content-length']) {
                outResp.redirect(url);
                return;
            }
            this.urlHeadCache[urlKey] = urlHeader;
        }
        let exist = true;
        await fs.promises.access(join(this.cacheRoot, urlKey)).catch((_) => (exist = false));
        if (!exist) {
            await fs.promises.mkdir(join(this.cacheRoot, urlKey), {recursive: true});
        }
        const contentLength = parseInt(this.urlHeadCache[urlKey]['content-length']);
        let byteStart = 0;
        let byteEnd = contentLength - 1;
        const streamHeader = {};
        if (inReq.headers.range) {
            const ranges = inReq.headers.range.trim().split(/=|-/);
            if (ranges.length > 2 && ranges[2]) byteEnd = parseInt(ranges[2]);
            byteStart = parseInt(ranges[1]);
            Object.assign(streamHeader, this.urlHeadCache[urlKey]);
            streamHeader['content-length'] = (byteEnd - byteStart + 1).toString();
            streamHeader['content-range'] = `bytes ${byteStart}-${byteEnd}/${contentLength}`;
            outResp.code(206);
        } else {
            Object.assign(streamHeader, this.urlHeadCache[urlKey]);
            outResp.code(200);
        }
        option = option || {chunkSize: 1024 * 256, poolSize: 5, timeout: 1000 * 10};
        const chunkSize = option.chunkSize;
        const poolSize = option.poolSize;
        const timeout = option.timeout;
        let chunkCount = Math.ceil(contentLength / chunkSize);
        let chunkDownIdx = Math.floor(byteStart / chunkSize);
        let chunkReadIdx = chunkDownIdx;
        let stop = false;
        const dlFiles = {};
        for (let i = 0; i < poolSize && i < chunkCount; i++) {
            new Promise((resolve) => {
                (async function doDLTask(spChunkIdx) {
                    if (stop || chunkDownIdx >= chunkCount) { resolve(); return; }
                    if (spChunkIdx === undefined && (chunkDownIdx - chunkReadIdx) * chunkSize >= this.maxCache) {
                        setTimeout(doDLTask, 5); return;
                    }
                    const chunkIdx = spChunkIdx || chunkDownIdx++;
                    const taskId = `${inReq.id}-${chunkIdx}`;
                    try {
                        const dlFile = join(this.cacheRoot, urlKey, `${inReq.id}-${chunkIdx}.p`);
                        let exist = true;
                        await fs.promises.access(dlFile).catch((_) => (exist = false));
                        if (!exist) {
                            const start = chunkIdx * chunkSize;
                            const end = Math.min(contentLength - 1, (chunkIdx + 1) * chunkSize - 1);
                            const dlResp = await reqs.get(url, {
                                responseType: 'stream',
                                timeout: timeout,
                                headers: Object.assign({Range: `bytes=${start}-${end}`}, headers),
                            });
                            const dlCache = join(this.cacheRoot, urlKey, `${inReq.id}-${chunkIdx}.dl`);
                            const writer = fs.createWriteStream(dlCache);
                            const readTimeout = setTimeout(() => { writer.destroy(new Error(`${taskId} read timeout`)); }, timeout);
                            const downloaded = new Promise((resolve) => {
                                writer.on('finish', async () => {
                                    if (stop) { await fs.promises.rm(dlCache).catch(() => {}); }
                                    else { await fs.promises.rename(dlCache, dlFile).catch(() => {}); dlFiles[taskId] = dlFile; }
                                    resolve(true);
                                });
                                writer.on('error', async () => {
                                    await fs.promises.rm(dlCache).catch(() => {}); resolve(false);
                                });
                            });
                            dlResp.data.pipe(writer);
                            const result = await downloaded;
                            clearTimeout(readTimeout);
                            if (!result) { setTimeout(() => { doDLTask(chunkIdx); }, 15); return; }
                        }
                        setTimeout(doDLTask, 5);
                    } catch (error) {
                        console.error(error);
                        setTimeout(() => { doDLTask(chunkIdx); }, 15);
                    }
                }).call(this);
            });
        }
        outResp.headers(streamHeader);
        const stream = new PassThrough();
        new Promise((resolve) => {
            let writeMore = true;
            (async function waitReadFile() {
                try {
                    if (chunkReadIdx >= chunkCount || stop) { stream.end(); resolve(); return; }
                    if (!writeMore) { setTimeout(waitReadFile, 5); return; }
                    const taskId = `${inReq.id}-${chunkReadIdx}`;
                    if (!dlFiles[taskId]) { setTimeout(waitReadFile, 5); return; }
                    const chunkByteStart = chunkReadIdx * chunkSize;
                    const chunkByteEnd = Math.min(contentLength - 1, (chunkReadIdx + 1) * chunkSize - 1);
                    const readFileStart = Math.max(byteStart, chunkByteStart) - chunkByteStart;
                    const dlFile = dlFiles[taskId];
                    delete dlFiles[taskId];
                    const fd = await fs.promises.open(dlFile, 'r');
                    const buffer = Buffer.alloc(chunkByteEnd - chunkByteStart - readFileStart + 1);
                    await fd.read(buffer, 0, chunkByteEnd - chunkByteStart - readFileStart + 1, readFileStart);
                    await fd.close().catch(() => {});
                    await fs.promises.rm(dlFile).catch(() => {});
                    writeMore = stream.write(buffer);
                    if (!writeMore) { stream.once('drain', () => { writeMore = true; }); }
                    chunkReadIdx++;
                    setTimeout(waitReadFile, 5);
                } catch (error) {
                    setTimeout(waitReadFile, 5);
                }
            })();
        });
        stream.on('close', async () => {
            Object.keys(dlFiles).forEach((reqKey) => {
                if (reqKey.startsWith(inReq.id)) {
                    fs.rm(dlFiles[reqKey], {recursive: true}, () => {});
                    delete dlFiles[reqKey];
                }
            });
            stop = true;
        });
        return stream;
    }

    _delAllCache(keepKey) {
        try {
            fs.readdir(this.cacheRoot, (_, files) => {
                if (files) for (const file of files) {
                    if (file === keepKey) continue;
                    const dir = join(this.cacheRoot, file);
                    fs.stat(dir, (_, stats) => {
                        if (stats && stats.isDirectory()) {
                            fs.readdir(dir, (_, subFiles) => {
                                if (subFiles) for (const subFile of subFiles) {
                                    if (!subFile.endsWith('.p')) {
                                        fs.rm(join(dir, subFile), {recursive: true}, () => {});
                                    }
                                }
                            });
                        }
                    });
                }
            });
        } catch (error) {
            console.error(error);
        }
    }

    // ===== 云下载（离线下载）相关 =====

    get isLoggedIn() {
        return !!(this.accessToken && this.refreshTokenStr && this.deviceId);
    }

    // 递归扫描响应中的文件条目（容错用，优先用 btResInfo.subfiles 结构化数据）
    _scanFileEntries(node, out) {
        out = out || [];
        if (!node || typeof node !== 'object') return out;
        if (Array.isArray(node)) {
            for (const item of node) this._scanFileEntries(item, out);
            return out;
        }
        let idx = node.fileIndex ?? node.file_index ?? node.fileNo ?? node.file_no ?? node.index;
        if (idx != null && !isNaN(Number(idx))) {
            let sz = Number(node.fileSize || node.file_size || node.size || node.length || 0);
            out.push({index: Number(idx), name: node.name || node.fileName || '', size: sz});
        }
        for (const value of Object.values(node)) {
            this._scanFileEntries(value, out);
        }
        return out;
    }

    // 递归查找指定 key 的值
    _findValue(node, keys) {
        if (!node || typeof node !== 'object') return null;
        if (Array.isArray(node)) {
            for (const item of node) {
                const found = this._findValue(item, keys);
                if (found != null) return found;
            }
            return null;
        }
        for (const key of keys) {
            if (Object.prototype.hasOwnProperty.call(node, key) && node[key] != null) {
                return node[key];
            }
        }
        for (const value of Object.values(node)) {
            const found = this._findValue(value, keys);
            if (found != null) return found;
        }
        return null;
    }

    // ===== ① resolve_res - 解析磁力/HTTP/ed2k链接 =====
    // 返回结构化数据：{ url, btResInfo: { subfiles: [{fileName, fileIndex, fileSize}] } }
    async cloudResolveUrl(url) {
        return await this.post('/nd.bizcloudcollection.s/v1/resolve_res', { url });
    }

    // ===== ② create_task - 创建云下载任务（全参数） =====
    // 参数：url(解析后URL), parentId(目标目录), newName(文件名), fileIndexes(文件序号数组)
    async cloudCreateTask(url, parentId, newName, fileIndexes) {
        const body = {
            url: url,
            parentId: parentId || ''
        };
        if (newName) body.newName = newName;
        if (fileIndexes && Array.isArray(fileIndexes) && fileIndexes.length > 0) {
            body.fileIndexes = fileIndexes;
        }
        return await this.post('/nd.bizcloudcollection.s/v1/create_task', body);
    }

    // ===== ③ list_task - 查询云下载任务列表（全参数） =====
    // 参数：page, pageSize, status([0,1,3,4]), taskIds, cursor
    // 状态码：0=等待中, 1=下载中, 2=已完成(旧), 3=已完成, 4=已失败
    async cloudTaskList(page, pageSize, status, taskIds, cursor) {
        const body = {
            page: page || 0,
            pageSize: pageSize || 50,
            status: status || [0, 1, 3, 4]
        };
        if (taskIds && Array.isArray(taskIds) && taskIds.length > 0) {
            body.taskIds = taskIds;
        }
        if (cursor) body.cursor = cursor;
        return await this.post('/nd.bizcloudcollection.s/v1/list_task', body);
    }

    // ===== ④ delete_task - 删除云下载任务 =====
    async cloudDeleteTask(taskIds, deleteFiles) {
        return await this.post('/nd.bizcloudcollection.s/v2/delete_task', {
            taskIds: Array.isArray(taskIds) ? taskIds : [taskIds]
        });
    }

    // 从 resolve_res 响应中提取文件列表（优先用 btResInfo.subfiles 结构化数据）
    _parseResolveData(resolveResp) {
        if (!resolveResp) return { url: '', files: [] };
        const data = resolveResp.data || resolveResp || {};
        let resolvedUrl = data.url || '';
        let files = [];

        // 优先从 btResInfo.subfiles 提取结构化数据（Alist 格式）
        if (data.btResInfo && Array.isArray(data.btResInfo.subfiles)) {
            files = data.btResInfo.subfiles.map((f, i) => ({
                index: f.fileIndex != null ? Number(f.fileIndex) : i,
                name: f.fileName || '',
                size: Number(f.fileSize || 0)
            }));
        }

        // 回退：递归扫描整个响应
        if (!files.length) {
            files = this._scanFileEntries(resolveResp);
        }

        // 回退：从 fileIndexes 字段提取
        if (!files.length) {
            let indexes = this._findValue(resolveResp, ['fileIndexes', 'file_indexes', 'indexes']);
            if (Array.isArray(indexes) && indexes.length) {
                files = indexes.map(idx => ({ index: Number(idx), name: '', size: 0 }));
            }
        }

        return { url: resolvedUrl, files: files };
    }

    // 解析磁力链接获取文件列表（不下载），返回所有视频文件（含 index、name、size）
    async resolveMagnetFiles(magnetUrl) {
        if (!this.isLoggedIn) return [];
        console.log('[guangya] 解析磁力文件列表:', magnetUrl.slice(0, 80));

        const resolveResp = await this.cloudResolveUrl(magnetUrl);
        if (!resolveResp || (resolveResp.code && resolveResp.code !== 0 && resolveResp.msg !== 'success' && !resolveResp.data)) {
            console.log('[guangya] resolve_res 失败:', JSON.stringify(resolveResp || {}).slice(0, 200));
            return [];
        }

        const { files } = this._parseResolveData(resolveResp);
        if (!files.length) {
            console.log('[guangya] resolve_res 未返回文件列表');
            return [];
        }

        // 过滤出视频文件
        const videoEntries = files.filter(e => {
            if (!e.name) return false;
            let ext = this._getExt(e.name);
            return this.videoExts.includes(ext);
        });

        console.log('[guangya] 磁力解析到', files.length, '个文件，其中', videoEntries.length, '个视频');
        return videoEntries.map(e => ({
            index: e.index,
            name: e.name,
            size: e.size || 0
        }));
    }

    // 从磁力文件列表中选出最大的视频文件
    pickLargestVideo(files) {
        if (!files || !files.length) return null;
        return files.slice().sort((a, b) => (b.size || 0) - (a.size || 0))[0];
    }

    // 提交磁力链接离线下载（全参数两步流程：resolve_res -> create_task）
    // targetFileIndex: 可选，指定只下载某个文件
    // targetFileName: 可选，指定保存文件名
    async offlineDownload(magnetUrl, targetFileIndex, targetFileName) {
        if (!this.isLoggedIn) {
            console.log('[guangya] offlineDownload: 未登录');
            return null;
        }
        console.log('[guangya] 开始提交离线下载:', magnetUrl.slice(0, 80),
            '目标文件序号:', targetFileIndex ?? '全部',
            '目标文件名:', targetFileName || '自动');

        // 步骤1: resolve_res - 解析磁力链接
        const resolveResp = await this.cloudResolveUrl(magnetUrl);
        console.log('[guangya] resolve_res 响应:', JSON.stringify(resolveResp).slice(0, 300));

        if (!resolveResp || (resolveResp.code && resolveResp.code !== 0 && resolveResp.msg !== 'success' && !resolveResp.data)) {
            console.log('[guangya] resolve_res 失败');
            return null;
        }

        const { url: resolvedUrl, files } = this._parseResolveData(resolveResp);
        if (!files.length) {
            console.log('[guangya] resolve_res 未返回文件列表');
            return null;
        }
        console.log('[guangya] resolve_res 解析到', files.length, '个文件');

        // 提取 fileIndexes（默认全部文件）
        let fileIndexes = files.map(f => f.index);

        // 如果指定了目标文件序号，只下载该文件
        if (targetFileIndex != null && !isNaN(Number(targetFileIndex))) {
            const targetIdx = Number(targetFileIndex);
            const filtered = fileIndexes.filter(idx => idx === targetIdx);
            if (filtered.length > 0) {
                fileIndexes = filtered;
                console.log('[guangya] 仅下载指定文件序号:', targetIdx);
            } else {
                console.log('[guangya] 未找到序号', targetIdx, '，下载全部文件');
            }
        }

        // 确定 newName
        let newName = targetFileName || '';
        if (!newName) {
            const btInfo = resolveResp.data && resolveResp.data.btResInfo;
            if (btInfo && btInfo.fileName) newName = btInfo.fileName;
        }

        // 步骤2: create_task - 创建离线下载任务（全参数）
        const taskUrl = resolvedUrl || magnetUrl;
        const taskResp = await this.cloudCreateTask(taskUrl, '', newName, fileIndexes);
        console.log('[guangya] create_task 响应:', JSON.stringify(taskResp).slice(0, 300));

        if (taskResp && (taskResp.code === 0 || taskResp.msg === 'success' || taskResp.data)) {
            const taskId = this._findValue(taskResp, ['taskId', 'task_id', 'id']);
            console.log('[guangya] 离线下载任务已创建, taskId:', taskId);
            return taskId ? { taskId, exist: false } : taskResp.data || {};
        }

        if (taskResp && /已存在|重复|exist|already/i.test(String(taskResp.msg || taskResp.message || ''))) {
            console.log('[guangya] 离线下载任务已存在');
            return { exist: true };
        }

        console.log('[guangya] create_task 失败');
        return null;
    }

    // 通过 list_task 轮询任务状态，等待完成并获取 fileId
    // 状态码：0=等待中, 1=下载中, 2=已完成(旧), 3=已完成, 4=已失败
    async waitCloudTask(taskId, maxRetries, retryInterval) {
        maxRetries = maxRetries || 20;
        retryInterval = retryInterval || 3000;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            console.log('[guangya] list_task 第' + attempt + '/' + maxRetries + '次轮询...');

            let taskList = [];
            try {
                const body = { page: 0, pageSize: 50, status: [0, 1, 3, 4] };
                if (taskId) body.taskIds = [taskId];
                const resp = await this.post('/nd.bizcloudcollection.s/v1/list_task', body);
                taskList = (resp.data && resp.data.list) || [];
            } catch (e) {
                console.log('[guangya] list_task 异常:', e.message);
            }

            for (const task of taskList) {
                console.log('[guangya] 任务状态:', task.fileName, 'status:', task.status, 'progress:', task.progress);

                // 已完成（status=3 或 status=2）
                if (task.status === 3 || task.status === 2) {
                    if (task.fileId) {
                        console.log('[guangya] 离线任务完成, fileId:', task.fileId);
                        return {
                            fileId: task.fileId,
                            fileName: task.fileName || '',
                            taskId: task.taskId || taskId
                        };
                    }
                    // 任务完成但没有 fileId，可能需要从文件列表查找
                    console.log('[guangya] 任务完成但无 fileId，尝试文件列表查找');
                }

                // 已失败
                if (task.status === 4) {
                    console.log('[guangya] 离线任务失败:', task.fileName);
                    // 文件可能已存在，继续尝试文件列表查找
                }
            }

            if (attempt < maxRetries) {
                await this.delay(retryInterval);
            }
        }

        console.log('[guangya] list_task 轮询超时');
        return null;
    }

    // 查找个人网盘中最近下载的视频文件（作为 list_task 的回退方案）
    async findRecentVideoFiles(parentId, depth) {
        depth = depth || 0;
        if (depth > 2) return [];
        const body = {
            page: 0,
            pageSize: 50,
            parentId: parentId || '',
            orderBy: 1,
            sortType: 1
        };
        const r = await this.post('/nd.bizuserres.s/v1/file/get_file_list', body);
        if (!r.data) return [];

        let items = r.data.list || r.data.files || r.data.data || [];
        if (!Array.isArray(items) || items.length === 0) return [];

        const videos = [];
        const subDirs = [];
        for (const item of items) {
            const isDir = item.resType === 2 || item.isDir === 1;
            const fileId = String(item.fileId || item.id || '');
            const fileName = item.fileName || item.name || '';
            if (!fileId) continue;
            if (isDir) {
                subDirs.push({ fileId, fileName });
            } else {
                const ext = this._getExt(fileName);
                const fileSize = Number(item.fileSize || 0);
                if (this.videoExts.includes(ext) && fileSize > 1024 * 1024 * 5) {
                    videos.push({
                        fileId: fileId,
                        file_name: fileName,
                        fileSize: fileSize,
                        utime: item.utime || item.ctime || 0
                    });
                }
            }
        }
        for (const dir of subDirs) {
            const subVideos = await this.findRecentVideoFiles(dir.fileId, depth + 1);
            videos.push(...subVideos);
        }
        videos.sort((a, b) => Number(b.utime || 0) - Number(a.utime || 0));
        return videos;
    }

    // 获取个人网盘视频列表（用于文件保存推送播放）
    // parentId: 父目录ID，传 '' 表示根目录
    async getPersonalVideos(parentId) {
        return await this.findRecentVideoFiles(parentId || '', 0);
    }

    // 一次 list_task 调用获取所有状态的任务，按文件名匹配
    // 返回 { completedTask, inProgressTask } 或 null
    async findAllTasksByName(targetFileName) {
        if (!targetFileName) return { completedTask: null, inProgressTask: null };
        try {
            const resp = await this.post('/nd.bizcloudcollection.s/v1/list_task', {
                page: 0, pageSize: 50, status: [0, 1, 2, 3, 4]
            });
            const tasks = (resp.data && resp.data.list) || [];
            let completedTask = null;
            let inProgressTask = null;
            for (const task of tasks) {
                let taskName = task.fileName || '';
                if (!taskName) continue;
                // 文件名包含匹配（双向）
                if (taskName.indexOf(targetFileName) > -1 || targetFileName.indexOf(taskName) > -1) {
                    if (task.status === 3 || task.status === 2) {
                        if (!completedTask) completedTask = task;
                    } else if (task.status === 0 || task.status === 1) {
                        if (!inProgressTask) inProgressTask = task;
                    }
                }
            }
            return { completedTask, inProgressTask };
        } catch (e) {
            console.log('[guangya] findAllTasksByName 异常:', e.message);
        }
        return { completedTask: null, inProgressTask: null };
    }

    // 在个人网盘中按文件名查找已下载的文件
    async findExistingVideo(targetFileName) {
        if (!targetFileName) return null;
        try {
            const videos = await this.findRecentVideoFiles('', 0);
            if (!videos.length) return null;
            // 精确包含匹配
            let matched = videos.find(v => v.file_name && v.file_name.indexOf(targetFileName) > -1);
            if (!matched) {
                matched = videos.find(v => v.file_name && targetFileName.indexOf(v.file_name) > -1);
            }
            // LCS 模糊匹配
            if (!matched) {
                let bestMatch = this.findBestLCS(
                    { name: targetFileName },
                    videos.map(v => ({ name: v.file_name, target: v }))
                );
                if (bestMatch.bestMatch && bestMatch.bestMatch.lcs.length > targetFileName.length * 0.5) {
                    matched = bestMatch.bestMatch.target;
                }
            }
            return matched || null;
        } catch (e) {
            console.log('[guangya] findExistingVideo 异常:', e.message);
        }
        return null;
    }

    // 获取直链的统一方法（返回 {fileId, file_name, url, headers} 或 null）
    async _tryGetDownloadUrl(fileId, fileName) {
        if (!fileId) return null;
        const down = await this.getDownloadBySave(fileId);
        if (down && down.length > 0 && down[0].url) {
            return {
                fileId: fileId,
                file_name: fileName || '',
                url: down[0].url,
                headers: down[0].headers
            };
        }
        return null;
    }

    // 解析磁力链接：完整流程（极速优化版）
    // 核心优化：一次 list_task 获取所有任务 → 按优先级处理 → 1秒轮询
    // targetFileIndex: 可选，指定下载哪个文件
    // targetFileName: 可选，指定文件名用于匹配
    async resolveMagnetPlay(magnetUrl, targetFileIndex, targetFileName) {
        if (!this.isLoggedIn) {
            console.log('[guangya] resolveMagnetPlay: 未登录');
            return null;
        }
        console.log('[guangya] 开始解析磁力链接:', magnetUrl.slice(0, 80),
            '目标文件:', targetFileName || (targetFileIndex != null ? targetFileIndex : '全部'));

        // ===== 步骤1: 一次 list_task 获取所有状态的任务（1个API调用搞定） =====
        console.log('[guangya] 步骤1: 查询所有离线任务...');
        const { completedTask, inProgressTask } = await this.findAllTasksByName(targetFileName);

        // 1a: 有已完成的任务 → 直接取直链
        if (completedTask && completedTask.fileId) {
            console.log('[guangya] 找到已完成任务, fileId:', completedTask.fileId);
            let result = await this._tryGetDownloadUrl(completedTask.fileId, completedTask.fileName || targetFileName);
            if (result) {
                console.log('[guangya] 已完成任务获取直链成功');
                return result;
            }
            console.log('[guangya] 已完成任务文件已删除，需重新下载');
            // 清理已失效的已完成任务
            try { await this.cloudDeleteTask([completedTask.taskId]); } catch(e) {}
        }

        // 1b: 有进行中的任务 → 复用 taskId，不创建新任务
        let taskId = null;
        if (inProgressTask && inProgressTask.taskId) {
            taskId = inProgressTask.taskId;
            console.log('[guangya] 复用进行中任务, taskId:', taskId, '状态:', inProgressTask.status);
        }

        // ===== 步骤2: 没有进行中任务 → 创建新任务 =====
        if (!taskId) {
            console.log('[guangya] 步骤2: 创建新离线下载任务...');
            try {
                const downloadResult = await this.offlineDownload(magnetUrl, targetFileIndex, targetFileName);
                taskId = downloadResult && downloadResult.taskId;
            } catch (e) {
                console.log('[guangya] 离线下载提交异常:', e.message);
            }
        }
        console.log('[guangya] 离线任务ID:', taskId);

        // ===== 步骤3: 快速轮询（1秒间隔，8次=8秒，适配20秒超时） =====
        if (taskId) {
            const taskResult = await this.waitCloudTask(taskId, 8, 1000);
            if (taskResult && taskResult.fileId) {
                let result = await this._tryGetDownloadUrl(taskResult.fileId, taskResult.fileName || targetFileName);
                if (result) {
                    console.log('[guangya] 轮询成功，获取直链');
                    return result;
                }
            }
        }

        // ===== 步骤4: 轮询超时，最后查一次个人网盘文件 =====
        console.log('[guangya] 步骤4: 最后检查个人网盘...');
        let existingVideo = await this.findExistingVideo(targetFileName);
        if (existingVideo) {
            console.log('[guangya] 最终检查找到文件:', existingVideo.file_name);
            let result = await this._tryGetDownloadUrl(existingVideo.fileId, existingVideo.file_name);
            if (result) return result;
        }

        console.log('[guangya] 未找到视频文件（任务可能仍在下载中，请稍后重试）');
        return null;
    }

    // ===== 手机号验证码登录相关 =====

    generateDeviceId() {
        return this._rhex(32);
    }

    ensureDeviceId() {
        if (!this.deviceId) {
            const newId = this.generateDeviceId();
            ENV.set('guangya_device_id', newId);
            console.log('[guangya] 自动生成设备ID:', newId);
            return newId;
        }
        return this.deviceId;
    }

    _normPhone(phone) {
        phone = String(phone || '').replace(/\s+/g, '');
        if (/^1\d{10}$/.test(phone)) return '+86 ' + phone;
        if (/^\+861\d{10}$/.test(phone)) return '+86 ' + phone.slice(3);
        if (/^861\d{10}$/.test(phone)) return '+86 ' + phone.slice(2);
        if (/^\+\d{1,4} /.test(phone)) return phone;
        return phone;
    }

    _saveLoginData(d) {
        let accessToken = d.access_token || d.accessToken || d.token || '';
        if (!accessToken) return false;

        let refreshToken = d.refresh_token || d.refreshToken || '';
        let tokenType = d.token_type || d.tokenType || 'Bearer';
        let expiresIn = Number(d.expires_in || d.expiresIn || 0);

        ENV.set('guangya_access_token', tokenType + ' ' + accessToken);
        if (refreshToken) ENV.set('guangya_refresh_token', refreshToken);

        let exp = 0;
        if (expiresIn) {
            exp = Math.floor(Date.now() / 1000) + expiresIn;
        } else {
            exp = Number(d.expires_end || 0);
        }
        if (!exp) {
            try {
                let payload = accessToken.split('.')[1];
                let decoded = JSON.parse(CryptoJS.enc.Utf8.stringify(CryptoJS.enc.Base64.parse(payload.replace(/-/g, '+').replace(/_/g, '/'))));
                exp = Number(decoded.exp || 0);
            } catch (e) {}
        }
        if (exp) ENV.set('guangya_token_expires_at', String(exp));

        let respDeviceId = d.deviceid || d.deviceId || d.device_id || '';
        if (respDeviceId) ENV.set('guangya_device_id', respDeviceId);

        let username = d.username || '';
        if (username) ENV.set('guangya_username', username);

        console.log('[guangya] 登录数据已保存，Token有效期至:', exp ? new Date(exp * 1000).toLocaleString() : '未知');
        return true;
    }

    async sendVerificationCode(phone) {
        phone = this._normPhone(phone);
        if (!/^\+?\d{1,4}\s*1?\d{10,}$/.test(phone)) {
            throw new Error('手机号格式错误，请输入11位手机号');
        }

        this.ensureDeviceId();
        this.loginPhone = phone;

        const initResp = await reqs.post(ACC + '/v1/shield/captcha/init', {
            client_id: CID,
            action: 'POST:/v1/auth/verification',
            device_id: this.deviceId,
            meta: { phone_number: phone }
        }, { headers: this.authHeaders() }).catch((err) => {
            console.error('[guangya] captcha init error:', err.message);
            return err.response || { status: 500, data: {} };
        });

        let initData = initResp.data || {};
        if (initData.data) initData = initData.data;
        let captchaToken = initData.captcha_token || initData.token || '';

        if (!captchaToken) {
            let captchaUrl = initData.url || '';
            if (captchaUrl) {
                throw new Error('需要人机验证，请先在光鸭App或网页端登录后使用Token登录');
            }
            throw new Error('验证码初始化失败: ' + JSON.stringify(initData).slice(0, 120));
        }

        this.captchaToken = captchaToken;
        console.log('[guangya] captcha_token 获取成功');

        const verifyResp = await reqs.post(ACC + '/v1/auth/verification', {
            phone_number: phone,
            target: 'ANY',
            client_id: CID
        }, { headers: this.authHeaders({ 'x-captcha-token': captchaToken }) }).catch((err) => {
            console.error('[guangya] send verification error:', err.message);
            return err.response || { status: 500, data: {} };
        });

        let verifyData = verifyResp.data || {};
        if (verifyData.data) verifyData = verifyData.data;

        this.verificationId = verifyData.verification_id || verifyData.id || '';

        if (!this.verificationId) {
            throw new Error('发送验证码失败: ' + (verifyData.msg || verifyData.message || JSON.stringify(verifyData).slice(0, 120)));
        }

        console.log('[guangya] 验证码已发送, verificationId:', this.verificationId);
        return true;
    }

    async verifyCode(code) {
        code = String(code || '').trim();
        if (!/^\d{4,8}$/.test(code)) {
            throw new Error('验证码格式错误，请输入4-8位数字');
        }
        if (!this.verificationId || !this.captchaToken || !this.loginPhone) {
            throw new Error('请先发送验证码');
        }

        const verifyResp = await reqs.post(ACC + '/v1/auth/verification/verify', {
            verification_id: this.verificationId,
            verification_code: code,
            client_id: CID
        }, { headers: this.authHeaders() }).catch((err) => {
            console.error('[guangya] verifyCode error:', err.message);
            return err.response || { status: 500, data: {} };
        });

        let verifyData = verifyResp.data || {};
        if (verifyData.data) verifyData = verifyData.data;

        let verificationToken = verifyData.verification_token || verifyData.token || '';
        if (!verificationToken) {
            throw new Error('验证码校验失败: ' + (verifyData.msg || verifyData.message || JSON.stringify(verifyData).slice(0, 120)));
        }

        console.log('[guangya] verification_token 获取成功');

        const signinInitResp = await reqs.post(ACC + '/v1/shield/captcha/init', {
            client_id: CID,
            action: 'POST:/v1/auth/signin',
            device_id: this.deviceId,
            meta: { phone_number: this.loginPhone }
        }, { headers: this.authHeaders() }).catch((err) => {
            console.error('[guangya] signin captcha init error:', err.message);
            return err.response || { status: 500, data: {} };
        });

        let signinInitData = signinInitResp.data || {};
        if (signinInitData.data) signinInitData = signinInitData.data;
        let signinCaptchaToken = signinInitData.captcha_token || signinInitData.token || this.captchaToken;

        let signinResp = await reqs.post(ACC + '/v1/auth/signin', {
            verification_code: code,
            verification_token: verificationToken,
            username: this.loginPhone,
            client_id: CID
        }, { headers: this.authHeaders({ 'x-captcha-token': signinCaptchaToken }) }).catch((err) => {
            console.error('[guangya] signin error:', err.message);
            return err.response || { status: 500, data: {} };
        });

        let signinData = signinResp.data || {};
        if (signinData.data) signinData = signinData.data;

        if (signinData.error === 'captcha_invalid' && signinCaptchaToken !== this.captchaToken) {
            console.log('[guangya] captcha_invalid，使用旧token重试');
            signinResp = await reqs.post(ACC + '/v1/auth/signin', {
                verification_code: code,
                verification_token: verificationToken,
                username: this.loginPhone,
                client_id: CID
            }, { headers: this.authHeaders({ 'x-captcha-token': this.captchaToken }) }).catch((err) => {
                console.error('[guangya] signin retry error:', err.message);
                return err.response || { status: 500, data: {} };
            });

            signinData = signinResp.data || {};
            if (signinData.data) signinData = signinData.data;
        }

        console.log('[guangya] signin 响应:', JSON.stringify(signinData).slice(0, 300));

        let tokenData = signinData.token_resp || signinData.tokenResp || signinData;

        if (!this._saveLoginData(tokenData)) {
            throw new Error('登录失败: ' + (signinData.msg || signinData.message || signinData.error || JSON.stringify(signinData).slice(0, 180)));
        }

        this.verificationId = null;
        this.captchaToken = null;
        this.loginPhone = null;

        console.log('[guangya] 手机号登录成功');
        return {
            access_token: ENV.get('guangya_access_token'),
            refresh_token: ENV.get('guangya_refresh_token'),
            device_id: ENV.get('guangya_device_id')
        };
    }

    async loginByPhone(phone, code) {
        if (!this.verificationId) {
            await this.sendVerificationCode(phone);
        }
        return await this.verifyCode(code);
    }
}

export const Guangya = new GuangyaHandler();
