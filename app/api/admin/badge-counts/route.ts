import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// High-speed optimized endpoint for Admin layout notifications and maintenance status
export async function GET(req: NextRequest) {
  try {
    const supabase = getAdminClient();

    // Run count queries with head: true for zero payload & microsecond latency
    const [pendingBookingsRes, pendingPaymentsRes, settingsRes] = await Promise.all([
      supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'PENDING'),
      supabase.from('payments').select('id', { count: 'exact', head: true }).eq('status', 'PENDING'),
      supabase.from('settings').select('is_maintenance_mode, policy_terms').eq('id', 'default').maybeSingle(),
    ]);

    let isMaintenance = settingsRes.data?.is_maintenance_mode ?? false;
    if (!isMaintenance && settingsRes.data?.policy_terms?.startsWith('{')) {
      try {
        const obj = JSON.parse(settingsRes.data.policy_terms);
        if (obj.maintenance?.enabled) isMaintenance = true;
      } catch {
        // ignore
      }
    }

    return NextResponse.json(
      {
        success: true,
        pendingBookings: pendingBookingsRes.count || 0,
        pendingPayments: pendingPaymentsRes.count || 0,
        isMaintenanceMode: isMaintenance,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          Pragma: 'no-cache',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Error' }, { status: 500 });
  }
}
