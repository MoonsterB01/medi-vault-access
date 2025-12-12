import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

/**
 * @function serve
 * @description A Supabase Edge Function that sends notifications to a patient and their family members when a new medical record is uploaded.
 * @param {Request} req - The incoming HTTP request.
 * @returns {Response} - A JSON response indicating the success or failure of the notification process.
 */
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate cron secret for security - prevents unauthorized access
  const cronSecret = Deno.env.get('CRON_SECRET');
  const providedSecret = req.headers.get('x-cron-secret');
  
  if (!cronSecret || providedSecret !== cronSecret) {
    console.error('Unauthorized access attempt to notify-patient-new-record');
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { patientId, recordId, recordType, severity } = await req.json();

    if (!patientId || !recordId || !recordType) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get patient information
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('name, primary_contact, created_by')
      .eq('id', patientId)
      .single();

    if (patientError || !patient) {
      return new Response(JSON.stringify({ error: 'Patient not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get patient creator to notify
    const { data: creatorUser, error: creatorError } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('id', patient.created_by)
      .single();

    if (creatorError) {
      console.error('Creator fetch error:', creatorError);
    }

    const notificationPromises = [];

    // Send notification to patient creator
    if (creatorUser) {
      notificationPromises.push(
        sendNotification({
          to: creatorUser.email,
          patientName: patient.name,
          recordType,
          severity,
          recipientName: creatorUser.name,
        })
      );
    }

    // Send SMS notification to patient's primary contact if it's a phone number
    if (patient.primary_contact && isPhoneNumber(patient.primary_contact)) {
      notificationPromises.push(
        sendSMSNotification({
          to: patient.primary_contact,
          patientName: patient.name,
          recordType,
          severity,
        })
      );
    }

    // Execute all notifications
    const results = await Promise.allSettled(notificationPromises);
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`Notifications sent: ${successful} successful, ${failed} failed`);

    return new Response(JSON.stringify({
      success: true,
      message: `Notifications processed: ${successful} sent, ${failed} failed`,
      details: {
        total_recipients: notificationPromises.length,
        successful_notifications: successful,
        failed_notifications: failed,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in notify-patient-new-record function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function sendNotification({ to, patientName, recordType, severity, recipientName }: {
  to: string;
  patientName: string;
  recordType: string;
  severity: string;
  recipientName: string;
}) {
  // Here you would integrate with your email service (like Resend)
  // For demonstration, we'll just log the notification
  console.log(`Email notification to ${to}:`);
  console.log(`Subject: New Medical Record for ${patientName}`);
  console.log(`Body: Hi ${recipientName}, a new ${recordType} record (${severity} priority) has been uploaded for ${patientName}.`);
  
  // Example integration with Resend (uncomment and configure as needed):
  /*
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (resendApiKey) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'noreply@yourhospital.com',
        to: [to],
        subject: `New Medical Record for ${patientName}`,
        html: `
          <h2>New Medical Record Notification</h2>
          <p>Hi ${recipientName},</p>
          <p>A new <strong>${recordType}</strong> record has been uploaded for <strong>${patientName}</strong>.</p>
          <p><strong>Priority:</strong> ${severity}</p>
          <p>Please log in to your account to view the details.</p>
        `,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Email send failed: ${response.statusText}`);
    }
  }
  */
}

async function sendSMSNotification({ to, patientName, recordType, severity }: {
  to: string;
  patientName: string;
  recordType: string;
  severity: string;
}) {
  // Here you would integrate with SMS service (like Twilio)
  console.log(`SMS notification to ${to}:`);
  console.log(`Message: New ${recordType} record (${severity}) uploaded for ${patientName}. Check your medical portal for details.`);
  
  // Example integration with Twilio (uncomment and configure as needed):
  /*
  const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const twilioFrom = Deno.env.get('TWILIO_PHONE_NUMBER');
  
  if (twilioSid && twilioToken && twilioFrom) {
    const auth = btoa(`${twilioSid}:${twilioToken}`);
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: twilioFrom,
        To: to,
        Body: `New ${recordType} record (${severity}) uploaded for ${patientName}. Check your medical portal for details.`,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`SMS send failed: ${response.statusText}`);
    }
  }
  */
}

function isPhoneNumber(contact: string): boolean {
  // Simple phone number validation
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
  return phoneRegex.test(contact.trim());
}