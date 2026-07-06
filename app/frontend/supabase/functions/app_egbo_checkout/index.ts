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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

    if (!stripeSecretKey) {
      return new Response(JSON.stringify({ error: "Stripe not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });

    // Get auth user from request
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!).auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { items, booking_selection } = await req.json();

    if (!items || items.length === 0) {
      return new Response(JSON.stringify({ error: "No items provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate total
    const totalAmount = items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);

    // Determine if this is an Egbo service order
    let serviceType: string | null = null;
    if (items.some((item: any) => item.service_type === "egbo")) {
      serviceType = "egbo";
    }

    // Create order
    const { data: order, error: orderError } = await supabase
      .from("app_340b9f1944_orders")
      .insert({
        buyer_id: user.id,
        status: "pending",
        total_amount: totalAmount,
        currency: "USD",
        notes: serviceType ? `Egbo service order` : null,
      })
      .select("id")
      .single();

    if (orderError) throw orderError;

    // Create order items
    const orderItems = items.map((item: any) => ({
      order_id: order.id,
      product_id: item.product_id,
      seller_id: item.seller_id,
      title: item.title,
      quantity: item.quantity,
      price: item.price,
    }));

    const { error: itemsError } = await supabase
      .from("app_340b9f1944_order_items")
      .insert(orderItems);

    if (itemsError) throw itemsError;

    // If booking selection exists, create tentative booking
    let bookingId: string | null = null;
    if (booking_selection && serviceType === "egbo") {
      const { data: booking, error: bookingError } = await supabase
        .from("app_340b9f1944_bookings")
        .insert({
          client_id: user.id,
          practitioner_id: booking_selection.practitioner_id,
          product_id: booking_selection.product_id,
          service_type: "egbo",
          scheduled_at: booking_selection.scheduled_at,
          duration_minutes: booking_selection.duration_minutes || 90,
          price: booking_selection.price,
          status: "pending_reservation",
          notes: `Order: ${order.id}`,
        })
        .select("id")
        .single();

      if (bookingError) throw bookingError;
      bookingId = booking.id;
    }

    // Create Stripe Checkout Session
    const lineItems = items.map((item: any) => ({
      price_data: {
        currency: "usd",
        product_data: { name: item.title },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${req.headers.get("origin")}/orders?success=true`,
      cancel_url: `${req.headers.get("origin")}/cart?cancelled=true`,
      metadata: {
        order_id: order.id,
        service_type: serviceType || "product",
        booking_id: bookingId || "",
      },
    });

    // Update order with stripe session id
    await supabase
      .from("app_340b9f1944_orders")
      .update({ stripe_session_id: session.id })
      .eq("id", order.id);

    // Audit log
    await supabase.from("app_340b9f1944_audit_logs").insert({
      actor_id: user.id,
      action: "order.created",
      resource: "orders",
      resource_id: order.id,
      metadata: { service_type: serviceType, item_count: items.length, booking_id: bookingId },
    });

    return new Response(JSON.stringify({ sessionId: session.id, orderId: order.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});