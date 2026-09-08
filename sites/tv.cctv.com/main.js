/* CCTV API logic stays with the site plugin. HLS master selection uses item.quality. */
function main(item) {
    var match = /\/live\/([^/?#]+)/i.exec(String(item.url || ''));
    if (!match) throw new Error('无法识别央视网频道');
    var id = decodeURIComponent(match[1]);
    var endpoints = ['https://vdnx.live.cntv.cn/api/v3/vdn/live',
                     'https://vdnxbk.live.cntv.cn/api/v3/vdn/live'];
    var uid = cjs.md5(String(Date.now()) + Math.random());
    var last = '';
    for (var i = 0; i < endpoints.length; i++) {
        var t = Date.now(), nonce = Math.floor(Math.random() * 901) + 100;
        var auth = t + '-' + nonce + '-' + cjs.md5(id + t + nonce + 'a4220a71b31746908fa3e7fdd7a6852a');
        var u = endpoints[i] + '?channel=' + encodeURIComponent(id) + '&vn=1&pdrm=1&uid=' + uid + '&hbss=' + t;
        try {
            var response = cjs.request(u, 'GET', {'Referer':'https://tv.cctv.com/', 'auth-key':auth}, '', true);
            var data = JSON.parse(response.body || '{}');
            var url = data.manifest && data.manifest.hls_cdrm || data.backup && data.backup.hls_cdrm;
            if (response.code === 200 && data.ack === 'yes' && url) {
                return {url:String(url), referer:'https://tv.cctv.com/', quality:item.quality, ttlSec:600};
            }
            last = 'HTTP ' + response.code + ' ' + (data.ack || '');
        } catch (e) { last = String(e); }
    }
    throw new Error('央视网接口请求失败: ' + last);
}
