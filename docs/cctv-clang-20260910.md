# 央视网 Clang 重编译验证（2026-09-10）

央视网站点 ARM32、ARM64 已使用 NDK r20b / Clang 8.0.7 / O3 重编译。本地插件版本从 v1 提升到 v2，插件、入口版本和哈希清单已重新生成并通过 verify_plugin.py。尚未推送或发布。

## Android 4.4.4 同分片测试

SM-G3608 / ARM32，CCTV-1 同一份 TS，481844 字节。离线 app_process JNI 测试；读取、输入复制、哈希与休眠不计时。每份库先预热 1 次，再取 5 次平均。每次 releaseThreadContext 后解密，因此包含重新初始化成本。

|库|平均墙钟|平均线程 CPU|
|---|---:|---:|
|线上 1.6.0 内置库|2157.8ms|2145.4ms|
|重编译前 GCC 插件|3158.6ms|3152.8ms|
|Clang 插件 v2|2147.6ms|2143.2ms|

Clang 相对 GCC 耗时下降 32.0%。三份库各 6 次输出哈希完全一致，输出包含实际字节变化；FFmpeg 完整视频解码成功，错误日志为空。

- 输入 SHA-256：`f6f61dff427bea43c76e0c25343431c549557aaae64c0fcecb0c8d364dfdbd10`。
- 输出 SHA-256：`a95d636add5da77fc568c557ab4622e0f95952421c11fc5ec6975495424ab287`。

## 构建修正

`tools/build-native.ps1` 从强制 GCC 4.9 改为 Clang，构建目录增加 `-clang` 后缀，避免 make 沿用已有 GCC 对象文件。保留每网站独立 SO，不合并站点。ARM32 最低 android-16，ARM64 最低 android-21。

ARM32 已在 4.4 上实测。ARM64 本次仅完成编译和协议/文件校验，未做设备解密测试。单分片改善不代表首播总耗时同比下降；网络、缓冲和切台等待仍存在。没有重新安装 APK，测试后应用保持退出。

证据目录：`D:/documents/nTv-private-merge/.codex-tmp/cctv-clang/`，包括输入、Java 测试源码、日志、summary.json 和解码检查。
