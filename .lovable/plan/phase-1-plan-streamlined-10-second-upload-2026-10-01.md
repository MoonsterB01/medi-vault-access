# Phase 1 Plan: Streamlined 10-Second Upload

## Goal

Make adding a medical report feel natural for Indian families: choose a PDF/photo or take a camera snap, save it securely to the currently selected family member, and return clear confirmation without requiring medical metadata first.

## User experience

1. The upload area shows the current destination prominently, using the active patient name (for example, “Papa’s records”).
2. The primary actions are:
   - **Take a photo** — opens the camera flow.
   - **Choose a file** — accepts PDF, JPG, JPEG, and PNG within the existing upload limit.
3. As soon as a valid file is selected or captured, the app shows a clear progress state and saves it without asking for:
   - document type
   - doctor name
   - report date
   - document name
4. The saved record initially uses a safe neutral type such as “Other” while processing continues. The user is not blocked by AI analysis, and optional notes/tags remain collapsed or secondary.
5. After the save succeeds, show an accessible confirmation state:
   - “Saved to [patient name]’s records”
   - a real thumbnail for images or a clear PDF preview tile
   - a **View report** action that opens the saved document
   - an optional “Add details” action for tags/notes, never required
6. Background processing then attempts to identify the document type, doctor, date, searchable text, and plain-language summary. Until it finishes, show honest wording such as “Details are still being read” rather than implying analysis is complete.
7. If background processing fails, keep the uploaded file available and show “Saved — details could not be read yet,” with a retry path later. Never make a successful upload look like a failed upload.
8. Camera capture defaults to a single-page photo that can be saved immediately. Keep adding pages and combining them into a PDF as an optional path, without requiring a document name.

## Family and permission behavior

- Continue using the active patient already selected in the family switcher.
- Preserve the existing server-side upload permission check as authoritative.
- A view-only family member sees the destination and a clear reason they cannot upload, without a broken or misleading upload control.
- The confirmation must name the active patient, not the signed-in caregiver, so an upload on behalf of a parent is unmistakable.
- Do not add any new permission shortcuts, client-only authorization, or local-storage authority.

## Implementation scope

### Upload interface

- Refactor `src/components/DocumentUpload.tsx` so file selection/camera capture can submit immediately.
- Remove the required document-type gate and the pre-save AI Vision wait.
- Add a small state machine for selecting, saving, saved, and processing/error states so controls cannot overlap or submit twice.
- Return the created document information from the upload callback so the confirmation can link to the actual record.
- Keep optional tags/notes available after saving or in a non-blocking expandable section.
- Use existing Button/Card/Input components and semantic theme tokens for both light and dark modes.
- Keep the existing subscription limit, blocked-file check, file-size guard, active-patient target, and permission behavior intact.

### Camera flow

- Simplify `src/components/DocumentScanner.tsx` for the one-page path: no required document name and no forced PDF-generation step.
- Generate a safe automatic filename from the capture timestamp when the user has not supplied one.
- Preserve multi-page capture, rotation, and PDF generation as optional actions.
- Keep camera permission, cancellation, and recovery-session errors understandable and non-destructive.

### Background document processing

- Adjust the upload pipeline so storage/database creation completes before AI processing is required.
- Reuse the existing document-analysis and summary capabilities where possible, but make the processing invocation server-side and scoped to the saved document.
- Persist extracted document type, doctor/date entities, searchable text, and summary only when supported by the actual document evidence.
- Keep the existing conservative diagnosis classification rules; this phase must not turn mentions, specialties, or unchecked template options into diagnoses.
- Preserve safe gateway behavior: surface the upstream safe error, retry only bounded transient 429/5xx failures, and leave a saved document available when processing is unavailable.
- Do not add a schema migration unless the current document fields cannot represent the required metadata; first use existing fields such as `document_type`, `extracted_entities`, `extracted_dates`, `extracted_text`, `ai_summary`, and processing timestamps.

### Confirmation and record viewing

- Add the smallest focused confirmation UI needed, or extend the existing upload component if that avoids duplication.
- Use the real saved document ID and existing `/document/:id` page for **View report**.
- Reuse existing storage helpers for thumbnails/signed document access; do not expose private storage paths as public URLs.
- Update desktop and mobile upload presentation consistently, including `MobileUploadTab.tsx` and the dashboard callback that refreshes the active patient’s records.

## Verification

- Check the preview on desktop, tablet, and mobile widths with no horizontal scrolling or overlapping controls.
- Verify keyboard focus, labels, live progress/confirmation announcements, and readable contrast in light and dark themes.
- Exercise the owner flow with a real signed-in account: choose a PDF, confirm it saves before analysis completes, open it from the confirmation, and confirm the record appears under the correct patient.
- Exercise the family flow with an upload-enabled caregiver and confirm the success message and stored `patient_id` point to the active parent account.
- Confirm a view-only caregiver cannot upload and that a revoked family grant cannot upload.
- Confirm camera capture saves without a document name, and confirm optional multi-page PDF creation still works.
- Confirm delayed/failed analysis leaves the file usable and reports the honest processing state.
- Review build, runtime, and network diagnostics before declaring Phase 1 complete.

## Out of scope for Phase 1

- WhatsApp upload automation.
- New search ranking or natural-language search redesign.
- Appointment, MCP, hospital-management, or account-permission redesign.
- Medical advice, diagnosis, or compliance claims.
