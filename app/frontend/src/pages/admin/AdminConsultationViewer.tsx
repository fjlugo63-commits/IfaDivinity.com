import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Eye, RefreshCw, FileText } from 'lucide-react';
import { supabase, TABLES } from '@/lib/supabase';
import { toast } from 'sonner';

interface ConsultationRecord {
  id: string;
  awo_id: string;
  house_id: string;
  raw_bits: number[] | null;
  mapped_bits: number[] | null;
  pattern_key: string | null;
  pattern_index: number | null;
  main_odu: string | null;
  ire_or_osogbo: string | null;
  subtype: string | null;
  orisha_owner: string | null;
  recommended_ebo: string | null;
  rule_version_id: string | null;
  notes: string | null;
  created_at: string;
}

export default function AdminConsultationViewer() {
  const [records, setRecords] = useState<ConsultationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ConsultationRecord | null>(null);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from(TABLES.consultation_record)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      setRecords(data || []);
    } catch (err: unknown) {
      toast.error('Failed to load consultation records');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const handleRefreshRender = async (record: ConsultationRecord) => {
    // Trigger a re-render by re-fetching the record
    try {
      const { data, error } = await supabase
        .from(TABLES.consultation_record)
        .select('*')
        .eq('id', record.id)
        .single();
      if (error) throw error;
      setSelected(data);
      toast.success('Consultation data refreshed');
    } catch (err: unknown) {
      toast.error('Failed to refresh');
      console.error(err);
    }
  };

  if (selected) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSelected(null)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Consultation Detail</h1>
          <Button variant="outline" size="sm" onClick={() => handleRefreshRender(selected)}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Core Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Core Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow label="ID" value={selected.id} />
              <InfoRow label="Awo ID" value={selected.awo_id} />
              <InfoRow label="House ID" value={selected.house_id} />
              <InfoRow label="Created" value={new Date(selected.created_at).toLocaleString()} />
              <InfoRow label="Rule Version" value={selected.rule_version_id || 'N/A'} />
            </CardContent>
          </Card>

          {/* Odu & Pattern */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Odu & Pattern</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow label="Main Odu" value={selected.main_odu || 'Not determined'} />
              <InfoRow label="Pattern Key" value={selected.pattern_key || 'N/A'} />
              <InfoRow label="Pattern Index" value={selected.pattern_index?.toString() || 'N/A'} />
              <InfoRow label="Raw Bits" value={selected.raw_bits?.join(', ') || 'N/A'} />
              <InfoRow label="Mapped Bits" value={selected.mapped_bits?.join(', ') || 'N/A'} />
            </CardContent>
          </Card>

          {/* Outcome */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Outcome</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow label="Ire or Osogbo" value={selected.ire_or_osogbo || 'Not determined'} />
              <InfoRow label="Subtype" value={selected.subtype || 'N/A'} />
              <InfoRow label="Orisha Owner" value={selected.orisha_owner || 'N/A'} />
              <InfoRow label="Recommended Ebo" value={selected.recommended_ebo || 'N/A'} />
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {selected.notes || 'No notes recorded.'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="w-6 h-6 text-indigo-600" />
        <h1 className="text-2xl font-bold text-gray-900">Consultation Records</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : records.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            No consultation records found.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {records.map((r) => (
            <Card key={r.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelected(r)}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-medium text-sm">{r.main_odu || 'Pending'}</p>
                      <p className="text-xs text-gray-500">
                        Awo: {r.awo_id.slice(0, 8)}... | House: {r.house_id.slice(0, 8)}...
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {r.ire_or_osogbo && (
                      <Badge className={r.ire_or_osogbo === 'ire' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                        {r.ire_or_osogbo}
                      </Badge>
                    )}
                    <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString()}</span>
                    <Button variant="ghost" size="icon">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start">
      <span className="text-sm font-medium text-gray-500">{label}</span>
      <span className="text-sm text-gray-900 text-right max-w-[60%] break-all">{value}</span>
    </div>
  );
}