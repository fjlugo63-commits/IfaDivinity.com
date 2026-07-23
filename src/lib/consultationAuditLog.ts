import { supabase, TABLES } from './supabase';

/**
 * consultation_audit_log module
 *
 * Create audit log entry for a consultation.
 * Records the main Odu, ire/osogbo, subtype, and orisha owner.
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
    .select('main_odu, ire_or_osogbo, subtype, orisha_owner')
    .eq('id', consultation_record_id)
    .single();

  if (fetchError || !record) {
    console.error('Failed to fetch consultation record for audit:', fetchError);
    return { audit_logged: false };
  }

  // Step 2: Insert audit log entry
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
    console.error('Failed to insert audit log:', insertError);
    return { audit_logged: false };
  }

  return { audit_logged: true };
}