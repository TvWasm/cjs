const fs = require('fs'), vm = require('vm'), crypto = require('crypto'), assert = require('assert');
const {spawnSync} = require('child_process');
process.chdir(require('path').resolve(__dirname, '..'));
const source = fs.readFileSync('k-web/ku9/js/jxntv.js', 'utf8');
function request(url, method, headers, body) {
  const py = `import sys,json,urllib.request,urllib.error
p=json.load(sys.stdin)
try:
 r=urllib.request.urlopen(urllib.request.Request(p['url'],p['body'].encode() if p.get('body') else None,p.get('headers') or {},method=p.get('method') or 'GET'),timeout=15)
 print(json.dumps(dict(code=r.status,body=r.read(2000000).decode('utf8'),url=r.url)))
except urllib.error.HTTPError as e: print(json.dumps(dict(code=e.code,body='')))
`;
  const r = spawnSync('python', ['-c', py], {input:JSON.stringify({url,method,headers,body}), encoding:'utf8', timeout:20000});
  if(r.status !== 0) throw Error(r.stderr || r.error);
  return JSON.parse(r.stdout);
}
function make(req) {
  const c = {ku9:{getQuery:(url,key)=>new URL(url || 'https://example.test/').searchParams.get(key)||'', md5:s=>crypto.createHash('md5').update(s).digest('hex'),request:req}};
  vm.createContext(c); vm.runInContext(source,c); return c;
}
let calls=0;
const c=make((url, method, h, body)=> {
  calls++; const data=JSON.parse(body);
  assert.equal(method,'POST'); assert.equal(data.uuid.length,12);
  assert.match(data.uuid,/^(0[0-9a-f]{2}){4}$/); assert.equal(h.etag.length,8);
  const alphabet='ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678oOLl9gqVvUuI1';
  const salt=[53,18,31,11,21,13,14,49,15,36,19,26,24].map(i=>alphabet[i]).join('');
  assert.equal(h.Authorization,crypto.createHash('md5').update(''+data.t+data.stream+h.etag+salt).digest('hex'));
  return {code:200,body:JSON.stringify({t:'178937338174384',token:'a'.repeat(32)})};
});
const lines=fs.readFileSync('k-web/jxntv.txt','utf8').trim().split(/\r?\n/).slice(1);
const expected=['tv_jxtv1','tv_jxtv2','tv_jxtv3_hd','tv_jxtv5','tv_jxtv6','tv_jxtv7','tv_jxtv8','tv_taoci'];
lines.forEach((line,i)=>assert.equal(new URL(c.main({url:line.split(',')[1]}).url).pathname,'/live-jxtv/'+expected[i]+'.m3u8'));
assert.throws(()=>c.main('https://example.test/?id=constructor'),/参数无效/); assert.equal(calls,8);
assert.match(c.main('https://example.test/').url,/tv_jxtv1/);
for(const r of [null,{code:403},{code:200,body:'<html>'},{code:200,body:'null'},{code:200,body:'{}'},{code:200,body:JSON.stringify({t:'x',token:'a'.repeat(32)})}]) {
 assert.throws(()=>make(()=>r).main('https://example.test/'));
}
console.log('PASS mappings, signature, UUID, server timestamp, defaults and failure handling');
if(process.argv.includes('--live')) {
 const live=make(request); const results=[];
 for(const line of lines) {
  const start=Date.now(), result=live.main({url:line.split(',')[1]});
  const resolveMs=Date.now()-start;
  const playlist=request(result.url,'GET',{'Referer':result.referer,'User-Agent':result.userAgent});
  const row={id:new URL(line.split(',')[1]).searchParams.get('id'),resolveMs,playlist:playlist.code,hls:playlist.body.startsWith('#EXTM3U')};
  if(row.hls) {
   const segment=playlist.body.split(/\r?\n/).find(l=>l && !l.startsWith('#'));
   const r=spawnSync('python',['-c',`import sys,json,urllib.request,urllib.error
p=json.load(sys.stdin)
try:
 r=urllib.request.urlopen(urllib.request.Request(p['url'],headers={'Referer':p['referer'],'User-Agent':p['userAgent']}),timeout=15);b=r.read(564);print(json.dumps({'code':r.status,'bytes':len(b),'ts':len(b)>=377 and b[0]==71 and b[188]==71 and b[376]==71}))
except urllib.error.HTTPError as e:print(json.dumps({'code':e.code}))
`],{input:JSON.stringify({url:new URL(segment,result.url).href,referer:result.referer,userAgent:result.userAgent}),encoding:'utf8',timeout:20000});
   row.segment=JSON.parse(r.stdout);
  }
  results.push(row);console.log(JSON.stringify(row));
 }

 if(results.some(r=>!r.hls || !r.segment || !r.segment.ts)) process.exitCode=1;
}
