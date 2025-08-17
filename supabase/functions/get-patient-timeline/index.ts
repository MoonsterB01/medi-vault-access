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
    const { data: { user }, error: authError } = await supabase.auth.getUser(req.headers.get('Authorization')?.replace('Bearer ', '') || '');
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const patientId = url.searchParams.get('patientId');

    if (!patientId) {
      return new Response(JSON.stringify({ error: 'Patient ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user info
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

    // Check access to patient records through RLS policies
    // First verify we can access the patient
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id, name, dob, gender, hospital_id')
      .eq('id', patientId)
      .single();

    if (patientError || !patient) {
      return new Response(JSON.stringify({ error: 'Patient not found or access denied' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get medical records (RLS will filter based on user permissions)
    const { data: records, error: recordsError } = await supabase
      .from('medical_records')
      .select(`
        id,
        record_type,
        description,
        severity,
        record_date,
        file_url,
        created_at,
        uploaded_by,
        users:uploaded_by(name)
      `)
      .eq('patient_id', patientId)
      .order('record_date', { ascending: false });

    if (recordsError) {
      console.error('Records fetch error:', recordsError);
      return new Response(JSON.stringify({ error: 'Failed to fetch records' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get documents (RLS will filter based on user permissions)
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
      return new Response(JSON.stringify({ error: 'Failed to fetch documents' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Transform and combine records and documents into a unified timeline
    const transformedRecords = (records || []).map(record => ({
      ...record,
      type: 'medical_record' as const,
      date: record.record_date,
      uploader_name: record.users?.name || 'Unknown',
      title: `${record.record_type} - ${record.description || 'Medical Record'}`,
      file_url: record.file_url,
    }));

    const transformedDocuments = (documents || []).map(doc => ({
      ...doc,
      type: 'document' as const,
      date: doc.uploaded_at?.split('T')[0], // Convert timestamp to date
      uploader_name: 'Document Upload',
      title: doc.filename,
      file_url: doc.file_path,
      record_type: doc.document_type || 'document',
      severity: 'low' as const, // Default severity for documents
    }));

    // Combine and sort all timeline items by date
    const timeline = [...transformedRecords, ...transformedDocuments]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const groupedBySeverity = {
      critical: timeline.filter(r => r.severity === 'critical'),
      high: timeline.filter(r => r.severity === 'high'),
      moderate: timeline.filter(r => r.severity === 'moderate'),
      low: timeline.filter(r => r.severity === 'low'),
    };

    const groupedByType = timeline.reduce((acc, record) => {
      const type = record.record_type || 'document';
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(record);
      return acc;
    }, {} as Record<string, typeof timeline>);

    // Generate signed URLs for files
    const timelineWithUrls = await Promise.all(
      timeline.map(async (item) => {
        if (item.file_url) {
          try {
            // Use appropriate bucket based on item type
            const bucket = item.type === 'medical_record' ? 'medical_records' : 'medical-documents';
            const { data: signedUrl } = await supabase.storage
              .from(bucket)
              .createSignedUrl(item.file_url, 3600); // 1 hour expiry
            
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

    return new Response(JSON.stringify({
      patient,
      timeline: timelineWithUrls,
      summary: {
        total_records: timeline.length,
        by_severity: {
          critical: groupedBySeverity.critical.length,
          high: groupedBySeverity.high.length,
          moderate: groupedBySeverity.moderate.length,
          low: groupedBySeverity.low.length,
        },
        by_type: Object.keys(groupedByType).reduce((acc, type) => {
          acc[type] = groupedByType[type].length;
          return acc;
        }, {} as Record<string, number>),
        latest_record: timeline[0]?.record_date || null,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-patient-timeline function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});