import { useState, useEffect } from 'react';
import { supabase, TABLES } from '@/lib/supabase';
import { createOpeleConsultation, ConsultationResult } from '@/lib/api/consultApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Sparkles,
  ArrowRight,
  Loader2,
  RotateCcw,
  Sun,
  Moon,
  Star,
  Shell,
} from 'lucide-react';

interface HouseProfile {
  id: string;
  name: string;
}

type Step = 'landing' | 'form' | 'result';

export default function PublicConsultation() {
  const [step, setStep] = useState<Step>('landing');
  const [houses, setHouses] = useState<HouseProfile[]>([]);
  const [houseId, setHouseId] = useState('');
  const [rawBits, setRawBits] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ConsultationResult | null>(null);

  useEffect(() => {
    loadHouses();
  }, []);

  async function loadHouses() {
    const { data } = await supabase
      .from(TABLES.house_profile)
      .select('id, name');
    if (data) setHouses(data);
  }

  async function handleConsult() {
    if (!houseId) {
      toast.error('Please select a house');
      return;
    }
    if (!/^[01]{8}$/.test(rawBits)) {
      toast.error('Opele cast must be an 8-character binary string (0s and 1s)');
      return;
    }

    setLoading(true);
    try {
      const res = await createOpeleConsultation({
        raw_bits: rawBits,
        awo_id: '', // public consultation — no specific Awo
        house_id: houseId,
      });
      setResult(res);
      setStep('result');
      toast.success('Consultation complete');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Consultation failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  function handleStartOver() {
    setResult(null);
    setRawBits('');
    setStep('form');
  }

  // ─── Landing ─────────────────────────────────────────────────────────────────

  if (step === 'landing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center p-4">
        <div className="max-w-lg w-full text-center space-y-8">
          {/* Decorative icon */}
          <div className="flex justify-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center shadow-xl">
              <Shell className="w-12 h-12 text-white" />
            </div>
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
              Opele Consultation
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed max-w-md mx-auto">
              Receive guidance through the sacred Opele divination system. Select your house and initiate a consultation.
            </p>
          </div>

          {/* Decorative divider */}
          <div className="flex items-center justify-center gap-3">
            <div className="h-px w-12 bg-amber-300" />
            <Star className="w-4 h-4 text-amber-500" />
            <div className="h-px w-12 bg-amber-300" />
          </div>

          <Button
            onClick={() => setStep('form')}
            size="lg"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all"
          >
            Begin Consultation
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>

          <p className="text-xs text-muted-foreground">
            No account required • Results are private
          </p>
        </div>
      </div>
    );
  }

  // ─── Form ────────────────────────────────────────────────────────────────────

  if (step === 'form') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center shadow-lg">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Consult Ifa</h1>
            <p className="text-sm text-muted-foreground">
              Enter your Opele cast and select a house to receive your reading.
            </p>
          </div>

          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="text-lg">Consultation Details</CardTitle>
              <CardDescription>
                Provide the 8-bit Opele cast pattern and choose your house tradition.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="house_id">Select House</Label>
                <Select value={houseId} onValueChange={setHouseId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a house..." />
                  </SelectTrigger>
                  <SelectContent>
                    {houses.map((h) => (
                      <SelectItem key={h.id} value={h.id}>
                        {h.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="raw_bits">Opele Cast (8-bit)</Label>
                <Input
                  id="raw_bits"
                  placeholder="e.g., 10100110"
                  value={rawBits}
                  onChange={(e) => setRawBits(e.target.value.replace(/[^01]/g, '').slice(0, 8))}
                  maxLength={8}
                  className="font-mono text-lg tracking-widest text-center"
                />
                <p className="text-xs text-muted-foreground">
                  Enter 8 binary digits (0 or 1) representing the Opele cast pattern.
                </p>

                {/* Visual bit representation */}
                {rawBits.length > 0 && (
                  <div className="flex justify-center gap-1.5 pt-2">
                    {rawBits.split('').map((bit, i) => (
                      <div
                        key={i}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          bit === '1'
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'bg-gray-200 text-gray-500'
                        }`}
                      >
                        {bit}
                      </div>
                    ))}
                    {Array.from({ length: 8 - rawBits.length }).map((_, i) => (
                      <div
                        key={`empty-${i}`}
                        className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-xs text-gray-300"
                      >
                        ?
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button
                onClick={handleConsult}
                disabled={loading || !houseId || rawBits.length !== 8}
                className="w-full bg-indigo-600 hover:bg-indigo-700 py-5 text-base"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Consulting Ifa...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Consult Ifa
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <div className="text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep('landing')}
              className="text-muted-foreground"
            >
              ← Back to introduction
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Result ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
              <Sun className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Your Reading</h1>
          <p className="text-sm text-muted-foreground">
            The Ifa oracle has spoken. Here is your consultation result.
          </p>
        </div>

        <Card className="shadow-lg border-0 overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-amber-500" />
          <CardContent className="pt-6 space-y-5">
            {result && (
              <>
                {/* Main Odu - Featured */}
                <div className="text-center p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100">
                  <p className="text-xs font-medium text-indigo-600 uppercase tracking-wider mb-1">Main Odu</p>
                  <p className="text-2xl font-bold text-indigo-900">{result.main_odu}</p>
                </div>

                {/* Ire / Osogbo */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100">
                  <div className="flex items-center gap-2 mb-1">
                    {result.ire_or_osogbo?.toLowerCase().includes('ire') ? (
                      <Sun className="w-4 h-4 text-amber-600" />
                    ) : (
                      <Moon className="w-4 h-4 text-slate-600" />
                    )}
                    <p className="text-xs font-medium text-amber-700 uppercase tracking-wider">Ire / Osogbo</p>
                  </div>
                  <p className="text-lg font-semibold text-gray-900">{result.ire_or_osogbo}</p>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-2 gap-3">
                  <ResultField label="Subtype" value={result.subtype} />
                  <ResultField label="Orisha Owner" value={result.orisha_owner} />
                </div>

                {/* Recommended Ebo */}
                {result.recommended_ebo && (
                  <div className="p-4 rounded-xl bg-green-50 border border-green-100">
                    <p className="text-xs font-medium text-green-700 uppercase tracking-wider mb-1">Recommended Ebo</p>
                    <p className="text-sm font-medium text-gray-900">{result.recommended_ebo}</p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <div className="text-center">
          <Button
            onClick={handleStartOver}
            variant="outline"
            size="lg"
            className="px-8"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            New Consultation
          </Button>
        </div>
      </div>
    </div>
  );
}

function ResultField({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-gray-900">{value || '—'}</p>
    </div>
  );
}