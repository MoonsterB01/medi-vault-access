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
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { shareableId, file, documentType, description, tags }: UploadRequest = await req.json();

    console.log(`Uploading document for shareable ID: ${shareableId}`);

    // Find patient by shareable ID
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id, name')
      .eq('shareable_id', shareableId)
      .single();

    if (patientError || !patient) {
      console.error('Patient not found:', patientError);
      return new Response(
        JSON.stringify({ error: 'Invalid shareable ID' }),
        { 
          status: 404, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

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

    // Save document metadata
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
        searchable_content: `${file.name} ${documentType} ${description || ''} ${tags?.join(' ') || ''}`
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

    return new Response(
      JSON.stringify({ 
        success: true, 
        document: documentData,
        message: `Document uploaded for ${patient.name}` 
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