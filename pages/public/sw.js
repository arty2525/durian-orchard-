/* Only the offline help screen and app icons are stored. No API, session,
   orchard data, irrigation command, or navigation response is cached. */
const CACHE='orchard-mobile-help-v1';
const base=new URL('./',self.registration.scope);
const offline=new URL('offline.html',base).href;
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll([offline,new URL('icons/orchard-192.png',base).href])));
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('orchard-mobile-help-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==base.origin||!url.pathname.startsWith(base.pathname))return;
 if(request.mode==='navigate'){
  event.respondWith(fetch(request,{cache:'no-store'}).catch(()=>caches.match(offline).then(r=>r||Response.error())));
 }else if(url.href===new URL('icons/orchard-192.png',base).href){
  event.respondWith(fetch(request).catch(()=>caches.match(request).then(r=>r||Response.error())));
 }
});
