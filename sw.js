const VERSION='1.5.0';
const STATIC_CACHE=`nl10-static-${VERSION}`;
const RUNTIME_CACHE=`nl10-runtime-${VERSION}`;
const APP_SHELL=[
  "./",
  "./index.html",
  "./style.css",
  "./manifest.webmanifest",
  "./icon.svg",
  "./app/career.js",
  "./app/challenge.js",
  "./app/data.js",
  "./app/diagram.js",
  "./app/main.js",
  "./app/notifications.js",
  "./app/nova-coach.js",
  "./app/nova-conversation.js",
  "./app/nova-hub.js",
  "./app/nova-memory.js",
  "./app/nova.js",
  "./app/nutrition.js",
  "./app/performance.js",
  "./app/personal-ui.js",
  "./app/planning.js",
  "./app/player.js",
  "./app/pwa.js",
  "./app/ratings.js",
  "./app/release.js",
  "./app/session-video.js",
  "./app/storage.js",
  "./app/timer.js",
  "./app/video-catalog.js",
  "./app/video.js",
  "./app/voice.js",
  "./app/weather.js"
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(STATIC_CACHE).then(cache=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>![STATIC_CACHE,RUNTIME_CACHE].includes(key)).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  if(request.mode==='navigate'){
    event.respondWith(fetch(request).then(response=>{
      const copy=response.clone();caches.open(RUNTIME_CACHE).then(cache=>cache.put(request,copy));return response;
    }).catch(()=>caches.match(request).then(hit=>hit||caches.match('./index.html'))));
    return;
  }
  event.respondWith(caches.match(request).then(hit=>hit||fetch(request).then(response=>{
    if(response&&response.ok){const copy=response.clone();caches.open(RUNTIME_CACHE).then(cache=>cache.put(request,copy));}
    return response;
  })));
});

self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>list[0]?.focus()||clients.openWindow('./index.html')));
});
