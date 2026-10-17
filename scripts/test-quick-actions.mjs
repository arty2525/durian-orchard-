import assert from 'node:assert/strict';import {createServer} from 'vite';
const s=await createServer({configFile:'vite.pages.config.ts',optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true}});
try{
 const {chooseTargets}=await s.ssrLoadModule('/../app/quick-actions.tsx');const {pagesApi}=await s.ssrLoadModule('/../lib/orchard-pages-api.ts');const {trackingFor}=await s.ssrLoadModule('/../lib/orchard-tracking.ts');
 const trees=Array.from({length:400},(_,i)=>({id:'D'+String(i+1).padStart(4,'0'),type:'tree',zone:i<320?'upper':'lower',subzone:i<230?Math.floor(i/46)+1:i<275?6:i<320?7:null}));
 const fruits=[{id:'f1',tree:'D0001',year:'2026',status:'growing',expectedHarvest:'2026-12-01'},{id:'f2',tree:'D0321',year:'2026',status:'growing'},{id:'f3',tree:'D0001',year:'2027',status:'growing'},{id:'f4',tree:'D0001',year:'2026',status:'harvested',harvest:'2026-10-01'}];
 const pick=(kind,scope,year='2026',st=[],sf=[],vt=[],vf=[])=>chooseTargets(kind,scope,year,trees,fruits,st,sf,vt,vf);
 assert.equal(pick('fertilizer','all').length,400);assert.equal(pick('fertilizer','upper').length,320);assert.equal(pick('fertilizer','lower').length,80);assert.equal(pick('fertilizer','upper-1').length,46);assert.equal(pick('fertilizer','upper-7').length,45);
 assert.deepEqual(pick('fertilizer','selected','2026',['D0001','D0400']).map(t=>t.id),['D0001','D0400']);assert.equal(pick('fertilizer','view','2026',[],[],['D0321']).length,1);
 assert.deepEqual(pick('fruit_defaults','all').map(f=>f.id),['f1','f2','f4']);assert.deepEqual(pick('fruit_defaults','lower').map(f=>f.id),['f2']);assert.deepEqual(pick('harvest','all').map(f=>f.id),['f1','f2']);assert.equal(pick('fruit_defaults','all','2028').length,0);
 assert.equal(trackingFor({...fruits[0],type:'fruit',setDate:'2026-04-01'},[],'2026-10-17').kind,'scheduled','Expected harvest must not stop photo tracking');
 globalThis.location=new URL('https://arty2525.github.io/durian-orchard-/');let called;
 const db={auth:{async getUser(){return {data:{user:{id:'test',email:'editor@example.invalid'}}}}},async rpc(name,args){if(name==='orchard_identity')return {data:{role:'editor'},error:null};called=args;return {data:{ok:true,applied:args.p_ids.length},error:null}}};
 let r=await pagesApi(db,'/api/bulk',{method:'POST',body:JSON.stringify({kind:'fertilizer',ids:['D0001'],data:{name:'15-15-15'}})});assert.equal(r.status,403);assert.equal(called,undefined);
 r=await pagesApi(db,'/api/bulk',{method:'POST',headers:{Authorization:'Bearer test'},body:JSON.stringify({kind:'fruit_defaults',ids:[],apply:false,saveDefaults:true,data:{year:2026,weight:2.5}})});assert.equal(r.status,200);assert.equal(called.p_apply,false);assert.equal(called.p_save_defaults,true);assert.equal(called.p_data.weight,2.5);
 r=await pagesApi(db,'/api/bulk',{method:'POST',headers:{Authorization:'Bearer test'},body:JSON.stringify({kind:'fertilizer',ids:[null]})});assert.equal(r.status,400);
 console.log('PASS bulk actions: 400-tree/zone/selected/visible scoping, season isolation, actual-harvest protection, schedule preservation, auth guard and defaults-only request');
}finally{await s.close()}
