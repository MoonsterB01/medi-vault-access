import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Helper to send WhatsApp text reply
async function sendWhatsAppReply(to: string, message: string) {
  const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");

  if (!phoneNumberId || !accessToken) {
    console.error("WhatsApp credentials not configured");
    return;
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { body: message },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("WhatsApp send error:", err);
    } else {
      console.log("WhatsApp reply sent to", to);
    }
  } catch (error) {
    console.error("Failed to send WhatsApp reply:", error);
  }
}

// Download media from WhatsApp
async function downloadWhatsAppMedia(mediaId: string): Promise<{ data: Uint8Array; mimeType: string } | null> {
  const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  if (!accessToken) return null;

  try {
    const metaRes = await fetch(
      `https://graph.facebook.com/v21.0/${mediaId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!metaRes.ok) {
      console.error("Media meta error:", metaRes.status, await metaRes.text());
      return null;
    }
    const metaData = await metaRes.json();
    console.log("Media metadata received, URL:", metaData.url ? "present" : "missing");

    const mediaRes = await fetch(metaData.url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!mediaRes.ok) {
      console.error("Media download error:", mediaRes.status);
      return null;
    }

    const data = new Uint8Array(await mediaRes.arrayBuffer());
    console.log(`Media downloaded: ${data.length} bytes, type: ${metaData.mime_type}`);
    return { data, mimeType: metaData.mime_type || "application/octet-stream" };
  } catch (error) {
    console.error("Media download error:", error);
    return null;
  }
}

// Get file extension from mime type
function getExtension(mimeType: string): string {
  const map: Record<string, string> = {
    "application/pdf": "pdf",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  };
  return map[mimeType] || "bin";
}

// Handle link command
async function handleLinkCommand(supabaseAdmin: any, from: string, otpCode: string) {
  const { data: linkRecord, error: linkError } = await supabaseAdmin
    .from("whatsapp_links")
    .select("*")
    .eq("otp_code", otpCode)
    .eq("verified", false)
    .gte("otp_expires_at", new Date().toISOString())
    .maybeSingle();

  if (linkError || !linkRecord) {
    await sendWhatsAppReply(from, "❌ Invalid or expired OTP code. Please generate a new one from your MediVault settings.");
    return;
  }

  const { error: updateError } = await supabaseAdmin
    .from("whatsapp_links")
    .update({
      phone_number: from,
      verified: true,
      otp_code: null,
      otp_expires_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", linkRecord.id);

  if (updateError) {
    console.error("Link update error:", updateError);
    await sendWhatsAppReply(from, "❌ Failed to link account. Please try again.");
  } else {
    await sendWhatsAppReply(from, "✅ Your WhatsApp is now linked to your MediVault account! You can now:\n\n📄 Send medical files to upload them\n💬 Ask questions about your health records\n\nTry sending a medical report!");
  }
}

// Look up linked user and patient
async function lookupUser(supabaseAdmin: any, from: string): Promise<{ userId: string; patientId: string } | null> {
  const { data: link } = await supabaseAdmin
    .from("whatsapp_links")
    .select("user_id")
    .eq("phone_number", from)
    .eq("verified", true)
    .maybeSingle();

  if (!link) return null;

  const { data: patient } = await supabaseAdmin
    .from("patients")
    .select("id")
    .eq("created_by", link.user_id)
    .maybeSingle();

  if (!patient) return null;

  return { userId: link.user_id, patientId: patient.id };
}

// Handle text messages (chat with MediBot)
async function handleTextMessage(supabaseAdmin: any, from: string, text: string) {
  const user = await lookupUser(supabaseAdmin, from);
  if (!user) {
    await sendWhatsAppReply(from, "👋 Welcome to MediBot!\n\nTo get started, link your MediVault account:\n1. Go to Settings in MediVault\n2. Find \"WhatsApp Integration\"\n3. Enter your phone number and get an OTP\n4. Send: link YOUR_OTP here\n\nExample: link 123456");
    return;
  }

  try {
    console.log(`[CHAT] Processing message from ${from}: "${text.substring(0, 50)}..."`);

    // Build context - fetch patient data
    const [patientData, documentsData, diagnosesData, medicationsData, labsData] = await Promise.all([
      supabaseAdmin.from("patients").select("*").eq("id", user.patientId).single(),
      supabaseAdmin.from("documents").select("id, filename, ai_summary, extracted_text, uploaded_at").eq("patient_id", user.patientId).order("uploaded_at", { ascending: false }).limit(10),
      supabaseAdmin.from("diagnoses").select("*").eq("patient_id", user.patientId).eq("hidden_by_user", false),
      supabaseAdmin.from("medications").select("*").eq("patient_id", user.patientId).eq("hidden_by_user", false),
      supabaseAdmin.from("labs").select("*").eq("patient_id", user.patientId).order("date", { ascending: false }).limit(20),
    ]);

    const patient = patientData.data;
    const documents = documentsData.data || [];
    const diagnoses = diagnosesData.data || [];
    const medications = medicationsData.data || [];
    const labs = labsData.data || [];

    let medicalContext = `PATIENT: ${patient?.name || "Unknown"}, Age: ${patient?.dob ? new Date().getFullYear() - new Date(patient.dob).getFullYear() : "?"}, Gender: ${patient?.gender || "?"}, Blood Group: ${patient?.blood_group || "?"}\n`;

    if (documents.length > 0) {
      medicalContext += `\nDOCUMENTS (${documents.length}):\n`;
      documents.forEach((doc: any, idx: number) => {
        medicalContext += `${idx + 1}. ${doc.filename} (${new Date(doc.uploaded_at).toLocaleDateString()})\n`;
        if (doc.ai_summary) medicalContext += `   Summary: ${doc.ai_summary.substring(0, 300)}\n`;
        if (!doc.ai_summary && doc.extracted_text) medicalContext += `   Text: ${doc.extracted_text.substring(0, 300)}\n`;
      });
    }

    if (diagnoses.length > 0) {
      medicalContext += `\nDIAGNOSES: ${diagnoses.map((d: any) => d.name).join(", ")}\n`;
    }

    if (medications.length > 0) {
      medicalContext += `\nMEDICATIONS: ${medications.map((m: any) => `${m.name} ${m.dose || ""}`).join(", ")}\n`;
    }

    if (labs.length > 0) {
      medicalContext += `\nRECENT LABS:\n`;
      labs.slice(0, 10).forEach((lab: any) => {
        medicalContext += `- ${lab.test_name}: ${lab.value} (${lab.date || "no date"})\n`;
      });
    }

    console.log(`[CHAT] Medical context built: ${medicalContext.length} chars`);

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      await sendWhatsAppReply(from, "🤖 AI service is not configured. Please try again later.");
      return;
    }

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are MediBot, a helpful AI health assistant on WhatsApp. You have access to the patient's medical records.

${medicalContext}

GUIDELINES:
- Be empathetic, clear, and concise (WhatsApp messages should be readable)
- Reference specific documents/tests when answering
- Use simple language patients can understand
- ALWAYS remind that you're an AI and cannot replace professional medical advice
- For urgent symptoms, advise seeking emergency care
- Use emojis sparingly for readability
- Keep response under 500 words`,
            },
            {
              role: "user",
              content: text,
            },
          ],
          stream: false,
        }),
      }
    );

    if (response.ok) {
      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content || "I couldn't process that request.";
      console.log(`[CHAT] AI reply generated: ${reply.length} chars`);
      await sendWhatsAppReply(from, reply.substring(0, 4000));
    } else {
      const errText = await response.text();
      console.error("[CHAT] AI error:", response.status, errText);
      if (response.status === 429) {
        await sendWhatsAppReply(from, "🤖 I'm receiving too many requests right now. Please try again in a minute.");
      } else {
        await sendWhatsAppReply(from, "🤖 I'm having trouble right now. Please try again later.");
      }
    }
  } catch (err) {
    console.error("[CHAT] MediBot error:", err);
    await sendWhatsAppReply(from, "🤖 I'm having trouble right now. Please try again later.");
  }
}

// Handle media messages (document upload + delegate processing)
async function handleMediaMessage(supabaseAdmin: any, from: string, message: any, msgType: string) {
  const mediaInfo = message[msgType];
  const mediaId = mediaInfo?.id;
  const caption = mediaInfo?.caption || "";
  const fileName = mediaInfo?.filename || `whatsapp-upload-${Date.now()}`;

  if (!mediaId) {
    await sendWhatsAppReply(from, "⚠️ Could not process this file. Please try again.");
    return;
  }

  const user = await lookupUser(supabaseAdmin, from);
  if (!user) {
    await sendWhatsAppReply(from, "👋 Please link your MediVault account first! Go to Settings → WhatsApp Integration in MediVault.");
    return;
  }

  // Send acknowledgment
  await sendWhatsAppReply(from, "📥 Report received. Processing and analyzing your document...");

  // Download media
  const media = await downloadWhatsAppMedia(mediaId);
  if (!media) {
    await sendWhatsAppReply(from, "❌ Failed to download the file. Please try sending again.");
    return;
  }

  const ext = getExtension(media.mimeType);
  const storagePath = `${user.patientId}/whatsapp-${Date.now()}.${ext}`;

  // Upload to storage
  const { error: uploadError } = await supabaseAdmin.storage
    .from("medical-documents")
    .upload(storagePath, media.data, {
      contentType: media.mimeType,
      upsert: false,
    });

  if (uploadError) {
    console.error("Storage upload error:", uploadError);
    await sendWhatsAppReply(from, "❌ Failed to save the file. Please try again.");
    return;
  }

  console.log(`File uploaded to storage: ${storagePath}`);

  // Deduplication: check if a document with same filename and file_size already exists for this patient
  const finalFilename = fileName.includes(".") ? fileName : `${fileName}.${ext}`;
  const { data: existingDoc } = await supabaseAdmin
    .from("documents")
    .select("id")
    .eq("patient_id", user.patientId)
    .eq("filename", finalFilename)
    .eq("file_size", media.data.length)
    .maybeSingle();

  if (existingDoc) {
    console.log(`[DEDUP] Duplicate detected: ${finalFilename} (${media.data.length} bytes). Skipping.`);
    // Remove the uploaded file since it's a duplicate
    await supabaseAdmin.storage.from("medical-documents").remove([storagePath]);
    await sendWhatsAppReply(from, "ℹ️ This document has already been uploaded to your MediVault account. No duplicate was created.");
    return;
  }

  // Create document record
  const { data: doc, error: docError } = await supabaseAdmin
    .from("documents")
    .insert({
      patient_id: user.patientId,
      uploaded_by: user.userId,
      filename: finalFilename,
      file_path: storagePath,
      content_type: media.mimeType,
      file_size: media.data.length,
      description: caption || "Uploaded via WhatsApp",
      verification_status: "unverified",
    })
    .select("id")
    .single();

  if (docError) {
    console.error("Document insert error:", docError);
    await sendWhatsAppReply(from, "❌ Failed to save document record. Please try again.");
    return;
  }

  console.log(`Document record created: ${doc.id}`);

  // DELEGATE processing to generate-document-summary (separate edge function)
  // This avoids memory limits since the webhook doesn't need to hold the file + base64
  try {
    console.log(`[DELEGATE] Invoking generate-document-summary for doc ${doc.id}`);
    const processRes = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-document-summary`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          documentId: doc.id,
          whatsappNumber: from,
        }),
      }
    );

    if (!processRes.ok) {
      const errText = await processRes.text();
      console.error(`[DELEGATE] Processing failed: ${processRes.status}`, errText);
      await sendWhatsAppReply(from, "✅ Document saved! Analysis is taking longer than expected. Check your MediVault dashboard for updates.");
    } else {
      await processRes.text(); // consume body
      console.log(`[DELEGATE] Processing completed for doc ${doc.id}`);
    }
  } catch (err) {
    console.error(`[DELEGATE] Error invoking processing:`, err);
    await sendWhatsAppReply(from, "✅ Document saved! Analysis will be available shortly in your MediVault dashboard.");
  }
}

// ========== Main Handler ==========
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // ========== GET: Webhook Verification ==========
  if (req.method === "GET") {
    const verifyToken = Deno.env.get("WHATSAPP_VERIFY_TOKEN");
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === verifyToken) {
      console.log("Webhook verified");
      return new Response(challenge, { status: 200, headers: corsHeaders });
    }
    return new Response("Forbidden", { status: 403, headers: corsHeaders });
  }

  // ========== POST: Incoming Messages ==========
  if (req.method === "POST") {
    try {
      const body = await req.json();
      const entry = body?.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const messages = value?.messages;

      if (!messages || messages.length === 0) {
        return new Response(JSON.stringify({ status: "ok" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      for (const message of messages) {
        const from = message.from;
        const msgType = message.type;

        console.log(`[WEBHOOK] Message from ${from}, type: ${msgType}`);

        if (msgType === "text") {
          const text = message.text?.body?.trim() || "";
          const linkMatch = text.match(/^link\s+(\d{6})$/i);
          if (linkMatch) {
            await handleLinkCommand(supabaseAdmin, from, linkMatch[1]);
            continue;
          }
          await handleTextMessage(supabaseAdmin, from, text);
          continue;
        }

        if (["image", "document"].includes(msgType)) {
          await handleMediaMessage(supabaseAdmin, from, message, msgType);
          continue;
        }

        await sendWhatsAppReply(from, "⚠️ I can only process text messages and files (images, PDFs, documents). Please send a supported file type.");
      }

      return new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Webhook error:", error);
      return new Response(JSON.stringify({ error: "Internal error" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response("Method not allowed", { status: 405, headers: corsHeaders });
});
