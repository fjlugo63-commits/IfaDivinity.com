/**
 * Public AI-Augmented Consultation Page
 *
 * Implements ui_public_ai_consultation module with 3 screens:
 * - ai_consultation_landing: intro page
 * - ai_consultation_form: input form + quick results
 * - ai_consultation_result: full AI interpretation display
 */

import { useState, useEffect } from 'react';
import { supabase, TABLES } from '@/lib/supabase';
import { apiAiConsult, type AiConsultResult } from '@/lib/api/aiConsultApi';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Brain, Target, BookOpen, ArrowLeft, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

type Screen = 'landing' | 'form' | 'result';

interface HouseOption {
  id: string;
  name: string;
}

interface SemanticContext {
  main_odu?: string;
  ire_or_osogbo?: string;
  subtype?: string;
  orisha_owner?: string;
}

interface FullAiResult extends AiConsultResult {
  semantic_context?: SemanticContext;
  expanded_reasoning?: unknown;
}

export default function AiConsultation() {
  const [screen, setScreen] = useState<Screen>('landing');
  const [houses, setHouses] = useState<HouseOption[]>([]);
  const [houseId, setHouseId] = useState('');
  const [rawBits, setRawBits] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiResult, setAiResult] = useState<FullAiResult | null>(null);
  const [semanticContext, setSemanticContext] = useState<SemanticContext | null>(null);

  useEffect(() => {
    loadHouses();
  }, []);

  async function loadHouses() {
    try {
      const { data } = await supabase
        .from(TABLES.house_profile)
        .select('id, name')
        .order('name');
      if (data) {
        setHouses(data as HouseOption[]);
      }
    } catch {
      // Silently handle - houses may not be available
    }
  }

  async function runAiConsultation() {
    if (!rawBits || rawBits.length !== 8 || !/^[01]+$/.test(rawBits)) {
      toast.error('Please enter a valid 8-bit Opele cast (e.g., 10100110)');
      return;
    }

    setLoading(true);
    try {
      // The API expects a consultation record ID, but for the public interface
      // we create a transient consultation context from the raw bits
      const consultPayload = `${rawBits}_${houseId || 'public'}_${Date.now()}`;
      const result = await apiAiConsult(consultPayload, query || 'interpret consultation');

      if (result.success && result.data) {
        const fullResult = result.data as FullAiResult;
        setAiResult(fullResult);

        // Extract semantic context from the reasoning result
        const ctx: SemanticContext = {
          main_odu: (fullResult.semantic_context as SemanticContext)?.main_odu || derivedOduFromBits(rawBits),
          ire_or_osogbo: (fullResult.semantic_context as SemanticContext)?.ire_or_osogbo || 'Pending',
          subtype: (fullResult.semantic_context as SemanticContext)?.subtype || 'General',
          orisha_owner: (fullResult.semantic_context as SemanticContext)?.orisha_owner || 'Unknown',
        };
        setSemanticContext(ctx);
        toast.success('AI Consultation complete');
      } else {
        toast.error(result.error || 'Consultation failed');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Consultation failed');
    } finally {
      setLoading(false);
    }
  }

  function derivedOduFromBits(bits: string): string {
    // Simple mapping of first 4 bits to primary Odu name (simplified)
    const oduNames = [
      'Ogbe', 'Oyeku', 'Iwori', 'Odi',
      'Irosun', 'Owonrin', 'Obara', 'Okanran',
      'Ogunda', 'Osa', 'Ika', 'Oturupon',
      'Otura', 'Irete', 'Ose', 'Ofun',
    ];
    const idx = parseInt(bits.substring(0, 4), 2);
    return oduNames[idx] || 'Unknown';
  }

  function resetForm() {
    setRawBits('');
    setQuery('');
    setAiResult(null);
    setSemanticContext(null);
    setScreen('form');
  }

  // ─── Landing Screen ──────────────────────────────────────────────────────────

  if (screen === 'landing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-amber-50">
        <div className="container mx-auto px-4 py-16 max-w-4xl">
          <div className="text-center space-y-8">
            {/* Header */}
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg">
                  <Sparkles className="w-10 h-10 text-white" />
                </div>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 font-[Rubik]">
                AI-Augmented Opele Consultation
              </h1>
              <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
                Experience enhanced divination powered by lineage modeling, semantic Odu reasoning,
                predictive outcomes, and optimized ebo guidance.
              </p>
            </div>

            {/* Feature cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-12">
              <Card className="border-indigo-100 bg-white/80 backdrop-blur-sm">
                <CardContent className="p-6 flex items-start gap-4">
                  <Brain className="w-8 h-8 text-indigo-600 shrink-0 mt-1" />
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900">Semantic Reasoning</h3>
                    <p className="text-sm text-gray-600">Deep Odu interpretation using graph-based semantic analysis</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-amber-100 bg-white/80 backdrop-blur-sm">
                <CardContent className="p-6 flex items-start gap-4">
                  <Target className="w-8 h-8 text-amber-600 shrink-0 mt-1" />
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900">Predictive Outcomes</h3>
                    <p className="text-sm text-gray-600">Machine learning models trained on lineage patterns</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-purple-100 bg-white/80 backdrop-blur-sm">
                <CardContent className="p-6 flex items-start gap-4">
                  <BookOpen className="w-8 h-8 text-purple-600 shrink-0 mt-1" />
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900">Lineage Modeling</h3>
                    <p className="text-sm text-gray-600">House-specific tradition patterns and cluster analysis</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-green-100 bg-white/80 backdrop-blur-sm">
                <CardContent className="p-6 flex items-start gap-4">
                  <Sparkles className="w-8 h-8 text-green-600 shrink-0 mt-1" />
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900">Optimized Ebo</h3>
                    <p className="text-sm text-gray-600">AI-optimized ebo recommendations based on context</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* CTA */}
            <Button
              size="lg"
              className="mt-8 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-6 text-lg"
              onClick={() => setScreen('form')}
            >
              Begin AI Consultation
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Form Screen ─────────────────────────────────────────────────────────────

  if (screen === 'form') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-amber-50">
        <div className="container mx-auto px-4 py-12 max-w-2xl">
          {/* Back button */}
          <Button
            variant="ghost"
            className="mb-6 text-gray-600"
            onClick={() => setScreen('landing')}
          >
            <ArrowLeft className="mr-2 w-4 h-4" />
            Back to Home
          </Button>

          <Card className="shadow-lg border-indigo-100">
            <CardHeader>
              <CardTitle className="text-2xl font-[Rubik] flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-indigo-600" />
                AI Consultation Input
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* House Select */}
              <div className="space-y-2">
                <Label htmlFor="house_id">Select House</Label>
                <Select value={houseId} onValueChange={setHouseId}>
                  <SelectTrigger id="house_id">
                    <SelectValue placeholder="Choose a house (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {houses.map((h) => (
                      <SelectItem key={h.id} value={h.id}>
                        {h.name}
                      </SelectItem>
                    ))}
                    {houses.length === 0 && (
                      <SelectItem value="__none" disabled>
                        No houses available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Raw Bits Input */}
              <div className="space-y-2">
                <Label htmlFor="raw_bits">Opele Cast (8-bit)</Label>
                <Input
                  id="raw_bits"
                  value={rawBits}
                  onChange={(e) => setRawBits(e.target.value.replace(/[^01]/g, '').slice(0, 8))}
                  placeholder="e.g., 10100110"
                  maxLength={8}
                  className="font-mono text-lg tracking-widest"
                />
                <p className="text-xs text-gray-500">
                  Enter 8 binary digits representing the Opele cast
                </p>
              </div>

              {/* Query Input */}
              <div className="space-y-2">
                <Label htmlFor="query">Optional Question</Label>
                <Input
                  id="query"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g., What guidance does Ifa offer about my path?"
                />
              </div>

              {/* Submit */}
              <Button
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-6"
                onClick={runAiConsultation}
                disabled={loading || rawBits.length !== 8}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 w-5 h-5 animate-spin" />
                    Running AI Consultation...
                  </>
                ) : (
                  <>
                    <Brain className="mr-2 w-5 h-5" />
                    Consult Ifa (AI)
                  </>
                )}
              </Button>

              {/* Quick Results (outputs) */}
              {semanticContext && (
                <div className="mt-6 p-4 bg-indigo-50 rounded-lg border border-indigo-100 space-y-3">
                  <h3 className="font-semibold text-indigo-900">Quick Results</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Main Odu</p>
                      <Badge variant="secondary" className="mt-1 bg-indigo-100 text-indigo-800">
                        {semanticContext.main_odu}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Ire / Osogbo</p>
                      <Badge
                        variant="secondary"
                        className={`mt-1 ${
                          semanticContext.ire_or_osogbo?.toLowerCase() === 'ire'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-orange-100 text-orange-800'
                        }`}
                      >
                        {semanticContext.ire_or_osogbo}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Subtype</p>
                      <p className="text-sm font-medium text-gray-800">{semanticContext.subtype}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Orisha Owner</p>
                      <p className="text-sm font-medium text-gray-800">{semanticContext.orisha_owner}</p>
                    </div>
                  </div>

                  <Button
                    className="w-full mt-4 bg-purple-600 hover:bg-purple-700 text-white"
                    onClick={() => setScreen('result')}
                  >
                    View Full AI Interpretation
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ─── Result Screen ───────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-amber-50">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        {/* Back button */}
        <Button
          variant="ghost"
          className="mb-6 text-gray-600"
          onClick={() => setScreen('form')}
        >
          <ArrowLeft className="mr-2 w-4 h-4" />
          Back to Form
        </Button>

        <div className="space-y-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 font-[Rubik]">
              AI Consultation Result
            </h1>
            <p className="text-gray-600 mt-2">Full AI-augmented interpretation and guidance</p>
          </div>

          {/* AI Interpretation */}
          <ResultCard
            title="AI Interpretation"
            icon={<Brain className="w-5 h-5 text-indigo-600" />}
            value={aiResult?.ai_interpretation}
            accentColor="indigo"
          />

          {/* Expanded Reasoning */}
          <ResultCard
            title="Expanded Reasoning"
            icon={<BookOpen className="w-5 h-5 text-purple-600" />}
            value={aiResult?.expanded_reasoning}
            accentColor="purple"
          />

          {/* Predictive Outcome */}
          <ResultCard
            title="Predictive Outcome"
            icon={<Target className="w-5 h-5 text-amber-600" />}
            value={aiResult?.prediction}
            accentColor="amber"
          />

          {/* Prediction Explanation */}
          <ResultCard
            title="Prediction Explanation"
            icon={<BookOpen className="w-5 h-5 text-green-600" />}
            value={aiResult?.prediction_explanation}
            accentColor="green"
          />

          {/* Optimized Ebo */}
          <ResultCard
            title="Optimized Ebo Recommendation"
            icon={<Sparkles className="w-5 h-5 text-rose-600" />}
            value={aiResult?.optimal_ebo}
            accentColor="rose"
          />

          {/* Semantic Graph Snapshot */}
          <ResultCard
            title="Semantic Graph Snapshot"
            icon={<Brain className="w-5 h-5 text-teal-600" />}
            value={aiResult?.semantic_graph}
            accentColor="teal"
          />

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={resetForm}
            >
              New AI Consultation
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setScreen('landing')}
            >
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Helper Component ────────────────────────────────────────────────────────

function ResultCard({
  title,
  icon,
  value,
  accentColor,
}: {
  title: string;
  icon: React.ReactNode;
  value: unknown;
  accentColor: string;
}) {
  const borderColorMap: Record<string, string> = {
    indigo: 'border-indigo-100',
    purple: 'border-purple-100',
    amber: 'border-amber-100',
    green: 'border-green-100',
    rose: 'border-rose-100',
    teal: 'border-teal-100',
  };

  const bgColorMap: Record<string, string> = {
    indigo: 'bg-indigo-50',
    purple: 'bg-purple-50',
    amber: 'bg-amber-50',
    green: 'bg-green-50',
    rose: 'bg-rose-50',
    teal: 'bg-teal-50',
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
    <Card className={`${borderColorMap[accentColor] || 'border-gray-100'} shadow-sm`}>
      <CardHeader className={`pb-2 ${bgColorMap[accentColor] || 'bg-gray-50'} rounded-t-lg`}>
        <CardTitle className="text-base flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {isJson ? (
          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono bg-gray-50 p-3 rounded-md overflow-x-auto">
            {displayValue}
          </pre>
        ) : (
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {displayValue}
          </p>
        )}
      </CardContent>
    </Card>
  );
}