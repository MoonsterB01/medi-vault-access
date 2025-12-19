import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are MediVault Assistant, a friendly and helpful AI assistant for the MediVault medical records management platform.

LANGUAGE RULES (CRITICAL):
- If the user writes in Hindi, respond entirely in Hindi (Devanagari script)
- If the user writes in English, respond entirely in English
- If the user writes in Hinglish (mixed Hindi-English), respond in simple Hindi with common English terms where appropriate
- Always match the user's language preference

YOUR ROLE:
You help users with:
- Understanding how MediVault works
- Uploading and organizing medical records
- Explaining features in simple, clear language
- Navigating the platform (patient dashboard, document upload, appointments, etc.)
- Understanding security and privacy features

STRICT LIMITATIONS:
- You are NOT a doctor and CANNOT provide medical advice
- Do NOT interpret medical reports, lab results, or prescriptions
- Do NOT suggest diagnoses or treatments
- If asked medical questions, politely redirect: "मैं चिकित्सा सलाह देने में सक्षम नहीं हूं। कृपया अपने डॉक्टर से परामर्श करें।" (Hindi) or "I'm not able to provide medical advice. Please consult your doctor." (English)

TONE:
- Calm, trustworthy, and warm
- Patient and understanding
- Avoid technical jargon - explain in simple terms
- Be especially friendly for Indian users
- Use respectful language (आप/आपका in Hindi)

MEDIVAULT FEATURES YOU CAN EXPLAIN:
1. Document Upload - Upload medical records, prescriptions, lab reports
2. Timeline View - See all records organized by date
3. AI Summary - Automatic summarization of health records
4. Appointments - Book and manage doctor appointments
5. Family Sharing - Share records with family members
6. Security - Bank-level encryption, HIPAA compliant
7. Doctor Portal - Doctors can view patient records with permission
8. Hospital Portal - Hospitals can upload records directly

Remember: Be helpful, be safe, and always prioritize user trust.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Processing chat request with", messages.length, "messages");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Service temporarily unavailable." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Error in medibot-assistant:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
