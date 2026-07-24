import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@13.10.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!stripeSecretKey || !webhookSecret) {
      return new Response(JSON.stringify({ error: "Stripe not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.text();
    const signature = req.headers.get("stripe-signature")!;

    let event: Stripe.Event;
    try { event = stripe.webhooks.constructEvent(body, signature, webhookSecret); }
    catch (err) { return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const { order_id, service_type, booking_id } = session.metadata || {};
      if (!order_id) { return new Response(JSON.stringify({ error: "Missing order_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }

      await supabase.from("app_340b9f1944_orders").update({ status: "paid", stripe_payment_intent_id: session.payment_intent as string }).eq("id", order_id);

      const { data: order } = await supabase.from("app_340b9f1944_orders").select("*, buyer:buyer_id(id, email, full_name)").eq("id", order_id).single();
      const { data: orderItems } = await supabase.from("app_340b9f1944_order_items").select("*, seller:seller_id(id, email, full_name)").eq("order_id", order_id);

      if (service_type === "egbo") {
        if (booking_id) {
          await supabase.from("app_340b9f1944_bookings").update({ status: "scheduled", meeting_url: `https://meet.jit.si/ifa-egbo-${order_id.slice(0, 8)}` }).eq("id", booking_id);
        } else if (orderItems && order) {
          const egboItem = orderItems[0];
          await supabase.from("app_340b9f1944_bookings").insert({ client_id: order.buyer_id, practitioner_id: egboItem.seller_id, product_id: egboItem.product_id, service_type: "egbo", scheduled_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), duration_minutes: 90, price: egboItem.price, status: "scheduled", meeting_url: `https://meet.jit.si/ifa-egbo-${order_id.slice(0, 8)}`, notes: `Auto-created from order ${order_id}` });
        }
      }

      if (orderItems) {
        for (const item of orderItems) {
          if (item.product_id) {
            const { data: product } = await supabase.from("app_340b9f1944_products").select("stock_quantity, is_digital, service_type").eq("id", item.product_id).single();
            if (product && !product.is_digital && product.service_type !== "egbo" && product.stock_quantity !== null) {
              await supabase.from("app_340b9f1944_products").update({ stock_quantity: Math.max(0, product.stock_quantity - item.quantity) }).eq("id", item.product_id);
            }
          }
        }
      }

      await supabase.from("app_340b9f1944_audit_logs").insert({ actor_id: null, action: "order.completed", resource: "orders", resource_id: order_id, metadata: { service_type, booking_id, payment_intent: session.payment_intent } });
    }

    if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      await supabase.from("app_340b9f1944_audit_logs").insert({ actor_id: null, action: "order.payment_failed", resource: "payments", resource_id: paymentIntent.id, metadata: { error: paymentIntent.last_payment_error?.message } });
    }

    return new Response(JSON.stringify({ received: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});