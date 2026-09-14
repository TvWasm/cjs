/* 福建广播影视集团直播。ES5 / 同步 Ku9，接口及签名规则来自官网 m2obase.js。 */
function main(item) {
    var source = item && item.url ? String(item.url) : String(item || '');
    var id = ku9.getQuery(source, 'id') || 'zhpd';
    // 官网频道 ID 超过 JS 安全整数范围，始终使用字符串。
    var channels = {
        zhpd: '665248990102917120',
        setv: '665248966136664064',
        xwpd: '665248914378952704',
        dspd: '665248752898248704',
        sepd: '665248553475870720',
        hxtv: '665248523855695872'
    };
    if (!Object.prototype.hasOwnProperty.call(channels, id)) {
        throw new Error('福建台频道参数无效：' + id);
    }
    var page = 'https://live.fjtv.net/' + id + '/';
    var userAgent = 'Mozilla/5.0';
    // 官网公开 Web 客户端参数；salt 按原字符串参与签名，不做 Base64 解码。
    var key = '877a9ba7a98f75b90a9d49f53f15a858';
    var salt = 'NjhhMDRiODE3N2JkYzllNWUxNmE4OWU2Nzc3YTdiNjY=';
    var version = '1.0.0';
    var timestamp = String(Math.floor(new Date().getTime() / 1000));
    var response = ku9.request('https://live.fjtv.net/m2o/channel/channel_info.php?channel_id='
            + channels[id], 'GET', {
        'Referer': page,
        'User-Agent': userAgent,
        'Accept': 'application/json',
        'X-API-TIMESTAMP': timestamp,
        'X-API-KEY': key,
        'X-AUTH-TYPE': 'md5',
        'X-API-VERSION': version,
        'X-API-SIGNATURE': ku9.md5(key + '&' + salt + '&' + version + '&' + timestamp)
    });
    if (!response || Number(response.code) !== 200) {
        throw new Error('福建台播放接口请求失败：HTTP ' + (response ? response.code : 0));
    }
    var data;
    try { data = JSON.parse(response.body); }
    catch (error) { throw new Error('福建台播放接口未返回有效 JSON'); }
    if (!Array.isArray(data) || !data.length || !data[0]
            || data[0].id !== channels[id]) {
        throw new Error('福建台播放接口未返回对应频道：' + id);
    }
    var url = data[0].m3u8;
    if (typeof url !== 'string' || !/^https?:\/\/[^\s/?#]+\/[^\s]*\.m3u8(?:\?[^\s#]*)?$/i.test(url)) {
        throw new Error('福建台频道缺少有效的 M3U8 播放地址：' + id);
    }
    // 与 HTTPS 官网页面一致；保留接口下发的完整签名参数，不缓存临时地址。
    return {url: url.replace(/^http:/i, 'https:'), referer: page, userAgent: userAgent};
}
