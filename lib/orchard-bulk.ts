import {who,response,fail} from './orchard-records';
export async function bulkPOST(req:Request,db:any){
 if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return response({error:'คำขอไม่ถูกต้อง'},403);
 try{if(!(await who(req,db))?.edit)return response({error:'กรุณาเข้าสู่ระบบด้วยบัญชีทีมงาน'},403);
  const b:any=await req.json();if(!Array.isArray(b.ids)||b.ids.length>10000||b.ids.some((id:any)=>typeof id!=='string'||id.length>100))return response({error:'รายการที่เลือกไม่ถูกต้อง'},400);
  const r=await db.rpc('orchard_bulk',{p_kind:b.kind,p_ids:b.ids,p_data:b.data||{},p_save_defaults:b.saveDefaults===true,p_apply:b.apply!==false});if(r.error)throw r.error;return response(r.data);
 }catch(e){return fail(e)}
}
