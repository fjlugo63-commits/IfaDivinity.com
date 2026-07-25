/**
 * Lineage Model Pipeline
 *
 * Implements the defineLogicModules spec for lineage modeling:
 * - lineage_feature_extraction: Extract semantic/statistical features from consultation records
 * - lineage_cluster_model: Cluster feature vectors to identify lineage-specific patterns
 * - lineage_semantic_graph: Build semantic graph relationships between Odu, ebo, outcomes, lineage
 * - lineage_insight_generator: Generate lineage-aware insights using graph + clusters
 * - lineage_model_pipeline: Unified pipeline orchestrating all modules
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

export interface FeatureVector {
  odu_code: string;
  outcome_class: string;
  subtype_code: string;
  orisha_code: string;
  ebo_hash: string;
  pattern_index: string;
  house_id: string;
  awo_id: string;
}

export interface ClusterResult {
  cluster_id: number;
  label: string;
  members: string[];
  centroid: Record<string, number>;
}

export interface GraphNode {
  id: string;
  type: "odu" | "ebo" | "outcome" | "orisha" | "subtype";
  label: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  weight: number;
  relation: string;
}

export interface SemanticGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface LineageInsight {
  pattern: string;
  confidence: number;
  description: string;
  related_odu: string[];
}

// ─── Module: lineage_feature_extraction ──────────────────────────────────────

/**
 * Extract semantic and statistical features from a consultation record.
 */
export async function lineageFeatureExtraction(consultationRecordId: string): Promise<{
  feature_vector_id: string;
}> {
  // Fetch the consultation record
  const { data: record, error: fetchError } = await supabase
    .from(TABLES.consultation_record)
    .select("*")
    .eq("id", consultationRecordId)
    .single();

  if (fetchError || !record) {
    throw new Error(`Failed to fetch consultation record: ${fetchError?.message || "not found"}`);
  }

  const rec = record as ConsultationRecord;

  // Extract features via transform operation
  const features: FeatureVector = extractFeatures(rec);

  // Insert into lineage_feature_vector
  const { data: vector, error: insertError } = await supabase
    .from(TABLES.lineage_feature_vector)
    .insert({
      consultation_record_id: consultationRecordId,
      features: features,
      house_id: rec.house_id,
      awo_id: rec.awo_id,
    })
    .select("id")
    .single();

  if (insertError || !vector) {
    throw new Error(`Failed to insert feature vector: ${insertError?.message}`);
  }

  return { feature_vector_id: (vector as { id: string }).id };
}

function extractFeatures(record: ConsultationRecord): FeatureVector {
  return {
    odu_code: normalizeOdu(record.main_odu),
    outcome_class: normalizeOutcome(record.ire_or_osogbo),
    subtype_code: normalizeSubtype(record.subtype),
    orisha_code: normalizeOrisha(record.orisha_owner),
    ebo_hash: hashEbo(record.recommended_ebo),
    pattern_index: record.pattern_index || "0000",
    house_id: record.house_id,
    awo_id: record.awo_id,
  };
}

function normalizeOdu(odu: string): string {
  return (odu || "unknown").toLowerCase().trim().replace(/\s+/g, "_");
}

function normalizeOutcome(outcome: string): string {
  const lower = (outcome || "").toLowerCase().trim();
  if (lower.includes("ire")) return "ire";
  if (lower.includes("osogbo")) return "osogbo";
  return "unknown";
}

function normalizeSubtype(subtype: string): string {
  return (subtype || "unspecified").toLowerCase().trim().replace(/\s+/g, "_");
}

function normalizeOrisha(orisha: string): string {
  return (orisha || "none").toLowerCase().trim().replace(/\s+/g, "_");
}

function hashEbo(ebo: string): string {
  // Simple hash for ebo text to create a categorical feature
  const text = (ebo || "").toLowerCase().trim();
  if (!text) return "none";
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash).toString(36);
}

// ─── Module: lineage_cluster_model ───────────────────────────────────────────

/**
 * Cluster lineage feature vectors to identify lineage-specific patterns.
 */
export async function lineageClusterModel(houseId: string): Promise<{
  model_id: string;
  clusters: ClusterResult[];
}> {
  // Fetch all feature vectors for this house
  const { data: vectors, error: fetchError } = await supabase
    .from(TABLES.lineage_feature_vector)
    .select("*")
    .eq("house_id", houseId);

  if (fetchError) {
    throw new Error(`Failed to fetch feature vectors: ${fetchError.message}`);
  }

  const vectorData = (vectors || []) as Array<{
    id: string;
    features: FeatureVector;
  }>;

  // Perform clustering
  const clusters = clusterVectors(vectorData);

  // Store the cluster model
  const { data: model, error: insertError } = await supabase
    .from(TABLES.lineage_cluster_model)
    .insert({
      house_id: houseId,
      clusters: clusters,
    })
    .select("id")
    .single();

  if (insertError || !model) {
    throw new Error(`Failed to insert cluster model: ${insertError?.message}`);
  }

  return {
    model_id: (model as { id: string }).id,
    clusters,
  };
}

function clusterVectors(
  vectors: Array<{ id: string; features: FeatureVector }>
): ClusterResult[] {
  if (vectors.length === 0) return [];

  // Group by outcome_class as primary clustering dimension
  const groups: Record<string, string[]> = {};
  const featureMap: Record<string, FeatureVector> = {};

  vectors.forEach((v) => {
    const key = `${v.features.outcome_class}_${v.features.odu_code}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(v.id);
    featureMap[v.id] = v.features;
  });

  // Build cluster results
  let clusterId = 0;
  return Object.entries(groups).map(([key, members]) => {
    const centroid: Record<string, number> = {};
    // Count orisha frequency as centroid dimension
    const orishaCounts: Record<string, number> = {};
    members.forEach((m) => {
      const f = featureMap[m];
      orishaCounts[f.orisha_code] = (orishaCounts[f.orisha_code] || 0) + 1;
    });
    Object.entries(orishaCounts).forEach(([orisha, count]) => {
      centroid[`orisha_${orisha}`] = count / members.length;
    });

    return {
      cluster_id: clusterId++,
      label: key,
      members,
      centroid,
    };
  });
}

// ─── Module: lineage_semantic_graph ──────────────────────────────────────────

/**
 * Build semantic graph relationships between Odu, ebo, outcomes, and lineage patterns.
 */
export async function lineageSemanticGraph(houseId: string): Promise<{
  graph_id: string;
  graph: SemanticGraph;
}> {
  // Fetch cluster model
  const { data: modelData } = await supabase
    .from(TABLES.lineage_cluster_model)
    .select("*")
    .eq("house_id", houseId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Fetch feature vectors
  const { data: vectors } = await supabase
    .from(TABLES.lineage_feature_vector)
    .select("*")
    .eq("house_id", houseId);

  const clusterData = modelData as { clusters: ClusterResult[] } | null;
  const vectorData = (vectors || []) as Array<{ features: FeatureVector }>;

  // Build the semantic graph
  const graph = buildSemanticGraph(
    clusterData?.clusters || [],
    vectorData
  );

  // Store the graph
  const { data: graphRecord, error: insertError } = await supabase
    .from(TABLES.lineage_semantic_graph)
    .insert({
      house_id: houseId,
      graph: graph,
    })
    .select("id")
    .single();

  if (insertError || !graphRecord) {
    throw new Error(`Failed to insert semantic graph: ${insertError?.message}`);
  }

  return {
    graph_id: (graphRecord as { id: string }).id,
    graph,
  };
}

function buildSemanticGraph(
  clusters: ClusterResult[],
  vectors: Array<{ features: FeatureVector }>
): SemanticGraph {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const nodeSet = new Set<string>();

  function addNode(id: string, type: GraphNode["type"], label: string) {
    if (!nodeSet.has(id)) {
      nodeSet.add(id);
      nodes.push({ id, type, label });
    }
  }

  // Build nodes from vectors
  vectors.forEach((v) => {
    const f = v.features;
    addNode(`odu_${f.odu_code}`, "odu", f.odu_code);
    addNode(`outcome_${f.outcome_class}`, "outcome", f.outcome_class);
    addNode(`orisha_${f.orisha_code}`, "orisha", f.orisha_code);
    addNode(`subtype_${f.subtype_code}`, "subtype", f.subtype_code);
    addNode(`ebo_${f.ebo_hash}`, "ebo", f.ebo_hash);
  });

  // Build edges from co-occurrence
  const edgeWeights: Record<string, { weight: number; relation: string }> = {};

  vectors.forEach((v) => {
    const f = v.features;
    const pairs: [string, string, string][] = [
      [`odu_${f.odu_code}`, `outcome_${f.outcome_class}`, "produces"],
      [`odu_${f.odu_code}`, `orisha_${f.orisha_code}`, "governed_by"],
      [`odu_${f.odu_code}`, `subtype_${f.subtype_code}`, "has_subtype"],
      [`outcome_${f.outcome_class}`, `ebo_${f.ebo_hash}`, "recommends"],
      [`orisha_${f.orisha_code}`, `ebo_${f.ebo_hash}`, "prescribes"],
    ];

    pairs.forEach(([source, target, relation]) => {
      const key = `${source}→${target}`;
      if (!edgeWeights[key]) {
        edgeWeights[key] = { weight: 0, relation };
      }
      edgeWeights[key].weight++;
    });
  });

  Object.entries(edgeWeights).forEach(([key, { weight, relation }]) => {
    const [source, target] = key.split("→");
    edges.push({ source, target, weight, relation });
  });

  // Add cluster-based edges
  clusters.forEach((cluster) => {
    const [outcome, odu] = cluster.label.split("_");
    if (outcome && odu) {
      const clusterNodeId = `cluster_${cluster.cluster_id}`;
      addNode(clusterNodeId, "odu", `Cluster: ${cluster.label}`);
      edges.push({
        source: clusterNodeId,
        target: `odu_${odu}`,
        weight: cluster.members.length,
        relation: "clusters_around",
      });
    }
  });

  return { nodes, edges };
}

// ─── Module: lineage_insight_generator ───────────────────────────────────────

/**
 * Generate lineage-aware insights using semantic graph and cluster model.
 */
export async function lineageInsightGenerator(
  houseId: string,
  query: string
): Promise<{ insights: LineageInsight[] }> {
  // Fetch the latest semantic graph
  const { data: graphData } = await supabase
    .from(TABLES.lineage_semantic_graph)
    .select("*")
    .eq("house_id", houseId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Fetch the latest cluster model
  const { data: modelData } = await supabase
    .from(TABLES.lineage_cluster_model)
    .select("*")
    .eq("house_id", houseId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const graph = (graphData as { graph: SemanticGraph } | null)?.graph || {
    nodes: [],
    edges: [],
  };
  const clusters =
    (modelData as { clusters: ClusterResult[] } | null)?.clusters || [];

  // Generate insights
  const insights = generateInsights(query, graph, clusters);

  return { insights };
}

function generateInsights(
  query: string,
  graph: SemanticGraph,
  clusters: ClusterResult[]
): LineageInsight[] {
  const insights: LineageInsight[] = [];
  const queryLower = query.toLowerCase();

  // Find relevant nodes based on query
  const relevantNodes = graph.nodes.filter(
    (n) =>
      n.label.toLowerCase().includes(queryLower) ||
      n.id.toLowerCase().includes(queryLower)
  );

  // Generate pattern insights from graph edges
  relevantNodes.forEach((node) => {
    const connectedEdges = graph.edges.filter(
      (e) => e.source === node.id || e.target === node.id
    );

    if (connectedEdges.length > 0) {
      const relatedOdu = connectedEdges
        .filter((e) => {
          const other = e.source === node.id ? e.target : e.source;
          return other.startsWith("odu_");
        })
        .map((e) => {
          const other = e.source === node.id ? e.target : e.source;
          return other.replace("odu_", "");
        });

      insights.push({
        pattern: `${node.type}:${node.label}`,
        confidence: Math.min(
          connectedEdges.reduce((sum, e) => sum + e.weight, 0) / 10,
          1
        ),
        description: `${node.label} appears in ${connectedEdges.length} relationships across the lineage graph.`,
        related_odu: relatedOdu.slice(0, 5),
      });
    }
  });

  // Generate cluster-based insights
  clusters.forEach((cluster) => {
    if (
      cluster.label.toLowerCase().includes(queryLower) ||
      queryLower === ""
    ) {
      insights.push({
        pattern: `cluster:${cluster.label}`,
        confidence: Math.min(cluster.members.length / 20, 1),
        description: `Cluster "${cluster.label}" contains ${cluster.members.length} consultation records with shared lineage patterns.`,
        related_odu: [cluster.label.split("_")[1] || "unknown"],
      });
    }
  });

  // Sort by confidence
  return insights.sort((a, b) => b.confidence - a.confidence).slice(0, 10);
}

// ─── Module: lineage_model_pipeline (unified) ────────────────────────────────

/**
 * Unified pipeline: extract → cluster → graph → insights.
 */
export async function lineageModelPipeline(
  consultationRecordId: string,
  query: string
): Promise<{
  feature_vector_id: string;
  clusters: ClusterResult[];
  graph: SemanticGraph;
  insights: LineageInsight[];
}> {
  // Step 1: Extract features
  const { feature_vector_id } =
    await lineageFeatureExtraction(consultationRecordId);

  // Step 2: Fetch the record to get house_id
  const { data: record } = await supabase
    .from(TABLES.consultation_record)
    .select("house_id")
    .eq("id", consultationRecordId)
    .single();

  if (!record) {
    throw new Error("Consultation record not found");
  }

  const houseId = (record as { house_id: string }).house_id;

  // Step 3: Cluster
  const { clusters } = await lineageClusterModel(houseId);

  // Step 4: Build semantic graph
  const { graph } = await lineageSemanticGraph(houseId);

  // Step 5: Generate insights
  const { insights } = await lineageInsightGenerator(houseId, query);

  return {
    feature_vector_id,
    clusters,
    graph,
    insights,
  };
}