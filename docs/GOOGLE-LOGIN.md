# ตั้งค่าเข้าสู่ระบบด้วย Google

ปุ่มบนหน้าเว็บพร้อมแล้ว แต่สถานะ Google provider ที่ตรวจเมื่อ 17 ตุลาคม 2569 ยังเป็น false ต้องตั้งค่าด้านล่างก่อนทดสอบการเข้าสู่ระบบจริง

1. เปิด https://console.cloud.google.com/auth/overview เลือกหรือสร้างโปรเจกต์ของสวน แล้วตั้ง Branding และ Audience (ระหว่าง Testing ต้องเพิ่มบัญชีทีมงานเป็น Test users)
2. สร้าง OAuth Client ที่ https://console.cloud.google.com/auth/clients/create เลือก Web application
3. Authorized JavaScript origins: `https://arty2525.github.io`
4. Authorized redirect URIs: `https://wusuaisvzsmyamkptnnq.supabase.co/auth/v1/callback`
5. เก็บ Client ID และ Client Secret ที่สร้างไว้ใน Supabase เท่านั้น: https://supabase.com/dashboard/project/wusuaisvzsmyamkptnnq/auth/providers?provider=Google เปิด Google provider ใส่ทั้งสองค่า แล้ว Save ห้าม commit Client Secret ลง repository
6. ที่ Supabase Authentication → URL Configuration เพิ่ม Redirect URL `https://arty2525.github.io/durian-orchard-/` ให้ตรงรวมเครื่องหมาย / ท้าย URL
7. ทดสอบเลือกบัญชี Google ของแอดมินและทีมงาน จากนั้นทดสอบบัญชีที่ไม่มีสิทธิ์ว่าจะดูได้อย่างเดียว การเข้าสู่ระบบ Google ไม่ได้ให้สิทธิ์แก้ข้อมูลสวนอัตโนมัติ

ขอเฉพาะข้อมูลพื้นฐาน openid, email, profile ไม่ขอสิทธิ์ Gmail หรือ Drive และไม่ต้องเปิด offline access

อ้างอิง: https://supabase.com/docs/guides/auth/social-login/auth-google
