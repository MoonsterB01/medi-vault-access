import { EnhancedDocumentSearch } from "@/components/EnhancedDocumentSearch";

interface MobileSearchTabProps {
  patientId: string;
}

export function MobileSearchTab({ patientId }: MobileSearchTabProps) {
  return (
    <div className="w-full">
      <EnhancedDocumentSearch patientId={patientId} />
    </div>
  );
}
