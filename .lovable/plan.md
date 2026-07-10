## Goal

Replace the current lumpy body SVG in `src/components/patient/BodyHeatmap.tsx` with a clean, anatomically credible silhouette where every organ marker is aligned, symmetric, and placed where a real body actually has it. Keep all current regions (head, lungs, heart, liver, stomach, kidneys, joints) with "no data" states preserved.

## What changes

Only `src/components/patient/BodyHeatmap.tsx`. No logic, no data flow, no other file touched. `deriveRegions`, tooltip text, legend, colors, and the `RegionStatus`/`BodyRegion` types stay identical.

## Redesign details

- **Canvas**: switch to `viewBox="0 0 240 520"` for more vertical room and a cleaner grid. Everything drawn on integer/half-integer coordinates on a symmetric axis at `x = 120`.
- **Silhouette**: single smooth path built from mirrored Bézier curves — head (circle) + neck (trapezoid) + shoulders (rounded) + torso (tapered) + hips + two legs. Rounded joins, `stroke-linejoin="round"`. Filled with `hsl(var(--muted))`, outlined with `hsl(var(--border))`. No arms (keeps focus on trunk organs, avoids clutter).
- **Organ layout** (all centered on `x=120` axis, symmetric pairs equidistant):
  - Head marker: circle at (120, 50), r=22.
  - Lungs: two rounded rects/ellipses at (100,155) and (140,155), same size, mirrored.
  - Heart: small rounded shape nestled between lungs, slightly left (114, 168) — anatomically correct.
  - Liver: rounded shape upper-right abdomen (135, 210).
  - Stomach: rounded shape upper-left abdomen (105, 215), mirrored balance with liver.
  - Kidneys: two small beans at (104, 250) and (136, 250), lower back position.
  - Joints (knees): two circles at (104, 380) and (136, 380), aligned with leg centers.
- **Visual polish**:
  - Every organ gets a subtle inner label-free glow when status ≠ `unknown` (soft `filter: drop-shadow`).
  - Hover: scale 1.05 via CSS transform-origin center, 150ms transition.
  - Pulsing ring only for `alert` status (uses existing `animate-pulse` on an outer ring circle) — draws the eye to actual problems.
- **Legend**: unchanged copy, move to a right-hand column on desktop, below the body on mobile (already responsive via `flex-wrap`).

## Ascii layout reference

```text
         (head)
           O
          |||   <- neck
        _______
       /       \
      | L   R  |   <- lungs (mirrored)
      |  [H]   |   <- heart between
      | Sto Liv|   <- stomach / liver
      |  K  K  |   <- kidneys
       \_____/
        |   |
        |   |
        O   O     <- knees (joints)
        |   |
```

## Out of scope

- No animation library, no Lottie, no new dependencies.
- No changes to scoring, region derivation, or which conditions light up.
- No mobile-only variant — same SVG scales.

## Verification

After the edit: open `/document/:id` and the summary tab, confirm organs are visually centered and symmetric, tooltips still fire, and status colors still map correctly.
