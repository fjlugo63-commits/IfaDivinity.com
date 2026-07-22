/**
 * Ebo Optimization Pipeline
 *
 * Implements the defineLogicModules spec for ebo optimization:
 * - ebo_feature_aggregator: Aggregate semantic, lineage, and statistical features for ebo optimization
 * - ebo_candidate_generator: Generate candidate ebo options from semantic graph and lineage patterns
 * - ebo_score_engine: Score candidates using semantic similarity, lineage alignment, historical outcomes
 * - ebo_optimizer: Select optimal ebo based on scoring
 * - ebo_optimization_pipeline: Unified pipeline (aggregate → generate → score → optimize)
 */

import { supabase, TABLES } from "./supabase";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ConsultationRecord {
  id: string;
  main_odu: string;
  ire_or_osogbo: string;
  subtype: string;
  orisha_owner: string;
  recommended_ebo: string;
  pattern_index: string | null;
  house_id: string;
  awo_id: string;
}

export interface EboFeatures {
  odu_code: string;
  outcome_class: string;
  subtype_code: string;
  orisha_code: string;
  current_ebo: string;
  graph_ebo_connections: Array<{
    ebo_id: string;
    relation: string;
    weight: number;
  }>;
  lineage_ebo_frequency: Record<string, number>;
}

export interface EboCandidate {
  ebo_id: string;
  ebo_description: string;
  source: "house_rule" | "graph_inference" | "lineage_pattern";
  relevance_score: number;
}

export interface EboScore {
  ebo_id: string;
  ebo_description: string;
  semantic_similarity: number;
  lineage_alignment: number;
  historical_success_rate: number;
  composite_score: number;
}

export interface OptimalEbo {
  ebo_id: string;
  ebo_description: string;
  composite_score: number;
  reasoning: string;
  alternatives: Array<{
    ebo_id: string;
    ebo_description: string;
    composite_score: number;
  }>;
}

interface GraphData {
  nodes: Array<{ id: string; type: string; label: string }>;
  edges: Array<{ source: string; target: string; relation: string; weight: number }>;
}

interface HouseOduRule {
  id: string;
  pattern_key: string;
  odu_code: string;
  result: string;
  subtype: string;
  recommended_ebo: string;
}

// ─── Module: ebo_feature_aggregator ──────────────────────────────────────────

/**
 * Aggregate semantic, lineage, and statistical features relevant to ebo optimization.
 */
export async function eboFeatureAggregator(consultationRecordId: string): Promise<{
  ebo_features: EboFeatures;
}> {
  // Fetch consultation record
  const { data: recordData, error: recordError } = await supabase
    .from(TABLES.consultation_record)
    .select("*")
    .eq("id", consultationRecordId)
    .single();

  if (recordError || !recordData) {
    throw new Error(`Failed to fetch consultation record: ${recordError?.message || "not found"}`);
  }

  const record = recordData as ConsultationRecord;

  // Fetch lineage feature vector
  const { data: fvData } = await supabase
    .from(TABLES.lineage_feature_vector)
    .select("*")
    .eq("consultation_record_id", consultationRecordId)
    .single();

  // Fetch semantic graph for the house
  const { data: graphData } = await supabase
    .from(TABLES.odu_semantic_graph)
    .select("*")
    .eq("house_id", record.house_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const graph = (graphData as { graph: GraphData } | null)?.graph || { nodes: [], edges: [] };
  const lineageFeatures = (fvData as { features: Record<string, string> } | null)?.features || {};

  // Aggregate ebo features
  const eboFeatures = aggregateEboFeatures(record, graph, lineageFeatures);

  return { ebo_features: eboFeatures };
}

function aggregateEboFeatures(
  record: ConsultationRecord,
  graph: GraphData,
  lineageFeatures: Record<string, string>
): EboFeatures {
  const oduCode = (record.main_odu || "unknown").toLowerCase().trim().replace(/\s+/g, "_");
  const outcomeClass = (record.ire_or_osogbo || "").toLowerCase().includes("ire") ? "ire" : "osogbo";
  const subtypeCode = (record.subtype || "unspecified").toLowerCase().trim().replace(/\s+/g, "_");
  const orishaCode = (record.orisha_owner || "none").toLowerCase().trim().replace(/\s+/g, "_");

  // Find ebo connections in the graph
  const eboConnections: EboFeatures["graph_ebo_connections"] = [];
  const oduNodeId = `odu_${oduCode}`;
  const outcomeNodeId = `outcome_${outcomeClass}`;
  const orishaNodeId = `orisha_${orishaCode}`;

  graph.edges.forEach((edge) => {
    if (
      (edge.source === oduNodeId || edge.source === outcomeNodeId || edge.source === orishaNodeId) &&
      edge.target.startsWith("ebo_")
    ) {
      eboConnections.push({
        ebo_id: edge.target,
        relation: edge.relation,
        weight: edge.weight,
      });
    }
  });

  // Compute lineage ebo frequency from features
  const lineageEboFrequency: Record<string, number> = {};
  if (lineageFeatures.ebo_hash) {
    lineageEboFrequency[lineageFeatures.ebo_hash] = 1;
  }

  return {
    odu_code: oduCode,
    outcome_class: outcomeClass,
    subtype_code: subtypeCode,
    orisha_code: orishaCode,
    current_ebo: record.recommended_ebo || "",
    graph_ebo_connections: eboConnections,
    lineage_ebo_frequency: lineageEboFrequency,
  };
}

// ─── Module: ebo_candidate_generator ─────────────────────────────────────────

/**
 * Generate candidate ebo options based on semantic graph and lineage patterns.
 */
export async function eboCandidateGenerator(
  houseId: string,
  eboFeatures: EboFeatures
): Promise<{ ebo_candidates: EboCandidate[] }> {
  // Fetch house odu rules
  const { data: rulesData } = await supabase
    .from(TABLES.house_odu_rule)
    .select("*")
    .eq("house_id", houseId);

  const rules = (rulesData || []) as HouseOduRule[];

  // Generate candidates
  const candidates = generateEboCandidates(eboFeatures, rules);

  return { ebo_candidates: candidates };
}

function generateEboCandidates(
  eboFeatures: EboFeatures,
  houseRules: HouseOduRule[]
): EboCandidate[] {
  const candidates: EboCandidate[] = [];
  const seen = new Set<string>();

  // Candidates from house rules matching the Odu
  houseRules.forEach((rule) => {
    const ruleOdu = (rule.odu_code || "").toLowerCase().trim().replace(/\s+/g, "_");
    if (ruleOdu === eboFeatures.odu_code && rule.recommended_ebo) {
      const eboId = `rule_${rule.id}`;
      if (!seen.has(eboId)) {
        seen.add(eboId);
        candidates.push({
          ebo_id: eboId,
          ebo_description: rule.recommended_ebo,
          source: "house_rule",
          relevance_score: 0.9,
        });
      }
    }
  });

  // Candidates from matching result type (ire/osogbo)
  houseRules.forEach((rule) => {
    const ruleResult = (rule.result || "").toLowerCase();
    if (
      ruleResult.includes(eboFeatures.outcome_class) &&
      rule.recommended_ebo
    ) {
      const eboId = `rule_outcome_${rule.id}`;
      if (!seen.has(eboId)) {
        seen.add(eboId);
        candidates.push({
          ebo_id: eboId,
          ebo_description: rule.recommended_ebo,
          source: "house_rule",
          relevance_score: 0.7,
        });
      }
    }
  });

  // Candidates from graph ebo connections
  eboFeatures.graph_ebo_connections.forEach((conn) => {
    if (!seen.has(conn.ebo_id)) {
      seen.add(conn.ebo_id);
      candidates.push({
        ebo_id: conn.ebo_id,
        ebo_description: conn.ebo_id.replace("ebo_", ""),
        source: "graph_inference",
        relevance_score: Math.min(conn.weight / 5, 1),
      });
    }
  });

  // Candidates from lineage ebo frequency
  Object.entries(eboFeatures.lineage_ebo_frequency).forEach(([eboHash, freq]) => {
    const eboId = `lineage_${eboHash}`;
    if (!seen.has(eboId)) {
      seen.add(eboId);
      candidates.push({
        ebo_id: eboId,
        ebo_description: eboHash,
        source: "lineage_pattern",
        relevance_score: Math.min(freq / 10, 1),
      });
    }
  });

  // Sort by relevance
  return candidates.sort((a, b) => b.relevance_score - a.relevance_score);
}

// ─── Module: ebo_score_engine ────────────────────────────────────────────────

/**
 * Score ebo candidates using semantic similarity, lineage alignment, and historical outcomes.
 */
export async function eboScoreEngine(
  houseId: string,
  eboCandidates: EboCandidate[]
): Promise<{ ebo_scores: EboScore[] }> {
  // Fetch semantic graph
  const { data: graphData } = await supabase
    .from(TABLES.lineage_semantic_graph)
    .select("*")
    .eq("house_id", houseId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Fetch historical consultation records for this house
  const { data: recordsData } = await supabase
    .from(TABLES.consultation_record)
    .select("*")
    .eq("house_id", houseId)
    .limit(200);

  const graph = (graphData as { graph: GraphData } | null)?.graph || { nodes: [], edges: [] };
  const historicalRecords = (recordsData || []) as ConsultationRecord[];

  // Score candidates
  const scores = scoreEboCandidates(eboCandidates, graph, historicalRecords);

  return { ebo_scores: scores };
}

function scoreEboCandidates(
  candidates: EboCandidate[],
  semanticGraph: GraphData,
  historicalRecords: ConsultationRecord[]
): EboScore[] {
  return candidates.map((candidate) => {
    // Semantic similarity: how connected is this ebo in the graph
    const semanticSimilarity = computeSemanticSimilarity(candidate, semanticGraph);

    // Lineage alignment: how well does this ebo align with lineage patterns
    const lineageAlignment = computeLineageAlignment(candidate);

    // Historical success rate: how often was this ebo associated with positive outcomes
    const historicalSuccessRate = computeHistoricalSuccess(candidate, historicalRecords);

    // Composite score (weighted average)
    const compositeScore =
      semanticSimilarity * 0.3 +
      lineageAlignment * 0.3 +
      historicalSuccessRate * 0.25 +
      candidate.relevance_score * 0.15;

    return {
      ebo_id: candidate.ebo_id,
      ebo_description: candidate.ebo_description,
      semantic_similarity: semanticSimilarity,
      lineage_alignment: lineageAlignment,
      historical_success_rate: historicalSuccessRate,
      composite_score: Math.round(compositeScore * 1000) / 1000,
    };
  });
}

function computeSemanticSimilarity(candidate: EboCandidate, graph: GraphData): number {
  // Count edges connected to this ebo in the graph
  const eboNodeId = candidate.ebo_id.startsWith("ebo_")
    ? candidate.ebo_id
    : `ebo_${candidate.ebo_description}`;

  const connectedEdges = graph.edges.filter(
    (e) => e.source === eboNodeId || e.target === eboNodeId
  );

  if (connectedEdges.length === 0) return candidate.relevance_score * 0.5;

  const totalWeight = connectedEdges.reduce((sum, e) => sum + e.weight, 0);
  return Math.min(totalWeight / 10, 1);
}

function computeLineageAlignment(candidate: EboCandidate): number {
  // Source-based alignment scoring
  switch (candidate.source) {
    case "house_rule":
      return 0.85;
    case "lineage_pattern":
      return 0.95;
    case "graph_inference":
      return 0.6;
    default:
      return 0.5;
  }
}

function computeHistoricalSuccess(
  candidate: EboCandidate,
  records: ConsultationRecord[]
): number {
  if (records.length === 0) return 0.5;

  // Check how many records with similar ebo had positive outcomes
  const eboText = candidate.ebo_description.toLowerCase();
  const matchingRecords = records.filter(
    (r) => r.recommended_ebo && r.recommended_ebo.toLowerCase().includes(eboText)
  );

  if (matchingRecords.length === 0) return 0.5;

  const positiveOutcomes = matchingRecords.filter(
    (r) => r.ire_or_osogbo && r.ire_or_osogbo.toLowerCase().includes("ire")
  );

  return positiveOutcomes.length / matchingRecords.length;
}

// ─── Module: ebo_optimizer ───────────────────────────────────────────────────

/**
 * Select optimal ebo based on scoring, lineage alignment, and semantic graph pathways.
 */
export function eboOptimizer(eboScores: EboScore[]): { optimal_ebo: OptimalEbo } {
  const optimal = selectOptimalEbo(eboScores);
  return { optimal_ebo: optimal };
}

function selectOptimalEbo(scores: EboScore[]): OptimalEbo {
  if (scores.length === 0) {
    return {
      ebo_id: "none",
      ebo_description: "No ebo candidates available",
      composite_score: 0,
      reasoning: "No candidates were generated for this consultation.",
      alternatives: [],
    };
  }

  // Sort by composite score descending
  const sorted = [...scores].sort((a, b) => b.composite_score - a.composite_score);
  const best = sorted[0];

  // Build reasoning
  const reasoningParts: string[] = [];
  if (best.semantic_similarity > 0.7) {
    reasoningParts.push("strong semantic graph connections");
  }
  if (best.lineage_alignment > 0.8) {
    reasoningParts.push("high lineage alignment");
  }
  if (best.historical_success_rate > 0.6) {
    reasoningParts.push("favorable historical outcomes");
  }

  const reasoning =
    reasoningParts.length > 0
      ? `Selected based on ${reasoningParts.join(", ")}.`
      : `Selected as highest-scoring candidate (composite: ${best.composite_score}).`;

  // Get alternatives (next 3)
  const alternatives = sorted.slice(1, 4).map((s) => ({
    ebo_id: s.ebo_id,
    ebo_description: s.ebo_description,
    composite_score: s.composite_score,
  }));

  return {
    ebo_id: best.ebo_id,
    ebo_description: best.ebo_description,
    composite_score: best.composite_score,
    reasoning,
    alternatives,
  };
}

// ─── Module: ebo_optimization_pipeline (unified) ─────────────────────────────

/**
 * Unified pipeline: aggregate → generate → score → optimize.
 */
export async function eboOptimizationPipeline(consultationRecordId: string): Promise<{
  ebo_features: EboFeatures;
  ebo_candidates: EboCandidate[];
  ebo_scores: EboScore[];
  optimal_ebo: OptimalEbo;
}> {
  // Step 1: Aggregate features
  const { ebo_features } = await eboFeatureAggregator(consultationRecordId);

  // Step 2: Fetch record for house_id
  const { data: record } = await supabase
    .from(TABLES.consultation_record)
    .select("house_id")
    .eq("id", consultationRecordId)
    .single();

  if (!record) {
    throw new Error("Consultation record not found");
  }

  const houseId = (record as { house_id: string }).house_id;

  // Step 3: Generate candidates
  const { ebo_candidates } = await eboCandidateGenerator(houseId, ebo_features);

  // Step 4: Score candidates
  const { ebo_scores } = await eboScoreEngine(houseId, ebo_candidates);

  // Step 5: Optimize (select best)
  const { optimal_ebo } = eboOptimizer(ebo_scores);

  return {
    ebo_features,
    ebo_candidates,
    ebo_scores,
    optimal_ebo,
  };
}