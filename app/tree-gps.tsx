'use client';
import {useEffect,useRef,useState} from 'react';
import './tree-gps.css';

type Coordinates={latitude?:number|null;longitude?:number|null;accuracy?:number|null};
const mapUrl=(lat:number,lng:number)=>`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
export function TreeGpsFields({latitude,longitude,accuracy}:Coordinates){
 const [lat,setLat]=useState(latitude?.toString()||'');
 const [lng,setLng]=useState(longitude?.toString()||'');
 const [precision,setPrecision]=useState<number|null>(accuracy??null);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const active=useRef(true);
 useEffect(()=>{active.current=true;return()=>{active.current=false}},[]);
 function locate(){
  if(!navigator.geolocation){setMessage('อุปกรณ์นี้ไม่รองรับการอ่านตำแหน่ง กรุณากรอกพิกัดเอง');return}
  setBusy(true);setMessage('กำลังอ่านตำแหน่ง กรุณายืนข้างต้นที่ต้องการบันทึก');
  navigator.geolocation.getCurrentPosition(p=>{
   if(!active.current)return;
   setLat(p.coords.latitude.toFixed(7));setLng(p.coords.longitude.toFixed(7));
   setPrecision(p.coords.accuracy);setBusy(false);
   setMessage('อ่านตำแหน่งแล้ว กรุณากดบันทึกเพื่อเก็บพิกัดของต้นนี้');
  },e=>{
   if(!active.current)return;
   setBusy(false);setMessage(e.code===1?'ยังไม่ได้รับอนุญาตตำแหน่ง กรุณาเปิดสิทธิ์ตำแหน่งของเว็บในเบราว์เซอร์ หรือกรอกพิกัดเอง':e.code===3?'อ่านตำแหน่งไม่ทันเวลา ลองใหม่ในที่โล่งหรือกรอกพิกัดเอง':'อ่านตำแหน่งไม่ได้ กรุณาเปิดบริการตำแหน่งของเครื่อง หรือกรอกพิกัดเอง');
  },{enableHighAccuracy:true,timeout:20000,maximumAge:0});
 }
 const valid=lat.trim()!==''&&lng.trim()!==''&&Number.isFinite(Number(lat))&&Number.isFinite(Number(lng))&&Math.abs(Number(lat))<=90&&Math.abs(Number(lng))<=180;
 return <fieldset className="full treeGps"><legend>พิกัด GPS ประจำจุดปลูก</legend>
  <p className="small muted">ยืนข้างต้นแล้วกดใช้ตำแหน่งปัจจุบัน หรือกรอกพิกัดเอง · 1 พิกัดต่อจุดปลูก</p>
  <div className="gpsFields"><label className="field">ละติจูด<input name="latitude" type="number" step="any" min={-90} max={90} inputMode="decimal" value={lat} readOnly={busy} required={lng!==''} onChange={e=>{setLat(e.target.value);setPrecision(null);setMessage('')}}/></label>
  <label className="field">ลองจิจูด<input name="longitude" type="number" step="any" min={-180} max={180} inputMode="decimal" value={lng} readOnly={busy} required={lat!==''} onChange={e=>{setLng(e.target.value);setPrecision(null);setMessage('')}}/></label></div>
  <input type="hidden" name="gpsAccuracy" value={precision??''}/>
  <div className="gpsActions"><button type="button" onClick={locate} disabled={busy}>{busy?'กำลังอ่านตำแหน่ง…':'ใช้ตำแหน่งปัจจุบัน'}</button>{valid&&<a href={mapUrl(Number(lat),Number(lng))} target="_blank" rel="noopener noreferrer">ดูบน Google Maps</a>}{(lat||lng)&&<button type="button" disabled={busy} onClick={()=>{setLat('');setLng('');setPrecision(null);setMessage('กดบันทึกเพื่อล้างพิกัดของต้นนี้')}}>ล้างพิกัด</button>}</div>
  {precision!==null&&<p className="small">ความคลาดเคลื่อนประมาณ ±{Math.round(precision)} เมตร{precision>20?' · ตำแหน่งยังคลาดเคลื่อนมาก ลองอ่านใหม่ในที่โล่ง':''}</p>}
  {message&&<p className="small" role="status">{message}</p>}
 </fieldset>;
}
export function TreeGpsSummary({latitude,longitude,accuracy,onEdit}:Coordinates&{onEdit:()=>void}){
 const ready=latitude!=null&&longitude!=null;
 return <section className="panel"><div className="sectionHead"><h3>พิกัด GPS ประจำจุดปลูก</h3><button type="button" onClick={onEdit}>{ready?'แก้ไขพิกัด':'กำหนดพิกัด GPS'}</button></div>{ready?<><p>{Number(latitude).toFixed(7)}, {Number(longitude).toFixed(7)}</p>{accuracy!=null&&<p className="small muted">ความคลาดเคลื่อนตอนอ่านประมาณ ±{Math.round(accuracy)} เมตร</p>}<a href={mapUrl(latitude,longitude)} target="_blank" rel="noopener noreferrer">เปิดตำแหน่งบน Google Maps</a></>:<p className="muted">ยังไม่ได้บันทึกพิกัดของจุดปลูกนี้</p>}</section>;
}
