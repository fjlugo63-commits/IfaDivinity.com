import { supabase, TABLES } from './supabase';

/**
 * consultation_indexer module
 *
 * Generate searchable index metadata for analytics and certification.
 * Creates a composite index blob from the consultation's key fields
 * and logs it to the audit trail.
 */

export interface ConsultationIndexerInput {
  consultation_record_id: string;
}

export interface ConsultationIndexerOutput {
  indexed: boolean;
}

/**
 * Generate a searchable index blob from consultation data.
 */
function generateIndex(data: {
  main_odu: string | null;
  ire_or_osogbo: string | null;
  subtype: string | null;
  pattern_index: number | null;
}): Record<string, unknown> {
  return {
    odu_key: data.main_odu?.toLowerCase().replace(/\s+/g, '_') || null,
    outcome: data.ire_or_osogbo,
    subtype: data.subtype,
    pattern_index: data.pattern_index,
    indexed_at: new Date().toISOString(),
    searchable_text: [
      data.main_odu,
      data.ire_or_osogbo,
      data.subtype,
    ]
      .filter(Boolean)
      .join(' '),
  };
}

export async function consultationIndexer(
  input: ConsultationIndexerInput
): Promise<ConsultationIndexerOutput> {
  const { consultation_record_id } = input;

  // Step 1: Fetch the consultation record
  const { data: record, error: fetchError } = await supabase
    .from(TABLES.consultation_record)
    .select('main_odu, ire_or_osogbo, subtype, pattern_index, awo_id')
    .eq('id', consultation_record_id)
    .single();

  if (fetchError || !record) {
    console.error('Failed to fetch consultation record for indexing:', fetchError);
    return { indexed: false };
  }

  // Step 2: Transform - generate index blob
  const indexBlob = generateIndex({
    main_odu: record.main_odu,
    ire_or_osogbo: record.ire_or_osogbo,
    subtype: record.subtype,
    pattern_index: record.pattern_index,
  });

  // Step 3: Insert audit log with index data
  const { error: insertError } = await supabase
    .from(TABLES.audit_log)
    .insert({
      actor_id: record.awo_id,
      action: 'consultation_indexed',
      entity: 'consultation_record',
      entity_id: consultation_record_id,
      payload: indexBlob,
    });

  if (insertError) {
    console.error('Failed to log consultation index:', insertError);
    return { indexed: false };
  }

  return { indexed: true };
}