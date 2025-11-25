import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * @function serve
 * @description A Supabase Edge Function that sends notifications to family members when an appointment status is updated.
 * @param {Request} req - The incoming HTTP request.
 * @returns {Response} - A JSON response indicating the success or failure of the notification process.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Appointment notifications function called');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
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

    // Notify only the patient creator
    const { data: creatorUser, error: creatorError } = await supabaseClient
      .from('users')
      .select('id, name, email')
      .eq('id', patient.created_by)
      .single();

    if (creatorError) {
      console.error('Error fetching creator:', creatorError);
      return new Response(
        JSON.stringify({ error: 'Database error fetching creator', details: creatorError.message }),
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('Creator data:', creatorUser);

    const notifications = [];
    const doctorName = appointmentWithDetails.doctors?.users?.name || appointmentWithDetails.doctors?.doctor_id || 'Doctor';

    console.log('Processing appointment notification:', {
      appointmentId,
      status,
      updatedBy,
      appointmentFound: !!appointmentWithDetails,
      patientName: appointmentWithDetails?.patients?.name,
      doctorName,
      creatorFound: !!creatorUser
    });

    // Create notification for patient creator
    if (creatorUser) {
      notifications.push({
        user_id: creatorUser.id,
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

    // Use the unified notification creation function
    if (notifications.length > 0) {
      console.log('Creating notifications using unified function:', notifications);
      const results = [];
      
      for (const notification of notifications) {
        const { data: notificationId, error: notificationError } = await supabaseClient
          .rpc('create_notification', {
            target_user_id: notification.user_id,
            notification_title: notification.title,
            notification_message: notification.message,
            notification_type: notification.notification_type,
            appointment_id_param: notification.appointment_id,
            metadata_param: notification.metadata
          });

        if (notificationError) {
          console.error('Error creating notification:', notificationError);
          results.push({ error: notificationError });
        } else {
          results.push({ success: true, id: notificationId });
        }
      }
      
      const successCount = results.filter(r => r.success).length;
      const errorCount = results.filter(r => r.error).length;
      
      console.log(`Successfully created ${successCount} notifications, ${errorCount} errors`);
    } else {
      console.log('No notifications to create - no family access found');
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        notificationsSent: notifications.length,
        message: `Sent ${notifications.length} notifications for appointment ${status}` 
      }),
      { headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('Error in appointment-notifications function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error?.message || 'Unknown error' }),
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