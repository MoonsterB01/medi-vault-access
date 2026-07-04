import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowUp, Minus, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface Props {
  score: number;
  status: "good" | "watch" | "alert" | "unknown";
  label: string;
  trend: number | null;
  documentCount: number;
}

const STATUS_STYLES = {
  good: { ring: "stroke-[hsl(var(--status-good))]", dot: "bg-[hsl(var(--status-good))]", text: "text-[hsl(var(--status-good))]" },
  watch: { ring: "stroke-[hsl(var(--status-watch))]", dot: "bg-[hsl(var(--status-watch))]", text: "text-[hsl(var(--status-watch))]" },
  alert: { ring: "stroke-[hsl(var(--status-alert))]", dot: "bg-[hsl(var(--status-alert))]", text: "text-[hsl(var(--status-alert))]" },
  unknown: { ring: "stroke-muted-foreground/30", dot: "bg-muted-foreground/40", text: "text-muted-foreground" },
};

export function HealthScoreCard({ score, status, label, trend, documentCount }: Props) {
  const navigate = useNavigate();
  const s = STATUS_STYLES[status];
  const size = 200;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = status === "unknown" ? 0 : score / 100;
  const dash = c * pct;

  return (
    <Card className="p-8 md:p-10 flex flex-col items-center text-center animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <span className={cn("h-2.5 w-2.5 rounded-full", s.dot)} />
        <span className={cn("text-sm font-medium tracking-wide uppercase", s.text)}>{label}</span>
      </div>

      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="stroke-muted fill-none" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            strokeWidth={stroke}
            className={cn("fill-none transition-all duration-1000 ease-out", s.ring)}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c - dash}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {status === "unknown" ? (
            <span className="text-3xl font-semibold text-muted-foreground">--</span>
          ) : (
            <>
              <span className="text-6xl font-semibold tracking-tight text-foreground">{score}</span>
              <span className="text-xs text-muted-foreground mt-1">out of 100</span>
            </>
          )}
        </div>
      </div>

      {status === "unknown" ? (
        <div className="mt-6 space-y-3">
          <p className="text-sm text-muted-foreground max-w-xs">
            Upload a medical report to see your health score.
          </p>
          <Button onClick={() => navigate("/patient-dashboard#upload")} size="sm">
            <Upload className="h-4 w-4 mr-2" /> Upload Report
          </Button>
        </div>
      ) : (
        <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          {trend == null ? (
            <span>Based on {documentCount} {documentCount === 1 ? "report" : "reports"}</span>
          ) : trend === 0 ? (
            <>
              <Minus className="h-4 w-4" />
              <span>No change since last check</span>
            </>
          ) : trend > 0 ? (
            <>
              <ArrowUp className="h-4 w-4 text-[hsl(var(--status-good))]" />
              <span className="text-[hsl(var(--status-good))] font-medium">+{trend}</span>
              <span>since last check</span>
            </>
          ) : (
            <>
              <ArrowDown className="h-4 w-4 text-[hsl(var(--status-alert))]" />
              <span className="text-[hsl(var(--status-alert))] font-medium">{trend}</span>
              <span>since last check</span>
            </>
          )}
        </div>
      )}
    </Card>
  );
}
