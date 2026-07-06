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
      return new Response(JSON.stringify({ error: "Stripe not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify webhook signature
    const body = await req.text();
    const signature = req.headers.get("stripe-signature")!;

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle checkout.session.completed
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const { order_id, service_type, booking_id } = session.metadata || {};

      if (!order_id) {
        console.error("No order_id in session metadata");
        return new Response(JSON.stringify({ error: "Missing order_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update order status to paid
      const { error: orderError } = await supabase
        .from("app_340b9f1944_orders")
        .update({
          status: "paid",
          stripe_payment_intent_id: session.payment_intent as string,
        })
        .eq("id", order_id);

      if (orderError) {
        console.error("Failed to update order:", orderError);
        throw orderError;
      }

      // If Egbo service, finalize booking
      if (service_type === "egbo") {
        if (booking_id) {
          // Update tentative booking to scheduled
          const { error: bookingError } = await supabase
            .from("app_340b9f1944_bookings")
            .update({
              status: "scheduled",
              meeting_url: `https://meet.jit.si/ifa-egbo-${order_id.slice(0, 8)}`,
            })
            .eq("id", booking_id);

          if (bookingError) {
            console.error("Failed to finalize booking:", bookingError);
          }
        } else {
          // Create booking atomically if none existed
          const { data: orderItems } = await supabase
            .from("app_340b9f1944_order_items")
            .select("product_id, seller_id, price")
            .eq("order_id", order_id);

          const { data: order } = await supabase
            .from("app_340b9f1944_orders")
            .select("buyer_id")
            .eq("id", order_id)
            .single();

          if (orderItems && order) {
            const egboItem = orderItems[0]; // First item for booking
            await supabase.from("app_340b9f1944_bookings").insert({
              client_id: order.buyer_id,
              practitioner_id: egboItem.seller_id,
              product_id: egboItem.product_id,
              service_type: "egbo",
              scheduled_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Default: 1 week out
              duration_minutes: 90,
              price: egboItem.price,
              status: "scheduled",
              meeting_url: `https://meet.jit.si/ifa-egbo-${order_id.slice(0, 8)}`,
              notes: `Auto-created from order ${order_id}`,
            });
          }
        }
      }

      // Update stock for physical products
      const { data: orderItems } = await supabase
        .from("app_340b9f1944_order_items")
        .select("product_id, quantity")
        .eq("order_id", order_id);

      if (orderItems) {
        for (const item of orderItems) {
          if (item.product_id) {
            const { data: product } = await supabase
              .from("app_340b9f1944_products")
              .select("stock_quantity, is_digital")
              .eq("id", item.product_id)
              .single();

            if (product && !product.is_digital && product.stock_quantity !== null) {
              await supabase
                .from("app_340b9f1944_products")
                .update({ stock_quantity: Math.max(0, product.stock_quantity - item.quantity) })
                .eq("id", item.product_id);
            }
          }
        }
      }

      // Audit log
      await supabase.from("app_340b9f1944_audit_logs").insert({
        actor_id: null,
        action: "order.completed",
        resource: "orders",
        resource_id: order_id,
        metadata: { service_type, booking_id, payment_intent: session.payment_intent },
      });

      console.log(`Order ${order_id} completed. Service type: ${service_type}`);
    }

    // Handle payment_intent.payment_failed
    if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.error("Payment failed:", paymentIntent.id, paymentIntent.last_payment_error?.message);

      // Audit log for failed payment
      await supabase.from("app_340b9f1944_audit_logs").insert({
        actor_id: null,
        action: "order.payment_failed",
        resource: "payments",
        resource_id: paymentIntent.id,
        metadata: { error: paymentIntent.last_payment_error?.message },
      });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});