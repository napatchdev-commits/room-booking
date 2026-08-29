import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { logAuditEvent } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const supabase = getAdminClient();
    const { data: settings, error } = await supabase
      .from('settings')
      .select('*')
      .eq('id', 'default')
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: { 'Cache-Control': 'no-store, max-age=0' } }
      );
    }

    return NextResponse.json(
      { success: true, settings: settings || {} },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error) {
    console.error('Settings GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      resort_name,
      resort_name_en,
      address,
      phone,
      email,
      line_id,
      line_liff_id,
      line_channel_access_token,
      line_admin_user_id,
      line_notify_token,
      logo_url,
      tax_id,
      bank_accounts,
      check_in_time,
      check_out_time,
      policy_terms,
      actorId,
      actorName,
    } = body;

    const supabase = getAdminClient();

    const { data: before } = await supabase
      .from('settings')
      .select('*')
      .eq('id', 'default')
      .maybeSingle();

    const updatePayload: Record<string, unknown> = {
      id: 'default',
      updated_at: new Date().toISOString(),
    };

    if (resort_name !== undefined) updatePayload.resort_name = resort_name;
    if (resort_name_en !== undefined) updatePayload.resort_name_en = resort_name_en;
    if (address !== undefined) updatePayload.address = address;
    if (phone !== undefined) updatePayload.phone = phone;
    if (email !== undefined) updatePayload.email = email;
    if (line_id !== undefined) updatePayload.line_id = line_id;
    if (line_liff_id !== undefined) updatePayload.line_liff_id = line_liff_id;
    if (line_channel_access_token !== undefined) updatePayload.line_channel_access_token = line_channel_access_token;
    if (line_admin_user_id !== undefined) updatePayload.line_admin_user_id = line_admin_user_id;
    if (line_notify_token !== undefined) updatePayload.line_notify_token = line_notify_token;
    if (logo_url !== undefined) updatePayload.logo_url = logo_url;
    if (tax_id !== undefined) updatePayload.tax_id = tax_id;
    if (bank_accounts !== undefined) updatePayload.bank_accounts = bank_accounts;
    if (check_in_time !== undefined) updatePayload.check_in_time = check_in_time;
    if (check_out_time !== undefined) updatePayload.check_out_time = check_out_time;
    if (policy_terms !== undefined) updatePayload.policy_terms = policy_terms;

    let { data: updated, error } = await supabase
      .from('settings')
      .upsert(updatePayload)
      .select()
      .single();

    // Fallback: If line_channel_access_token column does not exist yet in Supabase schema
    if (error && error.code === 'PGRST204') {
      console.warn('PGRST204: Line token columns not yet in Supabase table. Retrying with basic columns...');
      const fallbackPayload = { ...updatePayload };
      delete fallbackPayload.line_channel_access_token;
      delete fallbackPayload.line_admin_user_id;
      delete fallbackPayload.line_notify_token;

      const retry = await supabase
        .from('settings')
        .upsert(fallbackPayload)
        .select()
        .single();

      if (retry.error) {
        return NextResponse.json({ error: retry.error.message }, { status: 500 });
      }

      // Merge the entered tokens so client gets confirmation
      updated = {
        ...retry.data,
        line_channel_access_token,
        line_admin_user_id,
        line_notify_token,
      };
    } else if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAuditEvent({
      actorId,
      actorName: actorName || 'Admin',
      action: 'SETTINGS_UPDATE',
      entity: 'setting',
      entityId: 'default',
      detailsBefore: before,
      detailsAfter: updated,
    });

    return NextResponse.json(
      { success: true, settings: updated },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error) {
    console.error('Settings PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
