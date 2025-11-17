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

    if (file.type === 'application/pdf' && (!ocrResult || !ocrResult.text)) {
      try {
        const extractionResponse = await supabase.functions.invoke('pdf-text-extractor', {
          body: { fileContent: file.content, fileName: file.name }
        });
        if (extractionResponse.data?.extractedText) {
          extractedText = extractionResponse.data.extractedText;
        }
      } catch (extractError) {
        console.error('Text extraction failed:', extractError);
      }
    } else if (ocrResult?.text) {
      extractedText = ocrResult.text;
    }

    if (extractedText && extractedText.length > 50) {
      try {
        const analysisResponse = await supabase.functions.invoke('enhanced-document-analyze', {
          body: { documentText: extractedText, documentType, patientId: patient.id }
        });
        if (analysisResponse.data) {
          analysisResult = analysisResponse.data;
        }
      } catch (analysisError) {
        console.error('AI analysis failed:', analysisError);
      }
    } else if (aiAnalysisResult) {
      analysisResult = aiAnalysisResult;
    }

    const fileBuffer = Uint8Array.from(atob(file.content), c => c.charCodeAt(0));
    const filePath = `${patient.id}/${crypto.randomUUID()}-${file.name}`;

    const { data: uploadResult, error: uploadError } = await supabase.storage
      .from('medical-documents')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    logStorageOperation(requestId, 'medical-documents', 'upload', filePath, uploadError, !uploadError);

    if (uploadError) {
      return createErrorResponse(requestId, 500, 'storage_upload_failed', uploadError.message, origin);
    }

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
      await supabase.storage.from('medical-documents').remove([filePath]);
      logStorageOperation(requestId, 'medical-documents', 'cleanup_delete', filePath, null, true);
      return createErrorResponse(requestId, 500, 'document_creation_failed', docError.message, origin);
    }

    supabase.functions.invoke('generate-patient-summary', { body: { patientId: patient.id } }).catch(() => {});
    supabase.functions.invoke('notify-patient-upload', { body: { documentId: document.id, patientId: patient.id, uploadedBy: user.id } }).catch(() => {});

    if (analysisResult?.keywords?.length > 0 || analysisResult?.entities?.length > 0) {
      const keywords = [
        ...(analysisResult.keywords || []).map((kw: string) => ({ document_id: document.id, keyword: kw, keyword_type: 'auto_extracted' })),
        ...(analysisResult.entities || []).map((ent: any) => ({ document_id: document.id, keyword: ent.text || ent.value, entity_type: ent.type, entity_category: ent.category, confidence: ent.confidence }))
      ];

      if (keywords.length > 0) {
        const { error: kwError } = await supabase.from('document_keywords').insert(keywords);
        logDbQuery(requestId, 'document_keywords', 'bulk_insert', kwError, keywords.length);
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
    console.error(JSON.stringify({ requestId, uncaughtError: error.message, stack: error.stack }));
    return createErrorResponse(requestId, 500, 'internal_server_error', error.message, origin);
  }
};

serve(handler);
