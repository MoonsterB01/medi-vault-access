import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

/**
 * ChatGPT connectors only auto-invoke tools named `search` and `fetch`
 * outside developer mode, so this wraps document lookup in that contract.
 */
export default defineTool({
  name: "search",
  title: "Search medical records",
  description:
    "Search the signed-in user's MediVault medical documents (and those of family members they can access) by keyword. Returns matching records with ids to pass to `fetch`.",
  inputSchema: {
    query: z.string().describe("Keywords to search for, e.g. a filename, condition or report type."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const term = (query ?? "").trim();
    let request = supabase
      .from("documents")
      .select("id, filename, document_type, description, ai_summary, uploaded_at")
      .order("uploaded_at", { ascending: false })
      .limit(20);

    if (term) {
      const escaped = term.replace(/[%,()]/g, " ").trim();
      if (escaped) {
        request = request.or(
          `filename.ilike.%${escaped}%,description.ilike.%${escaped}%,ai_summary.ilike.%${escaped}%,document_type.ilike.%${escaped}%`,
        );
      }
    }

    const { data, error } = await request;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }

    const results = (data ?? []).map((d) => ({
      id: d.id as string,
      title: (d.filename as string) ?? "Medical document",
      text: [d.document_type, d.description, d.ai_summary].filter(Boolean).join(" — ").slice(0, 500),
      url: `https://medilock.lovable.app/documents/${d.id}`,
    }));

    return {
      content: [{ type: "text", text: JSON.stringify({ results }, null, 2) }],
      structuredContent: { results },
    };
  },
});
