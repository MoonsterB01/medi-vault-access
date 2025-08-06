import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSearchParams } from "react-router-dom";
import DocumentUpload from "@/components/DocumentUpload";
import { Upload } from "lucide-react";

export default function PublicUpload() {
  const [searchParams] = useSearchParams();
  const shareableId = searchParams.get("id") || "";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Upload className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold">Medical Document Upload</h1>
              <p className="text-gray-600">Upload medical documents securely</p>
            </div>
          </div>
        </div>
      </header>

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
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-blue-900 mb-2">How it works:</h3>
                <ul className="text-sm text-blue-800 space-y-1">
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
              <div className="text-center text-sm text-gray-600">
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
    </div>
  );
}