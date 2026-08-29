import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
import { calculateNights } from '@/lib/formatters';
import { calculatePromotionDiscount } from '@/lib/pricing';
import { logAuditEvent } from '@/lib/audit';
import { sendLineAdminNotification } from '@/lib/line-notify';
import { Promotion, Room } from '@/types/database';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const supabase = getAdminClient();

    let query = supabase
      .from('bookings')
      .select(`
        *,
        customer:customers(*),
        booking_items(*, room:rooms(*)),
        booking_discounts(*),
        payments(*),
        receipts(*)
      `)
      .order('created_at', { ascending: false });

    if (customerId) query = query.eq('customer_id', customerId);
    if (status && status !== 'ALL') query = query.eq('status', status);
    if (startDate) query = query.gte('check_in_date', startDate);
    if (endDate) query = query.lte('check_out_date', endDate);
    if (search) {
      query = query.or(`booking_number.ilike.%${search}%,customer.full_name.ilike.%${search}%,customer.phone.ilike.%${search}%`);
    }

    const { data: bookings, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, bookings });
  } catch (error) {
    console.error('Bookings GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      customerId: providedCustomerId,
      customerName,
      customerPhone,
      customerEmail,
      roomId,
      checkInDate,
      checkOutDate,
      numGuests = 1,
      promotionCode,
      notes,
      actorId,
      actorName,
    } = body;

    if (!roomId || !checkInDate || !checkOutDate) {
      return NextResponse.json({ error: 'Room ID and stay dates are required' }, { status: 400 });
    }

    const totalNights = calculateNights(checkInDate, checkOutDate);
    if (totalNights <= 0) {
      return NextResponse.json({ error: 'Check-out date must be strictly after Check-in date' }, { status: 400 });
    }

    const supabase = getAdminClient();

    // 1. Get/Create Customer
    let customerId = providedCustomerId;
    if (!customerId) {
      if (!customerName || !customerPhone) {
        return NextResponse.json({ error: 'Customer Name and Phone are required' }, { status: 400 });
      }

      // Find or insert customer by phone
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('phone', customerPhone)
        .maybeSingle();

      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        const { data: newCustomer, error: custErr } = await supabase
          .from('customers')
          .insert({
            full_name: customerName,
            phone: customerPhone,
            email: customerEmail || null,
          })
          .select()
          .single();

        if (custErr || !newCustomer) {
          return NextResponse.json({ error: 'Failed to create customer record' }, { status: 500 });
        }
        customerId = newCustomer.id;
      }
    }

    // 2. Fetch Room & verify status
    const { data: room, error: roomErr } = await supabase
      .from('rooms')
      .select('*, room_type:room_types(*)')
      .eq('id', roomId)
      .single();

    if (roomErr || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (room.status === 'maintenance') {
      return NextResponse.json({ error: 'This room is currently under maintenance' }, { status: 400 });
    }

    // 3. Collision Prevention: Check Overlapping Bookings
    const { data: conflicts, error: conflictErr } = await supabase
      .from('bookings')
      .select('id, booking_items!inner(room_id)')
      .eq('booking_items.room_id', roomId)
      .in('status', ['PENDING', 'CONFIRMED', 'CHECKED_IN'])
      .lt('check_in_date', checkOutDate)
      .gt('check_out_date', checkInDate);

    if (conflictErr) {
      console.error('Collision check query error:', conflictErr);
      return NextResponse.json({ error: 'Failed to verify room availability' }, { status: 500 });
    }

    if (conflicts && conflicts.length > 0) {
      return NextResponse.json(
        { error: `Room ${room.room_number} is already booked for the selected dates (${checkInDate} to ${checkOutDate})` },
        { status: 409 }
      );
    }

    // 4. Server-Side Price Calculation
    const pricePerNight = Number(room.price_per_night);
    const subtotalAmount = Math.round(pricePerNight * totalNights * 100) / 100;

    // Check promotion if code provided or active
    let appliedPromo: Promotion | null = null;
    let promoDiscountAmount = 0;

    if (promotionCode) {
      const { data: promo } = await supabase
        .from('promotions')
        .select('*')
        .eq('code', promotionCode.trim().toUpperCase())
        .eq('is_active', true)
        .maybeSingle();

      if (promo) {
        const promoCalc = calculatePromotionDiscount(
          subtotalAmount,
          totalNights,
          checkInDate,
          checkOutDate,
          room as unknown as Room,
          promo as unknown as Promotion
        );
        if (promoCalc.applied) {
          appliedPromo = promo as unknown as Promotion;
          promoDiscountAmount = promoCalc.discountAmount;
        }
      }
    }

    const netTotal = Math.max(0, Math.round((subtotalAmount - promoDiscountAmount) * 100) / 100);
    const remainingBalance = netTotal;

    // 5. Generate Booking Reference
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    const bookingNumber = `RES-${todayStr}-${randSuffix}`;

    // 6. Insert Booking Record
    const { data: booking, error: insertBookingErr } = await supabase
      .from('bookings')
      .insert({
        booking_number: bookingNumber,
        customer_id: customerId,
        check_in_date: checkInDate,
        check_out_date: checkOutDate,
        total_nights: totalNights,
        num_guests: Number(numGuests || 1),
        subtotal_amount: subtotalAmount,
        promotion_discount: promoDiscountAmount,
        manual_discount: 0,
        net_total: netTotal,
        paid_amount: 0,
        remaining_balance: remainingBalance,
        status: 'PENDING',
        notes: notes || null,
      })
      .select()
      .single();

    if (insertBookingErr || !booking) {
      console.error('Failed to insert booking:', insertBookingErr);
      return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
    }

    // 7. Insert Snapshot Booking Item
    await supabase.from('booking_items').insert({
      booking_id: booking.id,
      room_id: room.id,
      room_name: room.room_name,
      room_number: room.room_number,
      price_per_night: pricePerNight,
      nights: totalNights,
      item_subtotal: subtotalAmount,
    });

    // 8. Insert Promotion Discount Record if applied
    if (appliedPromo && promoDiscountAmount > 0) {
      await supabase.from('booking_discounts').insert({
        booking_id: booking.id,
        type: 'PROMOTION',
        promotion_id: appliedPromo.id,
        discount_type: appliedPromo.discount_type,
        discount_value: appliedPromo.discount_value,
        applied_amount: promoDiscountAmount,
        reason: `Promotion code: ${appliedPromo.code}`,
      });
    }

    // 9. Audit Log
    await logAuditEvent({
      actorId: actorId || customerId,
      actorName: actorName || customerName || 'Customer',
      action: 'BOOKING_CREATE',
      entity: 'booking',
      entityId: booking.id,
      detailsAfter: {
        booking_number: bookingNumber,
        room_number: room.room_number,
        check_in: checkInDate,
        check_out: checkOutDate,
        net_total: netTotal,
      },
    });

    // 10. Send LINE Admin Notification
    try {
      const lineMsg = `🔔 มีรายการจองห้องพักใหม่!\n\n📋 เลขที่ใบจอง: ${bookingNumber}\n🏨 ห้อง: ${room.room_name} (${room.room_number})\n👤 ผู้จอง: ${customerName || 'ลูกค้า'}\n📞 โทร: ${customerPhone || '-'}\n📅 เข้าพัก: ${checkInDate} ถึง ${checkOutDate} (${totalNights} คืน)\n👥 จำนวนผู้เข้าพัก: ${numGuests} ท่าน\n💰 ยอดสุทธิ: ฿${netTotal.toLocaleString('th-TH')}\n\n👉 ดูรายละเอียด: https://room-booking-eta-ten.vercel.app/admin/bookings`;
      sendLineAdminNotification(lineMsg).catch(() => {});
    } catch {
      // ignore
    }

    // 11. Return full booking
    const { data: completeBooking } = await supabase
      .from('bookings')
      .select(`
        *,
        customer:customers(*),
        booking_items(*, room:rooms(*)),
        booking_discounts(*),
        payments(*),
        receipts(*)
      `)
      .eq('id', booking.id)
      .single();

    return NextResponse.json({ success: true, booking: completeBooking });
  } catch (error) {
    console.error('Booking POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
