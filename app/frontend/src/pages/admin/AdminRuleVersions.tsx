import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, BookOpen, CheckCircle, XCircle, Zap, Save } from 'lucide-react';
import { supabase, TABLES } from '@/lib/supabase';
import { toast } from 'sonner';

interface RuleVersion {
  id: string;
  house_id: string;
  version_number: number;
  status: string;
  rules_snapshot: Record<string, unknown> | null;
  created_by: string;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
}

interface RuleChangeProposal {
  id: string;
  house_id: string;
  proposed_by: string;
  changes: Record<string, unknown> | null;
  status: string;
  reviewed_by: string | null;
  approved_by: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export default function AdminRuleVersions() {
  const [versions, setVersions] = useState<RuleVersion[]>([]);
  const [proposals, setProposals] = useState<RuleChangeProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProposal, setSelectedProposal] = useState<RuleChangeProposal | null>(null);
  const [editingChanges, setEditingChanges] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [versionsRes, proposalsRes] = await Promise.all([
        supabase.from(TABLES.rule_version).select('*').order('version_number', { ascending: false }),
        supabase.from(TABLES.rule_change_proposal).select('*').order('updated_at', { ascending: false }),
      ]);
      if (versionsRes.error) throw versionsRes.error;
      if (proposalsRes.error) throw proposalsRes.error;
      setVersions(versionsRes.data || []);
      setProposals(proposalsRes.data || []);
    } catch (err: unknown) {
      toast.error('Failed to load rule data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleReview = async (proposal: RuleChangeProposal) => {
    try {
      const { error } = await supabase
        .from(TABLES.rule_change_proposal)
        .update({ status: 'reviewed' })
        .eq('id', proposal.id);
      if (error) throw error;
      toast.success('Proposal marked as reviewed');
      fetchData();
    } catch (err: unknown) {
      toast.error('Failed to review proposal');
      console.error(err);
    }
  };

  const handleApprove = async (proposal: RuleChangeProposal) => {
    try {
      const { error } = await supabase
        .from(TABLES.rule_change_proposal)
        .update({ status: 'approved' })
        .eq('id', proposal.id);
      if (error) throw error;
      toast.success('Proposal approved');
      fetchData();
    } catch (err: unknown) {
      toast.error('Failed to approve proposal');
      console.error(err);
    }
  };

  const handleReject = async (proposal: RuleChangeProposal) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    try {
      const { error } = await supabase
        .from(TABLES.rule_change_proposal)
        .update({ status: 'rejected', rejection_reason: reason })
        .eq('id', proposal.id);
      if (error) throw error;
      toast.success('Proposal rejected');
      fetchData();
    } catch (err: unknown) {
      toast.error('Failed to reject proposal');
      console.error(err);
    }
  };

  const handleSaveProposal = async () => {
    if (!selectedProposal) return;
    try {
      const changes = editingChanges.trim() ? JSON.parse(editingChanges) : null;
      const { error } = await supabase
        .from(TABLES.rule_change_proposal)
        .update({ changes })
        .eq('id', selectedProposal.id);
      if (error) throw error;
      toast.success('Proposal changes saved');
      setSelectedProposal(null);
      fetchData();
    } catch (err: unknown) {
      toast.error('Invalid JSON or save failed');
      console.error(err);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'approved': case 'active': return 'bg-green-100 text-green-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      case 'reviewed': return 'bg-blue-100 text-blue-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (selectedProposal) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSelectedProposal(null)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Edit Proposal</h1>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="font-medium">House:</span> {selectedProposal.house_id.slice(0, 8)}...</div>
              <div><span className="font-medium">Status:</span> <Badge className={statusColor(selectedProposal.status)}>{selectedProposal.status}</Badge></div>
              <div><span className="font-medium">Proposed by:</span> {selectedProposal.proposed_by.slice(0, 8)}...</div>
              <div><span className="font-medium">Created:</span> {new Date(selectedProposal.created_at).toLocaleString()}</div>
            </div>
            <div>
              <Label>Changes (JSON)</Label>
              <Textarea
                rows={12}
                value={editingChanges}
                onChange={(e) => setEditingChanges(e.target.value)}
                placeholder='{"rule_key": "new_value", ...}'
              />
            </div>
            <div className="flex gap-3">
              <Button onClick={handleSaveProposal} className="bg-indigo-600 hover:bg-indigo-700">
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
              <Button variant="outline" onClick={() => setSelectedProposal(null)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BookOpen className="w-6 h-6 text-indigo-600" />
        <h1 className="text-2xl font-bold text-gray-900">Rule Versions & Proposals</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : (
        <Tabs defaultValue="versions">
          <TabsList>
            <TabsTrigger value="versions">Rule Versions ({versions.length})</TabsTrigger>
            <TabsTrigger value="proposals">Proposals ({proposals.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="versions" className="space-y-4 mt-4">
            {versions.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-gray-500">No rule versions found.</CardContent></Card>
            ) : (
              versions.map((v) => (
                <Card key={v.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Version {v.version_number}</CardTitle>
                      <Badge className={statusColor(v.status)}>{v.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-600">
                      <div>Created by: {v.created_by.slice(0, 8)}...</div>
                      {v.approved_by && <div>Approved by: {v.approved_by.slice(0, 8)}...</div>}
                      <div>Updated: {new Date(v.updated_at).toLocaleDateString()}</div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="proposals" className="space-y-4 mt-4">
            {proposals.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-gray-500">No proposals found.</CardContent></Card>
            ) : (
              proposals.map((p) => (
                <Card key={p.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Proposal {p.id.slice(0, 8)}...</CardTitle>
                      <Badge className={statusColor(p.status)}>{p.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        <span>House: {p.house_id.slice(0, 8)}... | By: {p.proposed_by.slice(0, 8)}... | {new Date(p.updated_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex gap-2">
                        {p.status === 'pending' && (
                          <Button size="sm" variant="outline" onClick={() => handleReview(p)}>
                            Review
                          </Button>
                        )}
                        {(p.status === 'pending' || p.status === 'reviewed') && (
                          <>
                            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleApprove(p)}>
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Approve
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleReject(p)}>
                              <XCircle className="w-3 h-3 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => { setSelectedProposal(p); setEditingChanges(p.changes ? JSON.stringify(p.changes, null, 2) : ''); }}>
                          <Zap className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </div>
                    {p.rejection_reason && (
                      <p className="text-sm text-red-600 mt-2">Reason: {p.rejection_reason}</p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}