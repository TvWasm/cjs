import base64, hashlib, json, struct
from pathlib import Path
from urllib.parse import urlsplit
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
