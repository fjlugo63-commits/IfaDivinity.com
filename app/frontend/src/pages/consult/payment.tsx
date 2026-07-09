import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, CheckCircle } from "lucide-react";

interface IntakeData {
  clientName: string;
  email: string;
  consultType: string;
}

const CONSULT_PRICES: Record<string, number> = {
  "ifa-reading": 75,
  "orisa-consultation": 60,
  "spiritual-guidance": 50,
  "ebo-prescription": 85,
  "follow-up": 40,
};

export default function ConsultPayment() {
  const navigate = useNavigate();
  const [intake, setIntake] = useState<IntakeData | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "processing" | "complete">("pending");

  useEffect(() => {
    const stored = sessionStorage.getItem("consultIntake");
    if (stored) {
      setIntake(JSON.parse(stored));
    } else {
      navigate("/consult/intake");
    }
  }, [navigate]);

  const price = intake ? (CONSULT_PRICES[intake.consultType] || 50) : 50;

  const handlePayment = () => {
    setPaymentStatus("processing");
    // Simulate Stripe payment processing
    setTimeout(() => {
      const paymentIntent = {
        id: `pi_${Date.now()}`,
        status: "succeeded",
        amount: price * 100,
        currency: "usd",
        created: new Date().toISOString(),
      };
      sessionStorage.setItem("consultPaymentIntent", JSON.stringify(paymentIntent));
      setPaymentStatus("complete");
    }, 2000);
  };

  const handleFinish = () => {
    // Save to history
    const history = JSON.parse(sessionStorage.getItem("consultHistory") || "[]");
    history.push({
      id: `consult_${Date.now()}`,
      intake: JSON.parse(sessionStorage.getItem("consultIntake") || "{}"),
      oduCast: JSON.parse(sessionStorage.getItem("consultOduCast") || "{}"),
      payment: JSON.parse(sessionStorage.getItem("consultPaymentIntent") || "{}"),
      completedAt: new Date().toISOString(),
    });
    sessionStorage.setItem("consultHistory", JSON.stringify(history));

    // Clean up session data
    sessionStorage.removeItem("consultIntake");
    sessionStorage.removeItem("consultOduCast");
    sessionStorage.removeItem("consultEngineResult");
    sessionStorage.removeItem("consultPaymentIntent");

    navigate("/consult/history");
  };

  if (!intake) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-indigo-200">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-indigo-800 font-[Rubik]">
            Consultation Payment
          </CardTitle>
          <CardDescription>
            Complete payment for your consultation session
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Order Summary */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h3 className="font-medium text-gray-800">Order Summary</h3>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Client</span>
              <span className="font-medium">{intake.clientName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Service</span>
              <span className="font-medium capitalize">{intake.consultType.replace("-", " ")}</span>
            </div>
            <div className="border-t pt-2 flex justify-between">
              <span className="font-medium text-gray-800">Total</span>
              <span className="font-bold text-indigo-800 text-lg">${price}.00</span>
            </div>
          </div>

          {/* Payment Status */}
          {paymentStatus === "pending" && (
            <Button
              className="w-full bg-indigo-700 hover:bg-indigo-800 text-white h-12"
              onClick={handlePayment}
            >
              <CreditCard className="w-5 h-5 mr-2" />
              Pay ${price}.00 (Test Mode)
            </Button>
          )}

          {paymentStatus === "processing" && (
            <div className="text-center py-4">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-600 text-sm">Processing payment...</p>
            </div>
          )}

          {paymentStatus === "complete" && (
            <div className="space-y-4">
              <div className="text-center py-4 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle className="w-10 h-10 text-green-600 mx-auto mb-2" />
                <p className="font-medium text-green-800">Payment Successful!</p>
                <Badge className="mt-2 bg-green-100 text-green-800">
                  ${price}.00 USD
                </Badge>
              </div>
              <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                onClick={handleFinish}
              >
                Complete & View History
              </Button>
            </div>
          )}

          {/* Back button */}
          {paymentStatus === "pending" && (
            <Button
              variant="ghost"
              className="w-full text-gray-500"
              onClick={() => navigate("/consult/summary")}
            >
              ← Back to Summary
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}