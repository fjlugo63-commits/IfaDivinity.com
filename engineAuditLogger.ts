import { supabase, TABLES } from './supabase';

/**
 * Unified Engine Audit Logger
 * 
 * Centralized utility for logging audit events across all services:
 * - Consultation Engine (casting, interpretation, save)
 * - Awo Management (CRUD, status changes)
 * - House Management (CRUD, config changes)
 * - Rule Versions (create, publish, archive, rollback)
 * - Marketplace (product, order, payment events)
 * - Auth (login, role changes)
 * - Client (profile updates, booking actions)
 * - Vendor/Seller (verification, listing changes)
 */

// ─── Event Type Taxonomy ────────────────────────────────────────────────────

export type EngineEventType =
  // Consultation Engine Events
  | 'consultation_started'
  | 'cast_completed'
  | 'interpretation_applied'
  | 'consultation_saved'
  | 'consultation_cancelled'
  // Awo Management Events
  | 'awo_created'
  | 'awo_updated'
  | 'awo_deleted'
  | 'awo_status_changed'
  | 'awo_house_assigned'
  | 'awo_casting_toggled'
  // House Management Events
  | 'house_created'
  | 'house_updated'
  | 'house_deleted'
  | 'house_config_changed'
  | 'house_rule_version_linked'
  // Rule Version Events
  | 'rule_version_created'
  | 'rule_version_updated'
  | 'rule_version_published'
  | 'rule_version_archived'
  | 'rule_version_deleted'
  | 'rule_version_rolled_back'
  | 'rule_proposal_created'
  | 'rule_proposal_submitted'
  | 'rule_proposal_approved'
  | 'rule_proposal_rejected'
  // Marketplace Events
  | 'product_created'
  | 'product_updated'
  | 'product_deleted'
  | 'order_created'
  | 'order_paid'
  | 'order_cancelled'
  | 'order_refunded'
  // Auth Events
  | 'user_login'
  | 'user_logout'
  | 'user_role_changed'
  | 'user_registered'
  // Client Events
  | 'client_created'
  | 'client_updated'
  | 'client_status_changed'
  | 'client_registered'
  | 'client_logged_in'
  | 'client_updated_profile'
  | 'client_reset_password'
  | 'booking_created'
  | 'booking_accepted'
  | 'booking_declined'
  | 'booking_cancelled'
  | 'booking_rescheduled'
  | 'client_requested_consultation'
  | 'awo_accepted_consultation'
  | 'awo_declined_consultation'
  | 'awo_proposed_new_time'
  | 'consultation_scheduled'
  | 'client_paid_for_consultation'
  | 'consultation_completed'
  | 'client_viewed_consultation'
  | 'client_sent_message'
  | 'awo_sent_message'
  // Vendor/Seller Events
  | 'seller_verified'
  | 'seller_revoked'
  | 'seller_listing_created'
  | 'seller_listing_updated'
  | 'seller_listing_deleted'
  // Payment Events
  | 'payment_created'
  | 'payment_completed'
  | 'payment_refunded'
  | 'payment_link_generated'
  // System Events
  | 'config_updated'
  | 'system_error'
  | 'data_export'
  | 'data_import';

// ─── Service Category ───────────────────────────────────────────────────────

export type AuditServiceCategory =
  | 'engine'
  | 'awo'
  | 'house'
  | 'rules'
  | 'marketplace'
  | 'auth'
  | 'client'
  | 'vendor'
  | 'payment'
  | 'system';

// ─── Severity Level ─────────────────────────────────────────────────────────

export type AuditSeverity = 'info' | 'warning' | 'error' | 'critical';

// ─── Audit Log Entry Interface ──────────────────────────────────────────────

export interface EngineAuditLogEntry {
  id: string;
  event_type: EngineEventType;
  service_category: AuditServiceCategory;
  severity: AuditSeverity;
  actor_id: string | null;
  consultation_id: string | null;
  awo_id: string | null;
  house_id: string | null;
  rule_version_id: string | null;
  entity_type: string | null;
  entity_id: string | null;
  description: string | null;
  metadata_json: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

// ─── Log Input Interface ────────────────────────────────────────────────────

export interface LogAuditInput {
  event_type: EngineEventType;
  service_category: AuditServiceCategory;
  severity?: AuditSeverity;
  actor_id?: string | null;
  consultation_id?: string | null;
  awo_id?: string | null;
  house_id?: string | null;
  rule_version_id?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
}

// ─── Event Type → Service Category Mapping ──────────────────────────────────

const EVENT_CATEGORY_MAP: Record<string, AuditServiceCategory> = {
  consultation_started: 'engine',
  cast_completed: 'engine',
  interpretation_applied: 'engine',
  consultation_saved: 'engine',
  consultation_cancelled: 'engine',
  awo_created: 'awo',
  awo_updated: 'awo',
  awo_deleted: 'awo',
  awo_status_changed: 'awo',
  awo_house_assigned: 'awo',
  awo_casting_toggled: 'awo',
  house_created: 'house',
  house_updated: 'house',
  house_deleted: 'house',
  house_config_changed: 'house',
  house_rule_version_linked: 'house',
  rule_version_created: 'rules',
  rule_version_updated: 'rules',
  rule_version_published: 'rules',
  rule_version_archived: 'rules',
  rule_version_deleted: 'rules',
  rule_version_rolled_back: 'rules',
  rule_proposal_created: 'rules',
  rule_proposal_submitted: 'rules',
  rule_proposal_approved: 'rules',
  rule_proposal_rejected: 'rules',
  product_created: 'marketplace',
  product_updated: 'marketplace',
  product_deleted: 'marketplace',
  order_created: 'marketplace',
  order_paid: 'marketplace',
  order_cancelled: 'marketplace',
  order_refunded: 'marketplace',
  user_login: 'auth',
  user_logout: 'auth',
  user_role_changed: 'auth',
  user_registered: 'auth',
  client_created: 'client',
  client_updated: 'client',
  client_status_changed: 'client',
  client_registered: 'client',
  client_logged_in: 'client',
  client_updated_profile: 'client',
  client_reset_password: 'client',
  booking_created: 'client',
  booking_accepted: 'client',
  booking_declined: 'client',
  booking_cancelled: 'client',
  booking_rescheduled: 'client',
  client_requested_consultation: 'client',
  awo_accepted_consultation: 'engine',
  awo_declined_consultation: 'engine',
  awo_proposed_new_time: 'engine',
  consultation_scheduled: 'engine',
  client_paid_for_consultation: 'payment',
  consultation_completed: 'engine',
  client_viewed_consultation: 'client',
  client_sent_message: 'client',
  awo_sent_message: 'awo',
  seller_verified: 'vendor',
  seller_revoked: 'vendor',
  seller_listing_created: 'vendor',
  seller_listing_updated: 'vendor',
  seller_listing_deleted: 'vendor',
  payment_created: 'payment',
  payment_completed: 'payment',
  payment_refunded: 'payment',
  payment_link_generated: 'payment',
  config_updated: 'system',
  system_error: 'system',
  data_export: 'system',
  data_import: 'system',
};

// ─── Main Logging Function ──────────────────────────────────────────────────

/**
 * Log an audit event to the engine_audit_logs table.
 * Fails silently — audit logging should never block user actions.
 */
export async function logEngineAudit(input: LogAuditInput): Promise<boolean> {
  try {
    // Auto-resolve actor_id from current session if not provided
    let actorId = input.actor_id;
    if (actorId === undefined) {
      const { data: { user } } = await supabase.auth.getUser();
      actorId = user?.id || null;
    }

    // Auto-resolve service_category from event_type if not explicitly set
    const serviceCategory = input.service_category || EVENT_CATEGORY_MAP[input.event_type] || 'system';

    const { error } = await supabase.from(TABLES.engine_audit_logs).insert({
      event_type: input.event_type,
      service_category: serviceCategory,
      severity: input.severity || 'info',
      actor_id: actorId,
      consultation_id: input.consultation_id || null,
      awo_id: input.awo_id || null,
      house_id: input.house_id || null,
      rule_version_id: input.rule_version_id || null,
      entity_type: input.entity_type || null,
      entity_id: input.entity_id || null,
      description: input.description || null,
      metadata_json: input.metadata || null,
    });

    if (error) {
      console.warn('[EngineAudit] Failed to log event:', input.event_type, error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.warn('[EngineAudit] Exception logging event:', input.event_type, err);
    return false;
  }
}

// ─── Convenience Helpers ────────────────────────────────────────────────────

/** Log a consultation engine event */
export function logConsultationEvent(
  event_type: Extract<EngineEventType, 'consultation_started' | 'cast_completed' | 'interpretation_applied' | 'consultation_saved' | 'consultation_cancelled'>,
  opts: { consultation_id?: string; awo_id?: string; house_id?: string; rule_version_id?: string; description?: string; metadata?: Record<string, unknown> }
) {
  return logEngineAudit({
    event_type,
    service_category: 'engine',
    ...opts,
  });
}

/** Log an Awo management event */
export function logAwoEvent(
  event_type: Extract<EngineEventType, 'awo_created' | 'awo_updated' | 'awo_deleted' | 'awo_status_changed' | 'awo_house_assigned' | 'awo_casting_toggled'>,
  opts: { awo_id?: string; house_id?: string; entity_id?: string; description?: string; metadata?: Record<string, unknown> }
) {
  return logEngineAudit({
    event_type,
    service_category: 'awo',
    entity_type: 'engine_awos',
    ...opts,
  });
}

/** Log a house management event */
export function logHouseEvent(
  event_type: Extract<EngineEventType, 'house_created' | 'house_updated' | 'house_deleted' | 'house_config_changed' | 'house_rule_version_linked'>,
  opts: { house_id?: string; rule_version_id?: string; entity_id?: string; description?: string; metadata?: Record<string, unknown> }
) {
  return logEngineAudit({
    event_type,
    service_category: 'house',
    entity_type: 'engine_houses',
    ...opts,
  });
}

/** Log a rule version event */
export function logRuleEvent(
  event_type: Extract<EngineEventType, 'rule_version_created' | 'rule_version_updated' | 'rule_version_published' | 'rule_version_archived' | 'rule_version_deleted' | 'rule_version_rolled_back' | 'rule_proposal_created' | 'rule_proposal_submitted' | 'rule_proposal_approved' | 'rule_proposal_rejected'>,
  opts: { rule_version_id?: string; house_id?: string; entity_id?: string; actor_id?: string; severity?: AuditSeverity; description?: string; metadata?: Record<string, unknown> }
) {
  return logEngineAudit({
    event_type,
    service_category: 'rules',
    entity_type: 'engine_rule_versions',
    ...opts,
  });
}

/** Alias for logRuleEvent — convenience for rule version operations */
export const logRuleVersionEvent = logRuleEvent;

/** Log a marketplace event */
export function logMarketplaceEvent(
  event_type: Extract<EngineEventType, 'product_created' | 'product_updated' | 'product_deleted' | 'order_created' | 'order_paid' | 'order_cancelled' | 'order_refunded'>,
  opts: { entity_type?: string; entity_id?: string; description?: string; metadata?: Record<string, unknown> }
) {
  return logEngineAudit({
    event_type,
    service_category: 'marketplace',
    ...opts,
  });
}

/** Log an auth event */
export function logAuthEvent(
  event_type: Extract<EngineEventType, 'user_login' | 'user_logout' | 'user_role_changed' | 'user_registered'>,
  opts: { actor_id?: string; entity_id?: string; description?: string; metadata?: Record<string, unknown> }
) {
  return logEngineAudit({
    event_type,
    service_category: 'auth',
    entity_type: 'profiles',
    ...opts,
  });
}

/** Log a client/booking event */
export function logClientEvent(
  event_type: Extract<EngineEventType, 'client_created' | 'client_updated' | 'client_status_changed' | 'client_registered' | 'client_logged_in' | 'client_updated_profile' | 'client_reset_password' | 'booking_created' | 'booking_accepted' | 'booking_declined' | 'booking_cancelled' | 'booking_rescheduled' | 'client_requested_consultation' | 'client_viewed_consultation' | 'client_sent_message'>,
  opts: { entity_type?: string; entity_id?: string; actor_id?: string; awo_id?: string; house_id?: string; consultation_id?: string; description?: string; metadata?: Record<string, unknown> }
) {
  return logEngineAudit({
    event_type,
    service_category: 'client',
    ...opts,
  });
}

/** Log a consultation scheduling event (Awo-side actions) */
export function logConsultationSchedulingEvent(
  event_type: Extract<EngineEventType, 'awo_accepted_consultation' | 'awo_declined_consultation' | 'awo_proposed_new_time' | 'consultation_scheduled' | 'consultation_completed'>,
  opts: { consultation_id?: string; awo_id?: string; house_id?: string; entity_type?: string; entity_id?: string; actor_id?: string; description?: string; metadata?: Record<string, unknown> }
) {
  return logEngineAudit({
    event_type,
    service_category: 'engine',
    entity_type: opts.entity_type || 'consultation_requests',
    ...opts,
  });
}

/** Log a vendor/seller event */
export function logVendorEvent(
  event_type: Extract<EngineEventType, 'seller_verified' | 'seller_revoked' | 'seller_listing_created' | 'seller_listing_updated' | 'seller_listing_deleted'>,
  opts: { entity_type?: string; entity_id?: string; description?: string; metadata?: Record<string, unknown> }
) {
  return logEngineAudit({
    event_type,
    service_category: 'vendor',
    ...opts,
  });
}

/** Log a payment event */
export function logPaymentEvent(
  event_type: Extract<EngineEventType, 'payment_created' | 'payment_completed' | 'payment_refunded' | 'payment_link_generated'>,
  opts: { entity_type?: string; entity_id?: string; awo_id?: string; description?: string; metadata?: Record<string, unknown> }
) {
  return logEngineAudit({
    event_type,
    service_category: 'payment',
    ...opts,
  });
}

// ─── Fetch Utilities ────────────────────────────────────────────────────────

export interface AuditLogFilters {
  event_type?: string;
  service_category?: AuditServiceCategory;
  severity?: AuditSeverity;
  actor_id?: string;
  consultation_id?: string;
  awo_id?: string;
  house_id?: string;
  rule_version_id?: string;
  entity_type?: string;
  entity_id?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}

export interface AuditLogPage {
  logs: EngineAuditLogEntry[];
  total_count: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

/**
 * Fetch audit logs with filters and pagination.
 */
export async function fetchEngineAuditLogs(filters: AuditLogFilters = {}): Promise<AuditLogPage> {
  const page = filters.page || 1;
  const pageSize = filters.page_size || 50;
  const offset = (page - 1) * pageSize;

  try {
    let query = supabase
      .from(TABLES.engine_audit_logs)
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (filters.event_type && filters.event_type !== 'all') {
      query = query.eq('event_type', filters.event_type);
    }
    if (filters.service_category && filters.service_category !== 'all' as AuditServiceCategory) {
      query = query.eq('service_category', filters.service_category);
    }
    if (filters.severity && filters.severity !== 'all' as AuditSeverity) {
      query = query.eq('severity', filters.severity);
    }
    if (filters.actor_id?.trim()) {
      query = query.eq('actor_id', filters.actor_id.trim());
    }
    if (filters.consultation_id?.trim()) {
      query = query.eq('consultation_id', filters.consultation_id.trim());
    }
    if (filters.awo_id?.trim()) {
      query = query.eq('awo_id', filters.awo_id.trim());
    }
    if (filters.house_id?.trim()) {
      query = query.eq('house_id', filters.house_id.trim());
    }
    if (filters.rule_version_id?.trim()) {
      query = query.eq('rule_version_id', filters.rule_version_id.trim());
    }
    if (filters.entity_type?.trim()) {
      query = query.eq('entity_type', filters.entity_type.trim());
    }
    if (filters.entity_id?.trim()) {
      query = query.eq('entity_id', filters.entity_id.trim());
    }
    if (filters.date_from) {
      query = query.gte('created_at', filters.date_from);
    }
    if (filters.date_to) {
      query = query.lte('created_at', filters.date_to);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    const totalCount = count || 0;

    return {
      logs: (data || []) as EngineAuditLogEntry[],
      total_count: totalCount,
      page,
      page_size: pageSize,
      has_more: offset + pageSize < totalCount,
    };
  } catch (err) {
    console.error('[EngineAudit] Failed to fetch logs:', err);
    return { logs: [], total_count: 0, page, page_size: pageSize, has_more: false };
  }
}

/**
 * Fetch a single audit log entry by ID.
 */
export async function fetchAuditLogById(id: string): Promise<EngineAuditLogEntry | null> {
  try {
    const { data, error } = await supabase
      .from(TABLES.engine_audit_logs)
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as EngineAuditLogEntry;
  } catch (err) {
    console.error('[EngineAudit] Failed to fetch log by ID:', err);
    return null;
  }
}

/**
 * Fetch related audit logs for a given entity.
 */
export async function fetchRelatedAuditLogs(
  entityType: string,
  entityId: string,
  limit = 20
): Promise<EngineAuditLogEntry[]> {
  try {
    const { data, error } = await supabase
      .from(TABLES.engine_audit_logs)
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []) as EngineAuditLogEntry[];
  } catch (err) {
    console.error('[EngineAudit] Failed to fetch related logs:', err);
    return [];
  }
}

// ─── Export Utility ─────────────────────────────────────────────────────────

/**
 * Export audit logs as CSV string.
 */
export function exportAuditLogsCSV(logs: EngineAuditLogEntry[]): string {
  const headers = [
    'ID', 'Event Type', 'Service Category', 'Severity', 'Actor ID',
    'Consultation ID', 'Awo ID', 'House ID', 'Rule Version ID',
    'Entity Type', 'Entity ID', 'Description', 'Metadata', 'Created At'
  ];

  const rows = logs.map(log => [
    log.id,
    log.event_type,
    log.service_category || '',
    log.severity || 'info',
    log.actor_id || '',
    log.consultation_id || '',
    log.awo_id || '',
    log.house_id || '',
    log.rule_version_id || '',
    log.entity_type || '',
    log.entity_id || '',
    (log.description || '').replace(/"/g, '""'),
    JSON.stringify(log.metadata_json || {}).replace(/"/g, '""'),
    log.created_at,
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  return csvContent;
}

/**
 * Trigger CSV download in browser.
 */
export function downloadAuditLogsCSV(logs: EngineAuditLogEntry[], filename?: string) {
  const csv = exportAuditLogsCSV(logs);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}