# 福建台 Ku9

- 脚本：`k-web/ku9/js/fjtv.js`
- 频道表：`k-web/fjtv.txt`
- 官网入口：https://live.fjtv.net/sepd/
- 官网公开签名实现：https://www.fjtv.net/t/m2obase.js

| 参数 id | 频道 |
| --- | --- |
| zhpd（默认） | 综合频道 |
| setv | 东南卫视 |
| xwpd | 新闻频道 |
| dspd | 文旅·体育频道 |
| sepd | 少儿频道 |
| hxtv | 海峡卫视 |

脚本调用官网 `/m2o/channel/channel_info.php?channel_id=...`，使用官网 Web
客户端的公开 MD5 签名规则。18 位频道 ID 始终保存为字符串，不能转为 JS Number。
每次执行重新读取 `m3u8`，保留 `_upt` 等临时参数；与 HTTPS 官网页面一样使用 HTTPS 播放。
只解析 JSON，不执行远程网页代码，不缓存临时播放地址，不需要新增原生库。

返回 `url`、`referer`、`userAgent`，使用此前江西台任务补齐的 nTv Ku9 HLS 请求头支持。
频道表中的 GitHub 链接需在脚本发布到仓库后才可在线使用。

## 验证

`node tools/test-fjtv.js`：验证六台映射、默认频道、签名、长 ID 精度、完整 URL 参数、
返回请求头，以及非法参数、HTTP 错误、错误 JSON、频道不匹配和无效播放 URL。

`node tools/test-fjtv.js --live`（另需 Python 3）：调用真实脚本和接口，检查播放列表，
每台读取一个 TS 分片的前 564 字节，验证 MPEG-TS 同步字节，不下载整段直播。

2026-09-14 本机网络验证：6/6 接口成功、M3U8 HTTP 200、抽样 TS 分片 HTTP 200。
单次解析约 0.19～0.72 秒，包含测试进程启动开销，不代表设备播放首帧时间。
本轮未安装设备或验证音视频解码，未推送仓库。
