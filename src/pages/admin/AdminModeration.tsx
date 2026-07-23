import { useState, useEffect } from "react";
import { supabase, TABLES } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";

interface ContributionRecord {
  id: string;
  user_id: string;
  odu_code: string;
  contribution_type: string;
  content: string;
  status: string;
  moderator_id: string | null;
  moderated_at: string | null;
  published_at: string | null;
  created_at: string;
}

type View = "dashboard" | "review" | "publish";

/**
 * Admin Moderation Portal
 *
 * Moderator and Awo council portal for reviewing, approving,
 * rejecting, and publishing contributions.
 *
 * Screens: Dashboard → Review → Publish
 */
export default function AdminModeration() {
  const { user } = useAuth();
  const [view, setView] = useState<View>("dashboard");
  const [contributions, setContributions] = useState<ContributionRecord[]>([]);
  const [selectedContribution, setSelectedContribution] = useState<ContributionRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [publishStatus, setPublishStatus] = useState<string | null>(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>("pending");
  const [filterOdu, setFilterOdu] = useState<string>("");

  useEffect(() => {
    loadContributions();
  }, [filterStatus, filterOdu]);

  async function loadContributions() {
    setLoading(true);
    let query = supabase
      .from(TABLES.contribution_record)
      .select("*")
      .order("created_at", { ascending: false });

    if (filterStatus) {
      query = query.eq("status", filterStatus);
    }
    if (filterOdu) {
      query = query.eq("odu_code", filterOdu);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error loading contributions:", error);
    }

    setContributions((data as ContributionRecord[]) || []);
    setLoading(false);
  }

  async function handleApprove(contribution: ContributionRecord) {
    setActionLoading(true);
    const { error } = await supabase
      .from(TABLES.contribution_record)
      .update({
        status: "approved",
        moderator_id: user?.id || null,
        moderated_at: new Date().toISOString(),
      })
      .eq("id", contribution.id);

    setActionLoading(false);

    if (error) {
      console.error("Approve error:", error);
      return;
    }

    // Refresh
    await loadContributions();
    setSelectedContribution(null);
    setView("dashboard");
  }

  async function handleReject(contribution: ContributionRecord) {
    setActionLoading(true);
    const { error } = await supabase
      .from(TABLES.contribution_record)
      .update({
        status: "rejected",
        moderator_id: user?.id || null,
        moderated_at: new Date().toISOString(),
      })
      .eq("id", contribution.id);

    setActionLoading(false);

    if (error) {
      console.error("Reject error:", error);
      return;
    }

    await loadContributions();
    setSelectedContribution(null);
    setView("dashboard");
  }

  async function handlePublish(contribution: ContributionRecord) {
    setActionLoading(true);
    setPublishStatus(null);

    const { error } = await supabase
      .from(TABLES.contribution_record)
      .update({
        status: "published",
        published_at: new Date().toISOString(),
      })
      .eq("id", contribution.id);

    setActionLoading(false);

    if (error) {
      console.error("Publish error:", error);
      setPublishStatus("error");
      return;
    }

    setPublishStatus("published");
    await loadContributions();
  }

  function openReview(contribution: ContributionRecord) {
    setSelectedContribution(contribution);
    setView("review");
  }

  function getStatusBadgeClass(status: string) {
    switch (status) {
      case "pending":
        return "border-amber-500 text-amber-700 bg-amber-50";
      case "approved":
        return "border-green-500 text-green-700 bg-green-50";
      case "rejected":
        return "border-red-500 text-red-700 bg-red-50";
      case "published":
        return "border-indigo-500 text-indigo-700 bg-indigo-50";
      default:
        return "border-gray-400 text-gray-600";
    }
  }

  function getTypeLabel(type: string) {
    return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  // Publish View
  if (view === "publish" && selectedContribution) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => { setView("dashboard"); setPublishStatus(null); }}>
            ← Back to Dashboard
          </Button>
          <h1 className="text-2xl font-[Rubik] text-indigo-800">Publish Contribution</h1>
        </div>

        <Card className="border-indigo-200">
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Odu</p>
                <p className="font-semibold text-indigo-900">{selectedContribution.odu_code}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Type</p>
                <p className="font-medium">{getTypeLabel(selectedContribution.contribution_type)}</p>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-1">Content</p>
              <div className="bg-gray-50 rounded-lg p-4 border text-sm whitespace-pre-wrap">
                {selectedContribution.content}
              </div>
            </div>

            {publishStatus === "published" && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm">
                ✓ Contribution has been published to the Odu knowledge database.
              </div>
            )}

            {publishStatus === "error" && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                Failed to publish. Please try again.
              </div>
            )}

            <div className="flex gap-3 pt-2">
              {selectedContribution.status === "approved" && !publishStatus && (
                <Button
                  className="bg-indigo-700 hover:bg-indigo-800 text-white"
                  onClick={() => handlePublish(selectedContribution)}
                  disabled={actionLoading}
                >
                  {actionLoading ? "Publishing…" : "Publish to Knowledge DB"}
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => { setView("dashboard"); setPublishStatus(null); }}
              >
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Review View
  if (view === "review" && selectedContribution) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setView("dashboard")}>
            ← Back to Dashboard
          </Button>
          <h1 className="text-2xl font-[Rubik] text-indigo-800">Review Contribution</h1>
        </div>

        <Card className="border-indigo-200">
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Odu</p>
                <p className="font-semibold text-indigo-900">{selectedContribution.odu_code}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Type</p>
                <Badge variant="outline" className="mt-1">
                  {getTypeLabel(selectedContribution.contribution_type)}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-500">Submitted By</p>
                <p className="font-mono text-xs text-gray-700">{selectedContribution.user_id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Submitted</p>
                <p className="text-sm">{new Date(selectedContribution.created_at).toLocaleString()}</p>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-1">Content</p>
              <div className="bg-gray-50 rounded-lg p-4 border text-sm whitespace-pre-wrap min-h-[120px]">
                {selectedContribution.content}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <p className="text-sm text-gray-500">Current Status:</p>
              <Badge variant="outline" className={getStatusBadgeClass(selectedContribution.status)}>
                {selectedContribution.status}
              </Badge>
            </div>

            {/* Actions */}
            {selectedContribution.status === "pending" && (
              <div className="flex gap-3 pt-2 border-t">
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => handleApprove(selectedContribution)}
                  disabled={actionLoading}
                >
                  {actionLoading ? "Processing…" : "Approve"}
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => handleReject(selectedContribution)}
                  disabled={actionLoading}
                >
                  {actionLoading ? "Processing…" : "Reject"}
                </Button>
              </div>
            )}

            {selectedContribution.status === "approved" && (
              <div className="flex gap-3 pt-2 border-t">
                <Button
                  className="bg-indigo-700 hover:bg-indigo-800 text-white"
                  onClick={() => {
                    setView("publish");
                  }}
                >
                  Publish
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Dashboard View
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-[Rubik] text-indigo-800">Contribution Moderation</h1>
        <Badge variant="outline" className="text-sm">
          {contributions.length} {filterStatus || "total"} contributions
        </Badge>
      </div>

      {/* Filters */}
      <Card className="border-gray-200">
        <CardContent className="pt-4">
          <div className="flex gap-4 flex-wrap">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="published">Published</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Odu Code
              </label>
              <input
                type="text"
                value={filterOdu}
                onChange={(e) => setFilterOdu(e.target.value)}
                placeholder="Filter by Odu…"
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contributions List */}
      <Card className="border-indigo-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Contributions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-gray-500 text-center py-8">Loading contributions…</p>
          ) : contributions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No contributions found.</p>
          ) : (
            <div className="space-y-2">
              {contributions.map((c) => (
                <div
                  key={c.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors cursor-pointer"
                  onClick={() => openReview(c)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-semibold text-indigo-900">{c.odu_code}</p>
                        <p className="text-sm text-gray-500">
                          {getTypeLabel(c.contribution_type)} · {new Date(c.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={getStatusBadgeClass(c.status)}>
                        {c.status}
                      </Badge>
                      <Button variant="ghost" size="sm" className="text-indigo-600">
                        Review →
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">{c.content}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}