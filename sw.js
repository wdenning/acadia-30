/* Acadia 30 service worker: keeps the site and saved map tiles available offline. */
const VERSION="2026-10-26a";
const SHELL="acadia30-shell-"+VERSION,OFF="acadia30-offline-v1",RT="acadia30-runtime-v1";
const SHELL_FILES=["./","index.html","app.js","fonts.css","manifest.webmanifest","favicon.svg","favicon-32.png","apple-touch-icon.png","icon-192.png","icon-512.png","icon-maskable-512.png","vendor/maplibre-gl.js","vendor/maplibre-gl.css","vendor/maplibre-contour.min.js","vendor/fonts/big-shoulders-display-latin-500-normal.woff2","vendor/fonts/big-shoulders-display-latin-700-normal.woff2","vendor/fonts/big-shoulders-display-latin-900-normal.woff2","vendor/fonts/public-sans-latin-400-normal.woff2","vendor/fonts/public-sans-latin-400-italic.woff2","vendor/fonts/public-sans-latin-500-normal.woff2","vendor/fonts/public-sans-latin-600-normal.woff2","vendor/fonts/public-sans-latin-700-normal.woff2","vendor/fonts/ibm-plex-mono-latin-400-normal.woff2","vendor/fonts/ibm-plex-mono-latin-500-normal.woff2"];
const TILE_HOSTS=["tiles.openfreemap.org","elevation-tiles-prod.s3.amazonaws.com"];

self.addEventListener("install",e=>{e.waitUntil(caches.open(SHELL).then(c=>c.addAll(SHELL_FILES)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith("acadia30-shell-")&&k!==SHELL).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});

const fromCache=req=>caches.match(req,{ignoreVary:true,ignoreSearch:false});
async function networkFirst(req,fallbackKey){
  try{const r=await fetch(req);if(r.ok){const c=await caches.open(req.mode==="navigate"?SHELL:RT);c.put(fallbackKey||req,r.clone())}return r}
  catch(e){return(await fromCache(fallbackKey||req))||(await fromCache(req))||Response.error()}}
async function cacheFirst(req){
  const hit=await fromCache(req);if(hit)return hit;
  const r=await fetch(req);
  if(r.ok){const c=await caches.open(RT);c.put(req,r.clone());trim()}
  return r}
let trimming=false;
async function trim(){if(trimming)return;trimming=true;try{const c=await caches.open(RT),keys=await c.keys();
  if(keys.length>2500)for(const k of keys.slice(0,keys.length-2000))await c.delete(k)}finally{trimming=false}}
async function staleWhileRevalidate(req){
  const hit=await fromCache(req);
  const net=fetch(req).then(async r=>{if(r.ok)(await caches.open(SHELL)).put(req,r.clone());return r}).catch(()=>null);
  return hit||(await net)||Response.error()}

self.addEventListener("fetch",e=>{
  const req=e.request;if(req.method!=="GET")return;
  const url=new URL(req.url);
  if(url.origin===self.location.origin){
    if(req.mode==="navigate")e.respondWith(networkFirst(req,new URL("./",self.location).href));
    else e.respondWith(staleWhileRevalidate(req));
    return}
  if(TILE_HOSTS.includes(url.hostname)){
    if(url.hostname==="tiles.openfreemap.org"&&url.pathname==="/planet")e.respondWith(networkFirst(req));
    else e.respondWith(cacheFirst(req));
  }
});
