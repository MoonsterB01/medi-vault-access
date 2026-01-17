import { useState } from "react";
import { 
  FileText, Calendar, Trash2, Download, Bot, Loader2, Copy, 
  CheckCircle, AlertTriangle, AlertCircle, Tag, Brain, 
  Users, Stethoscope, Pill, MapPin, ChevronDown, ChevronUp,
  Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { triggerDocumentDownload, viewDocument } from "@/lib/storage";

interface MobileDocumentsTabProps {
  documents: any[];
  prescriptions: any[];
  onDeleteDocument: (id: string, filename: string) => void;
}

export function MobileDocumentsTab({ 
  documents, 
  prescriptions, 
  onDeleteDocument 
}: MobileDocumentsTabProps) {
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSummary, setGeneratedSummary] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    summary: true,
    info: false,
    keywords: false,
    entities: false,
    text: false,
  });
  const { toast } = useToast();

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + ['B', 'KB', 'MB', 'GB'][i];
  };

  const formatDocumentType = (type: string) => {
    return type ? type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Document';
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleDownload = async (doc: any) => {
    try {
      await triggerDocumentDownload(doc.file_path, doc.filename);
      toast({ title: "Download started" });
    } catch (error) {
      console.error('Download error:', error);
      toast({ title: "Download failed", description: "Could not download the document", variant: "destructive" });
    }
  };

  const handleViewDocument = async (doc: any) => {
    try {
      await viewDocument(doc.file_path);
    } catch (error) {
      console.error('View error:', error);
      toast({ title: "Could not open document", description: "Please try again", variant: "destructive" });
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: `${label} copied to clipboard` });
  };

  const generateSummary = async (doc: any) => {
    if (doc.ai_summary) {
      setGeneratedSummary(doc.ai_summary);
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-document-summary', {
        body: { documentId: doc.id }
      });

      if (error) throw error;
      setGeneratedSummary(data?.summary || "No summary available");
    } catch (error) {
      console.error('Summary generation error:', error);
      toast({ title: "Could not generate summary", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const openDocumentSheet = (doc: any) => {
    setSelectedDoc(doc);
    setGeneratedSummary(doc.ai_summary || null);
    setExpandedSections({ summary: true, info: false, keywords: false, entities: false, text: false });
  };

  const closeSheet = () => {
    setSelectedDoc(null);
    setGeneratedSummary(null);
  };

  const getVerificationStatusColor = (status: string) => {
    switch (status) {
      case 'verified_medical':
        return 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800';
      case 'user_verified_medical':
        return 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800';
      case 'not_medical':
        return 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getVerificationIcon = (status: string) => {
    switch (status) {
      case 'verified_medical':
        return <CheckCircle className="h-3 w-3" />;
      case 'user_verified_medical':
        return <AlertTriangle className="h-3 w-3" />;
      default:
        return <AlertCircle className="h-3 w-3" />;
    }
  };

  const formatVerificationStatus = (status: string) => {
    switch (status) {
      case 'verified_medical': return 'Verified Medical';
      case 'user_verified_medical': return 'User Verified';
      case 'unverified': return 'Unverified';
      case 'not_medical': return 'Not Medical';
      default: return 'Unknown';
    }
  };

  const hasAnalysisData = (doc: any) => {
    return (doc.auto_categories?.length > 0) || 
           (doc.content_keywords?.length > 0) || 
           (doc.extracted_entities && Object.keys(doc.extracted_entities).length > 0);
  };

  return (
    <div className="space-y-6">
      {/* Prescriptions Section */}
      <section>
        <h2 className="text-sm font-semibold mb-3 px-1">My Prescriptions</h2>
        {prescriptions.length > 0 ? (
          <div className="space-y-2">
            {prescriptions.map((rx) => (
              <div
                key={rx.id}
                className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{rx.prescription_id}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    Dr. {rx.doctors?.users?.name || 'Unknown'}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(rx.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground text-sm bg-muted/30 rounded-lg">
            No prescriptions yet
          </div>
        )}
      </section>

      {/* Documents Section */}
      <section>
        <h2 className="text-sm font-semibold mb-3 px-1">
          Uploaded Documents ({documents.length})
        </h2>
        {documents.length > 0 ? (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                onClick={() => openDocumentSheet(doc)}
                className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg cursor-pointer active:bg-accent/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                  <FileText className="h-5 w-5 text-secondary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{doc.filename}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDocumentType(doc.document_type)} • {formatFileSize(doc.file_size)}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-muted-foreground">
                      {new Date(doc.uploaded_at).toLocaleDateString()}
                    </span>
                    {doc.ai_summary && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        <Bot className="h-2.5 w-2.5 mr-0.5" />
                        Summary
                      </Badge>
                    )}
                    {hasAnalysisData(doc) && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        <Brain className="h-2.5 w-2.5 mr-0.5" />
                        Analyzed
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground text-sm bg-muted/30 rounded-lg">
            No documents uploaded yet
          </div>
        )}
      </section>

      {/* Document Detail Sheet - Full Featured */}
      <Sheet open={!!selectedDoc} onOpenChange={(open) => !open && closeSheet()}>
        <SheetContent side="bottom" className="h-[90vh] rounded-t-2xl p-0">
          <div className="flex flex-col h-full">
            <SheetHeader className="text-left p-4 pb-2 border-b border-border">
              <SheetTitle className="text-base truncate pr-8 flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="truncate">{selectedDoc?.filename}</span>
              </SheetTitle>
            </SheetHeader>

            {selectedDoc && (
              <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-safe">
                
                {/* Quick Actions */}
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleViewDocument(selectedDoc)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleDownload(selectedDoc)}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      onDeleteDocument(selectedDoc.id, selectedDoc.filename);
                      closeSheet();
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>

                {/* AI Summary Section */}
                <Collapsible open={expandedSections.summary} onOpenChange={() => toggleSection('summary')}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-primary/5 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold">AI Summary</span>
                    </div>
                    {expandedSections.summary ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2">
                    <div className="p-3 bg-muted/50 rounded-lg">
                      {isGenerating ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          <span className="ml-2 text-sm text-muted-foreground">Generating...</span>
                        </div>
                      ) : generatedSummary ? (
                        <div className="space-y-2">
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{generatedSummary}</p>
                          <Button size="sm" variant="ghost" onClick={() => copyToClipboard(generatedSummary, "Summary")}>
                            <Copy className="h-3 w-3 mr-1" /> Copy
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center py-2">
                          <p className="text-sm text-muted-foreground mb-2">No summary available</p>
                          <Button size="sm" onClick={() => generateSummary(selectedDoc)}>
                            <Bot className="h-4 w-4 mr-1" /> Generate Summary
                          </Button>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Document Info Section */}
                <Collapsible open={expandedSections.info} onOpenChange={() => toggleSection('info')}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-secondary/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span className="text-sm font-semibold">Document Info</span>
                    </div>
                    {expandedSections.info ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2">
                    <div className="p-3 bg-muted/30 rounded-lg space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><span className="text-muted-foreground">Type:</span> {selectedDoc.content_type || 'N/A'}</div>
                        <div><span className="text-muted-foreground">Size:</span> {formatFileSize(selectedDoc.file_size)}</div>
                        <div className="col-span-2"><span className="text-muted-foreground">Uploaded:</span> {new Date(selectedDoc.uploaded_at).toLocaleString()}</div>
                      </div>
                      
                      <Separator />
                      
                      <div className="flex flex-wrap gap-2">
                        {selectedDoc.verification_status && (
                          <Badge className={`${getVerificationStatusColor(selectedDoc.verification_status)} flex items-center gap-1 text-xs`}>
                            {getVerificationIcon(selectedDoc.verification_status)}
                            {formatVerificationStatus(selectedDoc.verification_status)}
                          </Badge>
                        )}
                        {selectedDoc.content_confidence > 0 && (
                          <Badge variant="outline" className="text-xs">
                            Confidence: {(selectedDoc.content_confidence * 100).toFixed(0)}%
                          </Badge>
                        )}
                        {selectedDoc.medical_keyword_count > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {selectedDoc.medical_keyword_count} keywords
                          </Badge>
                        )}
                      </div>

                      {selectedDoc.content_confidence > 0 && (
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground">Confidence Score</span>
                          <Progress value={selectedDoc.content_confidence * 100} className="h-2" />
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Categories & Keywords Section */}
                {(selectedDoc.auto_categories?.length > 0 || selectedDoc.content_keywords?.length > 0) && (
                  <Collapsible open={expandedSections.keywords} onOpenChange={() => toggleSection('keywords')}>
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-secondary/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4" />
                        <span className="text-sm font-semibold">Categories & Keywords</span>
                        <Badge variant="secondary" className="text-[10px] ml-1">
                          {(selectedDoc.auto_categories?.length || 0) + (selectedDoc.content_keywords?.length || 0)}
                        </Badge>
                      </div>
                      {expandedSections.keywords ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2">
                      <div className="p-3 bg-muted/30 rounded-lg space-y-3">
                        {selectedDoc.auto_categories?.length > 0 && (
                          <div>
                            <div className="flex items-center gap-1 mb-2">
                              <Brain className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs font-medium text-muted-foreground">Categories</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {selectedDoc.auto_categories.map((cat: string, i: number) => (
                                <Badge key={i} variant="secondary" className="text-xs">{cat}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {selectedDoc.content_keywords?.length > 0 && (
                          <div>
                            <div className="flex items-center gap-1 mb-2">
                              <Tag className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs font-medium text-muted-foreground">Keywords</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {selectedDoc.content_keywords.map((kw: string, i: number) => (
                                <Badge key={i} variant="outline" className="text-xs">{kw}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {/* Extracted Entities Section */}
                {selectedDoc.extracted_entities && Object.keys(selectedDoc.extracted_entities).length > 0 && (
                  <Collapsible open={expandedSections.entities} onOpenChange={() => toggleSection('entities')}>
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-secondary/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Stethoscope className="h-4 w-4" />
                        <span className="text-sm font-semibold">Medical Entities</span>
                      </div>
                      {expandedSections.entities ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2">
                      <div className="p-3 bg-muted/30 rounded-lg space-y-3">
                        {/* Doctors */}
                        {selectedDoc.extracted_entities.doctors?.length > 0 && (
                          <div>
                            <div className="flex items-center gap-1 mb-1">
                              <Users className="h-3 w-3 text-blue-600" />
                              <span className="text-xs font-medium text-muted-foreground">Doctors</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {selectedDoc.extracted_entities.doctors.map((doc: string, i: number) => (
                                <Badge key={i} className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-0">{doc}</Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Conditions */}
                        {selectedDoc.extracted_entities.conditions?.length > 0 && (
                          <div>
                            <div className="flex items-center gap-1 mb-1">
                              <AlertCircle className="h-3 w-3 text-red-600" />
                              <span className="text-xs font-medium text-muted-foreground">Conditions</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {selectedDoc.extracted_entities.conditions.map((cond: string, i: number) => (
                                <Badge key={i} className="text-xs bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 border-0">{cond}</Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Medications */}
                        {selectedDoc.extracted_entities.medications?.length > 0 && (
                          <div>
                            <div className="flex items-center gap-1 mb-1">
                              <Pill className="h-3 w-3 text-green-600" />
                              <span className="text-xs font-medium text-muted-foreground">Medications</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {selectedDoc.extracted_entities.medications.map((med: any, i: number) => {
                                const label = typeof med === 'string' ? med : `${med.name}${med.dose ? ` - ${med.dose}` : ''}`;
                                return <Badge key={i} className="text-xs bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 border-0">{label}</Badge>;
                              })}
                            </div>
                          </div>
                        )}

                        {/* Tests */}
                        {selectedDoc.extracted_entities.tests?.length > 0 && (
                          <div>
                            <div className="flex items-center gap-1 mb-1">
                              <Brain className="h-3 w-3 text-purple-600" />
                              <span className="text-xs font-medium text-muted-foreground">Tests</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {selectedDoc.extracted_entities.tests.map((test: string, i: number) => (
                                <Badge key={i} className="text-xs bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 border-0">{test}</Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Lab Results */}
                        {selectedDoc.extracted_entities.labResults?.length > 0 && (
                          <div>
                            <div className="flex items-center gap-1 mb-1">
                              <Brain className="h-3 w-3 text-indigo-600" />
                              <span className="text-xs font-medium text-muted-foreground">Lab Results</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {selectedDoc.extracted_entities.labResults.map((lab: any, i: number) => {
                                const label = typeof lab === 'string' ? lab : `${lab.test}: ${lab.value}${lab.unit ? ' ' + lab.unit : ''}`;
                                return <Badge key={i} variant="outline" className="text-xs">{label}</Badge>;
                              })}
                            </div>
                          </div>
                        )}

                        {/* Dates */}
                        {selectedDoc.extracted_entities.dates?.length > 0 && (
                          <div>
                            <div className="flex items-center gap-1 mb-1">
                              <Calendar className="h-3 w-3 text-orange-600" />
                              <span className="text-xs font-medium text-muted-foreground">Important Dates</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {selectedDoc.extracted_entities.dates.map((date: string, i: number) => (
                                <Badge key={i} variant="outline" className="text-xs">{date}</Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Facilities */}
                        {selectedDoc.extracted_entities.facilities?.length > 0 && (
                          <div>
                            <div className="flex items-center gap-1 mb-1">
                              <MapPin className="h-3 w-3 text-amber-600" />
                              <span className="text-xs font-medium text-muted-foreground">Facilities</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {selectedDoc.extracted_entities.facilities.map((fac: string, i: number) => (
                                <Badge key={i} className="text-xs bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border-0">{fac}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {/* Extracted Text Section */}
                {(selectedDoc.ocr_extracted_text || selectedDoc.extracted_text) && (
                  <Collapsible open={expandedSections.text} onOpenChange={() => toggleSection('text')}>
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-secondary/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span className="text-sm font-semibold">Extracted Text</span>
                      </div>
                      {expandedSections.text ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2">
                      <div className="p-3 bg-muted/30 rounded-lg space-y-2">
                        <div className="flex justify-end">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => copyToClipboard(selectedDoc.ocr_extracted_text || selectedDoc.extracted_text, "Extracted text")}
                          >
                            <Copy className="h-3 w-3 mr-1" /> Copy
                          </Button>
                        </div>
                        <div className="max-h-48 overflow-y-auto bg-background p-2 rounded border">
                          <pre className="whitespace-pre-wrap text-xs font-mono text-muted-foreground">
                            {selectedDoc.ocr_extracted_text || selectedDoc.extracted_text}
                          </pre>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {/* Structural Cues */}
                {selectedDoc.structural_cues && Object.keys(selectedDoc.structural_cues).length > 0 && (
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-semibold text-muted-foreground">Document Structure</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(selectedDoc.structural_cues).map(([cue, value]: [string, any]) => (
                        <Badge 
                          key={cue} 
                          variant={value ? "default" : "secondary"} 
                          className="text-[10px]"
                        >
                          {cue.replace(/([A-Z])/g, ' $1').trim()}: {value ? "✓" : "✗"}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
