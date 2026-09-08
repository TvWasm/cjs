# cjs

Online C/JS plugins for NativeWasmTv, isolated by website. Protocol 4 has no shared
provider script bundle or common decryption library.

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
