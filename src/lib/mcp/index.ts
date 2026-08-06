import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listPatientsTool from "./tools/list-patients";
import listDocumentsTool from "./tools/list-documents";
import getDocumentTool from "./tools/get-document";
import listAppointmentsTool from "./tools/list-appointments";
import searchTool from "./tools/search";
import fetchTool from "./tools/fetch";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "medivault",
  title: "MediVault",
  version: "0.1.0",
  instructions:
    "Read-only tools for MediVault, a family medical records vault. These tools only ever return the signed-in user's own patient profiles and family accounts explicitly shared with them — never any other person's records, even if asked. Use `search` to find documents by keyword and `fetch` to read one by id. For structured browsing, start with `list_patients`, then `list_documents`, `get_document` and `list_appointments`. Always call these tools when the user asks about their records, documents, reports or appointments — never answer from memory. These tools return stored records only; never give medical advice or a diagnosis, and direct health questions to a doctor.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    searchTool,
    fetchTool,
    listPatientsTool,
    listDocumentsTool,
    getDocumentTool,
    listAppointmentsTool,
  ],
});

