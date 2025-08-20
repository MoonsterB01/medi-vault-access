import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  FileText, 
  Calendar, 
  Clock, 
  Search, 
  Download, 
  Tag,
  Filter,
  Trash2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DocumentData {
  id: string;
  filename: string;
  document_type: string;
  description: string;
  uploaded_at: string;
  file_size: number;
  tags: string[];
  file_path: string;
}

interface GroupedDocuments {
  [key: string]: DocumentData[];
}

export default function DocumentTimeline() {
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<DocumentData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkUserAndFetchDocuments();
  }, []);

  useEffect(() => {
    // Filter documents based on search query
    if (!searchQuery.trim()) {
      setFilteredDocuments(documents);
    } else {
      const filtered = documents.filter(doc =>
        doc.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.document_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredDocuments(filtered);
    }
  }, [searchQuery, documents]);

  const checkUserAndFetchDocuments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (!userData) {
        toast({
          title: "Error",
          description: "User profile not found",
          variant: "destructive",
        });
        return;
      }

      setUser(userData);

      // Get patient ID for this user
      const { data: familyAccess } = await supabase
        .from('family_access')
        .select('patient_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (familyAccess?.patient_id) {
        await fetchDocuments(familyAccess.patient_id);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load documents",
        variant: "destructive",
      });
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

      if (error) {
        console.error('Documents fetch error:', error);
        toast({
          title: "Error",
          description: `Failed to load documents: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      setDocuments(docs || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: "Error",
        description: "An error occurred while loading documents",
        variant: "destructive",
      });
    }
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

      if (error) {
        throw error;
      }

      toast({
        title: "Document Deleted",
        description: `${filename} has been deleted successfully.`,
      });

      // Remove the document from the local state
      setDocuments(prevDocs => prevDocs.filter(doc => doc.id !== documentId));
    } catch (error: any) {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete document. Please try again.",
        variant: "destructive",
      });
    }
  };

  const groupDocumentsByDate = (docs: DocumentData[]): GroupedDocuments => {
    const groups: GroupedDocuments = {};
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const thisWeekStart = new Date(today.getTime() - (today.getDay() * 24 * 60 * 60 * 1000));
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    docs.forEach(doc => {
      const docDate = new Date(doc.uploaded_at);
      const docDay = new Date(docDate.getFullYear(), docDate.getMonth(), docDate.getDate());

      let groupKey = '';
      
      if (docDay.getTime() === today.getTime()) {
        groupKey = 'Today';
      } else if (docDay.getTime() === yesterday.getTime()) {
        groupKey = 'Yesterday';
      } else if (docDay >= thisWeekStart) {
        groupKey = 'This Week';
      } else if (docDay >= thisMonthStart) {
        groupKey = 'This Month';
      } else {
        groupKey = 'Earlier';
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(doc);
    });

    return groups;
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

  const formatUploadTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const groupedDocuments = groupDocumentsByDate(filteredDocuments);
  const groupOrder = ['Today', 'Yesterday', 'This Week', 'This Month', 'Earlier'];
  const orderedGroups = groupOrder.filter(group => groupedDocuments[group]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading timeline...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/patient-dashboard')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
            <div className="flex items-center gap-3">
              <Clock className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Document Timeline</h1>
                <p className="text-muted-foreground">Chronological view of your medical documents</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Search and Filter Bar */}
        <div className="mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search documents by name, type, or description..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {filteredDocuments.length} of {documents.length} documents
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Timeline */}
        <div className="relative">
          {orderedGroups.length > 0 ? (
            <div className="space-y-12">
              {/* Timeline Line */}
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border hidden md:block"></div>

              {orderedGroups.map((groupKey) => (
                <div key={groupKey} className="space-y-6">
                  {/* Date Group Header */}
                  <div className="flex items-center gap-4">
                    <div className="relative md:ml-6">
                      <div className="hidden md:block absolute -left-6 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-primary rounded-full border-4 border-background"></div>
                      <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-primary md:hidden" />
                        {groupKey}
                      </h2>
                    </div>
                  </div>

                  {/* Documents in this group */}
                  <div className="space-y-4 md:ml-16">
                    {groupedDocuments[groupKey].map((doc, index) => (
                      <Card key={doc.id} className="relative group hover:shadow-md transition-shadow duration-200">
                        {/* Timeline connector */}
                        <div className="hidden md:block absolute -left-16 top-8 w-12 h-0.5 bg-border group-hover:bg-primary transition-colors duration-200"></div>
                        
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1 flex-1">
                              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                                <FileText className="h-4 w-4 text-primary" />
                                {doc.filename}
                              </CardTitle>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatUploadTime(doc.uploaded_at)}
                                </span>
                                <span>{formatFileSize(doc.file_size)}</span>
                                <Badge variant="secondary" className="text-xs">
                                  {formatDocumentType(doc.document_type)}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <Button size="sm" variant="ghost">
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteDocument(doc.id, doc.filename);
                                }}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                title="Delete document"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className="pt-0">
                          {doc.description && (
                            <CardDescription className="mb-3 text-sm">
                              {doc.description}
                            </CardDescription>
                          )}

                          {doc.tags && doc.tags.length > 0 && (
                            <div className="flex items-center gap-2 flex-wrap">
                              <Tag className="h-3 w-3 text-muted-foreground" />
                              {doc.tags.map((tag, tagIndex) => (
                                <Badge 
                                  key={tagIndex} 
                                  variant="outline" 
                                  className="text-xs"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {searchQuery ? 'No documents found' : 'No documents yet'}
              </h3>
              <p className="text-muted-foreground mb-6">
                {searchQuery 
                  ? 'Try adjusting your search terms or clear the search to see all documents.'
                  : 'Upload your first document to start building your medical timeline.'
                }
              </p>
              {searchQuery && (
                <Button onClick={() => setSearchQuery('')} variant="outline">
                  Clear Search
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}