/* STADES 3M – version 4.19.0 – service worker : la page de relevé (QR code) reste utilisable sans réseau */
const C="stades-releve-v2",FILES=["releve.html","scan.html","manifest.webmanifest","icon-180.png","icon-192.png","icon-512.png","config.js","lib/supabase.min.js"],PRE=["lib/jsQR/jsQR.js","lib/jsQR/dist/jsQR.js","lib/jsQR/jsQR.min.js","lib/jsQR/dist/jsQR.min.js","lib/jsQR/package/dist/jsQR.js"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(C).then(c=>Promise.all(FILES.concat(PRE).map(f=>c.add(f).catch(()=>{})))).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{const q=e.request,u=new URL(q.url);
 if(q.method!=="GET"||u.origin!==location.origin||!FILES.concat(PRE).some(f=>u.pathname.endsWith("/"+f)))return;
 e.respondWith((async()=>{const c=await caches.open(C);
  try{const r=await Promise.race([fetch(q),new Promise((_,j)=>setTimeout(()=>j(new Error("lent")),4000))]);if(r&&r.ok)c.put(u.pathname,r.clone());return r}
  catch(_){const m=await c.match(u.pathname,{ignoreSearch:true})||await c.match(q,{ignoreSearch:true});if(m)return m;return Response.error()}})())});
