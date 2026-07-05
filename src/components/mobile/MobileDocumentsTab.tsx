import { useMemo, useState } from "react";
import { Pill, Calendar, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DocumentCard } from "@/components/patient/DocumentCard";
import { categoryOf } from "@/lib/documentScore";
import { triggerDocumentDownload } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface MobileDocumentsTabProps {
  documents: any[];
  prescriptions: any[];
  onDeleteDocument: (id: string, filename: string) => void;
}

type Filter = "all" | "lab" | "prescription" | "scan" | "other";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "lab", label: "Labs" },
  { key: "prescription", label: "Prescriptions" },
  { key: "scan", label: "Scans" },
  { key: "other", label: "Other" },
];

export function MobileDocumentsTab({ documents, prescriptions, onDeleteDocument }: MobileDocumentsTabProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const { toast } = useToast();

  const filtered = useMemo(() => {
    if (filter === "all") return documents;
    return documents.filter((d) => categoryOf(d) === filter);
  }, [documents, filter]);

  const handleDownload = async (doc: any) => {
    try {
      await triggerDocumentDownload(doc.file_path, doc.filename);
      toast({ title: "Download started" });
    } catch (e: any) {
      toast({ title: "Download failed", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border",
              filter === f.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:bg-muted"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Reports grid */}
      <section>
        <h2 className="text-sm font-semibold mb-3 px-1">
          Reports ({filtered.length})
        </h2>
        {filtered.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((doc) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                onDownload={handleDownload}
                onDelete={(d) => onDeleteDocument(d.id, d.filename)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground text-sm bg-muted/30 rounded-lg">
            No reports in this category
          </div>
        )}
      </section>

      {/* Prescriptions */}
      {prescriptions.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold mb-3 px-1">Doctor Prescriptions</h2>
          <div className="space-y-2">
            {prescriptions.map((rx) => (
              <Card key={rx.id} className="p-3 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Pill className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{rx.prescription_id}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    Dr. {rx.doctors?.users?.name || "Unknown"}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(rx.created_at).toLocaleDateString()}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
