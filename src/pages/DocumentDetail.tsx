import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Download, Trash2, Eye, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { computeDocScore, formatRelativeDate, getDocTypeMeta } from "@/lib/documentScore";
import { triggerDocumentDownload, viewDocument } from "@/lib/storage";
import { HealthScoreCard } from "@/components/patient/HealthScoreCard";
import { KeyMetricsBars } from "@/components/patient/KeyMetricsBars";
import { BodyHeatmap } from "@/components/patient/BodyHeatmap";
import type { PatientSummary } from "@/types/patient-summary";
import { deriveMetrics, deriveRegions } from "@/lib/healthScore";

/**
 * Build a synthetic PatientSummary from a single document so we can reuse
 * the existing metrics + heatmap components at the per-document level.
 */
function docToSummary(doc: any): PatientSummary | null {
  if (!doc) return null;
  const entities = doc.extracted_entities || {};
  const latest: { test: string; value: string; date: string; sourceDoc: string }[] = [];

  // Common shapes: entities.labs, entities.tests, entities.vitals — arrays of {test/name, value}
  const candidates = [entities.labs, entities.tests, entities.vitals, entities.measurements].filter(Array.isArray);
  for (const arr of candidates) {
    for (const item of arr) {
      const test = item?.test || item?.name || item?.label;
      const value = item?.value != null ? String(item.value) : item?.result;
      if (test && value) latest.push({ test, value, date: doc.uploaded_at, sourceDoc: doc.id });
    }
  }

  const summaryText = String(doc.ai_summary ?? "").toLowerCase();
  const alerts: PatientSummary["alerts"] = [];
  const alertKeywords = /(abnormal|elevated|high|low|deficien|positive|critical|urgent|severe)/g;
  const matches = summaryText.match(alertKeywords);
  if (matches?.length) {
    alerts.push({
      id: `doc-${doc.id}`,
      level: matches.length >= 3 ? "critical" : "warning",
      message: doc.ai_summary?.slice(0, 200) ?? "Concerning findings",
    });
  }

  const diagnoses = (Array.isArray(entities.diagnoses) ? entities.diagnoses : [])
    .map((d: any, i: number) => ({
      id: `${doc.id}-dx-${i}`,
      name: d?.name || d?.label || String(d),
      severity: d?.severity || "",
      status: "active" as const,
      firstSeen: doc.uploaded_at,
      lastSeen: doc.uploaded_at,
      sourceDocs: [{ docId: doc.id, confidence: 1 }],
    }));

  return {
    patientId: `doc-${doc.id}`,
    generatedAt: doc.uploaded_at,
    version: 1,
    sources: { documentCount: 1, lastDocumentId: doc.id, documents: [{ id: doc.id, type: doc.document_type, uploadedAt: doc.uploaded_at }] },
    diagnoses,
    medications: [],
    labs: { latest, trends: {} },
    visits: [],
    alerts,
    aiSummary: doc.ai_summary
      ? { oneLine: doc.ai_summary.slice(0, 120), paragraph: doc.ai_summary, confidence: doc.content_confidence ?? 0.7 }
      : undefined,
  };
}

export default function DocumentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [doc, setDoc] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.from("documents").select("*").eq("id", id).maybeSingle();
      if (error) toast({ title: "Could not load report", description: error.message, variant: "destructive" });
      setDoc(data);
      setLoading(false);
    })();
  }, [id, toast]);

  const score = useMemo(() => (doc ? computeDocScore(doc) : null), [doc]);
  const synthetic = useMemo(() => docToSummary(doc), [doc]);
  const metrics = useMemo(() => deriveMetrics(synthetic), [synthetic]);
  const regions = useMemo(() => deriveRegions(synthetic), [synthetic]);

  const handleDownload = async () => {
    if (!doc) return;
    try {
      await triggerDocumentDownload(doc.file_path, doc.filename);
      toast({ title: "Download started" });
    } catch (e: any) {
      toast({ title: "Download failed", description: e.message, variant: "destructive" });
    }
  };

  const handleView = async () => {
    if (!doc) return;
    try { await viewDocument(doc.file_path); }
    catch (e: any) { toast({ title: "Could not open", description: e.message, variant: "destructive" }); }
  };

  const handleDelete = async () => {
    if (!doc) return;
    if (!confirm(`Delete "${doc.filename}"? This can't be undone.`)) return;
    const { error } = await supabase.from("documents").delete().eq("id", doc.id);
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    toast({ title: "Report deleted" });
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-80 w-full rounded-lg" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (!doc || !score) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground">Report not found.</p>
        <Button variant="ghost" onClick={() => navigate(-1)} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Go back
        </Button>
      </div>
    );
  }

  const { icon: Icon, label: typeLabel } = getDocTypeMeta(doc.document_type);
  const STATUS_DOT = {
    good: "bg-[hsl(var(--status-good))]",
    watch: "bg-[hsl(var(--status-watch))]",
    alert: "bg-[hsl(var(--status-alert))]",
    unknown: "bg-muted-foreground/40",
  } as const;

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={handleView} aria-label="View">
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleDownload} aria-label="Download">
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleDelete} aria-label="Delete" className="text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Header card */}
      <Card className="p-5 flex items-center gap-4">
        <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
          <Icon className="h-7 w-7 text-foreground/80" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{typeLabel}</p>
          <p className="font-semibold truncate">{formatRelativeDate(doc.uploaded_at)}</p>
          <p className="text-xs text-muted-foreground">{new Date(doc.uploaded_at).toLocaleDateString()}</p>
        </div>
        <span className={cn("h-3 w-3 rounded-full", STATUS_DOT[score.status])} />
      </Card>

      {/* Health score */}
      <HealthScoreCard
        score={score.score}
        status={score.status}
        label={score.label}
        trend={null}
        documentCount={1}
      />

      {/* Metrics + body */}
      <div className="grid gap-6 md:grid-cols-2">
        <KeyMetricsBars metrics={metrics} />
        <BodyHeatmap regions={regions} />
      </div>

      {/* Raw details toggle */}
      <div className="flex justify-center">
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setShowRaw(v => !v)}>
          {showRaw ? <>Hide raw details <ChevronUp className="h-4 w-4 ml-1" /></> : <>See raw details <ChevronDown className="h-4 w-4 ml-1" /></>}
        </Button>
      </div>

      {showRaw && (
        <Card className="p-5 space-y-3 text-sm">
          <div><span className="text-muted-foreground">Filename:</span> {doc.filename}</div>
          {doc.ai_summary && (
            <div>
              <p className="text-muted-foreground mb-1">AI Summary</p>
              <p className="whitespace-pre-wrap leading-relaxed">{doc.ai_summary}</p>
            </div>
          )}
          {doc.content_keywords?.length > 0 && (
            <div>
              <p className="text-muted-foreground mb-1">Keywords</p>
              <p>{doc.content_keywords.join(", ")}</p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
