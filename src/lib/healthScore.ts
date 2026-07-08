import type { PatientSummary } from "@/types/patient-summary";
import { extractPairs, evaluate } from "./labRules";
import { computeDocScore } from "./documentScore";



export type MetricStatus = "low" | "good" | "watch" | "high" | "unknown";

export interface MetricRow {
  key: string;
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  /** Healthy band within [min, max] */
  healthyMin: number;
  healthyMax: number;
  status: MetricStatus;
}

export type BodyRegion =
  | "head"
  | "heart"
  | "lungs"
  | "stomach"
  | "liver"
  | "kidneys"
  | "joints";

export type RegionStatus = "good" | "watch" | "alert" | "unknown";

const RANGES: Record<
  string,
  { label: string; unit: string; min: number; max: number; hMin: number; hMax: number; match: RegExp }
> = {
  systolic: { label: "Blood Pressure", unit: "mmHg", min: 80, max: 200, hMin: 90, hMax: 130, match: /systolic|^bp$|blood pressure/i },
  glucose: { label: "Blood Sugar", unit: "mg/dL", min: 50, max: 300, hMin: 70, hMax: 110, match: /glucose|blood sugar|fasting sugar|fbs/i },
  hba1c: { label: "HbA1c", unit: "%", min: 4, max: 14, hMin: 4, hMax: 5.7, match: /hba1c|a1c/i },
  cholesterol: { label: "Cholesterol", unit: "mg/dL", min: 100, max: 350, hMin: 125, hMax: 200, match: /cholesterol|^chol/i },
  ldl: { label: "LDL", unit: "mg/dL", min: 30, max: 250, hMin: 40, hMax: 100, match: /ldl/i },
  hdl: { label: "HDL", unit: "mg/dL", min: 20, max: 120, hMin: 40, hMax: 90, match: /hdl/i },
  hemoglobin: { label: "Hemoglobin", unit: "g/dL", min: 5, max: 20, hMin: 12, hMax: 17, match: /hemoglobin|hgb|hb\b/i },
  bmi: { label: "BMI", unit: "", min: 12, max: 45, hMin: 18.5, hMax: 24.9, match: /bmi/i },
  heartRate: { label: "Heart Rate", unit: "bpm", min: 40, max: 160, hMin: 60, hMax: 100, match: /heart rate|pulse|hr\b/i },
};

const PARSE_BP = /(\d{2,3})\s*\/\s*\d{2,3}/;

function parseValue(raw: string): number | null {
  if (!raw) return null;
  const bp = raw.match(PARSE_BP);
  if (bp) return parseFloat(bp[1]);
  const m = raw.match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

function statusFor(v: number, hMin: number, hMax: number): MetricStatus {
  const span = hMax - hMin;
  const lowEdge = hMin - span * 0.15;
  const highEdge = hMax + span * 0.15;
  if (v < lowEdge) return "low";
  if (v > highEdge) return "high";
  if (v < hMin || v > hMax) return "watch";
  return "good";
}

export function deriveMetrics(summary: PatientSummary | null): MetricRow[] {
  if (!summary?.labs?.latest?.length) return [];
  const rows: MetricRow[] = [];
  const seen = new Set<string>();
  for (const lab of summary.labs.latest) {
    for (const [key, cfg] of Object.entries(RANGES)) {
      if (seen.has(key)) continue;
      if (!cfg.match.test(lab.test)) continue;
      const v = parseValue(lab.value);
      if (v == null || Number.isNaN(v)) continue;
      seen.add(key);
      rows.push({
        key,
        label: cfg.label,
        value: v,
        unit: cfg.unit,
        min: cfg.min,
        max: cfg.max,
        healthyMin: cfg.hMin,
        healthyMax: cfg.hMax,
        status: statusFor(v, cfg.hMin, cfg.hMax),
      });
      break;
    }
  }
  return rows.slice(0, 6);
}

export function computeHealthScore(
  summary: PatientSummary | null,
  metrics: MetricRow[]
): { score: number; status: "good" | "watch" | "alert" | "unknown"; label: string } {
  const hasDocs = (summary?.sources?.documentCount ?? 0) > 0;
  if (!hasDocs) return { score: 0, status: "unknown", label: "Awaiting Reports" };

  let score: number;
  if (metrics.length > 0) {
    const weights: Record<MetricStatus, number> = { good: 1, watch: 0.55, low: 0.25, high: 0.25, unknown: 0.5 };
    const avg = metrics.reduce((s, m) => s + weights[m.status], 0) / metrics.length;
    score = Math.round(avg * 100);
  } else {
    const conf = summary?.aiSummary?.confidence ?? 0.6;
    const critical = (summary?.alerts ?? []).filter(a => a.level === "critical").length;
    const warning = (summary?.alerts ?? []).filter(a => a.level === "warning").length;
    score = Math.round(Math.max(0, conf * 100 - critical * 20 - warning * 8));
  }

  score = Math.max(0, Math.min(100, score));
  if (score >= 75) return { score, status: "good", label: "Looks Normal" };
  if (score >= 50) return { score, status: "watch", label: "Monitor" };
  return { score, status: "alert", label: "Needs Review" };
}

/** localStorage-backed previous score for trend */
export function readPreviousScore(patientId: string): number | null {
  try {
    const raw = localStorage.getItem(`health-score:${patientId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return typeof parsed?.score === "number" ? parsed.score : null;
  } catch {
    return null;
  }
}

export function writeCurrentScore(patientId: string, score: number) {
  try {
    const key = `health-score:${patientId}`;
    const raw = localStorage.getItem(key);
    const prev = raw ? JSON.parse(raw) : null;
    // Only roll previous forward if it's from a different day
    const today = new Date().toISOString().slice(0, 10);
    if (prev && prev.date !== today) {
      localStorage.setItem(`health-score:${patientId}:prev`, JSON.stringify(prev));
    }
    localStorage.setItem(key, JSON.stringify({ score, date: today }));
  } catch {
    /* ignore */
  }
}

export function readTrend(patientId: string, currentScore: number): number | null {
  try {
    const raw = localStorage.getItem(`health-score:${patientId}:prev`);
    if (!raw) return null;
    const prev = JSON.parse(raw);
    if (typeof prev?.score !== "number") return null;
    return currentScore - prev.score;
  } catch {
    return null;
  }
}

const REGION_KEYWORDS: Record<BodyRegion, RegExp> = {
  head: /migraine|headache|neuro|brain|vertigo|seizure/i,
  heart: /cardiac|heart|hypertension|blood pressure|cholesterol|arrhythmia|angina/i,
  lungs: /asthma|copd|lung|pulmonary|bronch|respirat/i,
  stomach: /gastr|ulcer|ibs|acid|reflux|abdominal|stomach/i,
  liver: /liver|hepat|jaundice|alt|ast/i,
  kidneys: /kidney|renal|creatinine|nephr|urine/i,
  joints: /arthritis|joint|knee|shoulder|back pain|spine|orthop/i,
};

export function deriveRegions(summary: PatientSummary | null): Record<BodyRegion, RegionStatus> {
  const out: Record<BodyRegion, RegionStatus> = {
    head: "unknown", heart: "unknown", lungs: "unknown",
    stomach: "unknown", liver: "unknown", kidneys: "unknown", joints: "unknown",
  };
  if (!summary) return out;

  const active = (summary.diagnoses ?? []).filter(d => !d.hiddenByUser && d.status !== "resolved");
  for (const dx of active) {
    for (const [region, re] of Object.entries(REGION_KEYWORDS) as [BodyRegion, RegExp][]) {
      if (!re.test(dx.name)) continue;
      const isSevere = /severe|critical|acute/i.test(dx.severity) || dx.status === "active";
      const next: RegionStatus = isSevere ? "alert" : "watch";
      const rank = { unknown: 0, good: 1, watch: 2, alert: 3 } as const;
      if (rank[next] > rank[out[region]]) out[region] = next;
    }
  }

  for (const alert of summary.alerts ?? []) {
    for (const [region, re] of Object.entries(REGION_KEYWORDS) as [BodyRegion, RegExp][]) {
      if (!re.test(alert.message)) continue;
      const next: RegionStatus = alert.level === "critical" ? "alert" : alert.level === "warning" ? "watch" : "good";
      const rank = { unknown: 0, good: 1, watch: 2, alert: 3 } as const;
      if (rank[next] > rank[out[region]]) out[region] = next;
    }
  }

  // If we have documents but no signal for a region, mark as good (no findings)
  if ((summary.sources?.documentCount ?? 0) > 0) {
    for (const r of Object.keys(out) as BodyRegion[]) {
      if (out[r] === "unknown") out[r] = "good";
    }
  }

  return out;
}

export const REGION_LABEL: Record<BodyRegion, string> = {
  head: "Head",
  heart: "Heart",
  lungs: "Lungs",
  stomach: "Stomach",
  liver: "Liver",
  kidneys: "Kidneys",
  joints: "Joints",
};

export const STATUS_TEXT: Record<RegionStatus, string> = {
  good: "Looks normal",
  watch: "Monitor",
  alert: "Needs review",
  unknown: "No data yet",
};
