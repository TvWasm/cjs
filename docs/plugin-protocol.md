# NativeWasmTv CJS online plugin protocol v2

The configured URL returns a UTF-8 JSON envelope:

```json
{"protocol":2,"payload":"base64(JSON bytes)","signature":"base64(RSA-SHA256(payload))"}
```

The signed payload contains `version`, `minHostProtocol`, `maxHostProtocol`, and `files`.
Each file entry has `name`, `abi` (`all`, `armeabi-v7a`, or `arm64-v8a`), `url`, and
`sha256`. Protocol v2 requires exactly one `runtime.json` and these four native modules
for the selected ABI: `libcctv_h5e.so`, `libcmg_decrypt.so`, `libysp_keygen.so`, and
`libcjs_site.so`.

The host enforces file size and name limits, verifies the envelope signature and every
file hash, writes to a private staging directory, fsyncs each file, then atomically switches
the active version. A failed download leaves the previous version active. The host never
executes a partially downloaded plugin.

Hosts must isolate active state and storage by ABI. Before activation, native files must be
validated as ELF32/ARM for `armeabi-v7a` or ELF64/AArch64 for `arm64-v8a`. This keeps an app-data
preserving switch between 32-bit and 64-bit APKs from loading modules from the previous process
architecture.

`runtime.json` has a protocol number, a `scripts` object, and a `sites` array. Values are
JavaScript or HTML templates; `{{NAME}}` placeholders are replaced by JSON-quoted data
supplied by the host. Each site declaration contains its trusted hosts, JS entry, native
module, and transformer name. Channel content cannot select an arbitrary script or `.so`.
The JavaScript owns remote API and page logic. JNI is a narrow bridge to the C modules.

## Online-only site plug-ins

Site source is grouped by domain:

```text
sites/<domain>/
  main.js
  native/*.c
  README.md
```

The host accepts only `http://` and `https://` manifest/file URLs. There is no local
manifest, local script upload, external-storage scan, `file://`, or `content://` path.
Site scripts may request only HTTP(S) resources through the host bridge.

An entry defines `main(item)`, where `item.url` is the original online page and
`item.name` is the channel name. The host exposes the Ku9-style methods `cjs.get`,
`cjs.post`, `cjs.request`, `cjs.md5`, and `cjs.log`. A result may contain `url`,
`referer`, `transformer`, `transformerArgs`, and `mediaHosts`. The host accepts a
transformer only when it matches the signed site declaration. The common native site
module dispatches that opaque transformer name, so the shell contains no site-specific
decryption code.

Native modules run in the application process for low overhead. Signature verification and
separate distribution isolate release ownership and make rollback atomic, but do not create
a memory-safety sandbox. A future protocol may add an isolated Android service without
changing the manifest envelope.

Cold-start rule: the host may read one lightweight preference to detect an APK ABI switch, but
must not scan plugin directories, access the network, parse manifests, hash files, or load native
code. The plugin is opened only on first provider use or an explicit update.
