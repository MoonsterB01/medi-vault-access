import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";
import { corsHeaders, createErrorResponse, createRequestId, logRequest, logResponse, parseRequestBody } from "../_shared/diagnostics.ts";
import { authenticateRequest, assertPatientPermission } from "../_shared/auth.ts";

serve(async (req) => {
  const requestId = createRequestId();
  const origin = req.headers.get("origin");
  logRequest(requestId, req);

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });

  try {
    const caller = await authenticateRequest(req);
    if (!caller?.userId) return createErrorResponse(requestId, 401, "authentication_required", "A valid signed-in session is required.", origin);

    const body = await parseRequestBody(req, requestId);
    const appointmentId = typeof body?.appointment_id === "string" ? body.appointment_id : "";
    const patientNotes = typeof body?.patient_notes === "string" ? body.patient_notes.slice(0, 5000) : "";
    if (!appointmentId) return createErrorResponse(requestId, 400, "missing_required_fields", "appointment_id is required.", origin);

    const adminClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const { data: appointment, error: lookupError } = await adminClient
      .from("appointments")
      .select("id, patient_id")
      .eq("id", appointmentId)
      .maybeSingle();
    if (lookupError) return createErrorResponse(requestId, 500, "database_error", lookupError.message, origin);
    if (!appointment) return createErrorResponse(requestId, 404, "appointment_not_found", "Appointment not found.", origin);

    if (!(await assertPatientPermission(adminClient, caller, appointment.patient_id, "appointments"))) {
      return createErrorResponse(requestId, 403, "appointment_not_allowed", "You do not have appointment permission for this patient.", origin);
    }

    const { data, error } = await adminClient
      .from("appointments")
      .update({ patient_notes: patientNotes, updated_at: new Date().toISOString() })
      .eq("id", appointmentId)
      .select("id, patient_notes, updated_at")
      .single();
    if (error) return createErrorResponse(requestId, 500, "update_failed", error.message, origin);

    const response = { success: true, appointment: data, requestId };
    logResponse(requestId, 200, response);
    return new Response(JSON.stringify(response), { headers: { ...corsHeaders(origin), "Content-Type": "application/json" } });
  } catch (error: any) {
    return createErrorResponse(requestId, 500, "internal_server_error", error?.message ?? "Unexpected error", origin);
  }
});