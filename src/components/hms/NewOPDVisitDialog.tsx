import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus } from "lucide-react";

interface NewOPDVisitDialogProps {
  hospitalId: string;
  onSuccess: () => void;
}

export default function NewOPDVisitDialog({ hospitalId, onSuccess }: NewOPDVisitDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    patient_id: "",
    doctor_id: "",
    chief_complaint: "",
    diagnosis: "",
    prescription: "",
    follow_up_date: "",
    notes: "",
  });

  useEffect(() => {
    if (open) {
      fetchPatients();
      fetchDoctors();
    }
  }, [open, hospitalId]);

  const fetchPatients = async () => {
    const { data } = await supabase
      .from('patients')
      .select('id, name, primary_contact')
      .eq('hospital_id', hospitalId)
      .order('name');
    setPatients(data || []);
  };

  const fetchDoctors = async () => {
    const { data } = await supabase
      .from('doctors')
      .select('id, specialization, users(name)')
      .contains('hospital_affiliations', [hospitalId]);
    setDoctors(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patient_id) {
      toast.error("Please select a patient");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('opd_visits')
        .insert({
          hospital_id: hospitalId,
          patient_id: formData.patient_id,
          doctor_id: formData.doctor_id || null,
          chief_complaint: formData.chief_complaint || null,
          diagnosis: formData.diagnosis || null,
          prescription: formData.prescription || null,
          follow_up_date: formData.follow_up_date || null,
          notes: formData.notes || null,
          status: 'completed',
        });

      if (error) throw error;
      
      toast.success("OPD visit recorded successfully");
      setOpen(false);
      setFormData({
        patient_id: "",
        doctor_id: "",
        chief_complaint: "",
        diagnosis: "",
        prescription: "",
        follow_up_date: "",
        notes: "",
      });
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to record OPD visit");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Visit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New OPD Visit</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="patient">Patient *</Label>
            <Select value={formData.patient_id} onValueChange={(v) => setFormData({ ...formData, patient_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Select patient" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.primary_contact})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="doctor">Consulting Doctor</Label>
            <Select value={formData.doctor_id} onValueChange={(v) => setFormData({ ...formData, doctor_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Select doctor" />
              </SelectTrigger>
              <SelectContent>
                {doctors.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.users?.name} - {d.specialization}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="complaint">Chief Complaint</Label>
            <Textarea
              id="complaint"
              value={formData.chief_complaint}
              onChange={(e) => setFormData({ ...formData, chief_complaint: e.target.value })}
              placeholder="Patient's main complaint"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="diagnosis">Diagnosis</Label>
            <Textarea
              id="diagnosis"
              value={formData.diagnosis}
              onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
              placeholder="Diagnosis details"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prescription">Prescription</Label>
            <Textarea
              id="prescription"
              value={formData.prescription}
              onChange={(e) => setFormData({ ...formData, prescription: e.target.value })}
              placeholder="Prescribed medications"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="followup">Follow-up Date</Label>
            <Input
              id="followup"
              type="date"
              value={formData.follow_up_date}
              onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes"
              rows={2}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Saving..." : "Record Visit"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
