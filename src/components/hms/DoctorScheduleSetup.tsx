import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Calendar, Clock, Settings, Plus } from "lucide-react";
import { format, addDays } from "date-fns";

interface Doctor {
  id: string;
  doctor_id: string;
  users: { name: string } | null;
  specialization: string;
}

export default function DoctorScheduleSetup({ hospitalData }: { hospitalData: any }) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<string>("");
  const [startDate, setStartDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(addDays(new Date(), 30), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [slotDuration, setSlotDuration] = useState(30);
  const [maxAppointments, setMaxAppointments] = useState(2);
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri
  const [loading, setLoading] = useState(false);
  const [previewSlots, setPreviewSlots] = useState<any[]>([]);

  const daysOfWeek = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
  ];

  useEffect(() => {
    fetchDoctors();
  }, [hospitalData]);

  const fetchDoctors = async () => {
    if (!hospitalData?.id) return;

    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('id, doctor_id, specialization, users(name)')
        .contains('hospital_affiliations', [hospitalData.id]);

      if (error) throw error;
      setDoctors(data || []);
    } catch (error) {
      toast.error('Failed to load doctors');
    }
  };

  const generatePreview = () => {
    const slots: any[] = [];
    let currentDate = new Date(startDate);
    const finalDate = new Date(endDate);

    while (currentDate <= finalDate) {
      // Check if current day is in working days
      if (workingDays.includes(currentDate.getDay())) {
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        
        // Generate time slots for this day
        const [startHour, startMin] = startTime.split(':').map(Number);
        const [endHour, endMin] = endTime.split(':').map(Number);
        
        let currentMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;
        
        while (currentMinutes < endMinutes) {
          const slotHour = Math.floor(currentMinutes / 60);
          const slotMin = currentMinutes % 60;
          const slotStartTime = `${String(slotHour).padStart(2, '0')}:${String(slotMin).padStart(2, '0')}`;
          
          const nextMinutes = currentMinutes + slotDuration;
          const nextHour = Math.floor(nextMinutes / 60);
          const nextMin = nextMinutes % 60;
          const slotEndTime = `${String(nextHour).padStart(2, '0')}:${String(nextMin).padStart(2, '0')}`;
          
          slots.push({
            date: dateStr,
            start_time: slotStartTime,
            end_time: slotEndTime,
          });
          
          currentMinutes = nextMinutes;
        }
      }
      
      currentDate = addDays(currentDate, 1);
    }

    setPreviewSlots(slots.slice(0, 10)); // Show first 10 as preview
    return slots;
  };

  const handleGenerateSlots = async () => {
    if (!selectedDoctor) {
      toast.error('Please select a doctor');
      return;
    }

    // Helper overlap check
    const toMinutes = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const overlaps = (aStart: string, aEnd: string, bStart: string, bEnd: string) =>
      toMinutes(aStart) < toMinutes(bEnd) && toMinutes(aEnd) > toMinutes(bStart);

    setLoading(true);
    try {
      const allSlots = generatePreview();

      // Fetch existing slots for the selected date range to detect conflicts client-side
      const { data: existingSlots, error: fetchErr } = await supabase
        .from('appointment_slots')
        .select('slot_date, start_time, end_time')
        .eq('doctor_id', selectedDoctor)
        .gte('slot_date', startDate)
        .lte('slot_date', endDate);
      if (fetchErr) throw fetchErr;

      // Split into conflicting and safe slots
      const conflicts: typeof allSlots = [];
      const safe: typeof allSlots = [];
      for (const s of allSlots) {
        const conflict = (existingSlots || []).some(e =>
          e.slot_date === s.date && overlaps(s.start_time, s.end_time, e.start_time, e.end_time)
        );
        if (conflict) conflicts.push(s); else safe.push(s);
      }

      if (conflicts.length > 0) {
        toast.warning(`Skipped ${conflicts.length} conflicting slot(s). Creating ${safe.length} new slot(s).`);
      }
      if (safe.length === 0) {
        toast.info('No new slots to create. All generated slots conflict with existing ones.');
        return;
      }

      // Prepare safe slots for insertion
      const slotsToInsert = safe.map(slot => ({
        doctor_id: selectedDoctor,
        slot_date: slot.date,
        start_time: slot.start_time,
        end_time: slot.end_time,
        max_appointments: maxAppointments,
        current_bookings: 0,
        is_available: true,
      }));

      // Insert in batches of 100
      const batchSize = 100;
      for (let i = 0; i < slotsToInsert.length; i += batchSize) {
        const batch = slotsToInsert.slice(i, i + batchSize);
        const { error } = await supabase
          .from('appointment_slots')
          .insert(batch);
        if (error) throw error;
      }

      toast.success(`Generated ${slotsToInsert.length} time slot(s) successfully`);
      setPreviewSlots([]);
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate slots');
    } finally {
      setLoading(false);
    }
  };

  const toggleWorkingDay = (day: number) => {
    setWorkingDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day].sort()
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Doctor Schedule Setup</h2>
        <p className="text-muted-foreground">Configure appointment slots for doctors</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Configuration Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Schedule Configuration
            </CardTitle>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Slot Duration (minutes)</Label>
              <Select value={String(slotDuration)} onValueChange={(v) => setSlotDuration(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 minutes</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="20">20 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Max Appointments per Slot</Label>
              <Input
                type="number"
                min="1"
                max="10"
                value={maxAppointments}
                onChange={(e) => setMaxAppointments(Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label>Working Days</Label>
              <div className="grid grid-cols-2 gap-2">
                {daysOfWeek.map((day) => (
                  <div key={day.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`day-${day.value}`}
                      checked={workingDays.includes(day.value)}
                      onCheckedChange={() => toggleWorkingDay(day.value)}
                    />
                    <Label htmlFor={`day-${day.value}`} className="cursor-pointer">
                      {day.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={generatePreview} variant="outline" className="flex-1">
                <Calendar className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button
                onClick={handleGenerateSlots}
                disabled={loading || !selectedDoctor}
                className="flex-1"
              >
                {loading ? 'Generating...' : 'Generate Slots'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview Card */}
        <Card>
          <CardHeader>
            <CardTitle>Slot Preview</CardTitle>
            <CardDescription>
              Preview of first 10 slots that will be generated
            </CardDescription>
          </CardHeader>
          <CardContent>
            {previewSlots.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Click "Preview" to see generated slots
              </div>
            ) : (
              <div className="space-y-2">
                {previewSlots.map((slot, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-md">
                    <div>
                      <div className="font-medium">{format(new Date(slot.date), 'EEE, MMM d')}</div>
                      <div className="text-sm text-muted-foreground">
                        {slot.start_time} - {slot.end_time}
                      </div>
                    </div>
                    <Badge variant="secondary">
                      Max: {maxAppointments}
                    </Badge>
                  </div>
                ))}
                <div className="text-sm text-muted-foreground text-center pt-2">
                  ... and more slots will be created
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}