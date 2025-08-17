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
    console.log('Timeline function called with method:', req.method);
    
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
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized', details: authError?.message }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Authenticated user:', user.id);

    // Get patientId from request body
    const body = await req.json();
    const patientId = body.patientId;

    if (!patientId) {
      console.error('No patient ID provided');
      return new Response(JSON.stringify({ error: 'Patient ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Fetching timeline for patient:', patientId);

    // Get user info to check access
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('hospital_id, role')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      console.error('User data error:', userError);
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('User data:', userData);

    // Check if user has access to this patient
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id, name, dob, gender, hospital_id')
      .eq('id', patientId)
      .single();

    if (patientError || !patient) {
      console.error('Patient access error:', patientError);
      return new Response(JSON.stringify({ error: 'Patient not found or access denied' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Patient found:', patient.name);

    // Fetch documents only (focusing on documents first)
    const { data: documents, error: documentsError } = await supabase
      .from('documents')
      .select(`
        id,
        filename,
        document_type,
        description,
        file_path,
        uploaded_at,
        uploaded_by,
        tags,
        content_type,
        file_size
      `)
      .eq('patient_id', patientId)
      .order('uploaded_at', { ascending: false });

    if (documentsError) {
      console.error('Documents fetch error:', documentsError);
      return new Response(JSON.stringify({ error: 'Failed to fetch documents', details: documentsError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Documents found:', documents?.length || 0);
    console.log('Documents data:', documents);

    // Transform documents into timeline format
    const transformedDocuments = (documents || []).map(doc => ({
      ...doc,
      type: 'document' as const,
      date: doc.uploaded_at?.split('T')[0] || new Date().toISOString().split('T')[0],
      uploader_name: 'Document Upload',
      title: doc.filename,
      file_url: doc.file_path, // Map file_path to file_url for consistency
      record_type: doc.document_type || 'document',
      severity: 'low' as const,
    }));

    console.log('Transformed documents:', transformedDocuments);

    // Generate signed URLs for documents
    const timelineWithUrls = await Promise.all(
      transformedDocuments.map(async (item) => {
        if (item.file_path) {
          try {
            console.log('Generating signed URL for:', item.file_path);
            const { data: signedUrl, error: urlError } = await supabase.storage
              .from('medical-documents')
              .createSignedUrl(item.file_path, 3600);
            
            if (urlError) {
              console.error('Signed URL error for', item.file_path, ':', urlError);
            } else {
              console.log('Signed URL generated:', signedUrl?.signedUrl);
            }
            
            return {
              ...item,
              signed_url: signedUrl?.signedUrl,
            };
          } catch (error) {
            console.warn('Failed to generate signed URL for item:', item.id, error);
            return item;
          }
        }
        return item;
      })
    );

    const responseData = {
      patient,
      timeline: timelineWithUrls,
      summary: {
        total_records: timelineWithUrls.length,
        by_severity: {
          critical: 0,
          high: 0,
          moderate: 0,
          low: timelineWithUrls.length,
        },
        by_type: {
          document: timelineWithUrls.length,
        },
        latest_record: timelineWithUrls[0]?.uploaded_at || null,
      },
    };

    console.log('Final response:', responseData);

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-patient-timeline function:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: error.message,
      stack: error.stack 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});