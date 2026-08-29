import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { logAuditEvent } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const roomTypeId = searchParams.get('roomTypeId');
    const status = searchParams.get('status');

    const supabase = getAdminClient();
    let query = supabase
      .from('rooms')
      .select('*, room_type:room_types(*), room_images(*)')
      .order('room_number', { ascending: true });

    if (roomTypeId) query = query.eq('room_type_id', roomTypeId);
    if (status) query = query.eq('status', status);

    const { data: rooms, error } = await query;
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: { 'Cache-Control': 'no-store, max-age=0' } }
      );
    }

    return NextResponse.json(
      { success: true, rooms },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error) {
    console.error('Rooms GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      room_number,
      room_name,
      room_type_id,
      price_per_night,
      capacity,
      details,
      amenities = [],
      status = 'available',
      images = [],
      actorId,
      actorName,
    } = body;

    if (!room_number || !room_name || !room_type_id || price_per_night === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = getAdminClient();

    // Check duplicate room number
    const { data: existing } = await supabase
      .from('rooms')
      .select('id')
      .eq('room_number', room_number)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: `Room number ${room_number} already exists` }, { status: 400 });
    }

    // Insert room
    const { data: room, error: insertErr } = await supabase
      .from('rooms')
      .insert({
        room_number,
        room_name,
        room_type_id,
        price_per_night: Number(price_per_night),
        capacity: Number(capacity || 2),
        details: details || '',
        amenities: amenities || [],
        status,
      })
      .select()
      .single();

    if (insertErr || !room) {
      return NextResponse.json({ error: insertErr?.message || 'Failed to create room' }, { status: 500 });
    }

    // Insert images if provided
    if (images && images.length > 0) {
      const imageRecords = images.map((img: { image_url: string; caption?: string }, index: number) => ({
        room_id: room.id,
        image_url: img.image_url,
        caption: img.caption || '',
        display_order: index,
      }));
      await supabase.from('room_images').insert(imageRecords);
    }

    // Audit log
    await logAuditEvent({
      actorId,
      actorName,
      action: 'ROOM_CREATE',
      entity: 'room',
      entityId: room.id,
      detailsAfter: room,
    });

    return NextResponse.json({ success: true, room });
  } catch (error) {
    console.error('Room POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
