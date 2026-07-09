import { useConsult } from "../../contexts/consultContext";

export default function ConsultPayment() {
  const { state, advance } = useConsult();

  async function startPayment() {
    // Placeholder until Supabase + Stripe integration
    console.log("Redirecting to Stripe Checkout…");

    // Simulate redirect
    window.location.href = "https://checkout.stripe.com/pay/test";
  }

  async function confirmPayment() {
    // Placeholder for Supabase insert
    console.log("Payment confirmed");

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