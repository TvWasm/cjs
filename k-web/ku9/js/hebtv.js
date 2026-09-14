/* 河北广播电视台直播。ES5，同步 Ku9 API；播放配置来自官网公开接口。 */
function main(item) {
    var source = item && item.url ? String(item.url) : String(item || '');
    var channels = [
        ['hbws', '462', '河北卫视'],
        ['jjsh', '114', '经济生活'],
        ['hbds', '62', '河北都市'],
        ['wlty', '334', '文旅体育'],
        ['sekj', '70', '少儿科教'],
        ['sannong', '118', '三农频道'],
        ['sjgw', '330', '三佳购物']
    ];
    var id = ku9.getQuery(source, 'id');
    var index = ku9.getQuery(source, 'index');
    var channel = null;
    if (id) {
        for (var i = 0; i < channels.length; i++) {
            if (channels[i][0] === id) channel = channels[i];
        }
    } else if (!index || /^[0-6]$/.test(index)) {
        channel = channels[index ? Number(index) : 0];
    }
    if (!channel) throw new Error('河北台频道参数无效：' + (id || index));

    var pageUrl = 'https://www.hebtv.com/19/19js/st/xdszb/index.shtml?index='
            + channels.indexOf(channel);
    var response = ku9.request(
            'https://api.cmc.hebrts.cn/cmsback/api/com/article/getArticleList?catalogId=32557&siteId=1',
            'POST', {
                'Referer': pageUrl,
                'Origin': 'https://www.hebtv.com',
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded'
            }, '');
    if (!response || Number(response.code) !== 200) {
        throw new Error('河北台接口请求失败：HTTP ' + (response ? response.code : 0));
    }
    var data;
    try { data = JSON.parse(response.body); }
    catch (error) { throw new Error('河北台接口未返回有效 JSON'); }
    if (!data || data.returnCode !== '0000') {
        throw new Error('河北台接口异常：' + (data && data.returnDesc || '未知错误'));
    }
    var news = data.returnData && data.returnData.news;
    if (!Array.isArray(news)) throw new Error('河北台接口缺少频道列表');
    for (var n = 0; n < news.length; n++) {
        var entry = news[n];
        // 官网排序会调整；优先按固定 videoId 匹配，不按返回数组下标取台。
        if (entry && (String(entry.videoId) === channel[1]
                || (!entry.videoId && entry.title === channel[2]))) {
            return {url: hebtvPlaybackUrl(entry), referer: pageUrl};
        }
    }
    throw new Error('河北台接口中没有找到：' + channel[2]);
}

function hebtvPlaybackUrl(entry) {
    var video = entry.liveVideo && entry.liveVideo[0];
    var format = video && video.formats && video.formats[0];
    var url = format && format.url;
    var movie = entry.appCustomParams && entry.appCustomParams.movie;
    if (typeof url !== 'string' || !/^https?:\/\/[^\s]+$/i.test(url)
            || !movie || typeof movie.liveUri !== 'string' || !movie.liveUri
            || typeof movie.liveKey !== 'string' || !movie.liveKey) {
        throw new Error('河北台频道缺少有效播放配置：' + (entry.title || entry.videoId));
    }
    // 与官网 linkToMd5 一致；每次解析重新生成，不缓存过期播放地址或写死密钥。
    var expires = Math.floor(new Date().getTime() / 1000) + 7200;
    var signature = ku9.md5(movie.liveUri + movie.liveKey + expires);
    if (!/^[a-f0-9]{32}$/i.test(signature)) throw new Error('河北台播放地址签名失败');
    url = url.split('#')[0];
    return url + (url.indexOf('?') < 0 ? '?' : '&') + 't=' + expires + '&k=' + signature;
}
