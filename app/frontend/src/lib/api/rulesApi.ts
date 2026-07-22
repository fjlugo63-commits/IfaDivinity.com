import { supabase, TABLES } from '../supabase';
import { ruleProposalCreate } from '../ruleProposalCreate';
import { ruleProposalApprove } from '../ruleProposalApprove';
import { ruleProposalReject } from '../ruleProposalReject';
import { activateRuleVersion } from '../activateRuleVersion';

/**
 * API Endpoints: Rules Governance
 * 
 * GET /house/{house_id}/rules - List rule versions and active rule for a house
 * POST /rules/propose - Create a new rule change proposal
 * POST /rules/approve - Approve a rule proposal
 * POST /rules/reject - Reject a rule proposal
 * POST /rules/activate - Activate a rule version for a house
 */

export interface ListHouseRulesOutput {
  house_id: string;
  active_rule_version_id: string | null;
  rule_versions: Array<Record<string, unknown>>;
}

export interface ProposeRuleChangeInput {
  house_id: string;
  proposed_by: string;
  changes: Record<string, unknown>;
}

export interface ProposeRuleChangeOutput {
  proposal_id: string | null;
  status: 'pending' | 'error';
}

export interface ApproveRuleProposalInput {
  proposal_id: string;
  approver_id: string;
}

export interface ApproveRuleProposalOutput {
  proposal_id: string;
  rule_version_id: string | null;
  status: 'approved' | 'error';
}

export interface RejectRuleProposalInput {
  proposal_id: string;
  rejector_id: string;
  reason: Record<string, unknown>;
}

export interface RejectRuleProposalOutput {
  proposal_id: string;
  status: 'rejected';
}

export interface ActivateRuleVersionInput {
  house_id: string;
  rule_version_id: string;
  actor_id: string;
}

export interface ActivateRuleVersionOutput {
  house_id: string;
  active_rule_version_id: string;
}

/**
 * GET /house/{house_id}/rules
 * List rule versions and active rule for a house.
 */
export async function listHouseRules(
  house_id: string
): Promise<ListHouseRulesOutput> {
  // Fetch config
  const { data: config } = await supabase
    .from(TABLES.consult_engine_config)
    .select('active_rule_version_id')
    .eq('house_id', house_id)
    .single();

  // Fetch all versions
  const { data: versions } = await supabase
    .from(TABLES.rule_version)
    .select('*')
    .eq('house_id', house_id)
    .order('version_number', { ascending: false });

  return {
    house_id,
    active_rule_version_id: config?.active_rule_version_id || null,
    rule_versions: versions || [],
  };
}

/**
 * POST /rules/propose
 * Create a new rule change proposal.
 */
export async function proposeRuleChange(
  input: ProposeRuleChangeInput
): Promise<ProposeRuleChangeOutput> {
  const result = await ruleProposalCreate(input);
  return {
    proposal_id: result.proposal_id,
    status: result.proposal_id ? 'pending' : 'error',
  };
}

/**
 * POST /rules/approve
 * Approve a rule proposal and create a new rule version.
 */
export async function approveRuleProposal(
  input: ApproveRuleProposalInput
): Promise<ApproveRuleProposalOutput> {
  const result = await ruleProposalApprove(input);
  return {
    proposal_id: result.proposal_id,
    rule_version_id: result.rule_version_id,
    status: result.status,
  };
}

/**
 * POST /rules/reject
 * Reject a rule proposal.
 */
export async function rejectRuleProposal(
  input: RejectRuleProposalInput
): Promise<RejectRuleProposalOutput> {
  const result = await ruleProposalReject(input);
  return {
    proposal_id: result.proposal_id,
    status: result.status,
  };
}

/**
 * POST /rules/activate
 * Activate a rule version for a house.
 */
export async function activateRuleVersionEndpoint(
  input: ActivateRuleVersionInput
): Promise<ActivateRuleVersionOutput> {
  const result = await activateRuleVersion(input);
  return {
    house_id: result.house_id,
    active_rule_version_id: result.active_rule_version_id,
  };
}