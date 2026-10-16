import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'สวนทุเรียน · Orchard',description:'ดูแลทุกต้น ติดตามทุกผล — ระบบบริหารสวนทุเรียนและตรวจสอบย้อนกลับ'};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="th"><body>{children}</body></html>}
