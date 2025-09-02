import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface SearchRequest {
  query: string;
  userId: string;
  patientId?: string;
  documentType?: string;
  categories?: string[];
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

interface SearchResult {
  id: string;
  filename: string;
  document_type: string;
  description: string;
  uploaded_at: string;
  patient_id: string;
  patient_name: string;
  content_keywords: string[];
  auto_categories: string[];
  content_confidence: number;
  relevance_score: number;
  matched_keywords: string[];
  file_url?: string;
}

function calculateRelevanceScore(
  query: string, 
  document: any,
  matchedKeywords: string[]
): number {
  let score = 0;
  const queryLower = query.toLowerCase();
  
  // Exact filename match (highest priority)
  if (document.filename.toLowerCase().includes(queryLower)) {
    score += 100;
  }
  
  // Description match
  if (document.description?.toLowerCase().includes(queryLower)) {
    score += 80;
  }
  
  // Document type match
  if (document.document_type?.toLowerCase().includes(queryLower)) {
    score += 60;
  }
  
  // Category matches
  if (document.auto_categories) {
    for (const category of document.auto_categories) {
      if (category.toLowerCase().includes(queryLower)) {
        score += 40;
      }
    }
  }
  
  // Keyword matches (weighted by confidence)
  score += matchedKeywords.length * 20 * (document.content_confidence || 0.5);
  
  // Extracted text match (if available)
  if (document.extracted_text?.toLowerCase().includes(queryLower)) {
    score += 30;
  }
  
  // Recent documents get slight boost
  const daysOld = (Date.now() - new Date(document.uploaded_at).getTime()) / (1000 * 60 * 60 * 24);
  if (daysOld < 30) {
    score += 10;
  }
  
  return score;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      query, 
      userId, 
      patientId, 
      documentType, 
      categories, 
      dateFrom, 
      dateTo, 
      limit = 20, 
      offset = 0 
    }: SearchRequest = await req.json();

    console.log(`Enhanced search for user ${userId}, query: "${query}"`);

    // Get accessible patient IDs for the user
    const { data: accessData, error: accessError } = await supabase
      .from('family_access')
      .select('patient_id')
      .eq('user_id', userId)
      .eq('can_view', true);

    if (accessError) {
      throw new Error(`Failed to get user access: ${accessError.message}`);
    }

    const accessiblePatientIds = accessData.map(row => row.patient_id);

    if (accessiblePatientIds.length === 0) {
      return new Response(JSON.stringify({ documents: [], total: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build the query
    let documentsQuery = supabase
      .from('documents')
      .select(`
        id,
        filename,
        document_type,
        description,
        uploaded_at,
        patient_id,
        content_keywords,
        auto_categories,
        content_confidence,
        extracted_text,
        file_path,
        patients!inner(name)
      `)
      .in('patient_id', accessiblePatientIds);

    // Apply filters
    if (patientId) {
      documentsQuery = documentsQuery.eq('patient_id', patientId);
    }

    if (documentType) {
      documentsQuery = documentsQuery.eq('document_type', documentType);
    }

    if (dateFrom) {
      documentsQuery = documentsQuery.gte('uploaded_at', dateFrom);
    }

    if (dateTo) {
      documentsQuery = documentsQuery.lte('uploaded_at', dateTo);
    }

    const { data: documents, error: documentsError } = await documentsQuery;

    if (documentsError) {
      throw new Error(`Failed to search documents: ${documentsError.message}`);
    }

    // Filter and score results based on query
    const queryLower = query.toLowerCase();
    const scoredResults: SearchResult[] = [];

    for (const doc of documents || []) {
      let matchedKeywords: string[] = [];
      let isRelevant = false;

      // Check if document matches the query
      if (query.trim() === '') {
        isRelevant = true; // Show all if no query
      } else {
        // Check filename, description, document type
        if (doc.filename.toLowerCase().includes(queryLower) ||
            doc.description?.toLowerCase().includes(queryLower) ||
            doc.document_type?.toLowerCase().includes(queryLower)) {
          isRelevant = true;
        }

        // Check categories
        if (doc.auto_categories) {
          for (const category of doc.auto_categories) {
            if (category.toLowerCase().includes(queryLower)) {
              isRelevant = true;
              break;
            }
          }
        }

        // Check category filter
        if (categories && categories.length > 0) {
          const hasMatchingCategory = doc.auto_categories?.some(cat => 
            categories.some(filterCat => cat.toLowerCase().includes(filterCat.toLowerCase()))
          );
          if (!hasMatchingCategory) {
            continue; // Skip if doesn't match category filter
          }
        }

        // Check keywords
        if (doc.content_keywords) {
          matchedKeywords = doc.content_keywords.filter(keyword =>
            keyword.toLowerCase().includes(queryLower)
          );
          if (matchedKeywords.length > 0) {
            isRelevant = true;
          }
        }

        // Check extracted text
        if (doc.extracted_text?.toLowerCase().includes(queryLower)) {
          isRelevant = true;
        }
      }

      if (isRelevant) {
        const relevanceScore = calculateRelevanceScore(query, doc, matchedKeywords);
        
        // Generate signed URL for file access
        let fileUrl;
        try {
          const { data: urlData } = await supabase.storage
            .from('medical-documents')
            .createSignedUrl(doc.file_path, 3600); // 1 hour expiry
          fileUrl = urlData?.signedUrl;
        } catch (error) {
          console.error('Error generating signed URL:', error);
        }

        scoredResults.push({
          id: doc.id,
          filename: doc.filename,
          document_type: doc.document_type,
          description: doc.description,
          uploaded_at: doc.uploaded_at,
          patient_id: doc.patient_id,
          patient_name: doc.patients?.name || 'Unknown',
          content_keywords: doc.content_keywords || [],
          auto_categories: doc.auto_categories || [],
          content_confidence: doc.content_confidence || 0,
          relevance_score: relevanceScore,
          matched_keywords: matchedKeywords,
          file_url: fileUrl,
        });
      }
    }

    // Sort by relevance score (highest first)
    scoredResults.sort((a, b) => b.relevance_score - a.relevance_score);

    // Apply pagination
    const paginatedResults = scoredResults.slice(offset, offset + limit);

    console.log(`Found ${scoredResults.length} relevant documents`);

    return new Response(JSON.stringify({
      documents: paginatedResults,
      total: scoredResults.length,
      query,
      searchMetadata: {
        hasContentAnalysis: paginatedResults.some(doc => doc.content_confidence > 0),
        avgConfidence: paginatedResults.reduce((sum, doc) => sum + doc.content_confidence, 0) / paginatedResults.length || 0,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in enhanced-search function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      documents: [],
      total: 0 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});