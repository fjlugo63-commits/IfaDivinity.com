import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import OduPanel from "@/components/consult/OduPanel";
import IreOsogboPanel from "@/components/consult/IreOsogboPanel";
import EboPanel from "@/components/consult/EboPanel";
import NotesPanel from "@/components/consult/NotesPanel";
import { useConsult } from "../../contexts/consultContext";

export default function ConsultSession() {
  const navigate = useNavigate();
  const { state, advance } = useConsult();
  const [odu, setOdu] = useState("");
  const [status, setStatus] = useState("");
  const [ebo, setEbo] = useState("");
  const [notes, setNotes] = useState("");

  // Load intake data for display
  const intake = JSON.parse(sessionStorage.getItem("consultIntake") || "{}");

  function finalizeConsult() {
    const sessionData = { odu, status, ebo, notes };
    // Store session data for summary page
    sessionStorage.setItem("consultOduCast", JSON.stringify(sessionData));
    console.log("Consult finalized:", sessionData, "state:", state);
    advance();
    navigate("/consult/summary");
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
              <Badge variant="outline" className="border-green-500 text-green-700">
                {state}
              </Badge>
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
            disabled={!odu || !status}
          >
            Finalize Consultation
          </Button>
        </div>
      </div>
    </div>
  );
}