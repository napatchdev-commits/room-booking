import type { Metadata, Viewport } from 'next';
import './globals.css';
import { LiffProvider } from '@/components/providers/LiffProvider';

export const metadata: Metadata = {
  title: 'Resort Room Booking | ระบบจองห้องพักผ่าน LINE',
  description: 'ระบบจองห้องพักรีสอร์ทสไตล์ Agoda ผ่าน LINE LIFF พร้อมระบบชำระเงินและออกใบเสร็จจริง',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className="antialiased min-h-screen bg-slate-50 text-slate-900 flex flex-col">
        <LiffProvider>
          {children}
        </LiffProvider>
      </body>
    </html>
  );
}
