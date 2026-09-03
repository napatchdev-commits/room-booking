import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
import { calculateNights, thaiBahtText } from '@/lib/formatters';
import { calculatePromotionDiscount } from '@/lib/pricing';
import { logAuditEvent } from '@/lib/audit';
import { sendLineAdminNotification } from '@/lib/line-notify';
import { Promotion, Room } from '@/types/database';

// Helper to generate next sequential receipt number (e.g. SC26-001, SC27-001) based on year
async function getNextReceiptNumber(dateInput?: string | Date): Promise<string> {
  const supabase = getAdminClient();
  let fullYear = new Date().getFullYear();
  if (dateInput) {
    const d = new Date(dateInput);
    if (!isNaN(d.getFullYear())) {
      fullYear = d.getFullYear();
    }
  }
  const yearSuffix = fullYear.toString().slice(-2);
  const prefix = `SC${yearSuffix}-`;

  const { data: receipts } = await supabase
    .from('receipts')
    .select('receipt_number')
    .ilike('receipt_number', `${prefix}%`)
    .order('created_at', { ascending: false })
    .limit(100);

  let maxSeq = 0;
  if (receipts && receipts.length > 0) {
    for (const r of receipts) {
      const match = r.receipt_number.match(new RegExp(`^${prefix}(\\d+)`, 'i'));
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    }
  }

  const nextSeq = maxSeq + 1;
  return `${prefix}${String(nextSeq).padStart(3, '0')}`;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const isAdmin = searchParams.get('isAdmin') === 'true';

    // Privacy & Security Check: If not admin and no customer filter provided, return empty
    if (!isAdmin && !customerId && !search) {
      return NextResponse.json({ success: true, bookings: [] });
    }

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
      customerTaxId,
      roomId,
      checkInDate,
      checkOutDate,
      numGuests = 1,
      promotionCode,
      notes,
      actorId,
      actorName,
      // Walk-in parameters
      isWalkIn = false,
      status: requestedStatus,
      customPricePerNight,
      manualDiscount = 0,
      paidAmount: rawPaidAmount = 0,
      paymentMethod = 'CASH',
      autoIssueReceipt = false,
      issuerName = 'สมบัติ รีสอร์ท',
      bookNo = '1',
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
    const effectiveCustName = customerName || (isWalkIn ? 'ลูกค้า Walk-in' : 'ลูกค้าผู้เข้าพัก');
    const effectiveCustPhone = customerPhone || (isWalkIn ? '080-000-0000' : '');

    if (!customerId) {
      if (!customerPhone && !isWalkIn) {
        return NextResponse.json({ error: 'Customer Name and Phone are required' }, { status: 400 });
      }

      // Find or insert customer by phone
      if (effectiveCustPhone) {
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('id')
          .eq('phone', effectiveCustPhone)
          .maybeSingle();

        if (existingCustomer) {
          customerId = existingCustomer.id;
        }
      }

      if (!customerId) {
        const { data: newCustomer, error: custErr } = await supabase
          .from('customers')
          .insert({
            full_name: effectiveCustName,
            phone: effectiveCustPhone,
            email: customerEmail || null,
            id_card: customerTaxId || null,
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
      return NextResponse.json({ error: 'ห้องพักนี้อยู่ระหว่างการปรับปรุง/ซ่อมบำรุง' }, { status: 400 });
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
        { error: `ห้อง ${room.room_number} ถูกจองเต็มแล้วสำหรับช่วงวันที่เลือก (${checkInDate} ถึง ${checkOutDate})` },
        { status: 409 }
      );
    }

    // 4. Server-Side Price Calculation
    const pricePerNight = typeof customPricePerNight === 'number' && customPricePerNight >= 0
      ? customPricePerNight
      : Number(room.price_per_night);

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

    const appliedManualDiscount = Number(manualDiscount) || 0;
    const netTotal = Math.max(0, Math.round((subtotalAmount - promoDiscountAmount - appliedManualDiscount) * 100) / 100);

    const paidAmount = Math.min(netTotal, Number(rawPaidAmount) || 0);
    const remainingBalance = Math.max(0, Math.round((netTotal - paidAmount) * 100) / 100);

    // Initial Status
    const initialStatus = requestedStatus || (isWalkIn ? 'CHECKED_IN' : 'PENDING');

    // 5. Generate Booking Reference
    const todayDigits = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    const bookingNumber = isWalkIn ? `WLK-${todayDigits}-${randSuffix}` : `RES-${todayDigits}-${randSuffix}`;

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
        manual_discount: appliedManualDiscount,
        net_total: netTotal,
        paid_amount: paidAmount,
        remaining_balance: remainingBalance,
        status: initialStatus,
        notes: notes || (isWalkIn ? 'ลูกค้า Walk-in เช็คอินหน้าร้าน' : null),
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

    // 9. If Payment received (e.g. Walk-in paid at desk)
    let paymentRecord: any = null;
    if (paidAmount > 0) {
      const paymentType = paidAmount >= netTotal ? 'FULL' : 'DEPOSIT';
      const { data: pData } = await supabase
        .from('payments')
        .insert({
          booking_id: booking.id,
          amount: paidAmount,
          payment_type: paymentType,
          payment_method: paymentMethod || 'CASH',
          status: 'VERIFIED',
          verified_at: new Date().toISOString(),
          notes: isWalkIn ? 'ชำระเงินหน้าร้าน (Walk-in)' : 'ชำระเงินออนไลน์',
        })
        .select()
        .single();

      paymentRecord = pData;
    }

    // 10. Auto Issue Receipt if requested
    let receiptRecord: any = null;
    if (autoIssueReceipt && paidAmount > 0 && paymentRecord) {
      try {
        const nextReceiptNumber = await getNextReceiptNumber();
        const customDetails = {
          book_no: bookNo || '1',
          customer_name: effectiveCustName,
          customer_phone: effectiveCustPhone,
          customer_tax_id: customerTaxId || '',
          issuer_name: issuerName || 'สมบัติ รีสอร์ท',
          notes: notes || `ค่าที่พักห้อง ${room.room_name} (${room.room_number})`,
          items: [
            {
              description: `ค่าห้องพัก ${room.room_name} (${room.room_number}) ${checkInDate} ถึง ${checkOutDate}`,
              quantity: totalNights,
              unitPrice: pricePerNight,
              total: paidAmount,
            },
          ],
        };

        const { data: recData } = await supabase
          .from('receipts')
          .insert({
            receipt_number: nextReceiptNumber,
            booking_id: booking.id,
            payment_id: paymentRecord.id,
            amount: paidAmount,
            status: 'ISSUED',
            notes: JSON.stringify(customDetails),
          })
          .select()
          .single();

        receiptRecord = recData;
      } catch (recErr) {
        console.error('Auto receipt issuance error:', recErr);
      }
    }

    // 11. Update Room Status to 'occupied' if checked in today
    if (initialStatus === 'CHECKED_IN') {
      await supabase
        .from('rooms')
        .update({ status: 'occupied' })
        .eq('id', room.id);
    }

    // 12. Send LINE Admin Notification
    try {
      const lineMsg = `🔔 มีรายการจองห้องพักใหม่! ${isWalkIn ? '(ลูกค้า Walk-in หน้าร้าน 🚶)' : ''}\n\n📋 เลขที่ใบจอง: ${bookingNumber}\n🏨 ห้อง: ${room.room_name} (${room.room_number})\n👤 ผู้จอง: ${effectiveCustName}\n📞 โทร: ${effectiveCustPhone || '-'}\n📅 เข้าพัก: ${checkInDate} ถึง ${checkOutDate} (${totalNights} คืน)\n👥 จำนวนผู้เข้าพัก: ${numGuests} ท่าน\n💰 ยอดสุทธิ: ฿${netTotal.toLocaleString('th-TH')}${paidAmount > 0 ? ` (ชำระแล้ว ฿${paidAmount.toLocaleString('th-TH')})` : ''}\n📌 สถานะ: ${initialStatus}\n\n👉 ดูรายละเอียด: https://room-booking-eta-ten.vercel.app/admin/bookings`;
      sendLineAdminNotification(lineMsg).catch(() => {});
    } catch {
      // ignore
    }

    // 13. Return full booking
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

    return NextResponse.json({
      success: true,
      booking: completeBooking,
      payment: paymentRecord,
      receipt: receiptRecord,
    });
  } catch (error) {
    console.error('Booking POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
