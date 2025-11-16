import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { User, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/**
 * @interface Patient
 * @description Defines the structure of a patient object for the profile selector.
 */
interface Patient {
  id: string;
  name: string;
  shareable_id: string | null;
}

/**
 * @interface ProfileSelectorProps
 * @description Defines the props for the ProfileSelector component.
 * @property {(shareableId: string, patientName: string) => void} onProfileChange - Callback function to be called when a profile is selected.
 * @property {string} [selectedShareableId] - The currently selected patient's shareable ID.
 */
interface ProfileSelectorProps {
  onProfileChange: (shareableId: string, patientName: string) => void;
  selectedShareableId?: string;
}

/**
 * @function ProfileSelector
 * @description A component that allows a user to select a patient profile from a list of available profiles they have access to.
 * @param {ProfileSelectorProps} props - The props for the component.
 * @returns {JSX.Element | null} - The rendered ProfileSelector component, or null if there is only one or zero available profiles.
 */
export default function ProfileSelector({ onProfileChange, selectedShareableId }: ProfileSelectorProps) {
  const [availablePatients, setAvailablePatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAvailablePatients();
  }, []);

  const fetchAvailablePatients = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get patients the user created
      const { data: patients, error: patientsError } = await supabase
        .from('patients')
        .select('id, name, shareable_id')
        .eq('created_by', user.id);

      if (patientsError) {
        console.error('Error fetching patients:', patientsError);
        toast({
          title: "Error",
          description: "Failed to load available profiles",
          variant: "destructive",
        });
        return;
      }

      setAvailablePatients((patients || []).filter(p => p.shareable_id) as Patient[]);

      // Auto-select if only one patient available
      if (patients && patients.length === 1 && patients[0].shareable_id && !selectedShareableId) {
        onProfileChange(patients[0].shareable_id, patients[0].name);
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to load available profiles",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProfileChange = (shareableId: string) => {
    const patient = availablePatients.find(p => p.shareable_id === shareableId);
    if (patient) {
      onProfileChange(shareableId, patient.name);
    }
  };

  // Don't render if user has access to only one patient (auto-selected)
  if (availablePatients.length <= 1) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Select Profile to Upload To
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-4 text-muted-foreground">
            Loading available profiles...
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="profile-select">Upload documents to:</Label>
            <Select value={selectedShareableId || ""} onValueChange={handleProfileChange}>
              <SelectTrigger id="profile-select">
                <SelectValue placeholder="Select a profile to upload documents to" />
              </SelectTrigger>
              <SelectContent>
                {availablePatients.filter(patient => patient.shareable_id).map((patient) => (
                  <SelectItem key={patient.id} value={patient.shareable_id}>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <div>
                        <div className="font-medium">{patient.name}</div>
                        <div className="text-xs text-muted-foreground">
                          ID: {patient.shareable_id}
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedShareableId && (
              <div className="text-sm text-muted-foreground">
                Documents will be uploaded to{" "}
                <span className="font-medium">
                  {availablePatients.find(p => p.shareable_id === selectedShareableId)?.name}
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}