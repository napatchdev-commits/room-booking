import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const bookingId = searchParams.get('bookingId');
    const status = searchParams.get('status');

    const supabase = getAdminClient();
    let query = supabase
      .from('payments')
      .select('*, booking:bookings(*, customer:customers(*)), verifier:profiles(full_name)')
      .order('created_at', { ascending: false });

    if (bookingId) query = query.eq('booking_id', bookingId);
    if (status && status !== 'ALL') query = query.eq('status', status);

    const { data: payments, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, payments });
  } catch (error) {
    console.error('Payments GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      bookingId,
      amount,
      paymentType = 'FULL', // 'FULL' | 'DEPOSIT' | 'INSTALLMENT' | 'REMAINING'
      paymentMethod = 'BANK_TRANSFER', // 'PROMPTPAY_QR' | 'BANK_TRANSFER' | 'CASH' | 'CREDIT_CARD'
      slipUrl,
      notes,
      actorId,
      actorName,
    } = body;

    if (!bookingId || !amount || Number(amount) <= 0) {
      return NextResponse.json({ error: 'Booking ID and a valid positive amount are required' }, { status: 400 });
    }

    const supabase = getAdminClient();

    // Verify booking exists
    const { data: booking, error: bErr } = await supabase
      .from('bookings')
      .select('id, booking_number, remaining_balance')
      .eq('id', bookingId)
      .single();

    if (bErr || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const paymentAmount = Math.round(Number(amount) * 100) / 100;

    // Create payment record (PENDING verification)
    const { data: payment, error: pErr } = await supabase
      .from('payments')
      .insert({
        booking_id: bookingId,
        amount: paymentAmount,
        payment_type: paymentType,
        payment_method: paymentMethod,
        slip_url: slipUrl || null,
        slip_uploaded_at: slipUrl ? new Date().toISOString() : null,
        status: 'PENDING',
        notes: notes || null,
      })
      .select()
      .single();

    if (pErr || !payment) {
      return NextResponse.json({ error: pErr?.message || 'Failed to submit payment' }, { status: 500 });
    }

    await logAuditEvent({
      actorId,
      actorName: actorName || 'Customer',
      action: 'PAYMENT_SUBMIT',
      entity: 'payment',
      entityId: payment.id,
      detailsAfter: {
        booking_number: booking.booking_number,
        amount: paymentAmount,
        payment_type: paymentType,
        payment_method: paymentMethod,
        has_slip: Boolean(slipUrl),
      },
    });

    return NextResponse.json({ success: true, payment });
  } catch (error) {
    console.error('Payment POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
