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

    // Group records by severity and type for better organization
    const timeline = records.map(record => ({
      ...record,
      uploader_name: record.users?.name || 'Unknown',
    }));

    const groupedBySeverity = {
      critical: timeline.filter(r => r.severity === 'critical'),
      high: timeline.filter(r => r.severity === 'high'),
      moderate: timeline.filter(r => r.severity === 'moderate'),
      low: timeline.filter(r => r.severity === 'low'),
    };

    const groupedByType = timeline.reduce((acc, record) => {
      if (!acc[record.record_type]) {
        acc[record.record_type] = [];
      }
      acc[record.record_type].push(record);
      return acc;
    }, {} as Record<string, typeof timeline>);

    // Generate signed URLs for files
    const timelineWithUrls = await Promise.all(
      timeline.map(async (record) => {
        if (record.file_url) {
          try {
            const { data: signedUrl } = await supabase.storage
              .from('medical_records')
              .createSignedUrl(record.file_url, 3600); // 1 hour expiry
            
            return {
              ...record,
              signed_url: signedUrl?.signedUrl,
            };
          } catch (error) {
            console.warn('Failed to generate signed URL for record:', record.id, error);
            return record;
          }
        }
        return record;
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