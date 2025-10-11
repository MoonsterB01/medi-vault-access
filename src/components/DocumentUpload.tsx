import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Camera, CheckCircle, AlertTriangle, Eye, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ProfileSelector from "@/components/ProfileSelector";
import { DocumentScanner } from "@/components/DocumentScanner";
import { ContentAnalyzer } from "@/components/ContentAnalyzer";
import OCRProcessor from "@/components/OCRProcessor";
import { generateFileHash, getFileHashInfo } from "@/lib/fileHash";

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

interface AIAnalysisResult {
  keywords: string[];
  categories: string[];
  confidence: number;
  entities: any;
  verificationStatus: string;
  textDensityScore: number;
  medicalKeywordCount: number;
  processingNotes: string;
  requiresUserVerification: boolean;
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
  const [aiAnalysisResult, setAiAnalysisResult] = useState<AIAnalysisResult | null>(null);
  const [uploadedDocumentId, setUploadedDocumentId] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [requiresUserVerification, setRequiresUserVerification] = useState(false);
  const [fileHash, setFileHash] = useState<string | null>(null);
  const [isFileBlocked, setIsFileBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState<string | null>(null);
  const [isAnalyzingWithAI, setIsAnalyzingWithAI] = useState(false);
  const { toast } = useToast();

  // Keep input in sync if parent provides/updates shareableId
  useEffect(() => {
    setShareableId(propShareableId || "");
  }, [propShareableId]);

  const handleProfileChange = (newShareableId: string, patientName: string) => {
    setShareableId(newShareableId);
    setSelectedPatientName(patientName);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Check file size (10MB limit)
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select a file smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    // Generate file hash and check if blocked
    try {
      const hashInfo = await getFileHashInfo(selectedFile);
      setFileHash(hashInfo.hash);
      
      // Check if file is blocked
      const { data: isBlocked } = await supabase.rpc('is_file_blocked', { hash_input: hashInfo.hash });
      
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
        hash_input: hashInfo.hash,
        filename_input: hashInfo.filename,
        size_input: hashInfo.size,
        content_type_input: hashInfo.contentType
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
    setOcrResult(null);
    setAiAnalysisResult(null);
    setRequiresUserVerification(false);
    setIsAnalyzingWithAI(false);
    
    // Do NOT auto-start OCR - wait for user to click "Analyze and Upload"
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

  const handleImagesComplete = async (imageFiles: File[]) => {
    if (imageFiles.length === 0) return;

    // If only one image, treat like single file
    if (imageFiles.length === 1) {
      handleScanComplete(imageFiles[0]);
      return;
    }

    // For multiple images, upload them sequentially
    toast({
      title: "Multiple Images Captured",
      description: `Processing ${imageFiles.length} images...`,
    });

    // Handle the first image in the UI
    setFile(imageFiles[0]);
    setDocumentType("other");
    
    // TODO: In a more advanced implementation, we could upload all images
    // For now, we'll use the first image and show a message about the others
    toast({
      title: "Images Ready",
      description: `${imageFiles.length} images captured. Processing first image for OCR.`,
    });
    
    setShowOCR(true);
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

  const handleOCRComplete = async (result: OCRResult) => {
    setOcrResult(result);
    setShowOCR(false);
    
    // Run AI analysis immediately after OCR
    if (file) {
      await runAIAnalysis(result);
    }
    
    // After OCR and AI analysis complete, proceed with upload if we're in the middle of upload flow
    if (uploading) {
      // Re-trigger the upload to continue from where it left off
      setTimeout(() => {
        const submitBtn = document.querySelector('button[type="submit"]') as HTMLButtonElement;
        if (submitBtn) {
          submitBtn.click();
        }
      }, 500);
    }
  };

  const runAIAnalysis = async (ocrResult: OCRResult) => {
    setIsAnalyzingWithAI(true);
    
    try {
      const fileContent = await convertFileToBase64(file!);
      
      const { data, error } = await supabase.functions.invoke('enhanced-document-analyze', {
        body: {
          documentId: 'temp-analysis', // Temporary ID for pre-upload analysis
          fileContent,
          contentType: file!.type,
          filename: file!.name,
          ocrResult
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      const aiResult: AIAnalysisResult = {
        keywords: data.keywords || [],
        categories: data.categories || [],
        confidence: data.confidence || 0,
        entities: data.entities || {},
        verificationStatus: data.verificationStatus || 'unverified',
        textDensityScore: data.textDensityScore || 0,
        medicalKeywordCount: data.medicalKeywordCount || 0,
        processingNotes: data.processingNotes || '',
        requiresUserVerification: data.requiresUserVerification || false
      };

      setAiAnalysisResult(aiResult);

      // Determine if user verification is needed based on AI confidence
      if (aiResult.confidence >= 0.8 && aiResult.medicalKeywordCount >= 2) {
        // High confidence medical document - auto approve
        toast({
          title: "Document Verified",
          description: "Document automatically verified as medical content",
        });
      } else if (aiResult.confidence >= 0.3 || aiResult.medicalKeywordCount >= 1) {
        // Medium confidence - ask user
        setRequiresUserVerification(true);
        toast({
          title: "Verification Required",
          description: "Please confirm if this document contains medical content",
          variant: "default",
        });
      } else {
        // Low confidence - likely not medical
        setRequiresUserVerification(true);
        toast({
          title: "Document Analysis",
          description: "Please verify if this is a medical document",
          variant: "default",
        });
      }

    } catch (error: any) {
      console.error('AI analysis error:', error);
      
      // Set a fallback AI result to allow user verification to work
      const fallbackAiResult: AIAnalysisResult = {
        keywords: [],
        categories: [],
        confidence: 0,
        entities: {},
        verificationStatus: 'unverified',
        textDensityScore: ocrResult.textDensityScore || 0,
        medicalKeywordCount: ocrResult.medicalKeywordCount || 0,
        processingNotes: 'AI analysis failed - user verification required',
        requiresUserVerification: true
      };
      setAiAnalysisResult(fallbackAiResult);
      
      toast({
        title: "AI Analysis Failed",
        description: "Could not analyze document automatically. Please verify manually.",
        variant: "destructive",
      });
      setRequiresUserVerification(true);
    } finally {
      setIsAnalyzingWithAI(false);
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

  const handleUserVerification = async (isConfirmed: boolean, userCategory?: string) => {
    if (!isConfirmed && fileHash) {
      // User marked as NOT medical - block the file and stop all processing
      try {
        const { data: user } = await supabase.auth.getUser();
        if (user.user) {
          await supabase.from('blocked_files').insert({
            file_hash: fileHash,
            blocked_by: user.user.id,
            reason: 'not_medical',
            user_feedback: 'User explicitly marked as non-medical document'
          });
          
          toast({
            title: "File Blocked",
            description: "File marked as non-medical and blocked permanently. Please select a different file.",
          });
          
          // Completely reset form and stop all processing
          resetForm();
          return;
        }
      } catch (error) {
        console.error('Error blocking file:', error);
        toast({
          title: "Error",
          description: "Error blocking file",
          variant: "destructive",
        });
        return;
      }
    }

    // User confirmed it's medical - proceed with verification
    if (isConfirmed) {
      // Create default OCR result if missing
      if (!ocrResult) {
        const defaultOcrResult: OCRResult = {
          text: `Document: ${file?.name || 'Unknown'}`,
          confidence: 0.5,
          textDensityScore: 0.5,
          medicalKeywordCount: 1,
          detectedKeywords: ['document'],
          verificationStatus: 'user_verified_medical',
          formatSupported: true,
          processingNotes: `User verified as medical document${userCategory ? ` - ${userCategory}` : ''}`,
          structuralCues: {
            hasDates: false,
            hasUnits: false,
            hasNumbers: false,
            hasTableStructure: false,
          }
        };
        setOcrResult(defaultOcrResult);
      } else {
        const updatedOcrResult = {
          ...ocrResult,
          verificationStatus: 'user_verified_medical' as const,
          processingNotes: `User verified as medical document${userCategory ? ` - ${userCategory}` : ''}`
        };
        setOcrResult(updatedOcrResult);
      }
      
      // Create default AI result if missing
      if (!aiAnalysisResult) {
        const defaultAiResult: AIAnalysisResult = {
          keywords: ['medical', 'document'],
          categories: ['general'],
          confidence: 0.7,
          entities: {},
          verificationStatus: 'user_verified_medical',
          textDensityScore: 0.5,
          medicalKeywordCount: 1,
          processingNotes: `User verified as medical document${userCategory ? ` - ${userCategory}` : ''}`,
          requiresUserVerification: false
        };
        setAiAnalysisResult(defaultAiResult);
      } else {
        const updatedAiResult = {
          ...aiAnalysisResult,
          verificationStatus: 'user_verified_medical',
          processingNotes: `User verified as medical document${userCategory ? ` - ${userCategory}` : ''}`
        };
        setAiAnalysisResult(updatedAiResult);
      }
      
      setRequiresUserVerification(false);
      
      if (userCategory) {
        setDocumentType(userCategory);
      }

      toast({
        title: "Document Verified",
        description: "Document verified as medical. Ready to upload.",
      });
    }
  };

  const handleAnalyzeAndUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file || !documentType || !shareableId) {
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

    // Normalize and validate shareable ID
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
    setIsAnalyzingWithAI(true);

    try {
      // Step 1: Run OCR if not already done
      if (!ocrResult) {
        toast({
          title: "Analyzing Document",
          description: "Extracting text and analyzing content...",
        });
        
        // Trigger OCR processing
        setShowOCR(true);
        
        // Wait for OCR to complete (it will call handleOCRComplete)
        // The upload will continue after OCR completes through the effect
        return;
      }

      // Step 2: Check if user verification is required
      if (requiresUserVerification) {
        setUploading(false);
        setIsAnalyzingWithAI(false);
        toast({
          title: "Verification Required",
          description: "Please verify if this document is medical or not",
          variant: "destructive",
        });
        return;
      }

      // Step 3: Proceed with upload
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Authentication Required",
          description: "Please log in to upload documents",
          variant: "destructive",
        });
        setUploading(false);
        setIsAnalyzingWithAI(false);
        return;
      }

      const fileContent = await convertFileToBase64(file);
      const tagsArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag);

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
        ocrResult: ocrResult || undefined,
        aiAnalysisResult: aiAnalysisResult || undefined,
        fileHash: fileHash || undefined,
      };

      const { data, error } = await supabase.functions.invoke('upload-document', {
        body: uploadPayload,
      });

      if (error) {
        throw new Error(error.message || 'Upload failed');
      }

      toast({
        title: "Upload Successful!",
        description: data?.message || "Document uploaded and analyzed successfully",
      });
      
      if (data?.documentId) {
        setUploadedDocumentId(data.documentId);
        setFileContent(fileContent);
        
        if (!data.skipAnalysis) {
          setShowAnalyzer(true);
        } else {
          resetForm();
        }
      } else {
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
      setIsAnalyzingWithAI(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setDocumentType("");
    setDescription("");
    setTags("");
    if (!propShareableId) setShareableId("");
    setOcrResult(null);
    setAiAnalysisResult(null);
    setRequiresUserVerification(false);
    setShowOCR(false);
    setFileHash(null);
    setIsFileBlocked(false);
    setBlockReason(null);
    setIsAnalyzingWithAI(false);
    
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
          <form onSubmit={handleAnalyzeAndUpload} className="space-y-4">
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
                
                {/* Processing States */}
                {isAnalyzingWithAI && (
                  <Card className="border-2 border-blue-200 bg-blue-50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        <span className="text-sm font-medium text-blue-800">Analyzing document with AI...</span>
                      </div>
                      <p className="text-xs text-blue-600 mt-1">
                        Detecting medical content and analyzing document structure.
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Combined OCR and AI Analysis Results */}
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
                        <div>
                          <span className="font-medium">Format:</span> {ocrResult.formatSupported ? 'Supported' : 'Unsupported'}
                        </div>
                      </div>
                      
                      {/* AI Analysis Categories */}
                      {aiAnalysisResult && aiAnalysisResult.categories.length > 0 && (
                        <div>
                          <span className="text-xs font-medium text-muted-foreground">AI Detected Categories:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {aiAnalysisResult.categories.slice(0, 3).map((category, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {category}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Combined Keywords */}
                      {(ocrResult.detectedKeywords.length > 0 || (aiAnalysisResult && aiAnalysisResult.keywords.length > 0)) && (
                        <div>
                          <span className="text-xs font-medium text-muted-foreground">Detected Medical Terms:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {/* OCR Keywords */}
                            {ocrResult.detectedKeywords.slice(0, 4).map((keyword, idx) => (
                              <Badge key={`ocr-${idx}`} variant="outline" className="text-xs border-blue-200">
                                {keyword}
                              </Badge>
                            ))}
                            {/* AI Keywords (filtered to avoid duplicates) */}
                            {aiAnalysisResult && aiAnalysisResult.keywords
                              .filter(keyword => !ocrResult.detectedKeywords.includes(keyword))
                              .slice(0, 4)
                              .map((keyword, idx) => (
                                <Badge key={`ai-${idx}`} variant="outline" className="text-xs border-green-200">
                                  {keyword}
                                </Badge>
                              ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="text-xs text-muted-foreground p-2 bg-muted/50 rounded">
                        {aiAnalysisResult ? aiAnalysisResult.processingNotes : ocrResult.processingNotes}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* User Verification Required */}
                {requiresUserVerification && (ocrResult || file) && (
                  <Card className="border-2 border-yellow-200 bg-yellow-50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-yellow-800">
                        <AlertTriangle className="h-4 w-4 inline mr-2" />
                        Verification Required
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="text-sm text-yellow-700 space-y-2">
                        <p>Is this document medical-related? This helps us organize your records properly.</p>
                        {aiAnalysisResult && (
                          <div className="bg-yellow-100 p-2 rounded text-xs">
                            <strong>AI Analysis Summary:</strong>
                            <br />• Medical terms found: {aiAnalysisResult.medicalKeywordCount}
                            {aiAnalysisResult.categories.length > 0 && (
                              <>
                                <br />• Suggested categories: {aiAnalysisResult.categories.slice(0, 2).join(', ')}
                              </>
                            )}
                          </div>
                        )}
                      </div>
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

          <Button 
            type="submit" 
            className="w-full" 
            disabled={uploading || requiresUserVerification || isFileBlocked || !file}
          >
            {uploading && isAnalyzingWithAI
              ? "Analyzing and Uploading..." 
              : uploading
                ? "Uploading..."
                : "Analyze and Upload"
            }
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
        onImagesComplete={handleImagesComplete}
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
