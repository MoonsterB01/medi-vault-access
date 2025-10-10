import { useState, useCallback } from "react";
import Tesseract from 'tesseract.js';
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, FileText, AlertTriangle, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
    hasMedicalRanges?: boolean;
    hasLabValues?: boolean;
    medicalPatternCount?: number;
  };
}

interface OCRProcessorProps {
  file: File;
  onOCRComplete: (result: OCRResult) => void;
  onError: (error: string) => void;
}

// Enhanced medical detection patterns
const MEDICAL_RANGE_PATTERN = /\b\d+[\.,]?\d*\s*[-–]\s*\d+[\.,]?\d*\s*\([^)]*range[^)]*\)/gi;
const MEDICAL_UNITS_PATTERN = /\b\d+[\.,]?\d*\s*(mg\/dl|g\/dl|cells\/[μu]l|mmhg|bpm|meq\/l|iu\/l|ng\/ml|pg\/ml|[μu]g\/ml|mg|ml|units|dose|%)\b/gi;
const LAB_VALUES_PATTERN = /\b(hemoglobin|hgb|wbc|rbc|platelet|glucose|hba1c|cholesterol|creatinine|ast|alt|bilirubin)\s*[:\-]?\s*\d+/gi;

const SUPPORTED_IMAGE_FORMATS = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic'];
const SUPPORTED_DOCUMENT_FORMATS = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

export default function OCRProcessor({ file, onOCRComplete, onError }: OCRProcessorProps) {
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');

  const validateExtractedText = (text: string): boolean => {
    if (!text || text.trim().length === 0) return false;
    
    // Check for excessive garbage characters
    const garbagePattern = /[^\w\s.,;:!?()-]/g;
    const garbageCount = (text.match(garbagePattern) || []).length;
    const garbageRatio = garbageCount / text.length;
    
    if (garbageRatio > 0.3) return false; // More than 30% garbage characters
    
    // Check for meaningful words (at least 3 characters)
    const words = text.trim().split(/\s+/);
    const meaningfulWords = words.filter(word => 
      word.length >= 3 && /^[a-zA-Z]+$/.test(word)
    ).length;
    
    return meaningfulWords >= 3; // At least 3 meaningful words
  };

  const preprocessImageForOCR = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        
        ctx?.drawImage(img, 0, 0);
        
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Increase contrast and brightness for better OCR
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.min(255, Math.max(0, (data[i] - 128) * 1.5 + 128 + 20));
          data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * 1.5 + 128 + 20));
          data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * 1.5 + 128 + 20));
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(URL.createObjectURL(blob));
          } else {
            reject(new Error('Failed to process image'));
          }
        }, 'image/png', 1.0);
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  // Client-side fallback: convert PDF to images using pdfjs-dist in the browser
  const convertPdfToImagesClient = async (pdfFile: File, maxPages: number = 10): Promise<string[]> => {
    try {
      const pdfjs: any = await import('pdfjs-dist');
      // Use Vite URL plugin to resolve the worker file at runtime
      const workerSrc: string = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default as string;
      pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

      const arrayBuffer = await pdfFile.arrayBuffer();
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer, disableWorker: false, isEvalSupported: true });
      const pdf = await loadingTask.promise;

      const pageCount: number = pdf.numPages;
      const pagesToProcess = Math.min(pageCount, maxPages);
      const images: string[] = [];

      for (let i = 1; i <= pagesToProcess; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 });

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        if (!ctx) throw new Error('Canvas context not available');

        await page.render({ canvasContext: ctx, viewport }).promise;
        images.push(canvas.toDataURL('image/png'));
      }

      return images;
    } catch (err) {
      console.error('Client-side PDF to images conversion failed:', err);
      throw err;
    }
  };

  const analyzeTextDensity = (text: string): number => {
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    const meaningfulWords = words.filter(word => 
      word.length >= 3 && 
      /[a-zA-Z]/.test(word) && 
      !(/^\d+$/.test(word))
    );
    return meaningfulWords.length;
  };

  const detectMedicalKeywords = async (text: string): Promise<{ count: number; keywords: string[] }> => {
    try {
      const { data: medicalKeywords, error } = await supabase
        .from('medical_keywords')
        .select('keyword, category, weight');
      
      if (error) {
        console.error('Error fetching medical keywords:', error);
        return { count: 0, keywords: [] };
      }
      
      const lowerText = text.toLowerCase();
      const foundKeywords: string[] = [];
      let totalScore = 0;
      
      medicalKeywords?.forEach(mk => {
        if (lowerText.includes(mk.keyword.toLowerCase())) {
          foundKeywords.push(mk.keyword);
          totalScore += mk.weight;
        }
      });
      
      const rangeMatches = text.match(MEDICAL_RANGE_PATTERN) || [];
      const unitMatches = text.match(MEDICAL_UNITS_PATTERN) || [];
      const labMatches = text.match(LAB_VALUES_PATTERN) || [];
      
      if (rangeMatches.length > 0) {
        foundKeywords.push('medical ranges detected');
        totalScore += 2.0;
      }
      
      if (unitMatches.length > 0) {
        foundKeywords.push('medical units detected');
        totalScore += 2.5;
      }
      
      if (labMatches.length > 0) {
        foundKeywords.push('lab values detected');
        totalScore += 3.0;
      }
      
      return {
        count: Math.floor(totalScore),
        keywords: [...new Set(foundKeywords)]
      };
    } catch (error) {
      console.error('Error in detectMedicalKeywords:', error);
      return { count: 0, keywords: [] };
    }
  };

  const detectStructuralCues = (text: string) => {
    const rangeMatches = text.match(MEDICAL_RANGE_PATTERN) || [];
    const unitMatches = text.match(MEDICAL_UNITS_PATTERN) || [];
    const labMatches = text.match(LAB_VALUES_PATTERN) || [];
    
    return {
      hasDates: /\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b|\b\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}\b/.test(text),
      hasUnits: unitMatches.length > 0,
      hasNumbers: /\b\d+(\.\d+)?\b/.test(text),
      hasTableStructure: text.includes('\t') || /\s{4,}/.test(text),
      hasMedicalRanges: rangeMatches.length > 0,
      hasLabValues: labMatches.length > 0,
      medicalPatternCount: rangeMatches.length + unitMatches.length + labMatches.length
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
    const formatSupported = SUPPORTED_IMAGE_FORMATS.includes(file.type) || SUPPORTED_DOCUMENT_FORMATS.includes(file.type);
    
    if (!formatSupported) {
      return {
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
    }

    // Handle PDF files with intelligent text extraction + OCR
    if (file.type === 'application/pdf') {
      setCurrentStep('Analyzing PDF...');
      setProgress(10);
      
      try {
        // Convert file to base64
        const fileContent = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.onerror = reject;
        });
        
        // Stage 1: Try text extraction first
        setCurrentStep('Extracting embedded text from PDF...');
        setProgress(20);
        
        let pdfResult = null;
        let textExtractionFailed = false;
        
        try {
          const { data, error } = await supabase.functions.invoke('pdf-text-extractor', {
            body: { fileContent, filename: file.name }
          });
          
          if (error) {
            console.warn('PDF text extraction service error:', error);
            textExtractionFailed = true;
          } else if (data?.success === false) {
            console.warn('PDF text extraction returned failure:', data);
            textExtractionFailed = true;
          } else {
            pdfResult = data;
          }
        } catch (err) {
          console.warn('PDF text extraction exception:', err);
          textExtractionFailed = true;
        }
        
        // Check if PDF has embedded text (only if extraction succeeded)
        if (!textExtractionFailed && pdfResult?.hasEmbeddedText && !pdfResult.requiresOCR && pdfResult.extractedText?.length > 50) {
          // Success! PDF has readable embedded text
          setProgress(60);
          setCurrentStep('Analyzing extracted text...');
          
          const textDensityScore = analyzeTextDensity(pdfResult.extractedText);
          const medicalAnalysis = await detectMedicalKeywords(pdfResult.extractedText);
          const structuralCues = detectStructuralCues(pdfResult.extractedText);
          
          const verification = determineVerificationStatus(
            textDensityScore,
            medicalAnalysis.count,
            pdfResult.confidence,
            formatSupported
          );
          
          setProgress(100);
          
          return {
            text: pdfResult.extractedText,
            confidence: pdfResult.confidence,
            textDensityScore,
            medicalKeywordCount: medicalAnalysis.count,
            detectedKeywords: medicalAnalysis.keywords,
            verificationStatus: verification.status,
            formatSupported,
            processingNotes: `${verification.notes} (Extracted from digital PDF)`,
            structuralCues
          };
        }
        
        // Stage 2: PDF is image-based or has no readable text - convert to images for OCR
        if (textExtractionFailed) {
          setCurrentStep('Falling back to OCR method - converting PDF to images...');
        } else {
          setCurrentStep('PDF requires OCR - converting to images...');
        }
        setProgress(30);
        
        // Use client-side conversion (server-side not available)
        setCurrentStep('Converting PDF to images in browser...');
        const images = await convertPdfToImagesClient(file, 10);
        
        if (!images.length) {
          throw new Error('No images extracted from PDF');
        }
        
        // Stage 3: Run OCR on each page
        setCurrentStep(`Running OCR on ${images.length} pages...`);
        let fullText = '';
        let totalConfidence = 0;
        
        for (let i = 0; i < images.length; i++) {
          setCurrentStep(`OCR processing page ${i + 1}/${images.length}...`);
          setProgress(40 + Math.round((i / images.length) * 40));
          
          try {
            const result = await Tesseract.recognize(
              images[i],
              'eng',
              {
                logger: (m) => {
                  if (m.status === 'recognizing text') {
                    const pageProgress = 40 + Math.round((i / images.length) * 40);
                    const currentPageProgress = Math.round(m.progress * (40 / images.length));
                    setProgress(pageProgress + currentPageProgress);
                  }
                }
              }
            );
            
            fullText += `\n\n=== Page ${i + 1} ===\n\n${result.data.text}`;
            totalConfidence += result.data.confidence;
          } catch (ocrError) {
            console.warn(`OCR failed on page ${i + 1}:`, ocrError);
            fullText += `\n\n=== Page ${i + 1} (OCR Failed) ===\n\n`;
          }
        }
        
        const avgConfidence = totalConfidence / images.length / 100;
        
        if (!validateExtractedText(fullText)) {
          throw new Error('OCR failed to extract readable text from PDF pages');
        }
        
        // Analyze the OCR results
        setProgress(85);
        setCurrentStep('Analyzing OCR results...');
        
        const textDensityScore = analyzeTextDensity(fullText);
        const medicalAnalysis = await detectMedicalKeywords(fullText);
        const structuralCues = detectStructuralCues(fullText);
        
        const verification = determineVerificationStatus(
          textDensityScore,
          medicalAnalysis.count,
          avgConfidence,
          formatSupported
        );
        
        setProgress(100);
        
        return {
          text: fullText,
          confidence: avgConfidence,
          textDensityScore,
          medicalKeywordCount: medicalAnalysis.count,
          detectedKeywords: medicalAnalysis.keywords,
          verificationStatus: verification.status,
          formatSupported,
          processingNotes: `${verification.notes} (Extracted via OCR from scanned PDF - ${images.length} pages)`,
          structuralCues
        };
        
      } catch (error: any) {
        console.error('PDF processing error:', error);
        throw new Error(`PDF processing failed: ${error.message}`);
      }
    }

    // Process images with enhanced OCR for JPEG
    if (SUPPORTED_IMAGE_FORMATS.includes(file.type)) {
      setCurrentStep('Preprocessing image for better OCR...');
      setProgress(10);
      
      try {
        const preprocessedImageUrl = await preprocessImageForOCR(file);
        setProgress(20);
        setCurrentStep('Extracting text from image...');
        
        let bestResult: any = null;
        let bestConfidence = 0;
        
        // Try multiple OCR passes for better results
        const ocrPasses = [preprocessedImageUrl, URL.createObjectURL(file)]; // Try preprocessed first, then original
        
        for (let i = 0; i < ocrPasses.length; i++) {
          try {
            setCurrentStep(`OCR pass ${i + 1}/${ocrPasses.length}...`);
            setProgress(20 + (i * 35));
            
            const result = await Tesseract.recognize(
              ocrPasses[i],
              'eng',
              {
                logger: (m) => {
                  if (m.status === 'recognizing text') {
                    setProgress(20 + (i * 35) + Math.round(m.progress * 30));
                  }
                }
              }
            );
            
            if (result.data.confidence > bestConfidence && validateExtractedText(result.data.text)) {
              bestResult = result;
              bestConfidence = result.data.confidence;
              break; // Stop if we got a good result
            }
          } catch (passError) {
            console.warn(`OCR pass ${i + 1} failed:`, passError);
          }
        }
        
        // Clean up URLs
        URL.revokeObjectURL(preprocessedImageUrl);
        
        if (!bestResult || !validateExtractedText(bestResult.data.text)) {
          throw new Error('OCR failed to extract readable text. Please ensure the image is clear and contains readable text.');
        }
        
        setProgress(85);
        setCurrentStep('Analyzing extracted text...');
        
        const { text, confidence } = bestResult.data;
        const textDensityScore = analyzeTextDensity(text);
        const medicalAnalysis = await detectMedicalKeywords(text);
        const structuralCues = detectStructuralCues(text);
        
        const verification = determineVerificationStatus(
          textDensityScore,
          medicalAnalysis.count,
          confidence / 100,
          formatSupported
        );

        setProgress(100);

        return {
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
        
      } catch (error: any) {
        throw new Error(`Enhanced OCR processing failed: ${error.message}`);
      }
    }

    throw new Error('Unsupported file type for OCR processing');
  };

  const handleProcess = useCallback(async () => {
    if (processing) return;
    
    setProcessing(true);
    setProgress(0);
    setCurrentStep('Starting OCR processing...');
    
    try {
      const result = await processWithOCR(file);
      onOCRComplete(result);
    } catch (error: any) {
      console.error('OCR processing error:', error);
      onError(error.message || 'OCR processing failed');
    } finally {
      setProcessing(false);
      setProgress(0);
      setCurrentStep('');
    }
  }, [file, processing, onOCRComplete, onError]);

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'verified_medical':
        return 'bg-green-500';
      case 'user_verified_medical':
        return 'bg-yellow-500';
      case 'unverified':
        return 'bg-red-500';
      case 'miscellaneous':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified_medical':
        return <CheckCircle className="h-4 w-4" />;
      case 'user_verified_medical':
        return <Eye className="h-4 w-4" />;
      case 'unverified':
        return <AlertTriangle className="h-4 w-4" />;
      case 'miscellaneous':
        return <FileText className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          OCR Text Extraction
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm">
          <div className="font-medium">{file.name}</div>
          <div className="text-muted-foreground">
            {file.type} • {(file.size / 1024).toFixed(1)} KB
          </div>
        </div>

        {!processing ? (
          <Button onClick={handleProcess} className="w-full">
            Extract Text with OCR
          </Button>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Processing...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} />
            {currentStep && (
              <div className="text-xs text-muted-foreground">{currentStep}</div>
            )}
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