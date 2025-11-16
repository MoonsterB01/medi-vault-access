import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Search, Calendar as CalendarIcon, Clock, UserPlus, CheckCircle } from "lucide-react";
import { format } from "date-fns";

interface Doctor {
  id: string;
  doctor_id: string;
  specialization: string;
  users: { name: string; email: string } | null;
}

interface Patient {
  id: string;
  name: string;
  shareable_id: string;
  primary_contact: string;
}

interface TimeSlot {
  slot_id: string;
  start_time: string;
  end_time: string;
  current_bookings: number;
  max_appointments: number;
  available_slots: number;
}

export default function HospitalAppointmentBooking({ hospitalData }: { hospitalData: any }) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [patientSearchTerm, setPatientSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [appointmentType, setAppointmentType] = useState("consultation");
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [bookedAppointment, setBookedAppointment] = useState<any>(null);

  useEffect(() => {
    fetchDoctors();
  }, [hospitalData]);

  useEffect(() => {
    if (selectedDoctor && selectedDate) {
      fetchAvailableSlots();
    }
  }, [selectedDoctor, selectedDate]);

  useEffect(() => {
    if (patientSearchTerm.length > 2) {
      searchPatients();
    } else {
      setSearchResults([]);
    }
  }, [patientSearchTerm]);

  const fetchDoctors = async () => {
    if (!hospitalData?.id) return;

    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('id, doctor_id, specialization, users(name, email)')
        .contains('hospital_affiliations', [hospitalData.id]);

      if (error) throw error;
      setDoctors(data || []);
    } catch (error) {
      toast.error('Failed to load doctors');
    }
  };

  const fetchAvailableSlots = async () => {
    if (!selectedDoctor || !selectedDate) return;

    try {
      const { data, error } = await supabase
        .rpc('get_available_time_slots', {
          p_doctor_id: selectedDoctor,
          p_slot_date: format(selectedDate, 'yyyy-MM-dd')
        });

      if (error) throw error;
      setAvailableSlots(data || []);
    } catch (error) {
      toast.error('Failed to load time slots');
      setAvailableSlots([]);
    }
  };

  const searchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('id, name, shareable_id, primary_contact')
        .or(`name.ilike.%${patientSearchTerm}%,shareable_id.ilike.%${patientSearchTerm}%,primary_contact.ilike.%${patientSearchTerm}%`)
        .limit(5);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching patients:', error);
    }
  };

  const handleBookAppointment = async () => {
    if (!selectedPatient || !selectedDoctor || !selectedSlot || !selectedDate) {
      toast.error('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('book-appointment', {
        body: {
          doctor_id: selectedDoctor,
          patient_id: selectedPatient.id,
          appointment_date: format(selectedDate, 'yyyy-MM-dd'),
          appointment_time: selectedSlot.start_time,
          appointment_type: appointmentType,
          chief_complaint: chiefComplaint,
          patient_notes: notes,
          created_by: user.id
        }
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setBookedAppointment(data.appointment);
      setSuccessDialogOpen(true);
      resetForm();
      toast.success('Appointment booked successfully');
      
      // Refresh slots
      fetchAvailableSlots();
    } catch (error: any) {
      toast.error(error.message || 'Failed to book appointment');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedPatient(null);
    setSelectedDoctor("");
    setSelectedDate(undefined);
    setSelectedSlot(null);
    setChiefComplaint("");
    setNotes("");
    setPatientSearchTerm("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Book Appointment</h2>
        <p className="text-muted-foreground">Schedule appointments for patients</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Patient Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Patient
            </CardTitle>
            <CardDescription>Search by name, ID, or phone number</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Input
                placeholder="Search patient..."
                value={patientSearchTerm}
                onChange={(e) => setPatientSearchTerm(e.target.value)}
              />
              {searchResults.length > 0 && (
                <div className="mt-2 border rounded-md divide-y">
                  {searchResults.map((patient) => (
                    <div
                      key={patient.id}
                      className="p-3 hover:bg-muted cursor-pointer"
                      onClick={() => {
                        setSelectedPatient(patient);
                        setSearchResults([]);
                        setPatientSearchTerm(patient.name);
                      }}
                    >
                      <div className="font-medium">{patient.name}</div>
                      <div className="text-sm text-muted-foreground">
                        ID: {patient.shareable_id} • {patient.primary_contact}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedPatient && (
              <div className="p-4 border rounded-md bg-muted/50">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{selectedPatient.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {selectedPatient.shareable_id}
                    </div>
                  </div>
                  <CheckCircle className="h-5 w-5 text-primary" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Doctor & Date Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Doctor & Date</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Doctor</Label>
              <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                <SelectTrigger>
                  <SelectValue placeholder="Select doctor" />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map((doctor) => (
                    <SelectItem key={doctor.id} value={doctor.id}>
                      {doctor.users?.name || doctor.doctor_id} - {doctor.specialization}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Available Time Slots */}
      {selectedDoctor && selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Available Time Slots
            </CardTitle>
            <CardDescription>
              {availableSlots.length} slots available on {format(selectedDate, 'PPP')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {availableSlots.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No available slots for this date
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {availableSlots.map((slot) => (
                  <Button
                    key={slot.slot_id}
                    variant={selectedSlot?.slot_id === slot.slot_id ? "default" : "outline"}
                    className="flex flex-col h-auto p-3"
                    onClick={() => setSelectedSlot(slot)}
                  >
                    <span className="font-semibold">{slot.start_time}</span>
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {slot.current_bookings}/{slot.max_appointments}
                    </Badge>
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Appointment Details */}
      {selectedSlot && (
        <Card>
          <CardHeader>
            <CardTitle>Appointment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Appointment Type</Label>
              <Select value={appointmentType} onValueChange={setAppointmentType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="consultation">Consultation</SelectItem>
                  <SelectItem value="follow_up">Follow Up</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="routine_checkup">Routine Checkup</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Chief Complaint</Label>
              <Textarea
                placeholder="Reason for visit..."
                value={chiefComplaint}
                onChange={(e) => setChiefComplaint(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Additional Notes</Label>
              <Textarea
                placeholder="Any additional information..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleBookAppointment}
                disabled={loading || !selectedPatient}
                className="flex-1"
              >
                {loading ? 'Booking...' : 'Book Appointment'}
              </Button>
              <Button variant="outline" onClick={resetForm}>
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success Dialog */}
      <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-primary" />
              Appointment Booked Successfully
            </DialogTitle>
            <DialogDescription>
              The appointment has been scheduled and the patient will be notified.
            </DialogDescription>
          </DialogHeader>
          {bookedAppointment && (
            <div className="space-y-2 p-4 bg-muted rounded-md">
              <div><strong>Appointment ID:</strong> {bookedAppointment.appointment_id}</div>
              <div><strong>Date:</strong> {format(new Date(bookedAppointment.appointment_date), 'PPP')}</div>
              <div><strong>Time:</strong> {bookedAppointment.appointment_time}</div>
            </div>
          )}
          <Button onClick={() => setSuccessDialogOpen(false)}>Close</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}