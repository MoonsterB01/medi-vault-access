import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: req.headers.get('Authorization')!,
        },
      },
    });

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const patientId = formData.get('patientId') as string;
    const recordType = formData.get('recordType') as string;
    const description = formData.get('description') as string;
    const severity = formData.get('severity') as string;
    const recordDate = formData.get('recordDate') as string;

    if (!file || !patientId || !recordType || !recordDate) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user info to check hospital
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('hospital_id, role')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify patient exists and belongs to user's hospital
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id, hospital_id')
      .eq('id', patientId)
      .single();

    if (patientError || !patient) {
      return new Response(JSON.stringify({ error: 'Patient not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (userData.role === 'hospital_staff' && patient.hospital_id !== userData.hospital_id) {
      return new Response(JSON.stringify({ error: 'Access denied: Patient not in your hospital' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate unique filename
    const recordId = crypto.randomUUID();
    const fileExtension = file.name.split('.').pop();
    const fileName = `${userData.hospital_id}/${patientId}/${recordId}.${fileExtension}`;

    // Upload file to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('medical_records')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response(JSON.stringify({ error: 'File upload failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Save record metadata
    const { data: recordData, error: recordError } = await supabase
      .from('medical_records')
      .insert({
        id: recordId,
        patient_id: patientId,
        uploaded_by: user.id,
        record_type: recordType,
        description: description || null,
        severity: severity || 'low',
        record_date: recordDate,
        file_url: uploadData.path,
      })
      .select()
      .single();

    if (recordError) {
      console.error('Record creation error:', recordError);
      // Clean up uploaded file if record creation fails
      await supabase.storage.from('medical_records').remove([fileName]);
      return new Response(JSON.stringify({ error: 'Record creation failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Trigger notification (call other edge function)
    try {
      await supabase.functions.invoke('notify-patient-new-record', {
        body: {
          patientId,
          recordId: recordData.id,
          recordType,
          severity,
        },
      });
    } catch (notificationError) {
      console.warn('Notification failed:', notificationError);
      // Don't fail the upload if notification fails
    }

    return new Response(JSON.stringify({
      success: true,
      record: recordData,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in upload-record function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});