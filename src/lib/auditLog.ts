import { supabase } from '@/integrations/supabase/client';

/**
 * Registra uma ação crítica do usuário na tabela audit_logs.
 * Falhas são silenciosas (não bloqueiam o fluxo principal).
 *
 * Uso típico:
 *   await logAudit('group.delete', 'group', groupId, { name });
 */
export async function logAudit(
  action: string,
  entityType?: string | null,
  entityId?: string | null,
  details?: Record<string, unknown> | null,
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('audit_logs').insert([{
      user_id: user.id,
      action,
      entity_type: entityType ?? null,
      entity_id: entityId ?? null,
      details: (details ?? null) as never,
    }]);
  } catch (err) {
    console.warn('[audit] log failed', err);
  }
}
