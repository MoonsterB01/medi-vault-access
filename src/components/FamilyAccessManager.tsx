import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, UserPlus, Users, Lightbulb } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";

interface FamilyAccessRecord {
  id: string;
  user_id: string;
  created_at: string;
  users: {
    name: string;
    user_shareable_id: string | null;
  };
}

interface FamilyAccessManagerProps {
  patientId: string;
  patientShareableId: string;
}

export default function FamilyAccessManager({ patientId, patientShareableId }: FamilyAccessManagerProps) {
  const [accessList, setAccessList] = useState<FamilyAccessRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [grantLoading, setGrantLoading] = useState(false);
  const [userId, setUserId] = useState("");
  const [deleteAccess, setDeleteAccess] = useState<FamilyAccessRecord | null>(null);
  const [patientName, setPatientName] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (patientId) {
      fetchAccessList();
      fetchPatientName();
    }
  }, [patientId]);

  const fetchPatientName = async () => {
    const { data } = await supabase
      .from('patients')
      .select('name')
      .eq('id', patientId)
      .single();
    
    if (data) setPatientName(data.name);
  };

  const fetchAccessList = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('family_access')
        .select(`
          id,
          user_id,
          created_at,
          users!user_id (
            name,
            user_shareable_id
          )
        `)
        .eq('patient_id', patientId)
        .eq('can_view', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAccessList(data || []);
    } catch (error) {
      console.error('Error fetching access list:', error);
      toast({
        title: "Error",
        description: "Failed to load access list",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGrantAccess = async () => {
    const trimmedId = userId.trim().toUpperCase();
    
    if (!trimmedId) {
      toast({
        title: "Missing Information",
        description: "Please enter a USER-ID",
        variant: "destructive",
      });
      return;
    }

    if (!trimmedId.startsWith('USER-')) {
      toast({
        title: "Invalid Format",
        description: "USER-ID must start with 'USER-' (e.g., USER-A1B2C3D4)",
        variant: "destructive",
      });
      return;
    }

    setGrantLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('grant-access-to-family', {
        body: {
          patientId,
          familyMemberEmail: trimmedId,
          canView: true,
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Access granted successfully",
      });
      
      setUserId("");
      fetchAccessList();
    } catch (error: any) {
      console.error('Error granting access:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to grant access",
        variant: "destructive",
      });
    } finally {
      setGrantLoading(false);
    }
  };

  const handleRevokeAccess = async (accessId: string) => {
    try {
      const { error } = await supabase
        .from('family_access')
        .delete()
        .eq('id', accessId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Access revoked successfully",
      });
      
      fetchAccessList();
    } catch (error) {
      console.error('Error revoking access:', error);
      toast({
        title: "Error",
        description: "Failed to revoke access",
        variant: "destructive",
      });
    }
    setDeleteAccess(null);
  };

  if (!patientId) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-muted-foreground">
            Please select a patient to manage family access.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <CardTitle className="text-lg">How to Share Access</CardTitle>
              <CardDescription className="mt-2">
                Give family members access to view medical records for <span className="font-semibold text-foreground">{patientName}</span> ({patientShareableId})
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 text-sm">
            <div className="flex gap-3">
              <div className="flex-shrink-0 font-semibold text-primary">1️⃣</div>
              <div>
                <div className="font-medium mb-1">Ask your family member to:</div>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                  <li>Sign up at this application</li>
                  <li>Choose "Family Member" as their role</li>
                  <li>Share their USER-ID with you</li>
                </ul>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="flex-shrink-0 font-semibold text-primary">2️⃣</div>
              <div>
                <div className="font-medium mb-1">Enter their USER-ID below</div>
                <div className="text-muted-foreground">Their USER-ID looks like: <code className="bg-muted px-1.5 py-0.5 rounded text-xs">USER-A1B2C3D4</code></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Grant Access
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="userId" className="sr-only">Family Member USER-ID</Label>
              <Input
                id="userId"
                placeholder="USER-XXXXXXXX"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGrantAccess()}
                className="font-mono"
              />
            </div>
            <Button 
              onClick={handleGrantAccess} 
              disabled={grantLoading || !userId.trim()}
            >
              {grantLoading ? "Granting..." : "Grant Access"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            People with Access ({accessList.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading...
            </div>
          ) : accessList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No one has been granted access yet. Use the form above to share access with family members.
            </div>
          ) : (
            <div className="space-y-3">
              {accessList.map((access, index) => (
                <div key={access.id}>
                  {index > 0 && <Separator className="my-3" />}
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="font-medium">{access.users.name}</div>
                      <div className="text-sm text-muted-foreground font-mono">
                        {access.users.user_shareable_id || 'No USER-ID'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Added: {new Date(access.created_at).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteAccess(access)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Revoke
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteAccess} onOpenChange={(open) => !open && setDeleteAccess(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Access</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke access for <strong>{deleteAccess?.users.name}</strong>? 
              They will no longer be able to view medical records for this patient.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteAccess && handleRevokeAccess(deleteAccess.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Revoke Access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
