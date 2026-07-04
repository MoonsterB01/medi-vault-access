import { SimplePatientDashboard } from "@/components/patient/SimplePatientDashboard";
import { PatientSummary as PatientSummaryType } from "@/types/patient-summary";

interface MobileSummaryTabProps {
  summary: PatientSummaryType | null;
  isLoading: boolean;
  error: Error | null;
  onRefresh?: () => Promise<void>;
}

export function MobileSummaryTab({ summary, isLoading, error }: MobileSummaryTabProps) {
  return (
    <div className="animate-fade-in">
      <SimplePatientDashboard summary={summary} isLoading={isLoading} error={error} />
    </div>
  );
}