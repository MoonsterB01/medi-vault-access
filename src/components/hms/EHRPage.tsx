import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  User, Clock, FileText, Pill, TestTube, Activity, 
  Calendar, Stethoscope, ChevronRight, Loader2, Plus
} from "lucide-react";
import { format } from "date-fns";

interface Doctor {
  id: string;
  doctor_id: string;
  user_id: string;
  users: {
    name: string;
  } | null;
}

interface Patient {
  id: string;
  name: string;
  primary_contact: string;
  gender: string;
  dob: string;
  blood_group: string | null;
  allergies: any;
  medical_notes: string | null;
}

interface Appointment {
  id: string;
  appointment_time: string;
  appointment_type: string;
  status: string;
  chief_complaint: string;
  patient_id: string;
  patients: Patient | null;
}

export default function EHRPage({ hospitalData }: { hospitalData: any }) {
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientView, setPatientView] = useState<"queue" | "patient">("queue");
  
  // Patient details
  const [patientVisits, setPatientVisits] = useState<any[]>([]);
  const [patientLabOrders, setPatientLabOrders] = useState<any[]>([]);
  const [patientMedications, setPatientMedications] = useState<any[]>([]);
  
  // Consultation notes
  const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false);
  const [consultationNotes, setConsultationNotes] = useState({
    chief_complaint: "",
    diagnosis: "",
    prescription: "",
    notes: "",
    follow_up_date: "",
  });
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    fetchDoctors();
  }, [hospitalData]);

  useEffect(() => {
    if (selectedDoctorId) {
      fetchAppointments();
    }
  }, [selectedDoctorId]);

  useEffect(() => {
    if (selectedPatient) {
      fetchPatientDetails();
    }
  }, [selectedPatient]);

  const fetchDoctors = async () => {
    if (!hospitalData?.id) return;

    const { data, error } = await supabase
      .from("doctors")
      .select("id, doctor_id, user_id, users(name)")
      .contains("hospital_affiliations", [hospitalData.id]);

    if (!error) setDoctors(data || []);
  };

  const fetchAppointments = async () => {
    setLoading(true);
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("appointments")
      .select(`
        id, appointment_time, appointment_type, status, chief_complaint, patient_id,
        patients(id, name, primary_contact, gender, dob, blood_group, allergies, medical_notes)
      `)
      .eq("doctor_id", selectedDoctorId)
      .eq("appointment_date", today)
      .in("status", ["pending", "confirmed", "in_progress"])
      .order("appointment_time", { ascending: true });

    if (!error) setAppointments(data || []);
    setLoading(false);
  };

  const fetchPatientDetails = async () => {
    if (!selectedPatient) return;

    // Fetch OPD visits
    const { data: visits } = await supabase
      .from("opd_visits")
      .select("*")
      .eq("patient_id", selectedPatient.id)
      .eq("hospital_id", hospitalData.id)
      .order("visit_date", { ascending: false })
      .limit(10);
    setPatientVisits(visits || []);

    // Fetch lab orders
    const { data: labOrders } = await supabase
      .from("lab_orders")
      .select("*")
      .eq("patient_id", selectedPatient.id)
      .eq("hospital_id", hospitalData.id)
      .order("order_date", { ascending: false })
      .limit(10);
    setPatientLabOrders(labOrders || []);

    // Fetch medications from prescriptions
    const { data: medications } = await supabase
      .from("medications")
      .select("*")
      .eq("patient_id", selectedPatient.id)
      .order("startdate", { ascending: false })
      .limit(20);
    setPatientMedications(medications || []);
  };

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const calculateWaitingTime = (appointmentTime: string) => {
    const now = new Date();
    const [hours, minutes] = appointmentTime.split(":");
    const appointmentDate = new Date();
    appointmentDate.setHours(parseInt(hours), parseInt(minutes), 0);

    const diffMs = now.getTime() - appointmentDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 0) return "Not yet";
    const hrs = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      pending: { label: "Pending", className: "bg-yellow-500/10 text-yellow-500" },
      confirmed: { label: "Confirmed", className: "bg-blue-500/10 text-blue-500" },
      in_progress: { label: "In Progress", className: "bg-green-500/10 text-green-500" },
      completed: { label: "Completed", className: "bg-gray-500/10 text-gray-500" },
    };
    const config = statusConfig[status] || { label: status, className: "bg-gray-500/10 text-gray-500" };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const openPatientView = (patient: Patient) => {
    setSelectedPatient(patient);
    setPatientView("patient");
  };

  const handleCloseVisit = async (appointmentId: string) => {
    const { error } = await supabase
      .from("appointments")
      .update({ status: "completed" })
      .eq("id", appointmentId);

    if (error) {
      toast.error("Failed to close visit");
    } else {
      toast.success("Visit closed successfully");
      fetchAppointments();
    }
  };

  const openConsultationNotes = (patient: Patient, appointment: Appointment) => {
    setSelectedPatient(patient);
    setConsultationNotes({
      chief_complaint: appointment.chief_complaint || "",
      diagnosis: "",
      prescription: "",
      notes: "",
      follow_up_date: "",
    });
    setIsNotesDialogOpen(true);
  };

  const saveConsultationNotes = async () => {
    if (!selectedPatient || !selectedDoctorId) return;

    setSavingNotes(true);
    try {
      const { error } = await supabase
        .from("opd_visits")
        .insert({
          patient_id: selectedPatient.id,
          hospital_id: hospitalData.id,
          doctor_id: selectedDoctorId,
          chief_complaint: consultationNotes.chief_complaint,
          diagnosis: consultationNotes.diagnosis,
          prescription: consultationNotes.prescription,
          notes: consultationNotes.notes,
          follow_up_date: consultationNotes.follow_up_date || null,
          status: "completed",
        });

      if (error) throw error;

      toast.success("Consultation notes saved");
      setIsNotesDialogOpen(false);
      fetchPatientDetails();
    } catch (error: any) {
      toast.error(error.message || "Failed to save notes");
    } finally {
      setSavingNotes(false);
    }
  };

  return (
    <div className="flex h-full">
      {/* Left Sidebar */}
      <div className="w-64 border-r bg-card p-4 space-y-4">
        <div className="space-y-2">
          <Label>Select Doctor</Label>
          <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a doctor" />
            </SelectTrigger>
            <SelectContent>
              {doctors.map((doctor) => (
                <SelectItem key={doctor.id} value={doctor.id}>
                  {doctor.users?.name || doctor.doctor_id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {patientView === "patient" && (
          <Button variant="outline" className="w-full" onClick={() => setPatientView("queue")}>
            ← Back to Queue
          </Button>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        {patientView === "queue" ? (
          // Queue View
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Patient Queue</h2>
              <p className="text-muted-foreground">Today's appointments</p>
            </div>

            {!selectedDoctorId ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Stethoscope className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a doctor to view the patient queue</p>
                </CardContent>
              </Card>
            ) : loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : appointments.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No appointments scheduled for today</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Patient</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Waiting</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Complaint</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {appointments.map((appointment, index) => (
                        <TableRow key={appointment.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell className="font-medium">{appointment.appointment_time}</TableCell>
                          <TableCell>
                            <button 
                              className="text-primary hover:underline font-medium"
                              onClick={() => appointment.patients && openPatientView(appointment.patients)}
                            >
                              {appointment.patients?.name}
                            </button>
                          </TableCell>
                          <TableCell>{appointment.patients?.primary_contact}</TableCell>
                          <TableCell>{calculateWaitingTime(appointment.appointment_time)}</TableCell>
                          <TableCell>{getStatusBadge(appointment.status)}</TableCell>
                          <TableCell className="max-w-32 truncate">{appointment.chief_complaint || "-"}</TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => appointment.patients && openConsultationNotes(appointment.patients, appointment)}
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              Notes
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleCloseVisit(appointment.id)}
                            >
                              Close Visit
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          // Patient View
          selectedPatient && (
            <div className="space-y-6">
              {/* Patient Header */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-6">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-8 w-8 text-primary" />
                    </div>
                    <div className="flex-1 grid grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Name</p>
                        <p className="font-semibold text-lg">{selectedPatient.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Age / Gender</p>
                        <p className="font-medium">
                          {calculateAge(selectedPatient.dob)} yrs / {selectedPatient.gender}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Blood Group</p>
                        <p className="font-medium">{selectedPatient.blood_group || "Unknown"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Contact</p>
                        <p className="font-medium">{selectedPatient.primary_contact}</p>
                      </div>
                    </div>
                    <Button onClick={() => setIsNotesDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Notes
                    </Button>
                  </div>

                  {selectedPatient.allergies && (
                    <div className="mt-4 p-3 bg-red-500/10 rounded-lg">
                      <p className="text-sm font-medium text-red-600 dark:text-red-400">Allergies</p>
                      <p className="text-sm">{JSON.stringify(selectedPatient.allergies)}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Tabs for different sections */}
              <Tabs defaultValue="history">
                <TabsList>
                  <TabsTrigger value="history">
                    <FileText className="h-4 w-4 mr-2" />
                    Visit History
                  </TabsTrigger>
                  <TabsTrigger value="lab">
                    <TestTube className="h-4 w-4 mr-2" />
                    Lab Results
                  </TabsTrigger>
                  <TabsTrigger value="medications">
                    <Pill className="h-4 w-4 mr-2" />
                    Medications
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="history" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Visit History</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {patientVisits.length === 0 ? (
                        <p className="text-center py-8 text-muted-foreground">No visit records found</p>
                      ) : (
                        <ScrollArea className="h-96">
                          <div className="space-y-4">
                            {patientVisits.map((visit) => (
                              <div key={visit.id} className="p-4 border rounded-lg">
                                <div className="flex justify-between items-start mb-2">
                                  <p className="font-medium">
                                    {format(new Date(visit.visit_date), "dd MMM yyyy")}
                                  </p>
                                  <Badge variant="outline">{visit.status}</Badge>
                                </div>
                                {visit.chief_complaint && (
                                  <div className="mb-2">
                                    <p className="text-xs text-muted-foreground">Chief Complaint</p>
                                    <p className="text-sm">{visit.chief_complaint}</p>
                                  </div>
                                )}
                                {visit.diagnosis && (
                                  <div className="mb-2">
                                    <p className="text-xs text-muted-foreground">Diagnosis</p>
                                    <p className="text-sm">{visit.diagnosis}</p>
                                  </div>
                                )}
                                {visit.prescription && (
                                  <div>
                                    <p className="text-xs text-muted-foreground">Prescription</p>
                                    <p className="text-sm">{visit.prescription}</p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="lab" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Lab Orders & Results</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {patientLabOrders.length === 0 ? (
                        <p className="text-center py-8 text-muted-foreground">No lab orders found</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Order #</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Tests</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {patientLabOrders.map((order) => {
                              const tests = Array.isArray(order.tests) ? order.tests : [];
                              return (
                                <TableRow key={order.id}>
                                  <TableCell className="font-medium">
                                    {order.order_number || order.id.slice(0, 8).toUpperCase()}
                                  </TableCell>
                                  <TableCell>
                                    {order.order_date ? format(new Date(order.order_date), "dd/MM/yyyy") : "-"}
                                  </TableCell>
                                  <TableCell>
                                    {tests.map((t: any) => t.test_name || t.name).join(", ") || "-"}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={order.status === "completed" ? "default" : "secondary"}>
                                      {order.status}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="medications" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Current & Past Medications</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {patientMedications.length === 0 ? (
                        <p className="text-center py-8 text-muted-foreground">No medication records found</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Medicine</TableHead>
                              <TableHead>Dose</TableHead>
                              <TableHead>Frequency</TableHead>
                              <TableHead>Start Date</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {patientMedications.map((med) => (
                              <TableRow key={med.id}>
                                <TableCell className="font-medium">{med.name}</TableCell>
                                <TableCell>{med.dose || "-"}</TableCell>
                                <TableCell>{med.frequency || "-"}</TableCell>
                                <TableCell>
                                  {med.startdate ? format(new Date(med.startdate), "dd/MM/yyyy") : "-"}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={med.status === "active" ? "default" : "secondary"}>
                                    {med.status || "unknown"}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )
        )}
      </div>

      {/* Consultation Notes Dialog */}
      <Dialog open={isNotesDialogOpen} onOpenChange={setIsNotesDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Consultation Notes - {selectedPatient?.name}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Chief Complaint</Label>
              <Textarea
                value={consultationNotes.chief_complaint}
                onChange={(e) => setConsultationNotes({ ...consultationNotes, chief_complaint: e.target.value })}
                placeholder="Patient's main complaint..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Diagnosis</Label>
              <Textarea
                value={consultationNotes.diagnosis}
                onChange={(e) => setConsultationNotes({ ...consultationNotes, diagnosis: e.target.value })}
                placeholder="Diagnosis..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Prescription</Label>
              <Textarea
                value={consultationNotes.prescription}
                onChange={(e) => setConsultationNotes({ ...consultationNotes, prescription: e.target.value })}
                placeholder="Medicines prescribed..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Additional Notes</Label>
                <Textarea
                  value={consultationNotes.notes}
                  onChange={(e) => setConsultationNotes({ ...consultationNotes, notes: e.target.value })}
                  placeholder="Any additional notes..."
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Follow-up Date</Label>
                <Input
                  type="date"
                  value={consultationNotes.follow_up_date}
                  onChange={(e) => setConsultationNotes({ ...consultationNotes, follow_up_date: e.target.value })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNotesDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveConsultationNotes} disabled={savingNotes}>
              {savingNotes ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
