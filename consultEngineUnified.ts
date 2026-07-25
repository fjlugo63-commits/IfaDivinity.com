import { opeleCastMapping } from './opeleCastMapping';
import { patternKeyGeneration } from './patternKeyGeneration';
import { oduLookup, OduLookupOutput } from './oduLookup';
import { consultationRecordWriter } from './consultationRecordWriter';

/**
 * consult_engine (unified)
 * 
 * Performs a full Opele consultation by orchestrating all sub-modules:
 * 1. opele_cast_mapping - Apply consecration mapping to raw bits
 * 2. pattern_key_generation - Convert mapped bits to pattern key/index
 * 3. odu_lookup - Look up Odu interpretation from house rules
 * 4. consultation_record_writer - Persist the consultation record
 */

export interface ConsultEngineInput {
  raw_bits: string;
  awo_id: string;
  house_id: string;
  notes?: string;
}

export interface ConsultEngineOutput {
  success: boolean;
  consultation_record_id: string | null;
  mapped_bits: string;
  pattern_key: string;
  pattern_index: number;
  odu_result: OduLookupOutput | null;
  error?: string;
}

/**
 * Runs the full consultation pipeline:
 * 
 * raw_bits → [opele_cast_mapping] → mapped_bits
 * mapped_bits → [pattern_key_generation] → pattern_key + pattern_index
 * house_id + pattern_key → [odu_lookup] → odu interpretation
 * all data → [consultation_record_writer] → persisted record
 */
export async function consultEngine(
  input: ConsultEngineInput
): Promise<ConsultEngineOutput> {
  const { raw_bits, awo_id, house_id, notes } = input;

  try {
    // Step 1: Apply consecration mapping
    const { mapped_bits } = await opeleCastMapping({ raw_bits, awo_id });

    // Step 2: Generate pattern key and index
    const { pattern_key, pattern_index } = patternKeyGeneration({ mapped_bits });

    // Step 3: Lookup Odu from house rules
    const oduResult = await oduLookup({ house_id, pattern_key });

    if (!oduResult) {
      return {
        success: false,
        consultation_record_id: null,
        mapped_bits,
        pattern_key,
        pattern_index,
        odu_result: null,
        error: 'No Odu rule found for the given pattern in this house.',
      };
    }

    // Step 4: Write consultation record
    const { consultation_record_id } = await consultationRecordWriter({
      awo_id,
      house_id,
      raw_bits,
      mapped_bits,
      pattern_key,
      pattern_index,
      main_odu: oduResult.main_odu,
      ire_or_osogbo: oduResult.ire_or_osogbo,
      subtype: oduResult.subtype,
      orisha_owner: oduResult.orisha_owner,
      recommended_ebo: oduResult.recommended_ebo,
      rule_version_id: oduResult.rule_version_id,
      notes,
    });

    return {
      success: true,
      consultation_record_id,
      mapped_bits,
      pattern_key,
      pattern_index,
      odu_result: oduResult,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error during consultation';
    console.error('Consult engine error:', errorMessage);
    return {
      success: false,
      consultation_record_id: null,
      mapped_bits: '',
      pattern_key: '',
      pattern_index: 0,
      odu_result: null,
      error: errorMessage,
    };
  }
}