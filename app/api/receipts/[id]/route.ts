import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { logAuditEvent } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const supabase = getAdminClient();

    const { data: receipt, error } = await supabase
      .from('receipts')
      .select(`
        *,
        issuer:profiles!receipts_issued_by_fkey(full_name),
        canceller:profiles!receipts_cancelled_by_fkey(full_name),
        payment:payments(*),
        booking:bookings(*, customer:customers(*), booking_items(*))
      `)
      .eq('id', id)
      .maybeSingle();

    if (error || !receipt) {
      return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
    }

    let customDetails: any = null;
    if (receipt.notes) {
      try {
        if (receipt.notes.startsWith('{') && receipt.notes.endsWith('}')) {
          customDetails = JSON.parse(receipt.notes);
        }
      } catch {}
    }

    return NextResponse.json({
      success: true,
      receipt: {
        ...receipt,
        customDetails,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: receiptId } = params;
    const { searchParams } = new URL(req.url);
    const actorName = searchParams.get('actorName') || 'Admin';

    const supabase = getAdminClient();

    const { data: receipt } = await supabase
      .from('receipts')
      .select('*')
      .eq('id', receiptId)
      .maybeSingle();

    if (!receipt) {
      return NextResponse.json({ error: 'ไม่พบใบเสร็จนี้' }, { status: 404 });
    }

    // 1. Delete associated receipt items
    await supabase.from('receipt_items').delete().eq('receipt_id', receiptId);

    // 2. Delete the receipt
    const { error: rErr } = await supabase.from('receipts').delete().eq('id', receiptId);
    if (rErr) {
      return NextResponse.json({ error: rErr.message }, { status: 500 });
    }

    await logAuditEvent({
      actorName,
      action: 'RECEIPT_DELETE',
      entity: 'receipt',
      entityId: receiptId,
      detailsBefore: receipt,
    });

    return NextResponse.json({ success: true, message: 'ลบใบเสร็จรับเงินเรียบร้อยแล้ว' });
  } catch (error: any) {
    console.error('Receipt DELETE error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
