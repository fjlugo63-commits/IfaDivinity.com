import { supabase, TABLES } from '../supabase';
import { consultEngine } from '../consultEngineUnified';
import { consultationLoggingPipeline } from '../consultationLoggingPipeline';
import { renderFullConsultation } from '../renderFullConsultation';

/**
 * API Endpoints: Consultation
 *
 * POST /consult/opele - Perform an Opele consultation and return rendered results
 * GET /consult/{id} - Fetch and render a consultation by ID
 */

export interface CreateOpeleConsultationInput {
  raw_bits: string;
  awo_id: string;
  house_id: string;
}

export interface ConsultationResult {
  consultation_record_id: string | null;
  main_odu: string;
  ire_or_osogbo: string;
  subtype: string;
  orisha_owner: string;
  recommended_ebo: string | null;
}

/**
 * POST /consult/opele
 * Perform an Opele consultation and return rendered results.
 */
export async function createOpeleConsultation(
  input: CreateOpeleConsultationInput
): Promise<ConsultationResult> {
  const { raw_bits, awo_id, house_id } = input;

  // Step 1: Run the consult engine
  const engine = await consultEngine({ raw_bits, awo_id, house_id });

  if (!engine.consultation_record_id) {
    return {
      consultation_record_id: null,
      main_odu: 'Error',
      ire_or_osogbo: 'Error',
      subtype: 'Error',
      orisha_owner: 'Error',
      recommended_ebo: null,
    };
  }

  // Step 2: Run the logging pipeline (enrich → audit → index)
  await consultationLoggingPipeline({
    consultation_record_id: engine.consultation_record_id,
    actor_id: awo_id,
  });

  // Step 3: Render the full consultation with house-specific display
  const rendered = await renderFullConsultation({
    consultation_record_id: engine.consultation_record_id,
  });

  return {
    consultation_record_id: engine.consultation_record_id,
    main_odu: rendered.main_odu_display,
    ire_or_osogbo: rendered.ire_or_osogbo_display,
    subtype: rendered.subtype_display,
    orisha_owner: rendered.orisha_owner_display,
    recommended_ebo: engine.odu_result?.recommended_ebo || null,
  };
}

/**
 * GET /consult/{id}
 * Fetch and render a consultation by ID.
 */
export async function getConsultation(
  id: string
): Promise<ConsultationResult> {
  // Step 1: Fetch the consultation record
  const { data: record, error } = await supabase
    .from(TABLES.consultation_record)
    .select('recommended_ebo')
    .eq('id', id)
    .single();

  if (error || !record) {
    return {
      consultation_record_id: id,
      main_odu: 'Not Found',
      ire_or_osogbo: 'Not Found',
      subtype: 'Not Found',
      orisha_owner: 'Not Found',
      recommended_ebo: null,
    };
  }

  // Step 2: Render the full consultation
  const rendered = await renderFullConsultation({
    consultation_record_id: id,
  });

  return {
    consultation_record_id: id,
    main_odu: rendered.main_odu_display,
    ire_or_osogbo: rendered.ire_or_osogbo_display,
    subtype: rendered.subtype_display,
    orisha_owner: rendered.orisha_owner_display,
    recommended_ebo: record.recommended_ebo || null,
  };
}