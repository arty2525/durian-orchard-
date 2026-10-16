# สถานะการเชื่อมต่อ Supabase

เว็บเปลี่ยน API จาก D1/R2 ไปเป็น Supabase PostgreSQL/Storage แล้ว และใช้ email/password ผ่าน Supabase Auth
ตรวจข้อมูลเดิมพบ 0 records, 0 audit, 0 counters จึงไม่มีข้อมูลจริงหรือไฟล์ที่ต้องนำเข้า
รหัสใหม่เริ่ม D0001

เว็บยังเผยแพร่ URL เดิม การย้ายโฮสต์ภายนอกเป็นอีกขั้นหนึ่ง ไม่ได้เปิด GitHub Pages ในงานนี้

ยังต้องตรวจ Auth URL Configuration และ SMTP ใน Supabase Dashboard และทดสอบการสมัคร/ยืนยันอีเมล/กู้รหัสผ่านกับบัญชีจริง ดู database/README.md

การทดสอบสิทธิ์และการบันทึกแบบ atomic ผ่านแล้ว ไม่สร้างบัญชีแอดมินชั่วคราวหรือรหัสผ่านให้ผู้ใช้
