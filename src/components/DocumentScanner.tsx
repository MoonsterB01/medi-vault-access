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

interface DocumentScannerProps {
  open: boolean;
  onClose: () => void;
  onScanComplete: (pdfFile: File) => void;
}

interface ScannedImage {
  id: string;
  dataUrl: string;
  timestamp: Date;
}

export const DocumentScanner: React.FC<DocumentScannerProps> = ({
  open,
  onClose,
  onScanComplete,
}) => {
  const [scannedImages, setScannedImages] = useState<ScannedImage[]>([]);
  const [documentName, setDocumentName] = useState('');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const { toast } = useToast();

  const captureImage = async () => {
    try {
      console.log('Starting camera capture...');
      
      const image = await Camera.getPhoto({
        quality: 80,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        width: 1024,
        height: 1024,
        correctOrientation: true,
        saveToGallery: false,
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
          return updated;
        });
        
        toast({
          title: "Image captured",
          description: "Document page captured successfully",
        });
        
        console.log('Image capture process completed successfully');
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

  const handleClose = () => {
    setScannedImages([]);
    setDocumentName('');
    onClose();
  };

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
              >
                <CameraIcon className="mr-2 h-5 w-5" />
                Capture Page {scannedImages.length + 1}
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
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};