import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface MissingField {
  field: string;
  label: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  type: 'text' | 'textarea' | 'json';
}

interface MissingInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  missingFields: MissingField[];
  onUpdate: () => void;
}

export function MissingInfoDialog({ 
  open, 
  onOpenChange, 
  patientId, 
  missingFields,
  onUpdate 
}: MissingInfoDialogProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const updateData: Record<string, any> = {};
      
      Object.entries(formData).forEach(([key, value]) => {
        if (value) {
          const field = missingFields.find(f => f.field === key);
          if (field?.type === 'json') {
            try {
              updateData[key] = JSON.parse(value);
            } catch {
              updateData[key] = [value];
            }
          } else {
            updateData[key] = value;
          }
        }
      });

      const { error } = await supabase
        .from('patients')
        .update(updateData)
        .eq('id', patientId);

      if (error) throw error;

      toast({
        title: "Information Updated",
        description: "Your medical information has been saved successfully.",
      });

      onUpdate();
      onOpenChange(false);
      setFormData({});
    } catch (error: any) {
      console.error('Error updating patient info:', error);
      toast({
        title: "Update Failed",
        description: error.message || "Could not save information",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800';
      case 'high':
        return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800';
      case 'medium':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800';
      default:
        return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800';
    }
  };

  if (missingFields.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            Complete Your Medical Profile
          </DialogTitle>
          <DialogDescription>
            We've detected some missing information in your medical profile. 
            Adding this information helps us provide better insights and summaries.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Alert className={getPriorityColor(missingFields[0]?.priority || 'medium')}>
            <AlertDescription>
              <strong>Priority:</strong> {missingFields.length} field{missingFields.length > 1 ? 's' : ''} need{missingFields.length === 1 ? 's' : ''} your attention
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            {missingFields.map((field) => (
              <div key={field.field} className="space-y-2">
                <Label htmlFor={field.field} className="flex items-center gap-2">
                  {field.label}
                  {field.priority === 'critical' && (
                    <span className="text-xs text-red-600 font-semibold">(Required)</span>
                  )}
                </Label>
                <p className="text-sm text-muted-foreground">{field.description}</p>
                
                {field.type === 'textarea' ? (
                  <Textarea
                    id={field.field}
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                    value={formData[field.field] || ''}
                    onChange={(e) => setFormData({ ...formData, [field.field]: e.target.value })}
                    required={field.priority === 'critical'}
                    rows={3}
                  />
                ) : (
                  <Input
                    id={field.field}
                    type="text"
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                    value={formData[field.field] || ''}
                    onChange={(e) => setFormData({ ...formData, [field.field]: e.target.value })}
                    required={field.priority === 'critical'}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Skip for Now
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Information'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}