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
    email: "",
    phone: "",
    consultType: "",
    reason: "",
    notes: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Store intake data in sessionStorage for the session page
    sessionStorage.setItem("consultIntake", JSON.stringify(form));
    navigate("/consult/session");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-lg border-amber-200">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-indigo-800 font-[Rubik]">
            Consultation Intake
          </CardTitle>
          <CardDescription className="text-gray-600">
            Please provide your details to begin your consultation session.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clientName">Full Name *</Label>
              <Input
                id="clientName"
                required
                value={form.clientName}
                onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                placeholder="Enter your full name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="your@email.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="(555) 123-4567"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="consultType">Consultation Type *</Label>
              <Select
                value={form.consultType}
                onValueChange={(val) => setForm({ ...form, consultType: val })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ifa-reading">Ifá Reading</SelectItem>
                  <SelectItem value="orisa-consultation">Orisa Consultation</SelectItem>
                  <SelectItem value="spiritual-guidance">Spiritual Guidance</SelectItem>
                  <SelectItem value="ebo-prescription">Ebó Prescription</SelectItem>
                  <SelectItem value="follow-up">Follow-up Session</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Consultation *</Label>
              <Textarea
                id="reason"
                required
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="Briefly describe why you're seeking consultation..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Any additional information..."
                rows={2}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-indigo-700 hover:bg-indigo-800 text-white"
            >
              Begin Consultation
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}