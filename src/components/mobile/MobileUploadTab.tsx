import DocumentUpload from "@/components/DocumentUpload";

interface MobileUploadTabProps {
  onUploadSuccess: () => void;
  targetPatientId?: string;
  targetPatientName?: string;
  canUpload: boolean;
}

export function MobileUploadTab({ onUploadSuccess, targetPatientId, targetPatientName, canUpload }: MobileUploadTabProps) {
  return (
    <div className="w-full">
      <DocumentUpload
        onUploadSuccess={onUploadSuccess}
        targetPatientId={targetPatientId}
        targetPatientName={targetPatientName}
        canUpload={canUpload}
      />
    </div>
  );
}
