import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization")!;

    const supabase = createClient(supabaseUrl, supabaseKey, { global: { headers: { Authorization: authHeader } } });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: profile } = await supabase.from("app_340b9f1944_profiles").select("role").eq("id", user.id).single();
    if (!profile || (profile.role !== "seller" && profile.role !== "admin")) {
      return new Response(JSON.stringify({ error: "Only Awo practitioners can manage notes and summaries" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const consultationId = url.searchParams.get("consultation_id");

    if (req.method === "GET") {
      if (action === "consultation-notes" && consultationId) {
        const { data, error } = await supabase.from("app_340b9f1944_consultation_notes").select("*").eq("consultation_id", consultationId).single();
        if (error && error.code !== "PGRST116") { return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
        return new Response(JSON.stringify({ note: data || null }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (action === "consultation-summary" && consultationId) {
        const { data, error } = await supabase.from("app_340b9f1944_consultation_summary").select("*").eq("consultation_id", consultationId).single();
        if (error && error.code !== "PGRST116") { return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
        return new Response(JSON.stringify({ summary: data || null }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (action === "generate-summary" && consultationId) {
        const { data: oduData } = await supabase.from("app_340b9f1944_consultation_odu").select("*, odu:app_340b9f1944_odu_reference(*)").eq("consultation_id", consultationId).single();
        const { data: outcomeData } = await supabase.from("app_340b9f1944_ire_osogbo").select("*").eq("consultation_id", consultationId).single();
        const { data: eboData } = await supabase.from("app_340b9f1944_ebo").select("*").eq("consultation_id", consultationId).single();
        const { data: notesData } = await supabase.from("app_340b9f1944_consultation_notes").select("*").eq("consultation_id", consultationId).single();

        const generatedFrom = {
          odu: oduData?.odu ? { id: oduData.odu.id, name: oduData.odu.name, aliases: oduData.odu.aliases || [] } : null,
          outcome: outcomeData ? { type: outcomeData.outcome_type, subtype: outcomeData.outcome_subtype, category: outcomeData.outcome_type === "ire" ? "Ire (Blessings)" : "Osogbo (Challenges)" } : null,
          ebo: eboData ? { category: eboData.ebo_category, items: eboData.ebo_items || [], instructions: eboData.instructions } : null,
          notes: notesData?.content || null,
        };

        let summaryText = "## Consultation Summary\n\n";
        if (generatedFrom.odu) { summaryText += `### Odu\n**${generatedFrom.odu.name}**${generatedFrom.odu.aliases.length > 0 ? ` (${generatedFrom.odu.aliases.join(", ")})` : ""}\n\n`; }
        if (generatedFrom.outcome) { summaryText += `### Outcome\n**${generatedFrom.outcome.category}** — ${generatedFrom.outcome.subtype}\n\n`; }
        if (generatedFrom.ebo) { summaryText += `### Ebo Prescription\n**Category:** ${generatedFrom.ebo.category}\n${generatedFrom.ebo.items.length > 0 ? `**Items:** ${generatedFrom.ebo.items.join(", ")}\n` : ""}${generatedFrom.ebo.instructions ? `**Instructions:** ${generatedFrom.ebo.instructions}\n` : ""}\n`; }
        if (generatedFrom.notes) { summaryText += `### Awo Notes\n${generatedFrom.notes}\n\n`; }

        let clientSummary = "## Your Consultation Summary\n\n";
        if (generatedFrom.odu) { clientSummary += `### Odu Revealed\n**${generatedFrom.odu.name}**\n\n`; }
        if (generatedFrom.outcome) { clientSummary += `### Spiritual Direction\n**${generatedFrom.outcome.type === "ire" ? "Blessings (Ire)" : "Challenges (Osogbo)"}** — ${generatedFrom.outcome.subtype}\n\n`; }
        if (generatedFrom.ebo) { clientSummary += `### Recommended Actions\n**Type:** ${generatedFrom.ebo.category}\n${generatedFrom.ebo.items.length > 0 ? `**Materials needed:** ${generatedFrom.ebo.items.join(", ")}\n` : ""}\n`; }
        clientSummary += "---\n*This summary was prepared by your Awo practitioner.*\n";

        return new Response(JSON.stringify({ summary_text: summaryText, client_summary: clientSummary, generated_from: generatedFrom }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (req.method === "POST" || req.method === "PUT") {
      const body = await req.json();

      if (action === "save-notes") {
        const { consultation_id, content, formatted_content } = body;
        if (!consultation_id || content === undefined) { return new Response(JSON.stringify({ error: "consultation_id and content are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }

        const { data: existing } = await supabase.from("app_340b9f1944_consultation_notes").select("id").eq("consultation_id", consultation_id).single();
        let result;
        if (existing) {
          const { data, error } = await supabase.from("app_340b9f1944_consultation_notes").update({ content, formatted_content: formatted_content || null, updated_at: new Date().toISOString() }).eq("id", existing.id).select().single();
          if (error) { return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
          result = data;
        } else {
          const { data, error } = await supabase.from("app_340b9f1944_consultation_notes").insert({ consultation_id, content, formatted_content: formatted_content || null, created_by: user.id }).select().single();
          if (error) { return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
          result = data;
        }
        return new Response(JSON.stringify({ note: result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (action === "save-summary") {
        const { consultation_id, summary_text, client_summary, generated_from } = body;
        if (!consultation_id || !summary_text) { return new Response(JSON.stringify({ error: "consultation_id and summary_text are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }

        const { data: existing } = await supabase.from("app_340b9f1944_consultation_summary").select("id").eq("consultation_id", consultation_id).single();
        let result;
        if (existing) {
          const { data, error } = await supabase.from("app_340b9f1944_consultation_summary").update({ summary_text, client_summary: client_summary || null, generated_from: generated_from || {}, updated_by: user.id, updated_at: new Date().toISOString() }).eq("id", existing.id).select().single();
          if (error) { return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
          result = data;
        } else {
          const { data, error } = await supabase.from("app_340b9f1944_consultation_summary").insert({ consultation_id, summary_text, client_summary: client_summary || null, generated_from: generated_from || {} }).select().single();
          if (error) { return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
          result = data;
        }
        return new Response(JSON.stringify({ summary: result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (action === "confirm-summary") {
        const { consultation_id } = body;
        if (!consultation_id) { return new Response(JSON.stringify({ error: "consultation_id is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
        const { data, error } = await supabase.from("app_340b9f1944_consultation_summary").update({ confirmed_by: user.id, confirmed_at: new Date().toISOString() }).eq("consultation_id", consultation_id).select().single();
        if (error) { return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
        return new Response(JSON.stringify({ summary: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});