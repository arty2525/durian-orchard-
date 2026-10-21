// Read-only Arduino Cloud bridge. No device key, service role or write endpoint.
declare const Deno:{env:{get:(name:string)=>string|undefined};serve:(handler:(req:Request)=>Promise<Response>)=>void};
const allowed = new Set(['https://arty2525.github.io','https://durian-orchard-art.siwat-t36.chatgpt.site']);
let token = '', tokenUntil = 0;
let cached: unknown = null, cachedUntil = 0;
async function jsonFetch(url:string,init:RequestInit={}):Promise<any> {
  const response = await fetch(url,{...init,signal:AbortSignal.timeout(10000)});
  if (!response.ok) throw new Error('upstream_'+response.status);
  return response.json();
}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin')||'';
 const headers:Record<string,string>={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'GET, OPTIONS'};
 if(allowed.has(origin))headers['Access-Control-Allow-Origin']=origin;
 const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(origin&&!allowed.has(origin))return reply({error:'Origin not allowed'},403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='GET')return reply({error:'Read only'},405);
 const authorization=req.headers.get('authorization')||'';
 if(!authorization.startsWith('Bearer '))return reply({error:'กรุณาเข้าสู่ระบบทีมงาน'},401);
 try {
  const url=Deno.env.get('SUPABASE_URL')!, key=Deno.env.get('SUPABASE_ANON_KEY')!;
  const authHeaders={Authorization:authorization,apikey:key};
  const u=await fetch(url+'/auth/v1/user',{headers:authHeaders,signal:AbortSignal.timeout(8000)});
  if(!u.ok)return reply({error:'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่'},401);
  const identity=await jsonFetch(url+'/rest/v1/rpc/orchard_identity',{method:'POST',headers:{...authHeaders,'Content-Type':'application/json'},body:'{}'});
  if(!['admin','editor'].includes(identity?.role))return reply({error:'เฉพาะทีมงานสวน'},403);
  const clientId=Deno.env.get('ARDUINO_CLIENT_ID'),secret=Deno.env.get('ARDUINO_CLIENT_SECRET'),thing=Deno.env.get('ARDUINO_THING_ID');
  if(!clientId||!secret||!thing)return reply({source:'arduino-cloud',configured:false,error:'รอตั้งค่า Arduino Cloud API ที่หลังบ้าน',missing:['ARDUINO_CLIENT_ID','ARDUINO_CLIENT_SECRET','ARDUINO_THING_ID'].filter(n=>!Deno.env.get(n))});
  if(cached&&Date.now()<cachedUntil)return reply(cached);
  if(!token||Date.now()>=tokenUntil){
   const t=await jsonFetch('https://api2.arduino.cc/iot/v1/clients/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'client_credentials',client_id:clientId,client_secret:secret,audience:'https://api2.arduino.cc/iot'})});
   if(typeof t.access_token!=='string')throw new Error('invalid_token_response');
   token=t.access_token;tokenUntil=Date.now()+Math.max(0,Number(t.expires_in||300)-60)*1000;
  }
  const raw=await jsonFetch('https://api2.arduino.cc/iot/v2/things/'+encodeURIComponent(thing)+'/properties',{headers:{Authorization:'Bearer '+token}});
  if(!Array.isArray(raw))throw new Error('invalid_properties');
  const names=['temperature','humidity',...Array.from({length:8},(_,i)=>'relay'+(i+1)),'relayAll'];
  const properties=raw.filter((p:any)=>names.includes(p.variable_name)).map((p:any)=>({name:p.variable_name,value:p.last_value??null,updatedAt:p.value_updated_at??null}));
  cached={source:'arduino-cloud',configured:true,fetchedAt:new Date().toISOString(),properties};cachedUntil=Date.now()+20000;
  return reply(cached);
 }catch(e){const code=e instanceof Error?e.message:'';if(code==='upstream_401'){token='';tokenUntil=0;}return reply({source:'arduino-cloud',error:code==='upstream_429'?'Arduino Cloud จำกัดคำขอ กรุณารอสักครู่':'ดึงข้อมูลไม่สำเร็จ กรุณาตรวจ API Key, Thing ID และสิทธิ์ API ในบัญชี Arduino Cloud'},502);}
});
