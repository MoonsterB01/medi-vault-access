import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, Users, FileText, LogOut, Stethoscope, CheckCircle, XCircle, RotateCcw, User } from "lucide-react";
import { format } from "date-fns";
import NotificationCenter from "@/components/NotificationCenter";

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
  appointment_id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  appointment_type: string;
  chief_complaint: string;
  patient_notes: string;
  patients: {
    name: string;
    dob: string;
    gender: string;
    primary_contact: string;
  };
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

const DoctorDashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/doctor-auth');
        return;
      }

      // Check if user is a doctor
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (userError || userData.role !== 'doctor') {
        toast({
          title: "Access Denied",
          description: "This dashboard is for doctors only.",
          variant: "destructive",
        });
        navigate('/');
        return;
      }

      setUser(userData);

      // Get doctor profile
      const { data: doctorData, error: doctorError } = await supabase
        .from('doctors')
        .select(`
          *,
          users!doctors_user_id_fkey(name, email)
        `)
        .eq('user_id', user.id)
        .single();

      if (doctorError) {
        console.error('Error fetching doctor profile:', doctorError);
        return;
      }

      setDoctor(doctorData);

      // Fetch appointments
      await fetchAppointments(doctorData.id);
      await fetchPatients(doctorData.id);
    } catch (error) {
      console.error('Error checking user:', error);
      navigate('/doctor-auth');
    } finally {
      setLoading(false);
    }
  };

  const fetchAppointments = async (doctorId: string) => {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        patients(name, dob, gender, primary_contact)
      `)
      .eq('doctor_id', doctorId)
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true });

    if (error) {
      console.error('Error fetching appointments:', error);
      return;
    }

    setAppointments(data || []);
  };

  const fetchPatients = async (doctorId: string) => {
    // Get unique patients from doctor-patient relationships
    const { data, error } = await supabase
      .from('doctor_patient_relationships')
      .select(`
        patients(
          id,
          name,
          dob,
          gender,
          primary_contact
        ),
        last_visit_date
      `)
      .eq('doctor_id', doctorId)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching patients:', error);
      return;
    }

    // Get appointment counts for each patient
    const patientsWithCounts = await Promise.all(
      (data || []).map(async (rel: any) => {
        const { count } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('doctor_id', doctorId)
          .eq('patient_id', rel.patients.id);

        return {
          ...rel.patients,
          last_visit_date: rel.last_visit_date,
          appointment_count: count || 0
        };
      })
    );

    setPatients(patientsWithCounts);
  };

  const updateAppointmentStatus = async (appointmentId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ 
          status,
          confirmed_by: status === 'confirmed' ? user.id : null
        })
        .eq('id', appointmentId);

      if (error) throw error;

      // Send notification to patients/family members
      const { error: notificationError } = await supabase.functions.invoke('appointment-notifications', {
        body: {
          appointmentId,
          status,
          updatedBy: user.id
        }
      });

      if (notificationError) {
        console.error('Error sending notifications:', notificationError);
        // Don't fail the update if notification fails
      }

      toast({
        title: "Success",
        description: `Appointment ${status} successfully.`,
      });

      // Refresh appointments
      if (doctor) {
        await fetchAppointments(doctor.id);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'rescheduled': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      case 'rescheduled': return <RotateCcw className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Stethoscope className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">MediDoc</h1>
                <p className="text-sm text-muted-foreground">Doctor Dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <NotificationCenter user={user} />
              <div className="text-right">
                <p className="text-sm font-medium">{doctor?.users.name}</p>
                <p className="text-xs text-muted-foreground">{doctor?.doctor_id}</p>
              </div>
              <Avatar>
                <AvatarImage src={doctor?.profile_image_url} />
                <AvatarFallback>
                  {doctor?.users.name?.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">Welcome back, Dr. {doctor?.users.name?.split(' ').pop()}</h2>
          <p className="text-muted-foreground">{doctor?.specialization} • {doctor?.years_experience} years experience</p>
        </div>

        {/* Stats Cards */}
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

        {/* Main Content */}
        <Tabs defaultValue="appointments" className="space-y-6">
          <TabsList>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            <TabsTrigger value="patients">Patients</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="appointments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Appointment Management</CardTitle>
                <CardDescription>Review and manage your upcoming appointments</CardDescription>
              </CardHeader>
              <CardContent>
                {appointments.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No appointments scheduled</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {appointments.map((appointment) => (
                      <div key={appointment.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Avatar>
                              <AvatarFallback>
                                <User className="w-4 h-4" />
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h4 className="font-semibold">{appointment.patients.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {appointment.patients.gender} • {appointment.patients.primary_contact}
                              </p>
                            </div>
                          </div>
                          <Badge className={getStatusColor(appointment.status)}>
                            {getStatusIcon(appointment.status)}
                            <span className="ml-1 capitalize">{appointment.status}</span>
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Date</p>
                            <p className="font-medium">{format(new Date(appointment.appointment_date), 'MMM dd, yyyy')}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Time</p>
                            <p className="font-medium">{appointment.appointment_time}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Type</p>
                            <p className="font-medium capitalize">{appointment.appointment_type.replace('_', ' ')}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">ID</p>
                            <p className="font-medium">{appointment.appointment_id}</p>
                          </div>
                        </div>

                        {appointment.chief_complaint && (
                          <div>
                            <p className="text-muted-foreground text-sm">Chief Complaint</p>
                            <p className="text-sm">{appointment.chief_complaint}</p>
                          </div>
                        )}

                        {appointment.patient_notes && (
                          <div>
                            <p className="text-muted-foreground text-sm">Patient Notes</p>
                            <p className="text-sm">{appointment.patient_notes}</p>
                          </div>
                        )}

                        {appointment.status === 'pending' && (
                          <div className="flex space-x-2 pt-2">
                            <Button
                              size="sm"
                              onClick={() => updateAppointmentStatus(appointment.id, 'confirmed')}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Confirm
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateAppointmentStatus(appointment.id, 'cancelled')}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateAppointmentStatus(appointment.id, 'rescheduled')}
                            >
                              <RotateCcw className="w-4 h-4 mr-1" />
                              Reschedule
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="patients" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Patient List</CardTitle>
                <CardDescription>Manage your patient relationships</CardDescription>
              </CardHeader>
              <CardContent>
                {patients.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No patients registered</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {patients.map((patient) => (
                      <Card key={patient.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-3 mb-3">
                            <Avatar>
                              <AvatarFallback>
                                {patient.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h4 className="font-semibold">{patient.name}</h4>
                              <p className="text-sm text-muted-foreground">{patient.gender}</p>
                            </div>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div>
                              <p className="text-muted-foreground">Date of Birth</p>
                              <p>{format(new Date(patient.dob), 'MMM dd, yyyy')}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Contact</p>
                              <p>{patient.primary_contact}</p>
                            </div>
                            <div className="flex justify-between">
                              <div>
                                <p className="text-muted-foreground">Appointments</p>
                                <p className="font-medium">{patient.appointment_count}</p>
                              </div>
                              {patient.last_visit_date && (
                                <div>
                                  <p className="text-muted-foreground">Last Visit</p>
                                  <p className="font-medium">{format(new Date(patient.last_visit_date), 'MMM dd')}</p>
                                </div>
                              )}
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
                    <AvatarFallback className="text-lg">
                      {doctor?.users.name?.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-semibold">{doctor?.users.name}</h3>
                    <p className="text-muted-foreground">{doctor?.specialization}</p>
                    <p className="text-sm text-muted-foreground">ID: {doctor?.doctor_id}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Professional Details</h4>
                      <div className="space-y-2">
                        <div>
                          <p className="text-sm text-muted-foreground">Experience</p>
                          <p>{doctor?.years_experience} years</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Consultation Fee</p>
                          <p>${doctor?.consultation_fee}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Email</p>
                          <p>{doctor?.users.email}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Qualifications</h4>
                      <div className="flex flex-wrap gap-2">
                        {doctor?.qualifications?.map((qual, index) => (
                          <Badge key={index} variant="secondary">{qual}</Badge>
                        ))}
                      </div>
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
    </div>
  );
};

export default DoctorDashboard;