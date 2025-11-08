import React, { useState, useEffect, useCallback } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Camera as CameraIcon,
  FileText,
  Plus,
  Trash2,
  RotateCw,
  AlertTriangle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePreventNavigation } from '@/hooks/usePreventNavigation';
import jsPDF from 'jspdf';

/**
 * @interface DocumentScannerProps
 * @description Defines the props for the DocumentScanner component.
 * @property {boolean} open - Whether the scanner dialog is open.
 * @property {() => void} onClose - A function to close the scanner dialog.
 * @property {(file: File) => void} onScanComplete - A function to be called when the PDF scan is complete.
 * @property {(images: File[]) => void} [onImagesComplete] - An optional function to be called when the image scan is complete.
 */
interface DocumentScannerProps {
  open: boolean;
  onClose: () => void;
  onScanComplete: (file: File) => void;
  onImagesComplete?: (images: File[]) => void;
}

/**
 * @interface ScannedImage
 * @description Defines the structure of a scanned image object.
 * @property {string} id - The unique ID of the image.
 * @property {string} dataUrl - The data URL of the image.
 * @property {Date} timestamp - The timestamp when the image was scanned.
 */
interface ScannedImage {
  id: string;
  dataUrl: string;
  timestamp: Date;
}

/**
 * @function DocumentScanner
 * @description A component that allows users to scan documents using their device's camera. It can capture multiple images and generate a single PDF file.
 * @param {DocumentScannerProps} props - The props for the component.
 * @returns {JSX.Element} - The rendered DocumentScanner component.
 */
export const DocumentScanner: React.FC<DocumentScannerProps> = ({
  open,
  onClose,
  onScanComplete,
  onImagesComplete,
}) => {
  const [scannedImages, setScannedImages] = useState<ScannedImage[]>([]);
  const [documentName, setDocumentName] = useState('');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [sessionToRecover, setSessionToRecover] = useState<any | null>(null);
  const { toast } = useToast();

  usePreventNavigation(
    scannedImages.length > 0 || isCapturing,
    'You have captured images that will be lost. Are you sure?'
  );

  const clearSession = useCallback(() => {
    localStorage.removeItem('scannerSession');
    console.log('Scanner session cleared');
  }, []);

  const saveSession = useCallback(
    (images: ScannedImage[], name: string) => {
      if (images.length > 0 || name) {
        const session = {
          scannedImages: images,
          documentName: name,
          timestamp: Date.now(),
        };
        localStorage.setItem('scannerSession', JSON.stringify(session));
        console.log('Scanner session saved:', session);
      } else {
        clearSession();
      }
    },
    [clearSession]
  );

  useEffect(() => {
    if (open) {
      try {
        const savedSession = localStorage.getItem('scannerSession');
        if (savedSession) {
          const session = JSON.parse(savedSession);
          const isRecent = Date.now() - session.timestamp < 2 * 60 * 60 * 1000;
          const hasData = session.scannedImages?.length > 0 || session.documentName;
          
          if (isRecent && hasData) {
            setSessionToRecover(session);
            toast({
              title: 'Previous Session Found',
              description: `Found ${session.scannedImages?.length || 0} captured pages.`,
              duration: 5000,
            });
          } else {
            clearSession();
          }
        }
      } catch (error) {
        console.error('Failed to parse scanner session:', error);
        clearSession();
      }
    } else {
      setSessionToRecover(null);
    }
  }, [open, clearSession, toast]);

  const restoreSession = () => {
    if (sessionToRecover) {
      setScannedImages(sessionToRecover.scannedImages || []);
      setDocumentName(sessionToRecover.documentName || '');
      toast({
        title: 'Session Restored',
        description: 'Your previous scanning session has been restored.',
      });
      setSessionToRecover(null); // Hide recovery prompt
    }
  };

  const discardSession = () => {
    clearSession();
    setSessionToRecover(null);
    toast({
      title: 'Session Discarded',
      description: 'Previous session has been cleared.',
      variant: 'default',
    });
  };

  const captureImage = async () => {
    if (isCapturing) return;

    try {
      setIsCapturing(true);

      if (window.history && window.history.pushState) {
        window.history.pushState(null, '', window.location.href);
      }

      const image = await Camera.getPhoto({
        quality: 90,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        width: 1024,
        height: 1024,
        correctOrientation: true,
        saveToGallery: false,
        presentationStyle: 'fullscreen',
        promptLabelCancel: 'Cancel',
        promptLabelPhoto: 'Choose from Gallery',
        promptLabelPicture: 'Take Photo',
      });

      if (image.dataUrl) {
        const newImage: ScannedImage = {
          id: `${Date.now()}-${Math.random()}`,
          dataUrl: image.dataUrl,
          timestamp: new Date(),
        };

        const updatedImages = [...scannedImages, newImage];
        setScannedImages(updatedImages);
        saveSession(updatedImages, documentName);

        toast({
          title: 'Image Captured',
          description: `Page ${updatedImages.length} captured successfully.`,
        });
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('cancelled') || error.message.includes('cancel')) {
          console.log('Camera capture cancelled by user');
          return;
        }
        
        if (error.message.includes('permission')) {
          toast({
            title: 'Camera Permission Required',
            description: 'Please enable camera access in your device settings.',
            variant: 'destructive',
          });
          return;
        }
      }
      
      toast({
        title: 'Camera Error',
        description: 'Failed to capture image. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCapturing(false);
    }
  };

  const removeImage = (id: string) => {
    const updatedImages = scannedImages.filter(img => img.id !== id);
    setScannedImages(updatedImages);
    saveSession(updatedImages, documentName);
  };

  const handleDocumentNameChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newName = e.target.value;
    setDocumentName(newName);
    saveSession(scannedImages, newName);
  };

  const generatePDF = async () => {
    if (scannedImages.length === 0) {
      toast({
        title: "No images",
        description: "Please capture at least one image before generating PDF",
        variant: "destructive",
      });
      return;
    }

    if (!documentName.trim()) {
      toast({
        title: "Document name required",
        description: "Please enter a name for your document",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingPDF(true);

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      for (let i = 0; i < scannedImages.length; i++) {
        const image = scannedImages[i];
        
        if (i > 0) {
          pdf.addPage();
        }

        // Calculate dimensions to fit the page while maintaining aspect ratio
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 10;
        const maxWidth = pageWidth - (margin * 2);
        const maxHeight = pageHeight - (margin * 2);

        pdf.addImage(
          image.dataUrl,
          'JPEG',
          margin,
          margin,
          maxWidth,
          maxHeight,
          undefined,
          'FAST'
        );
      }

      // Convert PDF to blob and then to File
      const pdfBlob = pdf.output('blob');
      const pdfFile = new File([pdfBlob], `${documentName}.pdf`, {
        type: 'application/pdf',
        lastModified: Date.now(),
      });

      onScanComplete(pdfFile);

      // Reset state and clear session
      setScannedImages([]);
      setDocumentName('');
      clearSession();
      onClose();

      toast({
        title: 'PDF Generated',
        description: `Document "${documentName}" is ready for upload.`,
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'PDF Generation Failed',
        description: 'An unexpected error occurred while generating the PDF.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const uploadImages = async () => {
    if (scannedImages.length === 0) {
      toast({
        title: "No images",
        description: "Please capture at least one image before uploading",
        variant: "destructive",
      });
      return;
    }

    if (!documentName.trim()) {
      toast({
        title: "Document name required",
        description: "Please enter a name for your document",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingImages(true);

    try {
      const imageFiles: File[] = [];
      
      for (let i = 0; i < scannedImages.length; i++) {
        const image = scannedImages[i];
        
        // Convert dataUrl to blob and then to File
        const response = await fetch(image.dataUrl);
        const blob = await response.blob();
        const fileName = scannedImages.length > 1 
          ? `${documentName}_page_${i + 1}.jpg`
          : `${documentName}.jpg`;
          
        const imageFile = new File([blob], fileName, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });
        
        imageFiles.push(imageFile);
      }

      if (onImagesComplete) {
        onImagesComplete(imageFiles);
      } else {
        // Fallback: upload first image using onScanComplete
        onScanComplete(imageFiles[0]);
      }

      // Reset state and clear session
      setScannedImages([]);
      setDocumentName('');
      clearSession();
      onClose();

      toast({
        title: 'Images Ready',
        description: `${imageFiles.length} image(s) ready for upload.`,
      });
    } catch (error) {
      console.error('Error preparing images:', error);
      toast({
        title: 'Image Preparation Failed',
        description: 'Could not prepare images for upload. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingImages(false);
    }
  };

  const handleClose = () => {
    // Don't clear session on close, as user might reopen it
    setScannedImages([]);
    setDocumentName('');
    setIsCapturing(false);
    onClose();
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      handleClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CameraIcon className="h-5 w-5" />
            Document Scanner
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {sessionToRecover && (
            <Card className="border-yellow-400 bg-yellow-50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <AlertTriangle className="mr-2 h-5 w-5 text-yellow-600" />
                  <span>Restore Previous Session?</span>
                </CardTitle>
                <CardDescription className="text-yellow-700">
                  We found a saved scanning session. Do you want to continue?
                </CardDescription>
              </CardHeader>
              <CardContent className="flex gap-4">
                <Button onClick={restoreSession} className="w-full">
                  Yes, Continue
                </Button>
                <Button
                  onClick={discardSession}
                  variant="outline"
                  className="w-full"
                >
                  No, Start New
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Camera Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Capture Document</CardTitle>
              <CardDescription>
                Use your device's camera to capture pages. You can scan
                multiple pages into a single document.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={captureImage}
                className="w-full"
                size="lg"
                disabled={isCapturing}
              >
                <CameraIcon className="mr-2 h-5 w-5" />
                {isCapturing
                  ? 'Opening Camera...'
                  : `Capture Page ${scannedImages.length + 1}`}
              </Button>
            </CardContent>
          </Card>

          {/* Scanned Images Preview */}
          {scannedImages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>Scanned Pages</span>
                  <Badge variant="secondary">
                    {scannedImages.length} page{scannedImages.length !== 1 ? 's' : ''}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {scannedImages.map((image, index) => (
                    <div key={image.id} className="relative">
                      <img
                        src={image.dataUrl}
                        alt={`Scanned page ${index + 1}`}
                        className="w-full h-32 object-cover rounded-md border"
                      />
                      <div className="absolute top-2 left-2">
                        <Badge variant="secondary" className="text-xs">
                          Page {index + 1}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="absolute top-2 right-2 h-6 w-6 p-0"
                        onClick={() => removeImage(image.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Document Name */}
          {scannedImages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Document Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="documentName">Document Name</Label>
                  <Input
                    id="documentName"
                    value={documentName}
                    onChange={handleDocumentNameChange}
                    placeholder="Enter document name (e.g., Medical Report 2024)"
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-between gap-4">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <div className="flex gap-2">
              {scannedImages.length > 0 && (
                <Button
                  onClick={captureImage}
                  variant="outline"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Page
                </Button>
              )}
              {scannedImages.length > 0 && (
                <>
                  <Button
                    onClick={uploadImages}
                    variant="secondary"
                    disabled={scannedImages.length === 0 || !documentName.trim() || isUploadingImages}
                  >
                    {isUploadingImages ? (
                      <>
                        <RotateCw className="mr-2 h-4 w-4 animate-spin" />
                        Preparing Images...
                      </>
                    ) : (
                      <>
                        <CameraIcon className="mr-2 h-4 w-4" />
                        Upload as Images
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={generatePDF}
                    disabled={scannedImages.length === 0 || !documentName.trim() || isGeneratingPDF}
                  >
                    {isGeneratingPDF ? (
                      <>
                        <RotateCw className="mr-2 h-4 w-4 animate-spin" />
                        Generating PDF...
                      </>
                    ) : (
                      <>
                        <FileText className="mr-2 h-4 w-4" />
                        Generate PDF
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};