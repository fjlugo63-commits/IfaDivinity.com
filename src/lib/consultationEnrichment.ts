import { supabase, TABLES } from './supabase';

/**
 * consultation_enrichment module
 *
 * Enrich consultation record with house tradition naming, Odu variants,
 * and lineage metadata. Selects the appropriate tradition-specific Odu name
 * (Yoruba vs Lukumi) based on the house's tradition setting.
 */

export interface ConsultationEnrichmentInput {
  consultation_record_id: string;
}

export interface ConsultationEnrichmentOutput {
  consultation_record_id: string;
  main_odu_display: string | null;
}

/**
 * Select the tradition-appropriate Odu display name.
 */
function selectTraditionName(
  tradition: string | null,
  yoruba_name: string | null,
  lukumi_name: string | null
): string {
  if (tradition === 'lukumi' && lukumi_name) {
    return lukumi_name;
  }
  // Default to Yoruba name
  return yoruba_name || lukumi_name || 'Unknown Odu';
}

export async function consultationEnrichment(
  input: ConsultationEnrichmentInput
): Promise<ConsultationEnrichmentOutput> {
  const { consultation_record_id } = input;

  // Step 1: Fetch the consultation record
  const { data: record, error: recordError } = await supabase
    .from(TABLES.consultation_record)
    .select('*')
    .eq('id', consultation_record_id)
    .single();

  if (recordError || !record) {
    console.error('Failed to fetch consultation record:', recordError);
    return { consultation_record_id, main_odu_display: null };
  }

  // Step 2: Fetch the house profile
  const { data: house } = await supabase
    .from(TABLES.house_profile)
    .select('tradition')
    .eq('id', record.house_id)
    .single();

  // Step 3: Fetch the Odu name map entry
  const { data: oduMap } = await supabase
    .from(TABLES.odu_name_map)
    .select('yoruba_name, lukumi_name')
    .eq('odu_code', record.main_odu)
    .single();

  // Step 4: Transform - select tradition-appropriate name
  const oduDisplayName = selectTraditionName(
    house?.tradition || null,
    oduMap?.yoruba_name || null,
    oduMap?.lukumi_name || null
  );

  // Step 5: Update the consultation record with the display name
  await supabase
    .from(TABLES.consultation_record)
    .update({ main_odu: oduDisplayName })
    .eq('id', consultation_record_id);

  return {
    consultation_record_id,
    main_odu_display: oduDisplayName,
  };
}