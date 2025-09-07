import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Copy, FileText, AlertCircle, CheckCircle, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ExtractTextDialogProps {
  document: any;
  children: React.ReactNode;
}

export function ExtractTextDialog({ document, children }: ExtractTextDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const getVerificationStatusColor = (status: string) => {
    switch (status) {
      case 'verified_medical':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'user_verified_medical':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'unverified':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'not_medical':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getVerificationIcon = (status: string) => {
    switch (status) {
      case 'verified_medical':
        return <CheckCircle className="h-4 w-4" />;
      case 'user_verified_medical':
        return <AlertTriangle className="h-4 w-4" />;
      case 'unverified':
      case 'not_medical':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const formatVerificationStatus = (status: string) => {
    switch (status) {
      case 'verified_medical':
        return 'Verified Medical';
      case 'user_verified_medical':
        return 'User Verified';
      case 'unverified':
        return 'Unverified';
      case 'not_medical':
        return 'Not Medical';
      default:
        return 'Unknown';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Extracted Text & Analysis
          </DialogTitle>
          <DialogDescription>
            View extracted text content and AI analysis for "{document.filename}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Document Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Document Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><strong>Filename:</strong> {document.filename}</div>
                <div><strong>Type:</strong> {document.content_type}</div>
                <div><strong>Size:</strong> {(document.file_size / 1024).toFixed(1)} KB</div>
                <div><strong>Upload Date:</strong> {new Date(document.uploaded_at).toLocaleDateString()}</div>
              </div>
              
              <Separator />
              
              <div className="flex flex-wrap gap-2">
                <Badge className={`${getVerificationStatusColor(document.verification_status)} flex items-center gap-1`}>
                  {getVerificationIcon(document.verification_status)}
                  {formatVerificationStatus(document.verification_status)}
                </Badge>
                
                {document.text_density_score > 0 && (
                  <Badge variant="outline">
                    Text Density: {document.text_density_score}
                  </Badge>
                )}
                
                {document.medical_keyword_count > 0 && (
                  <Badge variant="outline">
                    Medical Keywords: {document.medical_keyword_count}
                  </Badge>
                )}
                
                {document.content_confidence > 0 && (
                  <Badge variant="outline">
                    Confidence: {(document.content_confidence * 100).toFixed(1)}%
                  </Badge>
                )}
              </div>

              {document.processing_notes && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Processing Notes:</strong> {document.processing_notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* OCR Extracted Text */}
          {document.ocr_extracted_text && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">OCR Extracted Text</CardTitle>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => copyToClipboard(document.ocr_extracted_text, "OCR text")}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 p-4 rounded-lg border max-h-60 overflow-auto">
                  <pre className="whitespace-pre-wrap text-sm font-mono">
                    {document.ocr_extracted_text}
                  </pre>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Processed Text */}
          {document.extracted_text && document.extracted_text !== document.ocr_extracted_text && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Processed Text</CardTitle>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => copyToClipboard(document.extracted_text, "Processed text")}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 p-4 rounded-lg border max-h-60 overflow-auto">
                  <pre className="whitespace-pre-wrap text-sm font-mono">
                    {document.extracted_text}
                  </pre>
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI Analysis Results */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">AI Analysis Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Categories */}
              {document.auto_categories && document.auto_categories.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Categories:</h4>
                  <div className="flex flex-wrap gap-1">
                    {document.auto_categories.map((category: string, index: number) => (
                      <Badge key={index} variant="secondary">{category}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Keywords */}
              {document.content_keywords && document.content_keywords.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Detected Keywords:</h4>
                  <div className="flex flex-wrap gap-1">
                    {document.content_keywords.map((keyword: string, index: number) => (
                      <Badge key={index} variant="outline" className="text-xs">{keyword}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Extracted Entities */}
              {document.extracted_entities && Object.keys(document.extracted_entities).length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Extracted Entities:</h4>
                  <div className="space-y-2">
                    {Object.entries(document.extracted_entities).map(([entityType, entities]: [string, any]) => (
                      Array.isArray(entities) && entities.length > 0 && (
                        <div key={entityType}>
                          <h5 className="text-sm font-medium capitalize text-gray-700">{entityType}:</h5>
                          <div className="flex flex-wrap gap-1 ml-4">
                            {entities.map((entity: string, index: number) => (
                              <Badge key={index} variant="outline" className="text-xs bg-blue-50">
                                {entity}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              )}

              {/* Structural Cues */}
              {document.structural_cues && Object.keys(document.structural_cues).length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Document Structure:</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(document.structural_cues).map(([cue, value]: [string, any]) => (
                      <div key={cue} className="flex items-center gap-2">
                        <span className="capitalize">{cue.replace(/([A-Z])/g, ' $1').trim()}:</span>
                        <Badge variant={value ? "default" : "secondary"} className="text-xs">
                          {value ? "Yes" : "No"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* No text available */}
          {!document.ocr_extracted_text && !document.extracted_text && (
            <Card>
              <CardContent className="p-6 text-center text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No extracted text available for this document.</p>
                <p className="text-sm mt-2">
                  Text extraction may have failed or the document format may not be supported.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}