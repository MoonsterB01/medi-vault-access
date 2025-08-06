import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, FileText, Download, Calendar, Tag } from "lucide-react";

interface Document {
  id: string;
  filename: string;
  document_type: string;
  description: string;
  uploaded_at: string;
  file_size: number;
  tags: string[];
  signed_url?: string;
  patients: {
    name: string;
    shareable_id: string;
  };
}

interface DocumentSearchProps {
  patientId?: string;
}

export default function DocumentSearch({ patientId }: DocumentSearchProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [selectedTags, setSelectedTags] = useState("");
  const { toast } = useToast();

  const searchDocuments = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        'https://qiqepumdtaozjzfjbggl.supabase.co/functions/v1/search-documents',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            patientId: patientId || undefined,
            query: searchQuery || undefined,
            documentType: documentType && documentType !== "all_types" ? documentType : undefined,
            tags: selectedTags ? selectedTags.split(',').map(tag => tag.trim()) : undefined,
            limit: 50,
            offset: 0
          }),
        }
      );

      const result = await response.json();

      if (response.ok) {
        setDocuments(result.documents || []);
      } else {
        throw new Error(result.error || 'Search failed');
      }
    } catch (error: any) {
      toast({
        title: "Search Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    searchDocuments();
  }, [patientId]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchDocuments();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDocumentType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Documents
          </CardTitle>
          <CardDescription>
            Search through medical documents and records
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search-query">Search Text</Label>
                <Input
                  id="search-query"
                  placeholder="Search in document names, descriptions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="document-type-filter">Document Type</Label>
                <Select value={documentType} onValueChange={setDocumentType}>
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_types">All Types</SelectItem>
                    <SelectItem value="lab_report">Lab Report</SelectItem>
                    <SelectItem value="prescription">Prescription</SelectItem>
                    <SelectItem value="x_ray">X-Ray</SelectItem>
                    <SelectItem value="mri_scan">MRI Scan</SelectItem>
                    <SelectItem value="ct_scan">CT Scan</SelectItem>
                    <SelectItem value="ultrasound">Ultrasound</SelectItem>
                    <SelectItem value="discharge_summary">Discharge Summary</SelectItem>
                    <SelectItem value="consultation_notes">Consultation Notes</SelectItem>
                    <SelectItem value="insurance_document">Insurance Document</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags-filter">Tags</Label>
                <Input
                  id="tags-filter"
                  placeholder="urgent, follow-up, chronic..."
                  value={selectedTags}
                  onChange={(e) => setSelectedTags(e.target.value)}
                />
              </div>
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? "Searching..." : "Search Documents"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Search Results</CardTitle>
          <CardDescription>
            {documents.length} document{documents.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {documents.length > 0 ? (
            <div className="space-y-4">
              {documents.map((doc) => (
                <div key={doc.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h3 className="font-semibold flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        {doc.filename}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Patient: {doc.patients.name} (ID: {doc.patients.shareable_id})
                      </p>
                      {doc.description && (
                        <p className="text-sm">{doc.description}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant="outline">
                        {formatDocumentType(doc.document_type)}
                      </Badge>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Calendar className="h-4 w-4" />
                        {new Date(doc.uploaded_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-500">
                        Size: {formatFileSize(doc.file_size)}
                      </span>
                      {doc.tags && doc.tags.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Tag className="h-4 w-4 text-gray-400" />
                          <div className="flex gap-1">
                            {doc.tags.map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {doc.signed_url && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={doc.signed_url} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4 mr-2" />
                          View/Download
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Documents Found
              </h3>
              <p className="text-gray-600">
                Try adjusting your search criteria or upload some documents first.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}