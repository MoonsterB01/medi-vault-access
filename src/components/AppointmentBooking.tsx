import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, Calendar as CalendarIcon, Clock, Star, MapPin, Stethoscope } from "lucide-react";
import { format, addDays, startOfDay } from "date-fns";

/**
 * @interface Doctor
 * @description Defines the structure of a doctor object.
 */
interface Doctor {
  id: string;
  doctor_id: string;
  specialization: string;
  qualifications: string[];
  years_experience: number;
  consultation_fee: number;
  bio: string;
  user_id: string; // include for notifications without relying on nested users
  users?: {
    id: string;
    name: string;
    email: string;
  };
}

/**
 * @interface Patient
 * @description Defines the structure of a patient object.
 */
interface Patient {
  id: string;
  name: string;
  shareable_id: string;
}

/**
 * @interface AppointmentBookingProps
 * @description Defines the props for the AppointmentBooking component.
 * @property {any} user - The user object.
 */
interface AppointmentBookingProps {
  user: any;
}

/**
 * @function AppointmentBooking
 * @description A component for booking appointments with doctors. It allows users to search for doctors, filter by specialty, and book an appointment for a selected patient.
 * @param {AppointmentBookingProps} props - The props for the component.
 * @returns {JSX.Element} - The rendered AppointmentBooking component.
 */
const AppointmentBooking = ({ user }: AppointmentBookingProps) => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [appointmentType, setAppointmentType] = useState<string>("consultation");
  const [chiefComplaint, setChiefComplaint] = useState<string>("");
  const [patientNotes, setPatientNotes] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [specialtyFilter, setSpecialtyFilter] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const { toast } = useToast();

  const specialties = [
    "cardiology", "neurology", "orthopedics", "pediatrics", 
    "dermatology", "general_medicine", "surgery", "psychiatry"
  ];

  useEffect(() => {
    fetchDoctors();
    fetchPatients();
  }, []);

  useEffect(() => {
    if (selectedDoctor && selectedDate) {
      fetchAvailableSlots();
    }
  }, [selectedDoctor, selectedDate]);

  // Real-time subscription for slot updates
  useEffect(() => {
    if (!selectedDoctor || !selectedDate) return;

    const channel = supabase
      .channel('appointment-slots-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'appointment_slots',
        filter: `doctor_id=eq.${selectedDoctor.id}`
      }, () => {
        fetchAvailableSlots();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDoctor, selectedDate]);

  const fetchDoctors = async () => {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select(`
          id,
          user_id,
          doctor_id,
          specialization,
          qualifications,
          years_experience,
          consultation_fee,
          bio,
          users!doctors_user_id_fkey(id, name, email)
        `)
        .eq('is_available', true)
        .order('years_experience', { ascending: false });

      if (error) throw error;
      
      console.log('Fetched doctors:', data); // Debug log
      setDoctors(data || []);
      
      if (!data || data.length === 0) {
        toast({
          title: "No Doctors Available",
          description: "There are currently no doctors available for booking. Please try again later.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
      toast({
        title: "Error",
        description: "Failed to load doctors. Please refresh the page.",
        variant: "destructive",
      });
    }
  };

  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('id, name, shareable_id')
        .eq('created_by', user.id);

      if (error) throw error;

      setPatients(data || []);
    } catch (error) {
      console.error('Error fetching patients:', error);
      toast({
        title: "Error",
        description: "Failed to load your patients.",
        variant: "destructive",
      });
    }
  };

  const fetchAvailableSlots = async () => {
    if (!selectedDoctor || !selectedDate) return;

    try {
      const { data, error } = await supabase
        .rpc('get_available_time_slots', {
          p_doctor_id: selectedDoctor.id,
          p_slot_date: format(selectedDate, 'yyyy-MM-dd')
        });

      if (error) throw error;
      setAvailableSlots(data || []);
    } catch (error) {
      console.error('Error fetching slots:', error);
      setAvailableSlots([]);
    }
  };

  const filteredDoctors = doctors.filter(doctor => {
    const nameOrId = (doctor.users?.name || doctor.doctor_id).toLowerCase();
    const matchesSearch = nameOrId.includes(searchTerm.toLowerCase()) ||
                         doctor.specialization.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Normalize specialization for comparison (handle both "General Medicine" and "general_medicine" formats)
    const normalizeSpecialty = (specialty: string) => 
      specialty.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z_]/g, '');
    
    const matchesSpecialty = specialtyFilter === "all" || 
                           normalizeSpecialty(doctor.specialization) === normalizeSpecialty(specialtyFilter);
    
    return matchesSearch && matchesSpecialty;
  });

  const handleBookAppointment = async () => {
    if (!selectedDoctor || !selectedPatient || !selectedDate || !selectedTime) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('appointments')
        .insert([{
          doctor_id: selectedDoctor.id,
          patient_id: selectedPatient,
          appointment_date: format(selectedDate, 'yyyy-MM-dd'),
          appointment_time: selectedTime,
          appointment_type: appointmentType,
          chief_complaint: chiefComplaint,
          patient_notes: patientNotes,
          created_by: user.id,
          status: 'pending',
          appointment_id: `APT-${Math.random().toString(36).substr(2, 8).toUpperCase()}` // Temporary, will be overwritten by trigger
        }] as any);

      if (error) throw error;

      // Create notification for the doctor using the unified function
      const patientName = patients.find(p => p.id === selectedPatient)?.name;
      const { error: notificationError } = await supabase
        .rpc('create_notification', {
          target_user_id: selectedDoctor.user_id,
          notification_title: 'New Appointment Request',
          notification_message: `New appointment request from ${patientName} for ${format(selectedDate, 'MMM dd, yyyy')} at ${selectedTime}`,
          notification_type: 'appointment_booked',
          metadata_param: {
            appointment_date: format(selectedDate, 'yyyy-MM-dd'),
            appointment_time: selectedTime,
            patient_name: patientName
          }
        });

      if (notificationError) console.error('Error creating notification:', notificationError);

      toast({
        title: "Success",
        description: "Appointment request sent successfully!",
      });

      // Reset form
      setSelectedDoctor(null);
      setSelectedPatient("");
      setSelectedDate(undefined);
      setSelectedTime("");
      setChiefComplaint("");
      setPatientNotes("");
      setBookingDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="w-5 h-5 mr-2" />
            Find a Doctor
          </CardTitle>
          <CardDescription>Search for doctors by name or specialty</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search doctors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
              <SelectTrigger className="sm:w-48">
                <SelectValue placeholder="All specialties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Specialties</SelectItem>
                {specialties.map(specialty => (
                  <SelectItem key={specialty} value={specialty}>
                    {specialty.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Doctor List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDoctors.map((doctor) => (
          <Card key={doctor.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Avatar>
                  <AvatarFallback>
                    <Stethoscope className="w-5 h-5" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">{doctor.users?.name ?? `Doctor ${doctor.doctor_id}`}</h3>
                  <p className="text-sm text-muted-foreground">ID: {doctor.doctor_id}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <Badge variant="secondary" className="mb-2">
                    {doctor.specialization.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Badge>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Star className="w-4 h-4 mr-1" />
                    {doctor.years_experience} years experience
                  </div>
                </div>

                <div className="text-sm">
                  <strong className="text-lg">${doctor.consultation_fee}</strong>
                  <span className="text-muted-foreground"> / consultation</span>
                </div>

                {doctor.qualifications && doctor.qualifications.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {doctor.qualifications.slice(0, 2).map((qual, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {qual}
                      </Badge>
                    ))}
                    {doctor.qualifications.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{doctor.qualifications.length - 2} more
                      </Badge>
                    )}
                  </div>
                )}

                {doctor.bio && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {doctor.bio}
                  </p>
                )}

                <Dialog open={bookingDialogOpen && selectedDoctor?.id === doctor.id} onOpenChange={setBookingDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      className="w-full" 
                      onClick={() => setSelectedDoctor(doctor)}
                    >
                      Book Appointment
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Book Appointment with Dr. {doctor.users?.name ?? doctor.doctor_id}</DialogTitle>
                      <DialogDescription>
                        {doctor.specialization.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} • ${doctor.consultation_fee}
                      </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="patient">Select Patient</Label>
                          <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose patient" />
                            </SelectTrigger>
                            <SelectContent>
                              {patients.map((patient) => (
                                <SelectItem key={patient.id} value={patient.id}>
                                  {patient.name} ({patient.shareable_id})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Appointment Date</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-start text-left font-normal"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={setSelectedDate}
                                disabled={(date) => 
                                  date < startOfDay(new Date()) || 
                                  date > addDays(new Date(), 30)
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                        <div>
                          <Label>Time Slot</Label>
                          {!selectedDate ? (
                            <div className="text-center py-4 text-sm text-muted-foreground border rounded-md">
                              Please select a date first
                            </div>
                          ) : availableSlots.length === 0 ? (
                            <div className="text-center py-4 text-sm text-muted-foreground border rounded-md">
                              No available slots for this date
                            </div>
                          ) : (
                            <div className="grid grid-cols-3 gap-2 max-h-[200px] overflow-y-auto border rounded-md p-2">
                              {availableSlots.map((slot) => (
                                <Button
                                  key={slot.start_time}
                                  type="button"
                                  variant={selectedTime === slot.start_time ? "default" : "outline"}
                                  onClick={() => setSelectedTime(slot.start_time)}
                                  className="w-full flex flex-col h-auto py-2"
                                >
                                  <Clock className="h-4 w-4 mb-1" />
                                  <span className="text-sm">{slot.start_time}</span>
                                  <Badge variant="secondary" className="mt-1 text-xs">
                                    {slot.current_bookings}/{slot.max_appointments}
                                  </Badge>
                                </Button>
                              ))}
                            </div>
                          )}
                        </div>

                        <div>
                          <Label>Appointment Type</Label>
                          <Select value={appointmentType} onValueChange={setAppointmentType}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="consultation">Consultation</SelectItem>
                              <SelectItem value="follow_up">Follow Up</SelectItem>
                              <SelectItem value="routine_checkup">Routine Checkup</SelectItem>
                              <SelectItem value="emergency">Emergency</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="complaint">Chief Complaint</Label>
                          <Textarea
                            id="complaint"
                            placeholder="Describe your main concern..."
                            value={chiefComplaint}
                            onChange={(e) => setChiefComplaint(e.target.value)}
                            rows={3}
                          />
                        </div>

                        <div>
                          <Label htmlFor="notes">Additional Notes</Label>
                          <Textarea
                            id="notes"
                            placeholder="Any additional information for the doctor..."
                            value={patientNotes}
                            onChange={(e) => setPatientNotes(e.target.value)}
                            rows={4}
                          />
                        </div>

                        <div className="bg-muted p-4 rounded-lg">
                          <h4 className="font-semibold mb-2">Appointment Summary</h4>
                          <div className="space-y-1 text-sm">
                            <p><strong>Doctor:</strong> Dr. {doctor.users?.name ?? doctor.doctor_id}</p>
                            <p><strong>Specialty:</strong> {doctor.specialization.replace('_', ' ')}</p>
                            <p><strong>Fee:</strong> ${doctor.consultation_fee}</p>
                            {selectedDate && <p><strong>Date:</strong> {format(selectedDate, "PPP")}</p>}
                            {selectedTime && <p><strong>Time:</strong> {selectedTime}</p>}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2 pt-4">
                      <Button 
                        variant="outline" 
                        onClick={() => setBookingDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleBookAppointment}
                        disabled={loading}
                      >
                        {loading ? "Booking..." : "Book Appointment"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredDoctors.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Stethoscope className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No doctors found matching your criteria</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AppointmentBooking;