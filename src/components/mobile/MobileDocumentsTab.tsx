import { useState } from "react";
import { FileText, Calendar, Trash2, Download, Bot, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
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
  const { toast } = useToast();

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + ['B', 'KB', 'MB', 'GB'][i];
  };

  const formatDocumentType = (type: string) => {
    return type ? type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Document';
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
  };

  const closeSheet = () => {
    setSelectedDoc(null);
    setGeneratedSummary(null);
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
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {new Date(doc.uploaded_at).toLocaleDateString()}
                    </span>
                    {doc.ai_summary && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        <Bot className="h-2.5 w-2.5 mr-0.5" />
                        Summary
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

      {/* Document Detail Sheet */}
      <Sheet open={!!selectedDoc} onOpenChange={(open) => !open && closeSheet()}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
          <SheetHeader className="text-left pb-4">
            <SheetTitle className="text-base truncate pr-8">
              {selectedDoc?.filename}
            </SheetTitle>
          </SheetHeader>

          {selectedDoc && (
            <div className="space-y-4 overflow-y-auto h-[calc(100%-60px)] pb-safe">
              {/* Document Info */}
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">
                    {formatDocumentType(selectedDoc.document_type)}
                  </Badge>
                  <Badge variant="secondary">
                    {formatFileSize(selectedDoc.file_size)}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Uploaded on {new Date(selectedDoc.uploaded_at).toLocaleDateString()}
                </p>
              </div>

              {/* AI Summary Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Bot className="h-4 w-4 text-primary" />
                    AI Summary
                  </h3>
                  {!generatedSummary && !isGenerating && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => generateSummary(selectedDoc)}
                    >
                      Generate
                    </Button>
                  )}
                </div>
                
                <div className="p-3 bg-muted/50 rounded-lg min-h-[100px]">
                  {isGenerating ? (
                    <div className="flex items-center justify-center h-[100px]">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <span className="ml-2 text-sm text-muted-foreground">Generating...</span>
                    </div>
                  ) : generatedSummary ? (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {generatedSummary}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      Tap "Generate" to create an AI summary of this document
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleViewDocument(selectedDoc)}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  View
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleDownload(selectedDoc)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>

              <Button
                variant="destructive"
                className="w-full"
                onClick={() => {
                  onDeleteDocument(selectedDoc.id, selectedDoc.filename);
                  closeSheet();
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Document
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
