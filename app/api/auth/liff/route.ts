import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { lineUserId, displayName, pictureUrl, statusMessage, email, phone, fullName } = body;

    if (!lineUserId) {
      return NextResponse.json({ error: 'lineUserId is required' }, { status: 400 });
    }

    const supabase = getAdminClient();

    // 1. Check if line_user exists
    const { data: existingLineUser } = await supabase
      .from('line_users')
      .select('*, customer:customers(*)')
      .eq('line_user_id', lineUserId)
      .maybeSingle();

    let customerId: string;

    if (existingLineUser && existingLineUser.customer_id) {
      customerId = existingLineUser.customer_id;

      // Update customer info if newly provided
      const updateData: Record<string, unknown> = {};
      if (fullName) updateData.full_name = fullName;
      if (phone) updateData.phone = phone;
      if (email) updateData.email = email;

      if (Object.keys(updateData).length > 0) {
        await supabase
          .from('customers')
          .update(updateData)
          .eq('id', customerId);
      }

      // Update line_user activity
      await supabase
        .from('line_users')
        .update({
          display_name: displayName || existingLineUser.display_name,
          picture_url: pictureUrl || existingLineUser.picture_url,
          status_message: statusMessage || existingLineUser.status_message,
          last_active_at: new Date().toISOString(),
        })
        .eq('line_user_id', lineUserId);
    } else {
      // 2. Create new customer record
      const { data: newCustomer, error: custError } = await supabase
        .from('customers')
        .insert({
          full_name: fullName || displayName || 'LINE Customer',
          phone: phone || '',
          email: email || null,
        })
        .select()
        .single();

      if (custError || !newCustomer) {
        console.error('Failed to create customer for LINE user:', custError);
        return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
      }

      customerId = newCustomer.id;

      // Create line_user mapping
      await supabase.from('line_users').insert({
        line_user_id: lineUserId,
        customer_id: customerId,
        display_name: displayName || 'LINE User',
        picture_url: pictureUrl || null,
        status_message: statusMessage || null,
      });
    }

    // Fetch refreshed customer
    const { data: customer } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    return NextResponse.json({
      success: true,
      customerId,
      customer,
      lineUserId,
    });
  } catch (error) {
    console.error('LINE Auth API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
