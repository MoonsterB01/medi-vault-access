import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";
import { accessiblePatientIds, NOT_ALLOWED_MESSAGE } from "../scope";

export default defineTool({
  name: "get_document",
  title: "Get document details",
  description:
    "Get one medical document's stored details: type, tags, AI summary and extracted measurements. Informational only — never a diagnosis.",
  inputSchema: {
    document_id: z.string().uuid().describe("Document id from list_documents."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ document_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const allowed = await accessiblePatientIds(supabase, ctx);
    if (allowed.length === 0) {
      return { content: [{ type: "text", text: NOT_ALLOWED_MESSAGE }], isError: true };
    }

    const { data, error } = await supabase
      .from("documents")
      .select(
        "id, patient_id, filename, document_type, description, tags, medical_specialties, ai_summary, extracted_entities, summary_confidence, uploaded_at",
      )
      .eq("id", document_id)
      .in("patient_id", allowed)
      .maybeSingle();

    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    if (!data) {
      return { content: [{ type: "text", text: NOT_ALLOWED_MESSAGE }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { document: data },
    };
  },
});
