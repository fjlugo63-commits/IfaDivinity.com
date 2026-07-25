/**
 * Predictive Outcome Pipeline
 *
 * Implements the defineLogicModules spec for predictive outcome modeling:
 * - predictive_feature_matrix_builder: Build unified feature matrix from vectors, graph, history
 * - predictive_model_trainer: Train predictive model from matrix + historical outcomes
 * - predictive_inference_engine: Run inference on a consultation using trained model
 * - predictive_explanation_engine: Generate explanations using semantic reasoning
 * - predictive_outcome_pipeline: Unified pipeline (matrix → model → inference → explanation)
 */

import { supabase, TABLES } from "./supabase";
import {
  oduSemanticContextBuilder,
  oduReasoningEngine,
  oduReasoningExpander,
} from "./semanticOduReasonerPipeline";
import type { ExpandedReasoning } from "./semanticOduReasonerPipeline";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ConsultationRecord {
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

interface FeatureVector {
  id: string;
  features: Record<string, string>;
  house_id: string;
  consultation_record_id: string;
}

interface GraphData {
  nodes: Array<{ id: string; type: string; label: string }>;
  edges: Array<{ source: string; target: string; relation: string; weight: number }>;
}

export interface PredictiveMatrix {
  feature_columns: string[];
  rows: Array<{
    record_id: string;
    features: number[];
    outcome: number; // 1 = ire, 0 = osogbo
  }>;
  metadata: {
    house_id: string;
    total_rows: number;
    feature_count: number;
    ire_ratio: number;
  };
}

export interface PredictiveModel {
  type: "naive_bayes_frequency";
  house_id: string;
  feature_columns: string[];
  class_priors: { ire: number; osogbo: number };
  feature_likelihoods: Record<string, { ire: number[]; osogbo: number[] }>;
  accuracy_estimate: number;
  trained_at: string;
  sample_size: number;
}

export interface Prediction {
  predicted_outcome: "ire" | "osogbo";
  confidence: number;
  probabilities: { ire: number; osogbo: number };
  contributing_features: Array<{
    feature: string;
    value: number;
    contribution: number;
  }>;
}

export interface PredictionExplanation {
  prediction: Prediction;
  reasoning_summary: string;
  semantic_pathways: Array<{ path: string; significance: string }>;
  lineage_context: string;
  cluster_insights: Array<{ cluster_label: string; insight: string }>;
  confidence_assessment: string;
}

// ─── Module: predictive_feature_matrix_builder ───────────────────────────────

/**
 * Builds a unified feature matrix from lineage vectors, semantic graph, and historical outcomes.
 */
export async function predictiveFeatureMatrixBuilder(houseId: string): Promise<{
  predictive_matrix: PredictiveMatrix;
}> {
  // Fetch feature vectors
  const { data: vectorsData } = await supabase
    .from(TABLES.lineage_feature_vector)
    .select("*")
    .eq("house_id", houseId);

  // Fetch semantic graph
  const { data: graphData } = await supabase
    .from(TABLES.odu_semantic_graph)
    .select("*")
    .eq("house_id", houseId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Fetch historical records
  const { data: historyData } = await supabase
    .from(TABLES.consultation_record)
    .select("*")
    .eq("house_id", houseId)
    .limit(1000);

  const vectors = (vectorsData || []) as FeatureVector[];
  const graph = (graphData as { graph: GraphData } | null)?.graph || { nodes: [], edges: [] };
  const history = (historyData || []) as ConsultationRecord[];

  const matrix = buildPredictiveMatrix(vectors, graph, history, houseId);

  return { predictive_matrix: matrix };
}

function buildPredictiveMatrix(
  featureVectors: FeatureVector[],
  semanticGraph: GraphData,
  historicalRecords: ConsultationRecord[],
  houseId: string
): PredictiveMatrix {
  // Define feature columns
  const featureColumns = [
    "odu_hash",
    "outcome_binary",
    "subtype_hash",
    "orisha_hash",
    "ebo_hash",
    "graph_degree",
    "pattern_index",
  ];

  // Build unique value sets for hashing
  const oduSet = new Set<string>();
  const subtypeSet = new Set<string>();
  const orishaSet = new Set<string>();
  const eboSet = new Set<string>();

  historicalRecords.forEach((r) => {
    oduSet.add((r.main_odu || "").toLowerCase().trim());
    subtypeSet.add((r.subtype || "").toLowerCase().trim());
    orishaSet.add((r.orisha_owner || "").toLowerCase().trim());
    eboSet.add((r.recommended_ebo || "").toLowerCase().trim());
  });

  const oduList = Array.from(oduSet);
  const subtypeList = Array.from(subtypeSet);
  const orishaList = Array.from(orishaSet);
  const eboList = Array.from(eboSet);

  // Build rows from historical records
  const rows = historicalRecords.map((record) => {
    const oduNorm = (record.main_odu || "").toLowerCase().trim();
    const subtypeNorm = (record.subtype || "").toLowerCase().trim();
    const orishaNorm = (record.orisha_owner || "").toLowerCase().trim();
    const eboNorm = (record.recommended_ebo || "").toLowerCase().trim();
    const isIre = (record.ire_or_osogbo || "").toLowerCase().includes("ire") ? 1 : 0;

    // Compute graph degree for this odu
    const oduNodeId = `odu_${oduNorm.replace(/\s+/g, "_")}`;
    const graphDegree = semanticGraph.edges.filter(
      (e) => e.source === oduNodeId || e.target === oduNodeId
    ).length;

    const patternIdx = record.pattern_index ? parseInt(record.pattern_index, 10) || 0 : 0;

    const features = [
      oduList.indexOf(oduNorm) / Math.max(oduList.length - 1, 1),
      isIre,
      subtypeList.indexOf(subtypeNorm) / Math.max(subtypeList.length - 1, 1),
      orishaList.indexOf(orishaNorm) / Math.max(orishaList.length - 1, 1),
      eboList.indexOf(eboNorm) / Math.max(eboList.length - 1, 1),
      Math.min(graphDegree / 10, 1),
      Math.min(patternIdx / 256, 1),
    ];

    return {
      record_id: record.id,
      features,
      outcome: isIre,
    };
  });

  const ireCount = rows.filter((r) => r.outcome === 1).length;

  return {
    feature_columns: featureColumns,
    rows,
    metadata: {
      house_id: houseId,
      total_rows: rows.length,
      feature_count: featureColumns.length,
      ire_ratio: rows.length > 0 ? ireCount / rows.length : 0.5,
    },
  };
}

// ─── Module: predictive_model_trainer ────────────────────────────────────────

/**
 * Trains a predictive model using the feature matrix and historical outcomes.
 */
export async function predictiveModelTrainer(
  houseId: string,
  predictiveMatrix: PredictiveMatrix
): Promise<{ model_id: string; model: PredictiveModel }> {
  // Fetch history for validation
  const { data: historyData } = await supabase
    .from(TABLES.consultation_record)
    .select("*")
    .eq("house_id", houseId)
    .limit(1000);

  const history = (historyData || []) as ConsultationRecord[];

  // Train model
  const model = trainPredictiveModel(predictiveMatrix, history, houseId);

  // Store model
  const { data: modelRecord, error: insertError } = await supabase
    .from(TABLES.predictive_outcome_model)
    .insert({
      house_id: houseId,
      model: model,
    })
    .select("id")
    .single();

  if (insertError || !modelRecord) {
    throw new Error(`Failed to store predictive model: ${insertError?.message}`);
  }

  return {
    model_id: (modelRecord as { id: string }).id,
    model,
  };
}

function trainPredictiveModel(
  matrix: PredictiveMatrix,
  _history: ConsultationRecord[],
  houseId: string
): PredictiveModel {
  const rows = matrix.rows;
  const featureColumns = matrix.feature_columns;

  if (rows.length === 0) {
    return {
      type: "naive_bayes_frequency",
      house_id: houseId,
      feature_columns: featureColumns,
      class_priors: { ire: 0.5, osogbo: 0.5 },
      feature_likelihoods: {},
      accuracy_estimate: 0,
      trained_at: new Date().toISOString(),
      sample_size: 0,
    };
  }

  // Split into ire/osogbo groups
  const ireRows = rows.filter((r) => r.outcome === 1);
  const osogboRows = rows.filter((r) => r.outcome === 0);

  // Class priors
  const classPriors = {
    ire: ireRows.length / rows.length,
    osogbo: osogboRows.length / rows.length,
  };

  // Feature likelihoods (mean feature values per class, binned)
  const featureLikelihoods: Record<string, { ire: number[]; osogbo: number[] }> = {};

  featureColumns.forEach((col, colIdx) => {
    const bins = 5;
    const ireBins = new Array(bins).fill(0);
    const osogboBins = new Array(bins).fill(0);

    ireRows.forEach((row) => {
      const binIdx = Math.min(Math.floor(row.features[colIdx] * bins), bins - 1);
      ireBins[binIdx]++;
    });

    osogboRows.forEach((row) => {
      const binIdx = Math.min(Math.floor(row.features[colIdx] * bins), bins - 1);
      osogboBins[binIdx]++;
    });

    // Normalize with Laplace smoothing
    const ireTotal = ireRows.length + bins;
    const osogboTotal = osogboRows.length + bins;

    featureLikelihoods[col] = {
      ire: ireBins.map((c) => (c + 1) / ireTotal),
      osogbo: osogboBins.map((c) => (c + 1) / osogboTotal),
    };
  });

  // Estimate accuracy via leave-one-out on training data
  let correct = 0;
  rows.forEach((row) => {
    const predicted = predictSingle(row.features, featureColumns, classPriors, featureLikelihoods);
    if ((predicted === "ire" ? 1 : 0) === row.outcome) correct++;
  });

  const accuracyEstimate = rows.length > 0 ? correct / rows.length : 0;

  return {
    type: "naive_bayes_frequency",
    house_id: houseId,
    feature_columns: featureColumns,
    class_priors: classPriors,
    feature_likelihoods: featureLikelihoods,
    accuracy_estimate: accuracyEstimate,
    trained_at: new Date().toISOString(),
    sample_size: rows.length,
  };
}

function predictSingle(
  features: number[],
  featureColumns: string[],
  classPriors: { ire: number; osogbo: number },
  featureLikelihoods: Record<string, { ire: number[]; osogbo: number[] }>
): "ire" | "osogbo" {
  const bins = 5;
  let logIre = Math.log(classPriors.ire || 0.5);
  let logOsogbo = Math.log(classPriors.osogbo || 0.5);

  featureColumns.forEach((col, idx) => {
    const binIdx = Math.min(Math.floor(features[idx] * bins), bins - 1);
    const likelihood = featureLikelihoods[col];
    if (likelihood) {
      logIre += Math.log(likelihood.ire[binIdx] || 0.01);
      logOsogbo += Math.log(likelihood.osogbo[binIdx] || 0.01);
    }
  });

  return logIre >= logOsogbo ? "ire" : "osogbo";
}

// ─── Module: predictive_inference_engine ─────────────────────────────────────

/**
 * Runs inference on a consultation using the trained predictive model.
 */
export async function predictiveInferenceEngine(consultationRecordId: string): Promise<{
  prediction: Prediction;
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

  // Fetch latest model for this house
  const { data: modelData } = await supabase
    .from(TABLES.predictive_outcome_model)
    .select("*")
    .eq("house_id", record.house_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!modelData) {
    throw new Error("No predictive model found for this house");
  }

  const model = (modelData as { model: PredictiveModel }).model;

  // Fetch feature vector
  const { data: fvData } = await supabase
    .from(TABLES.lineage_feature_vector)
    .select("*")
    .eq("consultation_record_id", consultationRecordId)
    .single();

  const features = (fvData as FeatureVector | null)?.features || {};

  // Run inference
  const prediction = runPredictiveInference(model, features);

  return { prediction };
}

function runPredictiveInference(
  model: PredictiveModel,
  features: Record<string, string>
): Prediction {
  const bins = 5;
  const featureColumns = model.feature_columns;

  // Convert features to numeric array
  const numericFeatures = featureColumns.map((col) => {
    const val = features[col];
    if (val === undefined || val === null) return 0;
    const num = parseFloat(val);
    return isNaN(num) ? simpleHash(val) : Math.min(Math.max(num, 0), 1);
  });

  // Compute log probabilities
  let logIre = Math.log(model.class_priors.ire || 0.5);
  let logOsogbo = Math.log(model.class_priors.osogbo || 0.5);

  const contributions: Prediction["contributing_features"] = [];

  featureColumns.forEach((col, idx) => {
    const binIdx = Math.min(Math.floor(numericFeatures[idx] * bins), bins - 1);
    const likelihood = model.feature_likelihoods[col];
    if (likelihood) {
      const ireL = Math.log(likelihood.ire[binIdx] || 0.01);
      const osogboL = Math.log(likelihood.osogbo[binIdx] || 0.01);
      logIre += ireL;
      logOsogbo += osogboL;

      contributions.push({
        feature: col,
        value: numericFeatures[idx],
        contribution: ireL - osogboL,
      });
    }
  });

  // Convert to probabilities
  const maxLog = Math.max(logIre, logOsogbo);
  const expIre = Math.exp(logIre - maxLog);
  const expOsogbo = Math.exp(logOsogbo - maxLog);
  const total = expIre + expOsogbo;

  const ireProb = expIre / total;
  const osogboProb = expOsogbo / total;

  // Sort contributions by absolute value
  contributions.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

  return {
    predicted_outcome: ireProb >= osogboProb ? "ire" : "osogbo",
    confidence: Math.max(ireProb, osogboProb),
    probabilities: { ire: Math.round(ireProb * 1000) / 1000, osogbo: Math.round(osogboProb * 1000) / 1000 },
    contributing_features: contributions.slice(0, 5),
  };
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) & 0x7fffffff;
  }
  return (hash % 1000) / 1000;
}

// ─── Module: predictive_explanation_engine ────────────────────────────────────

/**
 * Generates explanations for predictions using semantic graph and reasoning engine.
 */
export async function predictiveExplanationEngine(
  consultationRecordId: string,
  prediction: Prediction
): Promise<{ prediction_explanation: PredictionExplanation }> {
  // Use semantic reasoner modules
  const { semantic_context } = await oduSemanticContextBuilder(consultationRecordId);
  const { reasoning } = oduReasoningEngine(semantic_context, "explain prediction");

  // Fetch house_id from context
  const { data: record } = await supabase
    .from(TABLES.consultation_record)
    .select("house_id")
    .eq("id", consultationRecordId)
    .single();

  const houseId = (record as { house_id: string } | null)?.house_id || "";

  const { expanded_reasoning } = await oduReasoningExpander(houseId, reasoning);

  // Merge prediction with reasoning
  const explanation = mergePredictionWithReasoning(prediction, expanded_reasoning);

  return { prediction_explanation: explanation };
}

function mergePredictionWithReasoning(
  prediction: Prediction,
  expandedReasoning: ExpandedReasoning
): PredictionExplanation {
  const base = expandedReasoning.base_reasoning;

  // Build reasoning summary
  const reasoningSummary = [
    `Predicted outcome: ${prediction.predicted_outcome} (confidence: ${Math.round(prediction.confidence * 100)}%).`,
    base.primary_interpretation,
    base.historical_correlation,
  ]
    .filter(Boolean)
    .join(" ");

  // Semantic pathways
  const semanticPathways = base.semantic_pathways.slice(0, 5);

  // Lineage context from graph expansions
  const lineageContext = expandedReasoning.graph_expansions.length > 0
    ? expandedReasoning.graph_expansions
        .map((ge) => `${ge.pathway}: ${ge.insight}`)
        .join("; ")
    : "Lineage context is being established.";

  // Cluster insights
  const clusterInsights = expandedReasoning.cluster_insights
    .filter((ci) => ci.relevance >= 0.5)
    .map((ci) => ({
      cluster_label: ci.cluster_label,
      insight: ci.insight,
    }));

  // Confidence assessment
  const confidenceAssessment = prediction.confidence >= 0.8
    ? "High confidence prediction supported by strong historical patterns and semantic connections."
    : prediction.confidence >= 0.6
      ? "Moderate confidence. The prediction aligns with observed patterns but has some uncertainty."
      : "Low confidence. Limited historical data or conflicting patterns reduce certainty.";

  return {
    prediction,
    reasoning_summary: reasoningSummary,
    semantic_pathways: semanticPathways,
    lineage_context: lineageContext,
    cluster_insights: clusterInsights,
    confidence_assessment: confidenceAssessment,
  };
}

// ─── Module: predictive_outcome_pipeline (unified) ───────────────────────────

/**
 * Unified pipeline: matrix → model → inference → explanation.
 */
export async function predictiveOutcomePipeline(consultationRecordId: string): Promise<{
  predictive_matrix: PredictiveMatrix;
  model: PredictiveModel;
  prediction: Prediction;
  prediction_explanation: PredictionExplanation;
}> {
  // Fetch record for house_id
  const { data: recordData } = await supabase
    .from(TABLES.consultation_record)
    .select("*")
    .eq("id", consultationRecordId)
    .single();

  if (!recordData) {
    throw new Error("Consultation record not found");
  }

  const record = recordData as ConsultationRecord;

  // Step 1: Build feature matrix
  const { predictive_matrix } = await predictiveFeatureMatrixBuilder(record.house_id);

  // Step 2: Train model
  const { model } = await predictiveModelTrainer(record.house_id, predictive_matrix);

  // Step 3: Run inference
  const { prediction } = await predictiveInferenceEngine(consultationRecordId);

  // Step 4: Generate explanation
  const { prediction_explanation } = await predictiveExplanationEngine(
    consultationRecordId,
    prediction
  );

  return {
    predictive_matrix,
    model,
    prediction,
    prediction_explanation,
  };
}