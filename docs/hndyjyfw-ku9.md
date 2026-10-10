# 河南党员教育服务网 Ku9

- 频道表：https://raw.githubusercontent.com/TvWasm/cjs/main/k-web/hndyjyfw.txt
- 脚本：`k-web/ku9/js/hndyjyfw.js`
- 官网入口：https://www.hndyjyfw.gov.cn/livePlay.html?u=1
- 公开频道接口：https://epg.hndyjyfw.gov.cn/epg/mobileshow/digitlinklive

| 参数 id | 频道 |
| --- | --- |
| ycjy | 远程党员教育 |
| hnws（默认） | 河南卫视 |
| hnds | 河南都市 |
| hnms | 河南民生 |
| hnly | 河南梨园 |
| hnxc | 河南乡村 |
| hnwssj | 河南武术世界 |

每次解析从官网接口读取 `livePlayUrl`，按 `channelName` 匹配频道，避免接口排序变化串台。
与官网页面一样将 HTTP 地址升级为 HTTPS，保留完整路径及查询参数，不缓存播放地址。
也支持官网 `u` 参数，按接口当前顺序从 0 开始选择；同时提供 `id` 时优先使用 `id`。
返回 `url`、`referer`、`userAgent`，兼容仓库现有 Ku9 接口，无需原生库或浏览器。

## 验证

- `node tools/test-hndyjyfw.js`：验证七台映射、默认频道、`u`、排序变化、地址更新、HTTPS、请求头及异常处理。
- `node tools/test-hndyjyfw.js --live`（另需 Python 3）：核对官网完整频道列表，调用真实脚本，逐台检查 M3U8 和一个 TS 分片的前 564 字节。

2026-10-10 本机网络验证：官网共 7 台，7/7 的 M3U8 与抽样 TS 分片均返回 HTTP 200，
TS 同步字节验证通过；单台解析约 0.24～0.27 秒（包含测试进程启动开销）。
未在设备上验证音视频解码或首帧时间。
