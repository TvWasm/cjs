"""Build signed site releases; adding a site requires only sites/<domain>/site.json."""
import argparse, base64, hashlib, json
from pathlib import Path
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
ROOT = Path(__file__).resolve().parents[1]
BASE = "https://raw.githubusercontent.com/TvWasm/cjs/main"
PROTOCOL = 4

def compact(value):
    return (json.dumps(value, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8")
def artifact(path, name, abi):
    digest=hashlib.sha256(path.read_bytes()).hexdigest()
    url=f"{BASE}/{path.relative_to(ROOT).as_posix()}?sha={digest[:16]}"
    return dict(name=name, abi=abi, url=url, sha256=digest)
def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--site", help="Build only this website; catalog still lists all sites")
    args=parser.parse_args()
    key=serialization.load_pem_private_key((ROOT/".signing/cjs-plugin-private.pem").read_bytes(), password=None)
    def signed(payload):
        data=compact(payload)
        return compact(dict(protocol=PROTOCOL,payload=base64.b64encode(data).decode(),
            signature=base64.b64encode(key.sign(data,padding.PKCS1v15(),hashes.SHA256())).decode()))
    catalog=[]
    directories=sorted((ROOT/"sites").glob("*/site.json"))
    if args.site and not any(p.parent.name==args.site for p in directories): raise ValueError("Unknown site")
    for config in directories:
        site=config.parent; cfg=json.loads(config.read_text("utf-8"))
        assert cfg['id']==site.name and len(cfg['qualities']) in (1,2,3)
        assert set(cfg['qualities']) <= {'high','medium','low'} and 'high' in cfg['qualities']
        base=f"{BASE}/sites/{site.name}"
        entry={k:cfg[k] for k in ('id','module','hosts','engine','qualities')}
        entry['config']=base+'/version.cjs'
        catalog.append(entry)
        if args.site and site.name != args.site: continue
        scripts={p.relative_to(site/'scripts').as_posix():p.read_text('utf-8').strip()
                 for p in sorted((site/'scripts').rglob('*')) if p.is_file()}
        if (site/'main.js').is_file(): scripts['main.js']=(site/'main.js').read_text('utf-8').strip()
        runtime=dict(cfg,protocol=PROTOCOL,scripts=scripts)
        runtime.pop('alias',None)
        dist=site/'dist'; dist.mkdir(exist_ok=True)
        runtime_path=dist/'runtime.json'; runtime_path.write_bytes(compact(runtime))
        files=[artifact(runtime_path,'runtime.json','all')]
        for abi in ('armeabi-v7a','arm64-v8a'):
            library=cfg['module']+'.so'
            files.append(artifact(dist/abi/library,library,abi))
        manifest=dict(id=site.name,version=cfg['version'],files=files)
        (site/'plugin.json').write_bytes(signed(manifest))
        probe=dict(v=cfg['version'],id=site.name,manifest=base+'/plugin.json')
        (site/'version.cjs').write_bytes(compact(probe))
        # Keep familiar root URL entry points, each now points to one site only.
        (ROOT/(cfg['alias']+'.cjs')).write_bytes(compact(probe))
    catalog_bytes=signed(dict(sites=catalog))
    (ROOT/'catalog.json').write_bytes(catalog_bytes)
    (ROOT/'plugin.json').write_bytes(catalog_bytes)
    print('Built protocol 4 catalog and independent site manifests')
if __name__=='__main__': main()
