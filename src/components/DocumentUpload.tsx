import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Camera, CheckCircle, AlertTriangle, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ProfileSelector from "@/components/ProfileSelector";
import { DocumentScanner } from "@/components/DocumentScanner";
import { ContentAnalyzer } from "@/components/ContentAnalyzer";
import OCRProcessor from "@/components/OCRProcessor";

interface DocumentUploadProps {
  shareableId?: string;
  onUploadSuccess?: () => void;
}

interface OCRResult {
  text: string;
  confidence: number;
  textDensityScore: number;
  medicalKeywordCount: number;
  detectedKeywords: string[];
  verificationStatus: 'verified_medical' | 'user_verified_medical' | 'unverified' | 'miscellaneous';
  formatSupported: boolean;
  processingNotes: string;
  structuralCues: {
    hasDates: boolean;
    hasUnits: boolean;
    hasNumbers: boolean;
    hasTableStructure: boolean;
  };
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
  const [showAnalyzer, setShowAnalyzer] = useState(false);
  const [showOCR, setShowOCR] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [uploadedDocumentId, setUploadedDocumentId] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [requiresUserVerification, setRequiresUserVerification] = useState(false);
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
      setOcrResult(null);
      setRequiresUserVerification(false);
      // Auto-start OCR for supported formats
      if (selectedFile.type.startsWith('image/') || selectedFile.type === 'application/pdf') {
        setShowOCR(true);
      }
    }
  };

  const handleScanComplete = (scannedFile: File) => {
    setFile(scannedFile);
    setDocumentType("other"); // Default type for scanned documents
    setShowOCR(true); // Auto-start OCR for scanned documents
    toast({
      title: "Document Scanned",
      description: "Starting OCR analysis of scanned document...",
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

  const handleOCRComplete = (result: OCRResult) => {
    setOcrResult(result);
    setShowOCR(false);
    
    // Handle verification status
    if (result.verificationStatus === 'user_verified_medical') {
      setRequiresUserVerification(true);
      toast({
        title: "Verification Required",
        description: result.processingNotes,
        variant: "default",
      });
    } else if (result.verificationStatus === 'verified_medical') {
      toast({
        title: "Document Verified",
        description: "Automatically verified as medical document",
      });
    } else if (result.verificationStatus === 'miscellaneous') {
      toast({
        title: "Unsupported Format",
        description: result.processingNotes,
        variant: "destructive",
      });
    }
  };

  const handleOCRError = (error: string) => {
    setShowOCR(false);
    toast({
      title: "OCR Processing Failed",
      description: error,
      variant: "destructive",
    });
  };

  const handleUserVerification = (isConfirmed: boolean, userCategory?: string) => {
    if (ocrResult) {
      const updatedResult = {
        ...ocrResult,
        verificationStatus: isConfirmed ? 'user_verified_medical' as const : 'unverified' as const,
        processingNotes: isConfirmed 
          ? `User verified as medical document${userCategory ? ` - ${userCategory}` : ''}`
          : 'User marked as non-medical document'
      };
      setOcrResult(updatedResult);
      setRequiresUserVerification(false);
      
      if (userCategory) {
        setDocumentType(userCategory);
      }
    }
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

    // Check if user verification is required but not completed
    if (requiresUserVerification) {
      toast({
        title: "Verification Required",
        description: "Please verify if this document is medical or not",
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

      // Enhanced upload payload with OCR results
      const uploadPayload = {
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
        ocrResult: ocrResult || undefined, // Include OCR analysis results
      };

      const { data, error } = await supabase.functions.invoke('upload-document', {
        body: uploadPayload,
      });

      if (error) {
        throw new Error(error.message || 'Upload failed');
      }

      toast({
        title: "Upload Successful!",
        description: data?.message || "Document uploaded successfully",
      });
      
      // Store document ID and file content for enhanced analysis
      if (data?.documentId) {
        setUploadedDocumentId(data.documentId);
        setFileContent(fileContent);
        setShowAnalyzer(true);
      } else {
        // Reset form if no analysis needed
        resetForm();
      }
      
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

  const resetForm = () => {
    setFile(null);
    setDocumentType("");
    setDescription("");
    setTags("");
    if (!propShareableId) setShareableId("");
    setOcrResult(null);
    setRequiresUserVerification(false);
    setShowOCR(false);
    
    // Reset file input
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const handleAnalysisComplete = () => {
    resetForm();
    setShowAnalyzer(false);
    setUploadedDocumentId(null);
    setFileContent("");
  };

  const getVerificationStatusColor = (status: string) => {
    switch (status) {
      case 'verified_medical': return 'bg-green-100 text-green-800 border-green-200';
      case 'user_verified_medical': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'unverified': return 'bg-red-100 text-red-800 border-red-200';
      case 'miscellaneous': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified_medical': return <CheckCircle className="h-4 w-4" />;
      case 'user_verified_medical': return <Eye className="h-4 w-4" />;
      case 'unverified': return <AlertTriangle className="h-4 w-4" />;
      case 'miscellaneous': return <FileText className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
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
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted rounded-md">
                  <FileText className="h-4 w-4" />
                  <span>{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                </div>
                
                {/* OCR Results Display */}
                {ocrResult && (
                  <Card className="border-2">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        {getStatusIcon(ocrResult.verificationStatus)}
                        Document Analysis Results
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Badge className={`${getVerificationStatusColor(ocrResult.verificationStatus)} font-medium`}>
                        {ocrResult.verificationStatus.replace('_', ' ').toUpperCase()}
                      </Badge>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Text Density:</span> {ocrResult.textDensityScore} words
                        </div>
                        <div>
                          <span className="font-medium">Medical Keywords:</span> {ocrResult.medicalKeywordCount}
                        </div>
                        {ocrResult.confidence > 0 && (
                          <div>
                            <span className="font-medium">OCR Confidence:</span> {(ocrResult.confidence * 100).toFixed(0)}%
                          </div>
                        )}
                        <div>
                          <span className="font-medium">Format:</span> {ocrResult.formatSupported ? 'Supported' : 'Unsupported'}
                        </div>
                      </div>
                      
                      {ocrResult.detectedKeywords.length > 0 && (
                        <div>
                          <span className="text-xs font-medium text-muted-foreground">Detected Keywords:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {ocrResult.detectedKeywords.slice(0, 8).map((keyword, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {keyword}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="text-xs text-muted-foreground p-2 bg-muted/50 rounded">
                        {ocrResult.processingNotes}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* User Verification Required */}
                {requiresUserVerification && ocrResult && (
                  <Card className="border-2 border-yellow-200 bg-yellow-50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-yellow-800">
                        <AlertTriangle className="h-4 w-4 inline mr-2" />
                        Verification Required
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-yellow-700">
                        Is this document medical-related? This helps us organize your records properly.
                      </p>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => handleUserVerification(true)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Yes, Medical Document
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleUserVerification(false)}
                        >
                          No, Not Medical
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
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

          <Button type="submit" className="w-full" disabled={uploading || requiresUserVerification}>
            {uploading ? "Uploading..." : "Upload Document"}
          </Button>
          </form>
        </CardContent>
      </Card>

      {/* OCR Processor Modal */}
      {showOCR && file && (
        <OCRProcessor 
          file={file}
          onOCRComplete={handleOCRComplete}
          onError={handleOCRError}
        />
      )}

      {/* Document Scanner Modal */}
      <DocumentScanner
        open={showScanner}
        onClose={() => setShowScanner(false)}
        onScanComplete={handleScanComplete}
      />

      {/* Content Analyzer */}
      {showAnalyzer && uploadedDocumentId && file && (
        <ContentAnalyzer
          documentId={uploadedDocumentId}
          filename={file.name}
          contentType={file.type}
          fileContent={fileContent}
          onAnalysisComplete={handleAnalysisComplete}
        />
      )}
    </div>
  );
}