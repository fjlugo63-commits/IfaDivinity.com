import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Brain,
  Network,
  TrendingUp,
  Sparkles,
  ArrowLeft,
  Loader2,
  Search,
  Building2,
  GitBranch,
  BarChart3,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, TABLES } from '@/lib/supabase';
import {
  apiLineageCluster,
  apiLineageGraph,
  apiOduQuery,
  apiLineageInsights,
} from '@/lib/api/aiConsultApi';
import {
  predictiveFeatureMatrixBuilder,
  predictiveModelTrainer,
} from '@/lib/predictiveOutcomePipeline';

type Screen = 'home' | 'lineage' | 'semantic' | 'predictive' | 'ebo';

export default function HouseAiDashboard() {
  const { screen } = useParams<{ screen?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [houseId, setHouseId] = useState<string | null>(null);
  const [houseName, setHouseName] = useState<string>('');
  const [loadingHouse, setLoadingHouse] = useState(true);

  const currentScreen: Screen = (screen as Screen) || 'home';

  // Resolve house_id from current user's house_practitioners record
  useEffect(() => {
    async function resolveHouse() {
      if (!user) return;
      setLoadingHouse(true);
      try {
        // First try house_practitioners
        const { data: practitioner } = await supabase
          .from(TABLES.house_practitioners)
          .select('house_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (practitioner?.house_id) {
          setHouseId(practitioner.house_id);
          // Fetch house name
          const { data: house } = await supabase
            .from(TABLES.house_profile)
            .select('name')
            .eq('id', practitioner.house_id)
            .maybeSingle();
          if (house?.name) setHouseName(house.name);
        } else {
          // Fallback: check if user owns a house_profile directly
          const { data: ownedHouse } = await supabase
            .from(TABLES.house_profile)
            .select('id, name')
            .eq('owner_id', user.id)
            .maybeSingle();
          if (ownedHouse) {
            setHouseId(ownedHouse.id);
            setHouseName(ownedHouse.name || '');
          }
        }
      } catch {
        toast.error('Failed to resolve house information');
      } finally {
        setLoadingHouse(false);
      }
    }
    resolveHouse();
  }, [user]);

  function goTo(s: Screen) {
    navigate(`/awo/house-ai/${s}`);
  }

  function goHome() {
    navigate('/awo/house-ai');
  }

  if (loadingHouse) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!houseId) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">No House Assigned</h2>
            <p className="text-gray-500">
              You are not currently assigned to any Ifa house. Contact your house administrator to be added.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      {currentScreen === 'home' && (
        <HouseAiHome houseName={houseName} onNavigate={goTo} />
      )}
      {currentScreen === 'lineage' && (
        <HouseLineageOverview houseId={houseId} onBack={goHome} />
      )}
      {currentScreen === 'semantic' && (
        <HouseSemanticGraphViewer houseId={houseId} onBack={goHome} />
      )}
      {currentScreen === 'predictive' && (
        <HousePredictiveAnalytics houseId={houseId} onBack={goHome} />
      )}
      {currentScreen === 'ebo' && (
        <HouseEboInsights houseId={houseId} onBack={goHome} />
      )}
    </div>
  );
}

// ─── Screen: House AI Home ───────────────────────────────────────────────────

function HouseAiHome({
  houseName,
  onNavigate,
}: {
  houseName: string;
  onNavigate: (s: Screen) => void;
}) {
  const tools = [
    {
      key: 'lineage' as Screen,
      label: 'Lineage Overview',
      description: 'View lineage clusters, tendencies, and spiritual signatures for your house.',
      icon: GitBranch,
      color: 'text-emerald-600 bg-emerald-50',
    },
    {
      key: 'semantic' as Screen,
      label: 'Semantic Graph Viewer',
      description: 'Explore semantic graph relationships for any Odu within the house.',
      icon: Network,
      color: 'text-indigo-600 bg-indigo-50',
    },
    {
      key: 'predictive' as Screen,
      label: 'Predictive Analytics',
      description: 'Predictive outcome trends and spiritual trajectory modeling.',
      icon: TrendingUp,
      color: 'text-amber-600 bg-amber-50',
    },
    {
      key: 'ebo' as Screen,
      label: 'Ebo Optimization Insights',
      description: 'House-level ebo optimization intelligence and rule analysis.',
      icon: Sparkles,
      color: 'text-purple-600 bg-purple-50',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Brain className="w-7 h-7 text-indigo-600" />
          House AI Intelligence Dashboard
        </h1>
        {houseName && (
          <p className="text-gray-500 mt-1">
            <Badge variant="outline" className="mr-2">
              <Building2 className="w-3 h-3 mr-1" />
              {houseName}
            </Badge>
          </p>
        )}
        <p className="text-gray-600 mt-3">
          Access lineage modeling, semantic Odu insights, predictive analytics, and ebo optimization for your house.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tools.map((tool) => (
          <Card
            key={tool.key}
            className="cursor-pointer hover:shadow-md transition-shadow border-l-4"
            style={{ borderLeftColor: tool.color.includes('emerald') ? '#059669' : tool.color.includes('indigo') ? '#4f46e5' : tool.color.includes('amber') ? '#d97706' : '#9333ea' }}
            onClick={() => onNavigate(tool.key)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className={`p-2 rounded-lg ${tool.color}`}>
                  <tool.icon className="w-5 h-5" />
                </div>
                {tool.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">{tool.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Screen: Lineage Overview ────────────────────────────────────────────────

function HouseLineageOverview({
  houseId,
  onBack,
}: {
  houseId: string;
  onBack: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [clusters, setClusters] = useState<unknown>(null);
  const [graph, setGraph] = useState<unknown>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [clusterRes, graphRes] = await Promise.all([
        apiLineageCluster(houseId),
        apiLineageGraph(houseId),
      ]);

      if (clusterRes.success && clusterRes.data) {
        setClusters((clusterRes.data as { clusters: unknown }).clusters);
      }
      if (graphRes.success && graphRes.data) {
        setGraph((graphRes.data as { graph: unknown }).graph);
      }
    } catch {
      toast.error('Failed to load lineage data');
    } finally {
      setLoading(false);
    }
  }, [houseId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-emerald-600" />
          Lineage Overview
        </h1>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                Lineage Clusters
              </CardTitle>
              <CardDescription>
                Grouped spiritual tendencies and patterns within your house lineage.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                {clusters ? (
                  <pre className="text-xs bg-gray-50 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(clusters, null, 2)}
                  </pre>
                ) : (
                  <p className="text-gray-500 text-sm">
                    No cluster data available. Run lineage extraction on consultation records to generate clusters.
                  </p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Network className="w-4 h-4 text-indigo-600" />
                Lineage Semantic Graph
              </CardTitle>
              <CardDescription>
                Interconnected relationships between lineage patterns, Odu, and spiritual signatures.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                {graph ? (
                  <pre className="text-xs bg-gray-50 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(graph, null, 2)}
                  </pre>
                ) : (
                  <p className="text-gray-500 text-sm">
                    No graph data available. Build the lineage semantic graph from cluster data to visualize relationships.
                  </p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── Screen: Semantic Graph Viewer ───────────────────────────────────────────

function HouseSemanticGraphViewer({
  houseId,
  onBack,
}: {
  houseId: string;
  onBack: () => void;
}) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<unknown>(null);

  async function handleRunQuery() {
    if (!query.trim()) {
      toast.error('Please enter a semantic query');
      return;
    }
    setLoading(true);
    try {
      const response = await apiOduQuery(houseId, query);
      if (response.success && response.data) {
        setResults((response.data as { results: unknown }).results);
        toast.success('Query executed successfully');
      } else {
        toast.error(response.error || 'Query failed');
      }
    } catch {
      toast.error('Failed to execute semantic query');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Network className="w-5 h-5 text-indigo-600" />
          Semantic Graph Viewer
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Explore Semantic Relationships</CardTitle>
          <CardDescription>
            Query the Odu semantic graph to discover relationships, patterns, and connections within your house tradition.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="semantic-query">Semantic Query</Label>
            <div className="flex gap-2">
              <Input
                id="semantic-query"
                placeholder="e.g., Show relationships around Odi Meji"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRunQuery()}
              />
              <Button onClick={handleRunQuery} disabled={loading}>
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                <span className="ml-1">Run Query</span>
              </Button>
            </div>
          </div>

          {results && (
            <>
              <Separator />
              <div>
                <Label className="text-sm font-medium text-gray-700">Semantic Graph Results</Label>
                <ScrollArea className="h-72 mt-2">
                  <pre className="text-xs bg-gray-50 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(results, null, 2)}
                  </pre>
                </ScrollArea>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Screen: Predictive Analytics ────────────────────────────────────────────

function HousePredictiveAnalytics({
  houseId,
  onBack,
}: {
  houseId: string;
  onBack: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [matrix, setMatrix] = useState<unknown>(null);
  const [model, setModel] = useState<unknown>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Build predictive feature matrix
      const matrixResult = await predictiveFeatureMatrixBuilder(houseId);
      setMatrix(matrixResult.predictive_matrix);

      // Train predictive model
      const modelResult = await predictiveModelTrainer(
        houseId,
        matrixResult.predictive_matrix
      );
      setModel(modelResult.model);
    } catch {
      toast.error('Failed to load predictive analytics');
    } finally {
      setLoading(false);
    }
  }, [houseId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-amber-600" />
          Predictive Analytics
        </h1>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-amber-600" />
                Predictive Feature Matrix
              </CardTitle>
              <CardDescription>
                Unified feature matrix built from consultation vectors, graph data, and historical outcomes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                {matrix ? (
                  <pre className="text-xs bg-gray-50 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(matrix, null, 2)}
                  </pre>
                ) : (
                  <p className="text-gray-500 text-sm">
                    No feature matrix available. Ensure consultation records exist for this house.
                  </p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-600" />
                Predictive Model
              </CardTitle>
              <CardDescription>
                Trained frequency model with Laplace smoothing for outcome prediction.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                {model ? (
                  <pre className="text-xs bg-gray-50 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(model, null, 2)}
                  </pre>
                ) : (
                  <p className="text-gray-500 text-sm">
                    No predictive model available. Build the feature matrix first to train the model.
                  </p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── Screen: Ebo Insights ────────────────────────────────────────────────────

function HouseEboInsights({
  houseId,
  onBack,
}: {
  houseId: string;
  onBack: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState<unknown[]>([]);
  const [graph, setGraph] = useState<unknown>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch house Odu rules
      const { data: rulesData } = await supabase
        .from(TABLES.house_odu_rule)
        .select('*')
        .eq('house_id', houseId)
        .limit(50);

      if (rulesData) setRules(rulesData);

      // Fetch lineage semantic graph
      const graphRes = await apiLineageGraph(houseId);
      if (graphRes.success && graphRes.data) {
        setGraph((graphRes.data as { graph: unknown }).graph);
      }
    } catch {
      toast.error('Failed to load ebo insights');
    } finally {
      setLoading(false);
    }
  }, [houseId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          Ebo Optimization Insights
        </h1>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                House Ebo Rules
              </CardTitle>
              <CardDescription>
                Ebo prescriptions and rules configured for your house tradition.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-72">
                {rules.length > 0 ? (
                  <div className="space-y-2">
                    {rules.map((rule: unknown, idx: number) => {
                      const r = rule as Record<string, unknown>;
                      return (
                        <div key={idx} className="p-2 bg-gray-50 rounded-lg border text-sm">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="secondary" className="text-xs">
                              {String(r.pattern_key || r.odu_code || `Rule ${idx + 1}`)}
                            </Badge>
                            {r.combined_name && (
                              <span className="font-medium text-gray-700">
                                {String(r.combined_name)}
                              </span>
                            )}
                          </div>
                          {r.result && (
                            <p className="text-xs text-gray-600">
                              Result: {String(r.result)}
                            </p>
                          )}
                          {r.recommended_ebo && (
                            <p className="text-xs text-purple-600">
                              Ebo: {String(r.recommended_ebo)}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">
                    No house Odu rules found. Configure rules through the Admin Engine panel.
                  </p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Network className="w-4 h-4 text-indigo-600" />
                Lineage Graph
              </CardTitle>
              <CardDescription>
                Lineage semantic graph used for ebo optimization scoring and candidate generation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-72">
                {graph ? (
                  <pre className="text-xs bg-gray-50 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(graph, null, 2)}
                  </pre>
                ) : (
                  <p className="text-gray-500 text-sm">
                    No lineage graph available. Run lineage modeling to generate the semantic graph.
                  </p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}