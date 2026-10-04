const CACHE='frontline-map-v3-local';
const CORE=[
 './','./index.html','./style.css','./app.js','./map.js','./territory.js','./grayzone.js','./cities.js','./gameState.js','./ui.js',
 './manifest.json','./vendor/leaflet/leaflet.js','./vendor/leaflet/leaflet.css','./vendor/turf/turf.min.js',
 './data/ukraine-outline.geojson','./data/admin1.geojson','./data/rayony.geojson','./data/hromady.geojson','./data/settlements.geojson','./data/rivers.geojson','./data/lakes.geojson','./data/roads.geojson','./data/coastline.geojson'
];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url); if(u.origin!==location.origin)return; e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request).then(r=>{if(r.ok){const cp=r.clone();caches.open(CACHE).then(x=>x.put(e.request,cp));}return r;})));});
