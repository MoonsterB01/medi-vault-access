
# Simplified Patient Dashboard

Goal: patient opens the app and instantly sees "how am I doing?" — no reading, no thinking. Deep detail moves to a separate page for doctors and curious users.

## What the patient sees (new main view)

```text
┌────────────────────────────────┐
│         ● Doing Well           │  ← status light (green/yellow/red)
│                                │
│            82                  │  ← big Health Score (0–100)
│         out of 100             │
│         ↑ +4 vs last month     │  ← trend
└────────────────────────────────┘

┌──── Key Numbers ────┐
│ Blood Pressure  ██████████░  Good  │
│ Blood Sugar     ███████░░░░  Watch │
│ Cholesterol     █████████░░  Good  │
│ BMI             ████████░░░  Good  │
└─────────────────────┘

┌──── Your Body ────┐
│    [body silhouette with        │
│     colored zones — heart       │
│     yellow, lungs green, etc.]  │
└───────────────────┘

[ See full details ]   ← link to old detailed view
```

Three blocks only. No paragraphs. No patient-info card. No confidence badges. No "regenerate" button visible by default.

## Blocks in detail

**1. Health Score card**
- Big number 0–100 with a colored ring (green ≥75, yellow 50–74, red <50).
- Status label above: "Doing Well" / "Needs Attention" / "See a Doctor".
- Trend row: arrow + delta vs previous score (`↑ +4 vs last month`).
- Empty state (no docs): grey ring, "Upload a report to see your score", single upload button.

**2. Key Numbers (progress bars)**
- Up to 6 metrics pulled from the AI summary: BP (systolic), Blood Sugar (fasting), Cholesterol (total), BMI, Hemoglobin, Heart Rate. Show only metrics that exist in the data.
- Each row: label · horizontal bar filled to `value` positioned inside its healthy range · one-word status (Low / Good / Watch / High), colored.
- Bar shows the healthy band as a lighter track and a marker for the patient's value — no numbers, no units on the main view.

**3. Body heatmap**
- Simple SVG human silhouette. Regions (head, heart, lungs, stomach, liver, kidneys, joints) are tinted green/yellow/red based on findings.
- Tap a region → small tooltip with the plain-language status ("Heart: looking good"). No medical detail.

**4. "See full details" link**
- Opens a new route `/dashboard/details` (mobile + desktop) that renders the current `PatientSummary` UI as-is: AI paragraph, patient info card, confidence, regenerate, edit. Nothing there is lost — just moved.

## Scope

Applies to both:
- Desktop: `PatientDashboard.tsx` Summary section
- Mobile: `MobileSummaryTab.tsx`

Both render a new shared component; the detail page reuses the existing `PatientSummary` component untouched.

## Data source

No backend changes. Everything derives from the existing `patient_summaries.summary` JSON already fetched by `use-patient-summary.ts`:
- Score: use `aiSummary.confidence`-adjusted composite if a numeric score exists in the JSON; otherwise compute client-side from metric statuses (each Good = full, Watch = half, High/Low = zero, averaged × 100).
- Trend: compare to previous score snapshot stored client-side in `localStorage` keyed by patient id (until a `score_history` table is added later).
- Metrics: read `summary.vitals` / `summary.labs` if present; otherwise best-effort parse from `aiSummary` structured fields. Any missing metric is skipped (never shown as 0).
- Body regions: map known condition keywords in `summary.conditions` to region ids.

If the JSON doesn't yet contain structured metrics, the block renders an empty state ("Metrics will appear after your next report is analyzed") rather than fake data — per the no-fake-data rule.

## Visual language

- Minimal. White surface, generous padding, one accent color per status.
- Reuse existing semantic tokens (`--primary`, `--trust`, plus new `--status-good`, `--status-watch`, `--status-alert` HSL tokens in `index.css`, mirrored in `tailwind.config.ts`).
- No animation beyond a subtle fade-in and a bar fill transition. No pulsing dots on the main view.
- Fully responsive: score card full-width on mobile, side-by-side with metrics on desktop ≥ md.

## Files

New:
- `src/components/patient/HealthScoreCard.tsx`
- `src/components/patient/KeyMetricsBars.tsx`
- `src/components/patient/BodyHeatmap.tsx` (inline SVG)
- `src/components/patient/SimplePatientDashboard.tsx` (composes the three)
- `src/pages/PatientDetails.tsx` (renders current `PatientSummary`)
- `src/lib/healthScore.ts` (score + metric derivation from summary JSON)

Edited:
- `src/components/mobile/MobileSummaryTab.tsx` → render `SimplePatientDashboard` + "See full details" link.
- `src/pages/PatientDashboard.tsx` → replace the summary section with `SimplePatientDashboard` + link.
- `src/App.tsx` → add `/dashboard/details` route.
- `src/index.css` + `tailwind.config.ts` → add status color tokens.

Untouched:
- `PatientSummary.tsx`, `EditPatientInfoDialog.tsx`, `use-patient-summary.ts`, all edge functions, all DB schema.

## Out of scope (call out for later)

- Persisting score history in a `patient_score_history` table (currently localStorage).
- Re-prompting `generate-patient-summary` to always emit structured `vitals` / `labs` / `regions` blocks.
- Doctor-facing view of the same simplified card.
