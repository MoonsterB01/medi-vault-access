import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  createRequestId,
  logRequest,
  logResponse,
  logAuthDiagnostics,
  corsHeaders,
  logDbQuery,
  logStorageOperation,
  createErrorResponse
} from "../_shared/diagnostics.ts";

/**
 * @function serve
 * @description A Supabase Edge Function that handles the uploading of a medical record.
 * @param {Request} req - The incoming HTTP request.
 * @returns {Promise<Response>} - A promise that resolves with a JSON response indicating the success or failure of the upload.
 */
serve(async (req) => {
  const requestId = createRequestId();
  const origin = req.headers.get('origin');
  
  logRequest(requestId, req);
  
  // Handle CORS preflight - respond BEFORE auth
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204, 
      headers: corsHeaders(origin) 
    });
  }

  try {
    logAuthDiagnostics(requestId, req);
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
      return createErrorResponse(requestId, 401, 'unauthorized', authError?.message, origin);
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const patientId = formData.get('patientId') as string;
    const recordType = formData.get('recordType') as string;
    const description = formData.get('description') as string;
    const severity = formData.get('severity') as string;
    const recordDate = formData.get('recordDate') as string;

    if (!file || !patientId || !recordType || !recordDate) {
      return createErrorResponse(requestId, 400, 'missing_required_fields', 'file, patientId, recordType, and recordDate are required', origin);
    }

    // Get user info to check hospital
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('hospital_id, role')
      .eq('id', user.id)
      .single();

    logDbQuery(requestId, 'users', 'select', userError, userData ? 1 : 0);

    if (userError || !userData) {
      return createErrorResponse(requestId, 404, 'user_not_found', userError?.message, origin);
    }

    // Verify patient exists and belongs to user's hospital
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id, hospital_id')
      .eq('id', patientId)
      .single();

    logDbQuery(requestId, 'patients', 'select', patientError, patient ? 1 : 0);

    if (patientError || !patient) {
      return createErrorResponse(requestId, 404, 'patient_not_found', patientError?.message, origin);
    }

    if (userData.role === 'hospital_staff' && patient.hospital_id !== userData.hospital_id) {
      return createErrorResponse(requestId, 403, 'access_denied', 'Patient not in your hospital - RLS mismatch', origin);
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

    logStorageOperation(requestId, 'medical_records', 'upload', fileName, uploadError, !uploadError);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return createErrorResponse(requestId, 500, 'file_upload_failed', uploadError.message, origin);
    }

    // Save record metadata
    const { data: recordData, error: recordError } = await supabase
      .from('medical_records')
      .insert([{
        id: recordId,
        patient_id: patientId,
        uploaded_by: user.id,
        record_type: recordType,
        description: description || null,
        severity: severity || 'low',
        record_date: recordDate,
        file_url: uploadData.path,
      }])
      .select()
      .single();

    logDbQuery(requestId, 'medical_records', 'insert', recordError, recordData ? 1 : 0);

    if (recordError) {
      console.error('Record creation error:', recordError);
      // Clean up uploaded file if record creation fails
      await supabase.storage.from('medical_records').remove([fileName]);
      logStorageOperation(requestId, 'medical_records', 'cleanup_delete', fileName, null, true);
      return createErrorResponse(requestId, 500, 'record_creation_failed', recordError.message, origin);
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

    const response = {
      success: true,
      record: recordData,
      requestId
    };
    
    logResponse(requestId, 200, response);
    
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error(JSON.stringify({ requestId, uncaughtError: error.message, stack: error.stack }));
    return createErrorResponse(requestId, 500, 'internal_server_error', error.message, origin);
  }
});