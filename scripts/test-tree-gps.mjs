import assert from 'node:assert/strict';
import {createServer} from 'vite';
const server=await createServer({configFile:'vite.pages.config.ts',server:{middlewareMode:true,hmr:false}});
try{
 const {clean}=await server.ssrLoadModule('/../lib/orchard-validation.ts');
 const valid=clean('tree',{latitude:'0',longitude:'100.1234567',gpsAccuracy:'5'},[]);
 assert.equal(valid.latitude,0);assert.equal(valid.longitude,100.1234567);assert.equal(valid.gpsAccuracy,5);
 for(const input of [{latitude:'91',longitude:'100'},{latitude:'13',longitude:'181'},{latitude:'NaN',longitude:'100'},{latitude:'13',longitude:''},{latitude:'',longitude:'100'},{latitude:'13',longitude:'100',gpsAccuracy:'-1'}])assert.throws(()=>clean('tree',input,[]));
 const empty=clean('tree',{latitude:'',longitude:''},[]);assert.equal(empty.latitude,null);assert.equal(empty.longitude,null);
 assert(!('latitude' in clean('tree',{},[])));
 const {records}=await server.ssrLoadModule('/../lib/orchard-records.ts');
 const fixture={trees:[{code:'D0001'}],tree_locations:[{tree_code:'D0001',latitude:13,longitude:100,accuracy_m:5}]};
 const reads=[];const db={from(name){reads.push(name);return {select(){return this},order(){return this},range(){return Promise.resolve({data:fixture[name]||[],error:null})}}}};
 let data=await records(new Request('https://example.com'),true,db);assert.equal(data.find(r=>r.type==='tree').latitude,13);
 reads.length=0;data=await records(new Request('https://example.com'),false,db);assert(!reads.includes('tree_locations'));assert.equal(data.find(r=>r.type==='tree').latitude,null);
 console.log('PASS: GPS values, zero coordinates, invalid ranges, incomplete pairs, clear, preservation and staff-only loading');
}finally{await server.close()}
