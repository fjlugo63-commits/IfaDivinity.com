import { supabase, TABLES } from '../supabase';

/**
 * API Endpoints: Audit Logs
 *
 * GET /audit/logs - List audit logs with optional filters
 */

export interface ListAuditLogsInput {
  actor_id?: string;
  entity?: string;
  entity_id?: string;
}

export interface AuditLogEntry {
  id: string;
  actor_id: string;
  action: string;
  entity: string;
  entity_id: string;
  payload: Record<string, unknown> | null;
  created_at: string;
}

export interface ListAuditLogsOutput {
  logs: AuditLogEntry[];
}

/**
 * GET /audit/logs
 * List audit logs with optional filters by actor, entity type, or entity ID.
 */
export async function listAuditLogs(
  input: ListAuditLogsInput
): Promise<ListAuditLogsOutput> {
  let query = supabase
    .from(TABLES.audit_log)
    .select('*')
    .order('created_at', { ascending: false });

  // Apply optional filters
  if (input.actor_id) {
    query = query.eq('actor_id', input.actor_id);
  }
  if (input.entity) {
    query = query.eq('entity', input.entity);
  }
  if (input.entity_id) {
    query = query.eq('entity_id', input.entity_id);
  }

  const { data: logs, error } = await query;

  if (error) {
    console.error('Failed to fetch audit logs:', error);
    return { logs: [] };
  }

  return { logs: (logs as AuditLogEntry[]) || [] };
}