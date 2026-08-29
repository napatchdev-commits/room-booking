import { NextRequest, NextResponse } from 'next/server';
import { sendLineAdminNotification } from '@/lib/line-notify';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const testMsg = `🔔 ทดสอบการแจ้งเตือนจากระบบรีสอร์ท!\n\n📅 เวลา: ${new Date().toLocaleString('th-TH')}\n✅ ระบบเชื่อมต่อ LINE Bot สำเร็จเรียบร้อยแล้ว\n\nเมื่อมีลูกค้าจองห้องพักหรือแนบสลิปโอนเงิน ระบบจะแจ้งเตือนมายัง LINE นี้โดยอัตโนมัติครับ ✨`;
    const result = await sendLineAdminNotification(testMsg);

    if (!result) {
      return NextResponse.json({
        success: false,
        error: 'ไม่สามารถส่งข้อความได้ กรุณาตรวจสอบว่าใส่ LINE Channel Access Token และ Admin User ID (หรือ LINE Notify Token) ถูกต้องแล้ว',
      });
    }

    return NextResponse.json({ success: true, message: 'ส่งข้อความแจ้งเตือนไปยัง LINE สำเร็จ!' });
  } catch (error) {
    console.error('Notification test error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
