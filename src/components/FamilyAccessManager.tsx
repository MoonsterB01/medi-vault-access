import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Trash2, UserPlus, Search, Users, Heart, Shield } from "lucide-react";
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

/**
 * @interface FamilyAccess
 * @description Defines the structure of a family access object.
 */
interface FamilyAccess {
  id: string;
  user_id: string;
  patient_id: string;
  can_view: boolean;
  created_at: string;
  granted_by: string;
  users: {
    name: string;
    email: string;
    user_shareable_id: string | null;
  };
  patients?: {
    name: string;
    shareable_id: string;
  };
}

/**
 * @interface PatientAccess
 * @description Defines the structure of a patient access object.
 */
interface PatientAccess {
  id: string;
  patient_id: string;
  can_view: boolean;
  created_at: string;
  granted_by: string;
  patients: {
    name: string;
    shareable_id: string;
  };
  granted_by_user?: {
    name: string;
    email: string;
  };
}

/**
 * @interface FamilyAccessManagerProps
 * @description Defines the props for the FamilyAccessManager component.
 * @property {string} patientId - The ID of the patient.
 * @property {string} patientShareableId - The shareable ID of the patient.
 */
interface FamilyAccessManagerProps {
  patientId: string;
  patientShareableId: string;
}

/**
 * @function FamilyAccessManager
 * @description A component for managing family access to a patient's records. It allows granting and revoking access to family members.
 * @param {FamilyAccessManagerProps} props - The props for the component.
 * @returns {JSX.Element} - The rendered FamilyAccessManager component.
 */
export default function FamilyAccessManager({ patientId, patientShareableId }: FamilyAccessManagerProps) {
  const [familyAccess, setFamilyAccess] = useState<FamilyAccess[]>([]);
  const [patientAccess, setPatientAccess] = useState<PatientAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [grantLoading, setGrantLoading] = useState(false);
  const [emailOrId, setEmailOrId] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [deleteAccess, setDeleteAccess] = useState<FamilyAccess | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (patientId) {
      fetchFamilyData();
    }
  }, [patientId]);

  // Don't render if no patientId
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

  const fetchFamilyData = async () => {
    setLoading(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch family members who have access to the current patient
      const { data: familyData, error: familyError } = await supabase
        .from('family_access')
        .select(`
          id,
          user_id,
          patient_id,
          can_view,
          created_at,
          granted_by,
          users!user_id (
            name,
            email,
            user_shareable_id
          ),
          patients!patient_id (
            name,
            shareable_id
          )
        `)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      // Fetch patients that the current user has access to
      const { data: patientData, error: patientError } = await supabase
        .from('family_access')
        .select(`
          id,
          patient_id,
          can_view,
          created_at,
          granted_by,
          patients!patient_id (
            name,
            shareable_id
          ),
          granted_by_user:users!granted_by (
            name,
            email
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Fetch all access granted BY the current user (across all their patients)
      const { data: grantedData, error: grantedError } = await supabase
        .from('family_access')
        .select(`
          id,
          user_id,
          patient_id,
          can_view,
          created_at,
          granted_by,
          users!user_id (
            name,
            email,
            user_shareable_id
          ),
          patients!patient_id (
            name,
            shareable_id
          )
        `)
        .eq('granted_by', user.id)
        .order('created_at', { ascending: false });

      if (familyError) {
        console.error('Error fetching family access:', familyError);
        toast({
          title: "Error",
          description: "Failed to load family access list",
          variant: "destructive",
        });
      } else {
        // Combine current patient access with all granted access
        const allGrantedAccess = grantedData || [];
        const currentPatientAccess = familyData || [];
        
        // Filter to avoid duplicates and merge
        const uniqueAccess = [...currentPatientAccess];
        allGrantedAccess.forEach(access => {
          if (!uniqueAccess.find(existing => existing.id === access.id)) {
            uniqueAccess.push(access);
          }
        });
        
        setFamilyAccess(uniqueAccess);
      }

      if (patientError) {
        console.error('Error fetching patient access:', patientError);
      } else {
        setPatientAccess(patientData || []);
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to load family access data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGrantAccess = async () => {
    if (!emailOrId.trim()) {
      toast({
        title: "Error",
        description: "Please enter an email address or user ID",
        variant: "destructive",
      });
      return;
    }

    setGrantLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('grant-access-to-family', {
        body: {
          patientId,
          familyMemberEmail: emailOrId.trim(),
          canView: true,
        },
      });

      if (error) {
        console.error('Grant access error:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to grant access",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: data?.message || "Access granted successfully",
        });
        setEmailOrId("");
        fetchFamilyData(); // Refresh the list
      }
    } catch (error: any) {
      console.error('Grant access catch error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to grant access",
        variant: "destructive",
      });
    } finally {
      setGrantLoading(false);
    }
  };

  const handleRevokeAccess = async () => {
    if (!deleteAccess) return;

    try {
      const { error } = await supabase
        .from('family_access')
        .delete()
        .eq('id', deleteAccess.id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to revoke access",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Access revoked successfully",
        });
        fetchFamilyData(); // Refresh the list
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to revoke access",
        variant: "destructive",
      });
    } finally {
      setDeleteAccess(null);
    }
  };

  const filteredAccess = familyAccess.filter(access =>
    access.users?.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    access.users?.email.toLowerCase().includes(searchFilter.toLowerCase()) ||
    access.patients?.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    (access.users?.user_shareable_id && access.users.user_shareable_id.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  const filteredPatientAccess = patientAccess.filter(access =>
    access.patients?.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    access.granted_by_user?.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    access.granted_by_user?.email.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Patients I Can Access */}
      {patientAccess.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5" />
              Patients I Can Access ({patientAccess.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredPatientAccess.map((access) => (
                <div
                  key={access.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-medium">{access.patients?.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Patient ID: {access.patients?.shareable_id}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Access granted by: {access.granted_by_user?.name} ({access.granted_by_user?.email})
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Granted on {new Date(access.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={access.can_view ? "default" : "secondary"}>
                      {access.can_view ? "Can View & Upload" : "No Access"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Grant New Access */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Grant Family Access
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="emailOrId">Family Member Email, User ID, or Patient ID</Label>
            <Input
              id="emailOrId"
              type="text"
              value={emailOrId}
              onChange={(e) => setEmailOrId(e.target.value)}
              placeholder="Enter email, User ID (USER-XXXXXXXX), or Patient ID (MED-XXXXXXXX)"
              className="mt-1"
            />
            <p className="text-sm text-muted-foreground">
              You can enter an email address, User ID, or Patient ID. The person must already have an account.
            </p>
          </div>
          <Button 
            onClick={handleGrantAccess} 
            disabled={grantLoading || !emailOrId.trim()}
            className="w-full sm:w-auto"
          >
            {grantLoading ? "Granting Access..." : "Grant Access"}
          </Button>
          
          <div className="text-sm text-muted-foreground">
            <p>Your shareable ID: <span className="font-mono font-medium">{patientShareableId}</span></p>
            <p>Family members can use this ID to upload documents to your account.</p>
          </div>
        </CardContent>
      </Card>

      {/* All Family Access Relationships */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            All Family Access Relationships ({filteredAccess.length})
          </CardTitle>
          {(familyAccess.length > 0 || patientAccess.length > 0) && (
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search family members..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="max-w-sm"
              />
            </div>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading family access list...
            </div>
          ) : filteredAccess.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {familyAccess.length === 0 ? 
                "No family members have access yet. Grant access to allow family members to upload documents." :
                "No family members match your search."
              }
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAccess.map((access) => {
                const isCurrentUser = access.user_id === access.granted_by;
                const isGrantedByCurrentUser = access.granted_by && access.users;
                
                return (
                  <div
                    key={access.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-medium">
                        {access.users?.name || 'Unknown User'}
                        {isCurrentUser && <Badge variant="outline" className="ml-2 text-xs">You</Badge>}
                      </div>
                      <div className="text-sm text-muted-foreground">{access.users?.email}</div>
                      <div className="text-sm text-muted-foreground">
                        Patient: <span className="font-medium">{access.patients?.name}</span> ({access.patients?.shareable_id})
                      </div>
                      {access.users?.user_shareable_id && (
                        <div className="text-xs text-muted-foreground font-mono">
                          User ID: {access.users.user_shareable_id}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">
                        {isGrantedByCurrentUser ? 
                          `You granted access on ${new Date(access.created_at).toLocaleDateString()}` :
                          `Access granted on ${new Date(access.created_at).toLocaleDateString()}`
                        }
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={access.can_view ? "default" : "secondary"}>
                        {access.can_view ? "Can Upload" : "No Access"}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteAccess(access)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteAccess} onOpenChange={() => setDeleteAccess(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Access</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke access for {deleteAccess?.users?.name}? 
              They will no longer be able to upload documents to your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevokeAccess} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Revoke Access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
