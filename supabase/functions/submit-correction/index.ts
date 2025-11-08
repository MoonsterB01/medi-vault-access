import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        );

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
        }


    const { patientId, correction } = await req.json();

    // Validate input
    if (!patientId || !correction) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(patientId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid patient ID format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate correction object structure
    if (typeof correction !== 'object' || !correction.field || !correction.valueAfter) {
      return new Response(
        JSON.stringify({ error: 'Invalid correction format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate field path (alphanumeric, dots, underscores only)
    const fieldRegex = /^[a-zA-Z0-9_.]+$/;
    if (!fieldRegex.test(correction.field) || correction.field.length > 100) {
      return new Response(
        JSON.stringify({ error: 'Invalid field name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate value lengths
    const valueBefore = String(correction.valueBefore || '');
    const valueAfter = String(correction.valueAfter || '');
    if (valueBefore.length > 1000 || valueAfter.length > 1000) {
      return new Response(
        JSON.stringify({ error: 'Values too long' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate sourceDocs if present
    if (correction.sourceDocs) {
      if (!Array.isArray(correction.sourceDocs) || correction.sourceDocs.length > 20) {
        return new Response(
          JSON.stringify({ error: 'Invalid source documents' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      for (const docId of correction.sourceDocs) {
        if (!uuidRegex.test(docId)) {
          return new Response(
            JSON.stringify({ error: 'Invalid document ID in sources' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

        if (!patientId || !correction) {
            return new Response(JSON.stringify({ error: 'patientId and correction are required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', ...corsHeaders },
            });
        }

        // 1. Insert the correction into the manual_corrections table
        await supabase.from('manual_corrections').insert({
            patient_id: patientId,
            user_id: user.id,
            fieldPath: correction.field,
            oldValue: correction.valueBefore,
            newValue: correction.valueAfter,
            docRefs: correction.sourceDocs,
        });

        // 2. Trigger a regeneration of the patient summary
        const { error: invokeError } = await supabase.functions.invoke('generate-patient-summary', {
            body: { patientId, documentId: null } // documentId is not needed for regeneration
        });

        if (invokeError) {
            throw new Error(`Failed to trigger summary regeneration: ${invokeError.message}`);
        }

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });

    } catch (error: any) {
        console.error('Error in submit-correction function:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
    }
};

serve(handler);