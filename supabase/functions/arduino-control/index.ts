// Explicit web commands only; the background collector cannot use this endpoint.
export {};
declare const Deno:{env:{get:(name:string)=>string|undefined};serve:(h:(r:Request)=>Promise<Response>)=>void};
const origins=new Set(['https://arty2525.github.io','https://durian-orchard-art.siwat-t36.chatgpt.site']);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function json(url:string,init:RequestInit={}):Promise<any>{const r=await fetch(url,{...init,signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error('upstream');const t=await r.text();return t?JSON.parse(t):null;}
Deno.serve(async req=>{
 const origin=req.headers.get('origin')||'',headers:Record<string,string>={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin','Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'};
 if(origins.has(origin))headers['Access-Control-Allow-Origin']=origin;
 const reply=(v:unknown,status=200)=>new Response(JSON.stringify(v),{status,headers});
 if(origin&&!origins.has(origin))return reply({error:'Origin not allowed'},403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply({error:'POST only'},405);
 const authorization=req.headers.get('authorization')||'';
 if(!authorization.startsWith('Bearer '))return reply({error:'กรุณาเข้าสู่ระบบทีมงาน'},401);
 const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!,server=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
 const authHeaders={Authorization:authorization,apikey:anon,'Content-Type':'application/json'},serverHeaders={Authorization:'Bearer '+server,apikey:server,'Content-Type':'application/json'};
 let commandId='',claimed=false;const published:string[]=[];
 try{
  const u=await fetch(url+'/auth/v1/user',{headers:authHeaders,signal:AbortSignal.timeout(8000)});
  if(!u.ok)return reply({error:'เซสชันหมดอายุ'},401);
  const user:any=await u.json();
  const identity=await json(url+'/rest/v1/rpc/orchard_identity',{method:'POST',headers:authHeaders,body:'{}'});
  if(!['admin','editor'].includes(identity?.role))return reply({error:'เฉพาะทีมงานที่มีสิทธิ์ควบคุม'},403);
  const text=await req.text();if(text.length>1024)return reply({error:'Invalid command'},400);
  let b:any;try{b=JSON.parse(text)}catch{return reply({error:'Invalid command'},400)}
  if(!b||!uuid.test(b.requestId)||typeof b.value!=='boolean'||!/^relay[1-7]$|^(all|stop)$/.test(b.target)||b.target==='stop'&&b.value!==false)return reply({error:'คำสั่งไม่ถูกต้อง'},400);
  commandId=b.requestId;
  const saved=await json(url+'/rest/v1/rpc/orchard_arduino_read_private',{method:'POST',headers:serverHeaders,body:'{}'});
  const clientId=saved?.clientId||Deno.env.get('ARDUINO_CLIENT_ID'),secret=saved?.clientSecret||Deno.env.get('ARDUINO_CLIENT_SECRET'),thing=saved?.thingId||Deno.env.get('ARDUINO_THING_ID');
  if(!clientId||!secret||!thing)return reply({error:'กรุณาตั้งค่า Arduino Cloud ก่อน'},409);
  const token=await json('https://api2.arduino.cc/iot/v1/clients/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'client_credentials',client_id:clientId,client_secret:secret,audience:'https://api2.arduino.cc/iot'})});
  if(typeof token.access_token!=='string')throw Error('token');
  const cloudHeaders={Authorization:'Bearer '+token.access_token,'Content-Type':'application/json'};
  const info=await json('https://api2.arduino.cc/iot/v2/things/'+encodeURIComponent(thing),{headers:cloudHeaders});
  if(!info.device_id)return reply({error:'Thing นี้ยังไม่มีอุปกรณ์'},409);
  const device=await json('https://api2.arduino.cc/iot/v2/devices/'+encodeURIComponent(info.device_id),{headers:cloudHeaders});
  if(!['online','connected'].includes(String(device.device_status||'').toLowerCase()))return reply({error:'ESP32 ไม่ออนไลน์หรือยังตรวจสอบไม่ได้ จึงยังไม่ส่งคำสั่ง กรุณาตรวจอุปกรณ์ที่ตู้'},409);
  const props=await json('https://api2.arduino.cc/iot/v2/things/'+encodeURIComponent(thing)+'/properties',{headers:cloudHeaders});
  if(!Array.isArray(props))throw Error('properties');
  const targets=b.target==='all'&&b.value===true?['relay1','relay2','relay3','relay4','relay5','relay6','relay7']:b.target==='stop'||b.target==='all'?['relay1','relay2','relay3','relay4','relay5','relay6','relay7','relay8','relayAll']:[b.target];
  if(targets.some(n=>!props.find((p:any)=>p.variable_name===n&&typeof p.id==='string')))return reply({error:'ตัวแปรควบคุมไม่ครบ กรุณาตรวจ Thing และโค้ด ESP32'},409);
  const claim=await json(url+'/rest/v1/rpc/orchard_command_begin',{method:'POST',headers:serverHeaders,body:JSON.stringify({command_id:commandId,thing,actor_id:user.id,command_target:b.target,command_value:b.value})});
  if(claim.busy)return reply({error:'มีคำสั่งกำลังทำงาน กรุณารอสักครู่'},409);
  if(claim.duplicate)return reply({duplicate:true,status:claim.status,requestId:commandId,published:claim.published});
  if(!claim.accepted)throw Error('claim');claimed=true;
  // OFF commands close each zone first. Firmware derives the pump from open zones.
  // Last pump OFF is explicit; relayAll is reset to prevent a stale group toggle.
  let incomplete=false;
  for(const name of targets){
   const p=props.find((p:any)=>p.variable_name===name);
   try{
    await json('https://api2.arduino.cc/iot/v2/things/'+encodeURIComponent(thing)+'/properties/'+encodeURIComponent(p.id)+'/publish',{method:'PUT',headers:cloudHeaders,body:JSON.stringify({value:b.value})});published.push(name);
   }catch{if(b.value)throw Error('incomplete');incomplete=true;}
   await new Promise(resolve=>setTimeout(resolve,250));
  }
  if(incomplete)throw Error('incomplete');
  await json(url+'/rest/v1/irrigation_commands?id=eq.'+commandId,{method:'PATCH',headers:serverHeaders,body:JSON.stringify({status:'sent',published,updated_at:new Date().toISOString()})});
  return reply({status:'sent',requestId:commandId,published,message:'Cloud รับคำสั่งแล้ว ยังไม่มีการยืนยันรีเลย์จากบอร์ด'});
 }catch{
  if(claimed)try{await json(url+'/rest/v1/irrigation_commands?id=eq.'+commandId,{method:'PATCH',headers:serverHeaders,body:JSON.stringify({status:'partial',published,updated_at:new Date().toISOString()})})}catch{}
  return reply({status:published.length?'partial':'unknown',requestId:commandId||null,published,error:claimed?'ส่งคำสั่งไม่ครบหรือผลยังไม่แน่ชัด กรุณาตรวจสถานะล่าสุดและอุปกรณ์ที่ตู้ก่อนสั่งซ้ำ':'เชื่อมต่อเพื่อสั่งงานไม่สำเร็จ กรุณาตรวจ API และสถานะบอร์ด'},502);
 }
});
