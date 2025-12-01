import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";
import {
  createRequestId,
  logRequest,
  logResponse,
  logAuthDiagnostics,
  corsHeaders,
  parseRequestBody,
  logDbQuery,
  logStorageOperation,
  createErrorResponse
} from "../_shared/diagnostics.ts";

interface UploadRequest {
  file: {
    name: string;
    content: string;
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
  const requestId = createRequestId();
  const origin = req.headers.get('origin');
  
  logRequest(requestId, req);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  try {
    logAuthDiagnostics(requestId, req);
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return createErrorResponse(requestId, 401, 'authentication_required', authError?.message, origin);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let uploadData: UploadRequest;
    try {
      uploadData = await parseRequestBody(req, requestId);
    } catch (err: any) {
      return createErrorResponse(requestId, 400, 'invalid_request_body', err.message, origin);
    }

    const { file, documentType, description, tags, ocrResult, aiAnalysisResult, fileHash } = uploadData;

    console.log(JSON.stringify({ requestId, userId: user.id, step: 'fetching_patient_record' }));

    // Get patient record for authenticated user
    const { data: patients, error: patientError } = await supabase
      .from('patients')
      .select('id, name, shareable_id')
      .eq('created_by', user.id)
      .limit(1);
    
    logDbQuery(requestId, 'patients', 'select_by_created_by', patientError, patients?.length);
    
    if (patientError) {
      return createErrorResponse(requestId, 500, 'database_error', 'Failed to fetch patient record', origin);
    }
    
    if (!patients || patients.length === 0) {
      return createErrorResponse(requestId, 404, 'no_patient_record', 'No patient record found. Please contact support.', origin);
    }

    const patient = patients[0];
    console.log(JSON.stringify({ requestId, patientId: patient.id, patientName: patient.name, step: 'patient_found' }));

    if (fileHash) {
      const { data: isBlocked, error: hashError } = await supabase.rpc('is_file_blocked', { hash_input: fileHash });
      logDbQuery(requestId, 'blocked_files', 'rpc_is_file_blocked', hashError, isBlocked ? 1 : 0);
      if (isBlocked) {
        return createErrorResponse(requestId, 403, 'file_blocked', 'File has been blocked', origin);
      }
    }

    let extractedText = '';
    let analysisResult: any = null;

    // Optimize memory: only process PDF extraction if file is not too large
    const MAX_PDF_SIZE_FOR_EXTRACTION = 10 * 1024 * 1024; // 10MB limit for PDF extraction
    
    if (file.type === 'application/pdf' && (!ocrResult || !ocrResult.text)) {
      if (file.size <= MAX_PDF_SIZE_FOR_EXTRACTION) {
        try {
          console.log(JSON.stringify({ requestId, step: 'pdf_extraction_start', fileSize: file.size }));
          const extractionResponse = await supabase.functions.invoke('pdf-text-extractor', {
            body: { fileContent: file.content, fileName: file.name }
          });
          
          if (extractionResponse.error) {
            console.error(JSON.stringify({ requestId, step: 'pdf_extraction_error', error: extractionResponse.error }));
          } else if (extractionResponse.data?.extractedText) {
            extractedText = extractionResponse.data.extractedText;
            console.log(JSON.stringify({ requestId, step: 'pdf_extraction_success', textLength: extractedText.length }));
          }
        } catch (extractError: any) {
          console.error(JSON.stringify({ requestId, step: 'pdf_extraction_exception', error: extractError.message }));
        }
      } else {
        console.log(JSON.stringify({ requestId, step: 'pdf_extraction_skipped', reason: 'file_too_large', fileSize: file.size }));
      }
    } else if (ocrResult?.text) {
      extractedText = ocrResult.text;
      console.log(JSON.stringify({ requestId, step: 'using_ocr_text', textLength: extractedText.length }));
    }

    // Run AI analysis on extracted text
    if (extractedText && extractedText.length > 50) {
      try {
        console.log(JSON.stringify({ requestId, step: 'ai_analysis_start', textLength: extractedText.length }));
        const analysisResponse = await supabase.functions.invoke('enhanced-document-analyze', {
          body: { 
            documentId: 'temp-analysis',
            contentType: file.type,
            filename: file.name,
            ocrResult: {
              text: extractedText,
              confidence: 0.8,
              textDensityScore: extractedText.split(/\s+/).length,
              medicalKeywordCount: 0,
              detectedKeywords: [],
              verificationStatus: 'pending',
              formatSupported: true,
              processingNotes: 'Extracted from upload',
              structuralCues: {}
            }
          }
        });
        
        if (analysisResponse.error) {
          console.error(JSON.stringify({ requestId, step: 'ai_analysis_error', error: analysisResponse.error }));
        } else if (analysisResponse.data) {
          analysisResult = analysisResponse.data;
          console.log(JSON.stringify({ requestId, step: 'ai_analysis_success' }));
        }
      } catch (analysisError: any) {
        console.error(JSON.stringify({ requestId, step: 'ai_analysis_exception', error: analysisError.message }));
      }
    } else if (aiAnalysisResult) {
      analysisResult = aiAnalysisResult;
      console.log(JSON.stringify({ requestId, step: 'using_provided_analysis' }));
    }

    // Convert base64 to buffer for storage upload
    console.log(JSON.stringify({ requestId, step: 'converting_to_buffer', fileSize: file.size }));
    let fileBuffer: Uint8Array;
    try {
      fileBuffer = Uint8Array.from(atob(file.content), c => c.charCodeAt(0));
    } catch (conversionError: any) {
      console.error(JSON.stringify({ requestId, step: 'buffer_conversion_failed', error: conversionError.message }));
      return createErrorResponse(requestId, 400, 'invalid_file_content', 'Failed to process file content', origin);
    }
    
    const filePath = `${patient.id}/${crypto.randomUUID()}-${file.name}`;
    console.log(JSON.stringify({ requestId, step: 'uploading_to_storage', filePath }));

    const { data: uploadResult, error: uploadError } = await supabase.storage
      .from('medical-documents')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    logStorageOperation(requestId, 'medical-documents', 'upload', filePath, uploadError, !uploadError);

    if (uploadError) {
      console.error(JSON.stringify({ requestId, step: 'storage_upload_failed', error: uploadError.message }));
      return createErrorResponse(requestId, 500, 'storage_upload_failed', uploadError.message, origin);
    }
    
    console.log(JSON.stringify({ requestId, step: 'storage_upload_success', path: uploadResult.path }));

    const documentData: any = {
      patient_id: patient.id,
      uploaded_by: user.id,
      filename: file.name,
      file_path: filePath,
      file_size: file.size,
      document_type: documentType,
      description: description || null,
      tags: tags || [],
      verification_status: analysisResult ? 'verified_medical' : 'unverified',
      uploaded_by_user_shareable_id: user.user_metadata?.user_shareable_id || null,
    };

    if (extractedText) {
      documentData.extracted_text = extractedText;
      documentData.ocr_extracted_text = ocrResult?.text || null;
      documentData.searchable_content = extractedText.toLowerCase();
    }

    if (analysisResult) {
      documentData.ai_summary = analysisResult.summary || null;
      documentData.content_keywords = analysisResult.keywords || [];
      documentData.auto_categories = analysisResult.categories || [];
      documentData.extracted_entities = analysisResult.entities || null;
      documentData.content_confidence = analysisResult.confidence || null;
      documentData.medical_specialties = analysisResult.specialties || [];
      documentData.medical_keyword_count = analysisResult.medicalKeywordCount || 0;
    }

    if (fileHash) {
      documentData.file_hash = fileHash;
      await supabase.rpc('register_file_hash', {
        hash_input: fileHash,
        filename_input: file.name,
        size_input: file.size,
        content_type_input: file.type
      });
    }

    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert([documentData])
      .select()
      .single();

    logDbQuery(requestId, 'documents', 'insert', docError, document ? 1 : 0);

    if (docError) {
      console.error(JSON.stringify({ requestId, step: 'document_creation_failed', error: docError.message }));
      // Clean up uploaded file since document record creation failed
      await supabase.storage.from('medical-documents').remove([filePath]);
      logStorageOperation(requestId, 'medical-documents', 'cleanup_delete', filePath, null, true);
      return createErrorResponse(requestId, 500, 'document_creation_failed', docError.message, origin);
    }

    console.log(JSON.stringify({ requestId, step: 'document_created', documentId: document.id }));

    // Clear file buffer from memory to reduce memory usage
    fileBuffer = new Uint8Array(0);

    // Auto-generate document summary if we have extracted text (non-blocking)
    if (extractedText && extractedText.length > 50) {
      console.log(JSON.stringify({ requestId, step: 'triggering_summary_generation' }));
      supabase.functions.invoke('generate-document-summary', { 
        body: { documentId: document.id } 
      }).catch((err) => {
        console.error(JSON.stringify({ requestId, step: 'summary_generation_trigger_failed', error: err.message }));
      });
    }
    
    // Trigger patient summary update (non-blocking)
    console.log(JSON.stringify({ requestId, step: 'triggering_patient_summary' }));
    supabase.functions.invoke('generate-patient-summary', { 
      body: { patientId: patient.id } 
    }).catch((err) => {
      console.error(JSON.stringify({ requestId, step: 'patient_summary_trigger_failed', error: err.message }));
    });
    
    // Send notification (non-blocking)
    supabase.functions.invoke('notify-patient-upload', { 
      body: { documentId: document.id, patientId: patient.id, uploadedBy: user.id } 
    }).catch((err) => {
      console.error(JSON.stringify({ requestId, step: 'notification_trigger_failed', error: err.message }));
    });

    // Extract and store keywords from analysis (with error handling)
    if (analysisResult?.keywords?.length > 0 || analysisResult?.entities) {
      try {
        console.log(JSON.stringify({ requestId, step: 'extracting_keywords' }));
        const keywords = [
          ...(analysisResult.keywords || []).map((kw: string) => ({ 
            document_id: document.id, 
            keyword: kw, 
            keyword_type: 'auto_extracted' 
          }))
        ];

        // Handle entities object structure (doctors, conditions, medications, etc.)
        if (analysisResult.entities && typeof analysisResult.entities === 'object') {
          Object.entries(analysisResult.entities).forEach(([entityType, values]: [string, any]) => {
            if (Array.isArray(values)) {
              values.forEach((value: string) => {
                if (value) {
                  keywords.push({
                    document_id: document.id,
                    keyword: value,
                    entity_type: entityType,
                    keyword_type: 'entity'
                  });
                }
              });
            }
          });
        }

        if (keywords.length > 0) {
          console.log(JSON.stringify({ requestId, step: 'inserting_keywords', count: keywords.length }));
          const { error: kwError } = await supabase.from('document_keywords').insert(keywords);
          logDbQuery(requestId, 'document_keywords', 'bulk_insert', kwError, keywords.length);
          
          if (kwError) {
            console.error(JSON.stringify({ requestId, step: 'keyword_insert_failed', error: kwError.message }));
          } else {
            console.log(JSON.stringify({ requestId, step: 'keywords_inserted_successfully' }));
          }
        }
      } catch (keywordError: any) {
        console.error(JSON.stringify({ requestId, step: 'keyword_processing_exception', error: keywordError.message }));
        // Don't fail the upload if keyword extraction fails
      }
    }

    const response = {
      success: true,
      documentId: document.id,
      filePath: uploadResult.path,
      extractedText: extractedText ? `${extractedText.substring(0, 200)}...` : null,
      analysisCompleted: !!analysisResult,
      requestId
    };

    logResponse(requestId, 200, response);
    return new Response(JSON.stringify(response), { status: 200, headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error(JSON.stringify({ 
      requestId, 
      uncaughtError: error.message, 
      stack: error.stack?.substring(0, 500),
      errorType: error.name 
    }));
    
    // Provide more specific error messages
    let errorMessage = error.message;
    if (error.message?.includes('memory')) {
      errorMessage = 'File too large to process. Please try a smaller file.';
    } else if (error.message?.includes('timeout')) {
      errorMessage = 'Upload timed out. Please try again.';
    }
    
    return createErrorResponse(requestId, 500, 'internal_server_error', errorMessage, origin);
  }
};

serve(handler);
