import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Calendar, RefreshCw, Settings, Star } from "lucide-react";
import { format, addDays, subDays, startOfDay, endOfDay, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  patient: { name: string; id: string; shareable_id: string } | null;
  doctor: { id: string; users: { name: string } | null } | null;
  chief_complaint: string | null;
}

interface Doctor {
  id: string;
  doctor_id: string;
  users: { name: string } | null;
  specialization: string;
}

export default function AppointmentScheduleView({ hospitalData }: { hospitalData: any }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<string>("all");
  const [doctorSearch, setDoctorSearch] = useState("");
  const [filters, setFilters] = useState({
    showEvents: true,
    cancelled: true,
    missed: true,
    normal: true,
  });
  const [slotDuration, setSlotDuration] = useState(15);

  const timeSlots = Array.from({ length: 24 }, (_, i) => {
    const hour = Math.floor(i / 2);
    const minutes = i % 2 === 0 ? "00" : "30";
    return `${String(hour).padStart(2, '0')}:${minutes}`;
  });

  useEffect(() => {
    if (hospitalData?.id) {
      fetchDoctors();
      fetchAppointments();
    }
  }, [hospitalData, currentDate]);

  useEffect(() => {
    if (hospitalData?.id) {
      const channel = supabase
        .channel('appointments-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'appointments'
          },
          () => fetchAppointments()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [hospitalData, currentDate]);

  const fetchDoctors = async () => {
    const { data } = await supabase
      .from('doctors')
      .select('id, doctor_id, specialization, users(name)')
      .contains('hospital_affiliations', [hospitalData.id]);
    
    if (data) setDoctors(data);
  };

  const fetchAppointments = async () => {
    const startDate = startOfDay(currentDate);
    const endDate = endOfDay(currentDate);

    let query = supabase
      .from('appointments')
      .select(`
        id,
        appointment_date,
        appointment_time,
        status,
        chief_complaint,
        patient:patients(id, name, shareable_id),
        doctor:doctors(id, users(name))
      `)
      .gte('appointment_date', format(startDate, 'yyyy-MM-dd'))
      .lte('appointment_date', format(endDate, 'yyyy-MM-dd'));

    if (selectedDoctor !== "all") {
      query = query.eq('doctor_id', selectedDoctor);
    }

    const { data } = await query;
    if (data) setAppointments(data as any);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'confirmed': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Waiting';
      case 'confirmed': return 'Scheduled';
      case 'completed': return 'Done';
      case 'in-progress': return 'Engaged';
      default: return status;
    }
  };

  const filteredDoctors = doctors.filter(doctor => {
    if (!doctor) return false;
    if (doctorSearch === "") return true;
    
    const doctorName = doctor.users?.name || "";
    const specialization = doctor.specialization || "";
    const searchLower = doctorSearch.toLowerCase();
    
    return doctorName.toLowerCase().includes(searchLower) ||
           specialization.toLowerCase().includes(searchLower);
  });

  const todayAppointments = appointments
    .filter(apt => {
      if (!filters.normal && apt.status === 'confirmed') return false;
      if (!filters.cancelled && apt.status === 'cancelled') return false;
      if (!filters.missed && apt.status === 'missed') return false;
      return true;
    })
    .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));

  const statusCounts = {
    scheduled: appointments.filter(a => a.status === 'confirmed').length,
    waiting: appointments.filter(a => a.status === 'pending').length,
    engaged: appointments.filter(a => a.status === 'in-progress').length,
    done: appointments.filter(a => a.status === 'completed').length,
  };

  return (
    <div className="flex gap-4 h-full max-h-[85vh]">
      {/* Left Sidebar - Consultants & Filters */}
      <Card className="w-72 flex flex-col">
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-3 px-4 pt-4">
          <CardTitle className="text-base">Consultants</CardTitle>
          <Button variant="ghost" size="sm" className="text-primary h-7 px-2 text-xs">More</Button>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto space-y-4 px-4 pb-4">
          <Input
            placeholder="Search Doctor"
            value={doctorSearch}
            onChange={(e) => setDoctorSearch(e.target.value)}
            className="bg-muted/50"
          />

          <div className="space-y-2">
            <div
              className={cn(
                "flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-muted/50",
                selectedDoctor === "all" && "bg-muted"
              )}
              onClick={() => setSelectedDoctor("all")}
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span>All Doctors ({appointments.length})</span>
              </div>
            </div>
            {filteredDoctors.map((doctor) => {
              if (!doctor) return null;
              const doctorAppointments = appointments.filter(a => a.doctor?.id === doctor.id);
              const displayName = (doctor.users && doctor.users.name) ? doctor.users.name : (doctor.doctor_id || 'Unknown Doctor');
              
              return (
                <div
                  key={doctor.id}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-muted/50",
                    selectedDoctor === doctor.id && "bg-muted"
                  )}
                  onClick={() => setSelectedDoctor(doctor.id)}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span>{displayName} ({doctorAppointments.length})</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div>
            <h3 className="font-semibold mb-2 text-sm">Filters</h3>
            <div className="space-y-1.5">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="show-events"
                  checked={filters.showEvents}
                  onCheckedChange={(checked) => 
                    setFilters(prev => ({ ...prev, showEvents: checked as boolean }))
                  }
                />
                <Label htmlFor="show-events" className="cursor-pointer text-sm">Show Events</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="cancelled"
                  checked={filters.cancelled}
                  onCheckedChange={(checked) => 
                    setFilters(prev => ({ ...prev, cancelled: checked as boolean }))
                  }
                />
                <Label htmlFor="cancelled" className="cursor-pointer text-sm">Cancelled</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="missed"
                  checked={filters.missed}
                  onCheckedChange={(checked) => 
                    setFilters(prev => ({ ...prev, missed: checked as boolean }))
                  }
                />
                <Label htmlFor="missed" className="cursor-pointer text-sm">Missed</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="normal"
                  checked={filters.normal}
                  onCheckedChange={(checked) => 
                    setFilters(prev => ({ ...prev, normal: checked as boolean }))
                  }
                />
                <Label htmlFor="normal" className="cursor-pointer text-sm">Normal</Label>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2 text-sm">Slot Duration</h3>
            <Select value={String(slotDuration)} onValueChange={(v) => setSlotDuration(Number(v))}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 mins</SelectItem>
                <SelectItem value="30">30 mins</SelectItem>
                <SelectItem value="45">45 mins</SelectItem>
                <SelectItem value="60">60 mins</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Center - Calendar View */}
      <Card className="flex-1 flex flex-col min-w-0">
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-3 px-4 pt-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subDays(currentDate, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addDays(currentDate, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())}>
              Today
            </Button>
            <Button variant="ghost" size="icon" onClick={fetchAppointments}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          <h2 className="text-2xl font-bold">
            {format(currentDate, 'MMMM dd, yyyy')}
          </h2>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">Chairs</Button>
            <Button variant="default" size="sm">Day</Button>
            <Button variant="ghost" size="sm">4 Days</Button>
            <Button variant="ghost" size="sm">Week</Button>
            <Button variant="ghost" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto">
          <div className="border rounded-lg">
            <div className="grid grid-cols-[80px_1fr] divide-y">
              <div className="p-2 text-center font-medium border-b">Time</div>
              <div className="p-2 text-center font-medium border-b">
                {format(currentDate, 'EEE dd/MM')}
              </div>
              
              <div className="p-2 text-sm text-muted-foreground">All-Day</div>
              <div className="p-4 min-h-16"></div>

              {timeSlots.map((time) => {
                const timeAppointments = appointments.filter(apt => 
                  apt && apt.appointment_time && apt.appointment_time.substring(0, 5) === time
                );

                return (
                  <>
                    <div key={`time-${time}`} className="p-2 text-sm text-muted-foreground">
                      {time}
                    </div>
                    <div key={`slot-${time}`} className="p-1 min-h-16 relative">
                      {timeAppointments.map((apt) => {
                        if (!apt) return null;
                        const patientName = (apt.patient && apt.patient.name) ? apt.patient.name : 'Unknown Patient';
                        
                        return (
                          <div
                            key={apt.id}
                            className={cn(
                              "absolute left-1 right-1 p-2 rounded text-white text-xs",
                              getStatusColor(apt.status)
                            )}
                            style={{
                              top: '4px',
                              height: 'calc(100% - 8px)',
                            }}
                          >
                            <div className="font-medium truncate">
                              {apt.appointment_time} - {format(new Date(`2000-01-01 ${apt.appointment_time}`).getTime() + 30*60000, 'HH:mm')}
                            </div>
                            <div className="text-xs truncate">{patientName}</div>
                            {apt.patient?.shareable_id && (
                              <div className="text-xs opacity-90">{apt.patient.shareable_id}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Right Sidebar - Today's Schedule */}
      <Card className="w-72 flex flex-col">
        <CardHeader className="pb-3 px-4 pt-4">
          <CardTitle className="text-base">Today's Schedule</CardTitle>
          <div className="grid grid-cols-4 gap-1.5 mt-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{statusCounts.scheduled}</div>
              <div className="text-xs text-muted-foreground">Schedule</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{statusCounts.waiting}</div>
              <div className="text-xs text-muted-foreground">Waiting</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-cyan-600">{statusCounts.engaged}</div>
              <div className="text-xs text-muted-foreground">Engaged</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-400">{statusCounts.done}</div>
              <div className="text-xs text-muted-foreground">Done</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto space-y-2 px-4 pb-4">
          {todayAppointments.map((apt) => {
            if (!apt) return null;
            const patientName = (apt.patient && apt.patient.name) ? apt.patient.name : 'Unknown Patient';
            
            return (
              <div key={apt.id} className="flex items-start justify-between gap-2 p-2 rounded-lg hover:bg-muted/50">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate text-sm">{patientName}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {apt.appointment_time}
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className={cn(
                  "text-xs flex-shrink-0",
                  apt.status === 'confirmed' && "text-yellow-600 border-yellow-600",
                  apt.status === 'pending' && "text-green-600 border-green-600",
                  apt.status === 'in-progress' && "text-cyan-600 border-cyan-600",
                  apt.status === 'completed' && "text-gray-400 border-gray-400"
                )}>
                  {getStatusLabel(apt.status)}
                </Badge>
              </div>
            );
          })}
          {todayAppointments.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No appointments scheduled for today
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
