# Plan: Simplify Patient Portal — Step 1 (Summary + Documents)

Refine tabs in order: **Summary → Documents → Well Being**. This plan covers Summary refinement + Documents tab. Well Being will be a separate plan after your approval of these visuals.

## 1. Per-Document Detail Page (shared)

New route `/document/:id` rendered by new `src/pages/DocumentDetail.tsx`.

Contents (visuals only, minimal text):
- Header: document type icon + date + status dot (good/watch/alert)
- `HealthScoreCard` scoped to this single document
- `KeyMetricsBars` built only from that doc's extracted labs/vitals
- `BodyHeatmap` with regions derived from this doc's diagnoses/alerts
- Small "See raw details" link → existing document summary dialog / file view
- Top-right icons: download, delete

Data source: `documents` row + `document_extractions` / existing per-doc summary already surfaced in `DocumentSummaryDialog`. No new edge functions. Score/metrics reuse `src/lib/healthScore.ts` helpers, refactored to accept either the full `PatientSummary` or a single-document subset.

## 2. Summary Tab Refinement

Add below existing `SimplePatientDashboard` blocks: a **"Recent Reports"** strip.
- Horizontal scroll on mobile / grid on desktop
- Each card: type icon, date, colored status dot, one big number (doc's health score)
- Tap → `/document/:id`

No other changes to Summary blocks already built.

## 3. Documents Tab — Visual Grid of Report Cards

Replace current `MobileDocumentsTab` list and desktop documents view with a **card grid**.

Each card (compact, no filename shown upfront):
- Large document-type icon (Lab / Prescription / Scan / Report)
- Date (relative, e.g. "3 days ago")
- Colored status dot + one-word label (Good / Watch / Alert)
- One big number: per-doc health score
- Bottom-right: tiny download + delete icon buttons
- Tap card body → `/document/:id`

Grouping: chips at top to filter by type (All / Labs / Prescriptions / Scans / Other). No search bar, no tags, no descriptions on the grid (moved to detail page).

Applies to both:
- `src/components/mobile/MobileDocumentsTab.tsx` (2-col grid)
- Desktop documents view inside `PatientDashboard.tsx` (3-4 col grid)

Prescriptions continue to appear as their own card type with pill icon.

## 4. Technical Notes

- New files:
  - `src/pages/DocumentDetail.tsx`
  - `src/components/patient/DocumentCard.tsx` (visual card)
  - `src/components/patient/RecentReportsStrip.tsx` (Summary tab addition)
- Refactor `src/lib/healthScore.ts`: extract `computeDocScore(doc, extraction)` helper reused by cards + detail page.
- Edit:
  - `src/App.tsx` → add `/document/:id` route
  - `src/components/patient/SimplePatientDashboard.tsx` → mount `RecentReportsStrip`
  - `src/components/mobile/MobileDocumentsTab.tsx` → new grid layout
  - `src/pages/PatientDashboard.tsx` → desktop grid layout for documents tab
- Untouched: edge functions, DB schema, Well Being, existing `PatientSummary` (still available via `/dashboard/details`)
- Status color derivation: reuses tokens `--status-good` / `--status-watch` / `--status-alert` already in `index.css`

## 5. Out of scope (this step)
- Well Being tab (next step after your approval of these two)
- Search tab, Appointments, Upload
- Doctor view
- Any backend/schema changes

After you approve and I implement, we'll move to **Well Being** as step 2.
