/**
 * AI Consultation API Module
 *
 * Implements the defineApiModules spec, providing a typed API layer that maps
 * HTTP-style routes to the underlying logic pipeline functions:
 * - api_lineage_model: /api/lineage/* (extract, cluster, graph, insights)
 * - api_odu_semantic_graph: /api/odu/* (nodes, edges, graph, query)
 * - api_ebo_optimization: /api/ebo/optimize
 * - api_odu_reasoner: /api/odu/reason
 * - api_predictive_outcomes: /api/predict/outcome
 * - api_phase2_master: /api/ai/consult (unified pipeline)
 */

import {
  lineageFeatureExtraction,
  lineageClusterModel,
  lineageSemanticGraph,
  lineageInsightGenerator,
} from "../lineageModelPipeline";

import {
  semanticGraphNodeBuilder,
  semanticGraphEdgeBuilder,
  semanticGraphAssembler,
  semanticGraphQueryEngine,
  semanticGraphPipeline,
} from "../semanticGraphPipeline";

import { eboOptimizationPipeline } from "../eboOptimizationPipeline";

import { semanticOduReasonerPipeline } from "../semanticOduReasonerPipeline";

import { predictiveOutcomePipeline } from "../predictiveOutcomePipeline";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface AiConsultResult {
  feature_vector_id: string;
  semantic_graph: unknown;
  optimal_ebo: unknown;
  prediction: unknown;
  prediction_explanation: unknown;
  ai_interpretation: unknown;
}

// ─── API Module: api_lineage_model ───────────────────────────────────────────

/**
 * POST /api/lineage/extract
 * Extracts features from a consultation record into a lineage feature vector.
 */
export async function apiLineageExtract(consultationRecordId: string): Promise<ApiResponse> {
  try {
    const result = await lineageFeatureExtraction(consultationRecordId);
    return {
      success: true,
      data: { feature_vector_id: result.feature_vector_id },
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * POST /api/lineage/cluster
 * Clusters feature vectors for a house into lineage patterns.
 */
export async function apiLineageCluster(houseId: string): Promise<ApiResponse> {
  try {
    const result = await lineageClusterModel(houseId);
    return {
      success: true,
      data: { model_id: result.model_id, clusters: result.clusters },
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * POST /api/lineage/graph
 * Builds a lineage semantic graph for a house.
 */
export async function apiLineageGraph(houseId: string): Promise<ApiResponse> {
  try {
    const result = await lineageSemanticGraph(houseId);
    return {
      success: true,
      data: { graph_id: result.graph_id, graph: result.graph },
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * POST /api/lineage/insights
 * Generates lineage-aware insights for a house.
 */
export async function apiLineageInsights(houseId: string, query: string): Promise<ApiResponse> {
  try {
    const result = await lineageInsightGenerator(houseId, query);
    return {
      success: true,
      data: { insights: result.insights },
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
      timestamp: new Date().toISOString(),
    };
  }
}

// ─── API Module: api_odu_semantic_graph ──────────────────────────────────────

/**
 * POST /api/odu/nodes
 * Builds semantic graph nodes from a feature vector.
 */
export async function apiOduNodes(featureVectorId: string): Promise<ApiResponse> {
  try {
    const result = await semanticGraphNodeBuilder(featureVectorId);
    return {
      success: true,
      data: { node_record_id: result.node_record_id, nodes: result.nodes },
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * POST /api/odu/edges
 * Builds semantic graph edges for a house.
 */
export async function apiOduEdges(houseId: string): Promise<ApiResponse> {
  try {
    const result = await semanticGraphEdgeBuilder(houseId);
    return {
      success: true,
      data: { edge_record_id: result.edge_record_id, edges: result.edges },
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * POST /api/odu/graph
 * Assembles the full Odu semantic graph for a house.
 */
export async function apiOduGraph(houseId: string): Promise<ApiResponse> {
  try {
    const result = await semanticGraphAssembler(houseId);
    return {
      success: true,
      data: { graph_id: result.graph_id, graph: result.graph },
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * POST /api/odu/query
 * Queries the Odu semantic graph for insights.
 */
export async function apiOduQuery(houseId: string, query: string): Promise<ApiResponse> {
  try {
    const result = await semanticGraphQueryEngine(houseId, query);
    return {
      success: true,
      data: { results: result.results },
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
      timestamp: new Date().toISOString(),
    };
  }
}

// ─── API Module: api_ebo_optimization ────────────────────────────────────────

/**
 * POST /api/ebo/optimize
 * Runs the full ebo optimization pipeline for a consultation.
 */
export async function apiEboOptimize(consultationRecordId: string): Promise<ApiResponse> {
  try {
    const result = await eboOptimizationPipeline(consultationRecordId);
    return {
      success: true,
      data: {
        ebo_features: result.ebo_features,
        ebo_candidates: result.ebo_candidates,
        ebo_scores: result.ebo_scores,
        optimal_ebo: result.optimal_ebo,
      },
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
      timestamp: new Date().toISOString(),
    };
  }
}

// ─── API Module: api_odu_reasoner ────────────────────────────────────────────

/**
 * POST /api/odu/reason
 * Runs the semantic Odu reasoner pipeline for AI-augmented interpretation.
 */
export async function apiOduReason(
  consultationRecordId: string,
  query: string
): Promise<ApiResponse> {
  try {
    const result = await semanticOduReasonerPipeline(consultationRecordId, query);
    return {
      success: true,
      data: {
        semantic_context: result.semantic_context,
        reasoning: result.reasoning,
        expanded_reasoning: result.expanded_reasoning,
        ai_interpretation: result.ai_interpretation,
      },
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
      timestamp: new Date().toISOString(),
    };
  }
}

// ─── API Module: api_predictive_outcomes ─────────────────────────────────────

/**
 * POST /api/predict/outcome
 * Runs the predictive outcome pipeline for a consultation.
 */
export async function apiPredictOutcome(consultationRecordId: string): Promise<ApiResponse> {
  try {
    const result = await predictiveOutcomePipeline(consultationRecordId);
    return {
      success: true,
      data: {
        predictive_matrix: result.predictive_matrix,
        model: result.model,
        prediction: result.prediction,
        prediction_explanation: result.prediction_explanation,
      },
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
      timestamp: new Date().toISOString(),
    };
  }
}

// ─── API Module: api_phase2_master ───────────────────────────────────────────

/**
 * POST /api/ai/consult
 * Full AI-augmented consultation pipeline — unified Phase 2/3 entrypoint.
 * Chains: lineage extraction → semantic graph → ebo optimization → prediction → reasoning
 */
export async function apiAiConsult(
  consultationRecordId: string,
  query: string = "interpret consultation"
): Promise<ApiResponse<AiConsultResult>> {
  try {
    // Step 1: Extract lineage features
    const extractResult = await lineageFeatureExtraction(consultationRecordId);
    const featureVectorId = extractResult.feature_vector_id;

    // Step 2: Build/query semantic graph
    const graphResult = await semanticGraphPipeline(featureVectorId, query);

    // Step 3: Ebo optimization
    const eboResult = await eboOptimizationPipeline(consultationRecordId);

    // Step 4: Predictive outcome
    const predictResult = await predictiveOutcomePipeline(consultationRecordId);

    // Step 5: Semantic Odu reasoning
    const reasonResult = await semanticOduReasonerPipeline(consultationRecordId, query);

    return {
      success: true,
      data: {
        feature_vector_id: featureVectorId,
        semantic_graph: graphResult.graph,
        optimal_ebo: eboResult.optimal_ebo,
        prediction: predictResult.prediction,
        prediction_explanation: predictResult.prediction_explanation,
        ai_interpretation: reasonResult.ai_interpretation,
      },
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
      timestamp: new Date().toISOString(),
    };
  }
}

// ─── Route Registry ──────────────────────────────────────────────────────────

/**
 * Route registry mapping API paths to handler functions.
 * Used for documentation and potential runtime routing.
 */
export const API_ROUTES = {
  // Lineage Model
  "POST /api/lineage/extract": apiLineageExtract,
  "POST /api/lineage/cluster": apiLineageCluster,
  "POST /api/lineage/graph": apiLineageGraph,
  "POST /api/lineage/insights": apiLineageInsights,

  // Odu Semantic Graph
  "POST /api/odu/nodes": apiOduNodes,
  "POST /api/odu/edges": apiOduEdges,
  "POST /api/odu/graph": apiOduGraph,
  "POST /api/odu/query": apiOduQuery,

  // Ebo Optimization
  "POST /api/ebo/optimize": apiEboOptimize,

  // Odu Reasoner
  "POST /api/odu/reason": apiOduReason,

  // Predictive Outcomes
  "POST /api/predict/outcome": apiPredictOutcome,

  // Phase 2/3 Master
  "POST /api/ai/consult": apiAiConsult,
} as const;

export type ApiRoutePath = keyof typeof API_ROUTES;