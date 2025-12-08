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

interface NewIPDAdmissionDialogProps {
  hospitalId: string;
  onSuccess: () => void;
}

export default function NewIPDAdmissionDialog({ hospitalId, onSuccess }: NewIPDAdmissionDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    patient_id: "",
    assigned_doctor_id: "",
    ward_number: "",
    bed_number: "",
    admission_type: "regular",
    chief_complaint: "",
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
        .from('ipd_admissions')
        .insert({
          hospital_id: hospitalId,
          patient_id: formData.patient_id,
          assigned_doctor_id: formData.assigned_doctor_id || null,
          ward_number: formData.ward_number || null,
          bed_number: formData.bed_number || null,
          admission_type: formData.admission_type,
          chief_complaint: formData.chief_complaint || null,
          notes: formData.notes || null,
          status: 'admitted',
        });

      if (error) throw error;
      
      toast.success("Patient admitted successfully");
      setOpen(false);
      setFormData({
        patient_id: "",
        assigned_doctor_id: "",
        ward_number: "",
        bed_number: "",
        admission_type: "regular",
        chief_complaint: "",
        notes: "",
      });
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to admit patient");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Admission
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New IPD Admission</DialogTitle>
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
            <Label htmlFor="doctor">Assigned Doctor</Label>
            <Select value={formData.assigned_doctor_id} onValueChange={(v) => setFormData({ ...formData, assigned_doctor_id: v })}>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ward">Ward Number</Label>
              <Input
                id="ward"
                value={formData.ward_number}
                onChange={(e) => setFormData({ ...formData, ward_number: e.target.value })}
                placeholder="e.g., W-101"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bed">Bed Number</Label>
              <Input
                id="bed"
                value={formData.bed_number}
                onChange={(e) => setFormData({ ...formData, bed_number: e.target.value })}
                placeholder="e.g., B-5"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Admission Type</Label>
            <Select value={formData.admission_type} onValueChange={(v) => setFormData({ ...formData, admission_type: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="regular">Regular</SelectItem>
                <SelectItem value="emergency">Emergency</SelectItem>
                <SelectItem value="surgery">Surgery</SelectItem>
                <SelectItem value="observation">Observation</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="complaint">Chief Complaint</Label>
            <Textarea
              id="complaint"
              value={formData.chief_complaint}
              onChange={(e) => setFormData({ ...formData, chief_complaint: e.target.value })}
              placeholder="Describe the patient's main complaint"
              rows={2}
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
              {loading ? "Admitting..." : "Admit Patient"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
