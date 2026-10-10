# 凤凰秀 Ku9

- 频道表：https://raw.githubusercontent.com/TvWasm/cjs/main/k-web/fenghuang.txt
- 脚本：`k-web/ku9/js/fenghuang.js`
- 官网三台直播：https://www.fengshows.com/live
- 官网匿名播放接口：`https://m.fengshows.com/api/v3/hub/live/auth-url?live_qa=hd&live_id=...`

| 参数 id | 频道 | 官网 live_id |
| --- | --- | --- |
| pcc（默认） | 凤凰中文台 | f7f48462-9b13-485b-8101-7b54716411ec |
| pin | 凤凰资讯台 | 7c96b084-60e1-40a9-89c5-682b994fb680 |
| phk | 凤凰香港台 | 15e02d92-1698-416c-af2f-3e9a872b4d78 |

旧频道表中的 `id=1016529` 继续映射到中文台；也支持表内三个官网 UUID。
旧实现抓取的风直播活动 `1016529` 已不再代表中文台，不能继续靠网页中的首个视频链接解析。

每次调用官网接口获取带 `txSecret`、`txTime` 的新地址，使用官网配置的
`https://tlive.fengshows.com` 电视 CDN，保留接口下发的流路径和全部查询参数，不缓存临时签名。
返回 `{url, referer, userAgent}`；默认 `quality=hd`，可附加 `&quality=sd` 选择标清。
这是 HTTP FLV 直播，播放器需支持 FLV 及返回的请求头；本地 nTv 当前已支持直连媒体携带这些字段。

本次测试中，三台 `.m3u8` 均返回 403，香港台专用 `hkmolive.fengshows.com` 也返回 403；
三台在 `tlive.fengshows.com` 的签名 FLV 地址均可用，因此保留 FLV，不直接改扩展名。

## 验证

- `node tools/test-fenghuang.js`：验证三台映射、旧 ID、默认频道、两档清晰度、临时地址更新、完整签名、播放请求头和异常处理。
- `node tools/test-fenghuang.js --live`（另需 Python 3）：实际执行脚本，逐台逐档读取 FLV 前 256 KiB，检查完整标签、H.264/AAC 配置、音视频数据包及递增时间戳。

2026-10-10 本机网络验证：三台的 hd/sd 共 6 路均返回 HTTP 200，FLV 音视频检查通过。
另对三台 hd 抽样使用 FFprobe 识别出 H.264 854×480、AAC 48 kHz，并使用 FFmpeg
解码画面，分别确认中文台、资讯台、香港台台标及不同节目内容。
未在电视设备上安装测试。
