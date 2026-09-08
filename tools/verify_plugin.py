import base64, hashlib, json, struct, re
from pathlib import Path
from urllib.parse import urlsplit, parse_qs, quote
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
ROOT=Path(__file__).resolve().parents[1]
key=serialization.load_der_public_key((ROOT/'keys/cjs-plugin-public.der').read_bytes())
def verify(path):
    envelope=json.loads(path.read_text('utf-8')); assert envelope['protocol']==4
    data=base64.b64decode(envelope['payload'])
    key.verify(base64.b64decode(envelope['signature']),data,padding.PKCS1v15(),hashes.SHA256())
    return json.loads(data)
def local(url):
    return ROOT/urlsplit(url).path.split('/main/',1)[1]
def main():
    cat=verify(ROOT/'catalog.json'); assert len({s['id'] for s in cat['sites']})==len(cat['sites'])
    for site in cat['sites']:
        domain=site['id']; probe=json.loads(local(site['config']).read_text('utf-8'))
        playback=site['playback']
        for source in site['sources']:
            assert source.startswith('https://') and source.endswith('.cjs')
            assert json.loads(local(source).read_text('utf-8'))==probe
            playlist=local(source).with_suffix('.m3u')
            lines=playlist.read_text('utf-8').splitlines()
            assert lines[0]=='#EXTM3U'
            urls=[]; pending=False
            for line in lines[1:]:
                if line.startswith('#EXTINF:'):
                    assert not pending and 'group-title="' in line
                    pending=True
                elif line and not line.startswith('#'):
                    assert pending and line.split('?',1)[0]==source
                    pending=False; urls.append(line)
                    query=parse_qs(urlsplit(line).query,keep_blank_values=True)
                    assert all(len(values)==1 for values in query.values())
                    page=playback['page']
                    for parameter,pattern in playback['parameters'].items():
                        value=query[parameter][0]; assert re.fullmatch(pattern,value)
                        page=page.replace('{'+parameter+'}',quote(value,safe=''))
                    assert '{' not in page and urlsplit(page).hostname in site['hosts']
            assert not pending and urls and len(urls)==len(set(urls))
            print(f"verified {playlist.name}: {len(urls)} direct .cjs channels and signed routing")
        manifest=verify(local(probe['manifest']))
        assert manifest['id']==domain and manifest['version']==probe['v']
        assert len(manifest['files'])==3
        for f in manifest['files']:
            path=local(f['url']); assert path.is_relative_to(ROOT/'sites'/domain)
            data=path.read_bytes(); assert hashlib.sha256(data).hexdigest()==f['sha256']
            if f['abi']=='all':
                runtime=json.loads(data); assert runtime['id']==domain and runtime['version']==probe['v']
                assert 1<=len(runtime['qualities'])<=3 and set(runtime['qualities']) <= {'high','medium','low'}
                if domain=='yangshipin.cn': assert runtime['qualities']==dict(high='fhd',medium='shd',low='hd')
                if domain=='tv.cctv.com': assert set(runtime['scripts'])=={'main.js'}
                if domain=='tv.gxtv.cn': assert set(runtime['scripts'])=={'main.js'}
            else:
                assert f['name']==site['module']+'.so' and data[:4]==b'\x7fELF'
                assert data[4]==(2 if f['abi']=='arm64-v8a' else 1)
                assert struct.unpack_from('<H',data,18)[0]==(183 if f['abi']=='arm64-v8a' else 40)
        print(f"verified {domain} v{probe['v']}: independent script + 2 ABI libraries")
if __name__=='__main__': main()
