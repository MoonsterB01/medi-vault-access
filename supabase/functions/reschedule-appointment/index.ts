import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { 
      appointment_id, 
      new_date, 
      new_time,
      rescheduled_by,
      reason
    } = await req.json();

    console.log('Rescheduling appointment:', { appointment_id, new_date, new_time });

    // Get current appointment details
    const { data: currentAppointment, error: fetchError } = await supabaseClient
      .from('appointments')
      .select('*, doctor_id, patient_id, appointment_date, appointment_time, patients(name, created_by)')
      .eq('id', appointment_id)
      .single();

    if (fetchError || !currentAppointment) {
      throw new Error('Appointment not found');
    }

    const old_date = currentAppointment.appointment_date;
    const old_time = currentAppointment.appointment_time;

    // Check new slot availability
    const { data: slotCheck, error: slotError } = await supabaseClient
      .rpc('check_slot_availability', {
        p_doctor_id: currentAppointment.doctor_id,
        p_slot_date: new_date,
        p_start_time: new_time
      });

    if (slotError) {
      console.error('Error checking slot:', slotError);
      throw new Error('Failed to check slot availability');
    }

    if (!slotCheck || slotCheck.length === 0 || !slotCheck[0].available) {
      return new Response(
        JSON.stringify({ 
          error: 'New time slot is not available. Please select another time.',
          slotInfo: slotCheck?.[0]
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Update appointment with new date/time
    const { data: updatedAppointment, error: updateError } = await supabaseClient
      .from('appointments')
      .update({
        appointment_date: new_date,
        appointment_time: new_time,
        rescheduled_from: appointment_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', appointment_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating appointment:', updateError);
      throw updateError;
    }

    // The triggers will automatically handle slot count updates
    // (decrement old slot, increment new slot)

    // Send notification to patient
    const patientCreatorId = currentAppointment.patients?.created_by;
    if (patientCreatorId) {
      await supabaseClient.rpc('create_notification', {
        target_user_id: patientCreatorId,
        notification_title: 'Appointment Rescheduled',
        notification_message: `Your appointment has been rescheduled from ${old_date} at ${old_time} to ${new_date} at ${new_time}${reason ? `. Reason: ${reason}` : ''}`,
        notification_type: 'appointment_rescheduled',
        appointment_id_param: appointment_id,
        metadata_param: {
          old_date,
          old_time,
          new_date,
          new_time,
          reason,
          rescheduled_by
        }
      });
    }

    console.log('Appointment rescheduled successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        appointment: updatedAppointment,
        message: 'Appointment rescheduled and patient notified'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Error in reschedule-appointment function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});