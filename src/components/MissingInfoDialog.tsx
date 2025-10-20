import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MissingInfoDialogProps {
  patient: any;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

export default function MissingInfoDialog({ patient, open, onOpenChange }: MissingInfoDialogProps) {
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (patient) {
      setName(patient.name || "");
      setDob(patient.dob || "");
      setGender(patient.gender || "");
    }
  }, [patient]);

  const handleSubmit = async () => {
    try {
      const { error } = await supabase
        .from("patients")
        .update({
          name,
          dob,
          gender,
        })
        .eq("id", patient.id);

      if (error) throw error;
      toast({ title: "Success", description: "Patient information updated." });
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Complete Your Profile</DialogTitle>
          <DialogDescription>
            Please fill in the missing information to help us provide a better experience.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="dob">Date of Birth</Label>
            <Input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="gender">Gender</Label>
            <Input id="gender" value={gender} onChange={(e) => setGender(e.target.value)} />
          </div>
          <Button onClick={handleSubmit} className="w-full">
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
