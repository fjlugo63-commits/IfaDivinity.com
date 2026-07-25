import { supabase, TABLES } from './supabase';

/**
 * activate_rule_version module
 * 
 * Set a rule_version as the active version for a house.
 * Updates consult_engine_config and logs the action.
 */

export interface ActivateRuleVersionInput {
  house_id: string;
  rule_version_id: string;
  actor_id: string;
}

export interface ActivateRuleVersionOutput {
  house_id: string;
  active_rule_version_id: string;
}

export async function activateRuleVersion(
  input: ActivateRuleVersionInput
): Promise<ActivateRuleVersionOutput> {
  const { house_id, rule_version_id, actor_id } = input;

  // Step 1: Update consult_engine_config with the new active rule version
  const { error: updateError } = await supabase
    .from(TABLES.consult_engine_config)
    .update({
      active_rule_version_id: rule_version_id,
      updated_at: new Date().toISOString(),
    })
    .eq('house_id', house_id);

  if (updateError) {
    console.error('Failed to activate rule version:', updateError);
  }

  // Step 2: Log to audit_log
  await supabase.from(TABLES.audit_log).insert({
    actor_id,
    action: 'rule_version_activated',
    entity: 'consult_engine_config',
    entity_id: house_id,
    payload: { rule_version_id },
  });

  return {
    house_id,
    active_rule_version_id: rule_version_id,
  };
}