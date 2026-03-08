import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to send WhatsApp text reply
async function sendWhatsAppReply(to: string, message: string) {
  const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  if (!phoneNumberId || !accessToken) return;

  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { body: message },
        }),
      }
    );
    if (!res.ok) {
      console.error("WhatsApp send error:", await res.text());
    } else {
      console.log("WhatsApp reply sent to", to);
    }
  } catch (error) {
    console.error("Failed to send WhatsApp reply:", error);
  }
}

// Upload file to Gemini Files API and get a file URI (no base64, no memory issues)
async function uploadToGeminiFiles(
  fileBlob: Blob,
  mimeType: string,
  displayName: string
): Promise<string | null> {
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
  if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY not configured');
    return null;
  }

  try {
    // Step 1: Start resumable upload to get upload URL
    const startRes = await fetch(
      `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'X-Goog-Upload-Protocol': 'resumable',
          'X-Goog-Upload-Command': 'start',
          'X-Goog-Upload-Header-Content-Length': String(fileBlob.size),
          'X-Goog-Upload-Header-Content-Type': mimeType,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ file: { display_name: displayName } }),
      }
    );

    const uploadUrl = startRes.headers.get('X-Goog-Upload-URL');
    if (!uploadUrl) {
      console.error('Failed to get upload URL from Gemini Files API');
      return null;
    }

    // Step 2: Upload the actual file bytes
    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'X-Goog-Upload-Offset': '0',
        'X-Goog-Upload-Command': 'upload, finalize',
        'Content-Length': String(fileBlob.size),
      },
      body: fileBlob,
    });

    if (!uploadRes.ok) {
      console.error('Gemini file upload failed:', uploadRes.status, await uploadRes.text());
      return null;
    }

    const uploadData = await uploadRes.json();
    const fileUri = uploadData.file?.uri;
    console.log(`Gemini file uploaded: ${fileUri}`);
    return fileUri || null;
  } catch (error) {
    console.error('Gemini file upload error:', error);
    return null;
  }
}

// Extract text using Gemini Vision
async function extractTextFromStorage(
  supabaseClient: any,
  filePath: string,
  contentType: string
): Promise<string | null> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

  try {
    const isImage = contentType.startsWith('image/');

    if (isImage && LOVABLE_API_KEY) {
      // Images: use signed URL via Lovable gateway (works great, no memory issues)
      const { data: signedUrlData, error: signedUrlError } = await supabaseClient.storage
        .from('medical-documents')
        .createSignedUrl(filePath, 600);

      if (signedUrlError || !signedUrlData?.signedUrl) {
        console.error('Signed URL error:', signedUrlError);
        return null;
      }
      console.log('Using signed URL for image OCR');

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: signedUrlData.signedUrl } },
              { type: 'text', text: 'Extract ALL text content from this medical document. Include every detail: patient information, test names, values, units, reference ranges, dates, doctor names, hospital names, diagnoses, medications, and any other text visible. Preserve the structure. Output ONLY the extracted text, no commentary.' },
            ],
          }],
          stream: false,
        }),
      });

      if (!response.ok) {
        console.error('Vision API error:', response.status, await response.text());
        return null;
      }
      const data = await response.json();
      const extractedText = data.choices?.[0]?.message?.content;
      console.log(`Extracted text (image): ${extractedText?.length || 0} chars`);
      return extractedText || null;
    }

    // PDFs: Use Gemini Files API directly (streams file, no base64, no memory issues)
    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY not configured for PDF processing');
      return null;
    }

    // Download file as blob (streaming, not fully buffered)
    const { data: fileData, error: downloadError } = await supabaseClient.storage
      .from('medical-documents')
      .download(filePath);

    if (downloadError || !fileData) {
      console.error('File download error:', downloadError);
      return null;
    }

    console.log(`Downloaded file for Gemini upload: ${fileData.size} bytes`);

    // Upload to Gemini Files API (streams the blob, no base64 needed)
    const fileUri = await uploadToGeminiFiles(fileData, 'application/pdf', filePath);
    if (!fileUri) {
      console.error('Failed to upload PDF to Gemini');
      return null;
    }

    // Now call Gemini generateContent with fileUri reference
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: 'Extract ALL text content from this medical document. Include every detail: patient information, test names, values, units, reference ranges, dates, doctor names, hospital names, diagnoses, medications, and any other text visible. Preserve the structure. Output ONLY the extracted text, no commentary.' },
              { file_data: { mime_type: 'application/pdf', file_uri: fileUri } },
            ],
          }],
        }),
      }
    );

    if (!response.ok) {
      console.error('Gemini generateContent error:', response.status, await response.text());
      return null;
    }

    const result = await response.json();
    const extractedText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log(`Extracted text (PDF via Gemini Files): ${extractedText?.length || 0} chars`);
    return extractedText || null;
  } catch (error) {
    console.error('Text extraction error:', error);
    return null;
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { documentId, whatsappNumber } = await req.json();
    console.log(`Generating summary for document: ${documentId}, whatsapp: ${whatsappNumber || 'none'}`);

    if (!documentId) {
      return new Response(
        JSON.stringify({ error: 'Document ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the document
    const { data: document, error: docError } = await supabaseClient
      .from('documents')
      .select('extracted_text, ocr_extracted_text, filename, document_type, file_path, content_type, patient_id')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      console.error('Document not found:', docError);
      return new Response(
        JSON.stringify({ error: 'Document not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get text content - either from DB or by extracting from file
    let textContent = document.extracted_text || document.ocr_extracted_text || '';

    // If no text extracted yet, do OCR from storage
    if (!textContent || textContent.length < 10) {
      console.log('No extracted text found, performing OCR from storage...');
      const extractedText = await extractTextFromStorage(
        supabaseClient,
        document.file_path,
        document.content_type || 'application/pdf'
      );

      if (extractedText && extractedText.length >= 10) {
        textContent = extractedText;
        // Save extracted text to document
        await supabaseClient.from('documents').update({
          extracted_text: extractedText,
        }).eq('id', documentId);
        console.log('Extracted text saved to document');
      }
    }

    if (!textContent || textContent.length < 10) {
      const errorMsg = 'Unable to generate summary - insufficient text content in document.';
      if (whatsappNumber) {
        await sendWhatsAppReply(whatsappNumber, "⚠️ I couldn't read the text from your document. Please ensure the image/PDF is clear and try again.");
      }
      return new Response(
        JSON.stringify({ summary: errorMsg, confidence: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate AI summary
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
            content: `You are a medical document analyzer. Summarize medical documents concisely, highlighting the most important medical information such as diagnoses, medications, test results, or clinical findings. Be clear and professional. Use bullet points. Keep under 500 words.`
          },
          {
            role: 'user',
            content: `Summarize this medical document (${document.document_type || 'unknown type'}):\n\n${textContent.slice(0, 5000)}`
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
    const confidence = 0.85;

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

    // Send summary to WhatsApp if this was a WhatsApp upload
    if (whatsappNumber) {
      const replyMessage = `✅ *Report Analyzed Successfully!*\n\n📋 *Summary:*\n${summary.substring(0, 3500)}\n\n📱 View full details in your MediVault dashboard.`;
      await sendWhatsAppReply(whatsappNumber, replyMessage);
    }

    // Trigger patient summary update
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

    // Also trigger enhanced analysis pipeline
    try {
      const analyzeRes = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/enhanced-document-analyze`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            documentId,
            contentType: document.content_type,
            filename: document.filename,
            ocrResult: {
              text: textContent.substring(0, 5000),
              confidence: 0.85,
              textDensityScore: textContent.split(/\s+/).length,
              medicalKeywordCount: 0,
              detectedKeywords: [],
              verificationStatus: "unverified",
              formatSupported: true,
              processingNotes: "Extracted via generate-document-summary",
              structuralCues: {},
            },
          }),
        }
      );
      if (!analyzeRes.ok) {
        console.error('Enhanced analysis failed:', analyzeRes.status, await analyzeRes.text());
      } else {
        await analyzeRes.text();
        console.log('Enhanced analysis completed');
      }
    } catch (err) {
      console.error('Enhanced analysis error:', err);
    }

    return new Response(
      JSON.stringify({ success: true, summary, confidence, documentId }),
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
