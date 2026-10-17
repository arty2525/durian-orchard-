import assert from 'node:assert/strict';
import {createServer} from 'vite';
const server=await createServer({configFile:'vite.pages.config.ts',server:{middlewareMode:true}});
try{
 const {pagesApi}=await server.ssrLoadModule('/../lib/orchard-pages-api.ts');
 const {clean}=await server.ssrLoadModule('/../lib/orchard-validation.ts');
 assert.equal(clean('tree',{zone:'upper',subzone:'7'},[]).subzone,7);
 assert.equal(clean('tree',{zone:'lower',subzone:'7'},[]).subzone,null);
 assert.throws(()=>clean('tree',{zone:'upper',subzone:'8'},[]),/โซนย่อย/);
 const {appUrl}=await server.ssrLoadModule('/../app/orchard-auth.tsx');
 globalThis.location=new URL('https://arty2525.github.io/durian-orchard-/?kind=tree&id=D0001');
 assert.equal(appUrl(),'https://arty2525.github.io/durian-orchard-/');
 const fixture={trees:[{code:'D0001',variety:'',zone:'upper',planted:'2021',planted_precision:'approx'}],fruits:[{id:'fruit-1',tree_code:'D0001',season_year:2026,set_date:'2026-04-01'}],seasons:[],photos:[],orchard_settings:[{id:true,name:'สวนทดสอบ'}]};
 const tables=[];
 const db={from(name){tables.push(name);return {select(){return this},order(){return this},range(){return Promise.resolve({data:fixture[name]||[],error:null})}}},auth:{getUser(){throw Error('Anonymous should not load account')}}};
 let r=await pagesApi(db,'/api/data?kind=fruit&id=fruit-1');assert.equal(r.status,200);let data=await r.json();assert.equal(data.tree.id,'D0001');assert.equal(data.fruit.setDate,'2026-04-01');assert.equal(data.seasons[0].registered,1);assert(!tables.includes('internal_notes'));
 r=await pagesApi(db,'/api/data');assert.deepEqual((await r.json()).records,[]);
 r=await pagesApi(db,'/api/data',{method:'POST',body:JSON.stringify({action:'initialize'})});assert.equal(r.status,403);
 r=await pagesApi(db,'/api/photo',{method:'POST'});assert.equal(r.status,403);
 r=await pagesApi(db,'/api/data?kind=tree&id=missing');assert.equal(r.status,404);
 r=await pagesApi(db,'/api/data',{method:'DELETE'});assert.equal(r.status,405);
 console.log('PASS: Pages base path, public traceability, private-table exclusion, anonymous write denial, missing records, method guards');
}finally{await server.close()}
