import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, FileText, Download, Trash2 } from "lucide-react";
import { ExtractTextDialog } from "@/components/ExtractTextDialog";
import PatientDashboardLayout from "./PatientDashboardLayout";

export default function PatientDocuments() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [patientData, setPatientData] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkUserAndFetchDocuments();
  }, []);

  const checkUserAndFetchDocuments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (!userData) return;
      setUser(userData);

      // Get patient data
      const { data: familyAccess } = await supabase
        .from('family_access')
        .select(`
          patient_id,
          patients:patient_id (*)
        `)
        .eq('user_id', user.id)
        .eq('can_view', true)
        .limit(1);

      if (familyAccess && familyAccess[0]?.patients) {
        const patient = familyAccess[0].patients;
        setPatientData(patient);
        await fetchDocuments(patient.id);
      }
    } catch (error) {
      console.error('Error:', error);
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
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDocumentType = (type: string) => {
    return type ? type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Document';
  };

  const handleDeleteDocument = async (documentId: string, filename: string) => {
    if (!confirm(`Are you sure you want to delete "${filename}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;

      toast({
        title: "Document Deleted",
        description: `${filename} has been deleted successfully.`,
      });

      if (patientData?.id) {
        fetchDocuments(patientData.id);
      }
    } catch (error: any) {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete document. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <PatientDashboardLayout>
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              My Documents
            </CardTitle>
            <CardDescription>
              Your uploaded medical documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            {documents.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {documents.map((doc) => (
                  <Card key={doc.id} className="p-4">
                    <div className="space-y-3">
                      <div>
                        <h3 className="font-semibold text-sm truncate" title={doc.filename}>
                          {doc.filename}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {formatDocumentType(doc.document_type)}
                        </p>
                      </div>
                      
                      {doc.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{doc.description}</p>
                      )}
                      
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3 inline mr-1" />
                          {new Date(doc.uploaded_at).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Size: {formatFileSize(doc.file_size)}
                        </p>
                        {doc.content_confidence && doc.content_confidence > 0 && (
                          <p className="text-xs text-green-600">
                            ✓ AI Analyzed ({Math.round(doc.content_confidence * 100)}% confidence)
                          </p>
                        )}
                      </div>
                      
                      {doc.content_keywords && doc.content_keywords.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground font-medium">Keywords:</p>
                          <div className="flex flex-wrap gap-1">
                            {doc.content_keywords.slice(0, 3).map((keyword: string, idx: number) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {keyword}
                              </Badge>
                            ))}
                            {doc.content_keywords.length > 3 && (
                              <span className="text-xs text-muted-foreground">+{doc.content_keywords.length - 3}</span>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {doc.auto_categories && doc.auto_categories.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground font-medium">Categories:</p>
                          <div className="flex flex-wrap gap-1">
                            {doc.auto_categories.slice(0, 2).map((category: string, idx: number) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {category}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                     
                      {doc.tags && doc.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {doc.tags.slice(0, 2).map((tag: string, index: number) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {doc.tags.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{doc.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            try {
                              const { data } = await supabase.storage
                                .from('medical-documents')
                                .createSignedUrl(doc.file_path, 3600);
                              
                              if (data?.signedUrl) {
                                window.open(data.signedUrl, '_blank');
                              } else {
                                toast({
                                  title: "Error",
                                  description: "Could not generate download link",
                                  variant: "destructive",
                                });
                              }
                            } catch (error) {
                              console.error('Error creating signed URL:', error);
                              toast({
                                title: "Error",
                                description: "Failed to open document",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          View
                        </Button>
                        
                        <ExtractTextDialog document={doc}>
                          <Button
                            size="sm"
                            variant="outline"
                            title="Extract text and view analysis"
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Extract Text
                          </Button>
                        </ExtractTextDialog>
                        
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDocument(doc.id, doc.filename);
                          }}
                          className="px-3"
                          title="Delete document"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No documents found</h3>
                <p className="text-muted-foreground mb-4">
                  Start by uploading your first medical document using the Upload section.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PatientDashboardLayout>
  );
}