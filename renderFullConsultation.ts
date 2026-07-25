import { supabase, TABLES } from './supabase';
import { renderOduName } from './renderOduName';
import { renderCast2, renderCast3, renderCast4 } from './renderCastTables';

/**
 * render_full_consultation module
 * 
 * Render full consultation output using house tradition, spelling maps,
 * and cast tables. Orchestrates all render sub-modules.
 */

export interface RenderFullConsultationInput {
  consultation_record_id: string;
}

export interface RenderFullConsultationOutput {
  main_odu_display: string;
  ire_or_osogbo_display: string;
  subtype_display: string;
  orisha_owner_display: string;
}

export async function renderFullConsultation(
  input: RenderFullConsultationInput
): Promise<RenderFullConsultationOutput> {
  const { consultation_record_id } = input;

  // Step 1: Fetch the consultation record
  const { data: record, error: fetchError } = await supabase
    .from(TABLES.consultation_record)
    .select('main_odu, ire_or_osogbo, subtype, orisha_owner, house_id')
    .eq('id', consultation_record_id)
    .single();

  if (fetchError || !record) {
    console.error('Failed to fetch consultation record for rendering:', fetchError);
    return {
      main_odu_display: 'Unknown',
      ire_or_osogbo_display: 'Unknown',
      subtype_display: 'Unknown',
      orisha_owner_display: 'Unknown',
    };
  }

  // Step 2: Render Odu name
  const odu = await renderOduName({
    odu_code: record.main_odu,
    house_id: record.house_id,
  });

  // Step 3: Render cast2 (Ire/Osogbo)
  const cast2 = await renderCast2({
    ire_or_osogbo: record.ire_or_osogbo,
    house_id: record.house_id,
  });

  // Step 4: Render cast3 (subtype)
  const cast3 = await renderCast3({
    subtype: record.subtype,
    house_id: record.house_id,
  });

  // Step 5: Render cast4 (Orisha owner)
  const cast4 = await renderCast4({
    orisha_owner: record.orisha_owner,
    house_id: record.house_id,
  });

  return {
    main_odu_display: odu.odu_display_name,
    ire_or_osogbo_display: cast2.cast2_display,
    subtype_display: cast3.cast3_display,
    orisha_owner_display: cast4.cast4_display,
  };
}