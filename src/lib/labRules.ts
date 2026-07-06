/**
 * Reference ranges for common lab/vital measurements.
 *
 * Sources cited per rule. Adult, non-pregnant defaults are used.
 * When sex-specific ranges differ, the combined tolerant range is used
 * and noted in `citation`. These are transparent, cited thresholds — not
 * a diagnostic tool. Doctor interpretation is still required.
 */

export type FlagSeverity = "normal" | "mild" | "moderate" | "severe" | "critical";

export interface RuleFlag {
  key: string;
  label: string;
  value: number;
  unit: string;
  normalMin: number;
  normalMax: number;
  severity: FlagSeverity;
  direction: "low" | "high" | "in-range";
  /** Human-readable reason like "≥ 126 mg/dL indicates diabetes" */
  reason: string;
  /** Short source string for transparency */
  citation: string;
}

export interface LabRule {
  key: string;
  label: string;
  unit: string;
  match: RegExp;
  normalMin: number;
  normalMax: number;
  /** Ordered thresholds — first match wins */
  bands: Array<{
    when: (v: number) => boolean;
    severity: FlagSeverity;
    direction: "low" | "high";
    reason: string;
  }>;
  citation: string;
}

/**
 * Parse a numeric value from a raw string. Handles BP like "120/80" (systolic).
 */
export function parseNumeric(raw: unknown): number | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  const bp = s.match(/^(\d{2,3})\s*\/\s*\d{2,3}/);
  if (bp) return parseFloat(bp[1]);
  const m = s.match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

export const LAB_RULES: LabRule[] = [
  {
    key: "systolic_bp",
    label: "Systolic BP",
    unit: "mmHg",
    match: /^bp$|blood pressure|systolic/i,
    normalMin: 90,
    normalMax: 119,
    citation: "ACC/AHA 2017 Hypertension Guideline",
    bands: [
      { when: v => v >= 180, severity: "critical", direction: "high", reason: "≥180 mmHg — hypertensive crisis" },
      { when: v => v >= 140, severity: "severe",   direction: "high", reason: "≥140 mmHg — Stage 2 hypertension" },
      { when: v => v >= 130, severity: "moderate", direction: "high", reason: "130–139 mmHg — Stage 1 hypertension" },
      { when: v => v >= 120, severity: "mild",     direction: "high", reason: "120–129 mmHg — elevated" },
      { when: v => v < 90,   severity: "moderate", direction: "low",  reason: "<90 mmHg — hypotension" },
    ],
  },
  {
    key: "fasting_glucose",
    label: "Fasting Glucose",
    unit: "mg/dL",
    match: /fasting.*(glucose|sugar)|fbs|fpg|\bfbg\b/i,
    normalMin: 70,
    normalMax: 99,
    citation: "American Diabetes Association (ADA) Standards of Care",
    bands: [
      { when: v => v >= 400 || v < 54, severity: "critical", direction: v => v >= 400 ? "high" : "low" as any, reason: "outside safe range" } as any,
      { when: v => v >= 126, severity: "severe",   direction: "high", reason: "≥126 mg/dL — diabetic range" },
      { when: v => v >= 100, severity: "mild",     direction: "high", reason: "100–125 mg/dL — prediabetic" },
      { when: v => v < 70,   severity: "moderate", direction: "low",  reason: "<70 mg/dL — hypoglycemia" },
    ],
  },
  {
    key: "random_glucose",
    label: "Blood Glucose",
    unit: "mg/dL",
    match: /^glucose$|blood sugar|random.*(glucose|sugar)|rbs/i,
    normalMin: 70,
    normalMax: 140,
    citation: "ADA — random plasma glucose reference",
    bands: [
      { when: v => v >= 400 || v < 54, severity: "critical", direction: "high", reason: "critical value" },
      { when: v => v >= 200, severity: "severe",   direction: "high", reason: "≥200 mg/dL — diabetic range" },
      { when: v => v >= 141, severity: "mild",     direction: "high", reason: "141–199 mg/dL — elevated" },
      { when: v => v < 70,   severity: "moderate", direction: "low",  reason: "<70 mg/dL — hypoglycemia" },
    ],
  },
  {
    key: "hba1c",
    label: "HbA1c",
    unit: "%",
    match: /hba1c|\ba1c\b|glycated/i,
    normalMin: 4.0,
    normalMax: 5.6,
    citation: "ADA Standards of Care",
    bands: [
      { when: v => v >= 9.0, severity: "severe",   direction: "high", reason: "≥9% — poor glycemic control" },
      { when: v => v >= 6.5, severity: "moderate", direction: "high", reason: "≥6.5% — diabetic range" },
      { when: v => v >= 5.7, severity: "mild",     direction: "high", reason: "5.7–6.4% — prediabetic" },
    ],
  },
  {
    key: "ldl",
    label: "LDL Cholesterol",
    unit: "mg/dL",
    match: /\bldl\b/i,
    normalMin: 0,
    normalMax: 99,
    citation: "NCEP ATP III / AHA lipid guidelines",
    bands: [
      { when: v => v >= 190, severity: "severe",   direction: "high", reason: "≥190 mg/dL — very high" },
      { when: v => v >= 160, severity: "moderate", direction: "high", reason: "160–189 mg/dL — high" },
      { when: v => v >= 130, severity: "mild",     direction: "high", reason: "130–159 mg/dL — borderline high" },
      { when: v => v >= 100, severity: "mild",     direction: "high", reason: "100–129 mg/dL — near optimal" },
    ],
  },
  {
    key: "hdl",
    label: "HDL Cholesterol",
    unit: "mg/dL",
    match: /\bhdl\b/i,
    normalMin: 40,
    normalMax: 100,
    citation: "NCEP ATP III (combined-sex threshold)",
    bands: [
      { when: v => v < 40, severity: "moderate", direction: "low", reason: "<40 mg/dL — low protective cholesterol" },
    ],
  },
  {
    key: "total_cholesterol",
    label: "Total Cholesterol",
    unit: "mg/dL",
    match: /total.*cholesterol|^cholesterol$|^chol$/i,
    normalMin: 125,
    normalMax: 199,
    citation: "NCEP ATP III",
    bands: [
      { when: v => v >= 240, severity: "moderate", direction: "high", reason: "≥240 mg/dL — high" },
      { when: v => v >= 200, severity: "mild",     direction: "high", reason: "200–239 mg/dL — borderline high" },
    ],
  },
  {
    key: "triglycerides",
    label: "Triglycerides",
    unit: "mg/dL",
    match: /triglycerid/i,
    normalMin: 0,
    normalMax: 149,
    citation: "NCEP ATP III",
    bands: [
      { when: v => v >= 500, severity: "severe",   direction: "high", reason: "≥500 mg/dL — very high" },
      { when: v => v >= 200, severity: "moderate", direction: "high", reason: "200–499 mg/dL — high" },
      { when: v => v >= 150, severity: "mild",     direction: "high", reason: "150–199 mg/dL — borderline high" },
    ],
  },
  {
    key: "hemoglobin",
    label: "Hemoglobin",
    unit: "g/dL",
    match: /hemoglobin|haemoglobin|\bhgb\b|\bhb\b/i,
    normalMin: 12.0,
    normalMax: 17.5,
    citation: "WHO — combined adult range (M 13.5–17.5, F 12.0–15.5)",
    bands: [
      { when: v => v < 8,    severity: "severe",   direction: "low",  reason: "<8 g/dL — severe anemia" },
      { when: v => v < 10,   severity: "moderate", direction: "low",  reason: "8–10 g/dL — moderate anemia" },
      { when: v => v < 12,   severity: "mild",     direction: "low",  reason: "<12 g/dL — mild anemia" },
      { when: v => v > 17.5, severity: "mild",     direction: "high", reason: ">17.5 g/dL — polycythemia" },
    ],
  },
  {
    key: "heart_rate",
    label: "Heart Rate",
    unit: "bpm",
    match: /heart rate|resting.*(pulse|hr)|^pulse$|^hr$/i,
    normalMin: 60,
    normalMax: 100,
    citation: "AHA — resting heart rate",
    bands: [
      { when: v => v > 150, severity: "critical", direction: "high", reason: ">150 bpm — severe tachycardia" },
      { when: v => v < 40,  severity: "critical", direction: "low",  reason: "<40 bpm — severe bradycardia" },
      { when: v => v > 120, severity: "severe",   direction: "high", reason: ">120 bpm — tachycardia" },
      { when: v => v < 50,  severity: "moderate", direction: "low",  reason: "<50 bpm — bradycardia" },
      { when: v => v > 100, severity: "mild",     direction: "high", reason: "101–120 bpm — elevated" },
    ],
  },
  {
    key: "bmi",
    label: "BMI",
    unit: "",
    match: /\bbmi\b/i,
    normalMin: 18.5,
    normalMax: 24.9,
    citation: "WHO BMI classification",
    bands: [
      { when: v => v >= 40,   severity: "severe",   direction: "high", reason: "≥40 — Class III obesity" },
      { when: v => v >= 30,   severity: "moderate", direction: "high", reason: "30–39.9 — obesity" },
      { when: v => v >= 25,   severity: "mild",     direction: "high", reason: "25–29.9 — overweight" },
      { when: v => v < 16,    severity: "severe",   direction: "low",  reason: "<16 — severe underweight" },
      { when: v => v < 18.5,  severity: "mild",     direction: "low",  reason: "<18.5 — underweight" },
    ],
  },
  {
    key: "creatinine",
    label: "Creatinine",
    unit: "mg/dL",
    match: /creatinine/i,
    normalMin: 0.6,
    normalMax: 1.3,
    citation: "Combined adult reference (M 0.7–1.3, F 0.6–1.1)",
    bands: [
      { when: v => v > 2.0, severity: "severe",   direction: "high", reason: ">2.0 mg/dL — significant renal impairment" },
      { when: v => v > 1.3, severity: "moderate", direction: "high", reason: ">1.3 mg/dL — elevated" },
    ],
  },
  {
    key: "tsh",
    label: "TSH",
    unit: "mIU/L",
    match: /\btsh\b|thyroid stimulating/i,
    normalMin: 0.4,
    normalMax: 4.0,
    citation: "American Thyroid Association reference range",
    bands: [
      { when: v => v > 10,   severity: "moderate", direction: "high", reason: ">10 mIU/L — overt hypothyroidism likely" },
      { when: v => v > 4.0,  severity: "mild",     direction: "high", reason: ">4.0 mIU/L — subclinical hypothyroidism" },
      { when: v => v < 0.1,  severity: "moderate", direction: "low",  reason: "<0.1 mIU/L — overt hyperthyroidism likely" },
      { when: v => v < 0.4,  severity: "mild",     direction: "low",  reason: "<0.4 mIU/L — subclinical hyperthyroidism" },
    ],
  },
];

/**
 * Evaluate a single (test, value) pair against all rules.
 * Returns null if no rule matches or value is un-parseable.
 */
export function evaluate(testName: string, rawValue: unknown): RuleFlag | null {
  const v = parseNumeric(rawValue);
  if (v == null || Number.isNaN(v)) return null;
  const rule = LAB_RULES.find(r => r.match.test(testName));
  if (!rule) return null;

  for (const band of rule.bands) {
    if (band.when(v)) {
      return {
        key: rule.key,
        label: rule.label,
        value: v,
        unit: rule.unit,
        normalMin: rule.normalMin,
        normalMax: rule.normalMax,
        severity: band.severity,
        direction: band.direction,
        reason: band.reason,
        citation: rule.citation,
      };
    }
  }

  return {
    key: rule.key,
    label: rule.label,
    value: v,
    unit: rule.unit,
    normalMin: rule.normalMin,
    normalMax: rule.normalMax,
    severity: "normal",
    direction: "in-range",
    reason: `Within ${rule.normalMin}–${rule.normalMax} ${rule.unit}`.trim(),
    citation: rule.citation,
  };
}

/**
 * Pull (test, value) pairs from a document's `extracted_entities` JSON.
 * Tolerates several shapes: labs / tests / vitals / measurements arrays
 * with items like { test|name|label, value|result }.
 */
export function extractPairs(doc: any): { test: string; value: unknown }[] {
  const out: { test: string; value: unknown }[] = [];
  const entities = doc?.extracted_entities;
  if (!entities || typeof entities !== "object") return out;

  const buckets = [entities.labs, entities.tests, entities.vitals, entities.measurements, entities.results];
  for (const arr of buckets) {
    if (!Array.isArray(arr)) continue;
    for (const item of arr) {
      if (!item || typeof item !== "object") continue;
      const test = item.test || item.name || item.label || item.parameter;
      const value = item.value ?? item.result ?? item.reading;
      if (test && value != null) out.push({ test: String(test), value });
    }
  }
  return out;
}

/**
 * Evaluate every extractable measurement in a document.
 * Only returns non-normal flags (normal readings are filtered out).
 */
export function evaluateDocument(doc: any): RuleFlag[] {
  const pairs = extractPairs(doc);
  const flags: RuleFlag[] = [];
  const seen = new Set<string>();
  for (const { test, value } of pairs) {
    const flag = evaluate(test, value);
    if (!flag) continue;
    if (seen.has(flag.key)) continue;
    seen.add(flag.key);
    if (flag.severity !== "normal") flags.push(flag);
  }
  return flags;
}
