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
      return new Response(JSON.stringify({ error: "Server configuration error: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const superAdminSecret = Deno.env.get("SUPER_ADMIN_SECRET") || "ifa-super-admin-2026";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body. Please provide email, password, name, and secret." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, password, name, secret } = body;

    // Validate secret
    if (!secret || secret !== superAdminSecret) {
      return new Response(JSON.stringify({ error: "Invalid admin secret key. The default is: ifa-super-admin-2026" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!email || !password) {
      return new Response(JSON.stringify({ error: "Email and password are required" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (password.length < 6) {
      return new Response(JSON.stringify({ error: "Password must be at least 6 characters" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let userId: string;
    let isExisting = false;

    // First, try to create the user. If it fails with "already registered", we know they exist.
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name || "Super Admin", role: "admin" },
    });

    if (createError) {
      // Check if user already exists
      if (createError.message.toLowerCase().includes("already") || 
          createError.message.toLowerCase().includes("exists") ||
          createError.message.toLowerCase().includes("registered") ||
          createError.status === 422) {
        
        // User exists - find them via getUserByEmail (available in newer supabase-js)
        // Fallback: try listing users with a filter
        const { data: userList, error: listErr } = await supabase.auth.admin.listUsers({
          page: 1,
          perPage: 50,
        });

        if (listErr) {
          return new Response(JSON.stringify({ 
            error: `User already exists but could not look them up: ${listErr.message}. Try signing in with your existing credentials, then use the SQL elevation method instead.`
          }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const existingUser = userList?.users?.find((u: any) => u.email === email);
        if (!existingUser) {
          return new Response(JSON.stringify({ 
            error: "User appears to exist but could not be found. Please try a different email or use the SQL elevation method."
          }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        userId = existingUser.id;
        isExisting = true;

        // Update password
        const { error: updateErr } = await supabase.auth.admin.updateUserById(userId, {
          password: password,
          email_confirm: true,
        });
        if (updateErr) {
          console.error("Password update warning:", updateErr.message);
        }
      } else {
        return new Response(JSON.stringify({ error: `Failed to create user: ${createError.message}` }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      userId = newUser.user.id;
    }

    // Now handle the profile - check if it exists first
    const { data: existingProfile } = await supabase
      .from("app_340b9f1944_profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (existingProfile) {
      // Update existing profile to admin
      const { error: updateError } = await supabase
        .from("app_340b9f1944_profiles")
        .update({
          full_name: name || "Super Admin",
          role: "admin",
          verified_egbo: true,
          bio: "Platform Super Administrator",
        })
        .eq("id", userId);

      if (updateError) {
        return new Response(JSON.stringify({ error: `Profile update failed: ${updateError.message}` }), {
          status: 200,
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
          bio: "Platform Super Administrator",
        });

      if (insertError) {
        return new Response(JSON.stringify({ error: `Profile insert failed: ${insertError.message}` }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Log the action (non-critical)
    try {
      await supabase.from("app_340b9f1944_audit_logs").insert({
        actor_id: userId,
        action: "super_admin.created",
        resource: "profiles",
        resource_id: userId,
        metadata: { email, elevated: isExisting },
      });
    } catch {
      // Non-critical
    }

    return new Response(JSON.stringify({
      success: true,
      message: isExisting
        ? `Existing user (${email}) elevated to Super Admin successfully!`
        : `Super Admin account created successfully for ${email}!`,
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
    return new Response(JSON.stringify({ error: `Unexpected server error: ${error.message || "Unknown error"}` }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});