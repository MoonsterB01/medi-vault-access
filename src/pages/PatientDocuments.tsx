import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, FileText, Download, Trash2 } from "lucide-react";
import { ExtractTextDialog } from "@/components/ExtractTextDialog";

interface PatientDocumentsProps {
  user: any;
}

export default function PatientDocuments({ user }: PatientDocumentsProps) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchPatientAndDocuments(user.id);
    }
  }, [user]);

  const fetchPatientAndDocuments = async (userId: string) => {
    setLoading(true);
    try {
      const { data: familyAccess, error: faErr } = await supabase
        .from('family_access')
        .select(`patients(id)`)
        .eq('user_id', userId)
        .limit(1);

      if (faErr) throw faErr;

      if (familyAccess && familyAccess.length > 0 && familyAccess[0].patients) {
        const patientId = familyAccess[0].patients.id;
        await fetchDocuments(patientId);
      } else {
        toast({ title: "No Patient Record", description: "No patient record found for your account.", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to load patient data.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async (patientId: string) => {
    try {
      const { data: docs, error } = await supabase
        .from('documents')
        .select('*')
        .eq('patient_id', patientId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setDocuments(docs || []);
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to load documents.", variant: "destructive" });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + ['B', 'KB', 'MB', 'GB'][i];
  };

  const formatDocumentType = (type: string) => {
    return type ? type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Document';
  };

  const handleDeleteDocument = async (documentId: string, filename: string) => {
    if (!confirm(`Are you sure you want to delete "${filename}"?`)) return;

    try {
      const { error } = await supabase.from('documents').delete().eq('id', documentId);
      if (error) throw error;
      toast({ title: "Document Deleted", description: `${filename} has been deleted.` });
      setDocuments(prevDocs => prevDocs.filter(doc => doc.id !== documentId));
    } catch (error: any) {
      toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            My Documents
          </CardTitle>
          <CardDescription>Your uploaded medical documents</CardDescription>
        </CardHeader>
        <CardContent>
          {documents.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {documents.map((doc) => (
                <Card key={doc.id} className="p-4">
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm truncate" title={doc.filename}>{doc.filename}</h3>
                    <p className="text-xs text-muted-foreground">{formatDocumentType(doc.document_type)}</p>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground"><Calendar className="h-3 w-3 inline mr-1" />{new Date(doc.uploaded_at).toLocaleDateString()}</p>
                      <p className="text-xs text-muted-foreground">Size: {formatFileSize(doc.file_size)}</p>
                      {doc.content_confidence && <p className="text-xs text-green-600 dark:text-green-400">✓ AI Analyzed ({Math.round(doc.content_confidence * 100)}% confidence)</p>}
                    </div>
                    {doc.content_keywords && (
                      <div className="flex flex-wrap gap-1">
                        {doc.content_keywords.slice(0, 3).map((kw: string, i: number) => <Badge key={i} variant="outline" className="text-xs">{kw}</Badge>)}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={async () => {
                        const { data } = await supabase.storage.from('medical-documents').createSignedUrl(doc.file_path, 3600);
                        if (data?.signedUrl) window.open(data.signedUrl, '_blank');
                      }}>
                        <Download className="h-4 w-4 mr-2" />View
                      </Button>
                      <ExtractTextDialog document={doc}>
                        <Button size="sm" variant="outline" title="Extract text"><FileText className="h-4 w-4 mr-2" />Extract</Button>
                      </ExtractTextDialog>
                      <Button size="sm" variant="destructive" onClick={() => handleDeleteDocument(doc.id, doc.filename)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No documents found</h3>
              <p className="text-muted-foreground mb-4">Start by uploading your first medical document.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}