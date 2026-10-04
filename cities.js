(function(){
  let data=null,layers=[];
  async function load(progress){
    progress?.('Загрузка населённых пунктов');
    const raw=await fetch('./data/settlements.geojson',{cache:'no-cache'}).then(r=>{if(!r.ok)throw new Error('Не удалось загрузить населённые пункты');return r.json();});
    data=raw; return data;
  }
  function ownerForCity(state,pt){for(const f of state.territories||[])if(turf.booleanPointInPolygon(pt,f))return f.properties.owner;return 'neutral';}
  function label(p){return p.name||p.name_en||p.asciiName||'Населённый пункт';}
  function pop(p){return Number(p.population||0);}
  function render(map,state,z,onClick){
    layers.forEach(x=>x.remove()); layers=[]; if(!data)return;
    const limit=z>=9?0:z>=8?5000:z>=7?20000:50000;
    data.features.forEach(c=>{const p=c.properties||{}, population=pop(p); if(z<7&&population<50000)return; if(z>=7&&z<8&&population<20000)return; if(z>=8&&z<9&&population<5000)return;
      const owner=ownerForCity(state,c), major=population>=100000, size=major?13:9;
      const icon=L.divIcon({className:'',html:`<div class="city-marker ${major?'major':''} ${owner}"></div>`,iconSize:[size,size],iconAnchor:[size/2,size/2]});
      const m=L.marker([c.geometry.coordinates[1],c.geometry.coordinates[0]],{icon,keyboard:false});
      if(major||z>=9)m.bindTooltip(label(p),{permanent:true,direction:'top',className:'city-label',offset:[0,-4]});
      m.on('click',()=>onClick?.(c,owner)); m.addTo(map); layers.push(m);
    });
  }
  window.Cities={load,render,clear:()=>{layers.forEach(x=>x.remove());layers=[]},getAll:()=>data};
})();
