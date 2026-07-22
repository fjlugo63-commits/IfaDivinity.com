import { useState, useEffect, useMemo } from "react";
import { supabase, TABLES } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type View = "landing" | "list" | "detail" | "analytics";

interface ConsultationRecord {
  id: string;
  awo_id: string;
  main_odu: string;
  ire_or_osogbo: string;
  subtype: string;
  orisha_owner: string;
  recommended_ebo: string;
  created_at: string;
}

interface OduFrequency {
  odu: string;
  count: number;
}

interface IreOsogboDistribution {
  label: string;
  count: number;
}

interface LineagePattern {
  lineage: string;
  count: number;
}

/**
 * Public Divination History & Analytics
 *
 * Public-facing divination history viewer and analytics dashboard.
 *
 * Screens: Landing → My History List → Detail | Community Analytics
 */
export default function DivinationHistory() {
  const [view, setView] = useState<View>("landing");
  const [records, setRecords] = useState<ConsultationRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<ConsultationRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Analytics data
  const [allRecords, setAllRecords] = useState<ConsultationRecord[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  useEffect(() => {
    async function getUser() {
      const { data } = await supabase.auth.getUser();
      if (data?.user) setCurrentUserId(data.user.id);
    }
    getUser();
  }, []);

  async function loadMyHistory() {
    if (!currentUserId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from(TABLES.consultation_record)
      .select("*")
      .eq("awo_id", currentUserId)
      .order("created_at", { ascending: false });

    if (!error && data) setRecords(data as ConsultationRecord[]);
    setLoading(false);
  }

  async function loadAnalytics() {
    setAnalyticsLoading(true);
    const { data, error } = await supabase
      .from(TABLES.consultation_record)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (!error && data) setAllRecords(data as ConsultationRecord[]);
    setAnalyticsLoading(false);
  }

  function navigateToList() {
    loadMyHistory();
    setView("list");
  }

  function navigateToDetail(record: ConsultationRecord) {
    setSelectedRecord(record);
    setView("detail");
  }

  function navigateToAnalytics() {
    loadAnalytics();
    setView("analytics");
  }

  // Compute analytics from allRecords
  const oduFrequency: OduFrequency[] = useMemo(() => {
    const map: Record<string, number> = {};
    allRecords.forEach((r) => {
      if (r.main_odu) map[r.main_odu] = (map[r.main_odu] || 0) + 1;
    });
    return Object.entries(map)
      .map(([odu, count]) => ({ odu, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 16);
  }, [allRecords]);

  const ireOsogboDistribution: IreOsogboDistribution[] = useMemo(() => {
    const map: Record<string, number> = {};
    allRecords.forEach((r) => {
      const label = r.ire_or_osogbo || "Unknown";
      map[label] = (map[label] || 0) + 1;
    });
    return Object.entries(map)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  }, [allRecords]);

  const lineagePatterns: LineagePattern[] = useMemo(() => {
    const map: Record<string, number> = {};
    allRecords.forEach((r) => {
      const lineage = r.subtype || "Unspecified";
      map[lineage] = (map[lineage] || 0) + 1;
    });
    return Object.entries(map)
      .map(([lineage, count]) => ({ lineage, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
  }, [allRecords]);

  function getMaxCount(items: { count: number }[]) {
    return Math.max(...items.map((i) => i.count), 1);
  }

  function getIreOsogboBadgeClass(value: string) {
    const lower = value?.toLowerCase() || "";
    if (lower.includes("ire")) return "border-green-500 text-green-700 bg-green-50";
    if (lower.includes("osogbo")) return "border-red-500 text-red-700 bg-red-50";
    return "border-gray-400 text-gray-600";
  }

  // Landing
  if (view === "landing") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full shadow-xl border-indigo-200">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-indigo-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <CardTitle className="text-2xl font-[Rubik] text-indigo-800">
              Divination History & Analytics
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <p className="text-gray-600 leading-relaxed">
              Explore your past consultations and view community-wide patterns across
              Odu, Ire/Osogbo, and lineage variations.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                className="bg-indigo-700 hover:bg-indigo-800 text-white px-6 py-3"
                onClick={navigateToList}
              >
                My History
              </Button>
              <Button
                variant="outline"
                className="border-indigo-300 text-indigo-700 hover:bg-indigo-50 px-6 py-3"
                onClick={navigateToAnalytics}
              >
                Community Analytics
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Detail
  if (view === "detail" && selectedRecord) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-4">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={navigateToList}>
              ← Back to History
            </Button>
            <h1 className="text-2xl font-[Rubik] text-indigo-800">Consultation Detail</h1>
          </div>

          <Card className="border-indigo-200 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Consultation Record</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Main Odu</p>
                  <p className="font-semibold text-indigo-900 text-lg">
                    {selectedRecord.main_odu || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Ire / Osogbo</p>
                  <Badge variant="outline" className={getIreOsogboBadgeClass(selectedRecord.ire_or_osogbo)}>
                    {selectedRecord.ire_or_osogbo || "Unknown"}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Subtype</p>
                  <p className="font-medium">{selectedRecord.subtype || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Orisha Owner</p>
                  <p className="font-medium">{selectedRecord.orisha_owner || "—"}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-500">Recommended Ebo</p>
                  <p className="font-medium text-gray-800">
                    {selectedRecord.recommended_ebo || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="text-sm">
                    {selectedRecord.created_at
                      ? new Date(selectedRecord.created_at).toLocaleString()
                      : "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button variant="outline" onClick={navigateToList}>
            Back to History
          </Button>
        </div>
      </div>
    );
  }

  // Analytics Dashboard
  if (view === "analytics") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-4">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setView("landing")}>
              ← Back
            </Button>
            <h1 className="text-2xl font-[Rubik] text-indigo-800">Community Analytics</h1>
          </div>

          {analyticsLoading ? (
            <p className="text-gray-500 text-center py-8">Loading analytics…</p>
          ) : allRecords.length === 0 ? (
            <Card className="border-gray-200">
              <CardContent className="py-8 text-center text-gray-500">
                No consultation data available for analytics.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Odu Frequency */}
              <Card className="border-indigo-200 shadow-md lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Odu Frequency</CardTitle>
                  <p className="text-sm text-gray-500">
                    Most frequently appearing Odu across all consultations
                  </p>
                </CardHeader>
                <CardContent>
                  {oduFrequency.length === 0 ? (
                    <p className="text-gray-400 text-sm">No data</p>
                  ) : (
                    <div className="space-y-2">
                      {oduFrequency.map((item) => (
                        <div key={item.odu} className="flex items-center gap-3">
                          <span className="text-sm font-medium w-28 truncate text-indigo-900">
                            {item.odu}
                          </span>
                          <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                            <div
                              className="bg-indigo-500 h-full rounded-full transition-all"
                              style={{
                                width: `${(item.count / getMaxCount(oduFrequency)) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-sm text-gray-600 w-8 text-right">
                            {item.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Ire/Osogbo Distribution */}
              <Card className="border-indigo-200 shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Ire / Osogbo Distribution</CardTitle>
                  <p className="text-sm text-gray-500">Overall outcome distribution</p>
                </CardHeader>
                <CardContent>
                  {ireOsogboDistribution.length === 0 ? (
                    <p className="text-gray-400 text-sm">No data</p>
                  ) : (
                    <div className="space-y-3">
                      {ireOsogboDistribution.map((item) => (
                        <div key={item.label} className="flex items-center gap-3">
                          <Badge
                            variant="outline"
                            className={`w-24 justify-center ${getIreOsogboBadgeClass(item.label)}`}
                          >
                            {item.label}
                          </Badge>
                          <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                item.label.toLowerCase().includes("ire")
                                  ? "bg-green-500"
                                  : item.label.toLowerCase().includes("osogbo")
                                    ? "bg-red-400"
                                    : "bg-gray-400"
                              }`}
                              style={{
                                width: `${(item.count / getMaxCount(ireOsogboDistribution)) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-sm text-gray-600 w-8 text-right">
                            {item.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Lineage Patterns */}
              <Card className="border-indigo-200 shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Lineage Patterns</CardTitle>
                  <p className="text-sm text-gray-500">Subtype frequency across consultations</p>
                </CardHeader>
                <CardContent>
                  {lineagePatterns.length === 0 ? (
                    <p className="text-gray-400 text-sm">No data</p>
                  ) : (
                    <div className="space-y-2">
                      {lineagePatterns.map((item) => (
                        <div key={item.lineage} className="flex items-center gap-3">
                          <span className="text-sm font-medium w-28 truncate text-gray-700">
                            {item.lineage}
                          </span>
                          <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                            <div
                              className="bg-amber-500 h-full rounded-full transition-all"
                              style={{
                                width: `${(item.count / getMaxCount(lineagePatterns)) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-sm text-gray-600 w-8 text-right">
                            {item.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    );
  }

  // History List
  if (view === "list") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-[Rubik] text-indigo-800">My Divination History</h1>
            <Button variant="outline" size="sm" onClick={() => setView("landing")}>
              ← Back
            </Button>
          </div>

          {!currentUserId ? (
            <Card className="border-amber-200">
              <CardContent className="py-8 text-center text-amber-700">
                Please sign in to view your divination history.
              </CardContent>
            </Card>
          ) : loading ? (
            <p className="text-gray-500 text-center py-8">Loading…</p>
          ) : records.length === 0 ? (
            <Card className="border-gray-200">
              <CardContent className="py-8 text-center text-gray-500">
                No consultation records found.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {records.map((record) => (
                <Card
                  key={record.id}
                  className="border-indigo-100 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => navigateToDetail(record)}
                >
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-semibold text-indigo-900">
                          {record.main_odu || "Unknown Odu"}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Badge
                            variant="outline"
                            className={getIreOsogboBadgeClass(record.ire_or_osogbo)}
                          >
                            {record.ire_or_osogbo || "—"}
                          </Badge>
                          <span>·</span>
                          <span>{record.subtype || "—"}</span>
                          <span>·</span>
                          <span>{record.orisha_owner || "—"}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">
                          {record.created_at
                            ? new Date(record.created_at).toLocaleDateString()
                            : ""}
                        </span>
                        <Button variant="ghost" size="sm" className="text-indigo-600">
                          View →
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Loading…</p>
    </div>
  );
}