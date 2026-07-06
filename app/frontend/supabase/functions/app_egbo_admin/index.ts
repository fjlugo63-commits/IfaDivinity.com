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
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin auth
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await createClient(supabaseUrl, supabaseAnonKey).auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: profile } = await supabase
      .from("app_340b9f1944_profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const path = url.pathname.split("/").filter(Boolean);
    const body = req.method !== "GET" ? await req.json() : {};

    // Route: POST /verify-seller
    if (req.method === "POST" && path.includes("verify-seller")) {
      const { seller_id, verified } = body;
      if (!seller_id) {
        return new Response(JSON.stringify({ error: "seller_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabase
        .from("app_340b9f1944_profiles")
        .update({ verified_egbo: verified !== false })
        .eq("id", seller_id);

      if (error) throw error;

      // Audit log
      await supabase.from("app_340b9f1944_audit_logs").insert({
        actor_id: user.id,
        action: verified !== false ? "seller.verified" : "seller.unverified",
        resource: "profiles",
        resource_id: seller_id,
        metadata: { verified_egbo: verified !== false },
      });

      return new Response(JSON.stringify({ success: true, verified: verified !== false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Route: POST /refund-order
    if (req.method === "POST" && path.includes("refund-order")) {
      const { order_id } = body;
      if (!order_id) {
        return new Response(JSON.stringify({ error: "order_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get order
      const { data: order, error: orderError } = await supabase
        .from("app_340b9f1944_orders")
        .select("*")
        .eq("id", order_id)
        .single();

      if (orderError || !order) {
        return new Response(JSON.stringify({ error: "Order not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Process Stripe refund if payment intent exists
      if (order.stripe_payment_intent_id) {
        const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
        if (stripeSecretKey) {
          const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });
          await stripe.refunds.create({
            payment_intent: order.stripe_payment_intent_id,
          });
        }
      }

      // Update order status
      const { error: updateError } = await supabase
        .from("app_340b9f1944_orders")
        .update({ status: "refunded" })
        .eq("id", order_id);

      if (updateError) throw updateError;

      // Cancel associated bookings
      await supabase
        .from("app_340b9f1944_bookings")
        .update({ status: "cancelled" })
        .eq("notes", `Order: ${order_id}`);

      // Audit log
      await supabase.from("app_340b9f1944_audit_logs").insert({
        actor_id: user.id,
        action: "order.refunded",
        resource: "orders",
        resource_id: order_id,
        metadata: { total_amount: order.total_amount, payment_intent: order.stripe_payment_intent_id },
      });

      return new Response(JSON.stringify({ success: true, refunded: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Route: GET /pending-sellers - list sellers pending verification
    if (req.method === "GET" || path.includes("pending-sellers")) {
      const { data: sellers, error: sellersError } = await supabase
        .from("app_340b9f1944_profiles")
        .select("*")
        .eq("role", "seller")
        .order("created_at", { ascending: false });

      if (sellersError) throw sellersError;

      return new Response(JSON.stringify({ sellers: sellers || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown route" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Admin endpoint error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});