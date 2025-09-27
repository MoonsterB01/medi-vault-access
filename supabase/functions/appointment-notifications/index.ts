import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Appointment notifications function called');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    const requestBody = await req.json();
    console.log('Request body:', requestBody);
    
    const { appointmentId, status, updatedBy } = requestBody;

    if (!appointmentId || !status || !updatedBy) {
      console.error('Missing required fields:', { appointmentId, status, updatedBy });
      return new Response(
        JSON.stringify({ error: 'Missing required fields: appointmentId, status, updatedBy' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Get appointment details first
    const { data: appointment, error: appointmentError } = await supabaseClient
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .maybeSingle();

    if (appointmentError) {
      console.error('Error fetching appointment:', appointmentError);
      return new Response(
        JSON.stringify({ error: 'Database error fetching appointment', details: appointmentError.message }),
        { status: 500, headers: corsHeaders }
      );
    }

    if (!appointment) {
      console.error('Appointment not found for ID:', appointmentId);
      return new Response(
        JSON.stringify({ error: 'Appointment not found' }),
        { status: 404, headers: corsHeaders }
      );
    }

    console.log('Found appointment:', appointment);

    // Get patient details separately
    const { data: patient, error: patientError } = await supabaseClient
      .from('patients')
      .select('name, shareable_id')
      .eq('id', appointment.patient_id)
      .maybeSingle();

    if (patientError) {
      console.error('Error fetching patient:', patientError);
    }

    // Get doctor details separately
    const { data: doctor, error: doctorError } = await supabaseClient
      .from('doctors')
      .select(`
        doctor_id,
        specialization,
        user_id,
        users(name, email)
      `)
      .eq('id', appointment.doctor_id)
      .maybeSingle();

    if (doctorError) {
      console.error('Error fetching doctor:', doctorError);
    }

    // Construct appointment object with related data
    const appointmentWithDetails = {
      ...appointment,
      patients: patient,
      doctors: doctor
    };


    // Get all users who have access to this patient (family members)
    const { data: familyAccess, error: accessError } = await supabaseClient
      .from('family_access')
      .select(`
        user_id,
        users(name, email)
      `)
      .eq('patient_id', appointmentWithDetails.patient_id)
      .eq('can_view', true);

    if (accessError) {
      console.error('Error fetching family access:', accessError);
      return new Response(
        JSON.stringify({ error: 'Database error fetching family access', details: accessError.message }),
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('Family access data:', familyAccess);

    const notifications = [];
    const doctorName = appointmentWithDetails.doctors?.users?.name || appointmentWithDetails.doctors?.doctor_id || 'Doctor';

    console.log('Processing appointment notification:', {
      appointmentId,
      status,
      updatedBy,
      appointmentFound: !!appointmentWithDetails,
      patientName: appointmentWithDetails?.patients?.name,
      doctorName,
      familyAccessCount: familyAccess?.length || 0
    });

    // Create notifications for family members with access
    if (familyAccess && familyAccess.length > 0) {
      for (const access of familyAccess) {
        notifications.push({
          user_id: access.user_id,
          notification_type: 'appointment_status_update',
          title: getNotificationTitle(status, doctorName),
          message: getNotificationMessage(status, appointmentWithDetails, doctorName),
          appointment_id: appointmentId,
          metadata: {
            appointment_date: appointmentWithDetails.appointment_date,
            appointment_time: appointmentWithDetails.appointment_time,
            patient_name: appointmentWithDetails.patients?.name,
            doctor_name: doctorName,
            old_status: appointmentWithDetails.status,
            new_status: status
          }
        });
      }
    }

    // Insert all notifications
    if (notifications.length > 0) {
      console.log('Inserting notifications:', notifications);
      const { error: notificationError } = await supabaseClient
        .from('notifications')
        .insert(notifications);

      if (notificationError) {
        console.error('Error creating notifications:', notificationError);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to create notifications',
            details: notificationError.message 
          }),
          { status: 500, headers: corsHeaders }
        );
      }
      console.log('Successfully inserted notifications');
    } else {
      console.log('No notifications to insert - no family access found');
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        notificationsSent: notifications.length,
        message: `Sent ${notifications.length} notifications for appointment ${status}` 
      }),
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error('Error in appointment-notifications function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});

function getNotificationTitle(status: string, doctorName: string): string {
  switch (status) {
    case 'confirmed':
      return `Appointment Confirmed with Dr. ${doctorName}`;
    case 'cancelled':
      return `Appointment Cancelled with Dr. ${doctorName}`;
    case 'rescheduled':
      return `Appointment Rescheduled with Dr. ${doctorName}`;
    case 'completed':
      return `Appointment Completed with Dr. ${doctorName}`;
    default:
      return `Appointment Update with Dr. ${doctorName}`;
  }
}

function getNotificationMessage(status: string, appointment: any, doctorName: string): string {
  const date = new Date(appointment.appointment_date).toLocaleDateString();
  const time = appointment.appointment_time;
  
  switch (status) {
    case 'confirmed':
      return `Your appointment with Dr. ${doctorName} on ${date} at ${time} has been confirmed.`;
    case 'cancelled':
      return `Your appointment with Dr. ${doctorName} on ${date} at ${time} has been cancelled.`;
    case 'rescheduled':
      return `Your appointment with Dr. ${doctorName} on ${date} at ${time} has been rescheduled. Please check for new details.`;
    case 'completed':
      return `Your appointment with Dr. ${doctorName} on ${date} at ${time} has been completed.`;
    default:
      return `Your appointment with Dr. ${doctorName} on ${date} at ${time} has been updated to ${status}.`;
  }
}