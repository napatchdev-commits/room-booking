import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { logAuditEvent } from '@/lib/audit';
import { checkRolePermission } from '@/lib/permissions';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: bookingId } = params;
    const body = await req.json();
    const {
      discountType, // 'PERCENTAGE' | 'FIXED_AMOUNT'
      discountValue,
      reason,
      actorId,
      actorName,
      actorRole,
    } = body;

    // Check permission
    if (!checkRolePermission(actorRole || 'ADMIN', 'discount.manage')) {
      return NextResponse.json({ error: 'Permission denied: discount.manage required' }, { status: 403 });
    }

    if (!discountType || discountValue === undefined || Number(discountValue) <= 0) {
      return NextResponse.json({ error: 'Valid discount type and positive value are required' }, { status: 400 });
    }

    if (!reason || reason.trim() === '') {
      return NextResponse.json({ error: 'Reason for manual discount is required' }, { status: 400 });
    }

    const supabase = getAdminClient();

    // Fetch booking
    const { data: booking, error: fetchErr } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (fetchErr || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Calculation order: Base -> Promo -> Manual Discount -> Net -> Paid -> Balance
    const subtotal = Number(booking.subtotal_amount);
    const promoDiscount = Number(booking.promotion_discount || 0);
    const afterPromo = Math.max(0, subtotal - promoDiscount);

    let manualDiscountAmount = 0;
    if (discountType === 'PERCENTAGE') {
      manualDiscountAmount = (afterPromo * Number(discountValue)) / 100;
    } else {
      manualDiscountAmount = Number(discountValue);
    }

    manualDiscountAmount = Math.min(manualDiscountAmount, afterPromo);
    manualDiscountAmount = Math.max(0, Math.round(manualDiscountAmount * 100) / 100);

    const netTotal = Math.max(0, Math.round((afterPromo - manualDiscountAmount) * 100) / 100);
    const paidAmount = Number(booking.paid_amount || 0);
    const remainingBalance = Math.max(0, Math.round((netTotal - paidAmount) * 100) / 100);

    // Save discount record
    const { data: discountRecord, error: discErr } = await supabase
      .from('booking_discounts')
      .insert({
        booking_id: bookingId,
        type: 'MANUAL',
        discount_type: discountType,
        discount_value: Number(discountValue),
        applied_amount: manualDiscountAmount,
        reason: reason.trim(),
        authorized_by: actorId || null,
      })
      .select()
      .single();

    if (discErr) {
      return NextResponse.json({ error: 'Failed to record manual discount' }, { status: 500 });
    }

    // Update booking totals
    const { data: updatedBooking, error: updateErr } = await supabase
      .from('bookings')
      .update({
        manual_discount: manualDiscountAmount,
        net_total: netTotal,
        remaining_balance: remainingBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId)
      .select(`
        *,
        customer:customers(*),
        booking_items(*, room:rooms(*)),
        booking_discounts(*),
        payments(*),
        receipts(*)
      `)
      .single();

    if (updateErr) {
      return NextResponse.json({ error: 'Failed to update booking totals' }, { status: 500 });
    }

    // Log Audit Event
    await logAuditEvent({
      actorId,
      actorName: actorName || 'Admin',
      action: 'DISCOUNT_ADD',
      entity: 'discount',
      entityId: discountRecord.id,
      detailsBefore: {
        manual_discount: booking.manual_discount,
        net_total: booking.net_total,
        remaining_balance: booking.remaining_balance,
      },
      detailsAfter: {
        discount_record: discountRecord,
        updated_net_total: netTotal,
        updated_balance: remainingBalance,
      },
    });

    return NextResponse.json({
      success: true,
      booking: updatedBooking,
      discount: discountRecord,
    });
  } catch (error) {
    console.error('Manual discount error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
