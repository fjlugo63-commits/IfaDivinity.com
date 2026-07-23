/**
 * pattern_key_generation module
 *
 * Convert mapped_bits into pattern_key and pattern_index.
 */

export interface PatternKeyInput {
  mapped_bits: string;
}

export interface PatternKeyOutput {
  pattern_key: string;
  pattern_index: number;
}

/**
 * Converts mapped bits into a pattern key (string representation)
 * and a pattern index (binary-to-decimal integer).
 *
 * The pattern_key is the canonical string form of the bits.
 * The pattern_index is the decimal value of the binary bits,
 * used for direct array/table lookups.
 */
export function patternKeyGeneration(input: PatternKeyInput): PatternKeyOutput {
  const { mapped_bits } = input;

  // stringifyBits: produce the canonical pattern key string
  const pattern_key = mapped_bits;

  // binaryToIndex: convert binary string to decimal index
  const pattern_index = parseInt(mapped_bits, 2);

  return {
    pattern_key,
    pattern_index: isNaN(pattern_index) ? 0 : pattern_index,
  };
}