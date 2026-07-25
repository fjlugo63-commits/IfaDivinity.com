/**
 * Awo AI Tools Page
 *
 * Implements ui_awo_ai_tools module with 5 screens:
 * - awo_ai_dashboard: tool selection dashboard
 * - awo_semantic_explorer: semantic graph query interface
 * - awo_lineage_intelligence: lineage insights interface
 * - awo_predictive_console: predictive outcome modeling
 * - awo_ebo_optimizer: ebo optimization console
 *
 * Auth: requires "awo" role (enforced by AwoLayout parent)
 */

import { useState, useEffect } from 'react';
import { supabase, TABLES } from '@/lib/supabase';
import {
  apiOduQuery,
  apiLineageInsights,
  apiPredictOutcome,
  apiEboOptimize,
} from '@/lib/api/aiConsultApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  Brain,
  GitBranch,
  TrendingUp,
  Sparkles,
  ArrowLeft,
  Search,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';

type Screen = 'dashboard' | 'semantic' | 'lineage' | 'predictive' | 'ebo';

interface HouseOption {
  id: string;
  name: string;
}

interface ConsultationOption {
  id: string;
}

export default function AwoAiTools() {
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [houses, setHouses] = useState<HouseOption[]>([]);
  const [consultations, setConsultations] = useState<ConsultationOption[]>([]);

  useEffect(() => {
    loadHouses();
    loadConsultations();
  }, []);

  async function loadHouses() {
    try {
      const { data } = await supabase
        .from(TABLES.house_profile)
        .select('id, name')
        .order('name');
      if (data) setHouses(data as HouseOption[]);
    } catch {
      // silently handle
    }
  }

  async function loadConsultations() {
    try {
      const { data } = await supabase
        .from(TABLES.consultation_record)
        .select('id')
        .order('created_at', { ascending: false })
        .limit(50);
      if (data) setConsultations(data as ConsultationOption[]);
    } catch {
      // silently handle
    }
  }

  // ─── Dashboard Screen ────────────────────────────────────────────────────────

  if (screen === 'dashboard') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-[Rubik]">Awo AI Tools</h1>
          <p className="text-gray-600 mt-1">
            Access advanced semantic reasoning, lineage intelligence, predictive modeling, and ebo optimization tools.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ToolCard
            title="Semantic Odu Explorer"
            description="Explore semantic graph relationships for any Odu. Query the knowledge graph for deep connections."
            icon={<Brain className="w-8 h-8 text-indigo-600" />}
            accentColor="indigo"
            onClick={() => setScreen('semantic')}
          />
          <ToolCard
            title="Lineage Intelligence"
            description="Access lineage-specific insights and cluster intelligence for your house tradition."
            icon={<GitBranch className="w-8 h-8 text-emerald-600" />}
            accentColor="emerald"
            onClick={() => setScreen('lineage')}
          />
          <ToolCard
            title="Predictive Console"
            description="Run predictive outcome modeling for any consultation using trained ML models."
            icon={<TrendingUp className="w-8 h-8 text-amber-600" />}
            accentColor="amber"
            onClick={() => setScreen('predictive')}
          />
          <ToolCard
            title="Ebo Optimization Console"
            description="Run AI-powered ebo optimization to find the best recommendation for a consultation."
            icon={<Sparkles className="w-8 h-8 text-rose-600" />}
            accentColor="rose"
            onClick={() => setScreen('ebo')}
          />
        </div>
      </div>
    );
  }

  // ─── Semantic Explorer Screen ────────────────────────────────────────────────

  if (screen === 'semantic') {
    return (
      <ToolScreen
        title="Semantic Odu Explorer"
        description="Explore semantic graph relationships for any Odu."
        icon={<Brain className="w-6 h-6 text-indigo-600" />}
        onBack={() => setScreen('dashboard')}
      >
        <SemanticExplorerForm houses={houses} />
      </ToolScreen>
    );
  }

  // ─── Lineage Intelligence Screen ────────────────────────────────────────────

  if (screen === 'lineage') {
    return (
      <ToolScreen
        title="Lineage Intelligence"
        description="Access lineage-specific insights and cluster intelligence."
        icon={<GitBranch className="w-6 h-6 text-emerald-600" />}
        onBack={() => setScreen('dashboard')}
      >
        <LineageIntelligenceForm houses={houses} />
      </ToolScreen>
    );
  }

  // ─── Predictive Console Screen ───────────────────────────────────────────────

  if (screen === 'predictive') {
    return (
      <ToolScreen
        title="Predictive Console"
        description="Run predictive outcome modeling for any consultation."
        icon={<TrendingUp className="w-6 h-6 text-amber-600" />}
        onBack={() => setScreen('dashboard')}
      >
        <PredictiveConsoleForm consultations={consultations} />
      </ToolScreen>
    );
  }

  // ─── Ebo Optimizer Screen ────────────────────────────────────────────────────

  return (
    <ToolScreen
      title="Ebo Optimization Console"
      description="Run ebo optimization for any consultation."
      icon={<Sparkles className="w-6 h-6 text-rose-600" />}
      onBack={() => setScreen('dashboard')}
    >
      <EboOptimizerForm consultations={consultations} />
    </ToolScreen>
  );
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

function ToolCard({
  title,
  description,
  icon,
  accentColor,
  onClick,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  accentColor: string;
  onClick: () => void;
}) {
  const borderMap: Record<string, string> = {
    indigo: 'border-indigo-100 hover:border-indigo-300',
    emerald: 'border-emerald-100 hover:border-emerald-300',
    amber: 'border-amber-100 hover:border-amber-300',
    rose: 'border-rose-100 hover:border-rose-300',
  };

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${borderMap[accentColor] || 'border-gray-100'}`}
      onClick={onClick}
    >
      <CardContent className="p-6 flex items-start gap-4">
        <div className="shrink-0 mt-1">{icon}</div>
        <div>
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ToolScreen({
  title,
  description,
  icon,
  onBack,
  children,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  onBack: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <Button variant="ghost" className="text-gray-600" onClick={onBack}>
        <ArrowLeft className="mr-2 w-4 h-4" />
        Back to AI Tools
      </Button>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-[Rubik]">
            {icon}
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  );
}

// ─── Semantic Explorer Form ──────────────────────────────────────────────────

function SemanticExplorerForm({ houses }: { houses: HouseOption[] }) {
  const [houseId, setHouseId] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<unknown>(null);

  async function handleSubmit() {
    if (!houseId || !query) {
      toast.error('Please select a house and enter a query');
      return;
    }
    setLoading(true);
    try {
      const response = await apiOduQuery(houseId, query);
      if (response.success && response.data) {
        setResults((response.data as { results: unknown }).results);
        toast.success('Semantic query complete');
      } else {
        toast.error(response.error || 'Query failed');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Query failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>House</Label>
        <Select value={houseId} onValueChange={setHouseId}>
          <SelectTrigger>
            <SelectValue placeholder="Select a house" />
          </SelectTrigger>
          <SelectContent>
            {houses.map((h) => (
              <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Semantic Query</Label>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g., Show relationships around Odi Meji"
        />
      </div>

      <Button onClick={handleSubmit} disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
        {loading ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : <Search className="mr-2 w-4 h-4" />}
        Run Semantic Query
      </Button>

      {results && (
        <ResultDisplay label="Semantic Graph Results" value={results} accentColor="indigo" />
      )}
    </div>
  );
}

// ─── Lineage Intelligence Form ───────────────────────────────────────────────

function LineageIntelligenceForm({ houses }: { houses: HouseOption[] }) {
  const [houseId, setHouseId] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<unknown>(null);

  async function handleSubmit() {
    if (!houseId || !query) {
      toast.error('Please select a house and enter a query');
      return;
    }
    setLoading(true);
    try {
      const response = await apiLineageInsights(houseId, query);
      if (response.success && response.data) {
        setInsights((response.data as { insights: unknown }).insights);
        toast.success('Lineage insights generated');
      } else {
        toast.error(response.error || 'Query failed');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Query failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>House</Label>
        <Select value={houseId} onValueChange={setHouseId}>
          <SelectTrigger>
            <SelectValue placeholder="Select a house" />
          </SelectTrigger>
          <SelectContent>
            {houses.map((h) => (
              <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Lineage Query</Label>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g., What patterns appear for Obara in this house?"
        />
      </div>

      <Button onClick={handleSubmit} disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
        {loading ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : <GitBranch className="mr-2 w-4 h-4" />}
        Run Lineage Insights
      </Button>

      {insights && (
        <ResultDisplay label="Lineage Insights" value={insights} accentColor="emerald" />
      )}
    </div>
  );
}

// ─── Predictive Console Form ─────────────────────────────────────────────────

function PredictiveConsoleForm({ consultations }: { consultations: ConsultationOption[] }) {
  const [consultationId, setConsultationId] = useState('');
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<unknown>(null);
  const [explanation, setExplanation] = useState<unknown>(null);

  async function handleSubmit() {
    if (!consultationId) {
      toast.error('Please select a consultation record');
      return;
    }
    setLoading(true);
    try {
      const response = await apiPredictOutcome(consultationId);
      if (response.success && response.data) {
        const data = response.data as { prediction: unknown; prediction_explanation: unknown };
        setPrediction(data.prediction);
        setExplanation(data.prediction_explanation);
        toast.success('Prediction complete');
      } else {
        toast.error(response.error || 'Prediction failed');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Prediction failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Consultation Record</Label>
        <Select value={consultationId} onValueChange={setConsultationId}>
          <SelectTrigger>
            <SelectValue placeholder="Select a consultation" />
          </SelectTrigger>
          <SelectContent>
            {consultations.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.id.slice(0, 8)}...
              </SelectItem>
            ))}
            {consultations.length === 0 && (
              <SelectItem value="__none" disabled>No consultations available</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      <Button onClick={handleSubmit} disabled={loading} className="w-full bg-amber-600 hover:bg-amber-700 text-white">
        {loading ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : <TrendingUp className="mr-2 w-4 h-4" />}
        Run Prediction
      </Button>

      {prediction && (
        <div className="space-y-3">
          <ResultDisplay label="Predicted Outcome" value={prediction} accentColor="amber" />
          {explanation && (
            <ResultDisplay label="Explanation" value={explanation} accentColor="amber" />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Ebo Optimizer Form ──────────────────────────────────────────────────────

function EboOptimizerForm({ consultations }: { consultations: ConsultationOption[] }) {
  const [consultationId, setConsultationId] = useState('');
  const [loading, setLoading] = useState(false);
  const [optimalEbo, setOptimalEbo] = useState<unknown>(null);
  const [eboScores, setEboScores] = useState<unknown>(null);

  async function handleSubmit() {
    if (!consultationId) {
      toast.error('Please select a consultation record');
      return;
    }
    setLoading(true);
    try {
      const response = await apiEboOptimize(consultationId);
      if (response.success && response.data) {
        const data = response.data as { optimal_ebo: unknown; ebo_scores: unknown };
        setOptimalEbo(data.optimal_ebo);
        setEboScores(data.ebo_scores);
        toast.success('Ebo optimization complete');
      } else {
        toast.error(response.error || 'Optimization failed');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Optimization failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Consultation Record</Label>
        <Select value={consultationId} onValueChange={setConsultationId}>
          <SelectTrigger>
            <SelectValue placeholder="Select a consultation" />
          </SelectTrigger>
          <SelectContent>
            {consultations.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.id.slice(0, 8)}...
              </SelectItem>
            ))}
            {consultations.length === 0 && (
              <SelectItem value="__none" disabled>No consultations available</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      <Button onClick={handleSubmit} disabled={loading} className="w-full bg-rose-600 hover:bg-rose-700 text-white">
        {loading ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : <Zap className="mr-2 w-4 h-4" />}
        Optimize Ebo
      </Button>

      {optimalEbo && (
        <div className="space-y-3">
          <ResultDisplay label="Optimal Ebo" value={optimalEbo} accentColor="rose" />
          {eboScores && (
            <ResultDisplay label="Ebo Scores" value={eboScores} accentColor="rose" />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Result Display ──────────────────────────────────────────────────────────

function ResultDisplay({
  label,
  value,
  accentColor,
}: {
  label: string;
  value: unknown;
  accentColor: string;
}) {
  const bgMap: Record<string, string> = {
    indigo: 'bg-indigo-50 border-indigo-100',
    emerald: 'bg-emerald-50 border-emerald-100',
    amber: 'bg-amber-50 border-amber-100',
    rose: 'bg-rose-50 border-rose-100',
  };

  const badgeMap: Record<string, string> = {
    indigo: 'bg-indigo-100 text-indigo-800',
    emerald: 'bg-emerald-100 text-emerald-800',
    amber: 'bg-amber-100 text-amber-800',
    rose: 'bg-rose-100 text-rose-800',
  };

  const formatValue = (val: unknown): string => {
    if (!val) return 'No data available';
    if (typeof val === 'string') return val;
    if (typeof val === 'object') {
      try {
        return JSON.stringify(val, null, 2);
      } catch {
        return String(val);
      }
    }
    return String(val);
  };

  const displayValue = formatValue(value);
  const isJson = displayValue.startsWith('{') || displayValue.startsWith('[');

  return (
    <div className={`p-4 rounded-lg border ${bgMap[accentColor] || 'bg-gray-50 border-gray-100'}`}>
      <Badge className={`mb-2 ${badgeMap[accentColor] || 'bg-gray-100 text-gray-800'}`}>
        {label}
      </Badge>
      {isJson ? (
        <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono mt-2 overflow-x-auto">
          {displayValue}
        </pre>
      ) : (
        <p className="text-sm text-gray-700 leading-relaxed mt-2 whitespace-pre-wrap">
          {displayValue}
        </p>
      )}
    </div>
  );
}