/* CJS online site plug-in entry. The host supplies only the cjs bridge. */
function main(item) {
    var pageUrl = String(item && item.url || "");
    var match = /channelivePlay_([0-9a-f]{32})\.html/i.exec(pageUrl);
    if (!match) {
        throw new Error("无法识别广西台频道编号");
    }

    var body = [
        "loadFlag=false",
        "pageNo=1",
        "pageSize=1000",
        "liveMethod=0",
        "deptId=0a509685ba1a11e884e55cf3fc49331c",
        "platformId=bd7d620a502d43c09b35469b3cd8c211"
    ].join("&");
    var response = cjs.request(
        "https://api2019.gxtv.cn/memberApi/channel/channelList",
        "POST",
        {"Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"},
        body,
        true
    );
    if (!response || response.code !== 200) {
        throw new Error("广西台接口请求失败: HTTP " + (response && response.code || 0));
    }
    var payload;
    try {
        payload = JSON.parse(response.body || "{}");
    } catch (error) {
        throw new Error("广西台接口返回格式错误");
    }
    var rows = payload && payload.data && payload.data.rows || [];
    for (var index = 0; index < rows.length; index++) {
        var channel = rows[index] || {};
        if (String(channel.id || "").toLowerCase() !== match[1].toLowerCase()) {
            continue;
        }
        var streamUrl = channel.source === 2
            ? channel.encodeM3u8 : channel.decodeM3u8;
        if (!streamUrl) {
            throw new Error("该频道当前没有可用直播地址");
        }
        if (channel.source !== 2) {
            return {url: String(streamUrl), referer: pageUrl};
        }
        var customId = String(channel.encodingId || "").trim();
        var contentId = String(channel.encodingKey || "").trim();
        if (!customId || !contentId) {
            throw new Error("该频道缺少解密参数");
        }
        var blockSeed = customId + contentId;
        var blockSum = 0;
        for (var character = 0; character < blockSeed.length; character++) {
            blockSum += blockSeed.charCodeAt(character);
        }
        return {
            url: String(streamUrl),
            referer: pageUrl,
            transformer: "gxtv-xhls-v2",
            transformerArgs: [
                cjs.md5("01234568" + customId),
                String(Math.max(blockSum % 32, 4))
            ],
            mediaHosts: ["liangtv.cn"]
        };
    }
    throw new Error("广西台接口中没有这个频道");
}
