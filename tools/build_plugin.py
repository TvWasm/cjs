import base64
import hashlib
import json
from pathlib import Path

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding

ROOT = Path(__file__).resolve().parents[1]
VERSION = "2.1.0"
PROTOCOL = 2
BASE = "https://raw.githubusercontent.com/TvWasm/cjs/main"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def artifact(name: str, abi: str, path: Path, url: str) -> dict:
    digest = sha256(path)
    return {"name": name, "abi": abi, "url": f"{url}?sha={digest[:16]}",
            "sha256": digest}


def main() -> None:
    scripts = {}
    for path in sorted((ROOT / "scripts").iterdir()):
        if path.is_file():
            scripts[path.name] = path.read_text("utf-8").strip()
    for site_dir in sorted((ROOT / "sites").iterdir()):
        entry = site_dir / "main.js"
        if entry.is_file():
            scripts[f"sites/{site_dir.name}/main.js"] = entry.read_text("utf-8").strip()
    runtime = {
        "protocol": PROTOCOL,
        "scripts": scripts,
        "sites": [{
            "id": "tv.gxtv.cn",
            "hosts": ["tv.gxtv.cn"],
            "entry": "sites/tv.gxtv.cn/main.js",
            "nativeModule": "libcjs_site.so",
            "transformer": "gxtv-xhls-v2"
        }]
    }
    runtime_path = ROOT / "dist" / "runtime.json"
    runtime_path.parent.mkdir(parents=True, exist_ok=True)
    runtime_path.write_bytes((json.dumps(runtime, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8"))
    files = [artifact("runtime.json", "all", runtime_path,
                      f"{BASE}/dist/runtime.json")]
    for abi in ("armeabi-v7a", "arm64-v8a"):
        for name in ("libcctv_h5e.so", "libcmg_decrypt.so", "libysp_keygen.so",
                     "libcjs_site.so"):
            path = ROOT / "dist" / abi / name
            files.append(artifact(name, abi, path, f"{BASE}/dist/{abi}/{name}"))
    payload = json.dumps({"id": "tvwasm.cjs", "version": VERSION,
                          "minHostProtocol": PROTOCOL,
                          "maxHostProtocol": PROTOCOL, "files": files}, ensure_ascii=False,
                         separators=(",", ":")).encode("utf-8")
    private_key = serialization.load_pem_private_key((ROOT / ".signing" / "cjs-plugin-private.pem").read_bytes(), password=None)
    signature = private_key.sign(payload, padding.PKCS1v15(), hashes.SHA256())
    envelope = {"protocol": PROTOCOL, "payload": base64.b64encode(payload).decode("ascii"),
                "signature": base64.b64encode(signature).decode("ascii")}
    (ROOT / "plugin.json").write_bytes((json.dumps(envelope, separators=(",", ":")) + "\n").encode("utf-8"))


if __name__ == "__main__":
    main()
