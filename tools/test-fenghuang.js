// node tools/test-fenghuang.js [--live]; live mode also requires Python 3.
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const path = require('path'), {spawnSync} = require('child_process');
const root = path.resolve(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'k-web/ku9/js/fenghuang.js'), 'utf8');
const lines = fs.readFileSync(path.join(root, 'k-web/fenghuang.txt'), 'utf8').trim().split(/\r?\n/).slice(1);
const ids = ['pcc', 'pin', 'phk'];
const uuids = ['f7f48462-9b13-485b-8101-7b54716411ec',
    '7c96b084-60e1-40a9-89c5-682b994fb680', '15e02d92-1698-416c-af2f-3e9a872b4d78'];
const page = 'https://www.fengshows.com/live';
const signature = 'txSecret=0123456789abcdef0123456789abcdef&txTime=6ac9cf23';
function signed(id, quality) {
    return 'http://dispatch.fengshows.cn:8484/live/0701' + id
        + (quality === 'sd' ? '36' : '48') + '.flv?' + signature + '&keep=%2B';
}
function envelope(url) { return {code: 200, body: JSON.stringify({status: '0', data: {live_url: url}})}; }
function make(request) {
    const context = {ku9: {request, getQuery: (url, key) =>
        new URL(url || 'https://example.test/', 'https://example.test/').searchParams.get(key) || ''}};
    vm.createContext(context); vm.runInContext(script, context); return context;
}
let calls = 0;
const resolver = make((url, method, headers) => {
    calls++; const api = new URL(url);
    assert.equal(api.origin + api.pathname, 'https://m.fengshows.com/api/v3/hub/live/auth-url');
    assert.equal(method, 'GET'); assert.equal(headers.Referer, page);
    assert.equal(headers.Origin, 'https://www.fengshows.com');
    assert(headers['User-Agent'].startsWith('Mozilla/'));
    const index = uuids.indexOf(api.searchParams.get('live_id')); assert(index >= 0);
    return envelope(signed(ids[index], api.searchParams.get('live_qa')));
});
assert.equal(lines.length, 3);
for (const [index, line] of lines.entries()) {
    const source = line.split(',')[1]; assert.equal(new URL(source).searchParams.get('id'), ids[index]);
    for (const quality of ['hd', 'sd']) {
        const result = resolver.main({url: source + '&quality=' + quality});
        assert.equal(result.url, signed(ids[index], quality).replace('http://dispatch.fengshows.cn:8484', 'https://tlive.fengshows.com'));
        assert.equal(result.referer, page); assert(result.userAgent.startsWith('Mozilla/'));
        assert(!result.url.includes('.m3u8'));
    }
    assert.equal(resolver.main('https://example.test/?id=' + uuids[index]).url,
        resolver.main(source).url);
}
assert.equal(resolver.main().url, resolver.main('https://example.test/?id=pcc').url);
assert.equal(resolver.main('https://example.test/?id=1016529').url, resolver.main().url);
const before = calls;
for (const query of ['id=constructor', 'id=unknown', 'id=1017126', 'id=pcc&quality=fhd', 'quality=bad']) {
    assert.throws(() => resolver.main('https://example.test/?' + query), /参数无效/);
}
assert.equal(calls, before);
const first = signed('pcc', 'hd'), second = first.replace('6ac9cf23', '6ac9cf24');
let response = envelope(first); const fresh = make(() => response);
assert(fresh.main().url.endsWith('6ac9cf23&keep=%2B')); response = envelope(second);
assert(fresh.main().url.endsWith('6ac9cf24&keep=%2B'));
for (const value of [null, {code: 403}, {code: 0}, {code: 200, body: '<html>'},
    {code: 200, body: 'null'}, {code: 200, body: '{}'},
    {code: 200, body: JSON.stringify({status: '1', message: 'unavailable'})},
    ...[null, '', 'javascript:alert(1)', signed('pin', 'hd'),
        first.replace('.flv', '.m3u8'), first.replace('txSecret=', 'missing='),
        first.replace('txTime=', 'missing='), first.replace('/live/', '/bad path/'),
        first + '#bad'].map(envelope)]) {
    assert.throws(() => make(() => value).main());
}
assert.equal(make(() => ({code: 200, body: JSON.stringify({status: 0, data: {live_url: first}})})).main().referer, page);
console.log('PASS three channels, legacy ID, defaults, quality, fresh signatures, HTTPS FLV, headers and failures');

function http(url, method, headers, binary) {
    const code = `import sys,json,urllib.request,urllib.error
p=json.load(sys.stdin)
try:
 with urllib.request.urlopen(urllib.request.Request(p['url'],headers=p['headers'],method=p['method'] or 'GET'),timeout=20) as r:
  b=r.read(262144 if p['binary'] else 2000000)
  result={'code':r.status,'body':'' if p['binary'] else b.decode('utf8')}
  if p['binary']:
   valid=b[:3]==b'FLV' and len(b)>13 and b[3]==1
   pos=int.from_bytes(b[5:9],'big')+4 if valid else len(b)
   audio=video=0; aac=avc=False; timestamps=[]
   while pos+15<=len(b):
    tag=b[pos]; size=int.from_bytes(b[pos+1:pos+4],'big'); end=pos+11+size
    if end+4>len(b): break
    if int.from_bytes(b[end:end+4],'big')!=size+11: valid=False; break
    payload=b[pos+11:end]
    timestamp=int.from_bytes(b[pos+4:pos+7],'big')+(b[pos+7]<<24)
    if tag==8 and size>2 and payload[0]>>4==10:
     if payload[1]==0: aac=True
     if payload[1]==1: audio+=1; timestamps.append(timestamp)
    if tag==9 and size>5 and payload[0]&15==7:
     if payload[1]==0: avc=True
     if payload[1]==1: video+=1; timestamps.append(timestamp)
    pos=end+4
   result.update({'bytes':len(b),'flv':valid,'aac':aac,'h264':avc,'audioPackets':audio,'videoPackets':video,
     'advancing':bool(timestamps) and max(timestamps)>min(timestamps)})
  print(json.dumps(result))
except urllib.error.HTTPError as e: print(json.dumps({'code':e.code,'body':''}))
except Exception as e: print(json.dumps({'code':0,'body':'','error':str(e)}))
`;
    const result = spawnSync('python', ['-c', code], {input: JSON.stringify({url, method,
        headers: headers || {}, binary: !!binary}), encoding: 'utf8', timeout: 25000});
    if (result.status !== 0) throw Error(result.stderr || result.error);
    return JSON.parse(result.stdout);
}
if (process.argv.includes('--live')) {
    const live = make(http); let failed = false;
    for (const line of lines) {
        for (const quality of ['hd', 'sd']) {
            const source = line.split(',')[1] + '&quality=' + quality, started = Date.now();
            try {
                const result = live.main({url: source}), resolveMs = Date.now() - started;
                const media = http(result.url, 'GET', {'Referer': result.referer, 'User-Agent': result.userAgent}, true);
                console.log(JSON.stringify({id: new URL(source).searchParams.get('id'), quality, resolveMs, ...media}));
                if (media.code !== 200 || !media.flv || !media.aac || !media.h264
                        || media.audioPackets < 2 || media.videoPackets < 2 || !media.advancing) failed = true;
            } catch (error) {
                failed = true; console.error(line.split(',')[0] + ': ' + error.message);
            }
        }
    }
    if (failed) process.exitCode = 1;
}
