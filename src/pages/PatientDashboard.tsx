import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePatientSummary } from "@/hooks/use-patient-summary";
import { useSubscription } from "@/hooks/use-subscription";
import { User, FileText, Share2, Copy, Upload, Download, Calendar, Clock, Trash2, Users, Search, Bot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DocumentUpload from "@/components/DocumentUpload";
import { EnhancedDocumentSearch } from "@/components/EnhancedDocumentSearch";
import AppointmentBooking from "@/components/AppointmentBooking";
import AppointmentTracker from "@/components/AppointmentTracker";
import AppointmentCalendar from "@/components/AppointmentCalendar";
import PatientSummary from "@/components/PatientSummary";
import { MissingInfoDialog } from "@/components/MissingInfoDialog";
import { DocumentSummaryDialog } from "@/components/DocumentSummaryDialog";
import { MediBot } from "@/components/MediBot";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { SubscriptionBanner } from "@/components/SubscriptionBanner";
import { cn } from "@/lib/utils";

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
  const [documents, setDocuments] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("documents");
  const isMobile = useIsMobile();
  const { summary, isLoading: isSummaryLoading, error: summaryError, refresh: refreshSummary } = usePatientSummary(patientData?.id);
  const [isMissingInfoDialogOpen, setMissingInfoDialogOpen] = useState(false);
  const [missingFields, setMissingFields] = useState<any[]>([]);
  const subscription = useSubscription(user?.id, patientData?.id);

  useEffect(() => {
    if (patientData) {
      const fields = [];
      
      if (!patientData.blood_group) {
        fields.push({
          field: 'blood_group',
          label: 'Blood Group',
          description: 'Your blood type (e.g., O+, A-, AB+)',
          priority: 'high' as const,
          type: 'text' as const
        });
      }
      
      if (!patientData.allergies || patientData.allergies.length === 0) {
        fields.push({
          field: 'allergies',
          label: 'Allergies',
          description: 'List any known allergies (medications, food, environmental)',
          priority: 'medium' as const,
          type: 'json' as const
        });
      }
      
      if (!patientData.emergency_contact) {
        fields.push({
          field: 'emergency_contact',
          label: 'Emergency Contact',
          description: 'Name and phone number of emergency contact person',
          priority: 'high' as const,
          type: 'json' as const
        });
      }
      
      setMissingFields(fields);
      if (fields.length > 0 && (!patientData.name || !patientData.dob || !patientData.gender)) {
        setMissingInfoDialogOpen(true);
      }
    }
  }, [patientData]);

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

  const fetchPatientData = async (userId: string, retryCount = 0) => {
    const maxRetries = 2;
    
    try {
      const { data: patient, error: patientsErr } = await supabase
        .from('patients')
        .select('*')
        .eq('created_by', userId)
        .maybeSingle();

      if (patientsErr) {
        console.error('Error fetching patient data:', patientsErr);
        
        // Retry on recursion or specific errors
        if (retryCount < maxRetries && (
          patientsErr.message?.includes('recursion') || 
          patientsErr.code === 'PGRST301'
        )) {
          console.log(`Retrying patient data fetch (${retryCount + 1}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
          return fetchPatientData(userId, retryCount + 1);
        }
        
        throw patientsErr;
      }

      if (!patient) {
        // Try to create patient record if it doesn't exist
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          const { data: newPatient, error: createErr } = await supabase
            .from('patients')
            .insert({
              name: user?.name || 'New Patient',
              dob: new Date(Date.now() - 30 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              gender: 'Not Specified',
              primary_contact: userData.user.email || '',
              created_by: userId,
            })
            .select()
            .single();

          if (createErr) {
            console.error('Error creating patient:', createErr);
            
            if (retryCount < maxRetries) {
              console.log(`Retrying patient creation (${retryCount + 1}/${maxRetries})...`);
              await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
              return fetchPatientData(userId, retryCount + 1);
            }
            
            toast({
              title: "Patient Record Creation Failed",
              description: "Unable to create your patient profile. Please refresh or contact support.",
              variant: "destructive",
            });
            return;
          }

          if (newPatient) {
            setPatientData(newPatient);
            await fetchDocuments(newPatient.id);
            await fetchPrescriptions(newPatient.id);
            toast({
              title: "Profile Created",
              description: "Your patient profile has been created. Please update your information.",
            });
            return;
          }
        }
        
        toast({
          title: "No Patient Record",
          description: "No patient record found. Please contact support.",
          variant: "destructive",
        });
        return;
      }

      setPatientData(patient);
      await fetchDocuments(patient.id);
      await fetchPrescriptions(patient.id);
    } catch (error: any) {
      console.error('Error fetching patient data:', error);
      
      // Retry on network errors
      if (retryCount < maxRetries && error.message?.toLowerCase().includes('network')) {
        console.log(`Retrying due to network error (${retryCount + 1}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return fetchPatientData(userId, retryCount + 1);
      }
      
      toast({
        title: "Error Loading Data",
        description: "Could not load patient data. Please refresh the page or contact support if the issue persists.",
        variant: "destructive",
      });
    }
  };

  const fetchDocuments = async (patientId: string, retryCount = 0) => {
    const maxRetries = 2;
    setLoading(true);
    
    try {
      const { data: docs, error: docsError } = await supabase
        .from('documents')
        .select(`*, patients (name, shareable_id)`)
        .eq('patient_id', patientId)
        .order('uploaded_at', { ascending: false });

      if (docsError) {
        console.error('Error fetching documents:', docsError);
        
        // Retry on recursion or specific errors
        if (retryCount < maxRetries && (
          docsError.message?.includes('recursion') || 
          docsError.code === 'PGRST301'
        )) {
          console.log(`Retrying documents fetch (${retryCount + 1}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
          setLoading(false);
          return fetchDocuments(patientId, retryCount + 1);
        }
        
        throw docsError;
      }

      setDocuments(docs || []);
    } catch (error: any) {
      console.error('Error in fetchDocuments:', error);
      
      // Retry on network errors
      if (retryCount < maxRetries && error.message?.toLowerCase().includes('network')) {
        console.log(`Retrying due to network error (${retryCount + 1}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        setLoading(false);
        return fetchDocuments(patientId, retryCount + 1);
      }
      
      toast({
        title: "Documents Error",
        description: `Failed to load documents. Please refresh the page.`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPrescriptions = async (patientId: string) => {
    try {
      const { data, error } = await supabase
        .from('prescriptions')
        .select(`
          *,
          doctors!inner (
            id,
            user_id,
            users!inner (name)
          )
        `)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching prescriptions:', error);
        throw error;
      }

      setPrescriptions(data || []);
    } catch (error: any) {
      console.error('Error in fetchPrescriptions:', error);
      toast({
        title: "Prescriptions Error",
        description: `Failed to load prescriptions.`,
        variant: "destructive",
      });
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

  const onUploadSuccess = async () => {
    if (patientData?.id) {
      await fetchDocuments(patientData.id);
      // Trigger summary regeneration after upload
      await new Promise(resolve => setTimeout(resolve, 1000));
      refreshSummary();
    }
  };

  const handleDeleteDocument = async (documentId: string, filename: string) => {
    if (!confirm(`Are you sure you want to delete "${filename}"? This action cannot be undone.`)) return;

    try {
      const { error } = await supabase.from('documents').delete().eq('id', documentId);
      if (error) throw error;
      toast({ title: "Document Deleted", description: `${filename} has been deleted.` });
      if (patientData?.id) {
        await fetchDocuments(patientData.id);
        // Refresh subscription to update upload count
        await subscription.refresh();
        // Trigger summary regeneration after deletion
        await new Promise(resolve => setTimeout(resolve, 1000));
        refreshSummary();
      }
    } catch (error: any) {
      toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    navigate(`#${tab}`);
    
    if (isMobile) {
      const contentElement = document.getElementById(`tab-content-${tab}`);
      if (contentElement) {
        contentElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const refreshPatientData = async () => {
    try {
      if (patientData?.id) {
        const { data, error } = await supabase
          .from('patients')
          .select('*')
          .eq('id', patientData.id)
          .single();
        if (error) throw error;
        if (data) setPatientData(data);
        
        if (refreshSummary) {
          await new Promise(resolve => setTimeout(resolve, 500));
          refreshSummary();
        }
      } else if (user?.id) {
        await fetchPatientData(user.id);
      }
    } catch (err: any) {
      toast({ title: "Refresh failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <ErrorBoundary 
      fallbackTitle="Dashboard Error" 
      fallbackMessage="There was an issue loading your patient dashboard. This may be due to a database configuration issue."
      onReset={() => user && fetchPatientData(user.id)}
    >
      <div className={cn("container mx-auto px-4 py-8", isMobile && "pb-24")}>
        {patientData && missingFields.length > 0 && (
        <MissingInfoDialog
          patientId={patientData.id}
          missingFields={missingFields}
          open={isMissingInfoDialogOpen}
          onOpenChange={setMissingInfoDialogOpen}
          onUpdate={() => fetchPatientData(user.id)}
        />
      )}
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
              
              {/* Subscription Status Banner */}
              {subscription.currentPlan && !subscription.isLoading && (
                <SubscriptionBanner
                  planName={subscription.currentPlan.display_name}
                  uploadsUsed={subscription.uploadsUsed}
                  uploadLimit={subscription.currentPlan.upload_limit}
                  className="mt-4"
                />
              )}
            </>
          )}
        </div>

        <div className="lg:col-span-3">
          <div className="mb-6">
            <Button onClick={() => navigate('/document-timeline')} variant="outline">
              <Clock className="h-4 w-4 mr-2" /> View Timeline
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            {!isMobile && (
              <TabsList className="grid w-full grid-cols-7">
                <TabsTrigger value="summary"><Bot className="h-4 w-4 mr-1" />Summary</TabsTrigger>
                <TabsTrigger value="documents"><FileText className="h-4 w-4 mr-1" />Documents</TabsTrigger>
                <TabsTrigger value="search"><Search className="h-4 w-4 mr-1" />Search</TabsTrigger>
                <TabsTrigger value="appointments"><Clock className="h-4 w-4 mr-1" />Appointments</TabsTrigger>
                <TabsTrigger value="calendar"><Calendar className="h-4 w-4 mr-1" />Calendar</TabsTrigger>
                <TabsTrigger value="book-appointment"><Calendar className="h-4 w-4 mr-1" />Book</TabsTrigger>
                <TabsTrigger value="upload"><Upload className="h-4 w-4 mr-1" />Upload</TabsTrigger>
              </TabsList>
            )}

            <TabsContent value="summary" className="mt-6" id="tab-content-summary">
              <PatientSummary 
                summary={summary} 
                isLoading={isSummaryLoading} 
                error={summaryError}
                onRefresh={refreshPatientData}
              />
            </TabsContent>

            <TabsContent value="documents" className="mt-6" id="tab-content-documents">
              <div className="space-y-6">
                {/* Prescriptions Section */}
                <Card>
                  <CardHeader>
                    <CardTitle>My Prescriptions</CardTitle>
                    <CardDescription>Prescriptions created by your doctors</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {prescriptions.length > 0 ? (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {prescriptions.map((rx) => (
                          <Card key={rx.id} className="p-4 flex flex-col justify-between">
                            <div className="space-y-3">
                              <h3 className="font-semibold text-sm">{rx.prescription_id}</h3>
                              <p className="text-xs text-muted-foreground">
                                Dr. {rx.doctors?.users?.name || 'Unknown'}
                              </p>
                              <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">
                                  <Calendar className="h-3 w-3 inline mr-1" />
                                  {new Date(rx.created_at).toLocaleDateString()}
                                </p>
                                {rx.diagnosis && (
                                  <p className="text-xs"><strong>Diagnosis:</strong> {rx.diagnosis}</p>
                                )}
                              </div>
                              {rx.medicines && rx.medicines.length > 0 && (
                                <div className="space-y-1">
                                  <p className="text-xs font-semibold">Medicines:</p>
                                  {rx.medicines.slice(0, 2).map((med: any, i: number) => (
                                    <p key={i} className="text-xs text-muted-foreground">• {med.name}</p>
                                  ))}
                                  {rx.medicines.length > 2 && (
                                    <p className="text-xs text-muted-foreground">
                                      + {rx.medicines.length - 2} more
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2 mt-4">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  // Open prescription detail view
                                  const win = window.open('', '_blank');
                                  if (win) {
                                    win.document.write(`
                                      <html>
                                        <head>
                                          <title>Prescription ${rx.prescription_id}</title>
                                          <style>
                                            body { font-family: Arial, sans-serif; padding: 40px; }
                                            h1 { color: #333; }
                                            .section { margin: 20px 0; }
                                            .medicine { padding: 10px; border-left: 3px solid #4CAF50; margin: 10px 0; }
                                          </style>
                                        </head>
                                        <body>
                                          <h1>Prescription: ${rx.prescription_id}</h1>
                                          <div class="section">
                                            <p><strong>Date:</strong> ${new Date(rx.created_at).toLocaleDateString()}</p>
                                            <p><strong>Doctor:</strong> Dr. ${rx.doctors?.users?.name || 'Unknown'}</p>
                                            ${rx.diagnosis ? `<p><strong>Diagnosis:</strong> ${rx.diagnosis}</p>` : ''}
                                          </div>
                                          <div class="section">
                                            <h2>Medicines</h2>
                                            ${rx.medicines.map((med: any) => `
                                              <div class="medicine">
                                                <p><strong>${med.name}</strong></p>
                                                <p>Dose: ${med.dose}</p>
                                                <p>Frequency: ${med.frequency}</p>
                                                ${med.duration ? `<p>Duration: ${med.duration}</p>` : ''}
                                                ${med.instructions ? `<p>Instructions: ${med.instructions}</p>` : ''}
                                              </div>
                                            `).join('')}
                                          </div>
                                          ${rx.advice ? `
                                            <div class="section">
                                              <h2>Advice</h2>
                                              <p>${rx.advice}</p>
                                            </div>
                                          ` : ''}
                                        </body>
                                      </html>
                                    `);
                                  }
                                }}
                              >
                                <FileText className="h-4 w-4 mr-2" />View
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-medium mb-2">No prescriptions yet</h3>
                        <p>Prescriptions from your doctors will appear here.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Documents Section */}
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
                              <DocumentSummaryDialog document={doc}>
                                <Button size="sm" variant="outline" title="View AI summary"><Bot className="h-4 w-4 mr-2" />Summary</Button>
                              </DocumentSummaryDialog>
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
              </div>
            </TabsContent>

            <TabsContent value="search" className="mt-6" id="tab-content-search">
              <EnhancedDocumentSearch 
                patientId={patientData?.id} 
              />
            </TabsContent>

            <TabsContent value="appointments" className="mt-6" id="tab-content-appointments">
              <AppointmentTracker user={user} />
            </TabsContent>

            <TabsContent value="calendar" className="mt-6" id="tab-content-calendar">
              <AppointmentCalendar user={user} />
            </TabsContent>

            <TabsContent value="book-appointment" className="mt-6" id="tab-content-book-appointment">
              <AppointmentBooking user={user} />
            </TabsContent>
            <TabsContent value="upload" className="mt-6" id="tab-content-upload">
              <DocumentUpload onUploadSuccess={onUploadSuccess} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
        {isMobile && <MobileBottomNav activeTab={activeTab} onTabChange={handleTabChange} />}
        
        {patientData?.id && <MediBot patientId={patientData.id} />}
      </div>
    </ErrorBoundary>
  );
}