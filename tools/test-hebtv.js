// node tools/test-hebtv.js
const fs=require('fs'),vm=require('vm'),assert=require('assert'),crypto=require('crypto');
const context={ku9:{md5:s=>crypto.createHash('md5').update(s).digest('hex')}};
vm.createContext(context);vm.runInContext(fs.readFileSync(require('path').join(__dirname,'../k-web/ku9/js/hebtv.js'),'utf8'),context);
const entry={liveVideo:[{formats:[{url:'https://cdn.example.test/live.m3u8'}]}],appCustomParams:{movie:{liveUri:'/live',liveKey:'test-key'}}};
const date='Mon, 14 Sep 2026 10:40:50 GMT',expiry=Date.parse(date)/1000+7200;
for(const key of ['Date','date','DATE']) {const u=new URL(context.hebtvPlaybackUrl(entry,{[key]:date}));assert.equal(u.searchParams.get('t'),String(expiry));assert.equal(u.searchParams.get('k'),crypto.createHash('md5').update('/livetest-key'+expiry).digest('hex'));}
const u=new URL(context.hebtvPlaybackUrl(entry,{Date:'invalid'}));assert(Math.abs(Number(u.searchParams.get('t'))-Date.now()/1000-7200)<2);
console.log('PASS server Date, header casing, signature and absent/invalid Date fallback');
