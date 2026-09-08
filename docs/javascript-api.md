# JS 接口：Ku9 基础 + CJS 扩展

## 入口与兼容范围

CJS 的 JS 层使用 Ku9 的 `main(item)`、`ku9.*` 和返回格式。
`cjs` 是同一个接口对象的别名，`cjs === ku9`；新脚本推荐写 `ku9.*`，方便复用。
纯 JS 继续走现有在线 Ku9 脚本入口，不需要制作一个 CJS 包或空 SO。

这里的兼容基线是 NativeWasmTv 已实现的 Ku9 接口，列于下表。
不承诺其他播放器的私有扩展。QuickJS 不提供 Node.js 的 `require`、`fs`、浏览器 DOM、
`fetch` 或定时器；网络使用 `ku9.get/post/request`。第三方脚本需要的 JS 依赖应随脚本打包。

新 CJS 站点在 `site.json` 声明：

```json
{"entry":"main.js","jsApi":"ku9"}
```

| `item` 字段 | 意义 |
| --- | --- |
| `url` | 带查询参数的原始频道地址，可直接使用 `ku9.getQuery(item.url, 'id')` |
| `name` | 频道名称 |
| `source` | CJS 扩展：原始频道地址，与新模式下的 `url` 一致 |
| `pageUrl` | CJS 扩展：目录中 `playback.page` 展开后的网页地址 |
| `params` | CJS 扩展：已解码的频道查询参数对象 |
| `quality` | CJS 扩展：当前清晰度经 `qualities` 映射后的站点值 |

**旧插件兼容：** 未声明 `jsApi`，或声明 `cjs-v4` 时，`item.url` 仍是展开后的网页地址。
旧站点脚本继续工作；也能调用新增的 `ku9.*`。改成 `jsApi: "ku9"` 时，把原来读取网页地址
的代码改用 `item.pageUrl`，再递增站点版本。不要只改声明而不检查脚本。

`jsApi: "ku9"`、缓存接口和以下完整返回格式要求包含本次兼容改造的客户端，
仅有 protocol 4 的老客户端不一定具备这些能力。三个现有站点 v1 无需为此更新文件。

## Ku9 基础接口

| 调用 | 返回值与约定 |
| --- | --- |
| `ku9.get(url, headers?)` | UTF-8 响应正文；请求失败返回空字符串 |
| `ku9.post(url, body, headers?)` | 响应正文；`body` 是字符串，JSON 需自己 `JSON.stringify` |
| `ku9.request(url, method?, headers?, body?, followRedirects?)` | 响应对象；默认 GET、跟随重定向，传 `false` 可关闭重定向 |
| `ku9.getQuery(url, name)` | 第一个同名参数的解码字符串；缺失返回 `''`；值中的 `+` 按空格处理 |
| `ku9.getCache(key)` | 缓存字符串；缺失或过期返回 `''` |
| `ku9.setCache(key, value, ttlMs?)` | 缓存字符串；TTL 单位为**毫秒**，省略或 `<= 0` 不自动过期 |
| `ku9.md5(text)` | UTF-8 文本的 MD5，32 位小写十六进制 |
| `ku9.log(value)` | 输出客户端调试日志 |

`headers` 可传对象或 JSON 字符串。`request` 返回：

```js
{code: 200, body: "响应正文", url: "最终地址", headers: {"Content-Type": "..."}}
// 网络失败：
{code: 0, body: "", error: "错误原因"}
```

HTTP 帮助方法在解析工作线程同步执行。CJS 的网络请求只接受 HTTP(S)，单次响应上限 8 MiB。
`get`、`post` 不会自动把正文解析为 JSON，请根据接口使用 `JSON.parse`。
缓存按 CJS **站点 ID** 隔离，同名 key 不会覆盖其他站点；缓存可跨频道、解析器和应用进程使用，
更新脚本后仍保留。需要变更缓存结构时，由脚本更换 key，例如 `token-v2`。
这与返回结果中的 `ttlSec` 单位和用途不同。

## Ku9 返回格式

以下形式等价。媒体支持 HTTP(S) 地址，也可返回播放器支持的 RTSP/RTMP 在线流；
后者直接交给播放器，不走 HLS 代理。插件安装和 JS HTTP 请求仍限 HTTP(S)：

```js
return "https://cdn.example.test/live.m3u8";
return {url: "https://cdn.example.test/live.m3u8"};
return {playUrl: "https://cdn.example.test/live.m3u8"};
return {playurl: "https://cdn.example.test/live.m3u8"};
return {urls: ["https://cdn.example.test/live.m3u8"]};
```

字段优先顺序为 `url` → `playUrl` → `playurl` → `urls[0]`。`urls` 不表示自动逐个失败重试。
`main` 也可以返回 Promise；Promise 的完成值按相同规则处理。

支持返回 M3U8 文本，或者 `{m3u8: text}` / `{content: text}`：

```js
return "#EXTM3U\n#EXT-X-TARGETDURATION:6\n#EXTINF:6,\nhttps://cdn.example.test/1.ts\n";
```

宿主通过内部回环 HTTP 服务把文本提供给播放器。直播列表按目标时长的一半刷新，
间隔限制为 2–5 秒，每次重新执行 `main(item)`；不要依赖 JS 全局变量跨次保留，使用 `ku9` 缓存。
刷新失败保留上一份列表，5 秒后重试；切换频道、取消或销毁解析器时停止刷新并关闭服务。
包含 `#EXT-X-ENDLIST` 的 CJS 点播列表不周期刷新。分片及密钥 URI 请使用完整在线地址，
相对路径无法以远程站点为基址解析。内部回环服务不等于支持本地插件安装。

同时返回有效 M3U8 和 URL 时优先使用 M3U8。

## CJS 的附加字段

这些字段追加在 Ku9 结果对象中，普通 Ku9 脚本无需使用：

```js
return {
  url: "https://cdn.example.test/live.m3u8",
  referer: item.pageUrl,
  ttlSec: 60,
  streams: [
    {quality: "high", url: "https://cdn.example.test/high.m3u8"},
    {quality: "medium", url: "https://cdn.example.test/medium.m3u8"},
    {quality: "low", url: "https://cdn.example.test/low.m3u8"}
  ]
};
```

- `referer`：媒体请求来源页，缺省使用展开后的网页地址。
- `streams`：可选，一至三档，`high/medium/low` 不得重复；匹配客户端所选档位，否则使用第一档。
  存在时优先于单个 `url`，不要返回不存在的虚构清晰度。
- `ttlSec`：解析出的 URL 结果缓存秒数，0–600，默认不缓存；包含站点脚本摘要、频道参数和清晰度的
  缓存键防止混用结果。命中不会延长原过期时间，动态 M3U8 不使用这项缓存。

原生媒体处理使用现有扩展字段 `transformer`、`transformerArgs`、`mediaHosts`。
它们是**宿主已适配的原生接口**，不是任意函数调用。广西当前使用 `gxtv-xhls-v2` + `gxtv.so`，
仅允许声明的媒体主机进行分片处理。没有变换需求就省略这些字段。

目前没有通用 `cjs.native()` 或动态 JNI 符号接口。新增原生算法/媒体变换，需要在客户端增加
对应适配器，然后由该网站自己的 SO 实现。不要把任意第三方 SO 改名成现有模块来使用。

## 性能与排错

CJS 的 `main` 在后台 QuickJS 中执行，不为解析启动 WebView；每次执行有 16 MiB JS 堆、
256 KiB JS 栈和约 20 秒执行期限。期限由 JS 中断点及宿主调用边界检查，阻塞 HTTP 还受网络超时约束，
并非强制杀线程的硬时限。Promise 微任务可执行，浏览器事件循环不在这个接口内。
央视频已有的浏览器授权适配器仍单独运行。

大块数据解密留给站点 C 库，JS 负责接口、参数和流程。避免把分片反复转成 JSON/Base64。
使用 `adb logcat -s CjsSiteResolver` 查看脚本日志、HTTP 耗时和 QuickJS 总耗时。
语法错误、无 `main`、抛出异常、无有效播放结果会报告解析失败；频道切换后丢弃旧请求结果。

安装时校验文件完整性；冷启动只加载使用的站点，不重新哈希整库，也不等待在线版本探测。
