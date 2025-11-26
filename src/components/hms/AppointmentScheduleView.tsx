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
  const [viewMode, setViewMode] = useState<"day" | "4days" | "week">("day");

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
  }, [hospitalData, currentDate, viewMode]);

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
    let endDate;

    switch (viewMode) {
      case "4days":
        endDate = endOfDay(addDays(currentDate, 3));
        break;
      case "week":
        endDate = endOfDay(addDays(currentDate, 6));
        break;
      default:
        endDate = endOfDay(currentDate);
    }

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
    <div className="h-[calc(100vh-8rem)] flex gap-3">
      {/* Left Sidebar - Consultants & Filters */}
      <Card className="w-72 flex flex-col">
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2 pt-4">
          <CardTitle className="text-base">Consultants</CardTitle>
          <Button variant="ghost" size="sm" className="text-primary h-7 text-xs">More</Button>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto space-y-3 pt-3">
          <Input
            placeholder="Search Doctor"
            value={doctorSearch}
            onChange={(e) => setDoctorSearch(e.target.value)}
            className="bg-muted/50 h-8 text-sm"
          />

          <div className="space-y-1">
            <div
              className={cn(
                "flex items-center justify-between p-1.5 rounded-lg cursor-pointer hover:bg-muted/50",
                selectedDoctor === "all" && "bg-muted"
              )}
              onClick={() => setSelectedDoctor("all")}
            >
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span className="text-sm">All Doctors ({appointments.length})</span>
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
                    "flex items-center justify-between p-1.5 rounded-lg cursor-pointer hover:bg-muted/50",
                    selectedDoctor === doctor.id && "bg-muted"
                  )}
                  onClick={() => setSelectedDoctor(doctor.id)}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <span className="text-sm">{displayName} ({doctorAppointments.length})</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div>
            <h3 className="font-semibold mb-1.5 text-sm">Filters</h3>
            <div className="space-y-1">
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
                <Label htmlFor="cancelled" className="cursor-pointer text-sm">Cancelled Appointments</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="missed"
                  checked={filters.missed}
                  onCheckedChange={(checked) => 
                    setFilters(prev => ({ ...prev, missed: checked as boolean }))
                  }
                />
                <Label htmlFor="missed" className="cursor-pointer text-sm">Missed Appointments</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="normal"
                  checked={filters.normal}
                  onCheckedChange={(checked) => 
                    setFilters(prev => ({ ...prev, normal: checked as boolean }))
                  }
                />
                <Label htmlFor="normal" className="cursor-pointer text-sm">Normal Appointments</Label>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-1.5 text-sm">Settings</h3>
            <div className="space-y-1.5">
              <Label className="text-sm">Slot Duration</Label>
              <Select value={String(slotDuration)} onValueChange={(v) => setSlotDuration(Number(v))}>
                <SelectTrigger className="h-8 text-sm">
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
          </div>
        </CardContent>
      </Card>

      {/* Center - Calendar View */}
      <Card className="flex-1 flex flex-col">
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
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
            <Button variant={viewMode === 'day' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('day')}>Day</Button>
            <Button variant={viewMode === '4days' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('4days')}>4 Days</Button>
            <Button variant={viewMode === 'week' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('week')}>Week</Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto">
          <div className="border rounded-lg">
            <div className={cn(
              "grid divide-y divide-x",
              viewMode === 'day' ? "grid-cols-[80px_1fr]" :
              viewMode === '4days' ? "grid-cols-[80px_repeat(4,1fr)]" :
              "grid-cols-[80px_repeat(7,1fr)]"
            )}>
              {/* Header Row */}
              <div className="p-2 text-center font-medium">Time</div>
              {Array.from({ length: viewMode === 'day' ? 1 : viewMode === '4days' ? 4 : 7 }).map((_, i) => (
                <div key={i} className="p-2 text-center font-medium">
                  {format(addDays(currentDate, i), 'EEE dd/MM')}
                </div>
              ))}
              
              {/* Time Slot Rows */}
              {timeSlots.map((time) => (
                <>
                  <div className="p-2 text-sm text-muted-foreground">{time}</div>
                  {Array.from({ length: viewMode === 'day' ? 1 : viewMode === '4days' ? 4 : 7 }).map((_, i) => {
                    const day = addDays(currentDate, i);
                    const timeAppointments = appointments.filter(apt =>
                      apt &&
                      apt.appointment_date &&
                      isSameDay(new Date(apt.appointment_date), day) &&
                      apt.appointment_time &&
                      apt.appointment_time.substring(0, 5) === time
                    );

                    return (
                      <div key={day.toString()} className="p-1 min-h-16 relative">
                        {timeAppointments.map((apt) => {
                          if (!apt) return null;
                          const patientName = apt.patient?.name || 'Unknown Patient';

                          return (
                            <div
                              key={apt.id}
                              className={cn(
                                "absolute inset-1 p-2 rounded text-white text-xs",
                                getStatusColor(apt.status)
                              )}
                            >
                              <div className="font-medium truncate">
                                {apt.appointment_time.substring(0,5)}
                              </div>
                              <div className="text-xs truncate">{patientName}</div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Right Sidebar - Today's Schedule */}
      <Card className="w-72 flex flex-col">
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-base">Today's Schedule</CardTitle>
          <div className="grid grid-cols-4 gap-1 mt-2">
            <div className="text-center">
              <div className="text-xl font-bold text-yellow-600">{statusCounts.scheduled}</div>
              <div className="text-[10px] text-muted-foreground">Schedule</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-green-600">{statusCounts.waiting}</div>
              <div className="text-[10px] text-muted-foreground">Waiting</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-cyan-600">{statusCounts.engaged}</div>
              <div className="text-[10px] text-muted-foreground">Engaged</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-gray-400">{statusCounts.done}</div>
              <div className="text-[10px] text-muted-foreground">Done</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto space-y-2 pt-3">
          {todayAppointments.map((apt) => {
            if (!apt) return null;
            const patientName = (apt.patient && apt.patient.name) ? apt.patient.name : 'Unknown Patient';
            
            return (
              <div key={apt.id} className="flex items-start justify-between gap-2 p-1.5 rounded-lg hover:bg-muted/50">
                <div className="flex items-start gap-1.5 flex-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate text-sm">{patientName}</div>
                    <div className="text-xs text-muted-foreground">
                      {apt.patient?.shareable_id && `${apt.patient.shareable_id} • `}
                      {apt.appointment_time}
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className={cn(
                  "text-[10px] h-5",
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
