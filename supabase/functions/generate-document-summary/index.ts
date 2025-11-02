import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { documentId } = await req.json();
    console.log(`Generating summary for document: ${documentId}`);

    if (!documentId) {
      return new Response(
        JSON.stringify({ error: 'Document ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the document
    const { data: document, error: docError } = await supabaseClient
      .from('documents')
      .select('extracted_text, ocr_extracted_text, filename, document_type')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      console.error('Document not found:', docError);
      return new Response(
        JSON.stringify({ error: 'Document not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get text content
    const textContent = document.extracted_text || document.ocr_extracted_text || '';
    
    if (!textContent || textContent.length < 10) {
      return new Response(
        JSON.stringify({ 
          summary: 'Unable to generate summary - insufficient text content in document.',
          confidence: 0
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Lovable AI to generate summary
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a medical document analyzer. Summarize medical documents concisely in 2-3 sentences, highlighting the most important medical information such as diagnoses, medications, test results, or clinical findings. Be clear and professional.`
          },
          {
            role: 'user',
            content: `Summarize this medical document (${document.document_type || 'unknown type'}):\n\n${textContent.slice(0, 3000)}`
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const summary = aiData.choices?.[0]?.message?.content || 'Unable to generate summary.';
    const confidence = 0.85; // Default confidence for AI-generated summaries

    // Update document with summary
    const { data: updatedDoc, error: updateError } = await supabaseClient
      .from('documents')
      .update({
        ai_summary: summary,
        summary_confidence: confidence,
        summary_generated_at: new Date().toISOString(),
      })
      .eq('id', documentId)
      .select('patient_id')
      .single();

    if (updateError) {
      console.error('Error updating document with summary:', updateError);
    }

    console.log('Document summary generated successfully');

    // Trigger patient summary update after document summary is generated
    if (updatedDoc?.patient_id) {
      try {
        const { error: patientSummaryError } = await supabaseClient.functions.invoke('generate-patient-summary', {
          body: { patientId: updatedDoc.patient_id }
        });
        
        if (patientSummaryError) {
          console.error('Failed to trigger patient summary update:', patientSummaryError);
        } else {
          console.log('✅ Triggered patient summary update after document summary');
        }
      } catch (err) {
        console.error('Error triggering patient summary update:', err);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        summary,
        confidence,
        documentId 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in generate-document-summary:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});