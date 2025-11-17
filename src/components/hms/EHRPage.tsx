import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface Doctor {
  id: string;
  doctor_id: string;
  user_id: string;
  users: {
    name: string;
  };
}

interface Patient {
  id: string;
  name: string;
  primary_contact: string;
  gender: string;
}

interface Appointment {
  id: string;
  appointment_time: string;
  appointment_type: string;
  status: string;
  chief_complaint: string;
  patient_id: string;
  patients: Patient;
}

export default function EHRPage({ hospitalData }: { hospitalData: any }) {
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDoctors();
  }, [hospitalData]);

  useEffect(() => {
    if (selectedDoctorId) {
      fetchAppointments();
    }
  }, [selectedDoctorId]);

  const fetchDoctors = async () => {
    if (!hospitalData?.id) return;

    const { data, error } = await supabase
      .from("doctors")
      .select("id, doctor_id, user_id, users(name)")
      .contains("hospital_affiliations", [hospitalData.id]);

    if (error) {
      console.error("Error fetching doctors:", error);
      return;
    }

    setDoctors(data || []);
  };

  const fetchAppointments = async () => {
    setLoading(true);
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("appointments")
      .select(`
        id,
        appointment_time,
        appointment_type,
        status,
        chief_complaint,
        patient_id,
        patients(id, name, primary_contact, gender)
      `)
      .eq("doctor_id", selectedDoctorId)
      .eq("appointment_date", today)
      .in("status", ["pending", "confirmed", "in_progress"])
      .order("appointment_time", { ascending: true });

    if (error) {
      console.error("Error fetching appointments:", error);
      toast.error("Failed to load appointments");
    } else {
      setAppointments(data || []);
    }
    setLoading(false);
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
    const statusConfig = {
      pending: { label: "Pending", className: "bg-yellow-500" },
      confirmed: { label: "Confirmed", className: "bg-blue-500" },
      in_progress: { label: "In Progress", className: "bg-green-500" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, className: "bg-gray-500" };
    return <Badge className={config.className}>{config.label}</Badge>;
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

  const handlePatientDashboard = (patientId: string) => {
    navigate(`/patient-dashboard?patient=${patientId}`);
  };

  return (
    <div className="flex h-screen">
      {/* Left Sidebar */}
      <div className="w-64 border-r bg-card p-4 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Doctor</label>
          <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a doctor" />
            </SelectTrigger>
            <SelectContent>
              {doctors.map((doctor) => (
                <SelectItem key={doctor.id} value={doctor.id}>
                  {doctor.users.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold">Patient Queue</h2>
            <p className="text-muted-foreground">Today's appointments for the selected doctor</p>
          </div>

          {!selectedDoctorId ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Please select a doctor to view the patient queue
              </CardContent>
            </Card>
          ) : loading ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Loading appointments...
              </CardContent>
            </Card>
          ) : appointments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No appointments scheduled for today
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">S.No</TableHead>
                      <TableHead>Appointment Time</TableHead>
                      <TableHead>Patient Name</TableHead>
                      <TableHead>Mobile No</TableHead>
                      <TableHead>Gender</TableHead>
                      <TableHead>Waiting Time</TableHead>
                      <TableHead>Visit Type</TableHead>
                      <TableHead>Visit Status</TableHead>
                      <TableHead>One Line Summary</TableHead>
                      <TableHead className="text-right">Action by Doctor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appointments.map((appointment, index) => (
                      <TableRow key={appointment.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{appointment.appointment_time}</TableCell>
                        <TableCell className="font-medium">{appointment.patients.name}</TableCell>
                        <TableCell>{appointment.patients.primary_contact}</TableCell>
                        <TableCell className="capitalize">{appointment.patients.gender}</TableCell>
                        <TableCell>{calculateWaitingTime(appointment.appointment_time)}</TableCell>
                        <TableCell className="capitalize">{appointment.appointment_type || "Consultation"}</TableCell>
                        <TableCell>{getStatusBadge(appointment.status)}</TableCell>
                        <TableCell className="max-w-xs truncate">{appointment.chief_complaint || "N/A"}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePatientDashboard(appointment.patient_id)}
                          >
                            Patient Dashboard
                          </Button>
                          <Button
                            size="sm"
                            variant="default"
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
      </div>
    </div>
  );
}
