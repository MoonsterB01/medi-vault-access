import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VisionRequest {
  fileContent: string; // base64
  mimeType: string;
  filename: string;
}

interface VisionResponse {
  success: boolean;
  extractedText: string;
  patientInfo?: {
    name?: string;
    dob?: string;
    gender?: string;
    contact?: string;
  };
  medicalEntities: {
    doctors?: string[];
    conditions?: Array<{
      name: string;
      classification: string;
      confidence: number;
      evidence_text: string;
      classification_reason: string;
    }>;
    medications?: Array<{
      name: string;
      dose?: string;
      frequency?: string;
      status?: string;
      confidence?: number;
      evidence_text?: string;
    }>;
    labResults?: Array<{
      test: string;
      value: string;
      unit?: string;
      normalRange?: string;
      isAbnormal?: boolean;
    }>;
    allergies?: Array<{
      name: string;
      confirmed: boolean;
      evidence_text?: string;
    }>;
  };
  categories: string[];
  confidence: number;
  criticalAlerts?: string[];
  error?: string;
}

const medicalDocumentPrompt = `You are a medical document analyzer. Carefully read this medical document and extract ALL information with EXACT values, including decimals and units.

CRITICAL: For every disease/condition you find, you MUST reason about WHY it is mentioned before listing it. A disease word in a document does NOT automatically mean the patient has that disease.

Use one of these classification values for each condition:
- "confirmed_diagnosis" — patient is explicitly stated to have it (e.g. "Known case of...", "Diagnosed with...", "h/o ...", problem list, assessment)
- "suspected_condition" — rule-out / differential / query (e.g. "?Asthma", "r/o COPD")
- "family_history" — appears under family history section
- "doctor_specialty" — listed under doctor specialization, "Conditions Treated", "Services", "Expertise", "Department", clinic letterhead or marketing
- "template_checkbox_unchecked" — next to an UNTICKED box (☐ □ [ ])
- "template_checkbox_checked" — next to a TICKED box (☑ ✓ ✔ [x]) — treat as confirmed
- "screening_or_test_purpose" — name of a screening/test, not a diagnosis
- "informational_mention" — educational/generic text without patient context

Return JSON:
{
  "extractedText": "full text of document",
  "patientInfo": {
    "name": "patient full name if found",
    "dob": "YYYY-MM-DD if found",
    "gender": "gender if found",
    "contact": "phone or contact if found"
  },
  "medicalEntities": {
    "doctors": ["Dr. names found"],
    "conditions": [
      {
        "name": "condition name",
        "classification": "one of the values above",
        "confidence": 0.0-1.0,
        "evidence_text": "EXACT short snippet copied from the document",
        "classification_reason": "one sentence explaining why this classification was chosen"
      }
    ],
    "medications": [
      {
        "name": "medication name",
        "dose": "exact dose with unit (e.g., 3.5 mg)",
        "frequency": "frequency if mentioned",
        "status": "active | historical | template_option",
        "confidence": 0.0-1.0,
        "evidence_text": "exact snippet"
      }
    ],
    "labResults": [
      {
        "test": "test name",
        "value": "exact numeric value",
        "unit": "unit (mg/dL, mmol/L, etc)",
        "normalRange": "reference range if shown",
        "isAbnormal": true/false if outside normal range
      }
    ],
    "allergies": [
      { "name": "allergen", "confirmed": true|false, "evidence_text": "snippet" }
    ]
  },
  "categories": ["Lab Report", "Prescription", "Radiology", "Clinical Notes", etc],
  "confidence": 0.0-1.0,
  "criticalAlerts": ["any urgent findings, abnormal critical values"]
}

CRITICAL RULES:
- Preserve ALL decimal points exactly (3.5 not 35) and include units.
- NEVER classify a disease as confirmed_diagnosis if it appears near doctor info, under Specialization/Conditions Treated/Services/Expertise/Department, in clinic or lab marketing, or in a template list with an unticked box.
- For checkboxes: ☑ ✓ ✔ [x] [X] = checked; ☐ □ [ ] = unchecked.
- evidence_text is REQUIRED for every condition and must be copied verbatim.
- If unsure, use "informational_mention" with low confidence rather than guessing.`;

async function processWithAIVision(
  fileContent: string,
  mimeType: string,
  filename: string
): Promise<VisionResponse> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY not configured");
  }

  console.log(`Processing document: ${filename}, type: ${mimeType}`);

  // For PDFs, we'll process them as-is and let the AI handle it
  // Gemini can read PDFs directly in some cases, but we'll convert to image for consistency
  let imageContent = fileContent;
  let imageMimeType = mimeType;

  // If it's a PDF, we need to convert it to images
  // For now, we'll handle the first page as proof of concept
  // You can enhance this to process multiple pages
  if (mimeType === 'application/pdf') {
    console.log('PDF detected - will process as document');
    // Note: For production, you might want to add PDF-to-image conversion here
    // For now, we'll try sending the PDF directly
  }

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: medicalDocumentPrompt
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${imageMimeType};base64,${imageContent}`
                }
              }
            ]
          }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content;
    
    if (!aiContent) {
      throw new Error("No content in AI response");
    }

    console.log("AI Vision analysis complete");

    // Parse the JSON response from AI
    const analysisResult = JSON.parse(aiContent);

    return {
      success: true,
      extractedText: analysisResult.extractedText || "",
      patientInfo: analysisResult.patientInfo || {},
      medicalEntities: analysisResult.medicalEntities || {
        doctors: [],
        conditions: [],
        medications: [],
        labResults: []
      },
      categories: analysisResult.categories || [],
      confidence: analysisResult.confidence || 0.8,
      criticalAlerts: analysisResult.criticalAlerts || []
    };

  } catch (error) {
    console.error("Error in AI Vision processing:", error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestData: VisionRequest = await req.json();
    const { fileContent, mimeType, filename } = requestData;

    if (!fileContent || !mimeType) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: fileContent, mimeType' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`User ${user.id} requesting AI Vision analysis for ${filename}`);

    const result = await processWithAIVision(fileContent, mimeType, filename);

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in ai-document-vision:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
