# CJS protocol 4 — website modules

## Layout

```
catalog.json                   # signed registry; plugin.json is the same registry
cmg.cjs / cctv.cjs / gxtv.cjs   # aliases for per-site version.cjs
sites/<domain>/
  site.json                    # build settings, integer version, quality mapping
  main.js and/or scripts/      # only this site's JavaScript/templates
  native/Android.mk            # only this site's compilation and C sources
  version.cjs                  # tiny online version probe
  plugin.json                  # signed site artifact manifest
  dist/runtime.json           # site's script bundle and capabilities
  dist/armeabi-v7a/<module>.so
  dist/arm64-v8a/<module>.so
```

The registry lists `id`, allowed `hosts`, `module`, `engine`, `qualities`, and online
`config` URL for each website. Registry and manifests use this envelope:

```json
{"protocol":4,"payload":"base64(UTF-8 JSON)","signature":"base64(RSA-SHA256(payload))"}
```

`version.cjs` has `v` (positive integer), `id` (website domain), and `manifest` (online
site manifest URL). A signed site manifest contains `id`, `version`, `files`. Exactly one
`runtime.json` (`abi: all`) and one `<module>.so` per supported ABI are distributed.
Each artifact includes `name`, `abi`, HTTP(S) `url`, SHA-256 `sha256`. Runtime `id`, version,
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
process ABI**. Data is staged and verified before directory rename and preference switch.
A site becomes pinned as soon as its scripts or native library are used; a newer version
waits for a new process. Other sites remain usable and may update independently. Pending
versions are validated before activation; a damaged pending download keeps the old active
version. Network requests never hold the runtime monitor used by UI and playback.

Protocol 3 caches are left alone and never loaded by protocol 4. Only the first requested
site is downloaded to the new namespace. Changing between 32/64-bit APKs selects independent
site caches. Updating site A does not download, load or change B/C.

## Resolution contract (at most three tiers)

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

The host supplies `cjs.get/post/request/md5/log`. Each resolver executes only its site's
script. Gxtv returns its declared transformer, arguments and allowed media hosts; its own
JNI bridge invokes `gxtv.so`. CCTV's H5E JNI invokes `cctv.so`; both Yangshipin signing and
CMG JNI entry points live in `yangshipin.so`. JNI declarations are host ABI adapters, not
provider logic. New native interfaces require a matching host adapter/protocol extension;
there is no universal provider SO or arbitrary JNI symbol rebinding.

Native code executes in the application process. Website storage/release isolation and
signature checks are not an OS process sandbox.
