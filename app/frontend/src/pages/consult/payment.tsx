import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase, TABLES } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useConsult } from "@/contexts/consultContext";

/**
 * ConsultPayment page
 * 
 * Handles payment for a completed consultation.
 * Uses consultation_id from URL params to link payment records.
 * Writes to the consultations table (TABLES.consultations) for payment status tracking.
 */
export default function ConsultPayment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { advance } = useConsult();

  const consultationId = searchParams.get("id") || "";
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "processing" | "paid" | "error">("pending");

  async function startPayment() {
    setPaymentStatus("processing");
    // In production, this would redirect to Stripe Checkout
    // For now, simulate the payment flow
    console.log("Redirecting to Stripe Checkout for consultation:", consultationId);
    
    // Simulate Stripe redirect (in production: window.location.href = stripeCheckoutUrl)
    setTimeout(() => {
      setPaymentStatus("paid");
    }, 1500);
  }

  async function confirmPayment() {
    try {
      // Update the consultation record status or create a payment record
      // Using the consultations table to track payment status
      if (consultationId) {
        await supabase
          .from(TABLES.consultations)
          .update({ status: "paid" })
          .eq("id", consultationId);
      }

      advance(); // Move to COMPLETE state
      navigate("/consult/history");
    } catch (err) {
      console.error("Payment confirmation error:", err);
      setPaymentStatus("error");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-lg border-amber-200">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-[Rubik] text-indigo-800">
            Consultation Payment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-gray-600 mb-2">Your consultation is ready for payment.</p>
            <Badge
              variant="outline"
              className={
                paymentStatus === "paid"
                  ? "border-green-500 text-green-700"
                  : paymentStatus === "processing"
                  ? "border-amber-500 text-amber-700"
                  : paymentStatus === "error"
                  ? "border-red-500 text-red-700"
                  : "border-gray-400 text-gray-600"
              }
            >
              {paymentStatus === "paid"
                ? "Payment Complete"
                : paymentStatus === "processing"
                ? "Processing…"
                : paymentStatus === "error"
                ? "Payment Error"
                : "Awaiting Payment"}
            </Badge>
          </div>

          {/* Amount display */}
          <div className="bg-indigo-50 rounded-lg p-4 text-center border border-indigo-100">
            <p className="text-sm text-indigo-600 uppercase tracking-wide">Amount Due</p>
            <p className="text-3xl font-bold text-indigo-900 mt-1">$50.00</p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            {paymentStatus === "pending" && (
              <Button
                className="w-full bg-indigo-700 hover:bg-indigo-800 text-white"
                onClick={startPayment}
              >
                Pay with Stripe
              </Button>
            )}

            {paymentStatus === "paid" && (
              <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                onClick={confirmPayment}
              >
                Confirm & Complete
              </Button>
            )}

            {paymentStatus === "error" && (
              <Button
                className="w-full bg-red-600 hover:bg-red-700 text-white"
                onClick={() => setPaymentStatus("pending")}
              >
                Try Again
              </Button>
            )}

            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate(`/consult/summary?id=${consultationId}`)}
            >
              Back to Summary
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}