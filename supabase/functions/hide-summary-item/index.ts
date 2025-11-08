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
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // Authenticate user
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json', ...corsHeaders },
            });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        
        if (authError || !user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json', ...corsHeaders },
            });
        }

        const { patientId, itemType, itemId } = await req.json();

        // Validate input
        if (!patientId || !itemType || !itemId) {
            return new Response(JSON.stringify({ error: 'Missing required fields' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', ...corsHeaders },
            });
        }

        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(patientId) || !uuidRegex.test(itemId)) {
            return new Response(JSON.stringify({ error: 'Invalid ID format' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', ...corsHeaders },
            });
        }

        // Validate itemType
        const allowedTypes = ['diagnoses', 'medications', 'labs', 'visits', 'alerts'];
        if (!allowedTypes.includes(itemType)) {
            return new Response(JSON.stringify({ error: 'Invalid item type' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', ...corsHeaders },
            });
        }

        // Verify user has access to this patient
        const { data: hasAccess, error: accessError } = await supabase.rpc(
            'user_can_access_patient_files',
            { user_id_param: user.id, patient_id_param: patientId }
        );

        if (accessError || !hasAccess) {
            return new Response(JSON.stringify({ error: 'Access denied' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json', ...corsHeaders },
            });
        }


        // 1. Update the item in the structured table
        const { error: updateError } = await supabase
            .from(itemType)
            .update({ hidden_by_user: true })
            .eq('id', itemId)
            .eq('patient_id', patientId);

        if (updateError) {
            throw new Error(`Failed to hide item: ${updateError.message}`);
        }

        // 2. Trigger a regeneration of the patient summary
        const { error: invokeError } = await supabase.functions.invoke('generate-patient-summary', {
            body: { patientId, documentId: null }
        });

        if (invokeError) {
            throw new Error(`Failed to trigger summary regeneration: ${invokeError.message}`);
        }

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });

    } catch (error: any) {
        console.error('[INTERNAL] Error in hide-summary-item:', error.message);
        return new Response(JSON.stringify({ error: 'An error occurred processing your request' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
    }
};

serve(handler);