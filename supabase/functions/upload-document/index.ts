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
  ocrResult?: any;
  aiAnalysisResult?: any;
  fileHash?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ============ AUTHENTICATION ============
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log(`📤 Upload request from user: ${user.id}`);

    // Use service role for admin operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // ============ INPUT VALIDATION ============
    const { shareableId, file, documentType, description, tags, ocrResult, aiAnalysisResult, fileHash }: UploadRequest = await req.json();

    // Only accept MED-ID format for uploads
    const upperId = shareableId.toUpperCase();
    if (!upperId.startsWith('MED-')) {
      console.error('❌ Invalid shareable ID format:', shareableId);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid patient ID format. Please use the patient\'s MED-ID (e.g., MED-12345678)',
          details: 'Only MED-ID format is supported for document uploads'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // ============ FILE HASH SECURITY CHECK ============
    if (fileHash) {
      const { data: isBlocked } = await supabase.rpc('is_file_blocked', { hash_input: fileHash });
      if (isBlocked) {
        console.log(`🚫 Blocked file upload attempt: ${fileHash}`);
        return new Response(
          JSON.stringify({ error: 'This file has been blocked and cannot be uploaded' }),
          { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
    }

    // ============ PATIENT LOOKUP ============
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id, name, hospital_id, created_by')
      .eq('shareable_id', upperId)
      .single();

    if (patientError || !patient) {
      console.error('❌ Patient not found:', upperId, patientError);
      return new Response(
        JSON.stringify({ 
          error: 'Patient not found',
          details: `No patient found with ID: ${upperId}`
        }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log(`📋 Found patient: ${patient.name} (${patient.id})`);

    // ============ PERMISSION CHECK ============
    let hasPermission = false;
    let permissionReason = '';

    // Check 1: Is user the creator of this patient?
    if (patient.created_by === user.id) {
      hasPermission = true;
      permissionReason = 'creator';
      console.log(`✅ Permission granted: User created this patient`);
    }

    // Check 2: Is user hospital staff for this patient's hospital?
    if (!hasPermission && patient.hospital_id) {
      const { data: staffUser } = await supabase
        .from('users')
        .select('id, role, hospital_id')
        .eq('id', user.id)
        .eq('role', 'hospital_staff')
        .eq('hospital_id', patient.hospital_id)
        .single();

      if (staffUser) {
        hasPermission = true;
        permissionReason = 'hospital_staff';
        console.log(`✅ Permission granted: User is hospital staff`);
      }
    }

    // Check 3: Is user admin?
    if (!hasPermission) {
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (userData?.role === 'admin') {
        hasPermission = true;
        permissionReason = 'admin';
        console.log(`✅ Permission granted: Admin user`);
      }
    }

    if (!hasPermission) {
      console.error('❌ Permission denied for user:', user.id, 'patient:', patient.id);
      return new Response(
        JSON.stringify({ 
          error: 'Permission denied',
          details: 'You do not have permission to upload documents for this patient. You must either be the patient creator, hospital staff at the patient\'s hospital, or an admin.'
        }),
        { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // ============ SERVER-SIDE PROCESSING ============
    let textToAnalyze: string | null = ocrResult?.text || null;
    let analysisSource = 'client-ocr';
    let requiresOcr = false;
    let finalAiAnalysisResult = (aiAnalysisResult && aiAnalysisResult.confidence > 0.5 && aiAnalysisResult.keywords?.length > 0) 
      ? aiAnalysisResult 
      : null;

    // PDF Text Extraction
    if (file.type === 'application/pdf' && !textToAnalyze) {
      console.log(`📄 PDF detected, extracting text...`);
      analysisSource = 'server-pdf-extraction';
      try {
        const { data: extractionData, error: extractionError } = await supabase.functions.invoke('pdf-text-extractor', {
          body: { fileContent: file.content, filename: file.name }
        });

        if (extractionError) throw new Error(`PDF extraction failed: ${extractionError.message}`);

        if (extractionData.success && extractionData.extractedText) {
          textToAnalyze = extractionData.extractedText;
          requiresOcr = extractionData.requiresOCR;
          console.log(`✅ Extracted ${textToAnalyze?.length || 0} characters from PDF`);
        } else {
          console.warn('PDF extraction failed, may require OCR');
          requiresOcr = true;
        }
      } catch (error) {
        console.error('PDF extraction error:', error.message);
        requiresOcr = true;
      }
    }

    // Enhanced Document Analysis
    if (textToAnalyze && (!finalAiAnalysisResult || file.type === 'application/pdf')) {
      console.log(`🤖 Running AI analysis...`);
      analysisSource = 'server-ai-analysis';
      try {
        const { data: analysisData, error: analysisError } = await supabase.functions.invoke('enhanced-document-analyze', {
          body: {
            documentId: 'temp-analysis',
            fileContent: file.content,
            contentType: file.type,
            filename: file.name,
            ocrResult: { text: textToAnalyze }
          }
        });

        if (analysisError) throw new Error(`AI analysis failed: ${analysisError.message}`);
        if (analysisData.success) {
          finalAiAnalysisResult = analysisData;
          console.log(`✅ AI analysis complete`);
        }
      } catch (error) {
        console.error('AI analysis error:', error.message);
      }
    }

    // ============ STORAGE UPLOAD ============
    const fileExtension = file.name.split('.').pop();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${patient.id}/${timestamp}-${file.name}`;
    const fileData = Uint8Array.from(atob(file.content), c => c.charCodeAt(0));

    const { error: uploadError } = await supabase.storage
      .from('medical-documents')
      .upload(fileName, fileData, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('❌ Storage upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to upload file to storage' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log(`✅ File uploaded to storage: ${fileName}`);

    // Get uploader details for traceability
    const { data: uploaderUser } = await supabase
      .from('users')
      .select('user_shareable_id')
      .eq('id', user.id)
      .single();

    // ============ DATABASE INSERT ============
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
        uploaded_by: user.id,
        uploaded_by_user_shareable_id: uploaderUser?.user_shareable_id || null,
        searchable_content: `${file.name} ${documentType} ${description || ''} ${tags?.join(' ') || ''}`,
        file_hash: fileHash || null,
        extracted_text: textToAnalyze,
        ocr_extracted_text: ocrResult?.text || (file.type !== 'application/pdf' ? textToAnalyze : null),
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
          requires_ocr: requiresOcr,
          permission_reason: permissionReason
        }
      })
      .select()
      .single();

    if (documentError) {
      console.error('❌ Database insert error:', documentError);
      // Clean up uploaded file
      await supabase.storage.from('medical-documents').remove([fileName]);
      return new Response(
        JSON.stringify({ error: 'Failed to save document metadata' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log(`✅ Document saved to database: ${documentData.id}`);

    // ============ POST-PROCESSING ============
    // Generate patient summary (non-blocking)
    supabase.functions.invoke('generate-patient-summary', {
      body: { documentId: documentData.id, patientId: patient.id }
    }).catch(err => console.error('Summary generation error:', err));

    // Send notifications (non-blocking)
    supabase.functions.invoke('notify-patient-upload', {
      body: {
        documentId: documentData.id,
        patientId: patient.id,
        uploadedBy: user.id,
        filename: file.name,
        documentType: documentType
      }
    }).catch(err => console.error('Notification error:', err));

    // Insert keywords if available
    if (finalAiAnalysisResult && finalAiAnalysisResult.keywords.length > 0) {
      const keywordInserts = finalAiAnalysisResult.keywords.map(keyword => ({
        document_id: documentData.id,
        keyword,
        keyword_type: 'general',
        confidence: finalAiAnalysisResult.confidence,
      }));

      if (finalAiAnalysisResult.entities) {
        Object.entries(finalAiAnalysisResult.entities).forEach(([entityType, entities]: [string, any]) => {
          if (Array.isArray(entities)) {
            entities.forEach(entity => {
              keywordInserts.push({
                document_id: documentData.id,
                keyword: entity,
                keyword_type: entityType,
                entity_category: entityType,
                confidence: finalAiAnalysisResult.confidence,
              });
            });
          }
        });
      }

      await supabase.from('document_keywords').insert(keywordInserts);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        documentId: documentData.id,
        document: documentData,
        message: `Document uploaded successfully for ${patient.name}`,
        skipAnalysis: !!finalAiAnalysisResult,
        analysisStatus: finalAiAnalysisResult ? 'Complete' : 'Pending'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error: any) {
    console.error('❌ Upload error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
};

serve(handler);