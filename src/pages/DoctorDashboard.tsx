import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Users, FileText, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import AppointmentManagement from "@/components/AppointmentManagement";

interface Doctor {
  id: string;
  doctor_id: string;
  specialization: string;
  qualifications: string[];
  years_experience: number;
  consultation_fee: number;
  bio: string;
  profile_image_url?: string;
  users: {
    name: string;
    email: string;
  };
}

interface Appointment {
  id: string;
  status: string;
}

interface Patient {
  id: string;
  name: string;
  dob: string;
  gender: string;
  primary_contact: string;
  last_visit_date?: string;
  appointment_count: number;
}

interface DoctorDashboardProps {
  user: any;
}

const DoctorDashboard = ({ user }: DoctorDashboardProps) => {
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      loadDoctorData();
    }
  }, [user]);

  const loadDoctorData = async () => {
    setLoading(true);
    try {
      const { data: doctorData, error: doctorError } = await supabase
        .from('doctors')
        .select(`*, users!doctors_user_id_fkey(name, email)`)
        .eq('user_id', user.id)
        .single();

      if (doctorError) throw doctorError;
      setDoctor(doctorData);

      await Promise.all([
        fetchAppointments(doctorData.id),
        fetchPatients(doctorData.id)
      ]);
    } catch (error: any) {
      toast({
        title: "Error loading dashboard",
        description: error.message,
        variant: "destructive",
      });
      navigate('/doctor-auth');
    } finally {
      setLoading(false);
    }
  };

  const fetchAppointments = async (doctorId: string) => {
    const { data, error } = await supabase
      .from('appointments')
      .select('id, status')
      .eq('doctor_id', doctorId);
    if (error) throw error;
    setAppointments(data || []);
  };

  const fetchPatients = async (doctorId: string) => {
    const { data, error } = await supabase
      .from('doctor_patient_relationships')
      .select(`patients(*), last_visit_date`)
      .eq('doctor_id', doctorId)
      .eq('is_active', true);
    if (error) throw error;

    const patientsWithCounts = await Promise.all(
      (data || []).map(async (rel: any) => {
        const { count } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('doctor_id', doctorId)
          .eq('patient_id', rel.patients.id);
        return { ...rel.patients, last_visit_date: rel.last_visit_date, appointment_count: count || 0 };
      })
    );
    setPatients(patientsWithCounts);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">Welcome back, Dr. {doctor?.users.name?.split(' ').pop()}</h2>
        <p className="text-muted-foreground">{doctor?.specialization} • {doctor?.years_experience} years experience</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{appointments.filter(a => a.status === 'pending').length}</p>
                <p className="text-sm text-muted-foreground">Pending Appointments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{appointments.filter(a => a.status === 'confirmed').length}</p>
                <p className="text-sm text-muted-foreground">Confirmed Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{patients.length}</p>
                <p className="text-sm text-muted-foreground">Total Patients</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{appointments.filter(a => a.status === 'completed').length}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="appointments" className="space-y-6">
        <TabsList>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="patients">Patients</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
        </TabsList>

        <TabsContent value="appointments" className="space-y-6">
          {doctor && user && <AppointmentManagement doctorId={doctor.id} userId={user.id} />}
        </TabsContent>

        <TabsContent value="patients" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Patient List</CardTitle>
              <CardDescription>Manage your patient relationships</CardDescription>
            </CardHeader>
            <CardContent>
              {patients.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4" />
                  <p>No patients registered</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {patients.map((patient) => (
                    <Card key={patient.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-3 mb-3">
                          <Avatar><AvatarFallback>{patient.name.split(' ').map(n => n[0]).join('')}</AvatarFallback></Avatar>
                          <div>
                            <h4 className="font-semibold">{patient.name}</h4>
                            <p className="text-sm text-muted-foreground">{patient.gender}</p>
                          </div>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div>
                            <p className="text-muted-foreground">DOB</p>
                            <p>{format(new Date(patient.dob), 'MMM dd, yyyy')}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Appointments</p>
                            <p className="font-medium">{patient.appointment_count}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Doctor Profile</CardTitle>
              <CardDescription>Your professional information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-4">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={doctor?.profile_image_url} />
                  <AvatarFallback className="text-lg">{doctor?.users.name?.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-semibold">{doctor?.users.name}</h3>
                  <p className="text-muted-foreground">{doctor?.specialization}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold">Professional Details</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-muted-foreground">Experience:</span> {doctor?.years_experience} years</p>
                    <p><span className="text-muted-foreground">Fee:</span> ${doctor?.consultation_fee}</p>
                    <p><span className="text-muted-foreground">Email:</span> {doctor?.users.email}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="font-semibold">Qualifications</h4>
                  <div className="flex flex-wrap gap-2">
                    {doctor?.qualifications?.map((qual, index) => (
                      <Badge key={index} variant="secondary">{qual}</Badge>
                    ))}
                  </div>
                </div>
              </div>
              {doctor?.bio && (
                <div>
                  <h4 className="font-semibold mb-2">Bio</h4>
                  <p className="text-muted-foreground">{doctor.bio}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DoctorDashboard;