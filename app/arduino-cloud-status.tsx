'use client';
import {useEffect,useState} from 'react';
import {RefreshCw,Droplets} from 'lucide-react';
import {getAuth} from './orchard-auth';
type Property={name:string;value:unknown;updatedAt:string|null};
type Snapshot={configured:boolean;fetchedAt?:string;properties?:Property[];error?:string};
const stamp=(v?:string|null)=>v&&!Number.isNaN(Date.parse(v))?new Date(v).toLocaleString('th-TH',{timeZone:'Asia/Bangkok'}):'ยังไม่มีเวลาอัปเดต';
export function ArduinoCloudStatus(){
 const [data,setData]=useState<Snapshot|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[now,setNow]=useState(Date.now());
 async function load(){setBusy(true);setError('');try{const c=await getAuth();const {data:{session}}=await c.auth.getSession();if(!session)throw Error('กรุณาเข้าสู่ระบบทีมงาน');const config:{url:string,key:string}=window.__ORCHARD_CONFIG__||await fetch('/api/config').then(r=>r.json()) as {url:string,key:string};const r=await fetch(config.url+'/functions/v1/arduino-read',{method:'GET',headers:{Authorization:'Bearer '+session.access_token,apikey:config.key},cache:'no-store',signal:AbortSignal.timeout(30000)});const v:any=await r.json();if(!r.ok)throw Error(v.error||'ดึงข้อมูล Arduino Cloud ไม่สำเร็จ');setData(v);}catch(e:any){setError(e.name==='TimeoutError'?'การเชื่อมต่อใช้เวลานาน กรุณาลองใหม่':e.message||'เชื่อมต่อไม่ได้');}finally{setBusy(false);setNow(Date.now());}}
 useEffect(()=>{load();const t=setInterval(()=>{if(document.visibilityState==='visible')load();},60000);return()=>clearInterval(t)},[]);
 const prop=(name:string)=>data?.properties?.find(p=>p.name===name);
 const temp=prop('temperature'),humid=prop('humidity');
 const fresh=!!temp?.updatedAt&&now-Date.parse(temp.updatedAt)<120000&&now>=Date.parse(temp.updatedAt);
 const relay=(name:string)=>prop(name)?.value===true?'เปิด':prop(name)?.value===false?'ปิด':'ยังไม่มีค่า';
 const number=(p?:Property)=>typeof p?.value==='number'&&Number.isFinite(p.value)?p.value.toFixed(1):'—';
 return <div className="irrigation"><section className="panel"><div className="sectionHead"><div><h3>ระบบเดิม · Arduino IoT Cloud</h3><p className="muted small">อ่านข้อมูลอย่างเดียว · ดึงอัตโนมัติทุก 60 วินาทีเมื่อเปิดหน้านี้</p></div><button type="button" disabled={busy} onClick={load}><RefreshCw size={17}/>{busy?'กำลังดึงข้อมูล…':'ดึงข้อมูลล่าสุด'}</button></div>{error&&<div className="alert" role="alert">{error}{data?.properties&&' · ข้อมูลด้านล่างเป็นข้อมูลจากการดึงครั้งก่อน'}</div>}{data&&!data.configured&&<div className="irrigationNotice"><div><b>รอตั้งค่า API ของ Arduino Cloud</b><p>ช่องทางอ่านข้อมูลพร้อมแล้ว ต้องเพิ่ม Client ID, Client Secret และ Thing ID ในหลังบ้านก่อน</p><p className="small">Device Key ในโค้ด ESP32 ใช้แทน API Key นี้ไม่ได้</p></div></div>}<p className="small muted">ดึงจาก Cloud ครั้งล่าสุด: {stamp(data?.fetchedAt)} · เวลาที่ดึงสำเร็จไม่ได้ยืนยันว่าบอร์ดออนไลน์</p></section>
 <div className="irrigationMetrics">{[['อุณหภูมิ',number(temp)+' °C',stamp(temp?.updatedAt)],['ความชื้นอากาศ',number(humid)+' %',stamp(humid?.updatedAt)],['ความสดของอุณหภูมิ',fresh&&!error?'อัปเดตใน 2 นาที':temp?.updatedAt?'ข้อมูลเก่า / ตรวจสอบเพิ่ม':'ยังไม่มีข้อมูล','ไม่ใช้แทนสถานะออนไลน์ของบอร์ด'],['Wi-Fi / IP','โค้ดเดิมยังไม่ส่งค่า','ดูผ่าน diagnostics หลังอัปโหลดโค้ดใหม่']].map(([label,value,sub])=><section key={label}><span>{label}</span><strong>{value}</strong><small>{sub}</small></section>)}</div>
 <section className="panel"><h3><Droplets size={22}/> ค่าปั๊มและวาล์วที่เก็บใน Cloud</h3><p className="muted small">ค่าล่าสุดของตัวแปร ไม่ใช่การยืนยันการไหลของน้ำหรือสถานะรีเลย์ ณ ปัจจุบัน</p><div className="irrigationPump"><div><b>ปั๊มน้ำ · GPIO16</b><span>{relay('relay8')} · อัปเดต {stamp(prop('relay8')?.updatedAt)}</span></div></div><div className="irrigationZones">{['A','B','C','D','E','F','G'].map((letter,i)=><article className="irrigationReadZone" key={letter}><h3>โซนบน {letter}</h3><strong>{relay('relay'+(i+1))}</strong><p className="small muted">Zone{i+1} · อัปเดต {stamp(prop('relay'+(i+1))?.updatedAt)}</p></article>)}</div><p className="small muted">ระบบนี้ไม่มีปุ่มสั่งงาน และจะไม่เปลี่ยนการรดน้ำเดิม</p></section>
 </div>;
}
