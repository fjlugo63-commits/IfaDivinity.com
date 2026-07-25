import { supabase, TABLES } from './supabase';
import { logConsultationEvent } from './engineAuditLogger';

/**
 * consultation_audit_log module
 * 
 * Create audit log entry for a consultation.
 * Records the main Odu, ire/osogbo, subtype, and orisha owner.
 * 
 * Dual-writes: legacy audit_log table + unified engine_audit_logs via engineAuditLogger.
 */

export interface ConsultationAuditLogInput {
  consultation_record_id: string;
  actor_id: string;
}

export interface ConsultationAuditLogOutput {
  audit_logged: boolean;
}

export async function consultationAuditLog(
  input: ConsultationAuditLogInput
): Promise<ConsultationAuditLogOutput> {
  const { consultation_record_id, actor_id } = input;

  // Step 1: Fetch the consultation record
  const { data: record, error: fetchError } = await supabase
    .from(TABLES.consultation_record)
    .select('main_odu, ire_or_osogbo, subtype, orisha_owner, awo_id, house_id, rule_version_id')
    .eq('id', consultation_record_id)
    .single();

  if (fetchError || !record) {
    console.error('Failed to fetch consultation record for audit:', fetchError);
    return { audit_logged: false };
  }

  // Step 2: Insert into legacy audit_log table (backward compatibility)
  const { error: insertError } = await supabase
    .from(TABLES.audit_log)
    .insert({
      actor_id,
      action: 'consultation_performed',
      entity: 'consultation_record',
      entity_id: consultation_record_id,
      payload: {
        main_odu: record.main_odu,
        ire_or_osogbo: record.ire_or_osogbo,
        subtype: record.subtype,
        orisha_owner: record.orisha_owner,
      },
    });

  if (insertError) {
    console.error('Failed to insert legacy audit log:', insertError);
  }

  // Step 3: Write to unified engine_audit_logs via engineAuditLogger
  const unifiedLogged = await logConsultationEvent('consultation_saved', {
    consultation_id: consultation_record_id,
    awo_id: record.awo_id || undefined,
    house_id: record.house_id || undefined,
    rule_version_id: record.rule_version_id || undefined,
    description: `Consultation performed: ${record.main_odu || 'unknown'} — ${record.ire_or_osogbo || 'pending'}`,
    metadata: {
      main_odu: record.main_odu,
      ire_or_osogbo: record.ire_or_osogbo,
      subtype: record.subtype,
      orisha_owner: record.orisha_owner,
      actor_id,
      source: 'consultationLoggingPipeline',
    },
  });

  // Consider success if either write succeeded
  return { audit_logged: !insertError || unifiedLogged };
}