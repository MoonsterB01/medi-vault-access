import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, patientId } = await req.json();

    if (!message || !patientId) {
      return new Response(
        JSON.stringify({ error: "Message and patientId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate message length
    if (message.length > 500) {
      return new Response(
        JSON.stringify({ error: "Message too long (max 500 characters)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    // Verify user has access to patient
    const { data: accessCheck } = await supabase
      .from("family_access")
      .select("patient_id")
      .eq("patient_id", patientId)
      .eq("user_id", user.id)
      .eq("can_view", true)
      .single();

    if (!accessCheck) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch comprehensive patient context
    const [patientData, documentsData, diagnosesData, medicationsData, labsData, summaryData] = 
      await Promise.all([
        supabase.from("patients").select("*").eq("id", patientId).single(),
        supabase.from("documents").select("id, filename, ai_summary, extracted_text, uploaded_at").eq("patient_id", patientId).order("uploaded_at", { ascending: false }).limit(10),
        supabase.from("diagnoses").select("*").eq("patient_id", patientId).eq("hidden_by_user", false),
        supabase.from("medications").select("*").eq("patient_id", patientId).eq("hidden_by_user", false),
        supabase.from("labs").select("*").eq("patient_id", patientId).order("date", { ascending: false }).limit(20),
        supabase.from("patient_summaries").select("summary").eq("patient_id", patientId).single(),
      ]);

    // Build medical context
    const patient = patientData.data;
    const documents = documentsData.data || [];
    const diagnoses = diagnosesData.data || [];
    const medications = medicationsData.data || [];
    const labs = labsData.data || [];
    const summary = summaryData.data?.summary;

    const patientAge = patient?.dob ? new Date().getFullYear() - new Date(patient.dob).getFullYear() : "Unknown";

    let medicalContext = `PATIENT INFORMATION:
Name: ${patient?.name || "Unknown"}
Age: ${patientAge}
Gender: ${patient?.gender || "Unknown"}
Blood Group: ${patient?.blood_group || "Unknown"}
Allergies: ${patient?.allergies && patient.allergies.length > 0 ? patient.allergies.join(", ") : "None recorded"}
Emergency Contact: ${patient?.emergency_contact ? `${patient.emergency_contact.name} (${patient.emergency_contact.phone})` : "None recorded"}
Medical Notes: ${patient?.medical_notes || "None"}

`;

    // Add AI patient summary if available
    if (summary) {
      medicalContext += `PATIENT SUMMARY:\n${JSON.stringify(summary, null, 2)}\n\n`;
    }

    // Add document summaries
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

    // Add diagnoses
    if (diagnoses.length > 0) {
      medicalContext += `DIAGNOSES:\n`;
      diagnoses.forEach((d) => {
        medicalContext += `- ${d.name} (${d.status || "active"})\n`;
      });
      medicalContext += "\n";
    }

    // Add medications
    if (medications.length > 0) {
      medicalContext += `MEDICATIONS:\n`;
      medications.forEach((m) => {
        medicalContext += `- ${m.name}${m.dose ? ` ${m.dose}` : ""}${m.frequency ? ` ${m.frequency}` : ""} (${m.status || "active"})\n`;
      });
      medicalContext += "\n";
    }

    // Add recent labs
    if (labs.length > 0) {
      medicalContext += `RECENT LAB RESULTS:\n`;
      labs.slice(0, 10).forEach((lab) => {
        medicalContext += `- ${lab.test_name || lab.test}: ${lab.value} (${lab.date ? new Date(lab.date).toLocaleDateString() : "No date"})\n`;
      });
      medicalContext += "\n";
    }

    // Fetch conversation history (last 20 messages)
    const { data: historyData } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: true })
      .limit(20);

    const conversationHistory = historyData || [];

    // Build system prompt
    const systemPrompt = `You are MediBot, a helpful AI health assistant for ${patient?.name || "the patient"}.

You have access to the patient's complete medical records including documents, diagnoses, medications, lab results, and visit history.

IMPORTANT GUIDELINES:
- Be empathetic, clear, and patient-focused
- Explain medical concepts in simple terms
- Reference specific documents when answering (e.g., "According to your discharge summary from March 2024...")
- ALWAYS remind users that you're an AI assistant and cannot replace professional medical advice
- For urgent symptoms (chest pain, severe bleeding, difficulty breathing), immediately advise seeking emergency medical attention
- Respect patient privacy and confidentiality
- If you don't have enough information to answer accurately, say so

AVAILABLE MEDICAL CONTEXT:
${medicalContext}

Answer the patient's questions accurately based on their medical records.`;

    // Save user message
    await supabase.from("chat_messages").insert({
      user_id: user.id,
      patient_id: patientId,
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
      role: "assistant",
      content: assistantResponse,
    });

    return new Response(
      JSON.stringify({ response: assistantResponse }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in medibot-chat:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
