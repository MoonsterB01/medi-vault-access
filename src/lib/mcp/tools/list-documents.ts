import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";
import { accessiblePatientIds, NOT_ALLOWED_MESSAGE } from "../scope";

export default defineTool({
  name: "list_documents",
  title: "List medical documents",
  description:
    "List medical documents for a patient the signed-in user can access. Returns filename, type, upload date and the AI summary (no file contents).",
  inputSchema: {
    patient_id: z.string().uuid().describe("Patient id from list_patients."),
    limit: z.number().int().min(1).max(50).default(20).describe("Maximum documents to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ patient_id, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const allowed = await accessiblePatientIds(supabase, ctx);
    if (!allowed.includes(patient_id)) {
      return { content: [{ type: "text", text: NOT_ALLOWED_MESSAGE }], isError: true };
    }

    const { data, error } = await supabase
      .from("documents")
      .select("id, filename, document_type, description, ai_summary, uploaded_at, verification_status")
      .eq("patient_id", patient_id)
      .order("uploaded_at", { ascending: false })
      .limit(limit ?? 20);

    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { documents: data ?? [] },
    };
  },
});
