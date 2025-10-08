import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import DocumentUpload from "@/components/DocumentUpload";
import PublicLayout from "@/components/PublicLayout";

export default function PublicUpload() {
  const [searchParams] = useSearchParams();
  const shareableId = searchParams.get("id") || "";

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Secure Document Upload</CardTitle>
              <CardDescription>
                Upload medical documents using a patient's shareable ID. All uploads are encrypted and secure.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-primary mb-2">How it works:</h3>
                <ul className="text-sm text-foreground/80 space-y-1">
                  <li>• Enter the patient's shareable ID (provided by the patient)</li>
                  <li>• Select and upload the medical document</li>
                  <li>• Add relevant details and tags for easy searching</li>
                  <li>• The document will be securely stored in the patient's medical record</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <DocumentUpload 
            shareableId={shareableId}
            onUploadSuccess={() => {
              // Could add additional success handling here
            }}
          />

          <Card className="mt-6">
            <CardContent className="pt-6">
              <div className="text-center text-sm text-muted-foreground">
                <p className="mb-2">
                  <strong>Privacy & Security:</strong> All documents are encrypted and stored securely.
                </p>
                <p>
                  Only authorized family members and healthcare providers can access these documents.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PublicLayout>
  );
}