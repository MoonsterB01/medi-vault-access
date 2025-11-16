import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * @function serve
 * @description A Supabase Edge Function that sends notifications to family members when a new document is uploaded for a patient.
 * @param {Request} req - The incoming HTTP request.
 * @returns {Response} - A JSON response indicating the success or failure of the notification process.
 */
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

    // No family notifications - removed family_access feature
    console.log('Document upload notification - family access feature removed');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Family access feature removed - no notifications sent'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in notify-patient-upload function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error?.message || 'Unknown error' }),
      { status: 500, headers: corsHeaders }
    );
  }
});