import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { BodyRegion, RegionStatus } from "@/lib/healthScore";
import { REGION_LABEL, STATUS_TEXT } from "@/lib/healthScore";

interface Props {
  regions: Record<BodyRegion, RegionStatus>;
}

// Spec colors — used directly so the palette matches Apple/Samsung Health tone
// regardless of the app's semantic tokens.
const NODE_COLOR: Record<RegionStatus, string> = {
  good: "#22C55E",
  watch: "#F59E0B",
  alert: "#EF4444",
  unknown: "#64748B",
};

// Animation class per status — subtle, no bouncing/spinning.
const NODE_ANIM: Record<RegionStatus, string> = {
  good: "animate-[breath_4s_ease-in-out_infinite]",
  watch: "animate-[pulseSoft_2s_ease-in-out_infinite]",
  alert: "animate-[pulseStrong_1.6s_ease-in-out_infinite]",
  unknown: "",
};

// Central axis at x=120. Silhouette is a single mirrored path — head, neck,
// rounded shoulders, tapered torso, hips, legs. No arms, no facial features,
// no fingers/toes. Filled with a dark slate, no outline.
const SILHOUETTE_D = `
  M 120 24
  C 138 24 152 40 152 60
  C 152 76 144 88 134 92
  L 138 106
  C 158 110 174 122 180 142
  L 184 210
  C 186 232 178 246 164 252
  L 160 320
  L 156 344
  L 150 470
  C 150 488 142 500 132 504
  L 108 504
  C 98 500 90 488 90 470
  L 84 344
  L 80 320
  L 76 252
  C 62 246 54 232 56 210
  L 60 142
  C 66 122 82 110 102 106
  L 106 92
  C 96 88 88 76 88 60
  C 88 40 102 24 120 24 Z
`;

interface Node {
  region: BodyRegion;
  cx: number;
  cy: number;
  shape: "circle" | "capsule" | "pill" | "rect";
  w?: number;
  h?: number;
  r?: number;
}

// Abstract health nodes — never literal organs. Placed on the symmetry axis
// or mirrored across it. Regions that map to a paired area render two nodes
// sharing one status; taps still register per region.
const NODES: Record<BodyRegion, Node[]> = {
  head: [{ region: "head", cx: 120, cy: 58, shape: "circle", r: 5 }],
  lungs: [
    { region: "lungs", cx: 108, cy: 150, shape: "capsule", w: 8, h: 26 },
    { region: "lungs", cx: 132, cy: 150, shape: "capsule", w: 8, h: 26 },
  ],
  heart: [{ region: "heart", cx: 120, cy: 168, shape: "circle", r: 4.5 }],
  stomach: [{ region: "stomach", cx: 120, cy: 208, shape: "rect", w: 22, h: 10 }],
  liver: [{ region: "liver", cx: 120, cy: 232, shape: "pill", w: 26, h: 8 }],
  kidneys: [
    { region: "kidneys", cx: 108, cy: 262, shape: "circle", r: 3.5 },
    { region: "kidneys", cx: 132, cy: 262, shape: "circle", r: 3.5 },
  ],
  joints: [
    { region: "joints", cx: 104, cy: 402, shape: "circle", r: 4 },
    { region: "joints", cx: 136, cy: 402, shape: "circle", r: 4 },
  ],
};

function NodeShape({ node, color, anim }: { node: Node; color: string; anim: string }) {
  const style = {
    filter: `drop-shadow(0 0 6px ${color}) drop-shadow(0 0 12px ${color})`,
    opacity: 0.95,
  } as const;
  // fillOpacity keeps the node visible on the dark silhouette while the outer
  // glow does the heavy lifting; overall glow stays under ~20% perceived.
  const common = {
    fill: color,
    fillOpacity: 0.85,
    stroke: color,
    strokeOpacity: 0.35,
    strokeWidth: 0.6,
    style,
    className: anim,
  };

  if (node.shape === "circle") {
    return <circle cx={node.cx} cy={node.cy} r={node.r ?? 4} {...common} />;
  }
  const w = node.w ?? 10;
  const h = node.h ?? 6;
  const rx = node.shape === "rect" ? 3 : Math.min(w, h) / 2;
  return (
    <rect
      x={node.cx - w / 2}
      y={node.cy - h / 2}
      width={w}
      height={h}
      rx={rx}
      ry={rx}
      {...common}
    />
  );
}

const REGION_EMOJI: Record<BodyRegion, string> = {
  head: "🧠",
  heart: "❤️",
  lungs: "🫁",
  stomach: "🍽",
  liver: "🧬",
  kidneys: "💧",
  joints: "🦴",
};

export function BodyHeatmap({ regions }: Props) {
  return (
    <Card className="p-6 md:p-8 animate-fade-in bg-card">
      <h2 className="text-lg font-semibold mb-6">Your Body</h2>

      {/* Local keyframes — kept scoped so we don't touch the global tailwind config. */}
      <style>{`
        @keyframes breath {
          0%, 100% { opacity: 0.75; }
          50% { opacity: 1; }
        }
        @keyframes pulseSoft {
          0%, 100% { opacity: 0.7; transform: scale(1); transform-box: fill-box; transform-origin: center; }
          50% { opacity: 1; transform: scale(1.08); }
        }
        @keyframes pulseStrong {
          0%, 100% { opacity: 0.75; transform: scale(1); transform-box: fill-box; transform-origin: center; }
          50% { opacity: 1; transform: scale(1.18); }
        }
      `}</style>

      <TooltipProvider delayDuration={100}>
        <div className="flex items-center justify-center gap-10 flex-wrap">
          <svg
            viewBox="0 0 240 528"
            className="h-80 w-auto"
            aria-label="Body regions health status"
          >
            <defs>
              <linearGradient id="bodyFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#334155" />
                <stop offset="100%" stopColor="#273449" />
              </linearGradient>
            </defs>

            {/* Silhouette — no outline, no anatomy, just form */}
            <path d={SILHOUETTE_D} fill="url(#bodyFill)" />

            {/* Health nodes */}
            {(Object.keys(NODES) as BodyRegion[]).map((region) => {
              const status = regions[region];
              const color = NODE_COLOR[status];
              const anim = NODE_ANIM[status];
              const tip = `${REGION_EMOJI[region]} ${REGION_LABEL[region]} — ${STATUS_TEXT[status]}`;
              return (
                <Tooltip key={region}>
                  <TooltipTrigger asChild>
                    <g className="cursor-pointer" data-region={region}>
                      {NODES[region].map((node, i) => (
                        <NodeShape key={i} node={node} color={color} anim={anim} />
                      ))}
                    </g>
                  </TooltipTrigger>
                  <TooltipContent>{tip}</TooltipContent>
                </Tooltip>
              );
            })}
          </svg>

          {/* Legend */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: NODE_COLOR.good }} />
              <span className="text-muted-foreground">Good</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: NODE_COLOR.watch }} />
              <span className="text-muted-foreground">Monitor</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: NODE_COLOR.alert }} />
              <span className="text-muted-foreground">Needs review</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: NODE_COLOR.unknown }} />
              <span className="text-muted-foreground">No data yet</span>
            </div>
          </div>
        </div>
      </TooltipProvider>
    </Card>
  );
}
