import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Plus } from "lucide-react";

interface ConsultRecord {
  id: string;
  intake: {
    clientName: string;
    email: string;
    consultType: string;
    reason: string;
  };
  oduCast: {
    method: string;
    oduCode: string;
    interpretation?: string;
    prescriptions?: string[];
  };
  payment: {
    id: string;
    amount: number;
    status: string;
  };
  completedAt: string;
}

export default function ConsultHistory() {
  const navigate = useNavigate();
  const [history, setHistory] = useState<ConsultRecord[]>([]);

  useEffect(() => {
    const stored = sessionStorage.getItem("consultHistory");
    if (stored) {
      setHistory(JSON.parse(stored));
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between py-4">
          <div>
            <h1 className="text-2xl font-bold text-indigo-800 font-[Rubik]">
              Consultation History
            </h1>
            <p className="text-gray-600 text-sm mt-1">
              {history.length} completed session{history.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Button
            className="bg-indigo-700 hover:bg-indigo-800 text-white"
            onClick={() => navigate("/consult/intake")}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Consultation
          </Button>
        </div>

        {/* History List */}
        {history.length === 0 ? (
          <Card className="border-gray-200">
            <CardContent className="py-12 text-center">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No consultations yet</p>
              <p className="text-gray-400 text-sm mt-1">
                Start a new consultation to see it here.
              </p>
              <Button
                className="mt-4 bg-indigo-700 hover:bg-indigo-800 text-white"
                onClick={() => navigate("/consult/intake")}
              >
                Start First Consultation
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {history
              .slice()
              .reverse()
              .map((record) => (
                <Card key={record.id} className="border-gray-200 hover:border-indigo-200 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-[Rubik] text-indigo-800">
                        {record.intake.clientName}
                      </CardTitle>
                      <Badge className="bg-green-100 text-green-800">Completed</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500 block">Type</span>
                        <span className="font-medium capitalize">
                          {record.intake.consultType?.replace("-", " ")}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Odu</span>
                        <span className="font-medium">{record.oduCast.oduCode}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Method</span>
                        <span className="font-medium capitalize">{record.oduCast.method}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Payment</span>
                        <span className="font-medium">
                          ${(record.payment.amount / 100).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t text-xs text-gray-400">
                      Completed: {new Date(record.completedAt).toLocaleString()}
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