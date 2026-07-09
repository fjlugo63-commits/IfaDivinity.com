import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, ArrowRight } from "lucide-react";

interface ConsultEngineResult {
  activeTab: { title: string | null; url: string | null; tabId: string | null };
  phases: {
    intake: { status: string; data: unknown; gaps: string[] };
    divination: { status: string; data: unknown; gaps: string[] };
    payment: { status: string; data: unknown; gaps: string[] };
    storage: { status: string; gaps: string[] };
    deployment: { status: string; gaps: string[] };
  };
  environment: {
    stripeTabOpen: boolean;
    supabaseTabOpen: boolean;
    githubTabOpen: boolean;
    vercelTabOpen: boolean;
  };
  consultReady: boolean;
  gaps: string[];
}

export default function ConsultSummary() {
  const navigate = useNavigate();
  const [result, setResult] = useState<ConsultEngineResult | null>(null);
  const [intake, setIntake] = useState<Record<string, string> | null>(null);
  const [oduCast, setOduCast] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const engineData = sessionStorage.getItem("consultEngineResult");
    const intakeData = sessionStorage.getItem("consultIntake");
    const oduData = sessionStorage.getItem("consultOduCast");

    if (engineData) setResult(JSON.parse(engineData));
    if (intakeData) setIntake(JSON.parse(intakeData));
    if (oduData) setOduCast(JSON.parse(oduData));

    if (!engineData && !intakeData) {
      navigate("/consult/intake");
    }
  }, [navigate]);

  if (!result && !intake) return null;

  const phases = result?.phases;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center py-4">
          <h1 className="text-2xl font-bold text-indigo-800 font-[Rubik]">
            Consultation Summary
          </h1>
          <p className="text-gray-600 mt-1">Review the session details before proceeding to payment.</p>
        </div>

        {/* Readiness Status */}
        {result && (
          <Card className={`border-2 ${result.consultReady ? "border-green-300 bg-green-50" : "border-amber-300 bg-amber-50"}`}>
            <CardContent className="py-4 flex items-center gap-3">
              {result.consultReady ? (
                <>
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <span className="font-medium text-green-800">Consultation is ready for payment</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                  <div>
                    <span className="font-medium text-amber-800">Some items need attention</span>
                    <ul className="text-sm text-amber-700 mt-1 list-disc list-inside">
                      {result.gaps.map((gap, i) => (
                        <li key={i}>{gap}</li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Client Details */}
        {intake && (
          <Card className="border-indigo-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-[Rubik] text-indigo-800">Client Details</CardTitle>
                <Badge className="bg-green-100 text-green-800">Complete</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-gray-500">Name</dt>
                  <dd className="font-medium">{intake.clientName}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Email</dt>
                  <dd className="font-medium">{intake.email}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Type</dt>
                  <dd className="font-medium capitalize">{intake.consultType?.replace("-", " ")}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Reason</dt>
                  <dd className="font-medium">{intake.reason}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        )}

        {/* Divination Results */}
        {oduCast && (
          <Card className="border-amber-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-[Rubik] text-amber-800">Divination Results</CardTitle>
                <Badge className="bg-green-100 text-green-800">Complete</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <dt className="text-gray-500">Method</dt>
                    <dd className="font-medium capitalize">{String(oduCast.method)}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Odu</dt>
                    <dd className="font-medium">{String(oduCast.oduCode)}</dd>
                  </div>
                </div>
                {oduCast.interpretation && (
                  <div>
                    <dt className="text-gray-500">Interpretation</dt>
                    <dd className="font-medium mt-1">{String(oduCast.interpretation)}</dd>
                  </div>
                )}
                {Array.isArray(oduCast.prescriptions) && oduCast.prescriptions.length > 0 && (
                  <div>
                    <dt className="text-gray-500">Prescriptions</dt>
                    <dd className="mt-1">
                      <ul className="list-disc list-inside space-y-1">
                        {(oduCast.prescriptions as string[]).map((p, i) => (
                          <li key={i} className="font-medium">{p}</li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        )}

        {/* Phase Status */}
        {phases && (
          <Card className="border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-[Rubik] text-gray-800">Phase Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(phases).map(([key, phase]) => (
                  <div key={key} className="flex items-center justify-between py-2 border-b last:border-0">
                    <span className="capitalize text-sm font-medium">{key}</span>
                    <Badge
                      variant="outline"
                      className={
                        phase.status === "complete" || phase.status === "ready"
                          ? "border-green-500 text-green-700"
                          : phase.status === "missing"
                            ? "border-red-400 text-red-600"
                            : "border-amber-400 text-amber-700"
                      }
                    >
                      {phase.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => navigate("/consult/session")}>
            Back to Session
          </Button>
          <Button
            className="bg-indigo-700 hover:bg-indigo-800 text-white"
            onClick={() => navigate("/consult/payment")}
          >
            Proceed to Payment <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}