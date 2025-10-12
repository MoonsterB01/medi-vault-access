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

        const { patientId, correction } = await req.json();

        if (!patientId || !correction) {
            return new Response(JSON.stringify({ error: 'patientId and correction are required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', ...corsHeaders },
            });
        }

        // 1. Fetch the current patient summary
        const { data: existingSummary, error: summaryError } = await supabase
            .from('patient_summaries')
            .select('summary, version')
            .eq('patient_id', patientId)
            .single();

        if (summaryError || !existingSummary) {
            throw new Error(`Failed to fetch patient summary: ${summaryError?.message}`);
        }

        const currentSummary = existingSummary.summary;
        const newVersion = existingSummary.version + 1;

        // 2. Add the correction to the manualCorrections array
        if (!currentSummary.manualCorrections) {
            currentSummary.manualCorrections = [];
        }
        currentSummary.manualCorrections.push({
            ...correction,
            timestamp: new Date().toISOString(),
        });

        // 3. Apply the correction to the summary data
        // (This is a simplified example. A real implementation would need a more robust way to handle different field paths)
        if (correction.action === 'edited') {
            const { field, valueAfter } = correction;
            const fieldParts = field.split('.');
            let target = currentSummary;
            for (let i = 0; i < fieldParts.length - 1; i++) {
                target = target[fieldParts[i]];
            }
            target[fieldParts[fieldParts.length - 1]] = valueAfter;
        }


        // 4. Update the patient_summaries table
        const { error: upsertError } = await supabase
            .from('patient_summaries')
            .upsert({
                patient_id: patientId,
                summary: currentSummary,
                version: newVersion,
                updated_at: new Date().toISOString(),
            });

        if (upsertError) {
            throw new Error(`Failed to upsert patient summary: ${upsertError.message}`);
        }

        return new Response(JSON.stringify({ success: true, newVersion }), {
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