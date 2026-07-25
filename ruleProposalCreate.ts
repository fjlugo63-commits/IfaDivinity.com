import { supabase, TABLES } from './supabase';

/**
 * rule_proposal_create module
 * 
 * Create a new rule change proposal for a house.
 * Also logs the action to the audit_log.
 */

export interface RuleProposalCreateInput {
  house_id: string;
  proposed_by: string;
  changes: Record<string, unknown>;
}

export interface RuleProposalCreateOutput {
  proposal_id: string | null;
}

export async function ruleProposalCreate(
  input: RuleProposalCreateInput
): Promise<RuleProposalCreateOutput> {
  const { house_id, proposed_by, changes } = input;

  // Step 1: Insert the proposal
  const { data: proposal, error: proposalError } = await supabase
    .from(TABLES.rule_change_proposal)
    .insert({
      house_id,
      proposed_by,
      changes,
      status: 'pending',
    })
    .select('id')
    .single();

  if (proposalError || !proposal) {
    console.error('Failed to create rule proposal:', proposalError);
    return { proposal_id: null };
  }

  // Step 2: Log to audit_log
  await supabase.from(TABLES.audit_log).insert({
    actor_id: proposed_by,
    action: 'rule_proposal_created',
    entity: 'rule_change_proposal',
    entity_id: proposal.id,
    payload: changes,
  });

  return { proposal_id: proposal.id };
}