import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, TABLES } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ConsultSummaryRow {
  id: string;
  consultation_id: string;
  odu: string;
  status: string;
  notes: string | null;
  summary_text: string | null;
  created_at: string;
}

/**
 * ConsultHistory page
 * 
 * Lists all consultation summaries from TABLES.consultation_summary.
 * Provides navigation to view individual summary details.
 */
export default function ConsultHistory() {
  const navigate = useNavigate();
  const [summaries, setSummaries] = useState<ConsultSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      setLoading(true);
      const { data, error } = await supabase
        .from(TABLES.consultation_summary)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading consultation history:", error);
      }

      setSummaries((data as ConsultSummaryRow[]) || []);
      setLoading(false);
    }

    loadHistory();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center">
        <p className="text-gray-600">Loading consultation history…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-4">
      <div className="max-w-3xl mx-auto space-y-4">
        <Card className="border-indigo-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-[Rubik] text-indigo-800">
                Consultation History
              </CardTitle>
              <Button
                className="bg-indigo-700 hover:bg-indigo-800 text-white"
                onClick={() => navigate("/consult/intake")}
              >
                New Consultation
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {summaries.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No consultations found.</p>
                <Button
                  variant="outline"
                  onClick={() => navigate("/consult/intake")}
                >
                  Start Your First Consultation
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {summaries.map((s) => (
                  <div
                    key={s.id || s.consultation_id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors cursor-pointer"
                    onClick={() => navigate(`/consult/summary?id=${s.consultation_id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-indigo-900">
                          {s.odu || "Unknown Odu"}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {new Date(s.created_at).toLocaleDateString()} at{" "}
                          {new Date(s.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          s.status === "ire"
                            ? "border-green-500 text-green-700"
                            : s.status === "osogbo"
                            ? "border-red-500 text-red-700"
                            : "border-gray-400 text-gray-600"
                        }
                      >
                        {s.status || "—"}
                      </Badge>
                    </div>
                    {s.notes && (
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                        {s.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}