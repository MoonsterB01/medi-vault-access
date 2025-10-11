import React, { useState } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Camera as CameraIcon, FileText, Plus, Trash2, RotateCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
  const { toast } = useToast();

  // Prevent navigation when modal is open
  React.useEffect(() => {
    if (open) {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = '';
      };
      
      const handlePopState = (e: PopStateEvent) => {
        e.preventDefault();
        history.pushState(null, '', location.href);
      };
      
      window.addEventListener('beforeunload', handleBeforeUnload);
      window.addEventListener('popstate', handlePopState);
      
      // Push a state to handle back button
      history.pushState(null, '', location.href);
      
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [open]);

  const captureImage = async () => {
    if (isCapturing) return; // Prevent multiple captures
    
    try {
      setIsCapturing(true);
      console.log('Starting camera capture...');
      
      // Store current state in localStorage as backup
      localStorage.setItem('scannerState', JSON.stringify({
        scannedImages,
        documentName,
        timestamp: Date.now()
      }));
      
      const image = await Camera.getPhoto({
        quality: 80,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        width: 1024,
        height: 1024,
        correctOrientation: true,
        saveToGallery: false,
        presentationStyle: 'fullscreen', // Force fullscreen on mobile
      });

      console.log('Camera capture successful, processing image...');

      if (image.dataUrl) {
        const newImage: ScannedImage = {
          id: Date.now().toString(),
          dataUrl: image.dataUrl,
          timestamp: new Date(),
        };
        
        console.log('Adding image to state...');
        setScannedImages(prev => {
          const updated = [...prev, newImage];
          console.log('Updated scanned images count:', updated.length);
          
          // Save to localStorage immediately
          localStorage.setItem('scannerImages', JSON.stringify(updated));
          
          return updated;
        });
        
        toast({
          title: "Image captured",
          description: "Document page captured successfully",
        });
        
        console.log('Image capture process completed successfully');
        
        // Clear backup state
        localStorage.removeItem('scannerState');
      } else {
        console.error('No dataUrl received from camera');
        throw new Error('No image data received');
      }
    } catch (error) {
      console.error('Error capturing image:', error);
      
      // More specific error handling
      let errorMessage = "Failed to capture image. Please try again.";
      if (error instanceof Error) {
        if (error.message.includes('User cancelled')) {
          errorMessage = "Camera capture was cancelled.";
        } else if (error.message.includes('permission')) {
          errorMessage = "Camera permission is required. Please enable camera access.";
        }
      }
      
      toast({
        title: "Camera Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsCapturing(false);
    }
  };

  const removeImage = (id: string) => {
    setScannedImages(prev => prev.filter(img => img.id !== id));
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
      
      // Reset state
      setScannedImages([]);
      setDocumentName('');
      onClose();

      toast({
        title: "PDF Generated",
        description: `Document "${documentName}" is ready for upload`,
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "PDF Generation Failed",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
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
      
      // Reset state
      setScannedImages([]);
      setDocumentName('');
      onClose();

      toast({
        title: "Images Ready",
        description: `${imageFiles.length} image(s) ready for upload`,
      });
    } catch (error) {
      console.error('Error preparing images:', error);
      toast({
        title: "Image Upload Failed",
        description: "Failed to prepare images. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingImages(false);
    }
  };

  const handleClose = () => {
    // Clear localStorage when closing
    localStorage.removeItem('scannerImages');
    localStorage.removeItem('scannerState');
    setScannedImages([]);
    setDocumentName('');
    setIsCapturing(false);
    onClose();
  };

  // Restore state on mount if available
  React.useEffect(() => {
    if (open) {
      const savedImages = localStorage.getItem('scannerImages');
      if (savedImages) {
        try {
          const images = JSON.parse(savedImages);
          setScannedImages(images);
          console.log('Restored scanner images from localStorage:', images.length);
        } catch (error) {
          console.error('Failed to restore scanner images:', error);
        }
      }
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CameraIcon className="h-5 w-5" />
            Document Scanner
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Camera Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Capture Document</CardTitle>
              <CardDescription>
                Use your device camera to capture document pages. You can scan multiple pages into a single PDF.
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
                {isCapturing ? 'Opening Camera...' : `Capture Page ${scannedImages.length + 1}`}
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
                    onChange={(e) => setDocumentName(e.target.value)}
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