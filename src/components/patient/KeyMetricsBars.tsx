import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { MetricRow, MetricStatus } from "@/lib/healthScore";

const STATUS_LABEL: Record<MetricStatus, string> = {
  good: "Good",
  watch: "Watch",
  low: "Low",
  high: "High",
  unknown: "—",
};

const STATUS_COLOR: Record<MetricStatus, string> = {
  good: "bg-[hsl(var(--status-good))]",
  watch: "bg-[hsl(var(--status-watch))]",
  low: "bg-[hsl(var(--status-alert))]",
  high: "bg-[hsl(var(--status-alert))]",
  unknown: "bg-muted-foreground/40",
};

const STATUS_TEXT: Record<MetricStatus, string> = {
  good: "text-[hsl(var(--status-good))]",
  watch: "text-[hsl(var(--status-watch))]",
  low: "text-[hsl(var(--status-alert))]",
  high: "text-[hsl(var(--status-alert))]",
  unknown: "text-muted-foreground",
};

export function KeyMetricsBars({ metrics }: { metrics: MetricRow[] }) {
  return (
    <Card className="p-6 md:p-8 animate-fade-in">
      <h2 className="text-lg font-semibold mb-6">Key Numbers</h2>

      {metrics.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          Key numbers will appear after your next report is analyzed.
        </p>
      ) : (
        <div className="space-y-5">
          {metrics.map((m) => {
            const range = m.max - m.min;
            const bandLeft = ((m.healthyMin - m.min) / range) * 100;
            const bandWidth = ((m.healthyMax - m.healthyMin) / range) * 100;
            const markerLeft = Math.max(0, Math.min(100, ((m.value - m.min) / range) * 100));
            return (
              <div key={m.key}>
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">{m.label}</span>
                  <span className={cn("text-xs font-semibold uppercase tracking-wide", STATUS_TEXT[m.status])}>
                    {STATUS_LABEL[m.status]}
                  </span>
                </div>
                <div className="relative h-2.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="absolute inset-y-0 bg-[hsl(var(--status-good))]/20"
                    style={{ left: `${bandLeft}%`, width: `${bandWidth}%` }}
                  />
                  <div
                    className={cn(
                      "absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full ring-2 ring-background transition-all duration-700",
                      STATUS_COLOR[m.status]
                    )}
                    style={{ left: `calc(${markerLeft}% - 8px)` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
