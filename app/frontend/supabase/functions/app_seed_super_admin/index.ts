import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Super Admin Seed Function
 * 
 * Creates or elevates a user to super admin with all permissions.
 * Protected by a SUPER_ADMIN_SECRET environment variable.
 * 
 * POST body: { email, password, name, secret }
 * - If user exists: elevates to admin + verified_egbo
 * - If user doesn't exist: creates user and sets admin role
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const superAdminSecret = Deno.env.get("SUPER_ADMIN_SECRET") || "ifa-super-admin-2026";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email, password, name, secret } = await req.json();

    // Validate secret
    if (secret !== superAdminSecret) {
      return new Response(JSON.stringify({ error: "Invalid secret" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!email || !password) {
      return new Response(JSON.stringify({ error: "Email and password required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u: any) => u.email === email);

    let userId: string;

    if (existingUser) {
      // User exists - just elevate
      userId = existingUser.id;
    } else {
      // Create new user with confirmed email
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: name || "Super Admin", role: "admin" },
      });

      if (createError) {
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      userId = newUser.user.id;
    }

    // Elevate profile to super admin with all permissions
    const { error: profileError } = await supabase
      .from("app_340b9f1944_profiles")
      .upsert({
        id: userId,
        email: email,
        full_name: name || "Super Admin",
        role: "admin",
        verified_egbo: true,
        bio: "Platform Super Administrator - Full access to all roles and permissions",
      }, { onConflict: "id" });

    if (profileError) {
      // Profile might not exist yet if trigger hasn't fired
      const { error: insertError } = await supabase
        .from("app_340b9f1944_profiles")
        .insert({
          id: userId,
          email: email,
          full_name: name || "Super Admin",
          role: "admin",
          verified_egbo: true,
          bio: "Platform Super Administrator - Full access to all roles and permissions",
        });

      if (insertError) {
        return new Response(JSON.stringify({ error: `Profile update failed: ${insertError.message}` }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Audit log
    await supabase.from("app_340b9f1944_audit_logs").insert({
      actor_id: userId,
      action: "super_admin.created",
      resource: "profiles",
      resource_id: userId,
      metadata: { email, elevated: !!existingUser },
    });

    return new Response(JSON.stringify({
      success: true,
      message: existingUser ? "Existing user elevated to Super Admin" : "Super Admin account created",
      userId,
      email,
      permissions: {
        role: "admin",
        verified_egbo: true,
        can_manage_users: true,
        can_manage_orders: true,
        can_verify_sellers: true,
        can_issue_refunds: true,
        can_create_products: true,
        can_create_egbo_services: true,
        can_view_audit_logs: true,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Super admin seed error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});