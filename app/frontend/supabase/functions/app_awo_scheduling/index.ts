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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    // GET actions
    if (req.method === "GET") {
      switch (action) {
        case "get-availability": {
          const awoId = url.searchParams.get("awo_id") || userId;
          if (!awoId) return jsonError("awo_id required", 400);

          const { data: blocks } = await supabase
            .from("app_340b9f1944_availability_blocks")
            .select("*")
            .eq("awo_id", awoId)
            .eq("is_active", true)
            .order("day_of_week");

          const { data: exceptions } = await supabase
            .from("app_340b9f1944_availability_exceptions")
            .select("*")
            .eq("awo_id", awoId)
            .gte("exception_date", new Date().toISOString().split("T")[0]);

          return jsonResponse({ blocks: blocks || [], exceptions: exceptions || [] });
        }

        case "get-booking-requests": {
          if (!userId) return jsonError("Unauthorized", 401);

          const status = url.searchParams.get("status");
          let query = supabase
            .from("app_340b9f1944_booking_requests")
            .select("*")
            .eq("awo_id", userId)
            .order("created_at", { ascending: false });

          if (status && status !== "all") {
            query = query.eq("status", status);
          }

          const { data, error } = await query;
          if (error) return jsonError(error.message, 500);

          // Enrich with client names
          const clientIds = [...new Set((data || []).map((r: Record<string, string>) => r.client_id))];
          const { data: profiles } = await supabase
            .from("app_340b9f1944_profiles")
            .select("id, full_name, email")
            .in("id", clientIds);

          const profileMap = new Map((profiles || []).map((p: Record<string, string>) => [p.id, p]));
          const enriched = (data || []).map((r: Record<string, string>) => ({
            ...r,
            client_name: (profileMap.get(r.client_id) as Record<string, string>)?.full_name || "Unknown Client",
            client_email: (profileMap.get(r.client_id) as Record<string, string>)?.email || "",
          }));

          return jsonResponse({ requests: enriched });
        }

        case "get-available-slots": {
          const awoId = url.searchParams.get("awo_id");
          const date = url.searchParams.get("date");
          if (!awoId || !date) return jsonError("awo_id and date required", 400);

          const targetDate = new Date(date + "T12:00:00Z");
          const dayOfWeek = targetDate.getDay();

          // Get blocks for this day
          const { data: blocks } = await supabase
            .from("app_340b9f1944_availability_blocks")
            .select("*")
            .eq("awo_id", awoId)
            .eq("day_of_week", dayOfWeek)
            .eq("is_active", true);

          // Check for exceptions on this date
          const { data: exceptions } = await supabase
            .from("app_340b9f1944_availability_exceptions")
            .select("*")
            .eq("awo_id", awoId)
            .eq("exception_date", date);

          // If there's a "not available" exception, return no slots
          const blockedException = (exceptions || []).find((e: Record<string, boolean>) => !e.is_available);
          if (blockedException) {
            return jsonResponse({ slots: [] });
          }

          // Generate slots from blocks
          const slots: { time: string; available: boolean }[] = [];

          // Check for override exception with custom hours
          const overrideException = (exceptions || []).find((e: Record<string, boolean>) => e.is_available);

          if (overrideException) {
            // Use exception hours
            const exc = overrideException as Record<string, string>;
            const startMinutes = timeToMinutes(exc.start_time);
            const endMinutes = timeToMinutes(exc.end_time);
            for (let m = startMinutes; m < endMinutes; m += 60) {
              slots.push({ time: minutesToTime(m), available: true });
            }
          } else if (blocks && blocks.length > 0) {
            // Use regular blocks
            for (const block of blocks) {
              const startMinutes = timeToMinutes(block.start_time);
              const endMinutes = timeToMinutes(block.end_time);
              const duration = block.slot_duration_minutes || 60;
              for (let m = startMinutes; m < endMinutes; m += duration) {
                slots.push({ time: minutesToTime(m), available: true });
              }
            }
          }

          // Check existing bookings/requests for conflicts
          const { data: existingBookings } = await supabase
            .from("app_340b9f1944_booking_requests")
            .select("requested_at, duration_minutes")
            .eq("awo_id", awoId)
            .in("status", ["pending", "accepted"])
            .gte("requested_at", date + "T00:00:00Z")
            .lte("requested_at", date + "T23:59:59Z");

          if (existingBookings) {
            for (const booking of existingBookings) {
              const bookingTime = new Date(booking.requested_at);
              const bookingTimeStr = bookingTime.toISOString().substring(11, 16);
              const slot = slots.find(s => s.time === bookingTimeStr);
              if (slot) slot.available = false;
            }
          }

          return jsonResponse({ slots });
        }

        case "get-calendar-events": {
          if (!userId) return jsonError("Unauthorized", 401);
          const startDate = url.searchParams.get("start");
          const endDate = url.searchParams.get("end");
          if (!startDate || !endDate) return jsonError("start and end required", 400);

          // Get accepted bookings in range
          const { data: bookings } = await supabase
            .from("app_340b9f1944_booking_requests")
            .select("*")
            .eq("awo_id", userId)
            .eq("status", "accepted")
            .gte("requested_at", startDate)
            .lte("requested_at", endDate);

          // Get consultations in range
          const { data: consultations } = await supabase
            .from("app_340b9f1944_consultations")
            .select("*")
            .eq("practitioner_id", userId)
            .gte("scheduled_at", startDate)
            .lte("scheduled_at", endDate);

          // Get exceptions in range
          const { data: exceptions } = await supabase
            .from("app_340b9f1944_availability_exceptions")
            .select("*")
            .eq("awo_id", userId)
            .gte("exception_date", startDate.split("T")[0])
            .lte("exception_date", endDate.split("T")[0]);

          return jsonResponse({
            bookings: bookings || [],
            consultations: consultations || [],
            exceptions: exceptions || [],
          });
        }

        default:
          return jsonError(`Unknown GET action: ${action}`, 400);
      }
    }

    // POST actions
    if (req.method === "POST") {
      const body = await req.json();

      switch (action) {
        case "save-availability": {
          if (!userId) return jsonError("Unauthorized", 401);
          const { blocks } = body;
          if (!blocks || !Array.isArray(blocks)) return jsonError("blocks array required", 400);

          // Deactivate all existing blocks for this user
          await supabase
            .from("app_340b9f1944_availability_blocks")
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq("awo_id", userId);

          // Insert new blocks
          const newBlocks = blocks.map((b: Record<string, unknown>) => ({
            awo_id: userId,
            day_of_week: b.day_of_week,
            start_time: b.start_time,
            end_time: b.end_time,
            slot_duration_minutes: b.slot_duration_minutes || 60,
            is_active: true,
            label: b.label || null,
          }));

          if (newBlocks.length > 0) {
            const { error } = await supabase
              .from("app_340b9f1944_availability_blocks")
              .insert(newBlocks);
            if (error) return jsonError(error.message, 500);
          }

          return jsonResponse({ success: true, count: newBlocks.length });
        }

        case "save-exception": {
          if (!userId) return jsonError("Unauthorized", 401);
          const { exception_date, is_available, start_time, end_time, reason } = body;
          if (!exception_date) return jsonError("exception_date required", 400);

          // Upsert exception for this date
          const { data: existing } = await supabase
            .from("app_340b9f1944_availability_exceptions")
            .select("id")
            .eq("awo_id", userId)
            .eq("exception_date", exception_date)
            .single();

          if (existing) {
            const { error } = await supabase
              .from("app_340b9f1944_availability_exceptions")
              .update({
                is_available: is_available ?? false,
                start_time: start_time || null,
                end_time: end_time || null,
                reason: reason || null,
                updated_at: new Date().toISOString(),
              })
              .eq("id", existing.id);
            if (error) return jsonError(error.message, 500);
          } else {
            const { error } = await supabase
              .from("app_340b9f1944_availability_exceptions")
              .insert({
                awo_id: userId,
                exception_date,
                is_available: is_available ?? false,
                start_time: start_time || null,
                end_time: end_time || null,
                reason: reason || null,
              });
            if (error) return jsonError(error.message, 500);
          }

          return jsonResponse({ success: true });
        }

        case "delete-exception": {
          if (!userId) return jsonError("Unauthorized", 401);
          const { exception_id } = body;
          if (!exception_id) return jsonError("exception_id required", 400);

          const { error } = await supabase
            .from("app_340b9f1944_availability_exceptions")
            .delete()
            .eq("id", exception_id)
            .eq("awo_id", userId);
          if (error) return jsonError(error.message, 500);

          return jsonResponse({ success: true });
        }

        case "create-booking-request": {
          if (!userId) return jsonError("Unauthorized", 401);
          const { awo_id, requested_at, duration_minutes, service_type, message } = body;
          if (!awo_id || !requested_at) return jsonError("awo_id and requested_at required", 400);

          const { data, error } = await supabase
            .from("app_340b9f1944_booking_requests")
            .insert({
              awo_id,
              client_id: userId,
              requested_at,
              duration_minutes: duration_minutes || 60,
              service_type: service_type || "ifa_reading",
              message: message || null,
              status: "pending",
            })
            .select()
            .single();

          if (error) return jsonError(error.message, 500);
          return jsonResponse({ success: true, request: data });
        }

        case "respond-to-request": {
          if (!userId) return jsonError("Unauthorized", 401);
          const { request_id, response_action, awo_response, proposed_at } = body;
          if (!request_id || !response_action) return jsonError("request_id and response_action required", 400);

          const validActions = ["accepted", "declined", "proposed"];
          if (!validActions.includes(response_action)) return jsonError("Invalid action", 400);

          const updateData: Record<string, unknown> = {
            status: response_action,
            awo_response: awo_response || null,
            updated_at: new Date().toISOString(),
          };

          if (response_action === "proposed" && proposed_at) {
            updateData.proposed_at = proposed_at;
          }

          // If accepted, also create a consultation
          if (response_action === "accepted") {
            const { data: request } = await supabase
              .from("app_340b9f1944_booking_requests")
              .select("*")
              .eq("id", request_id)
              .eq("awo_id", userId)
              .single();

            if (request) {
              await supabase
                .from("app_340b9f1944_consultations")
                .insert({
                  practitioner_id: userId,
                  client_id: request.client_id,
                  scheduled_at: request.requested_at,
                  duration_minutes: request.duration_minutes,
                  status: "scheduled",
                  service_type: request.service_type,
                  meeting_url: `https://meet.ifamarket.com/${Date.now()}`,
                });
            }
          }

          const { error } = await supabase
            .from("app_340b9f1944_booking_requests")
            .update(updateData)
            .eq("id", request_id)
            .eq("awo_id", userId);

          if (error) return jsonError(error.message, 500);
          return jsonResponse({ success: true });
        }

        default:
          return jsonError(`Unknown POST action: ${action}`, 400);
      }
    }

    return jsonError("Method not allowed", 405);
  } catch (err) {
    return jsonError(err.message || "Internal error", 500);
  }
});

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}