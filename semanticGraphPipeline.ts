/**
 * Semantic Graph Pipeline
 *
 * Implements the defineLogicModules spec for semantic graph construction and querying:
 * - semantic_graph_node_builder: Build nodes for Odu, ebo, outcomes, lineage, house constructs
 * - semantic_graph_edge_builder: Build edges based on statistical, lineage, and semantic relationships
 * - semantic_graph_assembler: Assemble nodes + edges into a unified semantic graph
 * - semantic_graph_query_engine: Query the graph for lineage-aware, house-aware insights
 * - semantic_graph_pipeline: Unified pipeline (nodes → edges → graph → query)
 */

import { supabase, TABLES } from "./supabase";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FeatureVectorRecord {
  id: string;
  features: {
    odu_code: string;
    outcome_class: string;
    subtype_code: string;
    orisha_code: string;
    ebo_hash: string;
    pattern_index: string;
    house_id: string;
    awo_id: string;
  };
  house_id: string;
}

export interface GraphNode {
  id: string;
  type: "odu" | "outcome" | "subtype" | "orisha" | "ebo" | "house" | "awo";
  label: string;
  metadata?: Record<string, string>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relation: string;
  weight: number;
  metadata?: Record<string, string>;
}

export interface SemanticGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: {
    house_id: string;
    node_count: number;
    edge_count: number;
    created_at: string;
  };
}

export interface QueryResult {
  matched_nodes: GraphNode[];
  matched_edges: GraphEdge[];
  paths: Array<{
    nodes: string[];
    total_weight: number;
    description: string;
  }>;
  summary: string;
}

// ─── Module: semantic_graph_node_builder ──────────────────────────────────────

/**
 * Builds nodes for Odu, ebo, outcomes, lineage, and house-specific constructs.
 */
export async function semanticGraphNodeBuilder(featureVectorId: string): Promise<{
  node_record_id: string;
  nodes: GraphNode[];
}> {
  // Fetch the feature vector
  const { data: fvData, error: fetchError } = await supabase
    .from(TABLES.lineage_feature_vector)
    .select("*")
    .eq("id", featureVectorId)
    .single();

  if (fetchError || !fvData) {
    throw new Error(`Failed to fetch feature vector: ${fetchError?.message || "not found"}`);
  }

  const fv = fvData as FeatureVectorRecord;
  const features = fv.features;

  // Build nodes from the feature vector
  const nodes = buildNodes(features);

  // Insert into semantic_graph_nodes
  const { data: nodeRecord, error: insertError } = await supabase
    .from(TABLES.semantic_graph_nodes)
    .insert({
      feature_vector_id: featureVectorId,
      house_id: fv.house_id,
      nodes: nodes,
    })
    .select("id")
    .single();

  if (insertError || !nodeRecord) {
    throw new Error(`Failed to insert graph nodes: ${insertError?.message}`);
  }

  return {
    node_record_id: (nodeRecord as { id: string }).id,
    nodes,
  };
}

function buildNodes(features: FeatureVectorRecord["features"]): GraphNode[] {
  const nodes: GraphNode[] = [];

  // Odu node
  if (features.odu_code && features.odu_code !== "unknown") {
    nodes.push({
      id: `odu_${features.odu_code}`,
      type: "odu",
      label: features.odu_code,
      metadata: { pattern_index: features.pattern_index },
    });
  }

  // Outcome node
  if (features.outcome_class && features.outcome_class !== "unknown") {
    nodes.push({
      id: `outcome_${features.outcome_class}`,
      type: "outcome",
      label: features.outcome_class,
    });
  }

  // Subtype node
  if (features.subtype_code && features.subtype_code !== "unspecified") {
    nodes.push({
      id: `subtype_${features.subtype_code}`,
      type: "subtype",
      label: features.subtype_code,
    });
  }

  // Orisha node
  if (features.orisha_code && features.orisha_code !== "none") {
    nodes.push({
      id: `orisha_${features.orisha_code}`,
      type: "orisha",
      label: features.orisha_code,
    });
  }

  // Ebo node
  if (features.ebo_hash && features.ebo_hash !== "none") {
    nodes.push({
      id: `ebo_${features.ebo_hash}`,
      type: "ebo",
      label: features.ebo_hash,
    });
  }

  // House node
  if (features.house_id) {
    nodes.push({
      id: `house_${features.house_id}`,
      type: "house",
      label: features.house_id,
    });
  }

  // Awo node
  if (features.awo_id) {
    nodes.push({
      id: `awo_${features.awo_id}`,
      type: "awo",
      label: features.awo_id,
    });
  }

  return nodes;
}

// ─── Module: semantic_graph_edge_builder ──────────────────────────────────────

/**
 * Builds edges between nodes based on statistical, lineage, and semantic relationships.
 */
export async function semanticGraphEdgeBuilder(houseId: string): Promise<{
  edge_record_id: string;
  edges: GraphEdge[];
}> {
  // Fetch all node records for this house
  const { data: nodeRecords, error: nodeError } = await supabase
    .from(TABLES.semantic_graph_nodes)
    .select("*")
    .eq("house_id", houseId);

  if (nodeError) {
    throw new Error(`Failed to fetch graph nodes: ${nodeError.message}`);
  }

  // Fetch cluster model for this house
  const { data: clusterData } = await supabase
    .from(TABLES.lineage_cluster_model)
    .select("*")
    .eq("house_id", houseId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const allNodes = (nodeRecords || []) as Array<{ nodes: GraphNode[] }>;
  const clusters = (clusterData as { clusters: Array<{ cluster_id: number; label: string; members: string[] }> } | null)?.clusters || [];

  // Flatten all nodes and build edges
  const flatNodes: GraphNode[] = [];
  allNodes.forEach((record) => {
    if (record.nodes) flatNodes.push(...record.nodes);
  });

  const edges = buildEdges(flatNodes, clusters);

  // Insert into semantic_graph_edges
  const { data: edgeRecord, error: insertError } = await supabase
    .from(TABLES.semantic_graph_edges)
    .insert({
      house_id: houseId,
      edges: edges,
    })
    .select("id")
    .single();

  if (insertError || !edgeRecord) {
    throw new Error(`Failed to insert graph edges: ${insertError?.message}`);
  }

  return {
    edge_record_id: (edgeRecord as { id: string }).id,
    edges,
  };
}

function buildEdges(
  nodes: GraphNode[],
  clusters: Array<{ cluster_id: number; label: string; members: string[] }>
): GraphEdge[] {
  const edges: GraphEdge[] = [];
  const edgeMap = new Map<string, GraphEdge>();
  let edgeCounter = 0;

  function addOrIncrementEdge(source: string, target: string, relation: string) {
    const key = `${source}→${target}→${relation}`;
    const existing = edgeMap.get(key);
    if (existing) {
      existing.weight++;
    } else {
      const edge: GraphEdge = {
        id: `edge_${edgeCounter++}`,
        source,
        target,
        relation,
        weight: 1,
      };
      edgeMap.set(key, edge);
    }
  }

  // Group nodes by type for co-occurrence analysis
  const oduNodes = nodes.filter((n) => n.type === "odu");
  const outcomeNodes = nodes.filter((n) => n.type === "outcome");
  const orishaNodes = nodes.filter((n) => n.type === "orisha");
  const subtypeNodes = nodes.filter((n) => n.type === "subtype");
  const eboNodes = nodes.filter((n) => n.type === "ebo");

  // Odu → Outcome edges (produces)
  oduNodes.forEach((odu) => {
    outcomeNodes.forEach((outcome) => {
      addOrIncrementEdge(odu.id, outcome.id, "produces");
    });
  });

  // Odu → Orisha edges (governed_by)
  oduNodes.forEach((odu) => {
    orishaNodes.forEach((orisha) => {
      addOrIncrementEdge(odu.id, orisha.id, "governed_by");
    });
  });

  // Odu → Subtype edges (has_subtype)
  oduNodes.forEach((odu) => {
    subtypeNodes.forEach((subtype) => {
      addOrIncrementEdge(odu.id, subtype.id, "has_subtype");
    });
  });

  // Outcome → Ebo edges (recommends)
  outcomeNodes.forEach((outcome) => {
    eboNodes.forEach((ebo) => {
      addOrIncrementEdge(outcome.id, ebo.id, "recommends");
    });
  });

  // Orisha → Ebo edges (prescribes)
  orishaNodes.forEach((orisha) => {
    eboNodes.forEach((ebo) => {
      addOrIncrementEdge(orisha.id, ebo.id, "prescribes");
    });
  });

  // Cluster-based edges (clusters_with)
  clusters.forEach((cluster) => {
    if (cluster.members.length > 1) {
      const [outcome, odu] = cluster.label.split("_");
      if (outcome && odu) {
        addOrIncrementEdge(
          `odu_${odu}`,
          `outcome_${outcome}`,
          "clusters_with"
        );
      }
    }
  });

  edgeMap.forEach((edge) => edges.push(edge));
  return edges;
}

// ─── Module: semantic_graph_assembler ─────────────────────────────────────────

/**
 * Assembles nodes + edges into a unified semantic graph.
 */
export async function semanticGraphAssembler(houseId: string): Promise<{
  graph_id: string;
  graph: SemanticGraph;
}> {
  // Fetch all node records
  const { data: nodeRecords } = await supabase
    .from(TABLES.semantic_graph_nodes)
    .select("*")
    .eq("house_id", houseId);

  // Fetch edge records
  const { data: edgeRecords } = await supabase
    .from(TABLES.semantic_graph_edges)
    .select("*")
    .eq("house_id", houseId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const allNodeRecords = (nodeRecords || []) as Array<{ nodes: GraphNode[] }>;
  const edgeData = edgeRecords as { edges: GraphEdge[] } | null;

  // Deduplicate nodes
  const nodeMap = new Map<string, GraphNode>();
  allNodeRecords.forEach((record) => {
    if (record.nodes) {
      record.nodes.forEach((node) => {
        if (!nodeMap.has(node.id)) {
          nodeMap.set(node.id, node);
        }
      });
    }
  });

  const uniqueNodes = Array.from(nodeMap.values());
  const edges = edgeData?.edges || [];

  // Assemble the graph
  const graph: SemanticGraph = {
    nodes: uniqueNodes,
    edges: edges,
    metadata: {
      house_id: houseId,
      node_count: uniqueNodes.length,
      edge_count: edges.length,
      created_at: new Date().toISOString(),
    },
  };

  // Store the assembled graph
  const { data: graphRecord, error: insertError } = await supabase
    .from(TABLES.odu_semantic_graph)
    .insert({
      house_id: houseId,
      graph: graph,
    })
    .select("id")
    .single();

  if (insertError || !graphRecord) {
    throw new Error(`Failed to insert assembled graph: ${insertError?.message}`);
  }

  return {
    graph_id: (graphRecord as { id: string }).id,
    graph,
  };
}

// ─── Module: semantic_graph_query_engine ──────────────────────────────────────

/**
 * Query semantic graph for lineage-aware, house-aware insights.
 */
export async function semanticGraphQueryEngine(
  houseId: string,
  query: string
): Promise<{ results: QueryResult }> {
  // Fetch the latest assembled graph
  const { data: graphData } = await supabase
    .from(TABLES.odu_semantic_graph)
    .select("*")
    .eq("house_id", houseId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const graphRecord = graphData as { graph: SemanticGraph } | null;
  const graph = graphRecord?.graph || { nodes: [], edges: [], metadata: { house_id: houseId, node_count: 0, edge_count: 0, created_at: "" } };

  // Query the graph
  const results = queryGraph(graph, query);

  return { results };
}

function queryGraph(graph: SemanticGraph, query: string): QueryResult {
  const queryLower = query.toLowerCase().trim();

  // Find matching nodes
  const matchedNodes = graph.nodes.filter(
    (n) =>
      n.label.toLowerCase().includes(queryLower) ||
      n.id.toLowerCase().includes(queryLower) ||
      n.type.toLowerCase().includes(queryLower)
  );

  // Find edges connected to matched nodes
  const matchedNodeIds = new Set(matchedNodes.map((n) => n.id));
  const matchedEdges = graph.edges.filter(
    (e) => matchedNodeIds.has(e.source) || matchedNodeIds.has(e.target)
  );

  // Build paths from matched nodes through edges
  const paths: QueryResult["paths"] = [];
  matchedNodes.forEach((startNode) => {
    const outEdges = matchedEdges.filter((e) => e.source === startNode.id);
    outEdges.forEach((edge) => {
      const targetNode = graph.nodes.find((n) => n.id === edge.target);
      if (targetNode) {
        // Look for second-hop edges
        const secondHopEdges = graph.edges.filter(
          (e) => e.source === targetNode.id && e.target !== startNode.id
        );

        if (secondHopEdges.length > 0) {
          const bestSecondHop = secondHopEdges.sort((a, b) => b.weight - a.weight)[0];
          const endNode = graph.nodes.find((n) => n.id === bestSecondHop.target);
          if (endNode) {
            paths.push({
              nodes: [startNode.id, targetNode.id, endNode.id],
              total_weight: edge.weight + bestSecondHop.weight,
              description: `${startNode.label} —[${edge.relation}]→ ${targetNode.label} —[${bestSecondHop.relation}]→ ${endNode.label}`,
            });
          }
        } else {
          paths.push({
            nodes: [startNode.id, targetNode.id],
            total_weight: edge.weight,
            description: `${startNode.label} —[${edge.relation}]→ ${targetNode.label}`,
          });
        }
      }
    });
  });

  // Sort paths by weight
  paths.sort((a, b) => b.total_weight - a.total_weight);

  // Build summary
  const summary = matchedNodes.length > 0
    ? `Found ${matchedNodes.length} node(s) and ${matchedEdges.length} edge(s) matching "${query}". ${paths.length} path(s) identified.`
    : `No nodes found matching "${query}" in the semantic graph.`;

  return {
    matched_nodes: matchedNodes,
    matched_edges: matchedEdges,
    paths: paths.slice(0, 10),
    summary,
  };
}

// ─── Module: semantic_graph_pipeline (unified) ────────────────────────────────

/**
 * Unified pipeline: nodes → edges → graph → query.
 */
export async function semanticGraphPipeline(
  featureVectorId: string,
  query: string
): Promise<{
  nodes: GraphNode[];
  edges: GraphEdge[];
  graph: SemanticGraph;
  results: QueryResult;
}> {
  // Step 1: Build nodes
  const { nodes } = await semanticGraphNodeBuilder(featureVectorId);

  // Step 2: Get house_id from feature vector
  const { data: fvData } = await supabase
    .from(TABLES.lineage_feature_vector)
    .select("house_id")
    .eq("id", featureVectorId)
    .single();

  if (!fvData) {
    throw new Error("Feature vector not found");
  }

  const houseId = (fvData as { house_id: string }).house_id;

  // Step 3: Build edges
  const { edges } = await semanticGraphEdgeBuilder(houseId);

  // Step 4: Assemble graph
  const { graph } = await semanticGraphAssembler(houseId);

  // Step 5: Query graph
  const { results } = await semanticGraphQueryEngine(houseId, query);

  return { nodes, edges, graph, results };
}