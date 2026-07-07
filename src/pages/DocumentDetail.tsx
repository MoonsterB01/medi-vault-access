import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Download, Trash2, Eye, ChevronDown, ChevronUp, TrendingUp, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { computeDocScore, formatRelativeDate, getDocTypeMeta } from "@/lib/documentScore";
import { triggerDocumentDownload, viewDocument } from "@/lib/storage";
import { HealthScoreCard } from "@/components/patient/HealthScoreCard";
import { KeyMetricsBars } from "@/components/patient/KeyMetricsBars";
import { BodyHeatmap } from "@/components/patient/BodyHeatmap";
import type { PatientSummary } from "@/types/patient-summary";
import { deriveMetrics, deriveRegions } from "@/lib/healthScore";
import type { FlagSeverity } from "@/lib/labRules";

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
  const [siblings, setSiblings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.from("documents").select("*").eq("id", id).maybeSingle();
      if (error) toast({ title: "Could not load report", description: error.message, variant: "destructive" });
      setDoc(data);

      // Load sibling documents for the same patient so we can detect trends
      if (data?.patient_id) {
        const { data: sibs } = await supabase
          .from("documents")
          .select("id, uploaded_at, extracted_entities, document_type, ai_summary")
          .eq("patient_id", data.patient_id)
          .order("uploaded_at", { ascending: false })
          .limit(20);
        setSiblings(sibs ?? []);
      }
      setLoading(false);
    })();
  }, [id, toast]);

  const score = useMemo(() => (doc ? computeDocScore(doc, siblings) : null), [doc, siblings]);
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

      {/* Why this rating — cited flags */}
      <ScoringExplanation score={score} />

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

/* -------------------------------------------------------------------------- */
/* Scoring explanation — shows exactly which cited thresholds were crossed.    */
/* -------------------------------------------------------------------------- */

const SEVERITY_BADGE: Record<FlagSeverity, { label: string; className: string }> = {
  normal:   { label: "Normal",   className: "bg-[hsl(var(--status-good))]/15 text-[hsl(var(--status-good))]" },
  mild:     { label: "Mild",     className: "bg-[hsl(var(--status-watch))]/15 text-[hsl(var(--status-watch))]" },
  moderate: { label: "Moderate", className: "bg-[hsl(var(--status-watch))]/25 text-[hsl(var(--status-watch))]" },
  severe:   { label: "Severe",   className: "bg-[hsl(var(--status-alert))]/15 text-[hsl(var(--status-alert))]" },
  critical: { label: "Critical", className: "bg-[hsl(var(--status-alert))]/25 text-[hsl(var(--status-alert))]" },
};

function ScoringExplanation({ score }: { score: ReturnType<typeof computeDocScore> }) {
  if (score.unscored) {
    return (
      <Card className="p-5 flex items-start gap-3">
        <Info className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
        <div className="text-sm text-muted-foreground">
          No numeric measurements were extracted from this report, so we can't score it against
          reference ranges. Your doctor is the best person to interpret the contents.
        </div>
      </Card>
    );
  }

  if (score.flags.length === 0) {
    return (
      <Card className="p-5 flex items-start gap-3">
        <Info className="h-4 w-4 mt-0.5 text-[hsl(var(--status-good))] shrink-0" />
        <div className="text-sm">
          <p className="font-medium">All measured values fall within published reference ranges.</p>
          <p className="text-muted-foreground mt-1">
            This is a rule check, not a diagnosis. Your doctor may still spot things the numbers don't.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Why this rating</h3>
        <span className="text-xs text-muted-foreground">Rule-based · cited thresholds</span>
      </div>

      <ul className="space-y-3">
        {score.flags.map((f) => {
          const badge = SEVERITY_BADGE[f.severity];
          const persistent = score.persistentMetrics.includes(f.key);
          return (
            <li key={f.key} className="border-l-2 pl-3 border-border">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{f.label}</span>
                <span className="text-sm tabular-nums">
                  {f.value}{f.unit && ` ${f.unit}`}
                </span>
                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", badge.className)}>
                  {badge.label}
                </Badge>
                {persistent && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
                    <TrendingUp className="h-3 w-3" /> Persistent (≥3 reports)
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {f.reason}. Normal range: {f.normalMin}–{f.normalMax}{f.unit && ` ${f.unit}`}.
              </p>
              <p className="text-[10px] text-muted-foreground/70 mt-0.5">Source: {f.citation}</p>
            </li>
          );
        })}
      </ul>

      <p className="text-[11px] text-muted-foreground leading-relaxed border-t pt-3">
        Ratings compare extracted numbers to published reference ranges (ADA, AHA/ACC, WHO, NCEP ATP III).
        A single out-of-range reading is marked <b>Monitor</b>. The same metric appearing out-of-range in
        3 recent reports is marked <b>Persistent</b>. Only life-threatening values are flagged
        <b> Needs Review</b> on their own. This is not medical advice — your doctor interprets the report.
      </p>
    </Card>
  );
}

