'use client';
import {useEffect,useRef,useState} from 'react';
import './delete-confirmation.css';
export function DeleteConfirmation({label,detail,onCancel,onConfirm}:{label:string;detail?:string;onCancel:()=>void;onConfirm:()=>Promise<void>}){
 const dialog=useRef<HTMLDialogElement>(null),cancel=useRef<HTMLButtonElement>(null),sending=useRef(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null;dialog.current?.showModal();cancel.current?.focus();return()=>{dialog.current?.close();if(previous?.isConnected)previous.focus()}},[]);
 async function confirmDelete(){if(sending.current)return;sending.current=true;setBusy(true);setError('');try{await onConfirm();onCancel()}catch(e){setError(e instanceof Error?e.message:'ลบไม่สำเร็จ กรุณาลองใหม่')}finally{sending.current=false;setBusy(false)}}
 return <dialog ref={dialog} className="deleteConfirmation" aria-labelledby="delete-confirm-title" aria-describedby="delete-confirm-description" onCancel={e=>{e.preventDefault();if(!sending.current)onCancel()}}>
  <div className="deleteConfirmIcon" aria-hidden="true">!</div><h2 id="delete-confirm-title">ยืนยันการลบรายการนี้?</h2>
  <div className="deleteConfirmRecord"><b>{label}</b>{detail&&<p>{detail}</p>}</div>
  <p id="delete-confirm-description">ตรวจสอบรายการก่อนลบ กด “ยกเลิก” เพื่อเก็บรายการนี้ไว้ หรือกด “ยืนยันลบ” เพื่อดำเนินการ</p>
  {error&&<p className="alert" role="alert">{error}</p>}
  <div className="deleteConfirmActions"><button ref={cancel} type="button" disabled={busy} onClick={onCancel}>ยกเลิก</button><button type="button" className="deleteConfirmSubmit" disabled={busy} onClick={confirmDelete}>{busy?'กำลังลบ…':'ยืนยันลบ'}</button></div>
 </dialog>;
}
