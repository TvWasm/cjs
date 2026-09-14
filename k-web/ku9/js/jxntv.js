/* 江西广播电视台直播。ES5 / Ku9；按官网公开鉴权接口实时获取播放地址。 */
function main(item) {
    var source = item && item.url ? String(item.url) : String(item || '');
    var id = ku9.getQuery(source, 'id') || 'jxtv1';
    var streams = {
        jxtv1: 'tv_jxtv1.m3u8',
        jxtv2: 'tv_jxtv2.m3u8',
        jxtv3: 'tv_jxtv3_hd.m3u8',
        jxtv5: 'tv_jxtv5.m3u8',
        jxtv6: 'tv_jxtv6.m3u8',
        jxtv7: 'tv_jxtv7.m3u8',
        jxtv8: 'tv_jxtv8.m3u8',
        tcpd: 'tv_taoci.m3u8'
    };
    if (!Object.prototype.hasOwnProperty.call(streams, id)) {
        throw new Error('江西台频道参数无效：' + id);
    }
    var stream = streams[id];
    var page = 'https://www.jxntv.cn/live/';
    var userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
    var alphabet = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678oOLl9gqVvUuI1';
    var nonce = '', salt = '', uuid = '';
    var positions = [53, 18, 31, 11, 21, 13, 14, 49, 15, 36, 19, 26, 24];
    var i;
    for (i = 0; i < 8; i++) nonce += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    for (i = 0; i < positions.length; i++) salt += alphabet.charAt(positions[i]);
    // 官网使用四个 Canvas 字节，每字节补到三位十六进制。无 Canvas 的
    // QuickJS 用同格式的匿名随机标识，鉴权和播放请求保持一致即可。
    for (i = 0; i < 4; i++) uuid += ('00' + Math.floor(Math.random() * 256).toString(16)).slice(-3);
    var timestamp = Math.floor(new Date().getTime() / 1000);
    var response = ku9.request('https://cdnauth.jxgdw.com/liveauth/pc', 'POST', {
        'Referer': page,
        'Origin': 'https://www.jxntv.cn',
        'User-Agent': userAgent,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': ku9.md5(String(timestamp) + stream + nonce + salt),
        'etag': nonce,
        'GPU': 'unknown, unknown'
    }, JSON.stringify({t: timestamp, stream: stream, uuid: uuid}));
    if (!response || Number(response.code) !== 200) {
        throw new Error('江西台播放接口请求失败：HTTP ' + (response ? response.code : 0));
    }
    var data;
    try { data = JSON.parse(response.body); }
    catch (error) { throw new Error('江西台播放接口未返回有效 JSON'); }
    if (!data || !/^[a-f0-9]{32}$/i.test(data.token || '')
            || !/^\d+$/.test(String(data.t || ''))) {
        throw new Error('江西台播放接口未返回有效的临时播放凭据');
    }
    // 使用服务端返回的 t；它不是请求的秒级时间戳。勿缓存临时 URL。
    return {
        url: 'https://yun-live.jxtvcn.com.cn/live-jxtv/' + stream
                + '?source=pc&t=' + encodeURIComponent(String(data.t))
                + '&token=' + encodeURIComponent(data.token) + '&uuid=' + uuid,
        referer: page,
        userAgent: userAgent
    };
}
