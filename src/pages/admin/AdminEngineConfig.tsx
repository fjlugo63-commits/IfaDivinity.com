import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Settings2, Save, Pencil } from 'lucide-react';
import { supabase, TABLES } from '@/lib/supabase';
import { toast } from 'sonner';

interface EngineConfig {
  id: string;
  house_id: string;
  active_rule_version_id: string | null;
  engine_flags: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export default function AdminEngineConfig() {
  const [configs, setConfigs] = useState<EngineConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EngineConfig | null>(null);
  const [flagsText, setFlagsText] = useState('');

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from(TABLES.consult_engine_config)
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      setConfigs(data || []);
    } catch (err: unknown) {
      toast.error('Failed to load engine configs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConfigs(); }, [fetchConfigs]);

  const handleEdit = (config: EngineConfig) => {
    setEditing(config);
    setFlagsText(config.engine_flags ? JSON.stringify(config.engine_flags, null, 2) : '');
  };

  const handleSave = async () => {
    if (!editing) return;
    try {
      let engineFlags: Record<string, unknown> | null = null;
      if (flagsText.trim()) {
        engineFlags = JSON.parse(flagsText);
      }

      const { error } = await supabase
        .from(TABLES.consult_engine_config)
        .update({
          active_rule_version_id: editing.active_rule_version_id,
          engine_flags: engineFlags,
        })
        .eq('id', editing.id);
      if (error) throw error;
      toast.success('Engine config updated');
      setEditing(null);
      fetchConfigs();
    } catch (err: unknown) {
      if (err instanceof SyntaxError) {
        toast.error('Invalid JSON in engine flags');
      } else {
        toast.error('Failed to save engine config');
      }
      console.error(err);
    }
  };

  if (editing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setEditing(null)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Edit Engine Config</h1>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <Label>House ID</Label>
              <Input value={editing.house_id} disabled />
            </div>

            <div>
              <Label>Active Rule Version ID</Label>
              <Input
                value={editing.active_rule_version_id || ''}
                onChange={(e) => setEditing({ ...editing, active_rule_version_id: e.target.value || null })}
                placeholder="UUID of the active rule version"
              />
              <p className="text-xs text-gray-500 mt-1">
                The rule version currently governing consultations for this house.
              </p>
            </div>

            <div>
              <Label>Engine Flags (JSON)</Label>
              <Textarea
                rows={8}
                value={flagsText}
                onChange={(e) => setFlagsText(e.target.value)}
                placeholder='{"enable_cast4": true, "auto_audit": true, ...}'
              />
              <p className="text-xs text-gray-500 mt-1">
                Feature flags and configuration overrides for the consultation engine.
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700">
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
              <Button variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings2 className="w-6 h-6 text-indigo-600" />
        <h1 className="text-2xl font-bold text-gray-900">Engine Configuration</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : configs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            No engine configurations found. Configs are created when a house is set up.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {configs.map((config) => (
            <Card key={config.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-mono text-sm">
                    House: {config.house_id.slice(0, 12)}...
                  </CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(config)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Active Rule Version:</span>{' '}
                    {config.active_rule_version_id ? (
                      <Badge variant="outline" className="font-mono text-xs">
                        {config.active_rule_version_id.slice(0, 8)}...
                      </Badge>
                    ) : (
                      <span className="text-amber-600">Not set</span>
                    )}
                  </div>
                  <div>
                    <span className="text-gray-500">Updated:</span>{' '}
                    {new Date(config.updated_at).toLocaleString()}
                  </div>
                  {config.engine_flags && (
                    <div className="col-span-full">
                      <span className="text-gray-500">Flags:</span>{' '}
                      <code className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                        {Object.keys(config.engine_flags).join(', ')}
                      </code>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}