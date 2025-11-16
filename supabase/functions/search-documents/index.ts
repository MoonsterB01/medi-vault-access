import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * @interface SearchRequest
 * @description Defines the structure of the request body for the search documents function.
 * @property {string} [patientId] - The ID of the patient to filter documents for.
 * @property {string} [query] - The search query.
 * @property {string} [documentType] - The type of document to filter by.
 * @property {string[]} [tags] - An array of tags to filter by.
 * @property {string} [dateFrom] - The start date of the date range to filter by.
 * @property {string} [dateTo] - The end date of the date range to filter by.
 * @property {number} [limit] - The maximum number of results to return.
 * @property {number} [offset] - The number of results to skip.
 */
interface SearchRequest {
  patientId?: string;
  query?: string;
  documentType?: string;
  tags?: string[];
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

/**
 * @function handler
 * @description A Supabase Edge Function that searches for documents based on various filters.
 * @param {Request} req - The incoming HTTP request.
 * @returns {Promise<Response>} - A promise that resolves with a JSON response containing the search results or an error message.
 */
const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { 
          status: 401, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        },
        auth: { persistSession: false }
      }
    );

    // Parse request body first
    const { 
      patientId, 
      query, 
      documentType, 
      tags, 
      dateFrom, 
      dateTo, 
      limit = 50, 
      offset = 0 
    }: SearchRequest = await req.json();

    // Get current user using the token
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) {
      console.error('User auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Invalid user session' }),
        { 
          status: 401, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    console.log('Searching documents for user:', user.id, 'with filters:', { patientId, query, documentType, tags });

    // Get user's accessible patient IDs (patients they created)
    const { data: patients, error: accessError } = await supabase
      .from('patients')
      .select('id')
      .eq('created_by', user.id);

    if (accessError) {
      console.error('Error getting patients:', accessError);
      return new Response(
        JSON.stringify({ error: 'Access denied' }),
        { 
          status: 403, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    const accessiblePatientIds = patients?.map(p => p.id) || [];
    console.log('User has access to patients:', accessiblePatientIds);

    if (accessiblePatientIds.length === 0) {
      return new Response(
        JSON.stringify({ 
          documents: [],
          total: 0,
          offset,
          limit
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // Build query - filter by accessible patients
    let queryBuilder = supabase
      .from('documents')
      .select('*')
      .in('patient_id', accessiblePatientIds)
      .order('uploaded_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply additional filters
    if (patientId && accessiblePatientIds.includes(patientId)) {
      queryBuilder = queryBuilder.eq('patient_id', patientId);
    }

    if (documentType) {
      queryBuilder = queryBuilder.eq('document_type', documentType);
    }

    if (query) {
      queryBuilder = queryBuilder.ilike('searchable_content', `%${query}%`);
    }

    if (tags && tags.length > 0) {
      queryBuilder = queryBuilder.overlaps('tags', tags);
    }

    if (dateFrom) {
      queryBuilder = queryBuilder.gte('uploaded_at', dateFrom);
    }

    if (dateTo) {
      queryBuilder = queryBuilder.lte('uploaded_at', dateTo);
    }

    const { data: documents, error: searchError } = await queryBuilder;

    if (searchError) {
      console.error('Search error:', searchError);
      return new Response(
        JSON.stringify({ error: 'Failed to search documents' }),
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    if (!documents) {
      return new Response(
        JSON.stringify({ 
          documents: [],
          total: 0,
          offset,
          limit
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // Generate signed URLs and fetch patient data separately to avoid RLS issues
    const documentsWithUrls = await Promise.all(
      documents.map(async (doc) => {
        // Fetch patient data separately
        const { data: patient } = await supabase
          .from('patients')
          .select('name, shareable_id')
          .eq('id', doc.patient_id)
          .maybeSingle();

        const { data: signedUrl } = await supabase.storage
          .from('medical-documents')
          .createSignedUrl(doc.file_path, 3600); // 1 hour expiry

        return {
          ...doc,
          patients: patient,
          signed_url: signedUrl?.signedUrl
        };
      })
    );

    console.log(`Found ${documentsWithUrls.length} documents`);

    return new Response(
      JSON.stringify({ 
        documents: documentsWithUrls,
        total: documentsWithUrls.length,
        offset,
        limit
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );

  } catch (error: any) {
    console.error('Error in search-documents function:', error);
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