import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ConsultIntake() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    clientName: "",
    consultReason: "",
    modality: "manual",
    notes: "",
    symptomsOrContext: "",
  });

  function updateField(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function submitIntake(e: React.FormEvent) {
    e.preventDefault();
    // Store intake data in sessionStorage for the session page
    // Module 6 will add Supabase insert here
    sessionStorage.setItem("consultIntake", JSON.stringify(form));
    console.log("Intake submitted:", form);
    navigate("/consult/session");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-lg border-amber-200">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-indigo-800 font-[Rubik]">
            Consult Intake
          </CardTitle>
          <CardDescription className="text-gray-600">
            Provide client details to begin the consultation session.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submitIntake} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clientName">Client Name *</Label>
              <Input
                id="clientName"
                name="clientName"
                required
                value={form.clientName}
                onChange={updateField}
                placeholder="Client Name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="consultReason">Reason for Consult *</Label>
              <Input
                id="consultReason"
                name="consultReason"
                required
                value={form.consultReason}
                onChange={updateField}
                placeholder="Reason for Consult"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="modality">Modality</Label>
              <Select
                value={form.modality}
                onValueChange={(val) => setForm({ ...form, modality: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select modality" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="opele">Opele</SelectItem>
                  <SelectItem value="ikin">Ikin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="symptomsOrContext">Symptoms / Context</Label>
              <Textarea
                id="symptomsOrContext"
                name="symptomsOrContext"
                value={form.symptomsOrContext}
                onChange={updateField}
                placeholder="Symptoms / Context"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                value={form.notes}
                onChange={updateField}
                placeholder="Notes"
                rows={2}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-indigo-700 hover:bg-indigo-800 text-white"
            >
              Start Consultation
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}