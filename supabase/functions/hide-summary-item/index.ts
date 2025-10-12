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

        const { patientId, itemType, itemId } = await req.json();

        if (!patientId || !itemType || !itemId) {
            return new Response(JSON.stringify({ error: 'patientId, itemType, and itemId are required' }), {
                status: 400,
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
        console.error('Error in hide-summary-item function:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
    }
};

serve(handler);