import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { consultEngine, type EdgeTab } from "@/lib/consultEngine";

interface IntakeData {
  clientName: string;
  email: string;
  phone: string;
  consultType: string;
  reason: string;
  notes: string;
}

export default function ConsultSession() {
  const navigate = useNavigate();
  const [intake, setIntake] = useState<IntakeData | null>(null);
  const [castingMethod, setCastingMethod] = useState("");
  const [oduResult, setOduResult] = useState("");
  const [interpretation, setInterpretation] = useState("");
  const [prescriptions, setPrescriptions] = useState("");

  useEffect(() => {
    const stored = sessionStorage.getItem("consultIntake");
    if (stored) {
      setIntake(JSON.parse(stored));
    } else {
      navigate("/consult/intake");
    }
  }, [navigate]);

  const handleComplete = () => {
    const oduCast = {
      method: castingMethod,
      oduCode: oduResult,
      interpretation,
      prescriptions: prescriptions.split("\n").filter(Boolean),
    };
    sessionStorage.setItem("consultOduCast", JSON.stringify(oduCast));

    // Run consultEngine for session summary
    const mockTabs: EdgeTab[] = [
      { isCurrent: true, pageTitle: "Consult Session - Ifa Divinity", pageUrl: window.location.href, tabId: "active" },
    ];
    const engineResult = consultEngine(mockTabs, intake, oduCast, null);
    sessionStorage.setItem("consultEngineResult", JSON.stringify(engineResult));

    navigate("/consult/summary");
  };

  if (!intake) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Client Info Banner */}
        <Card className="border-indigo-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-[Rubik] text-indigo-800">
                Active Session
              </CardTitle>
              <Badge variant="outline" className="border-green-500 text-green-700">
                In Progress
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Client:</span>{" "}
                <span className="font-medium">{intake.clientName}</span>
              </div>
              <div>
                <span className="text-gray-500">Type:</span>{" "}
                <span className="font-medium capitalize">{intake.consultType.replace("-", " ")}</span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-500">Reason:</span>{" "}
                <span className="font-medium">{intake.reason}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Divination Section */}
        <Card className="border-amber-200">
          <CardHeader>
            <CardTitle className="text-lg font-[Rubik] text-amber-800">
              Divination / Odu Casting
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Casting Method</Label>
              <Select value={castingMethod} onValueChange={setCastingMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="opele">Ọpẹlẹ (Divining Chain)</SelectItem>
                  <SelectItem value="ikin">Ikin (Palm Nuts)</SelectItem>
                  <SelectItem value="obi">Obì (Kola Nut)</SelectItem>
                  <SelectItem value="diloggun">Dílógún (Cowrie Shells)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Odu Result</Label>
              <Select value={oduResult} onValueChange={setOduResult}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Odu" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Eji Ogbe">Éjì Ogbè</SelectItem>
                  <SelectItem value="Oyeku Meji">Òyèkú Méjì</SelectItem>
                  <SelectItem value="Iwori Meji">Ìwòrì Méjì</SelectItem>
                  <SelectItem value="Odi Meji">Òdí Méjì</SelectItem>
                  <SelectItem value="Irosun Meji">Ìrosùn Méjì</SelectItem>
                  <SelectItem value="Owonrin Meji">Ọ̀wọ́nrín Méjì</SelectItem>
                  <SelectItem value="Obara Meji">Ọ̀bàrà Méjì</SelectItem>
                  <SelectItem value="Okanran Meji">Ọ̀kànràn Méjì</SelectItem>
                  <SelectItem value="Ogunda Meji">Ògúndá Méjì</SelectItem>
                  <SelectItem value="Osa Meji">Ọ̀sá Méjì</SelectItem>
                  <SelectItem value="Ika Meji">Ìká Méjì</SelectItem>
                  <SelectItem value="Oturupon Meji">Òtúrúpọ̀n Méjì</SelectItem>
                  <SelectItem value="Otura Meji">Ọ̀tùrá Méjì</SelectItem>
                  <SelectItem value="Irete Meji">Ìrẹ̀tẹ̀ Méjì</SelectItem>
                  <SelectItem value="Ose Meji">Ọ̀ṣẹ́ Méjì</SelectItem>
                  <SelectItem value="Ofun Meji">Òfún Méjì</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Interpretation</Label>
              <Textarea
                value={interpretation}
                onChange={(e) => setInterpretation(e.target.value)}
                placeholder="Enter the interpretation of the Odu..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Prescriptions / Recommendations (one per line)</Label>
              <Textarea
                value={prescriptions}
                onChange={(e) => setPrescriptions(e.target.value)}
                placeholder="Ebó to perform&#10;Orisa to propitiate&#10;Behavioral guidance..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

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
            onClick={handleComplete}
            disabled={!castingMethod || !oduResult}
          >
            Complete Session → Summary
          </Button>
        </div>
      </div>
    </div>
  );
}