import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { FileText, Calendar, Clock, Search, Download, Trash2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/**
 * @interface DocumentData
 * @description Defines the structure of a document data object for the timeline.
 */
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

/**
 * @interface GroupedDocuments
 * @description Defines the structure of documents grouped by date.
 */
interface GroupedDocuments {
  [key: string]: DocumentData[];
}

/**
 * @interface DocumentTimelineProps
 * @description Defines the props for the DocumentTimeline component.
 * @property {any} [user] - The current user object.
 */
interface DocumentTimelineProps {
  user?: any;
}

/**
 * @function DocumentTimeline
 * @description A page component that displays a chronological timeline of a patient's medical documents.
 * @param {DocumentTimelineProps} [props] - The props for the component.
 * @returns {JSX.Element} - The rendered DocumentTimeline page component.
 */
export default function DocumentTimeline({ user }: DocumentTimelineProps = {}) {
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<DocumentData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [availablePatients, setAvailablePatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchAccessiblePatients();
    }
  }, [user]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredDocuments(documents);
    } else {
      const filtered = documents.filter(doc =>
        doc.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredDocuments(filtered);
    }
  }, [searchQuery, documents]);

  const fetchAccessiblePatients = async () => {
    setLoading(true);
    try {
      const { data: patients, error } = await supabase
        .from('patients')
        .select('*')
        .eq('created_by', user.id);
      if (error) throw error;
      setAvailablePatients(patients || []);
      if (patients && patients.length === 1) {
        setSelectedPatient(patients[0]);
        fetchDocuments(patients[0].id);
      }
    } catch (error: any) {
      toast({ title: "Error fetching patient data", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handlePatientSelect = async (patientId: string) => {
    const patient = availablePatients.find(p => p.id === patientId);
    if (patient) {
        setSelectedPatient(patient);
        await fetchDocuments(patient.id);
    }
  };

  const fetchDocuments = async (patientId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('documents').select('*').eq('patient_id', patientId).order('uploaded_at', { ascending: false });
      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      toast({ title: "Error fetching documents", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const groupDocumentsByDate = (docs: DocumentData[]): GroupedDocuments => {
    return docs.reduce((acc, doc) => {
      const date = new Date(doc.uploaded_at).toDateString();
      if (!acc[date]) acc[date] = [];
      acc[date].push(doc);
      return acc;
    }, {} as GroupedDocuments);
  };

  const groupedDocuments = groupDocumentsByDate(filteredDocuments);

  if (loading) {
    return <div className="flex items-center justify-center p-8"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Document Timeline</h1>
      <p className="text-muted-foreground mb-6">A chronological view of all medical documents.</p>

      {availablePatients.length > 1 && (
        <div className="mb-6 max-w-sm">
          <Label htmlFor="patient-select">Select Patient</Label>
          <Select value={selectedPatient?.id || ""} onValueChange={handlePatientSelect}>
            <SelectTrigger id="patient-select"><SelectValue placeholder="Select a patient to view their timeline" /></SelectTrigger>
            <SelectContent>
              {availablePatients.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {selectedPatient ? (
        <>
          <div className="mb-8">
            <Input
              placeholder="Search in timeline..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <div className="relative">
            {Object.keys(groupedDocuments).length > 0 ? (
              <div className="space-y-12">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border -z-10"></div>
                {Object.entries(groupedDocuments).map(([date, docs]) => (
                  <div key={date} className="space-y-6 pl-10">
                    <h2 className="text-lg font-semibold sticky top-0 bg-background/80 backdrop-blur-sm py-2 -ml-10 pl-10">
                      <span className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full border-4 border-background"></span>
                      {new Date(date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                    </h2>
                    <div className="space-y-4">
                      {docs.map((doc) => (
                        <Card key={doc.id}>
                          <CardHeader>
                            <CardTitle>{doc.filename}</CardTitle>
                            <CardDescription>{doc.document_type.replace(/_/g, ' ')}</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground">{doc.description}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Documents Found</h3>
                <p>There are no documents in this timeline yet.</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Select a Patient</h3>
          <p>Please select a patient to view their document timeline.</p>
        </div>
      )}
    </div>
  );
}