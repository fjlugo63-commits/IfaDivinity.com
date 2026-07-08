import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TEST_ACCOUNTS = [
  {
    email: "awo_test@ifadivinity.com",
    role: "awo",
    full_name: "Awo Test",
    house_id: 1,
    is_test: true,
    status: "active",
  },
  {
    email: "client_test@ifadivinity.com",
    role: "client",
    full_name: "Client Test",
    house_id: null,
    is_test: true,
    status: "active",
  },
  {
    email: "admin_test@ifadivinity.com",
    role: "admin",
    full_name: "Admin Test",
    house_id: null,
    is_test: true,
    status: "active",
  },
  {
    email: "house_admin_test@ifadivinity.com",
    role: "house_admin",
    full_name: "House Admin Test",
    house_id: 1,
    is_test: true,
    status: "active",
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: "Server configuration error: missing environment variables" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const testSecret = Deno.env.get("TEST_ACCOUNTS_SECRET") || "ifa-test-accounts-2026";

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Handle GET - list test accounts
    if (req.method === "GET") {
      const { data: profiles, error } = await supabase
        .from("app_340b9f1944_profiles")
        .select("id, email, full_name, role, is_test, created_at")
        .eq("is_test", true)
        .order("created_at", { ascending: false });

      if (error) {
        return new Response(JSON.stringify({ error: `Failed to fetch test accounts: ${error.message}` }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, accounts: profiles || [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle POST - create test accounts
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { secret, action } = body;

    if (!secret || secret !== testSecret) {
      return new Response(JSON.stringify({ error: "Invalid test accounts secret key. Default is: ifa-test-accounts-2026" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: send-magic-link
    if (action === "send-magic-link") {
      const { email } = body;
      if (!email) {
        return new Response(JSON.stringify({ error: "Email is required for magic link" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: otpError } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email,
      });

      if (otpError) {
        return new Response(JSON.stringify({ error: `Magic link failed: ${otpError.message}` }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, message: `Magic link sent to ${email}` }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: create (default)
    const results = [];
    const defaultPassword = "TestAccount2026!";

    for (const account of TEST_ACCOUNTS) {
      try {
        // Step 1: Create auth user
        let userId = null;
        let isExisting = false;

        const createResult = await supabase.auth.admin.createUser({
          email: account.email,
          password: defaultPassword,
          email_confirm: true,
          user_metadata: { full_name: account.full_name, role: account.role },
        });

        if (createResult.error) {
          const errMsg = createResult.error.message || "";
          if (errMsg.includes("already") || errMsg.includes("exists") || errMsg.includes("registered") || errMsg.includes("duplicate")) {
            // User exists, find them
            const listResult = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
            if (!listResult.error) {
              const existingUser = listResult.data?.users?.find((u) => u.email === account.email);
              if (existingUser) {
                userId = existingUser.id;
                isExisting = true;
                // Update password
                await supabase.auth.admin.updateUserById(userId, { password: defaultPassword, email_confirm: true });
              }
            }

            if (!userId) {
              // Try profiles table
              const { data: profileData } = await supabase
                .from("app_340b9f1944_profiles")
                .select("id")
                .eq("email", account.email)
                .maybeSingle();
              if (profileData) {
                userId = profileData.id;
                isExisting = true;
              }
            }

            if (!userId) {
              results.push({ email: account.email, role: account.role, status: "error", error: `User exists but could not be found: ${errMsg}` });
              continue;
            }
          } else {
            // Try direct REST call
            try {
              const signUpResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${supabaseServiceKey}`,
                  "apikey": supabaseServiceKey,
                },
                body: JSON.stringify({
                  email: account.email,
                  password: defaultPassword,
                  email_confirm: true,
                  user_metadata: { full_name: account.full_name, role: account.role },
                }),
              });

              if (signUpResponse.ok) {
                const signUpData = await signUpResponse.json();
                userId = signUpData.id;
              } else {
                const signUpError = await signUpResponse.text();
                results.push({ email: account.email, role: account.role, status: "error", error: `Creation failed: ${signUpError}` });
                continue;
              }
            } catch (fetchErr) {
              results.push({ email: account.email, role: account.role, status: "error", error: `Creation failed: ${fetchErr.message}` });
              continue;
            }
          }
        } else {
          userId = createResult.data.user.id;
        }

        if (!userId) {
          results.push({ email: account.email, role: account.role, status: "error", error: "Could not determine user ID" });
          continue;
        }

        // Step 2: Upsert profile
        const profileData = {
          id: userId,
          email: account.email,
          full_name: account.full_name,
          role: account.role,
          is_test: true,
        };

        const { error: profileError } = await supabase
          .from("app_340b9f1944_profiles")
          .upsert(profileData, { onConflict: "id" });

        if (profileError) {
          results.push({ email: account.email, role: account.role, status: "error", error: `Profile upsert failed: ${profileError.message}` });
          continue;
        }

        // Step 3: Create role-specific records
        if (account.role === "awo") {
          const { data: houseData } = await supabase
            .from("app_340b9f1944_ifa_houses")
            .select("id")
            .limit(1)
            .maybeSingle();

          let houseId = houseData?.id || null;

          if (!houseId) {
            const { data: newHouse } = await supabase
              .from("app_340b9f1944_ifa_houses")
              .insert({
                name: "Test House of Ifa",
                description: "Default test house for development",
                location: "Test Location",
                head_awo_id: userId,
                is_active: true,
              })
              .select("id")
              .single();
            houseId = newHouse?.id || null;
          }

          if (houseId) {
            await supabase
              .from("app_340b9f1944_house_practitioners")
              .upsert({
                house_id: houseId,
                practitioner_id: userId,
                role: "awo",
                is_active: true,
              }, { onConflict: "house_id,practitioner_id" })
              .select();
          }
        } else if (account.role === "client") {
          await supabase
            .from("app_340b9f1944_clients")
            .upsert({
              user_id: userId,
              name: account.full_name,
              email: account.email,
              timezone: "America/New_York",
              status: "active",
              is_test: true,
              awo_id: "00000000-0000-0000-0000-000000000000",
            }, { onConflict: "email" })
            .select();
        } else if (account.role === "house_admin") {
          const { data: houseData } = await supabase
            .from("app_340b9f1944_ifa_houses")
            .select("id")
            .limit(1)
            .maybeSingle();

          let houseId = houseData?.id || null;

          if (!houseId) {
            const { data: newHouse } = await supabase
              .from("app_340b9f1944_ifa_houses")
              .insert({
                name: "Test House of Ifa",
                description: "Default test house for development",
                location: "Test Location",
                head_awo_id: userId,
                is_active: true,
              })
              .select("id")
              .single();
            houseId = newHouse?.id || null;
          }

          if (houseId) {
            await supabase
              .from("app_340b9f1944_house_practitioners")
              .upsert({
                house_id: houseId,
                practitioner_id: userId,
                role: "house_admin",
                is_active: true,
              }, { onConflict: "house_id,practitioner_id" })
              .select();
          }
        }

        results.push({
          email: account.email,
          role: account.role,
          status: isExisting ? "updated" : "created",
          userId,
        });
      } catch (err) {
        results.push({ email: account.email, role: account.role, status: "error", error: err.message });
      }
    }

    // Audit log
    try {
      await supabase.from("app_340b9f1944_audit_logs").insert({
        actor_id: "00000000-0000-0000-0000-000000000000",
        action: "test_accounts.seeded",
        resource: "system",
        resource_id: "test-accounts",
        metadata: { results },
      });
    } catch {
      // Non-critical
    }

    const successCount = results.filter(r => r.status === "created" || r.status === "updated").length;
    const errorCount = results.filter(r => r.status === "error").length;

    return new Response(JSON.stringify({
      success: errorCount === 0,
      message: `Test accounts setup complete: ${successCount} succeeded, ${errorCount} failed`,
      results,
      defaultPassword,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: `Server error: ${error?.message || "Unknown"}` }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});