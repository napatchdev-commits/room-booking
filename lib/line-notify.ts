import { getAdminClient } from '@/lib/supabase/admin';

interface LineMessage {
  type: string;
  text?: string;
  [key: string]: unknown;
}

/**
 * Send a notification to Admin via LINE Messaging API (Push Message) or LINE Notify
 */
export async function sendLineAdminNotification(messageText: string) {
  try {
    const supabase = getAdminClient();
    const { data: settings } = await supabase.from('settings').select('*').limit(1).maybeSingle();

    const channelAccessToken =
      process.env.LINE_CHANNEL_ACCESS_TOKEN || settings?.line_channel_access_token;
    const adminUserId = process.env.LINE_ADMIN_USER_ID || settings?.line_admin_user_id;
    const notifyToken = process.env.LINE_NOTIFY_TOKEN || settings?.line_notify_token;

    let sent = false;

    // 1. Method 1: LINE Messaging API Push to Admin User ID (or broadcast)
    if (channelAccessToken && adminUserId) {
      try {
        const pushRes = await fetch('https://api.line.me/v2/bot/message/push', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${channelAccessToken}`,
          },
          body: JSON.stringify({
            to: adminUserId,
            messages: [
              {
                type: 'text',
                text: messageText,
              },
            ],
          }),
        });

        if (pushRes.ok) {
          console.log('LINE Push message sent to admin successfully');
          sent = true;
        } else {
          const errData = await pushRes.json();
          console.warn('LINE Push API returned error:', errData);
        }
      } catch (pushErr) {
        console.error('LINE Push API request failed:', pushErr);
      }
    }

    // 2. Method 2: LINE Notify Fallback if notifyToken is provided
    if (!sent && notifyToken) {
      try {
        const notifyRes = await fetch('https://notify-api.line.me/api/notify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Bearer ${notifyToken}`,
          },
          body: new URLSearchParams({ message: messageText }).toString(),
        });
        if (notifyRes.ok) {
          console.log('LINE Notify message sent successfully');
          sent = true;
        }
      } catch (nErr) {
        console.error('LINE Notify request failed:', nErr);
      }
    }

    return sent;
  } catch (err) {
    console.error('sendLineAdminNotification error:', err);
    return false;
  }
}
