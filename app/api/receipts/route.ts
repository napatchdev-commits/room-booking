import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
import { logAuditEvent } from '@/lib/audit';
import { checkRolePermission } from '@/lib/permissions';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const bookingId = searchParams.get('bookingId');
    const paymentId = searchParams.get('paymentId');
    const status = searchParams.get('status');

    const supabase = getAdminClient();
    let query = supabase
      .from('receipts')
      .select(`
        *,
        issuer:profiles!receipts_issued_by_fkey(full_name),
        canceller:profiles!receipts_cancelled_by_fkey(full_name),
        payment:payments(*),
        booking:bookings(*, customer:customers(*))
      `)
      .order('created_at', { ascending: false });

    if (bookingId) query = query.eq('booking_id', bookingId);
    if (paymentId) query = query.eq('payment_id', paymentId);
    if (status && status !== 'ALL') query = query.eq('status', status);

    const { data: receipts, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, receipts });
  } catch (error) {
    console.error('Receipts GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      paymentId,
      notes,
      actorId,
      actorName,
      actorRole,
    } = body;

    // Check permission: strictly required receipt.create
    if (!checkRolePermission(actorRole || 'STAFF', 'receipt.create')) {
      return NextResponse.json({ error: 'Permission denied: receipt.create required to issue receipts' }, { status: 403 });
    }

    if (!paymentId) {
      return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 });
    }

    const supabase = getAdminClient();

    // 1. Fetch payment
    const { data: payment, error: pErr } = await supabase
      .from('payments')
      .select('*, booking:bookings(*)')
      .eq('id', paymentId)
      .single();

    if (pErr || !payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    if (payment.status !== 'VERIFIED') {
      return NextResponse.json({ error: 'Receipt can only be issued for VERIFIED payments' }, { status: 400 });
    }

    // 2. Check if receipt already issued for this payment
    const { data: existingReceipt } = await supabase
      .from('receipts')
      .select('id, receipt_number, status')
      .eq('payment_id', paymentId)
      .maybeSingle();

    if (existingReceipt && existingReceipt.status !== 'CANCELLED') {
      return NextResponse.json(
        { error: `Receipt ${existingReceipt.receipt_number} is already issued for this payment.` },
        { status: 400 }
      );
    }

    // 3. Generate Receipt Number (e.g. RC-YYYYMMDD-0001)
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randSeq = Math.floor(1000 + Math.random() * 9000);
    const receiptNumber = `RC-${todayStr}-${randSeq}`;

    // 4. Ensure an issuer profile ID exists
    let issuerId = actorId;
    if (!issuerId) {
      // Find or assign first active owner/admin profile
      const { data: fallbackProfile } = await supabase
        .from('profiles')
        .select('id')
        .in('role', ['OWNER', 'ADMIN', 'STAFF'])
        .limit(1)
        .maybeSingle();

      issuerId = fallbackProfile?.id;
    }

    if (!issuerId) {
      // Create a system default staff profile if none exists
      const { data: createdProfile } = await supabase
        .from('profiles')
        .insert({
          full_name: actorName || 'Resort Officer',
          role: 'ADMIN',
          is_active: true,
        })
        .select()
        .single();
      issuerId = createdProfile?.id;
    }

    // 5. Insert Receipt
    const paymentAmount = Number(payment.amount);
    const { data: receipt, error: rErr } = await supabase
      .from('receipts')
      .insert({
        receipt_number: receiptNumber,
        booking_id: payment.booking_id,
        payment_id: payment.id,
        amount: paymentAmount,
        status: 'ISSUED',
        issued_at: new Date().toISOString(),
        issued_by: issuerId,
        notes: notes || null,
      })
      .select(`
        *,
        issuer:profiles!receipts_issued_by_fkey(full_name),
        payment:payments(*),
        booking:bookings(*, customer:customers(*))
      `)
      .single();

    if (rErr || !receipt) {
      console.error('Receipt insert error:', rErr);
      return NextResponse.json({ error: rErr?.message || 'Failed to issue receipt' }, { status: 500 });
    }

    // 6. Insert Receipt Item
    await supabase.from('receipt_items').insert({
      receipt_id: receipt.id,
      description: `Payment for Booking Ref: ${payment.booking?.booking_number} (${payment.payment_type})`,
      amount: paymentAmount,
    });

    // 7. Audit Log
    await logAuditEvent({
      actorId,
      actorName: actorName || 'Staff',
      action: 'RECEIPT_ISSUE',
      entity: 'receipt',
      entityId: receipt.id,
      detailsAfter: {
        receipt_number: receiptNumber,
        booking_number: payment.booking?.booking_number,
        payment_id: payment.id,
        amount: paymentAmount,
      },
    });

    return NextResponse.json({ success: true, receipt });
  } catch (error) {
    console.error('Receipt POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
