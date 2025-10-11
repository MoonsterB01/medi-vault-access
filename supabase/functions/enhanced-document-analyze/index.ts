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

/**
 * @interface AnalyzeRequest
 * @description Defines the structure of the request body for the enhanced document analysis function.
 * @property {string} documentId - The ID of the document to be analyzed.
 * @property {string} contentType - The MIME type of the file.
 * @property {string} filename - The name of the file.
 * @property {object} [ocrResult] - The result of the OCR processing.
 */
interface AnalyzeRequest {
  documentId: string;
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
  filename: string
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
  const analysisText = text;

  // Analyze text from scratch
  const words = analysisText.trim().split(/\s+/).filter(word => word.length > 0);
  const meaningfulWords = words.filter(word =>
    word.length >= 3 &&
    /[a-zA-Z]/.test(word) &&
    !(/^\d+$/.test(word))
  );
  const textDensityScore = meaningfulWords.length;

  // Get medical keywords from database and apply weighted scoring
  const medicalKeywords = await getMedicalKeywords();
  const lowerText = analysisText.toLowerCase();

  let weightedScore = 0;
  let detectedKeywords: string[] = [];

  medicalKeywords.forEach(mk => {
    if (lowerText.includes(mk.keyword.toLowerCase())) {
      detectedKeywords.push(mk.keyword);
      weightedScore += mk.weight;
    }
  });

  // Enhanced pattern detection for medical content
  const medicalRangePattern = /\b\d+[\.,]?\d*\s*[-–]\s*\d+[\.,]?\d*\s*\([^)]*range[^)]*\)/gi;
  const medicalUnitsPattern = /\b\d+[\.,]?\d*\s*(mg\/dl|g\/dl|cells\/[μu]l|mmhg|bpm|meq\/l|iu\/l|ng\/ml|pg\/ml|[μu]g\/ml)\b/gi;
  const labValuesPattern = /\b(hemoglobin|hgb|wbc|rbc|platelet|glucose|hba1c|cholesterol|creatinine|ast|alt|bilirubin)\s*[:\-]?\s*\d+/gi;

  const rangeMatches = analysisText.match(medicalRangePattern) || [];
  const unitMatches = analysisText.match(medicalUnitsPattern) || [];
  const labMatches = analysisText.match(labValuesPattern) || [];

  // Add pattern-based scoring
  if (rangeMatches.length > 0) {
    detectedKeywords.push('medical ranges detected');
    weightedScore += rangeMatches.length * 2.0;
  }

  if (unitMatches.length > 0) {
    detectedKeywords.push('medical units detected');
    weightedScore += unitMatches.length * 2.5;
  }

  if (labMatches.length > 0) {
    detectedKeywords.push('lab values detected');
    weightedScore += labMatches.length * 3.0;
  }

  const medicalKeywordCount = Math.floor(weightedScore);

  // Enhanced verification status logic with pattern-based analysis
  const hasStrongMedicalPatterns = (rangeMatches.length + unitMatches.length + labMatches.length) >= 2;
  const hasLabIndicators = labMatches.length > 0 || detectedKeywords.some(k => k.includes('lab') || k.includes('test'));
  let verificationStatus: string;
  let processingNotes: string;

  if (textDensityScore >= 5 && medicalKeywordCount >= 5) {
    verificationStatus = 'verified_medical';
    processingNotes = 'Automatically verified - high medical content and text density detected.';
  } else if (hasStrongMedicalPatterns || (textDensityScore >= 3 && medicalKeywordCount >= 3)) {
    verificationStatus = 'verified_medical';
    processingNotes = 'Automatically verified - medical patterns and keywords detected.';
  } else if (hasLabIndicators || (textDensityScore >= 2 && medicalKeywordCount >= 2)) {
    verificationStatus = 'user_verified_medical';
    processingNotes = 'Likely medical document - user verification recommended.';
  } else if (textDensityScore >= 1 && medicalKeywordCount >= 1) {
    verificationStatus = 'user_verified_medical';
    processingNotes = 'Possible medical document - user verification required.';
  } else {
    verificationStatus = 'unverified';
    processingNotes = 'Low medical content detected. Manual verification required.';
  }

  // Detect structural cues
  const structuralCues = {
    hasDates: /\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b|\b\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}\b/.test(analysisText),
    hasUnits: /\b\d+\s*(mg|ml|mmhg|bpm|units|dose|%)\b/i.test(analysisText),
    hasNumbers: /\b\d+(\.\d+)?\b/.test(analysisText),
    hasTableStructure: analysisText.includes('\t') || /\s{4,}/.test(analysisText)
  };

    // Enhanced Gemini analysis with hybrid filtering context
    let geminiAnalysis: any = {
      keywords: detectedKeywords,
      categories: [], // Start with empty categories for better classification
      confidence: medicalKeywordCount >= 2 ? 0.8 : 0.4,
      entities: {}
    };

    // Rule-based category assignment before Gemini
    const textLower = analysisText.toLowerCase();
    const categories: string[] = [];
    
    // Define matches for lab results detection
    const labKeywords = ['lab', 'test', 'result', 'laboratory', 'specimen', 'culture'];
    const labMatches = labKeywords.filter(keyword => textLower.includes(keyword));
    
    // Specific medical document categorization
    if (labMatches.length > 0 || detectedKeywords.some(k => k.includes('lab') || k.includes('test') || k.includes('result'))) {
      categories.push('Lab Results');
    }
    
    if (textLower.includes('pathology') || textLower.includes('biopsy') || textLower.includes('tissue') || textLower.includes('cytology')) {
      categories.push('Pathology Report');
    }
    
    if (textLower.includes('radiology') || textLower.includes('imaging') || textLower.includes('x-ray') || textLower.includes('ct scan') || textLower.includes('mri') || textLower.includes('ultrasound')) {
      categories.push('Radiology Report');
    }
    
    if (textLower.includes('prescription') || textLower.includes('medication') || textLower.includes('dosage') || textLower.includes('pharmacy')) {
      categories.push('Prescription');
    }
    
    if (textLower.includes('consultation') || textLower.includes('visit') || textLower.includes('assessment') || textLower.includes('plan')) {
      categories.push('Consultation Notes');
    }
    
    if (textLower.includes('discharge') || textLower.includes('admission') || textLower.includes('hospital stay')) {
      categories.push('Discharge Summary');
    }
    
    // Define matches for blood work detection
    const unitKeywords = ['mg/dl', 'mmol/l', 'mg', 'ml', 'mmhg', 'bpm', 'units', '%'];
    const rangeKeywords = ['normal', 'high', 'low', 'elevated', 'decreased', 'range'];
    const unitMatches = unitKeywords.filter(keyword => textLower.includes(keyword));
    const rangeMatches = rangeKeywords.filter(keyword => textLower.includes(keyword));
    
    if (unitMatches.length > 0 && rangeMatches.length > 0) {
      categories.push('Blood Work');
    }
    
    if (textLower.includes('vaccination') || textLower.includes('immunization') || textLower.includes('vaccine')) {
      categories.push('Vaccination Record');
    }
    
    if (textLower.includes('insurance') || textLower.includes('claim') || textLower.includes('coverage') || textLower.includes('copay')) {
      categories.push('Insurance Document');
    }
    
    if (textLower.includes('referral') || textLower.includes('refer to') || textLower.includes('specialist')) {
      categories.push('Referral Letter');
    }
    
    if (textLower.includes('surgery') || textLower.includes('operation') || textLower.includes('procedure') || textLower.includes('operative')) {
      categories.push('Surgical Report');
    }
    
    // Default to General Medical if no specific category found but has medical content
    if (categories.length === 0 && medicalKeywordCount > 0) {
      categories.push('General Medical');
    }
    
    geminiAnalysis.categories = categories;

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
   Choose from: "Lab Results", "Pathology Report", "Radiology Report", "Prescription", "Consultation Notes", "Discharge Summary", "Blood Work", "Imaging Report", "Referral Letter", "Surgical Report", "Vaccination Record", "Insurance Document", "General Medical"

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

/**
 * @function serve
 * @description A Supabase Edge Function that performs an enhanced analysis of a document's content using a hybrid approach of keyword matching and the Gemini API.
 * @param {Request} req - The incoming HTTP request.
 * @returns {Response} - A JSON response with the enhanced analysis results or an error message.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentId, contentType, filename, ocrResult }: AnalyzeRequest = await req.json();

    console.log(`Enhanced analysis for document ${documentId} with type ${contentType}, filename: ${filename}`);
    
    // Ensure we have text to analyze from the upstream service
    if (!ocrResult?.text) {
      throw new Error('No text provided for analysis. The ocrResult.text field is required.');
    }
    const extractedText = ocrResult.text;
    console.log(`Using provided text for analysis: ${extractedText.length} characters`);
    
    // Perform hybrid analysis
    const analysis = await analyzeWithHybridFiltering(extractedText, filename);
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
      const keywordInserts: any[] = [];
      
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

  } catch (error: any) {
    console.error('Error in enhanced-document-analyze function:', error);
    return new Response(JSON.stringify({ 
      error: error?.message || 'Unknown error',
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});