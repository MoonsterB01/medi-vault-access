import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Classify query type
function classifyQuery(message: string): 'patient' | 'web' | 'mixed' {
  const patientKeywords = ['my', 'me', 'i ', 'mine', 'records', 'documents', 'diagnosis', 'medication', 'prescription', 'report', 'lab', 'test result', 'uploaded', 'history'];
  const messageLower = message.toLowerCase();
  
  const hasPatientContext = patientKeywords.some(keyword => messageLower.includes(keyword));
  const isGeneralQuestion = messageLower.includes('what is') || messageLower.includes('what are') || messageLower.includes('how to') || messageLower.includes('explain') || messageLower.includes('tell me about');
  
  if (hasPatientContext && isGeneralQuestion) return 'mixed';
  if (hasPatientContext) return 'patient';
  return 'web';
}

// Generate a short title from the first message
function generateTitle(message: string): string {
  const words = message.trim().split(/\s+/).slice(0, 5).join(' ');
  return words.length > 30 ? words.substring(0, 30) + '...' : words;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, patientId, conversationId, useWebSearch } = await req.json();

    // Validate input format
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (message.length > 1000) {
      return new Response(
        JSON.stringify({ error: 'Message too long (max 1000 characters)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!patientId) {
      return new Response(
        JSON.stringify({ error: 'Patient ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(patientId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid patient ID format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user created this patient
    const { data: patientAccess } = await supabase
      .from("patients")
      .select("id, created_by")
      .eq("id", patientId)
      .eq("created_by", user.id)
      .single();

    if (!patientAccess) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle conversation - create new if not provided
    let activeConversationId = conversationId;
    let isNewConversation = false;
    
    if (!activeConversationId) {
      const { data: newConv, error: convError } = await supabase
        .from("chat_conversations")
        .insert({
          user_id: user.id,
          patient_id: patientId,
          title: generateTitle(message)
        })
        .select()
        .single();

      if (convError) {
        console.error("Error creating conversation:", convError);
        throw new Error("Failed to create conversation");
      }
      
      activeConversationId = newConv.id;
      isNewConversation = true;
    }

    // Classify the query
    const queryType = useWebSearch ? 'web' : classifyQuery(message);
    console.log(`Query classified as: ${queryType}`);

    // Fetch patient context for patient/mixed queries
    let medicalContext = "";
    
    if (queryType === 'patient' || queryType === 'mixed') {
      const [patientData, documentsData, diagnosesData, medicationsData, labsData, summaryData] = 
        await Promise.all([
          supabase.from("patients").select("*").eq("id", patientId).single(),
          supabase.from("documents").select("id, filename, ai_summary, extracted_text, uploaded_at").eq("patient_id", patientId).order("uploaded_at", { ascending: false }).limit(10),
          supabase.from("diagnoses").select("*").eq("patient_id", patientId).eq("hidden_by_user", false),
          supabase.from("medications").select("*").eq("patient_id", patientId).eq("hidden_by_user", false),
          supabase.from("labs").select("*").eq("patient_id", patientId).order("date", { ascending: false }).limit(20),
          supabase.from("patient_summaries").select("summary").eq("patient_id", patientId).single(),
        ]);

      const patient = patientData.data;
      const documents = documentsData.data || [];
      const diagnoses = diagnosesData.data || [];
      const medications = medicationsData.data || [];
      const labs = labsData.data || [];
      const summary = summaryData.data?.summary;

      const patientAge = patient?.dob ? new Date().getFullYear() - new Date(patient.dob).getFullYear() : "Unknown";

      medicalContext = `PATIENT INFORMATION:
Name: ${patient?.name || "Unknown"}
Age: ${patientAge}
Gender: ${patient?.gender || "Unknown"}
Blood Group: ${patient?.blood_group || "Unknown"}
Allergies: ${patient?.allergies && patient.allergies.length > 0 ? patient.allergies.join(", ") : "None recorded"}
Medical Notes: ${patient?.medical_notes || "None"}

`;

      if (summary) {
        medicalContext += `PATIENT SUMMARY:\n${JSON.stringify(summary, null, 2)}\n\n`;
      }

      if (documents.length > 0) {
        medicalContext += `MEDICAL DOCUMENTS (${documents.length} available):\n`;
        documents.forEach((doc, idx) => {
          medicalContext += `${idx + 1}. ${doc.filename} (${new Date(doc.uploaded_at).toLocaleDateString()})\n`;
          if (doc.ai_summary) {
            medicalContext += `   Summary: ${doc.ai_summary}\n`;
          }
        });
        medicalContext += "\n";
      }

      if (diagnoses.length > 0) {
        medicalContext += `DIAGNOSES:\n`;
        diagnoses.forEach((d) => {
          medicalContext += `- ${d.name} (${d.status || "active"})\n`;
        });
        medicalContext += "\n";
      }

      if (medications.length > 0) {
        medicalContext += `MEDICATIONS:\n`;
        medications.forEach((m) => {
          medicalContext += `- ${m.name}${m.dose ? ` ${m.dose}` : ""}${m.frequency ? ` ${m.frequency}` : ""} (${m.status || "active"})\n`;
        });
        medicalContext += "\n";
      }

      if (labs.length > 0) {
        medicalContext += `RECENT LAB RESULTS:\n`;
        labs.slice(0, 10).forEach((lab) => {
          medicalContext += `- ${lab.test_name}: ${lab.value} (${lab.date ? new Date(lab.date).toLocaleDateString() : "No date"})\n`;
        });
        medicalContext += "\n";
      }
    }

    // Fetch conversation history (last 20 messages from this conversation)
    const { data: historyData } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("conversation_id", activeConversationId)
      .order("created_at", { ascending: true })
      .limit(20);

    const conversationHistory = historyData || [];

    // Build system prompt based on query type
    let systemPrompt = "";
    
    if (queryType === 'web') {
      systemPrompt = `You are MediBot, a helpful AI health assistant with access to current medical knowledge and web information.

Your role is to:
1. Provide accurate, up-to-date health and medical information
2. Explain medical terms and conditions in simple, understandable language
3. Discuss general health topics, symptoms, treatments, and preventive care
4. Search and synthesize information from reliable medical sources

IMPORTANT GUIDELINES:
- Provide factual, evidence-based information
- Use clear, accessible language
- Always recommend consulting healthcare professionals for personal medical advice
- For urgent symptoms (chest pain, severe bleeding, difficulty breathing), immediately advise seeking emergency medical attention
- Include relevant context and explanations
- When answering general health questions, provide comprehensive but concise information

You have web search capabilities to provide current, accurate medical information.`;

    } else if (queryType === 'patient') {
      systemPrompt = `You are MediBot, a helpful AI health assistant with access to the patient's complete medical records.

You have access to their documents, diagnoses, medications, lab results, and visit history.

AVAILABLE MEDICAL CONTEXT:
${medicalContext}

IMPORTANT GUIDELINES:
- Be empathetic, clear, and patient-focused
- Explain medical concepts in simple terms
- Reference specific documents when answering (e.g., "According to your discharge summary from March 2024...")
- ALWAYS remind users that you're an AI assistant and cannot replace professional medical advice
- For urgent symptoms (chest pain, severe bleeding, difficulty breathing), immediately advise seeking emergency medical attention
- If you don't have enough information to answer accurately, say so
- Respect patient privacy and confidentiality`;

    } else {
      // Mixed query - combine both
      systemPrompt = `You are MediBot, a helpful AI health assistant with access to both the patient's medical records AND current web-based medical knowledge.

AVAILABLE PATIENT MEDICAL CONTEXT:
${medicalContext}

CAPABILITIES:
- You can reference the patient's specific medical history, documents, and records
- You can also provide general medical information from current knowledge
- When relevant, combine patient-specific data with general medical knowledge

IMPORTANT GUIDELINES:
- Be empathetic, clear, and patient-focused
- When answering, clearly distinguish between patient-specific information and general medical knowledge
- Reference specific patient documents when relevant
- ALWAYS remind users that you're an AI assistant and cannot replace professional medical advice
- For urgent symptoms, immediately advise seeking emergency medical attention`;
    }

    // Save user message
    await supabase.from("chat_messages").insert({
      user_id: user.id,
      patient_id: patientId,
      conversation_id: activeConversationId,
      role: "user",
      content: message,
    });

    // Call Lovable AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...conversationHistory,
          { role: "user", content: message },
        ],
        stream: false,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Service temporarily unavailable. Please contact support." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const assistantResponse = aiData.choices?.[0]?.message?.content || "I'm sorry, I couldn't generate a response.";

    // Save assistant message
    await supabase.from("chat_messages").insert({
      user_id: user.id,
      patient_id: patientId,
      conversation_id: activeConversationId,
      role: "assistant",
      content: assistantResponse,
    });

    // Update conversation timestamp
    await supabase
      .from("chat_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", activeConversationId);

    return new Response(
      JSON.stringify({ 
        response: assistantResponse,
        conversationId: activeConversationId,
        isNewConversation,
        queryType
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[INTERNAL] Error in medibot-chat:", error.name, error.message);
    return new Response(
      JSON.stringify({ error: "An error occurred processing your request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
