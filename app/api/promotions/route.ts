import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const supabase = getAdminClient();
    let query = supabase.from('promotions').select('*, room_type:room_types(*)').order('created_at', { ascending: false });

    if (activeOnly) {
      const today = new Date().toISOString().split('T')[0];
      query = query.eq('is_active', true).lte('start_date', today).gte('end_date', today);
    }

    const { data: promotions, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, promotions });
  } catch (error) {
    console.error('Promotions GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      code,
      name,
      description,
      discount_type,
      discount_value,
      min_nights = 1,
      applicable_room_type_id,
      applicable_days_of_week,
      start_date,
      end_date,
      is_active = true,
      actorId,
      actorName,
    } = body;

    if (!code || !name || !discount_type || discount_value === undefined || !start_date || !end_date) {
      return NextResponse.json({ error: 'Missing required promotion fields' }, { status: 400 });
    }

    const supabase = getAdminClient();

    const { data: promo, error } = await supabase
      .from('promotions')
      .insert({
        code: code.trim().toUpperCase(),
        name,
        description: description || '',
        discount_type,
        discount_value: Number(discount_value),
        min_nights: Number(min_nights || 1),
        applicable_room_type_id: applicable_room_type_id || null,
        applicable_days_of_week: applicable_days_of_week || null,
        start_date,
        end_date,
        is_active,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAuditEvent({
      actorId,
      actorName,
      action: 'PROMOTION_CREATE',
      entity: 'promotion',
      entityId: promo.id,
      detailsAfter: promo,
    });

    return NextResponse.json({ success: true, promotion: promo });
  } catch (error) {
    console.error('Promotion POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, is_active, actorId, actorName, ...otherUpdates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Promotion ID is required' }, { status: 400 });
    }

    const supabase = getAdminClient();
    const { data: before } = await supabase.from('promotions').select('*').eq('id', id).single();

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      ...otherUpdates,
    };
    if (is_active !== undefined) updatePayload.is_active = is_active;

    const { data: updated, error } = await supabase
      .from('promotions')
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
      action: 'PROMOTION_UPDATE',
      entity: 'promotion',
      entityId: id,
      detailsBefore: before,
      detailsAfter: updated,
    });

    return NextResponse.json({ success: true, promotion: updated });
  } catch (error) {
    console.error('Promotion PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
