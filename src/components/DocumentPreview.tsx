import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Download, ExternalLink } from "lucide-react";

interface DocumentPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  document: {
    id: string;
    filename: string;
    content_type?: string;
    signed_url?: string;
  } | null;
}

export default function DocumentPreview({ isOpen, onClose, document }: DocumentPreviewProps) {
  const [loading, setLoading] = useState(true);

  if (!document) return null;

  const isImage = document.content_type?.startsWith('image/');
  const isPDF = document.content_type === 'application/pdf';
  const isText = document.content_type?.startsWith('text/');

  const renderPreview = () => {
    if (!document.signed_url) {
      return (
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Preview not available</p>
        </div>
      );
    }

    if (isImage) {
      return (
        <img 
          src={document.signed_url}
          alt={document.filename}
          className="max-w-full max-h-[70vh] object-contain mx-auto"
          onLoad={() => setLoading(false)}
          onError={() => setLoading(false)}
        />
      );
    }

    if (isPDF) {
      return (
        <iframe
          src={document.signed_url}
          className="w-full h-[70vh] border-0"
          title={document.filename}
          onLoad={() => setLoading(false)}
        />
      );
    }

    if (isText) {
      return (
        <iframe
          src={document.signed_url}
          className="w-full h-[70vh] border border-border rounded"
          title={document.filename}
          onLoad={() => setLoading(false)}
        />
      );
    }

    // For other file types, show a message with download option
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <p className="text-muted-foreground">
          Preview not available for this file type
        </p>
        <Button asChild>
          <a href={document.signed_url} target="_blank" rel="noopener noreferrer">
            <Download className="h-4 w-4 mr-2" />
            Download to view
          </a>
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="truncate">{document.filename}</span>
            <div className="flex gap-2">
              {document.signed_url && (
                <Button variant="outline" size="sm" asChild>
                  <a href={document.signed_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open
                  </a>
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}
          {renderPreview()}
        </div>
      </DialogContent>
    </Dialog>
  );
}