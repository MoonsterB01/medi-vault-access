import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge"; 
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, Clock, User, CheckCircle, XCircle, RotateCcw, AlertCircle } from "lucide-react";
import { format } from "date-fns";

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
  patients: {
    name: string;
    dob: string;
    gender: string;
    primary_contact: string;
  };
}

interface AppointmentManagementProps {
  doctorId: string;
  userId: string;
}

const AppointmentManagement = ({ doctorId, userId }: AppointmentManagementProps) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingIds, setCancellingIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    fetchAppointments();

    // Set up real-time subscription for appointment updates
    const subscription = supabase
      .channel('doctor-appointments')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'appointments',
        filter: `doctor_id=eq.${doctorId}`
      }, () => {
        fetchAppointments();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [doctorId]);

  const fetchAppointments = async () => {
    try {
      console.log('Fetching appointments for doctor:', doctorId);
      
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select('*')
        .eq('doctor_id', doctorId)
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true });

      if (appointmentsError) {
        console.error('Error fetching appointments:', appointmentsError);
        throw appointmentsError;
      }

      console.log('Raw appointments data:', appointmentsData);

      if (!appointmentsData || appointmentsData.length === 0) {
        console.log('No appointments found for doctor');
        setAppointments([]);
        return;
      }

      // Get patient details separately to avoid join issues
      const patientIds = [...new Set(appointmentsData.map(apt => apt.patient_id))];
      const { data: patientsData, error: patientsError } = await supabase
        .from('patients')
        .select('id, name, dob, gender, primary_contact')
        .in('id', patientIds);

      if (patientsError) {
        console.error('Error fetching patients:', patientsError);
      }

      // Combine the data
      const enrichedAppointments = appointmentsData.map(appointment => ({
        ...appointment,
        patients: patientsData?.find(patient => patient.id === appointment.patient_id) || {
          name: 'Unknown Patient',
          dob: '',
          gender: 'Unknown',
          primary_contact: ''
        }
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

  const updateAppointmentStatus = async (appointmentId: string, status: string) => {
    try {
      // Add visual feedback for cancellation
      if (status === 'cancelled') {
        setCancellingIds(prev => new Set(prev).add(appointmentId));
        
        // Wait for animation to complete before updating data
        setTimeout(async () => {
          await performStatusUpdate(appointmentId, status);
          setCancellingIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(appointmentId);
            return newSet;
          });
        }, 500); // Match the animation duration
      } else {
        await performStatusUpdate(appointmentId, status);
      }
    } catch (error: any) {
      setCancellingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(appointmentId);
        return newSet;
      });
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const performStatusUpdate = async (appointmentId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ 
          status,
          confirmed_by: status === 'confirmed' ? userId : null
        })
        .eq('id', appointmentId);

      if (error) throw error;

      // Send notifications to patients/family members
      const { error: notificationError } = await supabase.functions.invoke('appointment-notifications', {
        body: {
          appointmentId,
          status,
          updatedBy: userId
        }
      });

      if (notificationError) {
        console.error('Error sending notifications:', notificationError);
        toast({
          title: "Partial Success",
          description: `Appointment ${status} successfully, but notifications may not have been sent.`,
        });
      } else {
        toast({
          title: "Success",
          description: `Appointment ${status} successfully and notifications sent.`,
        });
      }

      fetchAppointments();
    } catch (error: any) {
      throw error;
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

  const getAppointmentsByStatus = (status: string) => {
    if (status === 'active') {
      // Show all appointments except cancelled ones
      return appointments.filter(apt => apt.status !== 'cancelled');
    }
    return appointments.filter(apt => apt.status === status);
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading appointments...</p>
      </div>
    );
  }

  const pendingAppointments = getAppointmentsByStatus('pending');
  const confirmedAppointments = getAppointmentsByStatus('confirmed'); 
  const upcomingAppointments = confirmedAppointments.filter(apt => 
    new Date(apt.appointment_date) >= new Date()
  );

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
                <p className="text-sm text-muted-foreground">Upcoming</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{getAppointmentsByStatus('completed').length}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <User className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{appointments.length}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Appointments List - Filter out cancelled appointments */}
      <Card>
        <CardHeader>
          <CardTitle>Your Appointments</CardTitle>
          <CardDescription>Manage your patient appointments</CardDescription>
        </CardHeader>
        <CardContent>
          {appointments.filter(apt => apt.status !== 'cancelled').length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No appointments scheduled</p>
            </div>
          ) : (
            <div className="space-y-4">
              {appointments.filter(apt => apt.status !== 'cancelled').map((appointment) => (
                <div 
                  key={appointment.id} 
                  className={`border rounded-lg p-4 space-y-3 transition-all duration-500 ${
                    cancellingIds.has(appointment.id) 
                      ? 'animate-slide-out-left' 
                      : 'animate-fade-in'
                  }`}
                >
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
                      <p className="text-sm bg-muted p-2 rounded">{appointment.chief_complaint}</p>
                    </div>
                  )}

                  {appointment.patient_notes && (
                    <div>
                      <p className="text-muted-foreground text-sm">Patient Notes</p>
                      <p className="text-sm bg-muted p-2 rounded">{appointment.patient_notes}</p>
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
                        disabled={cancellingIds.has(appointment.id)}
                        className="transition-all duration-200"
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        {cancellingIds.has(appointment.id) ? 'Cancelling...' : 'Cancel'}
                      </Button>
                    </div>
                  )}

                  {appointment.status === 'confirmed' && (
                    <div className="flex space-x-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => updateAppointmentStatus(appointment.id, 'completed')}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Mark Complete
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
    </div>
  );
};

export default AppointmentManagement;