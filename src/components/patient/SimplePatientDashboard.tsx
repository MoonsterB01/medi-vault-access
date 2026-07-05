import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, ChevronRight } from "lucide-react";
import type { PatientSummary } from "@/types/patient-summary";
import {
  computeHealthScore,
  deriveMetrics,
  deriveRegions,
  readPreviousScore,
  readTrend,
  writeCurrentScore,
} from "@/lib/healthScore";
import { HealthScoreCard } from "./HealthScoreCard";
import { KeyMetricsBars } from "./KeyMetricsBars";
import { BodyHeatmap } from "./BodyHeatmap";
import { RecentReportsStrip } from "./RecentReportsStrip";

interface Props {
  summary: PatientSummary | null;
  isLoading: boolean;
  error: Error | null;
  documents?: any[];
}

export function SimplePatientDashboard({ summary, isLoading, error, documents = [] }: Props) {
  const metrics = useMemo(() => deriveMetrics(summary), [summary]);
  const score = useMemo(() => computeHealthScore(summary, metrics), [summary, metrics]);
  const regions = useMemo(() => deriveRegions(summary), [summary]);

  const patientId = summary?.patientId;
  const trend = useMemo(() => {
    if (!patientId || score.status === "unknown") return null;
    return readTrend(patientId, score.score);
  }, [patientId, score.score, score.status]);

  useEffect(() => {
    if (patientId && score.status !== "unknown") {
      writeCurrentScore(patientId, score.score);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, score.score]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-80 w-full rounded-lg" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Couldn't load your health summary</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  const documentCount = summary?.sources?.documentCount ?? 0;

  return (
    <div className="space-y-6">
      <HealthScoreCard
        score={score.score}
        status={score.status}
        label={score.label}
        trend={trend}
        documentCount={documentCount}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <KeyMetricsBars metrics={metrics} />
        <BodyHeatmap regions={regions} />
      </div>

      <RecentReportsStrip documents={documents} />


      <div className="flex justify-center pt-2">
        <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
          <Link to="/dashboard/details">
            See full details <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
