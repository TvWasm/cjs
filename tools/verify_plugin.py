import argparse, hashlib, json, struct, re
from pathlib import Path
from urllib.parse import urlsplit, parse_qs, quote, unquote
ROOT=Path(__file__).resolve().parents[1]
BASE='https://raw.githubusercontent.com/TvWasm/cjs/main'
def verify(path):
    value=json.loads(path.read_text('utf-8')); assert value['protocol']==5
    assert 'payload' not in value and 'signature' not in value
    return value
def local(url):
    clean=urlsplit(url)._replace(query='',fragment='').geturl()
    if not clean.startswith(BASE+'/'): raise ValueError(f"URL is outside --base-url: {url}")
    path=(ROOT/unquote(clean[len(BASE)+1:])).resolve()
    if not path.is_relative_to(ROOT): raise ValueError(f"Path is outside --root: {url}")
    return path
def main():
    global ROOT, BASE
    parser=argparse.ArgumentParser(description="Verify online CJS artifacts against local files")
    parser.add_argument('--root', type=Path, default=ROOT)
    parser.add_argument('--base-url', default=BASE)
    args=parser.parse_args(); ROOT=args.root.resolve(); BASE=args.base_url.rstrip('/')
    cat=verify(ROOT/'catalog.json'); assert len({s['id'] for s in cat['sites']})==len(cat['sites'])
    source_sites = {source: site for site in cat['sites'] for source in site['sources']}
    for site in cat['sites']:
        domain=site['id']; probe=json.loads(local(site['config']).read_text('utf-8'))
        playback=site['playback']
        for source in site['sources']:
            assert urlsplit(source).scheme in ('http','https') and source.endswith('.cjs')
            assert json.loads(local(source).read_text('utf-8'))==probe
            playlist=local(source).with_suffix('.m3u')
            if not playlist.is_file(): continue # Channel examples are optional for third-party repositories.
            lines=playlist.read_text('utf-8').splitlines()
            assert lines[0]=='#EXTM3U'
            urls=[]; pending=False
            for line in lines[1:]:
                if line.startswith('#EXTINF:'):
                    assert not pending and 'group-title="' in line
                    pending=True
                elif line and not line.startswith('#'):
                    channel_source = line.split('?',1)[0]
                    assert pending and channel_source in source_sites
                    channel_site = source_sites[channel_source]
                    playback = channel_site['playback']
                    pending=False; urls.append(line)
                    query=parse_qs(urlsplit(line).query,keep_blank_values=True)
                    assert all(len(values)==1 for values in query.values())
                    page=playback['page']
                    for parameter,pattern in playback['parameters'].items():
                        value=query[parameter][0]; assert re.fullmatch(pattern,value)
                        page=page.replace('{'+parameter+'}',quote(value,safe=''))
                    assert '{' not in page and urlsplit(page).hostname in channel_site['hosts']
            assert not pending and urls and len(urls)==len(set(urls))
            print(f"verified {playlist.name}: {len(urls)} direct .cjs channels and routing")
        manifest=verify(local(probe['manifest']))
        assert manifest['id']==domain and manifest['version']==probe['v']
        profiles=json.loads((ROOT/'native/profiles.json').read_text('utf-8'))
        expected={('runtime.json','all',None)} | {(site['module']+'.so',p['abi'],p['id']) for p in profiles}
        assert {(f['name'],f['abi'],f.get('profile')) for f in manifest['files']} == expected
        assert len(manifest['files'])==4
        for f in manifest['files']:
            path=local(f['url']); assert path.is_relative_to(ROOT/'sites'/domain) and path.name==f['name']
            data=path.read_bytes(); assert hashlib.sha256(data).hexdigest()==f['sha256']
            if f['abi']=='all':
                runtime=json.loads(data); assert runtime['id']==domain and runtime['version']==probe['v']
                assert 1<=len(runtime['qualities'])<=3 and set(runtime['qualities']) <= {'high','medium','low'}
                assert runtime['protocol']==5 and runtime['module']==site['module'] and runtime['qualities']==site['qualities']
                assert runtime.get('jsApi','cjs-v4') in ('ku9','cjs-v4')
                if runtime.get('entry'): assert runtime['entry'] in runtime['scripts']
            else:
                profile=next(p for p in profiles if p['id']==f['profile'])
                assert f['minSdk']==profile['minSdk'] and f['ndk']==profile['ndk'] and f['abi']==profile['abi']
                assert path.parent.name==profile['directory']
                assert f['name']==site['module']+'.so' and data[:4]==b'\x7fELF'
                assert data[4]==(2 if f['abi']=='arm64-v8a' else 1)
                assert struct.unpack_from('<H',data,18)[0]==(183 if f['abi']=='arm64-v8a' else 40)
        print(f"verified {domain} v{probe['v']}: independent script + 3 native profiles")
if __name__=='__main__': main()
