import { FileText, FlaskConical, Pill, Scan, Stethoscope, HeartPulse, Syringe } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type DocStatus = "good" | "watch" | "alert" | "unknown";

export interface DocScore {
  score: number;
  status: DocStatus;
  label: string;
}

/**
 * Compute a per-document health signal.
 * Uses signals actually available on the documents row without new backend calls:
 * - content_confidence: how well we understood the doc
 * - medical_keyword_count: richness of medical info
 * - verification_status: cleared as medical or not
 * - alert-like tokens found inside ai_summary text (abnormal / high / low / positive)
 */
export function computeDocScore(doc: any): DocScore {
  if (!doc) return { score: 0, status: "unknown", label: "Not analyzed" };

  const summary = String(doc.ai_summary ?? "").toLowerCase();
  const hasSummary = summary.length > 0;
  const conf = typeof doc.content_confidence === "number" ? doc.content_confidence : 0;
  const kw = typeof doc.medical_keyword_count === "number" ? doc.medical_keyword_count : 0;

  if (!hasSummary && conf === 0 && kw === 0) {
    return { score: 0, status: "unknown", label: "Not analyzed" };
  }

  // Base score
  let score = 55 + Math.round(conf * 35) + Math.min(10, Math.round(kw / 3));

  // Penalties for concerning findings in the AI summary
  const abnormalHits = (summary.match(/\b(abnormal|elevated|high|low|deficien|positive|critical|urgent|severe)\b/g) || []).length;
  const reassuringHits = (summary.match(/\b(normal|within range|healthy|stable|no significant|negative)\b/g) || []).length;

  score -= abnormalHits * 8;
  score += reassuringHits * 3;

  if (doc.verification_status === "not_medical") score -= 40;

  score = Math.max(0, Math.min(100, score));

  if (score >= 75) return { score, status: "good", label: "Looks Good" };
  if (score >= 50) return { score, status: "watch", label: "Watch" };
  return { score, status: "alert", label: "See Doctor" };
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
