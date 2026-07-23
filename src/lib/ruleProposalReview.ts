import { supabase, TABLES } from './supabase';

/**
 * rule_proposal_review module
 *
 * Moderators review a proposed rule change.
 * Updates the proposal status to "reviewed" and logs the action.
 */

export interface RuleProposalReviewInput {
  proposal_id: string;
  reviewer_id: string;
  review_notes: Record<string, unknown>;
}

export interface RuleProposalReviewOutput {
  proposal_id: string;
  status: 'reviewed';
}

export async function ruleProposalReview(
  input: RuleProposalReviewInput
): Promise<RuleProposalReviewOutput> {
  const { proposal_id, reviewer_id, review_notes } = input;

  // Step 1: Update proposal status to reviewed
  const { error: updateError } = await supabase
    .from(TABLES.rule_change_proposal)
    .update({
      status: 'reviewed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', proposal_id);

  if (updateError) {
    console.error('Failed to update proposal status:', updateError);
  }

  // Step 2: Log to audit_log
  await supabase.from(TABLES.audit_log).insert({
    actor_id: reviewer_id,
    action: 'rule_proposal_reviewed',
    entity: 'rule_change_proposal',
    entity_id: proposal_id,
    payload: review_notes,
  });

  return { proposal_id, status: 'reviewed' };
}