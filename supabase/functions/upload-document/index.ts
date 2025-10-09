import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UploadRequest {
  shareableId: string;
  file: {
    name: string;
    content: string; // base64 encoded
    type: string;
    size: number;
  };
  documentType: string;
  description?: string;
  tags?: string[];
  ocrResult?: {
    text: string;
    confidence: number;
    textDensityScore: number;
    medicalKeywordCount: number;
    detectedKeywords: string[];
    verificationStatus: string;
    formatSupported: boolean;
    processingNotes: string;
    structuralCues: any;
  };
  aiAnalysisResult?: {
    keywords: string[];
    categories: string[];
    confidence: number;
    entities: any;
    verificationStatus: string;
    textDensityScore: number;
    medicalKeywordCount: number;
    processingNotes: string;
  };
  fileHash?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: req.headers.get('Authorization')!,
          },
        },
      }
    );

    // Get authenticated user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // Use service role client for admin operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      shareableId, 
      file, 
      documentType, 
      description, 
      tags,
      ocrResult,
      aiAnalysisResult,
      fileHash
    }: UploadRequest = await req.json();

    console.log(`Uploading document for shareable ID: ${shareableId} by user: ${user.id}`);

    // Check if file is blocked (security measure)
    if (fileHash) {
      const { data: isBlocked } = await supabase
        .rpc('is_file_blocked', { hash_input: fileHash });
      
      if (isBlocked) {
        console.log(`Blocked file upload attempt: ${fileHash}`);
        return new Response(JSON.stringify({ 
          error: 'This file has been blocked and cannot be uploaded' 
        }), {
          status: 403,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
    }

    // Get uploader's details for traceability
    const { data: uploaderUser, error: uploaderError } = await supabase
      .from('users')
      .select('user_shareable_id')
      .eq('id', user.id)
      .single();

    if (uploaderError) {
      console.error('Failed to get uploader details:', uploaderError);
    }

    // Resolve patient by shareableId (supports MED-XXXXXXXX and USER-XXXXXXXX)
    const upperId = shareableId.toUpperCase();
    let patient: { id: string; name: string } | null = null;
    let hasPermission = false;

    if (upperId.startsWith('MED-')) {
      const { data: p, error: pErr } = await supabase
        .from('patients')
        .select('id, name')
        .eq('shareable_id', upperId)
        .single();
      if (pErr || !p) {
        console.error('Patient not found via MED ID:', pErr);
      } else {
        patient = p;
        // Check if user has permission to upload to this patient
        const { data: access } = await supabase
          .from('family_access')
          .select('id')
          .eq('user_id', user.id)
          .eq('patient_id', p.id)
          .eq('can_view', true)
          .single();
        hasPermission = !!access;
      }
    } else if (upperId.startsWith('USER-')) {
      // Find the user by their user_shareable_id, then map to a patient via family_access
      const { data: usr, error: usrErr } = await supabase
        .from('users')
        .select('id')
        .eq('user_shareable_id', upperId)
        .single();

      if (!usrErr && usr) {
        const { data: fa, error: faErr } = await supabase
          .from('family_access')
          .select('patient_id')
          .eq('user_id', usr.id)
          .eq('can_view', true)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (!faErr && fa?.patient_id) {
          const { data: p2, error: p2Err } = await supabase
            .from('patients')
            .select('id, name')
            .eq('id', fa.patient_id)
            .single();
          if (!p2Err && p2) {
            patient = p2;
            // Check if the current user has permission to upload to this patient
            const { data: userAccess } = await supabase
              .from('family_access')
              .select('id')
              .eq('user_id', user.id)
              .eq('patient_id', p2.id)
              .eq('can_view', true)
              .single();
            hasPermission = !!userAccess;
          } else {
            console.error('Patient lookup by family_access failed:', p2Err);
          }
        } else {
          console.error('family_access lookup failed or not found:', faErr);
        }
      } else {
        console.error('User not found via USER ID:', usrErr);
      }
    }

    if (!patient) {
      return new Response(
        JSON.stringify({ error: 'Invalid shareable ID' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    if (!hasPermission) {
      return new Response(
        JSON.stringify({ error: 'You do not have permission to upload documents for this patient' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // --- Server-side Processing Orchestration ---
    let textToAnalyze: string | null = ocrResult?.text || null;
    let analysisSource = 'client-ocr';
    let requiresOcr = false;
    let finalAiAnalysisResult = aiAnalysisResult; // Use client-side AI result if provided

    // 1. PDF Text Extraction
    // If the file is a PDF and we don't have pre-computed text, extract it
    if (file.type === 'application/pdf' && !textToAnalyze) {
      console.log(`PDF detected, invoking pdf-text-extractor for ${file.name}`);
      analysisSource = 'server-pdf-extraction';
      try {
        const { data: extractionData, error: extractionError } = await supabase.functions.invoke('pdf-text-extractor', {
          body: { fileContent: file.content, filename: file.name }
        });

        if (extractionError) throw new Error(`PDF text extraction failed: ${extractionError.message}`);

        if (extractionData.success && extractionData.extractedText) {
          textToAnalyze = extractionData.extractedText;
          requiresOcr = extractionData.requiresOCR;
          console.log(`Successfully extracted ${textToAnalyze?.length || 0} chars from PDF. Requires OCR: ${requiresOcr}`);
        } else {
          console.warn('pdf-text-extractor failed, falling back to OCR if possible.', extractionData.error);
          requiresOcr = true;
        }
      } catch (error) {
        console.error('Error invoking pdf-text-extractor:', error.message);
        requiresOcr = true; // Flag for potential client-side OCR later
      }
    }

    // 2. Enhanced Document Analysis
    // If we have text and no prior AI analysis, run the analysis function
    if (textToAnalyze && !finalAiAnalysisResult) {
      console.log(`Invoking enhanced-document-analyze for document: ${file.name}`);
      analysisSource = 'server-ai-analysis';
      try {
        const { data: analysisData, error: analysisError } = await supabase.functions.invoke('enhanced-document-analyze', {
          body: {
            documentId: 'temp-analysis',
            fileContent: file.content,
            contentType: file.type,
            filename: file.name,
            ocrResult: { text: textToAnalyze } // Pass the extracted text
          }
        });

        if (analysisError) throw new Error(`Enhanced analysis failed: ${analysisError.message}`);
        if (analysisData.success) {
          finalAiAnalysisResult = analysisData;
          console.log(`Successfully analyzed document: ${file.name}`);
        } else {
          console.warn('enhanced-document-analyze indicated failure:', analysisData.error);
        }
      } catch (error) {
        console.error('Error invoking enhanced-document-analyze:', error.message);
      }
    }

    // --- End of Server-side Processing ---

    // Generate unique file path
    const fileExtension = file.name.split('.').pop();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${patient.id}/${timestamp}-${file.name}`;

    // Convert base64 to binary
    const fileData = Uint8Array.from(atob(file.content), c => c.charCodeAt(0));

    // Upload file to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('medical-documents')
      .upload(fileName, fileData, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to upload file' }),
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    // Save document metadata with enhanced analysis data
    const { data: documentData, error: documentError } = await supabase
      .from('documents')
      .insert({
        patient_id: patient.id,
        filename: file.name,
        file_path: fileName,
        file_size: file.size,
        content_type: file.type,
        document_type: documentType,
        description: description || null,
        tags: tags || [],
        uploaded_by: user.id, // Track actual uploader
        uploaded_by_user_shareable_id: uploaderUser?.user_shareable_id || null,
        searchable_content: `${file.name} ${documentType} ${description || ''} ${tags?.join(' ') || ''}`,
        file_hash: fileHash || null,

        // Use server-side extracted text if available
        extracted_text: textToAnalyze,
        ocr_extracted_text: ocrResult?.text || (file.type !== 'application/pdf' ? textToAnalyze : null),

        // Use analysis results from server if available, otherwise fallback to client's
        text_density_score: finalAiAnalysisResult?.textDensityScore || ocrResult?.textDensityScore || 0,
        medical_keyword_count: finalAiAnalysisResult?.medicalKeywordCount || ocrResult?.medicalKeywordCount || 0,
        structural_cues: finalAiAnalysisResult?.structuralCues || ocrResult?.structuralCues || {},
        format_supported: ocrResult?.formatSupported ?? !requiresOcr,
        processing_notes: finalAiAnalysisResult?.processingNotes || ocrResult?.processingNotes || null,
        verification_status: finalAiAnalysisResult?.verificationStatus || ocrResult?.verificationStatus || 'unverified',
        content_keywords: finalAiAnalysisResult?.keywords || [],
        auto_categories: finalAiAnalysisResult?.categories || [],
        content_confidence: finalAiAnalysisResult?.confidence || 0,
        extracted_entities: finalAiAnalysisResult?.entities || {},
        medical_specialties: finalAiAnalysisResult?.entities?.specialties || [],
        extracted_dates: finalAiAnalysisResult?.entities?.dates || [],

        extraction_metadata: {
          upload_timestamp: new Date().toISOString(),
          has_ocr_results: !!ocrResult,
          has_ai_analysis: !!finalAiAnalysisResult,
          content_type: file.type,
          filename: file.name,
          analysis_source: analysisSource,
          requires_ocr: requiresOcr
        }
      })
      .select()
      .single();

    if (documentError) {
      console.error('Document metadata error:', documentError);
      // Clean up uploaded file if metadata fails
      await supabase.storage.from('medical-documents').remove([fileName]);
      
      return new Response(
        JSON.stringify({ error: 'Failed to save document metadata' }),
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    console.log('Document uploaded successfully:', documentData.id);

    // Send notifications to family members about the new document upload
    try {
      const { error: notificationError } = await supabase.functions.invoke('notify-patient-upload', {
        body: {
          documentId: documentData.id,
          patientId: patient.id,
          uploadedBy: user.id,
          filename: file.name,
          documentType: documentType
        }
      });
      
      if (notificationError) {
        console.error('Error sending upload notifications:', notificationError);
      } else {
        console.log('Upload notifications sent successfully');
      }
    } catch (notificationError) {
      console.error('Failed to send upload notifications:', notificationError);
    }

    // Insert keywords into document_keywords table if we have AI analysis
    if (aiAnalysisResult && aiAnalysisResult.keywords.length > 0) {
      const keywordInserts: any[] = [];
      
      // Add general keywords
      aiAnalysisResult.keywords.forEach(keyword => {
        keywordInserts.push({
          document_id: documentData.id,
          keyword,
          keyword_type: 'general',
          confidence: aiAnalysisResult.confidence,
        });
      });

      // Add entity-specific keywords
      if (aiAnalysisResult.entities) {
        Object.entries(aiAnalysisResult.entities).forEach(([entityType, entities]: [string, any]) => {
          if (Array.isArray(entities)) {
            entities.forEach(entity => {
              keywordInserts.push({
                document_id: documentData.id,
                keyword: entity,
                keyword_type: entityType,
                entity_category: entityType,
                confidence: aiAnalysisResult.confidence,
              });
            });
          }
        });
      }

      if (keywordInserts.length > 0) {
        const { error: keywordError } = await supabase
          .from('document_keywords')
          .insert(keywordInserts);

        if (keywordError) {
          console.error('Failed to insert keywords:', keywordError);
        } else {
          console.log(`Inserted ${keywordInserts.length} keywords for document ${documentData.id}`);
        }
      }
    }

    // If we have comprehensive AI analysis, skip the enhanced analysis step
    const skipEnhancedAnalysis = aiAnalysisResult && 
      aiAnalysisResult.confidence > 0.5 && 
      aiAnalysisResult.keywords.length > 0;

    return new Response(
      JSON.stringify({ 
        success: true, 
        documentId: documentData.id,
        document: documentData,
        message: `Document uploaded for ${patient.name}`,
        skipAnalysis: skipEnhancedAnalysis,
        analysisStatus: skipEnhancedAnalysis ? 'Complete' : 'Pending'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );

  } catch (error: any) {
    console.error('Error in upload-document function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
  }
};

serve(handler);