import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Copy, FileText, AlertCircle, CheckCircle, AlertTriangle, Bot, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface DocumentSummaryDialogProps {
  document: any;
  children: React.ReactNode;
}

export function DocumentSummaryDialog({ document, children }: DocumentSummaryDialogProps) {
  const [open, setOpen] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && document.ai_summary) {
      setAiSummary(document.ai_summary);
    } else if (open && !document.ai_summary && !isGenerating) {
      generateSummary();
    }
  }, [open]);

  const generateSummary = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-document-summary', {
        body: { documentId: document.id }
      });

      if (error) throw error;

      setAiSummary(data.summary);
      toast({
        title: "Summary Generated",
        description: "AI has analyzed the document successfully.",
      });
    } catch (error: any) {
      console.error('Error generating summary:', error);
      toast({
        title: "Summary Generation Failed",
        description: error.message || "Could not generate AI summary",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

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
        return 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800';
      case 'user_verified_medical':
        return 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800';
      case 'unverified':
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700';
      case 'not_medical':
        return 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700';
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
            <Bot className="h-5 w-5" />
            Document Summary & Analysis
          </DialogTitle>
          <DialogDescription>
            AI-powered summary and extracted content for "{document.filename}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* AI Summary Section */}
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bot className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                AI Document Summary
              </CardTitle>
              {document.summary_confidence && (
                <Badge variant="outline" className="bg-white dark:bg-gray-800">
                  Confidence: {(document.summary_confidence * 100).toFixed(0)}%
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              {isGenerating ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  Generating AI summary...
                </div>
              ) : aiSummary ? (
                <div className="space-y-3">
                  <p className="text-sm leading-relaxed text-foreground">
                    {aiSummary}
                  </p>
                  {document.summary_generated_at && (
                    <p className="text-xs text-muted-foreground">
                      Generated on {new Date(document.summary_generated_at).toLocaleString()}
                    </p>
                  )}
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => copyToClipboard(aiSummary, "AI summary")}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Summary
                  </Button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-3">No AI summary available yet</p>
                  <Button size="sm" onClick={generateSummary}>
                    <Bot className="h-4 w-4 mr-2" />
                    Generate Summary
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

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
                <div className="p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
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
                <div className="bg-muted p-4 rounded-lg border max-h-60 overflow-auto">
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
                <div className="bg-muted p-4 rounded-lg border max-h-60 overflow-auto">
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
                          <h5 className="text-sm font-medium capitalize text-muted-foreground">{entityType}:</h5>
                          <div className="flex flex-wrap gap-1 ml-4">
                            {entities.map((entity: any, index: number) => {
                              // Handle string entities
                              if (typeof entity === 'string') {
                                return (
                                  <Badge key={index} variant="outline" className="text-xs bg-blue-50 dark:bg-blue-900/50 dark:text-blue-200">
                                    {entity}
                                  </Badge>
                                );
                              }
                              // Handle object entities (medications, labResults)
                              let displayText = '';
                              if (entity.name) {
                                // Medication format: "name - dose frequency"
                                displayText = entity.dose 
                                  ? `${entity.name} - ${entity.dose}${entity.frequency ? ' ' + entity.frequency : ''}`
                                  : entity.name;
                              } else if (entity.test) {
                                // Lab result format: "test: value unit"
                                displayText = `${entity.test}: ${entity.value}${entity.unit ? ' ' + entity.unit : ''}`;
                              } else {
                                // Fallback to JSON string for unknown object types
                                displayText = JSON.stringify(entity);
                              }
                              
                              return (
                                <Badge key={index} variant="outline" className="text-xs bg-blue-50 dark:bg-blue-900/50 dark:text-blue-200">
                                  {displayText}
                                </Badge>
                              );
                            })}
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
              <CardContent className="p-6 text-center text-muted-foreground">
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