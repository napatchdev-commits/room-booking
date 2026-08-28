import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { logAuditEvent } from '@/lib/audit';
import { checkRolePermission } from '@/lib/permissions';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: paymentId } = params;
    const body = await req.json();
    const {
      status, // 'VERIFIED' | 'REJECTED'
      rejectionReason,
      actorId,
      actorName,
      actorRole,
    } = body;

    // Check permission
    if (!checkRolePermission(actorRole || 'ADMIN', 'payment.verify')) {
      return NextResponse.json({ error: 'Permission denied: payment.verify required' }, { status: 403 });
    }

    if (!['VERIFIED', 'REJECTED'].includes(status)) {
      return NextResponse.json({ error: 'Status must be VERIFIED or REJECTED' }, { status: 400 });
    }

    const supabase = getAdminClient();

    const { data: payment, error: pErr } = await supabase
      .from('payments')
      .select('*, booking:bookings(*)')
      .eq('id', paymentId)
      .single();

    if (pErr || !payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Update payment
    const updatePayload: Record<string, unknown> = {
      status,
      verified_by: actorId || null,
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (status === 'REJECTED') {
      updatePayload.rejection_reason = rejectionReason || 'Invalid slip or incorrect amount';
    }

    const { data: updatedPayment, error: upErr } = await supabase
      .from('payments')
      .update(updatePayload)
      .eq('id', paymentId)
      .select()
      .single();

    if (upErr) {
      return NextResponse.json({ error: 'Failed to update payment' }, { status: 500 });
    }

    // Recalculate booking total verified paid
    const bookingId = payment.booking_id;
    const { data: allVerified } = await supabase
      .from('payments')
      .select('amount')
      .eq('booking_id', bookingId)
      .eq('status', 'VERIFIED');

    const totalPaid = (allVerified || []).reduce((sum, p) => sum + Number(p.amount), 0);
    const bookingNetTotal = Number(payment.booking?.net_total || 0);
    const remainingBalance = Math.max(0, Math.round((bookingNetTotal - totalPaid) * 100) / 100);

    const bookingStatusUpdate: Record<string, unknown> = {
      paid_amount: totalPaid,
      remaining_balance: remainingBalance,
      updated_at: new Date().toISOString(),
    };

    if (totalPaid > 0 && payment.booking?.status === 'PENDING') {
      bookingStatusUpdate.status = 'CONFIRMED';
    }

    await supabase.from('bookings').update(bookingStatusUpdate).eq('id', bookingId);

    // Audit log
    await logAuditEvent({
      actorId,
      actorName: actorName || 'Staff',
      action: status === 'VERIFIED' ? 'PAYMENT_VERIFY' : 'PAYMENT_REJECT',
      entity: 'payment',
      entityId: paymentId,
      detailsBefore: { status: payment.status },
      detailsAfter: {
        status,
        rejection_reason: updatePayload.rejection_reason,
        total_paid: totalPaid,
        remaining_balance: remainingBalance,
      },
    });

    return NextResponse.json({
      success: true,
      payment: updatedPayment,
      booking: {
        id: bookingId,
        paid_amount: totalPaid,
        remaining_balance: remainingBalance,
      },
    });
  } catch (error) {
    console.error('Payment verify error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
