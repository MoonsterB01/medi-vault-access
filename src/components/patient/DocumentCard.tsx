import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { computeDocScore, formatRelativeDate, getDocTypeMeta } from "@/lib/documentScore";

const STATUS_STYLES = {
  good: { dot: "bg-[hsl(var(--status-good))]", text: "text-[hsl(var(--status-good))]", ring: "ring-[hsl(var(--status-good))]/30" },
  watch: { dot: "bg-[hsl(var(--status-watch))]", text: "text-[hsl(var(--status-watch))]", ring: "ring-[hsl(var(--status-watch))]/30" },
  alert: { dot: "bg-[hsl(var(--status-alert))]", text: "text-[hsl(var(--status-alert))]", ring: "ring-[hsl(var(--status-alert))]/30" },
  unknown: { dot: "bg-muted-foreground/40", text: "text-muted-foreground", ring: "ring-border" },
};

interface Props {
  doc: any;
  onDownload?: (doc: any) => void;
  onDelete?: (doc: any) => void;
  variant?: "grid" | "strip";
}

export function DocumentCard({ doc, onDownload, onDelete, variant = "grid" }: Props) {
  const navigate = useNavigate();
  const { icon: Icon, label: typeLabel } = getDocTypeMeta(doc.document_type);
  const score = computeDocScore(doc);
  const s = STATUS_STYLES[score.status];

  const compact = variant === "strip";

  return (
    <Card
      onClick={() => navigate(`/document/${doc.id}`)}
      className={cn(
        "relative group cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 ring-1",
        s.ring,
        compact ? "p-4 min-w-[160px]" : "p-5"
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={cn("rounded-xl bg-muted flex items-center justify-center", compact ? "h-10 w-10" : "h-12 w-12")}>
          <Icon className={cn("text-foreground/80", compact ? "h-5 w-5" : "h-6 w-6")} />
        </div>
        <span className={cn("h-2.5 w-2.5 rounded-full", s.dot)} />
      </div>

      <div className="flex items-baseline gap-1">
        {score.status === "unknown" ? (
          <span className="text-2xl font-semibold text-muted-foreground">—</span>
        ) : (
          <>
            <span className="text-3xl font-semibold tracking-tight">{score.score}</span>
            <span className="text-xs text-muted-foreground">/100</span>
          </>
        )}
      </div>

      <p className={cn("text-xs font-medium uppercase tracking-wide mt-1", s.text)}>
        {score.label}
      </p>

      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>{typeLabel}</span>
        <span>{formatRelativeDate(doc.uploaded_at)}</span>
      </div>

      {(onDownload || onDelete) && !compact && (
        <div className="mt-4 flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onDownload && (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={(e) => { e.stopPropagation(); onDownload(doc); }}
              aria-label="Download"
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
          )}
          {onDelete && (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={(e) => { e.stopPropagation(); onDelete(doc); }}
              aria-label="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
