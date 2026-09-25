'use strict';
const CACHE='mom-news-reader-2026-09-25-v9';
const FILES=['./','./index.html','./edition-2026-09-25-evening.html','./edition-2026-09-25-midday.html','./edition-2026-09-25-first.html','./archives.json','./manifest.webmanifest','./icon.svg','./icon-180.png','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('mom-news-reader-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==location.origin||!url.href.startsWith(self.registration.scope))return;
 if(url.pathname.endsWith('/latest.json')){event.respondWith(fetch(event.request,{cache:'no-store'}).catch(()=>new Response('{}',{status:503,headers:{'Content-Type':'application/json'}})));return;}
 if(url.pathname.endsWith('/archives.json')){event.respondWith(fetch(event.request,{cache:'no-store'}).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(c=>c.put(event.request,copy)));}return response;}).catch(async()=>await caches.match(event.request)||new Response('{}',{status:503,headers:{'Content-Type':'application/json'}})));return;}
 if(event.request.mode==='navigate'){
  event.respondWith(fetch(event.request).then(response=>{
   if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)));}
   return response;
  }).catch(()=>caches.match(event.request).then(saved=>saved||caches.match('./index.html'))));
 }else{
  event.respondWith(caches.match(event.request).then(saved=>saved||fetch(event.request)));
 }
});
