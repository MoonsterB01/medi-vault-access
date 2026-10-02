import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";
import { assertPatientPermission, authenticateRequest, unauthorized, forbidden } from "../_shared/auth.ts";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const caller = await authenticateRequest(req);
  if (!caller) return unauthorized(corsHeaders);

  try {
    const body = await req.json();
    const documentId = typeof body?.documentId === "string" ? body.documentId.trim() : "";
    const description = typeof body?.description === "string" ? body.description.trim() : "";
    const tags = Array.isArray(body?.tags)
      ? body.tags
        .filter((tag: unknown): tag is string => typeof tag === "string")
        .map((tag: string) => tag.trim())
        .filter(Boolean)
        .slice(0, 20)
      : [];

    if (!documentId || documentId.length > 100 || description.length > 1000) {
      return json({ error: "A valid document and note are required." }, 400);
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: document, error: documentError } = await adminClient
      .from("documents")
      .select("id, patient_id")
      .eq("id", documentId)
      .maybeSingle();

    if (documentError) return json({ error: "Could not find the report." }, 500);
    if (!document) return json({ error: "Report not found." }, 404);

    if (!(await assertPatientPermission(adminClient, caller, document.patient_id, "upload"))) {
      return forbidden(corsHeaders);
    }

    const { error: updateError } = await adminClient
      .from("documents")
      .update({ description: description || null, tags })
      .eq("id", documentId);

    if (updateError) return json({ error: "Report details could not be saved." }, 500);
    return json({ success: true });
  } catch (error) {
    console.error("update-document-details error:", error);
    return json({ error: "Report details could not be saved." }, 500);
  }
});
