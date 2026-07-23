import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase, TABLES } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useConsult } from "@/contexts/consultContext";

interface ConsultSummaryData {
  id: string;
  consultation_id: string;
  odu: string;
  status: string;
  notes: string | null;
  summary_text: string | null;
  created_at: string;
}

/**
 * ConsultSummary page
 *
 * Reads from consultation_summary table (TABLES.consultation_summary).
 * Schema alignment:
 *   - consultation_id: references the consultation_record.id
 *   - odu: main Odu name from the consultation
 *   - status: ire/osogbo outcome
 *   - notes: awo notes
 *   - summary_text: full rendered summary text
 *
 * On first load after session finalization, writes the summary to Supabase
 * if it doesn't already exist. Subsequent loads fetch from DB.
 */
export default function ConsultSummary() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { advance } = useConsult();

  const consultationId = searchParams.get("id");

  const [summary, setSummary] = useState<ConsultSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrCreateSummary() {
      setLoading(true);
      setError(null);

      // Case 1: We have a consultation_id in the URL — fetch from DB
      if (consultationId) {
        const { data, error: fetchError } = await supabase
          .from(TABLES.consultation_summary)
          .select("*")
          .eq("consultation_id", consultationId)
          .single();

        if (fetchError && fetchError.code !== "PGRST116") {
          console.error("Error fetching consultation summary:", fetchError);
          setError("Failed to load consultation summary.");
          setLoading(false);
          return;
        }

        if (data) {
          setSummary(data as ConsultSummaryData);
          setLoading(false);
          return;
        }
      }

      // Case 2: Coming from session page — read sessionStorage and persist
      const sessionDataRaw = sessionStorage.getItem("consultOduCast");
      const intakeDataRaw = sessionStorage.getItem("consultIntake");

      if (sessionDataRaw) {
        const sessionData = JSON.parse(sessionDataRaw);
        const intakeData = intakeDataRaw ? JSON.parse(intakeDataRaw) : {};

        // Build summary text from session data
        const summaryText = buildSummaryText(sessionData, intakeData);

        // Write to consultation_summary table
        const recordId = consultationId || crypto.randomUUID();
        const insertPayload = {
          consultation_id: recordId,
          odu: sessionData.odu || "Unknown",
          status: sessionData.status || "pending",
          notes: sessionData.notes || null,
          summary_text: summaryText,
        };

        const { data: inserted, error: insertError } = await supabase
          .from(TABLES.consultation_summary)
          .insert(insertPayload)
          .select()
          .single();

        if (insertError) {
          console.error("Error writing consultation summary:", insertError);
          // Still show the data from sessionStorage even if DB write fails
          setSummary({
            id: "",
            consultation_id: recordId,
            odu: sessionData.odu || "Unknown",
            status: sessionData.status || "pending",
            notes: sessionData.notes || null,
            summary_text: summaryText,
            created_at: new Date().toISOString(),
          });
        } else if (inserted) {
          setSummary(inserted as ConsultSummaryData);
          // Update URL with the consultation_id for bookmarking
          window.history.replaceState(null, "", `/consult/summary?id=${recordId}`);
        }

        // Clear sessionStorage after persisting
        sessionStorage.removeItem("consultOduCast");
      } else if (!consultationId) {
        setError("No consultation data found. Please start a new consultation.");
      }

      setLoading(false);
    }

    loadOrCreateSummary();
  }, [consultationId]);

  function buildSummaryText(
    sessionData: { odu?: string; status?: string; ebo?: string; notes?: string },
    intakeData: { clientName?: string; consultReason?: string; modality?: string }
  ): string {
    const parts: string[] = [];
    if (intakeData.clientName) parts.push(`Client: ${intakeData.clientName}`);
    if (intakeData.consultReason) parts.push(`Reason: ${intakeData.consultReason}`);
    if (intakeData.modality) parts.push(`Modality: ${intakeData.modality}`);
    if (sessionData.odu) parts.push(`Odu: ${sessionData.odu}`);
    if (sessionData.status) parts.push(`Outcome: ${sessionData.status}`);
    if (sessionData.ebo) parts.push(`Ebo: ${sessionData.ebo}`);
    if (sessionData.notes) parts.push(`Notes: ${sessionData.notes}`);
    return parts.join("\n");
  }

  function handleProceedToPayment() {
    advance();
    const id = summary?.consultation_id || consultationId || "";
    navigate(`/consult/payment?id=${id}`);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center">
        <p className="text-gray-600">Loading consultation summary…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => navigate("/consult/intake")}>
              Start New Consultation
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <Card className="border-indigo-200 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-[Rubik] text-indigo-800">
                Consultation Summary
              </CardTitle>
              <Badge
                variant="outline"
                className={
                  summary?.status === "ire"
                    ? "border-green-500 text-green-700"
                    : summary?.status === "osogbo"
                    ? "border-red-500 text-red-700"
                    : "border-gray-400 text-gray-600"
                }
              >
                {summary?.status || "Unknown"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Odu */}
            <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
              <p className="text-sm text-indigo-600 font-medium uppercase tracking-wide">
                Main Odu
              </p>
              <p className="text-xl font-bold text-indigo-900 mt-1">
                {summary?.odu || "—"}
              </p>
            </div>

            {/* Summary Text */}
            {summary?.summary_text && (
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <p className="text-sm text-gray-500 font-medium uppercase tracking-wide mb-2">
                  Full Summary
                </p>
                <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans">
                  {summary.summary_text}
                </pre>
              </div>
            )}

            {/* Notes */}
            {summary?.notes && (
              <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
                <p className="text-sm text-amber-700 font-medium uppercase tracking-wide mb-1">
                  Awo Notes
                </p>
                <p className="text-gray-800">{summary.notes}</p>
              </div>
            )}

            {/* Timestamp */}
            {summary?.created_at && (
              <p className="text-xs text-gray-400 text-right">
                Created: {new Date(summary.created_at).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={() => navigate("/consult/session")}
          >
            Back to Session
          </Button>
          <Button
            className="bg-indigo-700 hover:bg-indigo-800 text-white"
            onClick={handleProceedToPayment}
          >
            Proceed to Payment
          </Button>
        </div>
      </div>
    </div>
  );
}