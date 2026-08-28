import { getAdminClient } from './supabase/admin';

export interface LogAuditParams {
  actorId?: string;
  actorName?: string;
  action: string;
  entity: 'booking' | 'payment' | 'receipt' | 'discount' | 'room' | 'setting' | 'promotion' | 'user';
  entityId: string;
  detailsBefore?: Record<string, unknown> | null;
  detailsAfter?: Record<string, unknown> | null;
}

export async function logAuditEvent(params: LogAuditParams) {
  try {
    const supabase = getAdminClient();
    const { error } = await supabase.from('audit_logs').insert({
      actor_id: params.actorId || null,
      actor_name: params.actorName || 'System',
      action: params.action,
      entity: params.entity,
      entity_id: params.entityId,
      details_before: params.detailsBefore || null,
      details_after: params.detailsAfter || null,
    });

    if (error) {
      console.error('Failed to write audit log:', error);
    }
  } catch (err) {
    console.error('Audit log error:', err);
  }
}
