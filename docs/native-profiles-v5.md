# CJS 5：三档原生包

2026-09-10，协议 5 构建、目录结构与设备验证记录。

## 选择规则

| 应用进程 ABI | Android API | profile | 工具链 |
| --- | --- | --- | --- |
| armeabi-v7a | 14–18 | armv7-base | r17c Clang |
| armeabi-v7a | 19+ | armv7-perf | r25c Clang |
| arm64-v8a | 21+ | arm64 | r30 Clang |

64 位手机安装 32 位 APK 时选择 ARMv7 包，不能根据设备支持的最高 ABI 加载 ARM64 SO。
三档分别是插件包，并非要求发布三个 APK；ARM32 APK 按 API 选择基础或性能插件。
`native/profiles.json` 是构建配置。三个网站分别输出自己的 `cctv.so`、`gxtv.so`、`yangshipin.so`，共九个库。

## 清单与缓存

目录、站点清单和 runtime 的 `protocol` 为 5。普通 Ku9 JS 不受此变更影响；
`jsApi: cjs-v4` 继续表示原有 JS 入参语义，不是清单协议版本。

一个站点清单有四个文件：公共 `runtime.json` 和三个 profile 的 SO。例如原生条目：

```json
{"name":"cctv.so","abi":"armeabi-v7a","profile":"armv7-perf","minSdk":19,"ndk":"r25c","url":"https://your-host.example/cjs/sites/tv.cctv.com/dist/armv7-perf/cctv.so","sha256":"<文件SHA256>"}
```

客户端每个站点只下载公共 runtime 与匹配的一个 SO。安装时校验 SHA-256、ELF、API 与 profile；
冷启动只读取缓存与必要的头信息，不重复下载或全文件哈希。安装目录为
`cjs-sites-v5/<site>/<profile>/<version>`，偏好设置也按 profile 隔离。
架构切换后选择对应缓存，不能复用另一架构库。协议 4 缓存保留但不加载；首次访问需要重新下载。

发布必须同时安排支持协议 5 的宿主与新目录。旧客户端不能读取新清单，新客户端也不加载协议 4 清单。
部署时必须确保 APK 与目录均支持协议 5，避免新旧协议混用。
基础包沿用 `dist/armeabi-v7a`，64 位包沿用 `dist/arm64-v8a`；只增加性能包目录 `dist/armv7-perf`。
逻辑 profile 与下载目录分离，客户端缓存仍按 profile 隔离。

## 重建

NDK 父目录包含 `android-ndk-r17c`、`android-ndk-r25c`、`android-ndk-r30`。

```powershell
./tools/build-native.ps1 -NdkDirectory D:\android\sdk\ndk
# 或只构建一个站点的一档
./tools/build-native.ps1 -NdkDirectory D:\android\sdk\ndk -Site tv.cctv.com -Profile armv7-perf
python tools/build_plugin.py
python tools/verify_plugin.py
python tools/test_plugin_tools.py
```

站点实际标识为 `tv.cctv.com`、`tv.gxtv.cn`、`yangshipin.cn`。
脚本固定使用 Clang；构建缓存按站点、profile、NDK 隔离，避免复用旧 GCC 产物。
本次央视网 v3、广西 v2、央视频 v2；内容修改后继续递增版本，不能覆盖已发布版本。

## 本地验证结果

| 设备 | 应用/插件 | 结果 |
| --- | --- | --- |
| 4.0.4，API 15，emulator-5564，Houdini ARM 转译 | ARM32 / r17c base | 三站点通过 |
| 4.4.4，API 19，SM-G3608 | ARM32 / r25c perf | 三站点通过 |
| 7.1.1，API 25，小米 6 | ARM64 / r30 | 三站点通过 |
| 7.1.1，API 25，小米 6，覆盖为 32 位 APK | ARM32 / r25c perf | 三站点通过 |
| 4.0.4，强制替换为 r25c perf | 绕过生产选择规则的实验 | 加载央视网库失败 |

测试覆盖真实设备上通过本地 HTTP 下载、完整性校验、原生加载、央视网固定分片解密、
央视频固定分片解密及签名、广西 AES/重排已知答案测试。央视网和央视频输出 SHA-256 与既有基准一致。
广西使用合成测试分片；本轮没有逐个在线直播验证画面、声音和首帧时间，不能将此表解释为全链路直播验收。

四种正常组合均再次启动测试进程复用缓存，HTTP 请求列表为空。测试进程执行的单次耗时包含输入读取，
不能用于严谨的性能排名或频道首帧比较。主要验证正确性和 profile 选择。

4.0.4 强制性能库的底层错误为：

```text
UnsatisfiedLinkError: Cannot load library: get_lib_extents[753]:
cctv.so is not a valid ELF object
```

同一个库在 4.4/7.1.1 通过，因此不能将错误解释为下载文件损坏。
本结果仅证明当前 4.0.4/Houdini 环境不能使用此性能包；不泛化到所有 ARM 真机。
生产配置继续以 API 19 为性能包最低版本。r25c 官方平台下限也是 API 19。

原始测试日志位于宿主仓库 `.codex-tmp/cjs-v5/test-*.log`；仪器测试源为
`app/src/androidTest/java/xiao/bu/tv/CjsV5Instrumentation.java`。
测试使用独立目录和偏好设置，不修改频道配置。

工具链来源：[NDK 下载](https://developer.android.com/ndk/downloads)、
[历史 NDK](https://github.com/android/ndk/wiki/Unsupported-Downloads)。
