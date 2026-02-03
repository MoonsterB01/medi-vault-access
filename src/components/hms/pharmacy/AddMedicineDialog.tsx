import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { Loader2, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface AddMedicineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hospitalId: string;
  onSuccess: () => void;
  editingMedicine?: {
    id: string;
    medicine_name: string;
    generic_name: string | null;
    batch_number: string | null;
    expiry_date: string | null;
    quantity: number | null;
    unit_price: number | null;
    reorder_level: number | null;
    manufacturer: string | null;
  } | null;
}

export default function AddMedicineDialog({
  open,
  onOpenChange,
  hospitalId,
  onSuccess,
  editingMedicine,
}: AddMedicineDialogProps) {
  const [saving, setSaving] = useState(false);
  const [expiryDate, setExpiryDate] = useState<Date | undefined>(
    editingMedicine?.expiry_date ? new Date(editingMedicine.expiry_date) : undefined
  );
  
  const [formData, setFormData] = useState({
    medicine_name: editingMedicine?.medicine_name || "",
    generic_name: editingMedicine?.generic_name || "",
    batch_number: editingMedicine?.batch_number || "",
    quantity: editingMedicine?.quantity?.toString() || "",
    unit_price: editingMedicine?.unit_price?.toString() || "",
    reorder_level: editingMedicine?.reorder_level?.toString() || "10",
    manufacturer: editingMedicine?.manufacturer || "",
  });

  const handleSave = async () => {
    if (!formData.medicine_name.trim()) {
      toast.error("Medicine name is required");
      return;
    }

    setSaving(true);

    try {
      const medicineData = {
        medicine_name: formData.medicine_name.trim(),
        generic_name: formData.generic_name.trim() || null,
        batch_number: formData.batch_number.trim() || null,
        expiry_date: expiryDate ? format(expiryDate, "yyyy-MM-dd") : null,
        quantity: formData.quantity ? parseInt(formData.quantity) : 0,
        unit_price: formData.unit_price ? parseFloat(formData.unit_price) : null,
        reorder_level: formData.reorder_level ? parseInt(formData.reorder_level) : 10,
        manufacturer: formData.manufacturer.trim() || null,
        hospital_id: hospitalId,
      };

      if (editingMedicine) {
        const { error } = await supabase
          .from("pharmacy_inventory")
          .update(medicineData)
          .eq("id", editingMedicine.id);

        if (error) throw error;
        toast.success("Medicine updated successfully");
      } else {
        const { error } = await supabase
          .from("pharmacy_inventory")
          .insert(medicineData);

        if (error) throw error;
        toast.success("Medicine added to inventory");
      }

      onSuccess();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        medicine_name: "",
        generic_name: "",
        batch_number: "",
        quantity: "",
        unit_price: "",
        reorder_level: "10",
        manufacturer: "",
      });
      setExpiryDate(undefined);
    } catch (error: any) {
      toast.error(error.message || "Failed to save medicine");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editingMedicine ? "Edit Medicine" : "Add New Medicine"}</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="medicine_name">Medicine Name *</Label>
              <Input
                id="medicine_name"
                value={formData.medicine_name}
                onChange={(e) => setFormData({ ...formData, medicine_name: e.target.value })}
                placeholder="e.g., Paracetamol 500mg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="generic_name">Generic Name</Label>
              <Input
                id="generic_name"
                value={formData.generic_name}
                onChange={(e) => setFormData({ ...formData, generic_name: e.target.value })}
                placeholder="e.g., Acetaminophen"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="batch_number">Batch Number</Label>
              <Input
                id="batch_number"
                value={formData.batch_number}
                onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
                placeholder="e.g., BT20240101"
              />
            </div>

            <div className="space-y-2">
              <Label>Expiry Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !expiryDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {expiryDate ? format(expiryDate, "dd/MM/yyyy") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={expiryDate}
                    onSelect={setExpiryDate}
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit_price">Unit Price (₹)</Label>
              <Input
                id="unit_price"
                type="number"
                step="0.01"
                value={formData.unit_price}
                onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reorder_level">Reorder Level</Label>
              <Input
                id="reorder_level"
                type="number"
                value={formData.reorder_level}
                onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })}
                placeholder="10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="manufacturer">Manufacturer</Label>
            <Input
              id="manufacturer"
              value={formData.manufacturer}
              onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
              placeholder="e.g., Sun Pharma"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {editingMedicine ? "Update" : "Add"} Medicine
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
