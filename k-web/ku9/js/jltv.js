/* 吉林广播电视台直播源解析。兼容 nTv/KU9 的同步脚本执行环境。 */
function main(item) {
    var sourceUrl = item && item.url ? String(item.url) : String(item || '');
    var idMatch = sourceUrl.match(/[?&]id=([^&#]+)/i);
    var id = idMatch ? decodeURIComponent(idMatch[1]) : 'jlws';
    var channelMap = {
        jlws: ['吉林卫视'],
        ds: ['都市频道', '吉林都市'],
        sh: ['生活频道', '吉林生活'],
        ys: ['影视频道', '吉林影视'],
        xc: ['乡村频道', '吉林乡村'],
        zy: ['综艺·文化频道', '综艺文化频道', '吉林综艺文化'],
        cc: ['长春综合']
    };
    var aliases = channelMap[id] || [id];
    var apiUrl = 'https://clientapi.jlntv.cn/broadcast/list?page=1&size=10000&type=1';
    var headers = {
        'Origin': 'https://www.jlntv.cn',
        'Referer': 'https://www.jlntv.cn/tv?id=104',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
                + 'AppleWebKit/537.36 (KHTML, like Gecko) '
                + 'Chrome/116.0.0.0 Safari/537.36'
    };

    var responseText = ku9.get(apiUrl, headers);
    if (!responseText) {
        throw new Error('吉林电视台接口没有返回数据');
    }
    var encrypted = responseText;
    try {
        var envelope = JSON.parse(responseText);
        if (typeof envelope === 'string') {
            encrypted = envelope;
        } else if (envelope && typeof envelope.data === 'string') {
            encrypted = envelope.data;
        }
    } catch (ignored) {
    }

    var plainText = xxteaDecryptBase64(String(encrypted), '5b28bae827e651b3');
    if (!plainText) {
        throw new Error('吉林电视台接口数据解密失败');
    }
    var response;
    try {
        response = JSON.parse(plainText);
    } catch (error) {
        throw new Error('吉林电视台接口数据格式错误');
    }
    if (response && response.code !== undefined && Number(response.code) !== 0) {
        throw new Error(response.message || response.msg || '吉林电视台接口请求失败');
    }
    var list = response && response.data;
    if (list && list.list instanceof Array) {
        list = list.list;
    }
    if (!(list instanceof Array)) {
        throw new Error('吉林电视台接口没有返回频道列表');
    }

    for (var index = 0; index < list.length; index++) {
        var channel = list[index] || {};
        if (!matchesAlias(channel.title || channel.name || '', aliases)) {
            continue;
        }
        var detail = channel.data || {};
        var playUrl = detail.streamUrl || channel.streamUrl || detail.playUrl
                || channel.playUrl || detail.url || channel.url || '';
        playUrl = String(playUrl).replace(/^\s+|\s+$/g, '');
        if (/^https?:\/\//i.test(playUrl)) {
            return {url: playUrl};
        }
    }
    throw new Error('没有找到频道：' + aliases[0]);
}

function matchesAlias(name, aliases) {
    var normalized = normalizeChannelName(name);
    for (var index = 0; index < aliases.length; index++) {
        if (normalized === normalizeChannelName(aliases[index])) {
            return true;
        }
    }
    return false;
}

function normalizeChannelName(value) {
    return String(value || '').replace(/\s+/g, '').replace(/[·•]/g, '');
}

function xxteaDecryptBase64(value, key) {
    var binary;
    try {
        binary = atob(String(value || '').replace(/\s+/g, ''));
    } catch (error) {
        return '';
    }
    var encryptedBytes = [];
    for (var index = 0; index < binary.length; index++) {
        encryptedBytes[index] = binary.charCodeAt(index) & 255;
    }
    var values = bytesToUint32(encryptedBytes);
    var keyBytes = utf8Encode(key);
    var keyValues = bytesToUint32(keyBytes);
    while (keyValues.length < 4) {
        keyValues.push(0);
    }
    values = xxteaDecrypt(values, keyValues);
    var clearBytes = uint32ToBytes(values, true);
    return clearBytes ? utf8Decode(clearBytes) : '';
}

function xxteaDecrypt(values, key) {
    var last = values.length - 1;
    if (last < 1) {
        return values;
    }
    var delta = 0x9E3779B9;
    var rounds = Math.floor(6 + 52 / (last + 1));
    var sum = (rounds * delta) >>> 0;
    var y = values[0];
    var z;
    while (sum !== 0) {
        var e = (sum >>> 2) & 3;
        for (var position = last; position > 0; position--) {
            z = values[position - 1];
            y = values[position] = (values[position]
                    - xxteaMix(sum, y, z, position, e, key)) >>> 0;
        }
        z = values[last];
        y = values[0] = (values[0]
                - xxteaMix(sum, y, z, 0, e, key)) >>> 0;
        sum = (sum - delta) >>> 0;
    }
    return values;
}

function xxteaMix(sum, y, z, position, e, key) {
    return (((z >>> 5 ^ y << 2) + (y >>> 3 ^ z << 4))
            ^ ((sum ^ y) + (key[(position & 3) ^ e] ^ z))) >>> 0;
}

function bytesToUint32(bytes) {
    var values = new Array(Math.ceil(bytes.length / 4));
    for (var position = 0; position < values.length; position++) {
        values[position] = 0;
    }
    for (var index = 0; index < bytes.length; index++) {
        values[index >>> 2] = (values[index >>> 2]
                | bytes[index] << ((index & 3) << 3)) >>> 0;
    }
    return values;
}

function uint32ToBytes(values, includeLength) {
    var byteLength = values.length << 2;
    if (includeLength) {
        var dataLength = values[values.length - 1] >>> 0;
        if (dataLength < byteLength - 7 || dataLength > byteLength - 4) {
            return null;
        }
        byteLength = dataLength;
    }
    var bytes = new Array(byteLength);
    for (var index = 0; index < byteLength; index++) {
        bytes[index] = values[index >>> 2] >>> ((index & 3) << 3) & 255;
    }
    return bytes;
}

function utf8Encode(value) {
    var text = unescape(encodeURIComponent(String(value || '')));
    var bytes = new Array(text.length);
    for (var index = 0; index < text.length; index++) {
        bytes[index] = text.charCodeAt(index) & 255;
    }
    return bytes;
}

function utf8Decode(bytes) {
    var text = '';
    for (var index = 0; index < bytes.length; index++) {
        text += String.fromCharCode(bytes[index]);
    }
    try {
        return decodeURIComponent(escape(text));
    } catch (error) {
        return text;
    }
}
