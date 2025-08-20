import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Trash2, UserPlus, Search, Users } from "lucide-react";
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

interface FamilyAccess {
  id: string;
  user_id: string;
  can_view: boolean;
  created_at: string;
  users: {
    name: string;
    email: string;
    user_shareable_id: string | null;
  };
}

interface FamilyAccessManagerProps {
  patientId: string;
  patientShareableId: string;
}

export default function FamilyAccessManager({ patientId, patientShareableId }: FamilyAccessManagerProps) {
  const [familyAccess, setFamilyAccess] = useState<FamilyAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [grantLoading, setGrantLoading] = useState(false);
  const [emailOrId, setEmailOrId] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [deleteAccess, setDeleteAccess] = useState<FamilyAccess | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchFamilyAccess();
  }, [patientId]);

  const fetchFamilyAccess = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('family_access')
        .select(`
          id,
          user_id,
          can_view,
          created_at,
          users!user_id (
            name,
            email,
            user_shareable_id
          )
        `)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching family access:', error);
        toast({
          title: "Error",
          description: "Failed to load family access list",
          variant: "destructive",
        });
      } else {
        setFamilyAccess(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to load family access list",
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
        fetchFamilyAccess(); // Refresh the list
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
        fetchFamilyAccess(); // Refresh the list
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
    (access.users?.user_shareable_id && access.users.user_shareable_id.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  return (
    <div className="space-y-6">
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
            <Label htmlFor="emailOrId">Family Member Email or User ID</Label>
            <Input
              id="emailOrId"
              type="text"
              value={emailOrId}
              onChange={(e) => setEmailOrId(e.target.value)}
              placeholder="Enter email (e.g., family@example.com) or User ID (e.g., USER-5CBE9C94)"
              className="mt-1"
            />
            <p className="text-sm text-muted-foreground">
              You can enter either an email address or a User ID. The person must already have an account.
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

      {/* Existing Access List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Family Members with Access ({filteredAccess.length})
          </CardTitle>
          {familyAccess.length > 0 && (
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
              {filteredAccess.map((access) => (
                <div
                  key={access.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-medium">{access.users?.name || 'Unknown User'}</div>
                    <div className="text-sm text-muted-foreground">{access.users?.email}</div>
                    {access.users?.user_shareable_id && (
                      <div className="text-xs text-muted-foreground font-mono">
                        ID: {access.users.user_shareable_id}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">
                      Granted on {new Date(access.created_at).toLocaleDateString()}
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
              ))}
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
