# Smarter Disease Extraction & Classification

## Problem
The vision/analysis pipeline currently dumps every disease word it sees into `extracted_entities.diagnoses` / `conditions`, and `generate-patient-summary` inserts them straight into the `diagnoses` table with a hard-coded `status: 'active'` and `confidence: 0.8`. That means a pulmonologist's "Conditions treated: Asthma, COPD" or an unchecked "☐ Diabetes" template box becomes a patient diagnosis.

## Goal
Make the system reason about **why** a disease is mentioned and only promote it to the patient summary when it is a confirmed patient diagnosis.

---

## Changes

### 1. Upgrade the extraction prompt (classification layer)

Edit `supabase/functions/ai-document-vision/index.ts` (and the equivalent prompt in `enhanced-document-analyze/index.ts`) so the model returns each condition as a structured object instead of a bare string:

```json
"conditions": [
  {
    "name": "Type 2 Diabetes Mellitus",
    "classification": "confirmed_diagnosis",
    "confidence": 0.96,
    "evidence_text": "Known case of Type 2 Diabetes Mellitus for 8 years",
    "classification_reason": "Stated as known case in patient history section"
  }
]
```

Allowed `classification` values:
- `confirmed_diagnosis`
- `suspected_condition`
- `family_history`
- `doctor_specialty` (conditions treated / specialization / department)
- `template_checkbox_unchecked`
- `template_checkbox_checked` → treated as confirmed
- `screening_or_test_purpose`
- `informational_mention`

Prompt rules to add explicitly:
- Do **not** classify as a patient condition if it appears near doctor info, under headings like *Specialization / Conditions Treated / Services / Expertise / Department*, in clinic/lab marketing, or in a template checkbox list where the box is not ticked.
- For checkboxes, infer state from glyphs (☑ ✓ ✔ [x] = checked; ☐ □ [ ] = unchecked).
- Every condition must include `evidence_text` (the exact snippet) and `classification_reason`.
- Keep the same shape for `medications` (add `status: active|historical|template_option`) and `allergies` (add `confirmed: true|false`).

### 2. Filter at write time in `generate-patient-summary`

In `supabase/functions/generate-patient-summary/index.ts` around the diagnosis-insert loop:
- Skip any condition whose `classification` is not `confirmed_diagnosis` or `template_checkbox_checked`.
- Skip any condition whose `confidence` is below a threshold read from a new `app_config` row `diagnosis_confidence_threshold` (default `0.6`).
- Persist `classification`, `confidence`, `evidence_text`, `classification_reason`, and `source_document` on every diagnosis row so the UI can show "why".
- Apply the same gate to medications (skip `template_option`) and allergies (skip `confirmed: false`).

### 3. Database migration

Add explainability columns to `public.diagnoses`:
- `classification text` (e.g. `confirmed_diagnosis`)
- `evidence_text text`
- `classification_reason text`
- `confidence numeric`

Add a row to `app_config`: `diagnosis_confidence_threshold = 0.6` (tunable).

Backward-compatible: columns are nullable, existing rows keep working.

### 4. Patient summary protection

`generate-patient-summary` already pulls from the `diagnoses`, `medications`, `labs`, `alerts` tables. With step 2 in place the summary is automatically clean. Additionally:
- When building the AI summary prompt (lines ~250-290), pass only diagnoses where `classification = 'confirmed_diagnosis'` and `confidence >= threshold`.
- Labs section: only include rows flagged abnormal.
- Allergies: only `confirmed = true`.

### 5. UI explainability

Update `src/components/PatientSummary.tsx` and `src/types/patient-summary.ts`:
- Extend `Diagnosis` with `classification`, `evidence_text`, `classification_reason`, `confidence`.
- Show a small "Why?" popover/tooltip on each diagnosis chip displaying the evidence snippet, classification, and confidence %.
- Add a subtle "Low confidence / unconfirmed" filter toggle (off by default) so power users can audit suppressed items.

### 6. Backfill safety

One-time SQL (in the same migration) to soft-hide existing diagnoses that were inserted with no classification AND whose source document is a known clinic/lab marketing type — implemented as: set `hidden_by_user = true` only when the linked document's `document_type` is in (`clinic_letterhead`, `marketing`, `directory`). This avoids nuking real history while removing the obvious noise. Users can unhide via the existing correction flow.

---

## Files touched
- `supabase/functions/ai-document-vision/index.ts` — new prompt + response shape
- `supabase/functions/enhanced-document-analyze/index.ts` — matching prompt changes
- `supabase/functions/generate-patient-summary/index.ts` — classification gate + threshold + new columns
- `src/types/patient-summary.ts` — extend `Diagnosis`
- `src/components/PatientSummary.tsx` — "Why?" evidence UI
- Migration: add columns on `diagnoses`, insert `app_config` threshold, conservative backfill

## Out of scope
- Re-processing every historical document. Existing entries stay unless the conservative backfill matches; new uploads benefit immediately.
- Changing how medications/allergies are displayed beyond the gating fix (UI tooltip is diagnosis-only for this pass).

Approve and I'll implement.
