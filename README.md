# cjs

CJS 是 **Ku9 JS 的超集**：JS 沿用 `main(item)` 和 `ku9.*`，在此基础上增加按网站隔离的
C 原生处理、清晰度选择和在线版本管理。纯 JS 插件继续使用 Ku9，无需学习另一套 JS 协议。
每个网站独立存放脚本和 SO，不编译通用的站点解密库。

## 开发文档

- [开发入门](docs/developer-guide.md)：选用 Ku9 或 CJS、网站目录、构建与在线发布。
- [JS 接口](docs/javascript-api.md)：Ku9 兼容接口、返回格式、CJS 扩展与运行限制。
- [真实 Ku9 源测试](docs/ku9-source-tests.md)：四类脚本、七个频道的解析与取流结果。
- [安装与更新协议](docs/plugin-protocol.md)：JSON 字段、架构切换、缓存和完整性校验。
- [Ku9 脚本示例](examples/ku9-main.js)：同一份 `main(item)` 可作为 Ku9 脚本或 CJS 站点入口。

新宿主增加 `jsApi: "ku9"` 支持。已发布的三个站点 v1 保持原来的输入语义及文件内容；
迁移自己的旧 CJS 脚本时，请按接口文档修改参数并递增站点版本。

## 在线频道配置

将以下地址添加到 NativeWasmTv 的「频道列表」网络来源中：

| 配置 | 内容 | 在线导入地址 |
| --- | --- | --- |
| [cctv.m3u](cctv.m3u) | 央视网，20 个频道 | [Raw](https://raw.githubusercontent.com/TvWasm/cjs/main/cctv.m3u) |
| [cmg.m3u](cmg.m3u) | 央视频，30 个央视/CGTN/专题频道、33 个卫视频道 | [Raw](https://raw.githubusercontent.com/TvWasm/cjs/main/cmg.m3u) |
| [gxtv.m3u](gxtv.m3u) | 广西平台，5 个广西频道和 CETV-1/2/4 | [Raw](https://raw.githubusercontent.com/TvWasm/cjs/main/gxtv.m3u) |

频道行直接使用在线 `.cjs?参数` 地址，例如：

```m3u
#EXTM3U
#EXTINF:-1 group-title="广西电视",广西综艺旅游
https://raw.githubusercontent.com/TvWasm/cjs/main/gxtv.cjs?id=f3335975f9fe11e88bcfe41f13b60c62
#EXTINF:-1 group-title="央视网",CCTV-1 综合
https://raw.githubusercontent.com/TvWasm/cjs/main/cctv.cjs?id=cctv1&quality=high
#EXTINF:-1 group-title="央视频",CCTV-1 综合
https://raw.githubusercontent.com/TvWasm/cjs/main/cmg.cjs?id=600001859
```

需要包含 **在线 `.cjs` 频道入口支持** 的新版 NativeWasmTv；较早的 protocol 4 客户端也需要升级。
`id` 必填：广西使用 32 位频道编号，央视网使用 `cctv1` 等流编号，央视频使用数字 PID。
可选 `quality=high|medium|low` 仅覆盖当前频道，不改写客户端设置；省略时使用客户端配置。
其他查询参数会提供给站点 `main(item)` 的 `item.params`，当前三个站点只约定 `id` 和 `quality`。

`.cjs` 同时保留精简版本描述功能。客户端识别此类频道地址后，从插件目录匹配站点，
将查询参数交给对应插件，再播放插件解析出的媒体流。
插件目录配置为 `https://raw.githubusercontent.com/TvWasm/cjs/main/catalog.json`。

央视网和央视频支持高、中、低档，M3U 不重复列出清晰度线路。
实际可用档位受频道自身限制；广西平台当前只声明一档。
频道编号沿用应用内置列表及已提供的广西页面地址，未逐台重新验证直播可用性。

| Site directory | Native library | Quality tiers |
| --- | --- | --- |
| `sites/tv.cctv.com` | `cctv.so` | high / medium / low (HLS renditions) |
| `sites/yangshipin.cn` | `yangshipin.so` | high=fhd / medium=shd / low=hd |
| `sites/tv.gxtv.cn` | `gxtv.so` | high (the current API exposes one stream) |

Each directory owns source, build recipe, JS, version, plain JSON manifest and ABI artifacts.
Yangshipin links signing and CMG decryption into one library; its intermediate static
archive is never distributed. A new website is discovered from `sites/<domain>/site.json`.

```powershell
./tools/build-native.ps1 -NdkRoot C:\android-ndk-r14b
# Or build one site only:
./tools/build-native.ps1 -NdkRoot C:\android-ndk-r14b -Site tv.gxtv.cn
python tools/build_plugin.py --site tv.gxtv.cn
python tools/verify_plugin.py
```

Increase only the changed site's integer `version` before publishing changes. Do not
rewrite already published versions. The client verifies and installs one site's runtime
and one architecture's library, never other sites. See [protocol](docs/plugin-protocol.md).

## 清单格式与完整性

`catalog.json` 和各站点的 `plugin.json` 使用紧凑的明文 JSON，字段可直接查看；
不再使用 Base64 包装、RSA 签名或签名密钥。构建工具只依赖 Python 标准库。
下载脚本和 SO 后校验一次 `sha256`，确保内容完整；冷启动不重复计算整个文件的哈希。
保留协议版本、站点标识、文件路径和 SO 架构检查，避免错误配置或混用 32/64 位库。
新版客户端可读取并本地转换旧的 Base64 目录缓存，已有插件不用重新下载。
较早的客户端不能读取新的明文清单，需要升级 APK。
