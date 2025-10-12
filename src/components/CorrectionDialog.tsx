import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

interface CorrectionDialogProps {
  children: React.ReactNode;
  field: string;
  originalValue: string;
  onSubmit: (correction: { field: string; valueBefore: string; valueAfter: string; action: 'edited' }) => void;
}

export const CorrectionDialog = ({ children, field, originalValue, onSubmit }: CorrectionDialogProps) => {
  const [newValue, setNewValue] = useState(originalValue);
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = () => {
    onSubmit({
      field,
      valueBefore: originalValue,
      valueAfter: newValue,
      action: 'edited',
    });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Suggest a Correction</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="field" className="text-right">
              Field
            </Label>
            <Input id="field" value={field} disabled className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="originalValue" className="text-right">
              Original Value
            </Label>
            <Input id="originalValue" value={originalValue} disabled className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="newValue" className="text-right">
              New Value
            </Label>
            <Input
              id="newValue"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit}>Submit Correction</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};