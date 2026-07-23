import { supabase, TABLES } from './supabase';

/**
 * odu_lookup module
 *
 * Lookup Odu results using house tradition, pattern_key,
 * and active rule_version from consult_engine_config.
 */

export interface OduLookupInput {
  house_id: string;
  pattern_key: string;
}

export interface OduLookupOutput {
  main_odu: string;
  ire_or_osogbo: string;
  subtype: string;
  orisha_owner: string;
  recommended_ebo: unknown;
  rule_version_id: string;
}

/**
 * Looks up the Odu interpretation for a given pattern_key within a house.
 *
 * Steps:
 * 1. Fetch the consult_engine_config for the house to get the active rule version
 * 2. Fetch the house_odu_rule matching house_id, active rule_version_id, and pattern_key
 * 3. Map the rule fields to the output format
 */
export async function oduLookup(
  input: OduLookupInput
): Promise<OduLookupOutput | null> {
  const { house_id, pattern_key } = input;

  // Step 1: Get the engine config to find active rule version
  const { data: engineConfig, error: configError } = await supabase
    .from(TABLES.consult_engine_config)
    .select('*')
    .eq('house_id', house_id)
    .single();

  if (configError || !engineConfig) {
    console.error('No engine config found for house:', house_id);
    return null;
  }

  const activeRuleVersionId = engineConfig.active_rule_version_id;

  if (!activeRuleVersionId) {
    console.error('No active rule version configured for house:', house_id);
    return null;
  }

  // Step 2: Fetch the matching odu rule
  const { data: rule, error: ruleError } = await supabase
    .from(TABLES.house_odu_rule)
    .select('*')
    .eq('house_id', house_id)
    .eq('rule_version_id', activeRuleVersionId)
    .eq('pattern_key', pattern_key)
    .single();

  if (ruleError || !rule) {
    console.error('No odu rule found for pattern:', pattern_key);
    return null;
  }

  // Step 3: Map rule fields to output
  return {
    main_odu: rule.odu_code || '',
    ire_or_osogbo: rule.result || '',
    subtype: rule.subtype || '',
    orisha_owner: rule.combined_name || '',
    recommended_ebo: rule.recommended_ebo || [],
    rule_version_id: rule.rule_version_id,
  };
}