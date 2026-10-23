'use client';
import {useEffect,useState,type ReactNode} from 'react';
import './mobile-app.css';
type InstallPrompt=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:string}>};
export function MobileApp({children}:{children:ReactNode}){
 const [prompt,setPrompt]=useState<InstallPrompt|null>(null),[installed,setInstalled]=useState(false),[offline,setOffline]=useState(false),[installing,setInstalling]=useState(false),[notice,setNotice]=useState('');
 useEffect(()=>{
  const media=window.matchMedia('(display-mode: standalone)');
  const sync=()=>setInstalled(media.matches||(navigator as Navigator&{standalone?:boolean}).standalone===true);
  const connection=()=>setOffline(!navigator.onLine);
  const offer=(event:Event)=>{event.preventDefault();setPrompt(event as InstallPrompt)};
  const done=()=>{setInstalled(true);setPrompt(null)};
  sync();connection();media.addEventListener('change',sync);window.addEventListener('online',connection);window.addEventListener('offline',connection);window.addEventListener('beforeinstallprompt',offer);window.addEventListener('appinstalled',done);
  if('serviceWorker' in navigator){const base=import.meta.env.BASE_URL;navigator.serviceWorker.register(base+'sw.js',{scope:base,updateViaCache:'none'}).catch(()=>{/* The online app remains usable when registration is unavailable. */});}
  return()=>{media.removeEventListener('change',sync);window.removeEventListener('online',connection);window.removeEventListener('offline',connection);window.removeEventListener('beforeinstallprompt',offer);window.removeEventListener('appinstalled',done)};
 },[]);
 async function install(){if(!prompt||installing)return;setInstalling(true);try{await prompt.prompt();const choice=await prompt.userChoice;setPrompt(null);setNotice(choice.outcome==='accepted'?'เลือกติดตั้งแล้ว หากยังไม่ปรากฏให้ตรวจเมนูของเบราว์เซอร์':'ติดตั้งภายหลังได้จากเมนูเบราว์เซอร์')}catch{setNotice('กรุณาติดตั้งผ่านเมนูเบราว์เซอร์ตามคำแนะนำด้านล่าง')}finally{setInstalling(false)}}
 return <>{offline&&<div className="mobileConnection" role="alert">ออฟไลน์ · ข้อมูลอาจเป็นข้อมูลเก่า กรุณาเชื่อมต่ออินเทอร์เน็ตก่อนบันทึกข้อมูลหรือสั่งรดน้ำ</div>}{children}<aside className="mobileInstall" aria-label="ติดตั้งแอปสวนทุเรียน">{installed?<p>● เปิดใช้งานในแอปสวนทุเรียน · ใช้ข้อมูลร่วมกับเว็บ</p>:<details><summary>ติดตั้งแอปสวนทุเรียนบนมือถือ <span>Android / iPhone</span></summary><div className="mobileInstallBody"><img src={import.meta.env.BASE_URL+'icons/orchard-192.png'} width="56" height="56" alt="ไอคอนสวนทุเรียน"/><div><h3>สวนของคุณ เปิดได้จากหน้าจอหลัก</h3><p>ใช้บัญชีทีมงานและข้อมูลชุดเดียวกับเว็บ</p></div>{prompt&&<button type="button" className="primary" disabled={installing} onClick={install}>{installing?'กำลังเปิดหน้าติดตั้ง…':'ติดตั้งแอป'}</button>}<ol><li><b>Android:</b> เปิดเว็บนี้ใน Chrome → เมนู ⋮ → ติดตั้งแอป หรือ เพิ่มลงในหน้าจอหลัก</li><li><b>iPhone / iPad:</b> เปิดเว็บนี้ใน Safari → แชร์ → เพิ่มไปยังหน้าจอโฮม → เปิดเป็นเว็บแอป หากมีตัวเลือก → เพิ่ม</li></ol><p className="mobileInstallHint">หากเปิดจาก LINE หรือแอปอื่น ให้เลือกเปิดใน Chrome หรือ Safari ก่อน การอ่านสถานะและสั่งรดน้ำต้องใช้อินเทอร์เน็ต</p>{notice&&<p role="status">{notice}</p>}</div></details>}</aside></>;
}
