// node tools/test-hndyjyfw.js [--live]; live mode also requires Python 3.
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const path = require('path'), {spawnSync} = require('child_process');
const root = path.resolve(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'k-web/ku9/js/hndyjyfw.js'), 'utf8');
const lines = fs.readFileSync(path.join(root, 'k-web/hndyjyfw.txt'), 'utf8').trim().split(/\r?\n/).slice(1);
const names = ['远程党员教育', '河南卫视频道', '河南都市频道', '河南民生频道',
    '河南梨园频道', '河南乡村频道', '河南武术世界'];
const ids = ['ycjy', 'hnws', 'hnds', 'hnms', 'hnly', 'hnxc', 'hnwssj'];
const api = 'https://epg.hndyjyfw.gov.cn/epg/mobileshow/digitlinklive';
const entries = names.map((channelName, i) => ({channelName,
    livePlayUrl: 'http://cdn.example.test/' + ids[i] + '/live.m3u8?token=%2B&keep=1'}));
function make(request) {
    const context = {ku9: {request, getQuery: (url, key) =>
        new URL(url || 'https://example.test/').searchParams.get(key) || ''}};
    vm.createContext(context); vm.runInContext(script, context); return context;
}
let calls = 0, current = entries;
const resolver = make((url, method, headers) => {
    calls++; assert.equal(url, api); assert.equal(method, 'GET');
    assert.equal(headers.Origin, 'https://www.hndyjyfw.gov.cn');
    assert.equal(headers.Referer, 'https://www.hndyjyfw.gov.cn/livePlay.html?u=1');
    assert(headers['User-Agent'].startsWith('Mozilla/'));
    return {code: 200, body: JSON.stringify(current)};
});
assert.equal(lines.length, 7);
lines.forEach((line, i) => {
    const url = line.split(',')[1]; assert.equal(new URL(url).searchParams.get('id'), ids[i]);
    const result = resolver.main({url});
    assert.equal(result.url, entries[i].livePlayUrl.replace('http:', 'https:'));
    assert.equal(result.referer, 'https://www.hndyjyfw.gov.cn/livePlay.html?u=' + i);
    assert(result.userAgent.startsWith('Mozilla/'));
});
assert.equal(resolver.main().url, entries[1].livePlayUrl.replace('http:', 'https:'));
assert.equal(resolver.main('https://example.test/?u=0').url, entries[0].livePlayUrl.replace('http:', 'https:'));
assert.equal(resolver.main('https://example.test/?id=hnly&u=0').url, entries[4].livePlayUrl.replace('http:', 'https:'));
current = entries.slice().reverse();
assert.equal(resolver.main(lines[1].split(',')[1]).referer, 'https://www.hndyjyfw.gov.cn/livePlay.html?u=5');
assert.equal(resolver.main('https://example.test/?u=0').url, entries[6].livePlayUrl.replace('http:', 'https:'));
current = [{channelName: names[1], livePlayUrl: 'https://new.example.test/new.m3u8?fresh=2'}];
assert.equal(resolver.main().url, current[0].livePlayUrl);
const before = calls;
for (const query of ['id=constructor', 'id=unknown', 'u=-1', 'u=1.5', 'u=01', 'u=abc']) {
    assert.throws(() => resolver.main('https://example.test/?' + query), /参数无效/);
}
assert.equal(calls, before);
assert.throws(() => resolver.main('https://example.test/?u=99'), /没有找到/);
for (const response of [null, {code: 403}, {code: 0}, {code: 200, body: '<html>'},
    ...[null, {}, [], [null], [entries[0]],
        [{channelName: names[1], livePlayUrl: 'javascript:alert(1)'}],
        [{channelName: names[1], livePlayUrl: 'https://example.test/bad url.m3u8'}],
        [{channelName: names[1], livePlayUrl: 'https://example.test/'}],
        [{channelName: names[1]}]].map(value => ({code: 200, body: JSON.stringify(value)}))]) {
    assert.throws(() => make(() => response).main());
}
console.log('PASS all seven channels, defaults, u, reordered API, fresh URLs, HTTPS, headers and failures');

function http(url, method, headers, binary) {
    const code = `import sys,json,urllib.request,urllib.error
p=json.load(sys.stdin)
try:
 with urllib.request.urlopen(urllib.request.Request(p['url'],headers=p['headers'],method=p['method'] or 'GET'),timeout=20) as r:
  b=r.read(564 if p['binary'] else 2000000)
  print(json.dumps({'code':r.status,'body':'' if p['binary'] else b.decode('utf8'),'url':r.url,'ts':len(b)>=377 and b[0]==71 and b[188]==71 and b[376]==71}))
except urllib.error.HTTPError as e: print(json.dumps({'code':e.code,'body':''}))
except Exception as e: print(json.dumps({'code':0,'body':'','error':str(e)}))
`;
    const result = spawnSync('python', ['-c', code], {input: JSON.stringify({url, method,
        headers: headers || {}, binary: !!binary}), encoding: 'utf8', timeout: 25000});
    if (result.status !== 0) throw Error(result.stderr || result.error);
    return JSON.parse(result.stdout);
}
if (process.argv.includes('--live')) {
    const response = http(api, 'GET'); assert.equal(response.code, 200);
    const liveNames = JSON.parse(response.body).map(entry => entry.channelName);
    assert.deepEqual(liveNames.slice().sort(), names.slice().sort(), '官网频道列表有变化，请更新脚本及频道表');
    const live = make(http); let failed = false;
    for (const line of lines) {
        const source = line.split(',')[1], started = Date.now();
        try {
            const result = live.main({url: source}), resolveMs = Date.now() - started;
            const headers = {'Referer': result.referer, 'User-Agent': result.userAgent};
            let playlist = http(result.url, 'GET', headers), depth = 0;
            while (playlist.body.includes('#EXT-X-STREAM-INF:') && depth++ < 3) {
                const next = playlist.body.split(/[\r\n]+/).find(l => l && !l.startsWith('#'));
                playlist = http(new URL(next, playlist.url).href, 'GET', headers);
            }
            const segment = playlist.body.split(/[\r\n]+/).find(l => l && !l.startsWith('#'));
            const media = segment && playlist.body.startsWith('#EXTM3U')
                ? http(new URL(segment, playlist.url).href, 'GET', headers, true) : {code: 0, ts: false};
            console.log(JSON.stringify({id: new URL(source).searchParams.get('id'), resolveMs,
                playlist: playlist.code, segment: media.code, ts: media.ts}));
            if (playlist.code !== 200 || media.code !== 200 || !media.ts) failed = true;
        } catch (error) {
            failed = true; console.error(line.split(',')[0] + ': ' + error.message);
        }
    }
    if (failed) process.exitCode = 1;
}
