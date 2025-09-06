import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface AnalyzeRequest {
  documentId: string;
  fileContent: string;
  contentType: string;
  filename: string;
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
}

async function getMedicalKeywords(): Promise<Array<{keyword: string, category: string, weight: number}>> {
  const { data, error } = await supabase
    .from('medical_keywords')
    .select('keyword, category, weight');
  
  if (error) {
    console.error('Error fetching medical keywords:', error);
    return [];
  }
  
  return data || [];
}

async function analyzeWithHybridFiltering(
  text: string, 
  filename: string, 
  ocrResult?: any
): Promise<{
  keywords: string[];
  categories: string[];
  confidence: number;
  entities: any;
  verificationStatus: string;
  textDensityScore: number;
  medicalKeywordCount: number;
  structuralCues: any;
  processingNotes: string;
}> {
  // Use OCR result if available, otherwise analyze text
  let analysisText = text;
  let textDensityScore = 0;
  let medicalKeywordCount = 0;
  let detectedKeywords: string[] = [];
  let structuralCues: any = {};
  let verificationStatus = 'unverified';
  let processingNotes = '';

  if (ocrResult) {
    // Use pre-processed OCR results
    analysisText = ocrResult.text;
    textDensityScore = ocrResult.textDensityScore;
    medicalKeywordCount = ocrResult.medicalKeywordCount;
    detectedKeywords = ocrResult.detectedKeywords || [];
    structuralCues = ocrResult.structuralCues || {};
    verificationStatus = ocrResult.verificationStatus;
    processingNotes = ocrResult.processingNotes;
  } else {
    // Fallback: analyze text directly
    const words = analysisText.trim().split(/\s+/).filter(word => word.length > 0);
    const meaningfulWords = words.filter(word => 
      word.length >= 3 && 
      /[a-zA-Z]/.test(word) && 
      !(/^\d+$/.test(word))
    );
    textDensityScore = meaningfulWords.length;

    // Get medical keywords from database
    const medicalKeywords = await getMedicalKeywords();
    const lowerText = analysisText.toLowerCase();
    
    detectedKeywords = medicalKeywords
      .filter(mk => lowerText.includes(mk.keyword.toLowerCase()))
      .map(mk => mk.keyword);
    
    medicalKeywordCount = detectedKeywords.length;
    
    // Determine verification status using hybrid filtering
    if (textDensityScore >= 3 && medicalKeywordCount >= 2) {
      verificationStatus = 'verified_medical';
      processingNotes = 'Automatically verified based on text density and medical keywords.';
    } else if (textDensityScore >= 1 && medicalKeywordCount >= 1) {
      verificationStatus = 'user_verified_medical';
      processingNotes = 'Requires user verification. May be a medical document.';
    } else {
      verificationStatus = 'unverified';
      processingNotes = 'Low medical content detected. User verification required.';
    }

    // Detect structural cues
    structuralCues = {
      hasDates: /\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b|\b\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}\b/.test(analysisText),
      hasUnits: /\b\d+\s*(mg|ml|mmhg|bpm|units|dose|%)\b/i.test(analysisText),
      hasNumbers: /\b\d+(\.\d+)?\b/.test(analysisText),
      hasTableStructure: analysisText.includes('\t') || /\s{4,}/.test(analysisText)
    };
  }

  // Enhanced Gemini analysis with hybrid filtering context
  let geminiAnalysis = {
    keywords: detectedKeywords,
    categories: ['General Medical'],
    confidence: medicalKeywordCount >= 2 ? 0.8 : 0.4,
    entities: {}
  };

  if (geminiApiKey && analysisText.length > 10) {
    try {
      const prompt = `Analyze this medical document with hybrid filtering context:

DOCUMENT CONTENT: ${analysisText}
FILENAME: ${filename}
PRE-ANALYSIS:
- Text Density Score: ${textDensityScore} words
- Medical Keywords Found: ${medicalKeywordCount} (${detectedKeywords.join(', ')})
- Verification Status: ${verificationStatus}

ENHANCED ANALYSIS REQUIRED:
1. MEDICAL ENTITIES (extract if found):
   - Doctor/Physician names
   - Medical conditions/diagnoses  
   - Medications/prescriptions
   - Test names and results
   - Medical procedures
   - Dates and measurements

2. DOCUMENT CATEGORIES (max 3 most relevant):
   Choose from: "Lab Results", "Prescription", "Imaging Report", "Consultation Notes", "Discharge Summary", "Referral Letter", "Surgical Report", "Vaccination Record", "Insurance Document", "General Medical"

3. ADDITIONAL KEYWORDS (medical terms not already detected)

4. CONFIDENCE ASSESSMENT (0.0-1.0) considering:
   - OCR quality and text clarity
   - Medical content relevance
   - Document completeness

RESPOND ONLY in this exact JSON format:
{
  "entities": {
    "doctors": ["Dr. Name"],
    "conditions": ["condition"],
    "medications": ["medication"],
    "tests": ["test name"],
    "procedures": ["procedure"],
    "dates": ["2024-01-15"],
    "measurements": ["120/80 mmHg"]
  },
  "keywords": ["additional", "medical", "keywords"],
  "categories": ["Lab Results", "Prescription"],
  "confidence": 0.85
}`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          }
        }),
      });

      const data = await response.json();
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (generatedText) {
        const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const analysis = JSON.parse(jsonMatch[0]);
          
          // Merge Gemini results with hybrid analysis
          geminiAnalysis = {
            keywords: [...detectedKeywords, ...(analysis.keywords || [])].slice(0, 20),
            categories: analysis.categories || ['General Medical'],
            confidence: Math.max(analysis.confidence || 0.4, medicalKeywordCount >= 2 ? 0.7 : 0.3),
            entities: analysis.entities || {}
          };
        }
      }
    } catch (error) {
      console.error('Gemini analysis error:', error);
    }
  }

  return {
    ...geminiAnalysis,
    verificationStatus,
    textDensityScore,
    medicalKeywordCount,
    structuralCues,
    processingNotes
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentId, fileContent, contentType, filename, ocrResult }: AnalyzeRequest = await req.json();

    console.log(`Enhanced analysis for document ${documentId} with type ${contentType}, filename: ${filename}`);
    
    // Extract text content or use OCR result
    let extractedText = '';
    if (ocrResult?.text) {
      extractedText = ocrResult.text;
      console.log(`Using OCR extracted text: ${extractedText.length} characters`);
    } else {
      // Fallback text extraction
      if (contentType.includes('text/')) {
        extractedText = atob(fileContent);
      } else {
        extractedText = `Document: ${filename}`;
      }
      console.log(`Fallback text extraction: ${extractedText.length} characters`);
    }
    
    // Perform hybrid analysis
    const analysis = await analyzeWithHybridFiltering(extractedText, filename, ocrResult);
    console.log(`Analysis completed: ${analysis.keywords.length} keywords, verification: ${analysis.verificationStatus}`);
    
    // Only update document if it's a real document ID (not temp-analysis)
    if (documentId !== 'temp-analysis') {
      const { error: updateError } = await supabase
        .from('documents')
        .update({
          // Original fields
          extracted_text: extractedText,
          content_keywords: analysis.keywords,
          auto_categories: analysis.categories,
          content_confidence: analysis.confidence,
          extracted_entities: analysis.entities,
          medical_specialties: analysis.entities.specialties || [],
          extracted_dates: analysis.entities.dates || [],
          extraction_metadata: {
            extraction_method: ocrResult ? 'tesseract-hybrid' : 'gemini-fallback',
            extraction_timestamp: new Date().toISOString(),
            content_type: contentType,
            filename: filename,
          },
          // New hybrid filtering fields
          verification_status: analysis.verificationStatus,
          text_density_score: analysis.textDensityScore,
          medical_keyword_count: analysis.medicalKeywordCount,
          structural_cues: analysis.structuralCues,
          format_supported: ocrResult?.formatSupported ?? true,
          ocr_extracted_text: ocrResult?.text || null,
          processing_notes: analysis.processingNotes,
        })
        .eq('id', documentId);

      if (updateError) {
        throw new Error(`Failed to update document: ${updateError.message}`);
      }
    }

    // Insert enhanced keywords into document_keywords table (only for real documents)
    if (analysis.keywords.length > 0 && documentId !== 'temp-analysis') {
      const keywordInserts = [];
      
      // Add general keywords
      analysis.keywords.forEach(keyword => {
        keywordInserts.push({
          document_id: documentId,
          keyword,
          keyword_type: 'general',
          confidence: analysis.confidence,
        });
      });

      // Add entity-specific keywords
      if (analysis.entities) {
        Object.entries(analysis.entities).forEach(([entityType, entities]: [string, any]) => {
          if (Array.isArray(entities)) {
            entities.forEach(entity => {
              keywordInserts.push({
                document_id: documentId,
                keyword: entity,
                keyword_type: entityType,
                entity_category: entityType,
                confidence: analysis.confidence,
              });
            });
          }
        });
      }

      const { error: keywordError } = await supabase
        .from('document_keywords')
        .insert(keywordInserts);

      if (keywordError) {
        console.error('Failed to insert keywords:', keywordError);
      }
    }

    console.log(`Successfully analyzed document ${documentId} with verification status: ${analysis.verificationStatus}`);

    return new Response(JSON.stringify({
      success: true,
      extractedText: extractedText.substring(0, 500),
      keywords: analysis.keywords,
      categories: analysis.categories,
      confidence: analysis.confidence,
      entities: analysis.entities,
      verificationStatus: analysis.verificationStatus,
      textDensityScore: analysis.textDensityScore,
      medicalKeywordCount: analysis.medicalKeywordCount,
      processingNotes: analysis.processingNotes,
      requiresUserVerification: analysis.verificationStatus === 'user_verified_medical',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in enhanced-document-analyze function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});