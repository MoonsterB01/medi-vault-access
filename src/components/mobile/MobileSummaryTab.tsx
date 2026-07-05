import { SimplePatientDashboard } from "@/components/patient/SimplePatientDashboard";
import { PatientSummary as PatientSummaryType } from "@/types/patient-summary";

interface MobileSummaryTabProps {
  summary: PatientSummaryType | null;
  isLoading: boolean;
  error: Error | null;
  documents?: any[];
  onRefresh?: () => Promise<void>;
}

export function MobileSummaryTab({ summary, isLoading, error, documents }: MobileSummaryTabProps) {
  return (
    <div className="animate-fade-in">
      <SimplePatientDashboard summary={summary} isLoading={isLoading} error={error} documents={documents} />
    </div>
  );
}
