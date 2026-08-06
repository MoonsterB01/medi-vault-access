import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";
import { accessiblePatientIds, NO_ACCESS_MESSAGE } from "../scope";

export default defineTool({
  name: "list_patients",
  title: "List patients",
  description:
    "List the patient profiles the signed-in MediVault user can access (their own and any family accounts explicitly shared with them).",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const allowed = await accessiblePatientIds(supabase, ctx);
    if (allowed.length === 0) {
      return { content: [{ type: "text", text: NO_ACCESS_MESSAGE }], structuredContent: { patients: [] } };
    }

    const { data, error } = await supabase
      .from("patients")
      .select("id, name, dob, gender, blood_group, shareable_id, created_at")
      .in("id", allowed)
      .order("created_at", { ascending: true });

    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { patients: data ?? [] },
    };
  },
});
