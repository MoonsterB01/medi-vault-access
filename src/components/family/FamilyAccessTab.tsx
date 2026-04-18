import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Users, UserPlus, LogOut, ShieldOff, Eye, Upload, Calendar, Loader2 } from "lucide-react";

interface FamilyAccessTabProps {
  user: any;
  patientData: any;
}

interface IncomingLink {
  id: string;
  patient_id: string;
  granted_at: string;
  permissions: any;
  patient: { id: string; name: string; shareable_id: string | null } | null;
}

interface OutgoingLink {
  id: string;
  family_user_id: string;
  granted_at: string;
  permissions: any;
  family_user: { id: string; name: string | null; email: string | null } | null;
}

/**
 * @function FamilyAccessTab
 * @description UI for managing family access — both directions:
 *   - "People I'm Helping": patients this user has access to (can leave)
 *   - "People With Access to My Records": family members linked to this user's patient (can revoke)
 */
export function FamilyAccessTab({ user, patientData }: FamilyAccessTabProps) {
  const { toast } = useToast();
  const [helping, setHelping] = useState<IncomingLink[]>([]);
  const [helpers, setHelpers] = useState<OutgoingLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [pidInput, setPidInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadLinks = async () => {
    setLoading(true);
    try {
      // 1. People I'm helping (where I am the family member)
      const { data: helpingData, error: helpingErr } = await supabase
        .from("family_access" as any)
        .select("id, patient_id, granted_at, permissions")
        .eq("family_user_id", user.id)
        .eq("is_active", true);

      if (helpingErr) throw helpingErr;

      // Hydrate patient info
      const patientIds = (helpingData || []).map((l: any) => l.patient_id);
      let patientsById: Record<string, any> = {};
      if (patientIds.length > 0) {
        const { data: patientsData } = await supabase
          .from("patients")
          .select("id, name, shareable_id")
          .in("id", patientIds);
        patientsById = (patientsData || []).reduce((acc: any, p: any) => {
          acc[p.id] = p;
          return acc;
        }, {});
      }

      setHelping(
        (helpingData || []).map((l: any) => ({
          ...l,
          patient: patientsById[l.patient_id] || null,
        }))
      );

      // 2. People with access to my records (only if I own a patient record)
      if (patientData?.id) {
        const { data: helpersData, error: helpersErr } = await supabase
          .from("family_access" as any)
          .select("id, family_user_id, granted_at, permissions")
          .eq("patient_id", patientData.id)
          .eq("is_active", true);

        if (helpersErr) throw helpersErr;

        const userIds = (helpersData || []).map((l: any) => l.family_user_id);
        let usersById: Record<string, any> = {};
        if (userIds.length > 0) {
          const { data: usersData } = await supabase
            .from("users")
            .select("id, name, email")
            .in("id", userIds);
          usersById = (usersData || []).reduce((acc: any, u: any) => {
            acc[u.id] = u;
            return acc;
          }, {});
        }

        setHelpers(
          (helpersData || []).map((l: any) => ({
            ...l,
            family_user: usersById[l.family_user_id] || null,
          }))
        );
      } else {
        setHelpers([]);
      }
    } catch (err: any) {
      console.error("Failed to load family access:", err);
      toast({
        title: "Failed to load family access",
        description: err.message || "Please refresh and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) loadLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, patientData?.id]);

  const handleLink = async () => {
    if (!pidInput.trim()) {
      toast({ title: "Patient ID required", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("link-family-access", {
        body: { shareable_id: pidInput.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Access linked",
        description: `You now have access to ${data?.patient?.name || "this patient"}'s records.`,
      });
      setPidInput("");
      setLinkDialogOpen(false);
      await loadLinks();
    } catch (err: any) {
      toast({
        title: "Could not link",
        description: err.message || "Please verify the Patient Shareable ID and try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleLeave = async (linkId: string, patientName?: string) => {
    if (!confirm(`Stop helping ${patientName || "this patient"}? You will lose access to their records.`)) return;
    try {
      const { error } = await supabase
        .from("family_access" as any)
        .delete()
        .eq("id", linkId);
      if (error) throw error;
      toast({ title: "You have left", description: "Access removed." });
      await loadLinks();
    } catch (err: any) {
      toast({ title: "Failed to leave", description: err.message, variant: "destructive" });
    }
  };

  const handleRevoke = async (linkId: string, helperName?: string) => {
    if (!confirm(`Revoke access for ${helperName || "this person"}?`)) return;
    try {
      const { error } = await supabase
        .from("family_access" as any)
        .update({ is_active: false, revoked_at: new Date().toISOString() })
        .eq("id", linkId);
      if (error) throw error;
      toast({ title: "Access revoked", description: "They can no longer view your records." });
      await loadLinks();
    } catch (err: any) {
      toast({ title: "Failed to revoke", description: err.message, variant: "destructive" });
    }
  };

  const PermBadges = ({ permissions }: { permissions: any }) => (
    <div className="flex flex-wrap gap-1">
      {permissions?.view && (
        <Badge variant="secondary" className="text-xs"><Eye className="h-3 w-3 mr-1" />View</Badge>
      )}
      {permissions?.upload && (
        <Badge variant="secondary" className="text-xs"><Upload className="h-3 w-3 mr-1" />Upload</Badge>
      )}
      {permissions?.appointments && (
        <Badge variant="secondary" className="text-xs"><Calendar className="h-3 w-3 mr-1" />Appointments</Badge>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header + Add */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Family Access
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Help manage a family member's medical records, or control who can access yours.
          </p>
        </div>
        <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Family Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Link a family member's account</DialogTitle>
              <DialogDescription>
                Enter the Patient Shareable ID (PID) of the person you want to help. They will be notified.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2">
              <Input
                placeholder="MED-XXXXXXXX"
                value={pidInput}
                onChange={(e) => setPidInput(e.target.value.toUpperCase())}
                disabled={submitting}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !submitting) handleLink();
                }}
              />
              <p className="text-xs text-muted-foreground">
                Ask the patient to share their PID from their dashboard.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setLinkDialogOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={handleLink} disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Link Account
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* People I'm Helping */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">People I'm Helping</CardTitle>
          <CardDescription>
            Patients whose records you can access. You can leave at any time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : helping.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              You are not currently helping anyone. Click "Add Family Member" to link an account.
            </p>
          ) : (
            <div className="space-y-3">
              {helping.map((link) => (
                <div
                  key={link.id}
                  className="flex items-start justify-between gap-3 p-4 border border-border rounded-lg flex-wrap"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{link.patient?.name || "Unknown patient"}</p>
                      {link.patient?.shareable_id && (
                        <code className="text-xs text-muted-foreground font-mono">
                          {link.patient.shareable_id}
                        </code>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Linked {new Date(link.granted_at).toLocaleDateString()}
                    </p>
                    <PermBadges permissions={link.permissions} />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleLeave(link.id, link.patient?.name)}
                  >
                    <LogOut className="h-4 w-4 mr-1" />
                    Leave
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* People With Access to My Records */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">People With Access to My Records</CardTitle>
          <CardDescription>
            Family members who can manage your medical records. You can revoke access at any time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : helpers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No one currently has access to your records. Share your Patient ID
              {patientData?.shareable_id && (
                <> (<code className="font-mono text-xs">{patientData.shareable_id}</code>)</>
              )}{" "}
              with a trusted family member to allow them to help.
            </p>
          ) : (
            <div className="space-y-3">
              {helpers.map((link) => (
                <div
                  key={link.id}
                  className="flex items-start justify-between gap-3 p-4 border border-border rounded-lg flex-wrap"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <p className="font-medium">
                      {link.family_user?.name || link.family_user?.email || "Unknown user"}
                    </p>
                    {link.family_user?.email && link.family_user?.name && (
                      <p className="text-xs text-muted-foreground">{link.family_user.email}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Granted {new Date(link.granted_at).toLocaleDateString()}
                    </p>
                    <PermBadges permissions={link.permissions} />
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() =>
                      handleRevoke(link.id, link.family_user?.name || link.family_user?.email || undefined)
                    }
                  >
                    <ShieldOff className="h-4 w-4 mr-1" />
                    Revoke
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
