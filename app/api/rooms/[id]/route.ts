import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const supabase = getAdminClient();

    const { data: room, error } = await supabase
      .from('rooms')
      .select('*, room_type:room_types(*), room_images(*)')
      .eq('id', id)
      .single();

    if (error || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, room });
  } catch (error) {
    console.error('Room detail error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await req.json();
    const {
      room_number,
      room_name,
      room_type_id,
      price_per_night,
      capacity,
      details,
      amenities,
      status,
      images,
      actorId,
      actorName,
    } = body;

    const supabase = getAdminClient();

    // Fetch before state for audit
    const { data: beforeRoom } = await supabase.from('rooms').select('*').eq('id', id).single();

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (room_number !== undefined) updateData.room_number = room_number;
    if (room_name !== undefined) updateData.room_name = room_name;
    if (room_type_id !== undefined) updateData.room_type_id = room_type_id;
    if (price_per_night !== undefined) updateData.price_per_night = Number(price_per_night);
    if (capacity !== undefined) updateData.capacity = Number(capacity);
    if (details !== undefined) updateData.details = details;
    if (amenities !== undefined) updateData.amenities = amenities;
    if (status !== undefined) updateData.status = status;

    const { data: updatedRoom, error } = await supabase
      .from('rooms')
      .update(updateData)
      .eq('id', id)
      .select('*, room_type:room_types(*)')
      .single();

    if (error || !updatedRoom) {
      return NextResponse.json({ error: error?.message || 'Failed to update room' }, { status: 500 });
    }

    // Update images if provided
    if (images && Array.isArray(images)) {
      await supabase.from('room_images').delete().eq('room_id', id);
      if (images.length > 0) {
        const imageRecords = images.map((img: { image_url: string; caption?: string }, index: number) => ({
          room_id: id,
          image_url: img.image_url,
          caption: img.caption || '',
          display_order: index,
        }));
        await supabase.from('room_images').insert(imageRecords);
      }
    }

    await logAuditEvent({
      actorId,
      actorName,
      action: 'ROOM_UPDATE',
      entity: 'room',
      entityId: id,
      detailsBefore: beforeRoom,
      detailsAfter: updatedRoom,
    });

    return NextResponse.json({ success: true, room: updatedRoom });
  } catch (error) {
    console.error('Room PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const supabase = getAdminClient();

    // Check if room has active bookings
    const { data: activeBookings } = await supabase
      .from('booking_items')
      .select('id, booking:bookings(status)')
      .eq('room_id', id);

    const hasActive = activeBookings?.some((b) =>
      ['PENDING', 'CONFIRMED', 'CHECKED_IN'].includes((b.booking as unknown as { status: string })?.status)
    );

    if (hasActive) {
      return NextResponse.json(
        { error: 'Cannot delete room with active reservations. Set status to maintenance instead.' },
        { status: 400 }
      );
    }

    const { error } = await supabase.from('rooms').delete().eq('id', id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Room deleted' });
  } catch (error) {
    console.error('Room DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
