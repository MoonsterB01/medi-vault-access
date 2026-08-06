import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";
import { accessiblePatientIds, NOT_ALLOWED_MESSAGE } from "../scope";

export default defineTool({
  name: "fetch",
  title: "Fetch a medical record",
  description:
    "Fetch the stored details of one MediVault medical document by id (from `search`). Returns stored record data only — never a diagnosis or medical advice.",
  inputSchema: {
    id: z.string().describe("Document id returned by `search`."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
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
        "id, patient_id, filename, document_type, description, tags, medical_specialties, ai_summary, extracted_entities, uploaded_at",
      )
      .eq("id", id)
      .in("patient_id", allowed)
      .maybeSingle();

    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    if (!data) {
      return { content: [{ type: "text", text: NOT_ALLOWED_MESSAGE }], isError: true };
    }

    const result = {
      id: data.id as string,
      title: (data.filename as string) ?? "Medical document",
      text: JSON.stringify(data, null, 2),
      url: `https://medilock.lovable.app/documents/${data.id}`,
    };
    return {
      content: [{ type: "text", text: result.text }],
      structuredContent: result,
    };
  },
});
