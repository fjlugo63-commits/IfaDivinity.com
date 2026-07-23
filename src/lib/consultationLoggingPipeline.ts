import { consultationEnrichment } from './consultationEnrichment';
import { consultationAuditLog } from './consultationAuditLog';
import { consultationIndexer } from './consultationIndexer';

/**
 * consultation_logging_pipeline module
 *
 * Unified pipeline: enrich → audit → index.
 * Orchestrates the full post-consultation logging workflow.
 */

export interface ConsultationLoggingPipelineInput {
  consultation_record_id: string;
  actor_id: string;
}

export interface ConsultationLoggingPipelineOutput {
  consultation_record_id: string;
  enriched: string | null;
  audit_logged: boolean;
  indexed: boolean;
}

export async function consultationLoggingPipeline(
  input: ConsultationLoggingPipelineInput
): Promise<ConsultationLoggingPipelineOutput> {
  const { consultation_record_id, actor_id } = input;

  // Step 1: Enrich the consultation record with tradition-specific naming
  const enrichedResult = await consultationEnrichment({ consultation_record_id });

  // Step 2: Create audit log entry
  const auditResult = await consultationAuditLog({
    consultation_record_id,
    actor_id,
  });

  // Step 3: Generate searchable index metadata
  const indexResult = await consultationIndexer({ consultation_record_id });

  return {
    consultation_record_id,
    enriched: enrichedResult.main_odu_display,
    audit_logged: auditResult.audit_logged,
    indexed: indexResult.indexed,
  };
}