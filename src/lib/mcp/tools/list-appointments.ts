import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";
import { accessiblePatientIds, NOT_ALLOWED_MESSAGE } from "../scope";

export default defineTool({
  name: "list_appointments",
  title: "List appointments",
  description:
    "List upcoming and past appointments for a patient the signed-in user can access. Times are stored in IST.",
  inputSchema: {
    patient_id: z.string().uuid().describe("Patient id from list_patients."),
    upcoming_only: z.boolean().default(true).describe("Only return appointments from today onwards."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ patient_id, upcoming_only }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const allowed = await accessiblePatientIds(supabase, ctx);
    if (!allowed.includes(patient_id)) {
      return { content: [{ type: "text", text: NOT_ALLOWED_MESSAGE }], isError: true };
    }

    let query = supabase
      .from("appointments")
      .select(
        "id, appointment_id, appointment_date, appointment_time, appointment_type, status, chief_complaint, doctor_id",
      )
      .eq("patient_id", patient_id);

    if (upcoming_only !== false) {
      const today = new Date().toISOString().slice(0, 10);
      query = query.gte("appointment_date", today);
    }

    const { data, error } = await query
      .order("appointment_date", { ascending: true })
      .order("appointment_time", { ascending: true })
      .limit(50);

    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { appointments: data ?? [] },
    };
  },
});
