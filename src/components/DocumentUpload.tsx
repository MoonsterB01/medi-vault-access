import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ProfileSelector from "@/components/ProfileSelector";
import { DocumentScanner } from "@/components/DocumentScanner";

interface DocumentUploadProps {
  shareableId?: string;
  onUploadSuccess?: () => void;
}

export default function DocumentUpload({ shareableId: propShareableId, onUploadSuccess }: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [shareableId, setShareableId] = useState(propShareableId || "");
  const [selectedPatientName, setSelectedPatientName] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const { toast } = useToast();

  // Keep input in sync if parent provides/updates shareableId
  useEffect(() => {
    setShareableId(propShareableId || "");
  }, [propShareableId]);

  const handleProfileChange = (newShareableId: string, patientName: string) => {
    setShareableId(newShareableId);
    setSelectedPatientName(patientName);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Check file size (10MB limit)
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a file smaller than 10MB",
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleScanComplete = (scannedFile: File) => {
    setFile(scannedFile);
    setDocumentType("other"); // Default type for scanned documents
    toast({
      title: "Document Scanned",
      description: "Your scanned document is ready for upload",
    });
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // Remove data:type;base64, prefix
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file || !documentType || !shareableId) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields and select a file",
        variant: "destructive",
      });
      return;
    }

    // Normalize and validate shareable ID (accept MED-XXXXXXXX or USER-XXXXXXXX)
    const normalizedId = shareableId.trim().toUpperCase();
    const isValidMedId = /^MED-[A-Z0-9]{8}$/.test(normalizedId);
    const isValidUserId = /^USER-[A-Z0-9]{8}$/.test(normalizedId);
    if (!isValidMedId && !isValidUserId) {
      toast({
        title: "Invalid shareable ID",
        description: "Enter a valid MED-XXXXXXXX or USER-XXXXXXXX ID.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      // Get current user session for authenticated request
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Authentication Required",
          description: "Please log in to upload documents",
          variant: "destructive",
        });
        return;
      }

      const fileContent = await convertFileToBase64(file);
      const tagsArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag);

      const { data, error } = await supabase.functions.invoke('upload-document', {
        body: {
          shareableId: normalizedId,
          file: {
            name: file.name,
            content: fileContent,
            type: file.type,
            size: file.size,
          },
          documentType,
          description: description || undefined,
          tags: tagsArray.length > 0 ? tagsArray : undefined,
        },
      });

      if (error) {
        throw new Error(error.message || 'Upload failed');
      }

      toast({
        title: "Upload Successful!",
        description: data?.message || "Document uploaded successfully",
      });
      
      // Reset form
      setFile(null);
      setDocumentType("");
      setDescription("");
      setTags("");
      if (!propShareableId) setShareableId("");
      
      // Reset file input
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      onUploadSuccess?.();
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Profile Selector for family members */}
      {!propShareableId && (
        <ProfileSelector 
          onProfileChange={handleProfileChange}
          selectedShareableId={shareableId}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Medical Document
            {selectedPatientName && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                → {selectedPatientName}
              </span>
            )}
          </CardTitle>
          <CardDescription>
            Upload documents using a patient's shareable ID
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="space-y-4">
            {!propShareableId && !shareableId && (
              <div className="space-y-2">
                <Label htmlFor="shareable-id">Patient Shareable ID *</Label>
                <Input
                  id="shareable-id"
                  placeholder="e.g., MED-ABC12345 or USER-ABC12345"
                  value={shareableId}
                  onChange={(e) => setShareableId(e.target.value.toUpperCase())}
                  required
                />
                <p className="text-sm text-gray-600">
                  Tip: You can use MED-XXXXXXXX or your USER-XXXXXXXX ID.
                </p>
              </div>
            )}

          <div className="space-y-4">
            <Label>Document File *</Label>
            
            {/* File Upload Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="file-input" className="text-sm font-medium">
                  Upload from Device
                </Label>
                <Input
                  id="file-input"
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Scan Document
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowScanner(true)}
                  className="w-full"
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Open Camera
                </Button>
              </div>
            </div>
            
            {file && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted rounded-md">
                <FileText className="h-4 w-4" />
                <span>{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="document-type">Document Type *</Label>
            <Select value={documentType} onValueChange={setDocumentType} required>
              <SelectTrigger>
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lab_report">Lab Report</SelectItem>
                <SelectItem value="prescription">Prescription</SelectItem>
                <SelectItem value="x_ray">X-Ray</SelectItem>
                <SelectItem value="mri_scan">MRI Scan</SelectItem>
                <SelectItem value="ct_scan">CT Scan</SelectItem>
                <SelectItem value="ultrasound">Ultrasound</SelectItem>
                <SelectItem value="discharge_summary">Discharge Summary</SelectItem>
                <SelectItem value="consultation_notes">Consultation Notes</SelectItem>
                <SelectItem value="insurance_document">Insurance Document</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Brief description of the document..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              placeholder="e.g., urgent, follow-up, chronic"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>

          <Button type="submit" className="w-full" disabled={uploading}>
            {uploading ? "Uploading..." : "Upload Document"}
          </Button>
          </form>
        </CardContent>
      </Card>

      {/* Document Scanner Modal */}
      <DocumentScanner
        open={showScanner}
        onClose={() => setShowScanner(false)}
        onScanComplete={handleScanComplete}
      />
    </div>
  );
}