import { supabase, TABLES } from './supabase';

/**
 * consultation_record_writer module
 *
 * Write full consultation record to database.
 */

export interface ConsultationRecordInput {
  awo_id: string;
  house_id: string;
  raw_bits: string;
  mapped_bits: string;
  pattern_key: string;
  pattern_index: number;
  main_odu: string;
  ire_or_osogbo: string;
  subtype: string;
  orisha_owner: string;
  recommended_ebo: unknown;
  rule_version_id: string;
  notes?: string;
}

export interface ConsultationRecordOutput {
  consultation_record_id: string | null;
}

/**
 * Inserts a complete consultation record into the consultation_record table.
 * Returns the newly created record's ID.
 */
export async function consultationRecordWriter(
  input: ConsultationRecordInput
): Promise<ConsultationRecordOutput> {
  const { data, error } = await supabase
    .from(TABLES.consultation_record)
    .insert({
      awo_id: input.awo_id,
      house_id: input.house_id,
      raw_bits: input.raw_bits,
      mapped_bits: input.mapped_bits,
      pattern_key: input.pattern_key,
      pattern_index: input.pattern_index,
      main_odu: input.main_odu,
      ire_or_osogbo: input.ire_or_osogbo,
      subtype: input.subtype,
      orisha_owner: input.orisha_owner,
      recommended_ebo: input.recommended_ebo,
      rule_version_id: input.rule_version_id,
      notes: input.notes || null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to write consultation record:', error);
    return { consultation_record_id: null };
  }

  return { consultation_record_id: data?.id || null };
}