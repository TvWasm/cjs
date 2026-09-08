# Ku9 原样脚本测试记录

测试日期：2026-09-08。

## 测试范围

从 [webSourceM3U8 的 Ku9 脚本目录](https://github.com/buhanzhe/webSourceM3U8/tree/main/k-web/ku9/js)
原样下载 4 类脚本，选择 7 个频道参数，加上 1 个无效参数样本。
覆盖查询参数、动态 M3U8、网页提取、接口请求、Base64 和纯 JS XXTEA 解密。

环境：`emulator-5564`，Android 4.0.4/API 15，ARM32 QuickJS 经 ARM 转译运行。
测试调用应用实际 CJS JS 包装器、QuickJS 引擎及 Ku9 HTTP 客户端，使用真实源站响应。
继续访问返回的 M3U8、变体清单和首个分片，最多读取分片前 64 KiB，并检查 TS 同步字节。
源脚本未做替换或修改，下载走默认 GitHub HTTPS 加速站。

**本节是首轮 CJS/QuickJS 解析与取流验证；后续已补充 Android 4.0.4 应用内画面验证，见文末。**
未覆盖声音、持续解码、长时间稳定性、不同网络和所有 Ku9 私有扩展。
首轮测试时独立 `.js` 入口仍要求 Android 5.0，未通过该入口加载脚本。
后续已为 API 14–20 接入独立 QuickJS，在指定的 4.0.4 设备完成应用内验证；API 21+ 保留原 WebView 执行路径。

## 修复后结果

| 脚本 | 参数/频道 | 结果 | 取流证据 |
| --- | --- | --- | --- |
| `hnyx.js` | `id=zjws4K&dur=10.0105&offset=175728140`，浙江卫视 4K | 通过 | 动态 M3U8，IPv6 TS 分片 HTTP 206，TS 同步字节有效 |
| `hnyx.js` | `id=CCTV_4K&dur=10.001&offset=162424040`，CCTV 4K | 通过 | 动态 M3U8，IPv6 TS 分片 HTTP 206，TS 同步字节有效 |
| `fenghuang.js` | `id=1016529`，凤凰中文台 | 通过 | M3U8 及 TS 分片 HTTP 200，TS 同步字节有效 |
| `jlntv.js` | `id=jlws`，吉林卫视 | 修复兼容层后通过 | 接口解密、两层 HLS、TS 分片 HTTP 206 |
| `jlntv.js` | `id=ds`，吉林都市 | 修复兼容层后通过 | 接口解密、两层 HLS、TS 分片 HTTP 206 |
| `jlntv.js` | `id=zy`，吉林综艺文化 | 修复兼容层后通过 | 接口解密、两层 HLS、TS 分片 HTTP 206 |
| `cbg.js` | `id=https://sj.cbg.cn/wap/list/4918/1.html`，重庆 | 失败：源脚本结果错误 | 返回 `getLiveUrl` 接口，HTTP 200 但正文为 JSON，非媒体 |

合计：7 个频道样本中，6 个通过解析及取流，1 个为源脚本问题。
湖南样本在本次测试环境可访问 IPv6 分片，不代表没有 IPv6 的设备或网络也可以播放。

本轮解析耗时（含首次脚本下载和接口网络耗时，不是纯 JS 执行基准）：
浙江 1222 ms、CCTV 4K 40 ms、凤凰 472 ms、重庆 2284 ms、吉林卫视 791 ms、
吉林都市 288 ms、吉林综艺文化 187 ms。不同样本共享脚本下载缓存，不能直接用这些数值比较脚本性能。

## 定位并修复的宿主兼容问题

1. 裸 QuickJS 没有 `atob/btoa`。吉林脚本捕获 `atob` 的 ReferenceError 后返回空串，
   表面表现为“接口数据解密失败”。兼容层补齐 Base64 二进制字符串接口后，三个吉林频道通过。
2. 裸 QuickJS 没有 `console`。湖南脚本在 `dur=bad` 时调用 `console.log`，
   变成 `ReferenceError: console is not defined`。补齐日志接口后，脚本正常返回空播放结果，
   宿主据此判定参数无效，未把错误参数当成可播放频道。

增加了 Base64 全字节往返、空值、空白字符、无填充输入、非法输入和日志接口回归测试。
仅在全局函数缺失时提供兼容实现，不替换 WebView 自带函数。

## 源脚本问题：重庆

`cbg.js` 先对 `ku9.request` 返回的 `r.url` 执行宽泛的 `.m3u8` 正则匹配。
该 URL 是 `https://web.cbg.cn/live/getLiveUrl?url=...chunklist.m3u8`，查询参数中的 `.m3u8`
也被匹配，因此在检查 `r.body` 之前，脚本已把 JSON 接口误当成视频地址返回。

应先从接口正文提取真实媒体地址；处理重定向地址时，检查 URL 的路径而不是查询参数中的后缀。
这不是客户端 HTTP 请求失败。此次未修改线上重庆脚本，也未在宿主加入针对该网站的特殊替换逻辑。

## 复现

应用测试源码：`app/src/androidTest/java/xiao/bu/tv/Ku9SourceSmokeTest.java`。
安装匹配架构的 Debug APK 和 AndroidTest APK 后：

```powershell
adb -s emulator-5564 shell am instrument -w -e ku9sources true xiao.bu.tv.test/xiao.bu.tv.QuickJsInstrumentation
```

这是显式联网诊断，不随普通单元回归自动访问源站。输出每个样本的解析结果、HTTP 耗时、
脚本 SHA-256、媒体响应类型和 TS 检查；结果同时保存到测试应用数据目录的 `ku9-source-smoke.json`。
诊断流程完成并不表示每个频道通过，应逐项检查 JSON 中的 `error`、媒体类型和 `tsSync`。

本次使用的原始脚本摘要：

| 文件 | SHA-256 |
| --- | --- |
| `hnyx.js` | `62ebbed9ee092b2f5a3d96ab703e22c6029858cd86e6683e494f0a76b1b3af3c` |
| `fenghuang.js` | `f16ea4dca714e5dd7e21eeeaeb40c5ed18e6f3aa074ad465973a6d8d15b3c524` |
| `cbg.js` | `a63aded9a406cb4131336f9a8e7ffc796708994448e1a0fdea0008a823fdbb47` |
| `jlntv.js` | `6edb44a9ab6c9bb2ec159fbd174a1422c11b9b1e576d3de35d8b3eb58e21643a` |


## Android 4.0.4 应用内画面验证（同日补测）

设备仍为 `emulator-5564`，Android 4.0.4/API 15。将上述原始在线 `.js?参数` 地址导入应用频道表，
经正式 Ku9 入口下载脚本、QuickJS 执行、播放器解码和屏幕显示，不使用预先解析出的媒体地址替代频道入口。

兼容改动：API 14–20 不再被“仅支持 Android 5.0”拦截；通过后台 QuickJS 执行，复用 Ku9 接口和缓存。
动态列表按 2–5 秒刷新，切台/取消时关闭列表服务并丢弃旧请求回调；QuickJS 保留原始 const/let，
不进行为旧 WebView 准备的文本语法替换。旧系统路径按实际网络连接结果判断可达性，
避免模拟器/NAT 未报告公网 IPv6 网卡时错误拒绝可访问的 IPv6 源。

| 频道 | 画面验证 | 本次实际媒体规格 | 截图/日志证据 |
| --- | --- | --- | --- |
| 凤凰中文台 | 通过 | 1280×720 H.264，约 25fps | 可见凤凰台标及节目，首帧日志存在 |
| 吉林卫视 | 通过 | 1920×1080 H.264，约 25fps | 首帧及间隔截图，中央画面像素变化 |
| 吉林都市 | 通过 | 1920×1080 H.264，约 25fps | 可见都市台标，首帧及间隔截图 |
| 吉林综艺文化 | 通过 | 1920×1080 H.264，约 25fps | 可见综艺·文化台标，首帧及间隔截图 |
| 浙江卫视 4K | 通过 | **实际 1920×1080 H.264**，约 25fps | 可见浙江卫视 4K 台标，动态列表持续刷新 |
| CCTV 4K | 通过 | **实际 1920×1080 H.264**，约 25fps | 可见 CCTV 4K 台标，首帧及间隔截图 |
| 重庆 | 未出画面 | 源脚本仍返回 JSON 接口地址 | 等待约 42 秒无新首帧，保留的是上一频道的静止画面，不计为通过 |

6 个有效样本均收到 AAC 音频解码初始化日志，但本轮目标为画面验证，未进行听音及声画同步验证。
截图调试帧率为短窗口统计值，不能作为长时间帧率稳定性基准。两个带“4K”名称的频道实际输入为 1080p，
此次不能据此声称验证了 4K/HEVC 解码。

另验证了连续快速切换吉林卫视 → 吉林都市 → 浙江 → 凤凰，最终只有凤凰的新首帧回调，
旧脚本结果没有覆盖最终频道。浙江动态列表连续观察约 50 秒，每约 5 秒执行一次，
QuickJS 刷新约 5–20 ms，后续截图仍有正常画面。

双架构 Release 编译及 APK 签名校验通过。截图、逐台日志和快速切台日志保存在测试工作区，
不将节目画面或临时媒体鉴权地址打包进插件仓库。
