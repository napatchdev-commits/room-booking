import { getAdminClient } from '@/lib/supabase/admin';

export interface LineNotificationResult {
  success: boolean;
  error?: string;
  method?: 'MESSAGING_API' | 'LINE_NOTIFY';
}

/**
 * Send a notification to Admin via LINE Messaging API (Push Message) or LINE Notify
 */
export async function sendLineAdminNotification(
  messageText: string,
  overrideTokens?: {
    channelAccessToken?: string;
    adminUserId?: string;
    notifyToken?: string;
  }
): Promise<LineNotificationResult> {
  try {
    const supabase = getAdminClient();
    const { data: settings } = await supabase.from('settings').select('*').limit(1).maybeSingle();

    const channelAccessToken =
      overrideTokens?.channelAccessToken ||
      process.env.LINE_CHANNEL_ACCESS_TOKEN ||
      settings?.line_channel_access_token;

    const adminUserId =
      overrideTokens?.adminUserId ||
      process.env.LINE_ADMIN_USER_ID ||
      settings?.line_admin_user_id;

    const notifyToken =
      overrideTokens?.notifyToken ||
      process.env.LINE_NOTIFY_TOKEN ||
      settings?.line_notify_token;

    if (!channelAccessToken && !notifyToken) {
      return {
        success: false,
        error: 'ยังไม่ได้ระบุ LINE Channel Access Token หรือ LINE Notify Token',
      };
    }

    // 1. Method 1: LINE Messaging API Push Message
    if (channelAccessToken && adminUserId) {
      try {
        const cleanUserId = adminUserId.trim();
        const cleanToken = channelAccessToken.trim();

        const pushRes = await fetch('https://api.line.me/v2/bot/message/push', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${cleanToken}`,
          },
          body: JSON.stringify({
            to: cleanUserId,
            messages: [
              {
                type: 'text',
                text: messageText,
              },
            ],
          }),
        });

        if (pushRes.ok) {
          return { success: true, method: 'MESSAGING_API' };
        }

        const errData = await pushRes.json().catch(() => ({}));
        const lineErrMsg = errData.message || (errData.details ? JSON.stringify(errData.details) : `HTTP ${pushRes.status}`);

        // If notifyToken exists as backup, try method 2, otherwise return clear error
        if (!notifyToken) {
          if (pushRes.status === 401) {
            return { success: false, error: 'LINE Access Token ไม่ถูกต้อง หรือหมดอายุแล้ว (401 Unauthorized)' };
          }
          if (pushRes.status === 400) {
            return { success: false, error: `LINE API แจ้งข้อผิดพลาด: ${lineErrMsg} (กรุณาตรวจสอบ LINE Admin User ID และตรวจว่าคุณได้เพิ่มเพื่อนกับ LINE Bot นี้แล้วหรือยัง)` };
          }
          return { success: false, error: `ส่งผ่าน LINE Messaging API ไม่สำเร็จ: ${lineErrMsg}` };
        }
      } catch (pushErr: any) {
        console.error('LINE Push API request error:', pushErr);
        if (!notifyToken) {
          return { success: false, error: `เกิดข้อผิดพลาดในการเชื่อมต่อ LINE: ${pushErr.message}` };
        }
      }
    } else if (channelAccessToken && !adminUserId && !notifyToken) {
      return {
        success: false,
        error: 'กรุณาระบุ LINE Admin User ID สำหรับรับข้อความแจ้งเตือน (ขึ้นต้นด้วย U...)',
      };
    }

    // 2. Method 2: LINE Notify
    if (notifyToken) {
      try {
        const cleanNotifyToken = notifyToken.trim();
        const notifyRes = await fetch('https://notify-api.line.me/api/notify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Bearer ${cleanNotifyToken}`,
          },
          body: new URLSearchParams({ message: messageText }).toString(),
        });

        if (notifyRes.ok) {
          return { success: true, method: 'LINE_NOTIFY' };
        }

        const nErrData = await notifyRes.json().catch(() => ({}));
        return {
          success: false,
          error: `LINE Notify แจ้งข้อผิดพลาด: ${nErrData.message || `HTTP ${notifyRes.status}`}`,
        };
      } catch (nErr: any) {
        return { success: false, error: `LINE Notify เชื่อมต่อไม่สำเร็จ: ${nErr.message}` };
      }
    }

    return {
      success: false,
      error: 'กรุณาระบุ LINE Admin User ID เพื่อส่งข้อความผ่าน Messaging API',
    };
  } catch (err: any) {
    console.error('sendLineAdminNotification error:', err);
    return { success: false, error: `เกิดข้อผิดพลาดภายในระบบ: ${err.message}` };
  }
}
