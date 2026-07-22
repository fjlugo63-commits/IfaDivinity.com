import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import OduPanel from "@/components/consult/OduPanel";
import IreOsogboPanel from "@/components/consult/IreOsogboPanel";
import EboPanel from "@/components/consult/EboPanel";
import NotesPanel from "@/components/consult/NotesPanel";
import { useConsult } from "@/contexts/consultContext";
import { supabase, TABLES } from "@/lib/supabase";

/**
 * ConsultSession page
 * 
 * The main consultation workspace where the Awo records:
 * - Odu (main Odu from the cast)
 * - Ire/Osogbo status
 * - Ebo recommendation
 * - Notes
 * 
 * On finalization, writes the consultation summary to TABLES.consultation_summary
 * and navigates to the summary page with the consultation_id.
 */
export default function ConsultSession() {
  const navigate = useNavigate();
  const { state, advance } = useConsult();
  const [odu, setOdu] = useState("");
  const [status, setStatus] = useState("");
  const [ebo, setEbo] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Load intake data for display
  const intake = JSON.parse(sessionStorage.getItem("consultIntake") || "{}");

  async function finalizeConsult() {
    setSubmitting(true);

    try {
      // Generate a consultation_id for this session
      const consultationId = crypto.randomUUID();

      // Build the summary text
      const summaryParts: string[] = [];
      if (intake.clientName) summaryParts.push(`Client: ${intake.clientName}`);
      if (intake.consultReason) summaryParts.push(`Reason: ${intake.consultReason}`);
      if (intake.modality) summaryParts.push(`Modality: ${intake.modality}`);
      if (odu) summaryParts.push(`Odu: ${odu}`);
      if (status) summaryParts.push(`Outcome: ${status}`);
      if (ebo) summaryParts.push(`Ebo: ${ebo}`);
      if (notes) summaryParts.push(`Notes: ${notes}`);
      const summaryText = summaryParts.join("\n");

      // Write to consultation_summary table in Supabase
      const { error: insertError } = await supabase
        .from(TABLES.consultation_summary)
        .insert({
          consultation_id: consultationId,
          odu: odu,
          status: status,
          notes: notes || null,
          summary_text: summaryText,
        });

      if (insertError) {
        console.error("Failed to write consultation summary:", insertError);
        // Fall back to sessionStorage so the summary page can still display
        sessionStorage.setItem(
          "consultOduCast",
          JSON.stringify({ odu, status, ebo, notes })
        );
      }

      // Advance state machine
      advance();

      // Navigate to summary page with the consultation_id
      navigate(`/consult/summary?id=${consultationId}`);
    } catch (err) {
      console.error("Finalization error:", err);
      // Fallback: store in sessionStorage
      sessionStorage.setItem(
        "consultOduCast",
        JSON.stringify({ odu, status, ebo, notes })
      );
      advance();
      navigate("/consult/summary");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-4">
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Session Header */}
        <Card className="border-indigo-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-[Rubik] text-indigo-800">
                Consult Session
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-green-500 text-green-700">
                  {state}
                </Badge>
                <Button size="sm" variant="outline" onClick={advance}>
                  Next Phase
                </Button>
              </div>
            </div>
          </CardHeader>
          {intake.clientName && (
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Client:</span>{" "}
                  <span className="font-medium">{intake.clientName}</span>
                </div>
                <div>
                  <span className="text-gray-500">Modality:</span>{" "}
                  <span className="font-medium capitalize">{intake.modality}</span>
                </div>
                {intake.consultReason && (
                  <div className="col-span-2">
                    <span className="text-gray-500">Reason:</span>{" "}
                    <span className="font-medium">{intake.consultReason}</span>
                  </div>
                )}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Panels */}
        <OduPanel odu={odu} setOdu={setOdu} />
        <IreOsogboPanel status={status} setStatus={setStatus} />
        <EboPanel ebo={ebo} setEbo={setEbo} />
        <NotesPanel notes={notes} setNotes={setNotes} />

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={() => navigate("/consult/intake")}
          >
            Back to Intake
          </Button>
          <Button
            className="bg-indigo-700 hover:bg-indigo-800 text-white"
            onClick={finalizeConsult}
            disabled={!odu || !status || submitting}
          >
            {submitting ? "Saving…" : "Finalize Consultation"}
          </Button>
        </div>
      </div>
    </div>
  );
}