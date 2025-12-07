import PatientSummary from "@/components/PatientSummary";
import { PatientSummary as PatientSummaryType } from "@/types/patient-summary";

interface MobileSummaryTabProps {
  summary: PatientSummaryType | null;
  isLoading: boolean;
  error: Error | null;
  onRefresh?: () => Promise<void>;
}

export function MobileSummaryTab({ summary, isLoading, error, onRefresh }: MobileSummaryTabProps) {
  return (
    <div className="space-y-4">
      <PatientSummary 
        summary={summary} 
        isLoading={isLoading} 
        error={error}
        onRefresh={onRefresh}
      />
    </div>
  );
}
