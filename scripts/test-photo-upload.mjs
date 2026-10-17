import assert from 'node:assert/strict';import {createServer} from 'vite';
const s=await createServer({configFile:'vite.pages.config.ts',optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true}});
try{
 globalThis.location=new URL('https://arty2525.github.io/durian-orchard-/');
 const {pagesApi}=await s.ssrLoadModule('/../lib/orchard-pages-api.ts');let uploads=0,removed=[],saved,fail=false;
 const bucket={async upload(){uploads++;return {error:null}},async remove(keys){removed.push(...keys);return {error:null}}};
 const db={auth:{async getUser(){return {data:{user:{id:'test',email:'editor@example.invalid'}},error:null}}},async rpc(name,args){if(name==='orchard_identity')return {data:{role:'editor'},error:null};saved=args;return fail?{data:null,error:{message:'simulated save failure'}}:{data:{ok:true,id:'photo-1'},error:null}},storage:{from(name){assert.equal(name,'orchard-photos');return bucket}}};
 function form(entity='D0001',height='3.2'){const f=new FormData();f.set('file',new File([new Uint8Array([255,216,255,224,0,0,0,0,0,0,0,0])],'test.jpg',{type:'image/jpeg'}));f.set('entity',entity);f.set('date','2026-10-17');f.set('caption','annual photo');f.set('circumference','45.5');f.set('height',height);return f}
 const send=body=>pagesApi(db,'/api/photo',{method:'POST',headers:{Authorization:'Bearer test'},body});
 let r=await send(form());assert.equal(r.status,200);assert.equal(saved.p_data.circumference,45.5);assert.equal(saved.p_data.height,3.2);assert.equal(saved.p_data.entity,'D0001');assert.equal(saved.p_data.date,'2026-10-17');assert.equal(saved.p_data.published,false);
 uploads=0;r=await send(form('D0001','-1'));assert.equal(r.status,400);assert.equal(uploads,0,'Invalid measurement must be rejected before file upload');
 r=await send(form('fruit-1'));assert.equal(r.status,400);assert.equal(uploads,0);
 fail=true;r=await send(form());assert.equal(r.status,400);assert(removed.includes(saved.p_data.key),'Failed metadata save must clean up the uploaded file');
 console.log('PASS photo upload: annual measurements persisted, private by default, invalid data rejected before upload, failed saves cleaned up');
}finally{await s.close()}
