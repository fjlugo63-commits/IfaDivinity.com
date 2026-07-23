import { supabase, TABLES } from './supabase';

/**
 * rule_proposal_reject module
 *
 * Reject a proposed rule change.
 * Updates the proposal status to "rejected" and logs the action.
 */

export interface RuleProposalRejectInput {
  proposal_id: string;
  rejector_id: string;
  reason: Record<string, unknown>;
}

export interface RuleProposalRejectOutput {
  proposal_id: string;
  status: 'rejected';
}

export async function ruleProposalReject(
  input: RuleProposalRejectInput
): Promise<RuleProposalRejectOutput> {
  const { proposal_id, rejector_id, reason } = input;

  // Step 1: Update proposal status to rejected
  const { error: updateError } = await supabase
    .from(TABLES.rule_change_proposal)
    .update({
      status: 'rejected',
      updated_at: new Date().toISOString(),
    })
    .eq('id', proposal_id);

  if (updateError) {
    console.error('Failed to reject proposal:', updateError);
  }

  // Step 2: Log to audit_log
  await supabase.from(TABLES.audit_log).insert({
    actor_id: rejector_id,
    action: 'rule_proposal_rejected',
    entity: 'rule_change_proposal',
    entity_id: proposal_id,
    payload: reason,
  });

  return { proposal_id, status: 'rejected' };
}