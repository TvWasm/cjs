# NativeWasmTv CJS plugin protocol v1

The configured URL returns a UTF-8 JSON envelope:

```json
{"protocol":1,"payload":"base64(JSON bytes)","signature":"base64(RSA-SHA256(payload))"}
```

The signed payload contains `version`, `minHostProtocol`, `maxHostProtocol`, and `files`.
Each file entry has `name`, `abi` (`all`, `armeabi-v7a`, or `arm64-v8a`), `url`, and
`sha256`. Protocol v1 requires exactly one `runtime.json` and these three native modules
for the selected ABI: `libcctv_h5e.so`, `libcmg_decrypt.so`, `libysp_keygen.so`.

The host enforces file size and name limits, verifies the envelope signature and every
file hash, writes to a private staging directory, fsyncs each file, then atomically switches
the active version. A failed download leaves the previous version active. The host never
executes a partially downloaded plugin.

Hosts must isolate active state and storage by ABI. Before activation, native files must be
validated as ELF32/ARM for `armeabi-v7a` or ELF64/AArch64 for `arm64-v8a`. This keeps an app-data
preserving switch between 32-bit and 64-bit APKs from loading modules from the previous process
architecture.

`runtime.json` has a protocol number and a `scripts` object. Values are JavaScript or HTML
templates; `{{NAME}}` placeholders are replaced by JSON-quoted data supplied by the host.
The JavaScript owns remote API and page logic. JNI is a narrow bridge to the C modules.

Native modules run in the application process for low overhead. Signature verification and
separate distribution isolate release ownership and make rollback atomic, but do not create
a memory-safety sandbox. A future protocol may add an isolated Android service without
changing the manifest envelope.

Cold-start rule: the host may read one lightweight preference to detect an APK ABI switch, but
must not scan plugin directories, access the network, parse manifests, hash files, or load native
code. The plugin is opened only on first provider use or an explicit update.
