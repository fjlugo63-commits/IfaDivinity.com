import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Pencil, Trash2, UserCheck, Save } from 'lucide-react';
import { supabase, TABLES } from '@/lib/supabase';
import { toast } from 'sonner';

interface AwoProfile {
  id: string;
  user_id: string;
  house_id: string;
  lineage: string | null;
  consecration_mapping_id: string | null;
  created_at: string;
  updated_at: string;
}

interface ConsecrationMapping {
  id: string;
  awo_id: string;
  physical_index_to_canonical: Record<string, number> | null;
  created_at: string;
  updated_at: string;
}

export default function AdminAwoProfiles() {
  const [awos, setAwos] = useState<AwoProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AwoProfile | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [consecrationEditing, setConsecrationEditing] = useState<ConsecrationMapping | null>(null);
  const [showConsecration, setShowConsecration] = useState(false);

  const fetchAwos = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from(TABLES.awo_profile)
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      setAwos(data || []);
    } catch (err: unknown) {
      toast.error('Failed to load awo profiles');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAwos(); }, [fetchAwos]);

  const handleCreate = () => {
    setIsNew(true);
    setEditing({
      id: '',
      user_id: '',
      house_id: '',
      lineage: null,
      consecration_mapping_id: null,
      created_at: '',
      updated_at: '',
    });
  };

  const handleSave = async () => {
    if (!editing) return;
    try {
      const payload = {
        user_id: editing.user_id,
        house_id: editing.house_id,
        lineage: editing.lineage,
        consecration_mapping_id: editing.consecration_mapping_id,
      };

      if (isNew) {
        const { error } = await supabase.from(TABLES.awo_profile).insert(payload);
        if (error) throw error;
        toast.success('Awo profile created');
      } else {
        const { error } = await supabase
          .from(TABLES.awo_profile)
          .update(payload)
          .eq('id', editing.id);
        if (error) throw error;
        toast.success('Awo profile updated');
      }
      setEditing(null);
      setIsNew(false);
      fetchAwos();
    } catch (err: unknown) {
      toast.error('Failed to save awo profile');
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this awo profile?')) return;
    try {
      const { error } = await supabase.from(TABLES.awo_profile).delete().eq('id', id);
      if (error) throw error;
      toast.success('Awo profile deleted');
      fetchAwos();
    } catch (err: unknown) {
      toast.error('Failed to delete awo profile');
      console.error(err);
    }
  };

  const handleEditConsecration = async (awoId: string) => {
    try {
      const { data, error } = await supabase
        .from(TABLES.consecration_mapping)
        .select('*')
        .eq('awo_id', awoId)
        .maybeSingle();
      if (error) throw error;

      if (data) {
        setConsecrationEditing(data);
      } else {
        setConsecrationEditing({
          id: '',
          awo_id: awoId,
          physical_index_to_canonical: null,
          created_at: '',
          updated_at: '',
        });
      }
      setShowConsecration(true);
    } catch (err: unknown) {
      toast.error('Failed to load consecration mapping');
      console.error(err);
    }
  };

  const handleSaveConsecration = async () => {
    if (!consecrationEditing) return;
    try {
      const payload = {
        awo_id: consecrationEditing.awo_id,
        physical_index_to_canonical: consecrationEditing.physical_index_to_canonical,
      };

      if (consecrationEditing.id) {
        const { error } = await supabase
          .from(TABLES.consecration_mapping)
          .update(payload)
          .eq('id', consecrationEditing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(TABLES.consecration_mapping).insert(payload);
        if (error) throw error;
      }
      toast.success('Consecration mapping saved');
      setShowConsecration(false);
      setConsecrationEditing(null);
    } catch (err: unknown) {
      toast.error('Failed to save consecration mapping');
      console.error(err);
    }
  };

  if (showConsecration && consecrationEditing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => { setShowConsecration(false); setConsecrationEditing(null); }}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Consecration Mapping</h1>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <Label>Awo ID</Label>
              <Input value={consecrationEditing.awo_id} disabled />
            </div>
            <div>
              <Label>Physical Index to Canonical (JSON)</Label>
              <Textarea
                rows={8}
                value={consecrationEditing.physical_index_to_canonical ? JSON.stringify(consecrationEditing.physical_index_to_canonical, null, 2) : ''}
                onChange={(e) => {
                  try {
                    const parsed = e.target.value.trim() ? JSON.parse(e.target.value) : null;
                    setConsecrationEditing({ ...consecrationEditing, physical_index_to_canonical: parsed });
                  } catch { /* allow typing */ }
                }}
                placeholder='{"0": 3, "1": 7, "2": 1, "3": 5, ...}'
              />
              <p className="text-xs text-gray-500 mt-1">
                Maps physical opele chain positions to canonical Odu bit positions.
              </p>
            </div>
            <div className="flex gap-3 pt-4">
              <Button onClick={handleSaveConsecration} className="bg-indigo-600 hover:bg-indigo-700">
                <Save className="w-4 h-4 mr-2" />
                Save Mapping
              </Button>
              <Button variant="outline" onClick={() => { setShowConsecration(false); setConsecrationEditing(null); }}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => { setEditing(null); setIsNew(false); }}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">
            {isNew ? 'Create Awo Profile' : 'Edit Awo Profile'}
          </h1>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>User ID</Label>
                <Input
                  value={editing.user_id}
                  onChange={(e) => setEditing({ ...editing, user_id: e.target.value })}
                  placeholder="UUID of the user"
                />
              </div>
              <div>
                <Label>House ID</Label>
                <Input
                  value={editing.house_id}
                  onChange={(e) => setEditing({ ...editing, house_id: e.target.value })}
                  placeholder="UUID of the house"
                />
              </div>
            </div>

            <div>
              <Label>Lineage</Label>
              <Input
                value={editing.lineage || ''}
                onChange={(e) => setEditing({ ...editing, lineage: e.target.value || null })}
                placeholder="e.g., Adesanya → Ifayemi → ..."
              />
            </div>

            <div>
              <Label>Consecration Mapping ID</Label>
              <Input
                value={editing.consecration_mapping_id || ''}
                onChange={(e) => setEditing({ ...editing, consecration_mapping_id: e.target.value || null })}
                placeholder="UUID of consecration mapping (optional)"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700">
                <Save className="w-4 h-4 mr-2" />
                {isNew ? 'Create' : 'Save Changes'}
              </Button>
              <Button variant="outline" onClick={() => { setEditing(null); setIsNew(false); }}>
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UserCheck className="w-6 h-6 text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-900">Awo Profiles</h1>
        </div>
        <Button onClick={handleCreate} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" />
          New Awo Profile
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : awos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            No awo profiles found. Create one to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {awos.map((awo) => (
            <Card key={awo.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-mono text-sm">{awo.user_id.slice(0, 8)}...</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      House: {awo.house_id.slice(0, 8)}...
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={() => handleEditConsecration(awo.id)} className="text-amber-600">
                      Consecration
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(awo); setIsNew(false); }}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(awo.id)} className="text-red-500 hover:text-red-700">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 text-sm text-gray-500">
                  {awo.lineage && <span>Lineage: {awo.lineage}</span>}
                  <span>Updated: {new Date(awo.updated_at).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}