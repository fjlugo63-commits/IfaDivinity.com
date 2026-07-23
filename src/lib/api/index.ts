/**
 * API Layer - Central exports for all API endpoint functions.
 *
 * Consultation endpoints:
 *   POST /consult/opele - createOpeleConsultation
 *   GET /consult/{id} - getConsultation
 *
 * Rules governance endpoints:
 *   GET /house/{house_id}/rules - listHouseRules
 *   POST /rules/propose - proposeRuleChange
 *   POST /rules/approve - approveRuleProposal
 *   POST /rules/reject - rejectRuleProposal
 *   POST /rules/activate - activateRuleVersionEndpoint
 *
 * Audit endpoints:
 *   GET /audit/logs - listAuditLogs
 */

export {
  createOpeleConsultation,
  getConsultation,
} from './consultApi';

export type {
  CreateOpeleConsultationInput,
  ConsultationResult,
} from './consultApi';

export {
  listHouseRules,
  proposeRuleChange,
  approveRuleProposal,
  rejectRuleProposal,
  activateRuleVersionEndpoint,
} from './rulesApi';

export type {
  ListHouseRulesOutput,
  ProposeRuleChangeInput,
  ProposeRuleChangeOutput,
  ApproveRuleProposalInput,
  ApproveRuleProposalOutput,
  RejectRuleProposalInput,
  RejectRuleProposalOutput,
  ActivateRuleVersionInput,
  ActivateRuleVersionOutput,
} from './rulesApi';

export {
  listAuditLogs,
} from './auditApi';

export type {
  ListAuditLogsInput,
  AuditLogEntry,
  ListAuditLogsOutput,
} from './auditApi';