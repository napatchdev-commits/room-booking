import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { logAuditEvent } from '@/lib/audit';
import { checkRolePermission } from '@/lib/permissions';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: receiptId } = params;
    const body = await req.json();
    const { cancelReason, actorId, actorName, actorRole } = body;

    // Check permission
    if (!checkRolePermission(actorRole || 'ADMIN', 'receipt.cancel')) {
      return NextResponse.json({ error: 'Permission denied: receipt.cancel required' }, { status: 403 });
    }

    if (!cancelReason || cancelReason.trim() === '') {
      return NextResponse.json({ error: 'Reason for receipt cancellation is required' }, { status: 400 });
    }

    const supabase = getAdminClient();

    const { data: receipt, error: rErr } = await supabase
      .from('receipts')
      .select('*')
      .eq('id', receiptId)
      .single();

    if (rErr || !receipt) {
      return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
    }

    if (receipt.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Receipt is already cancelled' }, { status: 400 });
    }

    const { data: updatedReceipt, error: upErr } = await supabase
      .from('receipts')
      .update({
        status: 'CANCELLED',
        cancelled_at: new Date().toISOString(),
        cancelled_by: actorId || null,
        cancel_reason: cancelReason.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', receiptId)
      .select()
      .single();

    if (upErr) {
      return NextResponse.json({ error: 'Failed to cancel receipt' }, { status: 500 });
    }

    await logAuditEvent({
      actorId,
      actorName: actorName || 'Admin',
      action: 'RECEIPT_CANCEL',
      entity: 'receipt',
      entityId: receiptId,
      detailsBefore: receipt,
      detailsAfter: updatedReceipt,
    });

    return NextResponse.json({ success: true, receipt: updatedReceipt });
  } catch (error) {
    console.error('Receipt cancel error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
