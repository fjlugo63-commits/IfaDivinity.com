import { supabase, TABLES } from './supabase';

/**
 * opele_cast_mapping module
 * 
 * Apply awo-specific consecration mapping to raw Opele bits
 * to produce canonical mapped_bits.
 */

export interface ConsecrationMapping {
  id: string;
  awo_id: string;
  physical_index_to_canonical: Record<number, number>;
  created_at: string;
}

export interface OpeleCastMappingInput {
  raw_bits: string;
  awo_id: string;
}

export interface OpeleCastMappingOutput {
  mapped_bits: string;
}

/**
 * Fetches the consecration mapping for a given awo and applies it
 * to the raw bits to produce canonical mapped bits.
 * 
 * The physical_index_to_canonical is a JSON object mapping physical
 * chain positions (0-7) to their canonical positions based on the
 * awo's specific consecration/initiation.
 */
export async function opeleCastMapping(
  input: OpeleCastMappingInput
): Promise<OpeleCastMappingOutput> {
  const { raw_bits, awo_id } = input;

  // Fetch the consecration mapping for this awo
  const { data: mapping, error } = await supabase
    .from(TABLES.consecration_mapping)
    .select('*')
    .eq('awo_id', awo_id)
    .single();

  if (error || !mapping) {
    // If no mapping exists, return raw_bits unchanged (identity mapping)
    return { mapped_bits: raw_bits };
  }

  const physicalToCanonical: Record<number, number> = mapping.physical_index_to_canonical;

  // Apply the mapping: rearrange bits according to consecration mapping
  const bitsArray = raw_bits.split('');
  const mappedArray = new Array(bitsArray.length).fill('0');

  for (const [physicalIdx, canonicalIdx] of Object.entries(physicalToCanonical)) {
    const pIdx = parseInt(physicalIdx, 10);
    const cIdx = canonicalIdx;
    if (pIdx < bitsArray.length) {
      mappedArray[cIdx] = bitsArray[pIdx];
    }
  }

  return { mapped_bits: mappedArray.join('') };
}