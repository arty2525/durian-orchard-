# ฐานข้อมูลที่เชื่อมกับเว็บแล้ว

Project `durian-orchard` (`wusuaisvzsmyamkptnnq`), Singapore
Dashboard: https://supabase.com/dashboard/project/wusuaisvzsmyamkptnnq

API ของเว็บใช้ Supabase PostgreSQL ผ่าน RLS ด้วย access token ของผู้ใช้ ไม่มี service_role key ในเว็บ
รูปภาพใหม่ใช้ private bucket `orchard-photos` (8 MB, JPG/PNG/WebP) ภาพที่ไม่เผยแพร่ดูได้เฉพาะทีมงาน
การสมัคร เข้าสู่ระบบ ออกจากระบบ และลืมรหัสผ่านใช้ Supabase Auth แบบอีเมล/รหัสผ่าน

## บัญชีและอีเมล

สิทธิ์แอดมินอยู่ใน team_members บัญชีจริงต้องสมัครด้วยอีเมลที่ตรงกันและยืนยันอีเมลก่อน
ไม่สร้างรหัสผ่านเริ่มต้น ไม่แชร์บัญชี และไม่ส่งอีเมลสมัคร/เชิญโดยอัตโนมัติ
Supabase Auth เปิด email login, signup และ email confirmation แล้ว
ก่อนใช้งานลิงก์ยืนยัน/กู้รหัสผ่าน ให้ตรวจ Auth > URL Configuration:

- Site URL: `https://durian-orchard-art.siwat-t36.chatgpt.site`
- Redirect URLs: `https://durian-orchard-art.siwat-t36.chatgpt.site/` และ `https://durian-orchard-art.siwat-t36.chatgpt.site/?recovery=1`
- ควรตั้ง SMTP ที่รองรับอีเมลทีมงานจริงหากบริการส่งอีเมลเริ่มต้นจำกัดผู้รับ

การตรวจ SMTP/URL configuration ผ่านเครื่องมือเชื่อมต่อยังทำไม่ได้ จึงยังไม่ยืนยันการส่งอีเมลและลิงก์กลับเว็บจริง

## ข้อมูลเดิม

ตรวจฐานข้อมูล D1 เดิมแล้ว: 0 records, 0 audit, 0 counters และไม่มีภาพที่ลงทะเบียน จึงไม่มีข้อมูลจริงต้องย้าย
ฐานข้อมูลใหม่เริ่มออกรหัส D0001 ไม่เปลี่ยน URL QR ของเว็บ
ช่องทาง export ชั่วคราวถูกปิดและลบออกแล้ว ข้อมูลสำรองเดิมไม่ถูกลบ

## ตารางและคำสั่ง

schema.sql เป็น reference schema เดิม; connect.sql เพิ่ม atomic RPC และ legacy_audit
orchard_mutate ใช้ security invoker, ตรวจบทบาทและ revision, บันทึก notes/targets ในธุรกรรมเดียว
public_season_summary แยกผลที่ไว้บนต้นออกจากผลที่ลงทะเบียนแล้ว
ตรวจ RLS แอดมิน/ทีมงาน/ลูกค้า/บุคคลนอกทีมผ่าน verify.sql และ verify-commands.sql แบบ rollback

การตรวจอีเมลและบัญชีแอดมินจริงต้องให้เจ้าของอีเมลเป็นผู้สมัครและยืนยันด้วยตนเอง
