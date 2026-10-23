const fs=require('fs'),vm=require('vm'),ts=require('typescript'),assert=require('node:assert/strict');
const source=ts.transpileModule(fs.readFileSync('supabase/functions/arduino-control/index.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
async function scenario({body={target:'relay1',value:true,requestId:'00000000-0000-0000-0000-000000000001'},role='admin',online=true,claim={accepted:true},failAt=0,auth=true,origin='https://arty2525.github.io'}={}){
 let handler,published=[],audit=[];
 const props=[...Array.from({length:8},(_,i)=>({variable_name:'relay'+(i+1),id:'p'+(i+1)})),{variable_name:'relayAll',id:'pAll'}];
 const context={exports:{},Request,Response,URLSearchParams,AbortSignal,Date,Set,setTimeout:f=>f(),Deno:{env:{get:n=>({SUPABASE_URL:'https://backend',SUPABASE_ANON_KEY:'anon',SUPABASE_SERVICE_ROLE_KEY:'server'}[n])},serve:h=>handler=h},fetch:async(url,init={})=>{
  if(url.endsWith('/auth/v1/user'))return Response.json({id:'00000000-0000-0000-0000-000000000002'});
  if(url.endsWith('orchard_identity'))return Response.json({role});
  if(url.endsWith('orchard_arduino_read_private'))return Response.json({clientId:'mock',clientSecret:'mock-secret',thingId:'mock-thing'});
  if(url.endsWith('/token'))return Response.json({access_token:'mock-token'});
  if(url.endsWith('/things/mock-thing'))return Response.json({device_id:'mock-device'});
  if(url.endsWith('/devices/mock-device'))return Response.json({device_status:online?'ONLINE':'OFFLINE'});
  if(url.endsWith('/properties'))return Response.json(props);
  if(url.endsWith('orchard_command_begin'))return Response.json(claim);
  if(url.includes('/irrigation_commands?')){audit.push(JSON.parse(init.body));return new Response(null,{status:204})}
  if(url.endsWith('/publish')){if(failAt&&published.length+1===failAt)throw Error('timeout');published.push({id:url.split('/').at(-2),value:JSON.parse(init.body).value});return new Response(null,{status:200})}
  throw Error('Unexpected URL: '+url);
 }};
 vm.runInNewContext(source,context);
 const r=await handler(new Request('https://backend/functions/v1/arduino-control',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(auth?{Authorization:'Bearer user'}:{})},body:JSON.stringify(body)}));
 return {status:r.status,result:await r.json(),published,audit};
}
(async()=>{
 assert.equal((await scenario({auth:false})).status,401);
 assert.equal((await scenario({role:'viewer'})).status,403);
 assert.equal((await scenario({origin:'https://untrusted.example'})).status,403);
 assert.equal((await scenario({body:{target:'relay8',value:true,requestId:'00000000-0000-0000-0000-000000000001'}})).status,400);
 const off=await scenario({online:false});assert.equal(off.status,409);assert.equal(off.published.length,0);
 const dup=await scenario({claim:{duplicate:true,status:'sent',published:['relay1']}});assert.equal(dup.published.length,0);
 const busy=await scenario({claim:{busy:true}});assert.equal(busy.status,409);assert.equal(busy.published.length,0);
 const on=await scenario();assert.equal(on.status,200);assert.deepEqual(on.published,[{id:'p1',value:true}]);assert.equal(on.audit[0].status,'sent');assert(!JSON.stringify(on.result).includes('mock-secret'));
 const stop=await scenario({body:{target:'stop',value:false,requestId:'00000000-0000-0000-0000-000000000001'}});assert.deepEqual(stop.published.map(p=>p.id),['p1','p2','p3','p4','p5','p6','p7','p8','pAll']);assert(stop.published.every(p=>p.value===false));
 const partial=await scenario({body:{target:'all',value:true,requestId:'00000000-0000-0000-0000-000000000001'},failAt:3});assert.equal(partial.status,502);assert.equal(partial.published.length,2);assert.equal(partial.audit[0].status,'partial');
 const uncertain=await scenario({failAt:1});assert.equal(uncertain.status,502);assert.equal(uncertain.audit[0].status,'partial');
 const interruptedStop=await scenario({body:{target:'stop',value:false,requestId:'00000000-0000-0000-0000-000000000001'},failAt:9});assert.equal(interruptedStop.status,502);assert(interruptedStop.published.some(p=>p.id==='p8'&&p.value===false));
 console.log('PASS: auth, roles, origin, target allowlist, offline rejection, idempotency, concurrency, zone command, stop sequence, partial failures, uncertain delivery, secret exclusion. No real hardware requests.');
})().catch(e=>{console.error(e);process.exit(1)});
