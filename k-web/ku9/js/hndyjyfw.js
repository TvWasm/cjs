/* 河南党员教育服务网直播。ES5 / 同步 Ku9，频道和播放地址来自官网公开接口。 */
function main(item) {
    var source = item && item.url ? String(item.url) : String(item || '');
    var id = ku9.getQuery(source, 'id');
    var u = ku9.getQuery(source, 'u');
    var channels = [
        ['ycjy', '远程党员教育'],
        ['hnws', '河南卫视频道'],
        ['hnds', '河南都市频道'],
        ['hnms', '河南民生频道'],
        ['hnly', '河南梨园频道'],
        ['hnxc', '河南乡村频道'],
        ['hnwssj', '河南武术世界']
    ];
    var name = '';
    // 默认与入口 livePlay.html?u=1 一致；id 按名称匹配，避免官网排序变化串台。
    if (!id && !u) id = 'hnws';
    if (id) {
        for (var i = 0; i < channels.length; i++) {
            if (channels[i][0] === id) name = channels[i][1];
        }
        if (!name) throw new Error('河南党员教育网频道参数无效：' + id);
    } else if (!/^(0|[1-9][0-9]*)$/.test(u)) {
        throw new Error('河南党员教育网频道参数无效：u=' + u);
    }

    var page = 'https://www.hndyjyfw.gov.cn/livePlay.html?u=1';
    var userAgent = 'Mozilla/5.0';
    var response = ku9.request('https://epg.hndyjyfw.gov.cn/epg/mobileshow/digitlinklive',
            'GET', {'Referer': page, 'Origin': 'https://www.hndyjyfw.gov.cn',
                'User-Agent': userAgent, 'Accept': 'application/json'});
    if (!response || Number(response.code) !== 200) {
        throw new Error('河南党员教育网接口请求失败：HTTP ' + (response ? response.code : 0));
    }
    var data;
    try { data = JSON.parse(response.body); }
    catch (error) { throw new Error('河南党员教育网接口未返回有效 JSON'); }
    if (!Array.isArray(data) || !data.length) {
        throw new Error('河南党员教育网接口缺少频道列表');
    }
    for (var n = 0; n < data.length; n++) {
        var entry = data[n];
        if (!entry || (id ? entry.channelName !== name : String(n) !== u)) continue;
        var url = entry.livePlayUrl;
        if (typeof url !== 'string'
                || !/^https?:\/\/[^\s/?#]+\/[^\s]*\.m3u8(?:\?[^\s#]*)?$/i.test(url)) {
            throw new Error('河南党员教育网频道缺少有效 M3U8 地址：' + entry.channelName);
        }
        // 与官网 HTTPS 页面一致，只升级协议；保留路径及全部查询参数，不缓存播放地址。
        return {url: url.replace(/^http:/i, 'https:'),
            referer: 'https://www.hndyjyfw.gov.cn/livePlay.html?u=' + n, userAgent: userAgent};
    }
    throw new Error('河南党员教育网接口中没有找到频道：' + (name || 'u=' + u));
}
