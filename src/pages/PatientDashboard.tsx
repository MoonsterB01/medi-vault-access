import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePatientSummary } from "@/hooks/use-patient-summary";
import { User, FileText, Share2, Copy, Upload, Download, Calendar, Clock, Trash2, Users, Search, Bot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DocumentUpload from "@/components/DocumentUpload";
import FamilyAccessManager from "@/components/FamilyAccessManager";
import { EnhancedDocumentSearch } from "@/components/EnhancedDocumentSearch";
import { ExtractTextDialog } from "@/components/ExtractTextDialog";
import AppointmentBooking from "@/components/AppointmentBooking";
import AppointmentTracker from "@/components/AppointmentTracker";
import PatientSummary from "@/components/PatientSummary";

/**
 * @interface PatientDashboardProps
 * @description Defines the props for the PatientDashboard component.
 * @property {any} [user] - The current user object.
 */
interface PatientDashboardProps {
  user?: any;
}

/**
 * @function PatientDashboard
 * @description A dashboard page for patients, providing access to their documents, appointments, and family access management.
 * @param {PatientDashboardProps} [props] - The props for the component.
 * @returns {JSX.Element} - The rendered PatientDashboard page component.
 */
export default function PatientDashboard({ user }: PatientDashboardProps = {}) {
  const [patientData, setPatientData] = useState<any>(null);
  const [availablePatients, setAvailablePatients] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [familyEmail, setFamilyEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("documents");
  const { summary, isLoading: isSummaryLoading, error: summaryError } = usePatientSummary(patientData?.id);

  useEffect(() => {
    const hash = location.hash.replace('#', '');
    if (hash) {
      setActiveTab(hash);
    }
  }, [location.hash]);

  useEffect(() => {
    if (user) {
      fetchPatientData(user.id);
    }
  }, [user]);

  const fetchPatientData = async (userId: string) => {
    try {
      const { data: familyAccess, error: faErr } = await supabase
        .from('family_access')
        .select(`
          patient_id,
          patients:patient_id (*)
        `)
        .eq('user_id', userId)
        .eq('can_view', true);

      if (faErr) throw faErr;

      if (!familyAccess || familyAccess.length === 0) {
        toast({
          title: "No Patient Record",
          description: "No patient record found for your account.",
          variant: "destructive",
        });
        return;
      }

      const patients = familyAccess.map(access => access.patients).filter(Boolean);
      setAvailablePatients(patients);

      if (patients.length === 1) {
        setPatientData(patients[0]);
        await fetchDocuments(patients[0].id);
      } else if (patients.length > 1) {
        toast({
          title: "Multiple Patient Access",
          description: `You have access to ${patients.length} patient records. Please select one to view.`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Error Loading Data",
        description: "Could not load patient data. " + error.message,
        variant: "destructive",
      });
    }
  };

  const handlePatientSelect = async (patient: any) => {
    setPatientData(patient);
    await fetchDocuments(patient.id);
    toast({
      title: "Patient Selected",
      description: `Now viewing records for ${patient.name}`,
    });
  };

  const fetchDocuments = async (patientId: string) => {
    try {
      const { data: docs, error: docsError } = await supabase
        .from('documents')
        .select(`*, patients (name, shareable_id)`)
        .eq('patient_id', patientId)
        .order('uploaded_at', { ascending: false });

      if (docsError) throw docsError;

      setDocuments(docs || []);
    } catch (error: any) {
      toast({
        title: "Documents Error",
        description: `Failed to load documents: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyEmail || !patientData) return;

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`https://qiqepumdtaozjzfjbggl.supabase.co/functions/v1/grant-access-to-family`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId: patientData.id,
          familyMemberEmail: familyEmail,
          canView: true,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to grant access');

      toast({
        title: "Access Granted!",
        description: `${familyEmail} now has access to view medical records`,
      });
      setFamilyEmail("");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const copyShareableId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast({ title: "Copied!", description: "Shareable ID copied to clipboard" });
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + ['B', 'KB', 'MB', 'GB'][i];
  };

  const formatDocumentType = (type: string) => {
    return type ? type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Document';
  };

  const onUploadSuccess = () => {
    if (patientData?.id) {
      fetchDocuments(patientData.id);
    }
  };

  const handleDeleteDocument = async (documentId: string, filename: string) => {
    if (!confirm(`Are you sure you want to delete "${filename}"? This action cannot be undone.`)) return;

    try {
      const { error } = await supabase.from('documents').delete().eq('id', documentId);
      if (error) throw error;
      toast({ title: "Document Deleted", description: `${filename} has been deleted.` });
      if (patientData?.id) fetchDocuments(patientData.id);
    } catch (error: any) {
      toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    navigate(`#${tab}`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Your Unique ID
              </CardTitle>
              <CardDescription>
                Your personal identifier as a {user?.role?.replace('_', ' ')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 p-3 bg-accent/20 border rounded-lg">
                <code className="flex-1 font-mono text-sm font-bold">
                  {user?.user_shareable_id || 'N/A'}
                </code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyShareableId(user?.user_shareable_id)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {availablePatients.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Select Patient Profile
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select
                  value={patientData?.id || ""}
                  onValueChange={(patientId) => {
                    const patient = availablePatients.find(p => p.id === patientId);
                    if (patient) handlePatientSelect(patient);
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Select a patient" /></SelectTrigger>
                  <SelectContent>
                    {availablePatients.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          {patientData && (
            <>
              <Card>
                <CardHeader><CardTitle>Patient Information</CardTitle></CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p><strong>Name:</strong> {patientData.name}</p>
                  <p><strong>DOB:</strong> {patientData.dob}</p>
                  <p><strong>Gender:</strong> {patientData.gender}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Share2 className="h-5 w-5" />
                    Patient Shareable ID
                  </CardTitle>
                  <CardDescription>Share this to allow document uploads.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 p-3 bg-primary/10 border rounded-lg">
                    <code className="flex-1 font-mono text-sm font-bold text-primary">
                      {patientData.shareable_id}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyShareableId(patientData.shareable_id)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5" />
                Grant Family Access
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGrantAccess} className="space-y-4">
                <Input
                  type="email"
                  placeholder="Family member's email"
                  value={familyEmail}
                  onChange={(e) => setFamilyEmail(e.target.value)}
                  required
                />
                <Button type="submit" className="w-full" disabled={loading || !patientData}>
                  {loading ? "Granting..." : "Grant Access"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <div className="mb-6">
            <Button onClick={() => navigate('/document-timeline')} variant="outline">
              <Clock className="h-4 w-4 mr-2" /> View Timeline
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="summary"><Bot className="h-4 w-4 mr-1" />Summary</TabsTrigger>
              <TabsTrigger value="documents"><FileText className="h-4 w-4 mr-1" />Documents</TabsTrigger>
              <TabsTrigger value="search"><Search className="h-4 w-4 mr-1" />Search</TabsTrigger>
              <TabsTrigger value="appointments"><Calendar className="h-4 w-4 mr-1" />Appointments</TabsTrigger>
              <TabsTrigger value="book-appointment"><Clock className="h-4 w-4 mr-1" />Book</TabsTrigger>
              <TabsTrigger value="upload"><Upload className="h-4 w-4 mr-1" />Upload</TabsTrigger>
              <TabsTrigger value="family"><Share2 className="h-4 w-4 mr-1" />Family</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="mt-6">
              <PatientSummary summary={summary} isLoading={isSummaryLoading} error={summaryError} />
            </TabsContent>

            <TabsContent value="documents" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>My Documents</CardTitle>
                  <CardDescription>Your uploaded medical documents</CardDescription>
                </CardHeader>
                <CardContent>
                  {documents.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {documents.map((doc) => (
                        <Card key={doc.id} className="p-4 flex flex-col justify-between">
                          <div className="space-y-3">
                            <h3 className="font-semibold text-sm truncate" title={doc.filename}>{doc.filename}</h3>
                            <p className="text-xs text-muted-foreground">{formatDocumentType(doc.document_type)}</p>
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground"><Calendar className="h-3 w-3 inline mr-1" />{new Date(doc.uploaded_at).toLocaleDateString()}</p>
                              <p className="text-xs text-muted-foreground">Size: {formatFileSize(doc.file_size)}</p>
                              {doc.content_confidence && <p className="text-xs text-green-600 dark:text-green-400">✓ AI Analyzed ({Math.round(doc.content_confidence * 100)}% confidence)</p>}
                            </div>
                            {doc.content_keywords?.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {doc.content_keywords.slice(0, 3).map((kw: string, i: number) => <Badge key={i} variant="outline" className="text-xs">{kw}</Badge>)}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2 mt-4">
                            <Button size="sm" variant="outline" onClick={async () => {
                               const { data } = await supabase.storage.from('medical-documents').createSignedUrl(doc.file_path, 3600);
                               if (data?.signedUrl) window.open(data.signedUrl, '_blank');
                            }}><Download className="h-4 w-4 mr-2" />View</Button>
                            <ExtractTextDialog document={doc}>
                              <Button size="sm" variant="outline" title="Extract text"><FileText className="h-4 w-4 mr-2" />Extract</Button>
                            </ExtractTextDialog>
                            <Button size="sm" variant="destructive" onClick={() => handleDeleteDocument(doc.id, doc.filename)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">No documents found</h3>
                      <p>Upload a document to get started.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="search" className="mt-6">
              <EnhancedDocumentSearch patientId={patientData?.id} />
            </TabsContent>
            <TabsContent value="appointments" className="mt-6">
              <AppointmentTracker user={user} />
            </TabsContent>
            <TabsContent value="book-appointment" className="mt-6">
              <AppointmentBooking user={user} />
            </TabsContent>
            <TabsContent value="upload" className="mt-6">
              <DocumentUpload
                shareableId={patientData?.shareable_id}
                onUploadSuccess={onUploadSuccess}
              />
            </TabsContent>
            <TabsContent value="family" className="mt-6">
              <FamilyAccessManager patientId={patientData?.id} patientShareableId={patientData?.shareable_id} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}