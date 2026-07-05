import { useMemo, useState } from "react";
import { DocumentCard } from "./DocumentCard";
import { categoryOf } from "@/lib/documentScore";
import { cn } from "@/lib/utils";

type Filter = "all" | "lab" | "prescription" | "scan" | "other";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "lab", label: "Labs" },
  { key: "prescription", label: "Prescriptions" },
  { key: "scan", label: "Scans" },
  { key: "other", label: "Other" },
];

interface Props {
  documents: any[];
  onDownload?: (doc: any) => void;
  onDelete?: (doc: any) => void;
}

export function DocumentsGrid({ documents, onDownload, onDelete }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const filtered = useMemo(
    () => (filter === "all" ? documents : documents.filter((d) => categoryOf(d) === filter)),
    [documents, filter]
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
              filter === f.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:bg-muted"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length > 0 ? (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((doc) => (
            <DocumentCard key={doc.id} doc={doc} onDownload={onDownload} onDelete={onDelete} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-8">
          No reports in this category.
        </p>
      )}
    </div>
  );
}
