# Durian Orchard — ระบบบริหารสวนทุเรียน

เว็บใช้งาน: https://durian-orchard-art.siwat-t36.chatgpt.site
โค้ด: https://github.com/arty2525/durian-orchard-
ฐานข้อมูลและรูปภาพ: Supabase project `durian-orchard`

ระบบทะเบียนต้นและผลพร้อม QR, รหัสต้นอัตโนมัติ, ปฏิทิน/ข้อมูลเฉพาะปี, กล้องมือถือ, ประวัติการดูแล, ผลผลิตรายปี และทีมงาน 5 คน
API ใช้ Supabase PostgreSQL และ Storage แล้ว การล็อกอินเปลี่ยนเป็นอีเมล/รหัสผ่านของเว็บสวน ไม่ใช้บัญชี ChatGPT
เว็บยังเผยแพร่ที่ URL เดิม จึงไม่กระทบลิงก์ QR

## เริ่มใช้

1. แอดมิน/ทีมงานกดเข้าสู่ระบบ แล้วเลือกสมัครครั้งแรกด้วยอีเมลที่ได้รับสิทธิ์
2. ยืนยันอีเมล แล้วกลับมาเข้าสู่ระบบด้วยรหัสผ่านของตนเอง
3. แอดมินสร้างทะเบียน 400 ต้น หรือเพิ่มต้นทีละต้น ระบบออกรหัสอัตโนมัติ
4. ลูกค้าสแกน QR ดูที่มาได้โดยไม่ต้องสมัครบัญชี

ตรวจการส่งอีเมลและ URL Configuration ใน Supabase ก่อนใช้ signup/recovery จริง ดู [database/README.md](database/README.md)
ข้อมูลจริงและข้อมูลลับไม่รวมใน repository

## ติดตั้งและทดสอบ

Node.js 22.13+ / pnpm 11

```sh
pnpm install --frozen-lockfile
pnpm exec tsc --noEmit
node scripts/test-server.mjs
node scripts/test-record-inputs.mjs
pnpm build
```

ตั้ง SUPABASE_URL และ SUPABASE_PUBLISHABLE_KEY ฝั่งโฮสต์ ห้ามใช้ service_role ในเบราว์เซอร์
ดู database/ สำหรับโครงสร้างและการทดสอบ SQL
