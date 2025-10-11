import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, User, Stethoscope, CheckCircle, XCircle, RotateCcw, AlertCircle, MessageSquare } from "lucide-react";
import { format } from "date-fns";

/**
 * @interface Appointment
 * @description Defines the structure of an appointment object.
 */
interface Appointment {
  id: string;
  appointment_id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  appointment_type: string;
  chief_complaint: string;
  patient_notes: string;
  doctor_notes: string;
  created_at: string;
  doctors: {
    users: {
      name: string;
      email: string;
    };
    specialization: string;
    consultation_fee: number;
    doctor_id: string;
  };
  patients: {
    name: string;
    shareable_id: string;
  };
}

/**
 * @interface AppointmentTrackerProps
 * @description Defines the props for the AppointmentTracker component.
 * @property {any} user - The user object.
 */
interface AppointmentTrackerProps {
  user: any;
}

/**
 * @function AppointmentTracker
 * @description A component for patients to track their appointments. It displays a summary of appointments and a list of all appointments, with options to view details and add notes.
 * @param {AppointmentTrackerProps} props - The props for the component.
 * @returns {JSX.Element} - The rendered AppointmentTracker component.
 */
const AppointmentTracker = ({ user }: AppointmentTrackerProps) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [patientNotes, setPatientNotes] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchAppointments();
    
    // Set up real-time subscription
    const subscription = supabase
      .channel('appointment-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'appointments'
      }, () => {
        fetchAppointments();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user.id]);

  const fetchAppointments = async () => {
    try {
      console.log('Fetching appointments for user:', user.id);
      
      // Get appointments for patients the user has access to
      const { data: familyAccess, error: accessError } = await supabase
        .from('family_access')
        .select('patient_id')
        .eq('user_id', user.id)
        .eq('can_view', true);

      if (accessError) {
        console.error('Error fetching family access:', accessError);
        throw accessError;
      }

      console.log('Family access data:', familyAccess);
      const patientIds = familyAccess?.map(fa => fa.patient_id) || [];

      if (patientIds.length === 0) {
        console.log('No patient access found for user');
        setAppointments([]);
        return;
      }

      console.log('Fetching appointments for patient IDs:', patientIds);

      // Use separate queries to avoid join issues
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select('*')
        .in('patient_id', patientIds)
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true });

      if (appointmentsError) {
        console.error('Error fetching appointments:', appointmentsError);
        throw appointmentsError;
      }

      console.log('Raw appointments data:', appointmentsData);

      if (!appointmentsData || appointmentsData.length === 0) {
        console.log('No appointments found');
        setAppointments([]);
        return;
      }

      // Get doctor details separately
      const doctorIds = [...new Set(appointmentsData.map(apt => apt.doctor_id))];
      const { data: doctorsData, error: doctorsError } = await supabase
        .from('doctors')
        .select(`
          id,
          doctor_id,
          specialization,
          consultation_fee,
          user_id,
          users(name, email)
        `)
        .in('id', doctorIds);

      if (doctorsError) {
        console.error('Error fetching doctors:', doctorsError);
      }

      // Get patient details separately
      const { data: patientsData, error: patientsError } = await supabase
        .from('patients')
        .select('id, name, shareable_id')
        .in('id', patientIds);

      if (patientsError) {
        console.error('Error fetching patients:', patientsError);
      }

      // Combine the data
      const enrichedAppointments = appointmentsData.map(appointment => ({
        ...appointment,
        doctors: doctorsData?.find(doc => doc.id === appointment.doctor_id) || null,
        patients: patientsData?.find(patient => patient.id === appointment.patient_id) || null
      }));

      console.log('Enriched appointments:', enrichedAppointments);
      setAppointments(enrichedAppointments);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast({
        title: "Error",
        description: "Failed to load appointments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'rescheduled': return <RotateCcw className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const updatePatientNotes = async () => {
    if (!selectedAppointment) return;

    try {
      const { error } = await supabase
        .from('appointments')
        .update({ patient_notes: patientNotes })
        .eq('id', selectedAppointment.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Notes updated successfully",
      });

      fetchAppointments();
      setDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filterAppointments = (status: string) => {
    if (status === 'all') {
      return appointments;
    }
    if (status === 'active') {
      // Show all non-cancelled appointments
      return appointments.filter(apt => apt.status !== 'cancelled');
    }
    return appointments.filter(apt => apt.status === status);
  };

  const upcomingAppointments = filterAppointments('active').filter(apt => 
    (apt.status === 'confirmed' || apt.status === 'pending') && 
    new Date(apt.appointment_date) >= new Date()
  );
  const pendingAppointments = filterAppointments('pending');
  const completedAppointments = filterAppointments('completed');
  const cancelledAppointments = filterAppointments('cancelled');

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading appointments...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">{pendingAppointments.length}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{upcomingAppointments.length}</p>
                <p className="text-sm text-muted-foreground">Confirmed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{completedAppointments.length}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-2xl font-bold">{cancelledAppointments.length}</p>
                <p className="text-sm text-muted-foreground">Cancelled</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Appointments Tabs */}
      <Tabs defaultValue="upcoming" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="pending">Pending ({pendingAppointments.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled ({cancelledAppointments.length})</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          {upcomingAppointments.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No upcoming appointments</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {upcomingAppointments.map((appointment) => (
                <AppointmentCard 
                  key={appointment.id} 
                  appointment={appointment}
                  onViewDetails={(apt) => {
                    setSelectedAppointment(apt);
                    setPatientNotes(apt.patient_notes || "");
                    setDialogOpen(true);
                  }}
                  getStatusColor={getStatusColor}
                  getStatusIcon={getStatusIcon}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          {pendingAppointments.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No pending appointments</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingAppointments.map((appointment) => (
                <AppointmentCard 
                  key={appointment.id} 
                  appointment={appointment}
                  onViewDetails={(apt) => {
                    setSelectedAppointment(apt);
                    setPatientNotes(apt.patient_notes || "");
                    setDialogOpen(true);
                  }}
                  getStatusColor={getStatusColor}
                  getStatusIcon={getStatusIcon}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedAppointments.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No completed appointments</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {completedAppointments.map((appointment) => (
                <AppointmentCard 
                  key={appointment.id} 
                  appointment={appointment}
                  onViewDetails={(apt) => {
                    setSelectedAppointment(apt);
                    setPatientNotes(apt.patient_notes || "");
                    setDialogOpen(true);
                  }}
                  getStatusColor={getStatusColor}
                  getStatusIcon={getStatusIcon}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="cancelled" className="space-y-4">
          {cancelledAppointments.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <XCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No cancelled appointments</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {cancelledAppointments.map((appointment) => (
                <AppointmentCard 
                  key={appointment.id} 
                  appointment={appointment}
                  onViewDetails={(apt) => {
                    setSelectedAppointment(apt);
                    setPatientNotes(apt.patient_notes || "");
                    setDialogOpen(true);
                  }}
                  getStatusColor={getStatusColor}
                  getStatusIcon={getStatusIcon}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          {appointments.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No appointments found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {appointments.map((appointment) => (
                <AppointmentCard 
                  key={appointment.id} 
                  appointment={appointment}
                  onViewDetails={(apt) => {
                    setSelectedAppointment(apt);
                    setPatientNotes(apt.patient_notes || "");
                    setDialogOpen(true);
                  }}
                  getStatusColor={getStatusColor}
                  getStatusIcon={getStatusIcon}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Appointment Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
            <DialogDescription>
              {selectedAppointment && (
                <>ID: {selectedAppointment.appointment_id}</>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedAppointment && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Doctor Information</h4>
                    <div className="space-y-2">
                      <p><strong>Name:</strong> Dr. {selectedAppointment.doctors?.users?.name || selectedAppointment.doctors?.doctor_id || 'Unknown Doctor'}</p>
                      <p><strong>Specialty:</strong> {selectedAppointment.doctors.specialization.replace('_', ' ')}</p>
                      <p><strong>Fee:</strong> ${selectedAppointment.doctors.consultation_fee}</p>
                      <p><strong>ID:</strong> {selectedAppointment.doctors.doctor_id}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Appointment Details</h4>
                    <div className="space-y-2">
                      <p><strong>Date:</strong> {format(new Date(selectedAppointment.appointment_date), 'PPP')}</p>
                      <p><strong>Time:</strong> {selectedAppointment.appointment_time}</p>
                      <p><strong>Type:</strong> {selectedAppointment.appointment_type.replace('_', ' ')}</p>
                      <div className="flex items-center">
                        <strong className="mr-2">Status:</strong>
                        <Badge className={getStatusColor(selectedAppointment.status)}>
                          {getStatusIcon(selectedAppointment.status)}
                          <span className="ml-1 capitalize">{selectedAppointment.status}</span>
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Patient</h4>
                    <p><strong>Name:</strong> {selectedAppointment.patients.name}</p>
                    <p><strong>ID:</strong> {selectedAppointment.patients.shareable_id}</p>
                  </div>

                  {selectedAppointment.chief_complaint && (
                    <div>
                      <h4 className="font-semibold mb-2">Chief Complaint</h4>
                      <p className="text-sm bg-muted p-3 rounded-lg">{selectedAppointment.chief_complaint}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="patient-notes">Your Notes</Label>
                  <Textarea
                    id="patient-notes"
                    value={patientNotes}
                    onChange={(e) => setPatientNotes(e.target.value)}
                    placeholder="Add notes about this appointment..."
                    rows={3}
                  />
                </div>

                {selectedAppointment.doctor_notes && (
                  <div>
                    <h4 className="font-semibold mb-2">Doctor's Notes</h4>
                    <p className="text-sm bg-muted p-3 rounded-lg">{selectedAppointment.doctor_notes}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Close
                </Button>
                <Button onClick={updatePatientNotes}>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Update Notes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

/**
 * @function AppointmentCard
 * @description A component that displays a single appointment in a card format.
 * @param {object} props - The props for the component.
 * @param {Appointment} props.appointment - The appointment object to display.
 * @param {(appointment: Appointment) => void} props.onViewDetails - A function to handle viewing the appointment details.
 * @param {(status: string) => string} props.getStatusColor - A function to get the color for a given status.
 * @param {(status: string) => JSX.Element} props.getStatusIcon - A function to get the icon for a given status.
 * @returns {JSX.Element} - The rendered AppointmentCard component.
 */
const AppointmentCard = ({ 
  appointment, 
  onViewDetails, 
  getStatusColor, 
  getStatusIcon 
}: {
  appointment: Appointment;
  onViewDetails: (appointment: Appointment) => void;
  getStatusColor: (status: string) => string;
  getStatusIcon: (status: string) => JSX.Element;
}) => (
  <Card className="hover:shadow-md transition-shadow">
    <CardContent className="p-4">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center space-x-3">
          <Avatar>
            <AvatarFallback>
              <User className="w-4 h-4" />
            </AvatarFallback>
          </Avatar>
          <div>
            <h4 className="font-semibold">Dr. {appointment.doctors?.users?.name || appointment.doctors?.doctor_id || 'Unknown Doctor'}</h4>
            <p className="text-sm text-muted-foreground">{appointment.doctors.specialization.replace('_', ' ')}</p>
          </div>
        </div>
        <Badge className={getStatusColor(appointment.status)}>
          {getStatusIcon(appointment.status)}
          <span className="ml-1 capitalize">{appointment.status}</span>
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm mb-3">
        <div>
          <p className="text-muted-foreground">Date & Time</p>
          <p className="font-medium">{format(new Date(appointment.appointment_date), 'MMM dd, yyyy')} at {appointment.appointment_time}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Type</p>
          <p className="font-medium capitalize">{appointment.appointment_type.replace('_', ' ')}</p>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">ID: {appointment.appointment_id}</p>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => onViewDetails(appointment)}
        >
          View Details
        </Button>
      </div>
    </CardContent>
  </Card>
);

export default AppointmentTracker;