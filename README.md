# cjs

Online C/JS plugins for NativeWasmTv, isolated by website. Protocol 4 has no shared
provider script bundle or common decryption library.

## 在线频道配置

将以下地址添加到 NativeWasmTv 的「频道列表」网络来源中：

| 配置 | 内容 | 在线导入地址 |
| --- | --- | --- |
| [cctv.m3u](cctv.m3u) | 央视网，20 个频道 | [Raw](https://raw.githubusercontent.com/TvWasm/cjs/main/cctv.m3u) |
| [cmg.m3u](cmg.m3u) | 央视频，30 个央视/CGTN/专题频道、33 个卫视频道 | [Raw](https://raw.githubusercontent.com/TvWasm/cjs/main/cmg.m3u) |
| [gxtv.m3u](gxtv.m3u) | 广西平台，5 个广西频道和 CETV-1/2/4 | [Raw](https://raw.githubusercontent.com/TvWasm/cjs/main/gxtv.m3u) |

这些配置用于支持 CJS protocol 4 的客户端。频道行保留 `webview://https://站点页面`
入口，客户端按站点自动调用 CJS 脚本及对应的原生库解析播放地址。
当前的 `cmg.cjs`、`cctv.cjs`、`gxtv.cjs` 是 JSON 版本描述文件，**不能直接作为
M3U 的视频地址**，也未实现 `cjs://` 播放地址语法。文件内的插件地址注释仅供说明，
实际插件目录在客户端中配置为 `https://raw.githubusercontent.com/TvWasm/cjs/main/catalog.json`。

央视网和央视频的清晰度在客户端选择高、中、低档，M3U 不重复列出清晰度线路。
实际可用档位受频道自身限制；广西平台当前只声明一档。
频道编号沿用应用内置列表及已提供的广西页面地址，未逐台重新验证直播可用性。

| Site directory | Native library | Quality tiers |
| --- | --- | --- |
| `sites/tv.cctv.com` | `cctv.so` | high / medium / low (HLS renditions) |
| `sites/yangshipin.cn` | `yangshipin.so` | high=fhd / medium=shd / low=hd |
| `sites/tv.gxtv.cn` | `gxtv.so` | high (the current API exposes one stream) |

Each directory owns source, build recipe, JS, version, signed manifest and ABI artifacts.
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
