# tv.gxtv.cn

广西网络广播电视台在线站点插件。`main.js` 负责根据
`channelivePlay_<id>.html` 页面地址调用频道接口，返回 HLS 地址以及
`encodingId`、`encodingKey`。`native/gxtv_xhls.c` 在本地代理中还原加密的
MPEG-TS PES 音视频负载，避免旧版 WebView 运行网页播放器时花屏或无声。

该站点当前使用 xhls v2：密钥为 `MD5("01234568" + encodingId)`，每个被标记的
PES 负载先做 AES-128 ECB 解密，再恢复站点的分块顺序。实现会读取 PES 内的算法
标记；遇到未知版本会保持原数据并返回错误，防止输出部分解密的数据。

插件只从已签名的在线 CJS 清单安装。应用不会扫描外部存储，也不接受本地脚本、
本地清单或 `file://` 地址。
