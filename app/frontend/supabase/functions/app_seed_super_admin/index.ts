import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: "Server configuration missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const superAdminSecret = Deno.env.get("SUPER_ADMIN_SECRET") || "ifa-super-admin-2026";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, password, name, secret } = body;

    // Validate secret
    if (!secret || secret !== superAdminSecret) {
      return new Response(JSON.stringify({ error: "Invalid admin secret key" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!email || !password) {
      return new Response(JSON.stringify({ error: "Email and password are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (password.length < 6) {
      return new Response(JSON.stringify({ error: "Password must be at least 6 characters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let userId: string;
    let isExisting = false;

    // Try to find existing user by email using admin API
    const { data: userList, error: listError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (listError) {
      return new Response(JSON.stringify({ error: `Auth error: ${listError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const existingUser = userList?.users?.find((u) => u.email === email);

    if (existingUser) {
      userId = existingUser.id;
      isExisting = true;

      // Update password for existing user
      const { error: updateErr } = await supabase.auth.admin.updateUserById(userId, {
        password: password,
        email_confirm: true,
      });
      if (updateErr) {
        console.error("Password update error:", updateErr);
      }
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: name || "Super Admin", role: "admin" },
      });

      if (createError) {
        return new Response(JSON.stringify({ error: `Create user failed: ${createError.message}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      userId = newUser.user.id;
    }

    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from("app_340b9f1944_profiles")
      .select("id")
      .eq("id", userId)
      .single();

    if (existingProfile) {
      // Update existing profile
      const { error: updateError } = await supabase
        .from("app_340b9f1944_profiles")
        .update({
          full_name: name || "Super Admin",
          role: "admin",
          verified_egbo: true,
          bio: "Platform Super Administrator - Full access to all roles and permissions",
        })
        .eq("id", userId);

      if (updateError) {
        return new Response(JSON.stringify({ error: `Profile update failed: ${updateError.message}` }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      // Insert new profile
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
        return new Response(JSON.stringify({ error: `Profile insert failed: ${insertError.message}` }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Log the action
    try {
      await supabase.from("app_340b9f1944_audit_logs").insert({
        actor_id: userId,
        action: "super_admin.created",
        resource: "profiles",
        resource_id: userId,
        metadata: { email, elevated: isExisting },
      });
    } catch {
      // Non-critical, continue
    }

    return new Response(JSON.stringify({
      success: true,
      message: isExisting
        ? "Existing user elevated to Super Admin successfully!"
        : "Super Admin account created successfully!",
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
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Super admin seed error:", error);
    return new Response(JSON.stringify({ error: `Unexpected error: ${error.message}` }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});