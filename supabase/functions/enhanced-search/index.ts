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

/**
 * @interface SearchRequest
 * @description Defines the structure of the request body for the enhanced search function.
 * @property {string} query - The search query.
 * @property {string} userId - The ID of the user performing the search.
 * @property {string} [patientId] - The ID of the patient to filter documents for.
 * @property {string} [documentType] - The type of document to filter by.
 * @property {string[]} [categories] - An array of categories to filter by.
 * @property {string} [dateFrom] - The start date of the date range to filter by.
 * @property {string} [dateTo] - The end date of the date range to filter by.
 * @property {number} [limit] - The maximum number of results to return.
 * @property {number} [offset] - The number of results to skip.
 */
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

/**
 * @interface SearchResult
 * @description Defines the structure of a search result object.
 */
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
  
  // Enhanced: Medical entities match (high priority for structured data)
  if (document.extracted_entities) {
    Object.keys(document.extracted_entities).forEach(entityType => {
      const entities = document.extracted_entities[entityType];
      if (Array.isArray(entities)) {
        entities.forEach((entity: any) => {
          // Handle string entities
          if (typeof entity === 'string' && entity.toLowerCase().includes(queryLower)) {
            if (entityType === 'doctors') score += 90;
            else if (entityType === 'conditions') score += 85;
            else if (entityType === 'medications') score += 80;
            else score += 70;
          }
          // Handle object entities (medications with dose, labResults with values, etc.)
          else if (typeof entity === 'object' && entity !== null) {
            Object.entries(entity).forEach(([key, value]: [string, any]) => {
              if (typeof value === 'string' && value.toLowerCase().includes(queryLower)) {
                // Higher score for name/test fields
                if (key === 'name' || key === 'test') {
                  score += 75;
                } else {
                  score += 50;
                }
              }
            });
          }
        });
      }
    });
  }
            else if (entityType === 'conditions') score += 85;
            else if (entityType === 'medications') score += 85;
            else if (entityType === 'tests') score += 70;
            else score += 50;
          }
        });
      }
    });
  }
  
  // Medical specialties match
  if (document.medical_specialties) {
    for (const specialty of document.medical_specialties) {
      if (specialty.toLowerCase().includes(queryLower)) {
        score += 65;
      }
    }
  }
  
  // Extracted dates match
  if (document.extracted_dates) {
    for (const date of document.extracted_dates) {
      if (date.includes(queryLower)) {
        score += 45;
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

/**
 * @function serve
 * @description A Supabase Edge Function that performs an enhanced search of documents based on a query and various filters.
 * @param {Request} req - The incoming HTTP request.
 * @returns {Response} - A JSON response with the search results or an error message.
 */
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

    // Get accessible patient IDs for the user (patients they created)
    const { data: accessData, error: accessError } = await supabase
      .from('patients')
      .select('id')
      .eq('created_by', userId);

    if (accessError) {
      throw new Error(`Failed to get user's patients: ${accessError.message}`);
    }

    const accessiblePatientIds = accessData.map(row => row.id);

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
        extracted_entities,
        medical_specialties,
        extracted_dates,
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

      // First, apply category filter if specified (applies regardless of query)
      if (categories && categories.length > 0) {
        const hasMatchingCategory = doc.auto_categories?.some((cat: any) => 
          categories.some(filterCat => cat.toLowerCase().includes(filterCat.toLowerCase()))
        );
        if (!hasMatchingCategory) {
          continue; // Skip if doesn't match category filter
        }
      }

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

        // Check categories for query matching
        if (doc.auto_categories) {
          for (const category of doc.auto_categories) {
            if (category.toLowerCase().includes(queryLower)) {
              isRelevant = true;
              break;
            }
          }
        }

        // Check keywords
        if (doc.content_keywords) {
          matchedKeywords = doc.content_keywords.filter((keyword: any) =>
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

        // Enhanced: Check medical entities for matches
        if (doc.extracted_entities) {
          Object.values(doc.extracted_entities).forEach((entities: any) => {
            if (Array.isArray(entities)) {
              entities.forEach((entity: any) => {
                // Handle string entities
                if (typeof entity === 'string' && entity.toLowerCase().includes(queryLower)) {
                  isRelevant = true;
                }
                // Handle object entities (medications, labResults)
                else if (typeof entity === 'object' && entity !== null) {
                  // Check all string values in the object
                  Object.values(entity).forEach((value: any) => {
                    if (typeof value === 'string' && value.toLowerCase().includes(queryLower)) {
                      isRelevant = true;
                    }
                  });
                }
              });
            }
          });
        }

        // Check medical specialties
        if (doc.medical_specialties) {
          for (const specialty of doc.medical_specialties) {
            if (specialty.toLowerCase().includes(queryLower)) {
              isRelevant = true;
              break;
            }
          }
        }

        // Check extracted dates
        if (doc.extracted_dates) {
          for (const date of doc.extracted_dates) {
            if (date.includes(queryLower)) {
              isRelevant = true;
              break;
            }
          }
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
          patient_name: (doc.patients as any)?.name || 'Unknown',
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
      error: (error as any)?.message || 'Unknown error',
      documents: [],
      total: 0 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});