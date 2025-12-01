import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Camera, CheckCircle, AlertTriangle, User, Loader2, Shield, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DocumentScanner } from "@/components/DocumentScanner";
import { generateFileHash } from "@/lib/fileHash";
import { UpgradePlanDialog } from "@/components/UpgradePlanDialog";
import { useSubscription } from "@/hooks/use-subscription";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface DocumentUploadProps {
  onUploadSuccess?: () => void;
}

interface AIVisionResult {
  success: boolean;
  extractedText: string;
  patientInfo?: {
    name?: string;
    dob?: string;
    gender?: string;
    contact?: string;
  };
  medicalEntities: {
    doctors?: string[];
    conditions?: string[];
    medications?: Array<{
      name: string;
      dose?: string;
      frequency?: string;
    }>;
    labResults?: Array<{
      test: string;
      value: string;
      unit?: string;
      normalRange?: string;
      isAbnormal?: boolean;
    }>;
  };
  categories: string[];
  confidence: number;
  criticalAlerts?: string[];
  error?: string;
}

export default function DocumentUpload({ onUploadSuccess }: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [patientId, setPatientId] = useState<string | null>(null);
  const [patientName, setPatientName] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [aiVisionResult, setAiVisionResult] = useState<AIVisionResult | null>(null);
  const [isAnalyzingWithAI, setIsAnalyzingWithAI] = useState(false);
  const [fileContent, setFileContent] = useState<string>("");
  const [fileHash, setFileHash] = useState<string | null>(null);
  const [isFileBlocked, setIsFileBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState<string | null>(null);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();
  
  const subscription = useSubscription(userId || undefined, patientId || undefined);

  useEffect(() => {
    fetchUserPatient();
  }, []);

  const fetchUserPatient = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to upload documents",
        variant: "destructive"
      });
      return;
    }
    
    setUserId(user.id);
    
    const { data: patients, error } = await supabase
      .from('patients')
      .select('id, name')
      .eq('created_by', user.id)
      .limit(1);
      
    if (error || !patients || patients.length === 0) {
      toast({ 
        title: "No Patient Record", 
        description: "Please contact support to set up your patient profile.",
        variant: "destructive" 
      });
      return;
    }
    
    setPatientId(patients[0].id);
    setPatientName(patients[0].name);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    // Check upload limit before proceeding
    if (!subscription.canUpload && !subscription.isLoading) {
      setShowUpgradeDialog(true);
      e.target.value = ''; // Reset file input
      return;
    }

    // Generate file hash and check if blocked
    try {
      const hash = await generateFileHash(selectedFile);
      setFileHash(hash);
      
      // Check if file is blocked
      const { data: isBlocked } = await supabase.rpc('is_file_blocked', { hash_input: hash });
      
      if (isBlocked) {
        setIsFileBlocked(true);
        setBlockReason("This file was previously marked as non-medical");
        toast({
          title: "File Blocked",
          description: "This file was previously marked as non-medical document",
          variant: "destructive",
        });
        return;
      }
      
      // Register file hash
      await supabase.rpc('register_file_hash', {
        hash_input: hash,
        filename_input: selectedFile.name,
        size_input: selectedFile.size,
        content_type_input: selectedFile.type
      });
      
    } catch (error) {
      console.error('Error checking file hash:', error);
      toast({
        title: "Error",
        description: "Error checking file",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);
    setIsFileBlocked(false);
    setBlockReason(null);
    setAiVisionResult(null);
    
    // Automatically run AI Vision analysis
    await runAIVisionAnalysis(selectedFile);
  };

  const handleScanComplete = async (scannedFile: File) => {
    setFile(scannedFile);
    setDocumentType("other");
    toast({
      title: "Document Scanned",
      description: "Starting AI Vision analysis...",
    });
    await runAIVisionAnalysis(scannedFile);
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

  const runAIVisionAnalysis = async (fileToAnalyze: File) => {
    setIsAnalyzingWithAI(true);
    
    try {
      toast({
        title: "Analyzing Document",
        description: "AI is reading and extracting information from your document...",
      });

      const base64Content = await convertFileToBase64(fileToAnalyze);
      setFileContent(base64Content);

      const { data, error } = await supabase.functions.invoke('ai-document-vision', {
        body: {
          fileContent: base64Content,
          mimeType: fileToAnalyze.type,
          filename: fileToAnalyze.name,
        }
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setAiVisionResult(data);
      
      // Auto-suggest document type based on categories
      if (data.categories && data.categories.length > 0) {
        const category = data.categories[0].toLowerCase();
        if (category.includes('lab')) {
          setDocumentType('lab_report');
        } else if (category.includes('prescription')) {
          setDocumentType('prescription');
        } else if (category.includes('x-ray') || category.includes('xray')) {
          setDocumentType('x_ray');
        } else if (category.includes('mri')) {
          setDocumentType('mri_scan');
        } else if (category.includes('ct')) {
          setDocumentType('ct_scan');
        } else if (category.includes('ultrasound')) {
          setDocumentType('ultrasound');
        } else if (category.includes('discharge')) {
          setDocumentType('discharge_summary');
        } else if (category.includes('consultation') || category.includes('note')) {
          setDocumentType('consultation_notes');
        }
      }
      
      toast({
        title: "Analysis Complete!",
        description: `Found ${data.categories?.length || 0} categories, ${data.medicalEntities?.medications?.length || 0} medications, ${data.medicalEntities?.labResults?.length || 0} lab results`,
      });

      // Show critical alerts if any
      if (data.criticalAlerts && data.criticalAlerts.length > 0) {
        toast({
          title: "⚠️ Critical Alerts",
          description: data.criticalAlerts.join(', '),
          variant: "destructive",
        });
      }
      
    } catch (error) {
      console.error('AI Vision Analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Failed to analyze document",
        variant: "destructive",
      });
      setAiVisionResult(null);
    } finally {
      setIsAnalyzingWithAI(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file || !documentType || !patientId) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields and select a file",
        variant: "destructive",
      });
      return;
    }

    // Prevent upload of blocked files
    if (isFileBlocked) {
      toast({
        title: "Upload Blocked",
        description: "This file has been blocked and cannot be uploaded",
        variant: "destructive",
      });
      return;
    }

    // Warn for large files but don't block
    const fileSize = file.size / (1024 * 1024); // Size in MB
    if (fileSize > 15) {
      const shouldContinue = confirm(
        `This file is ${fileSize.toFixed(1)}MB. Large files may take longer to upload and process. Continue?`
      );
      if (!shouldContinue) return;
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
        setUploading(false);
        return;
      }

      // Show progress for large files
      if (fileSize > 5) {
        toast({
          title: "Processing Large File",
          description: "Please wait while we process your document...",
        });
      }

      const content = fileContent || await convertFileToBase64(file);
      const tagsArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag);

      // Enhanced upload payload with AI Vision results
      const uploadPayload = {
        file: {
          name: file.name,
          content: content,
          type: file.type,
          size: file.size,
        },
        documentType,
        description: description || undefined,
        tags: tagsArray.length > 0 ? tagsArray : undefined,
        aiVisionResult: aiVisionResult || undefined,
        fileHash: fileHash || undefined,
      };

      const { data, error } = await supabase.functions.invoke('upload-document', {
        body: uploadPayload,
      });

      if (error) {
        console.error('Upload error:', error);
        throw new Error(error.message || 'Upload failed');
      }

      if (!data || !data.success) {
        throw new Error(data?.details || 'Upload failed - no response data');
      }

      toast({
        title: "Upload Successful!",
        description: data?.message || "Document uploaded successfully",
      });
      
      // Refresh subscription after successful upload
      if (subscription?.refresh) {
        await subscription.refresh();
      }
      
      // AI Vision already handled analysis, reset form
      resetForm();
      
      onUploadSuccess?.();
    } catch (error: any) {
      console.error('Upload error details:', error);
      
      let errorMessage = error.message || 'Upload failed';
      
      // Provide helpful error messages for common issues
      if (errorMessage.includes('memory')) {
        errorMessage = 'File too large to process. Please try a smaller file or contact support.';
      } else if (errorMessage.includes('timeout')) {
        errorMessage = 'Upload timed out. Please check your connection and try again.';
      } else if (errorMessage.includes('authentication')) {
        errorMessage = 'Session expired. Please refresh the page and try again.';
      }
      
      toast({
        title: "Upload Failed",
        description: errorMessage,
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
    setAiVisionResult(null);
    setFileHash(null);
    setIsFileBlocked(false);
    setBlockReason(null);
    setIsAnalyzingWithAI(false);
    
    // Reset file input
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };


  if (!patientId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Upload Medical Document</CardTitle>
          <CardDescription>Loading your patient profile...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Medical Document
          </CardTitle>
          <CardDescription className="flex items-center gap-2 mt-2">
            <User className="h-4 w-4" />
            Uploading as: <span className="font-medium text-foreground">{patientName}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="space-y-6">
            <div className="space-y-4">
              <Label>Document File *</Label>
              
              {/* File Upload Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="file-input" className="text-sm font-medium">
                    Upload from Device
                  </Label>
                  <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                    <Input
                      id="file-input"
                      type="file"
                      onChange={handleFileChange}
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Drag & drop or click to select
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PDF, JPG, PNG, DOC, DOCX (Max 20MB)
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Scan Document
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowScanner(true)}
                    className="w-full h-full min-h-[120px]"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Camera className="h-8 w-8" />
                      <span>Open Camera Scanner</span>
                    </div>
                  </Button>
                </div>
              </div>
              
              {isFileBlocked && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4 text-destructive" />
                    <span className="font-medium text-destructive">File Blocked</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {blockReason || "This file has been blocked from medical processing."}
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={() => {
                      setFile(null);
                      setIsFileBlocked(false);
                      setBlockReason(null);
                      const fileInput = document.getElementById('file-input') as HTMLInputElement;
                      if (fileInput) fileInput.value = '';
                    }}
                  >
                    Select Different File
                  </Button>
                </div>
              )}
              
              {file && !isFileBlocked && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted rounded-md">
                    <FileText className="h-4 w-4" />
                    <span>{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                  </div>
                  
                  {/* AI Vision Analysis Progress */}
                  {isAnalyzingWithAI && (
                    <Card className="border-2 border-primary/50 bg-primary/5">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            <span className="text-sm font-medium">AI Vision Analysis in Progress</span>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <CheckCircle className="h-3 w-3" />
                              <span>Reading document with AI vision...</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              <span>Extracting medical information, decimals, units...</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* AI Vision Results */}
                  {aiVisionResult && (
                    <Card className="border-2 border-green-200 bg-green-50 dark:bg-green-900/20">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          AI Analysis Complete!
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">Categories:</span>
                            <Badge variant="secondary" className="ml-1">
                              {aiVisionResult.categories?.length || 0}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">Confidence:</span>
                            <Badge variant={aiVisionResult.confidence > 0.8 ? "default" : "secondary"} className="ml-1">
                              {Math.round(aiVisionResult.confidence * 100)}%
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">Medications:</span>
                            <Badge variant="outline" className="ml-1">
                              {aiVisionResult.medicalEntities?.medications?.length || 0}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">Lab Results:</span>
                            <Badge variant="outline" className="ml-1">
                              {aiVisionResult.medicalEntities?.labResults?.length || 0}
                            </Badge>
                          </div>
                        </div>

                        {/* Categories */}
                        {aiVisionResult.categories && aiVisionResult.categories.length > 0 && (
                          <div>
                            <span className="text-xs font-medium text-muted-foreground">Detected Categories:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {aiVisionResult.categories.map((cat, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {cat}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Critical Alerts */}
                        {aiVisionResult.criticalAlerts && aiVisionResult.criticalAlerts.length > 0 && (
                          <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                            <div className="flex items-center gap-1 mb-1">
                              <AlertCircle className="h-3 w-3 text-red-600" />
                              <span className="text-xs font-medium text-red-700 dark:text-red-400">Critical Alerts:</span>
                            </div>
                            <ul className="text-xs text-red-600 dark:text-red-300 space-y-0.5">
                              {aiVisionResult.criticalAlerts.map((alert, idx) => (
                                <li key={idx}>• {alert}</li>
                              ))}
                            </ul>
                          </div>
                        )}
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

            <Button 
              type="submit" 
              className="w-full" 
              disabled={uploading || isFileBlocked || isAnalyzingWithAI || !file}
            >
              {uploading 
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Uploading...</>
                : isAnalyzingWithAI 
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing Document...</>
                  : <><Upload className="mr-2 h-4 w-4" />Upload Document</>
              }
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Document Scanner Dialog */}
      <Dialog open={showScanner} onOpenChange={setShowScanner}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Document Scanner</DialogTitle>
            <DialogDescription>
              Scan your medical documents using your device camera
            </DialogDescription>
          </DialogHeader>
          <DocumentScanner 
            open={showScanner}
            onClose={() => setShowScanner(false)}
            onScanComplete={handleScanComplete}
          />
        </DialogContent>
      </Dialog>

      {/* Upgrade Dialog */}
      {showUpgradeDialog && (
        <UpgradePlanDialog
          open={showUpgradeDialog}
          onOpenChange={setShowUpgradeDialog}
          currentPlan="free"
          uploadsUsed={subscription.uploadsUsed}
          uploadLimit={5}
        />
      )}
    </div>
  );
}
