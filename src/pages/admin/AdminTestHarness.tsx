import { useState, useEffect } from 'react';
import { supabase, TABLES } from '@/lib/supabase';
import { createOpeleConsultation, getConsultation, ConsultationResult } from '@/lib/api/consultApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Play,
  Eye,
  FileText,
  Shield,
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ClipboardCopy,
} from 'lucide-react';

interface AwoProfile {
  id: string;
  user_id: string;
}

interface HouseProfile {
  id: string;
  name: string;
}

interface ConsultationRecord {
  id: string;
  raw_bits: string;
  mapped_bits: string | null;
  pattern_key: string | null;
  pattern_index: number | null;
  main_odu: string | null;
  ire_or_osogbo: string | null;
  subtype: string | null;
  orisha_owner: string | null;
  recommended_ebo: string | null;
  rule_version_id: string | null;
  created_at: string;
}

interface AuditLogEntry {
  id: string;
  actor_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface RuleVersion {
  id: string;
  version_number: number;
  status: string;
  created_by: string | null;
  approved_by: string | null;
  updated_at: string;
}

// ─── Tab 1: Test Harness Dashboard ───────────────────────────────────────────

function TestHarnessDashboard() {
  const [rawBits, setRawBits] = useState('');
  const [awoId, setAwoId] = useState('');
  const [houseId, setHouseId] = useState('');
  const [awos, setAwos] = useState<AwoProfile[]>([]);
  const [houses, setHouses] = useState<HouseProfile[]>([]);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ConsultationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSelects();
  }, []);

  async function loadSelects() {
    const [awosRes, housesRes] = await Promise.all([
      supabase.from(TABLES.awo_profile).select('id, user_id'),
      supabase.from(TABLES.house_profile).select('id, name'),
    ]);
    if (awosRes.data) setAwos(awosRes.data);
    if (housesRes.data) setHouses(housesRes.data);
  }

  async function handleRunConsultation() {
    if (!rawBits || !awoId || !houseId) {
      toast.error('All fields are required');
      return;
    }
    if (!/^[01]{8}$/.test(rawBits)) {
      toast.error('Raw bits must be an 8-character binary string (0s and 1s)');
      return;
    }

    setRunning(true);
    setResult(null);
    setError(null);

    try {
      const res = await createOpeleConsultation({
        raw_bits: rawBits,
        awo_id: awoId,
        house_id: houseId,
      });
      setResult(res);
      toast.success('Consultation completed successfully');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      toast.error(`Consultation failed: ${msg}`);
    } finally {
      setRunning(false);
    }
  }

  function copyResultToClipboard() {
    if (result) {
      navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      toast.success('Result copied to clipboard');
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="w-5 h-5 text-indigo-600" />
            Run Consultation
          </CardTitle>
          <CardDescription>
            Input raw Opele bits, select Awo and House, then run the full consultation engine pipeline.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="raw_bits">Raw Opele Bits (8-bit string)</Label>
              <Input
                id="raw_bits"
                placeholder="e.g. 11001010"
                value={rawBits}
                onChange={(e) => setRawBits(e.target.value)}
                maxLength={8}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                8 binary digits representing the Opele cast
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="awo_id">Awo</Label>
              <Select value={awoId} onValueChange={setAwoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Awo..." />
                </SelectTrigger>
                <SelectContent>
                  {awos.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.user_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="house_id">House</Label>
              <Select value={houseId} onValueChange={setHouseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select House..." />
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
          </div>

          <Button
            onClick={handleRunConsultation}
            disabled={running || !rawBits || !awoId || !houseId}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {running ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Run Consultation
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-700">
              <XCircle className="w-5 h-5" />
              <span className="font-medium">Error:</span>
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle2 className="w-5 h-5" />
                Consultation Result
              </div>
              <Button variant="ghost" size="sm" onClick={copyResultToClipboard}>
                <ClipboardCopy className="w-4 h-4 mr-1" />
                Copy
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <OutputField label="Record ID" value={result.consultation_record_id || '—'} />
              <OutputField label="Main Odu" value={result.main_odu} highlight />
              <OutputField label="Ire / Osogbo" value={result.ire_or_osogbo} highlight />
              <OutputField label="Subtype" value={result.subtype} />
              <OutputField label="Orisha Owner" value={result.orisha_owner} />
              <OutputField label="Recommended Ebo" value={result.recommended_ebo || '—'} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function OutputField({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-medium ${highlight ? 'text-indigo-700' : 'text-gray-900'}`}>
        {value}
      </p>
    </div>
  );
}

// ─── Tab 2: Record Viewer ────────────────────────────────────────────────────

function TestHarnessRecordViewer() {
  const [recordId, setRecordId] = useState('');
  const [record, setRecord] = useState<ConsultationRecord | null>(null);
  const [rendered, setRendered] = useState<ConsultationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [renderLoading, setRenderLoading] = useState(false);

  async function handleFetchRecord() {
    if (!recordId.trim()) {
      toast.error('Enter a consultation record ID');
      return;
    }
    setLoading(true);
    setRecord(null);
    setRendered(null);

    const { data, error } = await supabase
      .from(TABLES.consultation_record)
      .select('*')
      .eq('id', recordId.trim())
      .single();

    if (error || !data) {
      toast.error('Record not found');
      setLoading(false);
      return;
    }

    setRecord(data as ConsultationRecord);
    setLoading(false);
  }

  async function handleRenderOutput() {
    if (!record) return;
    setRenderLoading(true);

    try {
      const res = await getConsultation(record.id);
      setRendered(res);
      toast.success('Render complete');
    } catch {
      toast.error('Render failed');
    } finally {
      setRenderLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-indigo-600" />
            Consultation Record Viewer
          </CardTitle>
          <CardDescription>
            Enter a consultation record ID to view its full data and rendered output.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Input
              placeholder="Consultation Record ID (UUID)"
              value={recordId}
              onChange={(e) => setRecordId(e.target.value)}
              className="font-mono flex-1"
            />
            <Button onClick={handleFetchRecord} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4 mr-1" />}
              Fetch
            </Button>
          </div>
        </CardContent>
      </Card>

      {record && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Raw Record Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <RecordField label="ID" value={record.id} mono />
              <RecordField label="Raw Bits" value={record.raw_bits} mono />
              <RecordField label="Mapped Bits" value={record.mapped_bits || '—'} mono />
              <RecordField label="Pattern Key" value={record.pattern_key || '—'} mono />
              <RecordField label="Pattern Index" value={record.pattern_index?.toString() || '—'} />
              <RecordField label="Main Odu" value={record.main_odu || '—'} />
              <RecordField label="Ire / Osogbo" value={record.ire_or_osogbo || '—'} />
              <RecordField label="Subtype" value={record.subtype || '—'} />
              <RecordField label="Orisha Owner" value={record.orisha_owner || '—'} />
              <RecordField label="Recommended Ebo" value={record.recommended_ebo || '—'} />
              <RecordField label="Rule Version ID" value={record.rule_version_id || '—'} mono />
              <RecordField label="Created At" value={new Date(record.created_at).toLocaleString()} />
            </div>

            <Separator className="my-4" />

            <Button
              onClick={handleRenderOutput}
              disabled={renderLoading}
              variant="outline"
            >
              {renderLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Render Output
            </Button>
          </CardContent>
        </Card>
      )}

      {rendered && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="text-base text-blue-700">Rendered Output</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <OutputField label="Rendered Odu" value={rendered.main_odu} highlight />
              <OutputField label="Rendered Ire/Osogbo" value={rendered.ire_or_osogbo} highlight />
              <OutputField label="Rendered Subtype" value={rendered.subtype} />
              <OutputField label="Rendered Orisha Owner" value={rendered.orisha_owner} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RecordField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={`text-sm ${mono ? 'font-mono' : ''} text-gray-900 break-all`}>{value}</p>
    </div>
  );
}

// ─── Tab 3: Audit Viewer ─────────────────────────────────────────────────────

function TestHarnessAuditViewer() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [actorFilter, setActorFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [entityIdFilter, setEntityIdFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function loadAuditLogs() {
    setLoading(true);
    let query = supabase
      .from(TABLES.audit_log)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (actorFilter.trim()) query = query.eq('actor_id', actorFilter.trim());
    if (entityFilter.trim()) query = query.eq('entity', entityFilter.trim());
    if (entityIdFilter.trim()) query = query.eq('entity_id', entityIdFilter.trim());

    const { data, error } = await query;
    if (error) {
      toast.error('Failed to load audit logs');
    } else {
      setEntries((data || []) as AuditLogEntry[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadAuditLogs();
  }, []);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            Audit Logs (Test Consultations)
          </CardTitle>
          <CardDescription>
            Filter audit logs by actor, entity type, or entity ID to trace test consultation activity.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              placeholder="Filter by Actor ID"
              value={actorFilter}
              onChange={(e) => setActorFilter(e.target.value)}
              className="font-mono text-sm"
            />
            <Input
              placeholder="Filter by Entity (e.g. consultation_record)"
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="text-sm"
            />
            <Input
              placeholder="Filter by Entity ID"
              value={entityIdFilter}
              onChange={(e) => setEntityIdFilter(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
          <Button onClick={loadAuditLogs} disabled={loading} variant="outline" size="sm">
            {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
            Apply Filters
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No audit log entries found.
            </p>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="border rounded-lg p-3 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {entry.action}
                      </Badge>
                      <span className="text-sm text-gray-700">{entry.entity}</span>
                      {entry.entity_id && (
                        <span className="text-xs font-mono text-muted-foreground">
                          {entry.entity_id.slice(0, 8)}...
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(entry.created_at).toLocaleString()}
                    </span>
                  </div>

                  {entry.actor_id && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Actor: <span className="font-mono">{entry.actor_id.slice(0, 12)}...</span>
                    </p>
                  )}

                  {expandedId === entry.id && entry.metadata && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Metadata:</p>
                      <pre className="text-xs bg-slate-100 p-2 rounded overflow-x-auto max-h-40">
                        {JSON.stringify(entry.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab 4: Rule Version Viewer ──────────────────────────────────────────────

function TestHarnessRuleVersionViewer() {
  const [versions, setVersions] = useState<RuleVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    loadVersions();
  }, []);

  async function loadVersions() {
    setLoading(true);
    const { data, error } = await supabase
      .from(TABLES.rule_version)
      .select('*')
      .order('version_number', { ascending: false });

    if (error) {
      toast.error('Failed to load rule versions');
    } else {
      setVersions((data || []) as RuleVersion[]);
    }
    setLoading(false);
  }

  async function handleView(id: string) {
    if (selectedId === id) {
      setSelectedId(null);
      setSelectedDetail(null);
      return;
    }
    const { data } = await supabase
      .from(TABLES.rule_version)
      .select('*')
      .eq('id', id)
      .single();

    setSelectedId(id);
    setSelectedDetail(data as Record<string, unknown> | null);
  }

  function statusColor(status: string) {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700 border-green-300';
      case 'draft': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'archived': return 'bg-gray-100 text-gray-600 border-gray-300';
      default: return 'bg-gray-100 text-gray-600 border-gray-300';
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600" />
            Rule Versions
          </CardTitle>
          <CardDescription>
            View rule versions used during test consultations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={loadVersions} disabled={loading} variant="outline" size="sm" className="mb-4">
            {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
            Refresh
          </Button>

          {versions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No rule versions found.
            </p>
          ) : (
            <div className="space-y-2">
              {versions.map((v) => (
                <div key={v.id} className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-gray-900">v{v.version_number}</span>
                      <Badge variant="outline" className={`text-xs ${statusColor(v.status)}`}>
                        {v.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {new Date(v.updated_at).toLocaleDateString()}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleView(v.id)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                    {v.created_by && (
                      <span>Created by: <span className="font-mono">{v.created_by.slice(0, 8)}...</span></span>
                    )}
                    {v.approved_by && (
                      <span>Approved by: <span className="font-mono">{v.approved_by.slice(0, 8)}...</span></span>
                    )}
                  </div>

                  {selectedId === v.id && selectedDetail && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Full Record:</p>
                      <pre className="text-xs bg-slate-100 p-2 rounded overflow-x-auto max-h-60">
                        {JSON.stringify(selectedDetail, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AdminTestHarness() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Integration Test Harness</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Internal tool for validating the full Opele consultation pipeline end-to-end.
        </p>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="dashboard" className="flex items-center gap-1.5">
            <Play className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="record" className="flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Record</span>
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Audit</span>
          </TabsTrigger>
          <TabsTrigger value="rules" className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Rules</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <TestHarnessDashboard />
        </TabsContent>

        <TabsContent value="record">
          <TestHarnessRecordViewer />
        </TabsContent>

        <TabsContent value="audit">
          <TestHarnessAuditViewer />
        </TabsContent>

        <TabsContent value="rules">
          <TestHarnessRuleVersionViewer />
        </TabsContent>
      </Tabs>
    </div>
  );
}