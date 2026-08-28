import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const supabase = getAdminClient();

    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        *,
        customer:customers(*),
        booking_items(*, room:rooms(*, room_images(*))),
        booking_discounts(*, authorizer:profiles(full_name)),
        payments(*, verifier:profiles(full_name)),
        receipts(*, issuer:profiles(full_name))
      `)
      .or(`id.eq.${id},booking_number.eq.${id}`)
      .single();

    if (error || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, booking });
  } catch (error) {
    console.error('Booking GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await req.json();
    const { status, notes, actorId, actorName } = body;

    const supabase = getAdminClient();

    const { data: before } = await supabase.from('bookings').select('*').eq('id', id).single();
    if (!before) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (status) updatePayload.status = status;
    if (notes !== undefined) updatePayload.notes = notes;

    const { data: updated, error } = await supabase
      .from('bookings')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAuditEvent({
      actorId,
      actorName,
      action: status === 'CANCELLED' ? 'BOOKING_CANCEL' : 'BOOKING_EDIT',
      entity: 'booking',
      entityId: id,
      detailsBefore: before,
      detailsAfter: updated,
    });

    return NextResponse.json({ success: true, booking: updated });
  } catch (error) {
    console.error('Booking PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
