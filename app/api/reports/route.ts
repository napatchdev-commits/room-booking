import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
import { format } from 'date-fns';

export async function GET(req: NextRequest) {
  try {
    const supabase = getAdminClient();
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    // Execute all report queries in parallel for ultra-fast performance
    const [
      roomsRes,
      activeTodayBookingsRes,
      todayCheckInsRes,
      todayCheckOutsRes,
      todayNewBookingsRes,
      allValidBookingsRes,
      pendingPaymentsRes,
      bookingItemsRes,
    ] = await Promise.all([
      supabase.from('rooms').select('id, status, price_per_night, room_type_id'),
      supabase
        .from('bookings')
        .select('id, status, check_in_date, check_out_date, booking_items(room_id)')
        .in('status', ['PENDING', 'CONFIRMED', 'CHECKED_IN'])
        .lte('check_in_date', todayStr)
        .gt('check_out_date', todayStr),
      supabase
        .from('bookings')
        .select('id')
        .eq('check_in_date', todayStr)
        .in('status', ['CONFIRMED', 'PENDING', 'CHECKED_IN']),
      supabase
        .from('bookings')
        .select('id')
        .eq('check_out_date', todayStr)
        .in('status', ['CHECKED_IN', 'CONFIRMED']),
      supabase
        .from('bookings')
        .select('id, net_total')
        .gte('created_at', `${todayStr}T00:00:00.000Z`),
      supabase
        .from('bookings')
        .select('id, subtotal_amount, promotion_discount, manual_discount, net_total, paid_amount, remaining_balance, status, created_at')
        .neq('status', 'CANCELLED'),
      supabase
        .from('payments')
        .select('id, amount')
        .eq('status', 'PENDING'),
      supabase
        .from('booking_items')
        .select('room_name, room_number, item_subtotal, booking:bookings!inner(status)')
        .neq('booking.status', 'CANCELLED'),
    ]);

    const allRooms = roomsRes.data || [];
    const totalRooms = allRooms.length;
    const maintenanceRooms = allRooms.filter((r) => r.status === 'maintenance').length;

    // 2. Active Bookings for Today Occupancy
    const bookedTodayRoomIds = new Set<string>();
    activeTodayBookingsRes.data?.forEach((b) => {
      (b.booking_items as unknown as { room_id: string }[])?.forEach((item) => {
        if (item.room_id) bookedTodayRoomIds.add(item.room_id);
      });
    });

    const bookedRoomsCount = bookedTodayRoomIds.size;
    const availableRoomsCount = Math.max(0, totalRooms - maintenanceRooms - bookedRoomsCount);

    // 3. Financial Totals & Counts
    const todayCheckIns = todayCheckInsRes.data || [];
    const todayCheckOuts = todayCheckOutsRes.data || [];
    const todayNewBookings = todayNewBookingsRes.data || [];
    const allValidBookings = allValidBookingsRes.data || [];
    const pendingPayments = pendingPaymentsRes.data || [];
    const bookingItems = bookingItemsRes.data || [];

    const totalRevenue = allValidBookings.reduce((sum, b) => sum + Number(b.net_total || 0), 0);
    const totalPaid = allValidBookings.reduce((sum, b) => sum + Number(b.paid_amount || 0), 0);
    const totalOutstanding = allValidBookings.reduce((sum, b) => sum + Number(b.remaining_balance || 0), 0);
    const totalPromoDiscounts = allValidBookings.reduce((sum, b) => sum + Number(b.promotion_discount || 0), 0);
    const totalManualDiscounts = allValidBookings.reduce((sum, b) => sum + Number(b.manual_discount || 0), 0);
    const pendingPaymentsCount = pendingPayments.length;
    const pendingPaymentsAmount = pendingPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const roomStatsMap: Record<string, { roomName: string; count: number; totalRevenue: number }> = {};
    bookingItems?.forEach((item) => {
      const key = `${item.room_name} (${item.room_number})`;
      if (!roomStatsMap[key]) {
        roomStatsMap[key] = { roomName: key, count: 0, totalRevenue: 0 };
      }
      roomStatsMap[key].count += 1;
      roomStatsMap[key].totalRevenue += Number(item.item_subtotal || 0);
    });

    const popularRooms = Object.values(roomStatsMap).sort((a, b) => b.count - a.count).slice(0, 5);

    // 7. Monthly Revenue Breakdown (Last 6 Months)
    const monthlyRevenueMap: Record<string, number> = {};
    allValidBookings?.forEach((b) => {
      const monthKey = format(new Date(b.created_at), 'MMM yyyy');
      monthlyRevenueMap[monthKey] = (monthlyRevenueMap[monthKey] || 0) + Number(b.net_total || 0);
    });

    return NextResponse.json({
      success: true,
      kpis: {
        totalRooms,
        availableRooms: availableRoomsCount,
        bookedRooms: bookedRoomsCount,
        maintenanceRooms,
        todayCheckIns: todayCheckIns?.length || 0,
        todayCheckOuts: todayCheckOuts?.length || 0,
        todayBookings: todayNewBookings?.length || 0,
        todayRevenue: (todayNewBookings || []).reduce((sum, b) => sum + Number(b.net_total || 0), 0),
        totalRevenue,
        totalPaid,
        totalOutstanding,
        totalPromoDiscounts,
        totalManualDiscounts,
        pendingPaymentsCount,
        pendingPaymentsAmount,
        totalBookingsCount: allValidBookings?.length || 0,
      },
      popularRooms,
      monthlyRevenue: Object.entries(monthlyRevenueMap).map(([month, revenue]) => ({ month, revenue })),
    });
  } catch (error) {
    console.error('Reports API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
