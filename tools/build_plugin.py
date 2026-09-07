import base64
import hashlib
import json
from pathlib import Path

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding

ROOT = Path(__file__).resolve().parents[1]
VERSION = "1.0.0"
BASE = "https://raw.githubusercontent.com/TvWasm/cjs/main"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    scripts = {}
    for path in sorted((ROOT / "scripts").iterdir()):
        if path.is_file():
            scripts[path.name] = path.read_text("utf-8").strip()
    runtime = {"protocol": 1, "scripts": scripts}
    runtime_path = ROOT / "dist" / "runtime.json"
    runtime_path.parent.mkdir(parents=True, exist_ok=True)
    runtime_path.write_text(json.dumps(runtime, ensure_ascii=False, separators=(",", ":")) + "\n", "utf-8")
    files = [{"name": "runtime.json", "abi": "all", "url": f"{BASE}/dist/runtime.json", "sha256": sha256(runtime_path)}]
    for abi in ("armeabi-v7a", "arm64-v8a"):
        for name in ("libcctv_h5e.so", "libcmg_decrypt.so", "libysp_keygen.so"):
            path = ROOT / "dist" / abi / name
            files.append({"name": name, "abi": abi, "url": f"{BASE}/dist/{abi}/{name}", "sha256": sha256(path)})
    payload = json.dumps({"id": "tvwasm.cjs", "version": VERSION, "minHostProtocol": 1,
                          "maxHostProtocol": 1, "files": files}, ensure_ascii=False,
                         separators=(",", ":")).encode("utf-8")
    private_key = serialization.load_pem_private_key((ROOT / ".signing" / "cjs-plugin-private.pem").read_bytes(), password=None)
    signature = private_key.sign(payload, padding.PKCS1v15(), hashes.SHA256())
    envelope = {"protocol": 1, "payload": base64.b64encode(payload).decode("ascii"),
                "signature": base64.b64encode(signature).decode("ascii")}
    (ROOT / "plugin.json").write_text(json.dumps(envelope, separators=(",", ":")) + "\n", "utf-8")


if __name__ == "__main__":
    main()
