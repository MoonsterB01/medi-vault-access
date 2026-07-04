import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { BodyRegion, RegionStatus } from "@/lib/healthScore";
import { REGION_LABEL, STATUS_TEXT } from "@/lib/healthScore";

interface Props {
  regions: Record<BodyRegion, RegionStatus>;
}

const FILL: Record<RegionStatus, string> = {
  good: "hsl(var(--status-good) / 0.35)",
  watch: "hsl(var(--status-watch) / 0.55)",
  alert: "hsl(var(--status-alert) / 0.6)",
  unknown: "hsl(var(--muted-foreground) / 0.15)",
};

const STROKE: Record<RegionStatus, string> = {
  good: "hsl(var(--status-good))",
  watch: "hsl(var(--status-watch))",
  alert: "hsl(var(--status-alert))",
  unknown: "hsl(var(--muted-foreground) / 0.4)",
};

export function BodyHeatmap({ regions }: Props) {
  const has = (r: BodyRegion) => regions[r];
  const tip = (r: BodyRegion) => `${REGION_LABEL[r]}: ${STATUS_TEXT[regions[r]]}`;

  return (
    <Card className="p-6 md:p-8 animate-fade-in">
      <h2 className="text-lg font-semibold mb-6">Your Body</h2>
      <TooltipProvider delayDuration={100}>
        <div className="flex items-center justify-center gap-8 flex-wrap">
          <svg viewBox="0 0 200 400" className="h-72 w-auto">
            {/* Body outline */}
            <g fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="1.5">
              <circle cx="100" cy="40" r="28" />
              <path d="M 72 68 Q 70 80 60 90 L 40 160 Q 38 175 46 178 L 60 172 L 66 200 L 66 260 Q 66 275 76 275 L 90 275 L 92 380 Q 92 390 84 390 L 76 390 L 76 395 L 104 395 L 104 275 L 96 275 L 96 200 L 134 200 L 134 275 L 126 275 L 126 395 L 154 395 L 154 390 L 146 390 Q 138 390 138 380 L 140 275 L 154 275 Q 164 275 164 260 L 164 200 L 170 172 L 184 178 Q 192 175 190 160 L 170 90 Q 160 80 158 68 Q 130 78 100 78 Q 70 78 72 68 Z" />
            </g>

            {/* Head */}
            <Tooltip>
              <TooltipTrigger asChild>
                <circle cx="100" cy="40" r="20" fill={FILL[has("head")]} stroke={STROKE[has("head")]} strokeWidth="1.5" className="cursor-pointer transition-all hover:opacity-80" />
              </TooltipTrigger>
              <TooltipContent>{tip("head")}</TooltipContent>
            </Tooltip>

            {/* Lungs */}
            <Tooltip>
              <TooltipTrigger asChild>
                <ellipse cx="82" cy="130" rx="16" ry="26" fill={FILL[has("lungs")]} stroke={STROKE[has("lungs")]} strokeWidth="1.5" className="cursor-pointer transition-all hover:opacity-80" />
              </TooltipTrigger>
              <TooltipContent>{tip("lungs")}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <ellipse cx="118" cy="130" rx="16" ry="26" fill={FILL[has("lungs")]} stroke={STROKE[has("lungs")]} strokeWidth="1.5" className="cursor-pointer transition-all hover:opacity-80" />
              </TooltipTrigger>
              <TooltipContent>{tip("lungs")}</TooltipContent>
            </Tooltip>

            {/* Heart */}
            <Tooltip>
              <TooltipTrigger asChild>
                <path d="M 100 118 C 92 108, 78 112, 82 128 C 84 140, 100 148, 100 148 C 100 148, 116 140, 118 128 C 122 112, 108 108, 100 118 Z" fill={FILL[has("heart")]} stroke={STROKE[has("heart")]} strokeWidth="1.5" className="cursor-pointer transition-all hover:opacity-80" />
              </TooltipTrigger>
              <TooltipContent>{tip("heart")}</TooltipContent>
            </Tooltip>

            {/* Liver */}
            <Tooltip>
              <TooltipTrigger asChild>
                <path d="M 74 170 Q 74 158 90 158 L 108 160 Q 112 172 108 182 L 82 184 Q 74 182 74 170 Z" fill={FILL[has("liver")]} stroke={STROKE[has("liver")]} strokeWidth="1.5" className="cursor-pointer transition-all hover:opacity-80" />
              </TooltipTrigger>
              <TooltipContent>{tip("liver")}</TooltipContent>
            </Tooltip>

            {/* Stomach */}
            <Tooltip>
              <TooltipTrigger asChild>
                <ellipse cx="112" cy="180" rx="14" ry="12" fill={FILL[has("stomach")]} stroke={STROKE[has("stomach")]} strokeWidth="1.5" className="cursor-pointer transition-all hover:opacity-80" />
              </TooltipTrigger>
              <TooltipContent>{tip("stomach")}</TooltipContent>
            </Tooltip>

            {/* Kidneys */}
            <Tooltip>
              <TooltipTrigger asChild>
                <ellipse cx="82" cy="210" rx="8" ry="14" fill={FILL[has("kidneys")]} stroke={STROKE[has("kidneys")]} strokeWidth="1.5" className="cursor-pointer transition-all hover:opacity-80" />
              </TooltipTrigger>
              <TooltipContent>{tip("kidneys")}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <ellipse cx="118" cy="210" rx="8" ry="14" fill={FILL[has("kidneys")]} stroke={STROKE[has("kidneys")]} strokeWidth="1.5" className="cursor-pointer transition-all hover:opacity-80" />
              </TooltipTrigger>
              <TooltipContent>{tip("kidneys")}</TooltipContent>
            </Tooltip>

            {/* Joints - knees */}
            <Tooltip>
              <TooltipTrigger asChild>
                <circle cx="88" cy="320" r="8" fill={FILL[has("joints")]} stroke={STROKE[has("joints")]} strokeWidth="1.5" className="cursor-pointer transition-all hover:opacity-80" />
              </TooltipTrigger>
              <TooltipContent>{tip("joints")}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <circle cx="115" cy="320" r="8" fill={FILL[has("joints")]} stroke={STROKE[has("joints")]} strokeWidth="1.5" className="cursor-pointer transition-all hover:opacity-80" />
              </TooltipTrigger>
              <TooltipContent>{tip("joints")}</TooltipContent>
            </Tooltip>
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
              <span className="text-muted-foreground">See a doctor</span>
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
