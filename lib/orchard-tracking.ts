type RecordData=Record<string,any>;
const fullDate=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
function addDays(s:string,n:number){const d=new Date(s+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
function addYear(s:string){const d=new Date(s+'T12:00:00Z'),year=d.getUTCFullYear()+1,month=d.getUTCMonth(),day=d.getUTCDate();d.setUTCDate(1);d.setUTCFullYear(year);d.setUTCMonth(month);const last=new Date(Date.UTC(year,month+1,0)).getUTCDate();d.setUTCDate(Math.min(day,last));return d.toISOString().slice(0,10)}
export function trackingFor(entity:RecordData,photos:RecordData[],today:string){
 const tree=entity.type==='tree'||/^D\d+$/.test(entity.id||'');
 if(!tree&&(entity.harvest||['harvested','fallen','removed'].includes(entity.status)))return {kind:'finished',due:false,date:'',label:'สิ้นสุดการติดตามผลแล้ว'};
 if(!tree&&!fullDate(entity.setDate||''))return {kind:'missing',due:false,date:'',label:'ระบุวันที่ติดผลเพื่อคำนวณรอบถ่ายภาพทุก 14 วัน'};
 const valid=photos.filter(p=>p.entity===entity.id&&p.date&&p.date<=today&&(tree?((fullDate(p.date)||/^\d{4}$/.test(p.date))&&p.circumference!=null&&p.height!=null):(fullDate(p.date)&&p.date>=entity.setDate))).sort((a,b)=>b.date.localeCompare(a.date));
 const last=valid[0]?.date||'';
 if(tree&&!last)return {kind:'first',due:true,date:today,label:'เริ่มบันทึกภาพพร้อมขนาดต้นประจำปี'};
 const date=tree?(last.length===4?String(Number(last)+1):addYear(last)):addDays(last||entity.setDate,14);
 return {kind:'scheduled',due:date.length===4?today.slice(0,4)>=date:today>=date,date,label:tree?'ถ่ายภาพและวัดขนาดต้นปีละครั้ง':'ถ่ายภาพผลทุก 14 วัน'};
}
