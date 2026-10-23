// Arduino Cloud reads + admin settings. Never sends physical control commands.
declare const Deno:{env:{get:(name:string)=>string|undefined};serve:(handler:(req:Request)=>Promise<Response>)=>void};
const allowed = new Set(['https://arty2525.github.io','https://durian-orchard-art.siwat-t36.chatgpt.site']);
async function jsonFetch(url:string,init:RequestInit={}):Promise<any> {
  const response = await fetch(url,{...init,signal:AbortSignal.timeout(10000)});
  if (!response.ok) throw new Error('upstream_'+response.status);
  const body=await response.text();return body?JSON.parse(body):null;
}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin')||'';
 const headers:Record<string,string>={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'GET, POST, OPTIONS'};
 if(allowed.has(origin))headers['Access-Control-Allow-Origin']=origin;
 const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(origin&&!allowed.has(origin))return reply({error:'Origin not allowed'},403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(!['GET','POST'].includes(req.method))return reply({error:'Method not allowed'},405);
 const authorization=req.headers.get('authorization')||'';
 const collectorToken=req.headers.get('x-collector-token')||'';
 if(!authorization.startsWith('Bearer ')&&!collectorToken)return reply({error:'กรุณาเข้าสู่ระบบทีมงาน'},401);
 try {
  const url=Deno.env.get('SUPABASE_URL')!, key=Deno.env.get('SUPABASE_ANON_KEY')!;
  const authHeaders={Authorization:authorization,apikey:key};
  const serverKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const serverHeaders={Authorization:'Bearer '+serverKey,apikey:serverKey||'','Content-Type':'application/json'};
  let identity:any;
  if(collectorToken){
   if(req.method!=='GET'||!serverKey)return reply({error:'Unauthorized'},401);
   const verified=await jsonFetch(url+'/rest/v1/rpc/orchard_collector_authorized',{method:'POST',headers:serverHeaders,body:JSON.stringify({candidate:collectorToken})});
   if(verified!==true)return reply({error:'Unauthorized'},401);
   identity={role:'editor'};
  }else{
   const u=await fetch(url+'/auth/v1/user',{headers:authHeaders,signal:AbortSignal.timeout(8000)});
   if(!u.ok)return reply({error:'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่'},401);
   identity=await jsonFetch(url+'/rest/v1/rpc/orchard_identity',{method:'POST',headers:{...authHeaders,'Content-Type':'application/json'},body:'{}'});
  }
  if(!['admin','editor'].includes(identity?.role))return reply({error:'เฉพาะทีมงานสวน'},403);
  let settings:any;
  if(req.method==='POST'){
   if(identity.role!=='admin')return reply({error:'เฉพาะแอดมินเท่านั้นที่ตั้งค่า API ได้'},403);
   const body=await req.text();if(body.length>4096)return reply({error:'ข้อมูลยาวเกินไป'},400);
   try{settings=JSON.parse(body)}catch{return reply({error:'รูปแบบข้อมูลไม่ถูกต้อง'},400)}
   if(!settings||typeof settings.clientId!=='string'||!settings.clientId.trim()||settings.clientId.length>256||typeof settings.clientSecret!=='string'||!settings.clientSecret.trim()||settings.clientSecret.length>1024||typeof settings.thingId!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(settings.thingId))return reply({error:'กรุณากรอก Client ID, Client Secret และ Thing ID ให้ครบและถูกต้อง'},400);
   settings={clientId:settings.clientId.trim(),clientSecret:settings.clientSecret.trim(),thingId:settings.thingId.toLowerCase()};
  }else{
   if(!serverKey)throw Error('server_configuration');
   settings=await jsonFetch(url+'/rest/v1/rpc/orchard_arduino_read_private',{method:'POST',headers:{Authorization:'Bearer '+serverKey,apikey:serverKey,'Content-Type':'application/json'},body:'{}'});
  }
  const clientId=settings?.clientId||Deno.env.get('ARDUINO_CLIENT_ID'),secret=settings?.clientSecret||Deno.env.get('ARDUINO_CLIENT_SECRET'),thing=settings?.thingId||Deno.env.get('ARDUINO_THING_ID');
  if(!clientId||!secret||!thing)return reply({source:'arduino-cloud',configured:false,canConfigure:identity.role==='admin'});
  // Fresh OAuth per request ensures saved replacements take effect on every worker.
  let requestToken='';
  {
   const t=await jsonFetch('https://api2.arduino.cc/iot/v1/clients/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'client_credentials',client_id:clientId,client_secret:secret,audience:'https://api2.arduino.cc/iot'})});
   if(typeof t.access_token!=='string')throw new Error('invalid_token_response');
   requestToken=t.access_token;
  }
  const raw=await jsonFetch('https://api2.arduino.cc/iot/v2/things/'+encodeURIComponent(thing)+'/properties',{headers:{Authorization:'Bearer '+requestToken}});
  if(!Array.isArray(raw))throw new Error('invalid_properties');
  const names=['temperature','humidity',...Array.from({length:8},(_,i)=>'relay'+(i+1)),'relayAll'];
  const properties=raw.filter((p:any)=>names.includes(p.variable_name)).map((p:any)=>({name:p.variable_name,value:p.last_value??null,updatedAt:p.value_updated_at??null}));
  if(req.method==='POST')await jsonFetch(url+'/rest/v1/rpc/orchard_arduino_save',{method:'POST',headers:{...authHeaders,'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify({settings})});
  let historyRecorded=false;
  try{
   await jsonFetch(url+'/rest/v1/irrigation_samples?on_conflict=thing_id,minute',{method:'POST',headers:{...serverHeaders,Prefer:'resolution=ignore-duplicates,return=minimal'},body:JSON.stringify({thing_id:thing,properties:properties.filter((p:any)=>/^relay[1-8]$/.test(p.name))})});
   historyRecorded=true;
  }catch{ /* Preserve telemetry when history storage is unavailable. */ }
  if(collectorToken)return reply({collected:historyRecorded,configured:true},historyRecorded?200:503);
  return reply({source:'arduino-cloud',configured:true,canConfigure:identity.role==='admin',saved:req.method==='POST',historyRecorded,fetchedAt:new Date().toISOString(),properties});
 }catch(e){const code=e instanceof Error?e.message:'';return reply({source:'arduino-cloud',error:code==='upstream_429'?'Arduino Cloud จำกัดคำขอ กรุณารอสักครู่':req.method==='POST'?'ทดสอบหรือบันทึกไม่สำเร็จ กรุณาตรวจ API Key, Thing ID และลองใหม่':'ดึงข้อมูลไม่สำเร็จ กรุณาตรวจ API Key, Thing ID และสิทธิ์ API ในบัญชี Arduino Cloud'},502);}
});
