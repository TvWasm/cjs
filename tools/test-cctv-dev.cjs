const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync('sites/tv.cctv.com/main.js', 'utf8');
function setup(replies, preferred = '') {
  const calls = [], cache = new Map([['cctv-dev-endpoint-v1', preferred]]);
  const api = {
    md5: s => crypto.createHash('md5').update(s).digest('hex'),
    getQuery: (u, key) => new URL(u).searchParams.get(key) || '',
    getCache: key => cache.get(key) || '',
    setCache: (key, value, ttl) => { assert.equal(ttl, 600000); cache.set(key, value); },
    log: () => {},
    request: (u, method, headers, body, redirect) => {
      assert.equal(method, 'GET'); assert.equal(body, ''); assert.equal(redirect, true);
      assert.equal(headers.Referer, 'https://tv.cctv.com/');
      const [time, nonce, hash] = headers['auth-key'].split('-');
      const query = new URL(u).searchParams;
      assert.equal(query.get('hbss'), time);
      assert.equal(hash, api.md5(query.get('channel') + time + nonce + 'a4220a71b31746908fa3e7fdd7a6852a'));
      calls.push(u);
      const reply = replies.shift();
      if (reply instanceof Error) throw reply;
      if (!reply) throw Error('Unexpected extra request');
      return reply;
    }
  };
  const context = vm.createContext({ku9: api}); vm.runInContext(source, context);
  return {main: context.main, calls, cache};
}
const good = {code:200, body:JSON.stringify({ack:'yes', manifest:{hls_cdrm:'https://media.example/live.m3u8'}})};
for (const item of [{params:{id:'cctv1'}}, {pageUrl:'https://tv.cctv.com/live/cctv1/'},
    {url:'https://raw.githubusercontent.com/TvWasm/cjs/dev/cctv.cjs?id=cctv1'}]) {
  const trial = setup([good]);
  assert.equal(trial.main({...item, quality:'high'}).url, 'https://media.example/live.m3u8');
  assert.equal(trial.calls.length, 1);
}
const fallback = setup([{code:200,body:'<html>error</html>'}, good]);
fallback.main({params:{id:'cctv5'}}); assert.equal(fallback.cache.get('cctv-dev-endpoint-v1'), '1');
const warm = setup([good], '1'); warm.main({params:{id:'cctv8'}});
assert(new URL(warm.calls[0]).hostname.startsWith('vdnxbk.'));
const recover = setup([new Error('timeout'),good], '1'); recover.main({params:{id:'cctv1'}});
assert.equal(recover.cache.get('cctv-dev-endpoint-v1'), '0');
const backup = setup([{code:200, body:JSON.stringify({ack:'yes',manifest:{hls_cdrm:'invalid'},backup:{hls_cdrm:'https://backup.example/a.m3u8'}})}]);
assert.equal(backup.main({params:{id:'cctv1'}}).url, 'https://backup.example/a.m3u8');
const invalid = setup([]); assert.throws(() => invalid.main({params:{id:'../bad'}})); assert.equal(invalid.calls.length, 0);
const failure = setup([{code:503}, {code:200,body:'{"ack":"no"}'}]);
assert.throws(() => failure.main({params:{id:'cctv1'}}), /HTTP 503.*ack no/);
console.log('PASS: CCTV dev routing, auth, fallback, endpoint health and response validation');
