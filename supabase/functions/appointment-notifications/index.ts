import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { appointmentId, status, updatedBy } = await req.json();

    console.log('Processing appointment notification:', { appointmentId, status, updatedBy });

    // Get appointment details
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select(`
        *,
        patients (
          name,
          shareable_id
        ),
        doctors (
          users (name, email)
        )
      `)
      .eq('id', appointmentId)
      .single();

    if (appointmentError) {
      console.error('Error fetching appointment:', appointmentError);
      throw appointmentError;
    }

    // Get all users who have access to this patient
    const { data: familyAccess, error: accessError } = await supabase
      .from('family_access')
      .select('user_id, users (name, email)')
      .eq('patient_id', appointment.patient_id)
      .eq('can_view', true);

    if (accessError) {
      console.error('Error fetching family access:', accessError);
      throw accessError;
    }

    // Create notifications for all users with access to this patient
    const notifications = familyAccess?.map(access => ({
      user_id: access.user_id,
      appointment_id: appointmentId,
      notification_type: `appointment_${status}` as 'appointment_confirmed' | 'appointment_cancelled' | 'appointment_rescheduled' | 'appointment_completed',
      title: getNotificationTitle(status, appointment.doctors.users.name),
      message: getNotificationMessage(status, appointment, appointment.doctors.users.name),
      metadata: {
        appointment_id: appointment.appointment_id,
        appointment_date: appointment.appointment_date,
        appointment_time: appointment.appointment_time,
        doctor_name: appointment.doctors.users.name,
        patient_name: appointment.patients.name,
        status: status
      }
    })) || [];

    if (notifications.length > 0) {
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notificationError) {
        console.error('Error creating notifications:', notificationError);
        throw notificationError;
      }

      console.log(`Created ${notifications.length} notifications for appointment ${appointment.appointment_id}`);
    }

    // Send email notifications (if configured)
    // This would integrate with your email service
    for (const access of familyAccess || []) {
      try {
        await sendEmailNotification(
          access.users.email,
          access.users.name,
          getNotificationTitle(status, appointment.doctors.users.name),
          getNotificationMessage(status, appointment, appointment.doctors.users.name)
        );
      } catch (emailError) {
        console.error('Error sending email notification:', emailError);
        // Don't fail the entire request if email fails
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        notificationsSent: notifications.length,
        appointmentId: appointment.appointment_id
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in appointment-notifications function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to send appointment notifications'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

function getNotificationTitle(status: string, doctorName: string): string {
  switch (status) {
    case 'confirmed':
      return 'Appointment Confirmed';
    case 'cancelled':
      return 'Appointment Cancelled';
    case 'rescheduled':
      return 'Appointment Rescheduled';
    case 'completed':
      return 'Appointment Completed';
    default:
      return 'Appointment Updated';
  }
}

function getNotificationMessage(status: string, appointment: any, doctorName: string): string {
  const appointmentDate = new Date(appointment.appointment_date).toLocaleDateString();
  const appointmentTime = appointment.appointment_time;

  switch (status) {
    case 'confirmed':
      return `Your appointment with Dr. ${doctorName} on ${appointmentDate} at ${appointmentTime} has been confirmed.`;
    case 'cancelled':
      return `Your appointment with Dr. ${doctorName} on ${appointmentDate} at ${appointmentTime} has been cancelled.`;
    case 'rescheduled':
      return `Your appointment with Dr. ${doctorName} has been rescheduled. Please check for new date and time.`;
    case 'completed':
      return `Your appointment with Dr. ${doctorName} on ${appointmentDate} has been completed. Check for any notes or follow-up instructions.`;
    default:
      return `Your appointment with Dr. ${doctorName} has been updated.`;
  }
}

async function sendEmailNotification(email: string, name: string, subject: string, message: string) {
  // This is a placeholder for email integration
  // You could integrate with services like SendGrid, AWS SES, etc.
  console.log(`Email notification sent to ${email}:`, { subject, message });
  
  // Example integration (uncomment and configure as needed):
  // const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
  //   method: 'POST',
  //   headers: {
  //     'Authorization': `Bearer ${Deno.env.get('SENDGRID_API_KEY')}`,
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify({
  //     personalizations: [{
  //       to: [{ email, name }],
  //       subject
  //     }],
  //     from: { email: 'notifications@medivault.app', name: 'MediVault' },
  //     content: [{
  //       type: 'text/html',
  //       value: `
  //         <h2>${subject}</h2>
  //         <p>Dear ${name},</p>
  //         <p>${message}</p>
  //         <p>Best regards,<br>MediVault Team</p>
  //       `
  //     }]
  //   })
  // });
}