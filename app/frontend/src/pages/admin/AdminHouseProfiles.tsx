import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Pencil, Trash2, Home, Save } from 'lucide-react';
import { supabase, TABLES } from '@/lib/supabase';
import { toast } from 'sonner';

interface HouseProfile {
  id: string;
  name: string;
  tradition: string;
  spelling_map: Record<string, string> | null;
  pronunciation_map: Record<string, string> | null;
  cast2_table: Record<string, unknown> | null;
  cast3_table: Record<string, unknown> | null;
  cast4_table: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

const TRADITIONS = ['Lucumi', 'Isese', 'Candomble', 'Trinidad Orisha', 'Other'];

export default function AdminHouseProfiles() {
  const [houses, setHouses] = useState<HouseProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<HouseProfile | null>(null);
  const [isNew, setIsNew] = useState(false);

  const fetchHouses = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from(TABLES.house_profile)
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      setHouses(data || []);
    } catch (err: unknown) {
      toast.error('Failed to load house profiles');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHouses(); }, [fetchHouses]);

  const handleCreate = () => {
    setIsNew(true);
    setEditing({
      id: '',
      name: '',
      tradition: 'Lucumi',
      spelling_map: null,
      pronunciation_map: null,
      cast2_table: null,
      cast3_table: null,
      cast4_table: null,
      created_at: '',
      updated_at: '',
    });
  };

  const handleSave = async () => {
    if (!editing) return;
    try {
      const payload = {
        name: editing.name,
        tradition: editing.tradition,
        spelling_map: editing.spelling_map,
        pronunciation_map: editing.pronunciation_map,
        cast2_table: editing.cast2_table,
        cast3_table: editing.cast3_table,
        cast4_table: editing.cast4_table,
      };

      if (isNew) {
        const { error } = await supabase.from(TABLES.house_profile).insert(payload);
        if (error) throw error;
        toast.success('House profile created');
      } else {
        const { error } = await supabase
          .from(TABLES.house_profile)
          .update(payload)
          .eq('id', editing.id);
        if (error) throw error;
        toast.success('House profile updated');
      }
      setEditing(null);
      setIsNew(false);
      fetchHouses();
    } catch (err: unknown) {
      toast.error('Failed to save house profile');
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this house profile?')) return;
    try {
      const { error } = await supabase.from(TABLES.house_profile).delete().eq('id', id);
      if (error) throw error;
      toast.success('House profile deleted');
      fetchHouses();
    } catch (err: unknown) {
      toast.error('Failed to delete house profile');
      console.error(err);
    }
  };

  const parseJson = (val: string): Record<string, unknown> | null => {
    if (!val.trim()) return null;
    try {
      return JSON.parse(val);
    } catch {
      toast.error('Invalid JSON format');
      return undefined as unknown as null;
    }
  };

  if (editing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => { setEditing(null); setIsNew(false); }}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">
            {isNew ? 'Create House Profile' : 'Edit House Profile'}
          </h1>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>House Name</Label>
                <Input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="Enter house name"
                />
              </div>
              <div>
                <Label>Tradition</Label>
                <Select
                  value={editing.tradition}
                  onValueChange={(v) => setEditing({ ...editing, tradition: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TRADITIONS.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Spelling Map (JSON)</Label>
              <Textarea
                rows={4}
                value={editing.spelling_map ? JSON.stringify(editing.spelling_map, null, 2) : ''}
                onChange={(e) => {
                  const parsed = parseJson(e.target.value);
                  if (parsed !== undefined) setEditing({ ...editing, spelling_map: parsed as Record<string, string> | null });
                }}
                placeholder='{"Ogbe": "Ogbè", "Oyeku": "Òyèkú"}'
              />
            </div>

            <div>
              <Label>Pronunciation Map (JSON)</Label>
              <Textarea
                rows={4}
                value={editing.pronunciation_map ? JSON.stringify(editing.pronunciation_map, null, 2) : ''}
                onChange={(e) => {
                  const parsed = parseJson(e.target.value);
                  if (parsed !== undefined) setEditing({ ...editing, pronunciation_map: parsed as Record<string, string> | null });
                }}
                placeholder='{"Ogbe": "ohg-beh", "Oyeku": "oh-yeh-koo"}'
              />
            </div>

            <div>
              <Label>Cast2 Table (JSON)</Label>
              <Textarea
                rows={4}
                value={editing.cast2_table ? JSON.stringify(editing.cast2_table, null, 2) : ''}
                onChange={(e) => {
                  const parsed = parseJson(e.target.value);
                  if (parsed !== undefined) setEditing({ ...editing, cast2_table: parsed });
                }}
                placeholder='{"00": "Oyeku", "01": "Ogbe", ...}'
              />
            </div>

            <div>
              <Label>Cast3 Table (JSON)</Label>
              <Textarea
                rows={4}
                value={editing.cast3_table ? JSON.stringify(editing.cast3_table, null, 2) : ''}
                onChange={(e) => {
                  const parsed = parseJson(e.target.value);
                  if (parsed !== undefined) setEditing({ ...editing, cast3_table: parsed });
                }}
                placeholder='{"000": "Oyeku", "001": "Ogbe", ...}'
              />
            </div>

            <div>
              <Label>Cast4 Table (JSON)</Label>
              <Textarea
                rows={4}
                value={editing.cast4_table ? JSON.stringify(editing.cast4_table, null, 2) : ''}
                onChange={(e) => {
                  const parsed = parseJson(e.target.value);
                  if (parsed !== undefined) setEditing({ ...editing, cast4_table: parsed });
                }}
                placeholder='{"0000": "Oyeku Meji", "0001": "Ogbe Meji", ...}'
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
          <Home className="w-6 h-6 text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-900">House Profiles</h1>
        </div>
        <Button onClick={handleCreate} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" />
          New House
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : houses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            No house profiles found. Create one to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {houses.map((house) => (
            <Card key={house.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{house.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {house.tradition}
                    </Badge>
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(house); setIsNew(false); }}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(house.id)} className="text-red-500 hover:text-red-700">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">
                  Updated: {new Date(house.updated_at).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}