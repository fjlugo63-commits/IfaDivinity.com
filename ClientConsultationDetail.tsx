import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, isSupabaseConfigured, TABLES } from '@/lib/supabase';
import { logEngineAudit } from '@/lib/engineAuditLogger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Home,
  MessageSquare,
  FileText,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Shield,
  BookOpen,
} from 'lucide-react';

interface ConsultationData {
  id: string;
  request_id: string;
  service_type: string;
  status: string;
  house_id: string;
  awo_id: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  preferred_date: string;
  preferred_time: string;
  client_notes: string | null;
  // Consultation results (from engine)
  cast1: string | null;
  cast2: string | null;
  cast3: string | null;
  cast4: string | null;
  main_odu: string | null;
  interpretation_json: Record<string, unknown> | null;
  ebo: string | null;
  remedies: string | null;
  warnings: string | null;
  orisha_owner: string | null;
  consultation_id: string | null;
}

const SERVICE_LABELS: Record<string, string> = {
  opele: 'Opele (Chain Divination)',
  ikin: 'Ikín (Sacred Palm Nuts)',
  general_reading: 'General Reading',
};

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending_awo_review: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pending Review' },
  awaiting_awo_acceptance: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Awaiting Acceptance' },
  awaiting_client_confirmation: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Awaiting Confirmation' },
  scheduled: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Scheduled' },
  completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Completed' },
  declined: { bg: 'bg-red-100', text: 'text-red-700', label: 'Declined' },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Cancelled' },
};

export default function ClientConsultationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [consultation, setConsultation] = useState<ConsultationData | null>(null);
  const [houseName, setHouseName] = useState('');
  const [awoName, setAwoName] = useState('');
  const [auditLogs, setAuditLogs] = useState<Array<{ event_type: string; description: string; created_at: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [jsonOpen, setJsonOpen] = useState(false);

  useEffect(() => {
    loadConsultation();
  }, [id, user]);

  async function loadConsultation() {
    if (!id || !user) {
      setLoading(false);
      return;
    }

    if (!isSupabaseConfigured) {
      setConsultation({
        id,
        request_id: id,
        service_type: 'opele',
        status: 'completed',
        house_id: 'h1',
        awo_id: 'a1',
        scheduled_date: '2024-03-15',
        scheduled_time: 'morning',
        preferred_date: '2024-03-14',
        preferred_time: 'morning',
        client_notes: 'Seeking guidance on career transition.',
        cast1: '||  |  ||  |',
        cast2: '|  ||  |  ||',
        cast3: '||  ||  |  |',
        cast4: '|  |  ||  ||',
        main_odu: 'Irosun Meji',
        interpretation_json: {
          primary_message: 'A time of transformation and new beginnings.',
          guidance: 'Focus on inner wisdom and patience.',
          spiritual_direction: 'Consult with Orunmila for deeper clarity.',
        },
        ebo: 'Offer white cloth, cool water, and shea butter to Obatala.',
        remedies: 'Bathe with ewé rinrin (cooling leaves) for 7 days.',
        warnings: 'Avoid hasty decisions in the next lunar cycle.',
        orisha_owner: 'Obatala',
        consultation_id: 'consult-001',
      });
      setHouseName('House of Orunmila');
      setAwoName('Baba Ifasegun');
      setAuditLogs([
        { event_type: 'client_requested_consultation', description: 'Client submitted consultation request', created_at: '2024-03-10T10:00:00Z' },
        { event_type: 'client_paid_for_consultation', description: 'Payment received', created_at: '2024-03-10T10:05:00Z' },
        { event_type: 'awo_accepted_consultation', description: 'Awo accepted the request', created_at: '2024-03-11T08:00:00Z' },
        { event_type: 'consultation_scheduled', description: 'Consultation scheduled for Mar 15', created_at: '2024-03-11T08:01:00Z' },
        { event_type: 'consultation_completed', description: 'Consultation completed', created_at: '2024-03-15T12:00:00Z' },
      ]);
      setLoading(false);
      return;
    }

    try {
      // First try to load from consultation_requests
      const { data: request, error } = await supabase
        .from(TABLES.consultation_requests)
        .select('*')
        .eq('id', id)
        .single();

      if (error || !request) {
        toast.error('Consultation not found');
        navigate('/client/consultations');
        return;
      }

      // Try to load linked consultation record if completed
      let consultRecord: Record<string, unknown> | null = null;
      if (request.consultation_id) {
        const { data } = await supabase
          .from(TABLES.engine_consultation_records)
          .select('*')
          .eq('id', request.consultation_id)
          .single();
        consultRecord = data;
      }

      setConsultation({
        id: request.id,
        request_id: request.id,
        service_type: request.service_type,
        status: request.status,
        house_id: request.house_id,
        awo_id: request.awo_id,
        scheduled_date: request.scheduled_date,
        scheduled_time: request.scheduled_time,
        preferred_date: request.preferred_date,
        preferred_time: request.preferred_time,
        client_notes: request.client_notes,
        cast1: (consultRecord?.cast1 as string) || null,
        cast2: (consultRecord?.cast2 as string) || null,
        cast3: (consultRecord?.cast3 as string) || null,
        cast4: (consultRecord?.cast4 as string) || null,
        main_odu: (consultRecord?.main_odu as string) || null,
        interpretation_json: (consultRecord?.interpretation_json as Record<string, unknown>) || null,
        ebo: (consultRecord?.recommended_ebo as string) || null,
        remedies: (consultRecord?.remedies as string) || null,
        warnings: (consultRecord?.warnings as string) || null,
        orisha_owner: (consultRecord?.orisha_owner as string) || null,
        consultation_id: request.consultation_id,
      });

      // Fetch house name
      if (request.house_id) {
        const { data: house } = await supabase
          .from(TABLES.engine_houses)
          .select('name')
          .eq('id', request.house_id)
          .single();
        if (house) setHouseName(house.name);
      }

      // Fetch awo name
      if (request.awo_id) {
        const { data: awo } = await supabase
          .from(TABLES.engine_awos)
          .select('awo_name')
          .eq('id', request.awo_id)
          .single();
        if (awo) setAwoName(awo.awo_name);
      }

      // Fetch audit logs for this request
      const { data: logs } = await supabase
        .from(TABLES.engine_audit_logs)
        .select('event_type, description, created_at')
        .or(`entity_id.eq.${id},metadata_json->>request_id.eq.${id}`)
        .order('created_at', { ascending: true })
        .limit(20);

      if (logs) setAuditLogs(logs);

      // Log view event
      await logEngineAudit({
        event_type: 'client_viewed_consultation',
        service_category: 'client',
        entity_type: 'consultation_requests',
        entity_id: id,
        description: `Client viewed consultation ${id}`,
        metadata: { request_id: id, consultation_id: request.consultation_id },
      });
    } catch (err) {
      console.error('Error loading consultation:', err);
      toast.error('Failed to load consultation');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!consultation) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-gray-900">Consultation Not Found</h2>
        <Button className="mt-4" onClick={() => navigate('/client/consultations')}>
          Back to Consultations
        </Button>
      </div>
    );
  }

  const statusStyle = STATUS_STYLES[consultation.status] || STATUS_STYLES.pending_awo_review;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/client/consultations')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900 font-[Rubik]">Consultation Details</h1>
          <p className="text-sm text-gray-500">{SERVICE_LABELS[consultation.service_type] || consultation.service_type}</p>
        </div>
        <Badge className={`${statusStyle.bg} ${statusStyle.text} hover:${statusStyle.bg}`}>
          {statusStyle.label}
        </Badge>
      </div>

      {/* Summary Card */}
      <Card className="rounded-2xl border-0 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-[Rubik]">Consultation Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {houseName && (
            <div className="flex items-center gap-2 text-sm">
              <Home className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">House:</span>
              <span className="font-medium">{houseName}</span>
            </div>
          )}
          {awoName && (
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">Awo:</span>
              <span className="font-medium">{awoName}</span>
            </div>
          )}
          {consultation.scheduled_date && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">Scheduled:</span>
              <span className="font-medium">
                {new Date(consultation.scheduled_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                {consultation.scheduled_time && ` — ${consultation.scheduled_time}`}
              </span>
            </div>
          )}
          {!consultation.scheduled_date && consultation.preferred_date && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">Preferred:</span>
              <span className="font-medium">
                {new Date(consultation.preferred_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                {` — ${consultation.preferred_time}`}
              </span>
            </div>
          )}
          {consultation.client_notes && (
            <div className="pt-2">
              <p className="text-xs text-gray-500 mb-1">Your Notes</p>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{consultation.client_notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cast Results (only if completed) */}
      {consultation.status === 'completed' && consultation.main_odu && (
        <Card className="rounded-2xl border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-[Rubik] flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Divination Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Main Odu */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4">
              <p className="text-xs text-amber-600 font-medium mb-1">Main Odu</p>
              <p className="text-lg font-bold text-gray-900 font-[Rubik]">{consultation.main_odu}</p>
              {consultation.orisha_owner && (
                <p className="text-sm text-gray-600 mt-1">Orisha Owner: <span className="font-medium">{consultation.orisha_owner}</span></p>
              )}
            </div>

            {/* Cast Results */}
            {(consultation.cast1 || consultation.cast2 || consultation.cast3 || consultation.cast4) && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[consultation.cast1, consultation.cast2, consultation.cast3, consultation.cast4].map((cast, i) => (
                  cast && (
                    <div key={i} className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-500 mb-1">Cast {i + 1}</p>
                      <p className="text-sm font-mono font-medium text-gray-900">{cast}</p>
                    </div>
                  )
                ))}
              </div>
            )}

            <Separator />

            {/* Ebo */}
            {consultation.ebo && (
              <div>
                <p className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-2">
                  <BookOpen className="h-4 w-4 text-indigo-500" />
                  Ebo (Offering)
                </p>
                <p className="text-sm text-gray-700 bg-indigo-50 rounded-lg p-3">{consultation.ebo}</p>
              </div>
            )}

            {/* Remedies */}
            {consultation.remedies && (
              <div>
                <p className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-green-500" />
                  Remedies
                </p>
                <p className="text-sm text-gray-700 bg-green-50 rounded-lg p-3">{consultation.remedies}</p>
              </div>
            )}

            {/* Warnings */}
            {consultation.warnings && (
              <div>
                <p className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  Warnings
                </p>
                <p className="text-sm text-gray-700 bg-red-50 rounded-lg p-3">{consultation.warnings}</p>
              </div>
            )}

            {/* Full Interpretation JSON (collapsible) */}
            {consultation.interpretation_json && (
              <Collapsible open={jsonOpen} onOpenChange={setJsonOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Full Interpretation Details
                    </span>
                    {jsonOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <pre className="text-xs bg-gray-900 text-green-300 rounded-lg p-4 overflow-auto max-h-64 mt-2">
                    {JSON.stringify(consultation.interpretation_json, null, 2)}
                  </pre>
                </CollapsibleContent>
              </Collapsible>
            )}
          </CardContent>
        </Card>
      )}

      {/* Messaging Link */}
      {(consultation.status === 'scheduled' || consultation.status === 'completed') && (
        <Card className="rounded-2xl border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => navigate(`/client/messages/${consultation.id}`)}>
          <CardContent className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Messages</p>
                <p className="text-xs text-gray-500">Communicate with your Awo</p>
              </div>
            </div>
            <ChevronDown className="h-4 w-4 text-gray-400 -rotate-90" />
          </CardContent>
        </Card>
      )}

      {/* Audit Log */}
      {auditLogs.length > 0 && (
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-[Rubik]">Activity Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {auditLogs.map((log, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-indigo-400 mt-2 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700">{log.description || log.event_type.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment action for pending requests */}
      {consultation.status === 'pending_awo_review' && (
        <Button
          className="w-full h-11 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white"
          onClick={() => navigate(`/client/checkout/${consultation.id}`)}
        >
          Proceed to Payment
        </Button>
      )}
    </div>
  );
}