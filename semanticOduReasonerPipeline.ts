/**
 * Semantic Odu Reasoner Pipeline
 *
 * Implements the defineLogicModules spec for Odu semantic reasoning:
 * - odu_semantic_context_builder: Build semantic context from lineage graph, semantic graph, historical outcomes
 * - odu_reasoning_engine: Generate semantic reasoning and lineage-aware insights
 * - odu_reasoning_expander: Expand reasoning using graph pathways, clusters, correlations
 * - odu_ai_interpretation_generator: Generate AI-augmented interpretations
 * - semantic_odu_reasoner_pipeline: Unified pipeline (context → reasoning → expansion → AI interpretation)
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

interface GraphData {
  nodes: Array<{ id: string; type: string; label: string; metadata?: Record<string, string> }>;
  edges: Array<{ id: string; source: string; target: string; relation: string; weight: number }>;
}

export interface OduSemanticContext {
  odu_code: string;
  outcome_class: string;
  subtype_code: string;
  orisha_code: string;
  lineage_connections: Array<{
    node_id: string;
    relation: string;
    weight: number;
  }>;
  semantic_connections: Array<{
    node_id: string;
    relation: string;
    weight: number;
  }>;
  historical_patterns: {
    total_consultations: number;
    ire_rate: number;
    osogbo_rate: number;
    common_subtypes: Array<{ subtype: string; count: number }>;
    common_orishas: Array<{ orisha: string; count: number }>;
  };
}

export interface OduReasoning {
  primary_interpretation: string;
  lineage_insight: string;
  semantic_pathways: Array<{
    path: string;
    significance: string;
  }>;
  historical_correlation: string;
  confidence: number;
}

export interface ExpandedReasoning {
  base_reasoning: OduReasoning;
  cluster_insights: Array<{
    cluster_label: string;
    relevance: number;
    insight: string;
  }>;
  graph_expansions: Array<{
    pathway: string;
    depth: number;
    nodes_traversed: string[];
    insight: string;
  }>;
  correlations: Array<{
    pattern: string;
    strength: number;
    description: string;
  }>;
}

export interface AIInterpretation {
  summary: string;
  detailed_interpretation: string;
  spiritual_guidance: string;
  practical_advice: string;
  lineage_context: string;
  confidence_level: "high" | "medium" | "low";
  supporting_evidence: string[];
}

// ─── Module: odu_semantic_context_builder ─────────────────────────────────────

/**
 * Builds semantic context for an Odu using lineage graph, semantic graph, and historical outcomes.
 */
export async function oduSemanticContextBuilder(consultationRecordId: string): Promise<{
  semantic_context: OduSemanticContext;
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

  // Fetch lineage semantic graph
  const { data: lineageGraphData } = await supabase
    .from(TABLES.lineage_semantic_graph)
    .select("*")
    .eq("house_id", record.house_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Fetch odu semantic graph
  const { data: oduGraphData } = await supabase
    .from(TABLES.odu_semantic_graph)
    .select("*")
    .eq("house_id", record.house_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Fetch historical records for this house
  const { data: historyData } = await supabase
    .from(TABLES.consultation_record)
    .select("*")
    .eq("house_id", record.house_id)
    .limit(500);

  const lineageGraph = (lineageGraphData as { graph: GraphData } | null)?.graph || { nodes: [], edges: [] };
  const oduGraph = (oduGraphData as { graph: GraphData } | null)?.graph || { nodes: [], edges: [] };
  const history = (historyData || []) as ConsultationRecord[];

  // Build semantic context
  const context = buildOduSemanticContext(record, lineageGraph, oduGraph, history);

  return { semantic_context: context };
}

function buildOduSemanticContext(
  record: ConsultationRecord,
  lineageGraph: GraphData,
  oduGraph: GraphData,
  history: ConsultationRecord[]
): OduSemanticContext {
  const oduCode = (record.main_odu || "unknown").toLowerCase().trim().replace(/\s+/g, "_");
  const outcomeClass = (record.ire_or_osogbo || "").toLowerCase().includes("ire") ? "ire" : "osogbo";
  const subtypeCode = (record.subtype || "unspecified").toLowerCase().trim().replace(/\s+/g, "_");
  const orishaCode = (record.orisha_owner || "none").toLowerCase().trim().replace(/\s+/g, "_");

  const oduNodeId = `odu_${oduCode}`;

  // Find lineage connections
  const lineageConnections = lineageGraph.edges
    .filter((e) => e.source === oduNodeId || e.target === oduNodeId)
    .map((e) => ({
      node_id: e.source === oduNodeId ? e.target : e.source,
      relation: e.relation,
      weight: e.weight,
    }))
    .sort((a, b) => b.weight - a.weight);

  // Find semantic connections
  const semanticConnections = oduGraph.edges
    .filter((e) => e.source === oduNodeId || e.target === oduNodeId)
    .map((e) => ({
      node_id: e.source === oduNodeId ? e.target : e.source,
      relation: e.relation,
      weight: e.weight,
    }))
    .sort((a, b) => b.weight - a.weight);

  // Compute historical patterns
  const oduHistory = history.filter(
    (r) => (r.main_odu || "").toLowerCase().trim().replace(/\s+/g, "_") === oduCode
  );

  const ireCount = oduHistory.filter(
    (r) => (r.ire_or_osogbo || "").toLowerCase().includes("ire")
  ).length;

  const subtypeCounts: Record<string, number> = {};
  const orishaCounts: Record<string, number> = {};

  oduHistory.forEach((r) => {
    const st = (r.subtype || "unspecified").toLowerCase().trim();
    subtypeCounts[st] = (subtypeCounts[st] || 0) + 1;
    const or = (r.orisha_owner || "none").toLowerCase().trim();
    orishaCounts[or] = (orishaCounts[or] || 0) + 1;
  });

  const commonSubtypes = Object.entries(subtypeCounts)
    .map(([subtype, count]) => ({ subtype, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const commonOrishas = Object.entries(orishaCounts)
    .map(([orisha, count]) => ({ orisha, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    odu_code: oduCode,
    outcome_class: outcomeClass,
    subtype_code: subtypeCode,
    orisha_code: orishaCode,
    lineage_connections: lineageConnections.slice(0, 10),
    semantic_connections: semanticConnections.slice(0, 10),
    historical_patterns: {
      total_consultations: oduHistory.length,
      ire_rate: oduHistory.length > 0 ? ireCount / oduHistory.length : 0,
      osogbo_rate: oduHistory.length > 0 ? (oduHistory.length - ireCount) / oduHistory.length : 0,
      common_subtypes: commonSubtypes,
      common_orishas: commonOrishas,
    },
  };
}

// ─── Module: odu_reasoning_engine ────────────────────────────────────────────

/**
 * Generates semantic reasoning, interpretations, and lineage-aware insights for an Odu.
 */
export function oduReasoningEngine(
  semanticContext: OduSemanticContext,
  query: string
): { reasoning: OduReasoning } {
  const reasoning = reasonOverOdu(semanticContext, query);
  return { reasoning };
}

function reasonOverOdu(context: OduSemanticContext, query: string): OduReasoning {
  const queryLower = query.toLowerCase();

  // Primary interpretation based on context
  const primaryInterpretation = buildPrimaryInterpretation(context, queryLower);

  // Lineage insight from lineage connections
  const lineageInsight = buildLineageInsight(context);

  // Semantic pathways from graph connections
  const semanticPathways = buildSemanticPathways(context);

  // Historical correlation
  const historicalCorrelation = buildHistoricalCorrelation(context);

  // Confidence based on data richness
  const confidence = computeConfidence(context);

  return {
    primary_interpretation: primaryInterpretation,
    lineage_insight: lineageInsight,
    semantic_pathways: semanticPathways,
    historical_correlation: historicalCorrelation,
    confidence,
  };
}

function buildPrimaryInterpretation(context: OduSemanticContext, query: string): string {
  const parts: string[] = [];

  parts.push(`Odu ${context.odu_code} in ${context.outcome_class} position`);

  if (context.subtype_code !== "unspecified") {
    parts.push(`with subtype ${context.subtype_code}`);
  }

  if (context.orisha_code !== "none") {
    parts.push(`governed by ${context.orisha_code}`);
  }

  if (context.historical_patterns.total_consultations > 0) {
    const irePercent = Math.round(context.historical_patterns.ire_rate * 100);
    parts.push(`(historical ire rate: ${irePercent}%)`);
  }

  if (query) {
    parts.push(`— query context: "${query}"`);
  }

  return parts.join(" ");
}

function buildLineageInsight(context: OduSemanticContext): string {
  if (context.lineage_connections.length === 0) {
    return "No lineage graph connections found for this Odu.";
  }

  const topConnections = context.lineage_connections.slice(0, 3);
  const descriptions = topConnections.map(
    (c) => `${c.node_id} (${c.relation}, weight: ${c.weight})`
  );

  return `Lineage graph shows ${context.lineage_connections.length} connection(s). Top: ${descriptions.join("; ")}.`;
}

function buildSemanticPathways(context: OduSemanticContext): OduReasoning["semantic_pathways"] {
  return context.semantic_connections.slice(0, 5).map((conn) => ({
    path: `${context.odu_code} → [${conn.relation}] → ${conn.node_id}`,
    significance: conn.weight >= 3
      ? "Strong recurring pattern"
      : conn.weight >= 2
        ? "Moderate correlation"
        : "Observed connection",
  }));
}

function buildHistoricalCorrelation(context: OduSemanticContext): string {
  const patterns = context.historical_patterns;

  if (patterns.total_consultations === 0) {
    return "No historical data available for correlation analysis.";
  }

  const parts: string[] = [];
  parts.push(`Based on ${patterns.total_consultations} historical consultation(s)`);
  parts.push(`ire rate: ${Math.round(patterns.ire_rate * 100)}%`);

  if (patterns.common_subtypes.length > 0) {
    parts.push(`most common subtype: ${patterns.common_subtypes[0].subtype} (${patterns.common_subtypes[0].count}x)`);
  }

  if (patterns.common_orishas.length > 0 && patterns.common_orishas[0].orisha !== "none") {
    parts.push(`dominant orisha: ${patterns.common_orishas[0].orisha} (${patterns.common_orishas[0].count}x)`);
  }

  return parts.join("; ") + ".";
}

function computeConfidence(context: OduSemanticContext): number {
  let score = 0.3; // base

  if (context.lineage_connections.length > 0) score += 0.2;
  if (context.semantic_connections.length > 0) score += 0.2;
  if (context.historical_patterns.total_consultations >= 5) score += 0.15;
  if (context.historical_patterns.total_consultations >= 20) score += 0.15;

  return Math.min(score, 1);
}

// ─── Module: odu_reasoning_expander ──────────────────────────────────────────

/**
 * Expands reasoning using semantic graph pathways, lineage clusters, and historical correlations.
 */
export async function oduReasoningExpander(
  houseId: string,
  reasoning: OduReasoning
): Promise<{ expanded_reasoning: ExpandedReasoning }> {
  // Fetch cluster model
  const { data: clusterData } = await supabase
    .from(TABLES.lineage_cluster_model)
    .select("*")
    .eq("house_id", houseId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Fetch lineage graph
  const { data: lineageGraphData } = await supabase
    .from(TABLES.lineage_semantic_graph)
    .select("*")
    .eq("house_id", houseId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const clusters = (clusterData as { clusters: Array<{ cluster_id: number; label: string; members: string[] }> } | null)?.clusters || [];
  const lineageGraph = (lineageGraphData as { graph: GraphData } | null)?.graph || { nodes: [], edges: [] };

  const expanded = expandReasoning(reasoning, clusters, lineageGraph);

  return { expanded_reasoning: expanded };
}

function expandReasoning(
  reasoning: OduReasoning,
  clusters: Array<{ cluster_id: number; label: string; members: string[] }>,
  lineageGraph: GraphData
): ExpandedReasoning {
  // Cluster insights
  const clusterInsights = clusters.slice(0, 5).map((cluster) => {
    const relevance = cluster.members.length > 5 ? 0.8 : cluster.members.length > 2 ? 0.6 : 0.4;
    return {
      cluster_label: cluster.label,
      relevance,
      insight: `Cluster "${cluster.label}" contains ${cluster.members.length} member(s), suggesting a recurring pattern in this lineage.`,
    };
  });

  // Graph expansions (multi-hop paths)
  const graphExpansions: ExpandedReasoning["graph_expansions"] = [];
  const visited = new Set<string>();

  lineageGraph.edges.slice(0, 20).forEach((edge) => {
    if (visited.has(edge.source)) return;
    visited.add(edge.source);

    // Find second-hop edges
    const secondHops = lineageGraph.edges.filter(
      (e) => e.source === edge.target && e.target !== edge.source
    );

    if (secondHops.length > 0) {
      const bestHop = secondHops.sort((a, b) => b.weight - a.weight)[0];
      graphExpansions.push({
        pathway: `${edge.source} → ${edge.target} → ${bestHop.target}`,
        depth: 2,
        nodes_traversed: [edge.source, edge.target, bestHop.target],
        insight: `Multi-hop path via ${edge.relation} → ${bestHop.relation} (combined weight: ${edge.weight + bestHop.weight})`,
      });
    }
  });

  // Correlations from reasoning pathways
  const correlations = reasoning.semantic_pathways.map((pathway) => ({
    pattern: pathway.path,
    strength: pathway.significance === "Strong recurring pattern" ? 0.9 : pathway.significance === "Moderate correlation" ? 0.6 : 0.3,
    description: pathway.significance,
  }));

  return {
    base_reasoning: reasoning,
    cluster_insights: clusterInsights,
    graph_expansions: graphExpansions.slice(0, 5),
    correlations,
  };
}

// ─── Module: odu_ai_interpretation_generator ─────────────────────────────────

/**
 * Generates AI-augmented interpretations based on expanded reasoning and semantic context.
 */
export function oduAIInterpretationGenerator(expandedReasoning: ExpandedReasoning): {
  ai_interpretation: AIInterpretation;
} {
  const interpretation = generateAIInterpretation(expandedReasoning);
  return { ai_interpretation: interpretation };
}

function generateAIInterpretation(expanded: ExpandedReasoning): AIInterpretation {
  const base = expanded.base_reasoning;

  // Determine confidence level
  const confidenceLevel: AIInterpretation["confidence_level"] =
    base.confidence >= 0.7 ? "high" : base.confidence >= 0.5 ? "medium" : "low";

  // Build summary
  const summary = base.primary_interpretation;

  // Build detailed interpretation
  const detailedParts: string[] = [base.primary_interpretation];
  if (base.lineage_insight) {
    detailedParts.push(base.lineage_insight);
  }
  if (base.historical_correlation) {
    detailedParts.push(base.historical_correlation);
  }
  const detailedInterpretation = detailedParts.join(" ");

  // Spiritual guidance from semantic pathways
  const spiritualGuidanceParts: string[] = [];
  base.semantic_pathways.forEach((pathway) => {
    if (pathway.significance === "Strong recurring pattern") {
      spiritualGuidanceParts.push(`The path ${pathway.path} indicates a deeply rooted spiritual pattern.`);
    }
  });
  const spiritualGuidance = spiritualGuidanceParts.length > 0
    ? spiritualGuidanceParts.join(" ")
    : "Continue observing the patterns as they unfold in your spiritual journey.";

  // Practical advice from cluster insights
  const practicalParts: string[] = [];
  expanded.cluster_insights.forEach((ci) => {
    if (ci.relevance >= 0.6) {
      practicalParts.push(ci.insight);
    }
  });
  const practicalAdvice = practicalParts.length > 0
    ? practicalParts.join(" ")
    : "Follow the guidance of your Awo and the traditions of your house.";

  // Lineage context from graph expansions
  const lineageContextParts: string[] = [];
  expanded.graph_expansions.forEach((ge) => {
    lineageContextParts.push(`Path: ${ge.pathway} (depth ${ge.depth}) — ${ge.insight}`);
  });
  const lineageContext = lineageContextParts.length > 0
    ? lineageContextParts.join("; ")
    : "Lineage context is being established as more consultations are recorded.";

  // Supporting evidence
  const supportingEvidence: string[] = [];
  if (expanded.correlations.length > 0) {
    expanded.correlations.forEach((c) => {
      if (c.strength >= 0.6) {
        supportingEvidence.push(`${c.pattern}: ${c.description} (strength: ${c.strength})`);
      }
    });
  }
  if (expanded.cluster_insights.length > 0) {
    supportingEvidence.push(`${expanded.cluster_insights.length} cluster pattern(s) identified`);
  }
  if (expanded.graph_expansions.length > 0) {
    supportingEvidence.push(`${expanded.graph_expansions.length} multi-hop graph pathway(s) found`);
  }

  return {
    summary,
    detailed_interpretation: detailedInterpretation,
    spiritual_guidance: spiritualGuidance,
    practical_advice: practicalAdvice,
    lineage_context: lineageContext,
    confidence_level: confidenceLevel,
    supporting_evidence: supportingEvidence,
  };
}

// ─── Module: semantic_odu_reasoner_pipeline (unified) ─────────────────────────

/**
 * Unified pipeline: context → reasoning → expansion → AI interpretation.
 */
export async function semanticOduReasonerPipeline(
  consultationRecordId: string,
  query: string
): Promise<{
  semantic_context: OduSemanticContext;
  reasoning: OduReasoning;
  expanded_reasoning: ExpandedReasoning;
  ai_interpretation: AIInterpretation;
}> {
  // Step 1: Build semantic context
  const { semantic_context } = await oduSemanticContextBuilder(consultationRecordId);

  // Step 2: Generate reasoning
  const { reasoning } = oduReasoningEngine(semantic_context, query);

  // Step 3: Fetch record for house_id
  const { data: record } = await supabase
    .from(TABLES.consultation_record)
    .select("house_id")
    .eq("id", consultationRecordId)
    .single();

  if (!record) {
    throw new Error("Consultation record not found");
  }

  const houseId = (record as { house_id: string }).house_id;

  // Step 4: Expand reasoning
  const { expanded_reasoning } = await oduReasoningExpander(houseId, reasoning);

  // Step 5: Generate AI interpretation
  const { ai_interpretation } = oduAIInterpretationGenerator(expanded_reasoning);

  return {
    semantic_context,
    reasoning,
    expanded_reasoning,
    ai_interpretation,
  };
}