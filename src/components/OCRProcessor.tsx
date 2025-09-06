import { useState, useCallback } from "react";
import Tesseract from 'tesseract.js';
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, FileText, AlertTriangle, CheckCircle } from "lucide-react";

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

interface OCRProcessorProps {
  file: File;
  onOCRComplete: (result: OCRResult) => void;
  onError: (error: string) => void;
}

// Medical keywords for hybrid filtering
const MEDICAL_KEYWORDS = [
  'prescription', 'hospital', 'diagnosis', 'patient', 'doctor', 'physician',
  'medical', 'report', 'test', 'result', 'lab', 'laboratory', 'scan', 'imaging',
  'consultation', 'appointment', 'clinic', 'emergency', 'procedure', 'treatment',
  'therapy', 'heart', 'brain', 'blood', 'urea', 'glucose', 'hemoglobin',
  'hba1c', 'b12', 'vitamin', 'mri', 'x-ray', 'ultrasound', 'ecg', 'mg',
  'mmhg', 'diabetes', 'hypertension', 'asthma', 'cancer', 'cardiology',
  'neurology', 'oncology'
];

const SUPPORTED_IMAGE_FORMATS = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic'];
const SUPPORTED_DOCUMENT_FORMATS = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

export default function OCRProcessor({ file, onOCRComplete, onError }: OCRProcessorProps) {
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');

  const analyzeTextDensity = (text: string): number => {
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    const meaningfulWords = words.filter(word => 
      word.length >= 3 && 
      /[a-zA-Z]/.test(word) && 
      !(/^\d+$/.test(word))
    );
    return meaningfulWords.length;
  };

  const detectMedicalKeywords = (text: string): { count: number; keywords: string[] } => {
    const lowerText = text.toLowerCase();
    const foundKeywords = MEDICAL_KEYWORDS.filter(keyword => 
      lowerText.includes(keyword.toLowerCase())
    );
    return {
      count: foundKeywords.length,
      keywords: [...new Set(foundKeywords)] // Remove duplicates
    };
  };

  const detectStructuralCues = (text: string) => {
    return {
      hasDates: /\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b|\b\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}\b/.test(text),
      hasUnits: /\b\d+\s*(mg|ml|mmhg|bpm|units|dose|%)\b/i.test(text),
      hasNumbers: /\b\d+(\.\d+)?\b/.test(text),
      hasTableStructure: text.includes('\t') || /\s{4,}/.test(text)
    };
  };

  const determineVerificationStatus = (
    textDensityScore: number, 
    medicalKeywordCount: number, 
    confidence: number,
    formatSupported: boolean
  ): { status: 'verified_medical' | 'user_verified_medical' | 'unverified' | 'miscellaneous'; notes: string } => {
    if (!formatSupported) {
      return { 
        status: 'miscellaneous', 
        notes: 'Unsupported format. Re-upload as PDF or image to make it searchable.' 
      };
    }

    // Hybrid filtering logic
    if (textDensityScore >= 3 && medicalKeywordCount >= 2) {
      return { 
        status: 'verified_medical', 
        notes: 'Automatically verified based on text density and medical keywords.' 
      };
    }

    if (textDensityScore >= 3 && medicalKeywordCount >= 1 && confidence > 0.7) {
      return { 
        status: 'verified_medical', 
        notes: 'Verified based on content analysis and OCR confidence.' 
      };
    }

    if (textDensityScore >= 1 && (medicalKeywordCount >= 1 || confidence > 0.6)) {
      return { 
        status: 'user_verified_medical', 
        notes: 'Requires user verification. May be a medical document.' 
      };
    }

    if (confidence < 0.3 && textDensityScore < 3) {
      return { 
        status: 'unverified', 
        notes: 'Low text density and OCR confidence. Please verify if this is a medical document.' 
      };
    }

    return { 
      status: 'user_verified_medical', 
      notes: 'System uncertain. User verification recommended.' 
    };
  };

  const processWithOCR = async (file: File): Promise<OCRResult> => {
    return new Promise((resolve, reject) => {
      const formatSupported = SUPPORTED_IMAGE_FORMATS.includes(file.type) || SUPPORTED_DOCUMENT_FORMATS.includes(file.type);
      
      if (!formatSupported) {
        const result: OCRResult = {
          text: `Unsupported format: ${file.name}`,
          confidence: 0,
          textDensityScore: 0,
          medicalKeywordCount: 0,
          detectedKeywords: [],
          verificationStatus: 'miscellaneous',
          formatSupported: false,
          processingNotes: 'File format not supported for OCR processing.',
          structuralCues: {
            hasDates: false,
            hasUnits: false,
            hasNumbers: false,
            hasTableStructure: false
          }
        };
        resolve(result);
        return;
      }

      // Handle PDF separately (basic text extraction)
      if (file.type === 'application/pdf') {
        const result: OCRResult = {
          text: `PDF Document: ${file.name}`,
          confidence: 0.5,
          textDensityScore: 2, // Assume some content in PDF
          medicalKeywordCount: 0,
          detectedKeywords: [],
          verificationStatus: 'user_verified_medical',
          formatSupported: true,
          processingNotes: 'PDF detected. Text extraction limited. Consider converting to image for better OCR.',
          structuralCues: {
            hasDates: false,
            hasUnits: false,
            hasNumbers: false,
            hasTableStructure: false
          }
        };
        
        // Simple keyword detection from filename
        const fileKeywords = detectMedicalKeywords(file.name);
        result.medicalKeywordCount = fileKeywords.count;
        result.detectedKeywords = fileKeywords.keywords;
        
        const verification = determineVerificationStatus(
          result.textDensityScore,
          result.medicalKeywordCount,
          result.confidence,
          result.formatSupported
        );
        result.verificationStatus = verification.status;
        result.processingNotes = verification.notes;
        
        resolve(result);
        return;
      }

      // Process images with Tesseract OCR
      if (SUPPORTED_IMAGE_FORMATS.includes(file.type)) {
        Tesseract.recognize(
          file,
          'eng',
          {
            logger: (m) => {
              if (m.status === 'recognizing text') {
                setProgress(Math.round(m.progress * 100));
                setCurrentStep('Extracting text from image...');
              }
            }
          }
        ).then(({ data: { text, confidence } }) => {
          const textDensityScore = analyzeTextDensity(text);
          const medicalAnalysis = detectMedicalKeywords(text);
          const structuralCues = detectStructuralCues(text);
          
          const verification = determineVerificationStatus(
            textDensityScore,
            medicalAnalysis.count,
            confidence / 100, // Tesseract returns 0-100, we want 0-1
            formatSupported
          );

          const result: OCRResult = {
            text,
            confidence: confidence / 100,
            textDensityScore,
            medicalKeywordCount: medicalAnalysis.count,
            detectedKeywords: medicalAnalysis.keywords,
            verificationStatus: verification.status,
            formatSupported,
            processingNotes: verification.notes,
            structuralCues
          };

          resolve(result);
        }).catch((error) => {
          reject(new Error(`OCR processing failed: ${error.message}`));
        });
      }
    });
  };

  const handleProcess = useCallback(async () => {
    if (processing) return;

    setProcessing(true);
    setProgress(0);
    setCurrentStep('Initializing OCR...');

    try {
      const result = await processWithOCR(file);
      onOCRComplete(result);
    } catch (error: any) {
      onError(error.message || 'OCR processing failed');
    } finally {
      setProcessing(false);
      setProgress(0);
      setCurrentStep('');
    }
  }, [file, processing, onOCRComplete, onError]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified_medical': return 'bg-green-100 text-green-800';
      case 'user_verified_medical': return 'bg-yellow-100 text-yellow-800';
      case 'unverified': return 'bg-red-100 text-red-800';
      case 'miscellaneous': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Document OCR Processing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          File: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
        </div>

        {!processing ? (
          <Button onClick={handleProcess} className="w-full">
            Start OCR Processing
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{currentStep}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div>Supported: PDF, JPG, PNG, HEIC</div>
          <div>Features: Medical keyword detection</div>
        </div>
      </CardContent>
    </Card>
  );
}