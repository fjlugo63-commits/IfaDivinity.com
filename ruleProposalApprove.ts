import { supabase, TABLES } from './supabase';
import { logRuleVersionEvent } from './engineAuditLogger';

/**
 * rule_proposal_approve module
 * 
 * Awo council approves a rule change and creates a new rule_version.
 * Steps:
 * 1. Fetch the proposal
 * 2. Fetch the latest rule version for the house
 * 3. Create a new rule_version with incremented version_number
 * 4. Update proposal status to "approved"
 * 5. Log to audit_log
 */

export interface RuleProposalApproveInput {
  proposal_id: string;
  approver_id: string;
}

export interface RuleProposalApproveOutput {
  rule_version_id: string | null;
  proposal_id: string;
  status: 'approved' | 'error';
  error?: string;
}

export async function ruleProposalApprove(
  input: RuleProposalApproveInput
): Promise<RuleProposalApproveOutput> {
  const { proposal_id, approver_id } = input;

  // Step 1: Fetch the proposal
  const { data: proposal, error: fetchError } = await supabase
    .from(TABLES.rule_change_proposal)
    .select('*')
    .eq('id', proposal_id)
    .single();

  if (fetchError || !proposal) {
    return {
      rule_version_id: null,
      proposal_id,
      status: 'error',
      error: 'Proposal not found',
    };
  }

  // Step 2: Fetch the latest rule version for this house from engine_rule_versions (primary)
  const { data: latestEngineVersions } = await supabase
    .from(TABLES.engine_rule_versions)
    .select('version_number')
    .eq('house_id', proposal.house_id)
    .order('created_at', { ascending: false })
    .limit(1);

  let latestVersionNumber = latestEngineVersions?.[0]?.version_number ?? 0;

  // Fallback: check legacy rule_version table if no engine versions exist
  if (!latestEngineVersions || latestEngineVersions.length === 0) {
    const { data: latestLegacyVersions } = await supabase
      .from(TABLES.rule_version)
      .select('version_number')
      .eq('house_id', proposal.house_id)
      .order('version_number', { ascending: false })
      .limit(1);
    latestVersionNumber = latestLegacyVersions?.[0]?.version_number ?? 0;
  }

  // Step 3: Create a new rule version in engine_rule_versions (primary)
  const { data: newVersion, error: versionError } = await supabase
    .from(TABLES.engine_rule_versions)
    .insert({
      house_id: proposal.house_id,
      version_name: `Approved v${latestVersionNumber + 1}`,
      version_number: latestVersionNumber + 1,
      status: 'draft',
      is_published: false,
      tradition: proposal.tradition || 'yoruba',
      created_by: proposal.proposed_by,
      approved_by: approver_id,
    })
    .select('id')
    .single();

  if (versionError || !newVersion) {
    return {
      rule_version_id: null,
      proposal_id,
      status: 'error',
      error: 'Failed to create new rule version',
    };
  }

  // Also insert into legacy rule_version for backward compatibility
  await supabase
    .from(TABLES.rule_version)
    .insert({
      house_id: proposal.house_id,
      version_number: latestVersionNumber + 1,
      status: 'approved',
      created_by: proposal.proposed_by,
      approved_by: approver_id,
    });

  // Step 4: Update proposal status to approved
  await supabase
    .from(TABLES.rule_change_proposal)
    .update({
      status: 'approved',
      updated_at: new Date().toISOString(),
    })
    .eq('id', proposal_id);

  // Step 5: Log to audit_log (legacy)
  await supabase.from(TABLES.audit_log).insert({
    actor_id: approver_id,
    action: 'rule_proposal_approved',
    entity: 'rule_change_proposal',
    entity_id: proposal_id,
    payload: { rule_version_id: newVersion.id },
  });

  // Step 5b: Log to unified engine audit log
  logRuleVersionEvent('rule_version_created', {
    entity_id: newVersion.id,
    house_id: proposal.house_id,
    actor_id: approver_id,
    description: `Rule proposal approved → created version v${latestVersionNumber + 1}`,
    metadata: {
      proposal_id,
      version_id: newVersion.id,
      version_number: latestVersionNumber + 1,
      house_id: proposal.house_id,
    },
  });

  return {
    rule_version_id: newVersion.id,
    proposal_id,
    status: 'approved',
  };
}