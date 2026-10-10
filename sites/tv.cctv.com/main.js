/* dev: shared host HTTP/cache, preferred healthy endpoint, native H5E workspace. */
function main(item) {
    var api = typeof ku9 !== 'undefined' ? ku9 : cjs;
    var id = item.params && item.params.id;
    if (!id) {
        var page = String(item.pageUrl || item.url || '');
        var match = /\/live\/([a-zA-Z0-9]+)(?:\/|[?#]|$)/.exec(page);
        id = match ? match[1] : api.getQuery(page, 'id');
    }
    if (!/^[a-zA-Z0-9]{1,64}$/.test(String(id || '')))
        throw new Error('无法识别央视网频道');
    id = String(id);
    var endpoints = ['https://vdnx.live.cntv.cn/api/v3/vdn/live',
                     'https://vdnxbk.live.cntv.cn/api/v3/vdn/live'];
    // Remember endpoint health only, never share a channel's signed media URL.
    var preferred = api.getCache('cctv-dev-endpoint-v1') === '1' ? 1 : 0;
    var started = Date.now();
    var uid = api.md5(String(started) + Math.random());
    var errors = [];
    for (var attempt = 0; attempt < endpoints.length; attempt++) {
        var i = (preferred + attempt) % endpoints.length;
        var t = Date.now(), nonce = Math.floor(Math.random() * 901) + 100;
        var auth = t + '-' + nonce + '-' + api.md5(id + t + nonce + 'a4220a71b31746908fa3e7fdd7a6852a');
        var u = endpoints[i] + '?channel=' + encodeURIComponent(id) + '&vn=1&pdrm=1&uid=' + uid + '&hbss=' + t;
        try {
            var response = api.request(u, 'GET', {'Referer':'https://tv.cctv.com/', 'auth-key':auth}, '', true);
            if (response.code !== 200) throw new Error('HTTP ' + response.code);
            var data = JSON.parse(response.body || '{}');
            if (data.ack !== 'yes') throw new Error('ack ' + (data.ack || 'missing'));
            var candidates = [data.manifest && data.manifest.hls_cdrm,
                              data.backup && data.backup.hls_cdrm];
            for (var j = 0; j < candidates.length; j++) {
                if (typeof candidates[j] !== 'string' || !/^https?:\/\/[^\s]+$/i.test(candidates[j])) continue;
                api.setCache('cctv-dev-endpoint-v1', String(i), 600000);
                api.log('CCTV dev id=' + id + ' endpoint=' + i + ' attempts=' + (attempt + 1) + ' resolveMs=' + (Date.now() - started));
                return {url:candidates[j], referer:'https://tv.cctv.com/', quality:item.quality, ttlSec:600};
            }
            throw new Error('缺少有效 HLS 地址');
        } catch (e) { errors.push(i + ': ' + String(e)); }
    }
    throw new Error('央视网接口请求失败: ' + errors.join('; '));
}
