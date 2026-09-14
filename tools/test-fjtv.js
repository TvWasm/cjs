// node tools/test-fjtv.js [--live]; live mode also requires Python 3.
const fs = require('fs'), vm = require('vm'), assert = require('assert'), crypto = require('crypto');
const {spawnSync} = require('child_process');
process.chdir(require('path').resolve(__dirname, '..'));
const script = fs.readFileSync('k-web/ku9/js/fjtv.js', 'utf8');
const ids = ['665248990102917120','665248966136664064','665248914378952704',
  '665248752898248704','665248553475870720','665248523855695872'];
const lines = fs.readFileSync('k-web/fjtv.txt', 'utf8').trim().split(/\r?\n/).slice(1);
function make(request) {
  const context = {ku9:{request, getQuery:(url,key)=>new URL(url || 'https://example.test/').searchParams.get(key)||'',
    md5:value=>crypto.createHash('md5').update(value).digest('hex')}};
  vm.createContext(context); vm.runInContext(script,context); return context;
}
let calls = 0;
const resolver = make((url,method,headers)=> {
  calls++;
  const id = new URL(url).searchParams.get('channel_id');
  assert(ids.includes(id)); assert.equal(method,'GET');
  const input = headers['X-API-KEY'] + '&NjhhMDRiODE3N2JkYzllNWUxNmE4OWU2Nzc3YTdiNjY=&1.0.0&' + headers['X-API-TIMESTAMP'];
  assert.equal(headers['X-API-SIGNATURE'],crypto.createHash('md5').update(input).digest('hex'));
  return {code:200,body:JSON.stringify([{id,m3u8:'http://cdn.example.test/'+id+'/live.m3u8?_upt=token&keep=%2B'}])};
});
lines.forEach((line,i)=> {
  const url = line.split(',')[1]; const r = resolver.main({url});
  assert.equal(r.url,'https://cdn.example.test/'+ids[i]+'/live.m3u8?_upt=token&keep=%2B');
  assert.equal(r.referer,'https://live.fjtv.net/'+new URL(url).searchParams.get('id')+'/');
  assert(r.userAgent.startsWith('Mozilla/'));
});
assert.equal(calls,6);
assert.throws(()=>resolver.main('https://example.test/?id=constructor'),/参数无效/);
assert.equal(calls,6);
assert(resolver.main('https://example.test/').url.includes(ids[0]));
for(const response of [null,{code:403},{code:200,body:'<html>'},{code:200,body:'null'},
  {code:200,body:'[]'},{code:200,body:'[null]'},
  {code:200,body:JSON.stringify([{id:ids[1],m3u8:'https://example.test/live.m3u8'}])},
  {code:200,body:JSON.stringify([{id:ids[0],m3u8:'javascript:alert(1)'}])},
  {code:200,body:JSON.stringify([{id:ids[0],m3u8:'https://example.test/bad url.m3u8'}])}]) {
  assert.throws(()=>make(()=>response).main('https://example.test/'));
}
console.log('PASS six channel IDs, defaults, signature, URL parameters, headers and failures');
function http(url,method,headers,binary) {
  const code = `import sys,json,urllib.request,urllib.error
p=json.load(sys.stdin)
try:
 with urllib.request.urlopen(urllib.request.Request(p['url'],headers=p['headers'],method=p['method'] or 'GET'),timeout=20) as r:
  b=r.read(564 if p['binary'] else 2000000)
  print(json.dumps({'code':r.status,'body':'' if p['binary'] else b.decode('utf8'),'url':r.url,'ts':len(b)>=377 and b[0]==71 and b[188]==71 and b[376]==71}))
except urllib.error.HTTPError as e: print(json.dumps({'code':e.code,'body':''}))
`;
  const result = spawnSync('python',['-c',code],{input:JSON.stringify({url,method,headers,binary:!!binary}),encoding:'utf8',timeout:25000});
  if(result.status!==0) throw Error(result.stderr || result.error);
  return JSON.parse(result.stdout);
}
if(process.argv.includes('--live')) {
  const live = make(http); let failed = false;
  for(const line of lines) {
    const started=Date.now(), result=live.main(line.split(',')[1]), resolveMs=Date.now()-started;
    const headers={'Referer':result.referer,'User-Agent':result.userAgent};
    let playlist=http(result.url,'GET',headers), depth=0;
    while(playlist.body.includes('#EXT-X-STREAM-INF:') && depth++<3) {
      const next=playlist.body.split(/\r?\n/).find(l=>l && !l.startsWith('#'));
      playlist=http(new URL(next,playlist.url).href,'GET',headers);
    }
    const segment=playlist.body.split(/\r?\n/).find(l=>l && !l.startsWith('#'));
    const media=segment && playlist.body.startsWith('#EXTM3U')
      ? http(new URL(segment,playlist.url).href,'GET',headers,true) : {code:0,ts:false};
    console.log(JSON.stringify({id:new URL(line.split(',')[1]).searchParams.get('id'),resolveMs,playlist:playlist.code,segment:media.code,ts:media.ts}));
    if(playlist.code!==200 || media.code!==200 || !media.ts) failed=true;
  }
  if(failed) process.exitCode=1;
}
