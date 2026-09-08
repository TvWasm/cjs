# 为 NativeWasmTv 开发插件

## 先选择需要的能力

只需请求接口、拼接 URL、生成 M3U8：继续编写 Ku9 JS。
入口是 `main(item)`，使用 `ku9.*`；无须另创纯 JS 协议，也无须构建 SO。
现有客户端的远程 Ku9 路径识别要求包含 `/k-web/ku9/js/`，例如：

```text
https://your-host.example.test/k-web/ku9/js/channel.js?id=cctv1
```

需要 WASM 转 C、原生解密或按站点管理原生模块：使用 CJS 网站包。
CJS 在相同 Ku9 JS 接口上增加这些能力。插件安装只支持在线 HTTP(S)，不支持 `file://`、
`content://` 或上传本地 CJS 包。完整 [JS 接口](javascript-api.md) 是开发时的接口依据。

## 网站目录

```text
sites/tv.example.test/
  site.json
  main.js                    # main(item)，新插件声明 jsApi: ku9
  scripts/                   # 可选模板/辅助资源；不会自动 require
  native/Android.mk          # 此网站自己的 C/WASM 转 C 源码与构建规则
  dist/runtime.json          # 构建生成，含脚本正文
  dist/armeabi-v7a/example.so
  dist/arm64-v8a/example.so
  version.cjs                # 构建生成：小版本探针
  plugin.json                # 构建生成：文件与 SHA-256
example.cjs                  # 构建生成：在线频道别名，内容是 JSON 描述符
example.m3u                  # 作者提供的频道表
catalog.json                 # 构建生成：所有网站的目录
```

`.cjs` 频道地址是 `https://.../example.cjs?id=频道参数`。
描述符本身是 JSON，不是在文件末尾拼 JS；实际脚本存放在网站包的 `runtime.json` 中。

参考配置（示例域名不可播放）：

```json
{
  "id": "tv.example.test",
  "module": "example",
  "alias": "example",
  "version": 1,
  "hosts": ["tv.example.test"],
  "engine": "hls",
  "qualities": {"high": "high"},
  "entry": "main.js",
  "jsApi": "ku9",
  "playback": {
    "page": "https://tv.example.test/live/{id}",
    "parameters": {"id": "[a-zA-Z0-9_-]{1,64}"}
  }
}
```

| 字段 | 填写规则 |
| --- | --- |
| `id` | 网站标识，与 `sites` 下目录名完全一致 |
| `module` | 不带 `.so` 后缀的独立原生模块名，发布两种架构 |
| `alias` | 根目录 `.cjs` 文件名，不带后缀；仓库内唯一 |
| `version` | 正整数；脚本、运行配置或 SO 内容改变就递增 |
| `hosts` | 展开后网页所属的域名；不含协议和路径 |
| `engine` | 宿主已有播放引擎，如 `hls`；不能任意新增字符串来增加宿主能力 |
| `qualities` | 必须有 `high`，最多增加 `medium`、`low`；值是供应方参数 |
| `entry` | `runtime.scripts` 中的入口键；常用 `main.js` |
| `jsApi` | 新脚本填 `ku9`；老站点的迁移规则见 JS 接口文档 |
| `playback.page` | 用于匹配网站和提供 `item.pageUrl` 的网页模板 |
| `playback.parameters` | 必填查询参数及全匹配正则；替换模板前先校验并 URL 编码 |

`scripts/` 会打进运行配置，但不会自动注入入口或提供 Node 模块系统。
频道 URL 最长 8192 字符，最多 32 个参数，单值解码后最多 2048 字符；参数名以字母开头，
其后仅字母、数字或下划线，最长 64 字符。重复参数、用户凭据、fragment 被拒绝。
`quality` 是保留的可选参数，使用 `high|medium|low`。

## 原生接入边界

参考 `sites/tv.cctv.com/native`、`sites/yangshipin.cn/native`、`sites/tv.gxtv.cn/native`。
各自输出 `cctv.so`、`yangshipin.so`、`gxtv.so`；不要合并为一个网站通用库。
目前协议 4 网站包发布脚本和两个 ABI 的库，客户端只下载自身 ABI。

文件安装和网站隔离是通用能力；**原生函数/媒体变换 ABI 仍需要宿主适配器**。
新算法不能只上传任意 SO 就执行。新增适配器后，脚本和该网站的 C 实现可独立在线更新；
改变 JNI 签名或新增宿主方法仍需更新 APK。若只需要 JS，直接用 Ku9 入口，避免空库占位。
SO 运行在应用进程中，目录隔离不等于操作系统沙箱，原生代码错误仍可造成应用崩溃。

## 构建与发布

工具使用 Python 3.9+ 标准库。现有原生工程使用 NDK r14b，按网站构建：

```powershell
./tools/build-native.ps1 -NdkRoot C:\android-ndk-r14b -Site tv.gxtv.cn
python tools/build_plugin.py --site tv.gxtv.cn
python tools/verify_plugin.py
python tools/test_plugin_tools.py
```

第三方仓库使用自己的托管根地址，无需修改工具源码：

```powershell
python tools/build_plugin.py --base-url https://your-host.example.test/cjs
python tools/verify_plugin.py --base-url https://your-host.example.test/cjs
# 仓库在其他目录时，两条命令均可添加 --root D:\my-cjs
```

`--base-url` 必须对应仓库根目录，且不带 query/fragment；也可填写自己的 GitHub Raw 根地址。
改托管地址后，手写的 `.m3u` 链接也要同步修改。校验工具会检查现有同名 M3U 的频道链接，
但不要求第三方一定提供 M3U。

发布顺序：

1. 修改该网站源码，递增 `site.json.version`，生成 SO、runtime、manifest 和探针。
2. 运行校验，检查脚本、两个 ABI 的完整性、站点和版本一致性。
3. 先上传 `dist` 文件，再上传站点 `plugin.json`，最后更新 `version.cjs`、根 `.cjs` 和目录。
   使用 Git 仓库可同一次提交发布；自建静态服务器应遵循以上顺序，避免客户端看到未传完的版本。
4. 客户端配置你的在线 `catalog.json`，导入对应频道表。仅分享一个未注册的 `.cjs` URL 不会自动安装站点。

脚本或 SO 内容改变但没有提高版本号时，构建工具会拒绝生成清单。
不要手工修改 `dist/runtime.json` 或用相同版本号覆盖已发布内容。
仅修改频道别名/参数路由时可用 `--catalog-only`；该选项不会重建站点运行文件。
改变原生模块名时应使用新的站点标识或安排客户端迁移，不要在已有站点中直接重命名已加载的库。

## 验证与性能

先验证入口参数、缺失参数报错、返回结果、各档清晰度，再验证断网与缓存、版本更新和 ABI 切换。
低版本上检查实际播放画面与音频，单纯下载成功不能代表解密或解码正确。

应用包含 `QuickJsInstrumentation`：Android 4.0.4 的 ARM32 转译环境和 Android 7.1.1 ARM64
可运行 Ku9/CJS 接口、缓存 TTL、动态列表及 QuickJS 生命周期回归。HTTP 接口参数测试使用模拟响应，
不表示任意第三方站点已实测可播。

已缓存插件不会在冷启动全量哈希，也不会等待在线更新。首次关联频道按需加载，
首帧之后探测小版本文件；进程内已经使用的插件更新留待下次进程启动生效。
所以保持更新元数据小、原生解密批量处理、JS 结果缓存合理，比每帧增加检查更有意义。
