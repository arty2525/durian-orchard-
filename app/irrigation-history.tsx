'use client';
import {useEffect,useState} from 'react';
import {getAuth} from './orchard-auth';
import './irrigation-history.css';
type Day={day:string;channel:string;on_minutes:number;coverage_minutes:number;opens:number;closes:number};
type Event={observed_at:string;channel:string;is_on:boolean};
type Report={from:string;to:string;firstSample:string|null;latestSample:string|null;days:Day[];events:Event[]};
const label=(s:string)=>s==='relay8'?'ปั๊มน้ำ':'โซนบน '+String.fromCharCode(64+Number(s.slice(5)));
const time=(s:string|null)=>s?new Date(s).toLocaleString('th-TH',{timeZone:'Asia/Bangkok'}):'ยังไม่มีข้อมูล';
export function IrrigationHistory(){
 const [data,setData]=useState<Report|null>(null),[channel,setChannel]=useState('relay8'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[selected,setSelected]=useState('');
 async function load(){setBusy(true);setError('');try{const c=await getAuth();const r=await c.rpc('orchard_irrigation_report');if(r.error)throw r.error;setData(r.data as Report);}catch{setError('โหลดประวัติไม่ได้ กรุณาเข้าสู่ระบบทีมงานแล้วลองอีกครั้ง')}finally{setBusy(false)}}
 useEffect(()=>{load();const t=setInterval(()=>{if(document.visibilityState==='visible')load()},60000);return()=>clearInterval(t)},[]);
 const days=(data?.days||[]).filter(d=>d.channel===channel),total=days.reduce((a,d)=>a+d.on_minutes,0),coverage=days.reduce((a,d)=>a+d.coverage_minutes,0),opens=days.reduce((a,d)=>a+Number(d.opens),0),closes=days.reduce((a,d)=>a+Number(d.closes),0);
 const max=Math.max(1,...days.map(d=>d.on_minutes)),chosen=days.find(d=>d.day===selected),events=(data?.events||[]).filter(e=>e.channel===channel);
 return <section className="panel waterHistory"><div className="sectionHead"><div><span className="muted small">ประวัติการรดน้ำ</span><h3>เปิด–ปิดน้ำย้อนหลัง 1 เดือน</h3><p className="small muted">30 วันล่าสุด · เวลาไทย · เก็บอัตโนมัติทุกนาทีแม้ปิดหน้าเว็บ</p></div><button type="button" disabled={busy} onClick={load}>{busy?'กำลังโหลด…':'อัปเดตกราฟ'}</button></div>
 <div className="waterTabs" role="group" aria-label="เลือกปั๊มหรือโซน">{[8,1,2,3,4,5,6,7].map(n=><button key={n} type="button" aria-pressed={channel==='relay'+n} onClick={()=>{setChannel('relay'+n);setSelected('')}}>{label('relay'+n)}</button>)}</div>
 {error&&<p className="alert" role="alert">{error}</p>}
 <div className="waterStats"><div><small>เวลาเปิดโดยประมาณ</small><b>{coverage?total.toLocaleString('th-TH',{maximumFractionDigits:1}):'—'} <small>นาที</small></b></div><div><small>พบการเปลี่ยนเป็นเปิด</small><b>{coverage?opens:'—'} <small>ครั้ง</small></b></div><div><small>พบการเปลี่ยนเป็นปิด</small><b>{coverage?closes:'—'} <small>ครั้ง</small></b></div><div><small>ช่วงเวลาที่อ่านข้อมูลได้</small><b>{(coverage/60).toLocaleString('th-TH',{maximumFractionDigits:1})} <small>ชั่วโมง</small></b></div></div>
 {!data?.firstSample&&<p className="irrigationNotice">ยังไม่มีประวัติ กรุณาตั้งค่า Arduino Cloud ก่อน ระบบจะเริ่มสะสมข้อมูลจริงให้อัตโนมัติ ไม่มีการสร้างข้อมูลย้อนหลังแทนวันที่ขาดหาย</p>}
 <p><b>{label(channel)} · นาทีที่เปิดในแต่ละวัน</b></p><div className="waterChart" aria-label="กราฟเวลาเปิดน้ำรายวัน"><div className="waterBars">{days.map(d=><button type="button" key={d.day} className={selected===d.day?'selected':''} aria-label={`${d.day}: ${d.coverage_minutes?d.on_minutes+' นาที':'ไม่มีข้อมูล'}`} onClick={()=>setSelected(d.day)}><span className={'waterBar '+(!d.coverage_minutes?'unknown':'')} style={{height:d.coverage_minutes?Math.max(3,d.on_minutes/max*150):6}}/><small>{d.day.slice(8)}</small></button>)}</div></div><p className="small muted">แท่งสีเขียว = เวลาเปิดที่ประมาณได้ · ขีดสีเทา = ไม่มีข้อมูล · แตะวันเพื่อดูรายละเอียด</p>
 {chosen&&<div className="irrigationNotice" role="status">{chosen.day} · {chosen.coverage_minutes?`เปิดประมาณ ${chosen.on_minutes} นาที / มีข้อมูล ${chosen.coverage_minutes} นาที · พบเปิด ${chosen.opens} ครั้ง ปิด ${chosen.closes} ครั้ง`:'ไม่มีข้อมูลในวันนี้'}</div>}
 <details><summary>ดูรายละเอียดรายวัน</summary><div className="waterTable"><table><thead><tr><th>วันที่</th><th>เปิด (นาที)</th><th>เปิด / ปิด</th><th>มีข้อมูล (นาที)</th></tr></thead><tbody>{[...days].reverse().map(d=><tr key={d.day}><td>{d.day}</td><td>{d.coverage_minutes?d.on_minutes:'—'}</td><td>{d.coverage_minutes?`${d.opens} / ${d.closes}`:'—'}</td><td>{d.coverage_minutes||'—'}</td></tr>)}</tbody></table></div></details>
 <details><summary>รายการเปลี่ยนสถานะล่าสุด · {label(channel)}</summary><p className="small muted">กรองจาก 100 รายการล่าสุดของทุกโซน · เวลาที่ตรวจพบจาก Cloud</p>{events.length?<div className="waterEvents">{events.map((e,i)=><div key={i}><span>{time(e.observed_at)}</span><b>{e.is_on?'เปิด':'ปิด'}</b></div>)}</div>:<p className="muted">ยังไม่พบรายการเปลี่ยนสถานะ</p>}</details>
 <p className="small muted">เริ่มมีประวัติ: {time(data?.firstSample||null)}<br/>อ่านสำเร็จล่าสุด: {time(data?.latestSample||null)}</p><p className="small muted">รายงานนี้อ้างอิงสถานะตัวแปรใน Cloud ไม่ยืนยันน้ำไหลจริง เวลาเปิดคำนวณเฉพาะระหว่างตัวอย่างที่ห่างกันไม่เกิน 2.5 นาที ช่วงขาดการเชื่อมต่อจะไม่นับต่อ และอาจไม่พบการเปิด–ปิดที่เกิดระหว่างรอบอ่าน ข้อมูลก่อนเริ่มเก็บยังไม่มีในรายงาน</p>
 </section>;
}
