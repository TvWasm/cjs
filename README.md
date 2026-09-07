# cjs

`cjs` publishes the optional C and JavaScript compatibility plugin used by NativeWasmTv.
The C modules are wasm2c builds for fast decryption/signing on old Android devices. The
JavaScript bundle owns provider requests, page hooks and interface logic.

The app and plugin communicate through the signed protocol in
[`docs/plugin-protocol.md`](docs/plugin-protocol.md). NativeWasmTv does not package these
provider modules and never contacts the plugin URL during application cold start.

Build native libraries with Android NDK r14b, then generate the signed release manifest:

```powershell
./tools/build-native.ps1 -NdkRoot C:\android-ndk-r14b
python ./tools/build_plugin.py
python ./tools/verify_plugin.py
```
