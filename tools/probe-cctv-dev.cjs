// Bounded live smoke test: executes the real resolver, then validates its HLS.
const fs = require('fs'), vm = require('vm'), crypto = require('crypto');
const {spawnSync} = require('child_process');
const cache = new Map();
function request(url, method, headers) {
  const args = ['--silent','--show-error','--location','--max-time','20','--max-filesize','8388608',
                '--write-out','\n%{http_code}',url];
  for (const key of Object.keys(headers || {})) args.push('-H', key + ': ' + headers[key]);
  const result = spawnSync('curl.exe', args, {encoding:'utf8',maxBuffer:9*1024*1024});
  if (result.status !== 0) throw Error('HTTP transport failed: ' + result.status);
  const split = result.stdout.lastIndexOf('\n');
  return {code:Number(result.stdout.slice(split+1)),body:result.stdout.slice(0,split)};
}
const api = {request, getCache:k=>cache.get(k)||'', setCache:(k,v)=>cache.set(k,v), log:console.log,
  md5:s=>crypto.createHash('md5').update(s).digest('hex'), getQuery:(u,k)=>new URL(u).searchParams.get(k)||''};
const context=vm.createContext({ku9:api});
vm.runInContext(fs.readFileSync('sites/tv.cctv.com/main.js','utf8'),context);
let failures=0;
for(const id of ['cctv1','cctv3','cctv5','cctv8','cctv13']) {
  const started=Date.now();
  try {
    const resolved=context.main({params:{id},quality:'high'});
    const playlist=request(resolved.url,'GET',{Referer:resolved.referer});
    if(playlist.code!==200 || !playlist.body.trim().startsWith('#EXTM3U')) throw Error('Invalid HLS response '+playlist.code);
    console.log('PASS '+id+' resolve+manifestMs='+(Date.now()-started));
  } catch(error) { failures++; console.log('FAIL '+id+' '+String(error)); }
}
process.exitCode=failures ? 1 : 0;
