import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { BodyRegion, RegionStatus } from "@/lib/healthScore";
import { REGION_LABEL, STATUS_TEXT } from "@/lib/healthScore";

interface Props {
  regions: Record<BodyRegion, RegionStatus>;
}

const FILL: Record<RegionStatus, string> = {
  good: "hsl(var(--status-good) / 0.4)",
  watch: "hsl(var(--status-watch) / 0.55)",
  alert: "hsl(var(--status-alert) / 0.6)",
  unknown: "hsl(var(--muted-foreground) / 0.12)",
};

const STROKE: Record<RegionStatus, string> = {
  good: "hsl(var(--status-good))",
  watch: "hsl(var(--status-watch))",
  alert: "hsl(var(--status-alert))",
  unknown: "hsl(var(--muted-foreground) / 0.35)",
};

// Central symmetry axis at x=120. All paired organs mirror around it.
// Silhouette is a single mirrored path — head, neck, shoulders, torso, hips, legs.
const SILHOUETTE_D = `
  M 120 22
  C 138 22 152 36 152 56
  C 152 70 146 82 138 88
  L 142 100
  L 168 108
  C 182 114 190 128 190 148
  L 182 236
  C 180 256 170 268 152 272
  L 148 316
  L 152 336
  L 148 448
  C 148 470 138 486 132 500
  L 108 500
  C 102 486 92 470 92 448
  L 88 336
  L 92 316
  L 88 272
  C 70 268 60 256 58 236
  L 50 148
  C 50 128 58 114 72 108
  L 98 100
  L 102 88
  C 94 82 88 70 88 56
  C 88 36 102 22 120 22 Z
`;

interface OrganProps {
  region: BodyRegion;
  status: RegionStatus;
  tip: string;
  children: React.ReactNode;
}

function Organ({ region, status, tip, children }: OrganProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <g
          className="cursor-pointer transition-transform duration-150 hover:scale-105"
          style={{ transformOrigin: "center", transformBox: "fill-box" }}
          data-region={region}
        >
          {status === "alert" && (
            // Subtle pulsing ring only when action is needed
            <g className="animate-pulse" style={{ pointerEvents: "none" }}>
              {children}
            </g>
          )}
          {children}
        </g>
      </TooltipTrigger>
      <TooltipContent>{tip}</TooltipContent>
    </Tooltip>
  );
}

export function BodyHeatmap({ regions }: Props) {
  const s = (r: BodyRegion) => regions[r];
  const tip = (r: BodyRegion) => `${REGION_LABEL[r]}: ${STATUS_TEXT[regions[r]]}`;

  return (
    <Card className="p-6 md:p-8 animate-fade-in">
      <h2 className="text-lg font-semibold mb-6">Your Body</h2>
      <TooltipProvider delayDuration={100}>
        <div className="flex items-center justify-center gap-8 flex-wrap">
          <svg
            viewBox="0 0 240 520"
            className="h-80 w-auto"
            aria-label="Body regions health status"
          >
            {/* Silhouette */}
            <path
              d={SILHOUETTE_D}
              fill="hsl(var(--muted))"
              stroke="hsl(var(--border))"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />

            {/* Head — centered */}
            <Organ region="head" status={s("head")} tip={tip("head")}>
              <circle
                cx="120"
                cy="52"
                r="18"
                fill={FILL[s("head")]}
                stroke={STROKE[s("head")]}
                strokeWidth="1.5"
              />
            </Organ>

            {/* Lungs — symmetric pair around x=120 */}
            <Organ region="lungs" status={s("lungs")} tip={tip("lungs")}>
              <path
                d="M 102 138 C 88 138 82 152 84 172 C 85 188 92 196 100 196 L 112 196 L 112 138 Z"
                fill={FILL[s("lungs")]}
                stroke={STROKE[s("lungs")]}
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path
                d="M 138 138 C 152 138 158 152 156 172 C 155 188 148 196 140 196 L 128 196 L 128 138 Z"
                fill={FILL[s("lungs")]}
                stroke={STROKE[s("lungs")]}
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </Organ>

            {/* Heart — nestled between lungs, slightly left of center (anatomical) */}
            <Organ region="heart" status={s("heart")} tip={tip("heart")}>
              <path
                d="M 116 158
                   C 108 150 96 156 100 170
                   C 103 182 116 190 116 190
                   C 116 190 129 182 132 170
                   C 136 156 124 150 116 158 Z"
                fill={FILL[s("heart")]}
                stroke={STROKE[s("heart")]}
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </Organ>

            {/* Liver — right upper abdomen (viewer's right = patient's left in mirror; kept on right for visual clarity) */}
            <Organ region="liver" status={s("liver")} tip={tip("liver")}>
              <path
                d="M 120 210
                   L 158 210
                   Q 168 210 168 220
                   L 164 232
                   Q 160 240 148 240
                   L 120 240 Z"
                fill={FILL[s("liver")]}
                stroke={STROKE[s("liver")]}
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </Organ>

            {/* Stomach — left upper abdomen, mirrors liver visually */}
            <Organ region="stomach" status={s("stomach")} tip={tip("stomach")}>
              <ellipse
                cx="96"
                cy="222"
                rx="18"
                ry="14"
                fill={FILL[s("stomach")]}
                stroke={STROKE[s("stomach")]}
                strokeWidth="1.5"
              />
            </Organ>

            {/* Kidneys — symmetric bean pair, lower back position */}
            <Organ region="kidneys" status={s("kidneys")} tip={tip("kidneys")}>
              <path
                d="M 96 256
                   C 88 256 84 264 84 274
                   C 84 284 88 290 96 290
                   C 102 290 104 284 102 274
                   C 104 264 102 256 96 256 Z"
                fill={FILL[s("kidneys")]}
                stroke={STROKE[s("kidneys")]}
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path
                d="M 144 256
                   C 152 256 156 264 156 274
                   C 156 284 152 290 144 290
                   C 138 290 136 284 138 274
                   C 136 264 138 256 144 256 Z"
                fill={FILL[s("kidneys")]}
                stroke={STROKE[s("kidneys")]}
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </Organ>

            {/* Joints — knees, aligned with leg centers */}
            <Organ region="joints" status={s("joints")} tip={tip("joints")}>
              <circle
                cx="104"
                cy="400"
                r="9"
                fill={FILL[s("joints")]}
                stroke={STROKE[s("joints")]}
                strokeWidth="1.5"
              />
              <circle
                cx="136"
                cy="400"
                r="9"
                fill={FILL[s("joints")]}
                stroke={STROKE[s("joints")]}
                strokeWidth="1.5"
              />
            </Organ>
          </svg>

          {/* Legend */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[hsl(var(--status-good))]" />
              <span className="text-muted-foreground">Looking good</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[hsl(var(--status-watch))]" />
              <span className="text-muted-foreground">Needs attention</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[hsl(var(--status-alert))]" />
              <span className="text-muted-foreground">Needs review</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-muted-foreground/40" />
              <span className="text-muted-foreground">No data yet</span>
            </div>
          </div>
        </div>
      </TooltipProvider>
    </Card>
  );
}
