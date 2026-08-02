import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listPatientsTool from "./tools/list-patients";
import listDocumentsTool from "./tools/list-documents";
import getDocumentTool from "./tools/get-document";
import listAppointmentsTool from "./tools/list-appointments";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "medivault",
  title: "MediVault",
  version: "0.1.0",
  instructions:
    "Read-only tools for MediVault, a family medical records vault. Start with `list_patients` to find an accessible patient, then use `list_documents`, `get_document` and `list_appointments`. These tools return stored records only — never give medical advice or a diagnosis; direct health questions to a doctor.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listPatientsTool, listDocumentsTool, getDocumentTool, listAppointmentsTool],
});
