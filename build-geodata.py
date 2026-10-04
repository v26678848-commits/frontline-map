import json, os, urllib.request, zipfile, io
from pathlib import Path
OUT=Path('data'); OUT.mkdir(exist_ok=True)
BASE='https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/'
NE={
 'admin1.geojson':'ne_10m_admin_1_states_provinces.geojson',
 'populated-places.geojson':'ne_10m_populated_places.geojson',
 'roads.geojson':'ne_10m_roads.geojson',
 'rivers.geojson':'ne_10m_rivers_lake_centerlines.geojson',
 'lakes.geojson':'ne_10m_lakes.geojson',
 'coastline.geojson':'ne_10m_coastline.geojson',
}
BBOX=(21.5,43.8,41.5,53.8)
def bbox_geom(g):
    if not g:return False
    xs=[];ys=[]
    def walk(v):
        if isinstance(v,(list,tuple)) and len(v)>=2 and isinstance(v[0],(int,float)) and isinstance(v[1],(int,float)):
            xs.append(v[0]);ys.append(v[1]);return
        if isinstance(v,list):
            for x in v:walk(x)
    walk(g.get('coordinates'))
    return bool(xs) and not(max(xs)<BBOX[0] or min(xs)>BBOX[2] or max(ys)<BBOX[1] or min(ys)>BBOX[3])
def keep(f,key):
    p=f.get('properties') or {}; g=f.get('geometry')
    if not bbox_geom(g):return False
    if key=='admin1':return p.get('adm0_a3')=='UKR' or p.get('adm0name')=='Ukraine'
    return True
for outname,src in NE.items():
    print('Downloading',src)
    raw=json.loads(urllib.request.urlopen(BASE+src,timeout=120).read().decode('utf-8'))
    key=outname.split('.')[0]
    fs=[f for f in raw.get('features',[]) if keep(f,key)]
    (OUT/outname).write_text(json.dumps({'type':'FeatureCollection','features':fs},separators=(',',':'),ensure_ascii=False),encoding='utf-8')
    print(outname,len(fs))
# Ukraine administrative districts and hromadas, CC-BY-4.0.
for name,url in {
 'rayony.geojson':'https://raw.githubusercontent.com/slawomirmatuszak/ukrainian_geodata/master/rayony.geojson',
 'hromady.geojson':'https://raw.githubusercontent.com/slawomirmatuszak/ukrainian_geodata/master/hromady.geojson',
}.items():
    print('Downloading',name)
    data=urllib.request.urlopen(url,timeout=120).read()
    (OUT/name).write_bytes(data)
# GeoNames Ukraine: populated places, villages, towns, etc. Convert tab-separated dump to GeoJSON.
print('Downloading GeoNames UA')
raw=urllib.request.urlopen('https://download.geonames.org/export/dump/UA.zip',timeout=120).read()
z=zipfile.ZipFile(io.BytesIO(raw)); txt=z.read('UA.txt').decode('utf-8').splitlines()
features=[]
for line in txt:
    c=line.split('\t')
    if len(c)<19:continue
    try: lat=float(c[4]);lon=float(c[5])
    except:continue
    if not (BBOX[0]<=lon<=BBOX[2] and BBOX[1]<=lat<=BBOX[3]):continue
    fclass=c[6]; fcode=c[7]
    if fclass!='P':continue
    features.append({'type':'Feature','properties':{'geonameid':c[0],'name':c[1],'asciiName':c[2],'population':int(c[14] or 0),'featureCode':fcode,'admin1':c[10],'admin2':c[11]},'geometry':{'type':'Point','coordinates':[lon,lat]}})
(OUT/'settlements.geojson').write_text(json.dumps({'type':'FeatureCollection','features':features},separators=(',',':'),ensure_ascii=False),encoding='utf-8')
print('settlements',len(features))
