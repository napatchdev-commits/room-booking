import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = getAdminClient();
    const { data: types, error } = await supabase
      .from('room_types')
      .select('*, rooms(count)')
      .order('name', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, roomTypes: types });
  } catch (error) {
    console.error('Room types GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, name_en, description, base_capacity, max_capacity, base_price, amenities, cover_image } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const supabase = getAdminClient();
    const { data: roomType, error } = await supabase
      .from('room_types')
      .insert({
        name,
        name_en: name_en || '',
        description: description || '',
        base_capacity: Number(base_capacity || 2),
        max_capacity: Number(max_capacity || 4),
        base_price: Number(base_price || 0),
        amenities: amenities || [],
        cover_image: cover_image || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, roomType });
  } catch (error) {
    console.error('Room types POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
