import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { logAuditEvent } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!id || id === 'undefined' || id === 'null') {
      return NextResponse.json({ error: 'Invalid booking identifier' }, { status: 400 });
    }

    const supabase = getAdminClient();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    let query = supabase
      .from('bookings')
      .select(`
        *,
        customer:customers(*),
        booking_items(*, room:rooms(*, room_images(*))),
        booking_discounts(*),
        payments(*),
        receipts(*)
      `);

    if (isUuid) {
      query = query.eq('id', id);
    } else {
      query = query.eq('booking_number', id);
    }

    const { data: booking, error } = await query.maybeSingle();

    if (error) {
      console.error('Booking fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    return NextResponse.json(
      { success: true, booking },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
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

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const { searchParams } = new URL(req.url);
    const actorName = searchParams.get('actorName') || 'Admin';

    const supabase = getAdminClient();

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    let query = supabase.from('bookings').select('*, booking_items(*)');
    if (isUuid) query = query.eq('id', id);
    else query = query.eq('booking_number', id);

    const { data: booking } = await query.maybeSingle();
    if (!booking) {
      return NextResponse.json({ error: 'ไม่พบรายการจองนี้' }, { status: 404 });
    }

    const bookingId = booking.id;

    // 1. Delete associated receipts
    await supabase.from('receipts').delete().eq('booking_id', bookingId);

    // 2. Delete associated payments
    await supabase.from('payments').delete().eq('booking_id', bookingId);

    // 3. Delete associated booking discounts
    await supabase.from('booking_discounts').delete().eq('booking_id', bookingId);

    // 4. Delete associated booking items
    await supabase.from('booking_items').delete().eq('booking_id', bookingId);

    // 5. Delete the main booking
    const { error: bErr } = await supabase.from('bookings').delete().eq('id', bookingId);
    if (bErr) {
      return NextResponse.json({ error: bErr.message }, { status: 500 });
    }

    await logAuditEvent({
      actorName,
      action: 'BOOKING_DELETE',
      entity: 'booking',
      entityId: bookingId,
      detailsBefore: booking,
    });

    return NextResponse.json({ success: true, message: 'ลบรายการจองเรียบร้อยแล้ว' });
  } catch (error: any) {
    console.error('Booking DELETE error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

