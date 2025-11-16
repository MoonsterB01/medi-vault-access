import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calendar, Printer, ChevronLeft, ChevronRight, MoreVertical, Edit, XCircle, Phone } from "lucide-react";
import { format, addDays } from "date-fns";

type AppointmentStatus = 'scheduled' | 'checked_in' | 'engaged' | 'done';

export default function SchedulePage({ hospitalData }: { hospitalData: any }) {
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [timestampInterval, setTimestampInterval] = useState(15);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [filteredStatus, setFilteredStatus] = useState<AppointmentStatus | null>(null);
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [newDate, setNewDate] = useState<string>("");
  const [newTime, setNewTime] = useState<string>("");
  const [cancellationReason, setCancellationReason] = useState<string>("");

  useEffect(() => {
    fetchDoctors();
  }, [hospitalData]);

  useEffect(() => {
    if (selectedDoctor) {
      fetchAppointments();
    }
  }, [selectedDoctor, selectedDate]);

  const fetchDoctors = async () => {
    if (!hospitalData?.id) return;

    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('*, users(name, email)')
        .contains('hospital_affiliations', [hospitalData.id]);

      if (error) throw error;
      setDoctors(data || []);
      if (data && data.length > 0) {
        setSelectedDoctor(data[0]);
      }
    } catch (error: any) {
      toast.error('Failed to load doctors');
    }
  };

  const fetchAppointments = async () => {
    if (!selectedDoctor) return;

    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*, patients(name, primary_contact)')
        .eq('doctor_id', selectedDoctor.id)
        .eq('appointment_date', selectedDate)
        .order('appointment_time', { ascending: true });

      if (error) throw error;
      setAppointments(data || []);
    } catch (error: any) {
      toast.error('Failed to load appointments');
    }
  };

  const getStatusAppointments = (status: string) => {
    return appointments.filter(apt => apt.status === status);
  };

  const statusConfig = [
    { key: 'scheduled', label: 'Scheduled', variant: 'default' as const },
    { key: 'checked_in', label: 'Check-in', variant: 'secondary' as const },
    { key: 'engaged', label: 'Engaged', variant: 'outline' as const },
    { key: 'done', label: 'Done', variant: 'default' as const },
  ];

  const handlePrint = () => {
    window.print();
  };

  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', appointmentId);

      if (error) throw error;
      fetchAppointments();
      toast.success('Status updated');
    } catch (error: any) {
      toast.error('Failed to update status');
    }
  };

  const handleReschedule = async () => {
    if (!selectedAppointment || !newDate || !newTime) {
      toast.error('Please fill all fields');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('reschedule-appointment', {
        body: {
          appointment_id: selectedAppointment.id,
          new_date: newDate,
          new_time: newTime,
          rescheduled_by: user.id,
          reason: `Rescheduled by hospital staff`
        }
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      toast.success('Appointment rescheduled successfully');
      setRescheduleDialogOpen(false);
      setSelectedAppointment(null);
      setNewDate("");
      setNewTime("");
      fetchAppointments();
    } catch (error: any) {
      toast.error(error.message || 'Failed to reschedule');
    }
  };

  const handleCancel = async () => {
    if (!selectedAppointment) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('appointments')
        .update({ 
          status: 'cancelled',
          cancellation_reason: cancellationReason,
          cancelled_by: user.id
        })
        .eq('id', selectedAppointment.id);

      if (error) throw error;

      // Send notification to patient
      await supabase.rpc('create_notification', {
        target_user_id: selectedAppointment.patients?.created_by,
        notification_title: 'Appointment Cancelled',
        notification_message: `Your appointment on ${selectedAppointment.appointment_date} at ${selectedAppointment.appointment_time} has been cancelled. ${cancellationReason ? `Reason: ${cancellationReason}` : ''}`,
        notification_type: 'appointment_cancelled_by_hospital',
        appointment_id_param: selectedAppointment.id,
        metadata_param: { reason: cancellationReason }
      });

      toast.success('Appointment cancelled');
      setCancelDialogOpen(false);
      setSelectedAppointment(null);
      setCancellationReason("");
      fetchAppointments();
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel');
    }
  };

  const openRescheduleDialog = (appointment: any) => {
    setSelectedAppointment(appointment);
    setNewDate(appointment.appointment_date);
    setNewTime(appointment.appointment_time);
    setRescheduleDialogOpen(true);
  };

  const openCancelDialog = (appointment: any) => {
    setSelectedAppointment(appointment);
    setCancelDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Appointment Schedule</h2>
          <p className="text-muted-foreground">Manage doctor appointments and patient flow</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSelectedDate(format(new Date(), 'yyyy-MM-dd'))}>
            Today
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Panel - Doctor Selection */}
        <div className="lg:col-span-3">
          <Card className="h-[calc(100vh-12rem)]">
            <CardHeader>
              <CardTitle className="text-lg">Select Doctor</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-18rem)]">
                <div className="space-y-2 p-4">
                  {doctors.map((doctor) => (
                    <Button
                      key={doctor.id}
                      variant={selectedDoctor?.id === doctor.id ? "default" : "outline"}
                      className="w-full justify-start"
                      onClick={() => setSelectedDoctor(doctor)}
                    >
                      <div className="text-left">
                        <div className="font-medium">{doctor.users?.name || 'Dr. Unknown'}</div>
                        <div className="text-xs opacity-70">{doctor.specialization}</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Center Section - Schedule */}
        <div className="lg:col-span-6 space-y-4">
          {/* Date Selector */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="flex-1"
                />
                <Button variant="outline" size="icon">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-3 gap-4">
            {/* Timestamp Selector */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Timestamp</CardTitle>
                <p className="text-xs text-muted-foreground">Select interval</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {[10, 15, 30].map((interval) => (
                  <Button
                    key={interval}
                    variant={timestampInterval === interval ? "default" : "outline"}
                    size="sm"
                    className="w-full"
                    onClick={() => setTimestampInterval(interval)}
                  >
                    {interval} min
                  </Button>
                ))}
              </CardContent>
            </Card>

            {/* Patient List */}
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle className="text-sm">Appointments by Time</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {appointments.map((apt) => (
                      <div
                        key={apt.id}
                        className="p-3 border rounded-lg hover:bg-accent cursor-pointer"
                        onClick={() => {
                          const statuses: AppointmentStatus[] = ['scheduled', 'checked_in', 'engaged', 'done'];
                          const currentIndex = statuses.indexOf(apt.status as AppointmentStatus);
                          const nextStatus = statuses[(currentIndex + 1) % statuses.length];
                          handleStatusChange(apt.id, nextStatus);
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{apt.patients?.name}</p>
                            <p className="text-xs text-muted-foreground">{apt.appointment_time}</p>
                          </div>
                          <Badge variant={
                            apt.status === 'scheduled' ? 'default' :
                            apt.status === 'checked_in' ? 'secondary' :
                            apt.status === 'engaged' ? 'outline' : 'default'
                          }>
                            {apt.status}
                          </Badge>
                        </div>
                        {apt.chief_complaint && (
                          <p className="text-xs text-muted-foreground mt-1">{apt.chief_complaint}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Panel - Status & Workflow */}
        <div className="lg:col-span-3">
          <Card className="h-[calc(100vh-12rem)]">
            <CardHeader>
              <CardTitle className="text-lg">Patient Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {statusConfig.map(({ key, label, variant }) => {
                const count = getStatusAppointments(key).length;
                return (
                  <div key={key}>
                    <Button
                      variant={variant}
                      className="w-full justify-between"
                      onClick={() => setFilteredStatus(filteredStatus === key ? null : key as AppointmentStatus)}
                    >
                      {label}
                      <Badge variant="outline">{count}</Badge>
                    </Button>
                  </div>
                );
              })}

              <div className="pt-4 border-t">
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {(filteredStatus ? getStatusAppointments(filteredStatus) : appointments).map((apt) => (
                      <div key={apt.id} className="p-2 bg-accent/50 rounded text-sm">
                        <p className="font-medium">{apt.patients?.name}</p>
                        <p className="text-xs text-muted-foreground">{apt.appointment_time}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reschedule Dialog */}
      <Dialog open={rescheduleDialogOpen} onOpenChange={setRescheduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Appointment</DialogTitle>
            <DialogDescription>
              Select new date and time for the appointment
            </DialogDescription>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-md">
                <div><strong>Patient:</strong> {selectedAppointment.patients?.name}</div>
                <div><strong>Current:</strong> {selectedAppointment.appointment_date} at {selectedAppointment.appointment_time}</div>
              </div>
              <div className="space-y-2">
                <Label>New Date</Label>
                <Input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  min={format(new Date(), 'yyyy-MM-dd')}
                />
              </div>
              <div className="space-y-2">
                <Label>New Time</Label>
                <Input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleReschedule} className="flex-1">
                  Confirm Reschedule
                </Button>
                <Button variant="outline" onClick={() => setRescheduleDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Appointment</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this appointment?
            </DialogDescription>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-md">
                <div><strong>Patient:</strong> {selectedAppointment.patients?.name}</div>
                <div><strong>Date:</strong> {selectedAppointment.appointment_date} at {selectedAppointment.appointment_time}</div>
              </div>
              <div className="space-y-2">
                <Label>Cancellation Reason (Optional)</Label>
                <Textarea
                  placeholder="Reason for cancellation..."
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCancel} variant="destructive" className="flex-1">
                  Confirm Cancellation
                </Button>
                <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
                  Back
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
