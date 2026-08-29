import { NextRequest, NextResponse } from 'next/server';
import { sendLineAdminNotification } from '@/lib/line-notify';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { channelAccessToken, adminUserId, notifyToken } = body;

    const testMsg = `🔔 ทดสอบการแจ้งเตือนจากระบบรีสอร์ท (สมบัติ รีสอร์ท)!\n\n📅 วันที่ & เวลา: ${new Date().toLocaleString('th-TH')}\n✅ ระบบเชื่อมต่อ LINE Bot สำเร็จเรียบร้อยแล้ว 100%\n\nเมื่อมีลูกค้ากดจองห้องพักหรือแนบสลิปชำระเงิน ระบบจะส่งข้อความแจ้งเตือนมายัง LINE นี้ทันทีครับ ✨`;

    const result = await sendLineAdminNotification(testMsg, {
      channelAccessToken,
      adminUserId,
      notifyToken,
    });

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || 'ไม่สามารถส่งข้อความแจ้งเตือนได้',
      });
    }

    const methodDesc = result.method === 'MESSAGING_API' ? 'LINE Messaging API' : 'LINE Notify';
    return NextResponse.json({
      success: true,
      message: `ส่งข้อความแจ้งเตือนไปยัง LINE สำเร็จแล้ว (ผ่าน ${methodDesc})! ตรวจสอบข้อความใน LINE ของคุณได้เลยครับ 🎉`,
    });
  } catch (error: any) {
    console.error('Notification test error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
