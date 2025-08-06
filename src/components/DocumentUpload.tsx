import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText } from "lucide-react";

interface DocumentUploadProps {
  shareableId?: string;
  onUploadSuccess?: () => void;
}

export default function DocumentUpload({ shareableId, onUploadSuccess }: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [inputShareableId, setInputShareableId] = useState(shareableId || "");
  const { toast } = useToast();

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
    
    if (!file || !documentType || !inputShareableId) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields and select a file",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const fileContent = await convertFileToBase64(file);
      const tagsArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag);

      const response = await fetch(
        'https://qiqepumdtaozjzfjbggl.supabase.co/functions/v1/upload-document',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            shareableId: inputShareableId,
            file: {
              name: file.name,
              content: fileContent,
              type: file.type,
              size: file.size
            },
            documentType,
            description: description || undefined,
            tags: tagsArray.length > 0 ? tagsArray : undefined
          }),
        }
      );

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Upload Successful!",
          description: result.message || "Document uploaded successfully",
        });
        
        // Reset form
        setFile(null);
        setDocumentType("");
        setDescription("");
        setTags("");
        if (!shareableId) setInputShareableId("");
        
        // Reset file input
        const fileInput = document.getElementById('file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        
        onUploadSuccess?.();
      } else {
        throw new Error(result.error || 'Upload failed');
      }
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Medical Document
        </CardTitle>
        <CardDescription>
          Upload documents using a patient's shareable ID
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleUpload} className="space-y-4">
          {!shareableId && (
            <div className="space-y-2">
              <Label htmlFor="shareable-id">Patient Shareable ID *</Label>
              <Input
                id="shareable-id"
                placeholder="e.g., MED-ABC12345"
                value={inputShareableId}
                onChange={(e) => setInputShareableId(e.target.value)}
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="file-input">Document File *</Label>
            <Input
              id="file-input"
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              required
            />
            {file && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FileText className="h-4 w-4" />
                {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
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
  );
}