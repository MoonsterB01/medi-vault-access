import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  createRequestId,
  logRequest,
  logResponse,
  logAuthDiagnostics,
  corsHeaders,
  parseRequestBody,
  logDbQuery,
  createErrorResponse
} from "../_shared/diagnostics.ts";

serve(async (req) => {
  const requestId = createRequestId();
  const origin = req.headers.get('origin');
  
  logRequest(requestId, req);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  try {
    logAuthDiagnostics(requestId, req);
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    let body: any;
    try {
      body = await parseRequestBody(req, requestId);
    } catch (err: any) {
      return createErrorResponse(requestId, 400, 'invalid_request_body', err.message, origin);
    }

    const { doctor_id, patient_id, appointment_date, appointment_time, appointment_type, chief_complaint, patient_notes, created_by } = body;

    if (!doctor_id || !patient_id || !appointment_date || !appointment_time || !created_by) {
      return createErrorResponse(requestId, 400, 'missing_required_fields', 'doctor_id, patient_id, appointment_date, appointment_time, and created_by are required', origin);
    }

    // Validate appointment is not in the past (IST)
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + now.getTimezoneOffset() * 60000 + istOffset);
    const istDateStr = istNow.toISOString().split('T')[0];
    const istTimeStr = istNow.toTimeString().slice(0, 8);
    
    if (appointment_date < istDateStr || 
        (appointment_date === istDateStr && appointment_time <= istTimeStr)) {
      return createErrorResponse(requestId, 400, 'slot_in_past', 'Cannot book appointments for past time slots', origin);
    }

    const { data: slotCheck, error: slotError } = await supabaseClient.rpc('check_slot_availability', {
      p_doctor_id: doctor_id, p_slot_date: appointment_date, p_start_time: appointment_time
    });

    logDbQuery(requestId, 'rpc', 'check_slot_availability', slotError, slotCheck?.length || 0);

    if (slotError) {
      return createErrorResponse(requestId, 500, 'slot_check_failed', slotError.message, origin);
    }

    if (!slotCheck || slotCheck.length === 0 || !slotCheck[0].available) {
      return createErrorResponse(requestId, 400, 'slot_unavailable', 'Time slot is fully booked', origin);
    }

    const { data: appointmentIdData, error: idError } = await supabaseClient.rpc('generate_appointment_id');
    logDbQuery(requestId, 'rpc', 'generate_appointment_id', idError, appointmentIdData ? 1 : 0);

    if (idError) {
      return createErrorResponse(requestId, 500, 'id_generation_failed', idError.message, origin);
    }

    const { data: appointment, error: appointmentError } = await supabaseClient.from('appointments').insert([{
      appointment_id: appointmentIdData, doctor_id, patient_id, appointment_date, appointment_time,
      appointment_type: appointment_type || 'consultation', chief_complaint, patient_notes, created_by, status: 'pending'
    }]).select().single();

    logDbQuery(requestId, 'appointments', 'insert', appointmentError, appointment ? 1 : 0);

    if (appointmentError) {
      return createErrorResponse(requestId, 500, 'appointment_creation_failed', appointmentError.message, origin);
    }

    const { data: doctorData } = await supabaseClient.from('doctors').select('user_id, users(name)').eq('id', doctor_id).single();
    logDbQuery(requestId, 'doctors', 'select_with_users', null, doctorData ? 1 : 0);

    if (doctorData?.user_id) {
      await supabaseClient.rpc('create_notification', {
        target_user_id: doctorData.user_id, notification_title: 'New Appointment Booked',
        notification_message: `New appointment scheduled for ${appointment_date} at ${appointment_time}`,
        notification_type: 'appointment_booked', appointment_id_param: appointment.id,
        metadata_param: { appointment_id: appointment.appointment_id, date: appointment_date, time: appointment_time }
      });
    }

    const response = { success: true, appointment, message: 'Appointment booked successfully', requestId };
    logResponse(requestId, 200, response);

    return new Response(JSON.stringify(response), { headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error(JSON.stringify({ requestId, uncaughtError: error.message, stack: error.stack }));
    return createErrorResponse(requestId, 500, 'internal_server_error', error.message, origin);
  }
});
