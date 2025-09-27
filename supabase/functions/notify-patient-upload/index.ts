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
    console.log('Document upload notifications function called');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    const requestBody = await req.json();
    console.log('Request body:', requestBody);
    
    const { documentId, patientId, uploadedBy, filename, documentType } = requestBody;

    if (!documentId || !patientId || !uploadedBy) {
      console.error('Missing required fields:', { documentId, patientId, uploadedBy });
      return new Response(
        JSON.stringify({ error: 'Missing required fields: documentId, patientId, uploadedBy' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Get patient details
    const { data: patient, error: patientError } = await supabaseClient
      .from('patients')
      .select('name, shareable_id')
      .eq('id', patientId)
      .maybeSingle();

    if (patientError) {
      console.error('Error fetching patient:', patientError);
      return new Response(
        JSON.stringify({ error: 'Database error fetching patient', details: patientError.message }),
        { status: 500, headers: corsHeaders }
      );
    }

    if (!patient) {
      console.error('Patient not found for ID:', patientId);
      return new Response(
        JSON.stringify({ error: 'Patient not found' }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Get uploader details
    const { data: uploader, error: uploaderError } = await supabaseClient
      .from('users')
      .select('name, email')
      .eq('id', uploadedBy)
      .maybeSingle();

    if (uploaderError) {
      console.error('Error fetching uploader:', uploaderError);
    }

    const uploaderName = uploader?.name || 'Someone';

    // Get all users who have access to this patient (family members)
    const { data: familyAccess, error: accessError } = await supabaseClient
      .from('family_access')
      .select(`
        user_id,
        users(name, email)
      `)
      .eq('patient_id', patientId)
      .eq('can_view', true)
      .neq('user_id', uploadedBy); // Don't notify the uploader

    if (accessError) {
      console.error('Error fetching family access:', accessError);
      return new Response(
        JSON.stringify({ error: 'Database error fetching family access', details: accessError.message }),
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('Family access data:', familyAccess);

    const notifications = [];
    const docTypeText = documentType ? ` (${documentType})` : '';
    const title = `New Document Uploaded for ${patient.name}`;
    const message = `${uploaderName} uploaded a new document${docTypeText}: ${filename || 'Document'} for patient ${patient.name}`;

    // Create notifications for family members with access
    if (familyAccess && familyAccess.length > 0) {
      for (const access of familyAccess) {
        const { data: notificationId, error: notificationError } = await supabaseClient
          .rpc('create_notification', {
            target_user_id: access.user_id,
            notification_title: title,
            notification_message: message,
            notification_type: 'document_uploaded',
            metadata_param: {
              document_id: documentId,
              patient_id: patientId,
              patient_name: patient.name,
              uploaded_by: uploadedBy,
              uploader_name: uploaderName,
              filename: filename || 'Document',
              document_type: documentType
            }
          });

        if (notificationError) {
          console.error('Error creating notification:', notificationError);
        } else {
          notifications.push({ success: true, id: notificationId, user_id: access.user_id });
        }
      }
    }

    console.log(`Successfully created ${notifications.length} notifications for document upload`);

    return new Response(
      JSON.stringify({ 
        success: true,
        notificationsSent: notifications.length,
        message: `Sent ${notifications.length} notifications for new document upload` 
      }),
      { headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('Error in notify-patient-upload function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error?.message || 'Unknown error' }),
      { status: 500, headers: corsHeaders }
    );
  }
});