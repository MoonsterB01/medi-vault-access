import { AlertTriangle, Droplet, FileText, HeartPulse, Phone, Pill, Printer, Stethoscope, User } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { PatientSummary } from "@/types/patient-summary";

interface HealthPassportProps {
  patient: any;
  summary: PatientSummary | null;
  isLoading?: boolean;
}

const IST: Intl.DateTimeFormatOptions = { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" };
const fmt = (d?: string) => {
  if (!d) return "—";
  const date = new Date(d);
  return isNaN(date.getTime()) ? d : date.toLocaleDateString("en-IN", IST);
};

export function ageFromDob(dob?: string): number | null {
  if (!dob) return null;
  const b = new Date(dob);
  if (isNaN(b.getTime())) return null;
  const n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
  return a;
}

function toList(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
}

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <section className="break-inside-avoid">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
        {title}
      </h3>
      {children}
    </section>
  );
}

const Empty = ({ text }: { text: string }) => <p className="text-sm text-muted-foreground">{text}</p>;

export function HealthPassport({ patient, summary, isLoading }: HealthPassportProps) {
  if (isLoading && !patient) {
    return <Skeleton className="h-96 w-full" />;
  }
  if (!patient) return <Empty text="Patient details are not available yet." />;

  const allergies = toList(patient.allergies);
  const age = ageFromDob(patient.dob);
  const emergency = patient.emergency_contact as { name?: string; phone?: string; relation?: string } | null;

  // Only conditions the analyser classified as confirmed diagnoses, and not hidden by the user.
  const conditions = (summary?.diagnoses ?? []).filter(
    (d) => !d.hiddenByUser && d.status !== "resolved" && (!d.classification || d.classification === "confirmed_diagnosis"),
  );
  const medications = (summary?.medications ?? []).filter((m) => !m.hiddenByUser && m.status === "active");
  const labs = (summary?.labs?.latest ?? []).slice(0, 6);

  return (
    <Card className="print:border-0 print:shadow-none">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <CardTitle className="text-xl">Health Passport</CardTitle>
          <CardDescription>A one-page summary to show your doctor. Generated from your saved records.</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()} className="shrink-0 print:hidden">
          <Printer className="mr-2 h-4 w-4" /> Print / Save PDF
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 rounded-lg border bg-muted/40 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground"><User className="mr-1 inline h-3 w-3" />Name</p>
            <p className="break-words font-semibold">{patient.name}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Age / Gender</p>
            <p className="font-semibold">{age !== null ? `${age} yrs` : "—"} · {patient.gender || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground"><Droplet className="mr-1 inline h-3 w-3" />Blood group</p>
            <p className="font-semibold">{patient.blood_group || "Not added"}</p>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground"><Phone className="mr-1 inline h-3 w-3" />Emergency contact</p>
            <p className="break-words font-semibold">
              {emergency?.name || emergency?.phone ? `${emergency?.name ?? ""} ${emergency?.phone ?? ""}`.trim() : "Not added"}
            </p>
          </div>
        </div>

        <Section icon={AlertTriangle} title="Allergies">
          {allergies.length ? (
            <div className="flex flex-wrap gap-2">
              {allergies.map((a) => <Badge key={a} variant="destructive">{a}</Badge>)}
            </div>
          ) : <Empty text="No allergies recorded. Add them from your profile." />}
        </Section>

        <div className="grid gap-6 md:grid-cols-2">
          <Section icon={Pill} title="Ongoing medications">
            {medications.length ? (
              <ul className="divide-y rounded-lg border">
                {medications.map((m) => (
                  <li key={m.id} className="p-3 text-sm">
                    <p className="break-words font-medium">{m.name}</p>
                    <p className="text-muted-foreground">{[m.dose, m.frequency].filter(Boolean).join(" · ") || "Dose not found in records"}</p>
                    {m.startDate && <p className="text-xs text-muted-foreground">Since {fmt(m.startDate)}</p>}
                  </li>
                ))}
              </ul>
            ) : <Empty text="No ongoing medications found in your records." />}
          </Section>

          <Section icon={Stethoscope} title="Chronic / ongoing conditions">
            {conditions.length ? (
              <ul className="divide-y rounded-lg border">
                {conditions.map((d) => (
                  <li key={d.id} className="p-3 text-sm">
                    <p className="break-words font-medium">{d.name}</p>
                    <p className="text-muted-foreground">First noted {fmt(d.firstSeen)} · Last seen {fmt(d.lastSeen)}</p>
                  </li>
                ))}
              </ul>
            ) : <Empty text="No confirmed conditions found in your records." />}
          </Section>
        </div>

        <Section icon={HeartPulse} title="Recent test results">
          {labs.length ? (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                  <tr><th className="p-2">Test</th><th className="p-2">Value</th><th className="p-2">Date</th></tr>
                </thead>
                <tbody>
                  {labs.map((l, i) => (
                    <tr key={`${l.test}-${i}`} className="border-t">
                      <td className="break-words p-2">{l.test}</td><td className="p-2">{l.value}</td><td className="whitespace-nowrap p-2">{fmt(l.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <Empty text="No test results extracted yet." />}
        </Section>

        <p className="flex items-start gap-2 border-t pt-4 text-xs text-muted-foreground">
          <FileText className="mt-0.5 h-3 w-3 shrink-0" />
          Compiled automatically from {summary?.sources?.documentCount ?? 0} uploaded document(s). It may be incomplete — please confirm details with your doctor. This is not a diagnosis.
        </p>
      </CardContent>
    </Card>
  );
}
