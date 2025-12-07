import { FileText, Calendar, Trash2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

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
      const { data, error } = await supabase.storage
        .from('documents')
        .download(doc.file_path);
      
      if (error) throw error;
      
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
    }
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
                className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg"
              >
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                  <FileText className="h-5 w-5 text-secondary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{doc.filename}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDocumentType(doc.document_type)} • {formatFileSize(doc.file_size)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(doc.uploaded_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => handleDownload(doc)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => onDeleteDocument(doc.id, doc.filename)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
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
    </div>
  );
}
