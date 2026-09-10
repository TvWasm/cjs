# CJS protocol 5 — website modules

CJS extends the Ku9 JS contract with site-scoped native modules and lifecycle management.
See the Chinese [developer guide](developer-guide.md) and [JS API](javascript-api.md) first.
Pure JS plugins keep the existing Ku9 interface; no separate pure-JS protocol is introduced.

## Layout

```
catalog.json                   # plain JSON registry; plugin.json is the same registry
cmg.cjs / cctv.cjs / gxtv.cjs   # aliases for per-site version.cjs
sites/<domain>/
  site.json                    # build settings, integer version, quality mapping
  main.js and/or scripts/      # only this site's JavaScript/templates
  native/Android.mk            # only this site's compilation and C sources
  version.cjs                  # tiny online version probe
  plugin.json                  # site artifact manifest
  dist/runtime.json           # site's script bundle and capabilities
  dist/armeabi-v7a/<module>.so   # API 14+, r17c Clang
  dist/armv7-perf/<module>.so   # API 19+, r25c Clang
  dist/arm64-v8a/<module>.so       # API 21+, r30 Clang
```

The registry lists `id`, allowed `hosts`, `module`, `engine`, `qualities`, and online
`config` URL for each website. Registry and manifests are compact plain JSON:

```json
{"protocol":5,"sites":[...]}
{"protocol":5,"id":"tv.gxtv.cn","version":1,"files":[...]}
```

There is no Base64 envelope or digital signature. File downloads retain SHA-256 integrity
checks plus protocol/site/path/ELF compatibility checks. Whole-file hashes are checked at
installation, not on every cold start. Build and verification tools need only Python's
standard library. Protocol 5 requires an updated host and a new cache namespace.
Protocol 4 caches and Base64 envelopes are not loaded. See [native profiles](native-profiles-v5.md).

`version.cjs` has `v` (positive integer), `id` (website domain), and `manifest` (online
site manifest URL). A site manifest contains `id`, `version`, `files`. Exactly one
`runtime.json` (`abi: all`) and one `<module>.so` per native profile are distributed.
Each artifact includes `name`, `abi`, HTTP(S) `url`, SHA-256 `sha256`.
Native entries additionally declare `profile`, `minSdk`, and build provenance `ndk`.
The runtime entry has `abi: all` and no profile. The host downloads only runtime + its
selected native profile, checks the exact profile/API/ABI combination, and writes `profile.txt`. Runtime `id`, version,
protocol and the ELF class/machine must match before activation. Local file/content URLs
and local script uploads are not plugin installation entry points.

## Lifetime and isolation

Cold initialization only stores Context and detects APK ABI changes. First related channel
loads the cached registry and its own runtime. Missing sites are downloaded individually.
First rendered frame schedules a tiny version probe; cached playback does not wait for it.
Each successful probe runs once per site per process. Failure leaves installed content in
use and permits retry on a subsequent visit. Explicit update checks only installed sites;
the settings page can independently download/update any configured site.

State, files, pending updates, and in-memory script/native handles are keyed by **site +
native profile**. Data is staged and verified before directory rename and preference switch.
A site becomes pinned as soon as its scripts or native library are used; a newer version
waits for a new process. Other sites remain usable and may update independently. Pending
versions are validated before activation; a damaged pending download keeps the old active
version. Network requests never hold the runtime monitor used by UI and playback.

Protocol 4 caches are left alone and never loaded by protocol 5. Only the first requested
site is downloaded to the new namespace. Changing between 32/64-bit APKs selects independent
site caches. Updating site A does not download, load or change B/C.

## Resolution contract (at most three tiers)

### Online channel URL

M3U channel addresses can directly use `https://.../gxtv.cjs?id=<channel-id>`;
no `webview://` prefix is needed. `cctv.cjs?id=cctv1` selects CCTV and
`cmg.cjs?id=600001859` selects Yangshipin. Requires a host with `.cjs` source support,
which is an additive extension to protocol 4, not available in earlier v4 hosts.

Each catalog site registers `sources` (online descriptor aliases) and `playback`
(`page` URL template plus required `parameters` regex rules), owned by its `site.json`.
The host strips the channel query before matching an exact registered descriptor URL;
the site's canonical `config` URL is also accepted. Local paths, unregistered descriptors,
missing/invalid required parameters, duplicate keys, fragments and URL credentials are rejected.
Only configured GitHub accelerator prefixes are unwrapped for descriptor matching.

Example Gxtv routing: `page: https://tv.gxtv.cn/channel/channelivePlay_{id}.html`,
`parameters: {"id":"[a-fA-F0-9]{32}"}`. Expansion validates and URL-encodes parameters,
and the expanded page must belong to this site's declared hosts. The page is an internal
resolver input, not a browser navigation. Existing site scripts and SO releases remain usable.

Site JS receives `item.source` (original channel URL), `item.params` (decoded query map),
`item.pageUrl` (expanded resolver input), and `item.quality` (mapped selected quality).
With `jsApi: "ku9"`, `item.url` is the original channel URL, matching Ku9's parameter semantics.
Omitted `jsApi` or `cjs-v4` preserves the old expanded-page `item.url`; existing releases are unchanged.
Optional `quality=high|medium|low` overrides just this playback; omission uses client settings.
Yangshipin's existing async adapter consumes the expanded PID and the same quality selection.
Other parameters do not change playback unless the corresponding site script consumes them.

An existing cached catalog without this routing is refreshed once when a `.cjs` channel is
first encountered; unknown descriptors fail with a configuration error. After routing and
site installation are cached, channel switching performs no extra descriptor fetch. Existing
first-frame version checks still apply. URL-result cache keys include the original source
and its parameters, so distinct parameter sets cannot share the wrong result.

Use `python tools/build_plugin.py --catalog-only` for alias/routing changes. This republishes
the plain JSON registry without changing immutable site runtime/SO releases or their versions.

`qualities` maps the stable keys `high`, `medium`, `low` to provider values. It must have
one to three entries and always include `high`. The UI displays only advertised keys and
stores the user's preferred key. `main(item)` receives `item.url`, `item.name`, and
`item.quality` (mapped provider value). Unavailable preference falls back to `high`.

Yangshipin: `{"high":"fhd","medium":"shd","low":"hd"}`. Channel-specific maximum
caps the selected provider value. Its existing async resolver uses the same mapping.
CCTV: `{"high":"high","medium":"medium","low":"low"}`. The site JS returns the HLS
master; the proxy picks the highest, middle, or lowest advertised available rendition.
No fake 720/1080/4K URL is constructed. Gxtv currently has only `high`.

Site JS may also return up to three `streams` entries with `quality` and online `url`;
the host selects the requested tier and falls back to the first available one. Alternatively
return a single `url`, optional `referer`, and site transform metadata.

## Execution interfaces

The host supplies Ku9 `get/post/request/getQuery/getCache/setCache/md5/log`; `cjs` is an alias
for `ku9`. Both engines share the JS bootstrap and result parser. CJS caches are site-scoped,
and `setCache` TTL uses milliseconds. URL strings, `url/playUrl/playurl/urls[0]`, and inline
M3U8 strings or `m3u8/content` objects are supported. Generated live playlists use the
existing Ku9 loopback server and a 2–5 second refresh cadence, cancelled on channel switch.
These additions and `jsApi: ku9` require the updated host; protocol 4 alone is not a JS capability marker.
Each resolver executes only its site's script. New hosts execute CCTV/Gxtv `main(item)` in bundled QuickJS on a worker thread,
with no browser DOM. JSON parameters and these HTTP helpers retain the same contract;
Promise jobs are supported, browser timers are not. Yangshipin's existing browser
authorization adapter remains separate. This host-engine change requires no site SO or
script version bump. Gxtv returns its declared transformer, arguments and allowed media hosts; its own
JNI bridge invokes `gxtv.so`. CCTV's H5E JNI invokes `cctv.so`; both Yangshipin signing and
CMG JNI entry points live in `yangshipin.so`. JNI declarations are host ABI adapters, not
provider logic. New native interfaces require a matching host adapter/protocol extension;
there is no universal provider SO or arbitrary JNI symbol rebinding.

Native code executes in the application process. Website storage/release isolation and
file integrity checks are not an OS process sandbox.
