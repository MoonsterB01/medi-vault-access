import DocumentUpload from "@/components/DocumentUpload";

interface MobileUploadTabProps {
  onUploadSuccess: () => void;
}

export function MobileUploadTab({ onUploadSuccess }: MobileUploadTabProps) {
  return (
    <div className="w-full">
      <DocumentUpload onUploadSuccess={onUploadSuccess} />
    </div>
  );
}
