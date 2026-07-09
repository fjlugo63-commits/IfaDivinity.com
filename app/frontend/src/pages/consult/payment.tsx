import { supabase } from "../../lib/supabaseClient";
import { useConsult } from "../../contexts/consultContext";

export default function ConsultPayment() {
  const { state, advance } = useConsult();
  const sessionId = state.sessionId;

  async function startPayment() {
    console.log("Redirecting to Stripe Checkout…");
    window.location.href = "https://checkout.stripe.com/pay/test";
  }

  async function confirmPayment() {
    await supabase.from("consult_payments").insert({
      session_id: sessionId,
      stripe_payment_intent: "test_intent",
      amount: 50,
      status: "paid"
    });

    advance(); // Move to COMPLETE
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">Consult Payment</h1>

      <p className="mt-4">Your consultation is ready for payment.</p>

      <button onClick={startPayment} className="mt-4">
        Pay with Stripe
      </button>

      <button onClick={confirmPayment} className="ml-4">
        Confirm Payment
      </button>
    </div>
  );
}