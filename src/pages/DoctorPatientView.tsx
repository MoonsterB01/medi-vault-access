import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, FilePlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PatientSummary from "@/components/PatientSummary";
import { usePatientSummary } from "@/hooks/use-patient-summary";
import { DigitalPrescription } from "@/components/DigitalPrescription";

interface Patient {
  id: string;
  name: string;
  dob: string;
  gender: string;
  primary_contact: string;
  blood_group?: string;
}

interface Document {
  id: string;
  filename: string;
  uploaded_at: string;
  document_type?: string;
  verification_status?: string;
  ai_summary?: string;
}

interface Prescription {
  id: string;
  prescription_id: string;
  created_at: string;
  diagnosis?: string;
  medicines: any;
  advice?: string;
}

export default function DoctorPatientView() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewPrescription, setShowNewPrescription] = useState(false);
  const { summary, isLoading: summaryLoading, error: summaryError, refresh } = usePatientSummary(patientId || null);

  useEffect(() => {
    if (patientId) {
      loadPatientData();
    }
  }, [patientId]);

  const loadPatientData = async () => {
    try {
      setIsLoading(true);

      // Fetch patient details
      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .single();

      if (patientError) throw patientError;
      setPatient(patientData);

      // Fetch documents
      const { data: docsData, error: docsError } = await supabase
        .from('documents')
        .select('*')
        .eq('patient_id', patientId)
        .order('uploaded_at', { ascending: false });

      if (docsError) throw docsError;
      setDocuments(docsData || []);

      // Fetch prescriptions
      const { data: prescriptionsData, error: prescriptionsError } = await supabase
        .from('prescriptions')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (prescriptionsError) throw prescriptionsError;
      setPrescriptions(prescriptionsData || []);

    } catch (error: any) {
      toast({
        title: "Error loading patient data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrescriptionSaved = async () => {
    setShowNewPrescription(false);
    await loadPatientData();
    toast({
      title: "Success",
      description: "Prescription saved successfully",
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">Loading patient data...</div>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">Patient not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <Button
        variant="ghost"
        onClick={() => navigate('/doctor-dashboard')}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Dashboard
      </Button>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{patient.name}</CardTitle>
              <CardDescription>
                {patient.gender} • Age: {new Date().getFullYear() - new Date(patient.dob).getFullYear()} years
                {patient.blood_group && ` • Blood Group: ${patient.blood_group}`}
              </CardDescription>
            </div>
            <Badge variant="outline">{patient.primary_contact}</Badge>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="summary">Health Summary</TabsTrigger>
          <TabsTrigger value="documents">
            <FileText className="mr-2 h-4 w-4" />
            Documents ({documents.length})
          </TabsTrigger>
          <TabsTrigger value="prescriptions">
            <FilePlus className="mr-2 h-4 w-4" />
            Prescriptions ({prescriptions.length})
          </TabsTrigger>
        </TabsList>

          <TabsContent value="summary" className="mt-6">
            <PatientSummary
              summary={summary}
              isLoading={summaryLoading}
              error={summaryError}
              onRefresh={async () => { refresh(); }}
            />
          </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Document Timeline</CardTitle>
              <CardDescription>Medical documents uploaded for this patient</CardDescription>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No documents uploaded yet</p>
              ) : (
                <div className="space-y-4">
                  {documents.map((doc) => (
                    <Card key={doc.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold">{doc.filename}</h4>
                          <p className="text-sm text-muted-foreground">
                            {new Date(doc.uploaded_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </p>
                          {doc.ai_summary && (
                            <p className="text-sm mt-2">{doc.ai_summary}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {doc.document_type && (
                            <Badge variant="secondary">{doc.document_type}</Badge>
                          )}
                          {doc.verification_status && (
                            <Badge variant={doc.verification_status === 'verified' ? 'default' : 'outline'}>
                              {doc.verification_status}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prescriptions" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Prescriptions</CardTitle>
                  <CardDescription>All prescriptions for this patient</CardDescription>
                </div>
                <Button onClick={() => setShowNewPrescription(true)}>
                  <FilePlus className="mr-2 h-4 w-4" />
                  New Prescription
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showNewPrescription ? (
                <DigitalPrescription
                  patientId={patientId!}
                  onSave={handlePrescriptionSaved}
                  onCancel={() => setShowNewPrescription(false)}
                />
              ) : prescriptions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No prescriptions created yet</p>
              ) : (
                <div className="space-y-4">
                  {prescriptions.map((rx) => (
                    <Card key={rx.id} className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold">{rx.prescription_id}</h4>
                          <p className="text-sm text-muted-foreground">
                            {new Date(rx.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {rx.diagnosis && (
                        <p className="text-sm mb-2"><strong>Diagnosis:</strong> {rx.diagnosis}</p>
                      )}
                      <div className="text-sm">
                        <strong>Medicines:</strong>
                        <ul className="list-disc list-inside mt-1">
                          {rx.medicines.map((med: any, idx: number) => (
                            <li key={idx}>{med.name} - {med.dose} - {med.frequency}</li>
                          ))}
                        </ul>
                      </div>
                      {rx.advice && (
                        <p className="text-sm mt-2"><strong>Advice:</strong> {rx.advice}</p>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
