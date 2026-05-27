import { useEffect, useState } from "react";
import PublicLayout from "@/components/PublicLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, AlertTriangle, XCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";

type Check = { name: string; status: "operational" | "degraded" | "down" | "checking"; latencyMs?: number; detail?: string };
type Incident = {
  id: string;
  title: string;
  description: string | null;
  severity: string;
  status: string;
  affected_components: string[] | null;
  started_at: string;
  resolved_at: string | null;
};

const WINDOW_DAYS = 90;

async function pingApi(): Promise<Check> {
  const start = performance.now();
  try {
    const { error } = await supabase.from("status_incidents").select("id").limit(1);
    const latencyMs = Math.round(performance.now() - start);
    if (error) return { name: "API (Supabase Data)", status: "down", latencyMs, detail: error.message };
    return { name: "API (Supabase Data)", status: latencyMs > 1500 ? "degraded" : "operational", latencyMs };
  } catch (e: any) {
    return { name: "API (Supabase Data)", status: "down", detail: e?.message };
  }
}

async function pingAuth(): Promise<Check> {
  const start = performance.now();
  try {
    const { error } = await supabase.auth.getSession();
    const latencyMs = Math.round(performance.now() - start);
    if (error) return { name: "Authentication", status: "down", latencyMs, detail: error.message };
    return { name: "Authentication", status: latencyMs > 1500 ? "degraded" : "operational", latencyMs };
  } catch (e: any) {
    return { name: "Authentication", status: "down", detail: e?.message };
  }
}

async function pingWebApp(): Promise<Check> {
  const start = performance.now();
  try {
    const res = await fetch(window.location.origin + "/robots.txt", { cache: "no-store" });
    const latencyMs = Math.round(performance.now() - start);
    if (!res.ok) return { name: "Web App", status: "degraded", latencyMs, detail: `HTTP ${res.status}` };
    return { name: "Web App", status: latencyMs > 2000 ? "degraded" : "operational", latencyMs };
  } catch (e: any) {
    return { name: "Web App", status: "down", detail: e?.message };
  }
}

function StatusIcon({ status }: { status: Check["status"] }) {
  if (status === "operational") return <CheckCircle2 className="h-5 w-5 text-green-600" />;
  if (status === "degraded") return <AlertTriangle className="h-5 w-5 text-amber-500" />;
  if (status === "down") return <XCircle className="h-5 w-5 text-destructive" />;
  return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
}

function severityVariant(sev: string): "default" | "secondary" | "destructive" | "outline" {
  if (sev === "critical") return "destructive";
  if (sev === "major") return "destructive";
  if (sev === "minor") return "secondary";
  return "outline";
}

export default function Status() {
  const [checks, setChecks] = useState<Check[]>([
    { name: "Web App", status: "checking" },
    { name: "API (Supabase Data)", status: "checking" },
    { name: "Authentication", status: "checking" },
  ]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  useEffect(() => {
    const run = async () => {
      const [web, api, auth] = await Promise.all([pingWebApp(), pingApi(), pingAuth()]);
      setChecks([web, api, auth]);
      setLastChecked(new Date());
    };
    run();

    (async () => {
      const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("status_incidents")
        .select("*")
        .gte("started_at", since)
        .order("started_at", { ascending: false });
      setIncidents((data as Incident[]) || []);
      setLoading(false);
    })();
  }, []);

  // Compute real uptime from incident downtime over the window
  const now = Date.now();
  const windowStart = now - WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const windowMs = now - windowStart;
  const downtimeMs = incidents.reduce((sum, inc) => {
    if (inc.severity !== "major" && inc.severity !== "critical") return sum;
    const start = new Date(inc.started_at).getTime();
    const end = inc.resolved_at ? new Date(inc.resolved_at).getTime() : now;
    return sum + Math.max(0, Math.min(end, now) - Math.max(start, windowStart));
  }, 0);
  const uptimePct = ((windowMs - downtimeMs) / windowMs) * 100;

  const overall: Check["status"] = checks.some((c) => c.status === "down")
    ? "down"
    : checks.some((c) => c.status === "degraded")
    ? "degraded"
    : checks.every((c) => c.status === "operational")
    ? "operational"
    : "checking";

  const overallLabel =
    overall === "operational"
      ? "All systems operational"
      : overall === "degraded"
      ? "Some systems degraded"
      : overall === "down"
      ? "Service disruption detected"
      : "Checking systems…";

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-10 max-w-4xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">System Status</h1>
          <p className="text-muted-foreground mt-2">
            Live checks from your browser plus our public incident history. We don’t make uptime guarantees —
            this page shows what actually happened.
          </p>
        </header>

        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-lg">
              <StatusIcon status={overall} />
              {overallLabel}
            </CardTitle>
            {lastChecked && (
              <span className="text-xs text-muted-foreground">
                Checked {format(lastChecked, "PPpp")}
              </span>
            )}
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {checks.map((c) => (
              <div key={c.name} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <StatusIcon status={c.status} />
                  <div>
                    <div className="font-medium text-foreground">{c.name}</div>
                    {c.detail && <div className="text-xs text-muted-foreground">{c.detail}</div>}
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {c.status === "checking" ? "…" : c.latencyMs != null ? `${c.latencyMs} ms` : c.status}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Last {WINDOW_DAYS} days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-semibold text-foreground">{uptimePct.toFixed(2)}%</span>
              <span className="text-sm text-muted-foreground">
                observed uptime, based on {incidents.length} recorded incident{incidents.length === 1 ? "" : "s"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Calculated only from incidents we’ve logged here. Not an SLA.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Incident history</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading incidents…
              </div>
            ) : incidents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No incidents recorded in the last {WINDOW_DAYS} days.
              </p>
            ) : (
              <ul className="space-y-4">
                {incidents.map((inc) => (
                  <li key={inc.id} className="border border-border rounded-lg p-4">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-medium text-foreground">{inc.title}</span>
                      <Badge variant={severityVariant(inc.severity)}>{inc.severity}</Badge>
                      <Badge variant="outline">{inc.status}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mb-2">
                      Started {format(new Date(inc.started_at), "PPpp")}
                      {inc.resolved_at && <> · Resolved {format(new Date(inc.resolved_at), "PPpp")}</>}
                    </div>
                    {inc.description && (
                      <p className="text-sm text-muted-foreground">{inc.description}</p>
                    )}
                    {inc.affected_components && inc.affected_components.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {inc.affected_components.map((c) => (
                          <Badge key={c} variant="secondary" className="text-xs">
                            {c}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  );
}
