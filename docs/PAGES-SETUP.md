# เปิด GitHub Pages

1. เปิด https://github.com/arty2525/durian-orchard-/settings/pages
2. Source: Deploy from a branch
3. Branch: main, folder: /docs แล้วกด Save
4. รอการเผยแพร่สำเร็จใน Actions แล้วเปิด https://arty2525.github.io/durian-orchard-/

เว็บเป็น static SPA เชื่อม Supabase โดยตรงด้วย publishable key เท่านั้น ไม่มี service-role key ในเว็บ สิทธิ์จริงบังคับที่ RLS และ RPC ในฐานข้อมูล ไม่ใช่เพียงซ่อนปุ่ม

ใน Supabase Authentication → URL Configuration ให้เพิ่ม Redirect URLs:
- https://arty2525.github.io/durian-orchard-/
- https://arty2525.github.io/durian-orchard-/?recovery=1

เก็บ URL ของเว็บเดิมในรายการด้วยหากยังใช้งานอยู่ ต้องตรวจการส่งอีเมลยืนยัน/ลืมรหัสผ่านจริงก่อนเปิดใช้งานทีมงาน การเพิ่มอีเมลในทะเบียนแอดมินไม่ได้สร้างบัญชี Auth ให้อัตโนมัติ

แก้ซอร์สแล้วรัน `pnpm build:pages` และ commit โฟลเดอร์ docs พร้อมซอร์สเสมอ QR ใหม่ใช้ path ของ GitHub Pages; QR ที่พิมพ์ไว้ก่อนหน้านี้ยังชี้ไปเว็บเดิม
