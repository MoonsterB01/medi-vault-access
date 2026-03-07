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
    // Step 1: Get media URL
    const metaRes = await fetch(
      `https://graph.facebook.com/v21.0/${mediaId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!metaRes.ok) return null;
    const metaData = await metaRes.json();

    // Step 2: Download media
    const mediaRes = await fetch(metaData.url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!mediaRes.ok) return null;

    const data = new Uint8Array(await mediaRes.arrayBuffer());
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

Deno.serve(async (req) => {
  // CORS preflight
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

      // Meta sends webhook events in this structure
      const entry = body?.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const messages = value?.messages;

      if (!messages || messages.length === 0) {
        // Status update or other non-message event
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
        const from = message.from; // phone number
        const msgType = message.type;

        // ===== Handle "link" command =====
        if (msgType === "text") {
          const text = message.text?.body?.trim() || "";

          // Check for link command: "link 123456"
          const linkMatch = text.match(/^link\s+(\d{6})$/i);
          if (linkMatch) {
            const otpCode = linkMatch[1];

            // Find pending link with this OTP
            const { data: linkRecord, error: linkError } = await supabaseAdmin
              .from("whatsapp_links")
              .select("*")
              .eq("otp_code", otpCode)
              .eq("verified", false)
              .gte("otp_expires_at", new Date().toISOString())
              .maybeSingle();

            if (linkError || !linkRecord) {
              await sendWhatsAppReply(from, "❌ Invalid or expired OTP code. Please generate a new one from your MediVault settings.");
              continue;
            }

            // Verify and update with phone number
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
            continue;
          }

          // ===== Handle general text (chat) =====
          // Look up user by phone
          const { data: link } = await supabaseAdmin
            .from("whatsapp_links")
            .select("user_id")
            .eq("phone_number", from)
            .eq("verified", true)
            .maybeSingle();

          if (!link) {
            await sendWhatsAppReply(from, "👋 Welcome to MediBot!\n\nTo get started, link your MediVault account:\n1. Go to Settings in MediVault\n2. Find \"WhatsApp Integration\"\n3. Enter your phone number and get an OTP\n4. Send: link YOUR_OTP here\n\nExample: link 123456");
            continue;
          }

          // Get patient for this user
          const { data: patient } = await supabaseAdmin
            .from("patients")
            .select("id")
            .eq("created_by", link.user_id)
            .maybeSingle();

          if (!patient) {
            await sendWhatsAppReply(from, "⚠️ No patient profile found. Please set up your profile in MediVault first.");
            continue;
          }

          // Call medibot-chat logic
          try {
            const chatRes = await fetch(
              `${Deno.env.get("SUPABASE_URL")}/functions/v1/medibot-chat`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                },
                body: JSON.stringify({
                  message: text,
                  patientId: patient.id,
                  userId: link.user_id,
                }),
              }
            );

            if (chatRes.ok) {
              const chatData = await chatRes.json();
              const reply = chatData?.response || chatData?.message || "I couldn't process that request.";
              // Truncate to WhatsApp limit (4096 chars)
              await sendWhatsAppReply(from, reply.substring(0, 4000));
            } else {
              await sendWhatsAppReply(from, "🤖 I'm having trouble right now. Please try again later.");
            }
          } catch (err) {
            console.error("MediBot chat error:", err);
            await sendWhatsAppReply(from, "🤖 I'm having trouble right now. Please try again later.");
          }
          continue;
        }

        // ===== Handle media (image, document) =====
        if (["image", "document"].includes(msgType)) {
          const mediaInfo = message[msgType]; // message.image or message.document
          const mediaId = mediaInfo?.id;
          const caption = mediaInfo?.caption || "";
          const fileName = mediaInfo?.filename || `whatsapp-upload-${Date.now()}`;

          if (!mediaId) {
            await sendWhatsAppReply(from, "⚠️ Could not process this file. Please try again.");
            continue;
          }

          // Look up user
          const { data: link } = await supabaseAdmin
            .from("whatsapp_links")
            .select("user_id")
            .eq("phone_number", from)
            .eq("verified", true)
            .maybeSingle();

          if (!link) {
            await sendWhatsAppReply(from, "👋 Please link your MediVault account first! Go to Settings → WhatsApp Integration in MediVault.");
            continue;
          }

          // Get patient
          const { data: patient } = await supabaseAdmin
            .from("patients")
            .select("id")
            .eq("created_by", link.user_id)
            .maybeSingle();

          if (!patient) {
            await sendWhatsAppReply(from, "⚠️ No patient profile found. Please set up your profile first.");
            continue;
          }

          await sendWhatsAppReply(from, "📥 Receiving your file... Processing will take a moment.");

          // Download media
          const media = await downloadWhatsAppMedia(mediaId);
          if (!media) {
            await sendWhatsAppReply(from, "❌ Failed to download the file. Please try sending again.");
            continue;
          }

          const ext = getExtension(media.mimeType);
          const storagePath = `${patient.id}/whatsapp-${Date.now()}.${ext}`;

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
            continue;
          }

          // Create document record
          const { data: doc, error: docError } = await supabaseAdmin
            .from("documents")
            .insert({
              patient_id: patient.id,
              uploaded_by: link.user_id,
              filename: fileName.includes(".") ? fileName : `${fileName}.${ext}`,
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
            continue;
          }

          // Trigger AI analysis (fire and forget)
          try {
            fetch(
              `${Deno.env.get("SUPABASE_URL")}/functions/v1/enhanced-document-analyze`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                },
                body: JSON.stringify({
                  documentId: doc.id,
                  patientId: patient.id,
                }),
              }
            ).then(async (res) => {
              if (res.ok) {
                const result = await res.json();
                const summary = result?.summary || result?.ai_summary || "Analysis complete.";
                await sendWhatsAppReply(from, `✅ File uploaded and analyzed!\n\n📋 Summary:\n${summary.substring(0, 3500)}\n\nView the full details in your MediVault dashboard.`);
              } else {
                await sendWhatsAppReply(from, "✅ File uploaded successfully! AI analysis is still processing. Check your MediVault dashboard for results.");
              }
            }).catch(() => {
              // Analysis failed but upload succeeded
            });
          } catch {
            // Fire and forget - upload already succeeded
          }

          continue;
        }

        // Unsupported message type
        await sendWhatsAppReply(from, "⚠️ I can only process text messages and files (images, PDFs, documents). Please send a supported file type.");
      }

      return new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Webhook error:", error);
      return new Response(JSON.stringify({ error: "Internal error" }), {
        status: 200, // Return 200 to prevent Meta from retrying
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response("Method not allowed", { status: 405, headers: corsHeaders });
});
