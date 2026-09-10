"""Build compact, readable site manifests with SHA-256 file integrity checks."""
import argparse, hashlib, json, re
from urllib.parse import urlsplit
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
BASE = "https://raw.githubusercontent.com/TvWasm/cjs/main"
PROTOCOL = 5

def compact(value):
    return (json.dumps(value, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8")
def artifact(path, name, abi, data=None):
    digest=hashlib.sha256(path.read_bytes() if data is None else data).hexdigest()
    url=f"{BASE}/{path.relative_to(ROOT).as_posix()}?sha={digest[:16]}"
    return dict(name=name, abi=abi, url=url, sha256=digest)
def main():
    global ROOT, BASE
    parser=argparse.ArgumentParser()
    parser.add_argument("--site", help="Build only this website; catalog still lists all sites")
    parser.add_argument("--catalog-only", action="store_true", help="Publish channel entry routing without rebuilding immutable site releases")
    parser.add_argument("--root", type=Path, default=ROOT, help="Plugin repository root")
    parser.add_argument("--base-url", default=BASE, help="HTTP(S) URL serving this repository root")
    args=parser.parse_args()
    ROOT=args.root.resolve(); BASE=args.base_url.rstrip('/')
    parsed=urlsplit(BASE)
    if parsed.scheme not in ('http','https') or not parsed.netloc or parsed.query or parsed.fragment or parsed.username:
        raise ValueError("--base-url must be an HTTP(S) directory URL without credentials/query/fragment")
    outputs={}; aliases=set()
    catalog=[]
    directories=sorted((ROOT/"sites").glob("*/site.json"))
    if args.site and not any(p.parent.name==args.site for p in directories): raise ValueError("Unknown site")
    for config in directories:
        site=config.parent; cfg=json.loads(config.read_text("utf-8"))
        if cfg['id'] != site.name or not re.fullmatch(r'[a-z0-9]+(?:[.-][a-z0-9]+)*', site.name):
            raise ValueError(f"{config}: id must match the website directory")
        for field in ('module', 'alias'):
            if not re.fullmatch(r'[a-zA-Z][a-zA-Z0-9_-]*', cfg[field]):
                raise ValueError(f"{config}: invalid {field}")
        if cfg['alias'] in aliases: raise ValueError(f"Duplicate alias: {cfg['alias']}")
        aliases.add(cfg['alias'])
        if type(cfg['version']) is not int or cfg['version'] <= 0: raise ValueError(f"{config}: version must be a positive integer")
        if cfg.get('jsApi', 'cjs-v4') not in ('ku9', 'cjs-v4'): raise ValueError(f"{config}: unknown jsApi")
        assert len(cfg['qualities']) in (1,2,3)
        assert set(cfg['qualities']) <= {'high','medium','low'} and 'high' in cfg['qualities']
        base=f"{BASE}/sites/{site.name}"
        entry={k:cfg[k] for k in ('id','module','hosts','engine','qualities')}
        entry['config']=base+'/version.cjs'
        entry['sources']=[f"{BASE}/{cfg['alias']}.cjs"]
        if 'playback' in cfg: entry['playback']=cfg['playback']
        catalog.append(entry)
        if args.catalog_only: continue
        if args.site and site.name != args.site: continue
        scripts={p.relative_to(site/'scripts').as_posix():p.read_text('utf-8').strip()
                 for p in sorted((site/'scripts').rglob('*')) if p.is_file()}
        if (site/'main.js').is_file(): scripts['main.js']=(site/'main.js').read_text('utf-8').strip()
        runtime=dict(cfg,protocol=PROTOCOL,scripts=scripts)
        runtime.pop('alias',None)
        runtime.pop('playback',None) # Channel routing belongs to the catalog.
        if cfg.get('entry') and cfg['entry'] not in scripts: raise ValueError(f"{config}: entry script is missing")
        dist=site/'dist'
        runtime_path=dist/'runtime.json'; runtime_bytes=compact(runtime)
        files=[artifact(runtime_path,'runtime.json','all',runtime_bytes)]
        for profile in json.loads((ROOT/'native/profiles.json').read_text('utf-8')):
            library=cfg['module']+'.so'
            item=artifact(dist/profile['directory']/library,library,profile['abi'])
            item.update(profile=profile['id'], minSdk=profile['minSdk'], ndk=profile['ndk'])
            files.append(item)
        manifest=dict(protocol=PROTOCOL,id=site.name,version=cfg['version'],files=files)
        previous=site/'plugin.json'
        if previous.is_file():
            old=json.loads(previous.read_text('utf-8'))
            old_version=old['version']
            fingerprint=lambda items: {(f['name'],f['abi'],f.get('profile')):f['sha256'] for f in items}
            if cfg['version'] < old_version or (cfg['version'] == old_version and fingerprint(old['files']) != fingerprint(files)):
                raise ValueError(f"{site.name}: increase version before changing published script/SO bytes")
        outputs[runtime_path]=runtime_bytes
        outputs[site/'plugin.json']=compact(manifest)
        probe=dict(v=cfg['version'],id=site.name,manifest=base+'/plugin.json')
        outputs[site/'version.cjs']=compact(probe)
        # Keep familiar root URL entry points, each now points to one site only.
        outputs[ROOT/(cfg['alias']+'.cjs')]=compact(probe)
    catalog_bytes=compact(dict(protocol=PROTOCOL,sites=catalog))
    outputs[ROOT/'catalog.json']=catalog_bytes
    outputs[ROOT/'plugin.json']=catalog_bytes
    for path, data in outputs.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
    print('Built protocol 5 catalog and independent site manifests')
if __name__=='__main__': main()
