const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const manifest=JSON.parse(fs.readFileSync('pages/public/manifest.webmanifest','utf8'));
assert.equal(manifest.start_url,'/durian-orchard-/');assert.equal(manifest.scope,manifest.start_url);assert.equal(manifest.display,'standalone');
for(const icon of manifest.icons){const png=fs.readFileSync('pages/public/'+icon.src);const size=Number(icon.sizes.split('x')[0]);assert.equal(png.readUInt32BE(16),size);assert.equal(png.readUInt32BE(20),size);}
const handlers={},cached=[],deleted=[];let networkFails=false,fetches=0;
const fallback={offline:true};
const self={registration:{scope:'https://arty2525.github.io/durian-orchard-/'},clients:{claim:async()=>{}},addEventListener:(name,fn)=>handlers[name]=fn};
vm.runInNewContext(fs.readFileSync('pages/public/sw.js','utf8'),{self,URL,Response,caches:{open:async()=>({addAll:async values=>cached.push(...values)}),keys:async()=>['orchard-mobile-help-old','another-site-cache'],delete:async key=>deleted.push(key),match:async()=>fallback},fetch:async()=>{fetches++;if(networkFails)throw Error('offline');return {online:true}}});
(async()=>{
 let task;handlers.install({waitUntil:p=>task=p});await task;assert.deepEqual(cached,['https://arty2525.github.io/durian-orchard-/offline.html','https://arty2525.github.io/durian-orchard-/icons/orchard-192.png']);
 handlers.activate({waitUntil:p=>task=p});await task;assert.deepEqual(deleted,['orchard-mobile-help-old']);
 const check=(url,method='GET',mode='cors')=>{let response;handlers.fetch({request:{url,method,mode},respondWith:p=>response=p});return response};
 assert.equal(check('https://backend.supabase.co/functions/v1/arduino-control','POST'),undefined);
 assert.equal(check('https://backend.supabase.co/rest/v1/trees'),undefined);
 assert.equal(check('https://arty2525.github.io/durian-orchard-/api/data'),undefined);
 assert.equal(check('https://arty2525.github.io/other-site/','GET','navigate'),undefined);
 assert.equal(check('https://arty2525.github.io/durian-orchard-/','POST','navigate'),undefined);
 assert.equal((await check(self.registration.scope+'?kind=tree&id=D0001','GET','navigate')).online,true);
 networkFails=true;assert.equal(await check(self.registration.scope,'GET','navigate'),fallback);
 assert.equal(fetches,2);console.log('PASS: install manifest, PNG dimensions, scoped cache cleanup, network navigation, offline fallback, API/POST bypass. No hardware requests.');
})().catch(error=>{console.error(error);process.exit(1)});
