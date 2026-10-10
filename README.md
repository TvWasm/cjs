# CJS

NativeWasmTv 的站点插件，兼容 Ku9 JS，并提供按站点独立的 C 原生处理、清晰度选择和在线更新。

> 本项目仅供个人学习、技术研究与交流，请勿用于商业用途或任何违法、侵权活动。

## 使用

项目目前处于测试阶段。在 NativeWasmTv 中，将以下链接添加到「频道列表」网络来源：

央视及卫视频道（央视频来源优先）：

```text
https://raw.githubusercontent.com/TvWasm/cjs/main/cmg.m3u
```

广西电视：

```text
https://raw.githubusercontent.com/TvWasm/cjs/main/gxtv.m3u
```

应用已内置本仓库的站点索引地址，正常使用只需导入频道表，无需另外添加插件目录。
`catalog.json` 仍用于识别频道所属站点及安装入口；脚本、原生库、版本和缓存按站点独立管理。

频道可用性及清晰度以源站实际提供为准。

### Ku9 频道表

凤凰秀（中文台、资讯台、香港台）：

```text
https://raw.githubusercontent.com/TvWasm/cjs/main/k-web/fenghuang.txt
```

[脚本参数及验证说明](docs/fenghuang-ku9.md)。

河南党员教育服务网（远程党员教育及六个河南电视频道）：

```text
https://raw.githubusercontent.com/TvWasm/cjs/main/k-web/hndyjyfw.txt
```

[脚本参数及验证说明](docs/hndyjyfw-ku9.md)。

## 开发

`dev` 分支的[央视网优化版测试方法](docs/cctv-dev.md)：
使用支持直接读取 CJS 来源配置的测试包，导入本分支的 `cctv.m3u` 或 `cctv.txt`，
应用内目录地址保持原样。

[开发入门](docs/developer-guide.md) · [JS 接口](docs/javascript-api.md) · [安装与更新协议](docs/plugin-protocol.md) · [原生构建配置](docs/native-profiles-v5.md)

## 免责声明

- 本项目不提供或托管音视频内容，相关内容、商标及版权归各自权利人所有，与相关平台无隶属或授权关系。
- 请遵守适用法律法规及源站服务条款，仅在获得必要授权的范围内学习和测试；学习用途不代表获得内容使用授权。
- 项目按现状提供，不保证可用性、准确性或持续维护。使用者应自行评估风险，并依法承担自身使用行为产生的责任。
- 如涉及侵权，请通过仓库 Issues 提供相关说明，维护者将核实处理。本声明不排除依法不能免除的责任。
