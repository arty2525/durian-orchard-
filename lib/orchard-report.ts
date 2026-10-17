type R=Record<string,any>;
export const reportYear=(v:any)=>{const n=Number(String(v||'').slice(0,4));return n>=2400?n-543:n;};
export function annualReport(records:R[],year:number,zone='all'){
 const trees=records.filter(r=>r.type==='tree'&&(zone==='all'||(zone.startsWith('upper-')?r.zone==='upper'&&Number(r.subzone)===Number(zone.slice(6)):r.zone===zone)));
 const eligible=trees.filter(t=>!t.planted||reportYear(t.planted)<=year),ids=new Set(eligible.map(t=>t.id));
 const fruits=records.filter(r=>r.type==='fruit'&&ids.has(r.tree)&&reportYear(r.year)===year),fruitIds=new Set(fruits.map(f=>f.id));
 const photos=records.filter(r=>r.type==='photo'&&reportYear(r.date)===year),treePhotos=photos.filter(p=>ids.has(p.entity));
 const measured=new Set(treePhotos.filter(p=>p.circumference!=null&&p.height!=null).map(p=>p.entity));
 const care=records.filter(r=>r.type==='care'&&reportYear(r.date)===year&&(r.targets||[]).some((id:string)=>ids.has(id)));
 const actual=care.filter(c=>!c.isPlanned),covered=new Set(actual.flatMap(c=>(c.targets||[]).filter((id:string)=>ids.has(id))));
 const seasons=records.filter(r=>r.type==='season'&&ids.has(r.tree)&&reportYear(r.year)===year&&r.kept!=null);
 const checks=[{label:'ภาพพร้อมเส้นรอบวงและความสูง',done:measured.size,total:eligible.length,kind:'photo'}, {label:'จำนวนผลประจำปี (รวม 0 ผล)',done:new Set(seasons.map(s=>s.tree)).size,total:eligible.length,kind:'season'}];
 return {trees:eligible,unknown:eligible.filter(t=>!t.planted).length,fruits,photos:photos.filter(p=>ids.has(p.entity)||fruitIds.has(p.entity)),treePhotos:new Set(treePhotos.map(p=>p.entity)).size,measured:measured.size,care:actual.length,planned:care.length-actual.length,covered:covered.size,fruitPhotos:new Set(photos.filter(p=>fruitIds.has(p.entity)).map(p=>p.entity)).size,setDates:fruits.filter(f=>f.setDate).length,weights:fruits.filter(f=>f.weight!=null).length,harvest:fruits.filter(f=>f.harvest).length,checks,missing:eligible.filter(t=>!measured.has(t.id)||!seasons.some(s=>s.tree===t.id)).map(t=>({id:String(t.id),...t,photoMissing:!measured.has(t.id),seasonMissing:!seasons.some(s=>s.tree===t.id)}))};
}
