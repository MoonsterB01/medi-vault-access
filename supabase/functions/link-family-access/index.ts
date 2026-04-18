// Edge function: link-family-access
// Validates a Patient Shareable ID (PID), links the calling user as a family helper,
// and creates a notification for the patient owner.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing authorization header" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Client bound to caller (to identify F)
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return jsonResponse({ error: "Not authenticated" }, 401);
    }
    const familyUserId = userData.user.id;

    const { shareable_id } = await req.json();
    if (!shareable_id || typeof shareable_id !== "string") {
      return jsonResponse({ error: "shareable_id is required" }, 400);
    }
    const trimmedPid = shareable_id.trim().toUpperCase();

    // Service client to bypass RLS for the lookup (we still enforce server-side)
    const adminClient = createClient(supabaseUrl, serviceKey);

    // 1. Find the patient by shareable_id
    const { data: patient, error: patientErr } = await adminClient
      .from("patients")
      .select("id, name, created_by, shareable_id")
      .eq("shareable_id", trimmedPid)
      .maybeSingle();

    if (patientErr) {
      console.error("Patient lookup error:", patientErr);
      return jsonResponse({ error: "Failed to look up patient" }, 500);
    }
    if (!patient) {
      return jsonResponse(
        { error: "No patient found with that Shareable ID" },
        404,
      );
    }

    // 2. Prevent self-linking
    if (patient.created_by === familyUserId) {
      return jsonResponse(
        { error: "You cannot link to your own patient account" },
        400,
      );
    }

    // 3. Check for existing active link
    const { data: existing } = await adminClient
      .from("family_access")
      .select("id, is_active")
      .eq("patient_id", patient.id)
      .eq("family_user_id", familyUserId)
      .maybeSingle();

    if (existing && existing.is_active) {
      return jsonResponse(
        { error: "You already have access to this patient" },
        409,
      );
    }

    // 4. Create or reactivate the family access link
    let linkId: string;
    if (existing) {
      const { data: updated, error: updErr } = await adminClient
        .from("family_access")
        .update({
          is_active: true,
          revoked_at: null,
          granted_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select("id")
        .single();
      if (updErr) {
        console.error("Reactivate error:", updErr);
        return jsonResponse({ error: "Failed to reactivate access" }, 500);
      }
      linkId = updated.id;
    } else {
      const { data: inserted, error: insErr } = await adminClient
        .from("family_access")
        .insert({
          patient_id: patient.id,
          family_user_id: familyUserId,
          permissions: { view: true, upload: true, appointments: true },
        })
        .select("id")
        .single();
      if (insErr) {
        console.error("Insert error:", insErr);
        return jsonResponse({ error: "Failed to create access link" }, 500);
      }
      linkId = inserted.id;
    }

    // 5. Get the family member's name for the notification
    const { data: familyUser } = await adminClient
      .from("users")
      .select("name, email")
      .eq("id", familyUserId)
      .maybeSingle();

    const familyName = familyUser?.name || familyUser?.email || "A family member";

    // 6. Notify the patient owner
    await adminClient.rpc("create_notification", {
      target_user_id: patient.created_by,
      notification_title: "Family access granted",
      notification_message:
        `${familyName} now has access to your medical records. You can revoke this anytime from the Family Access tab.`,
      notification_type: "family_access_granted",
      metadata_param: {
        family_user_id: familyUserId,
        family_name: familyName,
        link_id: linkId,
      },
    });

    return jsonResponse({
      success: true,
      link_id: linkId,
      patient: { id: patient.id, name: patient.name },
    });
  } catch (err) {
    console.error("link-family-access error:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
