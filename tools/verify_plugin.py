import base64
import hashlib
import json
from pathlib import Path
from urllib.parse import urlsplit

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding

ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    envelope = json.loads((ROOT / "plugin.json").read_text("utf-8"))
    payload = base64.b64decode(envelope["payload"])
    public_key = serialization.load_der_public_key((ROOT / "keys" / "cjs-plugin-public.der").read_bytes())
    public_key.verify(base64.b64decode(envelope["signature"]), payload, padding.PKCS1v15(), hashes.SHA256())
    manifest = json.loads(payload)
    for item in manifest["files"]:
        relative = urlsplit(item["url"]).path.split("/main/", 1)[1]
        actual = hashlib.sha256((ROOT / relative).read_bytes()).hexdigest()
        if actual != item["sha256"]:
            raise SystemExit(f"hash mismatch: {relative}")
    print(f"verified {manifest['version']}: {len(manifest['files'])} files")


if __name__ == "__main__":
    main()
