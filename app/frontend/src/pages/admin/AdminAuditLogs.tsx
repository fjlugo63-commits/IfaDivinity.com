import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollText, Search, X } from 'lucide-react';
import { supabase, TABLES } from '@/lib/supabase';
import { toast } from 'sonner';

interface AuditLogEntry {
  id: string;
  actor_id: string;
  action: string;
  entity: string;
  entity_id: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

const ENTITY_TYPES = ['all', 'consultation_record', 'rule_change_proposal', 'rule_version', 'consult_engine_config', 'house_profile', 'awo_profile'];

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actorFilter, setActorFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('all');
  const [entityIdFilter, setEntityIdFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from(TABLES.audit_log)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (actorFilter.trim()) {
        query = query.eq('actor_id', actorFilter.trim());
      }
      if (entityFilter !== 'all') {
        query = query.eq('entity', entityFilter);
      }
      if (entityIdFilter.trim()) {
        query = query.eq('entity_id', entityIdFilter.trim());
      }

      const { data, error } = await query;
      if (error) throw error;
      setLogs(data || []);
    } catch (err: unknown) {
      toast.error('Failed to load audit logs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [actorFilter, entityFilter, entityIdFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const clearFilters = () => {
    setActorFilter('');
    setEntityFilter('all');
    setEntityIdFilter('');
  };

  const hasFilters = actorFilter || entityFilter !== 'all' || entityIdFilter;

  const actionColor = (action: string) => {
    if (action.includes('create') || action.includes('insert')) return 'bg-green-100 text-green-700';
    if (action.includes('update') || action.includes('approve') || action.includes('activate')) return 'bg-blue-100 text-blue-700';
    if (action.includes('delete') || action.includes('reject')) return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ScrollText className="w-6 h-6 text-indigo-600" />
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[180px]">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Actor ID</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
                <Input
                  className="pl-8"
                  placeholder="Filter by actor UUID..."
                  value={actorFilter}
                  onChange={(e) => setActorFilter(e.target.value)}
                />
              </div>
            </div>
            <div className="min-w-[180px]">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Entity Type</label>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ENTITY_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t === 'all' ? 'All Entities' : t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Entity ID</label>
              <Input
                placeholder="Filter by entity UUID..."
                value={entityIdFilter}
                onChange={(e) => setEntityIdFilter(e.target.value)}
              />
            </div>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-gray-500">
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            No audit logs found matching the current filters.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-gray-500">{logs.length} entries</p>
          {logs.map((log) => (
            <Card
              key={log.id}
              className="hover:shadow-sm transition-shadow cursor-pointer"
              onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
            >
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge className={actionColor(log.action)}>{log.action}</Badge>
                    <span className="text-sm font-medium">{log.entity}</span>
                    <span className="text-xs text-gray-400 font-mono">{log.entity_id.slice(0, 8)}...</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 font-mono">{log.actor_id.slice(0, 8)}...</span>
                    <span className="text-xs text-gray-500">{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                </div>
                {expandedId === log.id && log.metadata && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-md">
                    <pre className="text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(log.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}