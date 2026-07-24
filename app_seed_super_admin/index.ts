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
    if (!supabaseUrl || !supabaseServiceKey) { return new Response(JSON.stringify({ error: "Server configuration error" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }

    const superAdminSecret = Deno.env.get("SUPER_ADMIN_SECRET") || "ifa-super-admin-2026";
    const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } });

    let body;
    try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }

    const { email, password, name, secret } = body;
    if (!secret || secret !== superAdminSecret) { return new Response(JSON.stringify({ error: "Invalid admin secret key" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
    if (!email || !password) { return new Response(JSON.stringify({ error: "Email and password are required" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
    if (password.length < 6) { return new Response(JSON.stringify({ error: "Password must be at least 6 characters" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }

    let userId: string | null = null;
    let isExisting = false;

    const createResult = await supabase.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: name || "Super Admin", role: "admin" } });

    if (createResult.error) {
      const errMsg = createResult.error.message || "";
      if (errMsg.includes("already") || errMsg.includes("exists") || errMsg.includes("registered") || errMsg.includes("duplicate")) {
        const listResult = await supabase.auth.admin.listUsers({ page: 1, perPage: 100 });
        if (!listResult.error) {
          const existingUser = listResult.data?.users?.find((u: any) => u.email === email);
          if (existingUser) { userId = existingUser.id; isExisting = true; await supabase.auth.admin.updateUserById(userId, { password, email_confirm: true }); }
        }
        if (!userId) {
          const { data: profileData } = await supabase.from("app_340b9f1944_profiles").select("id").eq("email", email).maybeSingle();
          if (profileData) { userId = profileData.id; isExisting = true; }
          else { return new Response(JSON.stringify({ error: `User exists but cannot be found: ${errMsg}` }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
        }
      } else {
        return new Response(JSON.stringify({ error: `Failed to create user: ${errMsg}` }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    } else { userId = createResult.data.user.id; }

    if (!userId) { return new Response(JSON.stringify({ error: "Could not determine user ID" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }

    const { data: existingProfile } = await supabase.from("app_340b9f1944_profiles").select("id").eq("id", userId).maybeSingle();
    if (existingProfile) {
      await supabase.from("app_340b9f1944_profiles").update({ full_name: name || "Super Admin", role: "admin", verified_egbo: true, bio: "Platform Super Administrator" }).eq("id", userId);
    } else {
      await supabase.from("app_340b9f1944_profiles").insert({ id: userId, email, full_name: name || "Super Admin", role: "admin", verified_egbo: true, bio: "Platform Super Administrator" });
    }

    return new Response(JSON.stringify({ success: true, message: isExisting ? `Existing user elevated to Super Admin` : `Super Admin created for ${email}`, userId, email }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: `Server error: ${error?.message || "Unknown"}` }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});