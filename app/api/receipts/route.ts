import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { logAuditEvent } from '@/lib/audit';
import { checkRolePermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Helper to generate next sequential receipt number (e.g. SC26-001)
async function getNextReceiptNumber(): Promise<string> {
  const supabase = getAdminClient();
  const yearSuffix = new Date().getFullYear().toString().slice(-2); // "26"
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
    const bookingId = searchParams.get('bookingId');
    const paymentId = searchParams.get('paymentId');
    const status = searchParams.get('status');
    const action = searchParams.get('action');

    // Return next receipt number if requested
    if (action === 'next-number') {
      const nextReceiptNumber = await getNextReceiptNumber();
      return NextResponse.json({ success: true, nextReceiptNumber });
    }

    const supabase = getAdminClient();
    let query = supabase
      .from('receipts')
      .select(`
        *,
        issuer:profiles!receipts_issued_by_fkey(full_name),
        canceller:profiles!receipts_cancelled_by_fkey(full_name),
        payment:payments(*),
        receipt_items(*),
        booking:bookings(*, customer:customers(*), booking_items(*))
      `)
      .order('created_at', { ascending: false });

    if (bookingId) query = query.eq('booking_id', bookingId);
    if (paymentId) query = query.eq('payment_id', paymentId);
    if (status && status !== 'ALL') query = query.eq('status', status);

    const { data: receipts, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Parse custom details from notes if stored as JSON
    const parsedReceipts = (receipts || []).map((r) => {
      let customDetails: any = null;
      if (r.notes) {
        try {
          if (r.notes.startsWith('{') && r.notes.endsWith('}')) {
            customDetails = JSON.parse(r.notes);
          }
        } catch {
          // not JSON
        }
      }
      return {
        ...r,
        customDetails,
      };
    });

    return NextResponse.json({ success: true, receipts: parsedReceipts });
  } catch (error) {
    console.error('Receipts GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      receiptNumber: inputReceiptNumber,
      bookNo,
      issuedAt,
      bookingId,
      paymentId: inputPaymentId,
      customerName,
      customerPhone,
      customerAddress,
      customerTaxId,
      items = [],
      amount: inputAmount,
      notes,
      issuerName,
      actorId,
      actorName,
      actorRole,
    } = body;

    // Check permission: strictly required receipt.create
    if (!checkRolePermission(actorRole || 'STAFF', 'receipt.create')) {
      return NextResponse.json({ error: 'Permission denied: receipt.create required to issue receipts' }, { status: 403 });
    }

    const supabase = getAdminClient();

    // 1. Generate or validate Receipt Number
    let receiptNumber = inputReceiptNumber ? inputReceiptNumber.trim() : '';
    if (!receiptNumber) {
      receiptNumber = await getNextReceiptNumber();
    }

    // 2. Ensure an issuer profile ID exists
    let issuerId = actorId;
    if (!issuerId) {
      const { data: fallbackProfile } = await supabase
        .from('profiles')
        .select('id')
        .in('role', ['OWNER', 'ADMIN', 'STAFF'])
        .limit(1)
        .maybeSingle();

      issuerId = fallbackProfile?.id;
    }

    if (!issuerId) {
      const { data: createdProfile } = await supabase
        .from('profiles')
        .insert({
          full_name: issuerName || actorName || 'Resort Officer',
          role: 'ADMIN',
          is_active: true,
        })
        .select()
        .single();
      issuerId = createdProfile?.id;
    }

    // 3. Resolve booking_id and payment_id
    let targetBookingId = bookingId;
    let targetPaymentId = inputPaymentId;

    if (targetBookingId) {
      // Find existing payment for this booking if paymentId not given
      if (!targetPaymentId) {
        const { data: existingPayment } = await supabase
          .from('payments')
          .select('id')
          .eq('booking_id', targetBookingId)
          .eq('status', 'VERIFIED')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingPayment) {
          targetPaymentId = existingPayment.id;
        } else {
          // Create verified payment for this booking
          const paymentAmount = Number(inputAmount) || 0;
          const { data: newPayment } = await supabase
            .from('payments')
            .insert({
              booking_id: targetBookingId,
              amount: paymentAmount,
              payment_type: 'FULL',
              payment_method: 'CASH',
              status: 'VERIFIED',
              verified_by: issuerId,
              verified_at: new Date().toISOString(),
              notes: 'Receipt issuance auto-payment',
            })
            .select()
            .single();

          if (newPayment) {
            targetPaymentId = newPayment.id;
          }
        }
      }
    } else {
      // Manual receipt without selecting booking: create placeholder customer, booking, and payment
      let custId: string | null = null;
      const cleanPhone = customerPhone ? customerPhone.trim() : '';

      if (cleanPhone) {
        const { data: existingCust } = await supabase
          .from('customers')
          .select('id')
          .eq('phone', cleanPhone)
          .maybeSingle();
        if (existingCust) custId = existingCust.id;
      }

      if (!custId) {
        const { data: newCust } = await supabase
          .from('customers')
          .insert({
            full_name: customerName ? customerName.trim() : 'ลูกค้าทั่วไป',
            phone: cleanPhone || '0000000000',
            id_card: customerTaxId || null,
          })
          .select()
          .single();
        if (newCust) custId = newCust.id;
      }

      // Create placeholder booking
      const todayStr = new Date().toISOString().slice(0, 10);
      const randNum = Math.floor(1000 + Math.random() * 9000);
      const totalAmt = Number(inputAmount) || 0;

      const { data: newBooking } = await supabase
        .from('bookings')
        .insert({
          booking_number: `MANUAL-${todayStr.replace(/-/g, '')}-${randNum}`,
          customer_id: custId,
          check_in_date: todayStr,
          check_out_date: todayStr,
          total_nights: 1,
          num_guests: 1,
          subtotal_amount: totalAmt,
          net_total: totalAmt,
          paid_amount: totalAmt,
          remaining_balance: 0,
          status: 'CONFIRMED',
          notes: 'Manual Receipt Issuance',
        })
        .select()
        .single();

      if (newBooking) {
        targetBookingId = newBooking.id;

        // Create verified payment
        const { data: newPayment } = await supabase
          .from('payments')
          .insert({
            booking_id: targetBookingId,
            amount: totalAmt,
            payment_type: 'FULL',
            payment_method: 'CASH',
            status: 'VERIFIED',
            verified_by: issuerId,
            verified_at: new Date().toISOString(),
            notes: 'Manual Receipt Issuance',
          })
          .select()
          .single();

        if (newPayment) {
          targetPaymentId = newPayment.id;
        }
      }
    }

    if (!targetBookingId || !targetPaymentId) {
      return NextResponse.json({ error: 'Failed to link booking and payment for receipt' }, { status: 500 });
    }

    // 4. Calculate total amount and format items
    const totalAmount = Number(inputAmount) || 0;

    // Pack rich custom details into notes as JSON
    const customPayload = {
      book_no: bookNo || '1',
      customer_name: customerName ? customerName.trim() : '',
      customer_phone: customerPhone ? customerPhone.trim() : '',
      customer_address: customerAddress ? customerAddress.trim() : '',
      customer_tax_id: customerTaxId ? customerTaxId.trim() : '',
      items: Array.isArray(items) ? items : [],
      issuer_name: issuerName ? issuerName.trim() : (actorName || 'สมบัติ รีสอร์ท'),
      user_notes: notes || '',
    };

    const notesString = JSON.stringify(customPayload);

    // 5. Insert Receipt
    const receiptIssuedDate = issuedAt ? new Date(issuedAt).toISOString() : new Date().toISOString();

    const { data: receipt, error: rErr } = await supabase
      .from('receipts')
      .insert({
        receipt_number: receiptNumber,
        booking_id: targetBookingId,
        payment_id: targetPaymentId,
        amount: totalAmount,
        status: 'ISSUED',
        issued_at: receiptIssuedDate,
        issued_by: issuerId,
        notes: notesString,
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

    // 6. Insert Receipt Items
    if (Array.isArray(items) && items.length > 0) {
      const itemsToInsert = items.map((item: any) => ({
        receipt_id: receipt.id,
        description: item.description || 'ค่าบริการ / ค่าห้องพัก',
        amount: Number(item.total || item.amount || 0),
      }));
      await supabase.from('receipt_items').insert(itemsToInsert);
    } else {
      await supabase.from('receipt_items').insert({
        receipt_id: receipt.id,
        description: `ชำระค่าห้องพัก (Ref: ${receiptNumber})`,
        amount: totalAmount,
      });
    }

    // 7. Audit Log
    await logAuditEvent({
      actorId,
      actorName: actorName || 'Staff',
      action: 'RECEIPT_ISSUE',
      entity: 'receipt',
      entityId: receipt.id,
      detailsAfter: {
        receipt_number: receiptNumber,
        booking_id: targetBookingId,
        amount: totalAmount,
        customer_name: customerName,
      },
    });

    return NextResponse.json({
      success: true,
      receipt: {
        ...receipt,
        customDetails: customPayload,
      },
    });
  } catch (error: any) {
    console.error('Receipt POST error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
