# 央视网 dev 测试

本分支提供央视网 CJS v4，兼容 NativeWasmTv 的在线站点插件协议。
此次仍是 JS + 原生 C 实现，不是 TVBox JAR 插件。

## 导入测试

1. 使用支持“导入来源自动发现分支插件”的新版测试包，应用内目录地址保持原样。
2. 将下面任意一种地址添加为频道列表网络来源：
   - M3U：`https://raw.githubusercontent.com/TvWasm/cjs/dev/cctv.m3u`
   - TXT：`https://raw.githubusercontent.com/TvWasm/cjs/dev/cctv.txt`

两种频道表都是同样的 20 个央视网频道。插件入口、运行时、库文件全部来自 dev。
首次选择频道时，宿主读取频道地址旁的 catalog.json，只登记这个站点，
不会修改应用内目录地址。若本次启动已经加载原版原生库，需完全退出后重启，
以启用更新后的库。旧宿主不支持自动发现分支，会报告入口未登记。
已安装的 v4 不会被较低版本自动覆盖。

## 修改

- 重写解析入口，支持 Ku9 参数和原有网页地址，保留签名、频道和清晰度传递。
- 记录最近成功的 API 端点十分钟；主接口故障后，后续频道优先使用健康备用接口。
  失败时仍尝试另一个接口。不跨频道缓存带签名的媒体 URL。
- 对 HTTP 状态、JSON、ack 和 HLS 地址进行校验；主响应地址无效时检查 backup。
- 日志记录频道、接口、请求次数、解析耗时，不输出鉴权内容或完整媒体地址。
- 原生解密在同一线程、同一分片内复用 NAL 工作区，避免重复分配释放。
  模块重置、线程释放和分配失败保留清理逻辑，保持原有分片并发和状态顺序。
- 提供 API14 ARMv7/x86、API19 ARMv7 优化、API21 ARM64 四套库。
  相比 main，原生库大小分别增加 32、32、240、272 字节。

## 验证

`node tools/test-cctv-dev.cjs` 检查参数、签名、失败重试、健康接口选择、无效响应和 backup。
`node tools/probe-cctv-dev.cjs` 执行实际入口并检查五个频道的 HLS 清单。

本机 2026-10-11 实测 CCTV-1/3/5/8/13 的解析与 HLS 清单均通过：
解析 213/105/104/103/148 ms；解析加清单 502/227/1299/737/225 ms。
这些是本轮网络采样，不代表电视首帧时间，也不承诺所有频道持续可用。

构建命令：

四套最终发布库分别完成三个真实加密 TS 样本的单线程、双线程、三线程解密，
共 72 次，结果 SHA-256 全部与原版一致。ARMv7 两套在 Android 4.4 真机验证；
ARM64、x86 在 Android 9 模拟器验证，ARM64 使用模拟器的 ARM 转译。
这验证解密一致性，不等同于 20 个频道全部完成电视端播放测试。

```powershell
./tools/build-native.ps1 -NdkDirectory D:/android/sdk/ndk -Site tv.cctv.com
python tools/build_plugin.py --site tv.cctv.com --base-url https://raw.githubusercontent.com/TvWasm/cjs/dev
```

站点版本由 3 升至 4，应用版本不变。发布清单包含每个文件的 SHA-256。
