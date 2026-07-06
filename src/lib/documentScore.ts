import { FileText, FlaskConical, Pill, Scan, Stethoscope, HeartPulse, Syringe } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { evaluateDocument, type FlagSeverity, type RuleFlag } from "./labRules";

export type DocStatus = "good" | "watch" | "alert" | "unknown";

export interface DocScore {
  score: number;
  status: DocStatus;
  label: string;
  /** Individual rule flags that shaped the score (empty when normal) */
  flags: RuleFlag[];
  /** Metric keys that recur across the trend window */
  persistentMetrics: string[];
  /** How many documents were considered for trend context */
  trendWindow: number;
  /** True if this document has no extractable numeric measurements at all */
  unscored: boolean;
}

/** Trend window: a metric flagged in ≥ TREND_THRESHOLD of the last TREND_WINDOW docs escalates. */
const TREND_WINDOW = 3;
const TREND_THRESHOLD = 3;

const SEVERITY_PENALTY: Record<FlagSeverity, number> = {
  normal: 0,
  mild: 5,
  moderate: 12,
  severe: 22,
  critical: 40,
};

const SEVERITY_RANK: Record<FlagSeverity, number> = {
  normal: 0, mild: 1, moderate: 2, severe: 3, critical: 4,
};

/**
 * Compute a per-document score using **cited rule-based thresholds** only.
 *
 * `siblings`: other documents belonging to the same patient. Used to detect
 * a "trend" — the same metric flagged in ≥3 of the most recent 3 documents
 * (including this one) escalates the status one step.
 *
 * Status mapping:
 *   - No numeric findings extractable → "unknown" (we can't judge)
 *   - No flags                         → "good"    ("Looks Normal")
 *   - Any critical flag                → "alert"   ("Needs Review")
 *   - Any severe flag + trend          → "alert"
 *   - Any severe flag alone            → "watch"   ("Monitor")
 *   - Any mild/moderate flag + trend   → "watch"   ("Persistent — Monitor")
 *   - Any mild/moderate flag alone     → "watch"   ("New reading — Monitor")
 *
 * We never say "See a Doctor" — that's the doctor's call. We only surface
 * which measurements crossed which cited threshold.
 */
export function computeDocScore(doc: any, siblings: any[] = []): DocScore {
  if (!doc) {
    return { score: 0, status: "unknown", label: "Not analyzed", flags: [], persistentMetrics: [], trendWindow: 0, unscored: true };
  }

  const flags = evaluateDocument(doc);
  const pairsCount = (doc.extracted_entities && typeof doc.extracted_entities === "object")
    ? Object.values(doc.extracted_entities).filter(Array.isArray).reduce((s, a: any) => s + a.length, 0)
    : 0;

  // Nothing numeric to score against.
  if (pairsCount === 0) {
    return { score: 0, status: "unknown", label: "Not analyzed", flags: [], persistentMetrics: [], trendWindow: 0, unscored: true };
  }

  // Base score = 100 minus penalties per flag.
  const penalty = flags.reduce((s, f) => s + SEVERITY_PENALTY[f.severity], 0);
  const score = Math.max(0, Math.min(100, 100 - penalty));

  // Trend detection: look at the most recent TREND_WINDOW-1 siblings + this doc.
  const trendPool = [doc, ...[...siblings]
    .filter(d => d && d.id !== doc.id)
    .sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime())
    .slice(0, TREND_WINDOW - 1)];

  const metricCounts = new Map<string, number>();
  for (const d of trendPool) {
    const dFlags = d === doc ? flags : evaluateDocument(d);
    const seen = new Set<string>();
    for (const f of dFlags) {
      if (seen.has(f.key)) continue;
      seen.add(f.key);
      metricCounts.set(f.key, (metricCounts.get(f.key) ?? 0) + 1);
    }
  }
  const persistentMetrics = [...metricCounts.entries()]
    .filter(([, n]) => n >= TREND_THRESHOLD)
    .map(([k]) => k);
  const hasTrend = persistentMetrics.length > 0;

  // Determine status.
  let status: DocStatus = "good";
  let label = "Looks Normal";

  if (flags.length === 0) {
    status = "good";
    label = "Looks Normal";
  } else {
    const worst = flags.reduce<FlagSeverity>(
      (w, f) => (SEVERITY_RANK[f.severity] > SEVERITY_RANK[w] ? f.severity : w),
      "normal"
    );

    if (worst === "critical") {
      status = "alert";
      label = "Needs Review";
    } else if (worst === "severe") {
      status = hasTrend ? "alert" : "watch";
      label = hasTrend ? "Persistent — Needs Review" : "Monitor";
    } else {
      // mild / moderate only
      status = "watch";
      label = hasTrend ? "Persistent — Monitor" : "New reading — Monitor";
    }
  }

  return {
    score,
    status,
    label,
    flags,
    persistentMetrics,
    trendWindow: trendPool.length,
    unscored: false,
  };
}

export function getDocTypeMeta(type?: string): { icon: LucideIcon; label: string } {
  const t = (type || "").toLowerCase();
  if (t.includes("prescription")) return { icon: Pill, label: "Prescription" };
  if (t.includes("lab") || t.includes("blood") || t.includes("test")) return { icon: FlaskConical, label: "Lab Report" };
  if (t.includes("scan") || t.includes("xray") || t.includes("mri") || t.includes("ct") || t.includes("radio")) return { icon: Scan, label: "Scan" };
  if (t.includes("vaccin") || t.includes("immun")) return { icon: Syringe, label: "Vaccination" };
  if (t.includes("ecg") || t.includes("cardio")) return { icon: HeartPulse, label: "Cardiac" };
  if (t.includes("consult") || t.includes("visit") || t.includes("discharge")) return { icon: Stethoscope, label: "Visit Note" };
  return { icon: FileText, label: "Report" };
}

export function formatRelativeDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const day = 1000 * 60 * 60 * 24;
  const days = Math.floor(diffMs / day);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export function categoryOf(doc: any): "lab" | "prescription" | "scan" | "other" {
  const t = (doc?.document_type || "").toLowerCase();
  if (t.includes("prescription")) return "prescription";
  if (t.includes("lab") || t.includes("blood") || t.includes("test")) return "lab";
  if (t.includes("scan") || t.includes("xray") || t.includes("mri") || t.includes("ct") || t.includes("radio")) return "scan";
  return "other";
}
