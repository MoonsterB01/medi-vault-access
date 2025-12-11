import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, Pill, Check, X, Clock, Loader2, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format, isToday, startOfDay } from "date-fns";

interface MedicineTrackingTabProps {
  patientId: string;
}

interface MedicineRecord {
  id: string;
  medicine_name: string;
  dosage: string | null;
  frequency: string | null;
  scheduled_times: string[];
  date: string;
  status: 'taken' | 'missed' | 'skipped' | 'pending';
  taken_at: string | null;
  notes: string | null;
}

export function MedicineTrackingTab({ patientId }: MedicineTrackingTabProps) {
  const [todayRecords, setTodayRecords] = useState<MedicineRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [medicineName, setMedicineName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('');
  const [scheduledTimes, setScheduledTimes] = useState<string[]>(['08:00']);

  useEffect(() => {
    fetchTodayRecords();
  }, [patientId]);

  const fetchTodayRecords = async () => {
    setIsLoading(true);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('medicine_tracking')
        .select('*')
        .eq('patient_id', patientId)
        .eq('date', today)
        .order('medicine_name', { ascending: true });

      if (error) throw error;
      setTodayRecords((data || []) as MedicineRecord[]);
    } catch (error) {
      console.error('Error fetching medicine records:', error);
      toast.error('Failed to load medicine tracking');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setMedicineName('');
    setDosage('');
    setFrequency('');
    setScheduledTimes(['08:00']);
  };

  const handleAddMedicine = async () => {
    if (!medicineName.trim()) {
      toast.error('Please enter medicine name');
      return;
    }

    setIsSaving(true);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const { error } = await supabase
        .from('medicine_tracking')
        .insert({
          patient_id: patientId,
          medicine_name: medicineName,
          dosage: dosage || null,
          frequency: frequency || null,
          scheduled_times: scheduledTimes,
          date: today,
          status: 'pending',
        });

      if (error) throw error;

      toast.success('Medicine added to tracking!');
      setIsDialogOpen(false);
      resetForm();
      fetchTodayRecords();
    } catch (error: any) {
      console.error('Error adding medicine:', error);
      toast.error(error.message || 'Failed to add medicine');
    } finally {
      setIsSaving(false);
    }
  };

  const updateMedicineStatus = async (recordId: string, status: 'taken' | 'skipped') => {
    try {
      const { error } = await supabase
        .from('medicine_tracking')
        .update({
          status,
          taken_at: status === 'taken' ? new Date().toISOString() : null,
        })
        .eq('id', recordId);

      if (error) throw error;

      setTodayRecords(prev => 
        prev.map(r => r.id === recordId ? { ...r, status, taken_at: status === 'taken' ? new Date().toISOString() : null } : r)
      );

      toast.success(status === 'taken' ? 'Marked as taken!' : 'Marked as skipped');
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const addTimeSlot = () => {
    setScheduledTimes([...scheduledTimes, '12:00']);
  };

  const updateTimeSlot = (index: number, value: string) => {
    const newTimes = [...scheduledTimes];
    newTimes[index] = value;
    setScheduledTimes(newTimes);
  };

  const removeTimeSlot = (index: number) => {
    if (scheduledTimes.length > 1) {
      setScheduledTimes(scheduledTimes.filter((_, i) => i !== index));
    }
  };

  // Calculate adherence
  const completedCount = todayRecords.filter(r => r.status === 'taken').length;
  const totalCount = todayRecords.length;
  const adherencePercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Today's Summary */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Today's Medicines
              </CardTitle>
              <CardDescription>
                {format(new Date(), 'EEEE, MMMM d, yyyy')}
              </CardDescription>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">{adherencePercent}%</p>
              <p className="text-xs text-muted-foreground">Adherence</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={adherencePercent} className="h-2" />
          <p className="text-sm text-muted-foreground mt-2">
            {completedCount} of {totalCount} medicines taken
          </p>
        </CardContent>
      </Card>

      {/* Add Medicine Button */}
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Medicine Schedule</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Medicine
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Medicine to Track</DialogTitle>
              <DialogDescription>
                Add a medicine to your daily tracking schedule
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="medicineName">Medicine Name *</Label>
                <Input
                  id="medicineName"
                  placeholder="e.g., Metformin"
                  value={medicineName}
                  onChange={(e) => setMedicineName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dosage">Dosage</Label>
                  <Input
                    id="dosage"
                    placeholder="e.g., 500mg"
                    value={dosage}
                    onChange={(e) => setDosage(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="frequency">Frequency</Label>
                  <Input
                    id="frequency"
                    placeholder="e.g., Twice daily"
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Scheduled Times</Label>
                {scheduledTimes.map((time, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      type="time"
                      value={time}
                      onChange={(e) => updateTimeSlot(index, e.target.value)}
                      className="flex-1"
                    />
                    {scheduledTimes.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeTimeSlot(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addTimeSlot}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Time
                </Button>
              </div>
              <Button onClick={handleAddMedicine} disabled={isSaving} className="w-full">
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Medicine'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Medicine List */}
      <div className="space-y-2">
        {todayRecords.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Pill className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No medicines being tracked</p>
              <p className="text-sm text-muted-foreground">Add your daily medications to start tracking</p>
            </CardContent>
          </Card>
        ) : (
          todayRecords.map((record) => (
            <Card key={record.id}>
              <CardContent className="py-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      record.status === 'taken' 
                        ? 'bg-green-100 dark:bg-green-900/30' 
                        : record.status === 'skipped'
                        ? 'bg-red-100 dark:bg-red-900/30'
                        : 'bg-muted'
                    }`}>
                      <Pill className={`h-5 w-5 ${
                        record.status === 'taken' 
                          ? 'text-green-600 dark:text-green-400' 
                          : record.status === 'skipped'
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-muted-foreground'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium">{record.medicine_name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {record.dosage && <span>{record.dosage}</span>}
                        {record.dosage && record.scheduled_times?.length > 0 && <span>•</span>}
                        {record.scheduled_times?.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {record.scheduled_times.join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {record.status === 'pending' ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateMedicineStatus(record.id, 'skipped')}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => updateMedicineStatus(record.id, 'taken')}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <Badge variant={record.status === 'taken' ? 'default' : 'secondary'}>
                        {record.status === 'taken' ? 'Taken' : 'Skipped'}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
