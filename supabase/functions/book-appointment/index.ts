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
      doctor_id, 
      patient_id, 
      appointment_date, 
      appointment_time,
      appointment_type,
      chief_complaint,
      patient_notes,
      created_by
    } = await req.json();

    console.log('Booking appointment:', {
      doctor_id,
      patient_id,
      appointment_date,
      appointment_time
    });

    // Check slot availability
    const { data: slotCheck, error: slotError } = await supabaseClient
      .rpc('check_slot_availability', {
        p_doctor_id: doctor_id,
        p_slot_date: appointment_date,
        p_start_time: appointment_time
      });

    if (slotError) {
      console.error('Error checking slot:', slotError);
      throw new Error('Failed to check slot availability');
    }

    if (!slotCheck || slotCheck.length === 0 || !slotCheck[0].available) {
      return new Response(
        JSON.stringify({ 
          error: 'Time slot is fully booked. Please select another time.',
          slotInfo: slotCheck?.[0]
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Generate appointment ID
    const { data: appointmentIdData, error: idError } = await supabaseClient
      .rpc('generate_appointment_id');

    if (idError) {
      console.error('Error generating appointment ID:', idError);
      throw new Error('Failed to generate appointment ID');
    }

    // Create appointment
    const { data: appointment, error: appointmentError } = await supabaseClient
      .from('appointments')
      .insert({
        appointment_id: appointmentIdData,
        doctor_id,
        patient_id,
        appointment_date,
        appointment_time,
        appointment_type: appointment_type || 'consultation',
        chief_complaint,
        patient_notes,
        created_by,
        status: 'pending'
      })
      .select()
      .single();

    if (appointmentError) {
      console.error('Error creating appointment:', appointmentError);
      throw appointmentError;
    }

    // Fetch doctor details for notification
    const { data: doctorData } = await supabaseClient
      .from('doctors')
      .select('user_id, users(name)')
      .eq('id', doctor_id)
      .single();

    // Send notification to doctor
    if (doctorData?.user_id) {
      await supabaseClient.rpc('create_notification', {
        target_user_id: doctorData.user_id,
        notification_title: 'New Appointment Booked',
        notification_message: `A new appointment has been scheduled for ${appointment_date} at ${appointment_time}`,
        notification_type: 'appointment_booked',
        appointment_id_param: appointment.id,
        metadata_param: {
          appointment_id: appointment.appointment_id,
          date: appointment_date,
          time: appointment_time
        }
      });
    }

    console.log('Appointment booked successfully:', appointment.appointment_id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        appointment,
        message: 'Appointment booked successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Error in book-appointment function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});