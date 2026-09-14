# 江西台 Ku9

- 脚本：`k-web/ku9/js/jxntv.js`
- 频道表：`k-web/jxntv.txt`
- 官网：https://www.jxntv.cn/live/#/
- 参数：`id=jxtv1/jxtv2/jxtv3/jxtv5/jxtv6/jxtv7/jxtv8/tcpd`，缺省为江西卫视。

每次执行通过官网公开的 `https://cdnauth.jxgdw.com/liveauth/pc` 接口获得临时播放凭据。
不缓存播放 URL；使用服务端返回的 `t`，并保持鉴权与播放 URL 的匿名 `uuid` 一致。
脚本是 ES5，同步使用 `ku9.request`、`ku9.md5`、`ku9.getQuery`，不需要 Canvas 或原生库。

播放必须携带官网 Referer 和 User-Agent。nTv 需要包含 Ku9 返回结果中 `referer`、
`userAgent` 向 HLS 代理传递的修复；此前客户端会忽略这些字段，导致 CDN 返回 403。
频道表的 GitHub 地址只有在脚本发布到仓库后才能在线使用。

## 验证

本地逻辑检查（Node.js）：`node tools/test-jxntv.js`。
真实接口及分片检查（另需 Python 3）：`node tools/test-jxntv.js --live`。
测试只读取每个频道首个分片的 564 字节，验证 MPEG-TS 同步字节，不下载整段直播。

2026-09-14 在本机网络验证：8/8 频道鉴权成功、M3U8 HTTP 200、TS 分片 HTTP 200。
单频道解析约 0.31～0.36 秒（包含测试进程启动开销，不代表首帧时间）。
覆盖默认频道、8 个频道映射、非法参数、请求签名、标识格式和接口失败处理。
nTv ARM32 release 构建通过；本轮未安装设备或验证音视频解码。
