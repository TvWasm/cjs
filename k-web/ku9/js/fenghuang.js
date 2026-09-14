/**
 * 根据凤凰风直播 ID 获取真实视频播放地址。
 * 酷9会把 { url, name } 传给 main；网络请求必须通过 ku9 桥接完成。
 */
function main(item) {
    var sourceUrl = item && item.url ? String(item.url) : String(item || "");
    var match = sourceUrl.match(/[?&]id=([^&#]+)/);
    var videoId = match ? decodeURIComponent(match[1]) : sourceUrl;
    if (!videoId) {
        throw new Error("缺少凤凰直播 id");
    }

    var pageUrl = "https://flive.ifeng.com/live/" + encodeURIComponent(videoId) + ".html";
    var html = ku9.get(pageUrl, {
        "Referer": "https://jx.ifeng.com/zhibo",
        "Accept": "text/html,application/xhtml+xml"
    });
    if (!html) {
        throw new Error("凤凰直播页面请求失败");
    }

    // 兼容页面中的普通斜杠、转义斜杠、Unicode 转义及 HTML 实体。
    html = html.replace(/\\u002F/gi, "/").replace(/\\\//g, "/").replace(/&amp;/g, "&");
    var urlMatch = html.match(/https?:\/\/[^\s"'<>]+\.(?:m3u8|mp4)(?:\?[^\s"'<>]*)?/i);
    if (!urlMatch) {
        throw new Error("凤凰直播页面中未找到视频地址");
    }
    return urlMatch[0];
}
