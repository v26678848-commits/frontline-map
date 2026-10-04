(function () {
  const OWNERS = ['ukraine', 'russia', 'gray', 'neutral'];
  const OWNER_NAMES = { ukraine: 'Украина', russia: 'Россия', gray: 'Серая зона', neutral: 'Нейтральная' };
  const OWNER_COLORS = { ukraine: '#2e7df6', russia: '#ee4b62', gray: '#a4acb8', neutral: '#d2ddd5' };
  // Fictional sandbox ownership used only by the game; it is not a statement about current control.
  const RUSSIA_CODES = new Set(['UA-09','UA-14','UA-23','UA-43','UA-65','UA-44','UA-48']);
  const DATA = {
    country: './data/ukraine-outline.geojson',
    admin1: './data/admin1.geojson',
    admin2: './data/rayony.geojson',
    admin3: './data/hromady.geojson',
  };
  async function fetchJson(url){ const r=await fetch(url,{cache:'no-cache'}); if(!r.ok) throw new Error(`HTTP ${r.status}: ${url}`); return r.json(); }
  function asFC(raw){ return raw?.type==='FeatureCollection' ? raw : turf.featureCollection(raw?.features||[]); }
  function normalizeName(p){ return String(p?.name_en||p?.name||p?.NAME_1||p?.NAME||'').toLowerCase().replace(/[^a-zа-яіїєґ0-9]+/gi,''); }
  function ownerFor(f){
    const p=f.properties||{};
    const code=p.iso_3166_2 || p.ISO_3166_2 || p.iso_3166_2_ || '';
    if(RUSSIA_CODES.has(code)) return 'russia';
    const n=normalizeName(p);
    if(n.includes('donetsk')||n.includes('luhansk')||n.includes('zaporizh')||n.includes('kherson')||n.includes('crimea')) return 'russia';
    return 'ukraine';
  }
  async function loadCountryOutline(progress){ progress?.('Загрузка границы Украины'); return fetchJson(DATA.country); }
  async function loadRegions(progress){
    progress?.('Загрузка 27 областей');
    const fc=asFC(await fetchJson(DATA.admin1));
    return fc.features.filter(f=>f.geometry).map(f=>{ f.properties=Object.assign({},f.properties,{owner:ownerFor(f),adminLevel:1,adminName:f.properties?.name_en||f.properties?.name}); return f; });
  }
  async function loadDetailBoundaries(){
    const [a2,a3]=await Promise.all([fetchJson(DATA.admin2).catch(()=>turf.featureCollection([])),fetchJson(DATA.admin3).catch(()=>turf.featureCollection([]))]);
    return {admin2:asFC(a2),admin3:asFC(a3)};
  }
  function ownerFeature(state,owner){
    const fs=(state.territories||[]).filter(t=>t.properties?.owner===owner);
    if(!fs.length)return null; return fs.length===1?fs[0]:turf.union(turf.featureCollection(fs));
  }
  function buildInitialState(regionFeatures){
    const territories=regionFeatures.map(f=>turf.feature(f.geometry,{owner:f.properties.owner,adminName:f.properties.adminName,source:'admin1'}));
    return {territories,adminRegions:turf.featureCollection(regionFeatures)};
  }
  function getTerritoryOwnerAtPoint(state,pt){ for(const f of state.territories||[]) if(turf.booleanPointInPolygon(pt,f)) return f.properties.owner; return 'neutral'; }
  function validateOwners(ts){ return ts.every(f=>f?.geometry&&OWNERS.includes(f.properties?.owner)); }
  function validateGeometry(ts){ try{return ts.every(f=>f.geometry&&(!turf.booleanValid||turf.booleanValid(f))&&Number.isFinite(turf.area(f))&&turf.area(f)>0);}catch{return false;} }
  function mergeSameOwner(ts){
    const groups=Object.fromEntries(OWNERS.map(o=>[o,[]])); ts.forEach(f=>groups[f.properties.owner].push(f)); const out=[];
    for(const o of OWNERS){if(!groups[o].length)continue; if(groups[o].length===1){out.push(groups[o][0]);continue;} const u=turf.union(turf.featureCollection(groups[o])); if(u){u.properties={owner:o};out.push(u);}}
    return out;
  }
  function subtract(base,cut){ const r=turf.difference(turf.featureCollection([base,cut])); if(!r)return null; r.properties={owner:base.properties.owner}; return r; }
  function intersect(a,b){return turf.intersect(turf.featureCollection([a,b]));}
  function validateResult(ts,country){
    if(!validateOwners(ts)||!validateGeometry(ts))return false;
    const total=ts.reduce((s,f)=>s+turf.area(f),0), base=turf.area(country); return Math.abs(total-base)/Math.max(base,1)<0.002;
  }
  window.Territory={OWNERS,OWNER_NAMES,OWNER_COLORS,DATA,fetchJson,loadCountryOutline,loadRegions,loadDetailBoundaries,buildInitialState,ownerFeature,getTerritoryOwnerAtPoint,validateOwners,validateGeometry,mergeSameOwner,subtract,intersect,validateResult};
})();
